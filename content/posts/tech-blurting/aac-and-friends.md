---
title: "HE-AAC는 절반 표본률로 부호화하고 고음은 SBR로 채웁니다"
date: 2026-06-20T10:44:52+09:00
lastmod: "2026-11-13T14:58:13+09:00"
description: "같은 AAC라도 프로파일과 인코더, 그릇에 따라 프레임 길이와 앞에 붙는 표본, 설정 정보를 싣는 자리가 달라집니다. AAC의 규격 연도와 특허 창구, HE-AAC의 SBR · PS, ADTS 머리와 ASC, mp4a 코덱 문자열, FFmpeg 9.0.2의 aac · aac_at 프로파일 옵션, PokeClip의 OBS 6트랙, BS.1770 라우드니스와 loudnorm 1회 · 2회의 차이를 1차 문서와 Sintel 예고편 소리 · 합성음 실측으로 확인했습니다."
categories: ["tech-blurting"]
tags: ["AAC", "HE-AAC", "SBR", "FFmpeg", "라우드니스", "loudnorm", "HLS"]
draft: false
---

AAC는 「128kbps면 된다」로 끝나기 쉽지만, 같은 AAC라도 프로파일이 바뀌면 부호화하는 표본률부터 달라집니다. macOS의 `aac_at` 인코더로 HE-AAC 64kbps를 만들자 설정 정보(ASC)에는 코어 표본률 24kHz와 출력 48kHz가 함께 적혔고, 패킷 하나는 48kHz 표본 2,048개(42.7ms)였습니다. AAC-LC는 1,024개(21.3ms)입니다. 인코더가 앞에 붙이는 표본도 FFmpeg 내장 `aac`는 1,024개, `aac_at`은 2,112개로 달랐습니다. 라우드니스를 맞추는 `loudnorm` 필터는 한 번만 돌리면 동적으로 압축해 소리 폭이 줄고 출력 표본률이 192kHz로 바뀌었고, 측정값을 넘겨 두 번 돌리자 폭을 그대로 둔 채 48kHz로 나왔습니다. 실측은 모두 이 글을 쓰며 AI(Claude Code)가 FFmpeg 9.0.2로 잰 값입니다(아래 「측정 조건」).

## AAC는 1997년 MPEG-2에서 나왔고 지금 판은 2019년 5판입니다 {#1-mp3-다음에-왜-aac가-나왔나}

