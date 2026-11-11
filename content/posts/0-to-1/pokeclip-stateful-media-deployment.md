---
title: "방송 중인 미디어 서버는 API처럼 갈아 끼울 수 없었습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: 2026-11-11T14:14:52+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "AWS", "Deployment", "ECS", "NLB"]
description: "OBS와의 UDP 연결과 업로드 전 녹화 파일을 들고 있는 미디어 서버를 ECS Fargate 코어와 다른 교체 단위(EC2 한 대)로 둔 배치 결정. 7월 27일 수신을 NLB 뒤 프라이빗 EC2로 옮기기로 정했고, 지금 미디어 상자는 TERM 뒤 최대 30초 기다린 다음 내리며 녹화 볼륨은 남깁니다. 운영은 미디어 EC2 한 대와 단일 AZ RDS PostgreSQL 17로 시작했습니다."
draft: false
portfolio_cases: [4]
portfolio_pages: [5, 6]
portfolio_edition: "2026-10-15-v2"
---

새 컨테이너를 띄우고 옛 컨테이너를 내리는 배포를 미디어 서버에 그대로 쓰면 방송이 끊깁니다. PokeClip의 미디어 서버는 OBS와 SRT(UDP) 연결을 맺고, 녹화 중인 조각과 아직 S3에 올리지 못한 파일을 디스크에 들고 있습니다. 프로세스 밖의 DB를 다시 읽는 것만으로는 이 상태를 되살릴 수 없습니다. 그래서 2026년 7월 20일 코어 API는 ECS Fargate에, 미디어는 별도 EC2에 두기로 했고, 7월 27일 수신 경로를 NLB 뒤 프라이빗 서브넷으로 옮기기로 정했습니다. 지금 미디어 상자를 내릴 때는 compose에 TERM을 보내고 최대 30초 기다린 뒤 내리며, 녹화 볼륨은 지우지 않습니다. 운영은 11월 3일 첫 출시본부터 미디어 EC2 한 대와 단일 AZ RDS로 시작했습니다.

배치와 수신 경로, DB 선택은 제가 정했습니다. 8월 3일 NLB 경로 스파이크는 AI가 임시 자원을 만들어 자동으로 돌렸고, 미디어 상자의 시작 · 정지 스크립트와 운영 Terraform도 AI(Claude Code와 Codex)가 구현했습니다.

## 미디어 서버는 꺼질 때 UDP 연결과 업로드 전 파일을 잃습니다 {#프로세스가-사라질-때-잃는-상태부터-나눴습니다}

코어 API도 상태를 다루지만, 업무 상태를 DB에 두면 새 태스크가 다시 읽어 이어 갈 수 있습니다. 미디어 서버는 DB에 아직 도착하지 않은 상태를 들고 있습니다.

| 영역 | 꺼질 때 잃는 것 | 교체 방식 |
|---|---|---|
| 인증 · 클립 API | 처리 중이던 요청 | 업무 상태는 DB에 있음. 새 태스크가 뜬 뒤 옛 태스크를 내림 |
| 채팅 판별 서버 | 프로세스 메모리의 사건 묶음 | 옛 태스크를 먼저 내림(겹치면 같은 사건을 두 번 낼 수 있어 공백을 택함) |
| 미디어 상자 | OBS와의 UDP 연결, 녹화 중인 조각, 인스턴스를 바꾸면 업로드 전 파일 | 별도 EC2. 내리면 송출이 끊김. 같은 상자를 다시 띄우면 볼륨의 파일은 남음 |

