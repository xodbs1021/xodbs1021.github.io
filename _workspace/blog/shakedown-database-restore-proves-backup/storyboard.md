# storyboard — shakedown-database-restore-proves-backup

## 영상 1 RestoreTargetCheck (12초 반복 · 360프레임, 휴대폰판)

주장 하나: 복원 DB를 만들어도 앱이 옛 Secret(원본 주소)을 계속 쓰면 원본을 읽은 응답이 「복원 성공」처럼 보인다. URL Secret을 새로 만들고 새 task definition으로 재배포한 뒤, 응답의 DB 호스트가 바뀐 것까지 봐야 복원한 대상에서 읽었다고 말할 수 있다.

근거(공개): shakedown `2788411` `docs/experiments/2026-10-10-database-live-validation.md` 33–42행, `docs/experiments/evidence/2026-10-10-database-live-validation.json` mysql.initial.host ≠ mysql.restored_verification.host, 같은 id 행 found=true, restored_write ok.

화면 구성(1920×1080), 같은 도식에서 강조만 옮긴다:
- 왼쪽 「앱(ECS)」, 가운데 「URL Secret」, 오른쪽 위 「원본 RDS」, 오른쪽 아래 「복원 RDS(새 인스턴스)」.
- 앱 아래 응답 칸: 「기존 행」 「DB 호스트」.
- IP·호스트 이름은 쓰지 않는다. 호스트는 「원본 호스트」 / 「복원 호스트」로만.

| 프레임 | 무엇 |
|---|---|
| 0–20 | 전체 등장. 복원 RDS는 이미 있음(「스냅샷에서 복원」 회색 이름표) |
| 30–90 | 장면 1 「거짓 성공」: Secret이 「옛 버전 · 원본 주소」, 앱 → Secret → 원본 RDS 선(잉크). 응답 칸 「기존 행 ✓」 「DB 호스트: 원본」 |
| 100 | 응답 칸 「DB 호스트: 원본」이 빨갛게, 빨간 이름표 「복원 대상을 읽지 않음」. 복원 RDS는 흐린 채 아무 선도 없음 |
| 150–180 | 장면 전환: Secret 상자가 「새 버전 · 복원 주소」로 바뀌며 청록, 앱 상자에 「새 task definition」 이름표 |
| 190–250 | 앱 → Secret → 복원 RDS 청록 선, 원본 RDS로 가던 선은 회색으로 사라짐 |
| 260 | 응답 칸 「기존 행 ✓」 「새 쓰기 ✓」 「DB 호스트: 복원」(청록) |
| 290 | 청록 이름표 「복원한 대상에서 읽음」 |
| 300–360 | 멈춤(포스터 345) |

끝 프레임(포스터): Secret 새 버전, 앱 → 복원 RDS 청록, 응답에 기존 행 · 새 쓰기 · 호스트 복원. 위쪽 구석에 흐린 「원본」.

휴대폰판(1080×1350): 앱 · Secret · 두 RDS를 세로로, 응답 칸은 아래. 글자 48px 이상.
