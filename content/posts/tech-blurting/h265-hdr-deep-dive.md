---
title: "H.265의 HDR은 PQ와 HLG 두 전달 곡선으로 나뉩니다"
date: 2026-06-20T14:42:30+09:00
lastmod: "2026-11-13T07:55:32+09:00"
description: "H.265(HEVC)를 고를 때는 압축률보다 디코더·라이선스·HDR 신호를 먼저 봐야 합니다. JCT-VC 검증 시험의 59% 절감이 어떤 조건의 값인지, 64×64 CTU와 4분 트리, Via LA와 Access Advance로 모인 특허 풀, FFmpeg가 hev1로 적는 태그와 애플의 hvc1 권고, 4K60의 레벨 5.1, PQ와 HLG의 곡선·메타데이터 차이와 VIDEO-RANGE, 아이폰 HDR이 HLG인 이유를 1차 문서로 확인했습니다. Sintel 예고편으로 같은 VMAF 93에서 x264·x265·SVT-AV1의 비트레이트와 CPU 시간을 직접 쟀습니다."
categories: ["tech-blurting"]
tags: ["HEVC", "H.265", "HDR", "PQ", "HLG", "x265", "VMAF"]
draft: false
---

H.265(HEVC)는 H.264보다 비트를 덜 쓰는 코덱으로 소개되지만, 실제 선택을 가르는 것은 시청 기기의 디코더와 특허 라이선스, HDR 신호입니다. Sintel 예고편 10초를 같은 VMAF 93에 맞춰 인코딩하자 x265 medium은 x264 medium보다 평균 비트레이트를 34% 적게 썼지만(1,184 대 1,799kbps), CPU 시간은 2.3배(78.3 대 33.7초)를 썼습니다. HDR은 H.265만의 기능이 아니라 밝기를 부호값에 싣는 전달 곡선의 문제이고, 그 곡선은 절대 밝기를 정하는 PQ와 화면 밝기에 맞춰 늘어나는 HLG 두 갈래입니다. 실측은 모두 이 글을 쓰며 AI(Claude Code)가 FFmpeg 9.0.2로 잰 값입니다(아래 「측정 조건」).

## 4K는 1080p보다 화소가 네 배라 압축 도구가 더 필요했습니다 {#1-4k--h264--비현실적-비트레이트}

