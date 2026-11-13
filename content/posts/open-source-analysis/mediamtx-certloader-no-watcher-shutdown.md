---
title: "인증서를 저장하지 못한 MediaMTX는 종료되지 않았습니다"
date: "2026-10-28T18:38:23+09:00"
lastmod: "2026-11-13T22:40:00+09:00"
draft: false
author: "김태윤"
description: "MediaMTX v1.21.3은 기본 설정에서 MoQ 서버를 켜고 TLS 인증서를 작업 디렉터리에 자동 생성합니다. 그 디렉터리에 쓸 수 없으면 실행은 되지만 SIGINT 뒤 [MoQ] closing에서 멈춥니다. 완료 채널 done을 닫을 watch()가 시작되지 않았기 때문이고, 그 분기에 close(cl.done) 한 줄을 더한 PR #6427이 2026년 10월 27일 main에 머지됐습니다(11월 13일 기준 미릴리스). 네 판을 AI가 다시 빌드해 쓰기 가능·불가 디렉터리에서 종료를 잰 기록입니다."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "Go", "오픈소스 기여", "동시성", "shutdown", "goroutine", "regression-test"]
---

MediaMTX v1.21.3의 기본 설정은 MoQ(Media over QUIC) 서버를 켜고(`moq: true`), 그 TLS 인증서를 작업 디렉터리의 `auto.key`·`auto.crt`로 자동 생성합니다. 작업 디렉터리에 쓸 수 없으면 인증서를 메모리에만 두고 실행되지만, SIGINT를 보내면 `[MoQ] closing`에서 더 나아가지 않습니다. 2026년 11월 13일 다시 재 보니 v1.21.3은 `chmod 555` 작업 디렉터리에서 5번 모두 10초 안에 끝나지 않았고, 쓸 수 있는 디렉터리에서는 1.6–5.9ms에 끝났습니다. 포트만 옮긴 기본 설정으로 실행해도 같았습니다. 감시 작업을 시작하지 않는 분기에서 `close(cl.done)` 한 줄을 더한 [PR #6427](https://github.com/bluenviron/mediamtx/pull/6427)은 10월 27일 main에 머지됐고, 이 수정이 든 판은 같은 조건에서 5번 모두 6.2ms 안에 끝났습니다. 11월 13일 기준 최신 릴리스는 여전히 v1.21.3이라 #6427은 아직 릴리스에 없습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## #6417 이후 Close는 watch()가 닫는 done을 기다렸습니다 {#감시-작업의-종료를-기다리는-이유}

`CertLoader`는 TLS 인증서를 읽고, 파일이 바뀌면 `watch()` 고루틴이 다시 읽는 구성 요소입니다. [#6417](https://github.com/bluenviron/mediamtx/pull/6417)부터 `Close()`는 종료 요청을 보낸 뒤 `watch()`가 끝나며 닫는 `done` 채널을 기다립니다([v1.21.3 `certloader.go` 151–153행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/certloader/certloader.go#L151-L153), [175행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/certloader/certloader.go#L175)). 이 기다림을 넣은 배경과 시험은 [MediaMTX 인증서 감시 작업은 Close 뒤에도 돌았습니다](/posts/open-source-analysis/mediamtx-certificate-watcher-close-join/)에 있습니다. 닫힌 채널에서 받기는 바로 끝나지만([Go 명세 「Close」](https://go.dev/ref/spec#Close)), 아무도 닫지 않는 채널에서 받으면 끝나지 않습니다.

그런데 `watch()`를 시작하지 않고 성공하는 분기가 있었습니다. 자동 인증서를 허용한 로더가 `auto.key`·`auto.crt`를 찾지 못하면 새로 만들어 저장하고, 저장하지 못하면 메모리의 인증서로 계속하되 감시는 시작하지 않습니다. 이 분기는 MoQ를 더한 [#5815 커밋 `b5b63d02`](https://github.com/bluenviron/mediamtx/commit/b5b63d02fc1c55096cf5a035207d6e5694d1ab4d)(2026년 6월 3일)부터 있었습니다. [[fig-done-owner]]에서 오른쪽 갈래만 `done`을 닫는 코드가 없습니다.

```mermaid {#fig-done-owner kind="재구성" caption="v1.21.3 certloader.go 72–107행의 Initialize() 분기와 done을 닫는 주체. 인증서 파일이 있거나 저장하면 watch()가 시작되고 끝날 때 done을 닫습니다. 자동 인증서를 저장하지 못한 갈래는 watch() 없이 반환해 done을 닫는 코드가 없고, Close()는 <-done에서 멈춥니다. #6427은 이 갈래에 close(cl.done)을 더했습니다." source="https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/certloader/certloader.go#L72-L107"}
flowchart TB
  accTitle: Initialize 분기와 done을 닫는 주체
  accDescr: Initialize에서 인증서 파일이 있거나 저장한 갈래는 watch를 시작하고, watch가 끝나며 done을 닫아 Close가 반환한다. 자동 인증서를 저장하지 못한 갈래는 watch 없이 반환해 done을 닫는 코드가 없고 Close가 done을 기다리다 멈춘다.
  init["Initialize()"]
  q{"인증서 파일이<br/>디스크에 있나"}
  w["go watch()"]
  n["watch() 없이<br/>return nil"]
  wd["watch()가 끝나며<br/>close(done)"]
  nd["done을 닫는<br/>코드 없음"]
  ok["Close()가<br/>&lt;-done 뒤 반환"]
  hang["Close()가<br/>&lt;-done에서 멈춤"]
  init --> q
  q -->|"있음 · 저장함"| w
  q -->|"저장 실패"| n
  w --> wd
  n --> nd
  wd --> ok
  nd --> hang
  style n fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style nd fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style hang fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

느린 대기가 아니었습니다. 기다림을 풀어 줄 실행 경로가 없었습니다.

## 쓰기 금지 작업 디렉터리에서 v1.21.3은 MoQ를 닫다가 멈췄습니다 {#권한-조건을-고정해-회귀를-확인했다}

읽기 전용 파일시스템은 MediaMTX가 지원하는 실행 방식입니다. 유지보수자 aler9는 MoQ QUIC 리스너를 들이며 잃었던 이 기능을 8월 16일 [#6098](https://github.com/bluenviron/mediamtx/pull/6098)에서 되살렸습니다. v1.21.3의 기본 `mediamtx.yml`은 `moq: true`, `moqServerKey: auto.key`, `moqServerCert: auto.crt`이고([445–461행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/mediamtx.yml#L445-L461)), 자동 인증서를 허용하는 서버는 MoQ뿐입니다([`moq/server.go` 136행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/servers/moq/server.go#L136)). 기본 설정을 쓰기 금지 디렉터리에서 돌리면 곧바로 이 분기를 탑니다.

재현은 PR 본문과 같은 방식으로 했습니다. 새 작업 디렉터리에 MoQ만 켠 아래 `mediamtx.yml`을 두고, 일반 사용자로 그 디렉터리를 `chmod 555`해 쓰지 못하게 한 뒤 인자 없이 실행합니다. root는 권한과 상관없이 쓸 수 있으므로 일반 사용자여야 합니다. 로그에 `failed to save TLS key to auto.key`가 찍히고 MoQ가 리스너를 연 뒤 SIGINT를 보내, 10초 안에 끝나지 않으면 강제 종료했습니다.

```yaml
# PR #6427 본문의 재현용 mediamtx.yml
logLevel: debug
api: no
rtsp: no
rtmp: no
hls: no
webrtc: no
srt: no
moq: yes
moqHTTP2Address: :18892
moqHTTP3Address: :18892
moqQUICAddress: :18893
```

| 판 | 쓸 수 있는 작업 디렉터리 | `chmod 555` 작업 디렉터리 |
|---|---|---|
| #6417 직전 `b5df4626` | 5번 종료, 1.5–4.6ms | 5번 종료, 1.6–4.7ms |
| #6417 머지 `989ea15a` | 5번 종료, 1.5–4.6ms | 5번 모두 10초 뒤 강제 종료 |
| v1.21.3 `9540cb6c` | 5번 종료, 1.6–5.9ms | 5번 모두 10초 뒤 강제 종료 |
| #6427 머지 `065f94c2` | 5번 종료, 1.6–4.6ms | 5번 종료, 1.5–6.2ms |

멈춘 판의 서버 로그는 모두 `shutting down gracefully` 다음 `[MoQ] closing`에서 끝났습니다. 시간은 SIGINT를 보낸 순간부터 프로세스가 끝날 때까지입니다. 종료 여부를 가르는 관측값이지 일반적인 종료 성능은 아닙니다.

v1.21.3의 기본 `mediamtx.yml`도 한 번씩 돌렸습니다. 포트만 `MTX_*` 환경 변수로 2만씩 옮겼습니다. 쓸 수 있는 디렉터리에서는 9.6ms에 끝났습니다. `chmod 555` 디렉터리에서는 `[SRT] closing`, `[MoQ] closing` 뒤 로그가 멈췄고 10초 뒤 강제 종료했습니다. 그 뒤에 닫혀야 할 RTSP·RTMP·HLS·WebRTC 서버의 `closing` 줄은 끝내 나오지 않았습니다.

## watch()를 시작하지 않는 분기에서 done을 닫았습니다 {#종료-함수에-예외를-늘리지-않고-완료-상태를-맞췄다}

수정은 `Initialize()`의 그 분기에 `close(cl.done)` 한 줄을 더한 것입니다([머지 커밋 `065f94c2`](https://github.com/bluenviron/mediamtx/commit/065f94c2a35351e86bce81921bd1dfae0995c30a)). 감시 작업을 시작하지 않기로 정한 자리에서, 기다릴 작업이 없다는 사실을 완료 채널에도 남깁니다.

`Close()`에서 조건을 걸어 기다림을 건너뛰는 방법도 있었습니다. 하지만 감시 작업이 있는지는 `Initialize()`가 이미 알고 있고, 그 분기에서 완료 상태를 맞추면 `Close()`의 순서와 감시 경로는 그대로 둘 수 있습니다. [[fig-no-watcher-shutdown]]의 셋째 줄이 고친 뒤입니다.

{{< motion scene="NoWatcherShutdown" id="fig-no-watcher-shutdown" kind="개념도" caption="첫 줄은 인증서를 저장한 v1.21.3입니다. watch()가 done을 닫아 Close()가 반환합니다. 둘째 줄은 저장하지 못한 v1.21.3으로, watch()가 없어 done이 열린 채 Close()가 끝나지 않습니다. 셋째 줄 #6427은 Initialize()가 그 분기에서 done을 닫아 Close()가 바로 반환합니다." >}}

PR에 더한 `TestCloseAutoCert`는 `saved`와 `not saved` 두 경우를 하위 시험으로 돌립니다. 저장 실패는 권한 대신 `auto.key`라는 이름의 디렉터리를 먼저 만들어 일으킵니다. 파일 자리를 디렉터리가 차지하므로 root로 도는 CI에서도 저장이 실패합니다. 임시 디렉터리에서 로더를 초기화한 뒤 `Close()`가 5초 안에 반환하지 않으면 실패입니다. 5초는 시험의 판정 상한이고 제품 코드에 넣은 종료 시간 제한이 아닙니다.

이 시험을 다섯 판에 넣어 `go test -race -count=5`로 돌렸습니다. `not saved`는 #6417 머지 `989ea15a`와 v1.21.3에서만 5번 모두 `Close() did not return`으로 실패했고, v1.21.1·#6261 head `7d95a222`·#6427 머지 `065f94c2`에서는 통과했습니다. `saved`는 다섯 판 모두 통과했습니다.

## #6261의 WaitGroup 판에는 이 멈춤이 없었습니다 {#이전-종료-pr과-이번-수정은-구분한다}

먼저 올린 [#6261](https://github.com/bluenviron/mediamtx/pull/6261)은 같은 기다림을 WaitGroup으로 넣었습니다. `watch()`를 시작하지 않으면 카운터가 0이라 `Wait()`가 바로 반환하므로 이 분기에서 멈추지 않습니다. 위 시험에서 `7d95a222`의 `not saved`가 통과한 이유입니다. #6261은 10월 25일 닫혔고, 유지보수자는 하나의 고루틴을 기다리는 데 WaitGroup은 과하다며 채널로 다시 구현한 #6417을 머지했습니다. 채널은 누군가 닫아야 하므로, 시작하지 않는 분기에서 그 일을 맡을 코드가 필요해졌습니다.

#6427은 한국 시각 10월 27일 05:03에 `065f94c2`로 머지됐습니다. 11월 13일 상류 main(`3b1c4e87`)에는 이 커밋이 있지만, 최신 릴리스는 10월 25일의 v1.21.3이라 아직 릴리스에는 없습니다.

영향 범위는 넓지 않습니다. 이 분기는 `AllowAuto: true`인 로더에서만 열리고, 테스트를 빼면 그 값을 쓰는 곳은 MoQ 서버뿐입니다. `httpp.Server`의 `AllowAutoCert`는 어디서도 켜지 않습니다. 이 수정은 인증서 저장을 성공시키지도 않습니다. 저장하지 못한 인증서로 돌던 서버가 끝날 수 있게 할 뿐입니다.

종료 대기를 더할 때는 정상 경로의 완료만이 아니라 작업을 시작하지 않고 성공하는 분기까지, 기다리는 쪽과 완료를 알리는 쪽이 모든 분기에서 짝을 이루는지 확인해야 합니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 KST 21:21–21:22에 `go test`를, 21:23–21:26에 서버 종료를 실행했습니다. load average(1분)는 시작 11.24, 끝 5.32였습니다. 같은 기계에서 다른 세션의 작업과 이 묶음의 로그 재설정 실측이 함께 돌았습니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1, 일반 사용자(uid 501).
- 빌드: Go 1.27.2 darwin/arm64로 #6417 직전 `b5df4626`, #6417 머지 `989ea15a`, [v1.21.3](https://github.com/bluenviron/mediamtx/tree/v1.21.3)(`9540cb6c`), #6427 머지 `065f94c2`를 `go build`.
- 서버 종료: 판마다 쓸 수 있는 디렉터리 · `chmod 555` 디렉터리 각 5번. 실행마다 새 작업 디렉터리에 위 `mediamtx.yml`만 두고 인자 없이 실행, `[MoQ] started with listeners` 줄 0.5초 뒤 SIGINT, 10초 안에 끝나지 않으면 SIGKILL. 시간은 SIGINT부터 프로세스 종료까지(파이썬 단조 시계). 기본 설정은 v1.21.3 저장소의 `mediamtx.yml` 그대로, 모든 주소를 `MTX_*` 환경 변수로 옮겨(:8554 → :28554 등) 디렉터리 조건마다 1번.
- 시험: #6427의 `TestCloseAutoCert`를 그대로 떼어 낸 파일을 v1.21.1(`04825598`) · #6261 head `7d95a222` · `989ea15a` · v1.21.3의 `internal/certloader`에 넣고(`065f94c2`는 원래 파일), `go test -race -count=5 -v -run '^TestCloseAutoCert$' ./internal/certloader`.
- 원자료: 스크립트 · 설정 · 서버 로그 · 시험 출력 · 요약은 [저장소 `_workspace/blog/mediamtx-certloader-no-watcher-shutdown/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/mediamtx-certloader-no-watcher-shutdown/measure)에 있습니다. 쓸 수 있는 디렉터리에서 만들어진 인증서 파일은 올리지 않았습니다.

## 출처

- [bluenviron/mediamtx PR #6427 「certloader: fix Close() hang when saving certificate fails」](https://github.com/bluenviron/mediamtx/pull/6427) — 본문의 문제 · 재현 · 영향, 머지 커밋 [065f94c2](https://github.com/bluenviron/mediamtx/commit/065f94c2a35351e86bce81921bd1dfae0995c30a)
- [PR #6417 「fix routine leak in CertLoader (#6261)」](https://github.com/bluenviron/mediamtx/pull/6417) — 머지 커밋 [989ea15a](https://github.com/bluenviron/mediamtx/commit/989ea15a6ef5a70a93a02eaf595f317a4c5bb247), v1.21.3
- [PR #6261 「certloader: make CertLoader.Close() wait for watch() to return」](https://github.com/bluenviron/mediamtx/pull/6261) — 2026-10-25 닫힘
- [PR #6098 「restore ability to run the server in a read-only file system」](https://github.com/bluenviron/mediamtx/pull/6098)
- [커밋 b5b63d02(#5815) 「support reading and publishing with Media-over-QUIC」](https://github.com/bluenviron/mediamtx/commit/b5b63d02fc1c55096cf5a035207d6e5694d1ab4d)
- [v1.21.3 `internal/certloader/certloader.go`](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/certloader/certloader.go) · [`mediamtx.yml`](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/mediamtx.yml) · [`internal/servers/moq/server.go`](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/servers/moq/server.go)
- [MediaMTX 릴리스 목록](https://github.com/bluenviron/mediamtx/releases) — 2026-11-13 확인 기준 최신 v1.21.3
- [The Go Programming Language Specification 「Close」](https://go.dev/ref/spec#Close)
- [MediaMTX 인증서 감시 작업은 Close 뒤에도 돌았습니다](/posts/open-source-analysis/mediamtx-certificate-watcher-close-join/) — #6261 · #6417과 TestCloseDuringReload
