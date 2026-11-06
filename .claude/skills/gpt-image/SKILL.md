---
name: gpt-image
description: "블로그 글에 쓸 글자 없는 그림(도입부 비유 일러스트, 모션그래픽용 투명 오브젝트)을 Codex CLI 내장 GPT 이미지 스킬(imagegen · image_gen, ChatGPT 로그인)로 생성해 저장소에 넣는다. 「이미지 생성해 줘」 · 「GPT 로 그림 만들어 줘」 · 「모션그래픽 소재 만들어 줘」 요청, 또는 visual-planner · motion-explainer 가 생성 소재가 필요하다고 정한 뒤에 쓴다. 도식 · 흐름 · 수치 · 실제 화면을 대신하는 그림에는 쓰지 않는다."
---

# gpt-image

먼저 [공통 기준](../blog-writer/references/editorial-policy.md)의 시각화 · 미디어 정책을 읽는다. 생성 도구는 Codex 에 기본 탑재된 OpenAI `imagegen` 스킬(`~/.codex/skills/.system/imagegen/SKILL.md`)의 **내장 `image_gen` 도구 경로**다 — ChatGPT 로그인만으로 돌고 `OPENAI_API_KEY` 가 필요 없다. 그 스킬의 CLI 대체 경로(`scripts/image_gen.py`, API 키 필요)로 몰래 바꾸지 않는다.

## 언제 쓰나

| 그림 | 이 스킬 | 대신 쓸 것 |
|---|---|---|
| 글 도입부의 비유 일러스트(개념을 사물로 빗댄 장면) | 생성 | — |
| 모션그래픽 소재(서버 · DB · 토큰 같은 투명 배경 오브젝트) | 생성 → [motion-explainer](../motion-explainer/SKILL.md) 「모션그래픽」 | — |
| 흐름 · 상태 · 구조 · 시간축 | — | Mermaid · motion-explainer · archify |
| 수치 비교 | — | ECharts |
| 실제 화면 · 실측 결과 · 화질 비교 | — | 실제 캡처 · 측정 원본(생성 이미지로 위조 금지) |

후보와 개수는 [visual-planner](../visual-planner/SKILL.md)가 글마다 정한다. 이 스킬은 「무엇을 생성할지」 가 정해진 뒤의 제작 절차다.

## 실행 전 확인

- **프롬프트는 OpenAI 로 나간다.** 계정 ID · 사설 주소 · 공개 전 제품 이름 · 내부 숫자를 프롬프트에 넣지 않는다. 생성은 사용자가 요청했거나 그림 계획을 승인했을 때만 한다(공통 기준 — 외부 공급자는 명시적으로 선택).
- `codex features list | grep image_generation` 이 `stable true` 인지 보고, `codex --version` 을 작업 메모에 적는다.
- 내장 도구가 실패하거나 없으면 멈추고 사용자에게 알린다. CLI 대체 경로나 다른 공급자로 넘어가지 않는다.

## 프롬프트

한 그림 = 한 파일 `_workspace/blog/<slug>/art/prompts/<name>.txt`. `<name>` 은 kebab-case(예: `obj-db`, `hero-access`). 영어로 쓴다. 순서는 장면 → 대상 → 세부 → 제약 → 용도(OpenAI 이미지 프롬프트 가이드). 한 시리즈(한 글 · 한 영상)의 모든 프롬프트 끝에 **같은 STYLE 블록과 Output 줄**을 붙여 그림끼리 결이 맞게 한다.

```text
<대상 한두 문장 — 무엇이 어떤 상태로 있는지>

Style: clean isometric 3D tech illustration, soft studio lighting, matte materials with subtle glossy accents, calm editorial look. Palette strictly: deep ink #172c40, teal #087f8b, pale teal #e8f7f5, light grey #f3f6f9, slate #637489, white; use red #b42318 only for an error or blocked state. Absolutely NO text, letters, numbers, logos or brand marks anywhere.

Output: <아래 둘 중 하나>
```

- 모션그래픽 소재: `a single isolated object, centered, square 1:1 image with a genuinely TRANSPARENT background (preserve alpha), no ground shadow plane, no backdrop.`
- 도입부 일러스트: `a wide 16:9 scene with a soft light-grey background, generous empty margins, nothing important near the edges.`

팔레트는 `motion/src/theme.ts` 의 `COLOR` 와 같다 — 테마 색을 바꾸면 STYLE 블록도 바꾼다. 사람 · 실제 제품 · 회사 로고를 그리지 않는다. 코드 화면이 필요하면 `abstract lines only, no readable characters` 로 적는다.

## 생성

```sh
bash .claude/skills/gpt-image/scripts/gen.sh <slug> <name>          # 한 장
for f in _workspace/blog/<slug>/art/prompts/*.txt; do basename "$f" .txt; done \
  | xargs -P 4 -I{} bash .claude/skills/gpt-image/scripts/gen.sh <slug> {}   # 여러 장(4개 병렬)
```

