# measurements — 공개 재측정(2026-11-19)

수행: AI(Claude Code). 2026-11-19 KST 14:31 시험 1회(판 2개, 설정 확인용, 원자료 버림), 14:32:11–14:32:40 본측정. load average(1분) 시작 14.13, 끝 12.30.

## 환경

- MacBook Air(Apple M5, 32GB, 팬 없음), macOS 27.0.1. 같은 기계에서 다른 세션의 작업이 함께 돌았다(줄 수만 세므로 시간 값은 쓰지 않음).
- Go 1.27.2 darwin/arm64, Python 3.14.5(표준 라이브러리만).
- 빌드(`measure/build.sh`): `git clone --depth 1 --branch v1.21.3`(`9540cb6c`), `--branch v1.21.4`(`e65f9411`), 머지 커밋 `c12bac19`와 그 부모 `9c68b477`(`git fetch --depth 2` + worktree). `internal/core/VERSION`은 손으로 쓰고, `internal/servers/hls/hls.min.js`는 빈 파일(hls.js를 내려받지 않음, 측정 설정에서 HLS 꺼짐).

## 방법

`measure/run.py`가 판마다 3회: 인증 응답기(`auth_server.py`, 127.0.0.1:28181, 모든 POST에 200 · 받은 본문 기록) → MediaMTX(`mediamtx.yml`: `logLevel: debug`, 파일 로그, API 127.0.0.1:29997 · WebRTC 127.0.0.1:28889만, `authMethod: http`, `authHTTPExclude: []`) → 요청 5개(모두 Basic 인증) → SIGINT → 표지 문자열 셈.

| 요청 | 본문 | 응답 |
|---|---|---|
| POST /v3/config/paths/add/probe (application/json) | srtPublishPassphrase · srtReadPassphrase · whepBearerToken, 128 B | 200 |
| PATCH /v3/config/paths/patch/probe (application/json) | srtPublishPassphrase, 45 B | 200 |
| PATCH /v3/config/global/patch (application/json) | hlsCDNSecret · authInternalUsers[].pass, 154 B | 200 |
| GET /v3/config/paths/get/probe | 없음 | 200 |
| POST /probe/whep?token=… (application/sdp) | 손으로 쓴 SDP 제안(`s=MTX6379W-SDP`), 140 B | 404(스트림 없음) |

API 요청 4개와 WHEP 요청 1개가 각각 인증 요청 1개를 만든다(인증 본문 167 B × 4, 259 B × 1).

## 결과(3회 모두 같음, `measure/summary.txt`)

| 표지 | 실린 곳 | v1.21.3 | 9c68b477 | c12bac19 | v1.21.4 |
|---|---|---:|---:|---:|---:|
| SRTPUB-A · SRTREAD · WHEPBEARER | API paths/add 본문 | 각 1 | 각 1 | 0 | 0 |
| SRTPUB-B | API paths/patch 본문 | 1 | 1 | 0 | 0 |
| HLSCDN · USERPASS | API global/patch 본문 | 각 1 | 각 1 | 0 | 0 |
| APIPASS | 인증 본문 password · token(API 요청 4개) | 8 | 8 | 0 | 0 |
| WHEPPASS | 인증 본문 password · token(WHEP) | 2 | 2 | 0 | 0 |
| QUERYTOKEN | WHEP 요청 줄 + 인증 본문 query | 2 | 2 | 1 | 1 |
| SDP | WHEP 요청 본문 | 1 | 1 | 1 | 1 |

- 남은 QUERYTOKEN 1회는 `[WebRTC] … [c->s] POST /probe/whep?token=… HTTP/1.1` 요청 줄.
- 머지 뒤 두 판의 `(body of N bytes)` 줄: 요청 본문 128 · 45 · 154, 인증 요청 167 × 4 · 259 — 보낸 바이트 수 · 응답기가 받은 바이트 수와 같다. 본문 없는 GET에는 크기 줄이 없다. 나머지 크기 줄(15 · 2320/2328 · 67)은 응답 본문이고 네 판 모두 있다.
- 인증 응답기가 받은 본문에는 네 판 모두 APIPASS 8회, WHEPPASS 2회 — 보내는 본문은 그대로이고 로그만 달라졌다.
- `auth_requests_logged`(`[c->s] POST /auth` 줄) 네 판 모두 5.

- 원자료 `raw/*/run*/mediamtx.yml` 1행 주석은 실행 뒤 고쳤습니다(주석 안의 자리 표시가 run.py 치환에 함께 바뀌어 있었음). 설정 값은 그대로입니다. `build.sh`는 같은 날 손으로 실행한 순서를 스크립트로 옮긴 것입니다.
