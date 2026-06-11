---
name: blog-writer
description: "태형이 따라잡기 블로그 포스트 작성 오케스트레이터. 주제, 학습 메모, 키워드를 주면 Hugo 마크다운 포스트를 생성하고 품질 검토 후 git push까지 완료한다. 이미지가 필요하면 Unsplash 스톡 검색 → 없으면 Gemini(나노바나나)로 자동 생성하여 static/images에 저장한다. 기술 아티클은 Medium 스타일(도입 훅 → 개념 설명 → 코드/셋업 → 수치 증명 → 결론)로 작성한다. '블로그 써줘', '포스트 작성', '글 올려줘', '블로그 초안', '아티클 써줘', '{주제} 블로그 포스트 만들어줘', '오늘 공부한 거 블로그로', '이거 정리해서 블로그에 올려줘', '블로그 발행', '이미지 넣어서 올려줘', '수정 후 다시 올려줘', '이전 초안 개선해줘' 등 블로그 글쓰기/발행과 관련된 모든 요청 시 반드시 이 스킬을 사용할 것."
---

# blog-writer 오케스트레이터

## 실행 모드

서브 에이전트 파이프라인:
`post-drafter` → `image-manager` (선택) → `blog-quality-reviewer` → `publisher`

## Phase 0: 컨텍스트 확인

시작 전에 기존 작업 여부를 판단한다:
- `_workspace/blog/` 디렉토리가 존재하고 사용자가 "수정", "다시", "개선" 등을 요청 → **부분 재실행** (해당 단계만)
- 새 주제/메모 제공 → **새 실행** (기존 workspace 있으면 `_workspace/blog_prev/`로 이동)
- 디렉토리 없음 → **초기 실행**

## Phase 1: 입력 파악

사용자 입력에서 다음을 추출한다:
- **주제**: 명시되어 있거나 메모에서 추론
- **카테고리**: `tech-blurting` / `coding-test` / `open-source-analysis` / `0-to-1` / `book-review`
  - 불명확하면 내용 보고 추론, 추론 결과를 사용자에게 한 줄로 확인
- **아티클 스타일**: `tech-blurting`, `open-source-analysis`, `0-to-1`은 기본적으로 Medium 기술 아티클 스타일 적용
  - 도입 훅(트렌드/문제) → 개념 설명 → 코드/셋업 → 수치 증명 → 결론 구조
  - 구체적 수치, 완전한 코드 블록, 출처 링크 포함
- **이미지 처리 방식**:
  - 사용자가 직접 이미지 파일 경로 제공 → 해당 파일 사용
  - "이미지 넣어줘" / "이미지 찾아줘" / 명시적 요청 → image-manager 실행
  - 아무 언급 없음 → Phase 2 초안에서 이미지 필요 여부 판단 후 결정
- **발행 여부**: "초안만" vs "발행까지" (기본값: 사용자 확인 후 발행)

## Phase 2: 초안 생성

```python
Agent(
  agent="post-drafter",
  subagent_type="general-purpose",
  model="opus",
  prompt="""
  다음 입력으로 Hugo 블로그 포스트 초안을 작성하라:
  - 주제: {topic}
  - 카테고리: {category}
  - 이미지: {images or "없음"}
  - 추가 메모: {notes or "없음"}
  
  출력: 완성된 마크다운 + 저장 경로 제안 + 이미지 배치 목록
  """
)
```

초안을 `_workspace/blog/draft.md`에 저장한다.

## Phase 2.5: 이미지 처리 (필요 시)

이미지가 필요한 경우에만 실행. 스크립트 경로: `.claude/skills/blog-writer/scripts/image_manager.py`

```python
Agent(
  agent="image-manager",
  subagent_type="general-purpose",
  model="opus",
  prompt="""
  다음 블로그 포스트를 위한 이미지를 획득하라:
  - 포스트 주제: {topic}
  - 포스트 slug: {slug}
  - 사용자 요청: {직접 제공 파일 / "검색해줘" / "AI 생성해줘"}
  
  스크립트: ~/tech-blog/.claude/skills/blog-writer/scripts/image_manager.py
  환경변수: GEMINI_API_KEY, UNSPLASH_ACCESS_KEY (없으면 AI 생성만)
  
  마크다운 참조 문자열을 반환하라.
  """
)
```

획득한 이미지 마크다운 참조를 draft.md의 적절한 위치(도입부 아래 또는 관련 섹션)에 삽입한다.

## Phase 3: 품질 검토

```python
Agent(
  agent="blog-quality-reviewer",
  subagent_type="general-purpose",
  model="opus",
  prompt="""
  아래 블로그 포스트 초안을 검토하라:
  {draft 내용}
  
  카테고리: {category}
  """
)
```

검토 결과를 `_workspace/blog/review.md`에 저장한다.

**판정에 따른 분기:**
- "발행 가능" → Phase 4로
- "수정 후 발행" → non-blocking만 있으면 post-drafter에게 수정 요청 후 Phase 4
- blocking 이슈 있으면 → 사용자에게 검토 결과 보여주고 수정 방향 확인

## Phase 4: 발행

사용자가 발행을 원하는 경우에만 실행. 초안만 요청한 경우 파일만 저장하고 종료.

```python
Agent(
  agent="publisher",
  subagent_type="general-purpose",
  model="opus",
  prompt="""
  아래 내용을 Hugo 블로그에 발행하라:
  - 포스트 내용: {최종 draft}
  - 저장 경로: {제안된 경로}
  - 이미지 배치 목록: {있으면 명시}
  
  git add → commit → push까지 완료하라.
  """
)
```

## 최종 출력

```
✅ 발행 완료
- 포스트: {제목}
- 경로: {content/posts/카테고리/slug.md}
- 카테고리: {카테고리}
- 배포: https://xodbs1021.github.io/{permalink}
- 이미지: {배치된 이미지 목록 or "없음"}
```

초안만 생성한 경우:
```
📝 초안 완성
- 파일: _workspace/blog/draft.md
- 발행하려면 "이 초안 올려줘"라고 하면 됩니다
```

## 에러 핸들링

- post-drafter 실패: 직접 입력 내용으로 기본 포스트 생성 후 재시도
- image-manager 실패: "이미지 없이 진행할까요?" 사용자 확인 후 계속
- quality-reviewer 실패: 검토 없이 사용자에게 확인 후 진행
- publisher git push 실패: 에러 메시지 + 수동 push 명령어 안내
- GEMINI_API_KEY 없음: 환경변수 설정 방법 안내 (`export GEMINI_API_KEY=your_key`)

## 테스트 시나리오

**정상 흐름:**
- 입력: "WebRTC TURN 서버 역할 공부했는데 tech-blurting으로 올려줘"
- 기대: draft 생성 → quality review → git push → 배포 URL 출력

**에러 흐름:**
- 입력: "이미지 첨부해서 올려줘" (이미지 없이)
- 기대: publisher가 이미지 경로 질문 → 사용자 응답 후 진행
