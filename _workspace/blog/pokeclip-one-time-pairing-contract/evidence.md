# 근거 — pokeclip-one-time-pairing-contract (2026-11-12 다시 씀)

유형: 의사결정. 확인 날짜 2026-11-12. 코드 기준 PokeClip-mono develop `825a3dfe`(2026-11-11 07:16 KST). 공개 근거만 적는다.

| 주장 | 근거 | 종류 | 수행 주체 |
|---|---|---|---|
| 8자 · 10분 · 일회용, 발급 계정당 분당 3회, 교환 IP당 분당 5회 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/pairing/PairingCodeService.java#L26-L30 | 코드 | 값 결정: 글쓴이(7/24, 비공개 결정 기록) · 서버 구현: 팀원 |
| 코드 원문 대신 SHA-256 해시 저장 | 같은 파일 54–56행 | 코드 | 팀원 |
| 시도 기록은 별도 트랜잭션, 실패도 셈 | 같은 파일 93–119행 | 코드 | 팀원 |
| 409 · 410 · 404 · 429 대응 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/api/StreamKeyExceptionHandler.java#L38-L43 | 코드 | 팀원 |
| 앱 기본 forward-headers none · 운영 Terraform 정의 native · 신뢰 대역 VPC | auth application.yml 134–144 · prod/platform/services.tf 76–80 | 코드(적용 상태 미확인) | — |
| 시도 기록 보관 1분 미만이면 6번째 교환이 404 | application.yml 336 · 349 | 코드 주석 | — |
| 만료 뒤 1시간 보관 · 10분 주기 청소 · 청소 뒤 404 | application.yml 322–352 · RetentionCleanerPairingCodesTest | 코드 · 시험 | 팀원 |
| 반복 실패 잠금 없음 | PairingCodeService 상수 · 비공개 결정 기록 | 코드 | — |
| 9/13 연동: 교환 · 재사용 409 · 0600 | PR #179 본문 「실측」 표 | 실측(팀원) | 팀원 |
| 9/13 기본 주소 HTTP · send_passphrase=false 사유 | PR #179 본문 121 · 127행 부근 | 기록 | 팀원 |
| 기본 주소 HTTPS 커밋 59fb8822(9/30), #179 머지 4aab73df(10/1) | git log | 코드 | 팀원 |
| develop 기본 HTTPS · send_passphrase true | obs-plugin/src/constants.hpp 35–37 · config.hpp 23 | 코드 | 팀원 |
| 운영 응답기 PR #392(10/25 KST 머지) · 11월 운영 passphrase 실사용 확인 기록 없음 | gh pr view 392 | 기록 | — |

쓰지 않은 것: 운영 라이브 창 상태, 11월 운영 passphrase 실사용(「확인 기록 없음」으로만).
