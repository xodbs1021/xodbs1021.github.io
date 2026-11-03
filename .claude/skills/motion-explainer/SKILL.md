---
name: motion-explainer
description: "블로그 글의 시간·흐름 개념(창이 밀린다, 한쪽이 늦게 따라온다, 상태가 바뀐다)을 Remotion 으로 짧은 움직이는 그림(mp4+포스터)이나 정지 그림(png)으로 만들어 글에 넣는다. visual-planner 가 「시간에 따라 바뀌는 상태」 후보를 고른 뒤, 또는 「모션그래픽 · 움직이는 그림 · 개념 애니메이션 만들어 줘」 요청에 쓴다. 수치 비교 차트(ECharts) · 단순 흐름도(Mermaid) · 사진형 일러스트에는 쓰지 않는다."
---

# motion-explainer

먼저 [공통 기준](../blog-writer/references/editorial-policy.md)의 시각화·미디어 정책과 [실제 화면 검수 기준](../blog-writer/references/visual-layout-checks.md)을 읽는다. Remotion API 는 같은 폴더의 [remotion-best-practices](../remotion-best-practices/SKILL.md)(공식 스킬 4.0.539, 프로젝트 범위 설치)를 따른다.

## 언제 쓰나

| 설명하려는 것 | 이 스킬 | 대신 쓸 것 |
|---|---|---|
| 시간이 흐르며 위치 · 범위 · 상태가 바뀌는 것(되감기 창, 재생점, 캐시 만료) | 움직이는 그림 | — |
| 두 값이 시간축 위에서 어긋나는 관계(한쪽이 늦게 따라옴) | 정지 그림(Still) | 실측 수치면 ECharts |
| 요청 흐름 · 상태 전이 · 갈래 | — | Mermaid |
| 수치 비교 · 추세 | — | ECharts |
| 분위기 · 비유 일러스트 | — | image-prompt-curator |

움직이는 그림은 「멈춘 그림으로는 순서가 안 보이는」 경우에만 만든다. 끝 프레임만으로 뜻이 통하면 정지 그림으로 충분하다.

## 위치

- 프로젝트: `motion/` (Remotion 4.0.539 · React 19). 배포 제외(`.vercelignore`). `node_modules` · `out/` · `public/`(설치 때 복사되는 글꼴)는 git 제외 — 루트 `.gitignore` 의 `public/` 규칙이 `motion/public/` 전체를 빼므로, 커밋할 장면 자산은 `public/` 에 두지 않는다.
- 공통 부품: `motion/src/components/Timeline.tsx` — `SegmentCell`(조각 칸: live · gone · error) · `WindowBand`(창 띠) · `Playhead`(재생점) · `Tag`(둥근 이름표) · `Label`(글자) · `Arrow`(화살표). `motion/src/components/Flow.tsx` — `Node`(상자) · `Wire`(꺾은선 화살표). 흐름도는 보통 Mermaid 로 충분하지만, 시간축 그림과 나란히 견줘야 할 때만 이 부품으로 그린다. 상자는 `height` 를 정해 두고 연결선은 상자 가장자리에서 계산한다(글자 길이로 높이가 바뀌면 선이 어긋난다). `Tag` · `Label` 은 절대 위치라 flex 줄 안에서 자리를 차지하지 않는다.
- 서체 · 색: `motion/src/theme.ts` — 블로그와 같은 Pretendard · 팔레트(`COLOR`) · 글자 크기(`TEXT`).
- 보조 함수: `motion/src/lib/motion.ts` — `progress(frame, start, duration)` · `visibleBetween` · `bob`.
- 이어지는 장면(앞 장면의 끝에서 시작하는 장면)은 좌표 상수를 `motion/src/scenes/<글 slug>/layout.ts` 로 함께 쓴다. 공유 상수를 고친 뒤에는 앞 장면을 다시 렌더해 `git diff --stat static/` 이 0 인지(바이트가 같은지)로 회귀를 확인한다. 그 장면을 일부러 바꾼 경우는 바뀐 장면을 다시 눈으로 확인한다.
- 장면: `motion/src/scenes/<글 slug>/<Id>.tsx`, 목록은 `motion/src/scenes/registry.json`, 등록은 `motion/src/Root.tsx`. 둘의 id 가 다르면 `render.mjs --check` 가 실패한다.
- 파일 이름: `<name>` = `<글 slug>-<id 의 kebab-case>`(예: 글 `rewind-missing-segment` 의 `RewindFallout` → `rewind-missing-segment-rewind-fallout`). id 는 PascalCase 로, 약어도 `HlsDemo` 처럼 쓴다(`HLSDemo` 는 `hlsdemo` 가 된다).
- 산출: 영상 `static/videos/<name>.mp4` + 포스터 `static/images/<name>-poster.jpg`, 정지 그림 `static/images/<name>.png`. 하위 폴더를 쓰지 않는다 — 이미지 최적화(`scripts/optimize-images.mjs`)가 `static/images` 바로 아래만 읽어서, 하위 폴더 그림은 크기 정보 · WebP/AVIF 파생본을 받지 못한다.

