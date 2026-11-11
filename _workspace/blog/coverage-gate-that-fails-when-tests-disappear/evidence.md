# evidence — coverage-gate-that-fails-when-tests-disappear

- 글 유형: 트러블슈팅(증상 재현 → 장치 → 음성 대조 → 한계). 확인일 2026-11-12.
- 공개 근거: PokeClip-mono PR #77, Actions run 3개(API·로그), 고정 커밋 blob. 비공개 근거: 볼트 비공개 기록(2026-08-17~18 커버리지 게이트 작업 기록 · 2026-10-06 포트폴리오 실측 재검증 기록 · 2026-08-18 main 보호 가동 결정 기록). 비공개 근거는 글에 링크하지 않는다.
- 고정 커밋: develop `2fc2323cbd84a683e935bfdf9f0171febf276535`(2026-11-12 02:10:08 KST). PR #77 당시 게이트 커밋 `aa625a31b2727afadb7fc8fd150f7828b463fc15`.

## 주장별 근거

| 주장 | 출처 | 확인일 | 근거 종류 | 수행 주체 | 비고 |
|---|---|---|---|---|---|
| 80%는 사용자가 80과 100을 놓고 논의한 뒤 확정 | 볼트 비공개 기록(08-17 작업 진행 기록 「80 vs 100 논의 종결 — 80% 확정」) · PR #77 본문 「임계 조정(80 외의 값) — (사용자) 확정, 재론 없음」(본문 71행) | 2026-11-12 | 기록 | 사용자 | 글에는 「제가 80과 100을 놓고 논의한 뒤 80%로 정했습니다」 |
| 3개 패키지(index·upload·indexer 각각 80%)와 「테스트를 빼서 실패 확인」은 티켓 완료 조건 | PR #77 본문 28–33행(완료 조건 ①②) · 49행(티켓 문언) · 볼트 비공개 기록(작업 진행 기록 14·19행) | 2026-11-12 | 기록 | 티켓(작성자 미상) | 사용자 결정으로 쓰지 않는다 |
| 구현·PR 작성·Actions 실증은 AI(Claude Code), 계획·코드 검토는 Claude Code와 Codex | 볼트 비공개 기록(작업 진행 기록 39–48행: [cc]·[cx] 듀얼 리뷰, developer·pr-author·pr-reviewer) · PR #77 본문 「검수자 [cc] 수행」(44행) | 2026-11-12 | 기록 | AI | |
| 병합은 사용자 승인 뒤 | PR #77 본문 184–185행(「ready 전환과 머지는 (사용자) 승인 후에만」) · 볼트 비공개 기록(종결 49행) | 2026-11-12 | 기록 | 사용자 승인 | |
| PR #77 병합 2026-08-18 11:07:02 KST(02:07:02Z), base `main`, 병합 커밋 `34eac52`, 변경 2파일 +31/-1 | `gh pr view 77` | 2026-11-12 | 공개 API | — | 커밋 `38c31a8`(게이트) + `aa625a3`(문서) |
| Go 요약 % 는 `%.1f` 반올림 → 원시 프로파일 정수쌍 `cov*100 < tot*80` 판정 | PR #77 본문 18행 · [media-ci.yml@aa625a3 L136–L154](https://github.com/3K-PokeClip/PokeClip-mono/blob/aa625a31b2727afadb7fc8fd150f7828b463fc15/.github/workflows/media-ci.yml#L136-L154) | 2026-11-12 | 코드 | AI 구현 | |
| `-race` → atomic 모드, 실행 횟수 >1 이므로 `$3>0` | PR #77 본문 22행 · 같은 파일 주석 | 2026-11-12 | 코드 | | |
| index ⊂ indexer 접두사 → 정확 키 조회 | PR #77 본문 24행 | 2026-11-12 | 코드 | | |
| 게이트는 테스트와 다른 스텝, `if: always()` 금지(프로파일은 테스트 실패해도 쓰임) | PR #77 본문 20행 · [media-ci.yml@2fc2323c L168–L172 주석](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L168-L172) | 2026-11-12 | 코드 | | |
| 정상 실행: run [32089173930](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089173930), 커밋 aa625a31, pull_request, success, 생성 2026-08-18 10:42:27 KST, 잡 109초 | Actions API(runs·jobs) · 로그 | 2026-11-12 | 실측(CI) | AI 실행 | |
| 제외 실행: run [32089415103](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089415103), 커밋 ce8a77fc, failure, 10:46:32 KST, 잡 36초. 테스트 스텝(7번) success, 게이트 스텝(8번) failure `exit code 1` | Actions API · 로그 378행 `Process completed with exit code 1` | 2026-11-12 | 실측(CI) | AI 실행 | |
| 복원 실행: run [32089609771](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089609771), 커밋 aa625a31(정상과 같은 커밋), success, 10:49:48 KST, 잡 50초 | Actions API · PR #77 본문 150행(「초록 SHA aa625a3으로 하드 리셋 후 강제 푸시(lease 보호 — 원격이 ce8a77f일 때만)」)·156행(「되돌린 뒤 CI 재실행 — 초록 … 커밋 aa625a3, success」) | 2026-11-12 | 실측(CI) | AI 실행 | 표 칸 이름 「임시 커밋 제거 후 재실행」 |
| 임시 커밋 ce8a77f의 유일 변경: `upload_store_test.go` 맨 위 `//go:build ignore` + 빈 줄(+2/-0) | `gh api commits/ce8a77fc…` | 2026-11-12 | 공개 API | | |
| 뺀 파일 `upload_store_test.go`는 「PostgreSQL 통합 테스트 14개를 담고 `upload_store.go`를 사실상 단독으로 덮는다」 | PR #77 본문 127행 | 2026-11-12 | 기록(PR 본문) | | 아래 불일치 1 |
| 세 실행의 게이트 원문(아래 차트 데이터) | 세 run 로그 grep | 2026-11-12 | 실측(CI) | | |
| 당시 9개 패키지 모두 `ok`(제외 실행 포함), 게이트 대상 외 fmp4meta 78.6%는 비차단 | 세 run 로그 · PR #77 본문 90–101행 | 2026-11-12 | 실측(CI) | | |
| 당시 main 보호 없음 → 잡 실패가 병합을 막지 않음 | PR #77 본문 78행(「main에는 브랜치 보호가 걸려 있지 않아 … 빨간불이어도 머지 자체는 가능」) · 볼트 비공개 기록(08-18 main 보호 가동 결정: 보호 생성은 PR #77 병합 뒤 같은 날, 계획 리뷰 로그 04:52Z 이후) | 2026-11-12 | 기록 | | |
| 10월 6일 합성 프로파일 10종, 10/10 기대 일치(원시 cover.out 없음 → 합성) | 볼트 비공개 기록(10-06 포트폴리오 실측 · CI 게이트 근거 56–69행) | 2026-11-12 | 실측(합성 입력, 비공개) | AI(도구 단정 금지) | 실제 Go 테스트·Actions 재실행 아님 |
| 현행 게이트 대상 19개 패키지 | [media-ci.yml@2fc2323c L199–L210](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L199-L210)(205행 split 목록) | 2026-11-12 | 코드 | | |
| 현행 브랜치 보호: main 필수 체크 `main-source-gate` 하나, develop 보호는 있으나 필수 체크 0개(contexts []) | `gh api …/branches/{main,develop}/protection` | 2026-11-12 | 공개 API(권한 필요) | | |
| PDF 35쪽 「내가 정한 검사 기준 … 핵심 패키지별 80% 기준을 두고 실제 테스트 제외·복원 대조로 게이트를 확인했습니다」 | `static/portfolio/2026-10-15-v2/full.pdf` 35쪽 | 2026-11-12 | 제출본 | | 날짜 문장으로 정정 |

