# 프로젝트 프로필 — tech-blog

> **이 파일은 하네스의 유일한 도메인 슬롯이다.**
> 제네릭 에이전트·오케스트레이터는 도메인 지식을 자기 안에 담지 않는다. 대신 런타임에
> 이 파일을 읽어 "이 프로젝트가 무엇이고, 무엇을 지켜야 하며, 어떻게 검증하는가"를 배운다.
>
> 작성 규칙: 모르는 항목은 `(해당 없음)` 또는 `(미정)`으로 둔다. 사실만 적는다.
> 글쓰기 기준의 정본은 `.claude/skills/blog-writer/references/editorial-policy.md` 이고,
> 이 파일은 그 기준을 복제하지 않고 **어기면 사이트가 깨지는 규칙**만 적는다.

---

## 1. 정체성 (identity)
`[읽는 이: 전 에이전트 · 오케스트레이터 제목 · developer/orchestrator description]`

- **한 줄 정의:** 김태윤의 개인 기술 블로그 taeyun.blog — Markdown 글을 Astro 로 정적 빌드해 Vercel 로 서빙하고, 글쓰기·시각화 스킬로 초안을 만든다.
- **도메인:** 기술 글 작성·발행(프로젝트 기록 · 오픈소스 분석 · 기술 해설 · 개발 노트) + 그 글을 위한 그림(ECharts · Mermaid · archify · Remotion 영상 · 생성 이미지).
- **주 사용자 & 기술 숙련도:** 본인(kty) — 백엔드·스트리밍 개발자. 기술 용어는 그대로 써도 되지만 보고는 결론 먼저, 짧게.
- **1차 언어(사용자 대면 보고):** 한국어.

---

## 2. 기술 스택 (stack)
`[읽는 이: developer · planner · reviewer · plan-reviewer]`

- **언어:** JavaScript(ESM, `.mjs`) · Astro 컴포넌트 · TypeScript(`motion/` 과 `src/lib/article-client.ts`)
- **프레임워크/런타임:** Astro 7 · markdown-it(+anchor · attrs) · ECharts 6 · Mermaid 12 · MiniSearch · sharp · Node 24.x. 조회수 API 는 Vercel 함수 `api/views.mjs` + Upstash Redis. 영상 장면은 `motion/`(Remotion 4.0.539 · React 19, 배포 제외).
- **패키지 매니저:** npm(`package-lock.json`, CI · Vercel 모두 `npm ci`)
- **핵심 디렉토리 맵:**
  - `content/posts/<카테고리 폴더>/<slug>.md` — 글 원문(frontmatter: title · date · categories · tags · draft · description). 카테고리 폴더 이름은 옛 Hugo 이름이고 표시 카테고리는 `src/lib/taxonomy.mjs` 가 정한다.
  - `src/lib/posts.mjs` — 글 읽기 · 소제목 id · 공개 필터(`!draft && date <= now`). `src/pages/` — 라우트. `src/components/` · `src/layouts/` — 화면.
  - `static/images/` · `static/videos/` — 그림 · 영상(바로 아래 평평한 이름). `static/diagrams/` — archify 임베드.
  - `data/legacy-heading-ids.json` — 공개된 글의 소제목 id 기준선.
  - `scripts/` — `optimize-images.mjs`(WebP/AVIF 파생) · `prepare.mjs` · `check-layout.mjs`(Playwright 화면 검수) · `legacy-redirects.mjs`(옛 주소 리다이렉트).
  - `tests/*.test.mjs` — node:test 단위 시험.
  - `motion/` — Remotion 장면(`src/scenes/<slug>/`, `registry.json` ↔ `Root.tsx`).
  - `.claude/skills/` — blog-writer · article-writer · visual-planner · motion-explainer · echarts-curator · image-prompt-curator 등 글쓰기 도메인 스킬. `_workspace/blog/<slug>/` — 글별 작업 메모 · 근거.
  - 옛 Hugo 잔재(`hugo.toml` · `layouts/` · `themes/` · `archetypes/`)는 빌드에 쓰이지 않는다.

---

## 3. 검증 명령 (verify)
`[읽는 이: developer · ecc:code-reviewer · completion-auditor · pr-author · verify-before-stop 훅]`

