# storyboard — pokeclip-media-host-restart-lifecycle

## 영상 1 CrashLeftoverContainer (반복 12초 = 360프레임, 휴대폰판)

주장: 미디어 상자 유닛이 비정상 종료되면 정리 단계가 컨테이너를 내리지 못해, 옛 비밀을 든 MediaMTX가 헬스 200으로 살아남고 다음 기동은 실패를 반복한다. 고친 뒤에는 `ExecStopPost`가 compose `down`으로 컨테이너를 내리고, 다음 기동이 새 비밀 파일과 새 컨테이너를 만든다.

같은 네 칸을 위 줄(고치기 전) · 아래 줄(고친 뒤)에 두고 강조만 옮긴다(데스크톱은 왼→오 화살표로 연결).
1. 「systemd 유닛」(휴대폰 「유닛」)
2. 「MediaMTX」(컨테이너)
3. bind 원본 칸: 「비밀 파일」 → (위) 「디렉터리」 / (아래) 「새 비밀 파일」
4. 「다음 기동」 → (아래) 「새 컨테이너」

| 프레임 | 무엇 |
|---|---|
| 0–15 | 제목 · 두 줄 상자 등장. 아래 줄은 흐리게(30%) 깔아 둔다 |
| 20 | 위 · 유닛: 점선 회색 + Tag 「SIGKILL」(danger) |
| 50 | 위 · MediaMTX는 그대로 ink(살아 있음) + Tag 「헬스 200」(ink, 겉보기 정상) |
| 75 | 그 아래 Tag 「옛 비밀」(danger) — 정상처럼 보이지만 틀린 상태 |
| 105 | 위 · 비밀 파일: 점선 회색 + Tag 「비밀 파일 삭제」(muted) |
| 135 | 같은 칸이 「디렉터리」(danger) + Tag 「파일 자리에 디렉터리」(danger). 데스크톱은 「비밀 파일 삭제」 아래에 쌓고, 휴대폰은 그 자리를 대신한다 |
| 165 | 위 · 다음 기동: danger + Tag 「기동 실패 반복」. 앞 화살표 danger, 상자 둘레에 1초 박자로 퍼지는 고리(반복) |
| 200–215 | 아래 줄이 또렷해진다 |
| 210 | 아래 · 유닛: 점선 회색 + Tag 「SIGKILL」(같은 사건) |
| 240 | 아래 · MediaMTX: 점선 회색(내려감) + Tag 「ExecStopPost → down」(accent), 앞 화살표 accent |
| 270 | 아래 · 「새 비밀 파일」(accent) + Tag 「create_host_path: false」(accent) |
| 300 | 아래 · 「새 컨테이너」(accent) + Tag 「--force-recreate」(accent) |
| 312–360 | 끝 프레임 유지(포스터 프레임 350) |

끝 프레임: 위 줄은 SIGKILL → 살아남은 MediaMTX(헬스 200 · 옛 비밀) → 디렉터리 → 기동 실패 반복(빨강), 아래 줄은 SIGKILL → 내려간 MediaMTX(ExecStopPost → down) → 새 비밀 파일 → 새 컨테이너(강조색). 혼자서도 「정리를 건너뛰면 옛 컨테이너가 남고, down과 재생성으로 고친다」가 읽혀야 한다.

- 색: 정상 = ink, 고친 경로 = accent, 오류 · 실패 = danger, 꺼짐 · 지워짐 = muted. 「헬스 200」은 일부러 ink(정상처럼 보임).
- 수치 없음. 시간 간격은 설명용이며 실제 재시작 주기 · 횟수가 아니다.
- 휴대폰판: 두 줄을 세로로 쌓고, 줄마다 네 칸을 위→아래 목록으로(상자 왼쪽 · 이름표 오른쪽). 화살표 없음. 글자 48px 이상.
- `ExecStopPost` · `down` · `create_host_path: false` · `--force-recreate` 같은 설정 이름은 영문 그대로.
