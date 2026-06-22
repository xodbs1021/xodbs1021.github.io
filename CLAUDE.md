# tech-blog

## 하네스: 스트리밍 기술 학습

**목표:** 네이버 치지직 입사를 목표로, 실무 수준의 스트리밍 기술 지식 습득. "이게 뭔지"가 아니라 "왜 이 선택을 했는지, 트레이드오프가 뭔지"까지 설명할 수 있는 수준.

**트리거:** "HLS 배워줘", "오늘 뭐 공부해", "WebRTC 가르쳐줘", "FFmpeg 실습", "스트리밍 공부", "다음 주제" 등 스트리밍 학습 요청 시 `streaming-tutor` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

## 하네스: 강의 시리즈 작성 (PokéClip 커리큘럼)

**목표:** PokéClip 프로젝트 구현 + 치지직 백엔드/AI 입사 대비. 17개 트랙(A~Q) × 각 트랙 레벨 분할 강의를 작성 → 검증 → 저장.

**트리거:** "B-1 강의 만들어", "A 트랙 시작", "AWS 기초 강의 시리즈" 등 트랙-레벨 식별자 또는 주제로 강의 작성 요청 시 `lesson-series-writer` 스킬을 사용하라.

**필수 컨텍스트 (모든 강의 작성 시 cat 의무):**
- `_workspace/pokeclip_context.md` — PokéClip 기술 사양 + 학습자 진단
- `_workspace/curriculum_master.md` — 17개 트랙 윤곽 + 의존 그래프
- `_workspace/curriculum_progress.json` — 진도 추적

**에이전트 체인:**
1. `lesson-planner` (계획)
2. `lesson-author` (본문 작성, 위 3개 파일 cat 의무)
3. `lesson-quality-guard` (90/100 검증, NEEDS_REVISION 시 lesson-author 재호출 max 2회)

**저장 위치:** `_workspace/lessons/<TRACK>_<이름>/<TRACK>-L-K.md` (예: `_workspace/lessons/B_python/B-1-3.md`)

**영상 트랙(4-1~4-5)은 봉인.** 새 도메인 트랙(A~Q)이 메인.

## 하네스: 블로그 글쓰기

**목표:** 주제/메모 → Hugo 포스트 초안 → 품질 검토 → git push 배포까지 원클릭으로

**트리거:** "블로그 써줘", "포스트 작성", "글 올려줘", "{주제} 블로그로 정리해줘", "오늘 공부한 거 블로그에" 등 블로그 글쓰기/발행 요청 시 `blog-writer` 스킬을 사용하라.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-30 | 초기 구성 | 전체 | 공부목록.pdf 기반 + 추가 항목 포함 학습 하네스 구축 |
| 2026-05-30 | quality-guard 에이전트 추가 | agents/quality-guard.md, skills/streaming-tutor | 겉핥기 방지 + 커리큘럼 완결성 감시 용도 |
| 2026-05-30 | 목표 상향 - 치지직 입사 수준 | 전체 | 실무 트레이드오프 / 설계 판단 / 대규모 서비스 관점까지 포함 |
| 2026-05-30 | blog-writer 하네스 추가 | agents/post-drafter.md, agents/blog-quality-reviewer.md, agents/publisher.md, skills/blog-writer | 블로그 글쓰기/발행 자동화 |
| 2026-05-30 | image-manager 에이전트 추가 | agents/image-manager.md, skills/blog-writer/scripts/image_manager.py | Unsplash 스톡 + Gemini(나노바나나) 이미지 자동화 |
| 2026-05-30 | 정렬 버그 수정 | layouts/_default/list.html, layouts/list.html | weight 정렬 → date 역순 정렬로 수정 |
| 2026-06-22 | lesson-series-writer 하네스 추가 | agents/lesson-planner.md, agents/lesson-author.md, skills/lesson-series-writer | 강의 시리즈 작성 자동화 (계획 → 본문 → 저장) |
| 2026-06-22 | PokéClip 커리큘럼 + 검증 인프라 | agents/lesson-quality-guard.md, _workspace/pokeclip_context.md, _workspace/curriculum_master.md, _workspace/curriculum_progress.json, 전역 메모리 project_pokeclip.md | 17개 트랙 마스터플랜 + 검증 루프 + 휘발 방지 다층 백업 |
