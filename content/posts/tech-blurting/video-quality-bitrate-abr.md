---
title: "PSNR·SSIM·VMAF는 같은 손상을 서로 다르게 채점합니다"
date: 2026-06-14T10:40:52+09:00
lastmod: "2026-11-13T17:40:00+09:00"
description: "PSNR은 화소 오차를, SSIM은 국소 구조를, VMAF는 사람 점수를 예측합니다. Sintel 예고편으로 같은 PSNR(40.6 대 40.7dB)에서 흐림은 VMAF 58.8, 블록은 80.7로 갈리고, 인코딩 전 선명화가 VMAF를 92.3에서 97.9로 올리는 동안 NEG 모델은 89.9에서 90.6에 머문 것을 쟀습니다. 평균 93.4 뒤에 숨은 하위 1% 79.4, 화면 크기와 시청 거리를 전제한 모델, 프레임률을 보지 못하는 v0 VMAF, 플레이어가 점수가 아니라 BANDWIDTH로 변형을 고르는 이유와 HLS SCORE 속성, 멈춤까지 넣는 ITU-T P.1203을 정리했습니다."
categories: ["tech-blurting"]
tags: ["VMAF", "PSNR", "SSIM", "화질 평가", "ABR", "HLS"]
draft: false
---

같은 영상을 같은 비트레이트로 인코딩해도 지표마다 순위가 다르게 나옵니다. Sintel 예고편 10초를 x264 1,600kbps로 인코딩하기 전에 원본을 조금 선명하게 다듬자 VMAF는 92.3에서 97.9로 올랐지만 PSNR은 44.8에서 42.8dB로 내려갔고, 선명화 이득을 빼도록 만든 VMAF NEG 모델은 89.9에서 90.6으로 거의 그대로였습니다. 원본을 흐리게 한 영상과 높은 QP로 블록이 생긴 영상은 PSNR이 0.1dB 차이였는데 VMAF는 58.8과 80.7로 갈렸습니다. 지표마다 재는 대상이 다르기 때문이고, 그래서 화질 숫자는 지표 · 모델 · 평균 방식과 함께 읽어야 합니다(아래 「측정 조건」).

## 해상도·프레임률·비트레이트는 화질이 아니라 입력 조건입니다 {#1-해상도와-fps--화질을-수치로-정의하는-첫-단계}

