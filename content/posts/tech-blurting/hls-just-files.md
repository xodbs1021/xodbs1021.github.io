---
title: "HLS는 라이브 영상을 재생 목록과 조각 파일로 나눕니다"
date: 2026-06-20T04:06:03+09:00
lastmod: "2026-11-12T22:56:00+09:00"
description: "HLS는 영상을 몇 초짜리 조각 파일로 자르고, 그 목록을 텍스트 재생 목록으로 알려 줍니다. 플레이어는 둘 다 HTTP GET으로 받습니다. 다변형 목록과 미디어 목록의 관계, 라이브 목록이 밀리는 규칙(목표 길이 3배 · 애플 6조각), EXTINF와 목표 길이의 반올림 규칙, TS · fMP4 · 묶음 오디오 조각, IDR 시작 규칙, 브라우저 재생 경로와 hls.js의 TS → fMP4 변환, 조각 404 처리를 RFC 8216 · 개정 초안 22판 · 애플 저작 규격으로 확인했습니다."
categories: ["tech-blurting"]
tags: ["HLS", "M3U8", "RFC 8216", "hls.js", "MSE", "라이브 스트리밍"]
draft: false
---

라이브 영상을 보내던 규약은 서버와 플레이어가 연결을 계속 유지하는 방식이 많아, 평범한 웹 서버와 CDN(Content Delivery Network)의 캐시를 그대로 쓰기 어려웠습니다. Apple의 Roger Pantos가 2009년 5월 1일 인터넷 드래프트로 낸 HLS(HTTP Live Streaming)는 영상을 몇 초짜리 조각 파일로 자르고, 그 조각의 목록을 텍스트 재생 목록으로 알려 줍니다. 플레이어는 목록과 조각을 모두 HTTP GET으로 받습니다. 라이브에서는 서버가 목록 끝에 새 조각을 붙이고 앞 조각을 빼며, 방송이 끝나면 `#EXT-X-ENDLIST`를 붙입니다. 이 규칙은 2017년 RFC 8216(Informational)으로 정리됐고, 프로토콜 버전 13을 담은 개정 초안 22판(2026-05-01)이 지금 RFC 편집자에게 넘어가 있습니다.

## HTTP 파일만으로 라이브를 보내려고 영상을 몇 초씩 잘랐습니다 {#1-apple의-미친-발상--그냥-http로-작은-파일들-다운받자}

