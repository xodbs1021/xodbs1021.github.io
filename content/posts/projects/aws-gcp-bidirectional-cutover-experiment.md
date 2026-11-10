---
title: "AWS↔GCP DB 전환은 23초, 준비는 4시간이 넘었습니다"
date: "2026-11-10T14:55:47+09:00"
author: "김태윤"
categories: ["projects"]
draft: false
description: "팀 데모 인프라의 PostgreSQL을 AWS에서 GCP로, 다시 AWS로 옮긴 실험. 전환은 20여 초였지만 한 번도 켜진 적 없는 전환 장치를 켜는 데 막힌 아홉 가지, 9초 만의 실패를 9분 뒤에 안 감시 실수, 역방향의 권한 우회와 원복까지."
tags: ["멀티 클라우드", "마이그레이션", "CDC", "PostgreSQL", "EKS", "GKE", "SoftBank Hackathon"]
---

2026년 11월 8일, 팀 데모 인프라에서 PostgreSQL 데이터를 AWS에서 GCP로 옮기고, 다시 GCP에서 AWS로 되돌렸습니다. 승인부터 전환 완료까지는 23초와 21초였고, 두 번의 전환 동안 트래픽 봇이 시도한 쓰기 2,582건 가운데 실패한 요청은 없었습니다. 그런데 첫 전환을 시작하기까지 4시간이 넘게 걸렸습니다. 팀원이 만든 전환 장치는 정의만 있고 한 번도 실제로 켜진 적이 없었고, 켜는 과정에서 인프라 조건이 하나씩 드러났기 때문입니다. 실험 수치는 팀 내부 보고서 기준의 비공개 실측입니다.

저는 SoftBank Hackathon 2026 본선 팀에서 클라우드 사이(AWS↔GCP) 이전을 맡아 이 실험의 방식을 정하고, 단계마다 승인하고, 실험용 gitops 변경을 머지했습니다. AI(Claude Code)의 권한 분류기가 막은 실행 9회(허용 목록 추가, Terraform apply, CAA 레코드, 대상 DB 권한 스크립트 등)는 제가 직접 실행했고, 나머지 클러스터 명령과 변경 기록은 Claude Code가 맡았습니다. 변경 원장 리뷰와 gitops PR 리뷰는 다른 AI(Codex)가 했습니다. 전환 도구와 접수 큐는 팀원이 만들었고, 원본 DB 쪽 비밀번호 입력과 AWS 인프라 기동도 팀원이 도왔습니다. GCP 쪽 데모 앱은 다른 팀원이 미리 배포해 두었습니다. 설계와 바뀐 결정은 [1편](/posts/projects/multicloud-migration-design/)에 있습니다.

## 복제기를 원본 클라우드 안에서 돌려 VPN 없이 연결했습니다

옮기는 방법으로 세 가지를 비교했습니다.