## 차트 데이터(실측, 세 run 로그의 게이트 스텝 원문)

| 패키지 | 정상 32089173930 | 테스트 파일 제외 32089415103 | 임시 커밋 제거 후 재실행 32089609771 |
|---|---:|---:|---:|
| index | 81.8 (72/88) | **52.3 (46/88) FAIL** | 81.8 (72/88) |
| upload | 95.1 (527/554) | 95.1 (527/554) | 95.1 (527/554) |
| indexer | 90.2 (523/580) | 90.2 (523/580) | 90.2 (523/580) |

참고(게이트 대상 아님): mtxhook 92.0 → 91.4 → 91.4, recording 89.4 → 89.4 → 89.6 — 실행 간 흔들림. 나머지 6개 패키지 값은 세 실행 동일(mtxhookwrite 39.3, segment-indexer 34.9, config 92.7, fmp4meta 78.6).

## 합성 입력 10종(2026-10-06, 비공개 기록 56–69행)

| 합성 입력 | 결과 | exit |
|---|---|---:|
| 정확히 80% (4/5) | PASS | 0 |
| 79.9% (799/1000) | FAIL | 1 |
| 79.99% (7999/10000), 표시만 80.0% | FAIL | 1 |
| index=0/10, indexer=100/100 | index FAIL, 접두사 오집계 없음 | 1 |
| atomic 실행 횟수 7인 커버 블록 | PASS(count>0 집계) | 0 |
| 필수 index 패키지 없음 | FAIL | 1 |
| 헤더만 있는 파일 | 세 패키지 FAIL | 1 |
| 파일 자체 없음 | 읽기 실패 | 2 |
| 당시 양성 정수쌍 재구성 | 81.8/95.1/90.2 PASS | 0 |
| 당시 음성 정수쌍 재구성 | index 52.3 FAIL | 1 |

