---
name: blog-writer
description: "블로그 메모·학습 기록을 초안으로 작성하거나 기존 글을 수정한다. 명시된 발행 요청은 검증·배포까지 수행한다. 심층 기술 아티클은 article-writer로 연결한다."
---


# blog-writer

먼저 [공통 기준](references/editorial-policy.md)을 읽는다. 일반 블로그 글·학습 노트의 작성, 수정, 명시된 발행을 담당한다.

[실제 화면 검수 기준](references/visual-layout-checks.md)을 작성·수정·발행 시 함께 적용한다. 자동 검사와 실제 PNG 확인을 마치기 전에는 검수 완료로 표시하지 않는다.

## 진행

1. 요청에서 주제, 자료, 초안/발행 범위, 기존 글 여부를 파악한다. 주제와 분류는 가능한 범위에서 판단하고 꼭 필요한 근거만 질문한다.
2. [글쓰기 원칙](references/writing-principles.md)과 [글 유형](references/post-types.md)을 읽고 유형을 고른다. 일반 글은 `.claude/agents/post-drafter.md`, 심층 아티클은 `../article-writer/SKILL.md`를 읽는다. 기존 글 수정은 해당 원본과 관련 근거부터 읽는다.
3. `_workspace/blog/<slug>/`에 draft.md, evidence.md를 작성한다. 공개 글 수정도 우선 사본에서 진행한다. 기존 작업이 있으면 해당 작업을 이어간다.
4. 공개할 글은 `../visual-planner/SKILL.md`를 반드시 거친다. 설명마다 형식을 고르고, 움직이는 설명 1개 이상과 정적 이미지 1개 이상을 갖춘다(면제는 공통 기준의 승인 절차). 생성 이미지(비유 일러스트·모션그래픽 소재)는 `../gpt-image/SKILL.md`(Codex 내장 GPT 이미지)로, 모션그래픽·움직이는 그림은 `../motion-explainer/SKILL.md`로 만든다. 실제 사진(스톡)이 필요하면 `.claude/agents/image-manager.md`를 읽는다. 필수 시각 자료가 빠진 초안은 공개 가능한 완성본으로 보고하지 않는다.
5. `.claude/agents/blog-quality-reviewer.md`(사실·역할·화면)로 먼저, `.claude/agents/article-style-checker.md`(문장·구조)로 다음에 검토해 review.md에 근거와 남은 문제를 기록한다.
6. 초안 요청은 파일과 미확인 항목을 보고하고 끝낸다. 발행 지시가 있으면 `.claude/agents/publisher.md`로 필요한 검증과 배포까지 마친다.

에이전트 파일은 역할 지침이다. 실제 위임은 사용 가능한 도구·현재 권한에 맞춘다. 호출하지 않은 에이전트가 검토했다고 보고하지 않는다.

## 결과

- 초안: 파일 경로, 선택한 분류, 핵심 근거, 발행 전 남은 항목.
- 발행: 제목, 실제 `https://taeyun.blog/posts/.../` URL, 검증 결과, 배포 상태.
- 실패: 실패 단계와 구체적 이유. 단순 push 성공을 발행 완료로 표현하지 않는다.
