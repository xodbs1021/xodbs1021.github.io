---
title: "라이브 영상은 압축·송출·포장·캐시·버퍼를 거쳐 재생됩니다"
date: 2026-06-14T10:11:10+09:00
lastmod: "2026-11-13T18:09:41+09:00"
description: "1080p30 화면은 압축하지 않으면 YUV 4:2:0으로도 초당 93.3MB, 한 시간 336GB이고, x264 6Mbps 목표로 압축하자 초당 0.77MB가 됐습니다(실측). 이 줄기가 송출 규약의 재전송 상한, 몇 초 조각과 목록, 캐시 층을 지나 플레이어 버퍼에 닿는 순서와, 지연이 조각 길이와 시작 거리에서 생기는 이유를 연재의 각 글로 이어 정리했습니다."
categories: ["tech-blurting"]
tags: ["스트리밍", "HLS", "CDN", "TCP", "압축", "라이브 지연"]
draft: false
---

1080p 30fps 화면을 압축하지 않으면 인코더 입력 형식인 YUV 4:2:0으로도 초당 93.3MB, 한 시간에 336GB입니다. 같은 화면을 x264에 6Mbps 목표로 넣자 영상 데이터는 초당 0.77–0.78MB가 됐습니다. 약 120분의 1입니다(아래 「측정 조건」). 라이브 방송은 이렇게 줄인 줄기를 송출 규약으로 서버에 보내고, 몇 초짜리 조각과 목록으로 포장해 HTTP로 나눠 주며, CDN이 같은 조각을 시청자 수만큼 복사하고, 플레이어가 몇 초를 쌓아 둔 뒤 재생합니다. 시청자가 느끼는 수십 초 지연은 대부분 이 중 조각 길이와 플레이어의 시작 거리에서 생깁니다.

## 압축 전 1080p30 한 시간은 YUV 4:2:0으로 336GB입니다 {#1-동영상은-압축-안-하면-1시간에-648gb다}

화면 한 장이 1920×1080 화소이고 화소마다 빨강 · 초록 · 파랑을 8비트씩 쓰면 6,220,800바이트입니다. 30장이면 초당 186.624MB, 한 시간이면 671.8GB입니다(MB · GB는 10진 단위). 그런데 인코더가 실제로 받는 형식은 보통 RGB가 아니라 YUV 4:2:0입니다. 밝기(Y)는 화소마다 두고, 색차(U · V)는 가로 · 세로 2화소마다 하나만 둡니다. 화소당 1.5바이트이므로 한 장이 3,110,400바이트, 초당 93.312MB, 한 시간 335.9GB입니다. FFmpeg로 시험 화면을 두 형식으로 풀어 바이트를 세자 계산과 같은 값이 나왔습니다.

아래 영상에서 위 숫자와 막대를 보십시오. 한 줄기가 단계를 지날 때마다 초당 바이트가 줄고, 압축 뒤에는 막대가 거의 보이지 않습니다. 마지막에 CDN에서 같은 조각이 여러 시청자로 갈라집니다.

{{< motion scene="FrameToPlayer" id="fig-frame-to-player" kind="재구성" caption="1080p30 화면 한 줄기가 색 줄이기(YUV 4:2:0)와 x264 압축을 지나며 초당 186.6MB → 93.3MB → 0.77MB로 줄고, 송출 · 포장을 거쳐 CDN에서 여러 시청자에게 같은 조각으로 나뉩니다. 숫자는 시험 화면(testsrc2) 실측값이고 움직임은 설명용입니다." >}}

로그 눈금으로 놓으면 세 값의 차이가 한 그림에 들어옵니다.

{{< chart id="fig-raw-vs-encoded" kind="실측" caption="1080p30 시험 화면 10초의 초당 바이트(MB, 가로축은 로그 눈금). 압축 전 RGB 24비트 186.6MB, YUV 4:2:0 93.3MB, x264 목표 6Mbps 출력의 영상 패킷 0.77MB. FFmpeg 9.0.2, 2026-11-13." source="아래 「측정 조건」" height="240px" >}}
{
  "grid": {"left": 8, "right": 72, "top": 16, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "log", "name": "MB/초", "min": 0.1, "max": 1000, "logBase": 10},
  "yAxis": {"type": "category", "inverse": true, "data": ["RGB 24비트", "YUV 4:2:0", "x264 6Mbps"]},
  "series": [
    {"type": "bar", "barWidth": 22, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [186.6, 93.3, {"value": 0.77, "itemStyle": {"color": "#087f8b"}}]}
  ]
}
{{< /chart >}}

