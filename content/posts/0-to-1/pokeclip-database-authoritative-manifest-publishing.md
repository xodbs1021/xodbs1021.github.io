---
title: "늦게 끝난 발행이 새 HLS 목록을 덮지 못하게 했습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-11T06:06:24+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "HLS 되감기 목록을 시청 요청마다 만들지 않고 상태가 바뀔 때 S3에 발행하면서, 늦게 도착한 writer의 PUT이 새 목록을 덮지 못하게 DB 장부·writer fence·세대 CAS·S3 조건부 PUT을 나눈 설계와, 실제 S3에서 사이드카 재시작 전후 발행을 확인한 결과, 그 뒤 회차 다시보기 문서로 이어진 과정."
tags: ["PokeClip", "HLS", "S3", "조건부 쓰기", "정합성", "설계"]
portfolio_cases: [20]
portfolio_pages: [30]
portfolio_edition: "2026-10-15-v2"
---

PokeClip은 방송 중 되감기용 HLS 재생 목록을 4초마다 S3에 올립니다. 목록을 쓰는 프로세스 A가 10번 조각까지 담은 목록을 PUT으로 보낸 뒤 그 요청이 멈춰 있는 사이, 새로 뜬 프로세스 B가 11번까지 담은 목록을 올렸다고 해 봅시다. 뒤늦게 도착한 A의 PUT이 성공하면 목록이 10번으로 되돌아가고, 11번을 받아 둔 플레이어는 목록 번호가 뒤로 가는 것을 봅니다. 이 늦은 PUT을 막으려고 DB 장부를 정본으로 두고 writer fence, 세대 예약, S3 조건부 PUT을 단계마다 나눴습니다. 낡은 writer 시험은 PostgreSQL을 붙여 28번 모두 통과했고, 10월 17일 실제 S3에서 사이드카를 재시작해도 같은 주소의 세대가 9 → 11 → 19로 되돌아가지 않고 이어졌습니다. 이 발행 층은 10월 19일 [PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289)로 develop에 머지됐습니다.

저는 읽기 경로를 단순하게 만드는 대가로 쓰기 쪽에서 세대와 권한을 관리하기로 정했고, DB 왕복 상한을 받아들이는 lease 계산안, 실제 S3 실험의 쓰기 범위와 실험 뒤 객체 정리를 정했으며, PR을 머지했습니다. 설계 문서, 구현, 시험, 실제 S3 실험은 AI(Claude Code 오케스트레이터와 하위 에이전트)가 했고, 리뷰는 Claude Code와 Codex가 함께 했습니다. 당시 설계와 PR #289는 이 글의 세션을 「회차」라고 불렀습니다. 지금은 시청자가 「방송 한 번」으로 보는 단위를 회차라고 부르고, 세션은 그 안에서 사이드카가 목록 하나를 여닫는 단위로, 송출이 끊겼다 이어지거나 조각이 목록의 목표 길이를 넘거나(TD 분할) init이 바뀌면 새로 열립니다.

## 늦게 끝난 PUT이 목록을 10번으로 되돌릴 수 있었습니다

목록을 쓰는 쪽(writer)이 둘이 되는 경우는 드물지 않습니다. 사이드카를 재기동하거나 이미지를 교체하는 동안 두 프로세스가 겹칠 수 있고, 이미 보낸 PUT이 네트워크나 프로세스 정지로 몇 초 늦게 도착할 수도 있습니다.

HLS 라이브 목록에서 미디어 순번(`#EXT-X-MEDIA-SEQUENCE`)과 조각 목록이 뒤로 가면, 이미 뒤 조각을 받은 플레이어의 계산이 어긋납니다. [RFC 8216 6.2.1](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.1)은 서버가 목록에 줄을 덧붙이기, 앞 조각을 순서대로 빼기, 순번 값 올리기, ENDLIST 달기만 허용합니다. 10번에서 끝나는 목록이 11번까지 있는 목록을 덮는 것은 이미 낸 줄을 지우는 변경입니다.

## 시청 요청마다 DB를 읽지 않고 상태가 바뀔 때 발행했습니다 {#시청-부하를-줄이면-발행-쪽-책임이-늘어납니다}

