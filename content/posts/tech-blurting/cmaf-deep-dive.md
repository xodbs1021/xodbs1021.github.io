---
title: "CMAF는 HLS와 DASH가 같은 조각 파일을 쓰게 합니다"
date: 2026-06-22T11:15:31+09:00
lastmod: "2026-11-12T22:56:00+09:00"
description: "HLS와 DASH는 매니페스트가 다르지만 fMP4 미디어는 맞출 수 있습니다. CMAF(ISO/IEC 23000-19, 3판 2024)는 그 조각 · 청크 형식을 정합니다. FFmpeg 9.0.2의 CMAF 플래그(+cmaf)로 만든 2초 fMP4 조각을 Bento4로 풀어 init과 moof+mdat 청크 4개, tfdt 간격, 브랜드를 확인했고, 공유로 줄어드는 것은 인코딩이 아니라 포장과 저장이라는 점, tfdt가 어긋나면 오류 없이 구간이 사라지는 사례, 청크와 LL-HLS 파트 · LL-DASH의 관계, 한 파일로 여러 DRM을 쓰려면 cbcs로 맞춰야 하는 조건을 규격 문서로 정리했습니다."
categories: ["tech-blurting"]
tags: ["CMAF", "fMP4", "HLS", "DASH", "CENC", "cbcs"]
draft: false
---

HLS는 오랫동안 MPEG-2 TS 조각을, DASH는 fMP4(fragmented MP4) 조각을 주로 썼습니다. 둘 다 내는 서비스는 같은 영상을 두 형식으로 포장하고 따로 저장했고, CDN도 두 벌을 캐시했습니다. HLS가 `EXT-X-MAP`으로 fMP4 조각을 받게 되면서(RFC 8216, 프로토콜 버전 6) 미디어를 한 벌로 맞출 길이 열렸고, CMAF(Common Media Application Format, ISO/IEC 23000-19, 2024년 3판)가 그 fMP4 트랙 · 조각 · 청크 형식을 정합니다. 맞추면 매니페스트만 두 벌이 남습니다. 다만 줄어드는 것은 포장과 저장이지 인코딩이 아니고, 암호화 방식과 플레이어 지원이 맞아야 합니다. FFmpeg 9.0.2의 CMAF 플래그(`+cmaf`)로 2초 fMP4 조각을 만들어 풀어 보니, 0.5초짜리 moof+mdat 청크 4개가 한 파일에 들어 있었습니다.

## HLS와 DASH는 매니페스트만 다르고 미디어 형식은 맞출 수 있습니다 {#1-cmaf가-끝낸-hlsdash-분열}

