---
title: "클라우드를 옮기는 동안 DB 쓰기는 어디로 가야 할까?"
date: "2026-11-01T11:46:19+09:00"
author: "김태윤"
categories: ["projects"]
draft: false
description: "운영 중인 서비스를 AWS와 GCP 사이에서 옮길 때 쓰기 DB를 하나로 두고, 전환 중 요청을 접수 큐에 받아 두는 설계. 첫 설계에서 뺀 AI 코드 적응과 DNS 가중치 전환, 즉석 롤백 대신 택한 새 전환, 그리고 남은 한계."
tags: ["멀티 클라우드", "마이그레이션", "CDC", "무중단 전환", "PostgreSQL", "SoftBank Hackathon"]
---

이미 사용자가 있는 서비스를 다른 클라우드로 옮기면, 데이터를 옮기는 동안에도 쓰기 요청이 계속 들어옵니다. 두 DB가 동시에 쓰기를 받으면 어느 쪽이 맞는 데이터인지 알 수 없게 됩니다. 그래서 쓰기를 받는 DB를 언제나 하나로 두고, 전환하는 동안 들어온 요청은 거절하지 않고 접수 큐에 쌓아 두었다가 전환 뒤에 처리하기로 했습니다. 2026년 11월 8일 팀 데모 인프라에서 이 원칙으로 PostgreSQL 데이터를 AWS에서 GCP로, 다시 GCP에서 AWS로 옮겼고, 시험용 트래픽 봇이 보낸 쓰기 2,582건 가운데 실패한 요청은 없었습니다(팀 내부 보고서 기준의 비공개 실측).

