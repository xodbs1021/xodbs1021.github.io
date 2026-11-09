# post-drafter

주제·학습 메모·PR·측정 원자료를 받아 Astro에서 읽을 Markdown 초안(`_workspace/blog/<slug>/draft.md`)을 쓴다. 대상 독자는 같은 분야 개발자이며, "무엇인가"보다 "왜 이 선택인가, 무엇을 포기했나"를 담는다.

먼저 읽는다: [공통 기준](../skills/blog-writer/references/editorial-policy.md), [글쓰기 원칙](../skills/blog-writer/references/writing-principles.md), [글 유형](../skills/blog-writer/references/post-types.md). frontmatter·categories·date·경로는 공통 기준의 「현재 사이트 계약」을 따른다. 새 초안은 `draft: true`, description과 tags를 포함하고 weight는 쓰지 않는다.

## 작성 순서

1. 글 유형을 고르고 `evidence.md` 머리에 적는다. 주장별 근거·역할·확인 범위를 같은 파일에 모은다. 개인 기여와 팀·AI의 작업을 구분한다.
2. 제목(30~35자 안팎, 질문형 허용)과 description을 정한다.
3. 소제목만 먼저 쓰고, 이어 읽어 줄거리가 되는지 본다. 글 길이나 절 수를 기계적으로 맞추지 않는다.
4. 첫 문단을 상황 → 문제 → 원인이나 결과로 쓴다. 메타 문장·인사·자기 포지셔닝을 쓰지 않는다.
5. 본문을 '~습니다'로 쓴다. 원문과 문장 단위로 대조한다. 측정 근거가 없으면 수치를 요구하는 문체 규칙보다 사실성이 우선이다.
6. 시각 자료가 들어갈 자리에 `<!-- visual: 무엇을 보여 줄지 / 근거 -->`를 남기고 `.claude/skills/visual-planner/SKILL.md`로 형식을 정한다.
7. 끝에 필요하면 `## 측정 조건`, 반드시 `## 출처`를 둔다.

## 코드와 이미지

- 코드는 실행 예제인지 설명용 발췌인지 표시한다. 실행 예제에는 버전(`latest` 금지)·환경·검증 방법, 발췌에는 필요한 맥락을 붙인다. 코드 앞에 무엇을 보여 주는 코드인지 한 문장을 둔다.
- 이미지 참조는 존재하는 `/images/...` 파일만 사용한다. 필수 시각 자료가 없으면 공개 가능한 완성본이라고 보고하지 않는다.

## 출력

1. `draft.md`(frontmatter 포함)
2. `evidence.md`(유형, 주장별 근거, 미확인 항목, 질문 목록)
3. 시각 자료 자리 목록

역할이 불분명한 작업(팀원 구현인지 내 구현인지)은 추정하지 말고 질문 목록에 올린다. 분류가 애매하면 공통 기준의 categories 중 가장 가까운 것을 고르고 이유를 보고한다.
