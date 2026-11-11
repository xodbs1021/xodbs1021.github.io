# evidence — shakedown-reboot-recovery-and-deletion (다시 쓰기, 2026-11-12)

유형: 트러블슈팅 + 실험(복구 조건 설계). 확인 날짜 2026-11-12. 공개 근거만 적는다.

## 역할

- 작성자 결정: 터널 없는 직접 배포 · 재부팅 자동 기동 · 제품 API 경로 연결 요구, 「DELETE 뒤 살아나지 않아야 한다」 조건(작성자 확인).
- 개발에 쓴 AI(Codex · Claude Code): 구현, 두 실험 실행, 정리.
- PR #31: 작성자 계정이 2026-10-10 15:02 KST 병합, 리뷰 0건.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 첫 실험: 재부팅 뒤 자동 실행 서비스 []; 수동 compose up 뒤 데이터 2건 | https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/evidence/2026-10-10-onprem-ec2.json (reboot-verify) | 실측(AI 수행) |
| 첫 실험은 Target API 없이 composeSpec 출력(터널 제거 · 앱 포트 추가), 재시작 정책 없음 | https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/2026-10-10-onprem-ec2.md#L40-L54 | 공개 보고서 |
| 첫 실험의 「loopback」 표시는 하네스 기본값이고 실제로는 앱 포트를 클라이언트 /32에만 공개, 제어 API는 127.0.0.1 | 같은 보고서 35–37, 73–85행 | 공개 보고서 |
| 고친 판: unless-stopped, systemd After=docker, 상태 · tombstone 디스크, DELETE 시 볼륨 유지 | https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/2026-10-10-direct-deployment-reboot.md#L7-L22, delivery.mjs L15, shakedown-local.service L3-L4, server.mjs L55-64 · L122-132 | 공개 코드 |
| 배포 1–2단계, 첫 재부팅 boot ID, 자동 복구 · 데이터 2건 · 외부 HTTP, 409 유지, DELETE 204/204/404, 두 번째 재부팅 미부활 · tombstone | 같은 보고서 24–50행, evidence/2026-10-10-direct-deployment-reboot.json | 실측 |
| 엔진 421 + 로컬 16 = 437, 12개 재실행은 합산 안 함 | 같은 보고서 75–83행 | 실측 |
| 한계: health 의존 순서, 앱 재시도, 기존 배포는 재배포 필요, 엔진 설치 안 함, ready는 마지막 검사, 주소 고정 전제 | 같은 보고서 56–71행 | 공개 보고서 |

## 소제목 대응

- 승인 뼈대의 「첫 재부팅은 수동 명령 없이 돌아왔습니다」는 고친 판(Target API) 실험의 첫 재부팅을 말한다. 고치기 전 첫 실험에도 재부팅이 있었고 그때는 수동 명령이 필요했으므로, 혼동을 막으려 「고친 판의 첫 재부팅은 수동 명령 없이 돌아왔습니다」로 고침(id 유지).

## 쓰지 않은 것

- 인스턴스 ID, 스택 이름, boot ID 값, 주소, 계정 정보.
