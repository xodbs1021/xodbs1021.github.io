# evidence — multicloud-migration-design (2026-11-10 다시 쓰기)

유형: 의사결정 (post-types.md). 시리즈 1편(설계와 바뀐 결정). 2편(AWS↔GCP 양방향 전환 실험)은 별도 글. 11-01 판의 근거 메모는 git 기록(origin/main 30247ee 이전)에 있다.

## 역할

- 사용자(김태윤): 클라우드↔클라우드(AWS↔GCP) 이전 담당. 설계 원칙(단일 쓰기 DB, 2026-10-31 AI와 논의해 결정), 본선 범위·전환 방식 선택(2026-11-07), crosscloud PR 구현 지시·리뷰·머지, 11-08 실험 준비·실행·원복.
- 팀원(이름 비공개 — 사용자 결정 2026-11-10): 전환 상태 머신 `migration.cloud`(Hackathon PR #61), 접수 큐 durable-ingress(sample-app `src/durable-ingress`), 실험에 쓴 gitops 경로.
- AI: crosscloud 구현·리뷰(Codex, Claude Code). 설계 논의(Codex).
- 실험 경로에 사용자 crosscloud 어댑터(#84)·리허설(#118)은 들어가지 않았다(볼트 specs/2026-11-08-crosscloud-pr118…: "#118 고정물 리허설은 실행하지 않는다", 실험은 팀원 gitops `apps/cloud-migration-aws`, 원장 29: 접수 큐 초기 대상 aws).

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 상태 순서 PRECHECK→COPYING→READY→FENCING→DRAINING→STOPPING→SWITCHING→COMPLETED | https://github.com/SoftBankHackathon2026/Hackathon/blob/main/migration/CLOUD_MIGRATION.md (2026-11-10 확인, 28–48행) | 공개 코드 문서 |
| FENCING: 원본 테이블을 한 트랜잭션에서 잠그고 ALWAYS 트리거 설치 | 같은 문서 38–39행 | 공개 |
| DRAINING·STOPPING에서 기본키별 모든 열 전체 비교, 누락·추가·변경 0까지 | 같은 문서 40–43행 | 공개 |
| SWITCHING 이후 오류 → NEEDS_RECOVERY, 자동 재시도·롤백 금지 | 같은 문서 106–108행 | 공개 |
| 즉석 귀환/롤백 미제공, 역방향 = 새 job_id + 새 빈 대상 + 반대 설정 | 같은 문서 27–28행 | 공개 |
| CDC = Debezium source + 테이블별 JDBC sink, 기본키 upsert | 같은 문서 34–36행 | 공개 |
| 접수 큐: Redis Stream XADD 후 202 accepted | https://github.com/SoftBankHackathon2026/sample-app/blob/main/src/durable-ingress/service.js (29, 229행) | 공개 |
| 원본 파악·대상 판정(읽기 전용, 사람 결정이 남으면 종료 코드 3) | https://github.com/SoftBankHackathon2026/Hackathon/pull/78 + 볼트 architecture.md 「전환 방식·감사 기록」 | 공개 PR |
| AI 코드 적응 시연 제외("비밀번호 앱만"), 결합 탐지는 유지 | 볼트 ADR-005 3번 | 내부 결정 |
| DNS 가중치 전환 → 접수 큐 전달 대상 전환으로 대체 | 볼트 ADR-005 1번 | 내부 결정 |
| 11-08 결과: AWS→GCP 1,083=1,083, 복사 80초, 승인→전환 23초 / GCP→AWS 2,734=2,734, 82초, 21초 / 봇 쓰기 2,582건 실패 0·결과 불명 0 | 팀 내부 보고서(Notion, 비공개) + 볼트 specs/2026-11-08-team-demo… | **비공개 실측** — 사용자 결정 "비공개 실측으로 공개" |
| 실험 Git 변경과 원복 | gitops PR #85 #87 #89 #92 (공개) | 공개 |
| fall forward 권고, 직접 역복제는 시험 불가로 비권장 | https://aws.amazon.com/blogs/database/rolling-back-from-a-migration-with-aws-dms/ | 문헌 |
| crosscloud PR 목록 | Hackathon #71 #77 #78 #80 #82 #84 #86 #118 (모두 merged, 2026-11-10 gh api 확인) | 공개 |

## 넣지 않는 것

계정 ID, 클러스터·DB 인스턴스 이름, 내부 IP, Slack·Notion 주소, 팀원 이름.

## 미확인 → 확인 (2026-11-10, 팀 내부 보고서 원문 대조)

- 준비 약 4시간: 07:10 읽기 전용 확인부터 11:39 전환까지(원장은 첫 변경 09:54부터 기록).
- PostgreSQL: 원본 RDS 16.15, 대상 Cloud SQL PG16.
- 봇 2,582건은 두 번 전환 누적, 시도 2,582 / 커밋 2,581(1건 처리 중), 실패·오류·결과 불명 0.
- 지연: AWS→GCP p95 1,079ms · p99 1,311ms · 최대 8,249ms(전환 정지 구간, 11:48 집계). GCP→AWS 최근 창 최대 4,139ms(12:07 집계).
- 사용자 직접 실행 명령 9회(권한 분류기 차단으로 사용자가 붙여 넣어 실행). 나머지 클러스터 명령은 Claude Code.
