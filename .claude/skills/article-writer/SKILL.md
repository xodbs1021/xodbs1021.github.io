---
name: article-writer
description: "Medium 기술 아티클 스타일로 Hugo 블로그 포스트를 작성하는 전담 스킬. 도입 훅 → 개념 설명 → 코드/셋업 → 수치 결과 → 결론 구조로 완성형 아티클을 작성하며, article-style-checker로 7개 기준 품질 검증 후 git push까지 완료한다. '아티클 써줘', 'Medium 스타일로 써줘', '기술 아티클 작성해줘', '제대로 된 기술 글', 'HLS 심층분석', 'vLLM 세팅 아티클', 'open-source-analysis 올려줘', '깊이 있는 포스트 작성' 등 단순 학습 노트가 아닌 완성형 기술 아티클 요청 시 반드시 이 스킬을 사용할 것."
---

# article-writer

단순 학습 메모가 아니라 독자가 실제로 따라하고 신뢰할 수 있는 완성형 기술 아티클을 작성한다.
벤치마크 기준: [Turbocharging Gemma 4 31B on the RTX PRO 6000 Blackwell](https://medium.com/@sangjinn/turbocharging-gemma-4-31b-on-the-rtx-pro-6000-blackwell-a-native-multimodal-vlm-7895ccc32d70)

## 에이전트 레지스트리 (필요한 것만 로드)

| 에이전트 | 핵심 역할 | 언제 필요 | 파일 |
|---------|---------|---------|------|
| article-style-checker | Medium 스타일 7개 기준 검토 | 초안 완성 후 | `.claude/agents/article-style-checker.md` |
| image-manager | Unsplash 검색 + Gemini 생성 | 이미지 요청/필요 시 | `.claude/agents/image-manager.md` |
| publisher | git add/commit/push | 발행 시 | `.claude/agents/publisher.md` |

---

## Phase 1: 입력 분석

사용자 메시지에서 다음을 추출한다:

- **주제**: 명시되거나 메모에서 추론
- **카테고리**: `tech-blurting` / `open-source-analysis` / `0-to-1` 중 하나
  - 불명확하면 주제로 추론 후 한 줄 확인
- **보유 자료**: 학습 메모, 코드 스니펫, 벤치마크 수치 등
- **이미지 필요 여부**: 명시 요청이거나 다이어그램이 있어야 이해되는 주제

## Phase 2: 아티클 초안 작성

### 구조 템플릿

```
[도입부]
- 산업 트렌드 또는 현실 문제로 시작 (독자가 "나도 이거 궁금했어"가 되어야)
- 저자 포지셔닝: "직접 구현/분석/테스트했다" 1~2문장
- 이 글에서 얻을 수 있는 것 명시

[본론 — 주제에 맞게 섹션 선택]
## {기술명}이란        ← 개념 정의 + 핵심 기능 bullet list
## 환경 / 스택         ← 버전, 사양, 사용 도구
## 구현 / 셋업         ← 단계별 코드 포함
## 결과 / 벤치마크     ← 구체적 수치 + 측정 조건
## 트레이드오프        ← 한계, 주의사항, 대안

[결론]
- 도입 질문/문제에 직접 답
- 언제/누가 써야 하는지 실용 가이드
```

### 작성 핵심 원칙

**수치 없이 쓰지 않는다.** "빠르다", "효율적이다", "성능이 좋다"는 구체 수치로 대체.
- ❌ "처리 속도가 빠릅니다"
- ✅ "배치 크기 32, FP16 기준 206.4 tokens/s (RTX 4090, vLLM 0.4.2)"

**코드는 완전하게.** 독자가 복사-붙여넣기해서 바로 실행 가능해야 한다. 핵심 파라미터/환경변수엔 한 줄 주석.

```yaml
# 예시: 주석 달린 완전한 설정
services:
  inference:
    image: vllm/vllm-openai:latest
    environment:
      - MODEL_NAME=google/gemma-2-9b-it  # Hugging Face 모델 ID
      - MAX_MODEL_LEN=8192               # 최대 컨텍스트 길이
      - GPU_MEMORY_UTILIZATION=0.90      # GPU 메모리 점유율
```

**출처는 본문에 링크로.** 주요 주장마다 공식 문서/논문/측정 결과 링크. 최소 3개.

**비교는 표로.** 두 개 이상 옵션 비교 시 산문 대신 Markdown 표.

**이미지 2~3개.** 아키텍처 다이어그램, 결과 스크린샷, 벤치마크 차트 등.

### Hugo 프런트매터

초안 작성 전에 반드시 다음 명령을 실행해서 현재 시각을 가져온다:

```bash
date '+%Y-%m-%dT%H:%M:%S+09:00'
```

그 출력값을 그대로 `date` 필드에 넣는다. 직접 시각을 타이핑하거나 추정하지 않는다.

```yaml
---
title: "{제목}"
date: {위 명령 실행 결과}
categories: ["{카테고리}"]
draft: false
---
```

- `draft: false` — 반드시 false. true로 쓰면 Hugo 빌드 시 글이 누락됨.
- `weight` 필드 절대 금지.

## Phase 3: 스타일 검토

`.claude/agents/article-style-checker.md`를 Read한 뒤 7개 기준으로 초안을 점검한다.

- 미통과 항목 → 해당 섹션 수정 → 재점검
- 6/7 이상 통과 + 판정 "발행 가능" → Phase 4로

## Phase 4: 이미지 처리 (필요 시)

이미지가 필요하면 `.claude/agents/image-manager.md`를 Read해서 실행. 불필요하면 건너뛴다.

## Phase 5: 발행

`.claude/agents/publisher.md`를 Read해서 git add → commit → push.

저장 경로: `content/posts/{카테고리}/{slug}.md`

## 최종 출력

```
✅ 아티클 발행 완료
- 제목: {제목}
- 경로: content/posts/{카테고리}/{slug}.md
- 배포: https://xodbs1021.github.io/{permalink}
- 스타일 검토: {X}/7 통과
- 이미지: {배치된 이미지 목록 or "없음"}
```

## 에러 핸들링

- 수치가 없는 주제: 공식 문서의 수치나 개념 간 정성적 비교로 대체. "수치 없음"으로 넘기지 않는다.
- 이미지 획득 실패: "이미지 없이 진행할까요?" 확인 후 계속
- push 실패: 에러 메시지 + 수동 push 명령어 안내
