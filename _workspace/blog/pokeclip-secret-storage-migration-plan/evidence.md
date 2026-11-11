# 근거 — pokeclip-secret-storage-migration-plan (2026-11-12 다시 씀)

유형: 이전 · 개편 회고. 확인 날짜 2026-11-12. 코드 기준 develop `825a3dfe`. 공개 근거만.

| 주장 | 근거 | 종류 | 수행 주체 |
|---|---|---|---|
| streamid_hash · passphrase_ref, 원문 없음 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/db/migration/V104__create_stream_keys.sql#L4-L8 | 코드 | 팀원 |
| 7/23 저장 위치 결정과 네 대안 | 비공개 결정 기록 | 결정 | 글쓴이 |
| 처음 구현은 PG secrets 표 AES-256-GCM | PR #218 본문 「무엇」 · AesGcmCipher.java · application.yml 190–197 | 코드 | 팀원 |
| #218 10/6 17:08 KST 머지(3cc55d4c), 머지 전 조건(역할 정책 · .env) | gh pr view 218 | 기록 | 구현 팀원 · 선행 조건 글쓴이(AI와 함께) |
| 같은 날 dev Auth type=AWS 기동 · 2주 병행 | 비공개 작업 기록(사용자 지시로 사실 확인) | 기록 | 팀원 |
| 10/7 지연 재측정: 최대 1.036초, 응답기 시한 1.125초 | 비공개 실험 기록 — 본문에 「팀 내부 실험 기록 기준 비공개 실측」 표기 | 실측 | 글쓴이(AI와 함께) |
| #303 10/22 병행 종료, postgres로 되돌리는 길 없음 | gh pr view 303 본문 | 기록 | 팀원 |
| 운영은 처음부터 aws | prod/platform/services.tf 81–86 · README 208–209 | 코드 | — |
| Auth 작업 역할은 스트림 키 접두 한정, 와일드카드 금지 검사 | task_policies.tf 16–31 · variables.tf 281–292 | 코드 | — |
| 미디어 역할은 이름 지정 비밀만(CDN · 시험 키 · 런타임) | modules/media_host/iam.tf 51–60 | 코드 | — |
| 응답기가 Auth 판정으로 passphrase를 받음, 머지만으로 동작 변화 없음 | PR #392 본문 | 기록 | — |
| 방송 플랫폼 OAuth 토큰은 PG AES-256-GCM | application.yml 190–197 | 코드 | — |
| PDF 29쪽 「전환을 준비 중」 | static/portfolio/2026-10-15-v2/full.pdf 29쪽 | 원문 | — |
