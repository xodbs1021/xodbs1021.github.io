# evidence — pokeclip-stateful-media-deployment (다시 쓰기, 2026-11-11)

유형: 설계·아키텍처.

## 역할

- 작성자: 7/20 배치, 7/27 NLB · 프라이빗 결정(월 약 $50), 8/1 RDS PostgreSQL 17.
- AI: 8/3 NLB 경로 스파이크(자동, 작성자 참여 여부 단정 안 함), 미디어 상자 스크립트 · 운영 Terraform 구현.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 코어 ECS Fargate · 미디어 EC2 단독, EKS · EC2 2대 기각, RDS Multi-AZ 원안 | 팀 내부 결정(7/20, 비공개) | 비공개 |
| NLB · 프라이빗 · NAT · S3 게이트웨이, 공격면 동일 · 심층 방어 · 월 약 $50, drain/force 버튼 설계 | 팀 내부 결정(7/27, 비공개) | 비공개 |
| 8/3 스파이크 3항(시험 파일 t.txt만 S3) | 팀 내부 스파이크 기록(비공개) | 실측(비공개) |
| 녹화 조각 S3 업로드는 7/24 퍼블릭 EC2 | 팀 내부 스파이크 기록(비공개) | 비공개 |
| 두 단계 정지(TERM · 최대 30초 · down) | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/systemd/pokeclip-media.service#L44-L55 | 공개 코드 |
| 볼륨 유지 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/bin/stop-media.sh#L18-L19 | 공개 코드 |
| PR #311 10/22 15:38Z = 10/23 KST | gh pr view 311 | 공개 |
| multi_az = false, PostgreSQL 17, 미디어와 같은 AZ | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/rds.tf#L70-L79 | 공개 코드 |
| 로컬 postgres:17 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/docker-compose.yml#L8 | 공개 코드 |
| chat-detector 먼저 내리기(0/100), 나머지 ECS 기본 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/services.tf#L341-L344, modules/ecs_service/variables.tf | 공개 코드 |
| NLB UDP · 미디어 프라이빗 · ECS 프라이빗 · S3 게이트웨이 | modules/media_ingest, prod/media/main.tf L31, prod/platform/services.tf, prod/network enable_s3_gateway_endpoint | 공개 코드 |
| 11/6 운영 주소 공개, dev 미디어 상자 11/6 정지 | 팀 내부 결정(11/6, 비공개), 사용자 공개 허용 범위만 | 비공개 |

## 쓰지 않은 것

- 인스턴스 종류, 송출 개방 범위, 개통 조건 관련 사항, 렌더 · 업로드 일꾼 운영 상태.
