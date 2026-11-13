# evidence — mediamtx-certificate-watcher-close-join

유형: 트러블슈팅. 2026-11-13 다시 씀(공개 근거 + AI 재측정만).

| 주장 | 근거(공개) | 확인 | 종류 |
|---|---|---|---|
| v1.21.1 Close는 done · 감시자 닫고 cert=nil 후 반환, watch는 cert 넣은 뒤 Parent.Log | 04825598 certloader.go L149–202 | 2026-11-13 | 코드 |
| 감시자는 끝날 때 신호 채널을 닫음 | confwatcher.go L115 | 2026-11-13 | 코드 |
| select 무작위 선택 | Go 명세 Select statements | 2026-11-13 | 문헌 |
| 탐침 100번 · 재설정 70번 · 50/50 | PR #6261 본문 | 2026-11-13 | 문헌(PR) |
| CertLoader 사용처 RTSP · RTMP · MoQ · httpp.Server | PR #6261 본문 | 2026-11-13 | 문헌 |
| #6261 +5줄, wg | `git diff v1.21.1 pr6261` | 2026-11-13 | 코드 |
| base 04825598, head 7d95a222(9/23 작성 · 10/8 강제 push, 옛 head 296e3cea는 fetch 불가) | merge-base, gh | 2026-11-13 | 코드 |
| 시험 L56–124 | pr6261 certloader_test.go | 2026-11-13 | 코드 |
| 재측정 20회 | measure/summary.txt · raw/closeduringreload_*.txt: v1.21.1 20 FAIL(0.02–0.03s), 7d95a222 · 989ea15a · v1.21.3 · 065f94c2 20 PASS(0.52–0.53s) | 2026-11-13 21:18:57–21:20:58 KST | 실측(AI) |
| aler9 원문, 10/25 18:58 KST 닫힘, #6417 19:03 KST 머지 | 댓글 issuecomment-6396229498, gh | 2026-11-13 | 문헌 |
| #6417 terminate/done, 시험 없음(+10/-3, 1파일) | `git diff b5df4626 989ea15a --stat` | 2026-11-13 | 코드 |
| 상류 main 3b1c4e87 시험 = TestCertReload · TestCloseAutoCert | `git grep '^func Test' origin/main -- internal/certloader` | 2026-11-13 | 코드 |
| 포크 pokeclip.2 = #6261 판 42e8a20d(wg) | 태그 → ff1f75bb, compare ahead, fork certloader.go에 wg.Wait | 2026-11-13 | 코드 |

삭제: 「10/4 macOS/arm64 · Go 1.26.5」, 원 로그 40행, 머리 상태 갱신 상자(본문 흡수), 「10/15 OPEN」(틀림 — 10/25 닫힘).

역할: 범위 · 검증 기준 · 제출 결정 = 사용자, 구현 · 실측 = AI(Claude Code · Codex), 재측정 = AI(Claude Code).

재현: `measure/run_test.sh <worktree> measure/closeduringreload_test.go TestCloseDuringReload 20 <출력 파일>`(GOMODCACHE · GOCACHE).
