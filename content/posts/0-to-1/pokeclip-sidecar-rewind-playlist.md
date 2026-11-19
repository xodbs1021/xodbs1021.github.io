---
title: "사이드카는 4초 조각마다 HLS 되감기 목록을 이렇게 만듭니다"
date: "2026-11-18T05:14:58+09:00"
lastmod: "2026-11-18T19:06:24+09:00"
categories: ["projects"]
tags: ["PokeClip", "HLS", "DVR", "EXT-X-GAP", "Go", "S3", "설계"]
draft: false
author: "김태윤"
description: "PokéClip 되감기 목록은 Media 상자의 사이드카가 4초 조각마다 DB 장부의 메모리 사본으로 렌더해 S3에 올리는 정적 파일입니다. 조각이 장부에 들어와 캐시에 실리고, 1초 틱 · 게이트 · 창 계산 · 정체 사다리 · GAP · 렌더 · 발행 전 검사 · 조건부 PUT · 엣지 하한 보고를 지나 목록의 한 줄이 되는 길, 머리 다음 조각이 늦을 때 0.5 · 2 · 5.5 · 7.5초에 하는 일과 그 숫자의 근거. 고정 커밋의 시험을 다시 돌렸고, 1시간(900조각) 목록은 원본 135–177KiB로 상한 512KiB의 26–35%였습니다."
---

PokéClip의 방송 중 되감기(DVR) 목록은 시청 요청마다 만들지 않습니다. Media 상자의 사이드카가 4초 조각이 확정될 때마다 DB 장부의 메모리 사본으로 목록을 렌더해 S3에 올리고, CDN은 그 파일을 내보냅니다. HLS 규격상 끝나지 않은 목록은 직전 갱신부터 목표 길이의 1.5배, 곧 9초 안에 새 조각을 실어야 하는데([RFC 8216bis-22 6.2.1](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)), 업로드가 막히거나 다음 조각이 아예 오지 않는 일은 생깁니다. 사이드카는 1초마다 목록 머리 다음 조각을 보고, 그 조각이 실렸어야 할 때부터 0.5초면 업로드 재시도를 당기고 2초면 그 자리에 GAP(없는 조각 표시)을 세워 목록을 잇습니다. GAP이 서지 않은 채 마지막 발행부터 7.5초가 지나면 경보를 남기고, GAP을 세울 수 없을 때 스위치를 켜 둔 상자는 5.5초에 목록을 닫습니다. 프로젝트 저장소 고정 커밋에서 관련 시험을 다시 돌려 모두 통과했고, 1시간(900조각) 목록은 원본 135–177KiB로 본문 상한 512KiB의 26–35%였습니다.

되감기 목록을 S3에 정적으로 발행하는 구조와 그 설계, 정체 사다리의 두 마감 스위치를 기본으로 꺼 두는 것, 아래에 적은 한계를 받아들이는 것은 제가 정하거나 승인했습니다. 구현은 AI(Claude Code와 Codex)가 했고 커밋은 제 계정으로 들어갔습니다. 재측정은 이 글을 쓰며 AI(Claude Code)가 했습니다. [1편](/posts/0-to-1/pokeclip-live-dvr-url-split/)에서 `/dvr/*` 요청을 S3로 보냈고, [1편 둘째 글](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/)에서 그 조각을 엣지 하한으로 막았습니다. 그 S3의 목록 파일을 쓰는 것이 사이드카입니다. 조각 · 세션 · 회차는 [회차 다시보기 글](/posts/projects/pokeclip-round-vod/)의 용어를 따르고, 장부는 조각마다 한 행을 두는 DB 표입니다.

아래 그림에서 조각 하나가 위에서 들어와 맨 아래 PUT까지 내려가는 길을 보면 됩니다. 사다리 아래 두 갈래가 평시 틱과 GAP 틱입니다.

```mermaid {#fig-sidecar-flow kind="개념도" caption="조각 하나가 되감기 목록의 한 줄이 되는 길입니다. 장부 INSERT와 업로드 확정은 각각 push와 dirty 집합으로 캐시에 닿고, 틱마다 게이트 · 창 · 사다리를 거쳐 세대 예약(P0) → 렌더 · 검사 → 조건부 PUT을 지난 판만 S3에 올라갑니다. GAP 틱은 P0과 같은 트랜잭션에서 GAP 원장에 넣습니다. PokeClip-mono develop 627fb5a2 기준." source="프로젝트 저장소 media/cmd/segment-indexer/rewind_loop.go(비공개)"}
flowchart TB
  accTitle: 조각 하나가 되감기 목록이 되는 길
  accDescr: 녹화 조각이 장부에 들어가면 push로 캐시 뷰에 실린다. 재생용 조각 업로드가 확정되면 dirty 집합을 거쳐 캐시에 반영된다. 틱마다 게이트와 창 계산 뒤 사다리가 머리 다음 조각을 본다. 평시에는 세대 예약 P0을, L2면 P0과 GAP 원장 INSERT를 한 트랜잭션으로 한 뒤 렌더하고 검사 S1–S7을 지난다. 그 판을 조건부 PUT으로 S3에 올려 확정하고, 회차와 첫 조각 번호를 엣지 하한 기록기에 알린다.
  B(조각 장부 INSERT) -->|push| C(캐시 뷰)
  U(재생용 조각 업로드) -->|dirty 집합| C
  C --> D(틱 · 게이트 · 창)
  D --> F(사다리: 머리 다음 조각)
  F -->|평시| P(세대 예약 P0)
  F -->|L2| G(P0 + GAP 원장 INSERT)
  P --> H(렌더 · 검사 S1–S7)
  G --> H
  H --> J(조건부 PUT · 확정 · 하한 보고)
```