- **타입체크:** 로컬 하네스 설치본의 `.claude/harness/harness.env` 참조 (여기 다시 적지 않는다 — 하네스 글루와 harness.env 는 저장소에 커밋하지 않고 이 프로필만 커밋한다)
- **순서:** `npm run build` → `npm test` → `npm run test:layout` (CI `Blog quality` 와 같은 순서). 시험 일부(`tests/search.test.mjs` 등)와 화면 검수가 `dist/` 를 읽으므로 **최신 소스로 빌드한 뒤** 돌린다 — 빌드를 건너뛰면 새 체크아웃에서는 파일이 없어 실패하고, 옛 `dist/` 가 있으면 옛 결과를 검사한다.
- **테스트:** `npm test` (node:test — `tests/*.test.mjs`. 소제목 id 기준선 · 이주 · 검색 · 차트 배치 · 조회수)
- **빌드:** `npm run build` (이미지 최적화 → prepare → `astro build`, 산출 `dist/`)
- **스타일:** 로컬 하네스 설치본 `harness.env` 의 `HARNESS_STYLECHECK_CMD` 참조 (여기 다시 적지 않는다). 번들 검사기는 지금 Go 포맷만 보므로 이 저장소(JS · Astro · TS)에서는 사실상 검사 대상이 없다 — 타입체크도 없다. 실질 검증은 위 순서의 빌드 · 시험 · 화면 검수다.
- **린트/포맷(프로젝트 도구, 선택):** `motion/` 을 바꿨으면 `cd motion && npm run lint`(eslint · tsc · `render.mjs --check`). 루트에는 린터가 없다.
- **브라우저·런타임 관찰 필요?** 예 — 화면 · 글 · 그림을 바꿨으면 `npm run test:layout`(Playwright, CI `Blog quality` 와 같은 검사)과 실제 캡처 확인(`.claude/skills/blog-writer/references/visual-layout-checks.md`). 영상은 시작 · 중간 · 끝 프레임을 뽑아 눈으로 본다.

---

## 4. 아키텍처 불변식 (invariants)
`[읽는 이: planner · plan-reviewer · developer · reviewer · architecture-guide]`

- 공개된 글의 소제목 id 는 바꾸지 않는다. 새 글을 공개하거나 소제목을 바꾸면 `data/legacy-heading-ids.json` 에 그 글의 id 목록을 넣는다 — 안 넣으면 `tests/blog-quality.test.mjs` 가 실패하고, 바꾸면 밖에서 걸린 `#앵커` 링크가 깨진다.
- 글 URL(카테고리 폴더 · slug)은 바꾸지 않는다 — 검색 색인과 밖의 링크가 그 경로를 가리킨다. 옮기거나 지우면 두 곳에 함께 넣는다: `taeyun.blog` 쪽 이동은 `vercel.json` redirects(지금은 카테고리 5건뿐), 옛 주소 `xodbs1021.github.io` 쪽은 `scripts/legacy-redirects.mjs` 가 `data/legacy-paths.json` 과 글 목록으로 안내 페이지를 만든다.
- 그림 · 영상은 `static/images` · `static/videos` **바로 아래** `<글 slug>-<장면>` 이름으로 둔다 — `optimize-images.mjs` 가 하위 폴더를 읽지 않아 크기 정보 · WebP/AVIF 파생본이 빠진다.
- 정지 그림은 마크다운 이미지 문법으로 넣는다 — `<img>` · `<figure>` 를 직접 쓰면 렌더러가 크기 정보 · 파생본을 붙이지 않는다. 영상은 mp4 + 포스터 · `preload="none"` · 사용자 재생, GIF 금지(자동 재생 · 최적화 제외).
- 새 글은 `draft: true` 로 시작하고, 처음 공개할 때 `date` 를 공개 시각으로 바꾼다 — 공개 필터가 `!draft && date <= now` 라 미래 날짜 글은 안 보이고, 초안 시각을 남기면 목록 순서가 틀린다(2026-11-04 실제로 겪음). 이미 공개된 글의 `date` 는 덮어쓰지 않는다.
- 글의 사실 · 수치는 원고나 인계문이 아니라 PR 본문 · 병합된 코드 · 실측 원문으로 대조한다 — 블로그는 공개 산출물이라 틀린 주장이 그대로 남는다.
- 생성 이미지에 글자 · 라벨 · 화살표를 넣지 않고, 실제 화면 · 측정 결과처럼 보이게 만들지 않는다 — 한글 · 숫자는 코드(Remotion · SVG · 차트)로 그린다.
- 공개 여부가 정해지지 않은 내부 숫자 · 사설 주소 · 비밀 값은 글과 그림에 넣지 않는다 — 이 저장소는 공개 저장소다(2026-11-03 공개).

---

## 5. 경계면 맵 (boundaries)
`[읽는 이: planner · plan-reviewer · reviewer]`

