---
title: "MediaMTX 훅 7곳은 실행 실패를 로그에 남기지 않았습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-13T21:00:00+09:00"
draft: false
author: "김태윤"
description: "MediaMTX가 외부 명령을 띄우는 13곳 중 7곳은 종료 콜백(OnExit)이 없어, 실행 파일이 없을 때 로그에 command launched만 남았습니다. 7곳에 기존 6곳과 같은 보고를 붙인 PR #6259(2026-11-13 확인 기준 열림)와, v1.21.3과 PR head 69280137을 빌드해 7종 훅 22번 실행의 실패 이유가 0줄에서 22줄로 바뀐 것을 확인한 AI 재측정."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "오픈소스 기여", "훅", "관측", "Go"]
portfolio_cases: [41]
portfolio_pages: [41]
portfolio_edition: "2026-10-15-v2"
---

MediaMTX v1.21.3의 `runOnDisconnect`에 존재하지 않는 `/nonexistent/on-disconnect`를 걸고 RTSP 연결을 열었다 닫으면, 로그에는 `runOnDisconnect command launched` 한 줄만 남습니다. 실행 파일이 없으니 자식 프로세스가 생기지 않고, 자식이 물려받을 stderr에도 아무것도 쓰이지 않습니다. 외부 명령을 띄우는 13곳 중 7곳이 종료 콜백(`OnExit`)을 달지 않았기 때문입니다. 이 7곳에 나머지 6곳과 같은 보고를 붙이는 [PR #6259](https://github.com/bluenviron/mediamtx/pull/6259)를 올렸고, 2026년 11월 13일 다시 잰 결과 7종 훅의 실행 22번 가운데 실패 이유가 남은 것은 v1.21.3에서 0번, PR head에서 22번이었습니다. PR은 11월 13일 확인 기준 열려 있습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## #6155로 종료 코드를 고쳐도 7곳은 콜백이 없었습니다 {#종료-코드를-고치는-것과-콜백을-연결하는-것은-달랐다}

먼저 올린 [PR #6155](https://github.com/bluenviron/mediamtx/pull/6155)는 Windows가 아닌 플랫폼에서 실패한 명령의 종료 코드가 0으로 보고되던 문제를 고쳤고, v1.21.0에 들어갔습니다. 그런데 종료 코드가 맞게 계산돼도 그 결과를 받는 콜백이 없으면 로그에는 나오지 않습니다. 값이 맞는지와 그 값이 로그까지 가는 길이 있는지는 따로 확인해야 했습니다.

MediaMTX는 훅 명령을 `externalcmd.Cmd`로 띄웁니다. PR 본문이 가리키는 커밋 [`04825598`](https://github.com/bluenviron/mediamtx/tree/048255986f7e04b859b4c4efe651448ec785ecd4)에서 이 구조체를 만드는 곳은 테스트를 빼고 13곳이고, `OnExit`를 넘기는 곳은 6곳입니다. v1.21.3과 지금 PR의 기준 커밋 `065f94c2`에서도 13곳 · 6곳이었습니다. 6곳은 연결이 열리거나 경로가 준비될 때 도는 훅이고, 빠진 7곳은 그 짝인 닫힘·종료 쪽 훅과 녹화 조각 훅입니다. 두 무리는 로그 문구도 다릅니다. 6곳은 `command started`, 7곳은 `command launched`를 씁니다.

[[fig-hook-onexit-wiring]]에서 청록색이 실패를 보고하는 6곳, 회색이 보고 경로가 없는 7곳입니다.

```mermaid {#fig-hook-onexit-wiring kind="재구성" caption="#6259 본문이 가리키는 커밋 04825598에서 externalcmd.Cmd를 만드는 13곳. internal/hooks의 6곳은 OnExit를 넘겨 실패를 command exited로 남기고, 같은 파일의 짝 훅 5곳과 internal/core/path.go의 녹화 조각 훅 2곳은 OnExit 없이 launched만 남깁니다. 테스트 파일은 세지 않았습니다." source="https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/hooks/on_connect.go#L39-L64"}
flowchart TB
  accTitle: 외부 명령을 만드는 13곳의 OnExit 배선
  accDescr: externalcmd.Cmd를 만드는 13곳이 두 갈래로 나뉜다. OnExit가 있는 6곳(runOnInit, runOnDemand, runOnConnect, runOnRead, runOnOnline, runOnAvailable)은 실패하면 command exited 줄을 남긴다. OnExit가 없는 7곳(runOnDisconnect, runOnUnread, runOnUnDemand, runOnOffline, runOnUnavailable, 녹화 조각 생성·완료)은 command launched만 남긴다.
  cmd["Cmd를 만드는 13곳"]
  six["OnExit 있음 · 6곳<br/>runOnInit<br/>runOnDemand<br/>runOnConnect<br/>runOnRead<br/>runOnOnline<br/>runOnAvailable"]
  seven["OnExit 없음 · 7곳<br/>runOnDisconnect<br/>runOnUnread<br/>runOnUnDemand<br/>runOnOffline<br/>runOnUnavailable<br/>녹화 조각 생성 · 완료"]
  ok["실패하면<br/>command exited: 이유"]
  no["launched만 남음"]
  cmd --> six
  cmd --> seven
  six --> ok
  seven --> no
  style six fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style ok fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

`OnExit`가 비어 있으면 `Start()`가 아무 일도 하지 않는 함수로 채웁니다([`cmd.go` 36–39행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/externalcmd/cmd.go#L36-L39)). 이 선택지는 7곳 가운데 처음 생긴 훅들을 추가한 커밋 [`ed775608`](https://github.com/bluenviron/mediamtx/commit/ed775608116cfd0517f4f96039c431e3b916a248)(#2355)부터 있었습니다. 실행 파일이 없으면 `fork/exec` 단계에서 실패하므로 자식이 stderr에 이유를 쓸 기회도 없습니다. 2024년 [이슈 #3372](https://github.com/bluenviron/mediamtx/issues/3372)의 로그에도 `command launched` 줄만 있었고, 스크립트 이름 오타가 의심됐지만 로그로는 확인할 수 없었습니다. 실패를 알 수 있는 곳은 명령을 띄운 MediaMTX 쪽뿐이었습니다.

## 빠진 7곳에 기존 6곳의 보고 규칙을 그대로 붙였습니다 {#새로운-실행-정책-대신-기존-보고-규칙을-사용했다}

기존 6곳이 따르는 규칙은 `externalcmd` 안에 있습니다. 재시작하지 않는 명령은 실패했을 때만 `OnExit`에 닿고, MediaMTX가 직접 멈춘 명령은 닿지 않습니다([`cmd.go` 72–81행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/externalcmd/cmd.go#L72-L81)). 7곳은 모두 재시작하지 않고(`Restart: false`) MediaMTX가 멈추지도 않으므로, 같은 규칙을 붙이면 실패했을 때 한 줄만 늘어납니다.

영상의 위 줄이 v1.21.3, 아래 줄이 #6259입니다. 두 줄 모두 자식 자리가 비어 있고, 아래 줄만 실패가 MediaMTX로 돌아와 로그에 한 줄을 더 남깁니다.

{{< motion scene="SilentExecFailure" id="fig-silent-exec-failure" kind="개념도" caption="실행 파일이 없으면 fork/exec가 실패해 자식 프로세스가 생기지 않고 stderr도 비어 있습니다. OnExit가 없는 v1.21.3은 launched 한 줄로 끝나고, OnExit를 붙인 #6259는 그 실패를 받아 exited: no such file 줄을 남깁니다. 로그 문구는 아래 재측정의 실제 줄을 줄인 것입니다." >}}

PR은 7곳에 기존 6곳과 같은 로그 수준(`Info`)과 같은 형식 문자열(`command exited: %v`)로 `OnExit`를 넘깁니다. 테스트를 빼면 6개 파일에 21줄을 더했고 지운 줄은 없습니다. 실행 방식은 바꾸지 않았습니다.

| 범위 | 바꾼 것 | 그대로 둔 것 |
|---|---|---|
| 7곳 호출부 | 실패 시 `command exited: <이유>` 한 줄 | `command launched` 줄 |
| `internal/externalcmd` | 없음 | 비어 있으면 아무것도 안 하는 기본값, 실행·종료 규칙 |
| 정상 종료 | 없음 | 아무 줄도 남기지 않음 |
| 설정·문서 | 없음 | 새 설정 키 없음 |

기본값을 「항상 기록」으로 바꾸는 방법은 쓰지 않았습니다. 기록이 필요 없는 사용처까지 로그를 강제하게 되고, 보고 책임은 명령을 만드는 쪽에 있다는 지금 구조와도 어긋납니다. 실패하면 다시 실행하는 기능도 넣지 않았습니다. 이 PR이 메우는 것은 관측의 빈틈이고, 훅의 수명 규칙은 그대로입니다.

## launched 기록마다 실패 이유가 한 줄씩 짝지어졌습니다 {#7종-배선과-19개-실행-사건을-따로-셌다}

v1.21.3과 #6259 head [`69280137`](https://github.com/bluenviron/mediamtx/pull/6259/commits/69280137d990d0c8975e690378aead841af03ebc)을 각각 빌드해 같은 설정으로 돌렸습니다. 7종 훅을 모두 `/nonexistent/on-…`로 걸고, RTSP 송출 7초 동안 녹화(2초 조각)와 RTSP·SRT 읽기, 요청 때만 켜지는 경로, 맨 TCP 연결을 차례로 열고 닫았습니다. 여기서 「실행 한 번」은 로그의 `command launched` 한 줄입니다. 운영 장애를 센 것이 아니라, 실행 시도마다 실패 이유가 남는지 짝을 맞춘 것입니다.

| 훅 | launched | v1.21.3의 exited | #6259의 exited |
|---|---:|---:|---:|
| runOnDisconnect | 6 | 0 | 6 |
| runOnUnread | 3 | 0 | 3 |
| runOnUnDemand | 1 | 0 | 1 |
| runOnUnavailable | 2 | 0 | 2 |
| runOnOffline | 2 | 0 | 2 |
| runOnRecordSegmentCreate | 4 | 0 | 4 |
| runOnRecordSegmentComplete | 4 | 0 | 4 |
| 합계 | 22 | 0 | 22 |

두 판 모두 3번씩 돌렸고 세 번의 숫자가 같았습니다. `launched`는 양쪽 모두 22줄이므로, 실행을 더 해서 줄이 늘어난 것이 아니라 같은 실행에 이유가 붙은 것입니다. 붙은 줄은 모두 `command exited: fork/exec /nonexistent/on-…: no such file or directory` 형태였습니다. `-race`로 빌드한 PR head로 한 번 더 돌렸을 때 DATA RACE와 panic은 없었습니다.

시험 코드는 이 22번을 다 덮지 않습니다. 지금 head의 시험은 `internal/hooks/hooks_test.go`의 `TestHookCommandExited` 하나이고, `internal/hooks`에 있는 5종(runOnOffline · runOnUnavailable · runOnUnread · runOnUnDemand · runOnDisconnect)만 다룹니다([`hooks_test.go`](https://github.com/bluenviron/mediamtx/blob/69280137d990d0c8975e690378aead841af03ebc/internal/hooks/hooks_test.go#L18-L84)). `go test -race -run TestHookCommandExited ./internal/hooks`는 PR head에서 통과했고, 같은 시험 파일을 v1.21.3에 넣으면 `runOnOffline`에서 기대 1, 실제 0으로 실패했습니다. `internal/core/path.go`의 녹화 조각 훅 2종은 위 실행 시험으로만 확인했습니다. 10월 8일 head [`acb903fb`](https://github.com/bluenviron/mediamtx/commit/acb903fbdfb97d81df682f85ef1a53aee22abdab)에는 이 2종을 다루는 `path_test.go` 시험이 있었지만, 10월 27일 PR을 커밋 하나로 다시 쓰면서 빠졌습니다.

## 녹화 조각 훅이 계속 실패하면 조각마다 한 줄이 늘어납니다 {#실패-로그의-양도-동작의-일부다}

위 실행에서 녹화 조각은 4개였고, 조각 생성·완료 훅이 각각 4번 `launched`를 남기고 4번 `exited`를 남겼습니다. 녹화 조각 훅이 계속 실패하는 설정이라면 조각마다 실패 줄이 하나씩 붙습니다. 이미 조각마다 찍히던 `launched` 줄과 같은 빈도이고, 2초 조각이면 30분 동안 훅 하나에서 900줄이 늘어나는 계산입니다. 실패를 보이게 하는 대가이므로 PR 본문에도 이 빈도를 적었습니다.

정상 종료는 계속 조용합니다. 7곳 모두 재시작하지 않는 명령이라 성공하면 `OnExit`에 닿지 않습니다. 시그널로 끝난 명령은 `(*exec.ExitError).ExitCode()`가 돌려주는 값 그대로 `command exited with code -1`로 남습니다. 콜백이 로그를 쓰는 연결·세션·경로 객체는 명령이 끝날 때까지 살아 있게 되는데, 기존 6곳도 같습니다. Windows에서는 실행해 보지 않았습니다.

`launched`는 실행에 성공했다는 기록이 아니었습니다. 비슷하게 훅이 조용히 안 돈다면, 자식의 로그를 더 모으기 전에 명령을 띄운 쪽이 실패를 받는 경로를 갖고 있는지부터 보십시오. 시작하지 못한 프로그램은 자기 실패를 기록할 수 없습니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 18:43–18:47(KST)에 실행했습니다. load average(1분)는 시작 21.11, 끝 8.96이었습니다. 같은 기계에서 다른 세션의 작업이 함께 돌았지만, 이 시험은 줄 수만 세므로 시간 값은 쓰지 않았습니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1.
- 빌드: Go 1.27.2 darwin/arm64로 [v1.21.3](https://github.com/bluenviron/mediamtx/tree/v1.21.3)(`9540cb6c`)과 #6259 head `69280137`(기준 `065f94c2` + 커밋 1개)을 `go build`. `-race` 판은 head만 따로 빌드했습니다.
- 도구: FFmpeg 9.0.2(RTSP 송출·읽기), srt-live-transmit 1.5.7(SRT 읽기), macOS `nc`.
- 설정: 로그는 파일로만, RTSP(TCP, :18554)와 SRT(:18890)만 켬. 전역 `runOnDisconnect`, `pathDefaults`의 `runOnUnavailable` · `runOnOffline` · `runOnUnread`, 경로 `test`의 녹화(`recordSegmentDuration: 2s`)와 녹화 조각 훅 2종, 경로 `ondemand`의 `runOnDemand`(FFmpeg 송출) · `runOnDemandCloseAfter: 1s` · `runOnUnDemand`. 모든 훅 명령은 없는 절대 경로 `/nonexistent/on-…`입니다.
- 순서: 서버 시작 → `/test`에 RTSP 송출 7초 → 3초 뒤 RTSP 읽기 2초 · SRT 읽기 2초 · `/ondemand` RTSP 읽기 3초 · `nc -z 127.0.0.1 18554` → 모두 끝나고 4초 뒤 SIGINT. 서버 종료 코드는 7번 모두 0이었습니다.
- 셈: `<훅> command launched`와 `<훅> command exited: fork/exec /nonexistent/`로 시작하는 줄을 훅별로 셌습니다. 판마다 3회(-race 판 1회).
- 시험: `go test -race -count=1 -run TestHookCommandExited ./internal/hooks`(head), 같은 `hooks_test.go`를 v1.21.3 트리에 복사해 같은 명령.

## 출처

- [bluenviron/mediamtx PR #6259 「hooks: log the failure of every hook command」](https://github.com/bluenviron/mediamtx/pull/6259) — 본문의 문제·변경·영향, 2026-11-13 확인 기준 열림
- [#6259 head 69280137](https://github.com/bluenviron/mediamtx/pull/6259/commits/69280137d990d0c8975e690378aead841af03ebc) · [`hooks_test.go`](https://github.com/bluenviron/mediamtx/blob/69280137d990d0c8975e690378aead841af03ebc/internal/hooks/hooks_test.go) · [옛 head acb903fb](https://github.com/bluenviron/mediamtx/commit/acb903fbdfb97d81df682f85ef1a53aee22abdab)
- [기준 커밋 04825598의 `externalcmd/cmd.go` 72–81행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/externalcmd/cmd.go#L72-L81) — 재시작하지 않는 명령의 보고 규칙 · [`hooks/on_connect.go` 39–64행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/hooks/on_connect.go#L39-L64) — 한 함수 안의 두 모양
- [커밋 ed775608 「add runOnDisconnect, runOnNotReady, runOnUnread」(#2355)](https://github.com/bluenviron/mediamtx/commit/ed775608116cfd0517f4f96039c431e3b916a248)
- [이슈 #3372 「Hooks not working」](https://github.com/bluenviron/mediamtx/issues/3372)
- [PR #6155 「fix external command exit code reporting on non-Windows platforms」](https://github.com/bluenviron/mediamtx/pull/6155) — v1.21.0
- [MediaMTX v1.21.3](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.3)
- [실패한 명령이 종료 코드 0으로 보인 이유](/posts/open-source-analysis/mediamtx-hook-exit-code-return/) — #6155 기록

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 41쪽](/portfolio/2026-10-15-v2/full.pdf#page=41)