ECS 서비스라고 모두 같은 방식으로 바꾸지도 않습니다. 채팅 판별 서버는 급증 구간을 프로세스 메모리에 모으므로, 옛 태스크와 새 태스크가 겹치면 같은 하이라이트 후보가 두 번 나갈 수 있습니다. 그래서 이 서비스만 옛 태스크를 먼저 내립니다([`prod/platform/services.tf` 341–344행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/services.tf#L341-L344)). 교체 방식은 실행 환경이 아니라 프로세스가 사라질 때 무엇을 잃는지로 정했습니다. 다른 서비스는 ECS 기본값대로 새 태스크를 먼저 띄웁니다([Amazon ECS 문서 「rolling update」](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html)).

영상의 두 줄을 견주면 됩니다. 위 줄의 API 태스크는 새 것이 뜬 뒤 옛 것이 빠지고, 아래 줄의 미디어 상자는 내려가는 순간 OBS 연결이 끊깁니다.

{{< motion scene="MediaBoxReplace" id="fig-media-box-replace" kind="개념도" caption="API 태스크는 새 태스크가 뜬 뒤 옛 태스크를 내립니다. 미디어 상자는 TERM을 받고 최대 30초 기다린 뒤 내려가며, 그동안 OBS의 UDP 송출이 끊깁니다. 같은 상자를 다시 띄우면 업로드 전 조각은 볼륨에 남고, 송출이 끊긴 지 300초 안에 돌아오면 앞 세션을 이어 받습니다. 순서를 보여 주는 설명용 그림이며 실제 시간 비율은 아닙니다." >}}

미디어 상자를 바꾸는 동안 송출이 끊기는 것은 막지 못했습니다. 남긴 것은 디스크에 있는 조각과, 다시 붙은 송출을 같은 방송으로 잇는 규칙입니다.

## 코어는 ECS Fargate에, 미디어는 EC2 한 대에 두었습니다 {#클러스터보다-미디어-경로를-먼저-검증하기로-했습니다}

7월 20일 세 안을 견줬습니다. 코어까지 EC2 두 대에 손으로 올리는 안은 가장 싸지만 서비스마다 배포와 복구를 직접 해야 해서 뺐습니다. EKS는 배치 선택지를 넓히지만 3인 팀이 클러스터 운영과 업그레이드까지 맡으면, 정작 검증해야 할 미디어 경로에 쓸 시간이 줄어든다고 봤습니다. 그래서 코어는 서비스별로 따로 배포되고 태스크가 자동으로 복구되는 ECS Fargate에 두고, 미디어는 EC2 한 대에 두었습니다. 진행 중인 SRT 연결과 되감기 버퍼를 가진 UDP 서버를 오케스트레이터의 교체 대상에서 일부러 뺀 것입니다.

DB는 8월 1일 RDS PostgreSQL 17로 정했습니다. 상태를 직접 운영하는 서버는 미디어 하나로 충분하다고 봤고, 백업과 패치는 관리형에 맡겼습니다. 로컬 compose도 `postgres:17`이고 운영 RDS도 `engine_version = "17"`이라 메이저 버전이 같습니다([`docker-compose.yml` 8행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/docker-compose.yml#L8) · [`prod/runtime/rds.tf` 70행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/rds.tf#L70)). 미디어 서버가 비밀번호 없이 RDS에 붙는 방식은 [RDS IAM 인증 글](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/)에 있습니다.

## 수신은 NLB 뒤 프라이빗 EC2로 옮겼습니다 {#연결-성공-다음에-녹화-파일과-s3-객체를-확인했습니다}

SRT는 UDP라 HTTP 로드 밸런서(ALB)를 쓸 수 없습니다. 7월 20일에는 미디어 EC2를 퍼블릭 서브넷에 두고 고정 IP로 직접 받기로 했습니다. 7월 27일 이를 바꿔 UDP 리스너를 단 [NLB](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html) 뒤 프라이빗 서브넷으로 옮기기로 정했고, 운영 Terraform이 그 구성으로 만들어졌습니다. NLB는 L4에서 패킷을 그대로 넘기므로 공격받는 면은 퍼블릭 EC2와 같습니다. 그래도 보안 그룹을 잘못 열었을 때 인스턴스가 바로 드러나지 않게 하는 방어선과, 인스턴스를 바꿔도 송출 주소가 그대로인 점을 7월 추정 월 약 50달러(NLB와 NAT 게이트웨이)에 사기로 했습니다. 프라이빗 서브넷에서 S3로 조각을 올릴 때 NAT 요금이 붙지 않도록 [S3 게이트웨이 엔드포인트](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)를 함께 두었습니다.

8월 3일 NLB 경로 스파이크는 임시 VPC에서 세 가지를 확인했습니다. 인터넷에서 보낸 6트랙 SRT가 NLB를 지나 프라이빗 EC2에 닿았고 송출자 IP가 유지됐습니다. LL-HLS 목록이 NLB의 TCP 리스너로 응답했습니다. 프라이빗 EC2에서 시험 파일 하나를 S3에 올렸고, 라우팅 표에서 S3 주소 목록이 NAT가 아니라 게이트웨이 엔드포인트로 가는 항목을 확인했습니다. 이 스파이크에서 녹화 파일을 S3에 올리는 것은 확인하지 않았습니다. 녹화 조각을 S3에 올리는 경로는 7월 24일 퍼블릭 EC2 스파이크에서 확인한 것입니다([MediaMTX 도입 글](/posts/0-to-1/pokeclip-mediamtx-build-or-adopt/)).

dev 미디어 서버는 이 구성과 다릅니다. dev는 고정 IP를 붙인 EC2 한 대였고, 11월 6일 운영 주소를 공개하면서 멈췄습니다. 이 글의 운영 구성은 dev 서버의 기록이 아니라 운영 Terraform 기준입니다.

## 미디어 상자는 30초 기다린 뒤 내리고 녹화 볼륨은 남깁니다

7월 27일에는 미디어 서버를 바꾸는 방식으로 「새 서버를 띄우고, 방송이 자연히 끝나기를 기다리거나(drain) 바로 끊는(force) 버튼」을 설계했습니다. 그 버튼은 아직 없습니다. 10월 23일 머지한 지금의 정지는 두 단계입니다. 먼저 compose에 TERM을 보내 컨테이너가 스스로 멈추기를 최대 30초 기다리고, 그다음 `docker compose down`으로 내립니다([`pokeclip-media.service` 44–55행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/systemd/pokeclip-media.service#L44-L55)). `down`에는 볼륨을 지우는 인자를 주지 않으므로 같은 상자를 다시 띄우면 녹화 · 훅 스풀 · 되감기 조각 볼륨이 남습니다. 인스턴스를 새것으로 바꾸면 그 디스크의 업로드 전 파일은 잃습니다([`stop-media.sh` 18–19행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/bin/stop-media.sh#L18-L19)).

이 30초는 방송을 비우는 시간이 아닙니다. 그 사이 OBS 송출은 끊기고, 다시 뜬 상자에 송출이 돌아와야 합니다. 송출이 끊긴 뒤 300초 안에 같은 코덱 사양으로 돌아오면 새 세션이 앞 세션의 조각을 이어 받습니다([세션 주소 글](/posts/0-to-1/pokeclip-session-url-and-endlist/)). 무엇이 실패하면 상자 전체를 다시 띄우고, 다시 띄울 때 무엇이 남는지는 [미디어 호스트 재시작 글](/posts/0-to-1/pokeclip-media-host-restart-lifecycle/)에 있습니다.

포트폴리오 요약(2026-10-15판) 6쪽의 「교체에는 drain 또는 명시적 중단이 필요」 가운데 지금 구현된 것은 명시적 중단 쪽입니다. 방송을 끝까지 기다리는 drain과 무중단 교체는 구현하지 않았습니다.

## 운영은 EC2 한 대와 단일 AZ RDS로 시작했습니다

7월 20일 원안은 RDS를 Multi-AZ로 두어 장애 때 1–2분 안에 다른 AZ로 넘기는 것이었습니다. 운영은 단일 AZ로 시작했습니다. RDS는 `multi_az = false`이고, 미디어 상자와 같은 AZ에 둡니다([`prod/runtime/rds.tf` 77–79행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/rds.tf#L77-L79)). 미디어 EC2도 한 대입니다. 그 AZ에 장애가 나면 DB와 미디어가 함께 멈춥니다. 자동 장애 전환 시간과 가용성은 재지 않았습니다.

```mermaid {#fig-prod-layout kind="재구성" caption="운영 구성. OBS 송출은 NLB(UDP)를 지나 프라이빗 서브넷의 미디어 EC2 한 대로 가고, 미디어는 S3 게이트웨이 엔드포인트로 조각을 올립니다. 웹 · 인증 · 클립 · 채팅 서버 둘은 ECS Fargate 서비스이고, DB는 단일 AZ RDS PostgreSQL 17입니다. 청록 상자가 교체할 때 상태를 잃는 미디어 EC2입니다. develop 825a3dfe의 infra/terraform/prod 재구성이며 dev 서버 구성과 다릅니다." source="https://github.com/3K-PokeClip/PokeClip-mono/tree/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod"}
flowchart TB
  accTitle: PokeClip 운영 구성
  accDescr: OBS 송출이 UDP로 NLB를 지나 프라이빗 서브넷의 미디어 EC2 한 대로 간다. 미디어 EC2는 S3 게이트웨이 엔드포인트로 S3에 조각을 올리고 RDS에 장부를 적는다. 브라우저 요청은 ALB를 지나 프라이빗 서브넷의 ECS Fargate 서비스(웹, 인증, 클립, 채팅 둘)로 가고, 이 서비스들도 RDS를 쓴다. RDS는 단일 AZ PostgreSQL 17이다.
  obs[OBS · SRT]
  user[브라우저]
  nlb[NLB · UDP]
  alb[ALB]
  media[미디어 EC2 한 대<br/>프라이빗]
  ecs[ECS Fargate · 프라이빗<br/>웹 · 인증 · 클립 · 채팅 둘]
  rds[(RDS PostgreSQL 17<br/>단일 AZ)]
  gw[S3 게이트웨이<br/>엔드포인트]
  s3[(S3)]
  obs --> nlb --> media
  user --> alb --> ecs
  media --> rds
  ecs --> rds
  media --> gw --> s3
  style media fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

첫 출시본 v1.0.0은 11월 3일 나왔고, 웹 · 인증 · 클립 · 채팅 서버 둘이 ECS Fargate 서비스로, 녹화기와 사이드카가 미디어 상자로 올라갔습니다([PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466)). 11월 6일 운영 주소를 공개했습니다. 렌더·업로드 일꾼은 v1.0.0(11월 3일)에는 들어가지 않았고, 11월 10일 운영 반영 작업을 시작했습니다.

상태를 가진 서버를 배치한다면 실행 환경을 고르기 전에 그 프로세스가 사라질 때 잃는 것부터 적으십시오. 그 목록이 교체 단위와, 끊김을 받아들일지 막을지의 판단을 정합니다.

## 측정 조건

- 8월 3일 NLB 경로 스파이크: AWS CLI로 임시 VPC · NLB(UDP 8890 · TCP 8888) · NAT 게이트웨이 · S3 게이트웨이 엔드포인트 · 프라이빗 EC2(MediaMTX 1.19.3 컨테이너)를 만들고, 인터넷에서 6트랙 SRT를 60초 보냈습니다. S3 확인은 시험 파일 하나의 업로드와 라우팅 표 대조였습니다. AI가 자동으로 수행했고 자원은 같은 날 모두 지웠습니다. 원자료는 비공개입니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일)이고, PR 상태는 2026년 11월 11일에 확인했습니다.

## 출처

- [3K-PokeClip/PokeClip-mono `infra/media-host/systemd/pokeclip-media.service`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/systemd/pokeclip-media.service#L44-L55) — 두 단계 정지(TERM 뒤 최대 30초, 그다음 down)
- [3K-PokeClip/PokeClip-mono `infra/media-host/bin/stop-media.sh`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/bin/stop-media.sh#L18-L19) — 볼륨을 남기는 down
- [3K-PokeClip/PokeClip-mono `infra/terraform/prod/runtime/rds.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/runtime/rds.tf#L77-L79) — 단일 AZ RDS PostgreSQL 17
- [3K-PokeClip/PokeClip-mono `infra/terraform/prod/platform/services.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/services.tf#L341-L344) — 채팅 판별 서버의 먼저 내리기 배포
- [3K-PokeClip/PokeClip-mono PR #311](https://github.com/3K-PokeClip/PokeClip-mono/pull/311) — 미디어 상자 시작 · 정지 스크립트와 systemd 유닛(2026-10-23 머지)
- [3K-PokeClip/PokeClip-mono PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466) — v1.0.0 출시 이미지(2026-11-03)
- [AWS 문서 「What is a Network Load Balancer?」](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html) — NLB의 UDP 리스너
- [AWS 문서 「Gateway endpoints for Amazon S3」](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html) — S3 게이트웨이 엔드포인트
- [Amazon ECS 문서 「Deploy Amazon ECS services by replacing tasks」](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html) — 롤링 교체의 최소 · 최대 비율
- [DB 비밀번호 대신 연결마다 RDS IAM 토큰을 만들었습니다](/posts/0-to-1/pokeclip-shared-db-auth-iam-tls/) — RDS IAM DB 인증
- 팀 내부 결정 · 스파이크 기록(비공개) — 7월 20 · 27일 배치 결정, 8월 1일 RDS 결정, 8월 3일 NLB 경로 스파이크

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 6쪽](/portfolio/2026-10-15-v2/full.pdf#page=6)
