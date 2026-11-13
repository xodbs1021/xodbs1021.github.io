---
title: "재생 실패는 CODECS 선언과 실제 트랙을 대조해 좁힙니다"
date: 2026-06-21T12:33:24+09:00
lastmod: "2026-11-13T14:58:13+09:00"
description: "재생이 안 될 때는 다변형 목록의 CODECS 선언, init 조각에 든 실제 트랙, 브라우저 디코더의 응답을 따로 확인해야 원인이 좁혀집니다. FFmpeg 9.0.2 HLS 먹서가 HE-AAC에 mp4a.40.2를 적는 이유(codecstring.c), ffprobe csv 필드 순서, Chrome 157의 isTypeSupported 결과, hls.js 1.7.4의 INCOMPATIBLE_CODECS 오류와 Level 필드, FFmpeg 로그 문자열의 소스 위치, CDN 바이트 산식을 1차 문서와 실측으로 확인했습니다."
categories: ["tech-blurting"]
tags: ["코덱", "HLS", "ffprobe", "MSE", "hls.js", "디버깅", "FFmpeg"]
draft: false
---

같은 HE-AAC 파일인데 다변형 목록의 `CODECS`에는 AAC-LC를 뜻하는 `mp4a.40.2`가 적혔습니다. macOS `aac_at`으로 만든 HE-AAC를 FFmpeg 9.0.2의 HLS 먹서로 내보내자 fMP4든 TS든 그랬고, 같은 조각을 `ffprobe`로 열면 `HE-AAC`였습니다. 먹서가 디코더 설정 정보(ASC)의 첫 객체 유형만 읽기 때문입니다. Chrome 157은 `.2`로 선언해도 `.5`로 선언해도 같은 조각을 붙여 재생했지만, 애플 HLS 저작 규격의 코덱 표는 HE-AAC를 `mp4a.40.5`로 적습니다. 이렇게 선언과 실제 트랙, 디코더의 응답은 서로 어긋날 수 있어서, 재생 실패는 셋을 따로 확인해 좁힙니다. 실측은 모두 이 글을 쓰며 AI(Claude Code)가 FFmpeg 9.0.2와 Chrome 157로 잰 값입니다(아래 「측정 조건」).

## 코덱은 시청 기기의 디코더부터 거꾸로 고릅니다 {#1-코덱-결정의-6가지-요인}