| 후보 | 판단 | 이유 |
| --- | --- | --- |
| 팀원의 전환 도구를 원본 클라우드(EKS) 안에서 실행 | 채택 | 같은 도구로 양방향이 됩니다. 쓰기 차단, 마지막 변경 반영, 전체 비교, 전환을 도구가 맡습니다 |
| Google Database Migration Service | 기각 | PostgreSQL 이전의 대상은 Cloud SQL과 AlloyDB뿐이고 Amazon RDS는 원본 목록에만 있습니다([Google Cloud 문서](https://docs.cloud.google.com/database-migration/docs/supported-databases)). 돌아오는 길이 없습니다 |
| 운영자 PC에서 실행(제 담당인 crosscloud 리허설 구성, AI 구현·로컬 시험까지) | 기각 | 비공개 RDS에 닿으려면 터널이 필요하고, 노트북에 기대는 구조라 시연과 운영에 약합니다 |

접수 큐는 사용자의 쓰기 요청을 Redis 스트림에 받아 두었다가 지금 쓰기를 받는 쪽 앱으로 넘기는, 팀원이 만든 앞단입니다. 연결은 VPN 없이 했습니다. 복제기(Debezium과 Kafka Connect)와 접수 큐를 원본 AWS의 EKS 안에 띄우면, 원본 RDS에는 같은 VPC 안에서 닿습니다. 대상 Cloud SQL에는 Pod 옆에 붙인 Cloud SQL Auth Proxy로 연결했습니다. Auth Proxy는 IAM으로 인증하고 연결을 암호화하므로([Google Cloud 문서](https://docs.cloud.google.com/sql/docs/postgres/sql-proxy)), 공개 IP에 IP 허용 목록을 따로 두지 않았습니다. 아래 그림에서 실선은 전환 전에 요청과 쓰기가 흐르는 길, 점선은 전환 뒤에 열리는 길입니다.

```mermaid {#fig-experiment kind="재구성" caption="실험 구성. 복제기와 접수 큐는 원본 AWS 안에서 돌고, Cloud SQL에는 Auth Proxy로 닿습니다." source="https://github.com/SoftBankHackathon2026/gitops/pull/85"}
flowchart TB
  accTitle: AWS에서 GCP로 옮긴 실험 구성
  accDescr: 트래픽 봇의 요청이 AWS 안의 접수 큐를 거쳐 전환 전에는 AWS 앱으로, 전환 뒤에는 GCP 앱으로 간다. RDS의 변경은 Debezium과 Kafka Connect가 Auth Proxy를 거쳐 Cloud SQL에 반영한다.
  B[트래픽 봇] --> Q[접수 큐<br/>AWS 안]
  Q -->|전환 전| A[AWS 앱]
  Q -.->|전환 뒤| G[GCP 앱]
  A --> R[(RDS)]
  G -.-> C[(Cloud SQL)]
  R -->|변경 읽기| K[Debezium·Kafka Connect<br/>AWS 안]
  K -->|Auth Proxy| C
```

복제기가 원본 쪽에 있으므로 원본 RDS는 VPC 밖으로 열 필요가 없었고, 클라우드 밖으로 나가는 DB 연결은 Auth Proxy 하나였습니다.

## 전환 장치는 정의만 있고 한 번도 켜진 적이 없었습니다

실험 전 07시 10분에 읽기만으로 상태를 확인했을 때, 팀원의 전환 장치는 gitops에 정의만 있고 모든 구성 요소가 꺼져 있었습니다. 장치가 쓸 볼륨은 14시간째 대기 상태였고, 비밀번호를 담은 Secret은 하나도 없었습니다. 장치를 켜는 동안 문제가 차례로 드러났습니다. 아래 그래프에서 강조한 두 막대가 실제 복사와 전환이고, 둘을 합쳐 5분이 안 됩니다. 첫 변경(09:54)부터 첫 복사(11:37)까지 103분은 아래 아홉 가지를 하나씩 푸는 데 들었습니다. 그 앞 2시간 44분에 대해 보고서는 상태 확인과 접근 준비(팀 계정 SSO 로그인, kubeconfig)를 적었지만 시각별 기록은 남기지 않았습니다.

{{< chart id="fig-timeline" kind="재구성" caption="11월 8일 실험의 구간별 시간(분). 강조색과 굵은 값이 실제 복사와 전환입니다. 첫 막대는 07:10 읽기 확인부터 첫 변경(09:54)까지로 작업별 기록이 없는 구간이고, 12:07–12:13의 6분은 뺐습니다. 팀 내부 변경 원장과 보고서의 시각으로 구간을 나눴습니다." height="420px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 8, "bottom": 8, "containLabel": true},
  "xAxis": {"type": "value", "name": "분", "min": 0},
  "yAxis": {"type": "category", "inverse": true, "data": ["기록 없음", "DB·인증서 준비", "전환 장치 켜기", "첫 실패·권한", "AWS→GCP 전환", "전환 뒤 확인", "역방향 준비", "GCP→AWS 전환", "원복"]},
  "series": [{
    "type": "bar",
    "itemStyle": {"color": "#7a8a9b"},
    "label": {"show": true, "position": "right", "formatter": "{c}분"},
    "data": [164, 54, 36, 13, {"value": 2.5, "itemStyle": {"color": "#087f8b"}, "label": {"fontWeight": "bold"}}, 18, 7, {"value": 2.2, "itemStyle": {"color": "#087f8b"}, "label": {"fontWeight": "bold"}}, 45]
  }]
}
{{< /chart >}}

강조한 두 막대를 빼면 시간은 모두 장치를 켜고, 확인하고, 되돌리는 데 들었습니다. 막힌 곳은 아홉 가지였습니다.

| 증상 | 원인 | 조치 | 다음에는 |
| --- | --- | --- | --- |
| kubectl 시간 초과 | EKS API 허용 목록에 운영자 IP가 없음 | 허용 목록에 추가 | 시연 PC IP를 미리 등록하거나 EKS 안에서 실행 |
| 볼륨 14시간 대기 | 클러스터에 기본 StorageClass가 없고 매니페스트도 지정하지 않음([Kubernetes 문서](https://kubernetes.io/docs/concepts/storage/storage-classes/)) | gp2를 지정하고 볼륨을 미리 만듦 | 매니페스트에 StorageClass 명시 |
| 비밀번호 없음 | DB 계정 비밀번호가 팀원 로컬에만 있음 | 원본 쪽은 팀원이 Secret에 직접 입력, 대상 쪽은 새로 설정 | Secret 공급 경로를 문서와 자동화로 |
| Argo 동기화 실패 예상(Codex가 PR 리뷰에서 지적) | 설정 해시가 Job 템플릿에 들어가는데, 이미 만든 Job의 템플릿은 바꿀 수 없음 | Job 이름을 새로 붙임 | 설정을 바꿀 때마다 Job 이름 교체 |
| 인증서 발급 실패 | 팀 도메인 CAA가 amazon.com만 허용. Google 관리형 인증서는 CAA에 pki.goog나 letsencrypt.org가 있어야 함([Google Cloud 문서](https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs)) | 해당 하위 이름에만 pki.goog 추가 | 상위 CAA에 추가할지 결정 |
| Pod 배치 불가 | t3.medium은 ENI 3개, ENI당 IPv4 6개라 기본 설정에서 노드당 Pod 17개가 상한이고, 서울 리전 vCPU 할당량(8/8)이 차서 노드를 늘릴 수도 없음([EKS AMI 데이터](https://github.com/awslabs/amazon-eks-ami/blob/main/nodeadm/internal/kubelet/instance-info.jsonl), [AWS 문서](https://docs.aws.amazon.com/eks/latest/userguide/choosing-instance-type.html)) | 부하 생성기와 모니터링 2개를 잠시 0으로 | 노드 증설 또는 prefix delegation |
| 복사 9초 만에 실패 | 대상 DB에 전용 스키마를 만들 권한(CREATE ON DATABASE)이 없음 | 권한을 주고 재시도 | 대상 DB 준비 목록에 추가 |
| 복제기 접근 차단 우려 | 재시도용 Job 사본의 라벨이 NetworkPolicy가 허용하는 라벨과 다름 | 실행 중 라벨 보정 | 재시도 Job도 gitops로 제출 |
| DNS 레코드 state 누락 | Terraform apply가 중간에 끊김 | `terraform import`로 편입 | apply를 끊지 않기 |

## 9초 만에 실패했는데 9분 뒤에 알았습니다

복사 Job은 시작 9초 만에 PRECHECK에서 `InsufficientPrivilege`로 실패했습니다. 대상 DB에 표 권한만 주고, 전환 도구가 작업용 스키마를 만드는 데 필요한 DB 단위 CREATE 권한을 빠뜨렸습니다.

더 아팠던 것은 이 실패를 9분 뒤에야 알았다는 점입니다. Job을 지켜보던 AI(Claude Code)의 대기 명령이 "완료됐는가"만 기다렸고 "실패했는가"는 보지 않았습니다. 실패한 Job은 완료 조건을 만족하지 않으므로 대기가 실패를 알아채지 못했습니다. 이후 이 대기는 성공과 실패 중 먼저 오는 쪽에서 바로 빠지도록 바꿨습니다.

원인은 전환 도구의 상태 DB를 읽기 전용으로 열어 확인했고, 권한을 준 뒤 같은 설정으로 다시 실행하자 80초 만에 READY에 도달했습니다. 승인 ID를 넘기자 23초 만에 전환이 끝났습니다.

## 두 방향 모두 누락 없이 옮겼습니다

전환 도구는 쓰기를 막은 상태에서 기본키마다 모든 열을 비교하고, 복제기를 멈춘 뒤 한 번 더 비교합니다. 두 방향 모두 두 번의 비교에서 차이가 없었습니다.

| 방향 | 전체 비교(원본 = 대상 행 수) | 복사 → READY | 승인 → 전환 완료 |
| --- | --- | --- | --- |
| AWS → GCP | 1,083 = 1,083, 누락·추가·변경 0 | 80초 | 23초 |
| GCP → AWS | 2,734 = 2,734, 누락·추가·변경 0 | 82초 | 21초 |

같은 시간 동안 트래픽 봇은 접수 큐로 쓰기 요청을 계속 보냈습니다. 전환 구간에는 접수 큐가 요청을 받아 두기만 하고 앱으로 넘기지 않다가, 대상이 바뀐 뒤 쌓인 요청부터 새 앱으로 넘깁니다. 아래 영상에서 접수 큐 안의 칸이 쌓였다 비는 동안에도 봇에서 들어오는 선은 끊기지 않습니다.

{{< motion scene="CutoverQueuePause" kind="개념도" caption="전환하는 동안 요청은 접수 큐에 쌓였다가, 전환이 끝나면 쌓인 것부터 GCP 앱으로 넘어갑니다. 가장 긴 대기 8.2초는 트래픽 봇이 잰 실측입니다." >}}

| 집계 시점 | 쓰기 시도 / 커밋 | 실패 · 오류 · 결과 불명 | 지연 |
| --- | --- | --- | --- |
| AWS → GCP 뒤(11:48) | 1,413 / 1,412(1건 처리 중) | 0 · 0 · 0 | p95 1,079ms, p99 1,311ms, 최대 8,249ms |
| GCP → AWS 뒤(12:07, 누적) | 2,582 / 2,581(1건 처리 중) | 0 · 0 · 0 | 최근 구간 p95 1,084ms, p99 1,139ms, 최대 4,139ms |

가장 긴 8,249ms는 전환으로 전달이 멈춘 구간에 들어온 요청입니다. 요청이 실패하지 않은 대신 그만큼 기다렸습니다. 읽기 요청 오류는 4건 있었고, 다시 조회해 쓰기 결과에는 영향이 없음을 확인했습니다.

## 돌아오는 길은 새 빈 DB 하나와 설정 세 줄이었습니다

전환 도구는 원본을 덮어쓰는 즉석 롤백을 두지 않습니다. 반대 방향은 새 job_id, 새 빈 대상 DB, 원본과 대상을 뒤집은 설정으로 다시 실행합니다([전환 도구 문서](https://github.com/SoftBankHackathon2026/Hackathon/blob/main/migration/CLOUD_MIGRATION.md)). 그래서 GCP → AWS 방향은 원래 AWS DB가 아니라 RDS에 새로 만든 빈 DB를 대상으로 했습니다. 같은 Kafka와 Connect를 그대로 썼고, 바뀐 것은 대상 DB와 앱이 접속할 DB 이름, 설정 세 줄이었습니다. 준비는 새 DB를 만든 11시 58분부터 복사를 시작한 12시 4분까지 약 7분이었습니다.

한 곳은 미리 피했고, 한 곳에서 막혔습니다.

- **Cloud SQL이 원본이면 publication 소유자를 바꿀 권한이 없습니다.** 전환 도구는 복제용 publication을 만든 뒤 소유자를 CDC 계정으로 바꾸는데, Cloud SQL의 관리 계정은 그 역할의 구성원이 아니라 이 단계에서 실패할 자리였습니다. publication을 표 소유자로 미리 만들어 두면 도구가 범위만 검사하고 넘어가므로, 그렇게 미리 우회했습니다.
- **AWS 앱의 DB 이름만 바꾸다 키 이름을 틀렸습니다.** 팀 비밀번호 값은 건드리지 않으려고 ExternalSecret의 template으로 DB 이름만 치환했는데, template 안에서는 원격 속성 이름(`database_url`)이 아니라 Secret 키 이름(`database-url`)을 써야 했습니다. 동기화 오류 메시지를 보고 약 1분 만에 고쳤습니다.

첫 방향에서 배운 권한과 라벨 문제를 미리 막아 두어, 복사와 승인은 한 번에 통과했습니다. 다만 돌아온 AWS 앱은 원래 DB가 아니라 새 DB를 씁니다. 원래 DB로 돌아오는 장면을 보여 주려면 원본 차단을 풀고 표를 비우는 별도 절차가 필요하고, 이는 도구가 의도한 제약입니다.

## 실험이 끝난 뒤 원장에 적은 원복 순서대로 되돌렸습니다

실험은 팀이 함께 쓰는 데모 인프라에서 했습니다. 그래서 바꾼 것을 하나 바꿀 때마다 시각과 되돌리는 명령을 변경 원장에 함께 적었습니다. 실험 초반 원장이 9행일 때 다른 AI(Codex)에게 원장을 리뷰받아 중요한 지적 4건을 고쳤습니다. 원복 순서 2건(쓰기 DB를 먼저 정하기, 인증서와 Ingress를 지운 뒤에 고정 IP를 지우고 허용 목록은 마지막에), 토큰을 읽은 Pod 교체 확인, 원장에 빠진 로컬 정리 항목입니다. 고정 IP를 먼저 지우면 IP가 아직 쓰이는 중이라 삭제가 실패할 수 있습니다. 원장은 끝에 33행이 됐습니다.

원복은 12시 13분부터 58분까지 했습니다. gitops 변경은 [#92](https://github.com/SoftBankHackathon2026/gitops/pull/92)로 실험 전 커밋과 같게 되돌렸고, Git 밖에서 만든 Job, Ingress, 실험용 DB, 복제 슬롯과 publication, 서비스 계정, DNS 레코드, 허용 목록 항목을 원복 순서대로 지운 뒤 하나씩 남은 것이 없음을 확인했습니다. 지운 실험 데이터는 먼저 백업했습니다.

되돌리지 못한 것도 있습니다. 실험 때 다시 설정한 대상 쪽 DB 계정 비밀번호는 원래 값을 몰라, 그 계정을 쓰는 팀원이 재설정해야 하는 상태로 남았습니다.

## 작은 표와 이미 켜진 설정 덕을 봤고, 반복 측정은 하지 않았습니다

운이 좋았던 조건이 셋 있었습니다.

- 원본 RDS에 논리 복제(`rds.logical_replication`)가 이미 켜져 있어 재부팅이 필요 없었습니다.
- 원본 표가 1천여 행으로 작아 복사가 80초에 끝났습니다.
- Cloud SQL에 공개 IP가 이미 켜져 있었습니다.

남은 한계는 이렇습니다.

- **한 번씩, 표 하나였습니다.** 두 방향 각 1회, 표 1개, 시험용 봇 트래픽입니다. 실제 사용자 트래픽이나 반복 측정이 아니고, 지연 값도 봇 한 대가 잰 한 번의 값입니다.
- **다시 하려면 30–40분은 걸릴 것으로 봅니다.** 다시 돌려 보지는 않았습니다. 막힌 곳을 모두 알고 있어도 새 job_id, 빈 대상 DB와 권한, 서비스 계정과 Secret, 인증서 발급 대기, 노드 자리를 다시 준비해야 합니다.
- **노드 자리가 시연을 막습니다.** 실험 중에는 모니터링과 부하 생성기를 잠시 꺼서 자리를 만들었습니다. 시연 전에는 노드를 늘리거나 노드당 Pod 상한을 올려야 합니다.

한 번도 켜 보지 않은 전환 장치라면, 실제 전환 전에 빈 데이터로 한 번 켜 보는 것이 준비 시간을 가장 많이 줄입니다. 이번에 기록이 남은 준비 103분은 모두 장치를 처음 켜면서 드러난 문제를 푸는 데 들었습니다.

## 측정 조건

- 일시: 2026년 11월 8일 07:10–12:58 KST(원복 포함).
- 원본: AWS 서울 리전, EKS의 데모 앱, RDS for PostgreSQL 16.15(비공개). 대상: GCP 서울 리전, GKE의 데모 앱, Cloud SQL for PostgreSQL 16의 새 빈 DB.
- 데이터: 표 1개(`public.migration_demo`).
- 도구: 팀원의 전환 도구(Debezium CDC, EKS 안 Job), 접수 큐, 트래픽 봇 1개.
- 출처: 팀 내부 실험 보고서와 변경 원장(비공개). 시각과 수치는 이 두 문서에서 옮겼습니다.

## 출처

- [Google Cloud — Database Migration Service 지원 원본·대상 데이터베이스](https://docs.cloud.google.com/database-migration/docs/supported-databases) (2026-11-10 확인)
- [Google Cloud — Cloud SQL Auth Proxy](https://docs.cloud.google.com/sql/docs/postgres/sql-proxy)
- [Google Cloud — Google 관리형 SSL 인증서(CAA 조건)](https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs)
- [Amazon EKS — 인스턴스 유형과 maxPods](https://docs.aws.amazon.com/eks/latest/userguide/choosing-instance-type.html), [amazon-eks-ami — 인스턴스별 ENI·IP 데이터](https://github.com/awslabs/amazon-eks-ami/blob/main/nodeadm/internal/kubelet/instance-info.jsonl)
- [Kubernetes — StorageClass](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [SoftBankHackathon2026/Hackathon — 전환 도구 문서 CLOUD_MIGRATION.md](https://github.com/SoftBankHackathon2026/Hackathon/blob/main/migration/CLOUD_MIGRATION.md) (팀원 구현)
- 실험 변경과 원복: [gitops #85](https://github.com/SoftBankHackathon2026/gitops/pull/85), [#87](https://github.com/SoftBankHackathon2026/gitops/pull/87), [#89](https://github.com/SoftBankHackathon2026/gitops/pull/89), [#92](https://github.com/SoftBankHackathon2026/gitops/pull/92)
- [1편: 클라우드를 옮기는 동안 DB 쓰기는 어디로 가야 할까?](/posts/projects/multicloud-migration-design/)