압축한 쪽은 압축 전 YUV의 약 120분의 1, RGB의 약 240분의 1입니다. 다만 실제 평균은 목표 6Mbps(초당 0.75MB)보다 많은 6,164–6,242kbps(네 번 실행, 2.7–4.0% 많음)였습니다. 압축 전 바이트 수는 해상도와 화소 형식만으로 정해지지만, x264 출력은 같은 명령이라도 실행마다 1% 남짓 달라집니다. x264의 버퍼 설정(VBV)은 순간 비트레이트를 정해 둔 구간 안에서만 묶기 때문입니다([x264 글](/posts/tech-blurting/x264-live-rate-control-gop/)). 시험 화면은 합성 영상이라 실제 방송 화면과 압축률이 다르고, 화질은 재지 않았습니다.

### 이웃 화소와 앞 화면이 비슷해 줄일 수 있습니다 {#압축이-가능한-이유--영상의-중복성}

줄일 여지는 두 갈래입니다. 한 화면 안에서 이웃 화소는 대개 비슷합니다(공간 중복). 이어지는 화면끼리는 배경처럼 대부분이 그대로입니다(시간 중복). 인코더는 이미 디코딩한 화면에서 비슷한 블록을 찾아 위치(모션 벡터)와 차이만 적고, 그 차이에서 눈에 덜 띄는 부분을 버립니다(양자화). 화질을 잃는 단계는 양자화 하나입니다([H.264 글](/posts/tech-blurting/h264-deep-dive/#4-h264-인코딩-5단계-파이프라인)).

다른 화면을 참조하지 않는 화면이 I 프레임이고, 앞 화면을 참조하는 화면이 P, 앞뒤를 참조할 수 있는 화면이 B입니다. 위 측정에서 2초마다 넣은 I 프레임 5장은 평균 58,138바이트, 나머지 295장은 평균 25,135바이트였습니다. 참조 없이 그리는 화면이 2.3배 컸습니다.

### 코덱은 압축 방식이고 그릇은 담는 형식입니다 {#코덱-vs-컨테이너}

H.264 · H.265 · AAC는 신호를 줄이고 되돌리는 방식(코덱)입니다. MPEG-TS · MP4 · FLV는 압축된 프레임에 시각과 트랙 번호를 붙여 담는 형식(그릇, 컨테이너)입니다. 같은 H.264 프레임을 그대로 두고 그릇만 바꾸는 재포장(remux)은 다시 인코딩하지 않습니다. 위 측정에서 같은 영상을 MPEG-TS에 담자 파일은 영상 패킷 합보다 약 3.2% 컸습니다. 그 차이가 그릇의 머리 몫입니다.

그릇은 여러 트랙을 담는 방식도 정합니다. MPEG-TS는 패킷마다 PID 번호를 붙여 오디오 트랙 여럿을 한 흐름에 섞습니다([MPEG-TS 글](/posts/tech-blurting/rtmp-mpeg-ts-srt/)). PokeClip은 이 성질을 씁니다. OBS 플러그인이 치지직 본방(RTMP)의 인코더를 나눠 쓰면서 PokeClip 서버로는 SRT(MPEG-TS)를 따로 보내고([인코더 공유 글](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)), 그 안에 본방 믹스 1개와 소스별 소리 5개, 모두 6개 오디오 트랙을 담습니다([6트랙 글](/posts/0-to-1/pokeclip-six-track-input-contract/)).

### 조각은 IDR로 시작해야 혼자 재생됩니다 {#i-frame이-왜-중요한가}

P · B 화면은 참조할 앞 화면이 없으면 그릴 수 없습니다. I 프레임이어도 그 뒤 화면이 I보다 앞선 화면을 참조하는 것까지 막지는 않습니다. 참조를 확실히 끊는 화면은 IDR(Instantaneous Decoding Refresh)입니다. 그래서 애플의 HLS 제작 규격은 영상 조각이 IDR로 시작해야 한다(MUST)고 적습니다([7.4](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)). 조각 하나만 받은 플레이어나 화질을 바꾼 플레이어가 그 조각부터 디코딩할 수 있어야 하기 때문입니다.

FFmpeg HLS 먹서의 `hls_time`은 「그 시간이 지난 뒤 다음 키프레임에서 자른다」고 문서에 적혀 있습니다([ffmpeg-formats](https://ffmpeg.org/ffmpeg-formats.html#hls-2)). 키프레임 간격이 조각 길이와 맞지 않으면 조각이 목표보다 길어집니다. 인코더의 키프레임 간격을 조각 길이의 약수로 고정하는 이유입니다.

## 송출 구간은 손실을 다시 받을 시간에 상한을 둡니다 {#2-tcp의-재전송이-바로-버퍼링의-원인이다}

RTMP와 HTTP(1.1 · 2)는 TCP 위에서 돕니다. TCP는 응용에 바이트를 보낸 순서대로 넘깁니다([RFC 9293 2.2](https://www.rfc-editor.org/rfc/rfc9293#section-2.2)). MTU 1500, IPv4 · TCP 머리 각 20바이트라면 세그먼트 하나에 1,460바이트가 실리고, 1MB 조각은 약 685개 세그먼트로 나뉩니다. 이 중 하나가 사라지면 뒤 세그먼트가 이미 도착했어도 응용은 빈자리가 채워질 때까지 받지 못합니다.

빈자리를 채우는 쪽은 송신자입니다. 수신자는 순서가 어긋난 세그먼트를 받을 때마다 「아직 이 번호를 기다린다」는 중복 ACK를 즉시 보냅니다. 송신자는 중복 ACK 3개를 받으면 재전송 타이머를 기다리지 않고 빠진 세그먼트를 다시 보냅니다(fast retransmit, [RFC 5681 3.2](https://www.rfc-editor.org/rfc/rfc5681#section-3.2)). 이 경우 빈자리는 대략 왕복 시간(RTT) 하나 뒤에 채워집니다. 중복 ACK가 모자라 타이머가 끝나야 하는 경우는 더 깁니다. 재전송 타이머(RTO)는 1초보다 작게 계산되면 1초로 올리도록 권고되고([RFC 6298 2.4](https://www.rfc-editor.org/rfc/rfc6298)), Linux는 최솟값을 200ms로 둡니다([tcp.h 163행](https://github.com/torvalds/linux/blob/v6.18/include/net/tcp.h#L163)).

순서가 바뀌는 일도 있습니다. 다만 라우터가 패킷마다 경로를 바꾸지는 않습니다. 같은 비용의 경로가 여럿일 때(ECMP) 라우터는 출발지 · 목적지 같은 흐름 식별 필드를 해시해 다음 홉을 고르므로, 한 TCP 연결의 패킷은 보통 같은 길로 갑니다([RFC 2992 1절](https://www.rfc-editor.org/rfc/rfc2992)). 그래도 일부 경로에서는 순서 바뀜이 드물지 않다고 RFC 5681 3.2절이 적습니다.

TCP 위의 RTMP는 잃은 데이터를 결국 받아 내지만, 그동안 뒤 데이터가 밀려 송출 지연이 늘어납니다. SRT는 UDP 위에서 잃은 패킷을 다시 받되 `latency`로 정한 시간이 지나면 기다리지 않고 건너뜁니다([SRT 글](/posts/tech-blurting/srt-broadcaster-protocol/)). 지연에 상한을 두는 대신 그 안에 못 받은 패킷은 버리는 선택입니다.

### 대역폭과 지연은 다른 축입니다 {#대역폭--지연}

대역폭은 초당 보낼 수 있는 양(Mbps)이고, 지연은 한 번 오가는 데 걸리는 시간(ms)입니다. 6초 · 6Mbps 조각은 4.5MB이고, 20Mbps 회선이라면 받는 데 약 1.8초가 듭니다. 회선을 늘리면 이 시간은 줄지만 RTT는 그대로입니다. 손실이 나면 재전송이 RTT 단위로 더해지므로, 대역폭이 넉넉해도 RTT가 긴 회선은 손실에 더 오래 멈춥니다.

### 구간마다 쓰는 전송 규약이 다릅니다 {#프로토콜이-이-문제에-대처하는-방식}

| 구간 | 흔한 규약 | 손실을 다루는 방식 |
|---|---|---|
| 방송자 → 수신 서버 | RTMP(TCP) | TCP 재전송, 응용이 정한 기다림 상한 없음([RTMP 글](/posts/tech-blurting/rtmp-still-alive/)) |
| 방송자 → 수신 서버 | SRT(UDP) | 재전송하되 `latency`가 지나면 건너뜀 |
| 서버 → 시청자 | HLS · DASH(HTTP, TCP 또는 HTTP/3의 QUIC) | 조각 파일 단위로 받고 플레이어 버퍼가 흡수 |
| 서버 ↔ 시청자, 1초 아래 | WebRTC(UDP) | 재전송 요청 · 순방향 오류 정정 · 버림([WebRTC 글](/posts/tech-blurting/webrtc-deep-dive/)) |

## 몇 초 조각과 목록으로 나누자 HTTP로 라이브를 보낼 수 있었습니다 {#3-progressive-download의-한계가-hls를-만들었다}

파일 하나를 HTTP로 받으며 재생하는 방식을 progressive download라고 합니다. 이 방식도 탐색은 됩니다. MP4는 화면마다 파일 안 위치를 적은 색인(moov 안의 샘플 표 · chunk offset)을 두므로([QuickTime 파일 형식](https://developer.apple.com/documentation/quicktime-file-format/chunk_offset_atom)), 플레이어가 색인을 먼저 받으면 원하는 시각의 바이트 위치를 계산해 HTTP Range로 그 부분만 요청할 수 있습니다([RFC 9110 14절](https://www.rfc-editor.org/rfc/rfc9110#section-14)).

막히는 곳은 라이브와 화질 전환입니다. 파일 하나는 화질 하나이고, 끝나지 않는 방송은 완성된 파일로 캐시할 수 없습니다. HLS는 방송을 몇 초짜리 독립 조각 파일로 자르고, 조각 주소를 적은 텍스트 목록을 따로 둡니다. 조각은 완성되면 다시 바뀌지 않는 보통 파일이라 일반 HTTP 서버와 캐시가 그대로 다룹니다. RFC 8216은 HLS가 대규모 HTTP 캐시 기반과 호환되어 많은 시청자에게 전달할 수 있다고 적습니다([1장](https://www.rfc-editor.org/rfc/rfc8216#section-1)). 첫 초안은 2009년에 나왔습니다.

### 목록이 조각 순서와 길이를 알려 줍니다 {#해결책-파일을-잘게-쪼개기}

```m3u8
#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:120
#EXTINF:6.000,
seg120.ts
#EXTINF:6.000,
seg121.ts
```

목록은 조각 길이(`EXTINF`)와 순서를 적습니다. 라이브 목록에는 끝 표시(`EXT-X-ENDLIST`)가 없고, 서버가 새 조각을 뒤에 붙이고 오래된 조각을 앞에서 뺍니다. 플레이어는 목록을 다시 받아 새 조각을 찾습니다. 화질별로 목록을 따로 두고 그 목록들을 가리키는 다변형 목록을 위에 두면, 플레이어가 조각 경계에서 다른 화질의 목록으로 옮겨 갈 수 있습니다([HLS 기본 글](/posts/tech-blurting/hls-just-files/)).

VOD에서 1시간 30분 지점으로 가려면 5,400초 ÷ 6초 = 900이므로, 0번부터 센 900번 조각의 처음으로 가면 됩니다. 조각이 IDR로 시작하므로 그 조각부터 바로 디코딩합니다.

### 조각 길이가 지연의 하한을 정합니다 {#세그먼트-크기의-트레이드오프}

조각은 다 만들어져야 목록에 오릅니다. 6초 조각이면 그 조각의 첫 화면은 6초가 지나야 시청자에게 보낼 수 있습니다. 여기에 플레이어의 시작 거리가 더해집니다. RFC 8216은 끝 표시가 없는 목록에서 목록 끝으로부터 목표 길이(`EXT-X-TARGETDURATION`)의 세 배 안쪽에서 시작하는 조각을 고르지 말라고 권고합니다([6.3.3](https://www.rfc-editor.org/rfc/rfc8216#section-6.3.3)). 목표 길이가 6초면 18초 뒤에서 재생합니다([HLS 지연 글](/posts/tech-blurting/hls-deep-dive/#지연이-2030초인-이유--수학으로)).

애플 규격은 목표 길이를 6초로 하라고 권고합니다(SHOULD, [7.5](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)). 업계 전체의 표준값이 아니라 애플 기기용 권고입니다. 조각을 2초로 줄이면 목록 끝과 시작 거리가 함께 줄지만, 같은 시간에 요청과 키프레임이 세 배가 됩니다. 조각을 줄이지 않고 지연을 줄이려는 것이 LL-HLS의 부분 조각입니다([LL-HLS 글](/posts/tech-blurting/ll-hls-deep-dive/)).

## 같은 조각을 여러 시청자가 받으므로 CDN이 캐시합니다 {#4-cdn은-동영상-스트리밍의-진짜-영웅이다}

라이브 시청자는 같은 시각에 같은 조각을 요청합니다. 그래서 시청자 가까운 서버(엣지)가 조각을 한 번 받아 두고 여러 시청자에게 나눠 주는 CDN(Content Delivery Network)이 맞습니다.

### 엣지가 없으면 원본이 시청자 수만큼 보냅니다 {#cdn의-아이디어-가까운-곳에-미리-복사}

시청자 100만 명이 6Mbps 조각 하나(6초)를 받으면 1,000,000 × 6초 × 6,000,000비트 ÷ 8 = 4.5TB입니다. 6초마다 4.5TB, 곧 초당 6Tbps를 서버 한 곳이 내보낼 수는 없습니다. 엣지가 있으면 이 바이트의 대부분은 엣지에서 나가고, 원본은 엣지가 처음 요청할 때만 보냅니다. 시청자에게는 가까운 엣지까지의 RTT만 남습니다.

### 원본 요청은 시청자 수가 아니라 캐시 층 수를 따릅니다 {#cache-hit가-핵심이다}

엣지에 조각이 없으면(미스) 엣지는 위로 요청을 보냅니다. CloudFront를 예로 들면 POP(엣지)에 없을 때 지역 엣지 캐시로 가고, 거기에도 없을 때 원본으로 갑니다. 원본이 돌려준 조각은 지역 캐시와 POP에 모두 저장됩니다([CloudFront 동작 방식](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html#CloudFrontRegionaledgecaches)). 원본 앞에 Origin Shield라는 층을 하나 더 둘 수도 있습니다([Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html)).

그러므로 원본이 받는 요청은 「딱 한 번」이 아닙니다. 맨 위 층의 캐시마다, 그 캐시가 조각을 처음 볼 때 한 번씩 받습니다. 새 조각이 오른 순간 같은 엣지에 요청이 동시에 몰리면, 엣지가 그 요청들을 하나로 합치지 않는 한 미스도 여러 번 납니다. 합치기와 층 구성은 [CDN 글](/posts/tech-blurting/cdn-for-live-streaming/)에서 실측으로 다룹니다.

### 바뀌지 않는 조각은 오래, 몇 초마다 바뀌는 목록은 짧게 캐시합니다 {#hls가-cdn과-잘-맞는-이유}

조각은 한 번 만들어지면 바뀌지 않으므로 오래 캐시해도 됩니다. 라이브 목록은 몇 초마다 바뀌므로 짧게 캐시해야 시청자가 새 조각을 봅니다. PokeClip 운영 CDN은 라이브 목록을 엣지에서 1초, 조각은 원본의 Cache-Control을 따르되 최대 3,600초 캐시합니다([CDN 캐시 키 글](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/#앞선-로컬-실험은-성능-개선율이-아니라-비교의-기준선입니다)). 목록과 조각을 다르게 캐시하는 이유와 함정은 [HLS 지연 글의 캐시 절](/posts/tech-blurting/hls-deep-dive/#qa-라이브-스트리밍인데-cdn이-어떻게-캐시하는가)에 있습니다.

## 각 단계를 다룬 글은 이렇게 이어집니다 {#전체-그림--라이브-스트리밍-파이프라인}

아래 도식에서 화살표 옆 글자가 그 구간의 전송 규약입니다. 방송자 쪽은 연결 하나로 밀어 보내고, 시청자 쪽은 플레이어가 HTTP로 당겨 받습니다.

```mermaid {#fig-pipeline-map kind="개념도" caption="라이브 영상의 단계. 방송 PC가 압축한 줄기를 RTMP나 SRT로 수신 서버에 밀어 보내고, 서버가 화질 사다리로 다시 인코딩해 조각과 목록으로 포장합니다. CDN의 캐시 층을 거친 조각을 플레이어가 HTTP로 당겨 와 버퍼에 쌓고 재생합니다." source="https://www.rfc-editor.org/rfc/rfc8216"}
flowchart TB
  accTitle: 라이브 영상의 단계
  accDescr: 방송 PC의 인코더가 RTMP나 SRT로 수신 서버에 보내고, 트랜스코더가 화질 사다리를 만들고, 패키저가 HLS 조각과 목록을 만든다. 원본, 실드와 지역 캐시, 엣지를 거쳐 플레이어가 HTTP로 받아 버퍼에 쌓는다.
  E["방송 PC 인코더<br/>H.264 · AAC"] -->|RTMP · SRT| I["수신 서버"]
  I --> T["트랜스코더<br/>화질 사다리"]
  T --> P["패키저<br/>조각 + 목록"]
  P --> O["원본"]
  O --> S["실드 · 지역 캐시"]
  S --> G["엣지"]
  G -->|HTTP| B["플레이어 버퍼"]
```

| 단계 | 하는 일 | 이어 읽을 글 |
|---|---|---|
| 압축 | 화면 · 소리를 줄임 | [H.264](/posts/tech-blurting/h264-deep-dive/) · [라이브 x264 설정](/posts/tech-blurting/x264-live-rate-control-gop/) · [H.265 · HDR](/posts/tech-blurting/h265-hdr-deep-dive/) · [AV1](/posts/tech-blurting/av1-vp9-deep-dive/) · [NVENC](/posts/tech-blurting/nvenc-gpu-transcoding/) · [AAC](/posts/tech-blurting/aac-and-friends/) · [Opus](/posts/tech-blurting/opus-deep-dive/) |
| 송출 | 방송자 → 수신 서버 | [RTMP](/posts/tech-blurting/rtmp-still-alive/) · [SRT](/posts/tech-blurting/srt-broadcaster-protocol/) · [MPEG-TS](/posts/tech-blurting/rtmp-mpeg-ts-srt/) · [WHIP](/posts/tech-blurting/whip-whep-modern-ingest/) |
| 다시 인코딩 | 화질 사다리 만들기 | [FFmpeg 옵션](/posts/tech-blurting/ffmpeg-deep-dive/) · [트랜스코딩 서버](/posts/tech-blurting/live-transcoding-infrastructure/) · [ABR 사다리](/posts/tech-blurting/abr-ladder-design/) · [화질 지표](/posts/tech-blurting/video-quality-bitrate-abr/) |
| 포장 | 조각과 목록 | [HLS 기본](/posts/tech-blurting/hls-just-files/) · [HLS 지연](/posts/tech-blurting/hls-deep-dive/) · [LL-HLS](/posts/tech-blurting/ll-hls-deep-dive/) · [CMAF](/posts/tech-blurting/cmaf-deep-dive/) · [DASH](/posts/tech-blurting/dash-vs-hls/) · [FFmpeg HLS · DASH 먹서](/posts/tech-blurting/ffmpeg-hls-dash-muxer/) |
| 캐시 | 같은 조각을 여러 시청자에게 | [라이브 CDN](/posts/tech-blurting/cdn-for-live-streaming/) |
| 재생 | 버퍼에 쌓고 디코딩 | [플레이어 버퍼](/posts/tech-blurting/buffering-deep-dive/) · [재생 실패 좁히기](/posts/tech-blurting/codec-decision-and-debugging/) · [WebRTC(1초 아래)](/posts/tech-blurting/webrtc-deep-dive/) |

## 지연은 조각 길이와 시작 거리에서 가장 많이 생깁니다 {#정리하면}

- 압축은 줄기를 수백분의 1로 줄입니다. 이 실측에서는 압축 전 YUV 4:2:0의 약 120분의 1이었습니다.
- 송출 구간의 손실은 RTT 단위의 재전송으로 메웁니다. TCP에는 응용이 정한 기다림 상한이 없고(연결은 재전송 타이머가 다 할 때까지 버팁니다), SRT는 정한 시간에서 끊습니다.
- 일반 HLS에서 6초 조각을 쓰면 조각이 다 만들어질 때까지 최대 6초, 플레이어 시작 거리 18초가 붙습니다. 망이 빨라져도 이 두 값은 그대로이므로, 지연을 줄이려면 조각 길이와 목표 길이부터 봐야 합니다.
- 원본 부하는 시청자 수보다 캐시 층 수와 요청 합치기에 달렸습니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 16:09–16:10(KST)에 실행했습니다. 압축 전 바이트 수는 실행과 무관하게 같고, x264 출력은 같은 명령을 18:08에 세 번 더 돌려 실행마다 달라지는 폭(파일 7.95–8.05MB, 영상 6,164–6,242kbps)을 함께 적었습니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 32GB, 팬 없음), macOS 27.0.1. 1분 load average는 측정 중 50–65였습니다(다른 세션의 작업 포함).
- 도구: FFmpeg 9.0.2(Homebrew), x264 core 165 r3222.
- 입력: FFmpeg 내장 시험 화면 `testsrc2`(1920×1080, 30fps, 10초 = 300장). 합성 영상이라 실제 방송 화면과 압축률이 다릅니다.
- 압축 전: `ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 10 -f rawvideo -pix_fmt <rgb24|yuv420p> - | wc -c` → 1,866,240,000 · 933,120,000바이트.
- 압축: `ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 10 -c:v libx264 -preset veryfast -b:v 6M -maxrate 6M -bufsize 12M -g 60 -pix_fmt yuv420p -f mpegts out.ts` → 파일 7,949,392바이트. 영상 패킷 합은 `ffprobe -v error -select_streams v:0 -show_entries packet=size -of csv=p=0 out.ts`의 합 7,705,731바이트(6,164.5kbps)이고, 화면 종류별 크기는 `-show_entries frame=pkt_size,pict_type`로 셌습니다. 각 1회.

## 출처

- [RFC 8216, HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — 1장, 6.3.3
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 7.4, 7.5
- [FFmpeg Formats Documentation, hls](https://ffmpeg.org/ffmpeg-formats.html#hls-2) — `hls_time`
- [RFC 9293, Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293) — 2.2
- [RFC 5681, TCP Congestion Control](https://www.rfc-editor.org/rfc/rfc5681#section-3.2) — 3.2 Fast Retransmit/Fast Recovery
- [RFC 6298, Computing TCP's Retransmission Timer](https://www.rfc-editor.org/rfc/rfc6298) — 2.4
- [Linux v6.18 include/net/tcp.h](https://github.com/torvalds/linux/blob/v6.18/include/net/tcp.h#L163) — `TCP_RTO_MIN`
- [RFC 2992, Analysis of an Equal-Cost Multi-Path Algorithm](https://www.rfc-editor.org/rfc/rfc2992) — 1절 Hash-Threshold
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110#section-14) — 14절 Range Requests
- [Apple, QuickTime File Format: Chunk offset atom](https://developer.apple.com/documentation/quicktime-file-format/chunk_offset_atom)
- Amazon CloudFront 개발자 안내서: [How CloudFront delivers content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html) · [Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html)
- PokeClip 기록: [본방 인코더 공유와 SRT](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/) · [OBS 6트랙](/posts/0-to-1/pokeclip-six-track-input-contract/) · [CDN 캐시 키와 원본 인증](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)

다음 편: [Flash 없이도 방송 송출 주소가 rtmp로 시작하는 이유](/posts/tech-blurting/rtmp-still-alive/)
