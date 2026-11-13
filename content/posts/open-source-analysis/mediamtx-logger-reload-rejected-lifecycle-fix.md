---
title: "로그 재설정 중 훅을 기다리게 한 PR은 교착 반례로 닫혔습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-13T22:40:00+09:00"
draft: false
author: "김태윤"
description: "MediaMTX v1.21.1은 로그 설정을 바꾸면 서버와 로거를 모두 다시 만들어, 그 사이 끝난 훅의 OnExit가 교체 중인 로거를 읽을 수 있었습니다. 재설정이 훅을 기다리게 한 PR #6206은 3초 훅에서 RTSP 리스너 공백을 0.36ms에서 3,035ms로 늘렸고, 재설정을 일으킨 외부 명령을 기다리면 교착이 된다는 리뷰로 2026년 10월 11일 닫혔습니다. 대체 수정 #6326(v1.21.3)과 함께 AI가 다시 잰 기록입니다."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "Go", "오픈소스 기여", "동시성", "트레이드오프"]
portfolio_cases: [40]
portfolio_pages: [44]
portfolio_edition: "2026-10-15-v2"
---

MediaMTX v1.21.1은 로그 설정을 바꾸면 RTSP·API 서버와 로거를 모두 닫고 다시 만들었습니다. 실행 중인 훅은 기다리지 않아서, 그 사이에 끝난 훅의 `OnExit`가 교체 중인 로거를 읽을 수 있었습니다. 재설정이 훅이 끝나기를 기다리게 바꾼 [PR #6206](https://github.com/bluenviron/mediamtx/pull/6206)은 이 경합을 없앴지만, 기다리는 동안 RTSP 리스너도 비었습니다. 2026년 11월 13일 다시 재 보니 SIGINT를 받고 3초 뒤 끝나는 훅을 걸었을 때 리스너가 없는 시간이 v1.21.1의 0.36ms에서 #6206의 3,035ms로 늘었습니다(10회 중앙값). 유지보수자는 재설정을 일으킨 외부 명령을 기다리면 교착이 된다고 지적하고 10월 11일 PR을 닫았으며, 로거를 닫지 않고 다시 읽는 [#6326](https://github.com/bluenviron/mediamtx/pull/6326)으로 대체했습니다. #6326은 v1.21.3에 들어갔습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## v1.21.1은 로그 설정을 바꿀 때 서버와 로거를 모두 다시 만들었습니다 {#종료-요청과-로거-사용-종료가-어긋났다}

MediaMTX는 실행 중에 설정 파일이나 API로 로그 수준·목적지를 바꿀 수 있습니다. v1.21.1의 `closeResources`는 로그 설정 다섯 가지(`logLevel`·`logDestinations`·`logFile`·`sysLogPrefix`·`logStructured`) 가운데 하나라도 바뀌면 `closeLogger`를 참으로 두고([`core.go` 970–975행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/core/core.go#L970-L975)), 로거를 쓰는 서버와 경로 관리자를 닫았다가 새로 만듭니다. 이 방식은 [#2278 커밋 `5a40a06e`](https://github.com/bluenviron/mediamtx/commit/5a40a06e9e5408370c8b7b6c43e38ff16be4facb)부터 이어졌습니다.

훅은 이 범위 밖에 있었습니다. 훅 명령을 띄우는 `externalcmd.Cmd`의 `Close()`는 종료 신호만 보내고 명령이 끝나기를 기다리지 않습니다([`cmd.go` 48–51행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/externalcmd/cmd.go#L48-L51)). 훅 고루틴이 모두 끝나기를 기다리는 `externalCmdPool.Close()`는 서버를 끝낼 때(`newConf == nil`)만 불렸습니다([`core.go` 1329–1332행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/core/core.go#L1329-L1332)). 그래서 재설정 도중 끝난 훅의 `OnExit`가 `Core.Log()`를 거쳐 `p.logger`를 읽는 동안, 재설정 경로가 같은 필드를 새 로거로 바꿔 쓸 수 있었습니다([`core.go` 375–377행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/core/core.go#L375-L377), [1342–1360행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/core/core.go#L1342-L1360)).

PR의 첫 판은 로그 한 줄마다 Core 수준의 잠금을 더해 이 읽기를 막았습니다. `Logger.Log`도 줄마다 자기 잠금을 잡으므로 그 위에 잠금을 하나 더 두는 방식이었습니다. 유지보수자 aler9는 9월 21일(KST) 버그는 맞지만 로그 줄마다 잠금을 잡는 수정은 성능 부담이 크고 나머지 코드와 다르다고 답했습니다. 대신 로거를 다시 만들 때는 `externalCmdPool`까지 모두 닫아 로거를 쓰는 쪽이 없게 한 뒤 새로 만들자고 했습니다([#6206 댓글](https://github.com/bluenviron/mediamtx/pull/6206#issuecomment-5750761444)). PR은 9월 23일 이 방향으로 다시 쓰였습니다.

## drain은 이전 훅이 끝난 뒤 다음 훅을 시작하게 했습니다 {#수정한-순서가-실제로-지켜지는지-확인했다}

#6206의 `core.go` 변경은 6줄 추가, 1줄 삭제입니다. `closeExternalCmdPool := newConf == nil || closeLogger`를 두어 로거를 다시 만드는 재설정에서도 로거를 바꾸기 전에 훅 풀을 닫고 기다리고, `createResources()`가 풀을 새로 만듭니다([head `0151a87a`의 `core.go` 979행](https://github.com/bluenviron/mediamtx/blob/0151a87a570b1153db85727a08aef6451cfdb0ff/internal/core/core.go#L979), [1333–1337행](https://github.com/bluenviron/mediamtx/blob/0151a87a570b1153db85727a08aef6451cfdb0ff/internal/core/core.go#L1333-L1337)). `Core.Log()`는 바꾸지 않았습니다.

함께 더한 `TestCoreHotReloadingWaitsForHooks`는 SIGINT를 받아도 해제 파일이 생길 때까지 끝나지 않는 `runOnInit` 훅을 띄우고, 설정 파일을 고쳐 재설정을 일으킵니다.

| 하위 시험 | 확인하는 것 |
|---|---|
| logger change drains the hook pool | 로거가 바뀌면 `waiting for running hooks`가 찍히는가 |
| hooks finish before the reload completes | 이전 훅이 끝난 뒤 다음 훅이 시작하는가 |
| logger unchanged | 로그 설정이 그대로면 훅을 건드리지 않는가 |

PR 본문의 실행 기록에서 고치기 전 순서는 `start → start → exit`, 고친 뒤는 `start → exit → start`였습니다. `-race -count=20`은 macOS/arm64와 `golang:1.26-alpine3.24` 컨테이너에서 20번 모두 통과했습니다. 이번 재측정에서는 시험 대신 실제 서버로 같은 순서를 봤습니다. 3초 훅을 건 채 `logLevel`을 10번 바꾸자 v1.21.1은 매번 새 훅이 이전 훅이 끝나기 전에 시작했고(`start → start → exit`), #6206 head는 10번 모두 `start → exit → start`였습니다.

## 기다린 만큼 RTSP 리스너가 비었습니다 {#안전한-순서의-비용을-리스너-부재-시간으로-쟀다}

#6206의 기다림은 RTSP·API 서버를 닫은 뒤에 일어납니다. 훅이 끝날 때까지 RTSP 포트에는 리스너가 없습니다. 같은 재설정 안에서 서버 로그의 `[RTSP] closing`부터 `[RTSP] started with listeners`까지를 판마다 10번 쟀습니다. [[fig-rtsp-gap]]에서 3초짜리 막대는 하나뿐입니다.

{{< chart id="fig-rtsp-gap" kind="실측" caption="logLevel을 PATCH로 바꿀 때 RTSP 리스너가 없던 시간(ms, 판·조건마다 10회의 중앙값). 3초 훅은 SIGINT를 잡고 3초 뒤 끝나는 runOnInit입니다. #6206 head만 훅을 기다려 3초가 늘었고, 나머지는 훅과 상관없이 1ms 아래였습니다. 2026-11-13, MacBook Air(M5)." source="아래 「측정 조건」" height="420px" >}}
{
  "grid": {"left": 8, "right": 80, "top": 40, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "data": ["훅 없음", "3초 훅"]},
  "xAxis": {"type": "value", "name": "ms", "min": 0, "max": 3500, "interval": 1000},
  "yAxis": {"type": "category", "inverse": true, "data": ["v1.21.1", "#6206 head", "#6326 직전", "#6326 머지", "v1.21.3"]},
  "series": [
    {"name": "훅 없음", "type": "bar", "barWidth": 12, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [0.25, 0.26, 0.28, 0.39, 0.3]},
    {"name": "3초 훅", "type": "bar", "barWidth": 12, "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [0.36, 3035.0, 0.35, 0.34, 0.26]}
  ]
}
{{< /chart >}}

#6206 head의 10번은 3,020.8–3,168.2ms였고, 늘어난 만큼이 훅이 SIGINT 뒤 버틴 3초입니다. PR 본문에 적은 값(0.25ms 대 3.01초)과 같은 크기입니다. SIGINT를 무시하는 훅이라면 이 공백에는 상한이 없습니다.

FFmpeg로 붙인 RTSP 송출자는 다섯 판 모두 재설정마다 끊겼습니다. `logLevel`은 경로 관리자를 다시 만드는 조건에 직접 들어 있어서([v1.21.3 `core.go` 1132–1133행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/core/core.go#L1132-L1133)), 리스너 공백의 길이와 상관없이 기존 연결은 끊깁니다.

## 재설정을 일으킨 훅을 기다리면 끝나지 않습니다 {#기다리는-대상이-재설정을-일으키면-순환이-된다}

aler9는 10월 11일 다시 검토하고 다음과 같이 적었습니다([#6206 댓글](https://github.com/bluenviron/mediamtx/pull/6206#issuecomment-6109821272)).

> the downside of the current approach (which i proposed, i know, it's partially my fault) is that external commands are waited for before shutting down the logger, and this causes a deadlock when it's an external command that triggered the logger recreation.

댓글은 기제를 더 설명하지 않았습니다. 재측정에서는 이 교착을 만드는 한 방법으로, API로 `logLevel`을 바꾼 뒤 API가 새 설정을 돌려줄 때까지 기다리는 훅을 AI가 만들었습니다. 설정을 바꾸고 반영을 확인하는 스크립트와 같은 모양입니다.

조건이 하나 더 필요했습니다. v1.21.1의 API는 `PATCH` 요청에 먼저 응답한 뒤 재설정을 시작합니다([`core.go` 413–422행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/core/core.go#L413-L422)). 그래서 `curl`로 PATCH만 보내고 끝나는 훅은 재설정과 엮이지 않습니다. 훅이 재설정 뒤의 API를 기다려야 순환이 생깁니다. #6206 head의 재설정은 API를 먼저 닫고([1258–1261행](https://github.com/bluenviron/mediamtx/blob/0151a87a570b1153db85727a08aef6451cfdb0ff/internal/core/core.go#L1258-L1261)) 훅 풀을 기다립니다([1333–1337행](https://github.com/bluenviron/mediamtx/blob/0151a87a570b1153db85727a08aef6451cfdb0ff/internal/core/core.go#L1333-L1337)). API는 그 기다림이 끝나야 다시 만들어지는데, 훅은 API가 돌아와야 끝납니다.

[[fig-reload-wait-cycle]]의 위 줄이 이 순환입니다. 아래 줄의 v1.21.3은 같은 PATCH에서 API를 잠깐 닫았다 바로 다시 엽니다.

{{< motion scene="ReloadWaitCycle" id="fig-reload-wait-cycle" kind="개념도" caption="#6206에서는 훅이 PATCH로 재설정을 일으키고, 재설정은 API를 닫은 뒤 훅이 끝나기를 기다립니다. 훅은 새 설정의 API를 기다리므로 둘이 서로를 기다립니다. v1.21.3은 로거를 다시 읽기만 하고 훅을 기다리지 않아, 닫힌 API가 바로 다시 열리고 훅이 응답을 받아 끝납니다. 훅은 재현을 위해 AI가 만든 것이고, 리뷰어가 말한 교착을 만드는 한 방법입니다." >}}

이 훅을 `runOnDisconnect`(연결이 끊길 때 한 번 도는 훅)에 걸고, `nc -z`로 RTSP 연결을 열었다 닫아 판마다 5번 일으켰습니다. 훅은 새 `logLevel`이 보일 때까지 0.1초마다 API를 묻고 10초 뒤 포기합니다.

| 판 | 훅의 결과(5회) | API가 닫혀 있던 시간 |
|---|---|---|
| v1.21.1 `04825598` | 모두 0.04–0.08초 안에 새 설정 확인 | 1–2ms |
| #6206 head `0151a87a` | 모두 10초 뒤 포기 | 10.03–10.18초 |
| #6326 직전 `0b1fb9e1` | 모두 0.08–0.35초 안에 확인 | 1–6ms |
| #6326 머지 `ef80a852` · v1.21.3 | 모두 0.06–0.16초 안에 확인 | 3ms 이하 |

#6206 head에서 API는 훅이 10초 상한으로 포기한 직후에 돌아왔습니다. 상한이 없는 훅이었다면 재설정과 API가 함께 멈춘 채 남았을 것입니다. 이 재현은 리뷰어가 말한 교착이 생기는 한 경로를 보여 줄 뿐이고, 리뷰어가 염두에 둔 경로가 이것과 같은지는 댓글만으로 알 수 없습니다.

## v1.21.3은 로거를 닫지 않고 다시 읽어 훅을 기다리지 않습니다

#6326은 `closeLogger`를 없앴습니다. 로그 설정이 바뀌면 같은 로거 객체의 수준과 목적지만 바꾸고 `logger.Reload()`를 부릅니다([v1.21.3 `core.go` 1048–1067행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/core/core.go#L1048-L1067)). 로거가 그대로이니 재설정이 훅을 기다릴 이유가 없고, 훅 풀은 여전히 서버를 끝낼 때만 기다립니다. 같은 자리의 주석도 훅 풀이 로거를 쓰므로 로거는 Core가 닫힐 때만 닫을 수 있다고 적습니다.

서버를 다시 만드는 범위는 설정마다 다릅니다. 3초 훅을 건 채 `logFile`을 10번 바꾸자 v1.21.3은 RTSP를 한 번도 닫지 않았고 송출자도 끊기지 않았습니다. 같은 변경에서 v1.21.1은 RTSP를 매번 닫았고, #6206 head는 매번 훅을 기다려 공백이 중앙값 3,020.4ms였습니다. `logLevel`은 v1.21.3에서도 경로 관리자를 다시 만드는 조건이라 RTSP·API가 매번 닫혔다 열렸습니다. 다만 기다리는 대상이 없어서 공백은 1ms 아래로 끝났습니다.

#6206은 2026년 10월 11일 23:02(KST)에 닫혔고, #6326은 20분 뒤 23:22에 머지돼 10월 25일 릴리스된 v1.21.3에 들어갔습니다. 머지 커밋 `ef80a852`는 v1.21.2의 조상이 아니므로 v1.21.2에는 이 수정이 없습니다. 제품 포크 `v1.21.1-pokeclip.2`에는 #6206 방식([`6d83f76c`](https://github.com/xodbs1021/mediamtx/commit/6d83f76ccddb31cdef5d0096b52bf21d6976a15b))이 실려 있습니다.

PR의 순서 시험은 해제 파일을 시험이 직접 만들었기 때문에, 훅이 끝나는 데 재설정이 필요한 경우를 만들 수 없었습니다. 수명을 지키려고 기다림을 넣을 때는 기다리는 대상이 끝나는 데 필요한 것이 그동안 닫혀 있지 않은지 함께 확인해야 합니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 KST 21:09–21:21에 `logLevel` 공백과 순환 재현을, 21:22–21:26에 `logFile` 변경을 실행했습니다. load average(1분)는 시작 29.11, 21:18 15.53, 21:20 41.51, 끝 5.35였습니다. 같은 기계에서 다른 세션의 작업과 이 묶음의 `go test`가 함께 돌았습니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1.
- 빌드: Go 1.27.2 darwin/arm64로 [v1.21.1](https://github.com/bluenviron/mediamtx/tree/v1.21.1)(`04825598`), #6206 head `0151a87a`(기준 v1.21.1 + 커밋 1개), #6326 직전 main `0b1fb9e1`, #6326 머지 `ef80a852`, [v1.21.3](https://github.com/bluenviron/mediamtx/tree/v1.21.3)(`9540cb6c`)을 `go build`(-race 없음).
- 도구: FFmpeg 9.0.2(RTSP 송출, TCP), curl 8.7.1, macOS `nc`, Python 3.14 표준 라이브러리.
- 공통 설정: RTSP(TCP, :18554)와 API(127.0.0.1:19997)만 켬, `logStructured: true`(시각은 마이크로초 단위로 찍힘). 3초 훅은 경로 `test`의 `runOnInit`(`runOnInitRestart: false`)으로, SIGINT를 잡고 3초 뒤 끝납니다.
- 공백: 송출을 붙인 뒤 `PATCH /v3/config/global/patch`로 `logLevel`을 debug와 info로 번갈아 10번 바꾸고(재설정 사이 4초 이상), 같은 재설정 안의 `[RTSP] closing` → `[RTSP] started with listeners` 시각 차를 쟀습니다. 판 5개 × 훅 없음·3초 훅. `logFile`은 3초 훅 조건에서 두 이름을 번갈아 10번(로그는 stdout으로만), 판 3개(v1.21.1 · #6206 head · v1.21.3).
- 순환: `runOnDisconnect` 훅이 준비 파일이 있을 때만 `logLevel`을 PATCH하고, `GET /v3/config/global/get`이 새 값을 돌려줄 때까지 0.1초마다 묻다 10초 뒤 포기합니다. `nc -z 127.0.0.1 18554`로 판마다 5번. API가 닫혀 있던 시간은 `reloading configuration (API request)` → `[API] started with listener`입니다.
- 원자료: 스크립트 · 훅 · 서버 로그 · 요약은 [저장소 `_workspace/blog/mediamtx-logger-reload-rejected-lifecycle-fix/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/mediamtx-logger-reload-rejected-lifecycle-fix/measure)에 있습니다.

## 출처

- [bluenviron/mediamtx PR #6206 「core: fix data race between configuration reload and hook logging」](https://github.com/bluenviron/mediamtx/pull/6206) — 본문의 재현 · 측정, aler9 댓글, 2026-10-11 닫힘 · [head 0151a87a](https://github.com/bluenviron/mediamtx/commit/0151a87a570b1153db85727a08aef6451cfdb0ff)
- [PR #6326 「fix race condition during logger recreation (#6206)」](https://github.com/bluenviron/mediamtx/pull/6326) — 머지 커밋 [ef80a852](https://github.com/bluenviron/mediamtx/commit/ef80a85229d9241235e83ed4b571cb69321b3029), v1.21.3
- [v1.21.1 `internal/core/core.go`](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/core/core.go) · [`internal/externalcmd/cmd.go`](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/externalcmd/cmd.go)
- [v1.21.3 `internal/core/core.go`](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/core/core.go)
- [커밋 5a40a06e(#2278)](https://github.com/bluenviron/mediamtx/commit/5a40a06e9e5408370c8b7b6c43e38ff16be4facb)
- [MediaMTX v1.21.1](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1) · [v1.21.3](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.3) 릴리스
- [xodbs1021/mediamtx 커밋 6d83f76c](https://github.com/xodbs1021/mediamtx/commit/6d83f76ccddb31cdef5d0096b52bf21d6976a15b) — 제품 포크에 실린 #6206 방식
- [Go로 다 짜려던 미디어 서버를 MediaMTX에 맡겼습니다](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/) — 제품 포크와 상류 제안의 관계

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 44쪽](/portfolio/2026-10-15-v2/full.pdf#page=44)
