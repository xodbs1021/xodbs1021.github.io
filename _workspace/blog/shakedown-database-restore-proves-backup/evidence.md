# evidence — shakedown-database-restore-proves-backup (다시 쓰기, 2026-11-12)

유형: 실험·벤치마크(복원 검증). 확인 날짜 2026-11-12. 공개 근거만 적는다.

## 역할

- 작성자 결정: 복원 대상의 격리와 앱 연결 확인 요구, 수동 복원과 자동 백업 완료를 따로 판단, PR #29 병합 요청(작성자 확인).
- 개발에 쓴 AI(Codex · Claude Code): 복원 절차 구현, 실험 실행, 정리.
- PR #29: 작성자 계정이 2026-10-10 13:51 KST 병합, 리뷰 0건.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 수동 스냅샷 → 새 private 암호화 db.t3.micro, 설정 복사 후 ID · 주소만 교체, URL Secret 재생성 · 새 task definition | https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/2026-10-10-database-live-validation.md#L31-L42 | 실측(AI 수행) |
| 같은 불변 이미지로 재배포 | 같은 보고서 「Reproduce the MySQL probe」 5단계 | 공개 문서 |
| 원래 행 found, 새 쓰기 ok, host 값이 원본과 다름 | https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/evidence/2026-10-10-database-live-validation.json | 실측(호스트 값은 본문에 쓰지 않음) |
| 자동 백업 보존 1일, 자동 스냅샷 available, 복원은 수동 스냅샷 | 같은 보고서 33–42행 | 실측 |
| MongoDB 새 스택 SSM 재실행 없이 생성, secondary 정상 종료 · EBS 스냅샷 · 같은 AZ 새 암호화 볼륨 · XFS nouuid · --network none 별도 컨테이너 · 원본 replica set 합류 불가 | 같은 보고서 44–57행 | 실측 |
| AWS Backup vault 권한 부족, DLM SCP 거부, 권한 확대 없음 | https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/2026-10-10-mongodb-tls-failover.md#L45-L49, dbval 「Boundaries」 | 실측 |
| DLM 템플릿 매일 03:00 KST · 멤버별 7개 · crash-consistent · 기본 켜짐 | https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/managed-databases.md#L112-L124 | 공개 문서 |
| AWS 45 · 로컬 12 시험, 자원 제거 독립 확인(Secret 6개 등) | dbval 「Validation」 · 「Cleanup」 | 실측 |

## 정정 (이전 판 대비)

- 「standalone」은 보고서 본문에 없음(「separate MongoDB container」 · 「could not join the active replica set」) → 「별도 컨테이너」. 실측 원자료(JSON)의 method · limitations 문자열에는 「standalone」이 있음. PDF 52쪽 「격리 standalone」은 날짜 문장으로 처리.
- AWS Backup 권한 거부를 SCP 거부와 함께 적음.
- 메타 문장(「이 글은 … 실험 기록입니다」) 삭제.

## 쓰지 않은 것

- DB 호스트 이름 · 사설 IP, 볼륨 · 스냅샷 · 명령 ID, 계정 정보.