입력은 aa625a3의 워크플로 run 본문을 그대로 추출한 원본 게이트에 넣었다. PR #77 당시의 로컬 시나리오는 8종(atomic 「2 이상」)이었고, 10/6 재검증은 그와 다른 10종(atomic 7)이다.

## 현행 코드(@2fc2323c)

- 테스트 스텝 [L166](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L166): `go test -race -count=1 -timeout 20m -coverprofile=cover.out ./...`
- 「게이트는 반드시 테스트와 다른 스텝 — if: always()를 붙이지 마라」 주석 [L168–L172](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L168-L172)
- 게이트 스텝 [L199–L210](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L199-L210): 인라인 awk, `min=80`, base `…/media/internal/`, 19개 = index, upload, indexer, session, mtxstate, playback, rewind/boundary, rewind, rewind/cache, rewind/publish, streamkey, keyresolve, ingestauth, mtxctl, secretfile, janitor, pgconf, rewind/status, control. 프로파일에 없으면 `FAIL … 프로파일에 없음`.
- 별도 스크립트 파일 없음(게이트는 워크플로 안 인라인). 당시판은 [@aa625a3 L134](https://github.com/3K-PokeClip/PokeClip-mono/blob/aa625a31b2727afadb7fc8fd150f7828b463fc15/.github/workflows/media-ci.yml#L134)(테스트) · [L136–L154](https://github.com/3K-PokeClip/PokeClip-mono/blob/aa625a31b2727afadb7fc8fd150f7828b463fc15/.github/workflows/media-ci.yml#L136-L154)(주석+게이트, split 목록 3개 149행).

## 불일치

1. **「PostgreSQL 통합 테스트 14개」**: PR #77 본문 127행은 14개라고 적었지만 aa625a3의 `upload_store_test.go`에는 최상위 `func Test…` 10개(그중 `TestSweepCursorIsZero`는 DB를 쓰지 않는 값 시험), 첫 함수 안 `t.Run` 3개가 있다. 어떤 셈으로도 14가 바로 나오지 않는다. 글에는 「PR 본문 기준 14개」로 출처를 밝히거나 개수 없이 「PostgreSQL 통합 테스트 파일」로 쓰기를 권한다.
2. **「테스트 스텝 9개」(영상 콘티)**: 실제로는 테스트 스텝 **하나**(7번 스텝 `go test … ./...`)가 9개 패키지를 돌리고, 게이트는 8번 스텝 하나다. 영상은 「테스트 스텝 안의 9개 패키지가 모두 ok」로 그려야 한다.
3. **develop 보호**: 사용자 진술 「develop은 없음」 — API상 develop 보호 규칙 자체는 있고 필수 체크 목록이 비어 있다(contexts []). 「develop은 필수 체크 없음」으로 쓰면 둘 다 맞다.
4. **10/6 재검증 표의 「atomic 실행 횟수 2 이상」**(옛 글 54행)은 PR #77 당시 8종 시나리오의 표현이고, 10/6 입력은 실행 횟수 7이다. 옛 글의 「파일 부재」는 종료 코드 2(읽기 실패)로 구분된다.
5. 옛 글 L37 「제외 실행에서 upload 95.1%, indexer 90.2%는 유지」 — 맞음(세 실행 모두 정수쌍까지 동일).
