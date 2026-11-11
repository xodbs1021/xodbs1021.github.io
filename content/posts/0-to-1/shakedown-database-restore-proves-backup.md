---
title: "백업이 있다는 말 대신 새 DB에 복원한 데이터로 확인했습니다"
date: "2026-10-15T11:36:25+09:00"
lastmod: "2026-11-12T05:30:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "Shakedown에서 MySQL 수동 스냅샷을 새 RDS 인스턴스에 복원하고, 앱의 URL Secret을 새 주소로 바꿔 기존 행 조회 · 새 쓰기 · 응답의 DB 호스트 변경까지 확인했습니다. MongoDB는 secondary 볼륨 스냅샷을 새 볼륨에 복원해 네트워크를 끊은 별도 컨테이너에서 읽고 썼습니다. MongoDB 예약 백업은 AWS Backup 권한 부족과 조직 SCP 거부로 켜지 못했습니다."
tags: ["개발 사례", "Shakedown"]
portfolio_cases: []
portfolio_pages: [52]
portfolio_edition: "2026-10-15-v2"
---

새 DB에 스냅샷을 복원한 뒤 앱에서 예전 데이터를 읽었다고 해도, 앱이 여전히 원본 DB 주소를 보고 있다면 그 응답은 복원을 증명하지 못합니다. Shakedown의 복원 시험에서 가장 먼저 막아야 했던 거짓 성공입니다. 그래서 완료 조건을 셋으로 정했습니다. 복원한 새 대상에서 기존 데이터를 읽을 것, 새로 쓸 수 있을 것, 그리고 읽은 대상이 원본이 아니라는 것을 응답으로 보일 것입니다. 2026년 10월 10일 MySQL은 새 RDS 인스턴스에서 세 조건을 확인했습니다. MongoDB는 원본 replica set과 끊어 둔 별도 컨테이너에서 읽기 · 쓰기를 확인했고, 세 번째 조건은 응답 대신 네트워크 격리로 보장했습니다. MongoDB 예약 백업은 AWS Backup 권한 부족과 조직 SCP 거부로 켜지 못했고, 지금도 검증하지 않은 상태입니다.

