---
title: "MediaMTX는 LL-HLS 조각 6개 설정으로도 기동했습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-14T00:17:06+09:00"
draft: false
author: "김태윤"
description: "MediaMTX v1.20.1은 LL-HLS 조각 수 6을 받아 기동한 뒤, 송출이 들어오면 gohlslib 먹서가 7개 하한으로 실패하고 10초마다 같은 실패를 되풀이했습니다. 같은 하한을 Conf.Validate에 넣은 PR #6154(v1.21.0)와, v1.20.1 · v1.21.0 · v1.21.3을 빌드해 45초 송출 중 실패 5번이 기동 거부(종료 코드 1)로 바뀐 것과 경계 여덟 가지 · 환경변수 · API 경로를 확인한 AI 재측정."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "오픈소스 기여", "HLS", "LL-HLS", "설정 검증"]
portfolio_cases: [36]
portfolio_pages: [37]
portfolio_edition: "2026-10-15-v2"
---

MediaMTX v1.20.1에 LL-HLS(Low-Latency HLS) 조각 수 `hlsSegmentCount: 6`과 `hlsAlwaysRemux: true`를 주면 서버는 그대로 기동합니다. 송출이 들어오면 HLS 먹서가 `Low-Latency HLS requires at least 7 segments`로 실패하고, 10초 뒤 다시 만들어도 같은 이유로 실패합니다. 2026년 11월 13일 다시 재 보니 45초 송출 동안 이 실패가 세 번 모두 5번씩 찍혔고, 간격은 10.000–10.004초였습니다. 같은 설정을 v1.21.0에 주면 서버가 설정을 읽는 단계에서 `'hlsSegmentCount' must be at least 7 when 'hlsVariant' is 'lowLatency'`를 남기고 종료 코드 1로 끝납니다. 이 하한을 설정 검증에 넣은 [PR #6154](https://github.com/bluenviron/mediamtx/pull/6154)는 2026년 8월 30일 병합돼 [v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0)에 들어갔습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## MediaMTX는 받고 gohlslib은 거부하는 조각 수가 있었습니다 {#두-계층이-다른-값을-허용했다}

HLS는 영상을 짧은 조각 파일로 나누고, 그 목록(재생 목록)을 계속 갱신해 내보내는 방식입니다. MediaMTX에서 들어온 스트림을 조각과 목록으로 만드는 부품을 먹서(muxer)라고 부르고, 먹서 자체는 같은 프로젝트의 라이브러리 gohlslib이 맡습니다. `hlsSegmentCount`는 목록에 남길 조각 수이고, MediaMTX는 이 값을 그대로 gohlslib 먹서에 넘깁니다.

두 계층이 받는 범위가 달랐습니다. v1.20.1이 쓰는 gohlslib v2.4.3의 `Muxer.Start()`는 조각 수가 0이면 7로 바꾸고([`muxer.go` 225–227행](https://github.com/bluenviron/gohlslib/blob/0df41de8f33f2e1f2231e4c4bec9a9331bc6449b/muxer.go#L225-L227)), LL-HLS에서 7개 미만이거나 다른 방식(fMP4 · MPEG-TS)에서 3개 미만이면 오류를 돌려줍니다([316–326행](https://github.com/bluenviron/gohlslib/blob/0df41de8f33f2e1f2231e4c4bec9a9331bc6449b/muxer.go#L316-L326)). MediaMTX v1.20.1의 설정 검증 `Conf.Validate()`에는 이 하한이 없었습니다. 그래서 설정 파일은 통과하고, 먹서를 처음 만드는 순간에야 실패가 드러났습니다.

v1.20.1 바이너리로 경계 근처 값을 하나씩 넣어 봤습니다. 서버는 여덟 가지 모두 기동했고, 하한 아래인 세 경우는 송출 10초 뒤 재생 목록 요청에 `500 muxer instance not available`을 돌려줬습니다. 이 7개 하한은 PokeClip이 라이브 창 길이를 정할 때도 기준이 됐습니다(관련 기록: [LL-HLS 라이브 창은 지연이 아니라 복귀 여유를 정했습니다](/posts/0-to-1/pokeclip-live-window-without-fork/)).

## 먹서를 10초마다 다시 만들어도 같은 이유로 실패했습니다 {#재시도보다-설정을-받아들이는-경계를-고쳤다}

MediaMTX는 먹서가 실패하면 `muxer instance crashed`를 남기고 10초 뒤 다시 만듭니다(#6154 직전 커밋 [`8402a728`의 `recreateInstancePause = 10 * time.Second`](https://github.com/bluenviron/mediamtx/blob/8402a728e6e1d819cd0c8045d231fd0191d04998/internal/servers/hls/muxer.go#L23)). 네트워크가 끊긴 것처럼 시간이 지나면 풀리는 실패라면 맞는 대응입니다. 조각 수는 설정을 다시 읽기 전까지 바뀌지 않으므로, 다음 시도도 같은 값으로 같은 검사에 걸립니다.

[[fig-segment-count-gate]]의 위 줄이 v1.20.1, 아래 줄이 v1.21.0입니다. 위 줄은 기동한 뒤 실패를 10초마다 쌓고, 아래 줄은 송출을 받기 전에 끝납니다.

{{< motion scene="SegmentCountGate" id="fig-segment-count-gate" kind="개념도" caption="조각 6개 LL-HLS 설정을 v1.20.1은 받아 기동한 뒤 송출 45초 동안 먹서 실패를 10초 간격으로 5번 남기고, v1.21.0은 기동 단계에서 거부해 종료 코드 1로 끝납니다. 실패 시각은 아래 재측정 값으로, 송출 시작 뒤 약 0.1초부터 10초 간격입니다(세 번 0.04–0.11초, 간격 10.000–10.004초)." >}}

#6154는 재시도 간격을 바꾸지 않고, 설정을 받아들이는 곳에 같은 하한을 넣었습니다. `Conf.Validate()`의 HLS 검사에 LL-HLS는 7 이상, 그 밖의 방식은 3 이상을 요구하는 분기를 더했습니다([`acb78cf5`의 `conf.go` 948–965행](https://github.com/bluenviron/mediamtx/blob/acb78cf594fce0f4c768398fdb04c17bb80a841d/internal/conf/conf.go#L948-L965)). gohlslib 쪽 검사는 그대로 남아 있습니다. 같은 하한을 설정 단계에서 한 번, 먹서를 만들 때 한 번 검사하는 구조입니다.

검사 위치로 `Conf.Validate()`를 고른 이유는 설정이 들어오는 길이 셋이고, 셋 모두 이 함수를 지나기 때문입니다. [[fig-hls-validate-paths]]에서 청록 상자가 하한을 넣은 곳입니다.

```mermaid {#fig-hls-validate-paths kind="재구성" caption="#6154 병합 커밋 acb78cf5 기준. 설정 파일과 환경변수는 conf.Load가 읽은 뒤 Validate를 부르고, API의 설정 변경 6곳(core.go 1299–1381)은 새 설정마다 Validate(nil)를 부릅니다. 하한을 통과한 값만 서버에 반영되고, gohlslib의 같은 검사는 먹서를 만들 때 한 번 더 돕니다." source="https://github.com/bluenviron/mediamtx/blob/acb78cf594fce0f4c768398fdb04c17bb80a841d/internal/core/core.go#L1299-L1381"}
flowchart TB
  accTitle: 조각 수 설정이 Conf.Validate를 거쳐 먹서에 닿는 길
  accDescr: 설정 파일과 환경변수는 conf.Load를 거쳐, API 설정 변경 6곳은 직접 Conf.Validate로 간다. Validate는 LL-HLS 7 미만, 그 밖 3 미만을 거부해 기동 실패나 API 400을 낸다. 통과하면 서버에 반영되고, 송출이 들어올 때 gohlslib 먹서가 같은 하한을 다시 검사한다.
  load["설정 파일 · 환경변수<br/>conf.Load"] --> val["Conf.Validate<br/>LL-HLS 7 미만 거부<br/>그 밖 3 미만 거부"]
  api["API 설정<br/>변경 6곳"] --> val
  val -->|거부| err["기동 실패<br/>API는 400"]
  val -->|통과| run["서버에 반영"]
  run --> mux["송출 때 gohlslib<br/>먹서가 한 번 더 검사"]
  style val fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

환경변수와 API도 같은 오류를 냈습니다. 설정 파일에는 7을 두고 `MTX_HLSSEGMENTCOUNT=6`을 주면 v1.20.1은 기동했고 v1.21.0은 종료 코드 1로 끝났습니다. 7로 실행 중인 서버에 `PATCH /v3/config/global/patch`로 6을 보내면 v1.20.1은 200을 돌려주고 값을 6으로 바꿨고, v1.21.0은 같은 오류 문구와 함께 400을 돌려주고 7을 유지했습니다.

## 경계 바로 아래만 막고 경계값은 남겼습니다 {#실패하는-입력만-확인하면-검증이-과해질-수-있다}

하한을 넣으면 잘못된 값이 막히는지는 쉽게 확인됩니다. 같이 확인해야 하는 것은 정상 값이 막히지 않는지입니다. 그래서 PR은 `TestConfErrors`에 하한 바로 아래와 하한 값을 짝으로 넣었습니다. 추가한 시험은 6건입니다. LL-HLS 6과 7, fMP4 2와 3, LL-HLS 0, 그리고 HLS를 끈 채 1입니다([`acb78cf5`의 `conf_test.go` 808–849행](https://github.com/bluenviron/mediamtx/blob/acb78cf594fce0f4c768398fdb04c17bb80a841d/internal/conf/conf_test.go#L808-L849)).

같은 시험 파일을 병합 직전 커밋 `344d8c90`에 넣으면 6건 중 3건(LL-HLS 6, fMP4 2, LL-HLS 0)이 실패하고 3건(LL-HLS 7, fMP4 3, HLS 꺼짐)은 통과했습니다. 병합 커밋 `acb78cf5`, v1.21.0, v1.21.3에서는 6건이 모두 통과했습니다. 판마다 3번씩 돌렸고 결과는 매번 같았습니다. 수정 전에도 통과하는 3건은 결함을 잡는 시험이 아니라, 하한이 정상 값까지 막지 않는지 지키는 시험입니다.

MPEG-TS는 시험에 없지만 코드에서는 fMP4와 같은 분기(`default`)를 탑니다. 그래서 바이너리로 여덟 가지를 직접 넣어 봤습니다. 판마다 3번씩 돌렸고, 세 번 모두 같았습니다.

| 설정 | v1.20.1 기동 | v1.20.1 재생 목록 | v1.21.0 기동 | v1.21.0 재생 목록 |
|---|---|---:|---|---:|
| LL-HLS 6 | 기동 | 500 · 먹서 실패 2번 | 종료 코드 1 | — |
| LL-HLS 7 | 기동 | 200 | 기동 | 200 |
| LL-HLS 0 | 기동 | 200 | 종료 코드 1 | — |
| fMP4 2 | 기동 | 500 · 먹서 실패 2번 | 종료 코드 1 | — |
| fMP4 3 | 기동 | 200 | 기동 | 200 |
| MPEG-TS 2 | 기동 | 500 · 먹서 실패 2번 | 종료 코드 1 | — |
| MPEG-TS 3 | 기동 | 200 | 기동 | 200 |
| HLS 꺼짐 · 1 | 기동 | (HLS 없음) | 기동 | (HLS 없음) |

재생 목록 칸은 16초 송출을 시작하고 10초 뒤 `/test/index.m3u8`에 보낸 요청의 HTTP 상태입니다. 먹서 실패 횟수는 송출 16초 동안 찍힌 `muxer instance crashed` 줄 수입니다. 하한 값 7 · 3 · 3은 두 판 모두 기동하고 200을 돌려줬습니다. HLS를 끈 서버는 조각 수가 1이어도 두 판 모두 기동했습니다. 쓰지 않는 기능의 값 때문에 다른 서버까지 멈추지 않도록, 하한 검사는 기존 HLS 검사와 같은 `hls`가 켜진 분기 안에 있습니다.

## 0을 쓰던 설정은 v1.21.0부터 기동하지 않습니다 {#0이라는-입력의-호환성도-명시했다}

표의 LL-HLS 0 줄은 두 판이 다릅니다. v1.20.1에서는 gohlslib이 0을 7로 바꿔 정상 동작했고, v1.21.0에서는 0이 7보다 작아 기동을 거부합니다. 잘못된 값을 일찍 막는 변경이 기존에 돌던 설정 하나를 실패로 바꾼 것입니다. PR 본문에 이 호환성 변화를 적었고, 그대로 병합됐습니다.

0을 계속 받으려면 `Conf.Validate()`가 0을 하한 검사에서 빼야 합니다. 그러면 gohlslib의 치환 규칙([225–227행](https://github.com/bluenviron/gohlslib/blob/0df41de8f33f2e1f2231e4c4bec9a9331bc6449b/muxer.go#L225-L227))을 설정 검증이 알고 있어야 하고, API로 읽은 설정에는 0이 남은 채 먹서는 조각 7개로 돌 것입니다(측정하지 않음). #6154는 이 치환을 설정 단계로 끌어오지 않고 0을 다른 작은 값처럼 거부했습니다. 기본값을 원하면 키를 지우면 되고, MediaMTX의 기본값은 이미 7입니다([`conf.go` 506행](https://github.com/bluenviron/mediamtx/blob/acb78cf594fce0f4c768398fdb04c17bb80a841d/internal/conf/conf.go#L506)).

하위 라이브러리가 받지 않을 값을 상위 설정이 먼저 받고 있다면, 그 실패는 재시도로 풀리지 않습니다. 비슷한 반복 실패 로그를 본다면 재시도 간격보다 그 값을 받아들인 첫 관문이 어디인지부터 보십시오.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 KST에 실행했습니다. 시험은 23:03:33–23:03:47, 바이너리 측정은 23:02:50–23:17:20입니다. load average(1분)는 바이너리 측정 시작 41.02, 재시도 측정 끝 8.56, 끝 26.04였습니다. 같은 기계에서 다른 세션의 작업과 이 묶음의 다른 측정이 함께 돌았습니다. 실패 간격은 10초 타이머가 정하지만, 시각 값은 이 부하 조건의 것입니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1. Linux에서는 돌리지 않았습니다.
- 빌드: Go 1.27.2 darwin/arm64로 [v1.20.1](https://github.com/bluenviron/mediamtx/tree/v1.20.1)(`883194a1`, gohlslib v2.4.3), [v1.21.0](https://github.com/bluenviron/mediamtx/tree/v1.21.0)(`2c672790`, gohlslib v2.4.4), [v1.21.3](https://github.com/bluenviron/mediamtx/tree/v1.21.3)(`9540cb6c`, gohlslib v2.4.7)을 `go build`. 세 gohlslib 판의 하한은 같습니다. `internal/core/VERSION`은 `git describe` 값으로 쓰고, `internal/servers/hls/hls.min.js`는 `go generate`로 받았습니다.
- 시험: `go test -count=1 -v -run '^TestConfErrors$/hlsSegmentCount' ./internal/conf`를 `344d8c90`(병합 커밋의 `conf_test.go`를 옮겨 넣음), `acb78cf5`, v1.21.0, v1.21.3에서 판마다 3번.
- 바이너리 공통 설정: RTSP(TCP, :18554)와 HLS(127.0.0.1:18888)만 켬, `hlsAlwaysRemux: true`. 송출은 FFmpeg 9.0.2 `testsrc2` 320×240 30fps를 libx264(GOP 30)로 RTSP 송출. 기동 여부는 프로세스가 4초 뒤에도 살아 있는지로 판단했습니다.
- 재시도: LL-HLS 6에서 45초 송출, `muxer instance crashed` 줄의 시각(서버 시작 기준 단조 시계)과 간격. v1.20.1 3번, v1.21.0 · v1.21.3 각 3번(기동 거부).
- 경계: 표의 여덟 가지 × v1.20.1 · v1.21.0 × 3번. 기동하면 16초 송출, 10초 뒤 `GET /test/index.m3u8`(6초 제한).
- 환경변수 · API: 파일은 LL-HLS 7, `MTX_HLSSEGMENTCOUNT=6`으로 기동 여부. API(127.0.0.1:19997)를 켠 서버에 `PATCH /v3/config/global/patch` `{"hlsSegmentCount": 6}`과 뒤이은 `GET /v3/config/global/get`. 판마다 1번.
- 원자료: 스크립트 · 설정 · 서버 로그 · 시험 출력 · 요약은 [저장소 `_workspace/blog/mediamtx-hls-segment-count-validation/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/mediamtx-hls-segment-count-validation/measure)에 있습니다.

## 출처

- [bluenviron/mediamtx PR #6154 「hls: validate hlsSegmentCount according to the HLS variant」](https://github.com/bluenviron/mediamtx/pull/6154) — 2026-08-30 병합, 병합 커밋 [acb78cf5](https://github.com/bluenviron/mediamtx/commit/acb78cf594fce0f4c768398fdb04c17bb80a841d)
- [`acb78cf5`의 `internal/conf/conf.go` 948–965행](https://github.com/bluenviron/mediamtx/blob/acb78cf594fce0f4c768398fdb04c17bb80a841d/internal/conf/conf.go#L948-L965) · [`internal/core/core.go` 1299–1381행](https://github.com/bluenviron/mediamtx/blob/acb78cf594fce0f4c768398fdb04c17bb80a841d/internal/core/core.go#L1299-L1381)
- [`8402a728`의 `internal/servers/hls/muxer.go`](https://github.com/bluenviron/mediamtx/blob/8402a728e6e1d819cd0c8045d231fd0191d04998/internal/servers/hls/muxer.go) — 실패한 먹서를 10초 뒤 다시 만듦
- [bluenviron/gohlslib v2.4.3(0df41de8) `muxer.go`](https://github.com/bluenviron/gohlslib/blob/0df41de8f33f2e1f2231e4c4bec9a9331bc6449b/muxer.go#L316-L326) — 조각 수 하한과 0의 치환
- [MediaMTX v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0) · [v1.20.1](https://github.com/bluenviron/mediamtx/releases/tag/v1.20.1) · [v1.21.3](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.3) 릴리스
- [LL-HLS 라이브 창은 지연이 아니라 복귀 여유를 정했습니다](/posts/0-to-1/pokeclip-live-window-without-fork/) — 같은 7개 하한이 나온 PokeClip 기록

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 37쪽](/portfolio/2026-10-15-v2/full.pdf#page=37)

포트폴리오 요약(2026-10-15판) 37쪽의 수치와 시험 수는 이 글의 11월 13일 재측정과 다릅니다. 37쪽의 「검증을 옮겼다」와 달리 gohlslib의 검사는 그대로 두고 같은 하한을 설정 검증에 더했습니다.
