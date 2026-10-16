---
title: "백업이 있다는 말 대신 복원한 데이터로 확인했습니다"
date: "2026-10-15T11:36:25+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "MySQL 수동 스냅샷과 MongoDB 데이터 볼륨을 새 대상에 복원하고, 이전 데이터·새 쓰기를 검증하며 자동 백업의 권한 한계를 구분했습니다."
tags: ["개발 사례", "Shakedown"]
portfolio_cases: []
portfolio_pages: [52]
portfolio_edition: "2026-10-15-v2"
---

백업 목록에 스냅샷이 보인다고 그 데이터로 서비스를 다시 시작할 수 있는 것은 아닙니다. 복원된 DB를 앱이 실제로 바라보는지, 예전 데이터를 읽고 새 데이터를 쓸 수 있는지까지 확인해야 합니다. Shakedown에서는 원본을 건드리지 않는 별도 대상에 복원하고 이 조건을 검사했습니다.

저는 SoftBank Hackathon에서 DB 연결과 복구의 완료 조건을 정했습니다. 조사·구현·실험 실행에는 AI를 활용했고, 수동 복원 성공과 자동 백업 지원을 구분해 결과를 확정했습니다. 이 글은 [PR #29](https://github.com/SoftBankHackathon/shakedown/pull/29)에 포함된 2026년 10월 10일의 전용 실험 기록입니다.

## 새 DB가 아니라 새 DB를 쓰는 앱을 확인했습니다

MySQL은 수동 RDS 스냅샷을 새 private·encrypted db.t3.micro 인스턴스로 복원했습니다. 원본 인스턴스에 덮어쓰지 않았습니다. 하지만 복원만으로 검증이 끝나지는 않습니다. 앱이 예전 URL Secret을 계속 사용하면, 정상 응답을 받아도 실제로는 원본 DB를 읽고 있을 수 있기 때문입니다.

복원된 instance ID와 endpoint로 어댑터 설정을 바꾸고, URL Secret을 다시 생성했습니다. 새 task definition은 그 Secret의 불변 버전을 참조하도록 했습니다. 같은 불변 이미지로 재배포한 뒤 기존 UUID·Unicode 행을 찾고 새 쓰기를 수행했습니다.

| 확인 항목 | 필요한 이유 | 결과 |
|---|---|---|
| 기존 UUID·Unicode 행 조회 | 스냅샷의 데이터가 복원됐는가 | 확인 |
| 새 행 쓰기 | 읽기만 가능한 상태가 아닌가 | 확인 |
| 검증된 TLS 연결 | 복원 endpoint에도 연결 조건을 지키는가 | 확인 |
| 응답의 DB 호스트 변경 | 원본을 다시 읽는 거짓 성공이 아닌가 | 확인 |

[실측 보고서](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/2026-10-10-database-live-validation.md)는 자동 스냅샷이 available인 것도 기록합니다. 그러나 복원에 사용한 것은 **수동 스냅샷**입니다. 이를 자동 백업 복원이나 시점 복구(PITR) 성공으로 바꾸어 쓰지 않았습니다. RDS의 일반 복원 절차는 [AWS 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html)와 함께 확인할 수 있습니다.

## MongoDB는 원본 replica set과 격리했습니다

MongoDB에서는 majority write 이후 선택한 secondary에 문서가 있는지 확인하고 해당 멤버를 정상 종료한 뒤 데이터 EBS를 스냅샷으로 남겼습니다. 원래 멤버는 다시 시작했습니다. 복원은 같은 AZ의 새 암호화 EBS 볼륨에서 진행했습니다.

XFS 파일시스템을 `nouuid`로 마운트하고, 복원 볼륨을 별도의 MongoDB 컨테이너에 연결했습니다. 컨테이너는 `--network none`으로 격리해 원본 replica set에 합류하지 않게 했습니다. TLS와 맞는 관리자 자격으로 원래 문서를 읽고 새 문서를 쓰고 다시 읽었습니다.

여기서 확인한 것은 복원 볼륨의 데이터와 독립된 읽기·쓰기입니다. 전체 replica set을 다시 구성하거나 멤버를 자동 교체하는 검증이 아닙니다. 원본 볼륨을 교체하지 않았다는 점도 실험의 조건입니다.

## 자동 백업은 권한 경계에서 막혀 있었습니다

MongoDB 예약 스냅샷을 준비하는 과정에서 DLM 조회가 조직 SCP에 의해 명시적으로 거부됐습니다. SCP는 조직 차원에서 허용 권한의 경계를 정하는 정책입니다. 다른 스케줄러로 우회하거나 권한을 넓히는 작업은 하지 않았습니다. 따라서 수동 복원이 성공해도 MongoDB 자동 백업은 미활성·미검증 상태로 남습니다.

| 항목 | 이 실험으로 말할 수 있는 것 | 말할 수 없는 것 |
|---|---|---|
| MySQL | 새 RDS에 수동 스냅샷 복원, 앱 연결과 읽기·쓰기 | PITR, 장기 보관 정책의 검증 |
| MongoDB | 새 볼륨의 격리 standalone에서 데이터 확인 | 예약 백업 성공, 전체 replica set 복구 |
| 자동 테스트 | AWS 45개·로컬 12개 통과 | 실제 모든 장애나 서비스 E2E의 보장 |

실험 뒤에는 전용 실험에서 생성한 원본·복원 인스턴스, 스냅샷, Secrets의 제거를 별도로 확인했습니다. 앱 중지 API만 호출했다고 기반 자원이 정리되는 것은 아니기 때문입니다.

복구를 검증할 때 가장 경계한 것은 성공처럼 보이는 다른 경로였습니다. 스냅샷 존재, DB 생성, 원본 조회의 성공을 각각 배제하고, 복원 대상에 연결한 앱의 데이터로 확인해야 했습니다.

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=52)