- 글 frontmatter ↔ `src/lib/posts.mjs`(읽기 · 공개 필터) ↔ `src/lib/taxonomy.mjs`(카테고리 분류) ↔ `src/pages/`(목록 · RSS · 사이트맵 · 검색 색인) — 공유 계약: frontmatter 필드 이름과 날짜 형식.
- 글 소제목 ↔ `data/legacy-heading-ids.json` ↔ `tests/blog-quality.test.mjs` — 공유 계약: slug 별 id 배열.
- 본문 그림 경로 ↔ `scripts/optimize-images.mjs` ↔ 렌더러의 `<picture>` 생성 — 공유 계약: `static/images/<이름>` 평평한 경로 · 마크다운 이미지 문법.
- `motion/src/scenes/registry.json` ↔ `motion/src/Root.tsx` ↔ `static/videos|images/<slug>-<장면>` ↔ 글의 `<video>` 마크업 — 공유 계약: 장면 id(PascalCase → kebab 파일 이름) · posterFrame · alt.
- 차트 JSON(본문) ↔ `src/lib/chart-layout.mjs` ↔ `src/pages/charts/` — 공유 계약: ECharts option 형태.
- 조회수: 화면 스크립트(`src/lib/article-client.ts`) ↔ `api/views.mjs` ↔ Upstash Redis — 공유 계약: 요청 경로 · 응답 JSON.

---

## 6. 배포·운영 모델 (ops)
`[읽는 이: completion-auditor · change-explainer]`

