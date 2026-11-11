# 콘티 — SecretPathOneConnection (12초 · 360프레임 · 포스터 350 · 휴대폰판 있음)

- 상자: OBS · MediaMTX · 응답기 · Auth · Secrets Manager 한 줄, PG는 Auth 아래(휴대폰판은 오른쪽). MediaMTX와 응답기는 「미디어 서버」 점선 묶음.
- 차례: streamid(OBS→MediaMTX) → 인증 요청 → 판정(응답기→Auth) → 해시로 찾기(Auth→PG) → 비밀 이름 → 이름으로 읽기(Auth→SM, SM 강조) → 원문 → passphrase(Auth→응답기→MediaMTX, 강조색) → 「암호 연결 성립」.
- 정적 그림: Mermaid 타임라인(7/23 결정 → 개발 10/6 #218 · 병행 · 10/22 #303 / 운영 처음부터 SM · 10/25 #392 · 11/3 v1.0.0).
