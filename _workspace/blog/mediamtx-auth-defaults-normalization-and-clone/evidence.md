# evidence — mediamtx-auth-defaults-normalization-and-clone

유형: 트러블슈팅. 2026-11-13 다시 씀(공개 근거만).

| 주장 | 근거(공개) | 확인 | 종류 |
|---|---|---|---|
| #6205 생성 9/7 01:12 KST, 병합 9/20 21:50 KST(aler9 「merged, thanks」), 병합 커밋 4906684c(부모 7bdbc965), v1.21.1(9/21 01:07 KST 공개)에 처음 포함, v1.21.0에 없음 | `gh api …/pulls/6205`, `git tag --contains` | 2026-11-13 | 문헌 · 코드 |
| DeepEqual 비교 7bdbc965 conf.go 666 / 4906684c 669 / v1.21.1 670 | 각 트리 grep | 2026-11-13 | 코드 |
| 대입 7bdbc965 441 → 4906684c 444 deepClone, IPs 212 | 같음 | 2026-11-13 | 코드 |
| deepClone 기존 사용처 Conf.Clone conf.go 615, Path.Clone path.go 443 | 4906684c | 2026-11-13 | 코드 |
| 원인: 8a4f2f5f(#5376, v1.16.0)가 IPNetworks.UnmarshalJSON 제거 + a4561a83(#5375) 함수가 원소 안까지 내려감, 9554fc4b(#3460, v1.8.3)가 기본값을 패키지 변수로 | PR #6205 본문 Cause, `git show 8a4f2f5f` | 2026-11-13 | 문헌 · 코드 |
| nil 슬라이스와 빈 슬라이스는 DeepEqual 다름 | Go reflect 문서 | 2026-11-13 | 문헌 |
| 바이너리 표(v1.15.6 · v1.21.0 · v1.21.1 × 기본 yml+이전 인증 / API paths/add / env alice) | measure/raw/summary.json | 23:08–23:10 KST | 실측(AI) |
| v1.15.6도 env + 이전 인증을 거부 — 환경변수가 공유 원소를 고치기 시작한 시점은 좁히지 않음 | 같음 | 2026-11-13 | 실측(AI) |
| 단독 실행 표(수정 전 · IPs만 · deepClone만 · 병합 × 시험 5개 × 3회) | measure/gotest/auth_alone.txt, measure/only_ips.patch, only_clone.patch | 23:05–23:06 KST | 실측(AI) |
| 한 프로세스 실행: 수정 전 트리에서 NotShared · EnvUser · ExplicitDefaults FAIL(ExplicitDefaults는 단독이면 PASS — 앞선 EnvUser가 전역 기본값을 바꿔 둠) | gotest/auth_7bdbc965_four.txt | 23:04 KST | 실측(AI) |
| Normalized 단독도 수정 전 PASS | gotest/auth_7bdbc965_normalized_alone.txt | 23:04 KST | 실측(AI) |
| -race 측정 시험: 수정 전 회당 DATA RACE 2건(쓰기 env.go 265, 읽기 manager.go 38) × 3, 병합 0, 인증 2,000번 중 거부 0 | gotest/auth_race_*.txt, race_measure_test.go | 23:07 KST | 실측(AI) |

옛 표현 정리: 옛 제목 「기본값을 복사했는데」는 부정확(슬라이스 머리만 대입)해서 바꿨다. PDF 39쪽(2026-10-15판)은 수치가 없고 내용이 일치 → 바닥글 차이 문장 없음.

역할: 범위 · 검증 기준 · 제출 결정 = 사용자, 구현 · 실측 = AI(Claude Code · Codex), 재측정 = AI(Claude Code).

재현: `python3 -I measure/run_auth.py <mediamtx 클론> <바이너리 폴더> <새 출력 폴더> 3`, `measure/alone.sh <새 출력 파일> 3 parent=<트리> only_ips=<트리> only_clone=<트리> merge=<트리>`, `measure/race_measure_test.go`를 `internal/conf`에 넣고 `measure/gotest.sh … '^TestMeasureLoadWhileAuthenticate$' 3 -race`.
