# 모션그래픽 · 생성 이미지 도구 조사 — 왜 Remotion + Codex imagegen 인가

이 문서는 motion-explainer · gpt-image 스킬의 도구 선택 근거다. 두 번의 조사 결론과 사용자 판정을 모았다. 별 수 · 판수 · 가격은 **조사 당일 값**이라 다시 쓸 때는 다시 확인한다. 원문은 볼트에 있다(맨 아래).

## 1. 결론

| 용도 | 고른 것 | 이유 한 줄 |
|---|---|---|
| 움직이는 그림 · 모션그래픽 | **Remotion 4.0.539** + 공식 스킬 `remotion-best-practices` | 프레임 단위 `interpolate` · `spring`, `@remotion/paths`(경로 그리기 · 경로 위 이동), 정지 그림(Still) · mp4 렌더, 가장 많이 쓰이는 에이전트 스킬. migration-site(10-31) · 되감기 글(11-04)에서 실물 검증 |
| 그림 소재 · 비유 일러스트 | **Codex CLI 내장 `imagegen`(`image_gen`)** | ChatGPT 로그인만으로 동작(API 키 불필요) · 투명 배경 실측 · `codex exec` 로 비대화 배치 |
| 글자 · 화살표 · 숫자 | **코드**(Remotion 부품 · SVG) | 생성 이미지 속 한글 · 숫자는 믿을 수 없다. 편집 정책의 「생성물로 증거 대체 금지」 |

## 2. 모션 엔진 비교 (2026-10-31 수집, `gh api` 메타데이터)

| 도구 | 저장소 · 별 · 라이선스 | 판 | 적합도 | 판정 |
|---|---|---|---|---|
| Remotion | remotion-dev/remotion · 69,250 · 자체 라이선스 | v4.0.539 | 강함 — `@remotion/paths` 의 evolvePath · getPointAtLength · interpolatePath, 카메라 이동은 interpolate/spring | **채택** |
| HyperFrames | heygen-com/hyperframes · 76,245 · Apache-2.0 | v0.8.223(1.0 전) | 블록 약 450개 레지스트리를 실제로 쓰면 좋음 | **불합격** — 첫 사이트의 12초 영상을 사용자가 불합격 판정(10-31) |
| Motion Canvas | motion-canvas/motion-canvas · 19,610 · MIT | 3.17.2(마지막 릴리스 2024-12) | 기본 부품은 훌륭 | 개발 정체 |
| Revideo | midrender/revideo · 4,161 · MIT | 0.11.0 | Motion Canvas 갈래 | 작고 느려짐 |
| Manim CE | ManimCommunity/manim · 42,045 · MIT | v0.22.1 | 단계형 도식은 강하지만 수학 영상처럼 보임 | 기각 — 미설치 · 수식을 쓰면 LaTeX 설치 부담 · 한글 부담(11-03) |
| OpenMontage | calesthio/OpenMontage · 73,689 · AGPL-3.0 | — | 렌더러가 아니라 오케스트레이션 | 기각 — AGPL |

블로그 그림 경로 조사(2026-11-03)에서 더 걸러진 것:

- **손으로 쓴 SVG** — 정지 그림 · 짧은 반복에 맞지만, 블로그 렌더러가 본문 SVG 에 캡션 「구조와 흐름」 을 고정으로 붙인다. 2순위.
- **Mermaid** — 갈래 · 흐름만. 움직임 없음. 3순위.
- **GIF** — 이미지 최적화에서 빠지고 자동 재생이라 편집 정책(사용자 재생)과 어긋남. 금지.
- **Lottie** — 블로그에 런타임이 없음.
- **fal.ai 등 유료 생성 영상** — API 키 · 비용, 생성 영상 속 글자 · 도식을 믿을 수 없음.
- **archify** — 정지 · 상호작용 구성도에는 맞음(블로그 `/diagrams/` 에 이미 씀). 시간에 따라 밀리는 움직임에는 안 맞음.

