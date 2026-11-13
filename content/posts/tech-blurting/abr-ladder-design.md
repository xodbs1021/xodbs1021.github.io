---
title: "ABR 사다리는 해상도별 화질 곡선의 윗선에서 고릅니다"
date: 2026-06-22T01:55:58+09:00
lastmod: "2026-11-13T17:07:29+09:00"
description: "ABR 사다리는 같은 영상을 여러 해상도와 비트레이트로 준비한 목록입니다. 애플 HLS 저작 규격의 H.264 9단계 · HEVC 12단계 예시, bpp의 한계, 4:2:0 때문에 짝수인 해상도, Netflix 2015 per-title과 2018 shot-based 최적화를 원문으로 확인하고, Sintel 예고편 10초를 4개 해상도 × 7개 비트레이트로 인코딩해 VMAF 곡선의 윗선이 540p → 720p → 1080p로 넘어가는 지점을 직접 쟀습니다. 단계 비용은 픽셀률 합으로 계산했습니다."
categories: ["tech-blurting"]
tags: ["ABR", "HLS", "VMAF", "per-title", "FFmpeg", "x264"]
draft: false
---

같은 영상을 여러 화질로 준비할 때 어떤 해상도에 어떤 비트레이트를 붙일지는 표 하나로 정하기 쉽습니다. 애플이 HLS 저작 규격에 예시 표를 두고 있고, 그 표를 그대로 쓰면 720p 3,000kbps, 1080p 6,000kbps가 됩니다. 그런데 그 비트레이트에서 720p가 1080p보다 나은지는 영상마다 다릅니다. Sintel 예고편 10초를 해상도 4개 × 비트레이트 7개로 인코딩해 VMAF를 재 보니, 이 영상에서는 1,600kbps부터 이미 1080p가 720p보다 높았고(92.3 대 89.7), 2,500kbps에서는 3.8점 차이가 났습니다. 해상도별 화질 곡선의 맨 위를 잇는 선, 곧 볼록 껍질 위의 점만 골라 사다리를 만들면 같은 비트레이트에서 더 나은 화질을 냅니다. Netflix가 2015년에 제목마다 사다리를 다시 고른 per-title 인코딩이 이 원리입니다.

## 사다리는 같은 영상을 여러 해상도·비트레이트로 준비한 목록입니다 {#1-abr-ladder가-뭔지-다시-정리}

