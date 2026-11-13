---
title: "MediaMTX 인증서 감시 작업은 Close 뒤에도 돌았습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-13T22:40:00+09:00"
draft: false
author: "김태윤"
description: "MediaMTX v1.21.1의 CertLoader.Close()는 인증서 감시 고루틴 watch()를 기다리지 않아, 갱신 중이던 watch()가 Close 뒤에도 로그를 쓰고 비운 인증서를 다시 채울 수 있었습니다. Close가 watch()의 반환을 기다리게 한 PR #6261의 시험을 AI가 다시 돌리자 v1.21.1은 20번 모두 실패, #6261 head와 이후 상류 판은 20번 모두 통과했습니다. #6261은 2026년 10월 25일 닫혔고, 유지보수자가 채널로 다시 구현한 #6417이 v1.21.3에 들어갔습니다."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "Go", "동시성", "회귀 테스트", "오픈소스 기여"]
portfolio_cases: [42]
portfolio_pages: [38]
portfolio_edition: "2026-10-15-v2"
---

MediaMTX v1.21.1의 `CertLoader.Close()`는 인증서 감시 고루틴 `watch()`가 끝나기를 기다리지 않고 반환했습니다. `watch()`가 인증서를 다시 읽던 중이면 Close 뒤에도 로그를 쓰고, Close가 비운 인증서를 다시 채울 수 있었습니다. Close가 `watch()`의 반환을 기다리게 한 [PR #6261](https://github.com/bluenviron/mediamtx/pull/6261)의 시험 `TestCloseDuringReload`를 2026년 11월 13일 다시 돌리자, v1.21.1에서는 20번 모두 실패하고 #6261 head와 이후 상류 판에서는 20번 모두 통과했습니다. #6261은 10월 25일 병합 없이 닫혔고, 유지보수자가 같은 날 WaitGroup 대신 채널로 다시 구현한 [#6417](https://github.com/bluenviron/mediamtx/pull/6417)이 v1.21.3에 들어갔습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## select에서 쉬는 watcher만 보면 Close는 맞아 보였습니다 {#평소에는-보이지-않는-수명-경계였다}

`CertLoader`는 TLS 인증서와 키 파일을 읽고, 파일이 바뀌면 다시 읽는 구성 요소입니다. RTSP·RTMP·MoQ 서버와 `httpp.Server`가 만들고, 자신이 닫힐 때 함께 닫습니다. v1.21.1에서 `watch()`는 인증서 감시·키 감시·`done` 세 채널을 `select`로 기다립니다. `Close()`는 `done`과 두 감시자를 닫고 `cl.cert`를 nil로 비운 뒤 반환합니다([`certloader.go` 149–202행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/certloader/certloader.go#L149-L202)).

`watch()`가 `select`에서 쉬고 있으면 `done`이 닫히는 순간 깨어나 반환하므로 문제가 드러나지 않습니다. PR 본문의 탐침에서도 `Initialize()` 뒤 20ms를 쉬고 Close를 부른 100번, 인증서 파일이 바뀌지 않은 채 MoQ 서버를 닫는 재설정 70번 모두 Close 뒤 로그가 없었습니다.

문제는 `watch()`가 이미 갱신 하나를 처리하고 있을 때입니다. `watch()`는 새 인증서를 `cl.cert`에 넣은 뒤 `Parent.Log`로 로그를 씁니다. 그 로그가 늦는 사이 Close가 끝나면, 루프가 `select`로 돌아왔을 때 세 경우가 모두 준비돼 있습니다. 감시자는 끝날 때 자기 신호 채널을 닫기 때문입니다([`confwatcher.go` 115행](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/confwatcher/confwatcher.go#L115)). Go의 `select`는 준비된 경우 가운데 하나를 무작위로 고르므로([Go 명세 「Select statements」](https://go.dev/ref/spec#Select_statements)), 감시자 경우를 골라 인증서를 다시 읽고 `cl.cert`를 다시 채울 수 있습니다. [[fig-close-watch-sequence]]가 그 순서입니다.

```mermaid {#fig-close-watch-sequence kind="재구성" caption="v1.21.1 certloader.go 149–202행을 따라 다시 그린 순서. watch()가 새 인증서를 넣고 Parent.Log에서 늦는 동안 Close()는 done과 감시자를 닫고 cl.cert를 비운 뒤 반환합니다. 로그가 끝나면 select의 세 경우가 모두 준비돼 있어, 감시자 경우를 고르면 Close 뒤에 cl.cert가 다시 채워집니다." source="https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/certloader/certloader.go#L149-L202"}
%%{init: {"sequence": {"width": 96, "actorMargin": 16}}}%%
sequenceDiagram
  accTitle: 갱신 중 Close가 먼저 반환하는 순서
  accDescr: watch가 인증서를 바꾸고 Parent.Log에서 늦는 동안 Close가 done과 감시자를 닫고 cl.cert를 nil로 만든 뒤 반환한다. 로그가 끝난 watch는 select에서 감시자 경우를 골라 cl.cert를 다시 채울 수 있다.
  participant W as watch()
  participant L as Parent.Log
  participant C as Close()
  Note over W: cl.cert =<br/>새 인증서
  W->>L: 갱신 로그
  Note over L: 늦어짐
  Note over C: done · 감시자<br/>닫기
  Note over C: cl.cert = nil
  C-->>C: 반환
  L-->>W: 로그 끝
  Note over W: select 세 경우<br/>모두 준비
  Note over W: 감시자 쪽이면<br/>cert 다시 채움
```

`watch()`는 Close가 반환한 뒤에도 `Parent.Log`를 부를 수 있었고, 호출자는 비웠다고 믿는 `cl.cert`를 다시 보게 됩니다. 채널이 닫혔다는 사실만으로는 그 채널을 쓰던 고루틴이 끝났다고 말할 수 없었습니다.

## 종료 신호 뒤에 watch() 반환을 기다리게 했습니다 {#신호-뒤에-완료-대기를-넣었다}

#6261은 `certloader.go`에 5줄을 더했습니다. `go cl.watch()` 앞에서 `wg.Add(1)`, `watch()` 맨 위에서 `defer cl.wg.Done()`, Close에서 `close(cl.done)` 바로 뒤에 `cl.wg.Wait()`를 두었습니다([head `7d95a222` diff](https://github.com/bluenviron/mediamtx/pull/6261/files)). RTSP·RTMP 서버가 자기 `run()` 고루틴에 쓰는 모양과 같습니다.

| 순서 | 동작 | 지키려는 조건 |
|---|---|---|
| 시작 | 고루틴 실행 전에 `Add(1)` | Close가 시작을 놓치지 않음 |
| 종료 요청 | `done` 닫기 | 쉬고 있는 `watch()`를 깨움 |
| 완료 대기 | `Wait()` | 진행 중인 갱신이 끝났음을 확인 |
| 정리 | 감시자 닫기, `cl.cert = nil` | 끝난 작업만 남은 뒤 상태를 비움 |

`watch()`를 시작하지 않고 `Initialize()`가 끝나는 경로(자동 생성 인증서를 디스크에 저장하지 못한 경우)에서는 카운터가 0이므로 `Wait()`가 바로 반환합니다. 서버들이 자원을 닫는 순서와 `CertLoader`의 공개 API는 바꾸지 않았습니다.

## 갱신 중간에 로그를 멈춰 Close 순서를 고정했습니다 {#sleep으로-우연을-기다리지-않고-갱신을-멈췄다}

경합을 오래 반복하는 것만으로는 중요한 순간을 만난다는 보장이 없습니다. `TestCloseDuringReload`는 시험용 부모 로거가 `Parent.Log` 안에서 멈추게 해 두고 인증서·키 파일을 다시 써 실제 갱신을 일으킵니다. `watch()`가 로그 안으로 들어온 것을 확인하면 Close를 부르고, 0.5초 안에 Close가 반환하면 실패로 봅니다. 끝에는 로그를 풀고 Close가 5초 안에 끝나는지도 봅니다([시험 코드](https://github.com/bluenviron/mediamtx/blob/7d95a222f8f208f16af79b8ac32b6e4d61a280ba/internal/certloader/certloader_test.go#L56-L124)).

[[fig-close-during-reload]]의 위 줄이 v1.21.1, 아래 줄이 고친 뒤입니다.

{{< motion scene="CloseDuringReload" id="fig-close-during-reload" kind="개념도" caption="두 줄 모두 watch()가 Parent.Log 안에서 멈춘 채 Close()가 불립니다. v1.21.1의 Close()는 종료 신호와 정리를 마치고 먼저 반환하고, 로그가 풀리면 watch()가 select로 돌아가 cl.cert를 다시 채웁니다. 고친 뒤에는 Close()가 watch()의 반환을 기다린 다음 정리해 cl.cert가 nil로 남습니다. TestCloseDuringReload가 만드는 순서를 그린 것입니다." >}}

같은 시험 파일을 다섯 판에 넣고 `go test -race -count=20 -run '^TestCloseDuringReload$' ./internal/certloader`를 돌렸습니다.

| 판 | 결과(20회) | 한 번에 걸린 시간 |
|---|---|---|
| v1.21.1 `04825598` | 모두 실패: `Close() returned while a reload was in progress` | 0.02–0.03초 |
| #6261 head `7d95a222` | 모두 통과 | 0.52–0.53초 |
| #6417 머지 `989ea15a` | 모두 통과 | 0.52–0.53초 |
| v1.21.3 `9540cb6c` | 모두 통과 | 0.52–0.53초 |
| #6427 머지 `065f94c2` | 모두 통과 | 0.52–0.53초 |

PR 본문에 적은 9월 결과(기준 커밋 20번 실패, PR 20번 통과, macOS/arm64와 `golang:1.26-alpine3.24`)와 같습니다. 이번에는 macOS에서만 돌렸습니다.

## 이 테스트에서는 빨리 반환하는 쪽이 결함입니다 {#통과-시간이-길어진-것을-성능-저하로-읽지-않는다}

실패한 v1.21.1은 0.02초 만에 끝났고 통과한 판은 0.52초가 걸렸습니다. 이 시험에서 빨리 끝난다는 것은 멈춰 둔 갱신을 남겨 두고 Close가 먼저 나왔다는 뜻입니다. 통과한 판의 0.5초는 시험이 일부러 기다린 시간이라 처리 속도 비교에 쓸 수 없습니다.

실제 비용은 따로 있습니다. 갱신 중 로그 목적지가 막히면 Close도 함께 기다립니다. 감시자에 다른 변경이 쌓여 있으면 갱신을 한 번 더 하고 끝날 수도 있습니다. 갱신 한 번은 인증서 읽기 한 번과 로그 한 줄입니다. 정상 종료 경로에서는 각 서버가 Close 첫머리에 `closing` 로그를 쓰므로, 막힌 로그 목적지는 그 전부터 종료를 붙잡고 있습니다. 20번 대조가 확인한 것은 갱신 중 Close가 먼저 반환하던 한 순서뿐이고, 다른 경합이 없다는 것이나 느린 로그 목적지에서의 종료 상한은 확인하지 않았습니다.

## 상류는 WaitGroup 대신 채널로 다시 구현했습니다

aler9는 10월 25일 18:58(KST) 「using a `WaitGroup` to wait for a single routine is redundant. A channel is enough.」라고 적고 PR을 닫았습니다([#6261 댓글](https://github.com/bluenviron/mediamtx/pull/6261#issuecomment-6396229498)). 5분 뒤 머지한 #6417은 종료 요청 채널 `terminate`와 완료 채널 `done`을 나눕니다. Close는 `close(cl.terminate)` 뒤 `<-cl.done`으로 기다리고, `watch()`는 `defer close(cl.done)`으로 끝날 때 `done`을 닫습니다([머지 커밋 `989ea15a`](https://github.com/bluenviron/mediamtx/commit/989ea15a6ef5a70a93a02eaf595f317a4c5bb247)). 기다리는 순서는 #6261과 같습니다. #6417은 시험을 더하지 않았고, 11월 13일 상류 main(`3b1c4e87`)의 `certloader_test.go`에도 `TestCloseDuringReload`는 없습니다(`TestCertReload`·`TestCloseAutoCert`만 있음). 위 표의 #6417 이후 판은 이 시험을 넣어 돌린 결과입니다.

두 구현은 한 곳에서 달랐습니다. WaitGroup은 `watch()`를 시작하지 않으면 카운터가 0이라 Wait가 바로 반환합니다. `done` 채널은 `watch()`만 닫으므로 `watch()`가 없으면 아무도 닫지 않습니다. 그래서 v1.21.3은 인증서를 저장하지 못한 환경에서 종료가 멈췄고, 그 과정은 [인증서를 저장하지 못한 MediaMTX는 종료되지 않았습니다](/posts/open-source-analysis/mediamtx-certloader-no-watcher-shutdown/)에 있습니다. 포크에는 #6261 판([`42e8a20d`](https://github.com/xodbs1021/mediamtx/commit/42e8a20d8081bdebe2b0a0730f5eceecd02e1587))이 실려 있어 no-watch 멈춤이 없습니다.

종료 함수에 기다림을 넣을 때는 기다리는 대상이 아예 시작되지 않는 경로도 함께 보십시오. 카운터는 0이면 기다리지 않지만, 채널은 누군가 닫아야 기다림이 끝납니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 KST 21:18:57–21:20:58에 실행했습니다. 같은 시간에 이 묶음의 로그 재설정 실측이 함께 돌았고, 그 기록의 load average(1분)는 21:18 15.53, 21:20 41.51이었습니다. 이 시험은 통과·실패만 보므로 시간 값은 참고로만 적었습니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1, Go 1.27.2 darwin/arm64. Linux 컨테이너에서는 돌리지 않았습니다.
- 판: [v1.21.1](https://github.com/bluenviron/mediamtx/tree/v1.21.1)(`04825598`), #6261 head `7d95a222`(기준 v1.21.1 + 커밋 1개), #6417 머지 `989ea15a`, [v1.21.3](https://github.com/bluenviron/mediamtx/tree/v1.21.3)(`9540cb6c`), #6427 머지 `065f94c2`.
- 시험: #6261 head의 `TestCloseDuringReload`를 그대로 떼어 낸 파일을 `internal/certloader`에 넣고(#6261 head는 원래 파일 그대로), `go test -race -count=20 -v -run '^TestCloseDuringReload$' ./internal/certloader`. 필요한 `test.TLSCertPubAlt`·`test.Logger`는 다섯 판 모두에 있습니다.
- 원자료: 시험 파일 · 실행 스크립트 · 판별 출력은 [저장소 `_workspace/blog/mediamtx-certificate-watcher-close-join/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/mediamtx-certificate-watcher-close-join/measure)에 있습니다.

## 출처

- [bluenviron/mediamtx PR #6261 「certloader: make CertLoader.Close() wait for watch() to return」](https://github.com/bluenviron/mediamtx/pull/6261) — 본문의 문제 · 원인 · 재현 · 영향, aler9 댓글, 2026-10-25 닫힘 · [head 7d95a222](https://github.com/bluenviron/mediamtx/commit/7d95a222f8f208f16af79b8ac32b6e4d61a280ba)
- [PR #6417 「fix routine leak in CertLoader (#6261)」](https://github.com/bluenviron/mediamtx/pull/6417) — 머지 커밋 989ea15a, v1.21.3
- [v1.21.1 `internal/certloader/certloader.go`](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/certloader/certloader.go) · [`internal/confwatcher/confwatcher.go`](https://github.com/bluenviron/mediamtx/blob/048255986f7e04b859b4c4efe651448ec785ecd4/internal/confwatcher/confwatcher.go)
- [상류 main 3b1c4e87의 `certloader_test.go`](https://github.com/bluenviron/mediamtx/blob/3b1c4e87f5e1d5ba8bf63f962eadff02605ad4e9/internal/certloader/certloader_test.go) — 2026-11-13 확인
- [The Go Programming Language Specification 「Select statements」](https://go.dev/ref/spec#Select_statements)
- [MediaMTX v1.21.3 릴리스](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.3)
- [xodbs1021/mediamtx 커밋 42e8a20d](https://github.com/xodbs1021/mediamtx/commit/42e8a20d8081bdebe2b0a0730f5eceecd02e1587) — 제품 포크에 실린 #6261 판
- [인증서를 저장하지 못한 MediaMTX는 종료되지 않았습니다](/posts/open-source-analysis/mediamtx-certloader-no-watcher-shutdown/) — 채널 판의 no-watch 멈춤과 #6427

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 38쪽](/portfolio/2026-10-15-v2/full.pdf#page=38)
