---
title: "DASH는 목록 대신 MPD 규칙으로 조각 주소를 계산합니다"
date: 2026-06-20T04:17:40+09:00
lastmod: "2026-11-12T22:00:00+09:00"
description: "HLS 플레이어는 조각 주소가 적힌 목록을 계속 다시 받고, DASH 플레이어는 MPD의 SegmentTemplate 규칙과 시계로 조각 번호를 계산할 수 있습니다. MPEG의 제안 요청(2010-04)부터 ISO/IEC 23009-1 1판(2012-04)과 6판(2026-07)까지의 연혁, Period · AdaptationSet · Representation 계층과 HLS 태그의 대응, 광고 구간을 적는 Period와 DATERANGE, ContentProtection과 EXT-X-KEY, 기기별 기본 재생기와 저지연 모드를 규격 · 공식 문서로 비교했습니다."
categories: ["tech-blurting"]
tags: ["DASH", "MPD", "HLS", "SegmentTemplate", "DRM", "Media3"]
draft: false
---

HLS 플레이어는 라이브 내내 조각 주소가 적힌 목록을 다시 받아야 다음 조각을 알 수 있습니다. DASH(Dynamic Adaptive Streaming over HTTP)의 MPD(Media Presentation Description)는 조각 주소를 하나씩 적지 않고 `SegmentTemplate`이라는 규칙으로 적을 수 있어, 플레이어가 시계와 그 규칙으로 다음 조각 번호를 계산합니다. DASH는 MPEG가 2010년 4월 HTTP 스트리밍 제안을 요청해 만든 국제 표준으로, ISO/IEC 23009-1 1판이 2012년 4월에 나왔고 지금은 2026년 7월의 6판입니다. 어느 쪽을 낼지는 표현력보다 대상 기기의 기본 재생기와 DRM이 정합니다. Apple 기기의 기본 재생기는 HLS를 받고, Android의 Media3는 둘 다 받습니다.

## DASH는 HTTP 적응 스트리밍을 ISO 표준으로 맞추려고 나왔습니다 {#1-dash의-출신--isoiec의-apple-견제}

