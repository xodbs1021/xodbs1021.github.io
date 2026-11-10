---
title: "끝난 HLS 목록은 다시 열지 않고 새 세션 주소를 줬습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-11T06:06:24+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "같은 송출 키로 방송이 다시 붙을 때 ENDLIST를 단 HLS 목록에 조각을 붙이지 않고 세션마다 새 목록 주소를 준 판단, 300초 안에 같은 코덱 사양으로 돌아온 송출이 앞 세션 조각을 이어 받는 계승 규칙과 compose 실측, 그리고 이 규칙 위에 사슬·회차와 회차 다시보기 문서가 생긴 과정."
tags: ["PokeClip", "HLS", "EXT-X-ENDLIST", "세션", "설계"]
portfolio_cases: [26]
portfolio_pages: [30, 31]
portfolio_edition: "2026-10-15-v2"
---

PokeClip 스트리머는 같은 송출 키로 몇 번이고 방송을 다시 켭니다. 끊긴 송출이 돌아왔을 때 이미 `#EXT-X-ENDLIST`(목록 끝 표시)를 단 HLS 재생 목록에 조각을 이어 붙이면, 끝 표시를 본 플레이어와 새로 들어온 플레이어가 같은 주소를 다르게 읽습니다. 그래서 끝난 목록은 그대로 두고, 송출이 다시 붙을 때마다 새 세션과 새 목록 주소를 열었습니다. 끊긴 지 300초 안에 같은 코덱 사양으로 돌아온 송출은 앞 세션의 조각을 새 목록 앞에 이어 붙여(계승) 되감기가 끊기지 않게 했습니다. 10월 17일 로컬 compose 실측에서 120초 뒤 다시 붙인 송출은 앞 세션 조각 15개를 이어 받았고, 400초 뒤 붙인 송출은 이어 받지 않았습니다. 이 규칙은 10월 19일 [PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289)로 develop에 들어갔습니다.

저는 끝난 목록을 다시 열지 않는 것, 끊긴 방송의 되감기를 이어 줘야 한다는 것, 계승 창을 300초로 두는 것, 스트리머가 방송 종료를 누른 뒤에는 잇지 않는 것을 정했고 PR을 머지했습니다. 선례 조사, 설계 문서, 구현, compose 실측은 AI(Claude Code와 하위 에이전트)가 했고, 리뷰는 Claude Code와 Codex가 함께 했습니다. 당시 설계 문서와 PR #289는 이 글의 세션을 「회차」라고 불렀습니다. 지금은 시청자가 「방송 한 번」으로 보는 단위를 회차라고 부르고, 세션은 그 안에서 사이드카가 목록 하나를 여닫는 단위로, 송출이 끊겼다 이어지거나 조각이 목록의 목표 길이를 넘거나(TD 분할) init이 바뀌면 새로 열립니다.

## 송출 키·녹화기 표식·세션은 수명이 달랐습니다 {#서로-다른-세-식별자를-한-값으로-쓰지-않기}

방송 하나를 가리킬 후보는 셋이었습니다. 송출 키는 계정에 묶여 있어 월요일 방송과 화요일 방송이 같은 값을 씁니다. 녹화기(MediaMTX)가 조각에 찍는 표식(mtxi StreamID)은 처음에 「표식이 바뀌면 새 방송」이라고 가정했지만, 실제로는 녹화기 인스턴스의 표식이었습니다. 0.7초 만에 다시 붙은 재접속에서도 표식이 둘로 갈렸고(비공개 실측), 녹화기가 다시 뜨면 방송 중간에도 바뀌었습니다. 그래서 2026년 8월 말 이 가정을 버렸습니다.

| 후보 | 수명 | 방송 하나를 가리키지 못한 이유 |
|---|---|---|
| 송출 경로·키 | 계정이 있는 동안 여러 방송에 걸쳐 재사용 | 다른 날 방송이 같은 값 |
| 녹화기 표식(mtxi StreamID) | 녹화기 인스턴스가 다시 뜰 때마다 바뀜 | 한 번 이어진 송출 안에서도 바뀔 수 있음 |
| 세션 | 사이드카가 녹화기 훅과 DB 장부로 여닫음 | 이 판단의 단위 |