## 3. 에이전트 스킬 · 레시피 (참고)

| 이름 | 무엇 | 쓰는 법 |
|---|---|---|
| remotion-dev/skills | Remotion 공식 스킬 12개(설치 약 718K, skills.sh 기준 10-31) | 이 저장소 `.claude/skills/remotion-best-practices/` 에 4.0.539 판 사본 |
| Vincentwei1021/video-shotcraft | Remotion 샷 레시피 카드 124장 · Apache-2.0 | 장면 연출(등장 · 전환 · 강조)이 막힐 때 참고만. 설치하지 않음 |
| iart-ai/motion-skills | 모션 스킬 묶음 · MIT | 참고만 |
| Tejashmakwana/motionmaxxing | HyperFrames 용 연출 층 · Apache-2.0 | HyperFrames 를 쓰지 않으므로 해당 없음 |

## 4. 이미지 생성 경로 (2026-10-31)

- OpenAI `imagegen` 스킬이 Codex `skills/.system` 에 기본 탑재 — 「Default built-in tool mode (preferred): built-in `image_gen` … Does not require `OPENAI_API_KEY`」. CLI 대체 경로 `scripts/image_gen.py` 만 키가 필요하다.
- 출력은 `~/.codex/generated_images/<세션>/exec-*.png` — 경로 인자가 없어 프롬프트로 「현재 폴더에 복사」 를 시킨다.
- 투명 배경: 외부 보고(jdmnk/codex-imagegen-cli)는 「ChatGPT 경로에선 불가」 였지만, 실제로 8장 모두 알파가 있었다(당시 `sips -g hasAlpha` 와 남색 배경 합성으로 확인). 지금은 매번 `check-alpha.mjs`(네 모서리 투명 · 투명 비율)와 눈 확인으로 본다 — `hasAlpha` 는 모두 불투명한 RGBA 도 통과시켜 판정에 쓰지 않는다([gpt-image](../../gpt-image/SKILL.md) 「검사」).
- 속도: 장당 약 40초, 5개 병렬로 10장 약 2분.
- 실제 응답 모델명은 확인하지 못했다.
- 시리즈 일관성: 모든 프롬프트에 같은 STYLE 블록(팔레트 hex · 조명 · 재질 · NO text). 프롬프트 순서는 장면 → 대상 → 세부 → 제약 → 용도 — https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide
- 블로그 쪽 다른 경로: `~/.claude` 스킬 · 플러그인 가운데 GPT 이미지 API 를 쓰는 것은 없었다(11-03). fal.ai 는 키 없음 · 유료.

## 5. 라이선스

- Remotion: 개인 · 직원 3명 이하 영리 조직 · 비영리 · 평가는 무료. 그 밖은 회사 라이선스(Creators 1인 월 $25, Automators 렌더당 $0.01 · 월 최소 $100). 인원은 회사 전체 기준. https://www.remotion.dev/docs/license/faq (10-31 확인). 이 블로그는 개인 사용.
- Pretendard: SIL OFL 1.1.

## 6. 원문 (볼트)

- 모션 · 이미지 도구 수집 원문: `raw/multicloud-migration/2026-10-31-site-v2/03_collector_motion-image-research_r1.md`
- 소재 프롬프트 11장 · 생성 스크립트 · Remotion 소스 스냅숏: 같은 폴더 `06_cc_image-prompts_r1.txt` · `06_cc_image-gen-script_r1.sh` · `10_cc_remotion-src_r1/`
- 결정: `Projects/multicloud-migration/decisions/ADR-002.md`(archify · Remotion · ChatGPT 이미지) · `Projects/tech-blog/decisions/ADR-004_motion-explainer-Remotion-프로젝트범위.md`
- 블로그 그림 경로 조사: `raw/tech-blog/2026-11-04-rewind-post-motion-explainer/blogsess_skill_survey.md`
- 일반 지식: `Knowledge/codex-imagegen-chatgpt-auth.md`
