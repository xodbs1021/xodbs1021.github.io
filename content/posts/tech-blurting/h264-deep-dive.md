---
title: "H.264는 이미 디코딩한 화면으로 다음 블록을 예측합니다"
date: 2026-06-20T10:38:55+09:00
lastmod: "2026-11-13T07:55:32+09:00"
description: "1080p60 원본 373.248MB/s를 6Mbps로 줄이는 차이는 예측과 양자화에서 나옵니다. H.264의 I · P · B 슬라이스와 디코딩 순서, 매크로블록 8,160개, 정수 변환과 QP, CABAC, 프로파일 · 레벨 표(1080p60은 레벨 4.2)와 avc1 코덱 문자열, NAL 단위와 SPS · PPS, TS와 MP4의 NAL 구분 방식을 규격 · 소스로 확인하고, FFmpeg 9.0.2 · x264로 레벨 자동 선언과 NAL 순서, 1-pass와 2-pass의 VMAF 평균 · 하위 1% · 2초 최대 비트레이트를 직접 쟀습니다."
categories: ["tech-blurting"]
tags: ["H.264", "AVC", "x264", "VMAF", "코덱", "FFmpeg"]
draft: false
---

1080p 60fps 영상을 RGB 8비트 세 채널, 패딩 없이 그대로 보내면 1920 × 1080 × 3 × 60 = 373,248,000바이트, 곧 초당 373.248MB입니다(10진 단위, 1시간이면 약 1.344TB). 라이브 송출에 흔한 6Mbps는 초당 0.75MB이므로 두 데이터율의 비는 497.664배입니다. 원본을 8비트 YUV 4:2:0으로 잡아도 186.624MB/s라 약 249배를 줄여야 합니다. 이 차이는 두 단계에서 나옵니다. 인코더는 이미 디코딩한 화면에서 비슷한 블록을 찾아 차이만 남기고(예측), 그 차이에서 눈에 덜 띄는 부분을 버립니다(양자화). 실제로 Sintel 예고편 10초(1080p 24fps)를 x264 medium · CRF 28로 인코딩하자 평균 1,799kbps에 VMAF 93.4가 나왔습니다. 같은 영상의 4:2:0 원본 데이터율(약 597Mbps)의 약 332분의 1입니다(아래 「측정 조건」).

## H.264는 ITU-T와 ISO/IEC가 2003년에 함께 낸 규격입니다 {#1-h264의-정체--두-표준-단체가-공동으로-만든-결과}