세션을 여닫는 판정은 녹화기 훅과 DB 장부를 함께 보는 사이드카(segment-indexer)에 두고, 녹화기 표식은 보조 신호로만 썼습니다. 이렇게 하면 송출 키를 그대로 쓰면서 새 세션을 열 수 있고, 녹화기 표식이 바뀌어도 같은 세션으로 다룰 수 있습니다. 식별자가 바뀌는 사건과 시청자가 보는 방송이 끝나는 사건은 같은 사건이 아니었습니다.

## 끝난 목록에 조각을 붙이면 두 플레이어가 다르게 읽습니다

ENDLIST는 그 목록에 미디어 조각이 더 붙지 않는다는 표시입니다([RFC 8216 4.3.3.4](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.3.4)). 같은 RFC는 서버가 목록을 바꿀 수 있는 경우를 넷으로 한정합니다. 줄을 덧붙이기, 앞 조각을 순서대로 빼기, 순번 값 올리기, ENDLIST 달기입니다([RFC 8216 6.2.1](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.1)). ENDLIST를 떼는 변경은 이 목록에 없습니다.

플레이어 쪽에서도 갈립니다. hls.js 1.7.3은 ENDLIST를 읽으면 그 목록을 라이브가 아닌 것으로 표시하고([`m3u8-parser.ts` 541–546행](https://github.com/video-dev/hls.js/blob/v1.7.3/src/loader/m3u8-parser.ts#L541-L546)), 다시 받기 타이머는 라이브 목록에만 겁니다([`base-playlist-controller.ts` 177–178행](https://github.com/video-dev/hls.js/blob/v1.7.3/src/controller/base-playlist-controller.ts#L177-L178)). 끝 표시를 이미 본 플레이어는 목록을 다시 받지 않으니 뒤에 붙은 조각을 모릅니다. 같은 주소를 나중에 연 플레이어는 조각이 붙은 목록을 받습니다. 주소 하나가 시청자마다 다른 방송이 됩니다. 이 절의 hls.js 동작은 소스를 읽어 확인했고 재생으로 재현하지는 않았습니다.

## 목록을 다시 열지 않고 새 세션에 새 주소를 줬습니다 {#endlist를-지우는-대신-새-회차를-만듭니다}

2026년 8월 19일, 같은 주소에서 ENDLIST를 떼고 창을 바꾸는 초기 안을 버리고 세션마다 새 목록 주소를 주기로 정했습니다. 초기 안은 Codex 리뷰에서 규격 위반으로 거듭 지적받았습니다. 새 주소는 `dvr/{스트림}/{세션}/index.m3u8` 꼴이고, 끝난 세션의 목록은 다시 열지 않습니다. PR #289 시점에는 끝난 세션 목록의 갱신만 멈췄고 ENDLIST는 붙지 않았습니다. 끝난 목록 끝에 ENDLIST를 붙여 봉인하는 동결은 10월 29일 PR #450의 함수와 10월 30일 [PR #461](https://github.com/3K-PokeClip/PokeClip-mono/pull/461)의 배선으로 들어왔습니다. 플레이어는 스트림 단위 제어면 API(`GET /api/streams/{streamId}/rewind`)에서 지금 볼 목록 주소를 받습니다([media/README.md 「되감기 상태 제어면」](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L721-L733)).

같은 생각의 선례는 있었습니다. Mux는 송출이 끊긴 뒤 `reconnect_window`(표준 지연 기본 60초, 최대 1,800초) 동안 기다리고, 그 시간을 넘기면 방송을 끝난 것으로 보고 녹화 자산을 완료합니다([Mux API `reconnect_window`](https://docs.mux.com/api-reference/video/live-streams/create-live-stream)). 끝난 것을 다시 열지 않는다는 점이 같습니다.

대가는 진입점 한 단계입니다. 주소 하나를 계속 고쳐 쓰는 편의 대신, 지금 세션의 주소를 알려 주는 단계와 그 답을 해석하는 플레이어 코드가 생깁니다. 주소를 나눈다고 늦게 도착한 쓰기 경합까지 사라지지는 않으므로, 같은 세션 안의 발행 경합은 [DB 장부와 조건부 쓰기](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/)로 따로 막았습니다.

새 주소만 주면 되감기가 끊깁니다. 영상에서 위 목록은 ENDLIST를 단 채 그대로 있고, 아래에 새 세션 주소가 열립니다. 새 목록 앞에 앞 세션 조각이 붙는 순간을 보면 됩니다.

{{< motion scene="SessionUrlInherit" id="fig-session-inherit" kind="개념도" caption="끊긴 송출이 120초 뒤 돌아오면 앞 세션 목록은 ENDLIST를 단 채 그대로 두고 새 세션에 새 목록 주소를 엽니다. 300초 안이고 코덱 사양 지문이 같으므로 새 목록은 앞 세션 조각을 머리에 이어 붙이고, 경계에 DISCONTINUITY와 새 MAP을 답니다. 조각 수와 시간은 10월 17일 compose 실측(앞 세션 15조각, 120초 뒤 재접속)에 맞췄고, ENDLIST 봉인은 10월 30일 이후의 동작입니다. 그날 실측에서는 앞 목록의 갱신만 멈췄습니다." >}}

끝 표시를 본 플레이어의 목록은 끝까지 그대로이고, 새로 연 플레이어는 앞 세션 장면까지 되감을 수 있습니다.

## 300초 안에 같은 init으로 돌아오면 앞 세션을 잇습니다 {#짧게-다시-켠-방송의-과거-구간은-어떻게-할까}

주소를 나누자 「시청자 입장에서는 계속 보던 방송에서 갑자기 되감기가 막힌다」는 문제가 남았습니다. 그래서 새 세션 목록이 직전 세션의 조각을 머리(접두부)로 물려받게 했습니다. 경계에는 `#EXT-X-DISCONTINUITY`와 새 세션의 `#EXT-X-MAP`(초기화 조각 init)을 둡니다. 새 주소는 처음부터 접두부를 담고 태어나므로 기존 목록을 고치는 6.2.1의 제한에 걸리지 않습니다.

| 다시 붙은 송출 | 처리 |
|---|---|
| 직전 세션 마지막 조각 끝에서 300초 안, 코덱 사양(stsd) 지문 같음 | 계승: 새 목록 앞에 직전 세션 조각, 경계에 DISCONTINUITY와 새 MAP |
| 300초 안, 지문이 다름 | 계승하지 않고 빈 창에서 시작(아래 「새 사슬」 절) |
| 300초를 넘김 | 계승하지 않고 빈 창에서 시작(지금은 새 회차) |
| 직전 세션이 방송 종료 신호로 끝남 | 300초 안이어도 계승하지 않음(9월 26일 결정, 10월 29일 PR #450 반영) |
| 직전 세션 목록 | 어느 경우든 ENDLIST를 단 채 그대로 |

300초는 설계한 수명 제한입니다. 어제 방송의 꼬리가 오늘 되감기 창에 붙지 않게 하는 값이고, 복구 시간이나 시청자 대기를 잰 값이 아닙니다. 처음에는 600초로 잡았다가, 끊긴 송출을 한 방송으로 합치는 시간의 선례인 Amazon IVS의 녹화 재접속 창(최대 300초, [IVS `recordingReconnectWindowSeconds`](https://docs.aws.amazon.com/ivs/latest/LowLatencyAPIReference/API_RecordingConfiguration.html))에 맞춰 300초로 줄였습니다. 반면 끊긴 뒤 새 라이브 목록에 앞 방송의 되감기 구간을 채워 넣는 기능은 2026년 8월 조사(비공개)에서 네 서비스(Mux, Cloudflare Stream, IVS, MediaPackage)의 문서에서 찾지 못했습니다. 그만큼 검증 부담도 우리 몫이었습니다.

시간만 맞는다고 잇지는 않습니다. 코덱 설정이 다른 조각이 한 창에 섞이면 플레이어 거동을 예측하기 어렵습니다. 그래서 새 세션의 첫 init을 확정할 때 조각 머리말의 코덱 사양 상자(stsd)를 해시해 직전 세션 첫 조각과 견주고, 다르면 계승을 풉니다([media/README.md 용어 「stsd 지문」](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2166)). 스트리머가 방송 종료를 누른 경우는 9월 26일에 따로 정했습니다. 플러그인이 보낸 종료 신호를 받았으면 300초 안에 다시 켜도 새 방송입니다. 신호 없이 끊긴 경우만 300초 규칙을 따릅니다. 이 갈래는 10월 29일 [PR #450](https://github.com/3K-PokeClip/PokeClip-mono/pull/450)으로 들어갔고, 그 전 PR #289에서는 300초 안 재접속을 늘 이어받았습니다.

10월 17일 로컬 compose에서 이 규칙을 한 번씩 돌려 봤습니다. 실제 S3 버킷에 발행하는 사이드카를 띄우고 합성 송출을 60초씩 세 번 보냈습니다.

| 송출 | 직전 송출이 끝난 뒤 | 결과 |
|---|---|---|
| A | — | 조각 15개, 송출이 끊긴 뒤 13.7초에 종료 전이 |
| B | 120초 | 계승. 목록 = A 조각 15개 + DISCONTINUITY + B의 MAP + B 조각, init 지문 같음 |
| C | 400초 | 계승 안 함. 접두부 없이 C 조각 15개로 시작 |

B 목록은 hls.js 1.6.0과 1.7.3에서 모두 끊김 번호 0에서 1로 넘어가며 재생됐고 치명 오류는 없었습니다. 판마다 한 번씩 돈 동작 확인이고, 계승·비계승·지문 검사가 시험으로 잡히는지는 같은 PR의 변이 시험(일부러 코드를 깨는 시험)이 따로 덮었습니다. 공개된 요약은 [media/README.md 「ⓒ 실측 기록」](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2387-L2406)입니다.

## 이 판단은 회차 다시보기 문서로 이어졌습니다 {#새-목록을-만드는-쪽으로-복잡도를-모았습니다}

목록을 다시 열지 않기로 하면서 복잡도는 새 목록을 시작하는 쪽으로 옮겨 갔습니다. 접두부의 범위, 한 목록 안의 여러 init, 창에서 옛 조각이 빠질 때의 끊김 순번 누계를 렌더와 경계 계산이 같은 규칙으로 다뤄야 했습니다. 이 규칙은 9월 25일 목록 렌더 부품([PR #196](https://github.com/3K-PokeClip/PokeClip-mono/pull/196), [경계 계산 글](/posts/0-to-1/pokeclip-manifest-window-boundaries/))으로 먼저 고정했고, 10월 19일 PR #289가 S3 발행·종료 전이·300초 계승을 붙였습니다.

포트폴리오 요약(2026-10-15판) 30쪽은 「발행 계층 연결은 진행 중」이라고 적고 「새 회차 URL」이라고 쓰며, 31쪽은 「회차 계승」을 「300초 이내·init 호환 등 조건을 확인」으로 적습니다. 2026년 10월 12일까지의 기록 기준이고, 그 「회차」는 이 글의 세션입니다. 발행 계층은 그 뒤 10월 19일에 병합됐습니다.

세션이 여럿 생기자 시청자가 보는 방송 한 번을 세션과 따로 셀 단위가 필요해졌습니다. 10월 29일 [PR #450](https://github.com/3K-PokeClip/PokeClip-mono/pull/450)부터 세션을 열 때 회차 번호를 함께 매깁니다. 그림 2는 지금의 포함 관계입니다. 실선은 같은 사슬로 잇는 계승, 점선은 새 사슬이나 새 회차를 여는 사건이고, 청록 상자가 시청자가 보는 단위인 회차입니다.

```mermaid {#fig-session-layers kind="개념도" caption="조각 ⊂ 세션 ⊂ 사슬 ⊂ 회차. 계승은 같은 사슬 안에서 세션을 잇고, init이 바뀐 재접속(합류)과 TD 분할은 같은 회차 안에 새 사슬을 엽니다. 재접속 창 300초를 넘기거나 방송 종료 신호 뒤 다시 켜면 새 회차입니다. PokeClip-mono media/README.md 「회차 단위 VOD 용어」 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L797-L812"}
flowchart TB
  accTitle: 조각, 세션, 사슬, 회차의 포함 관계
  accDescr: 회차 하나 안에 사슬 둘이 있다. 사슬 1은 세션 A와, 300초 안에 같은 init으로 돌아와 A를 계승한 세션 B로 이어진다. 사슬 2는 300초 안에 init이 바뀐 채 돌아와 합류한 세션 C다. 세션마다 조각과 자기 목록 주소가 있다. 300초를 넘긴 재접속이나 종료 신호 뒤 송출은 새 회차를 연다.
  subgraph R[회차: 시청자가 보는 방송 한 번]
    subgraph C1[사슬 1]
      A[세션 A<br/>조각 · 목록 주소 A] -->|계승<br/>300초 안 · 같은 init| B[세션 B<br/>A 조각을 접두로]
    end
    subgraph C2[사슬 2]
      C[세션 C<br/>init이 바뀐 재접속]
    end
    B -.->|합류<br/>300초 안 · init 다름| C
  end
  R -.->|300초 넘김 · 종료 신호 뒤| N[새 회차]
  style R fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

계승으로 이어진 세션 묶음이 사슬이고, 사슬이 하나 이상 모인 것이 회차입니다. 방송이 끝난 뒤의 다시보기(VOD) 문서는 처음에 사슬마다 하나였습니다. 11월 4일 운영 시험 방송에서 한 회차가 사슬 둘로 갈리자 회차 재생 API가 마지막 사슬 문서의 7.5분만 가리켰고, [PR #492](https://github.com/3K-PokeClip/PokeClip-mono/pull/492)가 회차 하나에 문서 하나를 두고 사슬 경계에 DISCONTINUITY를 달게 바꿨습니다(11월 9일 develop 머지, 11월 10일 운영 미디어 서버 반영, [회차 다시보기 글](/posts/projects/pokeclip-round-vod/)). 이때도 이미 확정된 사슬 문서는 고치지 않고 `.round`를 붙인 새 키에 회차 문서를 썼습니다. 끝난 목록을 다시 열지 않는다는 처음 판단이 다시보기 문서에도 그대로 이어졌습니다.

## init이 바뀐 재접속은 같은 회차의 새 사슬로 남습니다

300초 안에 돌아왔지만 init이 바뀐 송출은 계승하지 않습니다. 지금 개시 규칙에서는 이 송출이 같은 회차에 합류하고 새 사슬을 엽니다([`round_rule.go` `openFromPrevious`](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/internal/session/round_rule.go#L75-L113)). 처음 설계 표의 「init이 다르면 새 창」은 방송 중 되감기 창에서는 여전히 맞습니다. 새 사슬의 목록은 접두부 없이 시작하므로, 방송 중에는 재접속 앞 장면으로 되감을 수 없습니다. 방송이 끝난 뒤에는 회차 문서가 두 사슬을 DISCONTINUITY로 이어 한 문서로 보여 줍니다.

남은 한계는 셋입니다.

- 지문은 코덱 사양 상자만 봅니다. 소리(AAC) 트랙은 이 상자 안에 트랙 번호가 들어 있어, 코덱이 같고 트랙 번호만 다른 재접속도 계승을 풉니다. 잇지 않는 쪽으로 틀리는 오류이고, 플러그인이 송출 트랙을 고정해 우리 송출에서는 생기지 않는다고 보고 9월 30일 제가 코드를 그대로 두기로 정했습니다([media/README.md 알려진 한계](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2554)).
- 계승은 직전 세션 하나만 잇습니다. 짧게 여러 번 끊기면 접두부는 직전 세션까지만 붙습니다.
- compose 실측은 송출 세 번, hls.js 두 판의 한 번씩입니다. 운영에서 300초 안 재접속을 일부러 일으켜 본 적은 없습니다.

## 측정 조건

- 2026년 10월 17일, 작성자 기계의 로컬 compose(미디어 서버·사이드카·PostgreSQL)에서 실제 S3 버킷의 실험 접두에만 발행하도록 제가 승인했고 AI가 돌렸으며, 실험 뒤 객체를 지웠습니다. ffmpeg 합성 송출(SRT) 60초 × 3과 대조군 30초, 재접속 간격 120초·400초, 5초 간격 표본. 반복 1회 동작 확인입니다.
- 재생 확인: hls.js 1.6.0·1.7.3, Playwright와 시스템 Chrome 155. 세션마다 6초 재생과 머리·중간·꼬리 탐색.
- 근거는 팀 내부 실험 기록(비공개)이고 공개 요약은 PokeClip-mono `media/README.md` 「ⓒ 실측 기록」과 PR #289 Test plan입니다. RFC 8216과 hls.js v1.7.3 소스, IVS·Mux 문서는 2026년 11월 11일에 다시 읽었습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289) — 목록 S3 발행·종료 전이·300초 재접속 계승, Test plan의 compose 실측(2026-10-19 develop 머지)
- [3K-PokeClip/PokeClip-mono PR #196](https://github.com/3K-PokeClip/PokeClip-mono/pull/196) — 목록 문법과 경계(2026-09-25 머지)
- [3K-PokeClip/PokeClip-mono PR #450](https://github.com/3K-PokeClip/PokeClip-mono/pull/450) — 회차 번호·의도적 종료 신호 수신부·동결 함수(2026-10-29 머지)
- [3K-PokeClip/PokeClip-mono PR #461](https://github.com/3K-PokeClip/PokeClip-mono/pull/461) — 정산·동결 배선(2026-10-30 머지)
- [PokeClip-mono `media/README.md` 「ⓒ 실측 기록」](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L2387-L2406) — 10월 17일 compose 실측 공개 요약
- [3K-PokeClip/PokeClip-mono PR #492](https://github.com/3K-PokeClip/PokeClip-mono/pull/492) — 회차 단위 VOD 문서(2026-11-09 머지)
- [PokeClip-mono `round_rule.go` `openFromPrevious`](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/internal/session/round_rule.go#L75-L113) — 계승·합류·새 회차 개시 규칙
- [PokeClip-mono `media/README.md` 「회차 단위 VOD 용어」](https://github.com/3K-PokeClip/PokeClip-mono/blob/1818c54948395fb0ba80cb37e85770b4d526d853/media/README.md?plain=1#L797-L812) — 회차·사슬 정의
- [RFC 8216 4.3.3.4 EXT-X-ENDLIST](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.3.4) · [6.2.1 General Server Responsibilities](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.1)
- [video-dev/hls.js v1.7.3 `m3u8-parser.ts`](https://github.com/video-dev/hls.js/blob/v1.7.3/src/loader/m3u8-parser.ts#L541-L546) · [`base-playlist-controller.ts`](https://github.com/video-dev/hls.js/blob/v1.7.3/src/controller/base-playlist-controller.ts#L177-L178) — ENDLIST와 다시 받기
- [Amazon IVS API `RecordingConfiguration`](https://docs.aws.amazon.com/ivs/latest/LowLatencyAPIReference/API_RecordingConfiguration.html) — `recordingReconnectWindowSeconds` 최대 300초
- [Mux API Create a live stream](https://docs.mux.com/api-reference/video/live-streams/create-live-stream) — `reconnect_window` 기본 60초, 최대 1,800초
- [2시간 방송이 다시보기에서 7.5분만 보였던 이유](/posts/projects/pokeclip-round-vod/) — 회차 문서

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 30–31쪽](/portfolio/2026-10-15-v2/full.pdf#page=30)
