---
title: "TLS로 연결됐는데도 더 확인한 것: MySQL 호스트 검증과 MongoDB 장애 전환"
date: "2026-10-15T11:36:25+09:00"
lastmod: "2026-10-16T15:20:57+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "MySQL의 정상 TLS와 잘못된 호스트 거부를 짝으로 확인하고, MongoDB의 암호화·단일 primary 장애 전환을 별도 검증했습니다."
tags: ["개발 사례", "Shakedown"]
portfolio_cases: []
portfolio_pages: [51]
portfolio_edition: "2026-10-15-v2"
---

정상적인 DB 주소로 TLS 연결에 성공했습니다. 그렇다면 같은 서버에 접속하되 TLS에서 기대하는 호스트 이름만 틀리게 넣으면 거부될까요. Shakedown의 DB 검증에서는 성공하는 설정을 확인한 다음, 반드시 실패해야 하는 조건을 짝으로 만들었습니다.

MySQL에서는 잘못된 호스트의 거부를 확인했고, MongoDB에서는 primary 장애를 주입해 새 primary에서 쓰기가 돌아오는지 살폈습니다. **프로세스를 강제 종료한 시험에서는 12.24초 뒤 쓰기를 확인했지만, 그 사이 HTTP 실패 2회가 있었습니다.** 연결 성공과 장애 복구를 서로 다른 근거로 설명해야 하는 이유입니다.

저는 SoftBank Hackathon에서 다중 DB 연결을 보완하며, 정상 연결만으로 완료하지 않고 호스트 불일치 거부와 장애 뒤 새 쓰기를 검증 조건에 넣었습니다. 조사·구현·프로브 실행에는 AI를 활용했습니다. 이 글은 2026년 10월 10일의 MySQL과 MongoDB 시험을 정리합니다. 모든 드라이버나 모든 장애 상황을 검증한 결과는 아닙니다.

## mysql2는 인증서 체인과 호스트명을 별도로 확인했습니다

실제 AWS 경로는 RDS MySQL 8.4.7, db.t3.micro, mysql2 3.24.5와 RDS CA 번들을 사용했습니다. 정상 연결과 Unicode 쓰기·읽기는 확인됐지만, 그 성공만으로 호스트 이름 검증까지 증명할 수는 없었습니다.

mysql2가 인증서 체인과 호스트명 검증을 별도로 다룬다는 점을 확인해 `rejectUnauthorized`와 `verifyIdentity`를 명시했습니다. 양성 시험은 정상 CA와 호스트로 연결하고, 음성 시험은 실제 네트워크 endpoint에 접속하되 TLS에서 기대하는 호스트 이름을 일부러 틀리게 넣었습니다.

| 시험 | 관측 | 결론 |
|---|---|---|
| 정상 CA·정상 호스트 | HTTP 200, TLS_AES_256_GCM_SHA384, Unicode 쓰기·읽기 | 해당 조합의 정상 연결 확인 |
| 정상 네트워크 주소·잘못된 TLS 호스트 | 호스트 불일치로 거부 | 신원 검증의 음성 경로 확인 |
| 초기 프로브의 오류 코드 기대 | 예상한 Node 오류 코드와 다름 | 프로브의 판정 기준 정정 |

첫 음성 프로브는 연결 거부를 받았는데도 기대한 오류 코드를 찾지 못했습니다. mysql2가 Node의 하위 오류 코드를 `HANDSHAKE_SSL_ERROR`로 감싸서 반환했기 때문입니다. 여기서 연결 설정을 완화하면 오히려 확인하려던 조건이 사라집니다.

프로브 쪽을 고쳐 감싸진 오류 안의 구체적인 호스트 불일치 메시지를 확인했습니다. 단순히 handshake가 실패했다는 것만으로 통과 처리하지도 않았습니다. 이 실험에서 필요했던 증거는 네트워크 오류가 아니라 **의도적으로 틀린 신원을 거부했다는 것**이었습니다. 변경은 [PR #29](https://github.com/SoftBankHackathon/shakedown/pull/29), 상세 조건은 [고정 커밋의 실측 보고서](https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/2026-10-10-database-live-validation.md)에 있습니다.

## MongoDB에서는 암호화와 가용성을 따로 구성했습니다

MongoDB는 제가 DocumentDB 대신 EC2에 직접 구성하는 방식을 선택했습니다. t3.small 3대와 3개 AZ에 MongoDB 8 replica set을 두고, 멤버마다 암호화 EBS, TLS, 멤버 인증, 앱 전용 계정을 적용했습니다. replica set은 여러 멤버가 데이터를 복제하고 primary를 선출하는 구성입니다.

앱에는 공개 CA와 앱 자격만 전달했습니다. 서버 private key나 관리자 자격은 주지 않았습니다. 이 선택은 연결과 권한을 구분하는 대신, 인증서·백업·멤버 교체의 운영 책임을 직접 관리하게 만듭니다. 자동 primary 선출을 EC2 호스트 자동 교체와 같은 기능으로 쓰지 않았습니다.

## 단일 장애가 쓰기에 미치는 영향을 관측했습니다

replica set이 준비됐다는 것과 primary가 사라진 뒤 앱이 다시 쓸 수 있다는 것은 다릅니다. 호스트 중지와 프로세스 강제 종료를 따로 주입하고, 새 primary에 실제 쓰기가 성공하는 시점까지 관측했습니다. [MongoDB TLS·장애 전환 보고서](https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/2026-10-10-mongodb-tls-failover.md)에 두 실행의 조건이 있습니다.

| 주입한 장애 | 새 primary에서 쓰기 확인 | 함께 남긴 관측 |
|---|---:|---|
| primary EC2 중지 | 2.13초 | 거친 표본 2개에서 실패 0 |
| primary 프로세스 SIGKILL | 12.24초 | HTTP 실패 2회, 선택한 기존 문서 보존 |

두 실행 모두 새 primary에서 쓰기는 돌아왔습니다. 그러나 EC2 중지의 표본 2개에서 실패가 없었다는 사실보다 SIGKILL 시험에서 실제 요청 실패 2회가 있었다는 점이 서비스 설명에 더 중요했습니다. 앱이 선출을 기다리는 동안 실패할 수 있다는 결과이므로 무중단이라고 정리할 수 없습니다. 시간에는 API·SSM 지연도 포함돼 있어 정밀한 선출 시간과는 구분합니다.

MongoDB의 호스트명 음성 시험은 실패 원인을 격리하지 못했습니다. 따라서 MySQL에서 확인한 호스트 불일치 거부를 MongoDB까지 확인한 것처럼 옮기지 않았습니다. 두 멤버 장애, 자동 EC2 교체, 인증서 자동 갱신도 이 실측의 결과가 아닙니다.

검증을 끝낼 기준을 HTTP 200 하나로 두었다면 호스트명 검사와 장애 중 요청 실패는 드러나지 않았을 것입니다. 이번에는 정상 연결 옆에 잘못된 신원의 거부를, 정상 replica set 옆에 primary를 잃은 뒤의 쓰기를 놓았습니다. 그 결과 MySQL의 호스트 검증은 확인할 수 있었고, MongoDB의 일부 신원 검증과 더 큰 장애 범위는 후속 과제로 남길 수 있었습니다.

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=51)
