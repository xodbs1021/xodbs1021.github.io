---
title: "MediaMTX 디버그 로그에 비밀번호가 그대로 찍혔습니다"
date: "2026-11-19T14:00:00+09:00"
draft: false
author: "김태윤"
description: "MediaMTX v1.21.3까지 logLevel: debug에서는 Control API 요청의 JSON 본문과 HTTP 인증 요청 본문(password · token)이 로그에 그대로 남았습니다. 응답 본문에 쓰던 Content-Type 목록을 요청에도 적용한 PR #6379(2026-11-01 머지, v1.21.4 포함)와, 네 판을 AI가 다시 빌드해 지어낸 비밀 값의 로그 등장이 16번에서 0번으로 줄고 SDP 본문은 남는 것을 센 기록입니다."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "오픈소스 기여", "로그", "보안", "HTTP", "Go"]
---

MediaMTX v1.21.3에서 `logLevel: debug`를 켜고 Control API로 경로의 `srtPublishPassphrase`를 바꾸면, 요청 JSON 본문이 그 값째로 로그에 남습니다. `authMethod: http`라면 MediaMTX가 인증 서버로 보내는 요청 본문의 `password` · `token`도 남습니다. 요청 본문을 Content-Type과 상관없이 로그 문자열에 넣던 함수 하나 때문이었습니다. 응답 본문에 이미 쓰던 Content-Type 목록을 요청에도 적용한 [PR #6379](https://github.com/bluenviron/mediamtx/pull/6379)를 올렸고, 2026년 11월 1일 머지돼 [v1.21.4](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.4)(11월 15일)에 들어갔습니다. 11월 19일 두 판을 빌드해 같은 요청을 보내 보니, 지어낸 비밀 값이 로그에 나온 횟수가 v1.21.3에서 16번, v1.21.4에서 0번이었고 SDP 본문은 두 판 모두 1번 남았습니다. 기본 로그 수준(`info`)에서는 생기지 않는 문제입니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## debug 로그를 켜면 Control API와 인증 요청 본문이 그대로 남았습니다

MediaMTX의 HTTP 요청은 두 길로 debug 로그에 남습니다. MediaMTX가 받는 요청(Control API, WebRTC, HLS 등)은 `handlerLogger`가 기록합니다([v1.21.3 `handler_logger.go` 82행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/protocols/httpp/handler_logger.go#L82)). MediaMTX가 보내는 요청(HTTP 인증, HLS · WebRTC 소스 등)은 `LoggerTransport`가 기록합니다([`logger_transport.go` 52행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/protocols/httpp/logger_transport.go#L52)). 둘 다 `RequestForLog()`로 요청을 문자열로 만들고, v1.21.3의 이 함수는 본문이 있으면 Content-Type을 보지 않고 10 KiB까지 읽어 넣습니다([`request_for_log.go` 60–82행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/protocols/httpp/request_for_log.go#L60-L82)).

[[fig-request-log-paths]]에서 두 길은 같은 함수에서 만납니다. 가운데 판정은 v1.21.4에 생긴 것이고, v1.21.3에는 없었습니다.

```mermaid {#fig-request-log-paths kind="재구성" caption="요청 본문이 debug 로그로 가는 길. 받는 요청은 handlerLogger, 보내는 요청은 LoggerTransport를 거쳐 둘 다 RequestForLog()에 닿습니다. v1.21.4는 여기서 Content-Type을 보고 SDP · trickle-ICE만 본문을, 나머지는 크기만 남깁니다. v1.21.3에는 이 판정이 없어 모든 본문이 왼쪽 갈래로 갔습니다." source="https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/internal/protocols/httpp/request_for_log.go#L60-L90"}
flowchart TB
  accTitle: 요청 본문이 debug 로그로 가는 두 길
  accDescr: 받는 요청(Control API, WebRTC, HLS)은 handlerLogger를, 보내는 요청(HTTP 인증, 외부 소스)은 LoggerTransport를 거쳐 RequestForLog에 닿는다. v1.21.4는 Content-Type이 application/sdp나 application/trickle-ice-sdpfrag이면 본문을 10 KiB까지 남기고, 그 밖이면 본문을 읽지 않고 body of N bytes만 남긴다. v1.21.3은 판정 없이 모든 본문을 남겼다.
  inb["받는 요청<br/>Control API · WebRTC"]
  outb["보내는 요청<br/>HTTP 인증 · 외부 소스"]
  hl["handlerLogger"]
  lt["LoggerTransport"]
  rfl["RequestForLog()"]
  q{"Content-Type이<br/>목록에 있나"}
  body["본문을 남김<br/>10 KiB까지"]
  size["(body of N bytes)<br/>크기만 남김"]
  inb --> hl
  outb --> lt
  hl --> rfl
  lt --> rfl
  rfl --> q
  q -->|"SDP · trickle-ICE"| body
  q -->|"그 밖 · v1.21.4"| size
  style q fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style size fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

Control API의 설정 요청은 JSON 본문으로 비밀을 나릅니다. 내부 사용자의 `pass`, 경로의 `srtPublishPassphrase` · `srtReadPassphrase` · `whepBearerToken`, 전역 설정의 `hlsCDNSecret`이 그렇습니다. 메인테이너가 10월 11일(한국 시각) 머지한 [PR #6325](https://github.com/bluenviron/mediamtx/pull/6325)부터는 보내는 요청도 기록합니다. `authMethod: http`의 인증 요청 본문에는 접속한 사용자의 `password`와 `token`, 원래 요청의 쿼리 문자열(`query`)이 실립니다([v1.21.3 `auth/manager.go` 207–241행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/auth/manager.go#L207-L241)). `Authorization` 같은 민감한 헤더는 [PR #5873](https://github.com/bluenviron/mediamtx/pull/5873)부터 `<redacted>`로 가렸지만 본문은 그대로였습니다.

받는 요청의 본문을 debug에 남기는 동작은 오래됐습니다. v1.0.0(2023년 8월)의 HTTP 서버도 `httputil.DumpRequest(r, true)`로 본문까지 기록했고, Control API도 같은 기록기를 거쳤습니다([v1.0.0 `handler_logger.go` 52–56행](https://github.com/bluenviron/mediamtx/blob/27260572fc3416b32e3fe22f4f535877ad54127b/internal/httpserv/handler_logger.go#L52-L56)). 그보다 이른 판은 확인하지 않았습니다. 인증 요청 본문은 PR #6325가 처음 들어간 v1.21.3(10월 25일)에서만 남았고, v1.21.2에는 이 커밋이 없습니다. 두 경우 모두 v1.21.4에서 고쳐졌습니다.

모두 `logLevel: debug`일 때의 이야기입니다. 기본값은 `info`이고([v1.21.4 `mediamtx.yml` 10행](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/mediamtx.yml#L10), [`conf.go` 447행](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/internal/conf/conf.go#L447)), `info` 이상에서는 이 줄들이 찍히지 않습니다. 비밀이 로그 파일에 남는 것도 debug를 켠 동안 그런 요청이 들어온 경우뿐입니다.

## 버그 보고 양식이 debug 로그를 안내해 공개 이슈로 나갈 수 있었습니다

MediaMTX의 버그 보고 양식은 로그 칸에 「MediaMTX logs are often useful to identify the issue. If you think this is the case, set 'logLevel' to 'debug' and attach logs.」라고 안내합니다([`bug.yml` 76–82행](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/.github/ISSUE_TEMPLATE/bug.yml#L76-L82)). 필수 칸은 아닙니다. 다만 이 안내대로 붙인 로그에 API 설정 변경이나 HTTP 인증이 섞여 있으면, 비밀번호와 토큰이 공개 이슈에 그대로 실립니다. 로그 파일을 읽을 수 있는 사람이 원래 몇 명이었든, 이슈에 붙이는 순간 누구나 읽습니다. 실제로 그렇게 새어 나간 이슈가 있는지는 찾아보지 않았습니다.

이 문제는 10월 19일 SRT 사용자 암호 PR([PR #6306](https://github.com/bluenviron/mediamtx/pull/6306))을 다시 점검하던 중에 드러났습니다. 사용자 암호를 API로 넣으면 그 본문도 같은 길로 debug 로그에 남기 때문입니다. PR #6379는 그 PR과 독립된 수정으로 올렸습니다.

## 응답 본문에는 이미 Content-Type 목록이 있었습니다

응답 쪽은 달랐습니다. 2026년 6월 메인테이너의 [PR #5859](https://github.com/bluenviron/mediamtx/pull/5859)부터 debug 로그는 응답 본문을 `application/sdp`와 `application/trickle-ice-sdpfrag`일 때만 남기고, 나머지는 `(body of N bytes)`로 크기만 적었습니다([v1.21.3 `handler_logger.go` 11–14행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/protocols/httpp/handler_logger.go#L11-L14), [`logger_transport.go` 24–42행](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/protocols/httpp/logger_transport.go#L24-L42)). 두 형식은 WebRTC의 WHIP · WHEP에서 연결을 맺을 때 오가는 SDP와 ICE 후보 조각입니다. 같은 날 머지된 [PR #5858](https://github.com/bluenviron/mediamtx/pull/5858)은 요청 본문을 거르지 않고 10 KiB에서 자르기만 했습니다.

요청과 응답이 같은 로그에 나란히 찍히는데, 목록은 응답에만 걸려 있었습니다. 새 규칙을 만들 필요 없이 이미 있는 목록을 요청에도 걸면 되는 상황이었습니다.

## 요청 본문에도 같은 목록을 쓰고, 나머지는 크기만 남겼습니다

PR #6379는 `RequestForLog()`가 본문을 읽기 전에 Content-Type을 보게 했습니다([v1.21.4 `request_for_log.go` 60–90행](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/internal/protocols/httpp/request_for_log.go#L60-L90)). 목록에 있으면 전처럼 10 KiB까지 기록합니다. 없으면 본문을 읽지 않고, 길이를 알 때만 `(body of N bytes)`를 남깁니다. 응답 쪽과 같은 문구입니다.

```go
// v1.21.4 internal/protocols/httpp/request_for_log.go 67–90행 발췌(본문을 읽고 되돌려 놓는 부분은 생략)
var logBody bool
if req.Body != nil && req.Body != http.NoBody {
	_, logBody = bodyContentToLog[ParseContentType(req.Header.Get("Content-Type"))]
}

if logBody {
	// 전과 같이 10 KiB까지 읽어 capped에 담고, 읽은 만큼 본문을 되돌려 놓는다
} else if req.ContentLength > 0 {
	capped = fmt.Appendf(nil, "(body of %d bytes)", req.ContentLength)
}
```

Content-Type은 본문이 있을 때만 해석합니다. 목록은 이제 요청과 응답이 함께 쓰므로 이름을 `responseBodyContentToLog`에서 `bodyContentToLog`로 바꿨습니다. 시험은 `TestRequestForLog`에 JSON 본문이 크기로만 남는 `json_body` 사례를 더하고, 본문을 기록하던 기존 사례에 `Content-Type: application/sdp`를 붙였습니다. 5개 파일에서 28줄을 더하고 3줄을 지웠습니다. PR 본문에 적은 `RequestForLog()` 한 번의 메모리 할당은 본문 없는 GET 7 → 7, 22바이트 JSON 18 → 14, 5바이트 SDP 18 → 19였습니다. 이 함수는 로그 수준과 상관없이 모든 요청에서 돌기 때문에 적어 두었습니다.

JSON 키를 골라 가리는 방법은 쓰지 않았습니다. 비밀 필드가 새로 생길 때마다 목록을 고쳐야 하고, 하나를 빠뜨리면 다시 샙니다. 남겨도 되는 형식만 남기는 쪽은 그런 누락이 없는 대신 대가가 있습니다. SDP · trickle-ICE가 아닌 요청 본문은 비밀이 있든 없든 debug 로그에서 빠지므로, API 호출을 로그만 보고 디버깅할 때 본문을 볼 수 없습니다.

Content-Type을 속인 요청은 여전히 남습니다. Control API는 Content-Type을 보지 않고 JSON을 해석하므로([v1.21.4 `api_config_paths.go` 63행](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/internal/api/api_config_paths.go#L63)), `Content-Type: application/sdp`를 붙여 보낸 API 요청은 본문째 기록됩니다. API 서버에서만 요청 본문 기록을 끄면 이것까지 막을 수 있었지만, 서버와 전송 계층에 설정 손잡이가 늘어 주변 코드와 모양이 달라집니다. 저는 기존 목록을 그대로 쓰고, 이 남은 경로를 PR 본문의 영향 절에 적는 쪽을 골랐습니다.

처음 올린 판(10월 20일)은 시험이 약 200줄이었습니다. 10월 27일 같은 PR에서 시험을 `json_body` 사례 하나로 줄이고, 코드가 바뀌어 맞지 않게 된 본문 문장을 고쳐 다시 올렸습니다. 시험을 줄이기로 한 것도 제 결정이었습니다. 메인테이너는 11월 1일 줄 댓글이나 리뷰 없이 「merged, thanks!」라고 남기고 머지했습니다([PR #6379 댓글](https://github.com/bluenviron/mediamtx/pull/6379#issuecomment-6556072645)). squash 머지 커밋 [`c12bac19`](https://github.com/bluenviron/mediamtx/commit/c12bac192dc0bfe2fdf970324983ab0f48ffa705)의 다섯 파일은 마지막 제출판 [`70a95beb`](https://github.com/bluenviron/mediamtx/pull/6379/commits/70a95bebc35c94077e99d3d7034d66d849991cf7)과 내용이 같고, 커밋 제목 끝에 `(#6379)`가 붙은 것만 다릅니다. 머지하며 고친 코드는 없습니다.

## 네 판을 빌드해 표지 문자열이 로그에서 사라지는 것을 셌습니다

v1.21.3, 머지 직전 커밋 `9c68b477`, 머지 커밋 `c12bac19`, v1.21.4를 각각 빌드해 같은 설정으로 띄웠습니다. `logLevel: debug`, `authMethod: http`이고, 인증 서버는 모든 요청에 200을 돌려주는 로컬 응답기입니다. 여기에 Control API 요청 4개와 WHEP 요청 1개를 Basic 인증으로 보냈습니다. 비밀 자리에는 모두 `MTX6379W-`로 시작하는 지어낸 표지 문자열을 넣고, 로그에 몇 번 나오는지 셌습니다. 판마다 3번 돌렸고 세 번의 숫자가 같았습니다. 머지 직전 커밋은 v1.21.3과, 머지 커밋은 v1.21.4와 숫자가 같아 아래 표에서 둘씩 묶었습니다.

| 보낸 값 | 실린 곳 | v1.21.3 · `9c68b477` | `c12bac19` · v1.21.4 |
|---|---|---:|---:|
| `srtPublishPassphrase` · `srtReadPassphrase` · `whepBearerToken` | API 경로 추가 본문 | 각 1 | 0 |
| `srtPublishPassphrase` | API 경로 수정 본문 | 1 | 0 |
| `hlsCDNSecret` · 내부 사용자 `pass` | API 전역 설정 수정 본문 | 각 1 | 0 |
| API 비밀번호 | 인증 요청 4개의 `password` · `token` | 8 | 0 |
| WHEP 비밀번호 | 인증 요청의 `password` · `token` | 2 | 0 |
| WHEP 쿼리 `token=` | 요청 줄, 인증 요청의 `query` | 2 | 1 |
| SDP의 `s=` 줄 | WHEP 요청 본문(`application/sdp`) | 1 | 1 |

API에 보낸 비밀 6개와 두 비밀번호를 합친 16번이 0번이 됐습니다. SDP 본문은 머지 뒤에도 그대로 남았습니다. 쿼리 토큰은 인증 요청 본문에서만 빠지고 `POST /probe/whep?token=… HTTP/1.1` 요청 줄에는 남았습니다. 요청 줄은 이 PR의 범위가 아닙니다.

[[fig-body-content-gate]]은 머지 뒤 판에서 세 요청이 지나는 모습입니다. 위 줄의 SDP는 관문을 지나 본문이 로그로 가고, 아래 두 줄의 JSON은 크기만 갑니다.

{{< motion scene="BodyContentGate" id="fig-body-content-gate" kind="재구성" caption="v1.21.4의 debug 로그는 요청 본문의 Content-Type을 먼저 봅니다. WHEP 요청의 SDP 제안(140 B)은 목록에 있어 본문이 남고, 비밀이 든 API 설정 요청(128 B)과 인증 요청(167 B)은 본문을 읽지 않고 (body of N bytes)만 남습니다. 바이트 수와 로그 문구는 재측정의 실제 값이고, 로그 줄은 줄여 그렸습니다." >}}

크기 줄도 맞았습니다. 머지 뒤 두 판의 로그에는 API 요청 본문이 `(body of 128 bytes)` · `(body of 45 bytes)` · `(body of 154 bytes)`로, 인증 요청 본문이 `(body of 167 bytes)` 4줄과 `(body of 259 bytes)` 1줄로 남았습니다. 모두 보낸 바이트 수, 인증 응답기가 받은 바이트 수와 같습니다. 본문이 없는 GET에는 크기 줄이 없었습니다. 인증 응답기가 받은 본문에는 네 판 모두 API 비밀번호가 8번 들어 있었습니다. 바뀐 것은 로그뿐이고, 인증 서버로 가는 본문은 그대로입니다.

## 릴리스에는 들어갔지만 이미 남은 로그와 쿼리 토큰은 그대로입니다

v1.21.4 릴리스 노트에는 이 항목이 두 번 실렸습니다. General 절의 문구는 「Avoid logging sensitive request bodies. Request bodies are now written to the debug log only for the content types already logged in responses (SDP and trickle ICE). Before, JSON bodies of Control API and HTTP authentication requests, including passwords and tokens, appeared verbatim. Other bodies are not read, and their size is logged when known. (#6379)」입니다. API 절의 문구는 「Avoid logging sensitive request bodies. Request bodies are now written to the debug log only for the content types already logged in responses (SDP and trickle ICE). Before, JSON bodies of Control API requests, including passwords and tokens, appeared verbatim. (#6379)」로, HTTP 인증 요청과 마지막 문장이 빠져 있습니다([v1.21.4 릴리스](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.4)).

상류에 올린 수정 가운데 11월 19일 기준 머지된 것은 7건이고, 정식 릴리스에 들어간 것은 6건입니다. PR #6379는 [PR #6427](https://github.com/bluenviron/mediamtx/pull/6427)과 함께 v1.21.4에 들어간 두 건 중 하나입니다([전체 건수](/posts/open-source-analysis/mediamtx-user-srt-passphrase-boundaries/#포크에서-사용할-수-있음과-상류-채택은-별개입니다)).

고친 범위 밖에 남은 것도 있습니다.

- 이미 쓰인 로그 파일과 이미 올린 이슈는 그대로입니다. 업그레이드가 지나간 로그를 지우지는 않습니다.
- 요청 줄의 쿼리 토큰은 남습니다(위 표의 1). PR 본문은 HLS 리다이렉트의 `Location` 헤더와, 잘못된 `source` URL을 그대로 인용하는 오류 메시지도 범위 밖으로 적었습니다. 이 둘은 이번에 재지 않았습니다.
- Content-Type을 `application/sdp`로 속인 API 요청은 본문째 남습니다. 길이를 모르는 chunked 요청에는 크기 줄도 없습니다. 둘 다 PR 본문에 적은 한계이고, 이번 재측정에서는 시험하지 않았습니다.
- API가 응답으로 비밀을 돌려주던 것은 다른 문제입니다. 같은 v1.21.4의 API 절에는 「Redact more secrets and credentials in API output.」 항목이 따로 있습니다([PR #6482](https://github.com/bluenviron/mediamtx/pull/6482) · [PR #6483](https://github.com/bluenviron/mediamtx/pull/6483) · [PR #6484](https://github.com/bluenviron/mediamtx/pull/6484)). JSON 응답 본문은 이 PR 전에도 debug 로그에 크기만 남았습니다.

v1.21.3 이하에서 `logLevel: debug`로 받은 로그를 어딘가에 붙인 적이 있다면, 그 안에 든 API 설정의 비밀과 HTTP 인증 사용자의 비밀번호를 바꾸는 것이 안전합니다. 로그에서 비밀을 지우려면 비밀의 이름을 쫓기보다, 남겨도 되는 형식을 먼저 정하는 편이 새 필드에 덜 흔들립니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 19일 KST 14:32:11–14:32:40에 실행했습니다(그 전 14:31에 설정 확인용 1회). load average(1분)는 시작 14.13, 끝 12.30이었고 같은 기계에서 다른 세션의 작업이 함께 돌았습니다. 줄 수만 세므로 시간 값은 쓰지 않았습니다.
- 기종: MacBook Air(Apple M5, 32GB, 팬 없음), macOS 27.0.1.
- 빌드: Go 1.27.2 darwin/arm64로 [v1.21.3](https://github.com/bluenviron/mediamtx/tree/v1.21.3)(`9540cb6c`), 머지 직전 `9c68b477`, 머지 커밋 `c12bac19`, [v1.21.4](https://github.com/bluenviron/mediamtx/tree/v1.21.4)(`e65f9411`)를 `go build`. 소스는 `git clone --depth 1`(태그)과 `git fetch --depth 2`(머지 커밋)로 받았고, hls.js를 내려받지 않도록 `hls.min.js`를 빈 파일로 두었습니다(측정 설정에서 HLS는 꺼져 있습니다).
- 설정: `logLevel: debug`, 로그는 파일로만, Control API(127.0.0.1:29997)와 WebRTC(127.0.0.1:28889)만 켬, `authMethod: http`, `authHTTPExclude: []`, 인증 주소 `http://127.0.0.1:28181/auth`. 인증 응답기는 Python 3.14 표준 라이브러리로 쓴 서버로, 모든 POST에 빈 본문의 200을 돌려주고 받은 본문을 파일에 적습니다.
- 요청(모두 Basic 인증, 응답 코드): `POST /v3/config/paths/add/probe`(JSON 128 B, 200), `PATCH /v3/config/paths/patch/probe`(JSON 45 B, 200), `PATCH /v3/config/global/patch`(JSON 154 B, 200), `GET /v3/config/paths/get/probe`(200), `POST /probe/whep?token=…`(손으로 쓴 SDP 제안 140 B, 스트림이 없어 404). 요청 5개가 각각 인증 요청 1개를 만듭니다.
- 셈: 서버 로그에서 표지 문자열마다 나온 횟수, `(body of N bytes)` 줄, 인증 응답기가 받은 본문. 판마다 3회, 세 번 모두 같았습니다. 모든 값은 지어낸 시험 값입니다.
- 원자료: 스크립트 · 설정 · 서버 로그 · 받은 인증 본문 · 요약은 [저장소 `_workspace/blog/mediamtx-request-body-log-redaction/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/mediamtx-request-body-log-redaction/measure)에 있습니다.

## 출처

- [bluenviron/mediamtx PR #6379 「http: log request bodies only for the content types logged in responses」](https://github.com/bluenviron/mediamtx/pull/6379) — 본문의 문제 · 변경 · 재현 · 영향 · 할당 수, 2026-11-01 머지(머지 커밋 [c12bac19](https://github.com/bluenviron/mediamtx/commit/c12bac192dc0bfe2fdf970324983ab0f48ffa705)), [제출판 70a95beb](https://github.com/bluenviron/mediamtx/pull/6379/commits/70a95bebc35c94077e99d3d7034d66d849991cf7)
- [MediaMTX v1.21.4 릴리스 노트](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.4) — General · API 절의 「Avoid logging sensitive request bodies」 두 문구, 「Redact more secrets and credentials in API output」
- [v1.21.3 `internal/protocols/httpp/request_for_log.go`](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/protocols/httpp/request_for_log.go) · [`handler_logger.go`](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/protocols/httpp/handler_logger.go) · [`logger_transport.go`](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/protocols/httpp/logger_transport.go) · [`internal/auth/manager.go`](https://github.com/bluenviron/mediamtx/blob/9540cb6c1d9f1e9351fcc4ded3afc249ffff22bc/internal/auth/manager.go)
- [v1.21.4 `internal/protocols/httpp/request_for_log.go`](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/internal/protocols/httpp/request_for_log.go) · [`internal/api/api_config_paths.go`](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/internal/api/api_config_paths.go) · [`mediamtx.yml`](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/mediamtx.yml) · [`internal/conf/conf.go`](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/internal/conf/conf.go) · [`.github/ISSUE_TEMPLATE/bug.yml`](https://github.com/bluenviron/mediamtx/blob/e65f9411a56b19076a0dfde1fb4a59414bdf642c/.github/ISSUE_TEMPLATE/bug.yml)
- [v1.0.0 `internal/httpserv/handler_logger.go`](https://github.com/bluenviron/mediamtx/blob/27260572fc3416b32e3fe22f4f535877ad54127b/internal/httpserv/handler_logger.go) — `httputil.DumpRequest(r, true)`
- [PR #6325 「http: log outbound requests」](https://github.com/bluenviron/mediamtx/pull/6325) — 2026-10-11 KST 머지, v1.21.3
- [PR #5859 「print body of selected HTTP responses when log level is debug」](https://github.com/bluenviron/mediamtx/pull/5859) · [PR #5858 「limit size of HTTP requests shown in debug logs」](https://github.com/bluenviron/mediamtx/pull/5858) · [PR #5873 「redact sensitive headers in HTTP debug logs」](https://github.com/bluenviron/mediamtx/pull/5873)
- [PR #6306 「srt: add srtPassphrase to users」](https://github.com/bluenviron/mediamtx/pull/6306)
- [MediaMTX가 SRT 암호를 사용자별로 받게 제안했습니다](/posts/open-source-analysis/mediamtx-user-srt-passphrase-boundaries/) — 상류 수정의 머지 · 릴리스 건수
