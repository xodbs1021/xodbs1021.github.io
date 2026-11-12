---
title: "AV1의 로열티 프리는 특허 풀이 없다는 뜻이 아닙니다"
date: 2026-06-20T22:54:28+09:00
lastmod: "2026-11-13T06:55:00+09:00"
description: "AOMedia의 AV1 특허 허락은 회원이 아니어도 로열티 없이 받지만, 그 허락 밖의 특허권자는 따로 풀을 엽니다. On2 인수 · VP8 공개 · VP9 확정 · AOMedia 설립 · AV1 1.0과 정오표의 날짜, Sisvel AV1 풀의 기기 요율과 Access Advance의 스트리밍 풀, av01 코덱 문자열의 레벨 표기를 1차 문서로 확인하고, SVT-AV1 4.2.0 preset 4 · 6 · 8 · 10의 CPU 시간과 크기를 Sintel 예고편 10초로 직접 쟀습니다."
categories: ["tech-blurting"]
tags: ["AV1", "VP9", "SVT-AV1", "AOMedia", "특허 라이선스", "AVIF"]
draft: false
---

AV1은 로열티 프리 코덱입니다. 그런데 AOMedia가 주는 것은 AV1을 만든 회사들의 특허를 누구나 로열티 없이 쓰게 하는 허락이지, 다른 특허권자의 청구를 막는 장치가 아닙니다. 2019년 3월 Sisvel이 AV1 기기 특허 풀을 열었고, 지금 화면이 있는 기기 한 대에 €0.32를 받습니다. 2025년 1월에는 Access Advance가 HEVC · VVC · VP9 · AV1을 한 로열티로 묶은 스트리밍 배포사용 풀을 냈습니다. 압축 효율도 따로 확인해야 하는 값입니다. SVT-AV1 4.2.0으로 Sintel 예고편 10초를 같은 CRF 35에 두고 preset만 바꾸자, preset 4는 기본값인 preset 8보다 파일이 약 20% 작았지만(1,262 대 1,573kbps) CPU 시간은 약 3.1배(89.0 대 28.4초)였습니다(아래 「측정 조건」).

## 구글은 2010년 On2를 인수해 VP8을 공개했습니다 {#1-google의-코덱-인수--2010년-on2-technologies}

