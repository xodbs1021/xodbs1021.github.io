---
title: "라이브 버퍼는 라이브 끝까지의 거리만큼만 채울 수 있습니다"
date: 2026-06-14T15:01:19+09:00
lastmod: "2026-11-13T17:15:27+09:00"
description: "HLS 플레이어의 버퍼는 재생 위치 앞에 받아 둔 초이고, 라이브에서는 목록 끝까지의 거리(시작 거리)보다 길어질 수 없습니다. hls.js 1.7.4를 Chrome 157에서 돌려 VOD와 라이브의 버퍼·추정 대역폭·고른 변형을 250ms마다 기록했고, maxBufferLength가 하한이라는 점, 1.5Mbps 하락에서 낮은 변형으로 내려가 멈춤 없이 버틴 과정, 22초 끊김 뒤 라이브 창 밖으로 밀려 건너뛴 과정을 실측과 소스로 정리했습니다. hls.js · Shaka · Media3 기본값, BOLA와 dash.js 전환 문턱, 재버퍼링 지표, CMCD도 다룹니다."
categories: ["tech-blurting"]
tags: ["HLS", "버퍼링", "hls.js", "ABR", "라이브 지연", "QoE"]
draft: false
---

라이브 HLS에서 버퍼를 아무리 크게 잡아도 몇 초 이상 쌓이지 않습니다. 버퍼에 넣을 조각은 목록에 이미 올라온 것뿐이고, 플레이어는 목록 끝에서 일정 거리 뒤에서 재생하기 때문입니다. hls.js 1.7.4를 `maxBufferLength` 30으로 띄워 2초 조각 · 12초 창의 라이브를 재생하자 버퍼는 5–8초 사이에 머물렀고 가장 많을 때도 7.92초였습니다. 같은 설정으로 104초 VOD를 재생하자 버퍼는 영상 끝까지 약 51초가 찼습니다. 받는 속도를 8Mbps에서 1.5Mbps로 떨어뜨려도 두 경우 모두 낮은 변형으로 내려가 멈추지 않았고, 멈춤은 망을 22초 끊었을 때만 났습니다(아래 「측정 조건」).

## 버퍼는 재생 위치 앞에 받아 둔 초이고 0이 되면 멈춥니다 {#1-버퍼와-버퍼링은-다른-단어다}

버퍼 길이는 「받아서 디코더에 넘긴 미디어의 끝 − 현재 재생 위치」입니다. 브라우저에서는 `video.buffered`의 구간 끝에서 `video.currentTime`을 뺀 값이고, 이 글의 모든 실측도 그렇게 쟀습니다. 재생은 1초에 1초씩 버퍼를 쓰고, 조각 하나를 받을 때마다 그 조각 길이만큼 버퍼가 늘어납니다. 버퍼가 0이 되면 재생이 멈추고, 다시 정해진 만큼 찰 때까지 기다립니다. 이 멈춤을 재버퍼링(rebuffering)이라고 부릅니다.

### 플레이어마다 채움 목표와 재시작 문턱이 다릅니다 {#그럼-버퍼를-무한정-길게-잡으면}

플레이어는 버퍼를 어디까지 채울지(채움 목표)와, 멈춘 뒤 얼마가 차야 다시 재생할지(재시작 문턱)를 따로 정합니다. 세 플레이어의 기본값은 다음과 같습니다.

