# evidence — mediamtx-offline-recording-source-lifecycle

유형: 의사결정. 2026-11-13 다시 씀(공개 근거만). 원 작성자는 GitHub 로그인(AbdElrahmaN31)만 쓴다.

| 주장 | 근거(공개) | 확인 | 종류 |
|---|---|---|---|
| 이슈 #5587(3/18 생성): alwaysAvailable이면 24/7 녹화, 실제 소스 연결 때만 녹화하는 선택지 요청 | `gh api …/issues/5587` | 2026-11-13 | 문헌 |
| #5767(AbdElrahmaN31, 5/14 20:30 KST 생성, 9/5 닫힘, 병합 안 됨) | `gh api …/pulls/5767` | 2026-11-13 | 문헌 |
| 원 PR 동작: setAvailable에서 미룸, doAddPublisher에서 시작, executeRemovePublisher에서 멈춤, reload는 `pa.source != nil` | `git show 4a69843a -- internal/core/path.go` | 2026-11-13 | 코드 |
| 8/30 08:32 KST 리뷰(publisher 경로 확인 + static source 두 빈틈 + setOnline/setOffline 제안) | `gh api …/pulls/5767/reviews` | 2026-11-13 | 문헌 |
| 9/3 17:48 KST #6182 생성, 원 커밋을 main 위로 옮겨 첫 커밋 4a69843a(부모 0cf86df3), 같은 시각 #5767에 「원하면 닫겠다」 댓글 | PR 본문, `git log` , #5767 댓글 | 2026-11-13 | 문헌 · 코드 |
| aler9 9/5 19:13 KST: static source 분석 동의, #6182로 이동, 원 작성자에게도 크레딧 | #5767 issuecomment-5551100866 | 2026-11-13 | 문헌 |
| 병합 9/5 19:22 KST squash 1a6e23a0 + Co-authored-by(원 작성자) | `git show 1a6e23a0` | 2026-11-13 | 코드 |
| 파일 몫: 원 커밋 = docs 08-always-available.md · conf/path.go · conf_test.go · core/path.go, 보완 5bff8b89 = mediamtx.yml · api/openapi.yaml · 시험 198줄 · core/path.go | `git show --stat 4a69843a 5bff8b89` | 2026-11-13 | 코드 |
| setOnline/setOffline 녹화, reload는 isOnline() | 1a6e23a0 path.go 900–932 · 475 | 2026-11-13 | 코드 |
| setOnline · setOffline은 #5956(2026-07-18 병합)에서 생겨 원 PR 기준 커밋(09a733e5)에는 없음 | `git log -S'func (pa *path) setOnline'`, merge-base 확인 | 2026-11-13 | 코드 |
| 기본값 true | 1a6e23a0 conf/path.go 375 | 2026-11-13 | 코드 |
| 시험 3개: 4a69843a(시험 이식) publisher만 PASS, static source 「recording did not start」, reload 「expected 0 actual 1」 FAIL × 3; 5bff8b89 · 1a6e23a0 · v1.21.0 · v1.21.3 3/3 × 3; 1a6e23a0 -race 1회 PASS, DATA RACE 0 | measure/gotest/offline_*.txt | 23:10–23:16 KST | 실측(AI) |
| v1.21.0 바이너리: 구간별 새 파일 true 4·4·4, false 0·4·0 (3회 같음) | measure/raw/summary.json | 23:12–23:14 KST | 실측(AI) |

리뷰 본문의 「대안: doSourceStaticSetReady/NotReady에 같은 조건 추가」 대신 공통 전환으로 옮긴 판단은 리뷰 문장(“both gaps close, and the two source-transition sites … collapse into the shared methods”)에 근거한다.

옛 표현 정리: 「원 작성자 커밋 보존」은 「PR 브랜치 첫 커밋으로 유지, 병합은 squash + 공동 작성자」로 고쳤다. PDF 40쪽(2026-10-15판)의 「커밋을 보존」 표현과 다르다는 문장을 바닥글에 둔다.

역할: 범위 · 검증 기준 · 제출 결정 = 사용자, 구현 · 실측 = AI(Claude Code · Codex), 재측정 = AI(Claude Code).

재현: `measure/gotest.sh <새 출력 파일> <작업 트리> ./internal/core '^TestPathRecordAlwaysAvailableRecorded' 3`(:8554 고정, 순서대로), `python3 -I measure/run_offline.py <바이너리 폴더> <새 출력 폴더> 3`. 원자료에 녹화 파일 자체는 넣지 않았다.
