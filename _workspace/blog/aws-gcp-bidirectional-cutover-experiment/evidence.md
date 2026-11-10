# evidence — aws-gcp-bidirectional-cutover-experiment (2026-11-10 새 글)

유형: 실험·트러블슈팅(post-types.md). 시리즈 2편. 1편 = projects/multicloud-migration-design(설계와 바뀐 결정).

## 원자료

- 팀 내부 보고서(Notion, 비공개): 「[김태윤] 2026-11-08 AWS↔GCP 양방향 전환 실험 보고서 — 팀 데모 EKS·RDS ↔ GKE·Cloud SQL」, 2026-11-10 원문 대조. 본문의 실측은 모두 여기서 왔고 "팀 내부 보고서 기준의 비공개 실측"으로 표기.
- 변경 원장(볼트 raw/multicloud-migration/2026-11-08-team-demo/29_cc_team-demo-change-ledger_r1.md): 시각, 사용자 직접 실행 여부, 원복 명령.
- 공개: gitops PR #85 #87 #89 #92, Hackathon `migration/CLOUD_MIGRATION.md`.

## 역할 (보고서 「요약」「실행 절차」, 원장)

- 사용자(김태윤): 클라우드↔클라우드 담당, 방식 결정, 단계 승인, gitops PR 머지, 권한 분류기에 막힌 명령 9회 직접 실행(EKS 허용 목록, Terraform apply, CAA, 대상 DB 스크립트, GRANT 등).
- AI(Claude Code): 나머지 클러스터 명령, 변경 원장 기록. AI(Codex): 원장·gitops PR 리뷰(원복 순서 오류 4건 사전 발견 — 보고서 「잘된 점」).
- 팀원(이름 비공개): 전환 도구 migration.cloud·접수 큐(설계·구현), RDS 쪽 Secret 입력과 로그인 확인, AWS 인프라 기동.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 07:10 읽기 전용 확인 시작, 첫 변경 09:54, AWS→GCP 복사 11:37:05–11:38:25(80초), 승인 11:39:13–11:39:36(23초) | 보고서 실행 절차 7, 원장 #1 #24–26 | 비공개 실측 |
| 역방향 11:58 새 DB → 12:04:56 복사 → 12:06:18 READY → 12:06:44 승인 → 12:07:05 COMPLETED | 보고서 역방향 타임라인 | 비공개 실측 |
| 원복 12:13–12:58 | 보고서 원복 기록 | 비공개 실측 |
| 전체 비교 1,083=1,083 / 2,734=2,734, missing·extra·changed 0, source_fenced true | 보고서 전환 도구 출력 JSON | 비공개 실측 |
| 봇: 11:48 시도 1,413 / 커밋 1,412, p95 1,079ms, p99 1,311ms, 최대 8,249ms(전환 정지 구간), 읽기 오류 4 | 보고서 「사용자 요청」 | 비공개 실측 |
| 봇: 12:07 누적 시도 2,582 / 커밋 2,581, 실패·오류·결과 불명 0, 최근 창 p95 1,084ms, p99 1,139ms, 최대 4,139ms | 보고서 「역방향 검증」 | 비공개 실측 |
| 원본 RDS PostgreSQL 16.15, rds.logical_replication=1 이미 켜짐, 표 public.migration_demo 1개 | 보고서 요약·실행 전 상태 | 비공개 실측 |
| 막힌 곳 9개(증상·원인·조치·재발 방지) | 보고서 「근본 원인 분석」 | 비공개 |
| 9초 실패를 9분 뒤 알림 | 보고서 「잘못된 점」 | 비공개 |
| 역방향: Cloud SQL publication 소유자 변경 권한 없음 → 표 소유자로 사전 생성, ExternalSecret template 키 database_url → database-url | 보고서 「역방향 준비」「역방향 실패와 수정」 | 비공개 |
| Google DMS PostgreSQL 대상은 Cloud SQL·AlloyDB뿐(RDS는 원본 목록에만) | https://docs.cloud.google.com/database-migration/docs/supported-databases (2026-11-10 확인) | 공식 문서 |
| t3.medium ENI 3·ENI당 IPv4 6 → VPC CNI 기본 maxPods 17 | https://github.com/awslabs/amazon-eks-ami/blob/main/nodeadm/internal/kubelet/instance-info.jsonl , https://docs.aws.amazon.com/eks/latest/userguide/choosing-instance-type.html | 공식 |
| Google 관리형 인증서는 CAA에 pki.goog 필요 | https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs | 공식 |
| Cloud SQL Auth Proxy(IAM 인증·암호화 연결) | https://cloud.google.com/sql/docs/postgres/sql-proxy | 공식 |
| 역방향 = 새 job_id·새 빈 대상·반대 설정, 즉석 롤백 없음 | https://github.com/SoftBankHackathon2026/Hackathon/blob/main/migration/CLOUD_MIGRATION.md | 공개 |

## 그래프 데이터(그림 2) — 원장·보고서 시각에서 계산

| 구간 | 시각(KST) | 분 |
|---|---|---|
| 상태 확인·접근 준비 | 07:10–09:54 | 164 |
| 저장소·대상 DB·Secret·HTTPS | 09:54–10:48 | 54 |
| 전환 장치 켜기 | 10:48–11:24 | 36 |
| 첫 실패와 권한 수정 | 11:24–11:37 | 13 |
| AWS→GCP 복사·전환 | 11:37:05–11:39:36 | 2.5 |
| 전환 뒤 확인 | 11:39:36–11:58 | 18 |
| 역방향 준비 | 11:58–12:04:56 | 7 |
| GCP→AWS 복사·전환 | 12:04:56–12:07:05 | 2.2 |
| 원복 | 12:13–12:58 | 45 |

보고서는 역방향 준비를 "약 8분"으로 적었고, 시각으로 계산하면 약 7분이다. 본문은 시각 계산값을 쓴다.

## 넣지 않는 것

계정·프로젝트 ID, 도메인(팀원 이름 포함), IP, 클러스터·DB 인스턴스·서비스 계정 이름, 팀원 이름, Notion·Slack 주소, 승인 ID·job_id 원문(공개 PR에 있는 범위 밖).
