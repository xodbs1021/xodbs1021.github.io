# 근거 — pokeclip-shared-db-auth-iam-tls (2026-11-07 새 글, PR #21 글 대체)

확인 날짜 2026-11-07. 원문은 공개 저장소 3K-PokeClip/PokeClip-mono 와 볼트(비공개) 기록.

| 주장 | 근거 | 종류 | 수행 주체 |
|---|---|---|---|
| 사이드카 · janitor 가 IAM 토큰으로 붙음, pgconf · iam.go 한 곳 · DSN 두 벌 제거 | mono PR #314 본문 · merge `7f99ccd1`(2026-10-23 01:52 KST) · `media/internal/pgconf/*.go` | 코드 | 결정 kty · 구현 AI 에이전트 |
| BeforeConnect 연결마다 토큰 · 10초 상한 · pgx#2545 | `pgconf.go` L260–277, L54 · github.com/jackc/pgx/issues/2545(열림, 11-07 확인) | 코드 · 문헌 | AI |
| verify-full 강제 · require/verify-ca 기각 사유 | mono ADR-0006 `docs/decisions/2026-10-23-rds-iam-db-auth.md` Alternatives · 볼트 결정 노트 | 결정 | kty |
| 기동 거부 조합 | `pgconf.go` validate L137–172 · checkIAMHost · L109–110 PGSSLROOTCERT | 코드 | AI |
| CA 번들 커밋 · Dockerfile sha256 · root 0644 | PR #314 본문 · 볼트 결정 노트 2절 | 코드 | AI |
| 거부 갈래 4 · 44분 · 재시작 0 · pg_stat_ssl TLSv1.3 · janitor 강제 종료 2회 재로그인 | 볼트 raw `pok311-RDS-IAM-DB인증-2026-10-22/실측/2026-10-22-pok311-rds-iam/verdict.md.txt` | 실측(실험 RDS 1대, PG 17.11, 서울, 2026-10-22) | AI 실행 · kty 승인 |
| 토큰 수용 16/18/19.5 수용 · 20.5/22/30 거부, 시계 = AWS Date | 같은 verdict R4 진단 | 실측 1대 · 1회 | AI |
| SigV4 5분 허용과 연관 | 같은 verdict — 「추정, AWS 문서 대조 안 함」 | 추정 | — |
| 15분 단정 문장 → 리뷰 지적 → 정정 | 볼트 결정 노트 4절(PR 단계 H, c5527d38) | 기록 | AI · 리뷰 |
| 첫 IAM 로그인 5.6초 · 이후 0.5초 · 원인 미측정 | verdict 한계 절 | 실측 | AI |
| media_indexer 최초 권한(SELECT·INSERT·UPDATE, cutoffs SELECT·INSERT, DELETE·DDL 없음) · 실 PG 역할 시험 | PR #314 본문 | 코드 · 시험 | AI |
| 10-26 DELETE 부여 · seq 하한 트리거 · 정의자 함수 PUBLIC EXECUTE 회수(HIGH 실측) · TG_RELID 확인 | 볼트 `결정-M6권한-media_indexer-DELETE-하한트리거-정의자함수EXECUTE회수-2026-10-26` · mono ADR-0006 개정 노트 | 결정 · 실측 | kty 결정 · AI |
| search_path 가로채기 실측 · pg_catalog 한정 · 음성 대조 · 근본은 앱별 스키마(ADR-0007) | 볼트 `결정-prod런타임-1단가-…-2026-10-23` 10항 · mono PR #365 | 실측 · 결정 | AI · kty |
| db_connected 줄 · tls 는 실제 연결 기준 | `connected.go` | 코드 | AI |
| 2026-11-03 운영 첫 기동 점검 통과(SIDECAR_DB · 풀 둘 · JANITOR_DB) | 볼트 `specs/HTTPS-엣지-2026-10-06/출시v1.0.0-O7e-O7f-O8준비-2026-11-03` 6절 | 운영 기록 | kty · AI |
| 앱 서버 넷: 제안 kty, 스파이크 · 구현 팀원 | 볼트 `결정-앱서버DB접속-RDS-IAM-서버별사용자-2026-10-23` · PR #336/#340/#343 작성자 | 기록 | 팀원 |
| HikariCredentialsProvider + RdsUtilities · 32분 187토큰 실패 0 · S3 20초(TLS) | PR #336 본문 S2 · S3 | 실측(팀원) | 팀원 |
| JDBC 래퍼 #2157(11-04 닫힘) · 허용 목록 전환 경위 | PR #336 · github.com/aws/aws-advanced-jdbc-wrapper/issues/2157(closed 2026-11-04) | 문헌 · 코드 | 팀원 |
| 서버별 사용자 · V316 표 주인 GRANT · DbRoleGrantsTest 42501 | PR #343 본문 | 코드 · 시험 | 팀원 |
| 정적 키 · ~/.aws 우선 · password 되돌리기 절차 | 볼트 결정 노트 6절 · PR #314 Rollback | 기록 | — |

미확인: Java 서버 넷의 운영 IAM 기동 결과(글에서 다루지 않음 명시).

## 지운 옛 자산(의도)

kty 지시(2026-11-07 「기존꺼 삭제하고 이거 올려」)로 PR #21 글을 버리고 같은 주소에 새로 썼다. 옛 글만 쓰던 자산 셋을 지웠다 — `static/images/pokeclip-shared-db-auth-iam-tls-access-illustration.png` · `…-iam-connection-lifetime-poster.jpg` · `static/videos/…-iam-connection-lifetime.mp4` 와 장면 `IamConnectionLifetime`. 사이트 안 참조 0건(git grep). 외부에서 이 파일 주소를 직접 건 경우는 깨질 수 있다(되살리려면 main 이력에서 복원).

## 2026-11-12 다시 씀(묶음 9)

- 제목 「DB 비밀번호 대신 연결마다 RDS IAM 토큰을 만들었습니다」, '~습니다' 통일, 옛 소제목 id 10개 순서 보존 + `측정-조건` 추가.
- ⑥절은 요약 + 새 글 `pokeclip-shared-db-login-privileges` 링크로 줄임. Java 항목의 서버별 사용자도 새 글로.
- ADR 번호 → 날짜(10월 23일 결정 기록). 원시 `<figure><video>` → `{{< motion >}}`, 차트에 `kind="실측"` · `id` · `source` → `data/legacy-figure-gaps.json`에서 이 글 항목 삭제.
- 상류 상태 재확인(2026-11-12): pgx#2545 열림, aws-jdbc#2157 2026-11-04T16:29Z 닫힘, #2198 2026-10-22T19:42Z 머지, #314 2026-10-22T16:52Z 머지.
- 역할: 네 결정과 Java 적용 제안은 글쓴이, Go 구현 · 실험은 AI(AWS 쓰기는 글쓴이 승인), 11/3 인프라 적용은 글쓴이 직접, Java 구현은 팀원.