Shakedown은 SoftBank Hackathon 2026 예선 산출물입니다(작업 2026년 10월 8~10일). 복원 대상을 원본과 격리하고 앱 연결까지 확인하라고 요구한 것, 수동 복원 성공과 자동 백업 완료를 따로 판단한 것은 제가 정했습니다. 복원 절차 구현과 실험 실행은 개발에 쓴 AI(Codex와 Claude Code)가 했습니다. 변경은 [PR #29](https://github.com/SoftBankHackathon/shakedown/pull/29)에 있고, 제 요청으로 제 계정에서 10월 10일 13:51에 병합했습니다. 리뷰는 없었습니다.

## 새 DB가 아니라 새 DB를 쓰는 앱을 확인했습니다

MySQL은 수동 RDS 스냅샷을 만들어, 원본에 덮어쓰지 않고 별도의 새 인스턴스(private · 암호화 db.t3.micro)로 복원했습니다. RDS 스냅샷 복원은 언제나 새 인스턴스를 만듭니다([AWS 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html)). 문제는 그다음입니다. 새 인스턴스가 생겨도 앱이 예전 URL Secret을 계속 쓰면, 정상 응답을 받아도 원본을 읽고 있을 수 있습니다.

그래서 연결 설정까지 바꿨습니다. 어댑터 설정을 복사해 DB 인스턴스 ID와 주소만 복원 인스턴스로 바꾸고 배포했습니다. 배포는 URL Secret을 새로 만들고, 그 Secret의 고정 버전을 가리키는 새 task definition을 등록합니다. 앱 이미지는 같은 불변 이미지를 그대로 썼습니다. 바뀐 것이 앱이 아니라 연결 대상뿐인 조건에서 확인하기 위해서입니다.

영상의 앞 장면이 막아야 했던 경우이고, 뒤 장면이 실제로 확인한 경로입니다. 둘을 가르는 것은 응답 칸의 DB 호스트입니다.

{{< motion scene="RestoreTargetCheck" id="fig-restore-target-check" kind="개념도" caption="복원 RDS를 만들어도 앱이 옛 URL Secret을 쓰면 원본 DB를 읽어 기존 행이 보이고, 응답의 DB 호스트는 원본 그대로입니다. URL Secret을 새로 만들고 새 task definition으로 다시 배포하자 앱이 복원 DB에서 기존 행을 읽고 새 행을 썼으며, 응답의 DB 호스트가 복원 인스턴스로 바뀌었습니다. 2026년 10월 10일 실험 순서를 옮긴 설명용 그림입니다." >}}

복원 인스턴스에서 원래 UUID · Unicode 행을 검증된 TLS로 찾았고, 새 행 쓰기도 성공했습니다. 응답에 담긴 DB 호스트 이름은 원본 시험 때와 달랐습니다([실측 원자료](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/evidence/2026-10-10-database-live-validation.json)). 같은 데이터가 보인다는 확인과 읽은 대상이 바뀌었다는 확인이 함께 있어야 원본 조회를 복원 성공으로 착각하지 않습니다.

| 확인 항목 | 필요한 이유 | 결과 |
|---|---|---|
| 기존 UUID · Unicode 행 조회 | 스냅샷의 데이터가 복원됐는가 | 확인 |
| 새 행 쓰기 | 읽기만 되는 상태가 아닌가 | 확인 |
| 검증된 TLS 연결 | 복원 주소에도 연결 조건을 지키는가 | 확인 |
| 응답의 DB 호스트 변경 | 원본을 다시 읽는 거짓 성공이 아닌가 | 확인 |

같은 시험에서 RDS 자동 백업 보존 기간은 1일이었고, 암호화된 자동 스냅샷이 available인 것도 봤습니다. 그러나 복원에 쓴 것은 수동 스냅샷입니다. 이 결과를 자동 백업 복원이나 시점 복구(PITR, Point-In-Time Recovery) 성공으로 바꿔 쓰지 않습니다([DB 실측 보고서 31–42행](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/2026-10-10-database-live-validation.md#L31-L42)).

## MongoDB는 원본 replica set과 격리했습니다

MongoDB는 EC2 세 대에 직접 둔 replica set이라 RDS 같은 관리형 복원 기능이 없습니다. 멤버 하나의 데이터 볼륨을 스냅샷으로 남기고, 그 스냅샷을 다른 볼륨으로 만들어 띄워 읽는 방식을 썼습니다. 시험 스택은 장애 전환 시험 뒤 고친 초기화 스크립트로 새로 만들었고, SSM으로 초기화를 다시 돌리지 않고도 생성이 끝났습니다.

복원 볼륨을 원래 replica set에 바로 붙이면, 읽은 데이터가 스냅샷에서 온 것인지 다른 멤버에게서 복제받은 것인지 가를 수 없습니다. 그래서 먼저 복원 데이터만 떼어 읽기로 했습니다. [[fig-mongo-isolated-restore]]의 청록 상자가 그 격리 지점입니다.

```mermaid {#fig-mongo-isolated-restore kind="재구성" caption="MongoDB 격리 복원 경로. 과반 쓰기 뒤 secondary에 문서가 있는지 확인하고, 그 멤버를 정상 종료해 데이터 EBS를 스냅샷으로 남긴 뒤 다시 시작합니다. 스냅샷은 같은 AZ의 새 암호화 볼륨으로 만들어 XFS nouuid로 마운트하고, --network none 별도 컨테이너(청록)에서 원래 문서를 읽고 새 문서를 쓰고 읽었습니다. 이 컨테이너는 원본 replica set에 합류할 수 없습니다. 2026년 10월 10일 DB 실측 보고서 44–57행의 재구성." source="https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/2026-10-10-database-live-validation.md#L44-L57"}
flowchart TB
  accTitle: MongoDB 격리 복원 경로
  accDescr: 과반 쓰기 뒤 secondary에 문서가 있는지 확인한다. 그 secondary를 정상 종료하고 데이터 EBS를 스냅샷으로 남긴 뒤 원래 멤버를 다시 시작한다. 스냅샷에서 같은 AZ의 새 암호화 볼륨을 만들고 XFS nouuid로 마운트한다. 네트워크를 끈 별도 MongoDB 컨테이너가 그 볼륨으로 떠서 원래 문서를 읽고 새 문서를 쓰고 읽는다. 이 컨테이너는 원본 replica set에 합류할 수 없다.
  w[과반 쓰기 뒤<br/>secondary에 문서 확인]
  stop[그 secondary 정상 종료]
  snap[데이터 EBS 스냅샷<br/>뒤 원래 멤버 재시작]
  vol[같은 AZ<br/>새 암호화 볼륨]
  mnt[XFS nouuid 마운트]
  ctr[별도 컨테이너<br/>--network none]
  ok[원래 문서 읽기<br/>새 문서 쓰기 · 읽기]
  rs[(원본<br/>replica set)]
  w --> stop --> snap
  snap --> vol --> mnt --> ctr --> ok
  ctr -. 합류할 수 없음 .- rs
  style ctr fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

secondary를 정상 종료한 뒤 스냅샷을 뜬 이유는 볼륨 스냅샷이 쓸 수 있는 데이터가 되려면, 받아들인 쓰기가 모두 디스크에 내려가 있어야 하기 때문입니다([MongoDB 파일시스템 스냅샷 문서](https://www.mongodb.com/docs/manual/tutorial/backup-with-filesystem-snapshots/)). 스냅샷에서 만든 볼륨은 원본과 XFS UUID가 같습니다. 같은 UUID의 파일시스템이 이미 마운트된 곳에서는 `nouuid` 옵션이 있어야 마운트됩니다([xfs(5)](https://man7.org/linux/man-pages/man5/xfs.5.html)).

복원 볼륨으로 띄운 MongoDB 컨테이너는 `--network none`으로 실행했습니다. 이 모드의 컨테이너에는 루프백 장치만 생깁니다([Docker 문서](https://docs.docker.com/engine/network/drivers/none/)). 복원 데이터 안의 replica set 설정을 보고 원본 멤버에 연락할 길이 없다는 뜻입니다. 그 상태에서 TLS와 맞는 관리자 자격으로 원래 문서를 읽고, 새 문서를 쓴 뒤 다시 읽었습니다.

여기서 확인한 것은 복원 볼륨의 데이터를 따로 읽고 쓸 수 있다는 것까지입니다. 복원 멤버를 replica set에 다시 넣거나 멤버를 교체하는 검증이 아닙니다. 원본 볼륨은 바꾸지 않았습니다. 포트폴리오 요약(2026-10-15판) 52쪽과 실측 원자료는 이 방식을 「격리 standalone」 복구로 적었습니다. 이 글은 보고서 본문을 따라 원본 replica set에 합류할 수 없는 별도 컨테이너라고 씁니다.

## 자동 백업은 권한 경계에서 막혀 있었습니다

MongoDB 예약 백업은 두 경로 모두 막혔습니다. AWS Backup은 백업 저장소(vault)를 만들 단계에서 백업 저장소 · KMS 권한이 부족해 거부됐습니다. EBS 스냅샷을 예약하는 DLM(Data Lifecycle Manager) 정책은 조직 SCP가 명시적으로 거부했습니다([MongoDB 실측 보고서 45–49행](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/2026-10-10-mongodb-tls-failover.md#L45-L49)). SCP(Service Control Policy)는 AWS Organizations가 소속 계정에 허용할 권한의 상한을 정하는 정책입니다([AWS 문서](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)). 복원 시험 때도 DLM 조회는 같은 SCP에 거부됐습니다.

다른 스케줄러로 우회하거나 권한을 넓히지 않았습니다. 템플릿에는 매일 03:00(KST)에 스냅샷을 떠 멤버마다 7개씩 남기는 DLM 정책이 있고 기본값은 켜짐이지만, 장애 전환 시험 스택은 이 정책을 끈 채 만들었습니다. 그 정책이 켜지더라도 결과는 멤버별 crash-consistent 볼륨 스냅샷이지, replica set 전체를 맞춘 백업이나 논리적 시점 복구는 아닙니다([설정 문서](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/managed-databases.md)). 수동 복원이 성공했다고 정기적으로 스냅샷을 남길 권한이나 동작이 생기지는 않습니다.

| 대상 | 이 실험으로 말할 수 있는 것 | 말할 수 없는 것 |
|---|---|---|
| MySQL | 새 RDS에 수동 스냅샷 복원, 앱 연결 교체와 읽기 · 쓰기 | 자동 백업 복원, PITR, 장기 보관 |
| MongoDB | 새 볼륨의 격리된 별도 컨테이너에서 데이터 읽기 · 쓰기 | 예약 백업, replica set 전체 재구성 |
| 자동 시험 | AWS 어댑터 45개 · 로컬 어댑터 12개 통과 | 모든 장애나 서비스 전 과정의 보장 |

실험 뒤에는 원본 · 복원 RDS, 수동 · 자동 스냅샷, 남은 자동 백업, ECR 저장소, Secret 6개가 모두 없어진 것을 따로 확인했습니다. 어댑터의 앱 중지 API는 ECS 서비스만 멈추고 DB와 기반 자원은 남기기 때문입니다.

복원 시험을 설계한다면 「데이터를 읽었다」 옆에 「어느 대상에서 읽었는가」를 응답으로 남기십시오. 이번 시험에서는 MySQL의 DB 호스트 대조와 MongoDB의 네트워크 격리가 그 역할을 했습니다.

## 측정 조건

- 2026년 10월 10일, 서울 리전 전용 실험 스택 두 개(MySQL, MongoDB). 팀 DB는 건드리지 않았고, 실험 ALB는 앱을 배포하기 전에 실험 클라이언트 주소로만 열었습니다. 기준 코드는 병합된 `3ffbcb0`에 이 TLS 수정을 더한 판이며 PR #29 head는 `2788411`입니다.
- MySQL: RDS MySQL 8.4.7(db.t3.micro, 암호화 private 저장소), mysql2 3.24.5, RDS CA 번들. 자동 백업 보존 1일. 복원은 수동 스냅샷 하나를 새 인스턴스로 한 번 했습니다.
- MongoDB: EC2 세 대 · 3개 AZ의 MongoDB 8.0 replica set, ECS 앱 태스크 2개. secondary 하나의 데이터 EBS를 한 번 스냅샷해 같은 AZ의 새 암호화 볼륨으로 복원했습니다.
- 실험은 개발에 쓴 AI가 실행했습니다. 실험 자원은 모두 지웠습니다.

## 출처

- [SoftBankHackathon/shakedown PR #29](https://github.com/SoftBankHackathon/shakedown/pull/29) — MySQL TLS 호스트 검증과 AWS DB 복원 실측(2026-10-10 병합)
- [DB 실측 보고서 「Database live validation — 2026-10-10」](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/2026-10-10-database-live-validation.md) — MySQL · MongoDB 복원 절차, 경계, 정리
- [DB 실측 원자료(JSON)](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/evidence/2026-10-10-database-live-validation.json) — 복원 전후 DB 호스트, 기존 행 조회와 새 쓰기
- [MongoDB 실측 보고서 「MongoDB TLS and automatic failover — 2026-10-10」](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/2026-10-10-mongodb-tls-failover.md#L45-L49) — AWS Backup 권한 부족과 DLM SCP 거부
- [`docs/managed-databases.md`](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/managed-databases.md) — MongoDB 구성과 선택 DLM 정책
- [AWS 문서 「Restoring to a DB instance」](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html) — RDS 스냅샷 복원은 새 인스턴스를 만듦
- [AWS 문서 「Service control policies (SCPs)」](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html) — SCP의 권한 상한
- [MongoDB 문서 「Back Up and Restore with Filesystem Snapshots」](https://www.mongodb.com/docs/manual/tutorial/backup-with-filesystem-snapshots/) — 스냅샷 시점의 쓰기가 디스크에 있어야 함
- [xfs(5) 매뉴얼](https://man7.org/linux/man-pages/man5/xfs.5.html) — 스냅샷 마운트의 `nouuid`
- [Docker 문서 「None network driver」](https://docs.docker.com/engine/network/drivers/none/) — 루프백만 있는 컨테이너

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=52)
