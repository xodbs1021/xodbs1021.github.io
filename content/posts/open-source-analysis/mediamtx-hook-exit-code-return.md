---
title: "MediaMTX는 실패한 훅의 종료 코드를 0으로 받았습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-14T00:17:06+09:00"
draft: false
author: "김태윤"
description: "Windows가 아닌 플랫폼의 MediaMTX는 훅 명령이 5로 끝나도 종료 코드를 계산만 하고 0을 돌려줘, 재시작을 켜면 code 0이 찍히고 끄면 아무 줄도 남지 않았습니다. return 하나를 되돌린 PR #6155(v1.21.0)와, v1.20.1 · v1.21.0을 빌드해 exit 5 · exit 1 · SIGTERM을 재시작 켬 · 끔으로 돌린 AI 재측정, TestCmdExitCode를 병합 전후 커밋에서 돌린 결과."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "Go", "오픈소스 기여", "훅", "관측"]
portfolio_cases: [37]
portfolio_pages: [41]
portfolio_edition: "2026-10-15-v2"
---

MediaMTX v1.20.1의 `runOnInit`에 `sh -c 'exit 5'`를 걸고 재시작을 켜면, 로그에는 5초마다 `command exited with code 0`이 찍힙니다. 재시작을 끄면 아무 줄도 남지 않습니다. 자식 프로세스는 5로 끝났는데 MediaMTX가 받은 값이 0이었기 때문입니다. 2026년 11월 13일 12초씩 다시 돌린 결과, v1.20.1은 재시작 켬에서 3줄 모두 code 0, 끔에서 0줄이었고 v1.21.0은 각각 code 5가 3줄과 1줄이었습니다. 계산해 놓고 버리던 값을 돌려주게 한 [PR #6155](https://github.com/bluenviron/mediamtx/pull/6155)는 2026년 8월 30일 병합돼 [v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0)에 들어갔습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## 자식은 5로 끝났고 MediaMTX가 받은 값은 0이었습니다 {#실패는-자식-프로세스에서-이미-발생하고-있었다}

MediaMTX는 서버 시작, 경로 준비, 연결 같은 사건마다 설정된 외부 명령(훅)을 띄웁니다. 명령을 띄우고 끝나기를 기다리는 일은 `internal/externalcmd`가 맡고, Windows가 아닌 플랫폼에서는 `cmd_os.go`의 `runOSSpecific` 안에서 자식을 기다리는 고루틴이 종료 코드를 정수로 돌려줍니다.

#6155 직전 커밋 `8402a728`의 그 부분은 아래와 같습니다([`cmd_os.go` 46–49행](https://github.com/bluenviron/mediamtx/blob/8402a728e6e1d819cd0c8045d231fd0191d04998/internal/externalcmd/cmd_os.go#L46-L49)). 자식이 0이 아닌 코드로 끝나면 `cmd.Wait()`가 `*exec.ExitError`를 돌려주고, `ExitCode()`가 5를 계산합니다. 그런데 그 값을 쓰지 않고 다음 줄의 `return 0`으로 내려갑니다.

```go
if ee, ok := errors.AsType[*exec.ExitError](err2); ok {
	ee.ExitCode() // 계산한 값을 버림
}
return 0
```

이 모양은 2024년 1월 커밋 [`7437ee7a`](https://github.com/bluenviron/mediamtx/commit/7437ee7a0928ee553432d4f31b61a67dd64f4e9a)(#2868)에서 생겼습니다. 린터 갱신에 맞춰 타입 단언을 `errors.As`로 바꾸면서 `return ee.ExitCode()`가 `ee.ExitCode()`만 남았고, 이 커밋이 처음 들어간 태그는 v1.4.2입니다. 그 뒤 파일 이름을 바꾼 [#5787](https://github.com/bluenviron/mediamtx/commit/111302f9e37c34fc3e21dc149755e9fb4212763d)(2026-05-19)과 `errors.AsType`으로 바꾼 [#5834](https://github.com/bluenviron/mediamtx/commit/5b9b6afcb80d2d1a59049b1eafe59c0381cd815f)(2026-06-05)를 지나서도 `return`은 빠진 채였습니다. Windows 쪽 `cmd_os_windows.go`는 같은 자리에서 `return ee.ExitCode()`를 하고 있었습니다([124행](https://github.com/bluenviron/mediamtx/blob/8402a728e6e1d819cd0c8045d231fd0191d04998/internal/externalcmd/cmd_os_windows.go#L124)). Windows에서는 돌려 보지 않았고, 코드로만 확인했습니다.

## 재시작을 끄면 0이 정상 종료로 읽혀 로그가 사라졌습니다 {#같은-0이-재시작-설정에-따라-다르게-보였다}

`runOSSpecific`은 그 정수가 0이면 `nil`을, 0이 아니면 `command exited with code N` 오류를 `run()`에 돌려줍니다. `run()`은 이 값과 재시작 설정으로 종료 콜백 `OnExit`를 부를지 정합니다([`cmd.go` 62–94행](https://github.com/bluenviron/mediamtx/blob/8402a728e6e1d819cd0c8045d231fd0191d04998/internal/externalcmd/cmd.go#L62-L94)). [[fig-hook-run-branches]]에서 청록 상자가 #6155 뒤 exit 5가 가는 곳입니다.

```mermaid {#fig-hook-run-branches kind="재구성" caption="커밋 8402a728의 externalcmd/cmd.go run()을 다시 그렸습니다. 코드가 0이면 runOSSpecific은 nil을, 아니면 command exited with code N 오류를 넘깁니다. v1.20.1은 exit 5도 0으로 넘겨 왼쪽 갈래로 가므로 재시작 켬은 code 0, 끔은 보고 없음으로 끝나고, #6155 뒤에는 청록 상자로 가 두 설정 모두 code 5를 남깁니다. MediaMTX가 직접 멈춘 명령은 이 판단 전에 보고 없이 끝납니다." source="https://github.com/bluenviron/mediamtx/blob/8402a728e6e1d819cd0c8045d231fd0191d04998/internal/externalcmd/cmd.go#L62-L94"}
flowchart TB
  accTitle: run()이 종료 콜백을 부르는 조건
  accDescr: runOSSpecific이 넘긴 값이 오류(종료 코드 N)면 재시작 설정과 상관없이 OnExit에 code N을 남긴다. nil(종료 코드 0)이면 재시작을 켰을 때 OnExit에 code 0을 남기고, 껐을 때는 보고 없이 끝난다.
  ret["runOSSpecific이 넘긴 값<br/>(nil · 오류)"] -->|nil| r["재시작 설정"]
  ret --> x["오류면<br/>OnExit code N"]
  r -->|켬| zero["OnExit<br/>code 0"]
  r -->|끔| none["보고 없음"]
  zero ~~~ none
  style x fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

재시작을 켠 명령은 성공해도 `command exited with code 0`을 남기게 돼 있습니다. 그래서 v1.20.1에서 실패한 명령은 성공한 명령과 같은 줄을 남겼습니다. 재시작을 끈 명령은 성공하면 조용히 끝나므로, 실패한 명령도 조용히 끝났습니다. 재측정에서도 같았습니다.

| 명령 | 재시작 | v1.20.1 | v1.21.0 |
|---|---|---|---|
| `exit 5` | 켬 | `code 0` 3줄 | `code 5` 3줄 |
| `exit 5` | 끔 | 없음 | `code 5` 1줄 |
| `exit 1` | 켬 | `code 0` 3줄 | `code 1` 3줄 |
| `exit 1` | 끔 | 없음 | `code 1` 1줄 |
| SIGTERM으로 종료 | 켬 | `code 0` 3줄 | `code -1` 3줄 |
| SIGTERM으로 종료 | 끔 | 없음 | `code -1` 1줄 |

12초 동안 `runOnInit` 줄을 셌습니다. 재시작을 켜면 5초 쉬고 다시 띄우므로 0초 · 5초 · 10초 무렵에 세 번 끝납니다. `exit 5`와 SIGTERM은 판마다 3번, `exit 1`은 1번 돌렸고 매번 같았습니다. 서버 자체는 모두 종료 코드 0으로 끝났습니다.

## return 하나를 되돌리고 두 재시작 모드를 시험에 넣었습니다 {#수정은-반환-경계에-검증은-상위-동작까지}

수정은 한 줄입니다. `ee.ExitCode()`를 `return ee.ExitCode()`로 바꿨습니다([#6155 병합 커밋 `344d8c90`](https://github.com/bluenviron/mediamtx/commit/344d8c9003f4ef7ca94066c2f3c8dbb624a9c2ce)). 재시작 여부, 재시작 간격, `OnExit`를 부르는 조건은 바꾸지 않았습니다. 그래도 그 한 줄이 상위 동작을 두 갈래로 바꾸므로, 시험은 반환값이 아니라 `OnExit`가 받는 오류를 봅니다.

[[fig-exit-code-discarded]]의 위 줄이 v1.20.1, 아래 줄이 v1.21.0입니다. 같은 5가 위에서는 버려지고 아래에서는 두 재시작 설정 모두에 전달됩니다.

{{< motion scene="ExitCodeDiscarded" id="fig-exit-code-discarded" kind="개념도" caption="자식이 5로 끝나면 ExitCode()가 5를 계산합니다. v1.20.1은 그 값을 버리고 0을 돌려줘 재시작 켬은 code 0, 끔은 아무 줄도 남기지 않고, v1.21.0은 5를 돌려줘 두 설정 모두 code 5를 남깁니다. 결과 줄은 아래 재측정의 실제 로그를 줄인 것입니다." >}}

추가한 `TestCmdExitCode`는 `sh -c 'exit 5'`를 재시작 끔(`standard`)과 켬(`restart`)으로 띄우고, `OnExit`가 `command exited with code 5`를 받는지 10초까지 기다립니다([`cmd_test.go`](https://github.com/bluenviron/mediamtx/blob/344d8c9003f4ef7ca94066c2f3c8dbb624a9c2ce/internal/externalcmd/cmd_test.go#L46-L85)). 이 시험 파일을 병합 직전 커밋 `8402a728`에 넣고 3번 돌리면 두 경우 모두 실패했습니다. `standard`는 `OnExit`가 불리지 않아 10초 제한에 걸렸고, `restart`는 `command exited with code 0`을 받았습니다. `344d8c90`에서는 3번 모두 두 경우가 통과했습니다. 재시작을 켠 쪽만 시험했다면 코드 값이 바뀐 것은 잡지만, 끈 쪽에서 실패가 보고조차 되지 않던 증상은 놓쳤을 것입니다.

## 종료 콜백이 없는 훅 7곳은 이 수정으로도 조용했습니다 {#모든-훅의-실패가-이-수정-하나로-보이는-것은-아니다}

#6155가 고친 것은 `OnExit`를 넘기는 훅 6곳(`runOnInit` · `runOnDemand` · `runOnConnect` · `runOnRead` · `runOnOnline` · `runOnAvailable`)이 받는 값입니다. 외부 명령을 띄우는 13곳 중 나머지 7곳은 `OnExit` 자체가 없어서, 종료 코드가 맞게 계산돼도 받을 곳이 없습니다. 이 7곳에 같은 보고를 붙인 [PR #6259](https://github.com/bluenviron/mediamtx/pull/6259)는 2026년 11월 13일 기준 열려 있고, 자세한 내용은 [MediaMTX 훅 7곳은 실행 실패를 로그에 남기지 않았습니다](/posts/open-source-analysis/mediamtx-seven-hooks-missing-exit-callback/)에 있습니다.

시그널로 끝난 자식은 `(*exec.ExitError).ExitCode()`가 -1을 돌려주므로([Go `os.ProcessState.ExitCode`](https://pkg.go.dev/os#ProcessState.ExitCode)), v1.21.0은 표처럼 `code -1`을 남깁니다. MediaMTX가 직접 멈춘 명령은 종료 코드와 상관없이 `errTerminated`로 끝나므로 여전히 보고하지 않습니다. 실패를 보이게 한 것이지, 0이 아닌 종료마다 새로 무언가를 하게 한 변경은 아닙니다.

종료 코드를 읽는 줄이 있다고 그 값이 호출자에게 가는 것은 아닙니다. 훅이 실패했는데 로그가 조용하다면, 로그 문구보다 먼저 값이 반환되는 줄과 그 값으로 콜백을 부르는 조건을 함께 보십시오.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 KST에 실행했습니다. 시험은 23:03:53–23:04:28, 바이너리 측정은 23:11:07–23:15:07(`exit 5` · `exit 1`)과 23:15:39–23:18:03(SIGTERM)입니다. load average(1분)는 23:11:07에 5.57, 23:15:07에 37.13, 23:18:03에 26.80이었습니다. 같은 기계에서 다른 세션의 작업과 이 묶음의 다른 측정이 함께 돌았습니다. 이 측정은 줄 수와 코드만 세므로 시간 값은 쓰지 않았습니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1. Linux와 Windows에서는 돌리지 않았습니다.
- 빌드: Go 1.27.2 darwin/arm64로 [v1.20.1](https://github.com/bluenviron/mediamtx/tree/v1.20.1)(`883194a1`)과 [v1.21.0](https://github.com/bluenviron/mediamtx/tree/v1.21.0)(`2c672790`)을 `go build`. `internal/core/VERSION`은 `git describe` 값, `hls.min.js`는 `go generate`로 받았습니다.
- 시험: `go test -count=1 -v -run '^TestCmdExitCode$' ./internal/externalcmd`를 `8402a728`(`344d8c90`의 `cmd_test.go`를 옮겨 넣음)과 `344d8c90`에서 3번씩.
- 바이너리: 모든 서버(RTSP · RTMP · HLS · WebRTC · SRT · MoQ · API)를 끄고 경로 `test`에 `runOnInit`과 `runOnInitRestart`만 둠. 12초 뒤 SIGINT로 끝내고 `runOnInit command exited` 줄과 그 코드를 셌습니다.
- SIGTERM: 훅을 `sh -c 'exec sleep 7.123'`로 두고, 측정 스크립트가 1초마다 `pkill -TERM -f "sleep 7.123"`을 보냈습니다. MediaMTX가 훅 명령의 `$` 변수를 먼저 치환하므로 셸 안에서 `kill $$`를 쓰는 방식은 쓸 수 없었습니다.
- 원자료: 스크립트 · 설정 · 서버 로그 · 시험 출력 · 요약은 [저장소 `_workspace/blog/mediamtx-hook-exit-code-return/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/mediamtx-hook-exit-code-return/measure)에 있습니다.

## 출처

- [bluenviron/mediamtx PR #6155 「fix external command exit code reporting on non-Windows platforms」](https://github.com/bluenviron/mediamtx/pull/6155) — 2026-08-30 병합, 병합 커밋 [344d8c90](https://github.com/bluenviron/mediamtx/commit/344d8c9003f4ef7ca94066c2f3c8dbb624a9c2ce)
- [`8402a728`의 `internal/externalcmd/cmd_os.go`](https://github.com/bluenviron/mediamtx/blob/8402a728e6e1d819cd0c8045d231fd0191d04998/internal/externalcmd/cmd_os.go#L46-L49) · [`cmd.go`](https://github.com/bluenviron/mediamtx/blob/8402a728e6e1d819cd0c8045d231fd0191d04998/internal/externalcmd/cmd.go#L62-L94) · [`cmd_os_windows.go`](https://github.com/bluenviron/mediamtx/blob/8402a728e6e1d819cd0c8045d231fd0191d04998/internal/externalcmd/cmd_os_windows.go#L124)
- [커밋 7437ee7a 「update golangci-lint」(#2868)](https://github.com/bluenviron/mediamtx/commit/7437ee7a0928ee553432d4f31b61a67dd64f4e9a) — `return`이 빠진 커밋 · [111302f9(#5787)](https://github.com/bluenviron/mediamtx/commit/111302f9e37c34fc3e21dc149755e9fb4212763d) · [5b9b6afc(#5834)](https://github.com/bluenviron/mediamtx/commit/5b9b6afcb80d2d1a59049b1eafe59c0381cd815f)
- [Go `os.ProcessState.ExitCode`](https://pkg.go.dev/os#ProcessState.ExitCode) — 시그널로 끝나면 -1
- [PR #6259 「hooks: log the failure of every hook command」](https://github.com/bluenviron/mediamtx/pull/6259) — 2026-11-13 기준 열림
- [MediaMTX v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0) · [v1.20.1](https://github.com/bluenviron/mediamtx/releases/tag/v1.20.1) 릴리스
- [MediaMTX 훅 7곳은 실행 실패를 로그에 남기지 않았습니다](/posts/open-source-analysis/mediamtx-seven-hooks-missing-exit-callback/) — 종료 콜백이 없는 7곳

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 41쪽](/portfolio/2026-10-15-v2/full.pdf#page=41)
