---
title: "TLS로 연결됐는데도 더 확인한 것: MySQL 호스트 검증과 MongoDB 장애 전환"
date: "2026-10-15T11:36:25+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "MySQL의 정상 TLS와 잘못된 호스트 거부를 짝으로 확인하고, MongoDB의 암호화·단일 primary 장애 전환을 별도 검증했습니다."
tags: ["개발 사례", "Shakedown"]
portfolio_cases: []
portfolio_pages: [51]
portfolio_edition: "2026-10-15-v2"
---

DB 연결에 TLS를 켜고 HTTP 200을 받으면 암호화 설정이 끝났다고 생각하기 쉽습니다. Shakedown의 실제 DB 연결을 검증하면서는 질문을 더 나눴습니다. 암호화된 연결인지, 의도한 서버인지, 장애 뒤 쓰기가 가능한지는 서로 다른 확인 항목이었습니다.

저는 SoftBank Hackathon에서 다중 DB 연결과 검증 범위를 정하고 실측 결과에 따라 보완을 확정했습니다. 조사·구현·프로브 실행에는 AI를 활용했습니다. 이 글은 2026년 10월 10일의 MySQL과 MongoDB 시험을 정리합니다. 모든 드라이버나 모든 장애 상황을 검증한 결과는 아닙니다.

## mysql2는 인증서 체인과 호스트명을 별도로 확인했습니다

실제 AWS 경로는 RDS MySQL 8.4.7, db.t3.micro, mysql2 3.24.5와 RDS CA 번들을 사용했습니다. 정상 연결과 Unicode 쓰기·읽기는 확인됐지만, 그 성공만으로 호스트 이름 검증까지 증명할 수는 없었습니다.

mysql2가 인증서 체인과 호스트명 검증을 별도로 다룬다는 점을 확인해 `rejectUnauthorized`와 `verifyIdentity`를 명시했습니다. 양성 시험은 정상 CA와 호스트로 연결하고, 음성 시험은 실제 네트워크 endpoint에 접속하되 TLS에서 기대하는 호스트 이름을 일부러 틀리게 넣었습니다.

| 시험 | 관측 | 결론 |
|---|---|---|
| 정상 CA·정상 호스트 | HTTP 200, TLS_AES_256_GCM_SHA384, Unicode 쓰기·읽기 | 해당 조합의 정상 연결 확인 |
| 정상 네트워크 주소·잘못된 TLS 호스트 | 호스트 불일치로 거부 | 신원 검증의 음성 경로 확인 |
| 초기 프로브의 오류 코드 기대 | 예상한 Node 오류 코드와 다름 | 프로브의 판정 기준 정정 |

mysql2는 하위 오류 코드를 `HANDSHAKE_SSL_ERROR`로 감쌌습니다. 그래서 첫 프로브가 거부 결과를 잘못 분류했습니다. 이것은 잘못된 호스트로 연결에 성공한 사건이 아니었습니다. 임의의 handshake 실패를 근거로 삼지 않고, 구체적인 호스트 불일치 메시지까지 확인하도록 프로브를 고쳤습니다. 변경은 [PR #29](https://github.com/SoftBankHackathon/shakedown/pull/29), 상세 조건은 [고정 커밋의 실측 보고서](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/2026-10-10-database-live-validation.md)에 있습니다.

## MongoDB에서는 암호화와 가용성을 따로 구성했습니다

MongoDB는 사용자 선택에 따라 DocumentDB가 아닌 EC2 직접 구성으로 진행했습니다. t3.small 3대와 3개 AZ에 MongoDB 8 replica set을 두고, 멤버마다 암호화 EBS, TLS, 멤버 인증, 앱 전용 계정을 적용했습니다. replica set은 여러 멤버가 데이터를 복제하고 primary를 선출하는 구성입니다.

앱에는 공개 CA와 앱 자격만 전달했습니다. 서버 private key나 관리자 자격은 주지 않았습니다. 이 선택은 연결과 권한을 구분하는 대신, 인증서·백업·멤버 교체의 운영 책임을 직접 관리하게 만듭니다. 자동 primary 선출을 EC2 호스트 자동 교체와 같은 기능으로 쓰지 않았습니다.

## 단일 장애가 쓰기에 미치는 영향을 관측했습니다

[MongoDB TLS·장애 전환 보고서](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/2026-10-10-mongodb-tls-failover.md)의 관측은 다음과 같습니다.

| 주입한 장애 | 새 primary에서 쓰기 확인 | 함께 남긴 관측 |
|---|---:|---|
| primary EC2 중지 | 2.13초 | 거친 표본 2개에서 실패 0 |
| primary 프로세스 SIGKILL | 12.24초 | HTTP 실패 2회, 선택한 기존 문서 보존 |

이 시간에는 요청부터 관측까지의 API·SSM 지연이 포함됩니다. 정밀 선출 시간이나 무중단 보장이 아닙니다. 표본 2개의 실패 0도 모든 요청이 성공했다는 증거가 될 수 없습니다.

MongoDB의 호스트명 음성 시험은 실패 원인을 격리하지 못했습니다. 따라서 MySQL에서 확인한 호스트 불일치 거부를 MongoDB까지 확인한 것처럼 옮기지 않았습니다. 두 멤버 장애, 자동 EC2 교체, 인증서 자동 갱신도 이 실측의 결과가 아닙니다.

연결 성공을 세 가지 질문으로 나누니 무엇을 더 시험해야 하는지가 보였습니다. 암호화, 서버 신원, 장애 후 쓰기를 각각 확인하고, 증거가 부족한 항목은 남겨 두는 것이 TLS 옵션 하나를 켠 것보다 중요한 작업이었습니다.

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=51)
