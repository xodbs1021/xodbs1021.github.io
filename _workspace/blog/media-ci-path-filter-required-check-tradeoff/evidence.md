# evidence — media-ci-path-filter-required-check-tradeoff

글 유형: 의사결정(선택지 A·B·C·D 중 B, 대가와 적용·롤백 순서)

확인일: 2026-11-12. 공개 코드 기준: 3K-PokeClip/PokeClip-mono develop `2fc2323cbd84a683e935bfdf9f0171febf276535`(2026-11-12 02:10:08 KST).
고정 링크 약어: `M` = https://github.com/3K-PokeClip/PokeClip-mono

## 주장과 근거

| 주장 | 출처 | 확인일 | 근거 종류 | 수행 주체 | 비고 |
|---|---|---|---|---|---|
| 변경 전 media-ci는 세 잡(changes → check → media-gate), check는 미디어 변경 PR에서만 돌고 changes·media-gate는 모든 PR에서 돌았다 | 부모 커밋 `172f0227` media-ci.yml(잡 36·64·208행) `M/blob/172f0227cdfcb989c977b58df80a789a9cffbf57/.github/workflows/media-ci.yml` · 공개 결정 기록 9–18행 | 2026-11-12 | 코드 | — | 잡 레벨 `if:`로 check 스킵 → skipped, media-gate가 skipped를 통과로 침(64–69행 주석) |
| changes·media-gate는 각 3~4초 | 웹 PR #157 check-runs: changes 02:29:07→02:29:10(3초), media-gate 02:29:13→02:29:17(4초), check skipped. 서비스 PR #151: changes 4초, media-gate 3초 | 2026-11-12 | 실측(Actions API) | GitHub Actions | `gh api repos/3K-PokeClip/PokeClip-mono/commits/<head>/check-runs` |
| media-gate는 main·develop 필수 체크였다 | 변경 전 보호 스냅샷: main contexts `["media-gate","main-source-gate"]`, develop `["media-gate"]`, strict false, enforce_admins true | 2026-11-12 | 원자료(비공개 스냅샷) | AI가 머지 전 저장 | 공개 대체: 공개 결정 기록 9–10·30–31행 |
| 팀원 두 명이 「자기 영역 PR에 media CI가 돈다」고 불편을 말했다. 문제는 비용이 아니라 팀 경계 | 공개 결정 기록 18–19행 · PR #163 본문 5행 | 2026-11-12 | 원자료(PR·결정 기록) | 팀원(이름 비공개) | 이름 쓰지 않음 |
| 경로 필터로 생략한 워크플로의 체크는 Pending, 필수면 병합 차단 | GitHub 문서 workflow-syntax `#onpushpull_requestpull_request_targetpathspaths-ignore`: "If a workflow is skipped due to path filtering, branch filtering, or a commit message, then checks associated with that workflow will remain in a "Pending" state. A pull request that requires those checks to be successful will be blocked from merging." · troubleshooting-required-status-checks `#handling-skipped-but-required-checks`: "Avoid requiring workflows that can be skipped." · 잡이 조건으로 스킵되면 "Success" | 2026-11-12 | 문헌값(공식 문서, 200) | — | |
| 선택지 A·B·C·D와 사용자 선택 B(2026-09-03) | 공개 결정 기록 37·39–46행 · PR #163 본문 5행 | 2026-11-12 | 원자료 | 사용자 결정 | 표 아래 |
| 순서 「보호 먼저 해제 → 병합」은 사용자가 정했고 실행은 AI | 비공개 명료화 기록(2026-09-03 사용자 답) · 공개 결정 기록 34–35행 · PR #163 본문 12–15행 | 2026-11-12 | 원자료 | 사용자 결정, AI 실행 | PR이 머지 전 BLOCKED인 것은 정상(본문 14행) |
| 구현은 AI(Claude Code) | 비공개 진행 기록(Phase 3 「구현: 오케스트레이터 직접」) | 2026-11-12 | 원자료(비공개) | AI(Claude Code) | 공개 PR 작성자 표시만으로 사용자 구현이라 쓰지 않음 |
| 계획 리뷰 Claude Code·Codex(여러 차례 반복, 한쪽만 참여한 회도 있음 — 공개 글에는 횟수를 쓰지 않음) | 비공개 진행 기록 | 2026-11-12 | 원자료(비공개) | AI(Claude Code·Codex) | 마지막 검토에서 양측 지적 없음 |
| Codex 코드 검수가 PR #163의 Actions 실행에서 check 잡 하나만 생성·성공 확인 | 비공개 Codex 검수문(「현재 HEAD f2318fe의 GitHub media-ci 실행은 check 잡 하나만 생성되어 성공」) · 최종 head `f20b05f` check-runs: check success 15:58:08→15:59:38Z(1분 30초), changes·media-gate 없음 · PR 본문 26행 | 2026-11-12 | 실측(Actions API) + 원자료 | AI(Codex) 검수 | 최종 head 실행 URL `M/actions/runs/33775776891` |
| 감지 경로는 당시 3종: `media/**`, `.github/workflows/media-ci.yml`, `docker-compose.yml` | 병합 커밋 `ce16cfc` media-ci.yml 12–19행 `M/blob/ce16cfc2e06cedc98c5fed7e5b6b1fcf1774b36a/.github/workflows/media-ci.yml#L10-L21` | 2026-11-12 | 코드 | — | compose는 media 계약 테스트 2개가 읽음(15–16행 주석) |
| 지금 감지 경로는 5종(prod SQL `infra/terraform/prod/runtime/sql/**`, 런타임 런북 `infra/terraform/runbooks/runtime-1a.md` 추가) | `M/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L12-L25` (13·14·19·22·25행) | 2026-11-12 | 코드 | — | 지금 파일 210행 |
| check 잡 본문은 바뀌지 않았다 | 부모 70–201행 = 병합 커밋 41–172행, `diff` 결과 동일(직접 대조) · PR 본문 8·23행 | 2026-11-12 | 코드 대조(실측) | 이 글 작성 중 AI가 재확인 | 132행 |
| 워크플로는 229행 → **172행** | gh contents API: `172f0227`(부모) 229행, `ce16cfc`(병합) 172행. 둘 다 끝 줄바꿈 있음 · 공개 결정 기록 52행 「229행 → 172행」 | 2026-11-12 | 코드(실측) | — | 옛 글의 173은 오기 |
| 병합 시각 2026-09-04 01:12 KST | PR #163 mergedAt `2026-09-03T16:12:53Z` · 병합 커밋 `ce16cfc2e06cedc98c5fed7e5b6b1fcf1774b36a`, base develop | 2026-11-12 | 원자료(GitHub API) | 사용자 승인 뒤 AI가 병합 | |
| 병합 직전 열린 PR 스냅샷: #160·161·162 CLEAN, #163 BLOCKED | 비공개 스냅샷 | 2026-11-12 | 원자료(비공개) | AI | |
| 병합 직후 확인: 문서만 바꾼 임시 PR #164는 media-ci 실행 0건 | PR #164(파일 `docs/dev-environment.md` +2, CLOSED 16:17:45Z). head `3e42abca` check-runs = claude-review 하나뿐, actions runs = Claude Code Review 하나뿐 | 2026-11-12 | 실측(Actions API) | AI | media-ci 계열 0건. Claude 리뷰 워크플로는 따로 돎(범위 밖) |
| `media/.golangci.yml`만 바꾼 임시 PR #165는 check 3분 8초 성공 | PR #165(파일 `media/.golangci.yml` +1, CLOSED 16:17:49Z). head `f91f1dd5` check success 16:13:46→16:16:54Z = 3분 8초, run `M/actions/runs/33777358550` | 2026-11-12 | 실측(Actions API) | AI | 점으로 시작하는 파일도 `media/**`에 걸림 확인 |
| 새로 BLOCKED 된 PR 0건 | 비공개 진행 기록(Phase 7 「새로 BLOCKED 된 PR 0」) | 2026-11-12 | 원자료(비공개) | AI | 공개 링크 없음 |
| 대가 1: 내용을 검사하는 필수 체크 0개. 병합은 사용자 승인 후에만 하므로 병합 전 초록불 눈확인이 운영 대체 | 공개 결정 기록 56–57행 | 2026-11-12 | 원자료 | 사용자 승인 트레이드오프 | |
| 대가 2: 변경 파일 3,000개 넘는 PR은 paths가 못 봐 검사 없이 병합(fail-open), 완화책은 큰 PR 분할뿐 | 공개 결정 기록 58–60행 · 현행 media-ci.yml 26–27행 주석 · GitHub 문서 workflow-syntax `#git-diff-comparisons`: "If the generated diff contains more than 3,000 files and the files the workflow filter matches are not in the first 3,000 returned by the filter, the workflow will not run." | 2026-11-12 | 문헌값 + 원자료 | — | |
| 롤백: 워크플로부터 되살리고 media-gate 체크 런이 생기는 것을 확인한 뒤 보호 재등록. main이 아직 옛 3층이면 develop만 revert | PR #163 본문 30행(아래 인용) · 공개 결정 기록 68–73행 | 2026-11-12 | 원자료 | 계획(AI) · Codex 검수가 브랜치 상태 구분을 요구해 반영 | |
| 지금(11/12) 보호: main 필수 체크 `main-source-gate` 하나, develop 필수 체크 없음, 둘 다 enforce_admins true, 저장소 ruleset 없음 | `gh api repos/3K-PokeClip/PokeClip-mono/branches/{main,develop}/protection` | 2026-11-12 | 실측(API) | 이 글 작성 중 AI | 지금 main의 media-ci.yml에도 media-gate 잡 없음(main `bad85cc7`) — main도 새 구조 |

