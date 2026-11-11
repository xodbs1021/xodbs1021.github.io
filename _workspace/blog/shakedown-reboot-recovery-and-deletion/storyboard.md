# storyboard — shakedown-reboot-recovery-and-deletion

## 영상 1 RebootTwiceTombstone (12초 반복 · 360프레임, 휴대폰판)

주장 하나: 고친 판에서 첫 재부팅 뒤에는 앱·DB 컨테이너와 Target API가 수동 명령 없이 돌아왔고, DELETE로 tombstone을 남긴 뒤 두 번째 재부팅에서는 컨테이너가 다시 생기지 않고 GET이 404를 유지했다.

근거(공개): shakedown `12ac8a8` `docs/experiments/2026-10-10-direct-deployment-reboot.md` 「Real EC2 test」 3–6단계, `docs/experiments/evidence/2026-10-10-direct-deployment-reboot.json`(verify · stop · verify-stop), `infra/local/delivery.mjs` 15행(unless-stopped), `infra/local/systemd/shakedown-local.service` 3–4행(After=docker), `infra/local/server.mjs` 55–64행(시작 때 state.json 읽기), 113행(deleted → 404), 123–131행(DELETE → deleted=true 저장).

화면 구성(1920×1080):
- 위: 「EC2 호스트」 큰 틀. 안에 「Docker」 띠, 그 위 컨테이너 칸 「앱」 「DB」, 옆에 「Target API(systemd)」 상자, 아래 「디스크」 띠에 「상태 파일」 · 「DB 볼륨」.
- 아래: 단계 띠 다섯 칸 「배포 · 데이터 2건」 「재부팅 ①」 「DELETE」 「재부팅 ②」 — 지금 단계만 청록.

| 프레임 | 무엇 |
|---|---|
| 0–20 | 앱 · DB 컨테이너 실행 중(잉크), Target API 실행, 디스크 「상태: ready」 「DB 볼륨 · 2건」. 단계 「배포」 강조 |
| 40 | 「재부팅 ①」: 호스트 틀이 어두워지고 컨테이너 · API 사라짐(회색 점선). 이름표 「boot ID 바뀜」 |
| 70 | Docker 띠 다시 켜짐 → 앱 · DB 컨테이너 청록으로 다시 생김, 이름표 「unless-stopped」 |
| 95 | Target API 다시 켜짐, 이름표 「Docker 뒤 시작」. 디스크 상태 파일을 읽는 선 |
| 120 | 청록 이름표 「수동 명령 없이 복귀 · 데이터 2건」 |
| 150 | 「DELETE」: 앱 · DB 컨테이너 지워짐, 디스크 「상태: 삭제됨(tombstone)」 빨간 테두리 대신 굵은 잉크 + 이름표, 「DB 볼륨」은 남음. 이름표 「204 · 다시 DELETE 204 · GET 404」 |
| 200 | 「재부팅 ②」: 호스트 어두워짐 → Docker 켜짐(컨테이너 칸 비어 있음, 점선) |
| 240 | Target API 켜짐 → tombstone을 읽는 선 |
| 270 | 이름표 「컨테이너 다시 생기지 않음 · GET 404」 |
| 300–360 | 멈춤(포스터 345) |

끝 프레임(포스터): 컨테이너 칸 비어 있음, Target API 실행, 디스크 tombstone + DB 볼륨 남음, 단계 띠 마지막 칸 강조, 404 이름표.

휴대폰판(1080×1350): 호스트 틀 세로, 단계 띠는 아래 두 줄. 글자 48px 이상.

캡션에 쓸 것: Node/PostgreSQL 앱 한 개로 한 실험, 시간 비율은 실제가 아님. 첫 실험(고치기 전)의 재부팅은 이 영상에 없다.
