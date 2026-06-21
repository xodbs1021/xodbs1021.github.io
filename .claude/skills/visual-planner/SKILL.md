---
name: visual-planner
description: 블로그 글 설계 단계에서 image-need-judge와 echarts-advisor 두 에이전트를 협업시켜 시각화 전략을 한 번에 결정. 각 시각화 후보를 이미지/ECharts/Mermaid/표/cross-link 중 어디로 보낼지 충돌 없이 정함.
---

# 블로그 시각화 플래너

블로그 글 **설계 단계**에서 두 전문 에이전트(`image-need-judge`, `echarts-advisor`)를 협업시켜 **시각화 전략을 한 번에 결정**.

## 왜 이 스킬이 필요한가

두 에이전트가 독립으로 판단하면 같은 후보(예: Convex Hull 그래프)를 둘 다 "내 거"라고 주장. 협업으로 충돌 없이 결정해야 함.

## 제1규칙 (image-need-judge에서 가져옴)

**이미지 갯수든, 필요 여부든 패턴화 절대 금지.** 글마다 백지에서 정직 판단.

## 트리거

- 블로그 글 작성 직전 (강의 cat 후 글 쓰기 전)
- 사용자가 "이미지 프롬프트 줘", "필요한 이미지 알려줘" 요청
- 사용자가 "X-Y 분석하고 프롬프트 줘" 요청

## 협업 흐름 — 4단계

### 단계 1: 글 컨텍스트 확보

- 강의 시리즈면 강의 파일 **cat**으로 한 번에 (Read 도구 금지, Hook이 차단)
- 명령 예: `cat /Users/kty/tech-blog/_workspace/streaming_lessons/4-2-1.md /Users/kty/tech-blog/_workspace/streaming_lessons/4-2-2.md ...`
- 기존 글 마크다운이면 Read

### 단계 2: 두 에이전트 병렬 호출

같은 컨텍스트(글 내용 요약 + 시각적 후보 전부 리스트)를 두 에이전트에 동시 전달.

**`image-need-judge` 호출** (Agent 도구):
- prompt: 글 컨텍스트 + 시각적 후보 전부
- 출력: 각 후보별 "이미지 필요/불필요" + 이번 글 이미지 N개 정직 판단

**`echarts-advisor` 호출** (Agent 도구):
- prompt: 같은 글 컨텍스트 + 시각적 후보 전부
- 출력: 각 후보별 "ECharts 가능 여부" + ECharts JSON config 초안

병렬 실행 (단일 메시지에 두 Agent 호출 블록).

### 단계 3: 결과 통합 + 충돌 해소

두 에이전트 결과를 표로 정리:

```
| 후보 | image-need-judge | echarts-advisor | 최종 |
|---|---|---|---|
| Convex Hull 그래프 | 이미지 가치 (인포그래픽) | ECharts scatter+line 가능 | ??? |
| 시청자 화질 분포 | 이미지 불필요 | ECharts donut | ECharts |
| Per-Title 흐름 | 이미지 가치 (비유) | ECharts 안 됨 (흐름) | 이미지 |
| 시청자 비트레이트 추이 | 이미지 불필요 | ECharts line | ECharts |
| 라이브 인프라 전체 | 이미지 가치 (인포그래픽) | ECharts 안 됨 (흐름) | 이미지 or Mermaid 검토 |
| ...
```

**충돌 해소 룰** (둘 다 자기 거라고 주장한 경우):

| 후보 특성 | 결정 |
|---|---|
| 데이터가 정확한 수치 (정확한 비교가 본질) | ECharts |
| 친근한 비유/일러스트가 글 톤에 맞음 (정확한 수치가 본질 아님) | 이미지 |
| 시각적 본질 (HDR vs SDR, AVIF vs JPEG 같이 텍스트 불가능) | 이미지 |
| 시퀀스/플로우/결정 트리 | Mermaid |
| 이름×이름 매트릭스 (✅/❌, 옵션 의미) | 표 |
| 이미 다른 글에서 다룬 동일 시각 | cross-link |
| 둘 다 가능하고 결정 어렵다 | 글 톤 우선 (개념 비유 → 이미지, 데이터 정밀 → ECharts) |

### 단계 4: 사용자 보고

```
[시각화 전략 — 협업 결과]

이번 글 주제: ...
시각적 후보 N개 검토 완료.

이미지: M개 (영어 프롬프트는 다음 단계에서 image-prompt-generator 호출)
ECharts: P개 (JSON config 초안)
Mermaid: Q개 (코드 펜스 초안)
표: R개
이전 글 cross-link: S개
순수 텍스트: T개

패턴화 자기 점검:
- 이전 글 갯수 본 적 있는가? 영향받았는가?
- 이미지가 0개여도 OK, 5개여도 OK. 글이 결정함.

다음 단계:
- M > 0이면 image-prompt-generator로 영어 프롬프트 작성
- 사용자 승인 후 글 작성 시작
```

## 사용자 메모리 정합

- **`feedback_no_image_pattern.md`** — 제1규칙: 이미지 패턴화 금지
- **`feedback_echarts_usage.md`** — 수치 비교는 ECharts
- **`feedback_image_prompts.md`** — 이미지 프롬프트는 영어
- **`feedback_lesson_output.md`** — 강의 파일은 cat만 (Read 금지)
- **`feedback_streaming_lesson_style.md`** — 실무 위주, 수학 제외
- **`feedback_internal_terms.md`** — "레벨 N" 금지
- **`feedback_english_terms.md`** — 어색한 음차 금지 (transmuxing 등)
- **`feedback_markdown_range.md`** — 숫자~숫자 OK

## 관련 스킬/에이전트

- `image-prompt-curator` — 이미지 프롬프트만 전담 (이 스킬에서 분리됨)
- `echarts-curator` — ECharts 검수만 전담 (개별 호출용)
- `image-need-judge` 에이전트 — 이미지 필요 여부 판단
- `image-prompt-generator` 에이전트 — 영어 프롬프트 작성
- `echarts-advisor` 에이전트 — ECharts 추천

이 스킬(`visual-planner`)은 **설계 단계 협업**, 다른 스킬은 **단일 도구 전담**.