H.264는 ITU-T 권고 H.264이자 ISO/IEC 14496-10 AVC(Advanced Video Coding)입니다. 두 단체가 만든 공동 팀(JVT)이 같은 본문을 두 이름으로 냈습니다. [ITU-T 권고 목록](https://www.itu.int/rec/T-REC-H.264)에서 첫 판은 2003년 5월(05/2003)이고, 지금 효력이 있는 판은 2026년 6월(06/2026)에 나온 열여섯 번째 판입니다. 특허 라이선스는 지금도 [Via LA의 AVC/H.264 프로그램](https://www.via-la.com/licensing-programs/avc-h-264/)이 운영합니다.

## P·B 슬라이스는 이미 디코딩한 화면에서 블록을 가져옵니다 {#3-ipb-프레임--h264의-압축-핵심}

H.264는 화면을 슬라이스로 나누고 슬라이스마다 종류를 둡니다. I 슬라이스는 같은 화면 안의 이웃 블록만으로 예측하고, P 슬라이스는 참조 목록 하나(list 0)에서 블록마다 화면 하나를, B 슬라이스는 참조 목록 둘에서 블록을 가져올 수 있습니다. 「I 프레임」 · 「P 프레임」은 화면의 슬라이스가 모두 그 종류일 때 부르는 이름입니다.

B는 표시 순서로 뒤에 오는 화면도 참조할 수 있습니다. 그래서 그 뒤 화면이 먼저 디코딩돼 있어야 합니다. 아래 영상에서 위 줄이 표시 순서, 아래 줄이 디코딩 순서입니다. P가 I만 참조해 먼저 나오고, 그다음에야 I와 P를 함께 참조하는 B 두 장이 나옵니다.

{{< motion scene="DecodeOrder" id="fig-decode-order" kind="개념도" caption="표시 순서 I B B P를 디코딩할 때는 P가 I를 참조해 먼저 디코딩되고, 그 뒤에 I와 P를 함께 참조하는 B 두 장이 디코딩됩니다. 화살표는 참조 방향입니다." >}}

x264로 B 프레임 3장을 허용해 9프레임을 인코딩하자 출력 파일의 패킷도 이 순서였습니다. I 다음 패킷은 표시 순서로 다섯 번째 화면인 P였고, 그 뒤에 B 세 장이 표시 순서대로 왔습니다. 인코더는 뒤의 P가 들어와야 앞의 B를 부호화할 수 있으므로 연속 B 프레임 수만큼 입력을 붙잡아 둡니다. 디코더 쪽은 순서를 바꾸려고 한 화면을 더 기다리고, 그래서 디코딩 시각(dts)이 표시 시각(pts)보다 한 화면 앞서도록 첫 dts가 음수(−512, 1/12,288초 단위)로 적혀 있었습니다. 라이브용 `-tune zerolatency`가 B 프레임을 끄는 이유입니다([x264 글](/posts/tech-blurting/x264-live-rate-control-gop/#zerolatency는-b-프레임lookaheadmbtree를-끕니다)).

인코더가 참조로 쓰는 화면도 원본이 아니라 자기가 디코딩해 본 화면입니다. 디코더는 원본을 모르므로, 원본으로 예측하면 둘의 참조가 달라져 오차가 쌓입니다.

### 모션 벡터는 가져올 블록의 위치를 가리킵니다 {#motion-vector--pb-프레임의-작동-원리}

P 블록은 「참조 화면의 어느 자리에서 블록을 가져와라」를 모션 벡터로 적고, 가져온 블록과 실제 블록의 차이(잔차)만 따로 보냅니다. 모션 벡터는 휘도 기준 1/4 화소 단위라 화소 사이 위치를 가리킬 수도 있고, 그 자리 값은 보간 필터로 만듭니다([FFmpeg h264qpel.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264qpel.c)). 블록은 16×16부터 4×4까지 나눠 따로 옮길 수 있습니다. 움직임 · 질감 · 잡음이 많은 장면은 잔차가 커져 비트가 더 듭니다.

### IDR만 앞 화면과의 참조를 끊습니다 {#gop-크기의-트레이드오프}

I 슬라이스로만 된 화면이 나와도, 그 뒤 화면이 I보다 앞선 화면을 참조하는 것은 막혀 있지 않습니다. 참조를 확실히 끊는 화면은 IDR(Instantaneous Decoding Refresh)입니다. IDR이 오면 디코더는 참조 버퍼를 비우고, 뒤 화면은 IDR 이전 화면을 참조하지 않습니다. 중간에 들어온 시청자나 HLS 조각 하나만 받은 플레이어가 디코딩을 시작하는 자리입니다. 비트스트림에서는 NAL 종류 번호로 갈립니다. IDR 슬라이스는 5, 나머지 슬라이스는 I여도 1입니다.

IDR 간격(GOP 길이)이 짧으면 진입점이 늘지만 나머지 화면에 쓸 비트가 줄어듭니다. 60fps에서 2초 간격은 120프레임입니다. 간격을 고정하는 옵션과 애플의 2초 권장은 [x264 글](/posts/tech-blurting/x264-live-rate-control-gop/#키프레임은--g와--sc_threshold-0이-고정합니다)에, PokeClip 시험 방송이 키프레임을 2초로 맞춘 방식은 [OBS 인코더 공유 글](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)에 있습니다.

## 예측하고 남은 차이를 변환하고 양자화에서 버립니다 {#4-h264-인코딩-5단계-파이프라인}

영상의 중복은 세 갈래입니다. 한 화면 안 이웃 화소끼리 비슷한 공간 중복은 화면 내 예측과 변환이, 이어지는 화면끼리 비슷한 시간 중복은 화면 간 예측과 모션 벡터가, 자주 나오는 값의 통계 중복은 엔트로피 부호화가 줄입니다. 인코더 한 바퀴는 블록 나누기, 예측, 변환, 양자화, 엔트로피 부호화의 다섯 단계이고, 화질을 잃는 단계는 양자화 하나입니다. 도식의 아래쪽 고리가 인코더 안의 디코더입니다. 양자화한 계수를 다시 풀고 디블로킹 필터로 블록 경계를 다듬어 화면을 복원하고, 그 복원 화면을 다음 예측의 참조로 씁니다.

```mermaid {#fig-encoder-loop kind="개념도" caption="H.264 인코더의 복원 고리. 양자화한 계수는 엔트로피 부호화로 나가는 동시에 역양자화 · 역변환을 거쳐 예측에 더해지고, 디블로킹 필터를 지난 복원 화면이 참조 버퍼에 들어가 다음 블록의 예측에 쓰입니다. 디코더가 만드는 화면과 같은 화면을 참조로 쓰기 위한 구조입니다." source="ITU-T H.264 부호화 구조를 옮긴 개념도"}
flowchart TB
  accTitle: H.264 인코더의 복원 고리
  accDescr: 원본 블록에서 예측을 빼 잔차를 만들고 변환과 양자화를 거쳐 엔트로피 부호화로 내보낸다. 양자화 결과는 역양자화와 역변환을 거쳐 예측과 더해지고 디블로킹 필터를 지나 참조 버퍼에 들어가고, 참조 버퍼가 다음 예측에 쓰인다.
  A[원본 블록] --> B[잔차 = 원본 − 예측]
  B --> C[정수 변환]
  C --> D[양자화]
  D --> E[엔트로피 부호화]
  E --> F[비트스트림]
  D --> G[역양자화 · 역변환]
  G --> H[복원 = 잔차 + 예측]
  H --> K[디블로킹 필터]
  K --> I[참조 버퍼]
  I --> J[예측]
  J --> B
  J --> H
```

인코더와 디코더가 양자화 손실까지 같은 복원 화면을 참조로 쓰므로 오차가 화면마다 불어나지 않습니다.

### 화면은 16×16 매크로블록 8,160개로 나뉩니다 {#stage-1-macroblock-분할}

H.264의 기본 단위는 휘도 16×16 화소(4:2:0이면 색차 8×8 두 개를 함께) 매크로블록입니다. 1920×1080을 덮으려면 가로 1920 ÷ 16 = 120개, 세로 1080 ÷ 16 = 67.5개를 올려 68개가 필요합니다. 합계 120 × 68 = 8,160개이고, 부호화 높이는 68 × 16 = 1,088줄이 됩니다. x264 출력의 SPS에도 가로 · 세로 매크로블록 수 − 1이 119 · 67이고, 아래쪽 자르기 값(frame_crop_bottom_offset) 4(4:2:0에서 두 줄 단위, 8줄)로 1,080줄을 보여 줍니다. 2-pass 첫 패스 통계 파일에도 첫 화면은 화면 내 예측 매크로블록 8,160개(`imb:8160`)였습니다.

### 예측이 맞을수록 남는 차이가 작아집니다 {#stage-2-prediction--압축의-진짜-비밀}

예측은 매크로블록마다 고릅니다. 화면 내 예측은 이미 부호화한 왼쪽 · 위쪽 이웃 화소를 이어 붙여 블록을 만듭니다. 휘도 4×4 블록에는 세로 · 가로 · DC(평균) · 대각선 등 아홉 방향이 있습니다([FFmpeg h264pred.h 38–46행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264pred.h#L38-L46)). 화면 간 예측은 앞 절의 모션 벡터로 참조 화면에서 블록을 가져옵니다. 인코더는 잔차와 모드 · 벡터를 적는 비용을 견줘 후보를 고릅니다.

### 정수 변환은 차이를 저주파로 모읍니다 {#stage-3-integer-dct--주파수-변환}

잔차는 4×4(High 프로파일부터는 8×8도) 블록 단위로 주파수 성분으로 바꿉니다. H.264는 DCT(이산 코사인 변환)를 정수만으로 근사한 변환을 씁니다. 4×4 순변환의 핵심 행렬은 다음과 같고, 블록 X에 대해 Cf · X · Cfᵀ를 계산합니다.

```text
Cf = [ 1  1  1  1 ]
     [ 2  1 −1 −2 ]
     [ 1 −1 −1  1 ]
     [ 1 −2  2 −1 ]
```

잔차가 모두 +1인 4×4 블록을 넣으면 왼쪽 위 DC 계수 하나만 16이고 나머지 15개는 0입니다. 정규 직교 DCT로 계산하면 DC가 4인데, H.264는 그 차이(행마다 다른 크기 보정)를 변환에서 곱하지 않고 양자화 배율에 합쳐 둡니다. 이웃끼리 비슷한 잔차일수록 에너지가 왼쪽 위 저주파 계수에 몰립니다.

### QP가 6 오르면 양자화 간격이 두 배가 됩니다 {#stage-4-quantization--손실-압축의-본질}

양자화는 변환 계수를 일정 간격으로 나눠 반올림하는 단계입니다. 간격이 넓을수록 작은 계수가 0이 되고 비트가 줄며, 잃은 값은 되돌릴 수 없습니다. H.264는 간격을 QP(양자화 파라미터, 8비트에서 0–51)로 정하고, QP가 6 오를 때마다 간격이 두 배가 됩니다. FFmpeg의 H.264 디코더도 역양자화 배율을 「QP를 6으로 나눈 몫」만큼 왼쪽으로 밀어(2의 거듭제곱을 곱해) 만듭니다([h264_ps.c 639–644행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264_ps.c#L639-L644), [h264data.c의 quant_div6 표](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264data.c#L182)).

```text
설명용 균일 양자화(간격 10, 반올림)
계수 40 → 4 → 복원 40
계수  8 → 1 → 복원 10
계수  3 → 0 → 복원  0
```

위 예시는 원리만 보인 것이고 특정 QP의 값이 아닙니다. x264의 CRF도 화면마다 QP를 정하는 방식이라, 같은 CRF가 영상마다 같은 화질을 뜻하지 않습니다.

### CABAC은 Main 프로파일부터 씁니다 {#stage-5-entropy-coding--무손실-압축-마무리}

양자화한 계수와 모드 · 모션 벡터는 마지막에 무손실로 압축합니다. CAVLC(문맥 적응 가변 길이 부호)는 표로 짧은 부호를 붙이고, CABAC(문맥 적응 이진 산술 부호)는 먼저 나온 값으로 확률을 고쳐 가며 산술 부호화해 더 줄이는 대신 디코딩이 무겁습니다. Baseline 프로파일은 CABAC을 쓸 수 없고, x264도 Baseline을 고르면 CABAC을 끕니다([x264 common/base.c 788–795행](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/common/base.c#L788-795)). 이 글의 High 출력은 PPS의 `entropy_coding_mode_flag`가 1(CABAC)이었습니다.

## 프로파일은 도구를, 레벨은 처리량 상한을 정합니다 {#5-profile과-level--h264의-두-축}

프로파일은 쓸 수 있는 도구를, 레벨은 화면 크기 · 초당 처리량 · 참조 버퍼 · 비트레이트의 상한을 정하고, 둘은 SPS의 `profile_idc`와 `level_idc`로 적힙니다.

### 프로파일마다 쓸 수 있는 도구가 다릅니다 {#profile--기능-집합}

x264가 프로파일에 맞춰 끄는 도구로 차이를 보면 다음과 같습니다([x264 common/base.c 761–812행](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/common/base.c#L761-812)).

| 프로파일 | profile_idc | 위 단계에 더해 쓸 수 있는 도구 |
|---|---|---|
| Baseline | 66 | I · P 슬라이스, CAVLC |
| Main | 77 | B 슬라이스, CABAC, 인터레이스, 가중 예측 |
| High | 100 | 8×8 변환, 양자화 스케일링 행렬, 흑백(4:0:0) |
| High 10 | 110 | 9–10비트 표본 |

High 10은 10비트 프로파일이지 HDR 프로파일이 아닙니다. HDR 여부는 색 · 전달 특성 표시가 정합니다([H.265 글](/posts/tech-blurting/h265-hdr-deep-dive/)). 애플 [HLS 저작 규격](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)(개정 2025-06-26) 1.4는 H.264에 Main · Baseline보다 High를 쓰라고 권합니다(SHOULD).

### 1080p60은 초당 매크로블록 489,600개라 레벨 4.2가 필요합니다 {#level--처리-부담-상한}

1080p60이면 화면당 매크로블록 8,160개 × 60 = 초당 489,600개입니다. 레벨 4.1의 초당 상한(MaxMBPS)은 245,760개라 넘고, 4.2는 522,240개라 들어갑니다. 4.2의 화면 크기 상한(MaxFS) 8,704개도 8,160개를 덮습니다. 아래 표는 [FFmpeg h264_levels.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264_levels.c#L23-L64)가 규격 표 A-1 · A-2를 옮긴 값입니다.

| 레벨 | MaxMBPS(초당 MB) | MaxFS(화면당 MB) | MaxDpbMbs | High 최대 비트레이트(VCL) |
|---|---|---|---|---|
| 4.0 | 245,760 | 8,192 | 32,768 | 25,000kbps |
| 4.1 | 245,760 | 8,192 | 32,768 | 62,500kbps |
| 4.2 | 522,240 | 8,704 | 34,816 | 62,500kbps |
| 5.0 | 589,824 | 22,080 | 110,400 | 168,750kbps |
| 5.1 | 983,040 | 36,864 | 184,320 | 300,000kbps |

마지막 열은 표의 MaxBR(기준 프로파일 값, 1,000비트/초 단위)에 High의 배율 1.25를 곱한 값입니다(4.2는 50,000 × 1.25 = 62,500kbps). 참조 버퍼 상한 MaxDpbMbs 34,816을 화면당 8,160으로 나누면 4.27이므로, 레벨 4.2의 1080p는 참조 화면을 4장까지 둘 수 있습니다.

레벨을 주지 않자 x264는 1080p60을 4.2, 1080p30을 4.0으로 선언했고, 둘 다 SPS의 참조 화면 수(max_num_ref_frames)는 4였습니다. `-level 4.1`을 억지로 주자 x264는 `MB rate (489600) > level limit (245760)` 경고를 남기고도 SPS에는 41을 그대로 적었습니다. 애플 규격은 1.3a에서 호환성을 위해 일부 H.264 변형을 High 4.1 이하로 두라고 권하고(SHOULD), 1.3b에서 모든 변형을 High 5.2 이하로 제한합니다(MUST, macOS는 5.0, tvOS는 5.1). 그래서 1080p60(4.2) 변형을 두는 사다리에는 4.1 이하 변형도 함께 둡니다.

### avc1.640028은 High 프로파일 레벨 4.0입니다 {#코덱-문자열--avc1640028-해부}

HLS 다변형 목록의 `CODECS`나 브라우저의 `MediaSource.isTypeSupported('video/mp4; codecs="avc1.640028"')`에 쓰는 코덱 문자열은 SPS의 세 바이트를 16진수로 적은 것입니다. [RFC 6381](https://www.rfc-editor.org/rfc/rfc6381#section-3.3) 3.3절이 순서를 profile_idc, 제약 플래그 바이트, level_idc로 정합니다.

```text
avc1.640028
     64 → profile_idc 100 = High
       00 → constraint_set 플래그 모두 0
         28 → level_idc 40 = 레벨 4.0 (4.2라면 42 = 0x2a)
```

FFmpeg hls 먹서가 쓴 목록에서도 1080p60 x264 출력은 `CODECS="avc1.64002a"`, 1080p30은 `avc1.640028`이었습니다. 4.2 스트림을 `avc1.640028`로 적으면 4.0 디코더만 가진 플레이어가 그 변형을 고를 수 있습니다.

## 비트스트림은 NAL 단위이고 SPS·PPS가 먼저 와야 합니다 {#6-nal-unit--비트스트림의-단위}

H.264 비트스트림은 NAL(Network Abstraction Layer) 단위의 연속이고, 슬라이스 · 설정(SPS · PPS) · 부가 정보(SEI)가 각각 NAL 하나입니다.

### NAL 머리 1바이트에 참조 중요도와 종류가 들어 있습니다 {#nal-unit-헤더-1바이트}

첫 바이트는 `forbidden_zero_bit`(항상 0) · `nal_ref_idc`(0이면 참조로 쓰지 않음) · `nal_unit_type`(5비트)이고, x264 출력에서 SPS · PPS · IDR은 `nal_ref_idc`가 3, AUD와 SEI는 0이었습니다.

### 종류 번호 5는 IDR, 7과 8은 SPS와 PPS입니다 {#주요-nal-unit-type}

종류 번호는 1이 IDR이 아닌 슬라이스, 5가 IDR 슬라이스, 6이 SEI(부가 정보), 7이 SPS, 8이 PPS, 9가 AUD(화면 시작 표시), 12가 필러입니다([FFmpeg h264.h 35–46행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264.h#L35-L46)).

### x264 출력은 첫 화면 앞에 SPS·PPS를 붙입니다 {#sps--pps--디코더의-설정값}

SPS(Sequence Parameter Set)에는 프로파일 · 레벨, 매크로블록 단위 화면 크기와 자르기 값, 참조 화면 수, 비트 깊이가 들어 있습니다. PPS(Picture Parameter Set)에는 엔트로피 부호화 방식(CAVLC · CABAC)과 QP 초깃값처럼 화면마다 바뀔 수 있는 설정이 들어 있습니다. 슬라이스가 PPS를, PPS가 SPS를 가리키므로 디코더는 둘을 먼저 받아야 합니다.

1080p60 1초를 MPEG-TS로 인코딩한 파일에서 첫 패킷은 AUD(9) → SPS(7) → PPS(8) → SEI(6) → IDR(5) 순서였고, 다음 패킷부터는 AUD(9) → 슬라이스(1)만 있었습니다. 중간에 들어온 시청자는 다음 IDR과 그 앞의 SPS · PPS를 받아야 디코딩을 시작합니다. FFmpeg의 libx264는 그릇이 전역 머리를 요구하지 않으면(TS 등) x264의 기본값대로 키프레임마다 SPS · PPS를 다시 씁니다([libx264.c 1351–1352행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/libx264.c#L1351-L1352)).

### TS는 시작 코드, MP4는 길이 머리로 NAL을 나눕니다 {#annex-b-vs-avcc--두-가지-포맷}

같은 NAL을 그릇에 담는 방식이 둘입니다. 규격 부록 B의 바이트 스트림(Annex B)은 NAL 앞에 시작 코드 `00 00 01`(또는 `00 00 00 01`)을 둬서 경계를 표시합니다. MPEG-TS가 이 방식이라 SPS · PPS도 화면 사이에 NAL로 섞여 옵니다. MP4 · fMP4는 NAL 앞에 길이(보통 4바이트)를 적고, SPS · PPS는 표본 설명(avcC 상자)에 따로 둡니다. `avc3`도 길이 머리를 쓰지만 SPS · PPS를 표본 안에도 둘 수 있다는 점이 다르고, 애플 규격 1.10은 `avc1`을 권합니다.

브라우저 MSE(Media Source Extensions)로 TS 조각을 재생하는 hls.js는 TS에서 꺼낸 NAL마다 4바이트 길이를 붙여 fMP4의 mdat에 씁니다([mp4-remuxer.ts 742–750행](https://github.com/video-dev/hls.js/blob/127c6adee512843abf85748d82767bdf1a3c8e5c/src/remux/mp4-remuxer.ts#L742-L750)).

## 송출 명령에서는 레벨 선언과 키프레임 간격을 함께 맞춥니다 {#7-인코더-옵션--실전-튜닝}

프로파일 · 레벨과 키프레임 간격은 스트림을 받는 쪽과의 계약입니다. preset · tune · VBV처럼 인코더 안의 압축을 정하는 옵션은 [x264 글](/posts/tech-blurting/x264-live-rate-control-gop/)에서 실측했습니다.

### 1080p60 송출은 -level 4.2와 -r 60 -g 120을 함께 줍니다 {#라이브-인코딩-표준-명령}

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset veryfast -tune zerolatency \
  -profile:v high -level 4.2 -pix_fmt yuv420p \
  -b:v 6000k -maxrate 6000k -bufsize 6000k \
  -r 60 -g 120 -sc_threshold 0 \
  -c:a aac -b:a 160k \
  -f flv rtmp://<수신 서버>/<앱>/<스트림 키>
```

- `-profile:v high -level 4.2`: SPS에 High · 4.2를 적습니다. 4.2는 위 표대로 1080p60이 들어가는 가장 낮은 레벨입니다. 30fps라면 x264가 고르는 4.0으로 충분합니다.
- `-pix_fmt yuv420p`: 8비트 4:2:0으로 바꿉니다. 이 옵션 없이 4:2:2 입력에 `-profile:v high`를 주면 x264가 「high profile doesn't support 4:2:2」 오류로 멈춥니다([base.c 772–776행](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/common/base.c#L772-776)).
- `-r 60 -g 120 -sc_threshold 0`: 60fps 출력에서 키프레임 간격을 최대 120프레임(2초)으로 두고, 장면 전환 키프레임을 꺼 2초 위치에 고정합니다.
- `-tune zerolatency`: B 프레임을 꺼 표시 순서와 디코딩 순서를 같게 만듭니다.

VBV 값과 `-minrate` 문제는 [x264 글](/posts/tech-blurting/x264-live-rate-control-gop/#maxrate와-bufsize가-vbv-상한을-정합니다), 서버 수용량은 [라이브 트랜스코딩 서버 글](/posts/tech-blurting/live-transcoding-infrastructure/), GPU 인코더는 [NVENC 글](/posts/tech-blurting/nvenc-gpu-transcoding/)에 있습니다.

## VMAF 점수는 모델·해상도·프레임 정렬을 함께 적어야 비교됩니다 {#8-화질-평가--psnr-vs-ssim-vs-vmaf}

PSNR은 화소 오차의 평균 제곱을 데시벨로 바꾼 값이고, SSIM은 밝기 · 대비 · 구조가 얼마나 같은지를 봅니다. VMAF(Video Multimethod Assessment Fusion)는 Netflix가 여러 화질 특징을 사람의 평가 점수에 맞춰 학습시킨 모델이라, 점수는 학습한 시청 조건을 전제로 합니다. 그래서 네 가지를 함께 적어야 비교할 수 있습니다.

1. **모델과 판.** 기본 모델 vmaf_v0.6.1은 1080p HDTV를 화면 높이의 세 배(3H) 거리에서 보는 조건으로 학습했습니다. 4K 모델(vmaf_4k_v0.6.1)은 4K TV를 1.5H에서 보는 조건이고, 휴대폰 모델은 같은 영상에 더 높은 점수를 줍니다([VMAF 모델 문서](https://github.com/Netflix/vmaf/blob/a6ed0f18285cab504b779bbccb0bbaddc3bf44c2/resource/doc/models_v0.md)).
2. **해상도.** FAQ의 480p 예와 같은 원리로, 720p 결과도 원본 해상도(1080p)로 키운 뒤 1080p 원본과 비교합니다. 낮은 해상도끼리 잰 점수는 더 먼 거리에서 본 화질이라 높게 나옵니다([VMAF FAQ](https://github.com/Netflix/vmaf/blob/a6ed0f18285cab504b779bbccb0bbaddc3bf44c2/resource/doc/faq.md)).
3. **프레임 정렬.** FFmpeg 필터는 프레임 번호가 아니라 타임스탬프로 두 입력을 맞춥니다([VMAF FFmpeg 문서](https://github.com/Netflix/vmaf/blob/a6ed0f18285cab504b779bbccb0bbaddc3bf44c2/resource/doc/ffmpeg.md)). 아래 측정은 mkv의 밀리초 타임스탬프로는 프레임이 어긋나서 두 입력 모두 `setpts=N/24/TB`로 프레임 번호에 맞췄습니다.
4. **평균과 하위 백분위.** 기본 출력은 화면별 점수의 산술 평균입니다. FAQ는 사람의 판단이 가장 나쁜 화면 쪽으로 기운다고 적습니다. 이 글의 1-pass 결과는 평균이 90.94였지만 화면별 점수의 하위 1%는 78.86으로 12점 낮았습니다.

해상도별 VMAF 곡선으로 사다리를 고른 결과는 [ABR 사다리 글](/posts/tech-blurting/abr-ladder-design/#6-convex-hull--사다리에서-쓸데없는-점-제거), preset별 VMAF는 [x264 글](/posts/tech-blurting/x264-live-rate-control-gop/#preset은-같은-crf에서-cpu-시간과-파일-크기를-맞바꿉니다)에 있습니다.

## 2-pass는 첫 패스 통계로 평균 비트레이트를 나눠 씁니다 {#9-two-pass-인코딩--화질-짜내기}

1-pass 평균 비트레이트(ABR)는 앞으로 올 장면을 모른 채 목표를 따라가고, 2-pass는 첫 패스의 화면별 복잡도 통계로 전체 비트를 나눕니다. 정비례로 나누지는 않고, x264는 복잡도 차이를 qcomp(기본 0.6, [base.c 423행](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/common/base.c#L423))로 눌러, 복잡한 장면에 비트를 더 주되 QP도 함께 올립니다. 첫 패스는 빠른 설정으로 돕니다. FFmpeg의 `fastfirstpass` 옵션은 기본으로 켜져 있고([libx264.c 1254–1255행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/libx264.c#L1254-L1255)), x264는 첫 패스에서 참조를 1장으로, 움직임 탐색을 다이아몬드로, 부화소 정밀도를 2단계 이하로 낮춥니다([x264 common/base.c 717–729행](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/common/base.c#L717-729)). 이번 첫 패스의 통계 파일 머리에도 `ref=1 me=dia subme=2 trellis=0 8x8dct=0`이 적혀 있었습니다.

Sintel 10초를 x264 medium으로 인코딩해, 실제 평균 비트레이트가 비슷한 쌍끼리 견줬습니다.

| 방식 | 목표 | 실제 평균 | VMAF 평균 | 하위 1% | 2초 구간 최대 | CPU 시간 |
|---|---|---|---|---|---|---|
| 1-pass ABR | 1,400k | 1,536kbps | 89.93 | 75.99 | 2,899kbps | 31.4초 |
| 2-pass | 1,500k | 1,530kbps | 90.30 | 75.50 | 2,016kbps | 43.2초(16.2 + 26.9) |
| 1-pass ABR | 1,500k | 1,640kbps | 90.94 | 78.86 | 3,094kbps | 32.8초 |
| 2-pass | 1,625k | 1,652kbps | 91.48 | 77.57 | 2,169kbps | 42.9초(16.2 + 26.7) |
| CRF 29(참고) | 없음 | 1,626kbps | 91.94 | 79.41 | 2,155kbps | 32.6초 |

2-pass는 목표를 2% 안으로 맞췄고(1,530 · 1,652kbps), 1-pass는 두 번 모두 목표보다 약 10% 많이 썼습니다. 실제 평균이 비슷한 쌍끼리 보면 2-pass의 VMAF 평균은 0.37 · 0.54점 높았지만 하위 1%는 0.49 · 1.29점 낮았습니다. 두드러진 차이는 2초 구간 최대 비트레이트였습니다. 2-pass가 2,899 → 2,016kbps, 3,094 → 2,169kbps로 약 30% 낮았습니다. CPU 시간은 첫 패스(약 16초)만큼 늘어 1.3–1.4배였습니다. 같은 비트레이트 근처의 CRF 29는 평균과 하위 1% 모두 2-pass보다 높았습니다. 2-pass는 화질을 더 짜내기보다 평균 비트레이트나 파일 크기를 정확히 맞추는 방식입니다.

1초씩 나누면 움직임이 큰 2–3초 구간에 1-pass는 3,523kbps, 2-pass는 1,889kbps를 썼습니다.

{{< chart id="fig-twopass-per-second" kind="실측" caption="실제 평균이 약 1,530kbps로 같은 1-pass ABR(목표 1,400k)과 2-pass(목표 1,500k)의 1초 구간별 비트레이트. 1-pass는 2–3초 구간에 3,523kbps를 몰아 쓰고 첫 1초와 7–9초 구간에는 덜 썼습니다. 2-pass는 둘 다 300kbps대로 아낀 1–2초 구간을 빼면 1,054–2,035kbps 안에서 고르게 나눴습니다. Sintel 예고편 10초, x264 medium, 1회." source="아래 「측정 조건」" height="320px" >}}
{
  "grid": {"left": 8, "right": 24, "top": 40, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "category", "name": "초", "data": ["0–1", "1–2", "2–3", "3–4", "4–5", "5–6", "6–7", "7–8", "8–9", "9–10"]},
  "yAxis": {"type": "value", "name": "kbps", "nameTextStyle": {"align": "left"}, "min": 0, "max": 4000, "interval": 1000},
  "series": [
    {"name": "1-pass", "type": "line", "symbol": "circle", "symbolSize": 6, "itemStyle": {"color": "#7a8a9b"}, "lineStyle": {"color": "#7a8a9b", "type": "dashed"},
     "data": [1207, 382, {"value": 3523, "label": {"show": true, "position": "right", "formatter": "1-pass", "color": "#172c40"}}, 2229, 1391, 1459, 1470, 1119, 959, 1616]},
    {"name": "2-pass", "type": "line", "symbol": "circle", "symbolSize": 6, "itemStyle": {"color": "#087f8b"}, "lineStyle": {"color": "#087f8b", "width": 3},
     "data": [1740, 307, 1889, 2035, 1656, {"value": 1751, "label": {"show": true, "position": "top", "formatter": "2-pass", "color": "#172c40", "fontWeight": "bold"}}, 1707, 1465, 1054, 1695]}
  ]
}
{{< /chart >}}

그 구간의 VMAF 평균은 1-pass 94.2, 2-pass 81.0이었고, 2-pass의 하위 1%가 낮았던 이유도 여기에 있습니다. 대신 2-pass는 1-pass가 아낀 첫 1초(VMAF 83.4 → 88.9)와 7–8초 구간에 비트를 더 썼습니다. 순간 비트를 평평하게 한 대가로 가장 어려운 장면의 화질을 내준 셈입니다. 영상 1개 · 1회 측정이라 1점 안팎의 차이는 다른 영상에서 뒤집힐 수 있습니다.

2-pass는 입력 전체를 먼저 읽어야 하므로 라이브에는 그대로 쓸 수 없습니다. 라이브 인코더가 미리 보는 것은 lookahead 몇 프레임뿐입니다([x264 글](/posts/tech-blurting/x264-live-rate-control-gop/#zerolatency는-b-프레임lookaheadmbtree를-끕니다)).

## I 프레임과 IDR, CRF와 화질 등급을 같은 것으로 보면 틀립니다 {#정리하면}

- I 프레임은 참조를 끊지 않습니다. 중간 진입과 HLS 조각 시작에는 IDR(NAL 종류 5)이 필요하고, 1080p60은 레벨 4.2(`avc1.64002a`)입니다. x264는 낮은 레벨을 적으라면 경고만 남기고 적습니다.
- CRF 숫자와 VMAF 평균은 화질 등급이 아닙니다. 영상마다 값이 다르고, VMAF는 모델 · 해상도 · 정렬 방식과 하위 백분위를 함께 적어야 견줄 수 있습니다.

인코딩 결과가 이상하면 먼저 `ffmpeg -i <파일> -c copy -bsf:v trace_headers -f null -`로 SPS의 profile_idc · level_idc와 NAL 순서를 보십시오. 목록에 적은 코덱 문자열과 실제 스트림이 어긋나는 문제는 대부분 여기서 드러납니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일에 실행했습니다. 헤더 · 레벨 · NAL 확인은 06:34–06:35(KST), 1-pass · 2-pass(목표 1,500k)는 06:34:44–06:35:57, 목표를 바꾼 1-pass 1,400k · 2-pass 1,625k는 06:52–06:54, CRF 29는 06:37에 돌렸습니다. 모두 1회입니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1.
- 부하: 같은 기계에서 다른 세션의 작업(브라우저, 다른 인코딩 · 렌더 실험)이 함께 돌았습니다. 10초마다 기록한 1분 load average는 측정 시작 때 26.3, 1,500k 비교 때 26–53, 1,400k · 1,625k 비교 때 216–221이었습니다(이 측정의 인코더 스레드 포함). 그래서 벽시계 시간은 쓰지 않고 CPU 시간(user + sys, 자식 프로세스 rusage)으로 비교했습니다. CPU 시간은 2-pass 목표 1,500k(load 약 50)가 43.2초, 1,625k(load 약 217)가 42.9초, 1-pass 1,500k(load 약 26)가 32.8초, 1,400k(load 약 220)가 31.4초였습니다. 성능 · 효율 코어가 섞인 칩이라 CPU 시간도 부하의 영향을 완전히 피하지는 못합니다. 같은 인코딩의 CPU 시간은 재실행에서 약 ±10% 흔들렸습니다(리뷰 단계의 독립 재측정, load 28–46).
- 도구: FFmpeg 9.0.2(Homebrew 9.0.2_1), x264 core 165 r3222, libvmaf 3.2.1(모델 vmaf_v0.6.1).
- 입력: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p(© copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), `https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4`(sha256 `34bbd52a4b89fdf63c8ace50b268da26653a59508288100cd3c23de276db7931`, H.264 약 2.1Mbps)의 20초 지점부터 10초를 FFV1로 풀어 둔 파일(1920×1080, 24fps, 240프레임). 원본 자체가 이미 한 번 압축된 영상이고, 위아래에 검은 띠가 있어 `cropdetect` 기준 실제 화면은 대부분 1920×818입니다.
  - `ffmpeg -ss 20 -i sintel_trailer-1080p.mp4 -t 10 -an -c:v ffv1 ref.mkv`
- 1-pass: `ffmpeg -i ref.mkv -an -c:v libx264 -preset medium -b:v <1400k|1500k> abr1.mp4`
- 2-pass: `ffmpeg -i ref.mkv -an -c:v libx264 -preset medium -b:v <1500k|1625k> -pass 1 -passlogfile tp -f null -` 뒤 `ffmpeg -i ref.mkv -an -c:v libx264 -preset medium -b:v <같은 값> -pass 2 -passlogfile tp twopass.mp4`. 첫 패스 설정은 통계 파일(`tp-0.log`) 첫 줄에서 읽었습니다.
- CRF: `ffmpeg -i ref.mkv -an -c:v libx264 -preset medium -crf <28|29> out.mp4`
- VMAF: `ffmpeg -i out.mp4 -i ref.mkv -lavfi "[0:v]setpts=N/24/TB[d];[1:v]setpts=N/24/TB[r];[d][r]libvmaf=model=version=vmaf_v0.6.1:n_threads=8:log_fmt=json:log_path=v.json" -f null -`. 평균은 libvmaf의 평균, 하위 1%는 화면별 점수 240개를 정렬해 아래에서 세 번째 값(1백분위, 가장 가까운 순위)입니다.
- 비트레이트: `ffprobe -v error -select_streams v -show_entries packet=pts_time,size -of csv=p=0 out.mp4`의 영상 패킷 크기 합(컨테이너 제외). 2초 구간 최대는 표시 순서로 48프레임씩 한 프레임씩 밀며 잰 최댓값, 1초 구간 값은 표시 시각의 정수 초로 나눈 합입니다.
- 레벨 · NAL: `ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=<60|30> -t 1 -c:v libx264 -preset <veryfast|medium> [-level <4.1|4.2>] -profile:v high -pix_fmt yuv420p -g <120|60> -sc_threshold 0 -f mpegts out.ts` 뒤 `ffmpeg -i out.ts -c copy -bsf:v trace_headers -f null -`. 코덱 문자열은 같은 입력 2초를 `-f hls -hls_segment_type fmp4 -hls_time 1 -master_pl_name master.m3u8`로 내보낸 다변형 목록에서 읽었습니다.
- 디코딩 순서: `ffmpeg -i ref.mkv -frames:v 9 -an -c:v libx264 -preset medium -bf 3 -b-pyramid none dec.mp4` 뒤 `ffprobe -v error -select_streams v -show_entries packet=pts,dts,flags -of csv=p=0 dec.mp4`.

## 출처

- [ITU-T H.264 권고 목록](https://www.itu.int/rec/T-REC-H.264) — 판 이력(05/2003 첫 판, 06/2026 현재 판)
- [Via LA, AVC/H.264 라이선스 프로그램](https://www.via-la.com/licensing-programs/avc-h-264/)
- FFmpeg n9.0.2 소스: [h264_levels.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264_levels.c#L23-L64) — 레벨 표 A-1 · A-2 · [h264_ps.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264_ps.c#L639-L644) · [h264data.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264data.c#L182) — 역양자화 · [h264.h](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264.h#L35-L46) — NAL 종류 · [h264pred.h](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264pred.h#L38-L46) — 화면 내 예측 모드 · [h264qpel.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264qpel.c) — 1/4 화소 보간 · [libx264.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/libx264.c#L1254-L1255) — fastfirstpass
- x264 r3222 소스: [common/base.c](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/common/base.c#L717-812) — 첫 패스 설정 · 프로파일 제약 · [x264.h](https://code.videolan.org/videolan/x264/-/blob/b35605ace3ddf7c1a5d67a2eb553f034aef41d55/x264.h#L713) — tune 목록
- [RFC 6381](https://www.rfc-editor.org/rfc/rfc6381#section-3.3) — 3.3 avc1 코덱 문자열
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 1.3a · 1.3b · 1.4 · 1.10
- [hls.js mp4-remuxer.ts](https://github.com/video-dev/hls.js/blob/127c6adee512843abf85748d82767bdf1a3c8e5c/src/remux/mp4-remuxer.ts#L742-L750) — NAL 길이 머리 쓰기
- Netflix VMAF 문서: [모델](https://github.com/Netflix/vmaf/blob/a6ed0f18285cab504b779bbccb0bbaddc3bf44c2/resource/doc/models_v0.md) · [FAQ](https://github.com/Netflix/vmaf/blob/a6ed0f18285cab504b779bbccb0bbaddc3bf44c2/resource/doc/faq.md) · [FFmpeg에서 쓰기](https://github.com/Netflix/vmaf/blob/a6ed0f18285cab504b779bbccb0bbaddc3bf44c2/resource/doc/ffmpeg.md)
- [Sintel](https://durian.blender.org/sharing/) — 시험 영상, © copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
- PokeClip 기록: [OBS 인코더 공유와 GOP 2초](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)

다음 편: [H.265의 HDR은 PQ와 HLG 두 전달 곡선으로 나뉩니다](/posts/tech-blurting/h265-hdr-deep-dive/)