저는 SoftBank Hackathon 2026 본선 팀에서 클라우드 사이(AWS↔GCP) 이전을 맡았습니다. 범위와 설계를 정하고, AI가 구현한 crosscloud PR을 리뷰를 거쳐 확인하고 머지했습니다. 원본 파악과 대상 판정, 대상 인프라 Terraform, Secret과 감사 기록 이관, 접수 큐 제어 어댑터, 왕복 리허설 배선이 여기에 들어갑니다([PR 목록](#참고한-공식-문서)). 이 코드는 로컬 시험과 가짜 클라우드 응답으로만 확인했고, 실클라우드에서는 돌리지 않았습니다. 11월 8일 실험은 팀원이 만든 전환 도구와 접수 큐로 했습니다. 저는 단계마다 승인하고 gitops 변경을 머지했으며, 클러스터 명령 실행과 변경 기록은 AI(Claude Code)가, 원복 순서 점검은 다른 AI(Codex)의 리뷰가 맡았습니다. 원본 AWS 인프라 기동과 원본 DB 쪽 Secret은 팀원이 도왔습니다.

## 설정 파일만 읽으면 코드 속 의존성을 놓칩니다

클라우드의 리소스 목록만으로는 메시지 큐 호출이나 외부 API 주소처럼 **코드 안에서만 보이는 의존성**을 알 수 없습니다. 그래서 원본 파악 단계는 클라우드 API로 리소스를 읽고, 소스 코드와 환경 변수까지 읽습니다. 첫 설계에 있던 구성 내보내기(Export) 결과 읽기는 본선 구현에 넣지 않았습니다.

이 단계는 읽기 전용이고, 모르면 멈추는 쪽으로 만들었습니다([PR #78](https://github.com/SoftBankHackathon2026/Hackathon/pull/78)).

- Secret 저장소는 메타데이터만 수집하고 값은 부르지 않습니다. 수집 결과에 비밀 값이 섞이지 않는지 시험으로 확인합니다.
- 앱 소스에서 클라우드 결합(예: RDS IAM 서명기, Cloud SQL IAM 커넥터)을 찾습니다. 소스를 읽지 못하면 "결합 0건"으로 보고하지 않고 오류로 멈춥니다.
- 평문 비밀로 의심되는 환경 변수, 대응이 없는 서비스, 권한이 없어 읽지 못한 리소스는 사람이 확인할 항목으로 남깁니다. 이런 항목이 하나라도 남으면 판정은 종료 코드 3으로 끝납니다.

## 판정과 실행 사이에 멈출 자리를 두었습니다

이전은 판정하는 쪽과 실행하는 쪽으로 나뉩니다. 판정은 "옮길 수 있는가, 무엇을 바꿔야 하는가"를 정하고, 실행은 판정을 통과한 계획만 실제 환경에 적용합니다. 그 사이에서 멈추는 자리는 두 곳입니다.

1. **판정의 종료 코드**: 사람 결정이 남으면 판정은 종료 코드 3으로 끝납니다. 리허설 배선([#118](https://github.com/SoftBankHackathon2026/Hackathon/pull/118))은 종료 코드가 0이 아니면 인계 단계로 넘어가지 않게 묶었습니다. 이 배선은 실클라우드에서 실행하지 않았습니다.
2. **전환 도구의 승인 ID**: 초기 복사와 CDC(Change Data Capture, 원본의 변경을 따라 대상에 반영하는 복제)가 끝나도 전환 도구는 READY 상태에서 멈추고, 운영자가 명시적인 승인 ID를 넘겨야 쓰기 차단을 시작합니다([전환 도구 문서](https://github.com/SoftBankHackathon2026/Hackathon/blob/main/migration/CLOUD_MIGRATION.md)). READY는 "최종 동기화가 끝났다"는 뜻이 아니라 "승인을 기다린다"는 뜻입니다.

판정을 통과한 뒤의 준비도 만들어 두었습니다. 대상 인프라를 Terraform으로 만들고([AWS #86](https://github.com/SoftBankHackathon2026/Hackathon/pull/86), [GCP #77](https://github.com/SoftBankHackathon2026/Hackathon/pull/77)), Secret 값을 대상 클라우드의 Secret 저장소로 옮기고 전환용 DB 로그인을 준비합니다([#82](https://github.com/SoftBankHackathon2026/Hackathon/pull/82)). 감사 기록은 원본 바이트를 그대로 복사한 뒤 오프라인에서 검증합니다([#80](https://github.com/SoftBankHackathon2026/Hackathon/pull/80)). 모두 로컬 시험까지 확인한 상태입니다.

## 이름이 같아도 동작이 다르면 대응 가능이 아닙니다

대체 리소스가 있다고 같은 동작은 아닙니다. 판정은 리소스마다 아래 중 하나로 분류하고, 양쪽 클라우드의 공식 문서 인용이 없으면 "기능 대응 가능"이나 "대체 서비스 존재"로 판정하지 않습니다.

| 분류 | 본선 대응표의 예 | 처리 |
| --- | --- | --- |
| 기능 대응 가능 | RDS ↔ Cloud SQL(PostgreSQL), Secrets Manager ↔ Secret Manager, ECR ↔ Artifact Registry | 설정 변환 |
| 대체 서비스 존재 | ECS Fargate ↔ Cloud Run, ALB ↔ 외부 Application 부하 분산기 | 설정 변환(작업 역할 → 서비스 계정 등). 코드 결합은 따로 탐지해 사람 결정 |
| 원본 유지 | Route 53 비공개 호스팅 영역 | 옮기지 않음 |
| 미분류 | 대응표에 없는 리소스, 작업 역할 권한·Secret 볼륨 같은 의존 | 사람 결정(종료 코드 3) |

본선 대응표는 위 5쌍을 양방향으로 대응시킵니다. 첫 설계에 있던 "직접 운영 가능" 분류는 본선 대응표에 행이 없어서, 해당 리소스는 미분류로 사람에게 올라갑니다. 각 분류에서 무엇을 확인하는지는 [글 끝 첫 번째 모형](#lab-title)에서 분류를 바꿔 가며 볼 수 있습니다.

## AI 코드 적응은 본선 시연에서 뺐습니다

첫 설계(10월 31일에 정하고 11월 1일 이 글의 첫 판으로 공개)에는 "대체 서비스 존재"로 분류된 코드를 AI가 대상 클라우드 SDK에 맞게 고치고, 격리된 시험 환경에서 테스트를 통과한 변경만 계획에 넣는 단계가 있었습니다.

본선 범위를 정하면서 이 시연을 뺐습니다. 시연용으로 준비한 IAM 인증 변형 앱은 시험을 위해 일부러 클라우드 결합을 붙인 것이었고, 팀의 실제 샘플 앱은 비밀번호로 DB에 접속합니다. 일부러 만든 결합을 고치는 시연은 실제 이전 능력을 보여 주지 못한다고 판단했습니다. 대신 결합 탐지는 남겼습니다. 소스에서 클라우드 결합이 0건이면 코드를 그대로 옮기고, 결합이 있으면 사람이 정합니다.

원칙은 그대로입니다. **AI가 "된다"고 답한 것은 호환성의 증거가 아닙니다.** 코드를 고친다면 테스트를 통과한 변경만 계획에 들어가야 합니다.

## 쓰기를 받는 DB는 언제나 하나입니다

전환에서 가장 위험한 순간은 DB입니다. 그래서 앱이 원본과 대상 양쪽에 떠 있어도 DB 쓰기는 한 곳에서만 받습니다. 아래 그림에서 실선은 지금 요청과 쓰기가 흐르는 길이고, 점선은 전환 뒤에 열리는 길과 전환 도구의 제어입니다.

```mermaid {#fig-single-writer kind="개념도" caption="요청은 접수 큐를 거쳐 앱으로 가고, 쓰기는 한 DB만 받습니다. 대상 DB는 전환 전까지 CDC로만 따라갑니다." source="https://github.com/SoftBankHackathon2026/Hackathon/blob/main/migration/CLOUD_MIGRATION.md"}
flowchart TB
  accTitle: 단일 쓰기 DB 구성
  accDescr: 사용자 요청이 접수 큐를 거쳐 원본 앱으로 가고 원본 DB에만 쓴다. 원본 DB의 변경은 CDC로 대상 DB에 복제된다. 전환 도구가 원본 쓰기를 막고 접수 큐의 전달 대상을 대상 앱으로 바꾸면 대상 DB가 쓰기를 받는다.
  U[사용자 요청] --> Q[접수 큐]
  Q -->|전환 전| SA[원본 앱]
  Q -.->|전환 뒤| TA[대상 앱]
  SA --> SD[(원본 DB)]
  TA -.-> TD[(대상 DB)]
  SD -->|CDC| TD
  M[전환 도구] -.->|일시정지·대상 변경| Q
  M -.->|쓰기 차단| SD
```

전환 도구가 이 원칙을 지키는 방법은 차단 트리거입니다([전환 도구 문서](https://github.com/SoftBankHackathon2026/Hackathon/blob/main/migration/CLOUD_MIGRATION.md), [접수 큐 코드](https://github.com/SoftBankHackathon2026/sample-app/blob/main/src/durable-ingress/service.js)).

- **PRECHECK**: 대상 DB가 비어 있는지 확인하고, 대상 쪽에 앱 쓰기 차단을 겁니다.
- **COPYING**: Debezium(PostgreSQL의 변경 기록을 읽어 이벤트로 내보내는 CDC 도구)으로 원본의 초기 데이터와 이후 변경을 읽어, 테이블마다 기본키 기준으로 대상에 반영합니다.
- **FENCING**: 앱을 일시정지하고 진행 중인 요청이 0이 된 것을 확인한 뒤, 원본 테이블을 한 트랜잭션에서 잠그고 쓰기를 막는 트리거를 설치합니다. 이 순간부터 어느 DB도 앱 쓰기를 받지 않습니다.
- **DRAINING, STOPPING**: 양쪽이 막힌 상태에서 기본키마다 모든 열을 비교해 누락·추가·변경이 0이 될 때까지 기다리고, 복제기를 멈춘 뒤 한 번 더 비교합니다.
- **SWITCHING**: 앱의 DB 연결을 대상으로 바꾸고 대상 쪽 차단을 풉니다. 원본 차단은 유지합니다.

이 원칙이 성립하려면 전제가 있습니다. 전환 도구는 PostgreSQL끼리만 옮기고, 여러 앱 복제본·배치·cron·다른 DB 계정까지 모든 쓰기 주체를 멈출 수 있어야 합니다. 단계마다 앱 상태와 쓰기를 받는 DB가 어떻게 바뀌는지는 [글 끝 두 번째 모형](#lab-title-cutover)에서 직접 넘겨 볼 수 있습니다.

## 전환 중 요청은 거절하지 않고 접수 큐에 받아 둡니다

이 설계에서 "무중단"은 응답이 느려지지 않는다는 뜻이 아닙니다. 약속하는 기준은 세 가지입니다.

- 전환 때문에 생긴 요청 실패 0건
- 성공 응답을 받은 쓰기의 누락 0건
- 같은 요청의 중복 반영 0건

FENCING부터 SWITCHING까지는 어느 DB도 쓰기를 받지 않습니다. 이 구간에 들어온 요청을 앱이 직접 받으면 실패할 수밖에 없습니다. 그래서 앱 앞에 접수 큐를 둡니다. 접수 큐는 평소에도 요청을 Redis Stream에 넣고 곧바로 `202 Accepted`로 응답한 뒤 앱에 전달합니다. 전환 구간에는 전달만 멈추고 요청을 계속 쌓아 두며, 앱이 다시 열리면 쌓인 요청을 새 대상으로 전달합니다.

첫 설계에서는 트래픽을 DNS 가중치로 조금씩 옮길 계획이었습니다. 요청을 202로 받아 두었다가 SWITCHING 뒤에 처리하면 전환 중 거절이 0이 되므로, 팀원이 온프레미스 이전용으로 만든 접수 큐 방식을 클라우드 사이 전환에도 그대로 쓰기로 했습니다. 대가도 있습니다. 클라이언트는 처리 결과가 아니라 접수 사실을 먼저 받습니다. 결과를 바로 돌려줘야 하는 API는 이 방식으로 옮길 수 없고, 따로 설계해야 합니다.

## 되돌리기는 거꾸로 복제가 아니라 새 전환입니다

전환 도구는 원본을 덮어쓰는 즉석 롤백을 제공하지 않습니다. 반대 방향은 **새 job_id, 새 빈 대상 DB, 원본과 대상을 뒤집은 설정**으로 처음부터 다시 실행합니다([전환 도구 문서](https://github.com/SoftBankHackathon2026/Hackathon/blob/main/migration/CLOUD_MIGRATION.md)).

AWS의 DMS 롤백 글도 새 DB에서 원래 DB로 직접 거꾸로 복제하는 방식은 그 흐름을 미리 시험할 수 없다며 권하지 않습니다. 그 글이 권하는 fall forward는 전환 전에 원본의 복제본을 따로 만들어 두고 새 DB의 변경을 계속 따라가게 하는 방식이라, 문제가 생기면 앱을 바로 그 복제본으로 옮길 수 있습니다([AWS Database Blog](https://aws.amazon.com/blogs/database/rolling-back-from-a-migration-with-aws-dms/)). 첫 설계는 이 방식을 후보로 두었지만 본선에서는 전환 도구의 방식을 따랐습니다. 원본에 다시 쓰지 않는다는 점은 같고, 미리 따라가는 복제본이 없으므로 되돌리려면 새 빈 DB로 복사부터 다시 해야 합니다.

실패해도 자동으로 되돌리지 않습니다. SWITCHING 전에 실패하면 상태는 FAILED가 되고, 원인을 확인한 뒤 같은 설정으로 다시 실행합니다. 이때도 원본 차단을 자동으로 풀거나 앱을 다시 열지 않습니다. SWITCHING이 시작된 뒤 오류가 나면 상태는 NEEDS_RECOVERY가 되고, 대상에 쓰기가 있었는지 알 수 없으므로 자동 재시도와 롤백을 막습니다. 어느 DB가 유일한 쓰기 주체인지는 사람이 정합니다.

## 실제 클라우드에서 두 방향 모두 옮겼습니다

11월 8일 팀 데모 인프라에서 같은 서비스를 AWS(EKS, RDS for PostgreSQL)에서 GCP(GKE, Cloud SQL for PostgreSQL)로 옮긴 뒤, 새 빈 RDS 데이터베이스를 대상으로 다시 되돌렸습니다. 옮긴 데이터는 표 1개이고, PostgreSQL 버전은 기록하지 않았습니다. 아래 값은 팀 내부 보고서 기준의 비공개 실측입니다.

| 방향 | 전체 비교(원본 = 대상 행 수) | 초기 복사 | 승인부터 전환 완료까지 |
| --- | --- | --- | --- |
| AWS → GCP | 1,083 = 1,083, 누락·추가·변경 0 | 80초 | 23초 |
| GCP → AWS | 2,734 = 2,734, 누락·추가·변경 0 | 82초 | 21초 |

실험 동안 트래픽 봇이 보낸 쓰기 2,582건 가운데 실패한 요청과 결과를 알 수 없는 요청은 모두 0건이었습니다. 실험에 쓴 Git 변경은 [gitops #85](https://github.com/SoftBankHackathon2026/gitops/pull/85), [#87](https://github.com/SoftBankHackathon2026/gitops/pull/87), [#89](https://github.com/SoftBankHackathon2026/gitops/pull/89)이고, 실험 뒤 [#92](https://github.com/SoftBankHackathon2026/gitops/pull/92)로 Git 상태를 실험 전과 같게 되돌렸습니다. 클러스터와 DB에 남은 실험 자원도 지웠습니다. 다만 실험 때 다시 설정한 전환용 DB 계정 비밀번호는 원래 값을 몰라, 소유자가 재설정해야 하는 상태로 남았습니다.

## 실험은 한 번씩이었고, 제 코드는 실클라우드에서 돌지 않았습니다

- **한 번씩만 돌렸습니다.** 두 방향 각 1회, 표 1개, 시험용 봇 트래픽입니다. 실제 사용자 트래픽이나 반복 측정이 아닙니다. 요청 지연은 정해진 방식으로 집계하지 않았습니다.
- **제 crosscloud 코드는 실험 경로 밖에 있습니다.** 실험은 팀 데모 인프라(EKS, GKE)에서 팀원의 전환 도구를 직접 돌렸습니다. 제 판정과 Terraform은 ECS·Cloud Run 시험 환경을 대상으로 만들었고, 로컬 시험까지만 확인했습니다.
- **판정 범위가 좁습니다.** 단일 리전, 컨테이너 하나짜리 ECS 서비스, 대응표의 5쌍만 다룹니다. 대응표 밖 의존은 미분류로 남기므로, 실제 클라우드를 읽으면 대개 종료 코드 3으로 멈출 것으로 봅니다. 사람이 확인했다고 표시해 넘기는 입력 경로도 아직 없습니다([PR #78](https://github.com/SoftBankHackathon2026/Hackathon/pull/78)).
- **역방향에는 손으로 한 우회가 있었습니다.** GCP → AWS 방향은 Cloud SQL에서 복제용 publication의 소유자를 바꿀 권한이 없어, publication을 미리 만들어 두고서야 돌았습니다.
- **즉석 롤백이 없습니다.** 전환 직후 문제를 발견하면 새 빈 대상으로 다시 전환해야 합니다. 역방향 준비에만 약 8분이 걸렸습니다.
- **접수 큐는 응답 의미를 바꿉니다.** 결과를 바로 돌려줘야 하는 API에는 별도 설계가 필요합니다.
- **종단 보장은 따로 확인해야 합니다.** 전환 도구의 완료는 쓰기를 열기 직전의 전체 비교와 앱 health 응답을 근거로 합니다. 사용자 요청의 종단 성공·무중단·지연 보장은 앱 단위의 인수 시험으로 따로 확인해야 합니다.
- **준비가 길었습니다.** 실험 준비에 약 4시간이 걸렸고, 대부분 권한·인증서·노드 자원 같은 인프라 조건을 하나씩 맞추는 일이었습니다.

## 출처

- [SoftBankHackathon2026/Hackathon — 전환 도구 문서 CLOUD_MIGRATION.md](https://github.com/SoftBankHackathon2026/Hackathon/blob/main/migration/CLOUD_MIGRATION.md) (팀원 구현, 2026-11-10 확인)
- [SoftBankHackathon2026/sample-app — 접수 큐 service.js](https://github.com/SoftBankHackathon2026/sample-app/blob/main/src/durable-ingress/service.js) (팀원 구현)
- crosscloud PR(제 담당, 로컬 시험까지): [#71 골격과 공통 모델](https://github.com/SoftBankHackathon2026/Hackathon/pull/71), [#77 GCP Terraform](https://github.com/SoftBankHackathon2026/Hackathon/pull/77), [#78 원본 파악과 대상 판정](https://github.com/SoftBankHackathon2026/Hackathon/pull/78), [#80 감사 기록 이관](https://github.com/SoftBankHackathon2026/Hackathon/pull/80), [#82 Secret 이관과 전환용 DB 로그인](https://github.com/SoftBankHackathon2026/Hackathon/pull/82), [#84 전환 연결 어댑터](https://github.com/SoftBankHackathon2026/Hackathon/pull/84), [#86 AWS Terraform](https://github.com/SoftBankHackathon2026/Hackathon/pull/86), [#118 왕복 리허설 배선](https://github.com/SoftBankHackathon2026/Hackathon/pull/118)
- 실험 변경과 원복: [gitops #85](https://github.com/SoftBankHackathon2026/gitops/pull/85), [#87](https://github.com/SoftBankHackathon2026/gitops/pull/87), [#89](https://github.com/SoftBankHackathon2026/gitops/pull/89), [#92](https://github.com/SoftBankHackathon2026/gitops/pull/92)
- [AWS Database Blog — Rolling back from a migration with AWS DMS](https://aws.amazon.com/blogs/database/rolling-back-from-a-migration-with-aws-dms/)
- 첫 설계 설명 사이트(2026-10-31, AI 코드 적응과 DNS 가중치 전환이 들어 있는 옛 설계): [migration.taeyun.blog](https://migration.taeyun.blog)
