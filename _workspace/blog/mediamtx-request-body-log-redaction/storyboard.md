# storyboard — mediamtx-request-body-log-redaction

## BodyContentGate (반복 영상, 11초, 1920×1080 + 휴대폰판 1080×1350)

주장 하나: v1.21.4(PR #6379 머지 뒤)의 debug 로그는 요청 본문을 Content-Type 목록으로 거른다. SDP 본문은 그대로 남고, JSON 본문(비밀 포함)은 크기만 남는다.

- 위: 제목 「v1.21.4 · debug 로그」, 그 아래 범례 「본문을 남기는 목록: application/sdp · application/trickle-ice-sdpfrag」(휴대폰은 「SDP · trickle ICE」).
- 세 줄(레인). 왼쪽 요청 카드 · 가운데 관문 칸 · 오른쪽(휴대폰은 아래) 로그 줄.
  1. `application/sdp` · WHEP 제안 140 B — 0.7초에 본문 꾸러미가 관문으로, 관문 ✓ 청록, 꾸러미가 로그로, 로그 `POST /probe/whep` + `s=MTX6379W-SDP`(청록).
  2. `application/json` · API 설정 128 B · 「비밀」 빨간 이름표 — 3.7초에 꾸러미가 관문으로, 관문 ✕(회색 · 본문 안 읽음), 꾸러미가 회색 「128 B」로 바뀌어 로그로, 로그 `POST …/paths/add/probe` + `(body of 128 bytes)`.
  3. `application/json` · 인증 요청 167 B · 「비밀」 — 6.7초에 같은 흐름, 로그 `POST /auth` + `(body of 167 bytes)`.
- 마지막 상태 변화(약 9.3초) 뒤 1.7초 멈춤. 끝 프레임(포스터, 320)은 세 로그 줄이 모두 있는 상태.
- 숫자는 재측정 원자료와 같다: SDP 140 B(WHEP 요청), API paths/add 128 B, 인증 요청 167 B(measure/raw/*/run1/statuses.json · auth_bodies.jsonl, v1.21.4 로그의 `(body of N bytes)`).
- 성격: 재구성(실측 줄을 줄여 다시 그림). 관문은 `RequestForLog()` 의 `bodyContentToLog` 판정을 빗댄 칸.
- 색: 통과 = accent, 비밀 이름표 = danger, 크기만 = muted. 소재 그림 없음(코드로 그림).
