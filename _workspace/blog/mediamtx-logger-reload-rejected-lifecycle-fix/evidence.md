# evidence — mediamtx-logger-reload-rejected-lifecycle-fix

유형: 트러블슈팅. 2026-11-13 다시 씀(공개 근거 + AI 재측정만).

| 주장 | 근거(공개) | 확인 | 종류 |
|---|---|---|---|
| v1.21.1 closeLogger 다섯 조건 → 서버 · 경로 관리자 재생성 | v1.21.1(04825598) core.go L970–975, closePathManager · closeRTSPServer · closeAPI가 closeLogger 포함 | 2026-11-13 | 코드 |
| Cmd.Close는 기다리지 않음 | 04825598 externalcmd/cmd.go L48–51 | 2026-11-13 | 코드 |
| 풀 대기는 newConf == nil만 | core.go L1329–1332 | 2026-11-13 | 코드 |
| OnExit → Core.Log → p.logger, reloadConf가 p.logger 씀 | core.go L375–377 · L1342–1360 | 2026-11-13 | 코드 |
| #2278 5a40a06e부터 | PR #6206 본문 | 2026-11-13 | 문헌 |
| 첫 판 = 줄마다 Core 수준 잠금, Logger.Log도 자기 mutex | aler9 2026-09-20T15:32Z(= 9/21 00:32 KST) 댓글, v1.21.1·v1.21.2 logger.go L153–154 | 2026-11-13 | 문헌 · 코드 |
| 9/23 drain으로 다시 씀 | head 0151a87a author date 2026-09-23 09:16 KST, commit date 10-08 | 2026-11-13 | 코드 |
| #6206 core.go +6/-1, L979 · L1333–1337 · API L1258–1261 | `git diff v1.21.1 pr6206`, head 파일 | 2026-11-13 | 코드 |
| 시험 3개 · start start exit → start exit start · -race -count=20 macOS · golang:1.26-alpine3.24 | PR #6206 본문 | 2026-11-13 | 문헌 |
| PATCH는 reloadConf 전에 응답 | v1.21.1 core.go L413–422 | 2026-11-13 | 코드 |
| aler9 10/11 교착 댓글(원문 인용) | https://github.com/bluenviron/mediamtx/pull/6206#issuecomment-6109821272 | 2026-11-13 | 문헌 |
| #6206 닫힘 10/11 23:02 KST, #6326 머지 23:22 KST, v1.21.3 10/25 20:06 KST | `gh pr view`, `gh release list` | 2026-11-13 | 문헌 |
| ef80a852는 v1.21.2 조상 아님 · v1.21.3 조상 | `git merge-base --is-ancestor` | 2026-11-13 | 코드 |
| v1.21.3 logger.Reload, closeLogger 없음 | v1.21.3 core.go L1048–1067 | 2026-11-13 | 코드 |
| **v1.21.3도 logLevel 변경이면 경로 관리자 · RTSP · API 재생성** | v1.21.3 core.go L1132–1133(closePathManager에 LogLevel), closeRTSPServer · closeAPI가 closePathManager 포함. 재측정 gap_v1.21.3_*: RTSP closed 10/10, 송출자 10/10 끊김 | 2026-11-13 | 코드 · 실측(AI) |
| logFile 변경이면 v1.21.3은 RTSP를 닫지 않음 | 재측정 file_v1.21.3_sigint3: RTSP closed 0/10, 송출자 끊김 0 | 2026-11-13 | 실측(AI) |
| RTSP 공백 중앙값 | measure/summary.json(gap_*): v1.21.1 0.247 · 0.36, #6206 0.255 · 3034.956(3020.77–3168.181), 0b1fb9e1 0.278 · 0.347, ef80a852 0.39 · 0.34, v1.21.3 0.303 · 0.259 (ms, 훅 없음 · 3초 훅) | 2026-11-13 21:09–21:18 KST | 실측(AI) |
| 훅 순서 | summary.json hook_order: v1.21.1 start start exit…, #6206 start exit start… | 2026-11-13 | 실측(AI) |
| 순환 | summary.json cycle_*: #6206 5/5 gave_up_after_10s, API down 10.031–10.181 s; 나머지 saw_new_level 0.04–0.35 s, API down ≤ 6 ms | 2026-11-13 21:18–21:20 KST | 실측(AI) |
| logFile 공백 | file_*: v1.21.1 0.321, #6206 3020.42, v1.21.3 닫힘 0 | 2026-11-13 21:22–21:26 KST | 실측(AI) |
| 포크 pokeclip.2 = #6206 방식 6d83f76c | `gh api repos/xodbs1021/mediamtx/git/refs/tags/v1.21.1-pokeclip.2` → 태그 객체 → ff1f75bb, compare 6d83f76c...ff1f75bb = ahead(포함), core.go diff가 #6206과 같음 | 2026-11-13 | 문헌 · 코드 |

정정 · 바뀐 판단:
- 승인 뼈대의 5절 「v1.21.3은 … 서버도 그대로 둡니다」는 재측정과 코드로 틀림 → 「… 훅을 기다리지 않습니다」로 쓰고, logLevel은 여전히 재생성 · logFile은 재생성 안 함을 본문에 씀.
- 9/20 aler9 댓글은 KST로 9/21.
- 옛 비공개 실측값은 지우고 재측정으로 바꿈. PR 본문 공개 값(0.25ms 대 3.01초)만 비교로 인용.
- 순환 재현은 AI가 만든 「API가 새 설정을 돌려줄 때까지 기다리는 훅」 — 리뷰어 지적의 한 방법으로만 씀.

역할: 범위 · 검증 기준 · 제출 결정 = 사용자, 구현 · 실측 = AI(Claude Code · Codex), 재측정 = AI(Claude Code).

재현: `measure/build.sh <worktree> <bin>`(GOMODCACHE · GOCACHE 환경 변수), `measure/run_all.sh <bin 폴더> <새 출력 폴더>`(logFile 단계는 같은 스크립트 끝의 두 번째 단계), `python3 -I measure/analyze.py <출력 폴더>`. 원자료는 measure/raw(경로는 <OUT>으로 바꿈).