목록을 시청 요청마다 DB에서 합성하면 같은 방송을 보는 사람이 늘수록 같은 조회와 계산을 되풀이합니다. 조각이 확정될 때 한 번 만들어 S3에 올리고 CDN이 나눠 주면, 시청자 수와 상관없이 스트림당 4초에 한 번만 계산합니다. 대신 DB 확정과 S3 PUT은 한 트랜잭션이 아니므로, 그 사이에 프로세스가 죽거나 순서가 바뀌는 경우를 쓰는 쪽이 직접 다뤄야 합니다.

| 구성 | 기준으로 삼는 것 | 따로 다뤄야 할 실패 |
|---|---|---|
| 요청 때 합성 | 요청 시점의 DB 상태 | 같은 목록의 반복 조회·계산 |
| 상태가 바뀔 때 정적 발행 | DB 장부가 정한 공개 상태 | 늦은 쓰기, 중간 종료, 결과가 불분명한 커밋 |

정적 발행을 택한 뒤에도 S3에 있는 파일만 보고 복구할 수는 없었습니다. 그 파일이 A가 뒤늦게 쓴 과거 목록일 수 있기 때문입니다. 무엇을 공개해야 하는지는 파일보다 앞선 기록에서 다시 계산해야 했습니다. 그래서 DB 장부를 정본으로 두고, S3 목록은 장부에서 언제든 다시 만들 수 있는 사본으로 뒀습니다.

받아들인 비용은 DB 왕복입니다. 9월 29일 정한 설계 산식의 상한은 스트림당 시간 약 2,820회입니다(감시 120, 세대 예약 900, 확정 900, lease 보조 갱신 900 이하). 4초마다 한 번씩 예약과 확정을 하는 계산값이고, 트래픽을 흘려 잰 DB 부하나 지원 가능한 스트림 수가 아닙니다.

## 세대 번호만으로는 늦은 writer를 막지 못했습니다 {#세대-번호-하나로는-모든-경합을-막지-못합니다}

발행에는 세 질문이 섞여 있었습니다. 「이 프로세스가 아직 쓸 권한이 있는가」, 「다음에 만들 세대는 무엇인가」, 「지금 덮으려는 S3 객체가 내가 예상한 판인가」입니다. 세대 번호 하나로 셋을 모두 답하려 하면, A가 예약까지 마친 뒤 멈춘 경우를 막지 못합니다. A는 예약할 때 정당한 writer였기 때문입니다. 그래서 질문마다 장치를 따로 뒀습니다.

| 장치 | 맡긴 판단 |
|---|---|
| DB 장부 | 무엇을 공개하고 어디서 복구할지 |
| writer fence(장부 칸 · lease 5초) | 지금 이 세션 목록을 쓸 수 있는 프로세스 하나 |
| 세대 예약(`manifest_gen` CAS) | 장부가 예상한 상태일 때만 다음 세대를 예약 |
| S3 조건부 PUT(If-Match) | 저장된 판이 내가 본 판과 같을 때만 쓰기 |
| 확정·화해 | PUT 뒤 장부 확정, 결과가 불분명하면 S3와 장부를 다시 맞춤 |

한 번의 발행은 다섯 걸음입니다. 그림 1에서 장부와 S3를 번갈아 거치는 순서와, 청록으로 칠한 조건부 PUT을 보면 됩니다.