## 절차

1. **콘티.** 글의 작업 폴더(`_workspace/blog/<slug>/storyboard.md`)에 장면마다 「무엇이 · 어떤 순서로 · 몇 초에」 와 끝 프레임의 모습을 적는다. 끝 프레임은 포스터이므로 혼자서도 뜻이 통해야 한다.
2. **설치(처음 한 번).** `cd motion && npm install`. postinstall 이 Pretendard(SIL OFL) 를 `public/fonts/` 로 복사한다. 첫 렌더 때 Remotion 이 렌더용 Chrome(약 570MB)을 「현재 폴더에서 가장 가까운 package.json 옆 `node_modules/.remotion`」 에 내려받는다 — `render.mjs` 는 먼저 `motion/` 으로 옮겨 가므로 `motion/node_modules/.remotion` 하나만 생긴다. `npx remotion …` CLI 를 직접 쓸 때는 반드시 `motion/` 안에서 실행한다.
3. **장면 작성.** 공통 부품과 `theme.ts` 를 쓴다. 장면 파일 머리에 콘티 위치를 적는다. 새 장면은 `Root.tsx` 에 등록하고 `registry.json` 에 `id · post · kind(video|still) · posterFrame(영상만) · alt` 를 넣는다.
4. **검사.** `cd motion && npm run lint` — eslint · tsc 와 `render.mjs --check`(registry 항목 · Root 와의 id 일치 · posterFrame 범위 · 글꼴 파일).
5. **눈으로 확인.** 영상은 시작 · 중간 · 끝 프레임을 `npx remotion still src/index.ts <id> out/check/f<N>.jpg --frame=<N>` 으로 뽑아 이미지로 열어 본다. 정지 그림은 렌더 결과를 연다. 볼 것: 글자 · 선 · 이름표 겹침, 가려진 숫자, 화면 밖으로 나간 글자, 콘티와 다른 움직임. 제목 글자가 Pretendard 인지도 본다 — 글꼴이 안 실리면 맥 기본 글꼴(Apple SD Gothic Neo)로 대신 그려지므로, 이미 있는 그림(예: `static/images/rewind-missing-segment-edge-lags-playlist.png` 의 제목)과 글자 모양을 견준다. 끝으로 본문 폭에서 본다 — 그림을 760px · 390px 폭으로 줄여 열어(또는 초안을 로컬 빌드해 휴대폰 폭으로) 핵심 이름표가 읽히는지 확인한다. 고치고 다시 본다.
6. **렌더.** `node motion/scripts/render.mjs <id>` 또는 `--post <slug>`(스크립트가 `motion/` 으로 옮겨 가서 실행하므로 어느 폴더에서 불러도 된다). 렌더 전에 `--check` 와 같은 검사를 하고, 결과는 `out/tmp` 에 만든 뒤 전부 성공해야 최종 위치로 옮기고, 옮기다 실패하면 이전 판으로 되돌린다. 번들 임시 폴더도 끝나면 지운다.
7. **글에 넣기.** 아래 마크업. alt 는 `registry.json` 의 문장을 쓴다. 캡션에 그림의 핵심을 한 문장으로 다시 말하고 「설명용 그림 · 실제 화면(측정) 아님」 을 밝힌다.
8. **정리.** 확인용 프레임을 뽑았으면 `motion/out/` 를 지운다. 렌더 중간물을 남기지 않는다. 장면 코드 오류로 번들 단계에서 실패했으면 시스템 임시 폴더(`node -e "console.log(require('os').tmpdir())"`)에 `remotion-webpack-bundle-*` 가 남으니 그것도 지운다(`npx remotion still` 처럼 CLI 를 직접 쓴 경우도 같다).

알려진 한계(`render.mjs`): 번들 단계 실패 시 임시 폴더 잔류, 최종 위치로 옮기다 실패하고 복구까지 실패하는 이중 장애에서는 이전 판을 잃을 수 있음, 빈 `out/` 삭제가 권한 오류를 내면 성공한 렌더가 실패로 끝남.