2010년 무렵 HTTP로 화질을 바꿔 가며 보내는 방식은 회사마다 달랐습니다. Apple의 HLS는 개인 제출 인터넷 드래프트였고, 3GPP는 2010년 3월 Release 9에서 자체 적응 HTTP 스트리밍(AHS)을 마쳤습니다. MPEG(ISO/IEC JTC 1/SC 29/WG 11)은 2010년 4월 드레스덴 회의에서 「HTTP Streaming of MPEG Media」 제안 요청(N11338)을 냈습니다. Qualcomm의 Thomas Stockhammer는 이 경위를 W3C 워크숍 논문에 정리했습니다([Stockhammer, 2010](https://www.w3.org/2010/11/web-and-tv/papers/webtv2_submission_64.pdf)).

| 날짜 | 일 | 근거 |
|---|---|---|
| 2010-04 | MPEG 제안 요청 N11338 | Stockhammer 논문 참고문헌 |
| 2011-11 | 각국 표준 기관 투표로 ISO/IEC 23009-1 승인, 2011년 12월 98차 MPEG 회의에서 발표 | [98차 MPEG 회의 보고](https://multimediacommunication.blogspot.com/2011/12/mpeg-news-report-from-98th-meeting.html) |
| 2011 | Qualcomm · Netflix · Microsoft · Akamai · Ericsson · Samsung이 DASH-IF 시작, 2012년 정식 출범 | [SVTA 발표문](https://www.svta.org/2024/07/23/dash-if-becomes-part-of-the-svta/) |
| 2012-04-03 | ISO/IEC 23009-1:2012(1판) 발행 | [IEC 웹스토어 판 기록](https://webstore.iec.ch/en/publication/114980) |
| 2024-07-23 | DASH-IF가 SVTA(Streaming Video Technology Alliance)의 작업 그룹으로 합류 | SVTA 발표문 |
| 2026-07-14 | ISO/IEC 23009-1:2026(6판) 발행 | IEC 웹스토어 |

HLS 쪽은 2017년 RFC 8216(Informational)이 됐고, 개정 초안 22판이 RFC 편집자에게 넘어가 있습니다([HLS 기본 글](/posts/tech-blurting/hls-just-files/)). 한쪽은 ISO/IEC 국제 표준, 다른 쪽은 IETF 개인 제출 RFC라는 차이가 있지만, 둘 다 HTTP로 조각을 받는 같은 구조입니다.

## MPD는 Period · AdaptationSet · Representation으로 나뉩니다 {#2-mpd의-계층-구조--xml로-모든-걸-표현}

MPD는 XML 문서이고 세 층으로 나뉩니다. Period는 시간 구간(본편, 광고), AdaptationSet은 서로 바꿔 쓸 수 있는 트랙 묶음(영상, 한국어 오디오), Representation은 그 묶음 안의 개별 판(1080p, 720p)입니다. [[fig-mpd-layers]]에서 조각 주소 규칙이 어디에 붙는지 보십시오.

```mermaid {#fig-mpd-layers kind="개념도" caption="MPD의 계층. Period가 시간 구간을, AdaptationSet이 바꿔 쓸 수 있는 트랙 묶음을, Representation이 화질별 판을 나타내고, SegmentTemplate이 init과 조각 주소를 만드는 규칙을 담습니다. ISO/IEC 23009-1의 MPD 구조를 줄여 그렸습니다." source="https://dashif.org/Guidelines-TimingModel/"}
flowchart TB
  accTitle: MPD 계층 구조
  accDescr: MPD 아래 Period가 있고, Period 아래 영상 AdaptationSet과 한국어 오디오 AdaptationSet이 있다. 영상 AdaptationSet 아래 1080p와 720p Representation이 있고, Representation 아래 SegmentTemplate이 init과 조각 번호 규칙을 담는다.
  M["MPD<br/>type=dynamic"] --> P["Period"]
  P --> V["AdaptationSet<br/>영상"]
  P --> A["AdaptationSet<br/>오디오 ko"]
  V --> R["Representation<br/>1080p · 720p"]
  R --> T["Segment<br/>Template<br/>init · $Number$"]
```

아래는 [CMAF 글](/posts/tech-blurting/cmaf-deep-dive/)의 실측에서 FFmpeg 9.0.2가 쓴 MPD를 줄인 것입니다(그 실측은 녹화 파일이라 `type="static"`입니다).

```xml
<MPD type="static" mediaPresentationDuration="PT4.0S" maxSegmentDuration="PT2.0S"
     profiles="urn:mpeg:dash:profile:isoff-live:2011">
  <Period id="0" start="PT0.0S">
    <AdaptationSet contentType="video" segmentAlignment="true" startWithSAP="1">
      <Representation id="0" mimeType="video/mp4" codecs="avc1.64001f"
                      bandwidth="3106960" width="1280" height="720">
        <SegmentTemplate timescale="1000000" duration="2000000"
                         availabilityTimeOffset="1.500"
                         initialization="init.mp4" media="seg-$Number$.m4s" startNumber="1"/>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>
```

### HLS 목록과 MPD 요소는 이렇게 대응합니다 {#mpd-vs-m3u8--표현력-vs-단순함}

| 하는 일 | HLS | DASH MPD |
|---|---|---|
| 전체 목차 | 다변형 재생 목록 | `MPD` |
| 화질별 판 | `EXT-X-STREAM-INF` + 미디어 목록 | `Representation` |
| 언어별 오디오 · 자막 묶음 | `EXT-X-MEDIA`의 `GROUP-ID` | `AdaptationSet`(`lang`) |
| 조각 주소 | 미디어 목록에 하나씩 나열 | `SegmentTemplate` 규칙, `SegmentTimeline`, `SegmentList` |
| 초기화 파일 | `EXT-X-MAP` | `Initialization` · `@initialization` |
| 최대 조각 길이 | `EXT-X-TARGETDURATION` | `@maxSegmentDuration` |
| 끝났음 | `EXT-X-ENDLIST` | `type="static"` |
| 시간 구간 경계 | `EXT-X-DISCONTINUITY` · `EXT-X-DATERANGE` | `Period` · `EventStream` |
| 암호화 | `EXT-X-KEY` | `ContentProtection` |

이 표는 두 규격의 요소를 하는 일로 짝지은 것이고, 일대일로 바꿔 쓸 수 있다는 뜻은 아닙니다. 예를 들어 HLS의 조각 목록은 조각마다 길이가 달라도 그대로 적지만, `SegmentTemplate@duration`은 모든 조각이 같은 길이라고 가정합니다.

## SegmentTemplate은 시각에서 조각 번호를 계산하게 합니다 {#segmenttemplate--dash의-핵심-효율}

라이브 MPD(`type="dynamic"`)는 `availabilityStartTime`으로 MPD 시간축의 0점을 벽시계에 묶습니다. `SegmentTemplate@duration`으로 조각 길이가 일정하다고 적으면, 플레이어는 지금 시각과 그 길이로 받을 수 있는 마지막 조각 번호를 셉니다. DASH-IF 타이밍 지침은 조각의 끝 시각이 「지금 + availabilityTimeOffset」 안에 들면 받을 수 있다고 설명하고(13.3절), 이렇게 스스로 늘어나는 조각 목록에서는 MPD를 다시 받지 않고도 새 조각 주소를 얻을 수 있다고 적습니다(13.6.2절).

```js
// SegmentTemplate@duration(단순 주소)에서 받을 수 있는 마지막 조각 번호 — 설명용 계산
const segSec = duration / timescale;                       // 2초
const now = (Date.now() - Date.parse(availabilityStartTime)) / 1000 - periodStart;
const lastIndex = Math.floor((now + availabilityTimeOffset) / segSec) - 1;
const url = media.replace('$Number$', String(startNumber + lastIndex));
```

아래 영상에서 HLS 플레이어가 목록을 다시 받아야 다음 조각 이름을 아는 동안, DASH 플레이어는 시계만 보고 다음 번호를 계산하는 차이를 보십시오.

{{< motion scene="TemplateVsReload" id="fig-template-vs-reload" kind="개념도" caption="같은 2초 조각을 받는 두 플레이어. HLS 플레이어는 목록을 다시 받아 새 조각 줄을 확인한 뒤 그 조각을 요청하고, DASH 플레이어는 MPD의 SegmentTemplate 규칙과 시계로 조각 번호를 계산해 바로 요청합니다. 요청 시점과 번호는 설명용입니다." >}}

그렇다고 DASH가 MPD를 한 번만 받는 것은 아닙니다. `minimumUpdatePeriod`가 있으면 받은 MPD는 그 시간 동안만 유효하므로 플레이어가 MPD를 다시 받고, 조각 길이가 일정하지 않으면 `SegmentTimeline`으로 조각마다 시각을 적어 MPD를 갱신해야 합니다. 시계 계산은 클라이언트와 서버 시각이 맞아야 정확하므로, DASH-IF 지침은 라이브 MPD에 시각 동기 방법(`UTCTiming`)을 하나 이상 두라고 정합니다(SHALL).

## 광고 구간은 Period와 DATERANGE로 표시합니다 {#3-dash의-진짜-강점--period-기반-광고-삽입}

DASH는 본편과 광고를 서로 다른 Period로 나눠 MPD에 적을 수 있습니다. Period마다 AdaptationSet과 주소 규칙을 따로 두므로, 광고 Period만 시청자별로 다르게 만들고 본편 조각은 모든 시청자가 같은 주소로 받게 할 수 있습니다. Media3 ExoPlayer는 여러 Period 재생을 지원하지만, 서버가 지시하는 xlink 광고 삽입은 지원하지 않습니다([Media3 DASH 문서](https://developer.android.com/media/media3/exoplayer/dash)).

HLS는 같은 일을 목록 태그로 합니다. 광고 경계에는 `EXT-X-DISCONTINUITY`를 달고, SCTE-35 신호는 `EXT-X-DATERANGE`의 `SCTE35-OUT` · `SCTE35-IN` 속성에 담습니다([RFC 8216 4.3.2.7.1](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.2.7.1)). 흔히 보이는 `EXT-X-CUE-OUT` · `EXT-X-CUE-IN`은 RFC에 없는 태그입니다. 개정 초안 부록 D는 `CLASS="com.apple.hls.interstitial"`인 `EXT-X-DATERANGE`에 `X-ASSET-URI`나 `X-ASSET-LIST`로 광고 자산을 가리키는 Interstitials를 정합니다. 본편 목록은 그대로 두고 플레이어가 그 시점에 다른 자산을 재생하는 방식입니다.

## DRM 신호는 ContentProtection과 EXT-X-KEY로 다르게 적습니다 {#4-dash의-또-다른-강점--cenc-통합-drm}

DASH는 `ContentProtection` 요소를 여러 개 둡니다. 하나는 공통 암호화 방식을 알리고(`urn:mpeg:dash:mp4protection:2011`, `value="cenc"` 또는 `"cbcs"`), 나머지는 DRM 시스템마다 시스템 ID로 구분합니다. 시스템 ID는 DASH-IF가 [식별자 목록](https://dashif.org/identifiers/content_protection/)으로 관리합니다.

```xml
<ContentProtection schemeIdUri="urn:mpeg:dash:mp4protection:2011" value="cbcs"
                   cenc:default_KID="…"/>
<!-- Widevine -->
<ContentProtection schemeIdUri="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"/>
<!-- PlayReady -->
<ContentProtection schemeIdUri="urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95"/>
```

HLS는 미디어 목록의 `EXT-X-KEY`로 적습니다. FairPlay Streaming이면 방식은 `SAMPLE-AES`, 키 형식은 `com.apple.streamingkeydelivery`여야 하고(애플 저작 규격 13.2 · 13.3), 키 주소는 보통 `skd://`로 시작합니다.

「CENC가 없으면 DRM마다 세 번 인코딩한다」는 설명은 틀립니다. 암호화는 인코딩한 결과를 다시 잠그는 일이라 다시 인코딩하지 않습니다. 실제 갈림은 암호화 방식입니다. FairPlay는 `cbcs`만 받고 Android TV의 PlayReady SL2000은 `cenc`만 받으므로, 둘을 함께 지원하려면 같은 인코딩을 두 방식으로 암호화해 두 벌을 둡니다. 대상이 모두 `cbcs`를 받으면 한 벌로 됩니다([CMAF 글](/posts/tech-blurting/cmaf-deep-dive/)).

## 어느 기기가 무엇을 재생하는지가 선택을 정합니다 {#6-그래서-왜-hls가-이겼나}

| 재생기 | HLS | DASH | 근거 |
|---|---|---|---|
| Apple AVPlayer(iOS · tvOS · macOS 앱) | 재생 | 문서의 재생 대상에 없음 | [AVPlayer 문서](https://developer.apple.com/documentation/avfoundation/avplayer) |
| Safari 내장(`<video src>`) | 재생 | 없음 | [Apple HLS 개요](https://developer.apple.com/documentation/http-live-streaming) |
| iOS 17.1 이상 Safari의 JavaScript 재생기 | hls.js 1.5.0+ | dash.js 4.7.3+ | ManagedMediaSource 지원([hls.js](https://github.com/video-dev/hls.js/releases/tag/v1.5.0), [dash.js](https://github.com/Dash-Industry-Forum/dash.js/releases/tag/v4.7.3)) |
| Android Media3 ExoPlayer | HLS 모듈 | DASH 모듈(fMP4 · WebM · Matroska) | [Media3 HLS](https://developer.android.com/media/media3/exoplayer/hls) · [DASH](https://developer.android.com/media/media3/exoplayer/dash) 문서 |
| MSE가 있는 브라우저 | hls.js | dash.js | 각 저장소 |
| Shaka Player | 재생 | 재생 | [Shaka Player README](https://github.com/shaka-project/shaka-player) |

ExoPlayer는 지금 AndroidX Media3 라이브러리의 재생기입니다. 브라우저에서는 JavaScript 재생기가 MSE(Media Source Extensions)로 둘 다 재생할 수 있으므로, 실제로 선택을 가르는 곳은 앱의 기본 재생기와 TV · 셋톱 같은 기기입니다.

### Apple 기기 기본 재생기는 HLS를 받습니다 {#이유-1-ios-강제}

AVPlayer 문서는 이 재생기가 로컬 · 원격 파일 미디어와 「HTTP Live Streaming으로 제공되는 오디오 · 비디오 미디어」를 재생한다고 적고, DASH는 적지 않습니다. Apple 기기용 앱이 기본 재생기를 쓰거나 Safari 내장 재생을 쓰려면 HLS를 내야 합니다. iOS 17.1 이상에서는 ManagedMediaSource 덕분에 Safari에서 dash.js도 돌 수 있지만, 그 경우 재생 품질과 DRM(FairPlay는 HLS의 `SAMPLE-AES` 방식)은 따로 확인해야 합니다.

## 두 형식 모두 저지연 모드가 따로 있습니다

일반 HLS와 일반 DASH는 모두 조각이 다 만들어진 뒤에 받습니다. 저지연은 각자 다른 방식으로 풉니다.

| 방식 | 핵심 | 확인한 지원 |
|---|---|---|
| LL-HLS | 부분 조각(파트), 보류 목록 요청, PRELOAD-HINT | hls.js 1.0.0+, [LL-HLS 글](/posts/tech-blurting/ll-hls-deep-dive/) |
| LL-DASH | CMAF 청크를 만들면서 chunked 전송, `availabilityTimeOffset`로 일찍 요청 | Media3의 「초저지연 CMAF 라이브 재생」, FFmpeg `-ldash`, Shaka Packager |

LL-HLS는 파트를 다 만든 뒤 한 번에 보내고(개정 초안 6.2.6절), LL-DASH는 만들어지는 청크를 흘려보냅니다. 두 방식 모두 CMAF 청크를 바탕으로 쓸 수 있지만, 서버와 CDN에 요구하는 동작이 다릅니다.

## CMAF로 미디어를 맞추면 매니페스트 두 벌만 남습니다 {#7-그래서-둘이-수렴-중--cmaf의-미래}

HLS가 fMP4를 받게 되면서, CMAF 조각 한 벌을 HLS 목록과 DASH MPD가 함께 가리킬 수 있습니다. 포장과 저장, CDN 캐시가 한 벌로 줄고 매니페스트만 두 벌 남습니다. 조건은 코덱, 암호화 방식(`cbcs`), 조각 시각 연속성이 두 쪽에서 맞는 것입니다. 자세한 조건은 [CMAF 글](/posts/tech-blurting/cmaf-deep-dive/)에 있습니다.

## HLS만 낼지 DASH도 낼지는 재생 기기와 DRM이 정합니다 {#8-그럼-우리는-뭘-써야-하나}

- **대상에 Apple 기기 기본 재생기나 Safari 내장 재생이 있다** — HLS가 필요합니다.
- **대상이 브라우저와 Android뿐이다** — hls.js와 Media3로 HLS 하나만 내도 됩니다. DASH만 내도 됩니다.
- **DRM 대상에 `cenc`만 받는 기기가 있다** — 암호화 파일이 두 벌이 됩니다. 매니페스트를 하나로 줄여도 이 비용은 남습니다.
- **광고를 본편 사이에 넣는다** — DASH는 Period, HLS는 DATERANGE와 Interstitials를 지원하는 재생기인지 확인합니다.

「DASH가 기술적으로 더 좋은데 HLS가 이겼다」는 설명보다, 내 서비스가 닿아야 하는 재생기 목록을 먼저 적어 보는 편이 결정을 빨리 끝냅니다. 그 목록이 둘 다 받으면 CMAF로 미디어를 한 벌로 맞추고, 매니페스트는 대상 재생기가 요구하는 만큼만 내십시오.

## 출처

- [ISO/IEC 23009-1:2026 DASH](https://webstore.iec.ch/en/publication/114980) (6판, 2026-07-14, 판 기록에 1판 2012-04-03)
- [Thomas Stockhammer, 「Dynamic Adaptive Streaming over HTTP – Design Principles and Standards」](https://www.w3.org/2010/11/web-and-tv/papers/webtv2_submission_64.pdf) (W3C Web and TV 워크숍, 2010) — 3GPP AHS, MPEG N11338(2010-04)
- [Christian Timmerer, 「MPEG news: a report from the 98th meeting」](https://multimediacommunication.blogspot.com/2011/12/mpeg-news-report-from-98th-meeting.html) (2011-12-08)
- [SVTA, 「DASH Industry Forum (DASH-IF) Becomes Part of the SVTA」](https://www.svta.org/2024/07/23/dash-if-becomes-part-of-the-svta/) (2024-07-23)
- [DASH-IF, Timing Model 지침](https://dashif.org/Guidelines-TimingModel/) — 13.3 가용 창, 13.6.2 MPD 갱신 사이의 새 조각
- [DASH-IF, Content Protection 식별자 목록](https://dashif.org/identifiers/content_protection/)
- [RFC 8216](https://www.rfc-editor.org/rfc/rfc8216) — 4.3.2.7.1 SCTE-35와 DATERANGE · [draft-pantos-hls-rfc8216bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) — 6.2.6, 부록 D Interstitials
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) — 13.2 · 13.3
- [Apple, AVPlayer](https://developer.apple.com/documentation/avfoundation/avplayer) · [Apple, HTTP Live Streaming 개요](https://developer.apple.com/documentation/http-live-streaming)
- [Android Developers, Media3 ExoPlayer DASH](https://developer.android.com/media/media3/exoplayer/dash) · [HLS](https://developer.android.com/media/media3/exoplayer/hls)
- [hls.js 1.5.0 릴리스](https://github.com/video-dev/hls.js/releases/tag/v1.5.0) · [dash.js 4.7.3 릴리스](https://github.com/Dash-Industry-Forum/dash.js/releases/tag/v4.7.3) (2023-12-08, Managed Media Source 지원) · [Shaka Player](https://github.com/shaka-project/shaka-player)

다음 편: [WebRTC는 NAT 뒤 두 브라우저를 ICE 후보로 잇습니다](/posts/tech-blurting/webrtc-deep-dive/)