해상도는 화면 한 장의 화소 수, 프레임률은 1초에 보여 주는 화면 수, 비트레이트는 1초에 쓰는 비트 수입니다. 셋 다 인코더에 주는 조건이고, 화질은 그 조건으로 만든 결과를 원본과 견줘 따로 잽니다. 같은 Sintel 10초를 1,600kbps로 맞췄을 때 720p 인코딩(1080p로 키워 비교)은 VMAF 89.8, 1080p 인코딩은 92.3이었고, 1,000kbps 540p는 81.4였습니다. 어느 해상도가 나은지는 비트레이트마다 바뀌고, 그 교차점을 고르는 일이 [ABR 사다리 글](/posts/tech-blurting/abr-ladder-design/#6-convex-hull--사다리에서-쓸데없는-점-제거)에 있습니다.

플랫폼이 송출 조건을 정해 두는 것도 같은 이유입니다. 치지직은 2024년 9월 [공지](https://game.naver.com/lounge/chzzk/board/detail/4810101)에서 1080p · 60fps · 8,000kbps CBR · 키프레임 간격 1초 · GPU 하드웨어 인코더를 권장값으로 안내했고, 소프트웨어 인코더(x264)를 쓰거나 키프레임 간격이 1초를 넘는 방송에서 버퍼링이 났다고 적었습니다. OBS 33.0.0의 방송 서비스 목록도 치지직 항목에 H.264, 1920×1080, 최대 60fps, 최대 영상 비트레이트 8,000kbps, 키프레임 1초, B 프레임 0을 넣어 두었습니다([services.json 2292–2315행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L2292-L2315)).

### 같은 해상도도 화면 크기와 거리에 따라 다르게 보입니다 {#해상도}

1920×1080의 대각선 화소 수는 약 2,203개입니다. 27인치 모니터에 띄우면 인치당 81.6화소, 6인치 휴대폰에 띄우면 367.2화소로 4.5배 촘촘합니다(계산값). 같은 손상도 작은 화면에서는 덜 보입니다.

VMAF는 이 차이를 모델로 나눕니다. [Netflix VMAF 모델 문서](https://github.com/Netflix/vmaf/blob/v3.2.1/resource/doc/models_v0.md)에 따르면 기본 모델 vmaf_v0.6.1은 1080p HDTV를 화면 높이의 세 배(3H) 거리에서 본 평가로 학습했고, 4K 모델은 4K TV를 1.5H에서 본 평가로 학습했습니다. 휴대폰 모델은 같은 영상에 더 높은 점수를 줍니다. 위 540p 1,000kbps 인코딩은 기본 모델로 81.4, 휴대폰 모델로 94.9였고, 1080p 1,600kbps는 92.3과 99.6이었습니다. 2026년 6월에 나온 v1 모델은 휴대폰 조건을 5H 거리로 다시 정의했습니다([models_v1.md](https://github.com/Netflix/vmaf/blob/v3.2.1/resource/doc/models_v1.md)). 점수를 옮겨 적을 때 모델 이름을 빼면 이 차이가 사라집니다.

### 프레임률 차이는 v0 VMAF가 잘 잡지 못합니다 {#fps}

VMAF는 같은 순번의 원본 화면과 왜곡 화면을 짝지어 채점합니다. 프레임률은 점수 계산의 입력이 아닙니다. 합성 시험 화면(testsrc2) 60fps 10초를 같은 6,000kbps로 인코딩해 견줬습니다.

| 비교 | VMAF(v0.6.1) |
|---|---|
| 60fps 인코딩 대 60fps 원본 | 91.9 |
| 30fps 인코딩 대 30fps로 솎은 원본 | 95.3 |
| 30fps 인코딩을 같은 화면 반복으로 60fps로 늘림 대 60fps 원본 | 65.8 |
| 압축 없는 30fps를 같은 방법으로 늘림 대 60fps 원본 | 67.8 |

원본도 30fps로 솎아 비교하면 프레임을 반으로 줄인 쪽이 더 높습니다. 같은 비트를 절반의 화면에 썼기 때문입니다. 반대로 60fps 원본에 맞춰 늘리면 압축이 없어도 67.8로 떨어집니다. 반복한 화면이 원본의 다음 화면과 위치가 어긋나 화소 차이로 채점되기 때문이고, 움직임이 덜 매끄럽게 보이는 정도를 잰 값은 아닙니다. v1 모델의 높은 프레임률(HFR) 변형도 같은 경향이었습니다(반복으로 늘린 경우 58.0). Netflix도 v1 문서에서 HFR 변형이 v0의 높은 프레임률 과소 예측을 줄였지만 프레임률의 지각 효과를 다 담지는 못한다고 적었습니다.

프레임률을 올리는 데 드는 비트도 정해진 배수가 없습니다. YouTube는 SDR 1080p 업로드 권장값을 표준 프레임률 8Mbps, 48–60fps 12Mbps로 1.5배 잡지만([업로드 권장 설정](https://support.google.com/youtube/answer/1722171)), 라이브 H.264 1080p 권장값은 30fps 14Mbps, 60fps 17Mbps로 약 1.2배입니다([라이브 인코더 설정](https://support.google.com/youtube/answer/2853702)).

## PSNR은 화소 오차, SSIM은 구조, VMAF는 사람 점수 예측입니다 {#2-같은-1080p도-비트레이트가-다르면-화질이-다르다}

PSNR(Peak Signal-to-Noise Ratio)은 원본과 결과의 화소 차이를 제곱해 평균한 값(MSE)을 최댓값의 제곱과 견줘 데시벨로 나타냅니다. 8비트 밝기 성분이면 10 × log10(255² ÷ MSE)입니다. 어느 화소가 틀렸는지, 틀린 모양이 눈에 띄는지는 보지 않습니다. SSIM(Structural Similarity)은 작은 창마다 밝기 · 대비 · 구조(화소끼리의 상관)가 원본과 얼마나 같은지를 0–1로 냅니다([Wang 외 2004](https://doi.org/10.1109/TIP.2003.819861)). VMAF(Video Multimethod Assessment Fusion)는 여러 화질 특징과 움직임 정보를 사람이 매긴 점수에 맞춰 학습한 회귀 모델로 합쳐 0–100 점수를 냅니다.

세 지표가 실제로 갈리는지 보려고, 압축 없이 원본만 흐리게 만든 영상(가우시안 블러 σ 2.0)과 x264를 QP 38로 고정해 블록이 생긴 영상을 만들었습니다. 평균 PSNR은 40.6dB와 40.7dB로 거의 같았습니다.

| 같은 PSNR의 두 손상 | PSNR(dB) | SSIM | VMAF | VMAF NEG |
|---|---|---|---|---|
| 흐림(σ 2.0, 압축 없음) | 40.63 | 0.995 | 58.8 | 58.0 |
| 블록(x264 QP 38) | 40.74 | 0.978 | 80.7 | 77.9 |

SSIM은 흐린 쪽을, VMAF는 블록 쪽을 더 좋게 매겼습니다. 아래는 같은 장면(120번째 화면)의 같은 영역을 잘라 붙인 것입니다. 가운데 흐린 영상은 벽돌 경계가 뭉개졌고, 오른쪽 블록 영상은 경계는 남았지만 평평한 면에 얼룩이 생겼습니다.

![Sintel 예고편 같은 장면의 같은 영역을 세 칸으로 잘라 붙인 그림. 왼쪽 원본은 벽돌과 돌 부스러기의 경계가 또렷하고, 가운데 흐린 영상은 경계가 전체적으로 뭉개졌으며, 오른쪽 x264 QP 38 영상은 경계는 남았지만 평평한 바닥과 벽돌 면에 얼룩과 네모난 덩어리가 보인다](/images/video-quality-bitrate-abr-same-psnr.png){#fig-same-psnr kind="실측" caption="왼쪽부터 원본, 가우시안 블러 σ 2.0, x264 QP 38. Sintel 예고편 20초부터 10초 구간의 120번째 화면을 360×360으로 잘랐습니다. 이 화면의 값은 흐림 PSNR 36.78dB · SSIM 0.992 · VMAF 47.8, 블록 PSNR 37.97dB · SSIM 0.963 · VMAF 75.1입니다. Sintel © copyright Blender Foundation | durian.blender.org, CC BY 3.0." source="아래 「측정 조건」"}

PSNR이 같다는 것은 틀린 화소의 제곱 합이 같다는 뜻일 뿐입니다. 사람이 어느 쪽을 덜 거슬려 하는지는 VMAF처럼 사람 평가로 학습한 모델이나 실제 주관 평가로 확인합니다.

### 평균 점수는 어려운 장면의 낮은 화면을 감춥니다 {#cbr-vs-vbr--비트를-어떻게-분배할지}

VMAF는 화면마다 점수를 내고, 보통 보고하는 값은 그 산술 평균입니다. 예고편 전체(52초, 1,253화면)를 라이브처럼 x264 veryfast · `-tune zerolatency` · CBR 2,500kbps(VBV 버퍼 1초)로 인코딩하자 평균은 93.4였습니다. 아래 그래프에서 회색 점선이 평균이고, 꺾은선은 화면마다의 점수입니다.

{{< motion scene="VmafPerFrame" id="fig-vmaf-per-frame" kind="실측" caption="Sintel 예고편 전체를 CBR 2,500kbps로 인코딩한 결과의 화면별 VMAF(vmaf_v0.6.1). 평균은 93.4지만 12.5–12.9초 수염 노인 클로즈업에서 77.1까지 내려가고, 하위 1%는 79.4로 평균보다 14점 낮습니다. 화면 1,253개의 측정값을 그대로 그렸습니다." >}}

조화평균은 93.2로 평균과 거의 같았습니다. 낮은 화면이 전체의 몇 %뿐이라 평균을 끌어내리지 못한 것입니다. 하위 1%는 79.4, 최저는 77.1이었고, 85점 아래 화면이 91개, 80점 아래가 13개였습니다. 가장 낮은 구간은 장면이 바뀐 직후가 아니라 결이 많은 수염 클로즈업이었습니다. 장면 전환 검출(`scdet`)로 찾은 여섯 번의 전환 가운데 네 번(16.5 · 17.5 · 25.9 · 28.0초)은 직후 화면이 96–100점이었고, 나머지 두 번(23.8 · 27.4초)도 84–90점이었습니다. 비트를 1초 버퍼 안에서만 옮길 수 있는 CBR은 어려운 장면에 비트를 더 줄 수 없습니다([x264 VBV 글](/posts/tech-blurting/x264-live-rate-control-gop/#maxrate와-bufsize가-vbv-상한을-정합니다)). 그래서 평균과 함께 하위 1%나 최저를 적어야 그 장면이 보입니다. [H.264 글](/posts/tech-blurting/h264-deep-dive/#8-화질-평가--psnr-vs-ssim-vs-vmaf)의 1-pass 결과에서도 평균 90.94 뒤에 하위 1% 78.86이 있었습니다.

### 인코더 비교는 같은 지표·같은 모델로만 합니다 {#x264-vs-nvenc}

인코더 사이의 화질 주장은 어느 지표로 쟀는지부터 봅니다. NVIDIA가 Turing NVENC를 x264와 견준 발표는 NVIDIA가 고른 설정이었고 T4 글의 지표는 PSNR뿐이었습니다([NVENC 글](/posts/tech-blurting/nvenc-gpu-transcoding/#3-nvenc-세대--turing부터가-진짜)). 위 실험처럼 PSNR과 VMAF는 순위가 바뀔 수 있으므로, 비교표는 같은 원본 · 같은 모델과 판 · 같은 확대 방법 · 같은 프레임 정렬로 낸 값끼리만 읽습니다([H.264 글](/posts/tech-blurting/h264-deep-dive/#8-화질-평가--psnr-vs-ssim-vs-vmaf)).

## 선명하게 다듬으면 VMAF는 오르고 NEG 모델은 오르지 않습니다

VMAF는 선명화 같은 화질 개선 처리의 효과도 점수에 반영하도록 만들어졌습니다. Netflix는 2020년 12월 [기술 블로그](https://netflixtechblog.com/toward-a-better-quality-metric-for-the-video-community-7ed94e752a30)([보관본](https://web.archive.org/web/20261018133222/https://netflixtechblog.com/toward-a-better-quality-metric-for-the-video-community-7ed94e752a30))에서 libaom의 `tune=vmaf`가 압축 전에 화면을 선명하게 해서 이득을 얻는다고 설명했습니다. 그리고 압축 자체의 이득만 재고 싶을 때 쓰도록 개선 이득을 빼는 NEG(No Enhancement Gain) 모델을 내놓았습니다.

같은 Sintel 10초에 `unsharp` 필터로 밝기 성분을 선명하게 만든 뒤 같은 x264 설정(medium, 1,600kbps)으로 인코딩했습니다. 비교 대상은 선명화하지 않은 원본입니다. 파일 크기는 세 경우 모두 2.06–2.08MB였습니다.

{{< chart id="fig-sharpen-vmaf-neg" kind="실측" caption="조건별 평균 VMAF(vmaf_v0.6.1)와 VMAF NEG(vmaf_v0.6.1neg). 선명화 0.8은 VMAF를 5.6점 올렸지만 NEG는 0.7점만 올렸고, 선명화 1.5에서는 NEG가 그대로 인코딩한 결과보다 낮아졌습니다. 흐림과 QP 38은 PSNR이 같은 두 손상입니다. Sintel 예고편 10초, 각 1회." source="아래 「측정 조건」" height="400px" >}}
{
  "grid": {"left": 8, "right": 40, "top": 40, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "left": 0, "data": ["VMAF", "VMAF NEG"]},
  "xAxis": {"type": "category", "data": ["그대로 인코딩", "선명화 0.8", "선명화 1.5", "흐림 σ2.0", "QP 38"]},
  "yAxis": {"type": "value", "name": "점수", "min": 0, "max": 120, "interval": 20, "axisLabel": {"showMaxLabel": false}},
  "series": [
    {"name": "VMAF", "type": "bar", "barGap": "10%", "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "top", "formatter": "{c}"}, "data": [92.3, 97.9, 98.8, 58.8, 80.7]},
    {"name": "VMAF NEG", "type": "bar", "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "top", "formatter": "{c}"}, "data": [89.9, 90.6, 87.8, 58.0, 77.9]}
  ]
}
{{< /chart >}}

선명화의 세기를 0.8에서 1.5로 올리자 VMAF는 98.8로 더 올랐고 NEG는 87.8로 그대로 인코딩한 결과(89.9)보다 낮아졌습니다. PSNR은 44.8 → 42.8 → 40.6dB, SSIM은 0.995 → 0.994 → 0.992로 계속 내려갔습니다. 인코딩한 뒤 디코딩한 화면에 같은 선명화를 걸어도 VMAF는 98.0이 됐습니다. 송출 경로 어디에서든 선명화를 넣으면 기본 VMAF는 그 효과를 화질 개선으로 셉니다. 인코더나 설정을 견줄 때는 NEG 모델로 함께 재고, 선명화가 실제로 나아 보이는지는 화면을 직접 봐서 판단합니다.

## 플레이어는 화질 점수가 아니라 BANDWIDTH로 변형을 고릅니다 {#3-abr--시청자-네트워크에-맞춰-자동으로-화질-바꾸기}

ABR(Adaptive Bitrate) 플레이어는 받는 속도를 재서 다음 조각을 어느 변형에서 받을지 고릅니다. HLS 다변형 목록이 변형마다 반드시 주는 값은 `BANDWIDTH`이고, 그 변형의 조각 비트레이트 최댓값입니다([RFC 8216 4.3.4.2](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.4.2), 애플 규격 9.13). 플레이어가 목록에서 아는 것은 「이 변형을 끊김 없이 받으려면 몇 bps가 필요한가」이고, 그 변형이 얼마나 좋아 보이는지는 목록에 없었습니다.

### 사다리는 화질 곡선에서 고릅니다 {#abr-ladder}

그래서 화질 판단은 목록을 만들 때 끝냅니다. 해상도별로 비트레이트를 바꿔 가며 VMAF를 재고, 같은 비트레이트에서 가장 높은 해상도만 단계로 남깁니다. 같은 Sintel 10초 격자에서 540p와 720p는 약 700kbps, 720p와 1080p는 약 1,200kbps에서 순위가 바뀌었습니다([ABR 사다리 글](/posts/tech-blurting/abr-ladder-design/#6-convex-hull--사다리에서-쓸데없는-점-제거)). 이 판단도 어느 모델로 쟀는지에 따라 달라집니다. 휴대폰 모델은 낮은 해상도에 점수를 더 후하게 주므로(540p 81.4 → 94.9) 교차점이 옮겨 갈 수 있습니다.

### 다변형 목록에는 SCORE 칸이 새로 생겼습니다 {#master-playlist}

RFC 8216 개정 초안 22판은 `EXT-X-STREAM-INF`에 `SCORE` 속성을 두었습니다([4.4.6.2](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 값은 양의 소수이고 「변형의 재생 체감 품질을 나타내는 추상적 · 상대적 척도」입니다. 어떤 지표로 정할지는 목록 작성자가 고르되 모든 변형에 같은 방법을 써야 하고, 점수가 높은 변형은 작성자가 더 바람직하다고 보는 변형이어야 합니다(MUST). 한 변형에 넣으면 모든 변형에 넣으라고 권하고(SHOULD), 모든 변형에 점수가 있으면 클라이언트는 재생 가능 여부를 거른 뒤 점수로 고르라고 권합니다(6.3.1, SHOULD). hls.js 1.7.4는 이 값을 읽지만, 쓰는 곳은 시작할 때 코덱 묶음(예: H.264 변형들 대 HEVC 변형들)을 고르는 `getStartCodecTier`뿐입니다. 같은 묶음 안의 화질 전환은 여전히 대역폭 추정으로 합니다([rendition-helper.ts 183행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/utils/rendition-helper.ts#L183)).

### 고르는 알고리즘은 버퍼 글에 있습니다 {#화질을-바꿀지는-플레이어가-결정한다}

다음 조각의 변형은 플레이어가 정합니다. 받은 속도의 이동 평균으로 고르는 방식, 버퍼 길이만으로 고르는 BOLA([Spiteri 외 2016](https://arxiv.org/abs/1601.06748)), 앞으로 몇 조각의 속도를 예측해 고르는 MPC([Yin 외 2015](https://doi.org/10.1145/2785956.2787486))가 있습니다. hls.js와 dash.js의 실제 동작과 기본값은 [버퍼 글](/posts/tech-blurting/buffering-deep-dive/#4-모바일-환경이-버퍼링의-진짜-무대다)에서 측정과 함께 다룹니다.

### 전환이 끊기지 않는 조건은 키프레임 정렬입니다 {#화질-전환-시-왜-안-끊기나}

변형을 조각 경계에서 바꿔도 화면이 이어지려면, 새 변형의 조각이 혼자 디코딩되고 이전 변형과 같은 시각에서 시작해야 합니다. RFC 8216은 같은 내용의 변형이 같은 타임스탬프를 쓰도록 요구하고([6.2.4](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.4)), [애플 저작 규격](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)은 영상 조각이 IDR로 시작해야 한다(7.4, MUST)고 정합니다. 그래서 인코더는 모든 변형에서 같은 프레임에 IDR을 두도록 키프레임 간격을 고정합니다. 옵션은 [x264 글](/posts/tech-blurting/x264-live-rate-control-gop/#키프레임은--g와--sc_threshold-0이-고정합니다)에 있습니다.

## 시청 품질은 화질 점수에 멈춤을 더해 봅니다 {#4-오디오도-비트레이트가-있고-멀티-트랙도-있다}

VMAF는 재생된 화면의 화질만 봅니다. 시청자가 겪는 것은 그 화면이 늦게 시작하거나 중간에 멈추는 일까지 포함합니다. ITU-T [P.1203](https://www.itu.int/rec/T-REC-P.1203)(2017년 10월판)은 신뢰 전송(TCP) 위의 프로그레시브 다운로드와 적응형 스트리밍의 체감 품질을 추정하는 모형입니다. 영상과 오디오의 화질을 1초 단위로 추정하고, 거기에 첫 재생까지 걸린 시간과 재생 중 멈춤을 더해 30초–5분 시청의 종합 점수(5점 척도)를 냅니다. 멈춤은 클라이언트의 재버퍼링 때문에 생긴다고 정의합니다. 화질 점수가 높은 변형이라도 그 비트레이트를 받지 못해 멈추면 종합 점수는 내려갑니다. 그래서 ABR은 화질과 멈춤 위험을 함께 맞바꾸고, 멈춤을 재는 방법은 [버퍼 글](/posts/tech-blurting/buffering-deep-dive/#5-플랫폼은-버퍼링을-어떻게-측정하고-줄이나)에 있습니다. 오디오 품질은 영상 지표와 따로 평가합니다. 코덱별 내용은 [AAC 글](/posts/tech-blurting/aac-and-friends/)과 [Opus 글](/posts/tech-blurting/opus-deep-dive/), 여러 오디오 트랙을 조각으로 내보내는 방법은 [CMAF 글](/posts/tech-blurting/cmaf-deep-dive/)에 있습니다.

## 화질 수치는 모델·해상도·평균 방식을 함께 적어야 읽힙니다 {#정리하면}

- PSNR과 SSIM과 VMAF는 같은 손상에 다른 순위를 줍니다. 같은 PSNR에서 흐림은 VMAF 58.8, 블록은 80.7이었습니다.
- 기본 VMAF는 선명화를 화질 개선으로 셉니다. 인코더를 견줄 때는 NEG 모델 값을 함께 봅니다.
- 점수에는 모델(기본 · 휴대폰 · 4K, v0 · v1)과 비교 해상도를 붙입니다. 같은 540p 인코딩이 모델에 따라 81.4와 94.9였습니다.
- 평균과 함께 하위 1%나 최저를 적습니다. 평균 93.4 뒤에 79.4가 있었습니다.
- 프레임률 차이는 v0 VMAF 점수로 판단하지 않습니다. 비교 방식에 따라 30fps가 더 높게도, 크게 낮게도 나옵니다.
- 플레이어는 점수가 아니라 `BANDWIDTH`와 받는 속도로 변형을 고르므로, 화질 판단은 사다리를 만들 때 끝내 둡니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 16:30–16:56(KST)에 실행했습니다. 각 조건 1회입니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1. 1분 load average는 측정 중 30–108이었습니다(다른 세션의 작업 포함). 점수와 파일 크기는 부하의 영향을 받지 않습니다.
- 도구: FFmpeg 9.0.2(Homebrew), x264 core 165 r3222, libvmaf 3.2.1(모델 vmaf_v0.6.1 · vmaf_v0.6.1neg · vmaf_v0.6.1 휴대폰 변환, v1은 vmaf_v1.0.16_3d0h · vmaf_v1.0.16_hfr_3d0h).
- 입력: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p(© copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), `https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4`(sha256 `34bbd52a4b89fdf63c8ace50b268da26653a59508288100cd3c23de276db7931`). 10초 구간은 `ffmpeg -ss 20 -i sintel_trailer-1080p.mp4 -t 10 -an -c:v ffv1 ref10.mkv`(240화면, ABR 사다리 글과 같은 구간), 전체는 `ffmpeg -i sintel_trailer-1080p.mp4 -an -c:v ffv1 full.mkv`(1,253화면, 24fps)입니다. 원본 자체가 이미 한 번 압축된 영상입니다. 프레임률 비교만 `ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=60 -t 10 -c:v ffv1 ref60.mkv`로 만든 합성 화면입니다.
- 지표: `ffmpeg -i <결과> -i <원본> -lavfi "[0:v]<전처리>,scale=1920:1080:flags=bicubic,setpts=N/24/TB[d];[1:v]setpts=N/24/TB[r];[d][r]libvmaf=model='version=vmaf_v0.6.1\:name=vmaf|version=vmaf_v0.6.1neg\:name=neg|version=vmaf_v0.6.1\:name=phone\:enable_transform=true':feature='name=psnr|name=float_ssim':log_fmt=json:log_path=out.json:n_threads=8" -f null -`. 두 입력을 프레임 번호로 맞췄고(60fps 비교는 `N/60`, 30fps끼리는 `N/30`), PSNR은 밝기 성분입니다. 조화평균은 libvmaf 방식(n ÷ Σ 1/(x+1) − 1), 하위 1%는 화면 점수를 정렬한 뒤 n × 1%번째 값입니다.
- 선명화: `ffmpeg -i ref10.mkv -vf unsharp=5:5:<0.8|1.5>:5:5:0 -c:v libx264 -preset medium -threads 4 -b:v 1600k -maxrate 1600k -bufsize 3200k out.mp4`, 비교 원본은 선명화하지 않은 `ref10.mkv`입니다. 디코딩 뒤 선명화는 지표 명령의 전처리에 `unsharp=5:5:0.8:5:5:0`을 넣었습니다.
- 같은 PSNR: 흐림은 지표 명령의 전처리에 `gblur=sigma=<1.0|1.4|1.8|2.0|2.4>`(압축 없음), 블록은 `ffmpeg -i ref10.mkv -c:v libx264 -preset medium -threads 4 -qp <38|42|46> out.mp4`입니다. 그림은 120번째 화면을 `crop=360:360:1060:300`으로 잘라 이어 붙였습니다.
- 화면별 점수: `ffmpeg -i full.mkv -c:v libx264 -preset veryfast -tune zerolatency -threads 4 -b:v 2500k -maxrate 2500k -bufsize 2500k -g 48 -keyint_min 48 -sc_threshold 0 cbr.mp4`. 장면 전환은 `ffmpeg -i full.mkv -vf "scdet=threshold=8" -f null -`로 찾았습니다.
- 해상도 · 모델: `-vf scale=<960:540|1280:720|1920:1080>:flags=bicubic`, 비트레이트 1,000 · 1,600 · 1,600kbps(maxrate 같음, bufsize 두 배).
- 프레임률: `-b:v 6000k -maxrate 6000k -bufsize 12000k`로 60fps와 `-vf fps=30` 30fps를 인코딩했고, 30fps 원본은 `-vf fps=30`으로 솎았으며, 60fps로 늘릴 때는 전처리 `fps=60`(같은 화면 반복)을 썼습니다. 시험 화면은 4.1초 무렵 한 화면이 모든 조건에서 30 안팎으로 낮게 나와 평균에 함께 들어 있습니다.

## 출처

- Netflix VMAF v3.2.1: [models_v0.md](https://github.com/Netflix/vmaf/blob/v3.2.1/resource/doc/models_v0.md) · [models_v1.md](https://github.com/Netflix/vmaf/blob/v3.2.1/resource/doc/models_v1.md)
- Netflix Technology Blog, [Toward a Better Quality Metric for the Video Community](https://netflixtechblog.com/toward-a-better-quality-metric-for-the-video-community-7ed94e752a30) (2020-12-07) · [보관본](https://web.archive.org/web/20261018133222/https://netflixtechblog.com/toward-a-better-quality-metric-for-the-video-community-7ed94e752a30) (원문 주소가 자동 접속을 막아 보관본으로 확인)
- Z. Wang, A. C. Bovik, H. R. Sheikh, E. P. Simoncelli, [Image quality assessment: from error visibility to structural similarity](https://doi.org/10.1109/TIP.2003.819861), IEEE Transactions on Image Processing 13(4), 2004
- [RFC 8216, HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — 4.3.4.2 BANDWIDTH, 6.2.4
- R. Pantos, [HTTP Live Streaming 2nd Edition, draft-pantos-hls-rfc8216bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) (2026-05-01) — 4.4.6.2 SCORE, 6.3.1
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) — 7.4, 9.13
- [hls.js v1.7.4 rendition-helper.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/utils/rendition-helper.ts#L183)
- [ITU-T P.1203 (10/2017)](https://www.itu.int/rec/T-REC-P.1203), Parametric bitstream-based quality assessment of progressive download and adaptive audiovisual streaming services over reliable transport
- K. Spiteri, R. Urgaonkar, R. K. Sitaraman, [BOLA: Near-Optimal Bitrate Adaptation for Online Videos](https://arxiv.org/abs/1601.06748) · X. Yin, A. Jindal, V. Sekar, B. Sinopoli, [A Control-Theoretic Approach for Dynamic Adaptive Video Streaming over HTTP](https://doi.org/10.1145/2785956.2787486), SIGCOMM 2015 · [ACM 페이지 보관본](https://web.archive.org/web/20250218053425/https://dl.acm.org/doi/10.1145/2785956.2787486) (ACM이 자동 접속을 막음)
- YouTube 고객센터: [Recommended upload encoding settings](https://support.google.com/youtube/answer/1722171) · [Choose live encoder settings, bitrates, and resolutions](https://support.google.com/youtube/answer/2853702) (2026-11-13 확인)
- 치지직, [버퍼링 현상 원인 및 대처 방안, 개선 일정 안내](https://game.naver.com/lounge/chzzk/board/detail/4810101) (2024-09-24) · [OBS Studio 33.0.0 services.json](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L2292-L2315)
- [Sintel](https://durian.blender.org/sharing/) — 시험 영상, © copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

다음 편: [라이브 CDN은 캐시 키와 실드 층으로 원본 요청을 줄입니다](/posts/tech-blurting/cdn-for-live-streaming/)