스크립트는 저장소 루트에서 `codex exec` 로 내장 `image_gen` 을 한 번 부르고, 결과를 임시 이름 `<name>.part.png` 로 받아 비어 있지 않은 PNG 인지 확인한 뒤에만 `_workspace/blog/<slug>/art/<name>.png` 로 옮긴다(생성 원본은 `~/.codex/generated_images/<세션>/` 에 남는다). 출력 첫 단어로 결과를 안다: `OK`(새로 만듦) · `SKIP`(이미 있어 건너뜀 — 덮어쓰지 않는다, 다시 만들려면 `<name>-v2`) · `FAIL`(이름 형식 위반 · 프롬프트 없음 · 빈 프롬프트 · codex 실패 · PNG 가 아니거나 비어 있음 · 같은 이름이 실행 중). 이름은 kebab-case 만 받는다. 한 장에 약 40초(2026-10-31 실측, 5개 병렬 10장 약 2분). 로그는 같은 폴더의 `<name>.log`.

## 검사

1. 그림을 열어 본다(Read 도구로 이미지 열기). 볼 것: 글자 · 숫자 · 로고가 끼었는지, 팔레트 밖 색, 대상이 프롬프트와 같은지, 잘린 가장자리.
2. 투명 소재는 실제로 투명한지 확인한다: `node .claude/skills/gpt-image/scripts/check-alpha.mjs <파일>...` 이 `OK`(네 모서리 알파 8 이하 · 투명 20–98%). `sips -g hasAlpha` 의 `yes` 는 알파 채널이 있다는 뜻일 뿐이라 모두 불투명한 RGBA 도 통과한다 — 그것으로 판정하지 않는다. 내장 경로에서 투명 배경이 실제로 나온 실측이 있지만(2026-10-31, 8/8장) 시기 · 모델에 따라 바뀔 수 있으니 매번 본다. `FAIL` 이면 프롬프트의 Output 줄을 확인하고 새 이름(`<name>-v2`)으로 한 번 다시 생성한다. 완전히 투명한 그림도 `FAIL` 이지만, 그림이 맞는지는 1번의 눈 확인이 판정한다.
3. 고칠 때는 한 번에 한 가지만 바꿔 다시 생성하고 다시 본다.

## 배치

- **도입부 일러스트:** 긴 변 1600px 로 줄여 `static/images/<slug>-<name>.png` 에 둔다(`sips -Z 1600 <원본> --out static/images/<slug>-<name>.png`). 하위 폴더 금지(이미지 최적화가 바로 아래만 읽는다). 마크다운 이미지 문법으로 넣고 바로 아래 한 문장으로 생성 그림임을 밝힌다:

  ```markdown
  ![<무엇을 빗댄 그림인지 한 문장>](/images/<slug>-<name>.png)

  *<그림이 빗대는 것 한 문장>. AI 생성 비유 그림이며 실제 구성도가 아닙니다.*
  ```

- **모션그래픽 소재:** 긴 변 1024px 로 줄여 `motion/public/art/<slug>/<name>.png` 에 둔다(`sips -Z 1024 …`). 이 폴더는 커밋된다(글꼴 폴더 `motion/public/fonts/` 만 git 제외). 이후는 [motion-explainer](../motion-explainer/SKILL.md) 「모션그래픽」 절.
- `_workspace/blog/<slug>/art/` 의 원본 PNG · 로그는 git 제외다. 프롬프트(`prompts/*.txt`)는 커밋해 다시 만들 수 있게 둔다.

## 기록

`_workspace/blog/<slug>/images.md` 에 그림마다 한 줄: 파일 경로 · 프롬프트 파일 · 공급자(OpenAI, Codex CLI 내장 `image_gen`, ChatGPT 로그인) · 모델(응답에서 확인 못 하면 「미확인」) · codex 버전 · 생성 날짜 · 채택/버림. 공통 기준의 「공급자 · 모델 · 생성 여부를 작업 메모에 남긴다」 를 이 파일이 맡는다.

## 정리

검사용 사본 · 줄이기 전 임시 파일을 지운다. 버린 후보 PNG 는 `_workspace/blog/<slug>/art/` 에 남아도 git 제외라 커밋되지 않는다 — 글이 공개된 뒤에는 지운다. `~/.codex/generated_images/` 는 Codex 의 폴더라 이 스킬이 지우지 않는다.

## 근거

- 도구 경로 · 투명 배경 실측 · 병렬 속도: 2026-10-31 migration.taeyun.blog 설명 사이트(그림 11장) — 볼트 `Knowledge/codex-imagegen-chatgpt-auth.md` · `Projects/multicloud-migration/decisions/ADR-002.md`.
- 도구 조사 원문과 비교표: [motion-explainer 레퍼런스](../motion-explainer/references/tool-research.md).
- 프롬프트 가이드: https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide (2026-10-31 확인).
