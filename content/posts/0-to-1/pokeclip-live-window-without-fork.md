---
title: "LL-HLS 라이브 창은 지연이 아니라 복귀 여유를 정했습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-12T02:10:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "6초 라이브 창 요구가 gohlslib 수정과 애플 규격 위반을 부르자 창 · 시청 지연 · 조각 길이를 나눠 8월에 고치지 않는 최솟값 14초(2초 × 7)를 고른 판단, 10월 17일 CloudFront 뒤 7 · 14 · 28초 창 실측에서 차이가 15초 멈춤 뒤 복귀뿐이었던 결과, 10월 19일 녹화와 같은 4초 조각 7개(28초)로 정하고 되감기 주소 서비스 뒤에 적용하기로 한 조건."
tags: ["PokeClip", "HLS", "LL-HLS", "MediaMTX", "설계 판단"]
portfolio_cases: [29]
portfolio_pages: [6]
portfolio_edition: "2026-10-15-v2"
---

PokeClip의 라이브 재생 목록 창을 6초로 줄이려던 2026년 8월 25일 결정은 MediaMTX가 쓰는 LL-HLS 라이브러리 gohlslib을 고쳐야 성립했습니다. gohlslib은 LL-HLS 목록의 조각이 7개보다 적으면 시작을 거부하고, 애플 HLS 저작 규격은 라이브 목록에 조각 6개 이상을 요구합니다. 6초는 2초 조각 3개였습니다. 저는 창 길이가 시청 지연을 정하지 않는다고 보고 8월 28일 고치지 않는 최솟값인 7조각(2초 × 7 = 14초)으로 바꿨습니다. 10월 17일 CloudFront 뒤에서 7·14·28초 창을 재 보니 LL-HLS 지연의 기준값(PART-HOLD-BACK)은 셋 다 1.25초였고, 차이는 15초 멈췄다 돌아올 때 28초 창만 목록을 다시 받은 것 하나였습니다. 10월 19일 라이브 조각을 녹화와 같은 4초로 두고 창을 28초(4초 × 7)로 정했습니다.

저는 6초 → 14초 → 28초 결정, 창을 줄이는 적용 순서, AWS 실측의 비용과 범위를 정했습니다. 규격·소스 조사, 6초용 gohlslib 패치 시험, 실측은 AI(Claude Code와 Codex)가 했고 두 AI가 서로 리뷰했습니다.

## 6초 창은 gohlslib을 고쳐야 했고 애플 규격에도 못 미쳤습니다

