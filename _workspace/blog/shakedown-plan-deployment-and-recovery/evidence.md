# 근거 — shakedown-plan-deployment-and-recovery (2026-11-12, 승인된 뼈대로 다시 씀)

유형: 실험 · 검증 기록(설계 연결 + 실측). 확인 날짜 2026-11-12. 공개 근거만. 보고서는 `8d9b37b` 고정(HEAD와 같은 바이트).
plan = `docs/experiments/2026-10-09-plan-deployment-connection.md`, fullstack = `docs/experiments/2026-10-09-aws-full-stack.md`.

| 주장 | 근거 | 종류 | 수행 주체 |
|---|---|---|---|
| 연결 전: 추천 · 저장과 고정 설정 AWS 실험이 분리, 배포 API는 plan id를 받지 않음, 0.5 vCPU/1 GiB · 최대 2태스크 | fullstack 3 · 7–9 | 문서 | — |
| plan id로 최신 선택 · 소유 · 근거 · 지원 스택 재검증, 카탈로그 스냅샷, 클라이언트 자원값 불가 | plan 3–5 | 문서 | AI 구현 |
| 거절 시험: 다른 프로젝트 · 미선택 · 오래된 계획 · replica override · 알 수 없는 필드 · 부족한 AZ | plan 16 | 자동 시험 | AI 실행 |
| 기반 스택은 실험 스크립트가 만든 폐기용 스택, 빈 계정 온보딩은 범위 밖 | plan 23–25 · 30 | 문서 | — |
| ALB 403 → ECS CreateService 실패, 우선순위 1 규칙으로 수정 | fullstack 11–27, 커밋 980f399(PR #12) | 실측 + 코드 | AI 실행 · 구현, 결정 사용자 |
| Spring 약 41초 대 유예 30초, 태스크 2개 교체, 120초로 | fullstack 29–36, 커밋 b46f1f9(PR #12) | 실측 + 코드 | 〃 |
| 두 결함은 계획 연결 전 실험(기존 Provider 직접 호출)에서 | fullstack 3 · 6–9 · 76–77 | 문서 | — |
| medium 중지 120초 제한 502, 600/630초로 | plan 47–53, 커밋 dcfe89c | 실측 + 코드 | 〃, 결정 사용자 |
| large 중지 189.70초 204 · INACTIVE · 0 | plan 97 · 99–101 | 실측 | AI 실행 |
| medium 1 vCPU/2 GiB · 2태스크 · 2a/2b · Multi-AZ · 2–4 · 60% · 세션/글 | plan 35–40 | 실측 | AI 실행 |
| large 2 vCPU/4 GiB · 3태스크 · 3AZ · Multi-AZ · 3–12 · 60% · 세션/글 | plan 88–95 | 실측 | AI 실행 |
| 배포 소요 662.196 / 687.861초, DB 단계 493.659 / 537.093초 | plan 40 · 99 | 실측 1회씩 | AI 실행 |
| 나머지 168.537 / 150.768초 | 위 값의 차 | 계산 | 글쓴이 |
| use_ai=false, TestClient, 브라우저 E2E 아님, small은 대역 시험 | plan 32–33 · 42–43 | 문서 | — |
| 태스크 강제 종료 58.69초 3개 · 3AZ · 세션 · 데이터 | plan 96 | 실측 | AI 실행 |
| 복구 시간은 5초 폴링 · AWS 호출 지연 포함, 연속 성공률 미측정 | plan 103–104 | 문서 | — |
| 확장 2→4, 96.53초에 healthy ≥3, CPU 목표 1%로 유도 | fullstack 44 · 56 · 62–63 | 실측 | AI 실행 |
| RDS 강제 전환 2a→2b 71.57초, 실패 폴링 1회 · 정상 대상 0 | fullstack 57 · 63–66 | 실측 | AI 실행 |
| fullstack 조건 RDS PostgreSQL 17.6 · db.t3.micro · Multi-AZ, JDBC 세션 | fullstack 42–43 | 조건 | — |
| 축소 16분 미확인 | fullstack 59 · 68–74 | 실측 | — |
| 정리: 스택 DELETE_COMPLETE, 잔여 없음 | plan 55–60 · 108–111 | 실측 | AI 실행 |
| 예산 3달러 승인 · 이후 증액 · large 지시 | fullstack 5, 비공개 결정 기록(2026-10-09) | 기록 | 사용자 |
| 우선순위 1 규칙 · 120초 · 600/630초는 사용자 결정 | 사용자 확인(2026-11-12 작업 지시) | — | 사용자 |
| PR #12 병합 2026-10-10 13:12 KST, 리뷰 0건, 본인 병합 | `gh pr view 12` | 메타데이터 | 사용자 |
| 코드: foundation.yaml 594–621, aws-provider.ts 109 · 175–181, aws_runner.py 102 (`3ffbcb0`) | 코드 | 코드 | AI 구현 |

PDF 48쪽 「실제 배포에서 만난 충돌」은 두 결함을 계획 연결 과정처럼 묶었고, 49쪽은 태스크 강제 종료를 「별도 장애 · 확장 시험」 표에 넣었다. 본문에 날짜 문장으로 구분. PDF는 고치지 않음.
쓰지 않은 것: 계정 · ARN · IP, 원시 증거 경로, 비용 추산($0.7312는 과대 가정 예시).
