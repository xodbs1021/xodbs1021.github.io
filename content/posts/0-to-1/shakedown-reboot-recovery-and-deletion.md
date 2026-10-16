---
title: "재부팅 후에는 살아나고, 삭제 후에는 살아나지 않아야 했습니다"
date: "2026-10-15T11:36:25+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "수동 시작이 필요했던 초기 결과를 보완하고, 제품 API 배포 뒤 재부팅 복구와 DELETE 뒤 미부활을 두 번의 실제 EC2 재부팅으로 확인했습니다."
tags: ["개발 사례", "Shakedown"]
portfolio_cases: []
portfolio_pages: [53]
portfolio_edition: "2026-10-15-v2"
---

EC2를 재부팅한 뒤 데이터 두 건은 남아 있었지만 실행 중인 컨테이너는 0개였습니다. 수동으로 `compose up`을 실행하자 앱이 돌아왔습니다. 데이터가 보존된 것은 맞지만, 이를 자동 복구 성공으로 볼 수는 없었습니다.

SoftBank Hackathon의 Shakedown에서 이 공백을 확인한 뒤, 저는 터널 없는 직접 배포와 호스트 재부팅 뒤 자동 기동을 제품 API 경로에 연결하는 범위를 정했습니다. 그리고 복구 시험에 반대 조건도 추가했습니다. **삭제한 배포는 재부팅해도 다시 살아나면 안 됩니다.** 구현과 실험 실행에는 AI를 활용했고, 동작의 완료 조건과 결과 판단을 제 기여로 구분합니다.

## 데이터를 남기는 것과 서비스를 다시 시작하는 것은 달랐습니다

복구에는 여러 책임이 있습니다. DB 볼륨이 남아야 하고, 앱과 DB 컨테이너가 시작돼야 하며, 이를 제어하는 Target API도 돌아와야 합니다. 운영자가 이미 삭제한 배포라면 이 자동 기동 대상에서 제외해야 합니다.

| 책임 | 적용한 동작 |
|---|---|
| 앱·DB 컨테이너 | Docker `restart: unless-stopped` |
| 제어 API | Docker 이후 systemd Target API 시작 |
| 상태 보존 | 배포 상태와 삭제 tombstone을 디스크에 유지 |
| 삭제 | 컨테이너·네트워크 제거, DB 볼륨 보존 |

tombstone은 해당 배포가 삭제됐다는 기록입니다. 컨테이너가 없다는 현재 상태만 보고 다시 만들지 않도록, 삭제 의도를 영속적으로 남기는 데 사용했습니다. 변경은 [PR #31](https://github.com/SoftBankHackathon/shakedown/pull/31)에 포함됐고 2026년 10월 10일 병합됐습니다.

## 직접 배포의 주소도 운영자가 정하도록 했습니다

direct 모드는 Cloudflare Tunnel 없이 운영자가 설정한 origin을 사용합니다. 어댑터가 임의의 다른 주소를 반환해도 엔진이 받아들이지 않도록 정확한 origin을 확인하고, 실제 공개 URL이 HTTP 200을 반환한 뒤 ready로 표시합니다. redirect나 TLS 오류는 성공으로 처리하지 않습니다.

한 주소에는 삭제하지 않은 배포 하나만 예약할 수 있습니다. 같은 ID와 본문은 멱등하게 처리하고, 다른 배포가 경쟁하면 409로 거부합니다. 실패한 배포도 자원을 소유할 수 있으므로 DELETE 전까지 예약을 유지합니다. 새 배포가 기존 자원을 덮는 것을 성공처럼 처리하지 않기 위한 경계입니다.

## 수동 명령 없는 첫 재부팅을 확인했습니다

2026년 10월 10일 전용 Amazon Linux 2023 t3.medium EC2에서 Node 앱과 Node/PostgreSQL 앱을 실제 Target API로 배포했습니다. 생성된 Compose 파일을 편집하거나 수동 `compose up`을 실행하지 않았습니다. 관리에는 SSM을 사용했고, 앱 포트 이외 DB·Target API 포트의 외부 인입은 열지 않았습니다.

[고정 커밋의 실험 보고서](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/2026-10-10-direct-deployment-reboot.md)의 핵심 순서는 다음과 같습니다.

| 단계 | 실제 확인한 상태 |
|---|---|
| API 배포 | Node 앱 ready·DELETE 후 Node/PostgreSQL 앱 ready |
| 데이터 준비 | 두 번째 행 쓰기·조회로 총 2건 확인 |
| 첫 EC2 재부팅 | Linux boot ID 변경으로 호스트 재부팅 확인 |
| 복구 확인 | 새 POST·수동 시작 없이 API·앱·DB 기동, 데이터 2건·외부 HTTP 확인 |
| 경쟁 요청 | 다른 배포 ID는 여전히 409 |
| DELETE | 204, 반복 DELETE 204, GET 404, DB 볼륨 보존 |
| 두 번째 재부팅 | 컨테이너 미부활, 삭제 상태 404 유지 |

엔진 421개와 로컬 16개, 총 437개의 자동 테스트도 해당 시점에 통과했습니다. 최종 port guard 뒤 재실행한 12개는 관련 테스트의 재확인이며 전체 합계에 다시 더하지 않았습니다. 시험에서 보존한 DB 볼륨도 마지막에 명시적으로 제거했습니다.

## restart 정책만으로 모든 준비 순서를 해결하지는 못했습니다

호스트 재부팅 때 Docker가 Compose의 health dependency 순서를 보장하는 것은 아닙니다. 앱은 DB 연결을 재시도하거나 시작 실패 시 종료해 재시작될 수 있어야 합니다. 프로세스가 살아 있지만 회복하지 않는 상태까지 restart 정책이 해결하지는 않습니다.

실제 호스트 재부팅 시험은 Node/PostgreSQL 조합입니다. MySQL·MongoDB에도 구성 테스트와 같은 restart 정책은 있지만, 이 시험에서 해당 DB의 호스트 재부팅을 실측하지 않았습니다. 실제 사내망, HTTPS 발급, HA, 호스트 유실, 전체 scanner·LLM·브라우저 E2E도 검증 범위 밖입니다. ready는 마지막 성공 확인이지 상시 상태 감시가 아닙니다.

복구의 목표는 무조건 모든 것을 다시 띄우는 것이 아닙니다. 남아 있어야 할 데이터와 실행 의도는 복구하고, 삭제 의도는 유지해야 합니다. 두 번의 재부팅을 나눠 확인하면서 이 차이를 제품 동작의 계약으로 만들었습니다.

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=53)