평시 경로는 목록 내용을 만들 때 DB를 읽지 않습니다. DB를 부르는 곳은 렌더 앞의 세대 예약(P0, GAP 틱이면 같은 트랜잭션의 원장 INSERT)과 PUT 뒤의 확정이고, S3는 조건부 PUT 한 번입니다.

## 조각이 장부에 들어오면 캐시에 실리고, 업로드 결과는 dirty 집합에 모입니다

사이드카의 인덱서는 녹화 파일이 완성되면 그 조각을 장부에 넣고, 커밋한 값을 그대로 되감기 캐시에 넘깁니다(push, `indexer.go` 901–902행). 이때 조각은 아직 목록에 실릴 수 없습니다. 되감기 목록에 실리는 기준은 S3에 올린 재생용 조각이 확정됐거나(uploaded) 그 번호가 GAP 원장에 있는 것이기 때문입니다.

업로드 결과는 다른 길로 옵니다. 업로더 워커는 확정 CAS가 성공하면 그 사실을 dirty 집합에 표시하고, 되감기 루프가 1초마다 집합을 읽어 캐시에 반영한 뒤 지웁니다(`rewind_loop.go` 367–388행). 채널이 아니라 집합이라 워커는 표시에서 막히지 않고, 같은 사실은 한 원소로 접혀 넘치거나 잃는 일이 없습니다(`dirty.go` 40–46행).

## 캐시는 스트림마다 메모리 뷰 하나라 평소 발행은 장부를 읽지 않습니다

되감기 캐시는 장부 · GAP 원장 · 컷오프(되감기를 시작한 첫 번호)의 메모리 뷰입니다. push가 장부의 변화를 넘겨받고, 뷰가 장부와 어긋나면 장부에서 다시 읽어 통째로 갈아 끼우는 적재(두 시간 되짚기 · 많아야 10,000행)가 유일한 되돌림입니다(`cache.go` 1–16행 · 57–68행). 그래서 목록을 만들 때 DB를 묻지 않습니다.

9월 1일 저는 되감기 목록을 장부에서 렌더해 S3에 정적으로 발행하는 안을 승인했습니다. 목록을 HTTP 서버가 요청마다 합성하는 안은 「시청 요청 하나에 DB 조회 0」을 지킬 수 없고 운영할 서버가 늘어서 버렸습니다. 늦은 쓰기가 새 판을 덮지 못하게 하는 장치는 [발행 정합성 글](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/)에, 캐시가 다른 상자의 push를 놓쳐 목록이 35분 멈춘 사건과 그 수리는 [캐시 교착 글](/posts/0-to-1/pokeclip-rewind-cache-deadlock/)에 있습니다.

## 1초 틱과 게이트가 언제 발행할지 정합니다

루프는 1초마다 한 번 돕니다(`indexer.go` 160행). dirty 반영 → 사다리 평가 → 틱 발사 순서라, 사다리는 반영된 업로드를 보고 틱은 사다리가 고른 GAP 후보를 받습니다(`rewind_loop.go` 190–209행). 틱은 스트림마다 하나뿐인 작업 차선에 들어가므로 루프는 DB와 S3를 기다리지 않습니다.

틱을 낼지는 게이트가 캐시 값만 보고 정합니다. 그 스트림이 적재 중이 아니고, 회차가 live이고, 그 회차의 init(초기화 조각)이 올라가 있어야 합니다(`gate.go` 19–21행). DB가 어차피 거절할 왕복을 보내지 않는 캐시 쪽 짝입니다. 틱은 dirty가 닿은 스트림, 직전 발행이 실패해 재발행 표지가 선 스트림, L2가 선 스트림에만 섭니다(`rewind_publish.go` 19–38행). 틱 안에서는 세대 예약 뒤 렌더한 본문이 직전 판과 sha256이 같으면 PUT하지 않으므로, 실제 PUT은 새 조각이 확정된 틱, 곧 4초에 한 번꼴입니다(`tick.go` 208–243행).