### PR #163 본문 30행(인용)

> `git revert -m 1 <이 PR 머지 커밋>` 으로 4파일 원복. 보호 재등록은 코드 밖 절차 — 브랜치 상태별(main이 아직 옛 3층이면 develop만 revert, main에도 새 구조가 들어간 뒤면 양 브랜치 revert) → 각 브랜치 대상 PR에서 `media-gate` 체크 런 실존 확인 → 스냅샷 payload로 최소 PATCH.

### 선택지 표(공개 결정 기록 39–46행 · 2026-09-03 명료화)

| 안 | 무엇 | 결과 |
|---|---|---|
| A | `changes`를 `media-gate` 안으로 접어 체크 줄 2 → 1, 보호 유지 | 기각 — 체크 런이 여전히 생겨 팀원 PR 목록에 media-ci가 남음 |
| B | 워크플로 수준 `paths` + main·develop 보호에서 `media-gate` 제거 | 채택(사용자 2026-09-03) — 대가: 내용 검사 필수 체크 0개 |
| C | develop 보호에서만 제거, main 유지 | 기각 — 팀원 PR(전부 develop 대상)에 체크 줄은 그대로, 미디어 파손이 develop에 쌓이다 릴리스 PR에서 한꺼번에 막힘 |
| D | 코드는 두고 팀에 설명만(3~4초 · 비용 0 · 차단 0) | 기각 — 불편의 실체가 가시성이라 해소 안 됨 |
| (범위 밖) | ruleset required workflows | paths 스킵을 통과로 보는지 문서로 확인 못 함 |

