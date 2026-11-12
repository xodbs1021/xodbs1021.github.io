---
title: "라이브 x264는 VBV와 키프레임 간격을 옵션으로 고정합니다"
date: 2026-11-13T03:15:18+09:00
description: "라이브 송출용 x264 설정은 화질보다 순간 비트와 키프레임 위치를 묶는 일입니다. FFmpeg 9.0.2 · x264 core 165로 preset 10종의 CPU 시간과 크기, zerolatency가 끄는 설정, maxrate · bufsize가 정하는 VBV 상한과 HLS BANDWIDTH 125% 규칙, -minrate가 libx264에 전달되지 않아 필러가 0개인 것, -g와 -sc_threshold 0으로 고정한 키프레임 위치를 직접 재 확인했습니다."
categories: ["tech-blurting"]
tags: ["x264", "FFmpeg", "VBV", "GOP", "라이브 송출", "HLS"]
draft: false
author: "김태윤"
---

라이브 송출 인코더는 화질을 가장 높게 뽑는 것보다 두 가지를 먼저 묶어야 합니다. 한 구간에 실리는 비트의 상한과 키프레임이 놓이는 시각입니다. 둘 다 x264의 기본값으로는 묶이지 않습니다. 같은 3,000kbps 상한을 줘도 VBV 버퍼(`-bufsize`)를 6,000k로 두면 2초 조각 하나가 4,543kbps까지 올라가, FFmpeg가 라이브 중에 HLS 목록에 적어 둔 BANDWIDTH(3,300,000)의 141.5%가 됐습니다. 750k로 줄이자 최고 조각이 같은 값의 94.3%로 내려왔습니다. 키프레임도 `-g 60`만 주면 장면 전환마다 끼어들어 1.3초·2.6초에 생겼고, `-sc_threshold 0`을 더해야 0·2·4초에 고정됐습니다. 모두 FFmpeg 9.0.2와 x264 core 165로 이 글을 쓰며 잰 값입니다(아래 「측정 조건」).

## preset은 같은 CRF에서 CPU 시간과 파일 크기를 맞바꿉니다

