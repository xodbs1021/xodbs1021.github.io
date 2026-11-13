# evidence — mediamtx-certloader-no-watcher-shutdown

유형: 트러블슈팅. 2026-11-13 다시 씀(공개 근거 + AI 재측정만). 문체 '~습니다'로 전환, 1인칭 삭제.

| 주장 | 근거(공개) | 확인 | 종류 |
|---|---|---|---|
| #6417 이후 Close가 <-done, watch만 close(done) | v1.21.3 certloader.go L151–153 · L175 | 2026-11-13 | 코드 |
| no-watch 분기 L72–107, b5b63d02(#5815, 6/3 KST) | v1.21.3 certloader.go, `git log -1 b5b63d02`, 조상 확인 | 2026-11-13 | 코드 |
| 기본 yml moq: true · auto.key · auto.crt | v1.21.3 mediamtx.yml L445–461 | 2026-11-13 | 코드 |
| AllowAuto: true는 MoQ만, httpp AllowAutoCert 미설정 | `git grep AllowAuto v1.21.3`, PR 본문 | 2026-11-13 | 코드 |
| 읽기 전용 FS 지원 | PR #6098(aler9, 8/16 23:03 KST 머지) | 2026-11-13 | 문헌 |
| 재측정: 판 4 × 디렉터리 2 × 5회 | measure/summary.txt, raw/moq_*: b5df4626 · 065f94c2 모두 종료, 989ea15a · v1.21.3 읽기 전용 0/5(10초 뒤 SIGKILL, 마지막 줄 [MoQ] closing) | 2026-11-13 21:23–21:26 KST | 실측(AI) |
| 기본 설정(포트 +20000) | raw/default_v1.21.3_*: 읽기 전용 [SRT] closing · [MoQ] closing 뒤 멈춤, 쓰기 가능 9.58ms | 2026-11-13 | 실측(AI) |
| TestCloseAutoCert 재측정 | raw/closeautocert_*: not saved는 989ea15a · v1.21.3만 5/5 FAIL | 2026-11-13 21:21–21:22 KST | 실측(AI) |
| #6427 머지 10/27 05:03 KST, 부모 9540cb6c = v1.21.3 | gh, `git log` | 2026-11-13 | 문헌 · 코드 |
| 11/13 기준 최신 릴리스 v1.21.3, main 3b1c4e87 | `gh release list`, `git rev-parse origin/main` | 2026-11-13 | 문헌 |

삭제: 「10/26~27 기록」 4조건 표의 비공개 행, 「10/28 확인 최신 릴리스」(→ 11/13), 「나는」 1인칭, 메타 문장(「이 글은 …정리한다」).
태그: 다른 글처럼 한국어 · 대문자 표기를 더하되, 옛 태그 페이지(/tags/shutdown/ · /tags/goroutine/ · /tags/regression-test/)가 data/legacy-paths.json에 있어 그 셋은 남김(묶음 1 선례).

역할: 범위 · 검증 기준 · 제출 결정 = 사용자, 구현 · 실측 = AI(Claude Code · Codex), 재측정 = AI(Claude Code).

재현: `measure/build.sh`, `measure/run_all.sh <bin 폴더> <v1.21.3 mediamtx.yml> <새 출력 폴더>`(일반 사용자), `python3 -I measure/summarize.py <출력 폴더>`, `measure/run_test.sh <worktree> measure/closeautocert_test.go TestCloseAutoCert 5 <출력 파일>`. 쓰기 가능 디렉터리에서 만들어진 auto.key · auto.crt는 저장소에 넣지 않음.
