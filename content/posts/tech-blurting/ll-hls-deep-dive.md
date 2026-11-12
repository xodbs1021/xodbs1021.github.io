---
title: "LL-HLS는 부분 조각과 보류 응답으로 목록 대기를 줄입니다"
date: 2026-06-20T09:20:35+09:00
lastmod: "2026-11-12T22:56:00+09:00"
description: "일반 HLS는 조각이 다 만들어져야 목록에 올리고, 플레이어는 목록 끝에서 목표 길이 세 배 뒤에 섭니다. LL-HLS는 조각을 부분 조각(파트)으로 먼저 올리고, _HLS_msn · _HLS_part로 다음 목록을 걸어 두는 보류 응답, PRELOAD-HINT, 화질 보고, _HLS_skip 델타 목록으로 그 대기를 줄입니다. PART-HOLD-BACK 규칙(개정 초안 2배 · 3배, 애플 3배)과 PokeClip의 2.5배, 파트 전송 규칙, HTTP/2 이상과 대기 요청 합치기를 요구하는 서버 구성, LHLS · LL-DASH와의 차이를 규격과 소스로 확인했습니다."
categories: ["tech-blurting"]
tags: ["LL-HLS", "HLS", "저지연", "PART-HOLD-BACK", "CDN", "PokeClip"]
draft: false
---