## 규약

- 영상은 아래 약 20%(y > `SAFE.bottom` = 840)를 비운다. 포스터 상태에서는 브라우저 재생 컨트롤과 그 위 그림자가 늘 그 자리를 덮는다. 정지 그림(png)은 덮이지 않는다.
- 캔버스 1920×1080, 30fps. 움직이는 그림은 6–12초(2프레임 이상 — 1프레임짜리는 `render.mjs` 가 정지 그림으로 본다).
- 글자는 `TEXT.small`(36px) 이상. 데스크톱 본문(760px)에서 약 14px 이지만 390px 폭 휴대폰에서는 약 6px 로 줄어 읽기 어렵다(영상은 눌러 키울 수 없다). 그래서 ① 그림 안 글자는 이름표 몇 개로 줄이고, ② 그림의 핵심은 캡션 · 본문 문장이 다시 말해 그림 글자를 못 읽어도 뜻이 통하게 한다. 휴대폰 전용 세로 그림은 만들지 않는다(한계).
- 색은 `COLOR` 만 쓴다. 정상 = ink, 창 · 안전 = accent, 오류 · 막힘 = danger, 지워짐 · 보조 = muted.
- 한글 · 숫자 · 화살표 · 이름표는 코드로 그린다. 생성 이미지에 글자를 넣지 않는다.
- 글자 없는 소재 그림이 꼭 필요할 때만 Codex CLI 내장 `image_gen`(ChatGPT 로그인, API 키 불필요)을 쓰고, 공급자 · 모델 · 생성 여부를 작업 메모에 남긴다(공통 기준). 실제 화면 · 측정 결과처럼 보이게 만들지 않는다.
- 영상은 H.264 mp4(crf 23), `preload="none"` · 포스터 · 사용자 재생. GIF 는 쓰지 않는다(자동 재생 · 이미지 최적화 제외).
- 글에 나오는 숫자는 장면에도 같게 쓴다. 공개 여부가 정해지지 않은 내부 숫자는 장면에 넣지 않는다. 범위 값을 한 점으로 그리면 「최대」 처럼 어느 끝인지 라벨에 밝힌다.

## 마크업

영상(기존 글 `projects/multicloud-migration-design` 과 같은 꼴):

```html
<figure>
<video controls playsinline preload="none" poster="/images/<name>-poster.jpg" width="1920" height="1080" aria-label="<registry.json 의 alt>">
<source src="/videos/<name>.mp4" type="video/mp4">
</video>
<figcaption><그림의 핵심 한 문장>. 설명용 움직이는 그림이며 실제 화면이 아닙니다. 소리는 없습니다.</figcaption>
</figure>
```

정지 그림 — 마크다운 이미지 문법이어야 블로그 렌더러가 크기 정보와 WebP/AVIF 파생본을 붙인다(`<img>` · `<figure>` 를 직접 쓰면 빠진다). 마크다운 이미지는 figcaption 이 없으므로, 기존 글처럼 바로 아래 한 문장으로 설명용임을 밝힌다:

```markdown
![<registry.json 의 alt>](/images/<name>.png)

*<그림의 핵심 한 문장>. 설명용 그림이며 실제 측정 결과가 아닙니다.*
```

## 라이선스 메모

- Remotion: 개인 · 직원 3명 이하 조직 · 비영리는 무료, 그 밖은 회사 라이선스(https://www.remotion.dev/docs/license/faq , 2026-10-31 확인). 이 블로그는 개인 사용.
- Pretendard: SIL Open Font License 1.1. 글꼴 파일은 저장소에 넣지 않고 설치 때 복사한다.

## 공식 스킬 사본

`../remotion-best-practices/` 는 Remotion 공식 스킬(remotion-dev/skills) 4.0.539 판을 다른 프로젝트 설치본에서 그대로 복사한 것이다(2026-11-04). `remotion-docs/REFERENCE.md` 의 Algolia 키는 Remotion 공개 문서의 검색 전용 키다. 갱신은 `motion/` 의 Remotion 을 올릴 때 같은 판의 공식 스킬을 스킬 설치 CLI(vercel-labs/skills, `npx skills add remotion-dev/skills …`)로 다시 받아 통째로 바꾼다 — 정확한 인자는 그때 `npx skills add --help` 로 확인한다(`skills-lock.json` 은 git 제외).
