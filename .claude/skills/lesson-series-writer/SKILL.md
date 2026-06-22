---
name: lesson-series-writer
description: 새 강의 시리즈(예 "5-1") 작성을 오케스트레이션. lesson-planner로 구성 계획 → 사용자 확인 → lesson-author로 각 강의 순차 작성 → 저장 → 보고. 사용자가 "5-1 강의 만들어" 같이 시리즈 식별자를 주면 트리거.
---

# lesson-series-writer

스트리밍 강의 시리즈를 처음부터 끝까지 생성하는 오케스트레이션 스킬.

## 트리거

- "5-1 강의 만들어"
- "5-X 시리즈 작성"
- "레벨 5 다음 시리즈"
- "<주제> 강의 만들어줘"

## 전체 흐름 (4단계)

### 단계 1: 시리즈 주제 파악 + 계획

1. 사용자에게 시리즈 식별자와 주제 확인
2. **`lesson-planner` 에이전트 호출** (Agent 도구, `subagent_type: lesson-planner`)
   - prompt: 시리즈 식별자 + 주제 + (있다면 사용자 제시 항목)
3. lesson-planner가 `_workspace/streaming_lessons/PLAN_N-M.md` 저장 + 보고
4. 사용자에게 계획 보고 — **확인 받음**

### 단계 2: 사용자 검토

사용자가 계획을 보고:
- 강의 추가/제거/순서 변경 요청 가능
- "좋아 진행" 응답이면 다음 단계
- 조정 요청이면 lesson-planner 재호출

### 단계 3: 각 강의 순차 작성

확정된 계획의 각 강의를 **순차 작성**:

1. lesson-planner의 PLAN_N-M.md 읽기 (cat)
2. K=1부터 N까지 반복:
   - **`lesson-author` 에이전트 호출** (Agent 도구, `subagent_type: lesson-author`)
   - prompt: 강의 식별자 (N-M-K) + 제목 + 핵심 항목 + 선행 강의
   - lesson-author가 `_workspace/streaming_lessons/N-M-K.md` 저장
3. 각 강의 작성 후 줄 수/섹션 수 보고
4. 순차 작성이 정석 — 선행 강의를 후행 강의가 cat으로 참조 가능

### 단계 4: 전체 보고

```
[레벨 N-M 시리즈 작성 완료]

저장된 파일:
- _workspace/streaming_lessons/PLAN_N-M.md
- _workspace/streaming_lessons/N-M-1.md (XXX줄)
- _workspace/streaming_lessons/N-M-2.md (XXX줄)
- ...

총 강의: N개
총 줄 수: XXXX
다음 단계:
- 사용자가 강의 내용 검토
- 블로그 글로 작성 요청 시 visual-planner 스킬로 진행
```

## 사용자 메모리 정합

- `feedback_streaming_lesson_style.md` — 실무 위주, 수학 제외, 강의 수 제한 없음
- `feedback_lesson_output.md` — 강의 파일은 cat만 (Read 금지). 강의 파일 보여달라면 cat 한 번.
- `feedback_article_style.md` — 구체적 수치 필수
- `feedback_internal_terms.md` — 블로그 글에는 "레벨 N" 금지 (강의 파일 헤더는 OK)
- `feedback_english_terms.md` — 어색한 음차 금지
- `feedback_markdown_range.md` — 숫자~숫자 OK

## 협업

이 스킬은 **새 강의 시리즈 작성** 전담.

이후 흐름:
- 사용자가 강의 검토
- "5-1 분석해서 프롬프트 줘" → `visual-planner` 스킬 (이미지/ECharts/Mermaid/표 결정)
- 이미지 다운로드 후 사용자가 "글 써줘" → 블로그 글 작성

## 단계별 실패 처리

| 실패 | 처리 |
|---|---|
| lesson-planner 결과가 너무 얕음 | 사용자에게 보고, 재호출 또는 항목 보강 |
| lesson-author가 정형 스타일 어김 | 자기 점검 항목 다시 적용 후 재작성 |
| 선행 강의가 없는데 lesson-planner가 참조 지정 | 참조 제거 후 진행 |
| 강의 파일 저장 실패 | 디렉토리 권한 확인, 사용자 호출 |

## 관련 에이전트/스킬

- `lesson-planner` 에이전트 — 시리즈 구성 계획만
- `lesson-author` 에이전트 — 강의 1개 작성만
- `streaming-tutor` 스킬 — **실시간 학습 진행용 (다른 스킬)** — 학습자에게 가르치는 흐름
- `visual-planner` 스킬 — 강의 → 블로그 시각화 설계 (이 스킬 다음 단계)
