---
title: "MediaMTX 대체 화면은 보여 주되 녹화하지 않게 했습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-14T00:17:06+09:00"
draft: false
author: "김태윤"
description: "MediaMTX의 alwaysAvailable 경로는 소스가 없을 때 띄우는 대체 화면까지 녹화했습니다. 원 PR #5767(AbdElrahmaN31)의 alwaysAvailableRecorded를 이어받아 녹화 시작 · 종료를 setOnline · setOffline으로 옮긴 PR #6182(v1.21.0), 원 커밋에서 1개만 통과하던 회귀 시험 3개와 v1.21.0 바이너리에서 오프라인 구간 새 녹화 파일이 true 4개 · false 0개였던 AI 재측정."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "오픈소스 기여", "상태 전환", "녹화"]
portfolio_cases: [38]
portfolio_pages: [40]
portfolio_edition: "2026-10-15-v2"
---

MediaMTX의 `alwaysAvailable` 경로는 실제 소스가 없을 때 미리 정한 대체 영상(오프라인 조각)을 반복해 내보냅니다. 같은 경로에 `record`를 켜면 이 대체 영상도 녹화돼, 방송이 없는 시간에도 녹화 파일이 쌓였습니다([이슈 #5587](https://github.com/bluenviron/mediamtx/issues/5587)). [PR #6182](https://github.com/bluenviron/mediamtx/pull/6182)는 `alwaysAvailableRecorded` 설정을 더해 `false`면 실제 소스가 온라인인 동안만 녹화하게 했고, 2026년 9월 5일 병합돼 [v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0)에 들어갔습니다. 11월 13일 v1.21.0 바이너리를 오프라인 8초 · 온라인 8초 · 오프라인 8초로 돌려 보니, 오프라인 구간마다 새 녹화 파일이 `true`에서는 4개, `false`에서는 0개였습니다. 회귀 시험 3개는 원 PR의 커밋에서 1개만 통과했고, 병합 커밋 · v1.21.0 · v1.21.3에서는 3개 모두 통과했습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## 원 PR은 publisher가 붙을 때만 녹화를 켜고 껐습니다 {#원-기여가-해결한-경로와-남은-경로를-나눴다}

이슈 #5587은 2026년 3월 18일 열렸고, `alwaysAvailable`을 켜 두면 소스가 없어도 24시간 녹화가 돈다며 실제 소스가 연결됐을 때만 녹화하는 선택지를 요청했습니다. 5월 14일 AbdElrahmaN31이 [PR #5767](https://github.com/bluenviron/mediamtx/pull/5767)로 `alwaysAvailableRecorded`를 제안했습니다. 이 PR은 경로가 준비될 때(`setAvailable`) 녹화를 미루고, publisher가 붙는 `doAddPublisher`에서 녹화를 시작하고, publisher가 떨어지는 `executeRemovePublisher`에서 녹화를 멈췄습니다. 설정을 다시 읽을 때는 `pa.source != nil`이면 녹화를 다시 시작했습니다.

MediaMTX에서 소스가 경로에 붙는 길은 둘입니다. 외부 프로그램이 송출해 들어오는 publisher와, 설정의 `source:` 주소를 MediaMTX가 직접 당겨 오는 static source입니다. 원 PR은 publisher 쪽 함수에만 녹화를 걸었습니다. 그래서 static source가 연결돼도 녹화가 시작되지 않았습니다. static source 경로에서는 `pa.source`가 연결 여부와 상관없이 경로 시작 때부터 채워져 있어, 오프라인일 때 설정을 다시 읽으면 녹화가 켜졌습니다.

8월 30일 #5767에 publisher 경로를 확인한 결과와 이 두 빈틈, 고칠 방향을 리뷰로 남겼습니다. PR은 5월 이후 갱신이 없었고 main과 충돌이 났습니다. 9월 3일 원 작성자의 커밋을 main 위로 옮겨 PR 브랜치의 첫 커밋([`4a69843a`](https://github.com/bluenviron/mediamtx/commit/4a69843aa867e371ef5cd9317b5fde9b53864572))으로 두고, 그 위에 보완 커밋을 얹어 #6182를 열었습니다. #5767에는 원 작성자가 직접 이어가길 원하면 #6182를 닫겠다는 댓글을 남겼습니다. 유지보수자 aler9는 9월 5일 static source를 다루지 못한다는 분석에 동의하며 #5767을 닫고 #6182로 옮겼고, 원 작성자에게도 기여를 인정하겠다고 적었습니다([#5767 댓글](https://github.com/bluenviron/mediamtx/pull/5767#issuecomment-5551100866)). 병합은 커밋 하나로 합친 [`1a6e23a0`](https://github.com/bluenviron/mediamtx/commit/1a6e23a0f7787bb127329bcc42435bf4bcc058dd)이고, 원 작성자는 그 커밋의 공동 작성자로 남았습니다.

#6182의 회귀 시험 3개를 원 작성자의 커밋 `4a69843a`에 옮겨 넣고 돌린 결과입니다. 판마다 3번 돌렸고 결과는 매번 같았습니다.

| 시험 | 원 PR 커밋 `4a69843a` | 보완 커밋 `5bff8b89` | 병합 `1a6e23a0` · v1.21.0 · v1.21.3 |
|---|---|---|---|
| publisher 연결 · 해제 | 통과 | 통과 | 통과 |
| static source 연결 · 해제 | 실패: 연결 뒤 녹화 시작 안 됨 | 통과 | 통과 |
| 오프라인 중 설정 다시 읽기 | 실패: 녹화 파일 1개 생김 | 통과 | 통과 |

두 실패는 방향이 반대입니다. static source에서는 녹화해야 할 때 시작하지 않았고, 오프라인 재로드에서는 녹화하지 말아야 할 때 시작했습니다.

## 녹화 시작과 종료를 setOnline · setOffline으로 옮겼습니다 {#녹화의-기준을-진입-함수에서-상태-전환으로-옮겼다}

publisher와 static source가 공통으로 지나는 곳은 경로의 온라인 상태를 바꾸는 `setOnline()`과 `setOffline()`입니다. publisher가 붙으면 `doAddPublisher`가, static source가 연결되면 `doSourceStaticSetReady`가 `setOnline()`을 부릅니다. 보완 커밋은 `alwaysAvailable`이고 `alwaysAvailableRecorded`가 `false`일 때 `setOnline()`에서 녹화를 시작하고 `setOffline()`에서 멈추게 했습니다. 설정을 다시 읽을 때의 조건도 `pa.source != nil` 대신 `pa.isOnline()`을 보게 바꿨습니다([`1a6e23a0`의 `path.go` 900–932행](https://github.com/bluenviron/mediamtx/blob/1a6e23a0f7787bb127329bcc42435bf4bcc058dd/internal/core/path.go#L900-L932), [475행](https://github.com/bluenviron/mediamtx/blob/1a6e23a0f7787bb127329bcc42435bf4bcc058dd/internal/core/path.go#L475)). 원 PR이 `doAddPublisher` · `executeRemovePublisher`에 넣은 녹화 코드는 이 두 함수로 합쳐졌습니다.

[[fig-offline-recording-states]]에서 두 입력이 같은 전환을 지나고, 녹화는 그 전환에만 묶여 있습니다.

```mermaid {#fig-offline-recording-states kind="재구성" caption="병합 커밋 1a6e23a0의 internal/core/path.go 기준, alwaysAvailable 경로에서 alwaysAvailableRecorded가 false일 때. publisher와 static source 모두 setOnline으로 온라인이 되고 그때 녹화가 시작되며, setOffline에서 녹화가 멈춥니다. 오프라인 중 설정을 다시 읽으면 isOnline()이 거짓이라 녹화를 시작하지 않습니다." source="https://github.com/bluenviron/mediamtx/blob/1a6e23a0f7787bb127329bcc42435bf4bcc058dd/internal/core/path.go#L900-L932"}
stateDiagram-v2
  direction TB
  accTitle: alwaysAvailableRecorded false 경로의 온라인 전환과 녹화
  accDescr: 오프라인 상태에서는 대체 화면을 내보내고 녹화하지 않는다. publisher 연결이나 static source 연결이 setOnline을 불러 온라인이 되며 녹화를 시작한다. 연결이 끊기면 setOffline이 녹화를 멈추고 오프라인으로 돌아간다. 오프라인 중 설정을 다시 읽어도 isOnline이 거짓이라 오프라인 그대로다.
  state "오프라인 · 대체 화면 · 녹화 없음" as off
  state "온라인 · 녹화 중" as on
  [*] --> off
  off --> on: setOnline(publisher · static source)
  on --> off: setOffline(끊김)
  off --> off: 재로드 · isOnline 거짓
```

static source가 준비될 때 지나는 `doSourceStaticSetReady`와 끊길 때 지나는 `doSourceStaticSetNotReady`에 publisher 쪽 조건을 그대로 복사하는 방법도 있었습니다. 그러면 녹화 규칙이 네 함수에 흩어지고, 입력 종류가 늘 때마다 같은 조건을 다시 붙여야 합니다. 옵션의 뜻은 「소스 종류와 상관없이 온라인인 동안만 녹화」이므로, 온라인을 정하는 두 함수에 두는 편을 리뷰에서 제안했고 그대로 구현했습니다. 원 PR의 기준 커밋에는 아직 `setOnline` · `setOffline`이 없었습니다. 두 함수는 그 뒤 7월에 들어온 [#5956](https://github.com/bluenviron/mediamtx/pull/5956)(`runOnOnline` · `runOnOffline` 훅 추가)으로 생겼으므로, 원 PR이 publisher 함수에 직접 녹화를 건 것은 당시 코드에서 자연스러운 선택이었습니다.

`alwaysAvailable`이 아닌 경로는 바뀌지 않습니다. 그런 경로도 `setAvailable`에서 `setOnline()`을 부르지만, 새 코드는 `pa.conf.AlwaysAvailable`일 때만 동작하므로 녹화는 지금처럼 `setAvailable`에서 시작됩니다.

## 기본값 true로 두어 기존 설정은 그대로 녹화합니다 {#기본값과-설정-인터페이스도-변경-범위였다}

`alwaysAvailableRecorded`의 기본값은 `true`입니다([`conf/path.go` 375행](https://github.com/bluenviron/mediamtx/blob/1a6e23a0f7787bb127329bcc42435bf4bcc058dd/internal/conf/path.go#L375)). 설정을 바꾸지 않은 사용자는 오프라인 대체 화면까지 녹화하던 동작을 그대로 받고, `false`를 명시해야 실제 소스가 온라인인 동안만 녹화합니다. 대체 화면을 시청자에게 내보내는 일은 두 값 모두에서 그대로입니다.

[[fig-offline-recording-files]]는 v1.21.0 바이너리에서 publisher를 중간 8초만 붙였을 때 구간마다 새로 생긴 녹화 파일 수입니다. 회색이 `true`, 청록이 `false`입니다.

{{< chart id="fig-offline-recording-files" kind="실측" caption="구간마다 새로 생긴 녹화 파일 수(2초 조각, 3번 모두 같은 값). v1.21.0, alwaysAvailable 경로에 오프라인 8초 → RTSP publisher 8초 → 오프라인 8초. true는 세 구간 모두 4개, false는 온라인 구간에만 4개였습니다. 2026-11-13, MacBook Air(M5)." source="아래 「측정 조건」" height="320px" >}}
{
  "grid": {"left": 8, "right": 40, "top": 40, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "data": ["true (기본값)", "false"]},
  "xAxis": {"type": "value", "name": "파일 수", "min": 0, "max": 5, "interval": 1},
  "yAxis": {"type": "category", "inverse": true, "data": ["오프라인 8초", "온라인 8초", "다시 오프라인 8초"]},
  "series": [
    {"name": "true (기본값)", "type": "bar", "barWidth": 14, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [4, 4, 4]},
    {"name": "false", "type": "bar", "barWidth": 14, "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [0, 4, 0]}
  ]
}
{{< /chart >}}

온라인 구간의 4개는 두 값이 같았고, 오프라인 구간만 4개와 0개로 갈렸습니다. 이 바이너리 측정은 publisher 경로만 본 것이고, static source와 재로드는 아래 시험으로만 확인했습니다.

설정 항목은 런타임 코드 밖에도 있습니다. 원 작성자의 커밋에는 설정 구조체 · 기본값(`internal/conf/path.go`)과 기능 문서(`docs/2-features/08-always-available.md`)가 있었습니다. 보완 커밋([`5bff8b89`](https://github.com/bluenviron/mediamtx/commit/5bff8b895251492013d8d7e1b2ea8bbf09cda700))은 예시 설정 `mediamtx.yml`의 설명, `apidocsgen`으로 다시 만든 `api/openapi.yaml`, 198줄짜리 회귀 시험 파일을 더했습니다. 파일 설정에 보이는 이름과 API가 받는 필드가 같은 이름 `alwaysAvailableRecorded`로 맞춰졌습니다.

## 오프라인 중 설정을 다시 읽어도 녹화가 시작되지 않았습니다 {#재로드-중의-상태도-회귀-검증에-넣었다}

[[fig-offline-recording-gate]]는 네 경우를 같은 시간축에 놓은 것입니다. 얇은 띠가 경로 상태(청록 = 온라인), 굵은 막대가 녹화입니다. 빨간 이름표는 원 PR 커밋의 동작이고, 회색 「시험 안 함」은 재로드 뒤 온라인 구간을 시험하지 않았다는 뜻입니다.

{{< motion scene="OfflineRecordingGate" id="fig-offline-recording-gate" kind="개념도" caption="true는 오프라인 구간까지 녹화하고, false는 publisher · static source 두 경우 온라인 구간만 녹화하며, 오프라인 중 재로드는 녹화를 시작하지 않습니다(재로드 뒤 온라인 구간은 시험하지 않았습니다). 원 PR 커밋에서는 static source가 연결돼도 녹화가 없었고, 오프라인 중 재로드에서 녹화가 시작됐습니다. 구간 길이는 설명용입니다." >}}

재로드 시험은 static source 경로가 오프라인일 때 `PATCH /v3/config/paths/patch/mystream`으로 설정을 바꾸고, 녹화 폴더에 파일이 생기지 않는지 봅니다([`path_record_alwaysavailable_test.go` 164–198행](https://github.com/bluenviron/mediamtx/blob/1a6e23a0f7787bb127329bcc42435bf4bcc058dd/internal/core/path_record_alwaysavailable_test.go#L164-L198)). 원 PR 커밋에서는 파일이 1개 생겨 실패했고, 보완 뒤에는 0개였습니다. 병합 커밋에서 세 시험을 `-race`로 한 번 더 돌렸을 때도 모두 통과했고 DATA RACE는 없었습니다.

확인하지 않은 것도 있습니다. 시험과 바이너리 측정은 모두 H264 트랙 하나의 기본 오프라인 조각을 썼고, `alwaysAvailableFile`로 준 MP4, 다른 코덱, 요청 때만 켜지는 소스와의 조합은 돌리지 않았습니다. Linux에서도 돌리지 않았습니다.

녹화를 켜고 끄는 조건이 입력 종류마다 다른 함수에 있다면, 새 입력이 생길 때마다 같은 빈틈이 다시 생깁니다. 상태를 바꾸는 함수가 이미 있다면 부수 동작도 그 함수에 묶는 쪽이 입력 종류와 재로드를 함께 덮습니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 KST에 실행했습니다. 시험은 23:10:46–23:16:40(마지막 `-race` 실행 포함), 바이너리 측정은 23:12:27–23:14:52입니다. load average(1분)는 시험 시작 5.14, v1.21.0 시험 시작 55.09, 바이너리 측정 끝 40.27이었습니다. 같은 기계에서 다른 세션의 작업과 이 묶음의 다른 측정이 함께 돌았습니다. 시험은 통과 여부만, 바이너리 측정은 파일 수만 셉니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1. Linux에서는 돌리지 않았습니다.
- 시험: `go test -count=1 -v -run '^TestPathRecordAlwaysAvailableRecorded' ./internal/core`(시험 3개, :8554 고정 포트라 순서대로)를 `4a69843a`(병합 커밋의 시험 파일을 옮겨 넣음), `5bff8b89`, `1a6e23a0`, [v1.21.0](https://github.com/bluenviron/mediamtx/tree/v1.21.0), [v1.21.3](https://github.com/bluenviron/mediamtx/tree/v1.21.3)에서 3번씩, `1a6e23a0`에서 `-race`로 1번. Go 1.27.2 darwin/arm64. `internal/core/VERSION`은 `git describe` 값, `internal/servers/hls/hls.min.js`는 `go generate`로 받았습니다.
- 바이너리: v1.21.0(`2c672790`)을 `go build`. RTSP(TCP, :28554)만 켬. 경로 `test`에 `alwaysAvailable: true` · `alwaysAvailableTracks: [{codec: H264}]` · `record: true` · `recordSegmentDuration: 2s` · `recordPartDuration: 1s`. 서버 시작 → 8초 대기 → FFmpeg 9.0.2 `testsrc2` 320×240 30fps(libx264, GOP 30) 8초 RTSP 송출 → 8초 대기, 각 구간 끝에서 녹화 폴더의 파일 수. `true` · `false` 각 3번.
- 원자료: 스크립트 · 설정 · 서버 로그 · 시험 출력 · 요약(녹화 파일 자체는 빼고 수와 크기만)은 [저장소 `_workspace/blog/mediamtx-offline-recording-source-lifecycle/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/mediamtx-offline-recording-source-lifecycle/measure)에 있습니다.

## 출처

- [bluenviron/mediamtx PR #6182 「always-available: support disabling recording when the source is offline」](https://github.com/bluenviron/mediamtx/pull/6182) — 2026-09-05 병합, 병합 커밋 [1a6e23a0](https://github.com/bluenviron/mediamtx/commit/1a6e23a0f7787bb127329bcc42435bf4bcc058dd)
- [PR #5767 「always-available: support disabling recording when source is offline」(AbdElrahmaN31)](https://github.com/bluenviron/mediamtx/pull/5767) — 원 제안, 2026-08-30 리뷰, 2026-09-05 닫힘
- [이슈 #5587 「Add option to prevent 24/7 recording when alwaysAvailable is enabled」](https://github.com/bluenviron/mediamtx/issues/5587)
- [원 작성자 커밋 4a69843a](https://github.com/bluenviron/mediamtx/commit/4a69843aa867e371ef5cd9317b5fde9b53864572) · [보완 커밋 5bff8b89](https://github.com/bluenviron/mediamtx/commit/5bff8b895251492013d8d7e1b2ea8bbf09cda700)
- [`1a6e23a0`의 `internal/core/path.go`](https://github.com/bluenviron/mediamtx/blob/1a6e23a0f7787bb127329bcc42435bf4bcc058dd/internal/core/path.go#L900-L932) · [`path_record_alwaysavailable_test.go`](https://github.com/bluenviron/mediamtx/blob/1a6e23a0f7787bb127329bcc42435bf4bcc058dd/internal/core/path_record_alwaysavailable_test.go)
- [MediaMTX v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0) · [v1.21.3](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.3) 릴리스

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 40쪽](/portfolio/2026-10-15-v2/full.pdf#page=40)

포트폴리오 요약(2026-10-15판) 40쪽의 「커밋 보존」 표현은 이 글과 다릅니다. 원 작성자의 커밋은 PR 브랜치의 첫 커밋으로 남았고, 상류에는 커밋 하나로 합쳐져 공동 작성자로 기록됐습니다.