AAC(Advanced Audio Coding)의 첫 규격은 1997년 12월에 나온 ISO/IEC 13818-7, 곧 MPEG-2 7부입니다([ISO 13818-7:1997 보관본](http://web.archive.org/web/20261022120829/https://www.iso.org/standard/25040.html)). 그 뒤 MPEG-4 오디오 규격 ISO/IEC 14496-3이 AAC를 오디오 객체 유형 가운데 하나로 넣었고, 지금 판은 2019년 12월의 5판입니다. 5판의 첫 수정(Amd 1)은 아직 개발 중입니다([ISO 14496-3:2019 보관본](http://web.archive.org/web/20261106083505/https://www.iso.org/standard/76383.html)). MPEG-4 AAC-LC 디코더는 MPEG-2 AAC-LC 비트스트림도 풉니다([Via LA AAC](https://www.via-la.com/licensing-programs/aac/)).

H.264는 2003년 5월에 첫 판이 나왔습니다([ITU-T H.264](https://www.itu.int/rec/T-REC-H.264)). AAC보다 6년 늦고 다른 규격입니다. MP4와 HLS에서 둘이 늘 함께 보이는 것은 그릇과 기기가 둘을 함께 받기 때문이지, 한 세트로 표준화됐기 때문이 아닙니다.

### MP3 특허 프로그램은 2017년에 끝났고 AAC 풀은 지금도 기기에 받습니다 {#mp3-vs-aac}

Fraunhofer IIS는 Technicolor가 운영하던 MP3 특허 · 소프트웨어 라이선스 프로그램이 2017년 4월 23일 끝났다고 밝혔습니다([Fraunhofer IIS, mp3](https://www.iis.fraunhofer.de/en/ff/amm/consumer-electronics/mp3.html)). AAC 쪽은 Via LA의 AAC 프로그램이 지금도 운영 중입니다. 요율은 인코더 · 디코더 제품 한 대마다 매기고(연간 첫 50만 대는 대당 $0.98), 계약 기간은 5년입니다. FAQ는 「AAC로 부호화한 비트스트림을 방송하거나 네트워크로 스트리밍하거나 물리 매체로 배포하는 데에는 특허료가 없다」고 적습니다([Via LA AAC](https://www.via-la.com/licensing-programs/aac/)). 스트리밍 서비스가 AAC를 보내는 일과 기기 제조사가 AAC 디코더를 넣는 일은 다른 계산입니다.

## AAC-LC 프레임 하나는 1,024표본, 48kHz에서 21.3ms입니다

AAC는 소리를 시간 구간(프레임)으로 잘라 주파수 성분으로 바꾼 뒤, 귀에 덜 들리는 성분에 비트를 덜 주는 변환 부호화입니다. AAC-LC(Low Complexity)의 프레임은 채널마다 1,024표본입니다. Sintel 예고편 소리(51.9초, 48kHz 스테레오)를 내장 `aac` 128kbps로 인코딩하자 패킷 2,434개가 모두 1,024표본이었습니다. 48kHz에서 1,024 ÷ 48,000 = 21.3ms이고, 표본률이 44.1kHz면 23.2ms가 됩니다(계산값).

프로파일이 바뀌면 이 단위가 바뀝니다. 지연을 줄인 AAC-LD와 AAC-ELD는 512표본(10.7ms) 패킷을 냈고, HE-AAC와 HE-AAC v2는 출력 기준 2,048표본(42.7ms) 패킷을 냈습니다. HE-AAC가 두 배인 이유는 코어를 절반 표본률로 돌리기 때문입니다.

## HE-AAC는 절반 표본률로 부호화하고 SBR이 고음을 채웁니다 {#3-aac-프로파일--언제-뭘-쓰나}

HE-AAC(High-Efficiency AAC)는 AAC-LC 코어를 출력의 절반 표본률로 돌립니다. 48kHz 출력이면 코어는 24kHz로 1,024표본 프레임을 부호화하므로, 코어가 담을 수 있는 주파수는 그 절반인 12kHz까지입니다. 그 위는 SBR(Spectral Band Replication)이 채웁니다. 디코더가 코어로 푼 낮은 대역을 높은 대역으로 옮기고, 인코더가 함께 보낸 포락선(대역별 세기) 정보에 맞춰 깎습니다. 아래 영상에서 청록 막대가 코어가 부호화한 대역이고, 교차 주파수 위의 막대는 SBR이 낮은 대역에서 옮겨 와 포락선에 맞춘 것입니다.

{{< motion scene="SbrFill" id="fig-sbr-fill" kind="개념도" caption="HE-AAC 디코더는 24kHz 코어가 푼 낮은 대역을 교차 주파수 위로 옮기고, 함께 받은 포락선에 맞춰 높이를 깎아 고음을 채웁니다. 출력 2,048표본(48kHz에서 42.7ms) 프레임마다 되풀이합니다. 막대 높이와 교차 주파수 위치는 설명용입니다." >}}

옮겨 온 고음은 원래 고음의 파형이 아니라 세기만 맞춘 근사입니다. 그래서 SBR은 비트가 모자란 낮은 비트레이트에서 이득이 있고, 비트가 넉넉하면 코어가 고음까지 직접 부호화하는 편이 낫습니다. 애플 HLS 저작 규격은 오디오 비트레이트가 64kbps를 넘으면 HE-AAC를 쓰지 말라고 합니다(2.4, SHOULD NOT, [Apple HLS Authoring Specification](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html)).

`aac_at`이 만든 HE-AAC의 ASC(AudioSpecificConfig, 디코더 설정 정보)를 열면 이 구조가 그대로 적혀 있습니다. 첫 객체 유형은 2(AAC-LC)이고 표본률은 24kHz인데, 뒤에 동기 확장 표시(0x2b7)와 함께 객체 유형 5(SBR)와 출력 표본률 48kHz가 붙습니다. LC만 아는 디코더는 앞부분만 읽고 24kHz로 풀고, HE-AAC 디코더는 뒷부분까지 읽어 48kHz로 풉니다.

HE-AAC v2는 PS(Parametric Stereo)를 더합니다. 코어는 모노 한 채널만 부호화하고, 좌우 차이는 몇 개의 매개변수로 보냅니다. 32kbps HE-AAC v2의 ASC에서 채널 구성은 1(모노)이었고, SBR 확장 뒤에 PS 동기 확장(0x548)이 붙었습니다. 그 밖의 프로파일은 쓰임새가 다릅니다.

- AAC-LD · ELD: 512표본 프레임으로 지연을 줄인 통신용 프로파일입니다. Chrome 157은 `mp4a.40.23`(LD)과 `mp4a.40.39`(ELD)에 `MediaSource.isTypeSupported()` false를 돌려줬습니다.
- xHE-AAC: 애플 규격은 USAC(Unified Speech and Audio Coding)를 xHE-AAC라고도 부르고, 코덱 문자열을 `mp4a.40.42`로 적습니다. 그릇은 fMP4여야 합니다(2.25). Via LA는 xHE-AAC 특허를 AAC 프로그램에 추가 비용 없이 넣었습니다.

## 같은 128kbps라도 인코더마다 앞에 붙는 표본 수가 다릅니다 {#2-같은-aac라도-인코더가-다르면-음질이-다르다}

인코더는 첫 프레임을 만들기 전에 앞쪽 입력을 미리 봐야 하므로, 출력 앞에 실제 소리보다 먼저 나오는 표본(priming)이 붙습니다. MP4는 이 수를 편집 목록(edit list)에 적어 디코더가 버리게 하고, `ffprobe`는 이 값을 `initial_padding`으로 보여 줍니다. [[fig-aac-priming]]에서 회색 막대가 패킷 하나의 길이, 청록 막대가 앞에 붙은 표본의 길이입니다.

{{< chart id="fig-aac-priming" kind="실측" caption="인코더 · 프로파일별 패킷 길이와 앞에 붙은 표본(ms, 48kHz). 내장 aac LC는 1,024표본(21.3ms), aac_at LC · HE · HE v2는 2,112표본(44.0ms)이 앞에 붙었습니다. LD · ELD는 비트레이트에 따라 값이 달랐습니다. Sintel 예고편 소리 51.9초, FFmpeg 9.0.2, 각 1회(같은 입력에서 출력이 바이트 단위로 같음)." source="아래 「측정 조건」" height="440px" >}}
{
  "grid": {"left": 8, "right": 48, "top": 40, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "data": ["패킷 길이", "앞에 붙은 표본"]},
  "xAxis": {"type": "value", "name": "ms", "min": 0, "max": 50, "interval": 10},
  "yAxis": {"type": "category", "inverse": true, "data": ["aac LC 128k", "aac_at LC 128k", "aac_at HE 64k", "aac_at HE v2 32k", "aac_at LD 64k", "aac_at LD 128k", "aac_at ELD 64k", "aac_at ELD 128k", "libopus 128k"]},
  "series": [
    {"name": "패킷 길이", "type": "bar", "barWidth": 10, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [21.3, 21.3, 42.7, 42.7, 10.7, 10.7, 10.7, 10.7, 20.0]},
    {"name": "앞에 붙은 표본", "type": "bar", "barWidth": 10, "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [21.3, 44.0, 44.0, 44.0, 11.8, 10.7, 6.5, 5.3, 6.5]}
  ]
}
{{< /chart >}}

같은 LC 128kbps라도 `aac_at`은 내장 `aac`보다 약 23ms를 더 앞에 붙였습니다. LD는 64kbps에서 568표본, 128kbps에서 512표본, ELD는 312표본과 256표본으로 비트레이트에 따라 달랐습니다. 이 값을 담을 자리가 없는 그릇에서는 앞 표본이 그대로 재생됩니다. 같은 내장 `aac` 파일을 ADTS(아래 절)로 옮겨 풀자, MP4로 풀 때보다 표본이 정확히 1,024개(21.3ms) 많았습니다. 조각을 이어 붙이거나 영상과 싱크를 맞출 때 이 차이가 나타납니다.

### FFmpeg 9.0.2에는 AAC 인코더가 둘 들어 있고 libfdk_aac는 직접 빌드해야 합니다 {#ffmpeg에서-사용-가능한-aac-인코더}

Homebrew의 FFmpeg 9.0.2(macOS)에는 내장 `aac`와 애플 AudioToolbox를 부르는 `aac_at`이 있습니다. `aac_at`은 `--enable-audiotoolbox`로 구성한 macOS 빌드에만 있습니다. 내장 `aac`는 HE-AAC를 만들지 못해, `-profile:a aac_he`를 주면 「Profile not supported!」로 멈췄습니다. Fraunhofer FDK 라이브러리를 쓰는 `libfdk_aac`는 FFmpeg `configure`의 nonfree 목록에 있어, GPL로 구성한 빌드에 넣으려면 `--enable-nonfree`가 필요하고 결과물은 「nonfree and unredistributable」로 표시됩니다([configure 2045–2048행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/configure#L2045-L2048), [4833–4840행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/configure#L4833-L4840)). 그래서 배포판 바이너리에는 대개 빠져 있습니다. 예전의 `libfaac`는 FFmpeg 3.2에서 지워졌습니다([FFmpeg Changelog](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/Changelog)).

### 위키의 화질 순위는 청취 시험이 아니라 9.1 기준 서술입니다 {#인코더별-음질-차이-같은-비트레이트}

FFmpeg 위키의 AAC 인코딩 안내는 FAQ에서 AAC-LC 화질을 「9.1 내장 `aac`(애플 NMR 사용) > `aac_at` > `libfdk_aac`」 순으로 적고, HE-AAC는 `aac_at`과 `libfdk_aac` 중 어느 쪽이 나은지 불분명하다고 적습니다(2026-07-13 수정판, [FFmpeg Wiki Encode/AAC](https://trac.ffmpeg.org/wiki/Encode/AAC), [보관본](http://web.archive.org/web/20261029055502/https://trac.ffmpeg.org/wiki/Encode/AAC)). 이 순서는 아직 나오지 않은 판의 서술입니다. 지금 공개된 최신판은 9.0.2이고, 저장소에는 `n9.1-dev` 표시만 있습니다([FFmpeg 다운로드](https://ffmpeg.org/download.html)). 같은 페이지에 순위를 뒷받침하는 청취 시험 자료는 없습니다. 이 글도 청취 시험을 하지 않았으므로 인코더 사이의 음질 순위는 적지 않습니다.

## 스테레오 AAC는 Apple 규격의 32–160kbps 안에서 고릅니다 {#4-비트레이트-가이드--영상-대비-무시할-수준}

애플 규격은 HLS에 스테레오 AAC(LC · HE · HE v2 가운데 하나)를 반드시 넣으라고 하고(2.3, MUST), 스테레오 AAC의 권장 총 비트레이트를 32–160kbps, 5.1 AAC를 320kbps로 둡니다(2.9). 표본률은 정하지 않습니다. YouTube 라이브 인코더 안내는 스테레오 오디오를 44.1kHz · 128kbps로, 5.1을 48kHz · 384kbps로 권합니다([YouTube 고객센터](https://support.google.com/youtube/answer/2853702?hl=en)). 「HLS 표준은 48kHz」라는 규칙은 확인하지 못했습니다. PokeClip처럼 OBS가 48kHz로 보내면 그대로 두는 편이 표본률 변환을 줄입니다.

송출 플랫폼은 OBS 서비스 목록에 상한이 적혀 있습니다. OBS 33.0.0에서 CHZZK(치지직)는 오디오 최대 192kbps, YouTube RTMPS는 160kbps, Twitch는 320kbps입니다([services.json 2309행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L2309), [138행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L138), [69행](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L69)).

## 내장 aac의 VBR은 실험 기능입니다 {#5-cbr-vs-vbr--라이브는-cbr}

FFmpeg 위키는 내장 `aac`의 `-q:a` 실효 범위를 약 0.1–2로 적고, 이 VBR(가변 비트레이트)은 실험 기능이라 CBR보다 낫다는 보장이 없다고 적습니다. `-b:a`로 준 CBR도 정확한 고정은 아니고 「매우 가깝게」 맞춘다고 합니다. `aac_at`은 `-q:a` 0–14를 받고 `-b:a`는 기본이 CBR입니다. 같은 Sintel 소리로 잰 평균 비트레이트는 다음과 같습니다.

| 설정 | 평균 kbps | 설정 | 평균 kbps |
|---|---|---|---|
| `aac -b:a 128k` | 129.3 | `aac_at -b:a 128k` | 128.0 |
| `aac -q:a 0.1` | 24.0 | `aac_at -q:a 14` | 47.6 |
| `aac -q:a 1` | 145.6 | `aac_at -q:a 9` | 90.6 |
| `aac -q:a 2` | 283.3 | `aac_at -q:a 4` | 157.2 |
| `aac -q:a 5` | 410.1 | `aac_at -q:a 0` | 276.4 |

두 인코더는 숫자의 방향부터 반대입니다. 내장 `aac`는 클수록, `aac_at`은 작을수록 비트를 많이 썼습니다. 내장 `aac`는 2를 넘겨도 비트레이트가 계속 올랐지만 그만큼 음질이 나아지는지는 재지 않았습니다. 라이브 송출은 플랫폼 상한과 송출 대역을 넘지 않아야 하므로 `-b:a`로 비트레이트를 정합니다.

## ADTS는 프레임마다 머리를 달고 MP4는 ASC를 한 번 적습니다 {#6-aac-컨테이너--단순-코덱이-아니다}

AAC 프레임 자체에는 표본률이나 채널 수가 없습니다. 그 정보를 싣는 방법이 두 가지입니다. [[fig-adts-vs-asc]]에서 왼쪽 ADTS(Audio Data Transport Stream)는 프레임마다 머리를 붙이고, 오른쪽 MP4는 트랙 머리에 ASC를 한 번 적습니다.

```mermaid {#fig-adts-vs-asc kind="개념도" caption="ADTS는 프레임마다 7바이트 머리(보호 비트가 없을 때)에 프로파일 · 표본률 · 채널 · 프레임 길이를 되풀이하고, MP4 · fMP4는 moov 안 esds에 ASC를 한 번 적은 뒤 mdat에 머리 없는 프레임만 둡니다." source="https://www.rfc-editor.org/rfc/rfc8216#section-3.4"}
flowchart TB
  accTitle: ADTS와 MP4가 AAC 설정 정보를 싣는 자리
  accDescr: ADTS 스트림은 프레임마다 7바이트 머리를 붙여 프로파일, 표본률, 채널, 프레임 길이를 되풀이한다. MP4는 moov 안 esds에 ASC를 한 번 적고, mdat에는 머리 없는 AAC 프레임만 이어 둔다.
  subgraph ADTS["ADTS(.aac, TS 안)"]
    direction LR
    F1["머리 7바이트<br/>+ 프레임 1"] --> F2["머리 7바이트<br/>+ 프레임 2"]
  end
  subgraph MP4["MP4 · fMP4"]
    direction LR
    A["moov: esds의<br/>ASC 한 번"] --> M["mdat: 머리 없는<br/>프레임 1, 2, …"]
  end
  ADTS ~~~ MP4
```

실제 파일의 바이트로 보면 이렇습니다. 위는 내장 `aac` 파일을 ADTS로 옮긴 첫 머리, 아래는 `aac_at` HE-AAC 64kbps의 ASC입니다.

```text
ADTS 머리  FF F1 4C 80 23 9F FC
  FFF      동기어 12비트
  1        MPEG-4 표시 · 보호 비트 없음 → 머리 7바이트
  01       프로파일 = 객체 유형 - 1 → 2(AAC-LC)
  0011     표본률 번호 3 → 48kHz
  010      채널 구성 2(스테레오)
  …        프레임 길이 284바이트(머리 포함)

ASC        13 10 56 E5 98
  00010    객체 유형 2(AAC-LC)
  0110     표본률 번호 6 → 24kHz(코어)
  0010     채널 구성 2
  0x2b7    동기 확장 표시
  00101    확장 객체 유형 5(SBR), 있음 1
  0011     확장 표본률 번호 3 → 48kHz(출력)
```

ADTS의 프로파일 칸은 2비트라 객체 유형 1–4만 적을 수 있습니다. 같은 HE-AAC를 MPEG-TS로 내보내자 ADTS 머리에는 LC · 24kHz만 적혔고(`FF F1 58 80 …`), `ffprobe`는 프레임 안의 SBR 데이터를 찾아 HE-AAC · 48kHz로 읽었습니다.

### HLS 묶음 오디오는 ADTS만 받습니다 {#컨테이너별-비교}

HLS 규격(RFC 8216)은 조각 형식으로 MPEG-TS, fMP4, 묶음 오디오(Packed Audio)를 둡니다. 묶음 오디오는 초기화 정보 없이 오디오 프레임을 이어 붙인 조각이고, AAC는 ADTS 프레이밍으로만 받습니다. 나머지는 MP3, AC-3, E-AC-3입니다(3.4절, [RFC 8216](https://www.rfc-editor.org/rfc/rfc8216#section-3.4)). 첫 표본의 시각은 ID3 태그로 알립니다.

| 그릇 | 설정 정보 | 쓰는 곳 |
|---|---|---|
| ADTS(`.aac`) | 프레임마다 머리 | HLS 묶음 오디오, 단독 파일 |
| MPEG-TS | PES 안 ADTS 머리 | HLS TS 조각, SRT · UDP 송출 |
| MP4 · fMP4 | `esds`의 ASC 한 번 | 다운로드 파일, HLS fMP4 조각, DASH |
| FLV | 첫 오디오 태그의 ASC | RTMP 송출 |

### 재포장은 ADTS 머리와 ASC를 서로 바꿉니다 {#remuxing--코덱-그대로-컨테이너만-변환}

그릇만 바꾸는 재포장(`-c copy`)은 음질을 바꾸지 않습니다. 그 대신 설정 정보를 옮겨 적습니다. 아래 세 명령은 모두 FFmpeg 9.0.2에서 그대로 통과했습니다.

```bash
ffmpeg -i in.m4a -c copy out.aac       # ASC → 프레임마다 ADTS 머리
ffmpeg -i in.aac -c copy out.m4a       # ADTS 머리 → ASC 한 번
ffmpeg -i in.ts -map 0:a -c copy out.m4a
```

셋째 명령에서 FFmpeg는 `aac_adtstoasc` 비트스트림 필터를 스스로 끼웠습니다(`-v verbose` 로그: 「Automatically inserted bitstream filter 'aac_adtstoasc'」). `-fflags -autobsf`로 자동 삽입을 끄면 mp4 먹서가 「Malformed AAC bitstream detected: use the audio bitstream filter 'aac_adtstoasc' to fix it」를 내고 멈춥니다([movenc.c 7082행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/movenc.c#L7082)). 옛 안내의 `-bsf:a aac_adtstoasc`는 지금 기본 동작입니다.

## mp4a.40.2의 2는 오디오 객체 유형입니다 {#7-aac-코덱-문자열--mime-표기}

HLS의 `CODECS` 속성과 `isTypeSupported()`에 쓰는 문자열은 RFC 6381 3.3절을 따릅니다. 첫 칸 `mp4a`는 MP4의 표본 항목 이름으로 「MPEG-4 오디오의 어떤 것」을 뜻할 뿐 AAC만 가리키지 않습니다. 둘째 칸 `40`은 MPEG-4 오디오를 뜻하는 객체 유형 표시(OTI)의 16진수, 셋째 칸은 오디오 객체 유형의 10진수입니다([RFC 6381](https://www.rfc-editor.org/rfc/rfc6381#section-3.3)). 애플 규격 부록의 표는 `mp4a.40.2` AAC-LC, `.5` HE-AAC, `.29` HE-AAC v2, `.34` MP3, `.42` xHE-AAC입니다. MP3도 `mp4a`로 시작합니다.

Chrome 157의 `MediaSource.isTypeSupported('audio/mp4; codecs="…"')`는 `.2`, `.5`, `.29`, `.42`에 true, `.23`(LD), `.39`(ELD), `.34`에 false를 돌려줬습니다. 문자열을 손으로 적을 때는 실제 트랙의 객체 유형과 맞는지 확인해야 합니다. FFmpeg의 HLS 먹서가 HE-AAC에 어떤 값을 적는지는 [코덱 디버깅 글](/posts/tech-blurting/codec-decision-and-debugging/)에서 확인합니다.

## -profile:a 이름은 인코더마다 받는 값이 다릅니다 {#8-라이브-송출-표준-명령}

`-profile:a`는 인코더마다 받는 값이 다릅니다. 내장 `aac`는 `aac_low`를 받지만 `aac_he`는 거부합니다. `aac_at`은 이름을 아예 읽지 못해 `aac_he`를 주면 「Unable to parse "profile" option value "aac_he"」로 멈췄고, 숫자만 받았습니다. 숫자는 오디오 객체 유형에서 1을 뺀 값으로, 4가 HE-AAC, 28이 HE-AAC v2, 22가 LD, 38이 ELD입니다. 위키도 같은 제약을 적고 있습니다(티켓 9574).

```bash
# 라이브 송출의 오디오 부분(48kHz 스테레오 AAC-LC 128kbps)
ffmpeg -i <입력> -c:v libx264 … -c:a aac -b:a 128k -ar 48000 -ac 2 -f flv rtmp://…
# macOS에서 HE-AAC 64kbps
ffmpeg -i <입력> -c:a aac_at -profile:a 4 -b:a 64k out.m4a
```

`-ar`와 `-ac`를 적어 두면 입력 장치가 바뀌어도 송출 형식이 바뀌지 않습니다. 첫 명령을 FLV 파일로 바꿔 돌리면 `ffprobe`가 `aac,LC,48000,2`로 읽었습니다.

## PokeClip은 OBS 6트랙을 audio1–audio6으로 받습니다 {#9-멀티-오디오-트랙--pokeclip-예시}

PokeClip은 클립에서 배경음악 같은 소리를 빼려고 OBS 믹서의 오디오 트랙 6개를 받습니다. 트랙 1은 시청자가 듣는 본방 믹스로 서버의 `audio1`이 되고, 트랙 2–6은 소스별 소리로 `audio2`–`audio6`이 됩니다([6트랙 입력 계약 글](/posts/0-to-1/pokeclip-six-track-input-contract/)). 녹화 조각에는 영상 1개와 AAC 6개(48kHz 스테레오)가 들어 있었습니다([멀티오디오 검증 글](/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/)).

옛 RTMP의 오디오 메시지에는 트랙 번호 칸이 없었고, Enhanced RTMP v2(2025-04-17 정식판)가 멀티트랙을 더했습니다([RTMP 글](/posts/tech-blurting/rtmp-still-alive/#audio-message에-트랙-id가-없다--멀티-오디오-불가의-진짜-이유)). PokeClip은 본방을 RTMP로 보내고, 6트랙은 같은 영상 인코더를 나눠 쓰는 별도 SRT 출력(안은 MPEG-TS)으로 받습니다.

## 라우드니스 목표는 매체마다 다르고 측정은 BS.1770입니다 {#10-라우드니스--시청자-경험의-비밀}

라우드니스는 파형의 최댓값이 아니라 사람이 느끼는 크기입니다. ITU-R BS.1770은 귀의 감도에 맞춘 K 가중치와, 조용한 구간을 빼는 게이트로 프로그램 전체의 크기를 재는 방법을 정합니다. 단위는 LUFS(LKFS와 같은 값)이고 현행판은 BS.1770-5(2023-11)입니다([ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770)). 목표값은 매체마다 다릅니다.

| 매체 | 목표 | 근거 |
|---|---|---|
| EBU R 128(유럽 방송) | −23.0 LUFS, 라이브는 ±1.0 LU 허용, 최대 −1 dBTP | [EBU R 128 V5(2023-11)](https://tech.ebu.ch/docs/r/r128.pdf) |
| 한국 텔레비전 방송 | −24 LKFS ±2dB, BS.1770-3으로 측정 | [중앙전파관리소](https://www.crms.go.kr/lay1/S1T1094C1095/contents.do) |
| Spotify 재생 | −14 LUFS(재생할 때 맞춤) | [Spotify for Artists](https://support.spotify.com/us/artists/article/loudness-normalization/) |
| FFmpeg `loudnorm` 기본값 | I −24, LRA 7, TP −2 | [af_loudnorm.c 107–112행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavfilter/af_loudnorm.c#L107-L112) |

「스트리밍 표준은 −16」 같은 하나의 값은 확인하지 못했습니다. Spotify는 업로드한 파일을 바꾸지 않고 재생할 때 크기를 맞추며, 손실 압축을 위해 1dB 여유를 둡니다. PokeClip의 클립 렌더는 고른 소리를 섞은 뒤 −14 LUFS로 맞추고 H.264/AAC로 인코딩합니다([레시피 · 렌더 경계 글](/posts/0-to-1/clip-edit-recipe-render-boundary/)).

### loudnorm 한 번 실행은 동적으로, 두 번 실행은 선형으로 맞춥니다

`loudnorm`은 두 가지 방식으로 움직입니다. 측정값을 받지 않으면 소리를 흘려보내며 이득을 계속 바꾸는 동적 방식이고, 이때 입력 표본률을 192kHz로 고정합니다([af_loudnorm.c 740–753행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavfilter/af_loudnorm.c#L740-L753)). 첫 실행에서 잰 값을 `measured_*`로 넘기고 `linear=true`를 주면, 잰 LRA(소리 폭)가 목표 LRA 이하이고 이득을 더한 뒤의 최대 피크가 목표 TP 이하일 때에만 전체에 같은 이득을 곱하는 선형 방식이 됩니다([815–825행](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavfilter/af_loudnorm.c#L815-L825)).

4초씩 크고(220 · 440 · 880Hz 합성음) 작은(−9.9dB) 구간이 번갈아 오는 60초 합성음을 I −14 · TP −1 · LRA 11로 맞췄습니다. [[fig-loudnorm-passes]]에서 회색 점선이 원본, 주황 선이 한 번 실행, 청록 선이 두 번 실행입니다.

{{< chart id="fig-loudnorm-passes" kind="실측" caption="합성음의 순간 라우드니스(400ms 창, 0.5초 간격). 두 번 실행(선형)은 원본 모양 그대로 5.5dB 올라갔고, 한 번 실행(동적)은 작은 구간의 이득을 서서히 바꿔 계단 모양이 기울었습니다. 목표 I −14 · TP −1 · LRA 11, FFmpeg 9.0.2." source="아래 「측정 조건」" height="360px" >}}
{
  "grid": {"left": 8, "right": 24, "top": 44, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "data": ["원본", "한 번 실행", "두 번 실행"]},
  "xAxis": {"type": "value", "name": "초", "min": 0, "max": 16, "interval": 4},
  "yAxis": {"type": "value", "name": "LUFS", "min": -30, "max": -10, "interval": 5},
  "series": [
    {"name": "원본", "type": "line", "showSymbol": false, "itemStyle": {"color": "#7a8a9b"}, "lineStyle": {"type": "dashed", "width": 2},
     "data": [[0.5,-17.3],[1.0,-17.3],[1.5,-17.3],[2.0,-17.3],[2.5,-17.3],[3.0,-17.3],[3.5,-17.3],[4.0,-17.3],[4.5,-27.2],[5.0,-27.2],[5.5,-27.2],[6.0,-27.2],[6.5,-27.2],[7.0,-27.2],[7.5,-27.2],[8.0,-27.2],[8.5,-17.3],[9.0,-17.3],[9.5,-17.3],[10.0,-17.3],[10.5,-17.3],[11.0,-17.3],[11.5,-17.3],[12.0,-17.3],[12.5,-27.2],[13.0,-27.2],[13.5,-27.2],[14.0,-27.2],[14.5,-27.2],[15.0,-27.2],[15.5,-27.2],[16.0,-27.2]]},
    {"name": "한 번 실행", "type": "line", "showSymbol": false, "itemStyle": {"color": "#b06a00"}, "lineStyle": {"width": 2},
     "data": [[0.5,-14.0],[1.0,-14.0],[1.5,-14.0],[2.0,-14.0],[2.5,-14.0],[3.0,-14.0],[3.5,-13.9],[4.0,-13.5],[4.5,-23.0],[5.0,-22.7],[5.5,-22.2],[6.0,-21.3],[6.5,-20.0],[7.0,-19.8],[7.5,-20.6],[8.0,-21.4],[8.5,-11.8],[9.0,-11.9],[9.5,-12.1],[10.0,-12.2],[10.5,-12.3],[11.0,-12.4],[11.5,-12.4],[12.0,-12.3],[12.5,-22.1],[13.0,-21.9],[13.5,-21.7],[14.0,-21.0],[14.5,-20.0],[15.0,-19.8],[15.5,-20.6],[16.0,-21.3]]},
    {"name": "두 번 실행", "type": "line", "showSymbol": false, "itemStyle": {"color": "#087f8b"}, "lineStyle": {"width": 2.5},
     "data": [[0.5,-11.8],[1.0,-11.8],[1.5,-11.8],[2.0,-11.8],[2.5,-11.8],[3.0,-11.8],[3.5,-11.8],[4.0,-11.8],[4.5,-21.7],[5.0,-21.7],[5.5,-21.7],[6.0,-21.7],[6.5,-21.7],[7.0,-21.7],[7.5,-21.7],[8.0,-21.7],[8.5,-11.8],[9.0,-11.8],[9.5,-11.8],[10.0,-11.8],[10.5,-11.8],[11.0,-11.8],[11.5,-11.8],[12.0,-11.8],[12.5,-21.7],[13.0,-21.7],[13.5,-21.7],[14.0,-21.7],[14.5,-21.7],[15.0,-21.7],[15.5,-21.7],[16.0,-21.7]]}
  ]
}
{{< /chart >}}

| | I(LUFS) | LRA(LU) | 최대 피크(dBTP) | 출력 표본률 |
|---|---|---|---|---|
| 원본 | −19.6 | 9.9 | −14.4 | 48kHz |
| 한 번 실행(동적) | −14.3 | 9.0 | −8.6 | 192kHz |
| 두 번 실행(선형) | −14.2 | 9.9 | −9.0 | 48kHz |

목표 LRA를 7로 낮추면 잰 LRA 9.9가 목표보다 커서 두 번 실행해도 동적 방식으로 돌아갔고(LRA 7.7, 192kHz), Sintel 예고편 소리는 최대 피크가 +0.5dBTP라 이득을 낮추는 쪽인데도 TP 조건에 걸려 LRA 20에서까지 동적 방식이었습니다. 두 번 실행은 이렇게 적습니다. 첫 줄이 출력하는 JSON의 `input_i` · `input_tp` · `input_lra` · `input_thresh` · `target_offset`을 둘째 줄에 넣습니다.

```bash
ffmpeg -i in.wav -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null -
ffmpeg -i in.wav -af loudnorm=I=-14:TP=-1:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true -ar 48000 out.wav
```

출력이 동적 방식으로 떨어질 때를 대비해 `-ar 48000`을 함께 적어 두면 192kHz 파일이 다음 단계로 넘어가지 않습니다. 라이브처럼 끝을 미리 잴 수 없는 소리에는 한 번 실행밖에 쓸 수 없으므로, 소리 폭이 눌리는 것을 감안해야 합니다.

## 지연과 낮은 비트레이트에서 Opus와 갈립니다 {#11-opus--webrtc가-aac를-거부한-이유}

WebRTC 오디오 규격(RFC 7874)은 모든 단말이 Opus와 G.711(PCMA · PCMU)을 구현하라고 하고, AAC는 그 목록에 없습니다([RFC 7874](https://www.rfc-editor.org/rfc/rfc7874)). Opus는 2.5–60ms 프레임을 고를 수 있고, libopus 1.6.1이 Ogg 머리에 적은 앞 표본(pre-skip)은 312개(6.5ms)였습니다. 모드 전환과 손실 복구는 [Opus 글](/posts/tech-blurting/opus-deep-dive/)에서 다룹니다.

### 프레임 길이와 그릇과 받는 쪽이 다릅니다 {#opus-vs-aac}

| | AAC-LC | Opus |
|---|---|---|
| 규격 | ISO/IEC 14496-3 | RFC 6716(2012) |
| 프레임(48kHz) | 1,024표본 = 21.3ms | 2.5–60ms, 기본 20ms |
| 측정한 앞 표본 | 1,024(내장) · 2,112(`aac_at`) | 312(6.5ms) |
| 기본 그릇 | MP4 · ADTS | Ogg(`.opus`) |
| WebRTC 필수 코덱 | 아님 | 필수(RFC 7874) |
| 애플 HLS 코덱 표 | 있음 | 없음 |
| 특허 창구 | Via LA, 기기 대당 | 로열티 없는 허락 + Vectis 하드웨어 풀 |

## 서라운드는 AC-3·E-AC-3, 무손실은 FLAC·ALAC이 맡습니다 {#12-ac-3-flac-같은-다른-코덱들}

AAC도 다채널을 부호화합니다. 애플 규격의 다채널 코덱 목록에는 AAC-LC, HE-AAC v1, Apple Lossless, FLAC, AC-3(Dolby Digital), E-AC-3(Dolby Digital Plus), APAC가 있고(2.5), 5.1 권장값은 AAC 320kbps, AC-3 384kbps, E-AC-3 192kbps입니다. 7.1 권장값은 APAC와 E-AC-3에만 적혀 있습니다(2.9). 브라우저에서는 사정이 다릅니다. Chrome 157의 `isTypeSupported()`는 `ac-3`와 `ec-3`에 false였고, caniuse(2026-11-13 확인)도 Chrome · Firefox의 AC-3 · E-AC-3 재생을 「지원 안 함」으로 적습니다([caniuse AC-3 · EC-3](https://caniuse.com/ac3-ec3)).

### Apple 규격은 E-AC-3를 낼 때 AC-3도 두라고 합니다 {#netflix-4k-hdr-영화의-오디오}

E-AC-3를 지원하지 않는 기기에도 스트림이 가면 AC-3를 함께 넣어야 하고(2.6, MUST), Dolby가 아닌 다채널을 내면 다채널 AAC도 함께 두라고 합니다(2.26, SHOULD). 불연속 지점에서 AAC와 Dolby Digital 사이로 코덱을 바꾸지 말라는 권고(8.16)도 있습니다. 스테레오 AAC는 그와 별개로 늘 있어야 합니다(2.3).

### FLAC은 2024년 RFC 9639가 됐습니다 {#flac--무손실의-영역}

FLAC은 2024년 12월 RFC 9639로 IETF 규격이 됐습니다([RFC 9639](https://www.rfc-editor.org/rfc/rfc9639)). 애플 규격은 xHE-AAC, Apple Lossless, FLAC, APAC를 fMP4에만 담으라고 합니다(2.25). Chrome 157은 `audio/mp4; codecs="flac"`에 true를 돌려줬습니다. 무손실이라 압축률은 원본 소리에 달려 있어 고정된 비율로 말할 수 없습니다.

## 오디오 코덱은 받는 쪽 목록에서 거꾸로 고릅니다 {#13-시나리오별-코덱-선택}

코덱은 보내는 쪽의 취향이 아니라 받는 쪽 목록이 정합니다.

| 받는 쪽 | 확인할 목록 | 이 글에서 확인한 값 |
|---|---|---|
| 라이브 송출 플랫폼 | OBS `services.json`의 권장값 | 치지직 오디오 최대 192kbps(33.0.0) |
| 애플 기기 HLS | HLS 저작 규격 2장 | 스테레오 AAC 필수, HE-AAC는 64kbps 이하 |
| 브라우저 MSE | `isTypeSupported()` · `decodingInfo()` | Chrome 157: AAC LC · HE · xHE, Opus, FLAC 가능, AC-3 · E-AC-3 불가 |
| WebRTC | RFC 7874 | Opus · G.711 필수 |

## AAC는 프로파일 · 인코더 · 그릇을 함께 적어야 같은 소리가 됩니다 {#정리하면}

- 「AAC 128kbps」만으로는 부족합니다. LC인지 HE인지, 어느 인코더인지에 따라 프레임 길이, 앞에 붙는 표본, 부호화하는 대역이 달라집니다.
- HE-AAC는 64kbps 이하에서 고르고, 그 위에서는 LC를 씁니다.
- ADTS로 옮기면 앞 표본 정보가 사라집니다. 조각을 잇거나 싱크를 맞출 때는 MP4의 편집 목록이 있는 쪽을 기준으로 삼습니다.
- `loudnorm`은 측정값을 넘기는 두 번 실행에서만 선형으로 맞추며, 그때도 LRA와 피크 조건을 통과해야 합니다. 출력 표본률은 직접 적습니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 14:15–14:55(KST)에 실행했습니다. 패킷 길이, 앞 표본, 비트레이트, 라우드니스는 시간이 결과에 들어가지 않는 값입니다. 같은 명령을 두 번 돌려 내장 `aac` 128kbps, `aac_at` HE-AAC 64kbps, 한 번 실행 `loudnorm`의 출력이 바이트 단위로 같은 것을 확인했습니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1. 1분 load average는 측정 중 4.6–10.1이었습니다(다른 세션의 작업 포함).
- 도구: FFmpeg 9.0.2(Homebrew 9.0.2_1, `--enable-audiotoolbox --enable-libopus`), libopus 1.6.1, Google Chrome 157.0.8103.51(헤드리스, Playwright).
- 입력 1: [Sintel 예고편](https://durian.blender.org/sharing/) 1080p의 소리(© copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)), https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4 (sha256 `34bbd52a4b89fdf63c8ace50b268da26653a59508288100cd3c23de276db7931`). 원본 소리 자체가 AAC-LC 48kHz 스테레오 약 127kbps라 이미 한 번 압축된 소리입니다. 전체 51.9초를 PCM으로 풀어 썼습니다.
  - `ffmpeg -i sintel_trailer-1080p.mp4 -vn -c:a pcm_s16le sintel.wav`
- 인코딩: `ffmpeg -i sintel.wav -c:a aac -b:a 128k`, `-c:a aac_at -b:a 128k`, `-c:a aac_at -profile:a <4|28|22|38> -b:a <64k|32k|64k · 128k|64k · 128k>`, `-c:a libopus -b:a 128k`. 패킷 길이는 `ffprobe -show_entries packet=duration`, 앞 표본은 `stream=initial_padding`, 평균 비트레이트는 패킷 크기 합 ÷ 51.9초, ASC는 `ffprobe -show_streams -show_data`의 `extradata`입니다.
- HLS: 시험 화면(`testsrc2`)과 위 소리를 `-f hls -hls_segment_type <fmp4|mpegts>`로 내보낸 `master.m3u8`, HE-AAC TS 조각의 ADTS 머리는 `-c copy`로 뽑은 `.aac`의 첫 7바이트입니다.
- 입력 2(라우드니스): `ffmpeg -f lavfi -i "aevalsrc='0.12*sin(2*PI*220*t)+0.12*sin(2*PI*440*t)+0.12*sin(2*PI*880*t)':s=48000:d=60" -af "volume='if(lt(mod(t,8),4),1.0,0.32)':eval=frame,aformat=channel_layouts=stereo" synth.wav`. I · LRA · 최대 피크는 `-af ebur128=peak=true`의 요약, 순간 라우드니스는 같은 필터가 0.1초마다 찍는 M 값을 0.5초 간격으로 뽑은 것입니다.
- 브라우저: Chrome 157에서 `MediaSource.isTypeSupported()`와 `navigator.mediaCapabilities.decodingInfo()`(type `media-source`, 48kHz 스테레오 128kbps)를 같은 문자열로 물었습니다.

## 출처

- ISO: [ISO/IEC 13818-7:1997 보관본](http://web.archive.org/web/20261022120829/https://www.iso.org/standard/25040.html) · [ISO/IEC 14496-3:2019 보관본](http://web.archive.org/web/20261106083505/https://www.iso.org/standard/76383.html) (iso.org는 자동 접속을 막아 web.archive.org 보관본으로 확인)
- [ITU-T H.264](https://www.itu.int/rec/T-REC-H.264) — 첫 판 05/2003
- [Via LA, AAC 라이선스 프로그램](https://www.via-la.com/licensing-programs/aac/) — 요율, FAQ(비트스트림 배포), xHE-AAC
- [Fraunhofer IIS, mp3](https://www.iis.fraunhofer.de/en/ff/amm/consumer-electronics/mp3.html) — 2017-04-23 라이선스 프로그램 종료
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 2.3, 2.4, 2.5, 2.6, 2.9, 2.25, 2.26, 8.16, 부록 코덱 문자열
- IETF: [RFC 8216](https://www.rfc-editor.org/rfc/rfc8216) (HLS, 3.4 묶음 오디오) · [RFC 6381](https://www.rfc-editor.org/rfc/rfc6381) (3.3 코덱 문자열) · [RFC 7874](https://www.rfc-editor.org/rfc/rfc7874) (WebRTC 오디오) · [RFC 9639](https://www.rfc-editor.org/rfc/rfc9639) (FLAC, 2024-12)
- FFmpeg n9.0.2 소스: [configure](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/configure#L2045-L2048) · [movenc.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavformat/movenc.c#L7082) · [af_loudnorm.c](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavfilter/af_loudnorm.c#L107-L112) · [Changelog](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/Changelog) · [FFmpeg 다운로드](https://ffmpeg.org/download.html)
- [FFmpeg Wiki, Encode/AAC](https://trac.ffmpeg.org/wiki/Encode/AAC) (2026-07-13 수정판, [보관본](http://web.archive.org/web/20261029055502/https://trac.ffmpeg.org/wiki/Encode/AAC), 원문 주소가 자동 접속을 막아 보관본으로 확인)
- [YouTube 고객센터, 라이브 스트림 인코더 설정](https://support.google.com/youtube/answer/2853702?hl=en)
- [OBS Studio 33.0.0 rtmp-services/services.json](https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json)
- 라우드니스: [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770) · [EBU R 128-2023](https://tech.ebu.ch/docs/r/r128.pdf) · [중앙전파관리소, 텔레비전 방송 표준 음량기준](https://www.crms.go.kr/lay1/S1T1094C1095/contents.do) (자동 접속 요청에는 400을 돌려주고 보관본이 없어, 2026-11-13 페이지 원문으로 확인) · [Spotify for Artists, Loudness normalization](https://support.spotify.com/us/artists/article/loudness-normalization/)
- [caniuse, AC-3 (Dolby Digital) and EC-3 (Dolby Digital Plus) codecs](https://caniuse.com/ac3-ec3) · [같은 데이터 ac3-ec3.json](https://github.com/Fyrd/caniuse/blob/main/features-json/ac3-ec3.json) (2026-11-13 확인, caniuse.com은 자동 접속을 막아 같은 데이터 파일로 확인)
- [Sintel](https://durian.blender.org/sharing/) — 시험 소리, © copyright Blender Foundation | durian.blender.org, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)

다음 편: [Opus는 신호와 비트레이트로 SILK와 CELT를 오갑니다](/posts/tech-blurting/opus-deep-dive/)