어떤 코덱으로 보낼지는 시청 기기가 그 코덱을 하드웨어로 푸는지부터 정합니다. 그다음 송출 경로가 그 코덱을 실어 나르는지, 서버에서 다시 인코딩할 예산이 있는지, 기기 판매와 스트리밍 배포 가운데 어느 쪽 특허 창구에 걸리는지를 봅니다([AV1 글](/posts/tech-blurting/av1-vp9-deep-dive/#13-실무-결정-가이드)). 코덱별 사정은 앞 글들에 있습니다. H.264의 프로파일 · 레벨은 [H.264 글](/posts/tech-blurting/h264-deep-dive/), HEVC의 `hvc1` 태그와 HDR은 [H.265 글](/posts/tech-blurting/h265-hdr-deep-dive/), AV1의 특허 풀과 하드웨어 디코더는 [AV1 글](/posts/tech-blurting/av1-vp9-deep-dive/), 오디오는 [AAC 글](/posts/tech-blurting/aac-and-friends/)과 [Opus 글](/posts/tech-blurting/opus-deep-dive/)입니다.

### 압축 이득은 시험 조건과 함께만 비용으로 옮깁니다 {#5-cdn-비용--진짜-큰-항목}

CDN이 내보내는 바이트는 비트레이트 × 시청 시간이므로, [H.265 글의 측정](/posts/tech-blurting/h265-hdr-deep-dive/#4-인코딩-비용--h264-대비-큰-부담)(Sintel 예고편 10초 1080p24, 인코더 기본값에 preset과 CRF만 지정, 같은 VMAF 93 목표, 각 1회)을 그대로 옮기면 한 시간 시청에 x264 medium 1,799kbps는 약 810MB, x265 medium 1,184kbps는 약 533MB, SVT-AV1 preset 8 1,201kbps는 약 540MB, preset 4 867kbps는 약 390MB입니다(계산값, 1MB = 10⁶바이트). 영상 하나 10초의 값이라 다른 영상에서는 비율이 달라지고, 그 대신 드는 인코딩 CPU 시간은 같은 글에, GPU 인코딩과 서버 수용량은 [NVENC 글](/posts/tech-blurting/nvenc-gpu-transcoding/)과 [라이브 트랜스코딩 서버 글](/posts/tech-blurting/live-transcoding-infrastructure/)에, 해상도별 사다리는 [ABR 사다리 글](/posts/tech-blurting/abr-ladder-design/)에 있습니다.

## 재생 실패는 선언·그릇·디코더 세 층으로 나눠 봅니다 {#9-코덱-트러블슈팅--흔한-8가지-문제}

브라우저 플레이어가 HLS를 재생하기 시작할 때 코덱 정보는 여러 단계를 지납니다. 아래 영상은 그 순서입니다. 위 단계에서 막히면 아래 단계는 시작하지 않으므로, 어디서 멈췄는지가 원인을 가릅니다. 두 번째 토큰 `ec-3`은 Chrome 157에서 둘째 단계 `isTypeSupported()`가 false를 돌려준 실측 결과입니다.

{{< motion scene="PlayerStartChain" id="fig-player-start-chain" kind="개념도" caption="플레이어는 다변형 목록의 CODECS를 읽고, isTypeSupported()로 브라우저에 묻고, addSourceBuffer()로 버퍼를 만들고, init 조각(moov의 표본 항목 · ASC)을 붙인 뒤 디코딩합니다. mp4a.40.2는 다섯 단계를 모두 지나고, ec-3은 Chrome 157에서 둘째 단계가 false라 멈춥니다." >}}

다섯 단계는 세 층으로 묶입니다. 선언은 목록의 `CODECS`처럼 사람이나 패키저가 적은 문자열, 그릇은 init 조각에 실제로 든 트랙 정보, 디코더는 그 기기가 실제로 풀 수 있는지입니다. [[fig-three-layers]]는 각 층에서 무엇을 대조할지 정리한 흐름입니다.

```mermaid {#fig-three-layers kind="개념도" caption="재생 실패를 세 층으로 좁히는 순서. 선언(목록 CODECS)이 실제 트랙(ffprobe로 본 init 조각)과 맞는지 먼저 보고, 맞으면 브라우저 지원(isTypeSupported · decodingInfo)을, 그것도 맞으면 그릇의 타임스탬프와 디코딩 로그를 봅니다." source="https://www.rfc-editor.org/rfc/rfc8216#section-6.2.4"}
flowchart TB
  accTitle: 재생 실패를 세 층으로 좁히는 순서
  accDescr: 먼저 다변형 목록의 CODECS와 ffprobe로 본 init 조각의 트랙을 대조한다. 다르면 선언 문제다. 같으면 isTypeSupported와 decodingInfo로 브라우저에 묻고, false면 디코더 문제다. true인데도 실패하면 조각의 타임스탬프와 디코딩 오류를 본다.
  subgraph L1["① 선언"]
    direction LR
    B{"CODECS =<br/>실제 트랙?"} --> C["다르면<br/>목록을 고침"]
  end
  subgraph L2["② 디코더"]
    direction LR
    D{"브라우저<br/>지원?"} --> E["false면<br/>폴백 변형"]
  end
  subgraph L3["③ 그릇 · 시각"]
    direction LR
    F["init 조각 ·<br/>FFmpeg 로그"]
  end
  L1 -- 같음 --> L2
  L2 -- true --> L3
```

### 증상마다 먼저 볼 출력이 다릅니다 {#8개-문제--원인--해결-패턴}

| 증상 | 먼저 볼 출력 | 이 글에서 확인한 예 |
|---|---|---|
| 목록을 읽자마자 재생 불가 | 목록 `CODECS`, `isTypeSupported()` | Chrome 157은 `ac-3` · `ec-3`에 false |
| 버퍼를 만들다 실패 | init 조각의 `ffprobe` | 선언 `mp4a.40.2`, 실제 HE-AAC |
| 애플 기기에서만 HEVC 실패 | `ffprobe`의 `codec_tag_string` | FFmpeg 기본 `hev1`, 애플은 `hvc1` 권고([H.265 글](/posts/tech-blurting/h265-hdr-deep-dive/#5-hvc1-vs-hev1--ios-호환의-함정)) |
| 소리가 수십 ms 어긋남 | `initial_padding`, 그릇 종류 | ADTS로 옮기면 앞 1,024표본이 재생됨([AAC 글](/posts/tech-blurting/aac-and-friends/#2-같은-aac라도-인코더가-다르면-음질이-다르다)) |
| MP4를 만들다 멈춤 | FFmpeg 오류 문자열 | `Malformed AAC bitstream detected` |
| 화면이 끊김 | `drop=` 카운터, `-v verbose` 로그 | `*** dropping frame` |

## ffprobe는 선언이 아닌 실제 트랙을 보여 줍니다 {#10-진단-도구--디버깅의-무기}

같은 HLS 출력의 목록 한 줄과, init 조각에 첫 조각을 이어 붙여 `ffprobe`로 연 결과입니다. 선언은 `mp4a.40.2`인데 실제 트랙은 HE-AAC입니다.

```text
$ grep STREAM-INF master.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2153084,AVERAGE-BANDWIDTH=2065985,RESOLUTION=640x360,CODECS="avc1.42c01e,mp4a.40.2"

$ cat init.mp4 v0.m4s > first.mp4
$ ffprobe -v error -show_entries stream=codec_name,profile,sample_rate,channels -of csv=p=0 first.mp4
h264,Constrained Baseline
aac,HE-AAC,48000,2
```

조각 하나만으로는 열리지 않는 fMP4도 init 조각을 앞에 붙이면 `ffprobe`가 읽습니다. 목록이 아니라 이 출력이 플레이어가 실제로 받을 트랙입니다.

### csv 출력 순서는 ffprobe 필드 순서입니다 {#ffprobe--영상-파일-분석의-기본}

`-show_entries`에 적은 순서대로 값이 나온다고 기대하기 쉽지만, csv 출력은 `ffprobe`가 필드를 내보내는 내부 순서를 따릅니다. Sintel 예고편에 `codec_name,profile,level,width,height,r_frame_rate,pix_fmt,bit_rate`를 요청하자 `h264,High,1920,1080,yuv420p,50,24/1,2108423`이 나왔습니다. 실제 순서는 `codec_name,profile,width,height,pix_fmt,level,r_frame_rate,bit_rate`입니다. 값과 이름을 함께 보려면 `-of default=noprint_wrappers=1`이나 `-of json`을 씁니다.

키프레임을 셀 때는 스트림을 골라야 합니다. 같은 파일에서 `ffprobe -show_packets | grep -c flags=K`는 2,445였고, `-select_streams v`를 넣자 10이었습니다. AAC 패킷은 모두 키프레임 표시(K)를 달고 있어 앞의 수에 오디오 패킷이 섞였습니다.

```bash
ffprobe -v error -select_streams v -show_entries packet=pts_time,flags -of csv=p=0 in.mp4 | grep K
```

### isTypeSupported와 decodingInfo로 브라우저에 묻습니다 {#브라우저-개발자-도구}

`MediaSource.isTypeSupported(type)`는 그 MIME 형식과 코덱 문자열로 버퍼를 만들 수 있는지를 true · false로 돌려줍니다([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/isTypeSupported_static)). `navigator.mediaCapabilities.decodingInfo()`는 채널 · 표본률 · 비트레이트까지 받아 `supported`와 함께 매끄럽게 재생되는지(`smooth`), 전력 효율이 좋은지(`powerEfficient`)를 돌려줍니다([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo)). Chrome 157에서 오디오 문자열을 물은 결과입니다.

| 문자열(`audio/mp4`) | `isTypeSupported` | `decodingInfo().supported` |
|---|---|---|
| `mp4a.40.2` · `.5` · `.29` | true | true |
| `mp4a.40.42`(xHE-AAC) | true | 묻지 않음 |
| `opus` · `flac` | true | true |
| `ac-3` · `ec-3` | false | false |

true는 「이 문자열로 버퍼를 만들 수 있다」는 뜻이지 실제 데이터를 문제없이 푼다는 보증이 아닙니다. 그래서 init 조각을 붙인 뒤의 오류(`SourceBuffer`의 `error` 이벤트, `<video>`의 `error`)도 함께 봅니다.

### hls.js는 코덱 오류를 INCOMPATIBLE_CODECS로 따로 알립니다 {#hlsjs-디버깅}

hls.js 1.7.4의 API 문서는 코덱 때문에 재생할 수 없을 때 두 오류를 냅니다. `MANIFEST_INCOMPATIBLE_CODECS_ERROR`는 목록의 모든 화질이 MediaSource와 맞지 않는 코덱일 때, `BUFFER_INCOMPATIBLE_CODECS_ERROR`는 트랙 코덱으로 MediaSource 버퍼를 하나도 만들지 못했을 때이고, 둘 다 치명적(fatal)입니다. 각 화질(`Level`)에는 목록에서 읽은 `audioCodec`, `videoCodec`, 앞 네 글자를 모은 `codecSet`(예: `avc1,mp4a`)과 목록의 `CODECS` 원문을 돌려주는 `codecs`가 있습니다([hls.js API.md v1.7.4](https://github.com/video-dev/hls.js/blob/v1.7.4/docs/API.md), [level.ts 190–192행](https://github.com/video-dev/hls.js/blob/v1.7.4/src/types/level.ts#L190-L192)). 아래는 이 이름들을 옮긴 발췌이며 이 글에서 실행하지는 않았습니다.

```js
hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
  for (const l of data.levels) console.log(l.codecs, l.audioCodec, l.videoCodec, l.codecSet);
});
hls.on(Hls.Events.ERROR, (_, data) => {
  const d = data.details;
  if (d === Hls.ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR ||
      d === Hls.ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR) console.warn(d, data.reason);
});
```

hls.js는 기본 설정(`useMediaCapabilities: true`)에서 `decodingInfo()`로 화질을 거르고, 트랙 코덱은 mp4의 표본 설명(`stsd`)이나 TS 안 ADTS의 객체 유형에서 읽고 목록 값은 그 값이 실패할 때만 씁니다. HE-AAC와 AAC-LC 문제를 다루던 `hls.swapAudioCodec()`와 `defaultAudioCodec`은 문서가 「더 이상 필요하지 않고 권하지 않는다」고 적습니다.

### WebRTC는 협상 결과를 getStats와 webrtc-internals에서 봅니다 {#chromewebrtc-internals--webrtc-디버깅의-최고}

WebRTC는 목록 대신 SDP로 코덱을 정하므로, 실제로 쓰인 코덱은 `getStats()`의 코덱 통계에서 봅니다. 받는 쪽 `inbound-rtp`의 `codecId`가 가리키는 통계에 `mimeType`과 `sdpFmtpLine`이 있고, Chrome 157의 기본 연결에서는 `audio/opus`와 `minptime=10;useinbandfec=1`이었습니다. Chrome의 `chrome://webrtc-internals` 페이지는 같은 통계를 연결마다 그래프로 보여 주고 주고받은 SDP를 남깁니다. 누적값을 구간 차이로 읽는 방법은 [Opus 글](/posts/tech-blurting/opus-deep-dive/#13-opus-모니터링--webrtc-stats-api)에 있습니다.

### FFmpeg 로그에서 찾을 문자열은 따로 있습니다 {#ffmpeg-로그-분석}

FFmpeg 로그를 검색할 때는 소스에 실제로 있는 문자열을 씁니다. 아래는 n9.0.2 소스에서 확인한 위치입니다.

| 문자열 | 뜻 | 소스 |
|---|---|---|
| `*** dropping frame` | 출력 프레임률을 맞추려고 프레임을 버림. `-v verbose`에서만 보이고 기본 로그는 진행 줄의 `drop=` 수만 보임 | [ffmpeg_filter.c 2599행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_filter.c#L2599) |
| `Malformed AAC bitstream detected: use the audio bitstream filter 'aac_adtstoasc'` | ADTS 머리가 붙은 AAC를 MP4 · FLV에 넣으려 함 | [movenc.c 7082행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/movenc.c#L7082) · [flvenc.c 1331행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/flvenc.c#L1331) |
| `Non-monotonic DTS` | 디코딩 시각이 앞 패킷보다 뒤로 감 | [ffmpeg_mux.c 180행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_mux.c#L180) |
| `Queue input is backward in time` | 오디오 인코더에 들어온 프레임 시각이 뒤로 감 | [audio_frame_queue.c 61행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/audio_frame_queue.c#L61) |

30fps 시험 화면을 `-r 15`로 내보내자 기본 로그에는 `drop=12`만 찍혔고, `-v verbose`에서 `*** dropping frame 4 at ts 2` 같은 줄이 나왔습니다. 옛 안내의 `-vsync vfr`은 9.0.2에서 「Unrecognized option 'vsync'」로 거부됐고, 같은 일은 `-fps_mode vfr`로 합니다.

## FFmpeg로 만든 HE-AAC HLS는 mp4a.40.2로 선언됩니다

FFmpeg 9.0.2의 코덱 문자열 함수는 AAC일 때 ASC의 첫 5비트를 오디오 객체 유형으로 읽어 `mp4a.40.<유형>`을 만듭니다([codecstring.c 213–222행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/codecstring.c#L213-L222)). `aac_at`이 만든 HE-AAC의 ASC는 첫 객체 유형이 2(AAC-LC, 24kHz)이고, 그 뒤 동기 확장(0x2b7)으로 SBR과 출력 48kHz를 알리는 하위 호환 방식입니다([AAC 글](/posts/tech-blurting/aac-and-friends/#6-aac-컨테이너--단순-코덱이-아니다)). 함수는 뒷부분을 읽지 않으므로 `mp4a.40.2`가 됩니다.

| 오디오 | fMP4 조각 | TS 조각 | `ffprobe`로 본 트랙 |
|---|---|---|---|
| `aac` LC 128kbps | `mp4a.40.2` | `mp4a.40.2` | LC |
| `aac_at` LC 128kbps | `mp4a.40.2` | `mp4a.40.2` | LC |
| `aac_at` HE-AAC 64kbps | `mp4a.40.2` | `mp4a.40.2` | HE-AAC |
| `aac_at` HE-AAC v2 32kbps | `mp4a.40.2` | `mp4a.40.2` | HE-AACv2 |

애플 규격 부록은 HE-AAC를 `mp4a.40.5`, HE-AAC v2를 `mp4a.40.29`로 적고, fMP4의 HE-AAC는 SBR을 명시적으로 신호하라고 합니다(2.24, MUST, [Apple HLS Authoring Specification](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)). `aac_at`의 ASC는 동기 확장으로 SBR을 알리므로 트랙 쪽 신호는 있고, 어긋난 것은 목록의 문자열입니다. LC만 아는 디코더가 이 트랙을 받으면 SBR 없이 24kHz 코어만 풉니다.

Chrome 157에서는 증상이 나지 않았습니다. 오디오만 담은 HE-AAC fMP4의 init 조각과 첫 조각을 `audio/mp4; codecs="mp4a.40.2"`와 `"mp4a.40.5"` 두 가지로 선언한 버퍼에 각각 붙이자, 둘 다 오류 없이 0–4.01초가 버퍼에 들어가고 1.5초 동안 재생 위치가 약 1.46초까지 움직였습니다. 브라우저 하나에서 재생된다고 목록이 맞는 것은 아닙니다. FFmpeg 9.0.2의 HLS 먹서에는 이 문자열을 바꾸는 옵션이 없으므로, HE-AAC 변형을 내보낼 때는 `ffprobe`로 본 프로파일에 맞춰 목록의 `mp4a.40.2`를 `.5`(HE-AAC) 또는 `.29`(HE-AAC v2)로 고쳐 씁니다. 같은 오디오 그룹 안에서 LC와 HE를 섞지 않는 것도 방법입니다. 애플 규격은 불연속 지점에서 코덱을 바꾸지 말라고 권합니다(8.16).

## 브라우저 지원은 날짜와 조건을 붙여 확인합니다 {#11-브라우저별-코덱-호환성-매트릭스-2024년}

지원 표는 판과 조건이 붙어야 쓸모가 있습니다. caniuse(2026-11-13 확인)의 `<audio>` 재생 기준입니다.

| 코덱 | Chrome | Firefox | Safari(macOS) | iOS Safari |
|---|---|---|---|---|
| AAC | 지원 | 부분(MP4 안, 운영체제 코덱이 있을 때) | 지원 | 지원 |
| Opus | 33부터 | 15부터 | 18.4부터 부분(macOS 15.4 이상) | 18.4부터 |
| FLAC | 56부터 | 51부터 | 13부터 | 11부터 |
| AC-3 · E-AC-3 | 안 함 | 안 함 | 안 함 | 부분(「probably」 응답, 재생은 미검증) |

출처는 [caniuse AAC](https://caniuse.com/aac), [Opus](https://caniuse.com/opus), [FLAC](https://caniuse.com/flac), [AC-3 · EC-3](https://caniuse.com/ac3-ec3)입니다. 이 표는 `<audio>` 요소 기준이라 MSE와 다를 수 있고, MSE는 위 Chrome 157 실측처럼 `isTypeSupported()`로 직접 묻습니다. 영상 코덱은 [H.265 글](/posts/tech-blurting/h265-hdr-deep-dive/#10-h265의-디코딩-측--시청자-디바이스-호환성)과 [AV1 글](/posts/tech-blurting/av1-vp9-deep-dive/#7-av1-디코딩-부담)에 같은 방식으로 적었습니다.

## 새 코덱은 폴백 변형을 둔 채 들입니다 {#12-코덱-마이그레이션--5단계-점진-도입}

새 코덱 변형은 기존 H.264 · AAC 변형을 지우지 않고 더합니다. HLS 규격은 `CODECS`가 그 변형의 모든 조각에 든 형식을 빠짐없이 적으라고 하므로(MUST, [RFC 8216 6.2.4](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.4)), 목록을 만든 뒤에는 위처럼 `ffprobe` 결과와 대조합니다. 플레이어는 `isTypeSupported()`나 `decodingInfo()`로 못 푸는 변형을 거르고, hls.js는 이를 기본으로 합니다. 배포 뒤에는 코덱별 오류(위 hls.js 오류 이름, `SourceBuffer` 오류)를 따로 셉니다. 문제가 생기면 다변형 목록에서 새 변형 줄만 빼서 되돌릴 수 있습니다. 같은 변형 안에서 코덱을 바꾸는 대신 변형을 나누는 것은 애플 규격의 불연속 권고(8.16)와도 맞습니다.

## 목록의 문자열을 믿기 전에 실제 트랙과 브라우저 응답을 함께 봅니다 {#정리하면}

- 재생 실패는 선언(목록 `CODECS`) · 그릇(init 조각의 트랙) · 디코더(브라우저 응답) 순서로 대조합니다.
- 선언은 도구가 틀리게 적을 수 있습니다. FFmpeg 9.0.2는 HE-AAC에도 `mp4a.40.2`를 적었습니다.
- 한 브라우저에서 재생된다는 것은 그 브라우저의 관대함일 수 있습니다. 규격 표와 `ffprobe` 결과로 확인합니다.
- 로그 검색어와 옵션은 쓰는 판의 소스와 도움말에서 확인합니다. 9.0.2에는 `-vsync`가 없습니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 14:15–14:50(KST)에 실행했습니다. 코덱 문자열 · 프로파일 · 브라우저 응답은 시간이 결과에 들어가지 않는 값입니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1. 1분 load average는 측정 중 4.6–10.1이었습니다(다른 세션의 작업 포함).
- 도구: FFmpeg 9.0.2(Homebrew 9.0.2_1), Google Chrome 157.0.8103.51(헤드리스, Playwright).
- 입력: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p(© copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4 (sha256 `34bbd52a4b89fdf63c8ace50b268da26653a59508288100cd3c23de276db7931`). 소리를 PCM으로 푼 `sintel.wav`와 시험 화면을 함께 썼습니다.
- HLS: `ffmpeg -f lavfi -i testsrc2=size=640x360:rate=30 -i sintel.wav -t 6 -map 0:v -map 1:a -c:v libx264 -preset ultrafast -g 30 -c:a <aac|aac_at> [-profile:a <4|28>] -b:a <128k|64k|32k> -f hls -hls_segment_type <fmp4|mpegts> -hls_time 2 -hls_list_size 0 -master_pl_name master.m3u8 v.m3u8`, 목록의 `CODECS`와 `cat init.mp4 v0.m4s`(TS는 `v0.ts`)의 `ffprobe` 결과를 대조했습니다.
- 브라우저: `MediaSource.isTypeSupported()`와 `decodingInfo()`(type `media-source`, 48kHz 스테레오 128kbps)에 같은 문자열을 물었습니다. 재생 시험은 오디오만 담은 HE-AAC 64kbps fMP4(`-hls_time 4`)의 `init.mp4`와 `a0.m4s`를 각 선언의 `SourceBuffer`에 붙이고 소리를 끈 `<audio>`로 1.5초 재생했습니다.
- `ffprobe`: 본문 명령 그대로입니다. 프레임 버림은 `ffmpeg -f lavfi -i testsrc2=size=320x240:rate=30 -t 1 -r 15 -f null -`를 기본 로그와 `-v verbose`로 두 번 돌렸습니다.

## 출처

- FFmpeg n9.0.2 소스: [codecstring.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/codecstring.c#L213-L222) · [ffmpeg_filter.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_filter.c#L2599) · [movenc.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/movenc.c#L7082) · [flvenc.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/flvenc.c#L1331) · [ffmpeg_mux.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/fftools/ffmpeg_mux.c#L180) · [audio_frame_queue.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/audio_frame_queue.c#L61)
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 2.24, 8.16, 부록 코덱 문자열
- [RFC 8216, HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — 4.3.4.2 CODECS 속성, 6.2.4 변형의 CODECS
- [hls.js v1.7.4 API.md](https://github.com/video-dev/hls.js/blob/v1.7.4/docs/API.md) · [src/types/level.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/types/level.ts#L190-L192) (2026-10-28 릴리스)
- MDN: [MediaSource.isTypeSupported()](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/isTypeSupported_static) · [MediaCapabilities.decodingInfo()](https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo)
- caniuse(2026-11-13 확인): [AAC](https://caniuse.com/aac) · [Opus](https://caniuse.com/opus) · [FLAC](https://caniuse.com/flac) · [AC-3 · EC-3](https://caniuse.com/ac3-ec3) · 같은 데이터 [aac.json](https://github.com/Fyrd/caniuse/blob/main/features-json/aac.json) · [opus.json](https://github.com/Fyrd/caniuse/blob/main/features-json/opus.json) · [flac.json](https://github.com/Fyrd/caniuse/blob/main/features-json/flac.json) · [ac3-ec3.json](https://github.com/Fyrd/caniuse/blob/main/features-json/ac3-ec3.json) (caniuse.com은 자동 접속을 막아 같은 데이터 파일로 확인)
- [Sintel](https://durian.blender.org/sharing/) — 시험 영상, © copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
