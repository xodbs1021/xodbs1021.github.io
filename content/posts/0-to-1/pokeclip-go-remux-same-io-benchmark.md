---
title: "FFmpeg 재포장은 조각마다 init이 달라 Go로 바꿨습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-11T15:40:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "되감기용 조각을 조각마다 ffmpeg -c copy로 뽑으려던 계획이 init 12바이트 차이(btrt·esds 비트레이트 칸)와 파트 재분할(4→2)에 막혀, MediaMTX 녹화기와 같은 mediacommon으로 짠 Go 재포장으로 바꾼 결정. 150조각 init 해시 1종, 옛 10.9배와 달리 두 경로의 읽기·쓰기 범위를 맞춰 다시 잰 p50 23.43→3.05ms(7.69배), 동시 작업 1·2·4·8의 메모리 비용까지."
tags: ["PokeClip", "Go", "FFmpeg", "벤치마크", "fMP4", "mediacommon"]
portfolio_cases: [24]
portfolio_pages: [13, 14]
portfolio_edition: "2026-10-15-v2"
---

PokeClip 되감기용 조각(영상 1·소리 1)을 녹화 조각마다 `ffmpeg -c copy`로 뽑으려던 8월 28일 계획은 9월 4일 첫 시험에서 막혔습니다. 같은 송출의 조각 3개에서 뽑은 init(`ftyp+moov`, 재생에 필요한 트랙 설정)이 비트레이트 칸 12바이트씩 서로 달랐습니다. 한 세션 안에서는 init이 같아야 한다는 전제가 서지 않았고, `-c copy`는 파트까지 다시 잘랐습니다(4개→2개). 9월 19일 MediaMTX 녹화기와 같은 라이브러리로 짠 Go 재포장으로 바꿨고, 10분 녹화 150조각에서 init 해시는 하나였습니다. 속도는 뒤에 같은 범위로 다시 쟀습니다. 같은 파일을 읽고·재포장하고·쓰는 200회 p50이 FFmpeg 23.43ms, Go 3.05ms(7.69배)였습니다.

