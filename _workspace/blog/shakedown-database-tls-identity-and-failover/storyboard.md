# storyboard — shakedown-database-tls-identity-and-failover

## 영상 1 PrimaryKillFailover (12초 반복 · 360프레임, 휴대폰판)

주장 하나: primary 프로세스를 SIGKILL로 죽이면(Docker 재시작을 잠시 끈 조건) 새 primary에서 쓰기가 돌아오기까지 장애 요청 시점부터 12.24초가 걸렸고, 그 사이 HTTP 요청 2회가 실패했다.

근거(공개): shakedown `fa50609` `docs/experiments/2026-10-10-mongodb-tls-failover.md` 22행, `docs/experiments/evidence/2026-10-10-mongodb-tls-failover.json` failovers[1].trace(1.89초 실패 · 7.15초 실패 · 12.19초 성공, 보고 값 12.24초), `infra/aws/scripts/experiment-mongo-failover.py` 31행(`docker update --restart=no` 뒤 `docker kill --signal KILL`), 29행(시계는 장애 요청 전에 시작).

화면 구성(1920×1080):
- 제목 한 줄: 「primary를 강제 종료한 뒤 쓰기가 돌아오기까지」
- 위: 멤버 상자 셋 가로 — 「멤버 1 · primary」 「멤버 2 · secondary」 「멤버 3 · secondary」 (IP 쓰지 않음). 왼쪽에 「앱(ECS)」 상자, 앱 → primary 쓰기 선.
- 아래: 시간축 0초 … 12.24초. 눈금 「0」 「1.89」 「7.15」 「12.24」 (초).

| 프레임 | 무엇 |
|---|---|
| 0–20 | 전체 등장. 앱 → 멤버 1(primary, 청록) 쓰기 선, 시간축 비어 있음 |
| 30 | 멤버 1에 빨간 「SIGKILL · 재시작 끔」, 상자 위험색 → 회색 점선. 시간축 재생점이 0에서 출발 |
| 30–330 | 재생점이 0→12.24 로 일정하게 이동(약 300프레임 = 10초, 실제 시간 비율 근사) |
| 1.89초 지점 | 시간축에 빨간 ✕ 표식 + 「HTTP 실패」, 앱 → 멤버 1 선 빨강 점선 |
| 7.15초 지점 | 두 번째 빨간 ✕ 「HTTP 실패」 |
| 7.15~12초 사이 | 멤버 2가 회색→청록으로 바뀌며 「선출」 이름표(시각 숫자 없음 — 선출 시각은 재지 않음) |
| 12.24초 지점 | 청록 ✓ 「쓰기 성공 · 12.24초」, 앱 → 멤버 2 쓰기 선 청록 |
| 330–360 | 멈춤(포스터 345) |

끝 프레임(포스터): 멤버 1 회색 점선(종료됨), 멤버 2 청록 「primary」, 시간축에 ✕ 두 개와 ✓ 「12.24초」. 혼자 봐도 「실패 2회 뒤 12.24초에 새 primary 쓰기」가 읽힌다.

휴대폰판(1080×1350): 멤버 상자 셋은 세로 3줄 또는 2+1, 시간축은 아래에 가로 전폭. 글자 48px 이상. 제목 두 줄.

캡션에 쓸 것: 시간은 장애 요청 시점부터 잰 값이며 제어 API·SSM 지연이 들어 있고 정밀 선출 시간이 아님.
