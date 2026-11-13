# evidence — mediamtx-seven-hooks-missing-exit-callback

유형: 트러블슈팅. 2026-11-13 다시 씀(공개 근거만).

| 주장 | 근거(공개) | 확인 | 종류 |
|---|---|---|---|
| 13곳 중 6곳만 OnExit | `git grep "externalcmd.Cmd{"` / `OnExit:` (테스트 제외) — 04825598 · 065f94c2 · v1.21.3 모두 13 · 6 | 2026-11-13 | 실측(코드 셈) |
| 6곳 started / 7곳 launched | 04825598 `internal/hooks/on_*.go`, `internal/core/path.go` 1044–1069 | 2026-11-13 | 코드 |
| OnExit nil → 빈 함수 | 04825598 `externalcmd/cmd.go` L37–40 | 2026-11-13 | 코드 |
| 재시작 안 하는 명령은 실패 때만 OnExit | `cmd.go` L72–81 | 2026-11-13 | 코드 |
| ed775608(#2355) 2023-09-16 | `git log -1 ed775608` | 2026-11-13 | 코드 |
| 이슈 #3372 launched만, 오타 의심 | https://github.com/bluenviron/mediamtx/issues/3372 , PR #6259 본문 | 2026-11-13 | 문헌 |
| #6155 v1.21.0 포함 | merge 344d8c90, `git tag --contains` → v1.21.0 | 2026-11-13 | 코드 |
| #6259 열림, 9/23 생성, head 69280137(10/26 커밋, 10/27 강제 push) | `gh pr view 6259`, 타임라인 API | 2026-11-13 | 문헌 |
| 옛 head acb903fb(10/8)는 path_test.go 포함 | `gh api repos/bluenviron/mediamtx/commits/acb903fb` 파일 목록 | 2026-11-13 | 문헌 |
| 현재 head 시험 = hooks_test.go TestHookCommandExited, 5종 | head 파일 | 2026-11-13 | 코드 |
| +21/-0 6개 파일 | PR 본문, `gh pr view --json files` | 2026-11-13 | 문헌 |
| 22 launched / 0 vs 22 exited | measure/counts.txt (3회씩 + race 1회) | 2026-11-13 18:43–18:47 KST | 실측(AI) |
| go test 통과 / v1.21.3 실패 | measure/gotest_*.txt | 2026-11-13 | 실측(AI) |

옛 값 정리: 9/7 비공개 실측의 사건 수는 재측정(22, SRT 읽기·맨 TCP 연결 추가)으로 바꾸고 지움. 「path.go 녹화 훅 2종은 서버 테스트로」는 옛 head 기준이라 현재 head 사실로 고침.

역할: 범위 · 검증 기준 · 제출 결정 = 사용자, 구현 · 실측 = AI(Claude Code · Codex), 재측정 = AI(Claude Code).

재현: `measure/run.sh <mediamtx> <새 출력 폴더>` (probe.yml 이 옆에 있어야 함), `python3 measure/count.py <폴더>/server.log`.