```mermaid {#fig-publish-steps kind="개념도" caption="발행 한 번(4초마다)의 순서. 세대 예약과 확정은 writer fence를 쥔 프로세스만 할 수 있고, S3 PUT은 첫 판이면 If-None-Match: *, 그 뒤로는 장부가 기억한 직전 판의 ETag가 맞을 때만 성공합니다. 412를 받으면 S3의 현재 판으로 장부를 맞추고(화해) 그 틱은 포기하며, 다음 틱이 맞춘 판을 기준으로 다시 발행합니다. PokeClip-mono media/README.md 용어 「틱」·「화해」 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2152-L2158"}
flowchart TB
  accTitle: DB 장부에서 S3와 CDN까지 목록 발행 한 번의 순서
  accDescr: 발행기가 DB 장부에서 fence를 확인하며 세대를 예약하고 직전 판의 ETag를 받는다. 목록을 렌더하고 발행 전 검사를 한 뒤 S3에 If-Match 조건부 PUT을 보낸다. 200이면 장부에 확정하고 CDN이 최신 판을 나눠 준다. 412면 S3의 현재 판으로 장부를 맞추고 그 틱은 포기한다.
  p0[DB 장부: 세대 예약<br/>fence 확인 · 세대 CAS] --> p1[발행기: 렌더<br/>발행 전 검사]
  p1 --> p3[S3: 조건부 PUT<br/>If-Match 직전 판 ETag]
  p3 -->|200 새 ETag| p4[DB 장부: 확정<br/>fence 확인]
  p3 -->|412| r[화해 뒤<br/>이 틱 포기]
  p4 --> c[CDN: 최신 판을<br/>시청자에게]
  style p3 fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

이 순서를 A와 B에 대 보면 장치가 하나씩 필요한 이유가 드러납니다. 영상에서 A의 늦은 PUT이 S3 앞에서 멈추는 순간을 보면 됩니다.

{{< motion scene="LateWriterFenced" id="fig-late-writer" kind="개념도" caption="writer A가 세대 10을 예약하고 PUT을 보낸 채 멈춘 사이 fence가 B로 넘어가고, B가 세대 11을 예약해 11번 조각까지 담은 판을 올립니다. 늦게 도착한 A의 PUT은 저장된 판의 ETag가 바뀌어 412로 거절되고, A가 장부를 맞추려 해도 fence가 B라서 거절됩니다. S3에는 11번까지 담은 판이 남습니다." >}}

A가 쥔 fence는 lease 5초 안에 늘리지 않으면 다른 프로세스가 가져갈 수 있습니다. 늦은 PUT이 나갈 수 있는 시간은 먼저 좁혔습니다. writer는 예약 요청을 보낸 뒤 3초(lease 5초에서 PUT 한 번의 예산 2초를 뺀 값)가 지나면 PUT을 보내지 않습니다. 그래도 이 마감 검사를 지나 이미 출발한 PUT은 막지 못합니다. A의 PUT이 그렇게 늦게 도착하는 동안 B는 fence를 가져가 다음 세대를 예약하고, 저장된 판의 ETag를 조건으로 새 판을 올립니다. 늦게 도착한 A의 PUT은 자기가 예약할 때 본 ETag를 조건으로 달고 있으므로 412(Precondition Failed)를 받습니다. 412를 받은 A가 장부를 S3에 맞추려 해도 fence가 B라서 장부에 쓰지 못합니다.

[Amazon S3 조건부 쓰기](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html)의 If-Match는 마지막 쓰기를 막는 도구일 뿐, DB의 쓰기 권한까지 확인해 주지는 않습니다. 반대로 fence와 세대 예약은 장부 안의 질서일 뿐, 이미 출발한 PUT을 멈추지 못합니다. 그래서 PR #289는 「낡은 writer가 최신 판을 덮지 못한다」를 조건부 쓰기로 증명되는 네 성질로 정했습니다. 어떤 PUT도 저장된 판이 자기가 본 판과 같을 때만 성공하고, 저장된 판은 늘 직전 판의 검사를 거친 후속이며, DB 세대는 오르기만 하고, 메모리에 든 판이 낡으면 다음 PUT이 412를 받아 화해로 맞춘다는 것입니다. 412를 받은 틱은 다시 시도하지 않고 다음 틱으로 넘깁니다. 대가는 발행 한 번(4초)의 지연입니다.

세대와 워터마크는 목록 본문에 임의 태그로 넣지 않고 S3 객체 메타데이터 8개 키(`pc-gen`, `pc-pub-seq`, `pc-msn`, `pc-body-sha256` 등)로 뺐습니다. 플레이어가 읽는 HLS 문장과 발행 시스템의 제어 정보를 섞지 않으려는 선택입니다. 다만 메타의 세대 값은 늦은 쓰기에서 DB 세대보다 뒤처질 수 있어, 덮였는지의 판정에는 쓰지 않고 관측에만 씁니다.

## 종료와 GAP도 같은 상태 전이를 거칩니다

종료만 다른 경로로 쓰면 일반 발행에 넣은 세대 검사가 무력해집니다. 늦은 일반 발행이 종료 뒤의 목록을 덮거나, 끝난 목록에 조각이 다시 붙을 수 있기 때문입니다. 그래서 송출이 끊긴 세션은 장부에서 `live`에서 `ending`으로 넘기고, 세대 예약이 `live` 세션에만 성공하게 했습니다. 종료 전이가 서면 그 세션의 발행은 예약 단계에서 멈춥니다. PR #289 시점에는 갱신만 멈췄고, 끝난 목록에 `#EXT-X-ENDLIST`를 붙여 봉인하는 동결은 10월 30일 [PR #461](https://github.com/3K-PokeClip/PokeClip-mono/pull/461)의 배선으로 들어왔습니다. 끝난 세션의 주소를 다시 열지 않고 다음 송출은 새 세션 주소를 쓰는 판단은 [ENDLIST 글](/posts/0-to-1/pokeclip-session-url-and-endlist/)에 있습니다.