두 규약 모두 HTTP로 조각을 받는 적응 스트리밍입니다. 다른 것은 조각을 알려 주는 문서입니다. HLS는 텍스트 재생 목록(`.m3u8`)을, DASH는 XML 문서인 MPD(Media Presentation Description)를 씁니다. 미디어 형식은 겹칩니다. HLS는 TS · fMP4 · 묶음 오디오를 받고([RFC 8216 3절](https://www.rfc-editor.org/rfc/rfc8216#section-3)), Android의 Media3 ExoPlayer는 DASH에서 fMP4 · WebM · Matroska를 받고 MPEG-TS는 받지 않습니다([Media3 DASH 문서](https://developer.android.com/media/media3/exoplayer/dash)). 두 쪽이 함께 받는 형식이 fMP4이고, CMAF는 그 fMP4를 적응 스트리밍용으로 좁힌 형식입니다.

RFC 8216 3.3절은 fMP4 조각과 그 초기화 파일의 조건을 적은 뒤 「CMAF 헤더와 CMAF 조각은 이 요건을 만족한다」고 덧붙입니다. 공유 구성은 이렇게 생깁니다.

```text
out/
├── master.m3u8      ← HLS 다변형 목록
├── 720p.m3u8        ← HLS 미디어 목록 (EXT-X-MAP: init.mp4)
├── manifest.mpd     ← DASH MPD
├── init.mp4         ← 공유 초기화 파일
└── seg-1.m4s …      ← 공유 조각
```

## 공유로 줄어드는 것은 포장과 저장이지 인코딩이 아닙니다 {#2-cmaf-도입-효과--실제-절감-수치}

인코딩은 원본 화면을 H.264 같은 압축 비트스트림으로 만드는 일이고, 포장은 그 비트스트림을 TS나 fMP4 그릇에 담는 일입니다. 같은 H.264 비트스트림은 다시 인코딩하지 않고 TS에도 fMP4에도 담을 수 있습니다. hls.js가 TS 조각을 브라우저에서 fMP4로 바꿔 넣을 수 있는 것도 이 때문입니다([HLS 기본 글](/posts/tech-blurting/hls-just-files/)).

그래서 CMAF 이전에도 HLS와 DASH를 위해 영상을 두 번 인코딩할 필요는 없었습니다. 두 번 했던 것은 포장 · 저장 · 캐시입니다. CMAF로 맞추면 이 셋이 한 벌로 줄어듭니다. 얼마나 줄어드는지는 변형 수, 보관 기간, 시청 분포에 따라 달라 하나의 비율로 말할 수 없습니다. 암호화 방식이 두 쪽에서 다르면 암호화한 조각은 다시 두 벌이 됩니다. 이 조건은 아래 DRM 절에 있습니다.

## fMP4는 init과 moof+mdat 조각으로 나뉩니다 {#3-fmp4가-가능했던-이유--일반-mp4와의-차이}

일반 MP4는 파일 하나에 모든 표본의 위치 · 크기 · 시각 표(`moov` 안 `stbl`)와 미디어 데이터(`mdat`)를 둡니다. 표가 파일 전체를 알아야 하므로 끝까지 만들어야 완성됩니다. fMP4는 표를 조각마다 나눠 둡니다.

| 구분 | 일반 MP4 | fMP4 |
|---|---|---|
| 표본 표 | `moov` 안에 파일 전체 분량 | 조각마다 `moof` 안에 그 조각 분량 |
| `moov` | 표본 표까지 담음 | 트랙 설정만 담고 표본 수는 0, `mvex`로 조각이 뒤따름을 알림 |
| 만드는 순서 | 끝까지 만든 뒤 표 완성 | 조각 하나를 만들 때마다 내보낼 수 있음 |

RFC 8216 3.3절은 fMP4 초기화 파일이 `iso6` 이상과 호환되는 브랜드를 `ftyp`에 담고, 트랙마다 `trak`을 두되 표본 수는 0이며, 마지막 `trak` 뒤에 `mvex`를 두라고 정합니다. 조각의 각 트랙 조각(`traf`)에는 디코딩 시작 시각 상자 `tfdt`가 반드시 있어야 합니다.

## init에는 트랙 설정이, 조각에는 시각과 표본 표가 들어 있습니다 {#4-initmp4-박스-트리}

FFmpeg 9.0.2의 DASH 묶개에 CMAF 호환 플래그(`movflags=+cmaf`)를 주고 1280×720 30fps H.264를 2초 조각 · 0.5초 청크로 만들었습니다. [[fig-cmaf-init-tree]]는 만들어진 `init.mp4`(815바이트)를 Bento4 `mp4dump`로 푼 상자 구조입니다.

```mermaid {#fig-cmaf-init-tree kind="실측" caption="FFmpeg 9.0.2가 만든 CMAF init.mp4의 상자 구조. ftyp의 호환 브랜드에 cmfc가 들어 있고, moov는 트랙 하나(영상, timescale 15360)의 설정과 avcC(SPS · PPS)를 담으며, 마지막에 mvex가 조각이 뒤따름을 알립니다. udta 등 일부 상자는 생략했습니다. 아래 「측정 조건」의 명령으로 만든 파일을 mp4dump로 풀었습니다." source="로컬 실측(2026-11-12), 아래 「측정 조건」"}
flowchart TB
  accTitle: CMAF init.mp4 상자 구조
  accDescr: init.mp4는 ftyp과 moov로 이뤄진다. ftyp의 주 브랜드는 iso5이고 호환 브랜드에 cmfc가 있다. moov 안에 mvhd, 영상 trak, mvex가 있고, trak 안 mdhd의 timescale은 15360, 표본 설명 avc1 안에 avcC가 있다.
  F["ftyp<br/>iso5 · cmfc · iso6"] --- M["moov<br/>mvhd"]
  M --> T["trak 영상"]
  M --> X["mvex<br/>trex"]
  T --> D["mdhd<br/>timescale 15360"]
  D --> S["stsd → avc1<br/>avcC: SPS · PPS"]
```

`avcC`에 든 SPS · PPS가 디코더 초기화 정보입니다. HLS 목록의 `EXT-X-MAP`이 이 파일을 가리키고, 애플 저작 규격 8.20은 fMP4를 쓰면 `EXT-X-MAP`이 있어야 한다(MUST)고 정합니다. 2초 조각 `seg-1.m4s`(764,492바이트)는 이렇게 풀렸습니다.

```text
# mdat 크기는 상자 머리 8바이트를 뺀 본문 크기
[styp] 브랜드 msdh, 호환 msdh · msix
[moof] mfhd 순번 1 | traf: tfhd, tfdt 0,     trun 표본 15개
[mdat] 191,479 바이트
[moof] mfhd 순번 2 | traf: tfhd, tfdt 7680,  trun 표본 15개
[mdat] 184,744 바이트
[moof] mfhd 순번 3 | traf: tfhd, tfdt 15360, trun 표본 15개
[mdat] 198,043 바이트
[moof] mfhd 순번 4 | traf: tfhd, tfdt 23040, trun 표본 15개
[mdat] 189,506 바이트
```

`moof`는 그 청크 표본들의 크기 · 길이 · 키프레임 여부(`trun`)와 시작 시각(`tfdt`)을 담고, 뒤의 `mdat`가 그 표본 데이터입니다. 이어지는 `seg-2.m4s`의 첫 `tfdt`는 30720(2초)이었습니다.

### CMAF 조각 브랜드는 cmfs인데 FFmpeg 조각에는 DASH 브랜드만 있었습니다 {#5-m4s-미디어-세그먼트-박스-트리}

브랜드는 파일이 어떤 형식 규칙을 따르는지 밝히는 네 글자 이름표이고, `ftyp`(init)과 `styp`(조각)의 브랜드 목록에 적습니다. MP4 등록 기관(MP4RA)의 [브랜드 목록](https://github.com/mp4ra/mp4ra.github.io/blob/CENC/data/brands.csv)에서 CMAF와 DASH 브랜드는 이렇게 나뉩니다.

| 브랜드 | 뜻 | 규격 |
|---|---|---|
| `cmfc` · `cmf2` | CMAF 구조 브랜드 | CMAF |
| `cmfs` · `cmff` · `cmfl` | CMAF 조각 · 프래그먼트 · 청크 형식 | CMAF |
| `msdh` · `msix` | ISO BMFF 일반 미디어 조각 · 색인 붙은 미디어 조각 | DASH |

이번 실측에서 FFmpeg는 init의 호환 브랜드에 `cmfc`를 넣었지만, 조각의 `styp`에는 DASH 브랜드 `msdh` · `msix`만 적고 `cmfs`는 적지 않았습니다. 「`.m4s`의 `styp`에 msdh · msix가 있으면 CMAF」라는 설명은 맞지 않습니다. 플레이어나 검증 도구가 어떤 브랜드를 보는지는 따로 확인해야 합니다.

## tfdt와 timescale이 어긋나면 오류 없이 구간이 사라집니다 {#7-timescale--시간-단위의-함정}

MP4의 시각은 트랙마다 정한 단위(timescale)로 셉니다. 이번 파일은 `mdhd`의 timescale이 15360이었고, 표본 하나의 길이는 512(15360 ÷ 30)였습니다. 청크 하나가 15표본이므로 `tfdt`는 7680씩, 곧 0.5초씩 늘었습니다. 90kHz는 MPEG-TS의 PTS가 쓰는 시계이고, MP4에서는 트랙마다 다른 값을 고를 수 있습니다. 오디오 트랙은 보통 표본률(예: 48000)을 씁니다.

조각과 조각 사이의 시각은 이어져야 합니다. 애플 저작 규격 7.3은 fMP4의 `tfdt`가 앞 조각의 디코딩 시각과 길이에 맞아야 한다(MUST)고 정합니다. 이것이 어긋나면 플레이어가 오류 없이 구간을 겹쳐 버립니다. PokeClip에서 녹화 파일마다 `tfdt`가 0 근처에서 다시 시작하자, hls.js는 오류 0건으로 목록에 적힌 141.97초 가운데 80.03초만 재생 구간으로 잡았습니다([오류 0건 글](/posts/0-to-1/pokeclip-zero-errors-missing-playback/)). 같은 파일 10개에서 init 구조는 두고 `tfdt` 값만 바꾸자 8.10초가 39.87초 전체로 돌아왔습니다. 두 파일은 `tfdt`가 든 193바이트 위치만 달랐습니다([tfdt 대조 글](/posts/0-to-1/pokeclip-cdn-timeline-normalization/)).

## CMAF 청크가 LL-HLS 파트와 LL-DASH 전송 단위가 됩니다 {#10-chunked-cmaf--ll-hls의-기반}

`moof`+`mdat` 한 쌍은 혼자 해석할 수 있는 단위입니다. CMAF는 이것을 청크(chunk)라 부르고, 조각 하나를 여러 청크로 나눌 수 있습니다. 아래 영상에서 0.5초마다 청크가 하나씩 쌓이는 동안, 옆 목록에 파트 줄이 붙고 2초가 차면 조각 줄(`EXTINF`)이 붙는 순서를 보십시오.

{{< motion scene="ChunkedSegment" id="fig-chunked-segment" kind="개념도" caption="2초 CMAF 조각 하나에 0.5초짜리 moof+mdat 청크가 하나씩 쌓입니다. 청크가 완성될 때마다 LL-HLS 목록에 그 청크를 가리키는 EXT-X-PART 줄이 붙고, 네 번째 청크로 조각이 끝나면 EXTINF 줄이 붙습니다. 청크 수와 길이는 이 글의 FFmpeg 실측 파일과 같고, 목록 줄은 설명용입니다." >}}

두 저지연 방식은 청크를 다르게 씁니다.

- **LL-HLS**: 청크 하나(또는 몇 개)를 파트로 목록에 올립니다. 개정 초안은 파트를 큰 파일의 바이트 범위(`BYTERANGE`)로 가리키는 것을 허용하므로, 조각 파일 하나 안의 청크를 파트로 쓸 수 있습니다. 파트는 다 준비된 뒤에 보내야 합니다([LL-HLS 글](/posts/tech-blurting/ll-hls-deep-dive/)).
- **LL-DASH**: 조각을 다 만들기 전에 요청을 받고, 만들어지는 청크를 HTTP chunked 전송으로 흘려보냅니다. 이번에 FFmpeg가 쓴 MPD에는 `availabilityTimeOffset="1.500"`이 들어 있었습니다. 2초 조각을 완성 1.5초 전, 곧 첫 청크가 나온 시점부터 요청할 수 있다는 뜻입니다. DASH-IF 타이밍 지침은 조각의 끝 시각이 「지금 + availabilityTimeOffset」 안에 들면 받을 수 있다고 설명합니다([DASH-IF Timing Model 13.3](https://dashif.org/Guidelines-TimingModel/)).

## TS와 fMP4는 쓰이는 자리가 다릅니다 {#9-mpeg-ts-vs-fmp4--어디서-뭘-쓰나}

| 자리 | 많이 쓰는 형식 | 이유 · 근거 |
|---|---|---|
| 송출(인코더 → 서버) | MPEG-TS(SRT 안) 또는 RTMP | 한 흐름에 트랙을 PID로 섞어 보냄([MPEG-TS 글](/posts/tech-blurting/rtmp-mpeg-ts-srt/)) |
| HLS 배포, H.264 | TS 또는 fMP4 | RFC 8216 3절이 둘 다 허용 |
| HLS 배포, HEVC · AV1(애플 기기) | fMP4만 | 애플 저작 규격 1.5 · 1.39 |
| DASH 배포(Media3) | fMP4 · WebM · Matroska | Media3 DASH 문서, MPEG-TS는 「지원 계획 없음」 |
| 공통 암호화(CENC) | fMP4 | CENC는 ISO BMFF 파일의 암호화 규격 |

TS는 패킷 단위로 끊어 읽을 수 있어 송출에 맞고, fMP4는 조각마다 표가 있어 배포와 공통 암호화에 맞습니다. 그래서 송출은 TS로 받고 배포는 fMP4로 다시 포장하는 구성이 흔합니다.

## 한 파일로 모든 DRM을 쓰려면 cbcs로 맞춰야 합니다 {#17-cenc--common-encryption}

CENC(Common Encryption, [ISO/IEC 23001-7:2023](https://webstore.iec.ch/en/publication/87807), 4판)는 ISO BMFF 파일의 표본을 AES-128로 암호화하는 형식을 정합니다. 키 ID와 암호화 정보를 파일에 공통으로 적어, 여러 DRM(디지털 권리 관리) 시스템이 같은 암호화 파일에 접근할 수 있게 합니다. CENC 자체는 DRM이 아닙니다. 키를 누구에게 줄지는 각 DRM의 라이선스 서버가 정합니다.

문제는 CENC 안에 보호 방식(scheme)이 둘 이상이라는 점입니다. W3C의 [EME ISO 공통 암호화 스트림 형식](https://www.w3.org/TR/eme-stream-mp4/)은 `cenc`(AES-128 CTR)와 `cbcs`(AES-128 CBC) 가운데 하나로 암호화하라고 적습니다. 기기마다 받는 방식이 다릅니다.

| 대상 | 받는 방식 | 근거 |
|---|---|---|
| Apple 기기(FairPlay) | FairPlay는 `SAMPLE-AES`만, fMP4에서는 `cbcs`. 영상 패턴은 1:9. `SAMPLE-AES-CTR` 금지 | [애플 저작 규격](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) 13.2 · 13.7 · 13.11, [RFC 8216 4.3.2.4](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.2.4) |
| Android Media3, Widevine | `cenc`(API 19+), `cbcs`(API 25+) | [Media3 DASH 문서](https://developer.android.com/media/media3/exoplayer/dash) |
| Android TV Media3, PlayReady SL2000 | `cenc`만 | 같은 문서 |

그래서 한 벌의 암호화 파일로 여러 DRM을 쓰는 것은 대상 기기가 모두 `cbcs`를 받을 때만 됩니다. `cenc`만 받는 대상이 남아 있으면 같은 인코딩을 `cenc`와 `cbcs`로 따로 암호화해 두 벌을 둬야 합니다. 그래도 다시 인코딩하지는 않습니다. 암호화는 인코딩이 아닙니다.

Shaka Packager로 FairPlay용 `cbcs`를 만드는 명령은 공식 문서 예시에서 이렇게 줄일 수 있습니다. Shaka Packager는 README가 「packaging and encryption」 도구로 소개하는 포장과 암호화 도구입니다([README](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/README.md)).

```bash
# Shaka Packager 3.9.3 raw_key 문서의 FairPlay 예시를 줄인 것(키 값은 자리표시)
packager \
  in=video.mp4,stream=video,output=video_cbcs.mp4,drm_label=HD \
  --protection_scheme cbcs \
  --enable_raw_key_encryption \
  --keys label=HD:key_id=<키ID>:key=<키>:iv=<IV> \
  --protection_systems FairPlay \
  --hls_master_playlist_output master.m3u8 \
  --hls_key_uri skd://<자산ID>
```

### cenc는 CTR, cbcs는 CBC 패턴 암호화입니다 {#18-ctr-vs-cbcs-암호화-모드}

| 방식 | 블록 암호 모드 | 영상 표본을 암호화하는 방식 |
|---|---|---|
| `cenc` | AES-128 CTR | 암호화 구간 전체를 CTR로 암호화 |
| `cbcs` | AES-128 CBC | 16바이트 블록을 「암호화 몇 개 : 건너뜀 몇 개」 패턴으로 암호화. 애플 기기는 1:9 |

두 방식 모두 NAL 단위 영상에서는 머리를 평문으로 남기는 부분 표본(subsample) 암호화를 씁니다. Shaka Packager 문서는 패턴의 기본값을 1:9로 두고, 블록 크기를 16바이트로 설명합니다([일반 암호화 옵션](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/options/general_encryption_options.rst)). DASH와 HLS가 DRM을 매니페스트에 어떻게 적는지는 [DASH 글](/posts/tech-blurting/dash-vs-hls/)에 있습니다.

## 같은 파일을 쓰려면 패키저와 플레이어 조건을 함께 확인합니다 {#26-cmaf-도입-시-트레이드오프}

CMAF 한 벌로 HLS와 DASH를 함께 내기 전에 확인할 것은 이렇습니다.

- **코덱과 형식**: 애플 기기에서 HEVC · AV1은 fMP4가 필수이고(1.5 · 1.39), fMP4에는 `EXT-X-MAP`이 필요합니다(8.20).
- **시각 연속성**: 조각 사이 `tfdt`가 이어지는지(7.3) 실제 재생 구간으로 확인합니다. 오류가 나지 않아도 구간이 사라질 수 있습니다.
- **암호화**: 대상 기기가 모두 `cbcs`를 받는지 확인합니다. 아니면 암호화 파일은 두 벌입니다.
- **패키저 기능**: Shaka Packager 3.9.3은 저지연에서 LL-DASH만 지원하고 LL-HLS는 아직입니다. FFmpeg의 `hls` 묶개는 LL-HLS 파트를 만들지 않습니다.
- **광고 표시**: HLS 쪽은 비표준 `EXT-X-CUE-OUT/IN`이 아니라 `EXT-X-DATERANGE`의 `SCTE35-OUT` · `SCTE35-IN`(RFC 8216 4.3.2.7.1)이나 개정 초안 부록 D의 Interstitials로 적습니다. DASH와의 차이는 [DASH 글](/posts/tech-blurting/dash-vs-hls/)에 있습니다.
- **라이브 뒤 다시보기**: `EXT-X-ENDLIST`만 붙이면 VOD가 되는 것은 앞 조각을 빼지 않은 `EVENT` 목록일 때입니다. 창이 밀리는 라이브 목록은 앞 조각이 이미 빠졌으므로 `EXT-X-ENDLIST`만 붙여서는 전체 다시보기가 되지 않고, 따로 다시보기 문서를 만들어야 합니다. PokeClip은 끝난 목록을 다시 열지 않고 세션마다 새 주소를 주며([세션 주소 글](/posts/0-to-1/pokeclip-session-url-and-endlist/)), 회차 단위로 VOD 문서를 굳힙니다([회차 다시보기 글](/posts/projects/pokeclip-round-vod/)).

미디어를 맞추는 일은 매니페스트를 맞추는 일보다 조건이 많습니다. 먼저 대상 기기 목록과 그 기기의 DRM 방식을 표로 만들고, `cbcs` 하나로 덮이는지부터 확인하십시오.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 12일 macOS 로컬에서 실행했습니다. 한 번 만든 파일을 풀어 본 확인이고 반복 측정은 아닙니다.
- 도구: FFmpeg 9.0.2(Homebrew), Bento4 `mp4dump` 1.6.0.0.
- 명령: `ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -t 4 -c:v libx264 -preset veryfast -g 30 -keyint_min 30 -sc_threshold 0 -bf 0 -f dash -seg_duration 2 -frag_duration 0.5 -frag_type duration -use_template 1 -use_timeline 0 -streaming 1 -ldash 1 -format_options "movflags=+cmaf" -init_seg_name init.mp4 -media_seg_name 'seg-$Number$.m4s' manifest.mpd`
- 결과 파일: `init.mp4` 815바이트, `seg-1.m4s` 764,492바이트, `seg-2.m4s` 788,173바이트, MPD의 `availabilityTimeOffset` 1.500. 상자 구조는 `mp4dump init.mp4`, `mp4dump seg-1.m4s`로, `styp` 브랜드는 첫 24바이트를 직접 읽어 확인했습니다.

## 출처

- [ISO/IEC 23000-19:2024 CMAF](https://webstore.iec.ch/en/publication/92817) (3판, 2024-02-29) · [ISO/IEC 23001-7:2023 CENC](https://webstore.iec.ch/en/publication/87807) (4판, 2023-08-08)
- [RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) — 3절 조각 형식(3.3 fMP4와 CMAF), 4.3.2.4 EXT-X-KEY, 4.3.2.7.1 SCTE-35, 7절 버전
- [draft-pantos-hls-rfc8216bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) (2026-05-01) — 파트의 BYTERANGE, 부록 D Interstitials
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 1.5 · 1.39 · 7.3 · 8.20 · 13.2 · 13.7 · 13.11
- [MP4RA brands.csv](https://github.com/mp4ra/mp4ra.github.io/blob/CENC/data/brands.csv) (2026-11-12 확인)
- [W3C, ISO Common Encryption EME Stream Format](https://www.w3.org/TR/eme-stream-mp4/)
- [Android Developers, Media3 ExoPlayer DASH](https://developer.android.com/media/media3/exoplayer/dash)
- [DASH-IF, Timing Model 지침](https://dashif.org/Guidelines-TimingModel/) — 13.3 가용 창
- [Shaka Packager v3.9.3 README](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/README.md) · [raw_key 예시](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/tutorials/raw_key.rst) · [일반 암호화 옵션](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/options/general_encryption_options.rst) · [low_latency.rst](https://github.com/shaka-project/shaka-packager/blob/v3.9.3/docs/source/tutorials/low_latency.rst)
- [FFmpeg 형식 문서 — dash 묶개](https://ffmpeg.org/ffmpeg-formats.html#dash-2)
- PokeClip 기록: [오류 0건](/posts/0-to-1/pokeclip-zero-errors-missing-playback/) · [tfdt 대조](/posts/0-to-1/pokeclip-cdn-timeline-normalization/) · [세션 주소와 ENDLIST](/posts/0-to-1/pokeclip-session-url-and-endlist/) · [회차 다시보기](/posts/projects/pokeclip-round-vod/)

다음 편: [DASH는 목록 대신 MPD 규칙으로 조각 주소를 계산합니다](/posts/tech-blurting/dash-vs-hls/)