3840×2160은 8,294,400화소로 1920×1080의 정확히 네 배입니다. H.264로도 4K는 부호화할 수 있습니다. 4K 한 장은 매크로블록 32,400개로 레벨 5.1의 프레임 상한 36,864개 안에 들고, 4K30은 레벨 5.1, 4K60은 5.2의 초당 처리량 안에 듭니다([FFmpeg n9.0.2 h264_levels.c 44–45행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264_levels.c#L44-L45), 계산값). 애플 HLS 저작 규격도 H.264 상한을 High 프로파일 레벨 5.2로 둡니다(1.3b). 문제는 가능 여부가 아니라 같은 화질에 드는 비트입니다.

HEVC가 얼마나 줄이는지는 시험 조건과 함께 읽어야 합니다. JCT-VC는 참조 인코더 HM-12.1(HEVC Main)과 JM-18.5(H.264 High)로 480p–UHD 8비트 시퀀스 20개를 고정 QP로 부호화하고, 사람이 매긴 점수(MOS)와 PSNR로 같은 화질의 비트레이트를 비교했습니다([Tan 외, IEEE TCSVT 2016](https://ieeexplore.ieee.org/abstract/document/7254155/), [본문 PDF](https://d-nb.info/1155834798/34)).

| 해상도 | MOS 기준 절감 | PSNR 기준 절감 |
|---|---|---|
| UHD | 63% | 47% |
| 1080p | 61% | 50% |
| 720p | 56% | 42% |
| 480p | 57% | 39% |
| 평균 | 59% | 44% |

표는 논문 표 VIII(같은 비트레이트 범위의 비교)입니다. 논문은 절감 폭이 영상 내용에 크게 좌우된다고 적고, 참조 인코더끼리의 값이라 x264·x265의 차이와도 다릅니다.

## H.265는 2013년 4월 첫 판이 나왔습니다 {#2-h265의-등장--2013년}

H.265는 H.264처럼 ITU-T와 ISO/IEC가 함께 만든 규격입니다. ITU-T 권고 첫 판이 2013년 4월에 나왔고, 현재 판은 2026년 1월 판으로 열한 번째입니다([ITU-T H.265](https://www.itu.int/rec/T-REC-H.265)). ISO/IEC 쪽 이름은 23008-2(MPEG-H Part 2)입니다.

### 64×64 CTU를 4분 트리로 쪼개 큰 평면을 한 블록으로 씁니다 {#h265가-h264보다-좋은-이유}

H.264는 화면을 16×16 매크로블록으로 나눕니다. HEVC는 16–64 크기의 CTU(Coding Tree Unit)로 나누고, CTU 하나를 4분 트리로 다시 쪼개 8×8까지 내려갑니다([FFmpeg hevc.h 130–131행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/hevc/hevc.h#L130-L131)). 인코더는 블록마다 쪼갰을 때와 그대로 둘 때의 비트와 왜곡을 견줘 분할을 고르고, 그 결과 가장자리 · 질감이 많은 곳이 잘게 쪼개지기 쉽습니다. 아래 영상은 그 모양을 단순화한 것입니다.

{{< motion scene="CtuQuadtree" id="fig-ctu-quadtree" kind="개념도" caption="64×64 CTU는 가장자리와 질감이 있는 곳만 32 → 16 → 8로 쪼개지고, 평평한 곳은 64×64 한 블록으로 남습니다. 원호가 걸친 블록을 쪼개는 설명용 분할이며, 실제 인코더는 율 · 왜곡 비용으로 분할을 고릅니다." >}}

평평한 하늘은 64×64 하나로 예측 정보를 한 번만 보냅니다. 인트라 예측 방향은 H.264의 9개에서 35개(planar · DC · 각도 33개)로 늘었고([hevcdec.h 125–159행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/hevc/hevcdec.h#L125-L159)), 움직임 정보는 이웃 블록의 것을 그대로 물려받는 병합(merge) 모드나 후보 목록에서 예측값을 고르는 AMVP로 보냅니다.

## HEVC 특허 풀은 합쳐졌고 스트리밍용 풀이 새로 생겼습니다 {#3-h265의-진짜-문제--라이센스-지옥}

HEVC 특허는 여러 창구에서 따로 허락받아야 했습니다. 2023년 5월 2일 Via Licensing과 MPEG LA가 합쳐 Via Licensing Alliance(Via LA)가 됐고([Via LA](https://www.via-la.com/via-licensing-and-mpeg-la/)), 2025년 12월 15일에는 Access Advance가 Via LA의 HEVC/VVC 프로그램을 인수했습니다([Via LA 프로그램 안내](https://www.via-la.com/licensing-programs/hevc-vvc/), [Access Advance 보도문](https://accessadvance.com/2025/12/15/access-advance-and-via-licensing-alliance-announce-hevc-vvc-program-acquisition/)). 보도문은 HEVC·VVC 자산을 한 관리자 아래 모았다고만 적고, 두 풀을 하나로 합칠지와 기존 계약의 이행 방식은 밝히지 않았습니다.

스트리밍 쪽에는 새 창구가 생겼습니다. Access Advance는 2025년 1월 16일 인터넷 영상 배포에 HEVC·VVC·AV1·VP9를 한 라이선스로 묶는 VDP(Video Distribution Patent) 풀을 발표했습니다([보도문](https://accessadvance.com/2025/01/16/access-advance-announces-video-distribution-patent-pool-in-response-to-market-demand/)). 요율표와 AV1이 같은 풀에 들어간 사정은 [AV1 글](/posts/tech-blurting/av1-vp9-deep-dive/#15-sisvel--av1에-대한-라이센스-위협)에서 다룹니다.

### 비용은 기기·서비스·계약마다 단위가 다릅니다 {#비용-예시}

기기 풀은 제품 한 대마다, VDP는 배포사의 사업 규모 등급마다 값을 매깁니다([VDP 요율](https://accessadvance.com/vdp-pool-royalty/)). 「시청자 수 × 대당 로열티」로 서비스 비용을 추정할 수 없고, 풀 밖 특허권자와의 개별 계약도 남습니다.

## x265는 같은 VMAF에서 x264보다 CPU 시간을 더 씁니다 {#4-인코딩-비용--h264-대비-큰-부담}

Sintel 예고편 10초(1080p 24fps)를 인코더마다 CRF를 이분 탐색해, VMAF 평균이 93 이상인 가장 큰 정수 CRF를 골랐습니다. 가로축이 CPU 시간(user + sys), 세로축이 평균 비트레이트입니다. 왼쪽 아래일수록 적은 계산으로 적은 비트를 씁니다.

{{< chart id="fig-same-vmaf-cost" kind="실측" caption="같은 VMAF 93 목표에서 인코더별 CPU 시간과 평균 비트레이트. Sintel 예고편 10초(1080p24, 240프레임), 인코더 기본값에 preset과 CRF만 지정, 각 1회. 2026-11-13, MacBook Air(M5), FFmpeg 9.0.2." source="아래 「측정 조건」" height="360px" >}}
{
  "grid": {"left": 8, "right": 40, "top": 44, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "value", "name": "CPU 초", "min": 0, "max": 100, "interval": 20},
  "yAxis": {"type": "value", "name": "kbps", "min": 0, "max": 2000, "interval": 500},
  "series": [
    {"type": "scatter", "symbolSize": 14, "itemStyle": {"color": "#7a8a9b"},
     "label": {"show": true, "position": "top", "formatter": "{b}"},
     "data": [
       {"name": "x264 medium", "value": [33.65, 1799.4]},
       {"name": "SVT-AV1 8", "value": [28.28, 1201.3], "label": {"position": "bottom"}},
       {"name": "SVT-AV1 4", "value": [93.15, 866.5], "label": {"position": "left"}}
     ]},
    {"type": "scatter", "symbolSize": 16, "itemStyle": {"color": "#087f8b"},
     "label": {"show": true, "position": "top", "formatter": "{b}", "fontWeight": "bold"},
     "data": [{"name": "x265 medium", "value": [78.31, 1183.9]}]}
  ]
}
{{< /chart >}}

| 인코더 | CRF | 평균 kbps | CPU 초 | VMAF 평균 | 하위 1% | 키프레임 |
|---|---|---|---|---|---|---|
| x264 medium | 28 | 1,799 | 33.7 | 93.40 | 81.91 | 6 |
| x265 medium | 28 | 1,184 | 78.3 | 94.00 | 83.00 | 4 |
| SVT-AV1 preset 8 | 39 | 1,201 | 28.3 | 93.07 | 77.01 | 2 |
| SVT-AV1 preset 4 | 41 | 867 | 93.2 | 93.19 | 75.44 | 2 |

x265는 x264보다 비트를 34% 덜 쓰고 CPU 시간을 2.3배 썼습니다. x265의 CRF 29는 VMAF 92.86(1,055kbps)이라 93을 넘는 점은 94.00뿐이었고, 그만큼 x265 쪽 비트가 조금 많게 잡혔습니다. SVT-AV1 preset 8은 x265와 비슷한 비트를 x264보다 적은 CPU 시간으로 냈고, preset 4는 비트를 더 줄이는 대신 CPU 시간을 x265보다 더 썼습니다. 하위 1%(프레임별 VMAF에서 240프레임 중 세 번째로 낮은 값)는 SVT-AV1이 가장 낮았습니다. SVT-AV1 4.2.0의 기본 튜닝이 VMAF가 아닌 PSNR이라 그 영향일 수 있지만, 이 측정으로 원인을 가리지는 않았습니다(추정).

이 비교는 인코더 기본값의 비교일 뿐 최적 설정의 비교가 아닙니다. 영상 하나, 각 1회이고, 키프레임 간격 기본값도 다릅니다(x264·x265는 최대 250프레임에 장면 전환 키프레임, SVT-AV1은 161프레임). 측정 중 기계 부하가 크게 오르내렸습니다(아래 「측정 조건」). 라이브라면 소프트웨어 인코딩보다 GPU 인코더가 현실적인데, NVENC의 HEVC 지원과 세대별 차이는 [NVENC 글](/posts/tech-blurting/nvenc-gpu-transcoding/)에 있습니다.

## FFmpeg는 HEVC를 hev1로 적고 애플은 hvc1을 권합니다 {#5-hvc1-vs-hev1--ios-호환의-함정}

MP4 안의 HEVC 트랙에는 표본 형식 이름이 붙습니다. `hvc1`은 디코더 설정(VPS·SPS·PPS)을 트랙 머리의 표본 설명에 모아 두고, `hev1`은 표본 안에도 둘 수 있습니다. FFmpeg 9.0.2의 mp4 먹서는 HEVC 태그 표에서 `hev1`을 먼저 고르므로([movenc.c 9236–9237행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/movenc.c#L9236-L9237)), libx265로 만든 mp4는 `-tag:v hvc1`을 주지 않으면 `hev1`이 됩니다. 두 번 만들어 `ffprobe`의 `codec_tag_string`이 `hev1`과 `hvc1`로 갈리는 것을 확인했습니다.

[애플 HLS 저작 규격](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)(개정 2025-06-26)은 HEVC 그릇을 fMP4로 두라고 요구하고(1.5, MUST), 매개변수 집합을 표본 설명에 두는 `hvc1`을 쓰라고 권합니다(1.10, SHOULD). 부록은 `hev1`을 「권하지 않음」으로 표시합니다. 금지가 아니라 권고라 `hev1`이면 애플 기기에서 무조건 재생이 안 된다고 단정할 근거는 없지만, 애플 기기를 겨냥하면 `-tag:v hvc1`이 규격에 맞습니다.

1080p30 시험 화면으로 FFmpeg hls 먹서가 fMP4 HLS를 만들자 다변형 목록에 `CODECS="hvc1.1.6.L120.90"`이 적혔습니다. `1`은 Main 프로파일, `L120`은 Main tier 레벨 4.0(레벨 × 30)입니다. 애플 규격 부록의 예 `hvc1.2.4.L123.B0`은 Main 10 레벨 4.1입니다.

## 4K60은 Main 10 레벨 5.1 안에 들어갑니다 {#6-profilelevel}

HEVC 레벨은 한 장의 휘도 표본 수(MaxLumaPs)와 초당 휘도 표본 수(MaxLumaSr)로 상한을 둡니다. 4K 한 장은 8,294,400표본으로 레벨 5의 상한 8,912,896 안에 들고, 4K60은 초당 497,664,000표본이라 레벨 5.0의 267,386,880을 넘고 5.1의 534,773,760 안에 듭니다. 4K30(248,832,000)은 5.0이면 됩니다([FFmpeg h265_profile_level.c 34–35행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h265_profile_level.c#L34-L35), 계산값).

프로파일은 Main(8비트 4:2:0)과 Main 10(10비트까지 4:2:0)이 배포용의 거의 전부입니다. 애플 규격은 HEVC를 Main 10 · 레벨 5.1 · High tier 이하로 두라고 요구하고(1.6b, MUST), 호환성을 위해 일부 변형을 Main 10 · 레벨 4.0 · Main tier 이하로 두라고 권합니다(1.6a). 애플 예시 사다리의 HEVC 단계는 [ABR 사다리 글](/posts/tech-blurting/abr-ladder-design/#2-apple-hls-authoring-spec--업계-출발점)에 옮겨 두었습니다.

## HDR은 밝기를 어떤 곡선으로 부호화하느냐의 문제입니다 {#7-hdr이-정확히-뭔가}

영상의 부호값은 0–1 사이의 숫자이고, 그 숫자를 화면 밝기로 바꾸는 규칙이 전달 곡선입니다. SDR은 100cd/m²(니트) 안팎의 화면을 전제로 한 감마 곡선을 씁니다([BT.1886](https://www.itu.int/rec/R-REC-BT.1886)). HDR 규격 [ITU-R BT.2100](https://www.itu.int/rec/R-REC-BT.2100)(첫 판 2016-07, 현행 -3 2025-02)은 두 곡선을 둡니다. PQ(Perceptual Quantizer, [SMPTE ST 2084](https://pub.smpte.org/doc/st2084/20140816-pub/), 2014)는 부호값마다 0–10,000cd/m²의 절대 밝기를 정합니다. HLG(Hybrid Log-Gamma, [ARIB STD-B67](https://www.arib.or.jp/english/std_tr/broadcasting/desc/std-b67.html) 1.0 2015-07-03)는 장면의 상대 밝기를 싣고, 표시 밝기는 화면의 최대 밝기에 맞춰 정해집니다.

세 곡선을 같은 부호값 축에 놓으면 차이가 보입니다. 세로축은 로그 눈금입니다.

{{< chart id="fig-pq-hlg-sdr" kind="재구성" caption="부호값(0–1)에 따른 표시 밝기(cd/m², 로그 눈금). PQ는 BT.2100 표 4의 EOTF, HLG는 표 5의 EOTF를 최대 밝기 1,000cd/m² 화면, 검정 0으로 계산(무채색, 시스템 감마 1.2), SDR은 BT.1886을 최대 100cd/m², 검정 0으로 계산. 점선은 BT.2100이 정한 HDR 기준 흰색 203cd/m²." source="ITU-R BT.2100-3 표 4·5와 주 10a, ITU-R BT.1886의 식으로 계산" height="380px" >}}
{
  "grid": {"left": 8, "right": 24, "top": 44, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "data": ["PQ", "HLG(1,000cd/m² 화면)", "SDR(100cd/m² 화면)"]},
  "xAxis": {"type": "value", "name": "부호값", "min": 0, "max": 1, "interval": 0.25},
  "yAxis": {"type": "log", "name": "cd/m²", "min": 0.01, "max": 10000, "logBase": 10},
  "series": [
    {"name": "PQ", "type": "line", "showSymbol": false, "itemStyle": {"color": "#087f8b"}, "lineStyle": {"width": 3},
     "markLine": {"symbol": "none", "silent": true, "lineStyle": {"color": "#7a8a9b", "type": "dashed", "width": 1}, "label": {"formatter": "기준 흰색 203", "position": "insideStartTop"}, "data": [{"yAxis": 203}]},
     "data": [[0.05,0.06],[0.1,0.325],[0.15,1.0],[0.2,2.43],[0.25,5.15],[0.3,10.0],[0.35,18.4],[0.4,32.4],[0.45,55.4],[0.5,92.2],[0.55,151],[0.6,244],[0.65,390],[0.7,621],[0.75,983],[0.8,1560],[0.85,2460],[0.9,3910],[0.95,6230],[1.0,10000]]},
    {"name": "HLG(1,000cd/m² 화면)", "type": "line", "showSymbol": false, "itemStyle": {"color": "#b06a00"}, "lineStyle": {"width": 2},
     "data": [[0.05,0.202],[0.1,1.07],[0.15,2.82],[0.2,5.62],[0.25,9.61],[0.3,14.9],[0.35,21.5],[0.4,29.7],[0.45,39.4],[0.5,50.7],[0.55,65.0],[0.6,84.8],[0.65,112],[0.7,150],[0.75,203],[0.8,277],[0.85,379],[0.9,522],[0.95,722],[1.0,1000]]},
    {"name": "SDR(100cd/m² 화면)", "type": "line", "showSymbol": false, "itemStyle": {"color": "#7a8a9b"}, "lineStyle": {"width": 2, "type": "dashed"},
     "data": [[0.05,0.0754],[0.1,0.398],[0.15,1.05],[0.2,2.1],[0.25,3.59],[0.3,5.56],[0.35,8.05],[0.4,11.1],[0.45,14.7],[0.5,18.9],[0.55,23.8],[0.6,29.3],[0.65,35.6],[0.7,42.5],[0.75,50.1],[0.8,58.5],[0.85,67.7],[0.9,77.7],[0.95,88.4],[1.0,100]]}
  ]
}
{{< /chart >}}

PQ는 부호값 0.58 근처에서 기준 흰색 203cd/m²에 닿고, 그 위 0.42를 하이라이트에 씁니다. 같은 203cd/m²가 HLG(1,000cd/m² 화면)에서는 0.75입니다. HLG 곡선은 화면이 바뀌면 함께 움직이고(BT.2100은 화면 최대 밝기에 따라 시스템 감마를 바꾸는 식을 둡니다), PQ 곡선은 화면과 상관없이 고정입니다. 그래서 「HDR = 1,000니트」는 틀린 요약입니다. 1,000은 HLG를 계산할 때 고른 화면의 값이고, PQ의 부호 범위는 10,000cd/m²까지입니다.

### HDR10·HDR10+·HLG·Dolby Vision은 곡선과 메타데이터 조합이 다릅니다 {#hdr의-4가지-표준}

| 형식 | 전달 곡선 | 메타데이터 | 근거 |
|---|---|---|---|
| HDR10 | PQ | 정적: ST 2086 마스터링 화면, MaxCLL·MaxFALL | [CTA HDR10 Media Profile](https://cdn.cta.tech/cta/media/media/membership/pdfs/video-technology-consumer-definitions.pdf) |
| HDR10+ | PQ | HDR10 + 장면별·프레임별 동적 메타데이터 | [hdr10plus.org](https://hdr10plus.org/) |
| HLG | HLG | 없음 | [BT.2100](https://www.itu.int/rec/R-REC-BT.2100) |
| Dolby Vision | 프로파일마다 다름(8.1은 HDR10 호환, 8.4는 HLG 호환) | Dolby Vision 동적 메타데이터 | [Dolby 비트스트림 프로파일](https://ott.dolby.com/OnDelKits/Dolby_Vision_Online_Delivery_Kit/v1/Documentation/Specs/Visio_Profiles/help_files/topics/c_dovi_profiles_public.html) |

HDR10+는 로열티가 없지만 채택사 종류에 따라 연 관리비(예: 화면 제조사 $10,000, SoC $4,000, 콘텐츠사 없음)가 있습니다([HDR10+ 라이선스](https://hdr10plus.org/#licenses)). Dolby Vision의 배포용 프로파일 5·8·10은 모두 10비트 단일 층이고, 5와 8은 HEVC, 10은 AV1입니다.

### HLG는 메타데이터 없이 SDR 화면에서도 보입니다 {#왜-hlg가-라이브에-적합}

HLG 신호에는 마스터링 메타데이터가 없으므로 인코더가 영상 전체를 보고 값을 정할 필요가 없습니다. ITU-R 보고서 BT.2390-12(6.4절)는 BT.2020 색 공간을 받는 SDR UHD 화면에 HLG를 그대로 보내도 어느 정도 호환된다고 적습니다. 다만 밝고 채도가 높은 곳은 색조가 달라 보일 수 있고, BT.709 SDR 화면에는 PQ·HLG 모두 호환이 제한적이라고 덧붙입니다([BT.2390](https://www.itu.int/pub/R-REP-BT.2390)). BBC는 2018년 월드컵을 iPlayer에서 UHD로 시험 중계할 때 HEVC Main 10 레벨 5.1에 HLG 신호를 썼고, HLG가 아닌 호스트 HDR 피드를 HLG로 바꿔 SDR UHD 수신기와의 호환을 노렸습니다(2차 보도: [Streaming Media, 2018-06-04](https://www.streamingmediaglobal.com/Articles/Editorial/Featured-Articles/BBC-Streams-FIFA-World-Cup-in-UHD-HDR-But-Not-to-All-Viewers-125407.aspx)).

PQ가 라이브에 못 쓰인다는 뜻은 아닙니다. HDR10의 정적 메타데이터는 마스터링 화면 값으로 미리 정할 수 있고, HDR10+도 라이브는 프레임별 메타데이터를 쓴다고 밝힙니다. 차이는 SDR 화면입니다. [[fig-pq-hlg-sdr]]에서 보듯 PQ 부호값을 SDR 감마로 읽으면 밝기가 크게 어긋납니다.

## PQ는 10,000니트까지 펼쳐 10비트가 필요합니다 {#8-10-bit-색심도--hdr의-필수-조건}

PQ는 0–10,000cd/m²를 부호값 하나에 펼치므로 계단 하나의 폭이 넓습니다. 제한 범위 휘도 부호로 계산하면 100cd/m² 근처의 인접 부호값 간격은 10비트(64–940)에서 약 1.1%, 8비트(16–235)에서 약 4.7%입니다(계산값). 8비트는 같은 곳에서 네 배 거친 계단을 밟으므로 하늘 같은 완만한 그러데이션에 띠가 생기기 쉽습니다. 그래서 HDR10 정의는 10비트를 요구하고, Dolby Vision 배포용 프로파일 5 · 8 · 10도 10비트입니다(9는 8비트 AVC). x265는 `-pix_fmt yuv420p10le -profile:v main10`으로 10비트를 냅니다.

## 4:2:0은 색 표본을 네 화소에 하나만 둡니다 {#9-chroma-subsampling--왜-420이-표준인가}

YCbCr은 밝기(Y)와 색차(Cb·Cr)를 나눠 저장합니다. 4:4:4는 화소마다 세 값, 4:2:2는 가로 두 화소가 색차를 나눠 써서 두 값, 4:2:0은 2×2 네 화소가 색차 한 쌍을 나눠 써서 1.5값이므로 원본 데이터가 각각 67%, 50%가 됩니다(계산값). HDR10 정의도 압축 영상에는 4:2:0을 둡니다. 색 경계가 날카로운 글자는 그만큼 번질 수 있어, 화면 공유처럼 글자가 많은 영상은 따로 판단합니다.

## 브라우저의 HEVC 재생은 운영체제 디코더에 기댑니다 {#10-h265의-디코딩-측--시청자-디바이스-호환성}

브라우저 대부분은 HEVC 디코더를 직접 넣지 않고 운영체제나 하드웨어 디코더를 빌립니다. caniuse 기록(2026-11-13 확인)으로 Chrome은 107부터 macOS Big Sur·Android 5 이상, Windows는 하드웨어 디코더가 있을 때, Edge는 Windows에서 하드웨어와 스토어 HEVC 확장이 있을 때, Firefox는 137부터 하드웨어 디코더가 있을 때, Safari는 macOS High Sierra·iOS 11 이상에서 재생합니다([caniuse HEVC](https://caniuse.com/hevc)). 같은 브라우저 판이라도 기기에 따라 결과가 갈리므로, 서비스는 `MediaSource.isTypeSupported()`로 코덱 문자열을 물어보고 안 되면 H.264 변형으로 내려가야 합니다.

## 라이브 HEVC 송출에는 향상된 RTMP가 필요합니다 {#11-라이브-h265--거의-안-보급된-현실}

옛 RTMP의 FLV 영상 코덱 번호에는 HEVC가 없습니다. Enhanced RTMP가 FourCC로 HEVC·AV1을 실을 칸을 더했고, OBS는 29.1에서 이를 넣었습니다. 사양과 OBS 지원 날짜는 [RTMP 글](/posts/tech-blurting/rtmp-still-alive/#audio-message에-트랙-id가-없다--멀티-오디오-불가의-진짜-이유)에 있습니다. 송출기가 보낼 수 있어도 받는 서버가 받아야 HEVC 송출이 됩니다.

### 플랫폼이 받는 코덱은 OBS 서비스 목록에 적혀 있습니다 {#실제-도입-현황}

OBS는 송출 서비스마다 받는 영상 코덱을 목록으로 둡니다. OBS 33.0.0에서 YouTube RTMPS는 `h264`·`hevc`·`av1`, Twitch는 `h264`만 적혀 있습니다([services.json 72–74행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L72-L74), [112–116행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L112-L116)). 이 목록은 OBS가 그 서비스로 보낼 때 고를 수 있게 하는 코덱입니다.

### OBS 목록에서 치지직과 SOOP은 H.264만 받습니다 {#17-한국-라이브-시장의-h265}

같은 33.0.0 목록에서 SOOP과 CHZZK(치지직)는 `h264`만 적혀 있습니다([676–678행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L676-L678), [2301–2303행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L2301-L2303)). 32.0.0에서는 SOOP 항목 이름이 AfreecaTV였고 값은 같습니다. 이것은 방송자가 보내는 송출 쪽 설정입니다. 시청자에게 어떤 코덱으로 다시 인코딩해 전달하는지는 이 목록으로 알 수 없고, 공개 자료로 확인하지 못했습니다.

## HDR10 인코딩은 색 태그와 마스터링 메타데이터를 함께 넣습니다 {#12-netflix-4k-hdr-인코딩}

HDR10 출력에는 세 가지가 들어갑니다. 비트스트림의 색 정보(원색 BT.2020, 전달 특성 PQ, 행렬 BT.2020 비상수 휘도), 마스터링 화면 정보 SEI(ST 2086), 콘텐츠 밝기 SEI(MaxCLL·MaxFALL)입니다. 아래는 시험 화면을 10비트로 바꿔 태그와 메타데이터만 붙인 확인용 명령입니다. 마스터링 값은 x265 도움말의 P3 D65 예와 같은 원색입니다.

```bash
ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 1 -vf format=yuv420p10le \
  -c:v libx265 -preset ultrafast -profile:v main10 -tag:v hvc1 \
  -color_primaries bt2020 -color_trc smpte2084 -colorspace bt2020nc \
  -x265-params "colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:master-display=G(13250,34500)B(7500,3000)R(34000,16000)WP(15635,16450)L(10000000,1):max-cll=1000,400:repeat-headers=1" \
  hdr10.mp4
ffprobe -v error -select_streams v -read_intervals %+#1 -show_frames \
  -show_entries frame=color_transfer:frame_side_data -of json hdr10.mp4
```

`ffprobe`는 첫 프레임에 `Mastering display metadata`(최대 1,000, 최소 0.0001cd/m²)와 `Content light level metadata`(1,000 · 400)를, `color_transfer`로 `smpte2084`를 보여 줬습니다. 태그는 픽셀을 바꾸지 않으므로 이 결과는 「PQ라고 적힌 SDR 시험 화면」입니다. 실제로는 PQ로 그레이딩한 원본에 그 마스터링 화면의 값과 실제로 잰 MaxCLL·MaxFALL을 넣습니다. 이 태그는 HEVC 전용도 아닙니다. 전달 특성 번호 16(PQ)·18(HLG)은 H.264와 HEVC가 같이 쓰는 값이고([FFmpeg pixfmt.h 683–687행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavutil/pixfmt.h#L683-L687)), x264 r3222에도 `--transfer`·`--mastering-display`·`--cll` 옵션이 있습니다.

## HLG 라이브는 전달 특성만 arib-std-b67로 표시합니다 {#13-라이브-4k-hdr--hlg로}

HLG는 메타데이터 SEI가 없으므로 색 정보만 맞으면 됩니다. 위 명령에서 `smpte2084`를 `arib-std-b67`로 바꾸고 `master-display`·`max-cll`을 빼면 `color_transfer`가 `arib-std-b67`로 나오고 마스터링·밝기 부가 데이터는 생기지 않았습니다. 라이브에서는 카메라·스위처가 낸 HLG 신호를 10비트 그대로 받아 같은 태그로 인코딩합니다.

## HDR 변형은 VIDEO-RANGE로 SDR과 구분합니다 {#14-abr-ladder-for-4k-hdr}

HLS 다변형 목록의 `VIDEO-RANGE` 속성은 `SDR`·`HLG`·`PQ` 가운데 하나이고, 비트스트림의 전달 특성 번호로 정합니다. 18이면 HLG, 16이면 PQ입니다. 플레이어는 모르는 값의 변형을 고르지 말아야 합니다(SHOULD NOT, [HLS 2판 초안 -22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 애플 규격은 SDR이 아닌 변형이 있으면 이 속성을 반드시 넣으라고 합니다(9.16). HDR 사다리는 SDR 변형을 함께 두어 HDR을 못 그리는 기기가 SDR 변형을 고르게 합니다.

## 아이폰 HDR 영상은 HLG라 PQ 태그만 붙이면 틀립니다 {#16-iphone-hdr-영상의-처리--실무-케이스}

애플은 2021년 2월 12일 아이폰 12 · 12 Pro가 HDR 영상을 Dolby Vision 프로파일 8.4(호환 ID 4, HLG)로, 10비트 HEVC에 녹화한다고 밝혔습니다([Apple Developer, Support HDR video playback, editing, and export in your app](https://developer.apple.com/news/?id=rwbholxw), [보관본](https://web.archive.org/web/20220426033633/https://developer.apple.com/news/?id=rwbholxw)). Dolby 프로파일 표에서 8은 10비트 HEVC 단일 층이고, 호환 표시 4는 전달 특성 18, 곧 HLG입니다. Dolby Vision 메타데이터를 쓰지 않는 기기에서는 이 HLG 기본 층이 영상이 됩니다.

이 파일에 `-color_trc smpte2084`와 PQ 메타데이터만 붙이면 HLG 부호값을 PQ 곡선으로 읽게 됩니다. [[fig-pq-hlg-sdr]]에서 같은 부호값 0.75가 HLG(1,000cd/m² 화면)로는 203cd/m², PQ로는 983cd/m²입니다. HDR10이 필요하면 HLG에서 PQ로 곡선을 실제로 바꿔야 하고, 아니면 `VIDEO-RANGE=HLG` 변형으로 내보내는 편이 단순합니다. SDR로 내리는 FFmpeg `tonemap` 필터는 기본값이 `none`이고([vf_tonemap.c 286–293행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavfilter/vf_tonemap.c#L286-L293)) linear·gamma·clip·reinhard·hable·mobius 중 하나를 고르게 되어 있어, 어느 하나가 표준이 아닙니다.

## HEVC는 압축률보다 디코더와 라이선스 범위를 먼저 봅니다 {#정리하면}

- 같은 화질의 비트 절감은 측정 조건의 값입니다. 참조 인코더의 MOS 기준 59%와 x265 기본값의 34%는 다른 질문의 답입니다.
- HEVC 변형을 넣기 전에 시청 기기의 디코더부터 확인합니다.
- 애플 기기를 겨냥한 HEVC는 fMP4에 `hvc1` 태그로 만듭니다. FFmpeg 기본값은 `hev1`입니다.
- HDR은 곡선(PQ·HLG)과 메타데이터, 10비트를 함께 맞추고 `VIDEO-RANGE`로 표시합니다. 태그만 바꾸면 밝기가 틀립니다.
- 특허 비용은 기기·배포 규모·계약 단위로 따로 확인합니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 06:34–06:52(KST)에 실행했습니다. 인코딩과 VMAF 측정은 각 1회입니다.
- 기종: MacBook Air(Mac17,3, Apple M5 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1. 같은 기계에서 다른 세션의 작업(다른 인코딩 실험, 렌더, 브라우저)이 함께 돌았습니다. 1분 load average는 측정 시작 때 26.28, 인코더 비교 구간에 41.29–174.77, 끝에 약 220이었고(측정 자신의 스레드 포함), x264 → x265 → SVT-AV1 순서라 뒤쪽일수록 부하가 높았습니다. 그래서 벽시계가 아니라 CPU 시간(user + sys, 자식 프로세스 rusage)으로 비교했습니다. 성능·효율 코어가 섞인 칩이라 CPU 시간도 부하의 영향을 완전히 피하지는 못합니다.
- 재현성: 같은 인코딩의 CPU 시간은 재실행에서 약 ±10% 흔들렸습니다. 리뷰 단계의 독립 재측정(load 28–46)에서는 x265 / x264 CPU 시간 비가 2.37배, SVT-AV1 preset 4 / 8이 2.99배였습니다.
- 도구: FFmpeg 9.0.2(Homebrew 9.0.2_1), x264 core 165 r3222, x265 4.3+1-e9b8812, SVT-AV1 v4.2.0, libvmaf 3.2.1(모델 vmaf_v0.6.1).
- 입력: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p(© copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), `https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4`, sha256 `34bbd52a4b89fdf63c8ace50b268da26653a59508288100cd3c23de276db7931`. 원본 자체가 H.264 약 2.1Mbps라 이미 한 번 압축된 영상이고, 위아래 검은 띠가 있습니다(`cropdetect` 결과 대부분 1920×818).
  - `ffmpeg -ss 20 -i sintel_trailer-1080p.mp4 -t 10 -an -c:v ffv1 ref.mkv` (1920×1080, 24fps, 240프레임)
- 인코딩: `ffmpeg -i ref.mkv -an -c:v libx264 -preset medium -crf <C> out.mp4`, 같은 꼴로 `-c:v libx265 -preset medium -crf <C>`, `-c:v libsvtav1 -preset <8|4> -crf <C>`. 그 밖의 설정은 인코더 기본값입니다(SVT-AV1 로그: tune PSNR, gop 161, mini-gop 16).
- CRF 선택: VMAF 평균 93 이상인 가장 큰 정수 CRF를 이분 탐색했습니다. 시도한 CRF는 x264·x265 25·33·29·27·28, SVT-AV1 preset 8 35·48·41·38·39·40, preset 4 41·44·42입니다.
- VMAF: `ffmpeg -i out.mp4 -i ref.mkv -lavfi "[0:v]setpts=N/24/TB[d];[1:v]setpts=N/24/TB[r];[d][r]libvmaf=model=version=vmaf_v0.6.1:n_threads=8:log_fmt=json:log_path=v.json" -f null -`(프레임 번호로 맞춤). 하위 1%는 프레임별 VMAF 240개 중 세 번째로 낮은 값(nearest-rank 1백분위), 평균 kbps는 영상 패킷 크기 합 ÷ 10초, 키프레임 수는 `ffprobe -show_entries packet=flags`의 K 수입니다.
- 태그: `ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -t 1 -c:v libx265 -preset ultrafast [-tag:v hvc1] tag.mp4`. HDR10은 본문 명령, HLG는 거기서 전달 특성을 `arib-std-b67`로 바꾸고 메타데이터 옵션을 뺀 것입니다. 코덱 문자열은 testsrc2 1080p를 `-r 30 -c:v libx265 -tag:v hvc1 -f hls -hls_segment_type fmp4 -master_pl_name master.m3u8`로 내보낸 `master.m3u8`입니다.

## 출처

- [ITU-T H.265](https://www.itu.int/rec/T-REC-H.265) — 판 이력(04/2013 – 01/2026)
- Tan 외, [Video Quality Evaluation Methodology and Verification Testing of HEVC Compression Performance](https://ieeexplore.ieee.org/abstract/document/7254155/), IEEE TCSVT 26(1), 2016 · [본문 PDF](https://d-nb.info/1155834798/34) — 표 VIII
- FFmpeg n9.0.2 소스: [h264_levels.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h264_levels.c#L44-L45) · [h265_profile_level.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/h265_profile_level.c#L34-L35) · [hevc/hevc.h](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/hevc/hevc.h#L130-L131) · [hevc/hevcdec.h](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/hevc/hevcdec.h#L125-L159) · [movenc.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/movenc.c#L9236-L9237) · [pixfmt.h](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavutil/pixfmt.h#L683-L687)
- [Via Licensing Alliance 출범 보도문](https://www.via-la.com/via-licensing-and-mpeg-la/) (2023-05-02) · [Via LA HEVC/VVC 프로그램](https://www.via-la.com/licensing-programs/hevc-vvc/)
- Access Advance: [Via LA HEVC/VVC 프로그램 인수](https://accessadvance.com/2025/12/15/access-advance-and-via-licensing-alliance-announce-hevc-vvc-program-acquisition/) (2025-12-15) · [VDP 풀 발표](https://accessadvance.com/2025/01/16/access-advance-announces-video-distribution-patent-pool-in-response-to-market-demand/) (2025-01-16)
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 1.3b, 1.5, 1.6a, 1.6b, 1.10, 9.16, 부록 코덱 문자열
- [ITU-R BT.2100](https://www.itu.int/rec/R-REC-BT.2100) · [BT.2100-3 PDF](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.2100-3-202502-I!!PDF-E.pdf) — PQ·HLG 식, 기준 흰색 · [ITU-R BT.1886](https://www.itu.int/rec/R-REC-BT.1886) · [ITU-R BT.2390-12](https://www.itu.int/pub/R-REP-BT.2390) — 6.4절 SDR 화면 호환
- [SMPTE ST 2084:2014](https://pub.smpte.org/doc/st2084/20140816-pub/) · [SMPTE ST 2086:2014](https://pub.smpte.org/doc/st2086/20141013-pub/) · [ARIB STD-B67](https://www.arib.or.jp/english/std_tr/broadcasting/desc/std-b67.html)
- [CTA, Video Technology Consumer Definitions](https://cdn.cta.tech/cta/media/media/membership/pdfs/video-technology-consumer-definitions.pdf) — HDR10 Media Profile · [HDR10+](https://hdr10plus.org/) — 동적 메타데이터, 관리비
- [Dolby Vision bitstream profiles](https://ott.dolby.com/OnDelKits/Dolby_Vision_Online_Delivery_Kit/v1/Documentation/Specs/Visio_Profiles/help_files/topics/c_dovi_profiles_public.html) · [Apple Developer, Support HDR video playback, editing, and export in your app](https://developer.apple.com/news/?id=rwbholxw)
- [HTTP Live Streaming 2nd Edition, draft-pantos-hls-rfc8216bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) — VIDEO-RANGE
- [caniuse, HEVC/H.265 video format](https://caniuse.com/hevc) · [같은 데이터 hevc.json](https://github.com/Fyrd/caniuse/blob/main/features-json/hevc.json) (2026-11-13 확인, caniuse.com은 자동 접속을 막아 데이터 파일로 확인)
- [OBS Studio 33.0.0 rtmp-services/services.json](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json)
- [Streaming Media, BBC Streams FIFA World Cup in UHD HDR, But Not to All Viewers](https://www.streamingmediaglobal.com/Articles/Editorial/Featured-Articles/BBC-Streams-FIFA-World-Cup-in-UHD-HDR-But-Not-to-All-Viewers-125407.aspx) (2018-06-04)
- [Sintel](https://durian.blender.org/sharing/) — 시험 영상, © copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

다음 편: [AV1의 로열티 프리는 특허 풀이 없다는 뜻이 아닙니다](/posts/tech-blurting/av1-vp9-deep-dive/)