## 창의 머리는 연속 확정까지, 꼬리는 1시간으로 자릅니다

틱이 서면 경계 계산이 창을 정합니다. 머리는 컷오프부터 끊김 없이 확정된 앞부분의 끝이고, 꼬리는 머리에서 거꾸로 조각 길이를 더해 처음 1시간에 닿는 행입니다. 그래서 창 길이는 1시간 이상, 1시간 + 가장 긴 조각 미만입니다(`boundary.go` 14–18행 · 75–153행). 이 규칙과 검증은 [재생 목록 경계 글](/posts/0-to-1/pokeclip-manifest-window-boundaries/)에 있습니다. 머리가 멈췄다면 원인은 언제나 머리 다음 행 하나이고, 사다리는 그 행만 봅니다.

## 머리 다음 조각이 늦으면 0.5 · 2 · 5.5 · 7.5초에 다른 일을 합니다

되감기 목록의 목표 길이(TARGETDURATION)는 6초라 갱신 의무는 9초입니다. 클라이언트는 목록이 목표 길이의 1.5배 동안 바뀌지 않으면 서버가 잘못됐다고 볼 수 있습니다([RFC 8216bis-22 6.3.4](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 설계는 이 9초에서 거꾸로 셌습니다. 엣지가 새 판을 보이기까지 1.5초(목록 TTL 1초 + 전파 0.5초), 발행 한 번의 예산 2초를 빼면 손을 써야 하는 마감은 5.5초입니다(`publisher.go` 101–149행).

이 마감을 재는 축은 둘입니다. 설계의 이전 판은 「목록이 멈춘 시간」 하나로 7초에 GAP을 세웠는데, 그러면 장부에 행조차 없는 자리에도 GAP을 세우려 했습니다. 그래서 둘로 나눴습니다. holdAge는 머리 다음 조각이 실렸어야 할 때(PDT + 길이 + 종단 예산 2초)부터 잰 시간이라 정상 경로에서는 음수입니다. stallAge는 마지막 발행 성공부터 잰 시간입니다. 조각이 캐시에 있으면 holdAge로 업로드를 기다렸다가 GAP을 세우고, GAP이 서기 전까지는 stallAge가 경보와 마감을 정합니다(`ladder.go` 1–23행).

영상에서 위 축의 두 단계가 먼저, 아래 축의 두 단계가 다음에 켜지는 것을 보면 됩니다. 두 축의 0은 서로 다른 시각이고, 두 축은 눈금 간격도 다릅니다.

{{< motion scene="StallLadder" id="fig-stall-ladder" kind="개념도" caption="머리 다음 조각이 캐시에 있으면 그 조각이 실렸어야 할 때부터 0.5초에 업로드 재시도를 당기고 2초에 GAP을 세웁니다. GAP이 서지 않은 동안 마지막 발행 성공부터 5.5초에는 봉인(GAP을 세울 수 없을 때만 · 스위치 기본 끔), 7.5초에는 경보가 섭니다. 두 축의 0과 눈금 간격은 다릅니다. 값은 PokeClip-mono develop 627fb5a2의 설계 상수입니다." >}}

| 단계 | 문턱 | 하는 일 | 숫자의 근거 | 고정 커밋의 기본 |
|---|---|---|---|---|
| L1 | holdAge ≥ 0.5초 | 그 조각의 다음 업로드 재시도 시각을 지금으로 당김 | 설계값 | 켬 |
| L2 | holdAge ≥ 2초 ∧ 캐시 행이 GAP 적격 | GAP 틱 | 업로더의 1초 · 2초 간격 재시도 두 번에 시간을 줌 | 켬 |
| L2′ | stallAge ≥ 5.5초 ∧ L2를 세울 수 없음(holding · `view_behind` 제외) | 봉인(ENDLIST) 뒤 회차 종료 | 9 − 1.5 − 2 | `REWIND_STALL_SEAL` 끔 |
| L3 | 이어서 선 GAP 3개 | 회차 종료 | 설계 권고값 | `REWIND_GAP_RUN_END` 끔 |
| L4 | stallAge ≥ 7.5초 ∧ L2가 아직 서지 않음(holding 포함) | `rewind_publish_stall_seconds` ERROR 한 줄 | 9 − 1.5 | 켬 |

L1은 백오프 대기만 없애고 격리 · 브레이커는 그대로 둡니다(`guard.go` 427–436행). L4는 다음 행이 캐시에 없는 `no_row`면 WARN으로 낮추고 정체마다 한 줄만 남깁니다(`ladder.go` 139–247행). L3은 같은 회차에서 번호가 이어진 GAP을 셉니다(`gap_run.go` 1–24행).

L2′과 L3은 기본으로 꺼져 있고, 켜는 조건은 운영 송출의 종단 지연 실측과 S3 짧은 장애 주입 실측이 둘 다 끝나고 제가 승인하는 것입니다(`media/README.md` 197–198행). 고정 커밋의 `infra/` 원문에는 두 이름이 없습니다. 종단 예산 2초도 아직 재지 않은 잠정값이고, 그래서 L2는 설계가 2단계로 미뤄 둔 stallAge 갈래 없이 holdAge 하나로만 섭니다.

사다리의 판정 함수를 가짜 시각 위에서 10ms씩 옮기며 돌려 보면 아래와 같습니다. 직전 발행은 머리 다음 조각이 시작된 지 1초 뒤에 있었다고 뒀고(A′만 0.3초), 이 값은 재지 않은 설명용 가정입니다. 운영 루프는 1초 틱이라 실제로는 문턱 뒤 첫 틱에 섭니다.

| 장면 | 일 | stallAge | holdAge | 신호 |
|---|---|---|---|---|
| A 조각 있음 · 업로드 막힘 | L1 → L2 GAP | 5.5 → 7.0초 | 0.5 → 2.0초 | – |
| A′ 같은 장면, 직전 발행 0.3초 뒤 | L1 → L4 → L2 GAP | 6.2 → 7.5 → 7.7초 | 0.5 → 1.8 → 2.0초 | ERROR `gap=holding` |
| C 다음 조각 없음, 봉인 끔 | L4 | 7.5초 | – | WARN `gap=no_row` |
| D 조각에 키 없음(부적격), 봉인 끔 | L1 → L4 | 5.5 → 7.5초 | 0.5 → 2.5초 | ERROR `gap=incomplete` |

장면 A에서 GAP은 조각이 끝난 뒤 4초, stallAge로는 7.0초에 섭니다. 여기에 발행 예산 2초와 엣지 1.5초를 다 쓰면 엣지에서 본 갱신 간격이 9초를 넘을 수 있어, A는 의무의 경계에 있는 장면입니다. 설계는 이 경우를 위해 L2에 stallAge 5.5초 갈래를 두었고, 고정 커밋은 그 갈래를 2단계로 미뤘습니다. 되감기 머리의 공백은 조각 끝부터 약 7.5초로 [라이브 창 28초](/posts/0-to-1/pokeclip-live-window-without-fork/) 안에 듭니다. A′은 직전 발행이 머리 다음 조각 시작 뒤 0.5초 안에 있었다고 둔 장면입니다. 그러면 stallAge 7.5초가 holdAge 2초보다 먼저 와서, 1초 틱이 그 사이 0.2초에 떨어질 때 ERROR `gap=holding` 한 줄이 GAP보다 먼저 섭니다. 저장소 시험(`TestLadderAlarmLevelFollowsBlockedReason`의 `GAP_HOLD_앞`)이 이 경우를 ERROR로 고정해 두었습니다. 이때는 GAP을 세워도 발행 예산을 더하면 9초를 넘길 수 있어, 경보가 가리키는 위험은 실제입니다. 직전 발행이 0.5초 안에 끝나는 일이 운영에서 얼마나 되는지는 재지 않았습니다.

## GAP은 두 번 확인하고, 줄을 처음 붙일 때만 붙입니다

`#EXT-X-GAP`은 그 조각 URI에 미디어가 없으니 받지 말라는 표시입니다([RFC 8216bis-22 4.4.4.7](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 규격은 없는 구간을 GAP 조각으로 알리라고 권하고, GAP이 붙지 않은 조각은 목록에 실리는 순간 받을 수 있어야 한다고 정합니다(6.2.1). 첫 조각 번호(MSN)가 첫 줄 조각의 장부 번호라 업로드가 안 된 조각을 빼면 번호가 끊기므로, 빼지 않고 GAP으로 싣습니다.

첫 확인은 캐시에서 합니다. 행이 있고, 회차 · PDT · 재생용 키 · 길이가 있고, 컷오프 이상이어야 L2가 GAP 후보를 냅니다. 두 번째 확인은 GAP 틱의 트랜잭션 안에서 DB로 합니다. 세대 예약(P0)과 같은 트랜잭션에서 그 행을 다시 읽어, 아직 업로드가 확정되지 않았을 때만(`pending` · `failed`) GAP 원장에 넣습니다(`gap.go` 21–42행). 캐시가 늦어 그사이 올라간 조각에 GAP을 세우는 일을 막습니다. GAP이 서지 않은 틱은 올리지 않습니다. 그 틱의 창은 후보를 확정으로 본 창이라 다음 판의 MSN이 뒤로 갈 수 있어서입니다(같은 파일 55–88행).

GAP을 「처음 붙일 때만」 붙이는 것은 규격이 강제합니다. 서버는 줄을 덧붙이거나 앞에서 지우거나 ENDLIST를 더하는 것 말고는 목록을 바꿀 수 없어(6.2.1), 이미 실린 줄에 GAP을 붙이거나 GAP 줄을 진짜 조각으로 바꿀 수 없습니다. 사다리가 보는 행은 언제나 머리 다음, 곧 아직 목록에 없는 줄이므로 GAP은 그 줄이 처음 실리는 판에만 붙습니다. 뒤늦게 업로드가 성공해도 되감기 목록의 그 줄은 GAP으로 남습니다.

## 렌더한 본문은 S1–S7 검사를 지나야 S3에 올라갑니다

렌더는 창의 행을 아래 순서로 씁니다(`render.go` 108–171행). 재측정에서 만든 목록의 첫 조각과 GAP 줄을 발췌했습니다(예시 도메인 · 지어낸 스트림 이름).

```text
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100000
#EXT-X-DISCONTINUITY-SEQUENCE:0
#EXT-X-MAP:URI="https://media.example.com/dvr/stream01/init/S-20261118-030000-stream01-100000.mp4"
#EXT-X-POKECLIP-TIMING:2
#EXT-X-PROGRAM-DATE-TIME:2026-11-18T03:00:00.000Z
#EXTINF:4.000,
https://media.example.com/dvr/stream01/S-20261118-030000-stream01-100000/seg/100000.m4s
… (449개 조각 생략)
#EXT-X-GAP
#EXT-X-PROGRAM-DATE-TIME:2026-11-18T03:30:00.000Z
#EXTINF:4.000,
https://media.example.com/dvr/stream01/S-20261118-030000-stream01-100000/seg/100450.m4s
```

| 줄 | 언제 | 왜 |
|---|---|---|
| `VERSION:6` | 머리 | `EXT-X-MAP`이 6 이상을 요구하고(8절), 필요보다 높게 적지 않음(6.2.1) |
| `MEDIA-SEQUENCE` | 머리 | 첫 줄 조각의 장부 번호 — 목록 안 번호는 1씩 이어져야 함 |
| `DISCONTINUITY` | 조각 앞 | 이어받은 이전 세션과의 경계 등 |
| `MAP` | 회차가 바뀌는 첫 줄 | 회차 안 init은 같은 바이트 |
| `POKECLIP-TIMING` | 판이 바뀌는 줄 | 플레이어가 조각마다 PDT 환산식을 고름 |
| `GAP` | GAP 원장에 있는 행 | 위 절 |
| `PROGRAM-DATE-TIME` | 모든 조각 | 장부 값. EXTINF 누적으로 대신하면 900조각에서 최대 0.45초 어긋남 |

VERSION 6은 설계의 9를 제가 고친 값입니다([RFC 8216bis-22 8절](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 판 태그는 본문에 우리 용도의 줄을 넣지 않는 원칙의 유일한 예외로, 플레이어가 [미디어 시각 환산식](/posts/projects/pokeclip-media-timeline-over-wall-clock/)을 고르는 재료입니다. 모르는 태그는 클라이언트가 무시하고(6.3.1), hls.js 1.7.3이 MAP 앞의 태그를 init 쪽으로 넘겨 MAP 뒤에 둡니다(`render.go` 173–219행).

렌더한 본문은 올리기 직전에 일곱 검사를 지납니다(`validate.go` 130–179행). 본문이 행 값을 그대로 적었는지 먼저 보고, 줄 수(S1)와 MSN · DISC-SEQ(S2)가 뒤로 가지 않는지, 실린 행이 모두 확정인지(S3), 이어받은 앞부분이 올바른지(S4), 형식 · 목표 길이 · 크기 512KiB(S5), 세대(S6), PDT가 뒤로 가거나 허용 폭보다 크게 겹치지 않는지(S7)를 봅니다. S4만 이어받은 앞부분을 빼고 다시 렌더하고, 나머지는 그 판을 내지 않습니다. 발행된 줄은 고칠 수 없어서 틀린 판을 내느니 멈추는 쪽을 골랐습니다.

설계는 1시간 목록을 원본 약 90KB, gzip 약 10KB로 어림하고 실측이 필요하다고 적었습니다. 고정 커밋의 `Render`로 900조각 목록을 만들어 재 보니 지금 쓰는 회차 경로 키에서는 원본이 그보다 컸습니다. 그림에서 원본 막대와 512KiB 선 사이의 거리를 보면 됩니다.

{{< chart id="fig-playlist-size" kind="실측" caption="고정 커밋의 Render로 만든 1시간(4초 × 900조각) 되감기 목록의 크기입니다. 회차 꼴 키의 원본은 스트림 이름 8–32자에서 135–177KiB로 상한 512KiB의 26–35%이고, gzip 크기는 막대로 거의 보이지 않아 아래 표에 적었습니다. 예시 도메인 · 지어낸 스트림 이름 · 결정적으로 만든 값이며 운영 목록이 아닙니다." source="https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-sidecar-rewind-playlist/measure" height="360px" >}}
{
  "grid": {"left": 8, "right": 32, "top": 44, "bottom": 8, "containLabel": true},
  "legend": {"top": 0, "data": ["원본", "gzip -6"]},
  "xAxis": {"type": "value", "name": "KiB", "min": 0, "max": 560},
  "yAxis": {"type": "category", "inverse": true, "data": ["옛 꼴", "회차 · 8자", "회차 · 길이 흔듦", "회차 · 16자", "회차 · 32자"]},
  "series": [
    {"name": "원본", "type": "bar", "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [104.8, 134.7, 134.7, 148.8, 176.9], "markLine": {"symbol": "none", "silent": true, "lineStyle": {"color": "#b42318", "type": "dashed", "width": 2}, "label": {"formatter": "상한 512KiB", "position": "start"}, "data": [{"xAxis": 512}]}},
    {"name": "gzip -6", "type": "bar", "itemStyle": {"color": "#7a8a9b"}, "data": [5.3, 5.3, 9.3, 5.4, 5.5]}
  ]
}
{{< /chart >}}

| 경우(900조각) | 원본 | gzip -6 | 상한 대비 | 조각당 |
|---|---|---|---|---|
| 옛 꼴 키 `dvr/{스트림}/seg/{번호}` · 판 태그 없음 | 107,309B | 5,394B | 20.5% | 119B |
| 회차 꼴 키 · 스트림 8자 · GAP 1 | 137,945B | 5,445B | 26.3% | 153B |
| 같은 키 · 조각 길이 ±30ms | 137,934B | 9,528B | 26.3% | 153B |
| 회차 꼴 키 · 스트림 16자 | 152,350B | 5,509B | 29.1% | 169B |
| 회차 꼴 키 · 스트림 32자 | 181,182B | 5,623B | 34.6% | 201B |

원본이 어림보다 컸던 것은 조각 주소에 회차 ID가 들어가서입니다. 회차 ID는 세션 ID 꼴(`S-날짜-시각-스트림-번호`)이라 스트림 이름이 두 번 들어가고, 같은 스트림 이름에서 조각마다 회차 ID 길이(26B + 스트림 이름), 곧 34–58B가 늘었습니다. gzip은 길이가 다 같은 목록을 원본의 4% 안팎으로, 길이를 ±30ms 흔든 목록을 7%로 줄였고, 운영 목록은 그보다 클 수 있습니다. 다만 고정 커밋의 Terraform 원문에는 `/dvr/*` 규칙과 경로 규칙을 만드는 블록에 `compress` 키가 없고 캐시 정책도 gzip을 켜지 않아, PokeClip-mono PR 537 전까지 목록은 압축 없이 나갔습니다(`main.tf` 59–64행 · 161–185행 · `policies.tf` 83–103행 · [AWS 「Serve compressed files」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html)). 그 뒤 PokeClip-mono PR 537(머지 `31f2f32d`)에서 목록 경로 규칙 둘(`/dvr/*.m3u8` · `/vod/*.m3u8`)을 따로 두어 `compress = true`와 gzip만 허용하는 캐시 정책을 붙였고, 나머지 규칙은 `compress = false`입니다([목록 gzip 글](/posts/0-to-1/pokeclip-playlist-gzip/)). 상한은 1시간을 1.05–1.38초 조각으로 채워야 닿았고, 그 판은 S5가 막았습니다.

틱은 세대 예약(P0) → 렌더 → 검사 → 조건부 PUT → 확정 CAS 순서로 돕니다. 검사 S6이 예약한 세대를 보기 때문입니다. 첫 판은 없을 때만, 다음 판은 직전 판의 ETag와 같을 때만 쓰고, 목록의 `Cache-Control`은 1초입니다(`tick.go` 140–160행 · `s3store.go` 27–44행). fence · 세대 · 412 처리와 실제 S3 시험은 [발행 정합성 글](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/)에 있습니다.

## 봉인과 동결은 다르고, 발행이 끝나면 엣지 하한을 알립니다

목록을 닫는 길은 둘입니다. 동결은 회차가 끝났을 때의 정상 경로입니다. 캐시가 아니라 장부에서 그 회차를 한 번 다시 읽어, 렌더와 검사를 거친 마지막 판에 ENDLIST를 붙입니다(`freeze.go` 153–161행). 봉인은 마지막으로 발행한 본문을 S3에서 읽어 sha256을 견준 뒤 끝에 `#EXT-X-ENDLIST` 한 줄만 더해 올립니다. 렌더나 검사가 고장 났을 때도 닫을 수 있도록 둘을 타지 않는 유일한 경로입니다(`seal.go` 22–43행 · `freeze.go` 233–241행). 봉인은 L2′, 동결이 세 번 실패한 뒤의 2단계, 동결 중 멈춘 회차를 거두는 좌초 회수에서 씁니다(`finalize.go` 7–10행).

정체 마감이 하필 ENDLIST인 까닭도 6.2.1에 있습니다. 갱신 의무는 「새 조각을 실은 갱신」부터 세므로 같은 본문을 다시 올려서는 의무를 지우지 못하고, ENDLIST가 붙은 목록에는 의무가 없습니다. 봉인도 fence를 잡아야 하고, 봉인 직전에 장부 끝을 다시 보는 확인은 [캐시 교착 글](/posts/0-to-1/pokeclip-rewind-cache-deadlock/#봉인-직전에-같은-트랜잭션에서-장부-끝을-다시-봅니다)에 있습니다.

새 판을 발행한 틱마다 사이드카는 그 목록의 회차와 첫 조각 번호를 엣지 하한 기록기에 알립니다. 키가 옛 꼴이면 알리지 않아 엣지가 막지 않는 쪽으로 빠지고, 관측 시각이 틱이 돌아온 뒤라 하한은 실제 발행보다 조금 늦게 오릅니다(`edge_bounds.go` 274–312행). 그 하한이 60초 여유를 두고 KVS에 쓰여 창 밖 조각을 막는 쪽은 [1편 둘째 글](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/#엣지-함수가-1시간-창-밖-조각을-404로-막습니다)에 있습니다.

## 받아들인 한계는 갱신 의무와 압축 쪽에 남았습니다

갱신 의무 9초는 모든 경우에 지켜지지 않습니다. 9월 1일 저는 S3 장애로 PUT을 못 하는 동안의 위반을 관리형 서비스 의존의 예외로 받아들였고, 상한은 없습니다. PUT이 실패한 틱이 결과를 「발행 없음 · 오류 없음」으로 남기면 목록이 다음 조각까지 한 틱 늦고, 방송 끝에서는 마지막 조각이 실리지 않을 수 있는 것도 받아들였습니다. 꼬리 조각이 교정으로 6.5초를 넘으면 그 목록은 S5에 걸려 최대 1시간 멈춥니다(`media/README.md` 「발행과 경보」 한계 표).

종단 예산 2초와 엣지 1.5초는 실측 전 가정값이라, 사다리의 마감 두 스위치는 실측 전까지 기본으로 꺼 두었습니다. 목록 압축은 설계가 필수로 적었지만 고정 커밋의 CDN 설정에는 없었고, 그 뒤 되감기 · VOD 목록에만 gzip을 켰습니다([목록 gzip 글](/posts/0-to-1/pokeclip-playlist-gzip/)). 라이브 목록은 아직 압축되지 않고, 적용 직후 gzip 변형의 첫 요청은 MISS입니다. 비슷한 정적 발행을 설계한다면 갱신 의무에서 거꾸로 센 마감을 먼저 정하고, 「업로드를 기다리는 시간」과 「목록이 멈춘 시간」을 다른 축으로 재십시오. 한 축으로 재면 기다려야 할 조각에 GAP을 세우거나, 세울 수 없는 GAP을 기다리다 의무를 넘깁니다.

## 측정 조건

- **공개 재측정.** AI(Claude Code)가 2026년 11월 18일 05:06–05:08 KST에 실행했습니다. MacBook Air(Apple M5), macOS 27.0.1, Go 1.27.2 darwin/arm64, OrbStack(Docker Engine 29.8.2), `postgres:17`(PostgreSQL 17.10, 데이터 tmpfs, 라벨 `com.techblog.bench=dvr2`). 3K-PokeClip/PokeClip-mono develop `627fb5a2`(2026년 11월 17일)의 `media/`를 `git archive`로 풀었습니다.
- **저장소 시험.** PG 없이 `go test -count=1 -race`로 `internal/rewind/boundary`(12) · `internal/rewind`(71) · `internal/rewind/cache`(62) · `internal/rewind/publish`(316) · `internal/rewind/finalize`(5)(괄호는 시험 함수 수)와 `cmd/segment-indexer`의 사다리 · 봉인 · L3 · 감시 · 엣지 보고 시험 58개가 통과했습니다(PG 시험 5개는 건너뜀). PG를 붙여 `internal/rewind/cache` · `internal/rewind/publish` 전체와, GAP 틱 · 봉인 · 동결 · L3을 고른 159개(`TestGapTickRechecksUploadInDB` 등)가 통과했습니다.
- **목록 크기.** 저장소에 없는 시험을 더해 `rewind.Render`로 4초 × 900조각 목록을 만들고 `Validate`와 Go `compress/gzip`으로 쟀습니다. 키는 `playback.RoundSegKey` · `SegKey`, 회차 ID는 세션 ID 꼴, 도메인은 `https://media.example.com`입니다.
- **사다리 시간표.** 저장소에 없는 시험을 더해, 저장소의 사다리 픽스처(4초 조각 0–10, 머리 5)와 기본 설계값으로 판정 함수 `evaluateLadder`를 0–12초 동안 10ms마다 불렀습니다. 루프 · DB · S3는 돌리지 않았습니다.
- **명령.** 실행 순서가 적힌 `run.sh`와 시험 · 원자료는 [저장소 `_workspace/blog/pokeclip-sidecar-rewind-playlist/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-sidecar-rewind-playlist/measure)에 있습니다.
- **결정 날짜와 설계 근거.** 9월 1일의 정적 발행 승인 · 갱신 의무 위반 수용, 설계의 크기 어림과 축을 나눈 까닭, VERSION 6 결정은 팀 내부 설계 · 결정 기록(비공개)에서 옮겼습니다.

## 출처

규격 · 문서
- [RFC 8216bis-22, HTTP Live Streaming 2nd Edition](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) — 4.4.4.7 EXT-X-GAP · 6.2.1 서버가 목록을 바꿀 수 있는 경우, 갱신 의무 1.5 × 목표 길이, 없는 구간의 GAP · 6.3.1 모르는 태그 무시 · 6.3.4 목록이 바뀌지 않을 때의 클라이언트 · 8절 VERSION 6과 EXT-X-MAP
- [AWS — Serve compressed files](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html) — `Compress` · `EnableAcceptEncodingGzip`, 1,000–10,000,000바이트, `application/vnd.apple.mpegurl`

코드(프로젝트 저장소 3K-PokeClip/PokeClip-mono · 2026년 11월 20일부터 비공개, develop `627fb5a2`)
- 입력: `indexer.go` 901–902행 · 160행 · `dirty.go` 40–46행 · `rewind_loop.go` 190–209행 · 367–388행 (비공개 저장소)
- 캐시 · 게이트 · 창: `cache.go` 1–16행 · 57–68행 · `gate.go` 19–21행 · `boundary.go` 75–153행 · `rewind_publish.go` 19–38행 (비공개 저장소)
- 사다리 · GAP: `publisher.go` 101–149행 · `ladder.go` 1–23행 · 139–247행 · `guard.go` 427–436행 · `gap.go` 21–88행 · `gap_run.go` 1–24행 (비공개 저장소)
- 렌더 · 검사 · 발행: `render.go` 108–219행 · `validate.go` 130–179행 · `tick.go` 140–243행 · `s3store.go` 27–44행 · `cdn_media/main.tf` 59–64행 · 161–185행 · `policies.tf` 83–103행 (비공개 저장소)
- 봉인 · 동결 · 엣지 보고: `seal.go` 22–43행 · `freeze.go` 153–241행 · `finalize.go` 7–10행 · `edge_bounds.go` 274–312행 (비공개 저장소)
- 스위치와 한계: `media/README.md` 197–198행 · 「발행과 경보」 한계 표 (비공개 저장소)
- 들어온 PR: PokeClip-mono PR 196 — 렌더 · 경계 · 캐시 · PR 289 — S3 발행 · 게이트 · GAP · 사다리 1단계 · PR 461 — L2′ · L3 스위치 · 동결 감사 (비공개 저장소)

재측정
- [스크립트 · 시험 · 원자료](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-sidecar-rewind-playlist/measure)

이어지는 글
- [CDN 하나에서 라이브는 EC2로, 되감기는 S3로 보냈습니다](/posts/0-to-1/pokeclip-live-dvr-url-split/) — 1편, 주소와 원본
- [서명 쿠키는 종류별로 나누고 1시간 창은 엣지에서 막았습니다](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/) — 1편 둘째 글, 엣지 하한
- [다른 상자가 먼저 넣은 조각 하나에 되감기 목록이 멈췄습니다](/posts/0-to-1/pokeclip-rewind-cache-deadlock/) — 캐시 push · 감시 · 봉인 직전 확인
- [HLS 재생 목록은 연속으로 확정된 조각까지만 공개했습니다](/posts/0-to-1/pokeclip-manifest-window-boundaries/) — 창의 머리 · DISC-SEQ
- [늦게 끝난 발행이 새 HLS 목록을 덮지 못하게 했습니다](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/) — fence · 세대 · 조건부 PUT
- [되감기 목록만 gzip으로 압축하고 라이브 목록은 미뤘습니다](/posts/0-to-1/pokeclip-playlist-gzip/) — 목록 압축 · CloudFront 조건