일반 HLS에서 새 조각은 다 만들어진 뒤에야 목록에 오르고, 플레이어는 목록 끝에서 목표 길이 세 배 뒤에 섭니다. 목표 길이가 6초면 조각을 만드는 6초와 시작 거리 18초가 지연에 들어갑니다. Apple이 [2019년 WWDC](https://developer.apple.com/videos/play/wwdc2019/502/)에서 발표한 LL-HLS(Low-Latency HLS)는 조각을 더 작은 부분 조각(Partial Segment, 이하 파트)으로 먼저 목록에 올리고, 플레이어가 다음 목록과 다음 파트를 미리 요청해 두면 서버가 준비되는 순간 답하게 했습니다. 재생 위치는 파트 길이를 기준으로 한 `PART-HOLD-BACK`이 정합니다. Apple 문서는 이 방식이 공용 인터넷에서 지연을 일반 TV 방송 수준으로 낮춘다고 설명합니다. 대신 서버와 CDN은 HTTP/2 이상, 보류 요청 처리, 같은 요청 합치기를 갖춰야 합니다.

## 일반 HLS는 조각이 다 만들어져야 목록에 올립니다 {#1-일반-hls의-25초-지연은-정확히-어디서-나오나}

조각은 다 인코딩 · 포장하기 전에는 배포할 수 없어 긴 조각일수록 늦게 목록에 오르고(개정 초안 22판 3.2절의 「게시 지연」), 그 위에 목표 길이 세 배의 시작 거리가 더해집니다. 두 몫의 규칙은 [일반 HLS 지연 글](/posts/tech-blurting/hls-deep-dive/)에 있습니다.

### 조각만 짧게 줄이면 키프레임과 요청이 늘어납니다 {#그냥-세그먼트를-짧게-만들면-안-되나}

조각을 1초로 줄이면 두 몫이 함께 줄지만, 조각마다 IDR 프레임으로 시작해야 하므로(애플 저작 규격 7.4) 키프레임이 1초마다 들어가고, 시청자마다 조각 요청과 목록 요청이 늘어납니다. 개정 초안 4.4.3.8절도 목표 길이를 줄이면 버퍼가 줄고 화질 적응이 불리해지며 전달 부담이 커진다고 적습니다. 저지연 구성에서도 권장 목표 길이는 6초, 권장 GOP는 1–2초입니다(부록 B.1). 조각은 길게 두고, 조각보다 작은 단위를 따로 내는 쪽이 LL-HLS입니다.

## 부분 조각은 부모 조각과 같은 표본을 먼저 나눠 올립니다 {#2-partial-segment--ll-hls의-첫-번째-핵심-기술}

파트는 라이브 끝에서만 쓰는 병렬 통로입니다. 개정 초안 3.2절에 따르면 파트는 부모 조각(Parent Segment) 표본의 일부를 담고, 부모 조각과 그 파트 전부는 같은 표본을 같은 시각으로 담아야 합니다(MUST). 파트에는 0부터 세는 파트 번호가 있고, 조각 번호(MSN)는 부모 조각과 같습니다. 서버는 `EXT-X-PART-INF:PART-TARGET`으로 파트 목표 길이를 알리고, 파트 길이는 그 값 이하이면서 85% 이상이어야 합니다(독립 프레임으로 시작하는 파트, 부모의 마지막 파트 등은 예외, 4.4.4.9절).

```m3u8
#EXT-X-TARGETDURATION:4
#EXT-X-PART-INF:PART-TARGET=0.5
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=1.5,CAN-SKIP-UNTIL=24
...
#EXT-X-PART:DURATION=0.5,URI="seg42.p0.mp4",INDEPENDENT=YES
#EXT-X-PART:DURATION=0.5,URI="seg42.p1.mp4"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="seg42.p2.mp4"
```

Apple 문서의 예는 6초 조각에 200밀리초 파트 30개입니다. 파트는 부모 조각이 완성된 뒤에도 잠시 목록에 남고, 서버는 라이브 끝에서 목표 길이 세 배보다 오래된 파트를 목록에서 뺍니다([Apple, Enabling Low-Latency HLS](https://developer.apple.com/documentation/http-live-streaming/enabling-low-latency-http-live-streaming-hls)).

「LL-HLS는 fMP4만 된다」는 말도 규격과 다릅니다. 개정 초안은 파트가 3.1절의 조각 형식 가운데 하나이면 된다고 정하므로 MPEG-2 TS 파트도 규격 안입니다. 실제로는 CMAF 청크(moof+mdat)를 파트로 쓰는 구성이 흔하고, 그 구조는 [CMAF 글](/posts/tech-blurting/cmaf-deep-dive/)에 있습니다.

### INDEPENDENT=YES 파트에서만 화질을 바꿔 들어갑니다 {#independent-플래그가-왜-중요한가}

파트마다 IDR 프레임을 넣지는 않습니다. 독립 프레임이 없는 파트는 앞 파트 없이 디코딩할 수 없으므로, 재생을 시작하거나 다른 화질로 옮겨 갈 때는 독립 프레임으로 시작하는 파트부터 받아야 합니다. 개정 초안은 독립 프레임을 담은 파트마다 `INDEPENDENT=YES`를 달라고 권고(SHOULD)하고, 그 이유를 「클라이언트가 렌디션에 합류하고 전환하는 효율을 높이기 위해」라고 적습니다(4.4.4.9절). 그래서 화질별 변형의 키프레임 위치와 파트 경계를 맞춰 두어야 전환이 빨라집니다.

## 플레이어는 _HLS_msn · _HLS_part로 다음 목록을 걸어 둡니다 {#3-blocking-playlist-reload--두-번째-핵심-기술}

일반 HLS 플레이어는 목록을 정해진 간격으로 다시 받으므로, 새 파트가 올라와도 다음 요청 때까지 모릅니다. 보류 목록 재요청(Blocking Playlist Reload)에서는 플레이어가 기다리는 다음 위치를 쿼리로 보냅니다. `CAN-BLOCK-RELOAD=YES`를 광고한 서버는 그 조각 · 파트가 목록에 들어갈 때까지 응답을 미룹니다(MUST). 아래 영상에서 목록 요청과 다음 파트 요청이 서버에 걸려 있다가, 파트가 완성되는 순간 둘 다 풀리는 순서를 보십시오.

{{< motion scene="BlockingPartFlow" id="fig-blocking-part-flow" kind="개념도" caption="플레이어는 _HLS_msn · _HLS_part로 다음 파트가 들어간 목록을 요청하고, 직전 목록의 PRELOAD-HINT가 가리킨 그 파트도 함께 요청합니다. 서버는 두 요청을 붙잡아 두었다가 파트가 완성되는 순간 둘 다 답하고, 플레이어는 곧바로 다음 파트로 같은 요청을 겁니다. 개정 초안 22판 6.2.5.2 · 6.2.6절을 따라 그린 설명용 그림입니다." >}}

```http
GET /live/index.m3u8?_HLS_msn=42&_HLS_part=2
```

서버가 지킬 규칙은 개정 초안 6.2.5.2절에 모여 있습니다.

| 경우 | 서버 동작 |
|---|---|
| `_HLS_msn=M`만 있음 | MSN M 이상의 조각이 목록에 들어갈 때까지 미룸 |
| `_HLS_msn=M&_HLS_part=N` | MSN M의 파트 N(또는 그 뒤)이 목록에 들어갈 때까지 미룸 |
| 파트 번호가 부모의 마지막 파트보다 큼 | 다음 부모 조각의 파트 0 요청으로 봄 |
| 요청한 조각이 이미 목록에서 빠짐 | 그래도 목록 전체를 돌려줌(MUST) |
| MSN이 목록 마지막 + 2보다 큼, 파트가 한도보다 앞섬 | 곧바로 400(SHOULD) |
| `_HLS_part`만 있고 `_HLS_msn`이 없음 | 400(MUST) |
| 목표 길이 3배 넘게 기다려도 못 줌 | 503(SHOULD) |

여기서 한도(Advance Part Limit)는 파트 목표 길이가 1초 미만이면 3 ÷ 파트 목표 길이, 아니면 3입니다. 서버가 목록에 `EXT-X-ENDLIST`가 있으면 두 쿼리를 무시합니다. 「요청한 조각이 목록에서 빠져도 목록 전체를 돌려준다」는 규칙은 구현마다 다릅니다. PokeClip이 쓰는 MediaMTX의 gohlslib은 창 밖으로 밀린 조각 번호의 보류 요청에 400을 돌려줍니다([라이브 창 글](/posts/0-to-1/pokeclip-live-window-without-fork/)).

## 다음 파트는 PRELOAD-HINT로 먼저 요청합니다 {#4-preload-hint--세-번째-핵심-기술}

목록을 받고 나서 새 파트를 요청하면 왕복이 한 번 더 듭니다. `EXT-X-PRELOAD-HINT`는 아직 없는 다음 파트(또는 init)의 주소를 알려, 플레이어가 그것이 준비되기 전에 요청을 보내 두게 합니다. 서버는 그 요청을 붙잡아 두었다가 응답할 수 있을 때 답합니다(4.4.5.3절). Apple 문서는 이것을 전 세계 규모에서 저지연을 내려면 꼭 없애야 하는 불필요한 왕복을 줄이는 장치로 설명합니다. 연결을 미리 맺으려는 장치가 아닙니다. 저지연 서버 구성에서는 `EXT-X-PART`가 있고 `EXT-X-ENDLIST`가 없는 목록마다 다음 파트를 가리키는 `PRELOAD-HINT`를 넣어야 합니다(부록 B.1). 다만 플레이어가 모두 이 요청을 보내지는 않습니다. hls.js는 1.0.0부터 LL-HLS를 지원하지만 `PRELOAD-HINT`는 해석만 하고 미리 요청하지 않습니다([#5074](https://github.com/video-dev/hls.js/issues/5074)).

### 파트는 다 준비될 때까지 한 바이트도 보내지 않습니다 {#partial-전송--http11-chunked-transfer-encoding}

「파트를 HTTP/1.1 chunked 전송으로 만들면서 흘려보낸다」는 설명은 규격과 반대입니다. 개정 초안 6.2.6절은 아직 다 준비되지 않은 파트를 포함하는 요청(`PRELOAD-HINT`로 미리 보낸 요청 등)에 대해, 서버가 그 파트의 모든 바이트를 클라이언트까지 링크 속도로 보낼 수 있을 때까지 그 파트의 어떤 바이트도 보내지 않아야 한다(MUST)고 정합니다. 이유는 클라이언트가 정확한 대역폭을 재서 화질을 고르게 하려는 것입니다. 요청 범위에 파트가 여럿이면 파트마다 이 보장을 지킵니다. 만드는 도중의 바이트를 흘려보내는 방식은 LL-DASH의 chunked 전송에 가깝습니다.

## 목록 델타와 화질 보고로 목록 크기와 전환 왕복을 줄입니다 {#5-rendition-report--네-번째-핵심-기술}

다른 화질로 옮겨 가려면 그 화질의 최신 목록이 필요합니다. 그냥 받으면 CDN 캐시에 남은 낡은 목록을 받을 수 있어, 최신 목록을 얻는 절차(부록 C의 튠인)를 거쳐야 합니다. `EXT-X-RENDITION-REPORT`는 지금 받는 목록 안에 다른 렌디션의 마지막 조각 번호(`LAST-MSN`)와 파트 번호(`LAST-PART`)를 적어 줍니다(4.4.5.4절). 플레이어는 그 값으로 다른 화질 목록을 곧바로 보류 요청할 수 있어 튠인 왕복을 건너뜁니다. 저지연 서버 구성은 다변형 목록의 다른 렌디션마다 이 태그를 하나씩 넣으라고 요구합니다(부록 B.1, MUST).

```m3u8
#EXT-X-RENDITION-REPORT:URI="../720p/index.m3u8",LAST-MSN=42,LAST-PART=1
```

### `_HLS_skip`은 CAN-SKIP-UNTIL 앞부분을 생략합니다 {#skip-메커니즘--매니페스트-크기-줄이기}

파트 줄이 붙고 목록을 자주 받으니 목록 전송량이 커집니다. 서버가 `CAN-SKIP-UNTIL`(건너뛰기 경계, 초)을 광고하고 플레이어가 `_HLS_skip=YES`를 보내면, 서버는 목록 끝에서 그 경계보다 오래된 조각과 태그를 `EXT-X-SKIP` 한 줄로 바꾼 델타 목록을 돌려줘야 합니다(6.2.5.1절, MUST). 경계는 목표 길이의 6배 이상이어야 하고(4.4.3.8절), `EXT-X-SKIP`을 담은 목록은 프로토콜 버전 9 이상을 적어야 합니다(`_HLS_skip=v2`로 날짜 범위까지 생략하면 10 이상, 8절). 애플 저작 규격 14.4는 목록 창이 2분보다 긴 서비스에 델타 목록을 권합니다(SHOULD).

PokeClip의 MediaMTX(gohlslib)는 이 광고를 조건 없이 냅니다. 4초 조각 7개 창에서 `CAN-SKIP-UNTIL`은 24초(4 × 6)였습니다. 같은 실측 기록에는 gohlslib이 LL-HLS 목록에 조각 7개 미만을 허용하지 않는 하한도 있습니다([라이브 창 글](/posts/0-to-1/pokeclip-live-window-without-fork/)).

## 재생 위치는 PART-HOLD-BACK이 정합니다 {#7-ll-hls-지연-전체-흐름--종합}

저지연 모드의 플레이어는 목록 끝에서 `PART-HOLD-BACK`보다 가까운 곳에서 재생을 시작하거나 찾아가지 않아야 합니다(개정 초안 6.3.3절). 이 값의 하한은 기준마다 다릅니다.

| 기준 | PART-HOLD-BACK | 파트 목표 길이 |
|---|---|---|
| 개정 초안 22판 4.4.3.8 | 파트 목표 길이의 2배 이상(MUST), 3배 이상(SHOULD) | 상한 규칙 없음 |
| 애플 저작 규격 14.2–14.3 | 파트 목표 길이의 3배 이상(MUST) | P95 왕복 시간 이상(MUST), 그 3배 이상(SHOULD), 권장 1초 |
| PokeClip(MediaMTX · gohlslib) | 1.25초 = 파트의 2.5배 | 0.5초 |

PokeClip 값은 [라이브 창 글](/posts/0-to-1/pokeclip-live-window-without-fork/)의 실측입니다. 2.5배는 MediaMTX가 쓰는 gohlslib이 파트 목표 길이에 곱하는 고정 계수입니다([`muxer_stream.go` 468행](https://github.com/bluenviron/gohlslib/blob/v2.4.3/muxer_stream.go#L468)). 개정 초안의 하한(2배)은 넘지만 권고(3배)와 애플 저작 규격 14.3의 3배에는 못 미칩니다. 애플 기기를 기준으로 맞추려면 파트 길이를 바꾸는 것만으로는 비율이 그대로이므로, 계수를 바꾸거나 값을 덮어쓰는 방법을 따로 찾아야 합니다.

파트 길이를 왕복 시간보다 짧게 잡으면 파트 하나를 받는 데 걸리는 왕복이 파트 길이를 넘어 따라잡지 못합니다. 애플 규격이 P95 왕복 시간을 하한으로 두는 이유입니다. 「200–500밀리초가 업계 표준」이라는 기준은 규격에 없습니다. Apple 문서의 200밀리초는 예시이고, 저작 규격의 권장값은 1초입니다.

## 서버와 CDN은 HTTP/2 이상과 대기 요청 합치기를 갖춰야 합니다 {#cdn과의-충돌-문제}

LL-HLS 문법은 일반 HLS와 호환되므로, 서버가 요건을 못 채우면 플레이어는 일반 지연으로 되돌아가야 합니다. 그 요건이 개정 초안 부록 B.1의 저지연 서버 구성입니다.

- 목록과 조각을 HTTP/2나 HTTP/3로 냅니다. HTTP/3에서는 RFC 9218 우선순위가 필수이고, 목록은 우선순위 1, 조각은 2–6입니다.
- 서버 하나가 다변형 목록의 모든 변형을 냅니다. 화질을 바꿀 때 연결을 새로 맺지 않게 하려는 것입니다.
- 목록 요청은 멱등이고, 목록은 GZIP으로 압축하며, 모든 렌디션을 파트 목표 길이 오차 안에서 함께 갱신합니다.
- CDN과 프록시 캐시는 이미 캐시 채우기가 진행 중인 보류 요청을 알아보고 같은 요청을 그 채우기까지 붙잡아 둡니다. 캐시는 `Age` 응답 머리를 붙입니다.

CDN 입장에서 같은 목록 주소라도 `_HLS_msn` · `_HLS_part` · `_HLS_skip`이 다르면 다른 응답입니다. 그래서 캐시 키에 이 쿼리를 넣어야 합니다. PokeClip의 CloudFront 라이브 목록 정책은 이 세 쿼리만 캐시 키에 넣고 엣지에 1초 보관합니다([CDN 캐시 실측 글](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)). CDN 업체 GS네오텍의 고객 사례(2025-08-18)에 따르면, 치지직은 LL-HLS 기반 스트리밍을 도입하면서 「스트리밍에 필요한 파일들(HLS 세그먼트 등)을 1초 이내에 전달」하도록 CDN 캐시 정책을 다시 설계했습니다([GS네오텍 고객 사례](https://www.gsneotek.com/customer_case_CDN/?q=YToyOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjtzOjQ6InBhZ2UiO2k6MTt9&bmode=view&idx=167352811&t=board)).

[[fig-ll-hls-cdn]]은 두 시청자가 같은 다음 목록을 보류 요청할 때 엣지와 원본이 하는 일입니다.

```mermaid {#fig-ll-hls-cdn kind="개념도" caption="LL-HLS 보류 요청이 CDN을 지나는 순서. 엣지는 _HLS_* 쿼리까지 같은 요청을 하나로 합쳐 원본에 한 번만 보내고, 원본은 파트 2가 목록에 들어갈 때까지 응답을 미룹니다. 응답이 오면 엣지가 두 플레이어에게 같은 목록을 돌려줍니다. 개정 초안 22판 6.2.5.2절과 부록 B.1을 줄여 그렸습니다." source="https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt"}
%%{init: {"sequence": {"width": 96, "actorMargin": 16}}}%%
sequenceDiagram
  accTitle: LL-HLS 보류 요청과 CDN
  accDescr: 플레이어 1이 msn 42 part 2 목록을 요청하면 엣지가 원본에 같은 요청을 보낸다. 플레이어 2의 같은 요청은 엣지에서 기다린다. 원본은 파트 2가 생길 때까지 응답을 미루었다가 200을 돌려주고, 엣지가 두 플레이어에게 같은 목록을 준다.
  participant P as 플레이어
  participant E as 엣지
  participant O as 원본
  P->>E: 1 · part=2
  E->>O: part=2
  P->>E: 2 · part=2
  Note over O: 보류
  O->>E: 200
  E->>P: 1 · 200
  E->>P: 2 · 200
```

캐시를 거친 목록은 낡았을 수 있으므로, 플레이어는 처음 받은 목록의 `Age`를 보고 최신 목록을 얻을 때까지 한두 번 더 요청하는 튠인 절차를 씁니다(부록 C). 화질 보고가 이 절차를 건너뛰게 해 주는 이유이기도 합니다.

## LL-HLS는 LHLS · LL-DASH · WebRTC와 다른 방식입니다 {#ll-hls-vs-webrtc--누가-더-빠르나}

이름이 비슷한 방식이 여럿이라 도구가 무엇을 지원하는지 따로 확인해야 합니다.

| 방식 | 핵심 | 확인한 지원 |
|---|---|---|
| LL-HLS | 파트 · 보류 목록 · PRELOAD-HINT · 화질 보고 | hls.js 1.0.0(2021-04-01)부터 파트 · 보류 목록 · 델타 · 화질 보고를 지원하고 PRELOAD-HINT는 해석만 함([#5074](https://github.com/video-dev/hls.js/issues/5074)), MediaMTX(gohlslib)가 생성 |
| LHLS | hls.js 쪽 커뮤니티 초안, `#EXT-X-PREFETCH`로 만드는 중인 조각을 미리 알림 | FFmpeg `dash` 묶개의 `-lhls`(실험 기능, 「Apple의 LHLS가 아님」) |
| LL-DASH | CMAF 청크를 만들면서 chunked 전송 | FFmpeg `dash` 묶개 `-ldash`, Shaka Packager(LL-HLS는 아직 미지원) |
| WebRTC | 시청자마다 RTP 세션 | CDN 캐시 대신 미디어 서버가 전송 |

FFmpeg 9.0.2의 `hls` 묶개 옵션에는 `EXT-X-PART`를 만드는 설정이 없습니다(`ffmpeg -h muxer=hls`로 확인). FFmpeg 문서는 `-lhls`가 hls.js 쪽의 공개 LHLS 초안을 따르려는 실험 기능이고 Apple의 방식이 아니라고 적습니다([FFmpeg 형식 문서](https://ffmpeg.org/ffmpeg-formats.html#dash-2)). Shaka Packager 3.9.3 문서도 「LL-DASH만 지원하고 LL-HLS 지원은 아직」이라고 적습니다([low_latency.rst](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/tutorials/low_latency.rst)). WebRTC 시청의 비용 구조는 [WHIP · WHEP 글](/posts/tech-blurting/whip-whep-modern-ingest/)에 있습니다.

## LL-HLS는 fMP4 전용도, 파트를 흘려 보내는 방식도 아닙니다 {#정리하면}

- **「LL-HLS는 지연을 2초로, 10배 줄인다」** — 규격은 지연 수치를 약속하지 않습니다. 재생 위치는 `PART-HOLD-BACK`이 정하고, 그 하한은 파트 길이와 왕복 시간에 묶입니다.
- **「파트는 HTTP/1.1 chunked로 흘려보내 CDN과 100% 호환된다」** — 파트는 다 준비된 뒤 한 번에 보내고(6.2.6절), 저지연 구성은 HTTP/2 이상과 보류 요청을 이해하는 CDN을 요구합니다.
- **「서버는 50밀리초마다 확인한다」** — 규격은 확인 방법이 아니라 응답 조건을 정합니다. 미룰 조건, 400 · 503을 돌려줄 조건이 6.2.5.2절에 있습니다.
- **「PRELOAD-HINT는 연결을 미리 맺는 장치」** — 아직 없는 다음 파트를 미리 요청해 두고 준비되면 바로 받게 하는 장치입니다.
- **「LL-HLS는 fMP4만」** — 파트는 일반 조각 형식이면 되고 TS도 규격 안입니다.
- **「FFmpeg로 LL-HLS를 만든다」** — FFmpeg의 `hls` 묶개는 `EXT-X-PART`를 만들지 않습니다. `-lhls`는 다른 초안입니다.

LL-HLS를 들이려면 플레이어보다 서버와 CDN이 보류 요청, `_HLS_*` 캐시 키, 같은 요청 합치기를 지원하는지 먼저 확인하십시오. 그다음 파트 길이를 시청자 왕복 시간 기준으로 잡고, `PART-HOLD-BACK`이 파트 목표 길이의 세 배 이상인지 보십시오.

## 출처

- [draft-pantos-hls-rfc8216bis-22: HTTP Live Streaming 2nd Edition](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) (2026-05-01) — 3.2 파트, 4.4.3.8 SERVER-CONTROL, 4.4.4.9 EXT-X-PART, 4.4.5.2–4.4.5.4 SKIP · PRELOAD-HINT · RENDITION-REPORT, 6.2.5 전달 지시, 6.2.6 미리 알림과 파트 전송, 6.3.3 재생 위치, 8절 버전, 부록 B.1 · C · [datatracker 상태](https://datatracker.ietf.org/doc/draft-pantos-hls-rfc8216bis/)
- [Apple, Enabling Low-Latency HTTP Live Streaming (HLS)](https://developer.apple.com/documentation/http-live-streaming/enabling-low-latency-http-live-streaming-hls) (2024-05-21 개정)
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 7.4, 14.1–14.5
- [bluenviron/gohlslib v2.4.3 `muxer_stream.go`](https://github.com/bluenviron/gohlslib/blob/v2.4.3/muxer_stream.go#L468) — PART-HOLD-BACK = 파트 목표 길이 × 2.5
- [hls.js v1.0.0 릴리스](https://github.com/video-dev/hls.js/releases/tag/v1.0.0) (2021-04-01, Apple Low-Latency HLS 지원, 「Hinted Part and Map Preloading」만 미구현) · [hls.js README](https://github.com/video-dev/hls.js#readme) — `EXT-X-PRELOAD-HINT`는 「Parsed but missing feature support」([#5074](https://github.com/video-dev/hls.js/issues/5074))
- [Apple WWDC19 「Introducing Low-Latency HLS」](https://developer.apple.com/videos/play/wwdc2019/502/)
- [FFmpeg 형식 문서 — dash 묶개 `-lhls` · `-ldash`](https://ffmpeg.org/ffmpeg-formats.html#dash-2) · 로컬 FFmpeg 9.0.2 `ffmpeg -h muxer=hls`(2026-11-12)
- [Shaka Packager v3.9.3 low_latency.rst](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/tutorials/low_latency.rst)
- [GS네오텍 고객 사례 「치지직(Chzzk) | 초저지연 실시간 스트리밍을 위한 LL-HLS 기반 CDN 최적화」](https://www.gsneotek.com/customer_case_CDN/?q=YToyOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjtzOjQ6InBhZ2UiO2k6MTt9&bmode=view&idx=167352811&t=board) (2025-08-18, 2026-11-12 확인)
- PokeClip 기록: [라이브 창](/posts/0-to-1/pokeclip-live-window-without-fork/) · [CDN 캐시 키와 원본 인증](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)

다음 편: [CMAF는 HLS와 DASH가 같은 조각 파일을 쓰게 합니다](/posts/tech-blurting/cmaf-deep-dive/)