| 플레이어(판) | 채움 목표 | 재시작 · 시작 문턱 | 근거 |
|---|---|---|---|
| hls.js 1.7.4 | `maxBufferLength` 30초 · `maxBufferSize` 60MB · `maxMaxBufferLength` 600초로 계산 | 별도 값 없음 | [config.ts 456–484행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/config.ts#L456-L484) |
| Shaka Player 5.3.4 | `bufferingGoal` 10초 | `rebufferingGoal` 0초 | [player_configuration.js 191–192행](https://github.com/shaka-project/shaka-player/blob/v5.3.4/lib/util/player_configuration.js#L191-L192) |
| Media3 1.11.1 | 최소 · 최대 50초 | 처음 1초, 재버퍼링 뒤 2초 | [DefaultLoadControl.java 64–102행](https://github.com/androidx/media/blob/1.11.1/libraries/exoplayer/src/main/java/androidx/media3/exoplayer/DefaultLoadControl.java#L64-L102) |

hls.js의 `maxBufferLength`는 상한이 아니라 하한입니다. 목표는 `min(max(8 × maxBufferSize ÷ 변형 비트레이트, maxBufferLength), maxMaxBufferLength)`로 정해집니다([base-stream-controller.ts 1480–1492행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/base-stream-controller.ts#L1480-L1492)). 4.54Mbps 변형이면 60MB가 약 106초에 해당하므로 `maxBufferLength`를 30이나 10으로 줘도 목표는 106초입니다. 실측에서도 두 설정 모두 104초 VOD의 끝까지 버퍼가 찼습니다. `maxBufferSize`를 0으로 줘야 `maxBufferLength`가 실제 목표가 되고, 그때 버퍼는 각각 31.7초와 11.7초를 넘지 않았습니다. 설정은 `new Hls({ maxBufferLength: 10 })`처럼 생성자에 넘깁니다([API.md](https://github.com/video-dev/hls.js/blob/v1.7.4/docs/API.md#fine-tuning)). 만든 뒤 `hls.config`에 객체를 통째로 대입하는 방식은 문서에 없습니다.

## 받는 속도가 비트레이트보다 느리면 버퍼가 줄어듭니다 {#2-버퍼링의-근본-원인--tcp의-head-of-line-blocking}

2초 조각을 받는 데 2초보다 오래 걸리면 그 차이만큼 버퍼가 줄어듭니다. 4.54Mbps 변형의 2초 조각(약 1.1MB)을 1.5Mbps로 받으면 약 6초가 걸리므로 조각 하나마다 버퍼가 약 4초씩 빠집니다. 플레이어가 버티는 방법은 두 가지입니다. 버퍼가 남아 있는 동안 낮은 변형으로 내려가거나, 받던 조각을 버리고 낮은 변형의 같은 조각을 다시 받는 것입니다.

아래 영상은 `maxBufferLength` 10 · `maxBufferSize` 0인 VOD에서 45초에 받는 속도를 1.5Mbps로 떨어뜨린 실측을 5배 빠르게 다시 그린 것입니다. 꺾은선의 최저점과 오른쪽 상자의 강조가 옮겨 가는 때를 보십시오.

{{< motion scene="BufferDrainStall" id="fig-buffer-drain" kind="재구성" caption="받는 속도가 45초에 8Mbps에서 1.5Mbps로 떨어지자 버퍼가 약 11초에서 1.66초까지 줄었고, 그사이 다음 조각을 52.8초에 720p, 55.8초에 360p로 받기 시작해 버퍼가 다시 10초 근처로 찼습니다. 75초에 8Mbps로 돌아온 뒤 77.5초에 720p로 올라갔습니다. 멈춤은 없었습니다. hls.js 1.7.4, maxBufferLength 10 · maxBufferSize 0, 측정 40–90초를 0.5초 간격으로 뽑아 10초로 압축했습니다." >}}

hls.js의 추정 대역폭은 조각을 다 받아야 갱신됩니다. 그래서 받는 속도가 떨어진 45초부터 720p로 내려간 52.8초까지 7.8초 동안 1080p 조각을 계속 받았고, 그사이 버퍼는 8.2초에서 4.4초로 줄었습니다. 720p 조각을 받는 동안 1.66초까지 더 줄었고, 55.8초에 360p로 내려간 뒤에야 다시 찼습니다. 같은 하락을 `maxBufferLength` 30에 걸면 하락 직전 버퍼가 약 29초여서 최저점도 19.7초에 그쳤습니다([[fig-buffer-seconds]]). 버퍼 목표가 클수록 같은 하락에서 남는 여유가 크고, 그 대가는 받아 둔 만큼의 데이터와 라이브에서의 지연입니다.

{{< chart id="fig-buffer-seconds" kind="실측" caption="같은 VOD(약 104초, 2초 조각, 4.54 · 2.28 · 0.72Mbps)를 maxBufferSize 0으로 두고 maxBufferLength만 30과 10으로 바꿔 재생한 버퍼 길이. 45–75초에 받는 속도를 1.5Mbps로 낮췄습니다. 250ms 표본에서 1초마다 가장 가까운 값을 골랐습니다. hls.js 1.7.4, Chrome 157, 각 1회." source="아래 「측정 조건」" height="320px" >}}
{"grid": {"left": 8, "right": 24, "top": 56, "bottom": 28, "containLabel": true}, "xAxis": {"type": "value", "name": "초", "min": 0, "max": 100, "interval": 20}, "yAxis": {"type": "value", "name": "버퍼(초)", "min": 0, "max": 35, "interval": 10, "nameTextStyle": {"align": "left"}}, "series": [{"name": "maxBufferLength 30", "type": "line", "showSymbol": false, "itemStyle": {"color": "#7a8a9b"}, "lineStyle": {"color": "#7a8a9b", "type": "dashed"}, "data": [[0, 0], [1, 2.1], [2, 1.3], [3, 2.2], [4, 3.2], [5, 6.2], [6, 7.2], [7, 10.2], [8, 11.2], [9, 12.2], [10, 13.2], [11, 14.2], [12, 15.2], [13, 16.2], [14, 17.2], [15, 18.2], [16, 19.2], [17, 20.2], [18, 23.2], [19, 24.2], [20, 31.2], [21, 30.2], [22, 31.2], [23, 30.2], [24, 31.2], [25, 30.2], [26, 29.2], [27, 30.2], [28, 29.2], [29, 30.2], [30, 29.2], [31, 30.2], [32, 29.2], [33, 30.2], [34, 31.2], [35, 30.2], [36, 29.2], [37, 30.2], [38, 29.2], [39, 30.2], [40, 29.2], [41, 30.2], [42, 31.2], [43, 30.2], [44, 29.2], [45, 28.2], [46, 27.2], [47, 26.2], [48, 27.2], [49, 26.2], [50, 25.2], [51, 24.2], [52, 23.2], [53, 22.2], [54, 23.2], [55, 22.2], [56, 23.2], [57, 22.2], [58, 21.2], [59, 22.2], [60, 21.2], [61, 22.2], [62, 21.2], [63, 20.2], [64, 21.2], [65, 22.2], [66, 25.2], [67, 26.2], [68, 29.2], [69, 30.2], [70, 31.2], [71, 30.2], [72, 31.2], [73, 30.2], [74, 31.2], [75, 30.2], [76, 29.6], [77, 28.6], [78, 27.6], [79, 26.6], [80, 25.6], [81, 24.6], [82, 23.6], [83, 22.6], [84, 21.6], [85, 20.6], [86, 19.6], [87, 18.6], [88, 17.6], [89, 16.6], [90, 15.6], [91, 14.6], [92, 13.6], [93, 12.6], [94, 11.6], [95, 10.6], [96, 9.6], [97, 8.6], [98, 7.6], [99, 7.6]], "markArea": {"silent": true, "itemStyle": {"color": "#b42318", "opacity": 0.08}, "label": {"show": true, "position": "insideTop", "formatter": "1.5 Mbps", "color": "#b42318"}, "data": [[{"xAxis": 45}, {"xAxis": 75}]]}}, {"name": "maxBufferLength 10", "type": "line", "showSymbol": false, "itemStyle": {"color": "#087f8b"}, "lineStyle": {"color": "#087f8b", "width": 3}, "data": [[0, 0], [1, 2.1], [2, 3.1], [3, 4.1], [4, 3.1], [5, 8.1], [6, 7.1], [7, 10.2], [8, 9.2], [9, 10.2], [10, 9.2], [11, 10.2], [12, 9.2], [13, 10.2], [14, 9.2], [15, 10.2], [16, 9.2], [17, 10.2], [18, 9.2], [19, 10.2], [20, 9.2], [21, 10.2], [22, 9.2], [23, 10.2], [24, 11.2], [25, 10.2], [26, 9.2], [27, 10.2], [28, 9.2], [29, 10.2], [30, 9.2], [31, 10.2], [32, 9.2], [33, 10.2], [34, 11.2], [35, 10.2], [36, 11.2], [37, 10.2], [38, 11.2], [39, 10.2], [40, 11.2], [41, 10.2], [42, 11.2], [43, 10.2], [44, 9.2], [45, 8.2], [46, 7.2], [47, 8.2], [48, 7.2], [49, 6.2], [50, 5.2], [51, 4.2], [52, 3.2], [53, 4.2], [54, 3.2], [55, 2.2], [56, 3.2], [57, 4.2], [58, 7.2], [59, 8.2], [60, 9.2], [61, 10.2], [62, 11.2], [63, 10.2], [64, 11.2], [65, 10.2], [66, 9.2], [67, 10.2], [68, 9.2], [69, 10.2], [70, 9.2], [71, 10.2], [72, 9.2], [73, 10.2], [74, 11.2], [75, 10.2], [76, 11.2], [77, 10.2], [78, 11.2], [79, 10.2], [80, 11.2], [81, 10.2], [82, 11.2], [83, 10.2], [84, 11.2], [85, 10.2], [86, 11.2], [87, 10.2], [88, 11.2], [89, 10.2], [90, 11.2], [91, 10.2], [92, 11.2], [93, 10.2], [94, 11.2], [95, 10.2], [96, 9.6], [97, 8.6], [98, 7.6], [99, 7.6]], "markPoint": {"symbol": "circle", "symbolSize": 10, "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "right", "formatter": "1.66초", "color": "#172c40"}, "data": [{"coord": [55.5, 1.66]}]}}], "legend": {"top": 0, "right": 0, "data": ["maxBufferLength 30", "maxBufferLength 10"]}}
{{< /chart >}}

목표 10에서도 버퍼가 0까지 가지 않은 것은 1.5Mbps가 360p(0.72Mbps)를 받기에 충분했기 때문입니다. 낮은 변형이 받는 속도보다 낮기만 하면 버퍼는 결국 다시 찹니다. 그래서 사다리의 가장 낮은 변형은 화질보다 「가장 나쁜 망에서도 재생이 이어지는가」로 정합니다([ABR 사다리 글](/posts/tech-blurting/abr-ladder-design/)).

손실도 받는 속도를 깎는 원인입니다. TCP에서 조각 하나가 사라지면 송신자는 중복 ACK 세 개를 받고 약 1 RTT 안에 다시 보냅니다([RFC 5681 3.2절](https://www.rfc-editor.org/rfc/rfc5681#section-3.2)). 중복 ACK가 모자라 재전송 타이머(RTO)를 기다리면 더 깁니다. RFC 6298은 RTO가 1초보다 작으면 1초로 올리라고 권하고(2.4), Linux는 최솟값을 200ms로 둡니다([include/net/tcp.h](https://github.com/torvalds/linux/blob/v6.18/include/net/tcp.h#L163)). 「RTT 150ms에서 손실 하나면 최소 300ms 멈춘다」 같은 고정값은 성립하지 않습니다. 재전송은 그 조각의 내려받기를 늦출 뿐이고, 버퍼가 남아 있으면 화면은 멈추지 않습니다([스트리밍 기초 글](/posts/tech-blurting/streaming-basics-from-scratch/#2-tcp의-재전송이-바로-버퍼링의-원인이다)).

### 전송 규약 차이는 HLS 글에서 다룹니다 {#quic--hol-blocking을-우회한-프로토콜}

HTTP/3는 QUIC 위에서 돌고, QUIC은 IETF가 [RFC 9000](https://www.rfc-editor.org/rfc/rfc9000)으로 표준화했습니다. 스트림별 재전송이 HTTP/2의 한 줄 막힘을 어떻게 피하는지는 [HLS 글의 HTTP/3 절](/posts/tech-blurting/hls-deep-dive/#qa-현대-플랫폼이-ll-hlswebrtc-쓰는-추세인데-왜-tcp라고-하나)에 있습니다. 버퍼와 직접 닿는 차이는 연결을 다시 맺는 비용입니다. TCP와 TLS 1.3을 새로 맺으면 첫 요청은 2 RTT 뒤에 나가고(TCP 1 RTT + TLS 1.3 1 RTT, [RFC 8446 2절](https://www.rfc-editor.org/rfc/rfc8446#section-2)), TLS 1.2면 3 RTT 뒤입니다([RFC 5246 7.3절](https://www.rfc-editor.org/rfc/rfc5246#section-7.3)). QUIC은 전송과 암호 연결을 한 핸드셰이크로 맺어([RFC 9000 7절](https://www.rfc-editor.org/rfc/rfc9000#section-7)) 1 RTT 뒤에 요청을 보냅니다.

망이 바뀌어 주소가 달라지면 QUIC은 연결을 이어 쓰는 연결 이전(connection migration)을 둡니다. 다만 RFC 9000 9절은 이전을 클라이언트만 시작하게 제한하고, 서버는 `disable_active_migration` 전송 인자(18.2절)로 이전을 받지 않겠다고 알릴 수 있습니다. 이 값을 받은 클라이언트는 핸드셰이크 때의 서버 주소로 새 로컬 주소를 써서 보낼 수 없으므로, 망이 바뀌면 연결을 새로 맺어야 합니다.

## 라이브 버퍼는 라이브 끝까지의 거리보다 길어질 수 없습니다 {#3-라이브와-vod는-버퍼링-양상이-완전히-다르다}

VOD와 라이브의 차이는 「받을 조각이 이미 있는가」입니다. 버퍼 정책이 같아도 받을 수 있는 조각의 양이 다릅니다.

### VOD는 끝까지 미리 받을 수 있습니다 {#vod--끝이-정해진-영상}

`EXT-X-PLAYLIST-TYPE:VOD`인 목록(또는 `EVENT`에 `EXT-X-ENDLIST`가 붙은 목록)은 더 늘어나지 않으므로 플레이어가 다시 받지 않아도 되고([RFC 8216 6.3.4절](https://www.rfc-editor.org/rfc/rfc8216#section-6.3.4)), 플레이어는 채움 목표까지 앞쪽 조각을 미리 받습니다. 기본 설정의 hls.js가 104초 VOD에서 버퍼를 약 51초까지 채운 것은 영상 끝이 그 자리였기 때문입니다. 영상이 더 길었다면 목표 106초까지 받았을 것입니다.

### 라이브는 목록이 늘어나는 만큼만 받습니다 {#라이브--sliding-window}

라이브 목록은 끝 표시가 없고, 앞쪽 조각이 빠지고 뒤에 새 조각이 붙습니다. 플레이어는 목록을 다시 받아야 새 조각을 알 수 있고, 그 간격에 하한이 있습니다. 목록이 바뀌었으면 받기 시작한 때부터 목표 길이 이상, 그대로면 목표 길이의 절반을 기다려야 합니다(RFC 8216 6.3.4절, [HLS 글](/posts/tech-blurting/hls-deep-dive/#전체-동작-흐름)). 측정한 라이브는 2초 조각 6개가 든 12초 창이었습니다.

### 시작 거리가 곧 버퍼 상한이자 지연입니다 {#라이브-엣지와-채팅-지연}

일반 HLS 플레이어는 목록 끝에서 목표 길이의 세 배 안쪽에서 시작하지 않습니다([RFC 8216 6.3.3절](https://www.rfc-editor.org/rfc/rfc8216#section-6.3.3)). hls.js는 목록에 `HOLD-BACK`이 있으면 그 값을 쓰고, 없으면 `liveSyncDurationCount`(기본 3) × 목표 길이를 씁니다([latency-controller.ts 49–78행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/latency-controller.ts#L49-L78)). 측정에서 hls.js는 목록 끝에서 6초(3 × 2초) 뒤에서 시작했습니다.

재생 위치 앞에 받을 수 있는 것은 목록 끝까지이므로 버퍼는 이 거리를 넘지 못합니다. `maxBufferLength` 30인데도 라이브 버퍼는 5–8초를 오갔고, 시청자가 보는 화면은 목록 끝보다 약 7.1초 늦었습니다. 버퍼를 더 두려면 시작 거리를 늘려야 하고, 늘린 만큼 지연도 늘어납니다. 채팅보다 화면이 늦는 것도 이 거리와, 조각이 다 만들어져야 목록에 오르는 시간 때문입니다. 두 몫을 함께 줄이는 방법은 [LL-HLS 글](/posts/tech-blurting/ll-hls-deep-dive/)에 있습니다.

라이브에서 받는 속도를 30초에 1.5Mbps로 떨어뜨리자 hls.js는 1초 만에 받던 조각을 버렸습니다. 로그에는 「Fragment 20 of level 2 is loading too slowly … Time to underbuffer: 4.110 s, Estimated load time for current fragment: 5.130 s」가 찍혔고, 곧 360p로 내려갔습니다. 버퍼는 3.42초까지 줄었다가 다시 6–7초로 돌아왔고 멈추지 않았습니다. 받던 조각을 버리는 판단은 「남은 버퍼로 버틸 시간」과 「지금 조각을 끝까지 받는 데 걸릴 시간」을 비교합니다([abr-controller.ts 408–438행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/abr-controller.ts#L408-L438)).

### hls.js는 창 밖으로 밀릴 때 라이브 끝 쪽으로 건너뜁니다 {#라이브에서-버퍼링-후-복구--점프}

망을 30초에 22초 동안 끊자 다음 순서로 진행했습니다(시각은 페이지 시계).

1. 30.0초 목록을 다시 받지 못해 `levelLoadError`.
2. 35.2초 버퍼 0.035초에서 재생이 멈추고 `ERROR` 이벤트(details `bufferStalledError`).
3. 망이 돌아온 직후 51.2초, 「Playback: 39.9649 is located too far from the end of live sliding playlist: 62, reset currentTime to : 55.03」 경고와 함께 재생 위치를 39.96초에서 55.03초로 옮김. 약 15초를 건너뛰었습니다.
4. 52.0초 `STALL_RESOLVED`. 멈춘 시간은 약 16.7초였습니다.

멈춘 위치(39.96초)는 그사이 12초 창 밖으로 밀려났습니다. hls.js는 재생 위치가 창 밖이면서 재생할 데이터가 모자라거나, 라이브 끝에서 `liveMaxLatencyDurationCount` × 목표 길이보다 뒤처지면 라이브 끝 쪽 시작 위치로 옮깁니다([stream-controller.ts 718–740행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/stream-controller.ts#L718-L740)). `liveMaxLatencyDurationCount`의 기본값은 무한대이므로([config.ts 474행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/config.ts#L474)), 기본 설정에서 건너뛰는 조건은 「창 밖으로 밀림」뿐입니다. 창 안에 있으면 늦은 채로 이어 봅니다. 늦은 만큼 따라잡게 하려면 `liveMaxLatencyDurationCount`나 `liveMaxLatencyDuration`을 직접 정해야 합니다.

## 플레이어는 대역폭 추정과 버퍼로 다음 조각 화질을 고릅니다 {#4-모바일-환경이-버퍼링의-진짜-무대다}

ABR(Adaptive Bitrate) 알고리즘은 크게 두 갈래입니다. 받은 속도로 다음 조각을 고르는 처리량 기반과, 버퍼 길이로 고르는 버퍼 기반입니다. 실제 플레이어는 둘을 섞습니다.

### hls.js는 빠르고 느린 지수 평균으로 대역폭을 추정합니다 {#와이파이--lte-핸드오버}

hls.js는 조각을 받을 때마다 「바이트 × 8 ÷ 걸린 시간」을 표본으로 넣고, 반감기가 다른 두 지수 이동 평균(EWMA)을 유지합니다. 기본 반감기는 빠른 쪽 3초, 느린 쪽 9초이고(라이브 · VOD 같음), 추정값은 둘 중 작은 쪽입니다([ewma-bandwidth-estimator.ts 74–83행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/utils/ewma-bandwidth-estimator.ts#L74-L83)). 소스 주석은 이 선택을 「내려갈 때는 빠르게, 올라갈 때는 천천히」라고 설명합니다. 변형을 고를 때는 추정값에 0.95(`abrBandWidthFactor`)를 곱해 비교하고, 올라갈 때는 0.7(`abrBandWidthUpFactor`)을 곱합니다([config.ts 506–513행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/config.ts#L506-L513)).

아래 그림의 청록 실선이 추정 대역폭입니다. 추정값은 조각을 다 받을 때마다 계단처럼 바뀝니다. 망 상한이 1.5Mbps로 떨어진 뒤에는 조각 세 개 만에 1.88Mbps까지 내려갔지만, 8Mbps로 돌아온 뒤에는 15초가 지나도 3.5Mbps 근처였습니다. 360p 조각은 작아서 표본 하나가 짧고, 느린 평균이 옛 값을 오래 기억하기 때문입니다.

{{< chart id="fig-bandwidth-estimate" kind="실측" caption="버퍼 그래프와 같은 maxBufferLength 10 재생에서 망 상한(CDP로 건 받는 속도), hls.js 추정 대역폭(bandwidthEstimate), 다음 조각을 받은 변형의 BANDWIDTH(loadLevel). 1초마다 가장 가까운 250ms 표본을 골랐습니다. 추정값은 하락 뒤 약 11초에 걸쳐 7.95Mbps에서 1.88Mbps로 내려갔고, 복귀 뒤에는 25초 동안 3.5Mbps까지만 올랐습니다." source="아래 「측정 조건」" height="320px" >}}
{"grid": {"left": 8, "right": 24, "top": 56, "bottom": 28, "containLabel": true}, "xAxis": {"type": "value", "name": "초", "min": 0, "max": 100, "interval": 20}, "yAxis": {"type": "value", "name": "Mbps", "min": 0, "max": 9, "interval": 2, "nameTextStyle": {"align": "left"}}, "series": [{"name": "망 상한", "type": "line", "step": "end", "showSymbol": false, "itemStyle": {"color": "#7a8a9b"}, "lineStyle": {"color": "#7a8a9b", "type": "dashed"}, "data": [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8], [20, 8], [21, 8], [22, 8], [23, 8], [24, 8], [25, 8], [26, 8], [27, 8], [28, 8], [29, 8], [30, 8], [31, 8], [32, 8], [33, 8], [34, 8], [35, 8], [36, 8], [37, 8], [38, 8], [39, 8], [40, 8], [41, 8], [42, 8], [43, 8], [44, 8], [45, 1.5], [46, 1.5], [47, 1.5], [48, 1.5], [49, 1.5], [50, 1.5], [51, 1.5], [52, 1.5], [53, 1.5], [54, 1.5], [55, 1.5], [56, 1.5], [57, 1.5], [58, 1.5], [59, 1.5], [60, 1.5], [61, 1.5], [62, 1.5], [63, 1.5], [64, 1.5], [65, 1.5], [66, 1.5], [67, 1.5], [68, 1.5], [69, 1.5], [70, 1.5], [71, 1.5], [72, 1.5], [73, 1.5], [74, 1.5], [75, 8], [76, 8], [77, 8], [78, 8], [79, 8], [80, 8], [81, 8], [82, 8], [83, 8], [84, 8], [85, 8], [86, 8], [87, 8], [88, 8], [89, 8], [90, 8], [91, 8], [92, 8], [93, 8], [94, 8], [95, 8], [96, 8], [97, 8], [98, 8], [99, 8]]}, {"name": "추정 대역폭", "type": "line", "showSymbol": false, "itemStyle": {"color": "#087f8b"}, "lineStyle": {"color": "#087f8b", "width": 3}, "data": [[0, 4.54], [1, 7.65], [2, 7.84], [3, 7.9], [4, 7.9], [5, 7.93], [6, 7.93], [7, 7.9], [8, 7.9], [9, 7.88], [10, 7.88], [11, 7.89], [12, 7.89], [13, 7.9], [14, 7.9], [15, 7.85], [16, 7.85], [17, 7.88], [18, 7.88], [19, 7.9], [20, 7.9], [21, 7.91], [22, 7.91], [23, 7.91], [24, 7.92], [25, 7.92], [26, 7.92], [27, 7.93], [28, 7.93], [29, 7.93], [30, 7.93], [31, 7.94], [32, 7.94], [33, 7.94], [34, 7.94], [35, 7.94], [36, 7.94], [37, 7.94], [38, 7.95], [39, 7.95], [40, 7.94], [41, 7.94], [42, 7.95], [43, 7.95], [44, 7.95], [45, 7.95], [46, 7.95], [47, 4.34], [48, 4.34], [49, 4.34], [50, 4.34], [51, 4.34], [52, 4.34], [53, 2.22], [54, 2.22], [55, 2.22], [56, 1.88], [57, 1.82], [58, 1.76], [59, 1.71], [60, 1.68], [61, 1.66], [62, 1.64], [63, 1.64], [64, 1.63], [65, 1.63], [66, 1.63], [67, 1.6], [68, 1.6], [69, 1.59], [70, 1.59], [71, 1.58], [72, 1.58], [73, 1.57], [74, 1.81], [75, 1.81], [76, 1.97], [77, 1.97], [78, 2.16], [79, 2.16], [80, 2.69], [81, 2.69], [82, 3.09], [83, 3.09], [84, 3.27], [85, 3.27], [86, 3.35], [87, 3.35], [88, 3.42], [89, 3.42], [90, 3.46], [91, 3.46], [92, 3.5], [93, 3.5], [94, 3.53], [95, 3.53], [96, 3.53], [97, 3.53], [98, 3.53], [99, 3.53]]}, {"name": "고른 변형", "type": "line", "step": "end", "showSymbol": false, "itemStyle": {"color": "#172c40"}, "lineStyle": {"color": "#172c40", "width": 2}, "data": [[0, 4.54], [1, 4.54], [2, 4.54], [3, 4.54], [4, 4.54], [5, 4.54], [6, 4.54], [7, 4.54], [8, 4.54], [9, 4.54], [10, 4.54], [11, 4.54], [12, 4.54], [13, 4.54], [14, 4.54], [15, 4.54], [16, 4.54], [17, 4.54], [18, 4.54], [19, 4.54], [20, 4.54], [21, 4.54], [22, 4.54], [23, 4.54], [24, 4.54], [25, 4.54], [26, 4.54], [27, 4.54], [28, 4.54], [29, 4.54], [30, 4.54], [31, 4.54], [32, 4.54], [33, 4.54], [34, 4.54], [35, 4.54], [36, 4.54], [37, 4.54], [38, 4.54], [39, 4.54], [40, 4.54], [41, 4.54], [42, 4.54], [43, 4.54], [44, 4.54], [45, 4.54], [46, 4.54], [47, 4.54], [48, 4.54], [49, 4.54], [50, 4.54], [51, 4.54], [52, 4.54], [53, 2.28], [54, 2.28], [55, 2.28], [56, 0.72], [57, 0.72], [58, 0.72], [59, 0.72], [60, 0.72], [61, 0.72], [62, 0.72], [63, 0.72], [64, 0.72], [65, 0.72], [66, 0.72], [67, 0.72], [68, 0.72], [69, 0.72], [70, 0.72], [71, 0.72], [72, 0.72], [73, 0.72], [74, 0.72], [75, 0.72], [76, 0.72], [77, 0.72], [78, 2.28], [79, 2.28], [80, 2.28], [81, 2.28], [82, 2.28], [83, 2.28], [84, 2.28], [85, 2.28], [86, 2.28], [87, 2.28], [88, 2.28], [89, 2.28], [90, 2.28], [91, 2.28], [92, 2.28], [93, 2.28], [94, 2.28], [95, 2.28], [96, 2.28], [97, 2.28], [98, 2.28], [99, 2.28]]}], "legend": {"top": 0, "right": 0, "data": ["망 상한", "추정 대역폭", "고른 변형"]}}
{{< /chart >}}

라이브 시험에서도 8Mbps로 돌아온 뒤 추정값이 1.69Mbps에서 3.6Mbps까지 오르는 데 약 35초가 걸렸고, 그 끝에서야 720p로 올라갔습니다. 낮은 변형에 머무는 시간이 화질 손해이고, 그 대가로 오르내림이 줄어듭니다.

### BOLA는 버퍼 길이만으로 화질을 고릅니다 {#디코딩-부하--h265를-왜-안-쓰나}

BOLA는 대역폭을 추정하지 않고 지금 버퍼 길이만 보고 다음 조각의 변형을 고르는 알고리즘입니다([Spiteri 외, BOLA, arXiv 1601.06748](https://arxiv.org/abs/1601.06748)). 버퍼가 길면 높은 변형을, 짧으면 낮은 변형을 고르도록 효용 함수를 최대화합니다. 추정이 늦게 따라오는 문제는 없는 대신, 버퍼가 짧은 동안에는 받는 속도가 충분해도 낮은 변형을 고릅니다. 처리량 예측과 버퍼를 함께 써서 몇 조각 앞을 내다보고 고르는 방식으로는 MPC가 있습니다([Yin 외, SIGCOMM 2015](https://doi.org/10.1145/2785956.2787486)).

### dash.js는 버퍼가 문턱을 넘으면 BOLA로 넘어갑니다 {#모바일-abr이-어려운-이유}

dash.js 5.3.0은 처리량 규칙과 BOLA 규칙이 모두 켜져 있으면 둘 사이를 버퍼 길이로 바꿉니다. 버퍼가 `hybridSwitchBufferTime`(기본 12초) 이상이면 BOLA로 가고, BOLA를 쓰는 중에는 그 절반인 6초 아래로 떨어져야 처리량 규칙으로 돌아옵니다([AbrController.js 1050–1058행](https://github.com/Dash-Industry-Forum/dash.js/blob/v5.3.0/src/streaming/controllers/AbrController.js#L1050-L1058), [Settings.js 1456행](https://github.com/Dash-Industry-Forum/dash.js/blob/v5.3.0/src/core/Settings.js#L1456)). 문턱을 둘로 나눈 것은 두 규칙 사이를 오가지 않게 하려는 이력(hysteresis)입니다.

## 재버퍼링은 횟수·비율·시작 시간으로 나눠 잽니다 {#5-플랫폼은-버퍼링을-어떻게-측정하고-줄이나}

「버퍼링이 많다」는 말은 적어도 세 가지로 나눠야 원인을 좁힐 수 있습니다. 재생 시작까지 걸린 시간, 재생 중 멈춘 횟수, 멈춘 시간의 비율입니다. 화질 점수와 멈춤을 함께 묶는 평가 모델(ITU-T P.1203)은 [화질 지표 글](/posts/tech-blurting/video-quality-bitrate-abr/#4-오디오도-비트레이트가-있고-멀티-트랙도-있다)에 있습니다.

### 재버퍼링 비율의 분모는 시청 시간입니다 {#핵심-qoe-지표}

이 글에서 재버퍼링 비율은 「멈춘 시간 ÷ 시청 시간」입니다. 분모를 무엇으로 잡느냐에 따라 같은 사건도 다른 숫자가 되고, 아래 연구는 분모를 영상 길이로 잡았습니다. 지표를 비교할 때는 분모와, 시작 시간을 재생 버튼부터 재는지 첫 요청부터 재는지부터 맞춥니다. 위 끊김 시험이라면 멈춤 1회(약 16.7초)와 건너뛴 15초를 따로 셉니다.

### 시작이 2초를 넘으면 이탈이 늘었다는 측정이 있습니다 {#버퍼링은-매출-직결-지표다}

Krishnan과 Sitaraman은 Akamai 망의 시청 2,300만 건(시청자 670만 명)을 준실험 설계로 분석했습니다([IMC 2012](https://doi.org/10.1145/2398776.2398799), [저자 공개본](https://people.cs.umass.edu/~ramesh/Site/PUBLICATIONS_files/imc208-krishnan.pdf)). 시작이 2초를 넘으면 시청자가 떠나기 시작했고, 그 뒤 1초가 늘 때마다 이탈률이 5.8%씩 늘었습니다. 영상 길이의 1% 이상을 재버퍼링으로 보낸 시청은 그렇지 않은 비슷한 시청보다 영상을 평균 5.02% 덜 봤습니다. 2012년 한 사업자의 데이터이므로 오늘의 서비스에 숫자를 그대로 옮기지 않고, 「시작 시간과 멈춤이 시청을 줄인다」는 방향의 근거로 씁니다.

### hls.js는 멈춤을 BUFFER_STALLED_ERROR로 알립니다 {#beacon--클라이언트가-자기-상태를-보고한다}

hls.js에는 `Hls.Events.BUFFER_STALLED`라는 이벤트가 없습니다. 멈춤은 `Hls.Events.ERROR` 이벤트의 `details`가 `bufferStalledError`(`ErrorDetails.BUFFER_STALLED_ERROR`, [errors.ts 84행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/errors.ts#L84))로 오고, 풀리면 `Hls.Events.STALL_RESOLVED`가 옵니다([events.ts 81–82행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/events.ts#L81-L82)). `STALL_RESOLVED`는 [v1.6.0](https://github.com/video-dev/hls.js/releases/tag/v1.6.0)(2025-03-27)에 들어왔습니다. 멈춘 시간은 두 이벤트의 시각 차이로 잽니다.

```javascript
// 발췌 예시: hls.js 1.6.0 이상
const hls = new Hls();
let stalledAt = null;
hls.on(Hls.Events.ERROR, (_, data) => {
  if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR && stalledAt === null) {
    stalledAt = performance.now();
  }
});
hls.on(Hls.Events.STALL_RESOLVED, () => {
  if (stalledAt === null) return;
  navigator.sendBeacon('/qoe', JSON.stringify({ stallMs: Math.round(performance.now() - stalledAt), level: hls.currentLevel }));
  stalledAt = null;
});
```

끊김 시험에서는 이 순서대로 `bufferStalledError` → `STALL_RESOLVED`가 두 번 왔습니다. 두 번째는 건너뛴 직후 0.2초 남짓 멈춘 것이었습니다. 같은 멈춤에 오류가 여러 번 올 수 있으므로 위 예처럼 첫 오류만 셉니다.

### CMCD로 버퍼 상태를 CDN 요청에 실어 보냅니다 {#origin-shield--라이브-인프라의-필수-패턴}

CMCD(Common Media Client Data, CTA-5004)는 플레이어가 조각 요청에 자기 상태를 붙여 보내는 규격입니다. 그러면 CDN 로그만 보고도 멈춤과 그때의 요청을 잇습니다. 현재 판 [CTA-5004-B](https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html)에서 버퍼와 닿는 키는 셋입니다.

| 키 | 뜻 |
|---|---|
| `bl` | 요청한 객체와 관련된 버퍼 길이(밀리초, 100ms 단위로 반올림 권고) |
| `bs` | 직전 보고와 이번 보고 사이에 버퍼가 바닥나 재버퍼링에 들어갔거나 그 상태였으면 true |
| `su` | 시작 · 탐색 · 버퍼가 빈 뒤의 회복 때문에 급히 필요한 객체 |

hls.js 1.7.4는 `cmcd` 설정을 주면 이 값을 붙이고, 멈춘 뒤 첫 영상 요청에 `bs`와 `su`를 함께 실습니다([cmcd-controller.ts 382–390행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/cmcd-controller.ts#L382-L390)). CDN이 원본 요청을 줄이는 구성은 [CDN 글](/posts/tech-blurting/cdn-for-live-streaming/)에 있습니다.

### 버퍼 목표를 바꿀 때는 지연과 재버퍼링을 함께 잽니다 {#ab-테스트로-정책을-결정한다}

버퍼 목표를 줄이면 라이브 지연과 받아 둔 데이터는 줄고, 같은 하락에서 버틸 여유도 줄어듭니다. 위 VOD 시험에서 목표 30과 10은 같은 1.5Mbps 하락에서 최저 버퍼가 19.7초와 1.66초로 갈렸습니다. 둘 다 멈추지는 않았으므로 이 시험만으로는 목표 10이 더 나쁘다고 말할 수 없습니다. 하락이 더 깊었다면 여유가 작은 목표 10이 먼저 멈췄을 가능성이 큽니다(측정하지 않음). 정책을 바꿀 때는 무작위로 나눈 두 집단에서 지연 · 재버퍼링 비율 · 시작 시간 · 평균 변형을 함께 재고, 실험 전에 어떤 지표를 우선할지 정해 둡니다.

## 버퍼 문제는 받는 속도·버퍼 목표·시작 거리 중 하나로 좁힙니다 {#정리하면}

- 받는 속도: 추정 대역폭과 고른 변형을 함께 봅니다. 하락 뒤 내려가기까지 몇 초가 걸리고, 가장 낮은 변형이 받는 속도보다 낮은지가 멈춤을 가릅니다.
- 버퍼 목표: hls.js는 `maxBufferLength`가 하한이고 `maxBufferSize`가 목표를 정합니다. 설정값이 아니라 `video.buffered`로 실제 버퍼를 잽니다.
- 시작 거리: 라이브에서는 버퍼 상한이자 지연입니다. 버퍼를 늘리려면 지연을 늘려야 하고, 둘을 함께 줄이려면 LL-HLS로 갑니다.
- 끊김 뒤 건너뜀은 hls.js 기본 설정에서 창 밖으로 밀렸을 때만 납니다. 늦게라도 이어 보는 것과 건너뛰는 것 중 무엇을 고를지는 `liveMaxLatencyDurationCount`로 정합니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 16:42–17:05(KST)에 실행했습니다. 각 조건 1회입니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1. 1분 load average는 측정 중 12–108이었습니다(다른 세션의 작업 포함). 라이브 인코더의 실시간 배속은 0.998–1배였습니다.
- 도구: FFmpeg 9.0.2(Homebrew), Google Chrome 157.0.8103.51(헤드리스, Playwright `channel: 'chrome'`), hls.js 1.7.4(npm 패키지 `dist/hls.js`).
- 입력: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p(© copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4 (sha256 `34bbd52a4b89fdf63c8ace50b268da26653a59508288100cd3c23de276db7931`)를 두 번 이어 붙인 약 104초.
- VOD 사다리: `ffmpeg -stream_loop 1 -i sintel_trailer-1080p.mp4 -an -filter_complex "[0:v]split=3[a][b][c];[a]scale=1920:1080[v0];[b]scale=1280:720[v1];[c]scale=640:360[v2]" -map "[v0]" -c:v:0 libx264 -b:v:0 4000k -maxrate:v:0 4000k -bufsize:v:0 4000k -map "[v1]" -c:v:1 libx264 -b:v:1 2000k -maxrate:v:1 2000k -bufsize:v:1 2000k -map "[v2]" -c:v:2 libx264 -b:v:2 600k -maxrate:v:2 600k -bufsize:v:2 600k -preset veryfast -g 48 -keyint_min 48 -sc_threshold 0 -f hls -hls_time 2 -hls_playlist_type vod -hls_segment_filename "vod/v%v/s%03d.ts" -master_pl_name master.m3u8 -var_stream_map "v:0 v:1 v:2" "vod/v%v/index.m3u8"`. hls.js가 읽은 BANDWIDTH는 4,536,816 · 2,276,304 · 718,912입니다.
- 라이브: 같은 사다리를 `-re -stream_loop -1`, `-preset ultrafast`, `-hls_list_size 6 -hls_flags delete_segments+independent_segments`로 실시간 인코딩했습니다(BANDWIDTH 4,400,000 · 2,200,000 · 660,000, 창 12초).
- 재생: 로컬 HTTP 서버(127.0.0.1, `Cache-Control: no-store`)에서 `new Hls({ maxBufferLength })`(VOD 두 번째 쌍은 `maxBufferSize: 0` 추가)로 재생하고, 250ms마다 `video.buffered` 끝 − `currentTime`, `currentLevel`, `loadLevel`, `bandwidthEstimate`, `latency`를 기록했습니다. 이벤트는 `ERROR`(details), `STALL_RESOLVED`, `LEVEL_SWITCHED`, `<video>`의 `waiting` · `playing` · `seeking`, hls.js 경고 로그입니다.
- 망: Chrome DevTools Protocol `Network.emulateNetworkConditions`(지연 20ms, 받는 속도 8,000 → 1,500 → 8,000kbps, 끊김은 `offline`)로 흉내 냈습니다. 브라우저 안에서 속도를 깎는 방식이라 실제 망의 패킷 손실 · TCP 재전송 · 무선 변동은 들어 있지 않습니다. 시각은 페이지를 연 때부터 잰 값이라 망을 바꾼 스크립트 시각과 약 1초 어긋납니다.

## 출처

- hls.js v1.7.4 소스: [config.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/config.ts#L456-L513) · [base-stream-controller.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/base-stream-controller.ts#L1480-L1492) · [stream-controller.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/stream-controller.ts#L718-L740) · [latency-controller.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/latency-controller.ts#L49-L78) · [abr-controller.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/abr-controller.ts#L408-L438) · [ewma-bandwidth-estimator.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/utils/ewma-bandwidth-estimator.ts#L74-L83) · [errors.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/errors.ts#L84) · [events.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/events.ts#L81-L82) · [cmcd-controller.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/cmcd-controller.ts#L382-L390) · [API.md](https://github.com/video-dev/hls.js/blob/v1.7.4/docs/API.md) · [v1.6.0 릴리스 노트](https://github.com/video-dev/hls.js/releases/tag/v1.6.0)
- [Shaka Player v5.3.4 player_configuration.js](https://github.com/shaka-project/shaka-player/blob/v5.3.4/lib/util/player_configuration.js#L191-L192)
- [AndroidX Media3 1.11.1 DefaultLoadControl.java](https://github.com/androidx/media/blob/1.11.1/libraries/exoplayer/src/main/java/androidx/media3/exoplayer/DefaultLoadControl.java#L64-L102)
- dash.js v5.3.0: [AbrController.js](https://github.com/Dash-Industry-Forum/dash.js/blob/v5.3.0/src/streaming/controllers/AbrController.js#L1050-L1058) · [Settings.js](https://github.com/Dash-Industry-Forum/dash.js/blob/v5.3.0/src/core/Settings.js#L1456)
- [RFC 8216, HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — 6.3.3 시작 위치, 6.3.4 목록 다시 받기
- [RFC 5681, TCP Congestion Control](https://www.rfc-editor.org/rfc/rfc5681#section-3.2) · [RFC 6298, Computing TCP's Retransmission Timer](https://www.rfc-editor.org/rfc/rfc6298) · [Linux v6.18 include/net/tcp.h](https://github.com/torvalds/linux/blob/v6.18/include/net/tcp.h#L163)
- [RFC 9000, QUIC](https://www.rfc-editor.org/rfc/rfc9000) — 9 연결 이전, 18.2 전송 인자 · [RFC 8446, TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446#section-2) · [RFC 5246, TLS 1.2](https://www.rfc-editor.org/rfc/rfc5246#section-7.3)
- K. Spiteri, R. Urgaonkar, R. K. Sitaraman, [BOLA: Near-Optimal Bitrate Adaptation for Online Videos](https://arxiv.org/abs/1601.06748) (arXiv 1601.06748, 2016)
- X. Yin 외, [A Control-Theoretic Approach for Dynamic Adaptive Video Streaming over HTTP](https://doi.org/10.1145/2785956.2787486) (SIGCOMM 2015) · [ACM 페이지 보관본](https://web.archive.org/web/20250218053425/https://dl.acm.org/doi/10.1145/2785956.2787486) (doi.org · ACM은 자동 접속을 막음)
- S. S. Krishnan, R. K. Sitaraman, [Video Stream Quality Impacts Viewer Behavior: Inferring Causality Using Quasi-Experimental Designs](https://doi.org/10.1145/2398776.2398799) (IMC 2012) · [저자 공개본 PDF](https://people.cs.umass.edu/~ramesh/Site/PUBLICATIONS_files/imc208-krishnan.pdf)로 대조 (doi.org는 자동 접속을 막음)
- CTA WAVE, [Common Media Client Data, CTA-5004-B](https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html)
- [Sintel](https://durian.blender.org/sharing/) — 시험 영상, © copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
