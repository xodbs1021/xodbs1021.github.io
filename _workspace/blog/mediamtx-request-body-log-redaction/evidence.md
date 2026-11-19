# evidence — mediamtx-request-body-log-redaction

글 유형: 트러블슈팅(증상 → 원인 → 조치 → 전후 비교 → 한계). 확인일: 2026-11-19.

## 주장과 근거

| 주장 | 근거(공개) | 확인 | 수행 · 범위 |
|---|---|---|---|
| v1.21.3 `RequestForLog()`는 Content-Type과 상관없이 요청 본문을 10 KiB까지 읽어 로그 문자열에 넣었다 | v1.21.3 `internal/protocols/httpp/request_for_log.go` 13행(상수) · 60–82행 | 소스 직접 읽음 | AI(Claude Code) |
| 받는 HTTP 요청은 `handlerLogger`(82행), 보내는 요청은 `LoggerTransport`(52행)가 이 함수로 debug에 남긴다 | v1.21.3 `handler_logger.go` 82행, `logger_transport.go` 52행 | 소스 | AI |
| `LoggerTransport`를 쓰는 곳: 인증 관리자, HLS · WebRTC 정적 소스, WebRTC 전달 | v1.21.3 `auth/manager.go` 120행, `staticsources/hls/source.go` 102행, `staticsources/webrtc/source.go` 112행, `forward/webrtc/dest.go` 109행 | grep | AI |
| HTTP 인증 요청 본문에 `password` · `token` · `query`가 실린다 | v1.21.3 `auth/manager.go` 207–241행 | 소스 | AI |
| 보내는 요청 기록은 PR #6325(`0b1fb9e1`, 2026-10-10, 작성자 aler9)부터, 첫 릴리스 v1.21.3 | `gh api compare 0b1fb9e1...v1.21.2` = behind, `...v1.21.3` = ahead | API | AI |
| 받는 요청 본문을 debug에 남기는 동작은 v1.0.0(2023-08-08)에도 있었다(`httputil.DumpRequest(r, true)`), API 서버도 같은 handlerLogger를 쓴다 | v1.0.0 `internal/httpserv/handler_logger.go` 52–56행, `wrapped_server.go` 65행, `core/api.go` 300행 | 소스(gh api) | AI. v1.0.0보다 이른 판은 확인하지 않음 |
| 기본 로그 수준은 info | v1.21.4 `mediamtx.yml` 10행, `internal/conf/conf.go` 447행 | 소스 | AI |
| 버그 보고 양식의 로그 칸 안내 문구(필수 칸 아님) | `.github/ISSUE_TEMPLATE/bug.yml` 77–82행(v1.21.4) | 소스 | AI. 실제 공개 이슈에 비밀이 실린 사례는 찾지 않음 |
| 응답 본문은 이미 SDP · trickle-ICE 목록으로만 남겼다 | v1.21.3 `handler_logger.go` 11–14 · 33행, `logger_transport.go` 24 · 40–41행; 목록 도입 PR #5859(`d0cf2946`), 맵 이동 PR #5875(`28d648da`), 10 KiB 자르기 PR #5858(`959f58ce`) | 소스 · 커밋 목록 | AI |
| PR #6379: 2026-10-19T16:58:42Z 생성(KST 10-20 01:58), 2026-11-01T09:23:53Z 머지(aler9, 댓글 "merged, thanks!"), 리뷰 · 줄 댓글 0 | `gh pr view 6379 --json …`, `gh api …/pulls/6379/comments` = 0, `/reviews` = 0 | API | AI |
| 처음 올린 head `08f0877c`(시험 +200줄 안팎) → 10-27 같은 PR에 다시 올린 head `70a95beb`(5파일 +28 −3) | 비공개 작업 기록, 현재 PR commits = `70a95beb`(committedDate 2026-10-26T20:24:59Z) | 기록 · API | 사용자 결정(같은 PR 고치기 · 시험 축소), AI 실행 |
| 머지 커밋 `c12bac19`(squash, 부모 `9c68b477`)의 변경은 `70a95beb`와 같다: 5파일 blob 해시 모두 같음, 패치 동일(index 줄 제외). 메시지 제목 끝에 `(#6379)`만 붙음 | `git diff 70a95beb~1 70a95beb` vs `git diff c12bac19~1 c12bac19`, `git rev-parse <c>:<file>` | 로컬 비교(삭제 전 `measure/pr6379-head-70a95beb.diff` 보관) | AI |
| v1.21.4(2026-11-15T13:33:52Z 게시) 릴리스 노트에 두 문구 | `gh release view v1.21.4` 본문 General 절 · API 절 | 원문 복사 | AI |
| 할당 수(GET 7→7, JSON 22B 18→14, SDP 5B 18→19) | PR 본문 Impact 절 | PR 본문 인용 | 당시 AI 측정(이번 재측정 아님) |
| 역할: 범위 · 검증 기준 · 제출은 사용자, 구현 · 실측은 AI | 비공개 작업 기록: 10-19 사용자 결정(목록 재사용 안 채택 · Content-Type 위장 잔여를 본문에 명시 · 쿼리 토큰 제외 · 이름 `bodyContentToLog` · API 서버별 끄기 안 기각), 게시 승인, 10-27 사용자 지시(같은 PR 고치기 · 시험 축소) | 기록(읽기만) | — |
| 발견 경위: 10-19 SRT 사용자 암호 PR(PR #6306) 재점검 중 | 비공개 작업 기록의 착수 항목 | 기록 | 누가 처음 봤는지는 기록에 없음 → 글에 주체를 쓰지 않음 |
| 공개 재측정 결과 표 | `measurements.md`, `measure/` | 2026-11-19 실행 | AI(Claude Code) |

## 공개하지 않는 것

비공개 기록의 경로, 팀원 이름, 제품 운영 정보, 이슈 관리 키. 측정값은 모두 `MTX6379W-`로 시작하는 지어낸 값.

## 원천과 어긋난 것

- 지시문 「버그 보고 양식이 debug 로그를 요구」: 양식은 「로그가 도움이 된다고 생각하면 debug로 두고 첨부」하라고 안내하고, 로그 칸은 필수가 아니다(`validations` 없음). 글은 「안내합니다」로 썼다.
- PR 본문 재현 절의 「HLS run」 집계(3회 읽기)는 이번 재측정에서 하지 않았다. 대신 WHEP 요청 하나의 쿼리 토큰을 셌다.
- `mediamtx-certloader-no-watcher-shutdown.md` 본문은 PR #6427을 「11월 13일 기준 미릴리스」로 적고 있다. 당시 기준 서술이라 틀린 것은 아니지만, v1.21.4에 들어갔다는 갱신은 그 글에 없다(이 작업 범위 밖, 고치지 않음).
