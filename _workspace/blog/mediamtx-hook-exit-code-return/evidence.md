# evidence — mediamtx-hook-exit-code-return

유형: 트러블슈팅. 2026-11-13 다시 씀(공개 근거만). PokeClip 동기 문장은 지우고 재현 결과로 시작한다.

| 주장 | 근거(공개) | 확인 | 종류 |
|---|---|---|---|
| #6155 생성 8/30 16:28 KST, 병합 8/30 19:55 KST, 병합 커밋 344d8c90(부모 8402a728), v1.21.0 | `gh api …/pulls/6155`, `git tag --contains` | 2026-11-13 | 문헌 · 코드 |
| 값 계산 후 버림 | 8402a728 `internal/externalcmd/cmd_os.go` 46–49 | 2026-11-13 | 코드 |
| 원인 커밋 7437ee7a(#2868, 2024-01-03, 첫 태그 v1.4.2): `return ee.ExitCode()` → `ee.ExitCode()` | `git show 7437ee7a -- internal/externalcmd/cmd_unix.go`, `git tag --contains --sort` | 2026-11-13 | 코드 |
| 이후 #5787(111302f9, 2026-05-19 파일 이름), #5834(5b9b6afc, 2026-06-05 AsType)를 지나도 누락 | `git log --follow cmd_os.go` | 2026-11-13 | 코드 |
| Windows는 정상 반환 | 8402a728 `cmd_os_windows.go` 124 (실행은 안 함) | 2026-11-13 | 코드 |
| run()의 분기: 0 → nil, Restart 끔 + nil → 보고 없음, 켬 + nil → code 0 | 8402a728 `cmd.go` 62–94 | 2026-11-13 | 코드 |
| TestCmdExitCode standard/restart, exit 5, 10초 제한 | 344d8c90 `cmd_test.go` 46–85 | 2026-11-13 | 코드 |
| 부모 트리(시험 이식): standard 10초 timeout, restart 「code 0」 FAIL × 3, 병합 PASS × 3 | measure/gotest/hook_*.txt | 23:03–23:04 KST | 실측(AI) |
| 바이너리 표(exit 5 · exit 1 · SIGTERM × 재시작 켬 · 끔 × v1.20.1 · v1.21.0) | measure/raw/, measure/raw_signal/, 각 summary.json | 23:11–23:18 KST | 실측(AI) |
| 시그널 종료 -1 | Go `os.ProcessState.ExitCode` 문서, raw_signal | 2026-11-13 | 문헌 · 실측 |
| OnExit 있는 6곳(runOnInit/Demand/Connect/Read/Online/Available)만 #6155 효과, 없는 7곳은 #6259(11/13 기준 열림) | seven-hooks 글과 그 evidence | 2026-11-13 | 코드 · 문헌 |

측정 메모: `gotest/hook_344d8c90.txt`는 HLS 측정용으로 `conf_test.go`를 옮겨 넣은 같은 트리에서 돌았다(header의 ` M internal/conf/conf_test.go`). 다른 패키지(`internal/externalcmd`)라 결과와 무관하다. raw/summary.json의 시그널 경우는 손으로 뺐고(`note` 키), 23:11–23:15 창에는 이 버린 실행(`$$` 시그널 시도)이 포함돼 있다.

첫 실행(raw/)은 시그널 경우를 `sh -c 'kill -TERM $$'`로 시도했으나 MediaMTX가 훅 명령의 `$$`를 먼저 치환해 kill이 pid 없이 실패했다(종료 코드 1로 보고됨). 그 경우는 raw에서 지우고, 외부에서 SIGTERM을 보내는 `--signal` 모드로 다시 쟀다(raw_signal/).

옛 값 정리: 10월 판의 비공개 현장 관측 문장은 지우고 AI 재측정으로 바꿨다.

역할: 범위 · 검증 기준 · 제출 결정 = 사용자, 구현 · 실측 = AI(Claude Code · Codex), 재측정 = AI(Claude Code).

PDF 41쪽(2026-10-15판)의 #6155 부분(ExitCode() 계산 뒤 return 누락, exit 5를 재시작 ON/OFF에서 검증)은 이 글과 일치 → 바닥글 차이 문장 없음.

재현: `measure/build.sh`, `python3 -I measure/run_hook.py <바이너리 폴더> <새 출력 폴더> 3 [--signal]`, `measure/gotest.sh <새 출력 파일> <작업 트리> ./internal/externalcmd '^TestCmdExitCode$' 3`.