x264의 preset은 움직임 탐색 범위, 참조 프레임 수, B 프레임 수, lookahead 길이 같은 내부 설정을 한 번에 고르는 묶음입니다. FFmpeg H.264 위키는 느린 preset일수록 압축 효율이 좋아서, 같은 CRF에서는 비트레이트가 줄고 같은 비트레이트에서는 화질이 오른다고 설명합니다([FFmpeg 위키 H.264](https://trac.ffmpeg.org/wiki/Encode/H.264)). CRF(Constant Rate Factor)는 화질 목표를 정하는 값으로 0–51 범위에 기본 23이고, 위키는 17–18을 「시각적으로 거의 무손실」로 봅니다.

Sintel 예고편 10초(1080p 24fps)를 CRF 23으로 고정하고 preset만 10가지로 바꿔 인코딩했습니다. 막대는 인코딩에 쓴 CPU 시간(user + sys)이고, 가로축은 로그 눈금입니다.

{{< chart id="fig-preset-cpu" kind="실측" caption="preset별 CPU 시간(초, 로그 눈금). 같은 10초 1080p24 입력을 CRF 23으로 인코딩. ultrafast 6.8초에서 placebo 956초까지 약 140배 차이. 2026-11-13, MacBook Air(M5), FFmpeg 9.0.2, x264 core 165, 1회." source="아래 「측정 조건」" height="420px" >}}
{
  "grid": {"left": 8, "right": 64, "top": 16, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "log", "name": "CPU 초", "min": 1, "max": 10000, "logBase": 10, "axisLabel": {"showMaxLabel": false}},
  "yAxis": {"type": "category", "inverse": true, "data": ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow", "placebo"]},
  "series": [
    {"type": "bar", "barWidth": 16, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [6.8, 14.5, {"value": 18.0, "itemStyle": {"color": "#087f8b"}}, 24.8, 31.1, 35.3, 46.3, 80.1, 174.2, 956.0]}
  ]
}
{{< /chart >}}

CPU 시간은 preset이 느려질수록 꾸준히 늘었고, veryslow에서 placebo로 넘어갈 때만 5.5배가 더 들었습니다. 결과 파일의 크기는 다르게 움직였습니다.

{{< chart id="fig-preset-bitrate" kind="실측" caption="같은 인코딩의 평균 비트레이트(kbps). ultrafast는 7,461kbps, superfast는 4,732kbps였고 veryfast부터는 2,739–3,210kbps에 모였습니다. VMAF는 95.8(veryfast)–98.1(ultrafast)." source="아래 「측정 조건」" height="420px" >}}
{
  "grid": {"left": 8, "right": 64, "top": 16, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "value", "name": "kbps", "min": 0, "max": 8000, "interval": 2000},
  "yAxis": {"type": "category", "inverse": true, "data": ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow", "placebo"]},
  "series": [
    {"type": "bar", "barWidth": 16, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [7461, 4732, {"value": 2830, "itemStyle": {"color": "#087f8b"}}, 3141, 3210, 3042, 2962, 2947, 2739, 2817]}
  ]
}
{{< /chart >}}

크기가 preset 순서대로 줄지 않은 것은 CRF가 preset마다 정확히 같은 화질을 뜻하지 않기 때문입니다. veryfast는 faster보다 작았지만 VMAF도 95.8로 열 가지 가운데 가장 낮았습니다. 그래서 preset은 「같은 화질에서 크기」가 아니라 「이 CPU 예산에서 얼마나 압축할 수 있나」로 고릅니다. 라이브는 인코딩이 실시간보다 늦으면 안 되므로 CPU 여유가 먼저 정하고, PokeClip의 11월 시험 방송도 1080p30 x264 veryfast CBR 6Mbps로 보냈습니다([측정 조건](/posts/projects/pokeclip-srt-latency-late-retransmission/#측정-조건)). 서버 한 대에 몇 채널이 들어가는지는 [라이브 트랜스코딩 서버 글](/posts/tech-blurting/live-transcoding-infrastructure/)에서 실측합니다.

## zerolatency는 B 프레임·lookahead·mbtree를 끕니다

x264는 프레임을 내보내기 전에 몇 장을 미리 모읍니다. B 프레임은 뒤 프레임을 참조하므로 그 뒤 프레임이 들어올 때까지 내보낼 수 없고, lookahead는 비트 배분을 정하려고 앞으로 올 프레임을 미리 분석합니다. 그만큼 출력이 늦어집니다. `-tune zerolatency`는 x264 소스에서 이 대기를 만드는 설정을 끕니다: `rc.i_lookahead = 0`, `i_sync_lookahead = 0`, `i_bframe = 0`, `b_sliced_threads = 1`, `b_vfr_input = 0`, `rc.b_mb_tree = 0`([x264 common/base.c 675–683행](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/common/base.c#L675-683)). mbtree(매크로블록 트리)는 lookahead로 본 미래 프레임이 얼마나 참조하는지에 따라 양자화를 조정하는 기능이라 lookahead가 0이면 함께 꺼집니다.

실제 x264가 출력 파일에 적어 둔 설정으로 차이를 확인했습니다.

| 설정 | bframes | rc_lookahead | mbtree | sliced_threads |
|---|---|---|---|---|
| `-preset medium` | 3 | 40 | 1 | 0 |
| `-preset veryfast` | 3 | 10 | 1 | 0 |
| `-preset veryfast -tune zerolatency` | 0 | 0(항목 없음) | 0 | 1(slices=10) |

lookahead 10프레임은 30fps에서 약 0.33초, 40프레임은 약 1.33초어치 입력입니다(계산값). sliced threads는 프레임 여러 장을 동시에 인코딩하는 대신 한 프레임을 조각(slice)으로 나눠 동시에 처리합니다. 앞의 방식은 동시에 처리하는 여러 프레임을 붙잡아 두므로, 지연을 줄이려면 한 프레임 안에서 나누는 쪽을 씁니다. 대신 조각 경계에서는 예측을 이어 쓰지 못해 압축 효율이 조금 떨어집니다. 치지직은 OBS 32.0.0의 송출 서비스 목록에서 x264 권장 옵션으로 `tune=zerolatency scenecut=0`, B 프레임 0개를 둡니다([OBS services.json 2580–2605행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json#L2580-L2605)).

대가는 압축 효율입니다. B 프레임과 mbtree를 끄면 같은 비트레이트에서 화질이 떨어집니다. 이 글에서는 그 폭을 재지 않았습니다. 몇 백 밀리초의 인코더 지연이 전체 지연에서 차지하는 몫은 HLS처럼 조각 단위로 기다리는 전송에서는 작고, WebRTC처럼 프레임 단위로 보내는 전송에서는 큽니다.

## maxrate와 bufsize가 VBV 상한을 정합니다

`-b:v`는 평균 목표일 뿐 순간 비트를 막지 않습니다. 순간 비트를 묶는 장치는 VBV(Video Buffering Verifier)입니다. 받는 쪽에 크기 `bufsize`의 버퍼가 있고 그 버퍼가 초당 `maxrate`로 채워진다고 가정한 뒤, 프레임을 꺼낼 때 버퍼가 바닥나지 않도록 인코더가 프레임 크기를 줄입니다. FFmpeg는 `-maxrate`와 `-bufsize`를 x264의 `vbv-maxrate`·`vbv-bufsize`로 넘깁니다([libx264.c 1117–1118행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/libx264.c#L1117-L1118)).

이 모형에서 길이 T초 구간에 실릴 수 있는 비트는 `maxrate × T + bufsize`를 넘지 못합니다. 그래서 `bufsize`가 크면 짧은 구간의 순간 비트가 `maxrate`를 크게 넘을 수 있습니다. 같은 영상을 `-maxrate 3000k`로 두고 `-bufsize`만 750k와 6,000k로 바꿔 0.25초마다 실린 비트를 그렸습니다. 아래쪽 막대가 버퍼 수위입니다.

{{< motion scene="VbvBuffer" id="fig-vbv-buffer" kind="실측" caption="같은 10초 영상을 maxrate 3,000kbps로 두고 bufsize만 750k(위)와 6,000k(아래)로 인코딩해, 0.25초마다 실린 비트를 시간순으로 그립니다. 버퍼가 작으면 막대가 3,000kbps 선 근처에 묶이고(최대 4,316), 크면 2–3초 구간의 큰 움직임에서 5,605kbps까지 올라갑니다. 오른쪽 막대는 버퍼 수위 계산값입니다." >}}

1초 창으로 재면 750k는 최대 3,489kbps, 6,000k는 5,483kbps였습니다. 둘 다 VBV 규칙은 지켰습니다. 버퍼 수위 계산의 최저값이 각각 15.2%, 39.7%로 0 아래로 내려가지 않았습니다. 6,000k 쪽이 규칙을 어긴 것이 아니라, 규칙이 허락하는 폭 자체가 넓습니다. 큰 버퍼는 복잡한 장면에 비트를 더 몰아줘 화질을 지키고, 작은 버퍼는 순간 비트를 평평하게 만들어 망과 플레이어를 편하게 합니다. 어느 쪽이 맞는지는 이 비트를 받는 쪽의 규칙이 정합니다. 그 규칙은 마지막 절에서 다룹니다.

## -minrate만으로는 필러가 들어가지 않습니다

CBR(고정 비트레이트)을 만들려고 `-b:v`·`-maxrate`·`-minrate`를 같은 값으로 주는 설정이 흔합니다. 회색 단색 화면 10초를 3,000k로 맞춰 인코딩하자 결과는 79kbps였습니다. `-minrate`를 빼고 다시 인코딩한 결과와 바이트까지 같았습니다. FFmpeg 9.0.2의 libx264 래퍼에는 `-minrate`(내부 이름 `rc_min_rate`)를 읽는 줄이 하나도 없습니다. 이 옵션은 x264에 전달되지 않습니다.

x264가 실제로 빈 비트를 채우게 하려면 HRD(Hypothetical Reference Decoder) 정보를 CBR로 쓰게 해야 합니다. `-x264-params nal-hrd=cbr`(또는 개인 옵션 `-nal-hrd cbr`)을 더하자 같은 화면이 3,115kbps가 됐고, 300프레임에 필러 데이터 NAL(유형 12)이 297개 들어갔습니다. FFmpeg 위키도 CBR 흉내는 이 조합으로 설명하고, 쉬운 영상에서는 비효율적이라고 적습니다([FFmpeg 위키 H.264 CBR](https://trac.ffmpeg.org/wiki/Encode/H.264#CBRConstantBitRate)). 이 옵션은 VBV 버퍼 크기가 있어야 하고, FFmpeg 옵션 설명대로 mp4에는 CBR HRD를 쓸 수 없습니다([libx264.c 1546–1550행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/libx264.c#L1546-L1550)). 이번 시험도 MPEG-TS로 썼습니다.

```bash
ffmpeg -f lavfi -i color=c=gray:size=1280x720:rate=30 -t 10 -c:v libx264 -preset veryfast -b:v 3000k -maxrate 3000k -bufsize 3000k -minrate 3000k -x264-params nal-hrd=cbr -f mpegts cbr.ts
ffmpeg -i cbr.ts -c copy -bsf:v trace_headers -f null - 2>&1 | grep -c "nal_unit_type .* = 12$"
```

필러는 비트를 일정하게 보이게 할 뿐 화질에는 쓰이지 않습니다. 고정 대역 방송 회선처럼 받는 쪽이 정말 일정한 비트를 요구할 때만 씁니다. HLS 변형에 CBR이 필요하다는 규칙은 없습니다. 필요한 것은 아래의 피크 규칙입니다.

## 키프레임은 -g와 -sc_threshold 0이 고정합니다

`-g`는 키프레임 사이 최대 간격(x264 `keyint`)입니다. 최대일 뿐이라, x264는 장면 전환을 감지하면 그 자리에 I 프레임을 더 넣습니다. 1.3초·2.6초에 장면이 바뀌는 30fps 영상 6초로 확인했습니다.

{{< chart id="fig-keyframe-positions" kind="실측" caption="같은 6초 30fps 입력(장면 전환 1.3초·2.6초)에서 옵션별 키프레임 위치. -g 60만 주거나 -keyint_min 60을 더해도 장면 전환마다 키프레임이 생기고 다음 키프레임도 4.6초로 밀립니다. -sc_threshold 0을 주면 0·2·4초에 고정됩니다." source="아래 「측정 조건」" height="240px" >}}
{
  "grid": {"left": 8, "right": 24, "top": 36, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "value", "name": "초", "min": 0, "max": 6, "interval": 1},
  "yAxis": {"type": "category", "inverse": true, "data": ["-g 60", "-g 60 -keyint_min 60", "-g 60 -sc_threshold 0"]},
  "series": [
    {"type": "scatter", "symbol": "rect", "symbolSize": 14, "itemStyle": {"color": "#7a8a9b"},
     "markLine": {"symbol": "none", "silent": true, "lineStyle": {"color": "#b42318", "type": "dashed", "width": 1}, "label": {"formatter": "전환", "position": "start"}, "data": [{"xAxis": 1.3}, {"xAxis": 2.6}]},
     "data": [[0, "-g 60"], [1.3, "-g 60"], [2.6, "-g 60"], [4.6, "-g 60"], [0, "-g 60 -keyint_min 60"], [1.3, "-g 60 -keyint_min 60"], [2.6, "-g 60 -keyint_min 60"], [4.6, "-g 60 -keyint_min 60"]]},
    {"type": "scatter", "symbol": "rect", "symbolSize": 14, "itemStyle": {"color": "#087f8b"},
     "data": [[0, "-g 60 -sc_threshold 0"], [2, "-g 60 -sc_threshold 0"], [4, "-g 60 -sc_threshold 0"]]}
  ]
}
{{< /chart >}}

`-keyint_min 60`이 효과가 없던 이유는 x264가 최소 간격을 `keyint/2 + 1`로 깎기 때문입니다([x264 encoder/encoder.c 1111행](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/encoder/encoder.c#L1111)). 출력 파일의 설정에도 `keyint=60 keyint_min=31`로 남았습니다. 장면 전환 감지를 끄는 `-sc_threshold 0`(x264 `scenecut=0`)만이 위치를 고정했습니다. 치지직의 OBS 권장 옵션에 `scenecut=0`이 들어 있는 이유도 같습니다.

키프레임 위치를 고정하는 이유는 조각입니다. HLS 조각은 IDR 프레임으로 시작해야 하고(애플 저작 규격 7.4), 화질별 변형은 같은 시각에 조각 경계를 가져야 플레이어가 조각 단위로 화질을 바꿀 수 있습니다([HLS 글](/posts/tech-blurting/hls-deep-dive/#abr-adaptive-bitrate-동작-사이클)). 장면 전환 키프레임은 변형마다 다른 자리에 생길 수 있어 경계를 어긋나게 합니다. PokeClip은 OBS 플러그인이 본방 인코더의 키프레임 간격을 2초로 덮어써 조각 길이를 맞췄습니다([OBS 인코더 공유 글](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)).

## Apple은 키프레임 2초와 조각 6초를 따로 권합니다

[애플 HLS 저작 규격](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)은 두 값을 다른 항목으로 둡니다. 1.13은 「키프레임(IDR)을 2초마다 두어야 한다(SHOULD)」, 7.5는 「목표 길이는 6초여야 한다(SHOULD)」입니다. 6초 조각 하나 안에 키프레임이 세 번 들어가는 구성입니다. 조각 경계는 키프레임 위에 있어야 하므로, 조각 길이는 키프레임 간격의 정수배로 잡습니다.

키프레임을 촘촘히 둘수록 플레이어가 아무 조각이나 받아 바로 디코딩을 시작하기 쉽고, 오류가 났을 때 다음 키프레임까지 깨진 화면이 짧아집니다. 대신 키프레임은 P 프레임보다 훨씬 커서 같은 평균 비트레이트에서 나머지 프레임에 쓸 비트가 줄어듭니다. 앞의 VBV 실측(bufsize 750k)에서도 2초마다 오는 키프레임은 24,875–37,801바이트로, 평균 프레임 크기(약 14,300바이트)의 1.7–2.6배였습니다(마지막 검은 화면의 키프레임 627바이트는 제외). 치지직의 OBS 권장값은 키프레임 1초로 애플 권장보다 촘촘합니다. 조각 길이를 짧게 잡아 지연을 줄이는 쪽의 선택으로 읽히지만, 서버 쪽 조각 길이는 공개된 근거가 없어 여기서 단정하지 않습니다.

## BANDWIDTH 피크 125% 규칙으로 bufsize를 정합니다

HLS 다변형 목록의 BANDWIDTH는 평균이 아니라 피크입니다. RFC 8216 4.3.4.2절은 BANDWIDTH를 「변형의 피크 조각 비트레이트」로 정의하고, 피크는 목표 길이의 0.5–1.5배 길이인 연속 조각 묶음 가운데 가장 높은 비트레이트입니다([RFC 8216](https://www.rfc-editor.org/rfc/rfc8216)). 아직 인코딩 중인 라이브라면 같은 설정으로 인코딩한 대표 구간의 값을 쓰라고 합니다(SHOULD). 애플 규격은 두 줄을 더합니다. 1.29: 라이브에서 측정한 피크는 BANDWIDTH의 125%보다 작아야 한다(MUST). 9.14: AVERAGE-BANDWIDTH를 반드시 넣는다(MUST).

FFmpeg hls 먹서는 라이브 동안 다변형 목록을 처음 쓸 때 측정값이 없으므로 스트림 비트레이트(`-b:v`)에 10%를 더한 값을 BANDWIDTH로 씁니다. 끝날 때 목록을 다시 쓰면서 측정한 최대 조각 비트레이트로 바꿉니다([hlsenc.c 1050–1063행, 1485–1494행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c#L1485-L1494)). 앞의 두 설정을 2초 조각 HLS로 실제 시간에 맞춰 내보내며 확인했습니다.

| bufsize | 라이브 중 BANDWIDTH | 끝난 뒤 측정 피크 | 라이브 중 값 대비 |
|---|---|---|---|
| 750k | 3,300,000 | 3,112,528 | 94.3% |
| 6,000k | 3,300,000 | 4,670,672 | 141.5% |

6,000k는 플레이어가 라이브 중에 본 BANDWIDTH의 125%를 넘었습니다. 플레이어는 BANDWIDTH를 보고 대역에 맞는 변형을 고르므로, 실제 피크가 선언보다 훨씬 크면 대역이 빠듯한 시청자의 버퍼가 그 조각에서 비게 됩니다.

거꾸로 계산하면 bufsize의 상한이 나옵니다. 조각 길이를 D초라고 하면 VBV 규칙상 조각 하나의 비트레이트는 `maxrate + bufsize ÷ D`를 넘지 못합니다. 이것이 선언값의 1.25배 이하가 되려면, BANDWIDTH를 maxrate로 선언할 때 `bufsize ≤ 0.25 × maxrate × D`입니다. 2초 조각이면 maxrate의 0.5배, 6초 조각이면 1.5배입니다(계산값, 최악의 경우 상한). 3,000k에 2초 조각이면 1,500k, 이번 750k는 그 안에 들어갑니다. FFmpeg처럼 선언값에 10%를 얹는 경우는 조금 더 여유가 생깁니다. 실제 피크는 영상 내용이 정하므로, 계산한 상한 안에서 대표 구간을 실제로 인코딩해 측정 피크를 확인합니다.

해상도별 여러 변형을 한 명령으로 만들 때는 이 값들을 스트림마다 따로 줘야 합니다. `-b:v`를 거듭 쓰면 마지막 값만 남는 문제는 [FFmpeg 옵션 범위 글](/posts/tech-blurting/ffmpeg-deep-dive/)에서 실측했습니다. Profile·Level과 2-pass, VMAF 해석은 [H.264 글](/posts/tech-blurting/h264-deep-dive/)에서, 오디오 인코딩은 [AAC 글](/posts/tech-blurting/aac-and-friends/)에서 다룹니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 02:25–02:55(KST)에 실행했습니다. preset 비교는 1회, 나머지는 한 번 만든 파일을 풀어 본 확인입니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1. 같은 기계에서 다른 세션의 작업(브라우저, 파일 감시, 다른 인코딩 실험)이 함께 돌았고, 팬 없는 기종이라 지속 부하에서 클럭이 떨어질 수 있습니다. 벽시계 시간은 그래서 쓰지 않고 CPU 시간(user + sys)으로 비교했습니다. CPU 시간도 이 영향에서 완전히 자유롭지는 않습니다.
- 도구: FFmpeg 9.0.2(Homebrew 9.0.2_1), x264 core 165 r3222, libvmaf 3.2.1(모델 vmaf_v0.6.1).
- preset 입력: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p(Blender Foundation, CC BY 3.0) 20초 지점부터 10초를 FFV1로 풀어 둔 파일(1920×1080, 24fps, 240프레임). 원본 자체가 H.264 약 2.1Mbps라 이미 한 번 압축된 영상이고 위아래 검은 띠가 있습니다.
  - `ffmpeg -ss 20 -i sintel_trailer-1080p.mp4 -t 10 -an -c:v ffv1 ref.mkv`
  - `ffmpeg -i ref.mkv -c:v libx264 -preset <preset> -crf 23 enc_<preset>.mp4` (`/usr/bin/time -p`로 CPU 시간)
  - VMAF: `ffmpeg -i enc_<preset>.mp4 -i ref.mkv -lavfi "[0:v]setpts=N/24/TB[d];[1:v]setpts=N/24/TB[r];[d][r]libvmaf=n_threads=8" -f null -` (프레임 번호로 맞춤. mkv의 밀리초 타임스탬프로 맞추면 프레임이 어긋났습니다)
- VBV: 같은 ref.mkv로 `ffmpeg -i ref.mkv -c:v libx264 -preset veryfast -tune zerolatency -threads 4 -b:v 3000k -maxrate 3000k -bufsize <750k|6000k> -g 48 -sc_threshold 0 -f mpegts vbv.ts`, 프레임 크기는 `ffprobe -v error -select_streams v -show_entries packet=pts_time,size,flags -of csv=p=0 vbv.ts`. 버퍼 수위는 초기 90%에서 프레임마다 maxrate/24를 채우고 프레임 크기만큼 빼서 계산했습니다. HLS 확인은 같은 인코딩 옵션에 `-f hls -hls_time 2 -hls_list_size 0 -master_pl_name master.m3u8 v.m3u8`을 붙였고, 두 설정 모두 `-re`로 실제 시간에 맞춰 내보내며 실행 중과 끝난 뒤의 master.m3u8을 읽었습니다.
- 필러: `ffmpeg -f lavfi -i color=c=gray:size=1280x720:rate=30 -t 10 -c:v libx264 -preset veryfast -b:v 3000k -maxrate 3000k -bufsize 3000k -minrate 3000k -f mpegts minrate.ts`와 여기에 `-x264-params nal-hrd=cbr`을 더한 판, 필러 수는 위 본문의 `trace_headers` 명령.
- 키프레임: `ffmpeg -f lavfi -i "testsrc2=size=1280x720:rate=30:d=1.3" -f lavfi -i "mandelbrot=size=1280x720:rate=30,trim=duration=1.3" -f lavfi -i "smptehdbars=size=1280x720:rate=30:d=3.4" -filter_complex "[0:v][1:v][2:v]concat=n=3:v=1[v]" -map "[v]" -c:v ffv1 cuts.mkv` 뒤 `ffmpeg -i cuts.mkv -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 sc0.mp4`(옵션만 바꿔 세 번), 위치는 `ffprobe -v error -select_streams v -show_entries packet=pts_time,flags -of csv=p=0 sc0.mp4`.
- x264 설정 표: `ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -t 1 -c:v libx264 -preset veryfast -tune zerolatency zl.mp4` 뒤 `strings zl.mp4 | grep -o 'options:.*'`.

## 출처

- [FFmpeg 위키, H.264 Video Encoding Guide](https://trac.ffmpeg.org/wiki/Encode/H.264) — CRF 범위, preset, CBR 흉내, VBV
- [x264 r3222 common/base.c](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/common/base.c#L675-683) — zerolatency · [encoder/encoder.c](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/encoder/encoder.c#L1111) — keyint_min 제한
- [FFmpeg n9.0.2 libavcodec/libx264.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/libx264.c) — VBV 전달, nal-hrd · [libavformat/hlsenc.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/hlsenc.c#L1485-L1494) — BANDWIDTH 계산
- [RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — 4.3.4.2 BANDWIDTH, 피크 조각 비트레이트
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 1.13, 1.29, 7.4, 7.5, 9.14
- [OBS Studio 32.0.0 rtmp-services/services.json](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json#L2580-L2605) — 치지직 권장값
- [Blender Foundation, Sintel](https://durian.blender.org/sharing/) — 시험 영상(CC BY 3.0)
- PokeClip 기록: [SRT latency 실험의 측정 조건](/posts/projects/pokeclip-srt-latency-late-retransmission/#측정-조건) · [OBS 인코더 공유와 GOP 2초](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)

다음 편: [FFmpeg dash 먹서는 HLS 목록도 같은 조각으로 씁니다](/posts/tech-blurting/ffmpeg-hls-dash-muxer/)