실패한 조각을 목록에서 조용히 빼는 길도 피했습니다. 조각을 빼면 그 뒤 조각의 순서와 시각이 당겨집니다. 대신 끝내 올라오지 않은 조각은 `#EXT-X-GAP`으로 남기고, 장부의 GAP 원장에 `recorded`로 적은 뒤 그 GAP을 실은 판이 확정될 때 `put_confirmed`로 바꿉니다. 어떤 GAP이 시청자에게 나갔는지가 장부에 남습니다.

## 실제 S3에서 재시작 전후 발행을 확인했습니다 {#10월-17일-실제-s3에서-재시작-전후-발행을-확인했습니다}

10월 17일 로컬 compose에서 720p30 영상과 AAC 음성을 90초 합성 송출하고, 사이드카가 실제 S3 버킷의 실험 접두에 목록을 발행하게 했습니다. 송출 44초쯤 사이드카를 재시작했습니다.

| 확인할 조건 | 관측 |
|---|---|
| 시작·재시작 뒤 writer가 장부의 fence와 같음 | 두 시점 모두 같음 |
| 목록 세대와 S3 객체가 갱신됨 | 표본 7회에서 세대 2 → 9, ETag 전부 다름, 메타 8키 |
| 평시 실패 신호 | 발행 중단·컷오프 부재·작업 실패·ERROR 모두 0 |
| 재시작 뒤 같은 주소에서 발행이 이어짐 | 세대 9 → 11 → 19, 미디어 순번 뒤로 가지 않음, 새 writer |
| 종료 전이 뒤 갱신이 멈춤 | 세대 22에서 ETag 5회 연속 같음 |

조각 22개가 녹화 원본과 재포장본으로 하나씩, init 1개, 목록 1개로 S3 객체 46개가 생겼고 실험 뒤 지웠습니다. 실험은 한 번 돌린 동작 확인입니다. 확인한 것은 재시작 뒤에도 같은 주소의 세대가 되돌아가지 않고 발행이 이어졌다는 것까지이고, 두 writer가 실제 S3에 동시에 쓰는 경합은 이 실험에 없습니다. 그 경합은 PostgreSQL을 붙인 낡은 writer 시험이 맡았고, 종결 리뷰 라운드에서 28번 모두 통과했습니다. 일부러 코드를 깨 시험이 잡는지 본 변이 시험은 고유 변이 405개 가운데 387개를 잡았고, 살아남은 18개는 하나씩 분류했습니다.

발행 층은 10월 19일 PR #289로 머지됐습니다. 포트폴리오 요약(2026-10-15판) 30쪽은 「발행 계층 연결은 진행 중」이라고 적고 종료 뒤 「새 회차 URL」을 쓴다고 적습니다. 10월 12일까지의 기록 기준이고, 그 「회차」는 지금의 세션입니다. DB와 S3를 하나의 원자적 트랜잭션으로 만들었다거나 전체 처리를 정확히 한 번(exactly-once)으로 보장했다는 주장은 하지 않습니다. 확정 결과가 불분명한 창, 장시간 부하는 따로 재지 않았습니다.

## 사슬마다 하나였던 VOD 문서는 회차 문서로 바뀌었습니다 {#livedvr-분리와-이어지는-검증}