Go 재포장으로 바꾸기로 한 것(9월 19일), 그 재포장을 10분 녹화로 크게 시험하라고 한 것, AI가 제안한 입력 상한 16MiB를 확인한 것(9월 23일)은 제 결정입니다. 9월 4일·19일 시험과 Go 재포장 구현([PR #192](https://github.com/3K-PokeClip/PokeClip-mono/pull/192))은 AI(Claude Code)가 했고, 10월 4일·6일 측정은 제 승인을 받아 AI(Codex)가 했습니다. FFmpeg 경로는 계획과 시험에만 있었고 제품에서 돈 적이 없습니다. 포트폴리오 요약(2026-10-15판) 13쪽은 「파일마다 FFmpeg 프로세스를 띄우던 경로를 상주 Go 호출로 바꿨다」고 적었지만, 바꾼 것은 운영 경로가 아니라 계획이었고 이유도 속도가 아니라 init 결정성이었습니다. 14쪽의 「내 판단 · 빠른 호출만으로 동시성을 늘리지 않습니다」도 측정 결과이고, 동시 작업 수 상한을 제가 정한 기록은 없습니다.

## FFmpeg로 뽑은 init은 조각마다 12바이트씩 달랐습니다

8월 28일 계획은 사이드카가 녹화 조각이 완성될 때마다 `ffmpeg -map 0:v:0 -map 0:a:0 -c copy`로 첫 영상과 첫 소리만 남기고, 시각을 이어 붙이는 것이었습니다(시각 문제는 [앞 글](/posts/0-to-1/pokeclip-cdn-timeline-normalization/)). 9월 4일 첫 시험에서 같은 입력을 같은 FFmpeg로 반복하면 산출 바이트가 같았습니다. 같은 송출의 다른 조각끼리는 달랐습니다.

| 시험(9월 4일) | 결과 |
|---|---|
| 같은 송출 조각 3개의 산출 init | 해시 `644df424…` · `495e60f7…` · `7e2c749c…`, 모두 1,233바이트 |
| 다른 바이트 | 12개, 모두 비트레이트 칸: 영상 `btrt`, 소리 `esds`, 소리 `btrt`의 최대·평균 비트레이트 |
| 파트(moof) 수 | 입력 6→3, 4→2, 3→1, 꼬리에 `mfra` 상자 추가 |
| 첫 tfdt(영상, 소리) | 입력 (0, 1014) → 산출 (0, 0) |

`-bitexact`로 인코더 표식과 벽시각을 지워도 조각 내용에서 계산하는 비트레이트는 남았습니다. 제품은 세션의 init과 다른 조각을 올리지 않고 세션을 끝내므로, 이대로면 모든 조각이 불일치로 걸립니다. `-c copy`는 약 1초 파트를 키프레임(2초)에서만 다시 잘랐고, 파일 안 A/V 위상이던 첫 tfdt도 0으로 지웠습니다. 산출물의 j번째 파트가 입력의 j번째라는 전제가 깨져, 뽑은 뒤에 시각을 고치는 계획도 서지 않았습니다.

9월 19일에는 FFmpeg 옵션만으로 도장을 찍는 길도 찾았습니다. `-copyts -itsoffset <위치> -avoid_negative_ts disabled -use_editlist 0`과 `+frag_discont`를 모두 주면 도장이 정확했습니다. 그런데 `-use_editlist 0` 하나만 빠져도 오류·경고 없이 영상이 소리보다 2프레임(66.8ms) 늦게 찍혔고, init은 여전히 조각마다 달랐습니다. 저는 비트레이트 칸을 가리고 옵션 다섯 개를 지키는 대신, 원인을 없애는 Go 재포장을 골랐습니다. 그때 함께 잰 속도(약 10배)는 조건이 달라 곁들인 참고였습니다.

영상의 위 줄은 FFmpeg 경로, 아래 줄은 Go 경로입니다. 조각이 하나씩 들어올 때 init 해시와 파트 수를 보십시오.

{{< motion scene="RemuxInitDrift" id="fig-remux-init-drift" kind="개념도" caption="FFmpeg 경로는 조각마다 프로세스를 띄우고, 산출 init 해시가 조각마다 바뀌며 파트 4개를 2개로 다시 자릅니다. Go 경로는 사이드카 안에 머물며 파트 4개를 그대로 두고 init 해시 하나를 냅니다. 해시 앞자리는 9월 4일 시험(FFmpeg, 조각 3개)과 9월 19일 시험(Go, 150조각)의 실제 값이고, 파트 수는 4개 조각 하나로 단순화했습니다(실제 6→3·4→2·3→1)." >}}

## 녹화기와 같은 mediacommon으로 첫 영상·첫 소리만 남겼습니다 {#범용-변환기에서-필요한-재포장만-가져오기}

Go 재포장은 사이드카 프로세스 안에서 메모리로만 동작합니다. MediaMTX 녹화기가 녹화 파일을 쓸 때 쓴 [`bluenviron/mediacommon/v2`](https://github.com/bluenviron/mediacommon)로 파일을 읽어, 파일 속 순서로 첫 영상과 첫 소리 트랙만 남기고 init과 조각을 한 번에 만듭니다. init은 트랙 설정만으로 정해지는 값이라 같은 송출 설정이면 세션 안 어느 조각에서 만들어도 바이트가 같습니다. 파트를 다시 자르지 않고 `mfra`도 붙이지 않습니다. 자식 프로세스와 디스크 쓰기가 없습니다([`media/README.md` 「되감기 렌디션」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1358-L1370)).

9월 19일 10분 녹화로 크게 시험했습니다. 4분 송출, 3초 끊김, 4분 송출, 8초 끊김, 2분 송출로 만든 150조각(송출 연결 3개, 340MB)에서 init 해시는 `4fcd68e6…`(1,160바이트) 하나였습니다. 같은 연결 안 조각 경계 147곳은 영상 ±1틱(11µs), 소리 ±1표본 안에서 맞닿았고, 남긴 소리는 세 연결 모두 첫 트랙(220Hz)이었습니다.

시각 도장은 Producer가 계산하지 않습니다. 인덱서가 조각마다 「mtxi + 세션 보정값」을 계산해 넘기고([`chain.go` `advanceChain` · `stitchOffset`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer/chain.go#L52-L135)), Producer는 받은 `PlaybackPos`를 두 트랙의 BaseTime에 같은 값으로 더하기만 합니다([`producer.go` 54–58행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/playback/producer.go#L54-L58) · [281–300행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/playback/producer.go#L281-L300)). 파일 안 A/V 위상은 입력 BaseTime에 이미 들어 있으므로 그대로 남습니다.

라이브러리 판은 녹화기와 맞춰 고정했습니다. 9월 19일에는 그때 포크 녹화기와 같은 v2.9.3이었고, v2.9.3과 v2.9.4로 각각 150조각을 돌린 산출이 바이트까지 같았습니다. 지금은 v2.9.5이고, 판 고정 시험과 산출 바이트 골든 시험이 바뀜을 잡습니다([README 1362–1366행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1362-L1366)).

대가도 있습니다. Go 직접 의존이 하나 늘었고, init과 시각 규칙을 우리가 지켜야 합니다. 입력을 통째로 메모리에 올리므로 점유가 「동시 워커 수 × 입력의 약 4.5배」입니다. 그래서 입력 상한을 두었습니다. 9월 23일 AI가 6초·8Mbps·소리 6트랙 조각(6.5MiB)의 2.4배인 16MiB를 제안했고 제가 확인했습니다. 생산 코드는 9월 24일 [PR #192](https://github.com/3K-PokeClip/PokeClip-mono/pull/192)로 develop에 들어갔습니다.

## 옛 10.9배는 Go 쪽 읽기·쓰기를 뺀 값이었습니다 {#과거-109배와-현재-769배를-섞지-않았습니다}

9월 19일 같은 150조각으로 처음 잰 값은 아래와 같습니다. 녹화는 프로젝트 포크 MediaMTX v1.20.1-pokeclip.2, 입력은 1280×720 영상과 소리 6트랙이었습니다.

| 9월 19일 | p50 | p95 | 최대 | 잰 범위 |
|---|---:|---:|---:|---|
| FFmpeg 8.1.2 옵션 다섯 개 경로 | 18.7ms | 19.9ms | 51.3ms | 프로세스 시작·읽기·쓰기 포함 |
| Go 재포장 | 1.72ms | 2.36ms | 7.15ms | 읽기·쓰기 제외 |

p50을 나누면 10.87배입니다. 그런데 FFmpeg는 프로세스를 시작해 파일을 읽고 쓰는 시간까지 잰 반면, Go는 메모리 안 재포장만 쟀습니다. 이 비율에는 실행 방식을 바꾼 효과와 잰 범위를 줄인 효과가 섞여 있습니다. 그래서 이 값은 결정 당시의 참고로만 남기고 대표 수치로 쓰지 않았습니다.

## 같은 범위로 200번씩 재자 p50이 23.43ms에서 3.05ms였습니다 {#같은-5155160b-파일을-200번씩-처리했습니다}

10월 4일에는 두 경로 모두 같은 파일을 읽고, 재포장하고, 로컬 파일로 쓰는 범위로 다시 쟀습니다. 입력은 5,155,160바이트 합성 파일 하나(1920×1080, 30fps, B 프레임 있음, AAC 소리 6트랙, 4.066667초)이고, 각 경로를 10회 예열한 뒤 200회씩 돌렸습니다. Go는 상주 프로세스로 부르고 FFmpeg는 매번 시작하는, 실제 구조 차이는 그대로 뒀습니다. 그림 2에서 Go 막대는 p95까지 3ms대입니다.

{{< chart id="fig-remux-same-io" kind="실측" caption="같은 5,155,160바이트 파일의 읽기·재포장·로컬 쓰기 시간(ms), 각 200회. FFmpeg는 매번 프로세스를 시작하고 Go는 상주 프로세스에서 부릅니다. 2026년 10월 4일, macOS arm64, Go 1.26.5, FFmpeg 8.1.2, warm file cache, fsync·S3·네트워크 제외. 양쪽 모두 시각 도장을 옮기지 않았습니다." source="팀 내부 실측(비공개 원시 묶음), 포트폴리오 요약 2026-10-15판 13쪽" height="260px" >}}
{
  "grid": {"left": 8, "right": 72, "top": 40, "bottom": 8, "containLabel": true},
  "legend": {"top": 0, "data": ["p50", "p95"]},
  "xAxis": {"type": "value", "name": "ms", "min": 0, "max": 30, "interval": 10},
  "yAxis": {"type": "category", "inverse": true, "data": ["FFmpeg", "Go"]},
  "series": [
    {"name": "p50", "type": "bar", "barWidth": 18, "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "right", "formatter": "{c}ms"}, "data": [23.43, 3.05]},
    {"name": "p95", "type": "bar", "barWidth": 18, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}ms"}, "data": [{"value": 24.50, "label": {"formatter": "24.50ms"}}, 3.29]}
  ]
}
{{< /chart >}}

7.69배는 반올림 전 p50으로 `23.4330625 ÷ 3.0479995 = 7.688…`을 계산한 값입니다. 두 경로 모두 영상 1·소리 1, 길이 4.066667초를 냈습니다. 이 측정의 FFmpeg 명령은 `-map 0:v:0 -map 0:a:0 -c copy -movflags +frag_keyframe+empty_moov+default_base_moof -frag_duration 1000000`으로, 9월 19일의 옵션 다섯 개 경로가 아니고 파트도 다시 자릅니다. Go는 `PlaybackPos` 0으로 불렀으므로 양쪽 모두 시각 도장을 옮기지 않았습니다. 따로 돌린 CPU 프로파일은 샘플이 806ms뿐이고 파일 입출력과 런타임 비용이 섞여 있어, 함수별 비율을 정하는 데는 쓰지 않았습니다. 이 값은 재포장 한 번의 시간이고, 서비스 전체 지연이 같은 비율로 줄었다는 뜻이 아닙니다.

## 동시 작업을 8개로 늘리자 처리량은 그대로이고 메모리만 늘었습니다 {#처리량이-그대로인데-메모리만-늘-수도-있었습니다}

한 번이 빨라도 여러 개를 동시에 돌리면 메모리가 늘어납니다. 10월 6일 실제 녹화 입력 3종(0.37MB · 4.66MB · 6.78MB, 영상 1·소리 6)으로 동시 작업 1·2·4·8을 쟀습니다. 조건마다 독립 프로세스 5회, 프로세스당 800회로 모두 48,000회를 불렀고, 출력 SHA256이 모두 기대값과 같았습니다.

| 6.78MB 입력 동시 작업 | 최대 RSS 중앙값 | 호출 p95 중앙값 |
|---:|---:|---:|
| 1 | 85.03MiB | 5.825ms |
| 2 | 106.67MiB | 10.566ms |
| 4 | 171.84MiB | 11.145ms |
| 8 | 303.20MiB | 45.211ms |

동시 작업을 4에서 8로 늘리자 처리량은 초당 293회에서 294회로 거의 같았지만, 최대 RSS는 171.84MiB에서 303.20MiB로, 호출 p95는 11.145ms에서 45.211ms로 늘었습니다. 이 조건(GOMAXPROCS=4)에서는 작업을 더 늘려 얻는 것이 없고 메모리와 긴 응답만 늘었습니다. p95는 실행별 p95의 중앙값이고, 호출당 누적 할당 36.90MB는 최대 RSS와 다른 지표입니다. 지금 사이드카의 업로드 워커는 하나라([README 1456행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1454-L1458)) 이 표는 워커를 늘릴 때 쓸 근거로 남았습니다.

## 속도 시험과 재생 정합성 시험은 따로 남겼습니다 {#속도와-재생-정합성은-다른-증거가-필요했습니다}

위 세 측정은 재포장이 얼마나 빠른지, 동시에 돌리면 얼마나 드는지만 봅니다. 만든 조각이 이어서 재생되는지는 9월 19일 만든 150조각을 hls.js 1.5.15(9월 19일)와 hls.js 1.7.3·Safari(9월 23일)로 재생한 시험이 따로 맡았고, 그 결과와 재접속 경계의 대가는 [재접속 경계 글](/posts/0-to-1/pokeclip-reconnect-audio-gap/)에 있습니다. 10월 6일 동시성 시험은 출력 해시가 같은지만 확인했습니다.

FFmpeg를 Go로 바꾼 이유는 속도가 아니라 같은 입력 설정에서 같은 init이 나오는가였습니다. 재포장 도구를 고를 때는 처리 시간보다 먼저 산출 init이 조각마다 같은지, 파트와 첫 시각이 보존되는지를 바이트로 확인하십시오. 속도 비교는 그다음에, 양쪽의 잰 범위를 맞춰서 하십시오.

## 측정 조건

- 9월 4일: 사이드카 개발 환경에서 실제 송출로 녹화한 3조각, 호스트 FFmpeg 8.1.2·Alpine FFmpeg 6.1.2, Go 1.26.5.
- 9월 19일: 임시 MediaMTX(프로젝트 포크 v1.20.1-pokeclip.2, 녹화 4초 분할·파트 1초)에 컨테이너 ffmpeg로 영상 1(1280×720, 30fps, GOP 2초, B 프레임 2)과 소리 6트랙(사인파)을 SRT로 송출. 150조각, 호스트 Apple Silicon. Go 재포장은 mediacommon v2.9.3 기반 실험 프로그램.
- 10월 4일: macOS arm64, Go 1.26.5, FFmpeg 8.1.2. 같은 입력 파일, 10회 예열 뒤 각 200회, warm file cache, fsync·S3·네트워크·동시 실행 제외.
- 10월 6일: Apple M5(RAM 32GiB), Go 1.26.5, GOMAXPROCS=4, GOGC=100, 디스크·S3 제외. 입력 3종 × 동시 작업 4조건 × 독립 프로세스 5회 × 800회.
- 9월 4일·19일은 Claude Code, 10월 4일·6일은 Codex가 수행했고 원자료는 비공개입니다. 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #192](https://github.com/3K-PokeClip/PokeClip-mono/pull/192) — 되감기용 재포장 부품(Producer)과 축별 업로드(2026-09-24 develop 머지). 본문에 「ffmpeg 산출은 조각마다 init이 12바이트씩 달라 … 파트를 다시 잘랐다」
- [PokeClip-mono `media/README.md` 「되감기 렌디션 — Go 재포장」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1358-L1370) · [`producer.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/playback/producer.go#L54-L58) · [`chain.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/indexer/chain.go#L52-L135)
- [bluenviron/mediacommon](https://github.com/bluenviron/mediacommon) — MediaMTX가 쓰는 미디어 라이브러리
- [FFmpeg 문서: MOV/MPEG-4/ISOMBFF muxers](https://ffmpeg.org/ffmpeg-formats.html#MOV_002fMPEG_002d4_002fISOMBFF-muxers) — `movflags`·`use_editlist`·`frag_duration`
- [HLS 녹화 재생을 가른 것은 init이 아니라 tfdt였습니다](/posts/0-to-1/pokeclip-cdn-timeline-normalization/) · [같은 세션 재접속에 HLS 끊김 표시를 달지 않은 이유](/posts/0-to-1/pokeclip-reconnect-audio-gap/)
- 팀 내부 실험 기록(비공개) — 9월 4일 FFmpeg 산출 검사, 9월 19일 옵션 매트릭스와 10분 실험, 10월 4일 재측정, 10월 6일 동시성 측정

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 13–14쪽](/portfolio/2026-10-15-v2/full.pdf#page=13)
