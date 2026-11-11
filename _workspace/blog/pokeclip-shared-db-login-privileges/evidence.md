# 근거 — pokeclip-shared-db-login-privileges (2026-11-12, 원래 글 ⑥절에서 나눔)

유형: 트러블슈팅 + 설계. 확인 날짜 2026-11-12. 코드 기준 PokeClip-mono develop `825a3dfe`. 공개 근거만. 실측 요약은 ../pokeclip-shared-db-auth-iam-tls/measurements.md 와 PR 본문.

| 주장 | 근거 | 종류 | 수행 주체 |
|---|---|---|---|
| media_indexer 첫 권한 SELECT·INSERT·UPDATE(cutoffs SELECT·INSERT), DELETE·DDL 없음, PG17 역할 시험 | PR #314 본문 | 코드 · 시험 | 범위 결정 글쓴이 · 구현 AI |
| 지금 운영 GRANT(그림) | infra/terraform/prod/runtime/sql/30_grants.sql | 코드 | AI |
| 서버별 사용자, 교차 접근 넷, V316 표 주인 GRANT, 기본 권한 기각 사유, DbRoleGrantsTest 42501 | PR #343 본문(10/24 KST 머지) · 비공개 결정 기록(10/23 제안) | 코드 · 시험 | 방향 제안 글쓴이 · 구현 · 시험 팀원 |
| 앱 사용자에 public CREATE(PG15+ 기본 막힘) | PR #365 본문 · PostgreSQL 문서 | 코드 · 문헌 | AI |
| search_path 가로채기 실측(pg_advisory_xact_lock(integer)이 media_indexer 신분으로) | PR #365 본문 · pgtest/searchpath.go 머리 주석(2026-10-24 실측) | 실측 | AI |
| pg_catalog 한정 · 덫 음성 대조 | PR #365 · media/internal/index/store.go 229 · pgtest/searchpath.go | 코드 · 시험 | AI |
| 근본 정리는 따로(10/24 결정) | docs/decisions/2026-10-24-app-schemas.md | 결정 | 글쓴이 |
| PR #423(10/26 KST): 서버별 스키마, public CREATE · CONNECT 회수, TEMP 0, 앱 덫 시험 | PR #423 본문 · 10_roles.sql 71–105 | 코드 | AI |
| advisory 실행 권한은 회수하지 않음(다섯 계정 사용) | 50_advisory_probe.sql 1–15 | 코드 | 결정 글쓴이 |
| 10/26 DELETE 부여 · seq 하한 표 · 트리거 둘 | PR #440 본문 · docs/decisions/2026-10-26-media-indexer-m6-delete-grants.md | 코드 · 결정 | 결정 글쓴이 · 구현 AI |
| 정의자 함수 PUBLIC EXECUTE → 남의 하한 오염(HIGH 재현), 회수 + 대상 표 확인 42501 + 검증 단언 | PR #440 본문 | 검수 · 실측 | AI |
| 남은 위험(INSERT+DELETE로 하한 올림, TRUNCATE · 복제 모드) | PR #440 본문 · 결정 기록 | 기록 | — |
| CREATE TRIGGER 에 함수 EXECUTE 필요, 발화 때는 안 봄 | PostgreSQL 17 CREATE TRIGGER 문서 · PR #440 본문 | 문헌 · 기록 | — |

제외: 고정 커밋 이후 stream_edge_bounds 권한 변경(PR #499).