이 발행 층은 라이브와 되감기를 나눈 구조의 일부입니다. 라이브 목록은 미디어 서버가 내고, 되감기 목록은 장부를 기준으로 S3에 발행합니다. 웹의 되감기 기본 연동은 10월 27일 [PR #436](https://github.com/3K-PokeClip/PokeClip-mono/pull/436)으로 머지됐고, 두 경로 사이의 전환 조건은 [Live와 DVR을 나누고 다시 연결하는 조건](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/)에 있습니다.

방송이 끝나면 같은 장부로 다시보기(VOD) 문서를 한 번 렌더해 S3에 확정합니다. 이 걸음을 동결이라고 부르고, 확정된 문서는 바뀌지 않습니다. 동결의 단위는 처음에 사슬이었습니다. 사슬은 끊긴 송출을 앞 세션에 이어 붙인(계승) 세션 묶음입니다. 11월 4일 운영 시험 방송에서 한 회차가 사슬 둘로 갈리자 문서도 둘이 섰고, 회차 재생 API는 마지막 문서의 7.5분만 가리켰습니다. [PR #492](https://github.com/3K-PokeClip/PokeClip-mono/pull/492)가 회차 하나에 문서 하나를 두게 바꿨습니다(11월 9일 develop 머지, 11월 10일 운영 미디어 서버 반영).

여기서도 늦은 writer 문제가 다시 나왔습니다. 회차 문서를 마지막 사슬의 기존 키에 쓰면, 이미지 교체가 겹치는 동안 옛 판이 같은 키에 사슬 범위 본문을 먼저 올렸을 때 내용 충돌로 동결이 실패하고 그 회차는 VOD를 잃습니다. 그래서 회차 문서는 `.round`를 붙인 새 키에 쓰고, 두 writer가 겹쳐 늦은 쪽이 먼저 선 확정을 받아들일 때는 범위를 확정된 문서 키에서 읽게 했습니다. 판단의 자세한 과정은 [회차 다시보기 글](/posts/projects/pokeclip-round-vod/)에 있습니다.

## 측정 조건

- 실제 S3 실험: 2026년 10월 17일, 작성자 기계의 로컬 compose(미디어 서버·사이드카). ffmpeg testsrc2 720p30과 AAC 44.1kHz 1채널, SRT 90초 송출, 송출 중 사이드카 재시작 1회. 실험 접두 둘에만 쓰기를 제가 승인했고 실험 뒤 객체 46개를 지웠습니다. 1회 동작 확인입니다.
- 낡은 writer 시험: PostgreSQL을 붙여 `-race`로 28회(종결 리뷰 라운드 3). 변이 시험은 커밋 8의 정식 실행입니다.
- 근거는 팀 내부 실험·리뷰 기록(비공개)이고 공개 요약은 PR #289 본문의 Test plan과 PokeClip-mono [`media/README.md` 「ⓒ 실측 기록」](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2387-L2395)입니다.
- DB 왕복 2,820회/시간/스트림은 설계 산식이고 측정값이 아닙니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289) — 발행 층·종료 전이, 세대 규약과 writer fence, Test plan(2026-10-19 develop 머지)
- [PokeClip-mono `media/README.md` 용어 「틱」·「writer fence」·「lease」](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2152-L2175) — 발행 다섯 걸음, fence lease 5초
- [PokeClip-mono `media/README.md` M4 ⓒ 비용](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2190-L2195) — DB 왕복 상한
- [PokeClip-mono `media/README.md` 「설계와 다르게 한 것」 35행](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2456) — P3 마감, 412는 화해 뒤 재시도 없이 틱 포기
- [PokeClip-mono `media/README.md` 「ⓒ 실측 기록」](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2387-L2395) — 10월 17일 실제 S3 발행 공개 요약
- [3K-PokeClip/PokeClip-mono PR #492](https://github.com/3K-PokeClip/PokeClip-mono/pull/492) — 회차 단위 VOD 문서, `.round` 키(2026-11-09 머지)
- [3K-PokeClip/PokeClip-mono PR #436](https://github.com/3K-PokeClip/PokeClip-mono/pull/436) — 웹 되감기 기본 연동(2026-10-27 머지)
- [Amazon S3 User Guide: Conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html) — If-Match·If-None-Match
- [RFC 8216 6.2.1 General Server Responsibilities](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.1) — 목록을 바꿀 수 있는 경우
- [끝난 HLS 목록은 다시 열지 않고 새 세션 주소를 줬습니다](/posts/0-to-1/pokeclip-session-url-and-endlist/)
- [2시간 방송이 다시보기에서 7.5분만 보였던 이유](/posts/projects/pokeclip-round-vod/)

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 30쪽](/portfolio/2026-10-15-v2/full.pdf#page=30)