- **운영 서버 실행:** 없음 — Vercel 프로젝트 `taeyun-blog` 이 이 저장소 `main` 을 빌드해 정적 파일 + 함수 `api/views.mjs` 로 서빙한다.
- **서빙 대상(무엇을 서빙하나):** `npm run build` 산출 `dist/`(`vercel.json` 의 `buildCommand` · `outputDirectory`). 옛 주소 `xodbs1021.github.io` 는 GitHub Pages 가 글 페이지를 새 주소로 안내하고, 기존 정적 파일(`static/` 전체)과 RSS · 사이트맵은 그대로 보존해 서빙한다 — 워크플로 `deploy.yml` 이 `.legacy-site` 를 Actions 아티팩트로 올려 `actions/deploy-pages` 로 배포한다(브랜치 배포가 아님). 글 원본이 아니다.
- **소스→운영 반영 절차:** `main` 병합 → Vercel 자동 운영 배포. 에이전트의 `vercel redeploy --target production` 은 권한 분류기가 막는다(2026-11-04).
- **"반영됨" 확인법:** 병합 커밋의 Vercel 커밋 상태(대상 URL)가 성공인지 + `https://taeyun.blog/<글 경로>/` 와 새 그림 · 영상 경로를 실제로 받아 200 인지. 병합했는데 Vercel 상태가 아예 안 생긴 적이 있다(2026-11-04 PR #18 — 새 그림 404, 다음 병합에서 해소, 원인 미확인).

---

## 7. 버전관리 정책 (vcs)
`[읽는 이: pr-author · pr-reviewer]`

- **기본 브랜치:** main
- **브랜치 전략:** 작업마다 `main` 에서 새 브랜치 → PR → 병합. 브랜치 이름 관례: 글 `post/<slug>[-단계]` · 기능 `feat/…` · 문서 `docs/…` · 하네스 `harness/…`. 스택 PR 금지.
- **한 PR = 한 논리적 변경.** 글은 초안 PR(`draft: true`)과 공개 PR(`draft: false` · 날짜 · 소제목 id)을 나눌 수 있다.
- **커밋/PR 제목:** 한국어 설명형(기존 관례, 예: 「새 글 공개: …」 · 「되감기 글 초안: …」). 하네스 · 스킬 · 코드 변경은 Conventional Commits 접두사를 붙여도 된다.
- **머지 주체:** 사용자 승인 후에만. 사용자가 「병합 니가 해」 처럼 명시하면 에이전트가 병합한다.
- **프로젝트 예외:** 병합 방식이 섞여 있다 — #10 ~ #13 은 squash, #9 · #14 ~ #21 은 병합 커밋. 기본값으로 단정하지 말고 병합 때 사용자에게 확인한다.

---

## 8. 도메인 예시 (examples)
`[읽는 이: clarifier · 오케스트레이터 테스트 시나리오]`

- 「○○ 기능 붙인 거 아티클로 써줘」 → 누구의 작업 범위인가(내 구현 vs 팀원 구현)? 기존 공개 글을 고치나 버리고 새로 쓰나(URL · 소제목 id · 리다이렉트)? 공개까지인가 초안까지인가? 내부 숫자 · 계정 이름을 공개해도 되나? — 범위 · 발행 수준 · 공개 범위가 숨어 있음.
- 「그림 넣어줘」 → 정지 그림 · 움직이는 그림 · 차트 · 생성 일러스트 중 무엇이 그 문단에 맞나? 생성 이미지는 외부 서비스로 프롬프트를 보낸다 — 괜찮은가?

---

## 9. 지식 진입점 (knowledge entry)
`[읽는 이: ecc:architect · ecc:planner(착수 전 필수) · clarifier(질문 전) · ADR 작성 주체(작성 전) · developer(참조용 주소 — 의무 아님) · plan-reviewer(회수 블록 검증 기준)]`

- **진입점:** `~/Documents/valut/Projects/tech-blog/index.md` (로컬 지식 저장소 — 없는 환경이면 회수 단계를 생략한다)
- 글 소재가 다른 프로젝트(PokeClip 등)이면 그 프로젝트의 `Projects/<이름>/index.md` 를 같은 방식으로 따라간다.

**회수 프로토콜 (ADR-0013 ③):** ① 진입점을 읽는다 ② 진입점이 목차·라우팅이면 이번 작업과
관련된 항목만 따라가 읽는다 — 전부 읽지 않는다 ③ 전문 탐색은 라우팅으로 부족할 때의
최후 수단이다. 하네스가 보장하는 것은 **절차·표명 형식이 계약이라는 것까지다** — 회수가
실제로 시도됐는지도, 올바른 파일이 선택됐는지도 하네스는 보장하지 않는다(아래 "기계가
검증하는 것" 참조).

**표명 (머리 3줄 계약 — ADR-0013·ADR-0015):** `ecc:architect`·`ecc:planner` 산출물의

- **첫 줄**: `사전 결정 회수: <읽은 경로>` (읽을 것이 없었으면 `사전 결정 회수: 없음(<사유>)`)
- **둘째 줄**: `레퍼런스 조사: 조사함(<대상·출처>)` 또는 `불요(<사유>)` 또는
  `실패(<시도한 것 — 실패 사유>)` — **이 세 단어와 반각 괄호만** 유효하고(`불필요`·전각
  괄호는 불량), 괄호 안이 비면 불량이다(불요·실패에도 사유 강제 — 조용한 스킵 불가).
  "조사가 필요한 지시인가"의 판정은 기계가 못 하므로, 판정의 **무표명 통과**를 막는
  자리다. 인접 도메인을 좁게 잘라 불요로 넘기지 않는다 — 같은 문제를 다른 제약에서 푼
  시스템도 조사 대상이다.
- **셋째 줄부터** 회수 블록: `- 걸리는 선행 결정: <제목 — 이번 작업에 어떻게 걸리는지
  한 줄>` (0건이면 `- 걸리는 선행 결정 없음`).

**(로컬 하네스 설치본에서만 적용 — 훅은 저장소에 없다) 기계가 검증하는 것은 머리 두 줄의 형식뿐이다** — `_workspace/[0-9][0-9]_design*.md`·`[0-9][0-9]_plan*.md`
가 저장된 턴은 Stop 훅(`stop:retrieval`)이 두 표명 형식 없이는 끝나지 않게 막고, 형식을
지키면 스스로 풀린다. **진짜 읽었는지·조사했는지·표명 내용이 사실인지는 기계가 못 본다**
— 그건 plan-reviewer 와 codex 리뷰의 검증 항목(산문 계약)이다. clarifier·ADR 작성 전
회수의 표명도 산문 검증뿐이다.

---

## 10. 참고 — 전역 의존 (이 프로젝트가 기대는 참조 시스템)
`[정보용: 사람이 읽는 메모. 에이전트는 각자 필요한 참조를 직접 호출]`

- **ECC 룰:** `~/.claude/rules/ecc/` — 언어 일반 코딩/테스트/보안 표준(항상 로드).
- **superpowers 스킬(참조, 복사 아님):** developer→`test-driven-development`·`receiving-code-review`, completion-auditor→`verification-before-completion`, clarifier→`brainstorming`, 디버깅→`systematic-debugging`.
- **글쓰기 도메인 스킬(이 저장소 `.claude/skills/`):** 글 작성 · 발행은 `blog-writer` · `article-writer`, 그림 설계는 `visual-planner` → `motion-explainer` · `echarts-curator` · `image-prompt-curator`. 하네스 파이프라인은 코드 · 스킬 · 배포 변경을 맡고, 글 본문 작성 절차는 이 스킬들이 정본이다.
- **파일 메모리:** Claude Code 프로젝트 메모리(항상 로드).
