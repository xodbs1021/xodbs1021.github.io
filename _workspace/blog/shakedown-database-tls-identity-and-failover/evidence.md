# evidence — shakedown-database-tls-identity-and-failover (다시 쓰기, 2026-11-12)

유형: 실험·벤치마크(검증 조건 설계). 확인 날짜 2026-11-12. 공개 근거만 적는다.

## 역할

- 작성자 결정: MongoDB를 DocumentDB 대신 EC2에 직접 구성, TLS · 장애 전환 요구, 호스트 불일치 거부를 검증 조건으로 넣음(작성자 확인).
- 개발에 쓴 AI(Codex · Claude Code): 조사, 구현, 프로브 작성, 실험 실행.
- PR #12(13:12 KST) · #29(13:51 KST): 작성자 계정이 올리고 병합, 리뷰 0건(gh pr view). 「팀 승인」 표현 쓰지 않음.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| RDS MySQL 8.4.7 db.t3.micro, mysql2 3.24.5, RDS CA, HTTP 200 · TLS_AES_256_GCM_SHA384 · Unicode | https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/2026-10-10-database-live-validation.md#L12-L29 | 실측(AI 수행) |
| verifyIdentity 꺼지면 checkServerIdentity가 빈 함수 | https://github.com/sidorares/node-mysql2/blob/v3.24.5/lib/base/connection.js#L429-L451 | 문헌값(소스) |
| HANDSHAKE_SSL_ERROR로 코드 교체 | https://github.com/sidorares/node-mysql2/blob/v3.24.5/lib/commands/client_handshake.js#L319-L325 | 문헌값(소스) |
| URL에 rejectUnauthorized · verifyIdentity 명시 | https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/packages/contracts/runtime.mjs#L37 | 공개 코드 |
| 음성 프로브: wrong-host.invalid, 메시지 대조 | https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/examples/http-mysql/app.mjs#L19-L21 | 공개 코드 |
| hostnameMismatchRejected true, code HANDSHAKE_SSL_ERROR | https://github.com/SoftBankHackathon/shakedown/blob/27884114872398b81c25c7d2e5308cd5b1b63fd5/docs/experiments/evidence/2026-10-10-database-live-validation.json | 실측 |
| MongoDB 8.0, 3 AZ t3.small 3대, 암호화 EBS, requireTLS, keyfile, 앱은 CA · 앱 계정만 | https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/managed-databases.md#L73-L103 | 공개 문서 |
| CA 없는 TLS 거부, 평문 12초 timeout, 호스트명 음성 미확정 | https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/2026-10-10-mongodb-tls-failover.md#L16-L36 | 실측 |
| SIGKILL은 재시작 끈 조건(보고서 22행), 시간은 장애 요청부터(26–28행) | 같은 보고서 | 실측 |
| 실패 요청 1.89초 · 7.15초, 성공 12.19초 표본, 보고 값 12.24초; EC2 중지 표본 1.01 · 2.06초, 2.13초 | https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/docs/experiments/evidence/2026-10-10-mongodb-tls-failover.json | 실측 |
| docker update --restart=no 뒤 docker kill KILL, 시계 시작 위치, 1초 간격 · 7초 제한 | https://github.com/SoftBankHackathon/shakedown/blob/fa5060986b6e2f3c3811b8b16acf34530ae1d37d/infra/aws/scripts/experiment-mongo-failover.py#L7-L41 | 공개 코드 |
| 2.13 대 12.24초 차이의 해석(step down, heartbeat 10초) | MongoDB shutdown · elections · electionTimeoutMillis 문서 | 문헌값 + 해석(미측정이라고 본문에 밝힘) |

## 정정 (이전 판 대비)

- MongoDB 실험은 PR #29가 아니라 PR #12(head fa50609).
- SIGKILL 시험이 재시작을 일시적으로 끈 조건임을 추가, 시간은 장애 요청부터.
- CA 없는 TLS 거부 · 평문 12초 timeout 결과 추가.
- 메타 문장(「이 글은…」), 「후속 과제로 남길 수 있었다」 삭제 → 「검증하지 않은 범위」.

## 쓰지 않은 것

- 멤버 사설 IP, 인스턴스 · 스택 이름, 계정 정보, 내부 작업 경로.