Google은 2010년 2월 19일 On2 Technologies 인수를 마쳤다고 발표했고, 거래 가치는 약 1억 2,460만 달러였습니다([Google 보도문 재게재](https://www.design-reuse.com/news/22784/google-on2-acquisition.html)). 2009년에 인수를 발표했을 때보다 약 1,800만 달러 많은 값입니다([Computerworld](https://www.computerworld.com/article/1553654/google-closes-on2-acquisition-for-124-6m.html)). On2는 Flash Player 등에 영상 압축 기술을 대던 회사였습니다.

석 달 뒤인 2010년 5월 19일 Google은 WebM 프로젝트를 발표하면서 On2의 VP8을 「BSD식, 로열티 없는 라이선스」로 공개했습니다. WebM은 VP8 영상, Vorbis 오디오, Matroska의 부분집합인 컨테이너로 이뤄집니다([WebM 블로그 보관본](http://web.archive.org/web/20261102214652/http://blog.webmproject.org/2010/05/introducing-webm-open-web-media-project.html)). 특허는 Google이 자기 특허를 무상 · 로열티 없이 쓰게 허락하되, 허락받은 쪽이 그 구현을 특허 침해로 소송하면 허락이 끝나는 구조입니다([WebM 추가 특허 허락](https://www.webmproject.org/license/additional/)). 이 구조는 뒤의 AOMedia 허락에도 이어집니다.

## VP9는 2013년 6월에 확정됐습니다 {#2-vp9--2012년-h265-대항}

Google은 2013년 6월 12일 개발자 목록에 「어젯밤부로 VP9(profile 0) 비트스트림은 확정(FINAL)」이라고 알렸습니다([webm-discuss](https://groups.google.com/a/webmproject.org/g/webm-discuss/c/UzoX7owhwB0/m/I80ENJ7YfZUJ)). 6월 17일부터는 libvpx 기본 분기에서 VP9 인코딩 · 디코딩이 켜졌습니다([WebM VP9](https://www.webmproject.org/vp9/), [미국 의회도서관 형식 설명](https://www.loc.gov/preservation/digital/formats/fdd/fdd000579.shtml)). 규격 문서는 늦어서, WebM 프로젝트가 지금 내건 문서도 2017년 2월의 v0.7 초안이며 「최종이 아니다」라고 적혀 있습니다.

Netflix는 2016년 12월 다운로드용 VP9 인코딩을 만들며, 1080p 원본 600편에서 기존 H.264 Main보다 같은 화질에 평균 36% 적은 비트를 썼다고 밝혔습니다(회사 측정, PSNR · VMAF 기준 BD-rate, [Netflix 기술 블로그](https://netflixtechblog.com/more-efficient-mobile-encodes-for-netflix-downloads-625d7b082909), [보관본](http://web.archive.org/web/20261025063641/https://netflixtechblog.com/more-efficient-mobile-encodes-for-netflix-downloads-625d7b082909)). 설정만 바꾼 H.264 High도 15–19% 줄었으므로 36%가 모두 코덱 차이는 아닙니다.

### YouTube는 2015년 VP9로 같은 화질에 대역을 줄였다고 밝혔습니다 {#youtube의-vp9-채택}

YouTube 엔지니어링 블로그는 2015년 4월 6일 VP9가 「다른 알려진 코덱의 절반 대역으로」 HD와 4K를 보낸다고 적었습니다. 지난 1년 VP9 시청은 250억 시간을 넘었다고 했습니다([YouTube 블로그 보관본](http://web.archive.org/web/20220906064407/https://youtube-eng.googleblog.com/2015/04/vp9-faster-better-buffer-free-youtube.html)). 「절반」은 시험 조건 없이 쓴 회사 주장이고, 글 안의 화질 비교 대상은 「이전 H.264 트랜스코드」였습니다.

### VP9는 하드웨어 인코더가 적어 라이브 송출에서 드물었습니다 {#vp9의-한계}

라이브 송출은 송출자의 PC에서 실시간으로 인코딩해야 합니다. NVIDIA GPU의 영상 인코더 NVENC는 H.264 · HEVC · AV1을 인코딩하지만 VP9 인코더는 없습니다([NVIDIA 지원 표](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new)). OBS 33.0.0의 송출 서비스 목록에도 VP9를 받는 항목은 하나도 없습니다. Twitch는 서버에서 VP9로 바꿔 내보내려고 FPGA 기반 실시간 VP9 인코더를 골랐고, 2018년 12월 일부 e스포츠 채널에 곧 쓰겠다고 밝혔습니다([Twitch 블로그](https://blog.twitch.tv/en/2018/12/19/how-v-p9-delivers-value-for-twitch-s-esports-live-streaming-35db26f6322f/)).

시청 쪽에서는 Safari가 WebM의 VP9를 온전히 재생하기 시작한 판이 macOS용 14.1(2021-04-26)과 iOS용 17.4(2024-03-05)입니다([caniuse WebM](https://caniuse.com/webm), 2026-11-13 확인).

## 2015년 9월 일곱 회사가 AOMedia를 세웠습니다 {#3-av1-이전의-분열--2015년-즈음}

AOMedia(Alliance for Open Media)는 2015년 9월 1일 날짜줄로 설립을 발표했습니다. 창립 회원은 Amazon, Cisco, Google, Intel, Microsoft, Mozilla, Netflix 일곱 곳이고, 첫 과제로 「개방형 로열티 프리 영상 코덱 규격」을 내걸었습니다([AOMedia 보도문](https://aomedia.org/press%20releases/alliance-to-deliver-next-generation-open-media-formats/)). Apple은 2018년 1월 회원 목록에 올랐습니다. 이 날짜는 AOMedia 문서가 아니라 보도로 확인했습니다([MacRumors](https://www.macrumors.com/2018/01/04/apple-joins-alliance-for-open-media/)). 2026년 11월 13일 기준 운영위원은 Amazon, Apple, Cisco, Google, Intel, Meta, Microsoft, Mozilla, Netflix, NVIDIA, Samsung, Tencent 열두 곳입니다([AOMedia 회원](https://aomedia.org/about/members/)).

### AOMedia 특허 허락은 회원이 아니어도 받습니다 {#4-aomedia-결성--2015년}

[AOMedia 특허 라이선스 1.0](https://aomedia.org/license/patent-license/)에서 허락받는 사람(Licensee)은 「이 라이선스로 특허 권리를 행사하는 모든 개인 또는 단체」입니다. 허락하는 쪽(Licensor)은 규격을 만든 작업반에 참여한 회원들이고, 이들은 AV1 구현에 꼭 필요한 자기 특허를 전 세계에서 무상 · 로열티 없이 쓰게 합니다. 조건은 둘입니다. 구현을 만들어 팔거나 배포하는 쪽도 자기의 필수 특허를 같은 조건으로 내놓아야 하고(1.2.1절), AV1 구현이 필수 특허를 침해한다고 소송을 걸면 그 회사가 받은 허락이 소송을 건 날로 거슬러 끝납니다(1.3절).

이 허락은 Licensor의 특허만 덮습니다. 작업반 밖 회사의 특허는 이 문서와 상관이 없고, 「로열티 프리」의 범위가 여기서 정해집니다.

## AV1 1.0은 2018년 3월 나왔고 검증판과 정오표가 뒤따랐습니다 {#5-av1의-발표--2018년}

AOMedia는 2018년 3월 28일 AV1 1.0 규격을 공개했습니다([AOMedia 보도문](https://aomedia.org/press%20releases/the-alliance-for-open-media-kickstarts-video-innovation-era-with-av1-release/)). 규격 저장소에는 2018년 6월 25일 `v1.0.0` 태그가, 2019년 1월 8일 `v1.0.0-errata1` 태그가 찍혔습니다. 지금 공개된 PDF는 「Version 1.0.0 with Errata 1」이고, 표지에 이 판이 1.0.0을 대체하며 참조 디코더 libaom v1.0.0-errata1과 맞춰 검증했다고 적혀 있습니다([AV1 규격 PDF](https://aomediacodec.github.io/av1-spec/av1-spec.pdf), [av1-spec 태그](https://github.com/AOMediaCodec/av1-spec/tags)).

AV1 디코더는 복원한 프레임을 넣어 둘 참조 슬롯 8개(`NUM_REF_FRAMES`)를 두고, 프레임 하나는 그 가운데 7개(`REFS_PER_FRAME`)를 골라 참조합니다. 인코더는 화면에 내보내지 않을 프레임을 먼저 부호화해 슬롯에 넣었다가, 나중에 그 프레임을 다시 부호화하지 않고 그대로 표시하게 할 수 있습니다. 영상에서 강조색이 지금 부호화하거나 표시하는 프레임입니다.

{{< motion scene="Av1RefSlots" id="fig-av1-ref-slots" kind="개념도" caption="AV1 디코더의 참조 슬롯 8개 가운데 프레임마다 7개를 참조합니다. 인코더는 숨은 ALTREF 프레임(show_frame = 0)을 먼저 부호화해 슬롯에 넣고, 나중에 show_existing_frame으로 그 프레임을 다시 부호화하지 않고 표시합니다." >}}

뒤 프레임을 미리 참조로 두는 점은 H.264의 B 프레임 구조와 닮았지만, AV1에서는 그 프레임을 표시하지 않고 넣어 두었다가 표시를 따로 지시합니다.

### 같은 화질에서 비트 차이는 시험 조건과 함께만 말합니다 {#av1-vs-h265-vs-vp9--압축률-비교}

AV1 발표 보도문은 「회원사의 독립 시험에서 경쟁 코덱보다 평균 30% 더 압축한다」고 적었지만, 어떤 영상 · 인코더 · 지표로 쟀는지는 밝히지 않았습니다. Netflix는 2025년 12월 1일 AV1이 전체 시청의 약 30%를 차지하고, AV1 세션이 AVC · HEVC 세션보다 대역을 3분의 1 덜 쓰면서 VMAF는 AVC보다 4.3점, HEVC보다 0.9점 높았다고 밝혔습니다([Netflix 기술 블로그](https://netflixtechblog.com/av1-now-powering-30-of-netflix-streaming-02f592242d80), [보관본](http://web.archive.org/web/20261024092619/https://netflixtechblog.com/av1-now-powering-30-of-netflix-streaming-02f592242d80)). 같은 영상을 코덱만 바꿔 비교한 시험이 아니라, 기기와 망이 서로 다른 실제 시청 세션을 모은 회사 운영 집계입니다.

조건을 고정하면 숫자가 달라집니다. Sintel 예고편 10초를 평균 VMAF 93에 맞춰 인코딩하니 x264 medium은 1,799kbps, SVT-AV1 preset 8은 1,201kbps, preset 4는 867kbps를 썼습니다([H.265 글의 실측](/posts/tech-blurting/h265-hdr-deep-dive/#4-인코딩-비용--h264-대비-큰-부담)). 영상 하나에서 인코더 기본값을 비교한 결과입니다.

## AV1 인코더는 preset 하나로 CPU 시간이 크게 갈립니다 {#6-av1의-엄청난-부담--인코딩-시간}

SVT-AV1의 preset은 x264의 preset처럼 탐색 범위와 부호화 도구를 한 번에 고르는 값입니다. 4.2.0판의 범위는 -1–13이고 숫자가 클수록 빠릅니다. 기본값은 preset 8, CRF 35(범위 1–70), 키프레임 간격 약 5초, PSNR에 맞춘 tune 1입니다([SVT-AV1 4.2.0 Parameters.md](https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/v4.2.0/Docs/Parameters.md)). 값을 주지 않은 실행 로그에도 같은 값이 찍혔고, 키프레임 간격은 161프레임(24fps에서 약 6.7초)이었습니다.

Sintel 예고편 10초(1080p 24fps)를 CRF 35로 고정하고 preset만 4 · 6 · 8 · 10으로 바꿔 인코딩했습니다. 첫 그래프가 인코딩에 쓴 CPU 시간(user + sys)입니다.

{{< chart id="fig-svt-preset-cpu" kind="실측" caption="SVT-AV1 preset별 CPU 시간(초). 같은 10초 1080p24 입력을 CRF 35로 인코딩. preset 4가 89.0초로 기본값 preset 8(28.4초)의 약 3.1배. 2026-11-13, MacBook Air(M5), FFmpeg 9.0.2, SVT-AV1 4.2.0, 1회, 측정 중 기계 부하가 높았습니다." source="아래 「측정 조건」" height="260px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 16, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "value", "name": "CPU 초", "min": 0, "max": 100, "interval": 25},
  "yAxis": {"type": "category", "inverse": true, "data": ["preset 4", "preset 6", "preset 8(기본)", "preset 10"]},
  "series": [
    {"type": "bar", "barWidth": 18, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [89.0, 55.2, {"value": 28.4, "itemStyle": {"color": "#087f8b"}}, 17.3]}
  ]
}
{{< /chart >}}

느린 preset일수록 같은 CRF에서 파일이 작아졌습니다. 둘째 그래프는 같은 인코딩의 평균 비트레이트입니다.

{{< chart id="fig-svt-preset-kbps" kind="실측" caption="같은 인코딩의 평균 비트레이트(kbps). preset 4가 1,262kbps, preset 10이 1,626kbps. 같은 CRF 35여도 평균 VMAF는 preset 4 · 6 · 8 · 10에서 95.7 · 95.5 · 94.9 · 93.4로 달랐습니다." source="아래 「측정 조건」" height="260px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 16, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "value", "name": "kbps", "min": 0, "max": 2000, "interval": 500},
  "yAxis": {"type": "category", "inverse": true, "data": ["preset 4", "preset 6", "preset 8(기본)", "preset 10"]},
  "series": [
    {"type": "bar", "barWidth": 18, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [1262, 1370, {"value": 1573, "itemStyle": {"color": "#087f8b"}}, 1626]}
  ]
}
{{< /chart >}}

CRF를 고정한 비교라 크기와 화질이 함께 움직였으므로 「같은 화질에서 몇 % 작다」로 읽으면 안 됩니다. 같은 VMAF로 맞춘 H.265 글 측정에서는 preset 4가 preset 8보다 28% 적은 비트에 CPU 시간 3.3배였습니다. 측정 내내 기계 부하가 높았습니다(아래 「측정 조건」).

참조 구현 libaom의 FFmpeg 인코더 `libaom-av1`은 빌드에 따라 빠져 있습니다. 이 맥의 Homebrew FFmpeg 9.0.2에도 없고 명령행 도구 `aomenc` 3.15.1만 있어, libaom의 속도는 재지 않았습니다.

### SVT-AV1은 Intel과 Netflix가 2019년 공개했고 2020년 AOMedia로 옮겼습니다 {#svt-av1--intel--netflix의-해결}

Intel과 Netflix는 2019년 4월 8일 오픈소스 AV1 인코더 SVT-AV1을 함께 만든다고 발표했습니다([Netflix 기술 블로그](https://netflixtechblog.com/introducing-svt-av1-a-scalable-open-source-av1-framework-c726cce3103a), [보관본](http://web.archive.org/web/20260815115028/https://netflixtechblog.com/introducing-svt-av1-a-scalable-open-source-av1-framework-c726cce3103a)). 프로젝트 README는 이 인코더를 Intel이 Netflix와 함께 시작했고, 2020년 8월 AOMedia의 소프트웨어 구현 작업반(SIWG)이 넘겨받았다고 적습니다([SVT-AV1 README](https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/master/README.md)).

### 하드웨어 AV1 인코딩은 2022년 GPU부터입니다 {#하드웨어-인코더--2022년부터}

첫 하드웨어 AV1 인코더는 2022년 6월 Intel Arc, 10월 NVIDIA RTX 4090에 들어갔고, 세대별 차이는 [NVENC 글](/posts/tech-blurting/nvenc-gpu-transcoding/#11-nvenc-h265--av1--차세대-코덱-실시간)에서 다뤘습니다. 헷갈리기 쉬운 두 경우만 짚습니다. Intel 13세대 코어(Raptor Lake) 내장 그래픽은 AV1을 디코딩만 합니다. Intel 미디어 드라이버 표에서 Raptor Lake가 속한 TGLx 열은 AV1이 「D」이고, 인코딩까지 하는 「D/E」는 Meteor Lake(MTLx)부터입니다([intel/media-driver](https://github.com/intel/media-driver/blob/master/README.md)). Apple M3도 2023년 10월 발표에서 미디어 엔진이 「처음으로 AV1 디코딩을 지원한다」고만 했고 인코딩은 언급하지 않았습니다([Apple 뉴스룸](https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/)).

## 재생은 dav1d와 하드웨어 디코더로 갈립니다 {#7-av1-디코딩-부담}

하드웨어 디코더가 없는 기기는 소프트웨어로 풉니다. VideoLAN의 dav1d가 대표적인 AV1 소프트웨어 디코더이고, FFmpeg도 `libdav1d`로 씁니다. 브라우저는 caniuse 기준(2026-11-13 확인) Chrome 70(2018-10-16), Firefox 67(2019-05-21), Edge 121(2024-01-26)부터 AV1을 재생합니다. Safari 17과 iOS 17은 「하드웨어 디코더가 있는 기기에서만」 재생하는 부분 지원이고, caniuse가 드는 예가 iPhone 15 Pro와 M3 MacBook Pro입니다([caniuse AV1](https://caniuse.com/av1)).

TV 쪽은 2021–2025년 Netflix 인증에 제출된 TV · 셋톱박스 · 스트리밍 스틱의 88%가 AV1을 지원했다고 앞의 2025년 글이 밝혔습니다. 제출된 신제품 기준이라 이미 집에 있는 기기의 비율은 아닙니다.

## 서비스의 AV1 사용은 공식 발표로만 확인합니다 {#8-av1-적용-현황--2024년}

시청 쪽 사용은 Netflix처럼 회사가 밝힌 것만 확인할 수 있고, 송출 쪽은 OBS가 서비스별로 받는 코덱을 적어 둡니다. [OBS 33.0.0 services.json](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json)에서 YouTube RTMPS 항목은 h264 · hevc · av1을 받고([112–116행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L112-L116)), Twitch([72–74행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L72-L74)), 치지직(CHZZK, [2301–2303행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L2301-L2303)), SOOP([676–678행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L676-L678))은 h264만 받습니다. 이 목록은 송출기가 보낼 수 있는 코덱이고, 플랫폼이 시청자에게 보내는 코덱은 이 목록으로 알 수 없습니다.

### Twitch는 AV1 수신을 아직 일반 공개하지 않았습니다 {#9-twitch-av1-베타--실제-사례}

Twitch는 2024년 1월 8일 송출자의 GPU로 여러 화질을 만들어 보내는 Enhanced Broadcasting 베타를 열면서, 이 베타가 「HEVC와 AV1 실험」의 길을 연다고 쓰고 NVIDIA와 함께 AV1을 Twitch로 가져오려 작업 중이라고 적었습니다([Twitch 블로그](https://blog.twitch.tv/en/2024/01/08/introducing-the-enhanced-broadcasting-beta/)). 2026년 6월 17일 2K 송출을 모든 파트너 · 제휴 스트리머에게 열 때는 2K에 HEVC, 1080p 이하에 AVC를 쓴다고 했고 AV1은 언급하지 않았습니다([Twitch 블로그](https://blog.twitch.tv/en/2026/06/17/introducing-dual-format-and-2k-streaming-on-twitch/)). 확인한 Twitch 공식 글 두 편에는 AV1을 받는다는 문장이 없습니다.

## AVIF는 AV1 인트라 프레임을 HEIF 그릇에 담습니다 {#10-avif--av1의-이미지-포맷-부산물}

AVIF(AV1 Image File Format)는 AV1로 압축한 그림을 ISO 이미지 파일 형식 HEIF에 담는 규격입니다. AVIF 규격 v1.2.0(2025-10-16)에서 AV1 그림 항목의 데이터는 AV1 영상의 동기 표본, 곧 앞 프레임 없이 풀 수 있는 프레임과 같아야 하고, 정지 그림은 `avif`, 그림 묶음은 `avis` 브랜드로 표시합니다([AVIF 규격](https://aomediacodec.github.io/av1-avif/)).

### 주요 브라우저가 AVIF를 읽습니다 {#브라우저-지원}

caniuse 기준(2026-11-13 확인) Chrome 85(2020-08-25), Firefox 93(2021-10-05), iOS Safari 16.0(2022-09-12), Edge 121(2024-01-26)부터 AVIF를 읽습니다. macOS Safari는 16.1(2022-10-24)부터이지만 macOS 13 이상에서만이고 움직이는 그림 묶음은 빠진 부분 지원입니다([caniuse AVIF](https://caniuse.com/avif)).

## av01.0.08M.08은 Main 프로파일 레벨 4.0입니다 {#11-av1-코덱-문자열--mime-표기}

HLS 목록의 `CODECS`나 `MediaSource.isTypeSupported()`에 쓰는 AV1 코덱 문자열은 [AV1 ISOBMFF 바인딩](https://aomediacodec.github.io/av1-isobmff/) v1.3.0 5절이 정합니다. 형식은 `av01.<프로파일>.<레벨><티어>.<비트 깊이>`이고 뒤에 색 정보를 붙일 수 있습니다.

```text
av01.0.08M.08
     │ │ │ └─ 08 = 비트 깊이 8
     │ │ └─── M  = Main 티어(seq_tier 0), H = High 티어
     │ └───── 08 = seq_level_idx 8 → 레벨 4.0
     └─────── 0  = seq_profile 0(Main)
```

레벨 칸은 레벨 숫자가 아니라 시퀀스 헤더의 `seq_level_idx`를 두 자리로 쓴 값입니다. AV1 규격 부록 A는 레벨 X.Y를 X = 2 + (seq_level_idx >> 2), Y = seq_level_idx & 3으로 정합니다. 그래서 `05`는 레벨 3.1, `08`은 4.0, `09`는 4.1입니다.

레벨 4.0의 최대 표시율은 초당 70,778,880 표본입니다. 1080p30은 1920 × 1080 × 30 = 62,208,000이라 들어가지만, 1080p60은 124,416,000이라 레벨 4.1(141,557,760)이 필요합니다(계산값). SVT-AV1로 1080p30 HLS를 만들자 FFmpeg 9.0.2의 hls 먹서가 목록에 `CODECS="av01.0.08M.08"`을 적었고, 시퀀스 헤더의 `seq_level_idx`도 8이었습니다.

## 다섯 코덱의 규격 연도와 라이선스 창구가 다릅니다 {#12-코덱-종합-비교--2024년-현황}

| 코덱 | 첫 판 | 만든 곳 | 특허 라이선스 창구(2026-11-13 확인) |
|---|---|---|---|
| H.264 | 2003년 5월 | ITU-T · ISO/IEC | Via LA AVC 프로그램(운영 중) |
| H.265 | 2013년 4월 | ITU-T · ISO/IEC | Access Advance(HEVC Advance, 2025-12 인수한 Via LA HEVC/VVC), VDP |
| VP9 | 2013년 6월 | Google | Google WebM 특허 허락, Sisvel VP9 풀, Access Advance VDP |
| AV1 | 2018년 3월 | AOMedia | AOMedia 특허 라이선스 1.0, Sisvel AV1 풀, Access Advance VDP |
| VVC(H.266) | 2020년 8월 | ITU-T · ISO/IEC | Access Advance(VVC Advance, Via LA 인수분) |

H.264 특허가 이미 다 끝났다는 설명도 흔하지만, [Via LA의 AVC 프로그램](https://www.via-la.com/licensing-programs/avc-h-264/)은 2026년 11월 1일에도 특허 목록을 갱신했고 OTT · 소셜 미디어용 요율 표를 두고 있습니다. H.265 쪽 창구가 합쳐진 과정은 [H.265 글](/posts/tech-blurting/h265-hdr-deep-dive/#3-h265의-진짜-문제--라이센스-지옥)에, VVC의 판은 [ITU-T H.266](https://www.itu.int/rec/T-REC-H.266)에 있습니다. 굵은 화살표가 규격을 만든 쪽의 로열티 없는 허락입니다.

```mermaid {#fig-codec-license-windows kind="개념도" caption="코덱별 특허 라이선스 창구. AV1과 VP9에는 규격을 만든 쪽의 로열티 없는 허락(굵은 화살표)이 있지만, 그 밖의 특허권자가 연 기기용 풀(Sisvel)과 스트리밍 배포사용 풀(Access Advance VDP)도 함께 있습니다. 2026-11-13 각 창구의 공식 페이지 기준이며 개별 계약은 그리지 않았습니다." source="https://aomedia.org/license/patent-license/"}
flowchart LR
  accTitle: 코덱별 특허 라이선스 창구
  accDescr: AV1은 AOMedia 특허 허락, Sisvel AV1 풀, Access Advance VDP로, VP9는 Google WebM 허락, Sisvel VP9 풀, VDP로, H.265는 Access Advance HEVC 풀과 VDP로, H.264는 Via LA AVC로 이어진다.
  AV1["AV1"] ==> AOM["AOMedia 특허 허락 1.0<br/>로열티 없음 · 누구나"]
  AV1 --> SA["Sisvel AV1 풀<br/>기기당 요율"]
  AV1 --> VDP["Access Advance VDP<br/>스트리밍 배포사"]
  VP9["VP9"] ==> GW["Google WebM 허락<br/>로열티 없음"]
  VP9 --> SV["Sisvel VP9 풀"]
  VP9 --> VDP
  HEVC["H.265"] --> VDP
  HEVC --> AA["Access Advance<br/>HEVC 풀"]
  AVC["H.264"] --> VIA["Via LA AVC"]
```

풀에 들어 있다고 그 특허가 AV1에 꼭 필요하다고 판정된 것은 아닙니다. 그래도 기기를 팔거나 스트리밍을 배포하는 회사는 이 창구들의 요구를 계산에 넣어야 합니다.

## 코덱 선택은 시청 기기의 디코더부터 거꾸로 정합니다 {#13-실무-결정-가이드}

먼저 시청 기기가 그 코덱을 하드웨어로 푸는지 봅니다. 소프트웨어 디코딩은 휴대폰 배터리를 씁니다. 그다음 그 코덱을 받는 송출 경로가 있는지, 서버에서 다시 인코딩할 CPU · GPU 예산이 있는지 봅니다. 라이선스는 기기 판매인지 스트리밍 배포인지에 따라 다른 창구를 확인합니다. 하드웨어 디코더가 없는 기기를 위해 H.264 변형을 함께 두는 구성이 출발점입니다.

## 라이브 AV1은 수신 경로부터 열려야 합니다 {#14-av1의-미래--라이브-스트리밍-진입-가능성}

라이브 AV1은 고리 넷이 모두 이어져야 시청자에게 닿습니다. 송출자의 GPU가 AV1을 인코딩하고, 송출 규약이 AV1을 실어 나르고, 플랫폼이 받아서 다시 인코딩하고, 시청 기기가 풉니다. 둘째 고리에서 옛 RTMP의 영상 코덱 번호에는 AV1이 없었고, Enhanced RTMP가 그 칸을 더했습니다([RTMP 글](/posts/tech-blurting/rtmp-still-alive/#audio-message에-트랙-id가-없다--멀티-오디오-불가의-진짜-이유)). 셋째 고리에서 OBS 33.0.0 목록에 AV1이 적힌 항목은 YouTube RTMPS와 Dolby OptiView Real-time 둘뿐입니다. 다시 인코딩하는 비용은 위 측정으로 가늠할 수 있습니다. 가장 빠르게 잰 preset 10도 10초 영상에 CPU 17.3초를 써서, 1080p24 한 채널에 이 맥의 코어 약 1.7개 분량이 듭니다(CPU 시간 ÷ 영상 길이, 고성능 · 효율 코어가 섞인 계산값).

## Sisvel은 2019년 AV1 기기 특허 풀을 만들었습니다 {#15-sisvel--av1에-대한-라이센스-위협}

Sisvel은 2019년 3월 27일 VP9와 AV1에 대한 특허 풀 두 개를 발표했습니다. 창립 특허권자는 JVCKENWOOD, NTT, Orange, Philips, Toshiba IPR Solutions였습니다([Sisvel 보도문](https://www.sisvel.com/news-events/news/sisvel-announces-the-launch-of-its-video-coding-licensing-platform)). AOMedia는 4월 8일 성명에서 이 발표가 「AOMedia가 떠나려던 바로 그 환경」을 지지한다고 반박했습니다([AOMedia 성명](https://aomedia.org/press%20releases/the-alliance-for-open-media-statement/)).

[Sisvel AV1 프로그램](https://www.sisvel.com/licensing-programmes/audio-and-video-coding-decoding/video-coding-platform-av1/)의 지금 요율은 기기 단위입니다. 화면이 있는 소비자 기기는 한 대에 €0.32, 화면이 없는 기기는 €0.11이고, 계약 의무를 모두 지키는 사업자는 €0.24와 €0.08을 냅니다. 대상은 AV1을 쓰는 소비자 제품이고 칩셋 같은 부품은 빠집니다. 요율표에 콘텐츠나 스트리밍 단위의 항목은 없습니다. 지금 특허권자 목록에는 21곳이 있고 ETRI, KAIST, KBS, SK텔레콤 같은 한국 기관도 들어 있습니다.

스트리밍 쪽 풀은 그 뒤에 생겼습니다. Access Advance는 2025년 1월 16일 HEVC · VVC · AV1 · VP9의 필수 특허를 한 로열티로 묶은 VDP(Video Distribution Patent) 풀을 발표했습니다. 대상은 인터넷 영상 배포사이고, 요율은 배포사의 사업 규모에 따라 고정 등급으로 나눈다고 했습니다. 요율은 발표 뒤 시장 의견을 듣고 공개하겠다고 했습니다([Access Advance 보도문](https://accessadvance.com/2025/01/16/access-advance-announces-video-distribution-patent-pool-in-response-to-market-demand/)).

## AOMedia는 2026년 5월 AV2 1.0.0을 냈습니다 {#16-미래--코덱-경쟁-구도}

AV2 규격 사이트는 2026년 5월 28일을 v1.0.0 공개일로 적고, 참조 소프트웨어 AVM을 함께 내놓았습니다([AV2 규격](https://av2.aomedia.org/)). 보도문은 6월 9일 날짜줄로 나왔고 「같은 비트레이트에서 더 높은 화질」을 말했지만 압축 효율을 수치로 내지는 않았습니다([AOMedia 보도문](http://aomedia.org/press%20releases/Alliance-for-Open-Media-Releases-AV2-Codec/)). ITU-T와 ISO/IEC 쪽의 VVC(H.266)는 2020년 8월 첫 판이 나왔고 2026년 1월 판이 현행입니다. AV1은 2018년 규격에서 Safari의 부분 지원(2023-09)까지 5년이 걸렸으니, 새 규격도 하드웨어 디코더가 깔리기까지 시간이 걸립니다.

## 로열티 프리와 압축 효율은 따로 확인해야 합니다 {#정리하면}

AV1을 「로열티 프리」라고 할 때 확인할 것은 누구의 특허가 그 허락에 들어 있는지입니다. AOMedia 허락은 회원이 아니어도 받지만, 규격을 만든 회사들의 특허만 덮습니다. 기기를 파는 쪽은 Sisvel의 기기 요율을, 스트리밍으로 배포하는 쪽은 Access Advance VDP를 함께 따져야 합니다. 압축 효율은 그와 별개로 자기 영상과 인코더 설정에서 같은 VMAF에 맞춰 다시 잽니다. preset 하나만 바꿔도 CPU 시간이 몇 배로 달라집니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 06:34–06:52(KST)에 실행했습니다. 각 설정은 1회 인코딩 · 1회 측정입니다. preset 4 · 6 · 10은 06:48–06:52에 차례로 돌렸고, preset 8 CRF 35는 같은 실행의 06:41에 같은 VMAF 목표 비교의 첫 점으로 잰 결과를 그대로 썼습니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1. 같은 기계에서 다른 세션의 작업(브라우저, 다른 렌더 · 인코딩 실험)이 함께 돌았습니다. 10초마다 기록한 1분 load average는 측정 시작 26.28에서 끝 220.76까지 올랐고, 인코딩 직전 값은 preset 4가 114.68, 6이 137.39, 8이 119.30, 10이 216.74였습니다(이 값에는 이 측정의 인코더 스레드도 들어 있습니다). 그래서 벽시계 시간은 쓰지 않고 CPU 시간(user + sys, 자식 프로세스의 `getrusage`)으로 비교했습니다. CPU 시간도 고성능 · 효율 코어 배정과 부하의 영향을 받습니다. 온도와 클럭은 기록하지 않았습니다.
- 도구: FFmpeg 9.0.2(Homebrew 9.0.2_1), SVT-AV1 v4.2.0(FFmpeg `libsvtav1`), dav1d 1.5.4(FFmpeg `libdav1d`, VMAF 측정 때 디코딩), libvmaf 3.2.1(모델 vmaf_v0.6.1).
- 입력: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p(© copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4 (sha256 `34bbd52a4b89fdf63c8ace50b268da26653a59508288100cd3c23de276db7931`). 20초 지점부터 10초를 FFV1로 풀어 둔 파일(1920×1080, 24fps, 240프레임)입니다. 원본 자체가 H.264 약 2.1Mbps로 이미 한 번 압축된 영상이고, 위아래에 검은 띠가 있어 실제 화면은 `cropdetect` 기준 1920×818입니다. 영상 하나, 10초 한 장면 묶음이라 다른 영상에서는 preset 사이의 차이가 달라질 수 있습니다.
  - `ffmpeg -ss 20 -i sintel_trailer-1080p.mp4 -t 10 -an -c:v ffv1 ref.mkv`
- 인코딩: `ffmpeg -i ref.mkv -an -c:v libsvtav1 -preset <4|6|8|10> -crf 35 enc.mp4`. 나머지는 SVT-AV1 기본값(tune PSNR, 키프레임 161프레임마다 — 이 10초에서는 0초와 6.708초)입니다. 비트레이트는 `ffprobe -show_entries packet=size`로 모은 영상 패킷 크기 합 ÷ 10초입니다.
- VMAF: `ffmpeg -i enc.mp4 -i ref.mkv -lavfi "[0:v]setpts=N/24/TB[d];[1:v]setpts=N/24/TB[r];[d][r]libvmaf=model=version=vmaf_v0.6.1:n_threads=8" -f null -` (프레임 번호로 맞춤).
- 결과(CPU 초 · kbps · 평균 VMAF): preset 4 = 89.0 · 1,261.9 · 95.68, preset 6 = 55.17 · 1,370.2 · 95.52, preset 8 = 28.38 · 1,572.8 · 94.94, preset 10 = 17.26 · 1,625.8 · 93.43.
- 기본값 로그: `ffmpeg -i ref.mkv -an -frames:v 24 -c:v libsvtav1 out.mp4`의 `Svt[info]` 줄(preset / tune 8 / PSNR, CRF 35.00, gop size 161).
- 코덱 문자열: `ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=60 -t 2 -c:v libsvtav1 -preset 12 -r 30 -pix_fmt yuv420p -f hls -hls_segment_type fmp4 -hls_time 1 -hls_list_size 0 -master_pl_name master.m3u8 hls/v.m3u8` 뒤 master.m3u8의 `CODECS`, init과 첫 조각을 이어 붙인 파일에 `-c copy -bsf:v trace_headers`로 `seq_profile` 0 · `seq_level_idx` 8 · `seq_tier` 0 확인.
- 같은 VMAF 목표 비교(x264 · x265 · SVT-AV1)의 방법과 한계는 [H.265 글의 측정 조건](/posts/tech-blurting/h265-hdr-deep-dive/#측정-조건)에 있습니다.

## 출처

- AOMedia: [설립 보도문](https://aomedia.org/press%20releases/alliance-to-deliver-next-generation-open-media-formats/) (2015-09-01) · [AV1 공개 보도문](https://aomedia.org/press%20releases/the-alliance-for-open-media-kickstarts-video-innovation-era-with-av1-release/) (2018-03-28) · [성명](https://aomedia.org/press%20releases/the-alliance-for-open-media-statement/) (2019-04-08) · [AV2 보도문](http://aomedia.org/press%20releases/Alliance-for-Open-Media-Releases-AV2-Codec/) (2026-06-09) · [회원](https://aomedia.org/about/members/) (2026-11-13 확인) · [특허 라이선스 1.0](https://aomedia.org/license/patent-license/)
- AOMedia 규격: [AV1 Bitstream & Decoding Process Specification, Version 1.0.0 with Errata 1](https://aomediacodec.github.io/av1-spec/av1-spec.pdf) · [av1-spec 태그](https://github.com/AOMediaCodec/av1-spec/tags) · [AV1 ISOBMFF 바인딩 v1.3.0](https://aomediacodec.github.io/av1-isobmff/) · [AVIF v1.2.0](https://aomediacodec.github.io/av1-avif/) · [AV2 규격](https://av2.aomedia.org/)
- Google · WebM: [On2 인수 완료 보도문(재게재)](https://www.design-reuse.com/news/22784/google-on2-acquisition.html) (2010-02-19) · [Computerworld 보도](https://www.computerworld.com/article/1553654/google-closes-on2-acquisition-for-124-6m.html) · [Introducing WebM 보관본](http://web.archive.org/web/20261102214652/http://blog.webmproject.org/2010/05/introducing-webm-open-web-media-project.html) (2010-05-19) · [WebM 추가 특허 허락](https://www.webmproject.org/license/additional/) · [VP9 비트스트림 확정 공지](https://groups.google.com/a/webmproject.org/g/webm-discuss/c/UzoX7owhwB0/m/I80ENJ7YfZUJ) (2013-06-12) · [WebM VP9](https://www.webmproject.org/vp9/) · [미국 의회도서관, VP9 형식 설명](https://www.loc.gov/preservation/digital/formats/fdd/fdd000579.shtml)
- [YouTube Engineering, VP9: Faster, better, buffer-free YouTube videos](http://web.archive.org/web/20220906064407/https://youtube-eng.googleblog.com/2015/04/vp9-faster-better-buffer-free-youtube.html) (2015-04-06, 원문 주소가 사라져 보관본)
- Netflix Technology Blog: [More Efficient Mobile Encodes for Netflix Downloads](https://netflixtechblog.com/more-efficient-mobile-encodes-for-netflix-downloads-625d7b082909) (2016-12-01, [보관본](http://web.archive.org/web/20261025063641/https://netflixtechblog.com/more-efficient-mobile-encodes-for-netflix-downloads-625d7b082909)) · [Introducing SVT-AV1](https://netflixtechblog.com/introducing-svt-av1-a-scalable-open-source-av1-framework-c726cce3103a) (2019-04-17, [보관본](http://web.archive.org/web/20260815115028/https://netflixtechblog.com/introducing-svt-av1-a-scalable-open-source-av1-framework-c726cce3103a)) · [AV1 — Now Powering 30% of Netflix Streaming](https://netflixtechblog.com/av1-now-powering-30-of-netflix-streaming-02f592242d80) (2025-12-01, [보관본](http://web.archive.org/web/20261024092619/https://netflixtechblog.com/av1-now-powering-30-of-netflix-streaming-02f592242d80)). 원문 주소가 자동 접속을 막아 web.archive.org 보관본으로 내용을 확인했습니다.
- Twitch: [How VP9 delivers value for Twitch's esports live streaming](https://blog.twitch.tv/en/2018/12/19/how-v-p9-delivers-value-for-twitch-s-esports-live-streaming-35db26f6322f/) (2018-12-19) · [Introducing the Enhanced Broadcasting Beta](https://blog.twitch.tv/en/2024/01/08/introducing-the-enhanced-broadcasting-beta/) (2024-01-08) · [Introducing Dual Format and 2k Streaming on Twitch](https://blog.twitch.tv/en/2026/06/17/introducing-dual-format-and-2k-streaming-on-twitch/) (2026-06-17)
- [SVT-AV1 README](https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/master/README.md) · [SVT-AV1 v4.2.0 Parameters.md](https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/v4.2.0/Docs/Parameters.md)
- 하드웨어: [NVIDIA Video Encode and Decode GPU Support Matrix](https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new) · [intel/media-driver README](https://github.com/intel/media-driver/blob/master/README.md) · [Apple, M3 발표](https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/) (2023-10-30)
- caniuse(2026-11-13 확인): [AV1](https://caniuse.com/av1) · [AVIF](https://caniuse.com/avif) · [WebM](https://caniuse.com/webm)
- [OBS Studio 33.0.0 rtmp-services/services.json](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json)
- 특허 풀: [Sisvel 보도문](https://www.sisvel.com/news-events/news/sisvel-announces-the-launch-of-its-video-coding-licensing-platform) (2019-03-27) · [Sisvel AV1 프로그램](https://www.sisvel.com/licensing-programmes/audio-and-video-coding-decoding/video-coding-platform-av1/) · [Access Advance VDP 보도문](https://accessadvance.com/2025/01/16/access-advance-announces-video-distribution-patent-pool-in-response-to-market-demand/) (2025-01-16) · [Via LA AVC/H.264](https://www.via-la.com/licensing-programs/avc-h-264/)
- [MacRumors, Apple Joins Alliance for Open Media](https://www.macrumors.com/2018/01/04/apple-joins-alliance-for-open-media/) (2018-01-04)
- [ITU-T H.266](https://www.itu.int/rec/T-REC-H.266)
- [Sintel](https://durian.blender.org/sharing/) — 시험 영상, © copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

다음 편: [코덱은 기술이 아니라 비즈니스 결정이다 — 시나리오/비용/디버깅 종합](/posts/tech-blurting/codec-decision-and-debugging/)
