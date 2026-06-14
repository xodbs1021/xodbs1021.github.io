---
name: blog-writer
description: "태형이 따라잡기 블로그 포스트 작성 오케스트레이터. 주제/메모 → 초안 → 품질 검토 → git push까지 완료한다. 기술 아티클(Medium 스타일)과 일반 포스트(학습 노트) 두 모드를 지원하며, 필요한 에이전트만 온디맨드로 로드한다. '블로그 써줘', '포스트 작성', '글 올려줘', '블로그 초안', '{주제} 블로그로 정리해줘', '오늘 공부한 거 블로그에', '이거 정리해서 올려줘', '블로그 발행', '이미지 넣어서 올려줘', '수정 후 다시 올려줘' 등 블로그 글쓰기/발행 요청 시 반드시 이 스킬을 사용할 것. 단, '아티클 써줘'처럼 명확히 아티클 스타일을 요청하면 article-writer 스킬을 우선 사용할 것."
---

# blog-writer 오케스트레이터

## 에이전트 레지스트리

요청 분석 후 이 테이블에서 **필요한 에이전트만** 식별하고, 해당 파일만 Read해서 사용한다.
불필요한 에이전트는 로드하지 않는다.

| 에이전트 | 핵심 역할 | 언제 필요 | 파일 경로 |
|---------|---------|---------|---------|
| post-drafter | Hugo 마크다운 초안 생성 (일반 포스트) | 새 포스트 작성 | `.claude/agents/post-drafter.md` |
| image-manager | Unsplash 검색 + Gemini 이미지 생성 | 이미지 필요 시 | `.claude/agents/image-manager.md` |
| blog-quality-reviewer | 기술 정확성·구성·가독성 검토 | 초안 완성 후 | `.claude/agents/blog-quality-reviewer.md` |
| article-style-checker | Medium 스타일 7개 기준 검토 | 아티클 스타일 글 작성 후 | `.claude/agents/article-style-checker.md` |
| publisher | git add/commit/push 배포 | 발행 시 | `.claude/agents/publisher.md` |

> **아티클 스타일 요청** ("아티클 써줘", "Medium 스타일", "심층 분석")은 `article-writer` 스킬이 별도로 있으므로 그쪽을 사용한다.

---

## Phase 0: 컨텍스트 확인

기존 작업 여부 판단:
- `_workspace/blog/` 존재 + "수정/다시/개선" 요청 → **부분 재실행** (해당 단계만)
- 새 주제 제공 → **새 실행** (기존 있으면 `_workspace/blog_prev/`로 이동)

## Phase 1: 요청 라우팅

사용자 입력에서 추출한 뒤, 필요한 에이전트 목록을 결정한다:

- **주제**: 명시 또는 메모에서 추론
- **카테고리**: `tech-blurting` / `coding-test` / `open-source-analysis` / `0-to-1` / `book-review`
  - 불명확하면 내용으로 추론 후 한 줄 확인
- **이미지**: 사용자 파일 제공 / 명시 요청 / 주제상 필요 여부
- **발행 여부**: "초안만" vs "발행까지"

**필요 에이전트 결정 예시:**
- 일반 tech-blurting → `post-drafter` + `blog-quality-reviewer` + (선택)`publisher`
- 코딩테스트 풀이 → `post-drafter` + `blog-quality-reviewer` + (선택)`publisher`
- 이미지 있는 포스트 → 위 + `image-manager`
- book-review → `post-drafter` + `blog-quality-reviewer` (book-review-critic 기준 포함)

결정한 에이전트 파일만 Read해서 컨텍스트에 로드한다.

## Phase 2: 초안 생성

로드한 `post-drafter.md` 지침에 따라 초안 작성.
결과를 `_workspace/blog/draft.md`에 저장.

## Phase 2.5: 이미지 처리 (필요 시)

이미지가 필요한 경우에만: `image-manager.md` Read 후 실행.
스크립트: `.claude/skills/blog-writer/scripts/image_manager.py`

## Phase 3: 품질 검토

로드한 `blog-quality-reviewer.md` 지침에 따라 초안 검토.
결과를 `_workspace/blog/review.md`에 저장.

**분기:**
- 발행 가능 → Phase 4
- 수정 후 발행 (non-blocking만) → post-drafter로 수정 후 Phase 4
- blocking 이슈 → 사용자에게 검토 결과 보여주고 방향 확인

## Phase 4: 발행

발행 원하는 경우에만: `publisher.md` Read 후 git add → commit → push.
초안만 요청이면 파일 저장 후 종료.

## 최종 출력

**발행 완료:**
```
✅ 발행 완료
- 포스트: {제목}
- 경로: content/posts/{카테고리}/{slug}.md
- 카테고리: {카테고리}
- 배포: https://xodbs1021.github.io/{permalink}
- 사용 에이전트: {로드한 에이전트 목록}
```

**초안만:**
```
📝 초안 완성
- 파일: _workspace/blog/draft.md
- 발행하려면 "이 초안 올려줘"라고 하면 됩니다
```

## 에러 핸들링

- post-drafter 실패 → 입력 내용으로 기본 포스트 생성 후 재시도
- image-manager 실패 → "이미지 없이 진행할까요?" 확인 후 계속
- quality-reviewer 실패 → 검토 없이 사용자 확인 후 진행
- push 실패 → 에러 메시지 + 수동 push 명령어 안내