## 공개 링크(모두 200 확인, 2026-11-12)

- PR #163 `M/pull/163` · 병합 커밋 `M/commit/ce16cfc2e06cedc98c5fed7e5b6b1fcf1774b36a`
- 임시 PR #164 `M/pull/164` · #165 `M/pull/165` · #165 media-ci 실행 `M/actions/runs/33777358550`
- 웹 PR #157 `M/pull/157` · 서비스 PR #151 `M/pull/151`
- 변경 전 media-ci.yml `M/blob/172f0227cdfcb989c977b58df80a789a9cffbf57/.github/workflows/media-ci.yml`
- 병합 media-ci.yml `M/blob/ce16cfc2e06cedc98c5fed7e5b6b1fcf1774b36a/.github/workflows/media-ci.yml`
- 지금 media-ci.yml `M/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L12-L25`
- 공개 결정 기록 `M/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/docs/decisions/2026-09-04-media-ci-%EA%B2%BD%EB%A1%9C%ED%95%84%ED%84%B0-%EC%A0%84%ED%99%98.md` (80행, 병합 시점과 같음)
- GitHub 문서: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore · https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#git-diff-comparisons · https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks#handling-skipped-but-required-checks · https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow

## 포트폴리오 요약(2026-10-15판) 35쪽

원문: 「미디어와 무관한 PR에 media-ci가 나타나지 않게 paths로 범위를 좁혔습니다. 사라진 체크를 필수로 기다리지 않도록 보호 설정을 먼저 해제한 뒤 워크플로를 바꾸는 순서를 정했습니다. 검사 내용은 유지했지만 실패가 병합을 강제 차단하는 보호는 사라지는 선택이었습니다.」

빠진 것: 3,000파일 fail-open과 큰 PR 분할 완화, 내용 검사 필수 체크가 「0개」라는 수, 병합 전 초록불 눈확인이 운영 대체라는 점, 역할 구분(B 선택과 순서는 사용자, 구현은 AI). → 날짜 문장으로 보완.

## 불일치

- 옛 글 L51·L53 「229행 → 173행」: 실제 172행(병합 커밋 `ce16cfc`). 비공개 볼트 결정 노트에는 173으로 남아 있으나 Codex 검수가 172로 지적했고 공개 결정 기록은 172로 고쳐짐.
- 옛 글 L57 「팀이 확인할 책임으로 명시」: 원자료는 「mono 머지는 사용자 승인 후에만 하므로 머지 전 초록불 눈확인이 운영 대체」. 팀에 책임을 넘긴 것이 아님.
- 옛 글 L17 「워크플로 수정과 검증은 AI와 협업」: 구현은 AI(Claude Code) 단독, 사용자는 B 선택·순서 결정·병합 승인.
- 옛 글 L44 롤백: 브랜치 상태별 분기(main이 옛 3층이면 develop만) 빠짐.
- 옛 글 L38 감지 경로 3종은 당시 기준. 지금은 5종.
- #164에는 media-ci와 무관한 Claude 리뷰 워크플로 체크 1개가 있음 → 「웹 PR 체크 0개」라고 쓰면 틀림. 「media-ci 실행 0건」으로 쓸 것.
- main은 이제 옛 3층이 아님(지금 main의 media-ci.yml에 media-gate 잡 없음). 롤백 분기 중 「main이 아직 옛 3층」 경우는 병합 직후 상황.