첫 판인 [draft-pantos-http-live-streaming-00](https://www.ietf.org/archive/id/draft-pantos-http-live-streaming-00.txt)(2009-05-01)은 스스로를 「끝이 정해지지 않은 멀티미디어 흐름을 HTTP로 보내는 규약」이라고 소개하고, 파일 형식과 서버 · 클라이언트가 할 일을 정합니다. 핵심은 연결이 아니라 파일입니다. 서버는 인코더가 만든 영상을 몇 초 단위 조각으로 잘라 웹 서버에 올리고, 어떤 조각이 있는지를 목록 파일에 적습니다. 플레이어는 목록을 받아 조각을 차례로 요청합니다.

파일이므로 HTTP가 이미 가진 장치를 그대로 씁니다. Apple의 [HLS 개요 문서](https://developer.apple.com/documentation/http-live-streaming)는 HLS가 평범한 웹 서버와 CDN으로 콘텐츠를 배포한다고 적습니다. 같은 조각을 받는 시청자가 많으면 CDN 가장자리 서버가 한 번 받아 둔 사본을 나눠 줄 수 있습니다.

목록 파일의 형식은 MP3 재생 목록으로 쓰이던 M3U에서 왔습니다. [RFC 8216 4절](https://www.rfc-editor.org/rfc/rfc8216#section-4)은 재생 목록 형식이 M3U에서 파생됐고 `EXTM3U`와 `EXTINF` 두 태그를 물려받았다고 적습니다. 목록 파일은 UTF-8로 쓰고, 주소가 `.m3u8`이나 `.m3u`로 끝나거나 HTTP Content-Type이 `application/vnd.apple.mpegurl`이나 `audio/mpegurl`이어야 합니다.

## 다변형 재생 목록이 화질별 미디어 재생 목록을 가리킵니다 {#3-m3u8-두-가지-종류--master와-media}

재생 목록은 두 층입니다. 위층의 다변형 재생 목록(Multivariant Playlist)은 같은 영상을 화질별로 만든 변형(variant)과 오디오 · 자막 묶음을 나열합니다. RFC 8216은 이것을 「Master Playlist」라고 불렀고, 개정 초안은 이름을 바꿨습니다([개정 초안 부록 A](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 아래층의 미디어 재생 목록(Media Playlist)이 실제 조각 주소를 나열합니다. [[fig-hls-layers]]에서 플레이어가 위에서 아래로 내려가는 순서를 보십시오.

```mermaid {#fig-hls-layers kind="개념도" caption="HLS 재생 목록의 두 층. 다변형 재생 목록이 화질별 미디어 재생 목록과 오디오 묶음을 가리키고, 미디어 재생 목록이 조각 주소를 나열합니다. 플레이어는 위에서 아래로 내려가며 변형 하나를 고르고 그 목록의 조각을 받습니다. RFC 8216 4절과 개정 초안 22판 4.4.6절을 줄여 그렸습니다." source="https://www.rfc-editor.org/rfc/rfc8216#section-4"}
flowchart TB
  accTitle: HLS 다변형 목록에서 조각까지
  accDescr: 다변형 재생 목록이 화질별 미디어 재생 목록(1080p, 720p)과 오디오 묶음을 가리킨다. 720p 미디어 재생 목록은 seg100부터 seg105까지 조각 주소를 나열한다.
  M["다변형 재생 목록<br/>master.m3u8"] --> L["미디어 목록<br/>1080p · 720p"]
  M --> A["오디오 묶음<br/>EXT-X-MEDIA"]
  L --> S["720p 조각<br/>seg100 … seg105"]
```

다변형 목록의 `EXT-X-STREAM-INF`는 변형마다 최대 비트레이트(`BANDWIDTH`), 해상도, 코덱을 적고 다음 줄에 그 미디어 목록 주소를 둡니다.

```m3u8
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=6500000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
1080p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3200000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
720p/index.m3u8
```

플레이어는 다변형 목록을 받아 지금 망에 맞는 변형을 고르고, 그 미디어 목록을 받은 뒤 조각을 요청합니다. 화질을 바꿀 때는 다른 변형의 미디어 목록으로 옮겨 갑니다.

## 라이브 목록은 앞이 빠지고 뒤가 붙으며, 끝나면 ENDLIST가 붙습니다 {#라이브-vs-vod--끝이-있냐-없냐}

미디어 목록 머리의 `EXT-X-MEDIA-SEQUENCE`는 목록 첫 조각의 번호입니다. [RFC 8216 6.2.1절](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.1)은 서버가 미디어 목록을 바꿀 수 있는 방법을 넷으로 한정합니다. 끝에 줄을 붙이기, 앞에서부터 순서대로 조각을 빼기, `EXT-X-MEDIA-SEQUENCE`를 올리기, `EXT-X-ENDLIST`를 붙이기입니다. 아래 영상에서 맨 위 조각이 빠질 때 번호가 100에서 101로 오르고, 아래에 새 `EXTINF` 줄이 붙는 순서를 보십시오.

{{< motion scene="PlaylistSlide" id="fig-playlist-slide" kind="개념도" caption="라이브 미디어 목록이 갱신되는 모습. 새 조각 줄이 끝에 붙으면 맨 앞 조각이 빠지고 EXT-X-MEDIA-SEQUENCE가 1씩 오릅니다. 목록에는 늘 조각 6개가 남고, 방송이 끝나면 EXT-X-ENDLIST가 붙어 더는 바뀌지 않습니다. RFC 8216 6.2.1–6.2.2절과 애플 저작 규격 8.11을 따라 그린 설명용 그림입니다." >}}

앞에서 몇 개를 남겨야 하는지는 「최근 3~5개」 같은 관습이 아니라 규격이 정합니다.

| 규칙 | 내용 | 근거 |
|---|---|---|
| 목록 길이 하한 | `EXT-X-ENDLIST`가 없는 목록에서 조각을 빼서 목록 길이가 목표 길이의 3배보다 짧아지면 안 됨(MUST NOT) | [RFC 8216 6.2.2](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.2) |
| 애플 기기 조각 수 | 라이브 목록에 조각 6개 이상(MUST) | [애플 HLS 저작 규격](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) 8.11 |
| 애플 기기 목록 길이 | 라이브 목록에 15분 이상(SHOULD) | 같은 규격 8.12 |

PokeClip의 라이브 목록은 4초 조각 7개, 28초 창으로 정했습니다. 창 길이가 시청 지연이 아니라 멈췄다 돌아온 시청자가 목록에서 자기 자리를 다시 찾을 수 있는지를 정했다는 실측은 [라이브 창 글](/posts/0-to-1/pokeclip-live-window-without-fork/)에 있습니다.

목록이 끝나면 서버는 `#EXT-X-ENDLIST`를 붙입니다. 그 뒤로 조각이 추가되지 않으므로 플레이어는 목록을 다시 받지 않아도 됩니다. 처음부터 끝이 정해진 VOD는 `EXT-X-PLAYLIST-TYPE:VOD`로 목록이 바뀌지 않는다고 알리고, 앞 조각을 빼지 않고 붙이기만 하는 목록은 `EVENT`로 알립니다(6.2.1절, 애플 규격 8.6 · 8.8). 같은 주소에 끝 표시를 단 뒤 다시 조각을 붙이면 플레이어마다 다르게 읽는 문제는 [세션 주소 글](/posts/0-to-1/pokeclip-session-url-and-endlist/)에 있습니다.

## EXTINF는 조각의 길이이고 목표 길이는 반올림한 상한입니다 {#extinf의-정확한-의미}

`#EXTINF:5.967,`은 바로 다음 줄 조각의 길이(초)입니다. `#EXT-X-TARGETDURATION:6`은 이 목록의 목표 길이로, 조각 길이의 상한입니다. 목표 길이에는 세 규칙이 걸립니다.

| 규칙 | 내용 | 근거 |
|---|---|---|
| 반올림 상한 | 각 조각의 EXTINF를 정수로 반올림한 값이 목표 길이 이하(MUST) | [RFC 8216 4.3.3.1](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.3.1) |
| 바꾸지 않음 | 미디어 목록의 목표 길이 값은 바뀌면 안 됨(MUST NOT) | [RFC 8216 6.2.1](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.1) |
| 0.5초 초과 금지 | 애플 기기에서는 조각이 목표 길이를 0.5초 넘게 넘으면 안 됨(MUST NOT) | [애플 저작 규격](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) 7.7 |

조각이 정확히 6초가 되지 않는 이유는 조각을 키프레임에서 자르기 때문입니다. FFmpeg의 HLS 묶개 문서도 `hls_time`이 지난 뒤 다음 키프레임에서 조각을 자른다고 적습니다([FFmpeg 형식 문서](https://ffmpeg.org/ffmpeg-formats.html#hls-2)). 그래서 조각 길이는 키프레임이 어디에 오느냐에 따라 달라집니다. PokeClip에서는 길어진 원인을 확인하지 못한 7.66초 조각 하나가 반올림 8로 목표 길이 6을 넘었습니다. 목표 길이를 바꿀 수 없어 목록이 둘로 갈렸고, 다시보기가 마지막 7.5분만 덮었습니다([회차 다시보기 글](/posts/projects/pokeclip-round-vod/)).

## 조각 파일은 TS · fMP4 · 묶음 오디오 가운데 하나입니다 {#2-hls의-두-가지-파일--m3u8과-ts}

조각 형식은 [RFC 8216 3절](https://www.rfc-editor.org/rfc/rfc8216#section-3)이 정한 것만 씁니다. 영상은 MPEG-2 TS나 fMP4(fragmented MP4)이고, 오디오만 담는 묶음 오디오(Packed Audio)와 자막용 WebVTT가 있습니다.

| 형식 | 디코더 초기화 정보 | 조건 |
|---|---|---|
| MPEG-2 TS | PAT와 PMT. 조각 안에 두거나 `EXT-X-MAP`으로 따로 둠 | 처음 두 패킷이 PAT · PMT여야 함(SHOULD, 3.2절) |
| fMP4 | `ftyp` · `moov`를 담은 init 파일을 `EXT-X-MAP`으로 가리킴 | 조각마다 `EXT-X-MAP` 적용(3.3절), 프로토콜 버전 6 이상(7절) |
| 묶음 오디오 | 없음. 조각 머리의 ID3 PRIV 태그에 첫 표본 시각을 둠 | AAC(ADTS) · MP3 · AC-3 · E-AC-3(3.4절) |

「TS 조각의 첫 패킷은 언제나 PAT」라는 설명은 규격보다 강합니다. RFC 8216은 TS 조각이 PAT와 PMT를 담거나 `EXT-X-MAP`으로 따로 주라고 요구하고, `EXT-X-MAP`이 없는 조각의 처음 두 패킷이 PAT와 PMT이기를 권고(SHOULD)합니다. TS 패킷과 PID의 내부 구조는 [MPEG-TS 글](/posts/tech-blurting/rtmp-mpeg-ts-srt/)에 있습니다.

애플 기기에서 HEVC와 AV1 영상은 fMP4로만 내야 합니다(저작 규격 1.5 · 1.39). fMP4 조각과 DASH 조각을 같은 파일로 맞추는 방법은 [CMAF 글](/posts/tech-blurting/cmaf-deep-dive/)에 있습니다.

## 조각은 IDR 프레임으로 시작해야 혼자 디코딩됩니다 {#idr-frame이-세그먼트-시작에-있어야-하는-이유}

P 프레임과 B 프레임은 다른 프레임을 참조해 그립니다. 조각을 처음 받은 플레이어가 그 조각만으로 디코딩을 시작하려면, 참조 없이 그릴 수 있고 이전 참조를 모두 끊는 IDR(Instantaneous Decoding Refresh) 프레임이 앞에 있어야 합니다.

규격마다 강도가 다릅니다. RFC 8216 3절은 H.264를 담은 조각이 IDR을 포함하기를 권고(SHOULD)하고, 첫 IDR 앞 프레임은 받기만 하고 버려질 수 있다고 적습니다. 애플 저작 규격 7.4는 영상 조각이 IDR로 시작해야 한다(MUST)고 정합니다. 그래서 인코더의 키프레임 간격이 조각 길이를 정합니다. 2초 조각을 원하면 2초 이하 간격으로 키프레임을 넣어야 하고, 화질별 변형의 키프레임 위치도 맞춰야 조각 경계에서 화질을 바꿀 수 있습니다.

## 브라우저는 내장 재생기나 MSE로 HLS를 재생합니다 {#6-브라우저는-hls를-어떻게-재생하나--hlsjs와-mse}

Safari는 `<video>`에 `.m3u8` 주소를 넣으면 내장 재생기로 HLS를 재생합니다. 다른 브라우저에서는 JavaScript가 목록과 조각을 받아 MSE(Media Source Extensions)의 `SourceBuffer`에 넣습니다. MSE가 받는 형식은 브라우저가 정합니다. W3C의 [MSE 바이트 스트림 형식 레지스트리](https://www.w3.org/TR/mse-byte-stream-format-registry/)에는 ISO BMFF(`video/mp4`)와 함께 MPEG-2 TS(`video/mp2t`)도 올라 있으므로, 「MSE는 fMP4만 받는다」는 말은 규격으로는 맞지 않습니다.

| 환경 | 재생 경로 | 근거 |
|---|---|---|
| Safari(macOS · iOS) | `<video src="….m3u8">` 내장 재생 | [Apple HLS 개요](https://developer.apple.com/documentation/http-live-streaming) |
| iOS 17.1 이상 Safari | 내장 재생, 또는 MSE 대신 ManagedMediaSource 위의 hls.js(1.5.0부터) | [hls.js 1.5.0 릴리스](https://github.com/video-dev/hls.js/releases/tag/v1.5.0) |
| MSE가 있는 그 밖의 브라우저 | hls.js 같은 라이브러리가 MSE에 넣음 | [hls.js README](https://github.com/video-dev/hls.js#readme) |

Chrome도 내장 HLS 재생을 들이고 있습니다. Chromium 소스에는 HLS 목록 해석기와 디먹서를 넣는 빌드 옵션 `enable_hls_demuxer`가 있고([`media_options.gni`](https://chromium.googlesource.com/chromium/src/+/main/media/media_options.gni)), hls.js README는 Chrome 147이 `canPlayType`에 지원한다고 답하지만 일부 자료를 내장으로 재생하지 못할 수 있다고 적습니다. 그래서 hls.js는 `Hls.isSupported()`를 먼저 확인하는 순서를 권합니다.

```js
// hls.js README 기본 설정 발췌
if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(videoSrc);
  hls.attachMedia(video);
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = videoSrc; // 내장 HLS
}
```

### hls.js는 TS를 fMP4로 바꿔 MSE에 넣습니다 {#hlsjs의-핵심--transmuxing}

hls.js README는 fMP4(CMAF 포함) 조각은 다시 묶지 않고 MSE로 넘기고, MPEG-2 TS와 묶음 오디오(AAC · MP3 · AC-3) 조각은 fMP4로 바꿔(transmux) 넣는다고 적습니다. 바꾸는 일은 가능하면 Web Worker에서 비동기로 합니다. 압축된 영상 · 오디오 데이터는 그대로 두고 담는 그릇만 바꾸므로 다시 인코딩하지 않습니다. 브라우저가 `video/mp2t`를 받을 수 있더라도 한 경로로 맞추면 브라우저마다 다른 TS 지원에 기대지 않아도 됩니다.

### 조각 404는 위치에 따라 건너뛰거나 재시도합니다 {#recovery--에러-복구}

「세 번 재시도한 뒤 다음 조각으로 건너뛴다」는 설명은 hls.js의 실제 동작과 다릅니다. hls.js 1.7.3 소스를 따라가 보면, 다른 화질로 바꿀 수 없는 스트림에서 조각 404는 그 조각이 목록 어디에 있느냐에 따라 갈립니다([되감기 404 글](/posts/projects/rewind-missing-segment/)).

| 404가 난 조각 | hls.js 1.7.3 동작 | 시청자가 보는 것 |
|---|---|---|
| 라이브 목록 가운데 | 틈(gap)으로 표시하고 다음 조각으로 넘어감, 재시도 없음 | 몇 초가 말없이 빠짐 |
| 라이브 목록 마지막, 또는 끝난 목록의 조각 | 같은 조각을 1 · 2 · 4 · 8 · 8 · 8초 간격으로 6번 더 요청한 뒤 치명 오류 | 멈춘 뒤 오류 |

화질이 여럿이면 다른 화질로 바꾸는 갈래가 먼저입니다. 앱이 치명 오류를 받아 다시 시작하면 같은 6번이 처음부터 다시 돕니다.

## HLS의 창 · 첫 패킷 · 404 처리는 흔히 틀리게 알려져 있습니다 {#정리하면}

- **「라이브 목록에는 최근 3~5개 조각을 둔다」** — RFC 8216은 목록 길이를 목표 길이 3배 아래로 줄이지 말라고 하고, 애플 기기는 6조각 이상을 요구합니다.
- **「TS 조각의 첫 패킷은 언제나 PAT」** — 권고(SHOULD)이고, `EXT-X-MAP`으로 따로 줄 수도 있습니다.
- **「조각 길이는 목표 길이 이하」** — 반올림한 값이 목표 길이 이하면 됩니다. 애플 기기는 여기에 0.5초 초과 금지를 더합니다.
- **「MSE는 fMP4만 받는다」** — 형식 레지스트리에는 MPEG-2 TS도 있습니다. hls.js가 TS를 fMP4로 바꾸는 것은 구현의 선택입니다.
- **「조각 404는 몇 번 재시도하고 건너뛴다」** — hls.js 1.7.3에서는 목록 가운데 조각은 재시도 없이 건너뛰고, 마지막 조각은 6번 재시도한 뒤 멈춥니다.

목록이 이상해 보이면 조각 수보다 목표 길이, 반올림한 EXTINF, 목록 전체 길이를 먼저 확인하십시오. 재생 중 몇 초가 사라졌는데 오류가 없다면 404가 난 조각이 목록 가운데에 있었는지부터 보십시오.

## 출처

- [RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) (2017-08, Informational) — 3절 조각 형식, 4절 M3U 파생 · UTF-8, 4.3.3.1 목표 길이, 6.2.1–6.2.2 목록 변경 · 길이 하한, 7절 버전
- [draft-pantos-hls-rfc8216bis-22: HTTP Live Streaming 2nd Edition](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) (2026-05-01, 프로토콜 버전 13) · [datatracker 상태](https://datatracker.ietf.org/doc/draft-pantos-hls-rfc8216bis/)(Independent Submission, 「Sent to the RFC Editor」, 2026-11-12 확인)
- [draft-pantos-http-live-streaming-00](https://www.ietf.org/archive/id/draft-pantos-http-live-streaming-00.txt) (2009-05-01)
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 1.5 · 1.39 · 7.4 · 7.7 · 8.6 · 8.8 · 8.11 · 8.12
- [Apple, HTTP Live Streaming 개요](https://developer.apple.com/documentation/http-live-streaming)
- [W3C, Media Source Extensions Byte Stream Format Registry](https://www.w3.org/TR/mse-byte-stream-format-registry/)
- [hls.js README](https://github.com/video-dev/hls.js#readme) · [hls.js 1.5.0 릴리스 노트](https://github.com/video-dev/hls.js/releases/tag/v1.5.0) (2024-01-09)
- [Chromium `media/media_options.gni`](https://chromium.googlesource.com/chromium/src/+/main/media/media_options.gni) — `enable_hls_demuxer` (2026-11-12 확인)
- [FFmpeg 형식 문서 — hls 묶개](https://ffmpeg.org/ffmpeg-formats.html#hls-2)
- PokeClip 기록: [라이브 창](/posts/0-to-1/pokeclip-live-window-without-fork/) · [세션 주소와 ENDLIST](/posts/0-to-1/pokeclip-session-url-and-endlist/) · [회차 다시보기](/posts/projects/pokeclip-round-vod/) · [되감기 404](/posts/projects/rewind-missing-segment/)

다음 편: [일반 HLS는 라이브 끝에서 목표 길이 세 배 뒤부터 재생합니다](/posts/tech-blurting/hls-deep-dive/)