6초는 참고한 다른 라이브 서비스의 목록(2초 조각 3개)을 따른 값이었습니다. MediaMTX는 LL-HLS 목록을 gohlslib으로 만들고, gohlslib v2.4.3은 LL-HLS에서 조각 수가 7보다 작으면 「Low-Latency HLS requires at least 7 segments」 오류로 시작을 거부합니다([`muxer.go` 318–320행](https://github.com/bluenviron/gohlslib/blob/v2.4.3/muxer.go#L318-L320)). 기본값도 7입니다. gohlslib은 목록 일부를 생략해 보내는 델타 갱신 광고(`CAN-SKIP-UNTIL`, 목표 길이의 6배 이상이어야 함)를 조건 없이 내는데, 7은 그 약속을 지킬 수 있는 가장 작은 창으로 보입니다. 다만 커밋 기록으로 확인한 이유는 아닙니다.

8월 25일에는 이 하한을 고치는 쪽을 골랐습니다. AI가 가드를 포함해 다섯 곳을 고친 패치판을 만들었고 전체 시험이 통과했습니다. 고칠 수는 있었지만 대가가 남았습니다. 상류에 올릴 수정이 거절되면 MediaMTX를 올릴 때마다 차이를 다시 검증하는 포크를 계속 들고 가야 했습니다. 사흘 뒤에는 애플 [HLS Authoring Specification for Apple Devices](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices) 8.11 「You MUST provide at least six segments in a live (linear) playlist」도 확인했습니다. 조각 3개인 6초 창은 이 조항을 어깁니다. 8월 25일에는 애플의 저지연 설명 페이지만 보고 「애플도 7을 요구하지 않는다」고 판단했는데, 저작 규격 본문을 열지 않고 내린 잘못된 판단이었습니다.

## 창은 지연이 아니라 목록에 남는 범위입니다 {#14초-창은-14초-늦게-본다는-뜻이-아닙니다}

재생 목록 창은 목록에 아직 남아 있는 과거 조각의 범위입니다. 플레이어가 라이브 끝에서 얼마나 뒤에서 재생을 시작하는지는 따로 정해집니다. LL-HLS에서는 서버가 목록에 적는 `PART-HOLD-BACK`이 그 거리이고, 클라이언트는 목록 끝에서 이보다 가까운 곳을 고르지 않아야 합니다([HLS 개정 초안 22판 4.4.3.8 · 6.3.3](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 목록에 14초가 있다고 시청자가 14초 전 화면을 보는 것이 아닙니다.

| 값 | 무엇을 정하나 | 정한 값 |
|---|---|---|
| 라이브 목록 창 | 목록에서 다시 받을 수 있는 과거 조각 범위 | 8월 14초 → 10월 28초 |
| 시청 지연 | 라이브 끝에서 재생 위치까지 | PART-HOLD-BACK 1.25초(파트 0.5초의 2.5배) |
| 녹화 조각 | 저장·편집용 파일 단위 | 4초 유지 |

세 값을 나누자 6초 요구가 실제로 원한 것은 지연이었고, 지연은 창으로 줄지 않는다는 것이 보였습니다. 되감기도 따로 발행하는 목록이 맡기로 했으므로([라이브와 되감기 목록을 나눈 글](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/)), 짧은 라이브 창 하나로 되감기를 채울 필요도 없었습니다.

## 8월에는 고치지 않고 7조각 14초를 골랐습니다 {#gop-2초인데-최소-길이는-왜-1초인가}

8월 28일 고른 값은 2초 조각 7개, 약 14초입니다. 조각 수 7은 하한이 강제하고, 조각 길이는 송출의 키프레임 간격(GOP)이 정합니다. 플러그인이 GOP를 2초로 고정하므로 창은 약 14초가 됩니다.

설정은 MediaMTX `hlsSegmentDuration: 1s`로 두었습니다. gohlslib은 새 키프레임이 왔을 때, 지금 조각이 시작된 뒤 지난 시간이 설정값 「이상」이면 조각을 자릅니다([`muxer_segmenter.go` 579–580행](https://github.com/bluenviron/gohlslib/blob/v2.4.3/muxer_segmenter.go#L579-L580)). 설정 2초에 GOP 2초면 등호 경계에 걸립니다. 키프레임이 한 틱만 일찍 와도 조건을 못 채워 다음 키프레임까지 기다리고, 조각이 4초로 튑니다. 이전 4초 설정의 실측에서 조각 평균이 3.99초로 공칭값보다 짧게 나온 적이 있어 이 경계를 걱정했습니다. 설정 1초면 2초 키프레임마다 여유 있게 잘리고 창은 그대로 14초입니다.

같은 날 무수정 MediaMTX 1.20.1로 착수 시험을 했습니다. 관측한 조각 길이(EXTINF)는 모두 2.00000초, 목표 길이(TARGETDURATION)는 2로 고정, PART-HOLD-BACK은 1.25초, `CAN-SKIP-UNTIL`은 12초로 창 14초 안이었습니다. 창 밖으로 밀린 조각을 요청하면 404였습니다. 다만 이 시험은 설계를 시작할 근거였고, 운영에 적용할 근거로는 세 가지를 남겼습니다. 탭을 15·30초 멈췄다 돌아오기, GOP 하나가 튀는 송출, CDN 경유입니다.

포트폴리오 요약(2026-10-15판) 6쪽의 「7조각·GOP 2초의 약 14초 창」은 이 8월 28일 결정 기준이고, 10월 19일 결정 전입니다.

## CDN 뒤에서 세 창을 재 보니 차이는 멈췄다 돌아올 때뿐이었습니다

10월 17일 「녹화 조각이 4초면 라이브도 4초 × 7이 낫지 않나」를 실측으로 가리기로 했습니다. AI가 임시 EC2 3대와 CloudFront 3벌을 띄워 7초(1초 × 7), 14초(2초 × 7), 28초(4초 × 7) 창을 같은 합성 패턴(7초 창만 GOP 1초)으로 원본 직접과 CloudFront 경유로 쟀고, 실험 자원은 같은 날 지웠습니다. 두 경로의 값은 같았습니다.

| 항목 | 7초 창 | 14초 창 | 28초 창 |
|---|---|---|---|
| EXTINF 7개 | 모두 1.0 | 모두 2.0 | 모두 4.0 |
| TARGETDURATION | 1 | 2 | 4 |
| PART-HOLD-BACK | 1.25 | 1.25 | 1.25 |
| CAN-SKIP-UNTIL | 6 | 12 | 24 |
| 15초 멈춘 뒤 같은 번호로 다시 요청 | 400 | 400 | **200** |
| 30초 멈춘 뒤 같은 번호로 다시 요청 | 400 | 400 | 400 |

「멈췄다 돌아오기」는 플레이어가 멈추기 직전에 기다리던 조각 번호(MSN)로 블로킹 요청(다음 조각이 생길 때까지 서버가 응답을 미루는 요청)을 다시 보낸 시험입니다. 그 조각이 아직 창 안이면 200, 밀려났으면 gohlslib이 400을 돌려줍니다([`muxer_stream.go` 344–352행](https://github.com/bluenviron/gohlslib/blob/v2.4.3/muxer_stream.go#L344-L352)). 개정 초안은 요청한 조각이 목록에서 빠졌어도 목록 전체를 돌려주라고 정합니다(6.2.5.2). 이 400은 초안과 다른, 무수정 gohlslib의 공통 동작입니다. 그림 1에서 막대가 15초 선을 넘는 창만 복귀했습니다.

{{< chart id="fig-window-pause" kind="실측" caption="세 라이브 창의 길이(조각 길이 × 7)와 멈춤 시간. 15초 멈춘 뒤 같은 조각 번호로 다시 요청했을 때 28초 창만 200을 받았고, 30초 멈춤은 셋 다 400이었습니다. 2026년 10월 17일 MediaMTX 1.21.1 · CloudFront 경유 실측(비공개 기록)." height="260px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 40, "bottom": 8, "containLabel": true},
  "xAxis": {"type": "value", "name": "초", "min": 0, "max": 40, "interval": 10},
  "yAxis": {"type": "category", "inverse": true, "data": ["7초 창", "14초 창", "28초 창"]},
  "series": [{
    "type": "bar",
    "barWidth": 22,
    "label": {"show": true, "position": "right", "formatter": "{c}초"},
    "data": [
      {"value": 7, "itemStyle": {"color": "#7a8a9b"}},
      {"value": 14, "itemStyle": {"color": "#7a8a9b"}},
      {"value": 28, "itemStyle": {"color": "#087f8b"}}
    ],
    "markLine": {"symbol": "none", "silent": true, "data": [
      {"name": "15초 멈춤", "xAxis": 15, "lineStyle": {"color": "#b42318", "type": "dashed", "width": 2}, "label": {"formatter": "15초 멈춤", "position": "start"}},
      {"name": "30초 멈춤", "xAxis": 30, "lineStyle": {"color": "#7a8a9b", "type": "dashed", "width": 2}, "label": {"formatter": "30초 멈춤", "position": "start"}}
    ]}
  }]
}
{{< /chart >}}

영상은 같은 일을 시간으로 보여 줍니다. 세 창이 라이브 끝을 따라 밀려가는 동안, 멈춘 플레이어가 기다리던 조각이 어느 창에 남는지를 보면 됩니다.

{{< motion scene="LiveWindowPause" id="fig-live-window-pause" kind="개념도" caption="세 창이 라이브 끝을 따라 오른쪽으로 밀려가는 15초 동안 멈춘 플레이어가 기다리던 조각은 그 자리에 남습니다. 7초 · 14초 창에서는 그 조각이 창 밖으로 밀려 400을 받고, 28초 창에서는 창 안에 남아 200을 받습니다. 10월 17일 실측 결과를 바탕으로 그린 설명용 그림입니다." >}}

같은 날 등호 경계도 다시 시험했습니다. 14초 서버를 설정 2초, 28초 서버를 설정 4초로 바꾸고 90초 동안 2초마다 목록을 45번씩 받았습니다. 서버마다 EXTINF 315줄이 모두 정확히 2.0초·4.0초였고 TARGETDURATION도 바뀌지 않았습니다. 이 ffmpeg 송출에서는 8월에 걱정한 밀림이 나오지 않았습니다. OBS 송출의 타임스탬프 떨림에서도 같은지는 확인하지 않았습니다. 플레이어(hls.js)에서 잰 실제 지연도 브라우저 도구 연결이 끊겨 재지 못했습니다. LL 모드에서는 PART-HOLD-BACK이 지연 기준이라 셋이 같을 것으로 보지만, 측정값은 아닙니다.

창과 별개로, MediaMTX 1.21.1 기본 설정은 CloudFront 뒤에서 재생되지 않았습니다. MediaMTX의 HLS 시청 세션이 원본이 본 요청 IP에 묶이는데 CloudFront는 요청마다 다른 IP로 원본에 오기 때문이었고, 신뢰 프록시 설정(`hlsTrustedProxies`)으로 풀었습니다.

## 녹화와 같은 4초 조각 7개, 28초로 정했습니다

10월 19일 라이브 조각을 녹화와 같은 4초(`hlsSegmentDuration: 4s`)로 두고 개수만 7로 줄이기로 정했습니다. 설정 변경은 개수 하나입니다.

| 날짜 | 창 | 판단 |
|---|---|---|
| 8월 25일 | 6초(2초 × 3) | gohlslib 하한을 고치는 전제 |
| 8월 28일 | 14초(2초 × 7) | 고치지 않는 최솟값, 설정 1초로 등호 경계 회피 |
| 10월 17일 | 7 · 14 · 28초 실측 | 지연 기준 같음, 15초 복귀는 28초만 |
| 10월 19일 | 28초(4초 × 7) | 녹화와 같은 조각, 개수만 줄임 |

28초를 고르며 받아들인 대가도 있습니다. LL을 쓰지 않는 플레이어는 목록 끝에서 대략 목표 길이의 세 배 뒤에 앉으므로, 그 계산값이 14초 창의 6초에서 12초로 늘어납니다. PokeClip 웹 플레이어는 LL 모드이고 CDN 경유에서도 LL이 유지돼 이 대가를 받아들였습니다. 목록이 4초 단위로 자라 2초 구성보다 성기지만 지연은 PART-HOLD-BACK이 정합니다. 30초 멈춤은 28초 창에서도 400입니다. 7초 창은 복귀 여유가 가장 적어 뺐습니다.

## 창 축소는 되감기 주소가 서비스된 뒤에 적용하기로 했습니다 {#포크하지-않는-결정에도-남겨야-할-작업이-있습니다}

8월 설계 당시 라이브 목록은 4초 조각 900개로 1시간 되감기를 겸했습니다. 그래서 적용 조건을 달았습니다. 되감기 전용 주소가 시청자에게 서비스된 뒤에만 라이브 창을 줄이기로 했습니다. 거꾸로 하면 시청자는 지연 이득 없이 1시간 되감기를 잃습니다.

포크하지 않는다고 할 일이 사라지지는 않았습니다. 운영 적용 전 확인으로 두 가지가 남았습니다.

- GOP 하나만 튀는 송출. 조각 하나가 6초로 튀면 목표 길이가 오르고 `CAN-SKIP-UNTIL` 광고가 창보다 길어질 수 있습니다. 아직 주입 시험을 하지 않았습니다.
- CDN 모드(`hlsCDNSecret`). 10월 17일 실측은 신뢰 프록시 설정까지였고, 목록이 시청자별 세션 주소에 `no-cache`라 CDN 캐시 효과는 0이었습니다. 지금 운영 템플릿에는 CDN 모드가 이미 들어가 있지만([`mediamtx.yml.tmpl` 143행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/mediamtx.yml.tmpl#L143)), 그 구성에서 창을 다시 재지는 않았습니다.

무수정 gohlslib의 동작 두 가지도 받아들였습니다. 창 밖 조각 번호 블로킹 요청에 400을 돌려주는 것, 그리고 목록에서 빠진 조각을 곧바로 지우는 것입니다. 개정 초안 6.2.2는 목록에서 뺀 조각도 일정 시간 받을 수 있어야 한다고 정합니다. 창이 짧아지면 이런 경우가 2초나 4초마다 생길 수 있어, 상류 제보 후보로 기록만 했습니다. 재현되는 공통 결함은 따로 상류에 제안했습니다([전체 기술 기록](/posts/0-to-1/portfolio-engineering-notes/)).

라이브 창 길이를 정한다면 지연 목표가 아니라 시청자가 탭을 멈췄다가 돌아오는 시간을 기준으로 보십시오. 지연은 PART-HOLD-BACK이 정하고, 창이 정하는 것은 돌아왔을 때 목록에 내 자리가 남아 있는가입니다.

## 측정 조건

- 착수 시험(8월 28일): 무수정 `bluenviron/mediamtx:1.20.1`, SRT 송출, 오디오 6트랙, 창 7개, 35초 관측과 목록 두 시점. AI가 수행했고 원자료는 비공개입니다.
- CloudFront 실측(10월 17일): 임시 EC2 t3.medium 3대(Amazon Linux 2023, Docker, `bluenviron/mediamtx:1.21.1`)와 CloudFront 배포 3벌. ffmpeg testsrc2 720p30과 사인파 송출, 파트 0.5초, `hlsSegmentCount: 7`, 녹화 없음. 7초 창은 GOP 1초·설정 1s, 14초 창은 GOP 2초·설정 1s, 28초 창은 GOP 2초·설정 3s(조각 4.0초)였습니다. 측정은 curl과 목록 파서로 했고, 등호 경계 시험만 설정 2s·4s로 바꿔 원본에 직접 했습니다. 판마다 한 번씩 돈 동작 확인입니다. 제가 비용을 승인했고 AI가 수행했으며, 실험 자원은 같은 날 모두 지웠습니다. 원자료는 비공개입니다.
- 소스 인용은 gohlslib v2.4.3(MediaMTX 1.20.1 포크 이미지에 들어 있는 판)입니다. 10월 17일 실측의 MediaMTX 1.21.1은 gohlslib v2.4.5를 쓰고, 인용한 세 곳(7개 하한, 자르는 조건, 창 밖 400)의 동작은 두 판이 같습니다. 애플 규격과 HLS 개정 초안은 2026년 11월 11일에 다시 읽었습니다.

## 출처

- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices) — 8.11 라이브 목록 최소 조각 6개
- [HLS 개정 초안 22판(draft-pantos-hls-rfc8216bis-22)](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) — 4.4.3.8 PART-HOLD-BACK · CAN-SKIP-UNTIL, 6.2.2 Live Playlists, 6.2.5.2 Blocking Playlist Reload, 6.3.3 재생 시작 위치. 아직 RFC가 아닌 초안입니다.
- [bluenviron/gohlslib v2.4.3 `muxer.go`](https://github.com/bluenviron/gohlslib/blob/v2.4.3/muxer.go#L318-L320) — LL-HLS 조각 7개 하한
- [bluenviron/gohlslib v2.4.3 `muxer_segmenter.go`](https://github.com/bluenviron/gohlslib/blob/v2.4.3/muxer_segmenter.go#L579-L580) — 조각을 자르는 조건
- [bluenviron/gohlslib v2.4.3 `muxer_stream.go`](https://github.com/bluenviron/gohlslib/blob/v2.4.3/muxer_stream.go#L344-L352) — 창 밖 블로킹 요청의 400
- [HLS 라이브와 DVR 목록을 나누자 넘김 조건이 생겼습니다](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/) — 되감기 목록 분리와 적용 순서
- 팀 내부 결정 · 실측 기록(비공개) — 8월 25·28일과 10월 19일 결정, 8월 28일 착수 시험, 10월 17일 CloudFront 실측

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 6쪽](/portfolio/2026-10-15-v2/full.pdf#page=6)
