---
title: "MediaMTX가 SRT 암호를 사용자별로 받게 제안했습니다"
date: "2026-10-15T11:33:48+09:00"
lastmod: "2026-11-13T22:30:00+09:00"
author: "김태윤"
categories: ["open-source-analysis"]
draft: false
description: "경로마다 하나인 MediaMTX의 SRT passphrase를 사용자별로 받게 한 PR #6306(2026-11-13 확인 기준 열림). 사용자 암호가 비면 경로 암호로 돌아가고, JWT는 streamid가 암호화되지 않아 뺐습니다. 인증 응답 본문을 늦게 보내는 AI 재측정에서는 본문을 기다리는 동안 경로 목록 조회도 함께 늦어졌지만, 이 대기는 제안이 아니라 v1.21.3부터 상류에 있었습니다."
tags: ["MediaMTX", "오픈소스 기여", "SRT", "인증", "PokeClip", "개발 사례"]
portfolio_cases: []
portfolio_pages: [45]
portfolio_edition: "2026-10-15-v2"
---

MediaMTX의 SRT 암호(passphrase)는 경로마다 하나라서, 장비 한 대의 암호가 새면 같은 경로로 송출하는 모든 장비의 암호를 바꿔야 합니다([이슈 #5613](https://github.com/bluenviron/mediamtx/issues/5613)). 사용자마다 암호를 둘 수 있게 하는 [PR #6306](https://github.com/bluenviron/mediamtx/pull/6306)을 올렸고, 2026년 11월 13일 확인 기준 열려 있습니다. 같은 날 인증 응답의 본문을 늦게 보내며 다시 재 보니, 본문을 1초 늦추면 그동안 들어온 경로 목록 조회도 약 1초 뒤에 끝났습니다(본문 1초 지연에서 v1.21.3 1,004.67ms, #6306 1,004.17ms, 20회 중앙값). 지금 head 기준으로 이 대기는 제안 때문이 아니라 v1.21.3부터 상류에 있었고, 본문을 읽지 않는 v1.21.2에서는 2.24ms였습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## 사용자 암호가 비면 경로 암호로 돌아가게 했습니다 {#사용자별로-받되-기존-경로-암호는-남겼습니다}

SRT(Secure Reliable Transport)는 손실이 있는 망에서 재전송으로 미디어를 보내는 프로토콜이고, passphrase로 미디어 패킷을 암호화합니다. 지금 MediaMTX는 이 값을 경로 설정의 `srtPublishPassphrase` · `srtReadPassphrase`로만 받습니다. 이슈 #5613에서 유지보수자는 9월 20일 내부 사용자나 외부 인증(HTTP, JWT)의 사용자에 `srtPassphrase`를 붙여야 한다고 답했고, #6306은 그 방향을 따릅니다.

내부 사용자 설정에 `srtPassphrase`를 더했고, `authMethod: http`에서는 2xx 응답 본문에 `expireAt`과 나란히 `{"srtPassphrase": "..."}`를 실을 수 있게 했습니다([`manager.go` 261–287행](https://github.com/bluenviron/mediamtx/blob/99ea6c0015d68e63552541ecdc933c32b63baf6b/internal/auth/manager.go#L261-L287)). 인증된 사용자에게 암호가 있으면 SRT 연결은 경로 암호 대신 그 값을 씁니다([`conn.go` 202–211행](https://github.com/bluenviron/mediamtx/blob/99ea6c0015d68e63552541ecdc933c32b63baf6b/internal/servers/srt/conn.go#L202-L211)). 빈 값은 「설정 안 함」으로 보고 경로 암호로 돌아갑니다. 사용자별 값을 쓰지 않는 기존 설정은 그대로 돌게 하려는 선택입니다.

[[fig-srt-passphrase-sequence]]에서 MediaMTX는 인증이 끝난 뒤에야 어느 암호로 연결을 풀지 정합니다.

```mermaid {#fig-srt-passphrase-sequence kind="재구성" caption="HTTP 인증을 쓸 때 #6306이 SRT 송출 연결의 암호를 고르는 순서. 인증 응답의 본문을 다 읽은 뒤 srtPassphrase가 있으면 그 값을, 없거나 비었으면 경로 암호를 씁니다. #6306 head 99ea6c00의 auth/manager.go 261–287행과 servers/srt/conn.go 160–211행 재구성." source="https://github.com/bluenviron/mediamtx/blob/99ea6c0015d68e63552541ecdc933c32b63baf6b/internal/servers/srt/conn.go#L160-L211"}
%%{init: {"sequence": {"width": 96, "actorMargin": 16}}}%%
sequenceDiagram
  accTitle: 사용자별 SRT 암호를 고르는 순서
  accDescr: 송출자가 streamid에 사용자 이름과 비밀번호를 넣어 SRT 접속을 요청한다. MediaMTX가 인증 응답기에 HTTP로 묻고, 200 응답의 본문까지 읽는다. 본문에 srtPassphrase가 있으면 그 값, 없으면 경로 암호로 연결의 암호를 확인해 맞으면 수락하고 틀리면 거부한다.
  participant S as 송출자
  participant M as MediaMTX
  participant A as 응답기
  S->>M: SRT 접속
  M->>A: 인증 요청
  A-->>M: 200 · 본문
  Note over M: 본문 암호<br/>없으면 경로 암호
  M-->>S: 수락 · 거부
```

아래 표와 수락·거부 시험은 지금 head `99ea6c00` 기준입니다.

| 경계 | 제안한 동작 |
|---|---|
| 사용자 암호가 있음 | 경로 암호 대신 사용 |
| 사용자 암호가 비었거나, HTTP 본문에 없거나 문자열이 아님 | 경로 암호 사용 |
| 내부 사용자 암호 길이 | 비어 있지 않으면 10–79자(경로 암호와 같은 규칙) |
| 관리 API 응답 | 값을 가림, `<redacted>`를 돌려보내면 기존 값 유지 |
| 내부 사용자 여러 명이 맞음 | 첫 사용자의 암호 |

내부 사용자 설정의 암호는 평문으로 저장됩니다. SRT가 원래 값을 알아야 하기 때문입니다. API 응답에서 가리는 것과 저장 자체를 암호화하는 것은 다른 보장입니다. 사용자 암호를 바꿔도 이미 열린 연결은 끊지 않습니다. HTTP 응답 본문을 128KiB까지만 읽는 제한은 이 제안이 아니라 상류 [#5674](https://github.com/bluenviron/mediamtx/pull/5674)(4월 20일)부터 있던 상수 `maxInboundBodySize`입니다.

PR head [`99ea6c00`](https://github.com/bluenviron/mediamtx/pull/6306/commits/99ea6c0015d68e63552541ecdc933c32b63baf6b)을 빌드해 경로 암호를 `pathpass1234`로 두고 송출해 봤습니다.

| 인증 방식 · 사용자 | 송출자가 쓴 암호 | 결과 |
|---|---|---|
| 내부 · alice(사용자 암호 있음) | alice의 사용자 암호 | 수락 |
| 내부 · alice | 경로 암호 | 거부 |
| 내부 · bob(사용자 암호 없음) | 경로 암호 | 수락 |
| 내부 · bob | alice의 사용자 암호 | 거부 |
| HTTP · carol(본문에 암호 있음) | 본문의 암호 | 수락 |
| HTTP · carol | 경로 암호 | 거부 |
| HTTP · dave(본문에 암호 없음) | 경로 암호 | 수락 |
| HTTP · dave | carol의 암호 | 거부 |

틀린 암호는 모두 `invalid passphrase`로 거부됐습니다. 같은 내부 사용자 설정을 v1.21.3에 주면 `srtPassphrase`를 모르는 필드로 보고 시작하지 않았고, HTTP 방식에서는 본문의 암호를 무시하고 경로 암호로만 받아들였습니다. PR head의 시험은 SRT 송출·읽기를 사용자 암호·경로 암호·둘 다인 경우로 여는 `TestServerPassphrase`(하위 시험 10개)와, HTTP 본문의 암호가 있음·없음·문자열 아님·`expireAt` 잘못됨인 경우를 보는 `TestAuthHTTPSRTPassphrase`(4개)입니다.

## JWT는 streamid가 암호화되지 않아 뺐습니다

유지보수자의 답에는 JWT도 있었지만 #6306은 JWT를 다루지 않습니다. SRT에서 JWT는 스트림 ID(streamid)에 실려 가는데([MediaMTX 인증 문서의 SRT 토큰 절](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/docs/2-features/05-authentication.md?plain=1#L344-L352)), streamid는 연결을 맺는 핸드셰이크의 확장 필드입니다([SRT 초안 3.2.1.3절](https://datatracker.ietf.org/doc/html/draft-sharabayko-srt-01#section-3.2.1.3)). SRT가 암호화하는 것은 데이터 패킷의 내용뿐이라([같은 초안 6.1.1절](https://datatracker.ietf.org/doc/html/draft-sharabayko-srt-01#section-6.1.1)), 제어 패킷인 핸드셰이크에 실린 streamid는 그대로 보입니다. 그래서 JWT 클레임에 암호를 넣으면 핸드셰이크를 볼 수 있는 누구나 그 암호를 읽습니다. 암호화에 쓸 값을 암호화되지 않는 길로 보낼 수는 없어, PR 본문에 제외 이유를 적고 범위에서 뺐습니다.

## 성공 응답 본문을 기다리는 비용은 v1.21.3부터 상류에도 있었습니다 {#암호를-얻기-위한-본문-읽기가-다른-경로-작업도-늦췄습니다}

HTTP 인증 서버가 200을 보냈다고 끝나는 것이 아닙니다. 사용자 암호는 응답 본문에 있으므로 본문까지 읽어야 합니다. 그런데 MediaMTX는 이 인증을 경로 관리자의 이벤트 루프 안에서 합니다([v1.21.3 `path_manager.go` 343–350행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/core/path_manager.go#L343-L350)). 같은 루프가 관리 API의 경로 목록 조회와 다른 접속의 경로 찾기도 처리하므로, 본문이 늦으면 그것들도 기다립니다.

예전에는 이 대기를 제안이 만든 비용으로 적었습니다. 10월 19일 head는 같은 날 새벽의 상류 `3f041257` 위에 있었고, 그때 상류는 2xx 응답의 본문을 읽지 않고 상태 코드만 보고 돌아왔습니다([v1.21.2 `manager.go` 231–246행](https://github.com/bluenviron/mediamtx/blob/914e39535ece709919ac325aaeed98d394ed9093/internal/auth/manager.go#L231-L246)). 이틀 뒤인 10월 21일 유지보수자가 HTTP 인증이 세션 만료 시각(`expireAt`)을 정할 수 있게 한 [#6391](https://github.com/bluenviron/mediamtx/pull/6391)을 머지했고, 이 변경부터 상류도 2xx 본문을 읽습니다([v1.21.3 `manager.go` 256행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/auth/manager.go#L256)). 10월 27일 그 위로 다시 쓴 지금의 #6306은 이미 읽은 본문에서 필드 하나를 더 꺼낼 뿐입니다.

그래서 v1.21.2, v1.21.3, #6306 head 세 판을 같은 조건으로 쟀습니다. 로컬 인증 응답기가 200 헤더를 바로 보내고 본문을 0초 · 0.1초 · 1초 늦게 보내거나, 아예 보내지 않습니다(`readTimeout: 2s`). 응답기는 SRT 인증 요청이 들어온 순간 `GET /v3/paths/list`를 보내 응답을 다 받기까지 걸린 시간을 잽니다. 조건마다 SRT 송출 20회의 중앙값입니다.

[[fig-auth-body-wait]]에서 v1.21.3과 #6306은 본문 지연과 같은 만큼 늦고, v1.21.2만 바닥에 붙어 있습니다.

{{< chart id="fig-auth-body-wait" kind="실측" caption="SRT 인증 요청이 도착한 순간 보낸 GET /v3/paths/list가 끝나기까지(ms, 조건마다 20회의 중앙값). 인증 응답기는 200 헤더를 바로 보내고 본문만 늦췄습니다. v1.21.3과 #6306은 본문 지연만큼 늦고, 본문을 보내지 않으면 readTimeout 2초에서 끝납니다. v1.21.2는 본문을 읽지 않아 모든 조건에서 4ms 아래였습니다. 2026-11-13, MacBook Air(M5)." source="아래 「측정 조건」" height="440px" >}}
{
  "grid": {"left": 8, "right": 72, "top": 40, "bottom": 28, "containLabel": true},
  "legend": {"top": 0, "data": ["v1.21.2", "v1.21.3", "#6306 99ea6c00"]},
  "xAxis": {"type": "value", "name": "ms", "min": 0, "max": 2400, "interval": 500},
  "yAxis": {"type": "category", "inverse": true, "data": ["본문 바로", "본문 0.1초 뒤", "본문 1초 뒤", "본문 안 보냄"]},
  "series": [
    {"name": "v1.21.2", "type": "bar", "barWidth": 12, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [1.4, 3.3, 2.2, 2.0]},
    {"name": "v1.21.3", "type": "bar", "barWidth": 12, "itemStyle": {"color": "#0072b2"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [0.7, 107.0, 1004.7, 2001.0]},
    {"name": "#6306 99ea6c00", "type": "bar", "barWidth": 12, "itemStyle": {"color": "#087f8b"}, "label": {"show": true, "position": "right", "formatter": "{c}"}, "data": [0.8, 104.9, 1004.2, 2000.9]}
  ]
}
{{< /chart >}}

본문을 읽는 두 판에서는 본문이 늦은 만큼 목록 조회도 늦었고, 본문을 끝내 보내지 않으면 `readTimeout` 2초가 지나 인증이 실패한 뒤에야 목록이 나왔습니다. 대기 시간의 상한은 `readTimeout`이고 128KiB는 읽는 양의 상한입니다. 둘 다 대기를 없애지는 않습니다. 이 측정은 관리 API 처리와 전송 시간을 포함하므로 루프가 정확히 얼마나 묶였는지와는 다르고, 헤더 자체가 늦는 경우는 세 판 모두 같은 루프에서 기다리는 코드라 따로 재지 않았습니다.

[[fig-auth-body-wait-motion]]은 본문 1초 지연 조건의 흐름입니다.

{{< motion scene="AuthBodyWait" id="fig-auth-body-wait-motion" kind="재구성" caption="SRT 접속이 들어오면 경로 관리자가 HTTP 인증을 묻고, 200 헤더 뒤 본문이 1초 늦게 오는 동안 같은 관리자에 들어온 GET /v3/paths/list도 기다립니다. 본문이 오면 사용자 암호를 고르고 목록 응답이 나갑니다. 대기는 v1.21.3과 #6306이 같고, 사용자 암호를 쓰는 것은 #6306뿐입니다(v1.21.3은 본문의 암호를 무시합니다). 1.0초는 두 판의 재측정 중앙값이고, 헤더 뒤 1초는 영상에서 늘려 보였습니다." >}}

사용자별 암호를 HTTP 인증으로 받는다면, 인증 서버가 본문까지 빨리 끝내는지가 다른 접속과 관리 API의 응답 시간까지 정합니다. 이것은 #6306을 쓰지 않아도 v1.21.3 이후 `authMethod: http`를 쓰면 생기는 조건입니다. 상류가 `expireAt`을 읽으려고 2xx 본문을 항상 끝까지 읽기 때문입니다.

## 제품 포크에는 실렸고 상류에서는 아직 열려 있습니다 {#포크에서-사용할-수-있음과-상류-채택은-별개입니다}

PokeClip의 제품 이미지는 상류 v1.21.1 위에 우리 수정을 얹은 포크 빌드 `v1.21.1-pokeclip.2`이고, #6306도 그 안에 실려 있습니다([Go로 다 짜려던 미디어 서버를 MediaMTX에 맡겼습니다](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/#직접-만들지-않은-코드는-검토하지-않아도-되는-코드가-아니었습니다)). 다만 포크에 실린 것은 10월 8일 판([`b9735847`](https://github.com/xodbs1021/mediamtx/commit/b973584717b5646845ccbd288162584609a0b41b))이라 지금 head와 경계가 다릅니다. 그 판은 SRT 요청일 때만 2xx 본문을 읽고, 본문의 `srtPassphrase`가 문자열이 아니거나 길이 규칙(10–79자)을 벗어나면 경로 암호로 돌아가지 않고 인증을 실패시킵니다. #6391이 없는 v1.21.1 바탕이라, 포크에서는 본문 대기를 이 패치가 들여온 것도 맞습니다. 포크에 넣어 쓸 수 있는 것과 유지보수자가 상류 변경으로 받아들이는 것은 다른 단계입니다. #6306은 11월 13일 확인 기준 리뷰 없이 열려 있습니다.

상류에 올린 수정은 릴리스 기준과 머지 기준을 나눠 셉니다. 정식 릴리스에 들어간 것은 [#6154](https://github.com/bluenviron/mediamtx/pull/6154) · [#6155](https://github.com/bluenviron/mediamtx/pull/6155) · [#6182](https://github.com/bluenviron/mediamtx/pull/6182)(v1.21.0)와 [#6205](https://github.com/bluenviron/mediamtx/pull/6205)(v1.21.1)의 4건입니다. [#6427](https://github.com/bluenviron/mediamtx/pull/6427)(10월 27일)과 [#6379](https://github.com/bluenviron/mediamtx/pull/6379)(11월 1일)는 머지됐지만 아직 릴리스에 없습니다. #6306과 [#6259](https://github.com/bluenviron/mediamtx/pull/6259) · [#6380](https://github.com/bluenviron/mediamtx/pull/6380)은 열려 있습니다. [#6206](https://github.com/bluenviron/mediamtx/pull/6206)은 [#6326](https://github.com/bluenviron/mediamtx/pull/6326)이, [#6261](https://github.com/bluenviron/mediamtx/pull/6261)은 [#6417](https://github.com/bluenviron/mediamtx/pull/6417)이 다시 구현하면서 닫혔습니다.

## 개발 서버에서 계정별 송출과 차단을 확인했습니다 {#10월-19일-후속-개발-서버에서-계정별-송출과-차단을-연결했습니다}

10월 19일 제품 포크 `v1.21.1-pokeclip.2`(#6306의 10월 8일 판)를 개발 서버에 올려, 계정마다 다른 passphrase로 송출이 받아들여지고 틀린 passphrase와 차단한 계정의 송출은 거부되는 것을 확인했습니다. 인증 조회가 실패하는 경우와 passphrase 없는 성공 응답은 그때 판정하지 못했습니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 KST 18:58–19:11에 대기 시험, 19:11–19:13에 수락·거부 시험을 실행했습니다. 판마다 끝날 때 기록한 load average(1분)는 34.01(v1.21.2) · 11.01(v1.21.3) · 2.80(#6306)이었고, 시작 때는 8.63이었습니다. 같은 기계에서 다른 세션의 작업이 함께 돌았고 팬 없는 기종입니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1.
- 빌드: Go 1.27.2 darwin/arm64로 [v1.21.2](https://github.com/bluenviron/mediamtx/tree/v1.21.2)(`914e3953`), [v1.21.3](https://github.com/bluenviron/mediamtx/tree/v1.21.3)(`9540cb6c`), #6306 head `99ea6c00`(상류 `065f94c2` + 커밋 1개).
- 도구: FFmpeg 9.0.2(테스트 신호를 H.264 · MPEG-TS로), srt-live-transmit 1.5.7(SRT 송출, `-a:no`), Python 3.14 표준 라이브러리로 쓴 인증 응답기.
- 대기 시험 설정: SRT(:18890)와 API(127.0.0.1:19997)만 켬, `readTimeout: 2s`, `authMethod: http`, `authHTTPExclude: [{action: api}]`, 경로 `test`의 `srtPublishPassphrase`. 응답기는 `Content-Length`를 단 200 헤더를 바로 보내고, 본문 `{"srtPassphrase": "..."}`를 0 · 0.1 · 1초 늦게 보내거나 5초 동안 보내지 않습니다. 시간 = SRT 인증 요청 도착부터 응답기가 다른 스레드에서 보낸 `GET /v3/paths/list`의 응답을 다 받을 때까지(같은 프로세스의 단조 시계). 판 3개 × 조건 4개 × 20회, 회차마다 송출을 끊고 0.6초 쉼.
- 송출: `ffmpeg -loglevel error -re -f lavfi -i testsrc2=size=320x240:rate=25 -t 4 -c:v libx264 -preset ultrafast -tune zerolatency -g 25 -f mpegts - | srt-live-transmit -q -a:no file://con 'srt://127.0.0.1:18890?streamid=publish:test:<사용자>:<비밀번호>&passphrase=<암호>'`(대기 시험은 사용자 `timing`, 암호 `userpass1234`. 모두 시험용 가짜 값).
- 수락·거부 시험: 판정은 서버 로그의 `is publishing to path 'test'` 유무. 내부 사용자 2명(alice · bob)과 HTTP 응답기의 사용자 2명(carol · dave), 경우마다 1회.
- 원자료: 스크립트 · 회차별 값 · 서버 로그는 [저장소 `_workspace/blog/mediamtx-user-srt-passphrase-boundaries/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/mediamtx-user-srt-passphrase-boundaries/measure)에 있습니다.

## 출처

- [bluenviron/mediamtx PR #6306 「srt: add srtPassphrase to users」](https://github.com/bluenviron/mediamtx/pull/6306) — 변경 · 시험 10개 · 4개 · JWT 제외 · 평문 저장, 2026-11-13 확인 기준 열림 · [head 99ea6c00](https://github.com/bluenviron/mediamtx/pull/6306/commits/99ea6c0015d68e63552541ecdc933c32b63baf6b)
- [이슈 #5613 「Dynamic SRT passphrase」](https://github.com/bluenviron/mediamtx/issues/5613)
- [PR #6391 「allow HTTP authentication to set a session expiration date」](https://github.com/bluenviron/mediamtx/pull/6391) — 2xx 본문 읽기, v1.21.3
- [PR #5674 「prevent out-of-memory errors」](https://github.com/bluenviron/mediamtx/pull/5674) — `maxInboundBodySize = 128 * 1024`
- [v1.21.3 `internal/core/path_manager.go` 343–350행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/core/path_manager.go#L343-L350) — 경로 관리자 루프 안의 인증
- [M. Sharabayko 외, 「The SRT Protocol」 draft-sharabayko-srt-01](https://datatracker.ietf.org/doc/html/draft-sharabayko-srt-01) — 3.2.1.3절 Stream ID, 6.1.1절 암호화 범위
- [MediaMTX 인증 문서 「Provide tokens / JWTs」 SRT 절(v1.21.3)](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/docs/2-features/05-authentication.md?plain=1#L344-L352)
- [xodbs1021/mediamtx 커밋 b9735847 「add srtPassphrase to users」](https://github.com/xodbs1021/mediamtx/commit/b973584717b5646845ccbd288162584609a0b41b) — 제품 포크에 실린 10월 8일 판
- [MediaMTX v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0) · [v1.21.1](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1) · [v1.21.3](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.3) 릴리스
- [Go로 다 짜려던 미디어 서버를 MediaMTX에 맡겼습니다](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/) — 제품 포크와 상류 제안의 관계

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [초기 10월 15일 판 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=45)
