---
name: image-prompt-curator
description: 블로그 글 작성 직전에 호출. image-need-judge로 이미지 필요 여부 먼저 판단(0~N개 정직 판단), 필요할 때만 image-prompt-generator로 영어 프롬프트 작성. 갯수 패턴화 절대 금지.
---

# 블로그 이미지 큐레이터

블로그 글에 이미지가 진짜 필요한지 먼저 판단하고, 필요할 때만 영어 프롬프트로 출력.

## 제1규칙 — 패턴화 절대 금지

**이미지 갯수든, 필요 여부든, 어떤 종류든 패턴화 절대 금지.**

```
❌ "최근 글이 0개였으니 이번도 0개"
❌ "최근 글이 3개였으니 이번도 3개"
❌ "최근 2개 글 패턴 그대로 따라가기"
✅ 글마다 백지에서 다시 판단
```

## 트리거

- 사용자가 "글 내용 보고 프롬프트 줘", "이미지 프롬프트 줘", "필요한 이미지 알려줘" 요청
- 블로그 글 초안 작성 직전 (강의 cat 후 글 쓰기 전)
- 사용자가 강의 X-Y의 N강 분석 후 글 쓸 때

## 협업 흐름 (2단계 에이전트)

### 단계 1: 이미지 필요 여부 판단

**`image-need-judge` 에이전트 호출**
- Agent 도구로 `subagent_type: image-need-judge`
- 글 마크다운 경로 또는 강의 cat 결과를 prompt로 전달
- 출력: 시각적 후보 전부 분류 + 이번 글에 필요한 N개 (0개 OK, 5~7개 OK)
- **N은 글이 결정하지 습관이 결정하지 않는다**

### 단계 2: 영어 프롬프트 작성 (N > 0인 경우만)

**`image-prompt-generator` 에이전트 호출**
- N > 0인 경우만 진행
- Agent 도구로 `subagent_type: image-prompt-generator`
- image-need-judge가 분류한 N개 항목을 prompt로 전달
- 출력: 각 이미지의 영어 프롬프트

### 단계 3: 사용자 보고

- 시각적 후보 분류 결과 (정직 보고)
- 이미지로 가는 N개 + 영어 프롬프트
- 표/Mermaid/ECharts/cross-link로 처리할 후보들도 명시

## 강의 파일 처리

강의 시리즈 글이면 강의 파일을 컨텍스트로 확보:

- **반드시 cat 사용 (Bash)** — Read 도구 금지 (Hook이 차단)
- 명령 예: `cat /Users/kty/tech-blog/_workspace/streaming_lessons/4-2-1.md ...`
- 사용자 메모리: `feedback_lesson_output.md`

## 사용자 메모리 정합

- **`feedback_image_prompts.md`** — 이미지 프롬프트는 반드시 영어
- **`feedback_echarts_usage.md`** — 수치 비교는 ECharts (이미지 아님)
- **`feedback_streaming_lesson_style.md`** — 개발자 실무 위주, 수학 제외
- **`feedback_lesson_output.md`** — 강의 파일은 cat만
- **`feedback_internal_terms.md`** — "레벨 N" 표기 금지
- **`feedback_markdown_range.md`** — 숫자~숫자 OK
- **`feedback_english_terms.md`** — 어색한 음차(transmuxing 등)는 영어 원문

## 출력 예시

```
[이미지 필요 여부 판단]

이번 글 주제: ABR Ladder 설계
시각적 후보 15개 검토:
- Convex Hull 그래프 → ECharts scatter+line
- Per-Title 영상 분류 → 이미지 가치 큼 (친근 인포그래픽)
- Shot-Based Encoding 타임라인 → 이미지 가치 큼 (시간축 시각화)
- 라이브 트랜스코딩 인프라 → Mermaid 충분
- ABR Ladder 단계 → 이전 글 cross-link
- 시청자 화질 분포 → ECharts donut
- ...

이미지로 가는 2개:
1. per-title-encoding-flow.png — 콘텐츠별 다른 사다리 (시각적 본질)
2. shot-based-encoding.png — 영상 시간축 비트레이트 변화 (텍스트 표현 불가)

패턴화 자기 점검:
- 이전 5개 글의 갯수: 0, 0, 1, 0, 0
- 이번 글: 2개 — 패턴 깨고 정직 판단함 ✅

[영어 프롬프트]
(image-prompt-generator 결과 첨부)
```

## 협업 시점

블로그 글 작성 흐름:

1. (사용자) "X-Y 강의 분석하고 프롬프트 줘"
2. (메인 클로드) 강의 cat — 컨텍스트 확보
3. (메인 클로드) 이 스킬 호출
4. (스킬) image-need-judge 호출 → 필요 N개 판단
5. (스킬) N > 0이면 image-prompt-generator 호출 → 영어 프롬프트
6. (메인 클로드) 사용자에게 보고
7. (사용자) 이미지 N개 다운로드해 전달 (또는 0개면 바로 다음 단계)
8. (메인 클로드) 글 작성