ABR(Adaptive Bitrate) 재생기는 받는 속도와 버퍼를 보고 조각마다 어느 화질을 받을지 고릅니다([HLS 글](/posts/tech-blurting/hls-deep-dive/#abr-adaptive-bitrate-동작-사이클)). 고를 수 있는 선택지 목록이 사다리(ladder)입니다. 각 단계는 해상도 · 프레임레이트 · 비트레이트 · 코덱의 조합이고, HLS에서는 다변형 목록의 `EXT-X-STREAM-INF` 줄 하나, DASH에서는 Representation 하나가 됩니다.

사다리를 정할 때는 세 가지를 확인합니다. 맨 아래 단계는 가장 느린 시청자에게도 끊기지 않을 만큼 낮아야 합니다. 맨 위 단계는 원본 화질을 충분히 살려야 합니다. 그 사이의 단계들은 같은 비트레이트에서 가장 좋은 화질을 내는 해상도여야 합니다. 앞의 둘은 시청 환경이, 셋째는 영상 내용이 정합니다.

## Apple은 H.264 아홉 단계, HEVC 열두 단계를 예시로 듭니다 {#2-apple-hls-authoring-spec--업계-출발점}

[애플 HLS 저작 규격](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)(개정 2025-06-26) 1.25는 16:9 영상의 「가능한 비트레이트 조합 하나」로 아래 표를 듭니다. 규격 스스로 「여러 가능한 선택이 있다」고 적은 예시입니다. bpp 열은 30fps로 두고 이 글에서 계산한 값입니다.

| 해상도 | H.264 평균 kbps | 프레임레이트 | bpp(30fps 계산) |
|---|---|---|---|
| 416×234 | 145 | ≤30fps | 0.050 |
| 640×360 | 365 | ≤30fps | 0.053 |
| 768×432 | 730 | ≤30fps | 0.073 |
| 768×432 | 1,100 | ≤30fps | 0.111 |
| 960×540 | 2,000 | 원본과 같음 | 0.129 |
| 1280×720 | 3,000 | 원본과 같음 | 0.109 |
| 1280×720 | 4,500 | 원본과 같음 | 0.163 |
| 1920×1080 | 6,000 | 원본과 같음 | 0.096 |
| 1920×1080 | 7,800 | 원본과 같음 | 0.125 |

같은 항목의 HEVC 표는 640×360 145kbps부터 3840×2160 16,800kbps까지 열두 단계이고, HDR 열을 따로 둡니다(예: 1080p 4,500 · 5,800kbps, HDR 5,400 · 7,000kbps). 1.32는 기본 영상 변형을 평균 2,000kbps 변형으로 두라고 권합니다(SHOULD). 여기서 기본은 호환되는 오디오를 가진 변형 묶음 안에서 다변형 목록에 처음 나오는 변형입니다. iOS용 수정 규칙은 이를 Wi-Fi 2,000kbps, 셀룰러 730kbps로 따로 둡니다(1.32a · 1.32b).

이 표에는 해상도마다 두 단계가 있는 줄(432p · 720p · 1080p)이 있습니다. 해상도를 바꾸지 않고 비트레이트만 올리는 단계입니다. 그 비트레이트에서 한 단계 높은 해상도가 더 낫다면 이 단계는 낭비입니다. 그 판단은 영상을 실제로 인코딩해 봐야 할 수 있습니다.

## bpp는 단계 사이 비교 지표일 뿐 같은 화질을 보장하지 않습니다 {#3-bits-per-pixel--비트레이트-결정의-정량-공식}

bpp(bits per pixel)는 `비트레이트 ÷ (가로 × 세로 × 초당 프레임 수)`로, 픽셀 하나에 평균 몇 비트가 돌아가는지를 뜻합니다. 해상도와 프레임레이트가 다른 단계를 한 숫자로 견줄 수 있어 편합니다. 하지만 bpp가 같다고 화질이 같지는 않습니다. 애플의 예시 표부터 0.050에서 0.163까지 세 배 넘게 벌어집니다.

이 글의 실측도 같습니다. 24fps 영상에서 360p 600kbps는 bpp 0.109로 VMAF 68.5였고, 720p 2,500kbps는 bpp 0.113으로 VMAF 93.0이었습니다. bpp는 거의 같은데 화질은 25점 가까이 다릅니다. 해상도가 낮은 판은 재생할 때 확대해야 하므로 잃은 세부가 돌아오지 않고, 해상도가 높을수록 이웃 픽셀이 비슷해 픽셀당 비트가 적어도 잘 압축됩니다. bpp는 「이 단계가 이웃 단계보다 비트를 얼마나 더 받나」를 보는 데 쓰고, 화질 목표는 실제 인코딩의 화질 지표로 확인합니다.

## 해상도는 4:2:0 때문에 짝수여야 합니다 {#5-169-가로세로비--짝수-픽셀-강제}

배포용 H.264는 대부분 4:2:0 색 표본을 씁니다. 밝기는 모든 픽셀에, 색차는 가로 2 × 세로 2 픽셀마다 하나씩 둡니다. 그래서 가로 · 세로가 홀수면 마지막 열이나 줄의 색차를 나눌 수 없습니다. 16:9로 480줄을 만들면 가로가 853.33이라 반올림한 853을 libx264에 주면 `width not divisible by 2 (853x480)`로 인코더가 열리지 않았습니다. FFmpeg `scale` 필터에 `-2`를 주면 가로세로비를 지키며 짝수로 맞춰 854×480이 됩니다.

```bash
ffmpeg -i input.mp4 -vf scale=-2:480 -c:v libx264 out480.mp4
```

16의 배수까지는 필요 없습니다. H.264는 16×16 매크로블록 단위로 부호화하고 남는 부분은 잘라 내도록 SPS(시퀀스 매개변수 묶음)에 적습니다. 이 글의 1080p 인코딩을 풀어 보니 1920×1088(매크로블록 120 × 68개)로 부호화하고 아래 8줄을 잘라 내는 값(`frame_crop_bottom_offset` 4, 4:2:0이라 2배)이 들어 있었습니다.

## 해상도별 곡선의 윗선(볼록 껍질)에 있는 점만 남깁니다 {#6-convex-hull--사다리에서-쓸데없는-점-제거}

같은 영상을 해상도마다 여러 비트레이트로 인코딩하면 해상도별로 「비트레이트 대 화질」 곡선이 하나씩 생깁니다. 낮은 비트레이트에서는 낮은 해상도가 낫습니다. 높은 해상도는 적은 비트를 많은 픽셀에 나눠야 해서 블록 · 번짐 같은 압축 흔적이 먼저 나타납니다. 비트레이트가 오르면 높은 해상도의 곡선이 낮은 해상도를 넘어섭니다. Netflix는 이 곡선들의 바깥 경계를 볼록 껍질(convex hull)이라고 부르고, 껍질 위의 점은 같은 비트레이트에서 더 좋은 화질을 내는 다른 점이 없는 상태(파레토 효율)라고 설명합니다([Netflix, Per-Title Encode Optimization](https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2)).

Sintel 예고편 10초를 360p · 540p · 720p · 1080p로 줄이고 300kbps부터 6,000kbps까지 7개 비트레이트로 인코딩했습니다. 각 결과를 1080p로 다시 확대해 원본과 VMAF를 쟀습니다. 비트레이트를 왼쪽에서 오른쪽으로 쓸면서, 그 비트레이트에서 가장 높은 곡선을 강조색으로 이어 봤습니다.

{{< motion scene="ConvexHullClimb" id="fig-convex-hull-climb" kind="실측" caption="Sintel 예고편 10초를 4개 해상도 × 7개 비트레이트로 인코딩해 1080p로 확대한 뒤 잰 VMAF. 비트레이트(로그 눈금)를 올려 가며 각 지점에서 가장 높은 곡선을 강조색으로 잇습니다. 윗선의 주인은 540p에서 720p(약 700kbps), 1080p(약 1,200kbps)로 넘어가고 360p는 이 범위에서 한 번도 올라서지 않습니다. 점 사이는 직선으로 이은 것입니다." >}}

격자 점에서 가장 높은 해상도만 모으면 다음과 같습니다.

| 목표 kbps | 360p | 540p | 720p | 1080p | 윗선 |
|---|---|---|---|---|---|
| 300 | 55.0 | **55.9** | 46.6 | 35.0 | 540p |
| 600 | 68.5 | **73.6** | 72.9 | 62.1 | 540p |
| 1,000 | 74.5 | 81.4 | **83.7** | 82.2 | 720p |
| 1,600 | 77.9 | 86.0 | 89.7 | **92.3** | 1080p |
| 2,500 | 79.8 | 88.6 | 93.0 | **96.8** | 1080p |
| 4,000 | 81.0 | 90.2 | 94.9 | **98.6** | 1080p |
| 6,000 | 81.8 | 91.0 | 95.8 | **99.0** | 1080p |

이 영상에 사다리를 붙인다면 1,600kbps 위로는 720p 단계를 둘 이유가 없습니다. 애플 예시의 720p 3,000 · 4,500kbps도 격자의 2,500 · 4,000kbps 점으로 보면 이 영상에서는 윗선 아래에 있습니다. 거꾸로 1,000kbps 근처에서는 720p가, 600kbps 이하에서는 540p가 답이었습니다. 이 결론은 이 영상의 결론입니다. 원본이 이미 H.264 약 2.1Mbps로 압축돼 있어 고해상도 세부가 적고, 위아래 검은 띠가 있어 실제 화면이 작으며, 10초 한 장면 묶음뿐입니다. 거친 필름 결이나 빠른 움직임이 많은 영상이라면 교차점이 오른쪽으로 갑니다. 그래서 사다리는 영상마다 이 곡선을 다시 그려 봐야 정할 수 있습니다. VMAF 점수를 읽을 때 함께 적어야 하는 모델 · 평균 방식은 [화질 지표 글](/posts/tech-blurting/video-quality-bitrate-abr/)에 있습니다.

## Netflix는 고정 사다리를 제목마다 다시 골랐습니다 {#7-per-title-encoding--netflix의-비용-혁명-2015}

Netflix는 2010년 말 H.264 배포를 시작하며 카탈로그 전체에 쓰는 고정 사다리를 정했고, 맨 위 단계는 1080p 5,800kbps였습니다. 2015년 12월 글에서 이 고정 사다리의 문제를 두 방향으로 적습니다. 카메라 잡음이나 필름 결이 많은 장면은 5,800kbps에서도 블록이 보였고, 만화처럼 단순한 영상에는 5,800kbps가 지나치게 많았습니다. 복잡한 제목은 1080p를 5,800kbps보다 높은 「예컨대 7,500kbps」로 인코딩하는 편이 나을 수도 있다고 적었습니다([Netflix, 2015-12-14](https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2), [보관본](https://web.archive.org/web/20250709104450/https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2)).

해법은 제목마다 앞 절의 곡선을 그리는 것이었습니다. 몇 가지 해상도에서 QP(양자화 매개변수)를 한 JND(사람이 겨우 구분하는 차이)씩 띄워 시험 인코딩하고, 비트레이트와 화질을 재 곡선을 보간한 뒤, 볼록 껍질에 가장 가까운 점을 골라 그 제목의 사다리로 씁니다. 글이 든 예는 두 편입니다. 단순한 애니메이션인 BoJack Horseman은 고정 사다리가 1,750kbps를 480p에 썼는데, 그 에피소드의 per-title 사다리는 1,540kbps부터 1080p를 보냈습니다. 평균 복잡도의 Orange Is the New Black은 맨 위 1080p가 4,640kbps로, 고정 사다리의 5,800kbps보다 20% 적었습니다. 이 글의 그림은 대부분 PSNR로 그렸고, VMAF로도 같은 분석을 할 수 있다고 덧붙였습니다.

이 방식은 기기의 디코딩 한계도 함께 봐야 합니다. 글은 720p까지만 디코딩하는 태블릿이 1080p 2,000kbps 단계를 못 써서 그보다 낮은 단계에 묶이는 사례를 들고, 480p · 720p가 상한인 기기용 per-title 사다리를 따로 만든다고 적었습니다. 저장 효율은 그만큼 떨어집니다.

## 장면마다 해상도·QP를 고르면 같은 화질에 비트가 더 줍니다 {#8-shot-based-encoding--netflix-dynamic-optimizer-2018}

per-title은 제목 하나에 사다리 하나입니다. 2018년 3월 Netflix는 단위를 장면(shot)으로 내렸습니다. Dynamic Optimizer는 영상을 장면 전환 지점에서 자르고, 장면마다 여러 해상도 · QP로 인코딩해 VMAF와 비트레이트의 볼록 껍질을 구한 뒤, 장면마다 기울기(비트당 화질 이득)가 거의 같은 점을 골라 이어 붙입니다. 화질은 각 결과를 1920×1080으로 확대해 VMAF로 쟀습니다. 장면 경계에 키프레임을 두면 장면 안에서 예측이 끊기지 않고, 장면이 바뀌는 순간의 화질 변화는 눈에 덜 띈다는 것이 근거입니다. VP9 10개 제목, 256kbps 근처 비교에서 가장 좋은 고정 QP 인코딩보다 HVMAF 기준 평균 17.1%, PSNR 기준 22.5% 비트를 줄였다고 보고했습니다([Netflix, Dynamic Optimizer, 2018-03-05](https://netflixtechblog.com/dynamic-optimizer-a-perceptual-video-encoding-optimization-framework-e19f1e3a277f), [보관본](https://web.archive.org/web/20241231233211/https://netflixtechblog.com/dynamic-optimizer-a-perceptual-video-encoding-optimization-framework-e19f1e3a277f)).

나흘 뒤 글은 이 방식으로 만든 스트림의 배포를 알렸습니다. per-title 인코딩(AVCMain)에 비해 AVCHi-Opt는 같은 화질에 절반이 안 되는 비트를, VP9-Opt는 3분의 1이 안 되는 비트를 썼다고 적었습니다. 1시간짜리 에피소드는 3분 단위로 자르면 20조각이지만, 장면 평균 길이 4초로 자르면 900개 장면이 되어 처리 단위가 크게 늘었다고도 적었습니다([Netflix, Optimized shot-based encodes, 2018-03-09](https://netflixtechblog.com/optimized-shot-based-encodes-now-streaming-4b9464204830), [보관본](https://web.archive.org/web/20241231233216/https://netflixtechblog.com/optimized-shot-based-encodes-now-streaming-4b9464204830)). 이 수치들은 Netflix가 자기 카탈로그로 보고한 결과이고, 이 글에서 재현하지 않았습니다.

## 라이브는 미리 분석할 수 없어 사다리를 먼저 정해 둡니다 {#9-라이브-per-title의-변형--미래-모름}

per-title과 shot-based는 영상 전체가 이미 있어야 합니다. 시험 인코딩을 여러 번 하고 곡선을 그린 뒤에야 사다리를 고르기 때문입니다. 라이브 인코더는 지금 들어온 프레임과 몇십 프레임의 lookahead만 봅니다([x264 글](/posts/tech-blurting/x264-live-rate-control-gop/)). 방송이 시작될 때 사다리가 이미 정해져 있어야 하고, 방송 중에 해상도 · 비트레이트 조합을 바꾸면 다변형 목록과 재생기의 선택이 함께 흔들립니다.

그래서 라이브에서 이 원리를 쓸 수 있는 자리는 방송 전입니다. 같은 채널이나 같은 종류 방송의 녹화본으로 이 글처럼 곡선을 그려 두면, 다음 방송의 고정 사다리를 정하는 근거가 됩니다. 이 방법이 서비스 규모에서 얼마나 효과가 있는지는 이 글에서 재지 않았습니다.

## 단계를 늘리는 비용은 단계 수가 아니라 픽셀률에 비례합니다 {#15-사다리-단계-수의-비용-영향}

사다리 단계 하나를 더하면 인코더가 하나 더 돌고, 저장 · 전송할 조각이 한 벌 더 생깁니다. 인코딩 계산량은 단계 수보다 단계마다 처리할 픽셀 수에 더 가깝게 늘어납니다. 애플 예시 표의 아홉 단계를 30fps로 두고 단계별 초당 픽셀 수를 계산했습니다.

{{< chart id="fig-ladder-pixel-rate" kind="재구성" caption="애플 HLS 저작 규격 1.25 H.264 예시 사다리의 단계별 초당 픽셀 수(백만, 30fps로 계산). 아홉 단계 합은 225.0백만 픽셀/초로 1080p30 하나의 3.62배이고, 그 가운데 1080p 두 단계가 55.3%, 아래 네 단계(234p · 360p · 432p 둘)는 13.2%입니다. 계산값이며 실제 인코딩 시간은 preset · 코덱 · 디코딩과 확대 공유 여부에 따라 다릅니다." source="https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html (1.25), 가로 × 세로 × 30으로 계산" height="380px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 16, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "value", "name": "백만 픽셀/초", "min": 0, "max": 70, "interval": 10},
  "yAxis": {"type": "category", "inverse": true, "data": ["234p 145", "360p 365", "432p 730", "432p 1100", "540p 2000", "720p 3000", "720p 4500", "1080p 6000", "1080p 7800"]},
  "series": [
    {"type": "bar", "barWidth": 16, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [2.92, 6.91, 9.95, 9.95, 15.55, 27.65, 27.65, {"value": 62.21, "itemStyle": {"color": "#087f8b"}}, {"value": 62.21, "itemStyle": {"color": "#087f8b"}}]}
  ]
}
{{< /chart >}}

아래 단계를 하나 더 두는 일은 계산량에 거의 영향이 없고, 위 단계를 하나 더 두는 일이 비쌉니다. 같은 해상도에 비트레이트만 다른 두 단계(1080p 6,000 · 7,800)는 픽셀률도 같아 계산량이 거의 두 배가 됩니다. 앞의 실측처럼 그 사이에서 한 해상도만 윗선에 있다면, 위 단계 둘 가운데 하나를 지우는 편이 아래 단계를 지우는 것보다 계산을 훨씬 많이 아낍니다. 실제 인코딩은 디코딩과 확대를 단계끼리 나눠 쓰는지(한 프로세스에서 `split`)에 따라서도 달라집니다. 서버 한 대에 들어가는 채널 수는 [라이브 트랜스코딩 서버 글](/posts/tech-blurting/live-transcoding-infrastructure/)에서 실측합니다.

## FFmpeg 한 명령으로 사다리를 만들 때는 스트림 지정자가 필요합니다 {#12-ffmpeg-한-명령으로-abr-ladder--통합-패턴}

한 프로세스가 입력을 한 번 디코딩해 `split`으로 나누고 해상도마다 인코딩하면, 디코딩을 단계 수만큼 반복하지 않습니다. 이때 단계마다 다른 비트레이트는 `-b:v:0`, `-b:v:1`처럼 출력 스트림 번호를 붙여 줍니다. 번호 없이 `-b:v`를 여러 번 쓰면 마지막 값 하나가 모든 스트림에 걸립니다([FFmpeg 옵션 범위 글](/posts/tech-blurting/ffmpeg-deep-dive/)). `-maxrate`와 `-bufsize`도 같습니다.

```bash
ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 12 -filter_complex "[0:v]split=3[v0][v1][v2];[v1]scale=1280:720[v1o];[v2]scale=960:540[v2o]" -map "[v0]" -map "[v1o]" -map "[v2o]" -c:v libx264 -preset veryfast -g 60 -sc_threshold 0 -b:v:0 6000k -maxrate:v:0 6000k -bufsize:v:0 6000k -b:v:1 3000k -maxrate:v:1 3000k -bufsize:v:1 3000k -b:v:2 2000k -maxrate:v:2 2000k -bufsize:v:2 2000k -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename "v%v_%03d.ts" -var_stream_map "v:0 v:1 v:2" -master_pl_name master.m3u8 "v%v.m3u8"
```

FFmpeg 9.0.2로 실행하자 x264가 출력 파일에 적은 설정이 스트림마다 `bitrate=6000 vbv_maxrate=6000`, `3000`, `2000`으로 갈렸고, 세 변형의 키프레임이 모두 같은 시각에 2초 간격으로 놓였습니다. `-g 60 -sc_threshold 0`을 모든 스트림에 같게 준 결과입니다(장면 전환 키프레임이 왜 문제인지는 [x264 글](/posts/tech-blurting/x264-live-rate-control-gop/)). `-hls_time 6`과 키프레임 2초는 애플이 권하는 조각 6초 · 키프레임 2초 조합입니다. HLS · DASH 출력을 함께 만드는 방법은 [FFmpeg 먹서 글](/posts/tech-blurting/ffmpeg-hls-dash-muxer/)에서 다룹니다.

### 조각 경계와 BANDWIDTH 규칙은 HLS 규격이 정합니다 {#gop-정렬이-abr-부드러운-전환의-비밀}

변형을 바꿔 타려면 조각이 IDR 프레임으로 시작하고(애플 7.4, MUST), 모든 변형의 조각 경계가 같은 시각에 있어야 합니다(애플 8.22, 일반 규칙은 SHOULD, AirPlay 2 지원 TV는 MUST). 다변형 목록의 BANDWIDTH는 평균이 아니라 피크 조각 비트레이트이고(RFC 8216 4.3.4.2, 애플 9.13), AVERAGE-BANDWIDTH는 따로 넣어야 합니다(애플 9.14). 라이브에서 측정 피크는 BANDWIDTH의 125%를 넘으면 안 됩니다(애플 1.29). 고정 비트레이트(CBR)는 요구하지 않습니다. 이 피크 규칙으로 `-bufsize`를 정하는 계산과 실측은 [x264 글의 마지막 절](/posts/tech-blurting/x264-live-rate-control-gop/)에, 재생기 쪽 동작은 [HLS 글](/posts/tech-blurting/hls-deep-dive/#abr-adaptive-bitrate-동작-사이클)에 있습니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 새벽에 실행했고, 결과 표 파일은 02:57:56(KST)에 기록됐습니다. 격자의 각 점은 1회 인코딩 · 1회 측정입니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1. 같은 기계에서 다른 세션의 작업이 함께 돌았지만 VMAF와 파일 크기는 그 영향을 받지 않습니다.
- 도구: FFmpeg 9.0.2(Homebrew), x264 core 165 r3222, libvmaf 3.2.1(모델 vmaf_v0.6.1).
- 입력: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p(© copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)) 20초 지점부터 10초를 FFV1로 풀어 둔 파일(1920×1080, 24fps, 240프레임). 원본이 H.264 약 2.1Mbps로 이미 압축된 영상이고 위아래 검은 띠가 있습니다.
  - `ffmpeg -ss 20 -i sintel_trailer-1080p.mp4 -t 10 -an -c:v ffv1 ref.mkv`
- 인코딩: `ffmpeg -i ref.mkv -vf scale=<W>:<H>:flags=bicubic -c:v libx264 -preset medium -threads 4 -b:v <B>k -maxrate <B>k -bufsize <2B>k out.mp4` — W:H는 640:360 · 960:540 · 1280:720 · 1920:1080, B는 300 · 600 · 1000 · 1600 · 2500 · 4000 · 6000.
- VMAF: `ffmpeg -i out.mp4 -i ref.mkv -lavfi "[0:v]scale=1920:1080:flags=bicubic,setpts=N/24/TB[d];[1:v]setpts=N/24/TB[r];[d][r]libvmaf=n_threads=4" -f null -`. 프레임 번호로 맞췄습니다(mkv의 밀리초 타임스탬프로 맞추면 프레임이 어긋났습니다). 표의 목표 kbps와 실제 평균은 5% 이내로 달랐고, 영상의 가로 위치는 실제 평균을 썼습니다. 교차점(약 700 · 1,200kbps)은 격자 두 점 사이를 비트레이트 기준 직선으로 보간한 값입니다.
- 짝수 해상도와 SPS 크롭: `ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -t 1 -vf scale=853:480 -c:v libx264 odd.mp4`(오류), `ffmpeg -i out1080.mp4 -c copy -bsf:v trace_headers -frames:v 1 -f null -`.

## 출처

- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 1.25 예시 사다리, 1.29, 1.32, 7.4, 8.22, 9.13, 9.14
- [RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — 4.3.4.2 BANDWIDTH · AVERAGE-BANDWIDTH
- Netflix Technology Blog: [Per-Title Encode Optimization](https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2) (2015-12-14, Aaron 외) · [보관본](https://web.archive.org/web/20250709104450/https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2) · [Dynamic Optimizer](https://netflixtechblog.com/dynamic-optimizer-a-perceptual-video-encoding-optimization-framework-e19f1e3a277f) (2018-03-05, Katsavounidis) · [Optimized shot-based encodes: Now Streaming!](https://netflixtechblog.com/optimized-shot-based-encodes-now-streaming-4b9464204830) (2018-03-09, Manohara 외). 원문 주소가 자동 접속을 막아 web.archive.org 보관본(per-title은 2025-07-09 사본)으로 내용을 확인했습니다.
- [Netflix, VMAF](https://github.com/Netflix/vmaf) — 화질 지표 구현(libvmaf)
- [FFmpeg 필터 문서, scale](https://ffmpeg.org/ffmpeg-filters.html#scale-1) · [FFmpeg 형식 문서, hls](https://ffmpeg.org/ffmpeg-formats.html#hls-2)
- [Sintel](https://durian.blender.org/sharing/) — 시험 영상, © copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

다음 편: [NVENC는 CUDA 코어와 따로 도는 전용 인코딩 엔진입니다](/posts/tech-blurting/nvenc-gpu-transcoding/)
