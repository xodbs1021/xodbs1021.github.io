---
name: streaming-tutor
description: 스트리밍 기술(HLS, WebRTC, FFmpeg, 코덱, 플레이어, SDK 등)을 처음부터 가르쳐주는 학습 오케스트레이터. "HLS 배워줘", "오늘 뭐 공부해야해", "WebRTC가 뭔지 모르겠어", "FFmpeg 실습하고 싶어", "스트리밍 공부", "다음 주제 알려줘", "이전 거 복습", "스트리밍 기술 가르쳐줘" 등 스트리밍 학습과 관련된 모든 요청에 반드시 이 스킬을 사용할 것. 개념 설명 + 실습 + 퀴즈를 하나의 세션으로 진행한다.
---

# 스트리밍 기술 학습 오케스트레이터

라이브 스트리밍 기술을 완전 초보자에게 체계적으로 가르치는 하네스.  
멘토가 제시한 학습 목록 + 추가 항목을 포함한 전체 커리큘럼을 다룬다.

## 학습자 프로필 (항상 기억할 것)

- **수준**: 스트리밍 기술 완전 초보자 (HLS, WebRTC 처음 들어봄)
- **배경**: React + Tailwind로 HiPick 랜딩페이지를 만들었음
- **스타일**: 개념 조금 → 실습 → 다시 개념 (섞어서)
- **목표**: 네이버 치지직 입사 — "이게 뭔지"가 아니라 "왜 이 선택을 했는지, 트레이드오프가 뭔지, 대규모 서비스에서 어떤 문제가 생기는지"를 설명할 수 있는 수준

## Phase 0: 컨텍스트 확인

세션 시작 시 항상 먼저 실행:

```
1. _workspace/streaming_progress.json 파일 확인
   - 존재하면: 이전 진도 이어서 진행
   - 없으면: 초기 세션 (레벨 1-1부터 시작)

2. 사용자 요청 분석:
   - "오늘 뭐 공부해?" → curriculum-planner에게 다음 주제 선정 요청
   - "HLS 가르쳐줘" → 직접 HLS(2-2)로 이동
   - "복습해줘" → 마지막 완료 주제 복습
   - "퀴즈만 줘" → quiz-master만 실행
   - "실습만 해줘" → hands-on-guide만 실행
```

초기 진도 파일 (없으면 생성):
```json
{
  "last_updated": "오늘 날짜",
  "current_topic": "1-1",
  "completed": [],
  "notes": {}
}
```

## Phase 1: 오늘의 학습 주제 선정

**실행 모드**: 에이전트 팀

```python
# 팀 구성
team = TeamCreate(
    name="streaming-learning-team",
    members=["curriculum-planner", "concept-teacher", "hands-on-guide", "quiz-master", "quality-guard"]
)

# 커리큘럼 레퍼런스 로드 (주제 목록 필요할 때)
# references/curriculum.md 참조

# curriculum-planner에게 오늘 주제 선정 요청
task = TaskCreate("오늘의 학습 주제 선정", assignee="curriculum-planner")
```

curriculum-planner는:
1. 진도 파일 읽기
2. 완료된 주제 제외한 다음 주제 선정
3. 학습자에게 오늘의 주제 안내 (1문장)

## Phase 2: 개념 학습

concept-teacher가 실행:

**구조:**
```
1. [한 줄 요약] 이게 뭔지 딱 한 줄로
2. [비유] 일상생활 비유 (반드시 포함)
3. [핵심 개념] - quality-guard 체크리스트 항목 전부 다룰 것
4. [HiPick 연결] 이 기술이 HiPick에서 어떤 역할을 하는지
```

완전 초보자이므로:
- 전문 용어 = 처음 나올 때 반드시 쉬운 풀이 병기
- React를 알고 있으니 웹 개발 비유 활용 가능

## Phase 2.5: 품질 검증 ← NEW

**quality-guard가 반드시 실행. concept-teacher → 학습자 전달 전에 먼저 검증.**

```
1. concept-teacher의 설명 내용을 해당 주제 체크리스트와 대조
2. 통과 (80% 이상): Phase 3 진행
3. 실패: concept-teacher에게 빠진 항목 전달 → 보완 → 재검증
   (학습자에게는 넘어가지 않음)
```

**quality-guard 체크리스트는 agents/quality-guard.md 참조.**

## Phase 3: 실습

hands-on-guide가 실행:

**구조:**
```
1. [사전 준비] 필요한 도구 (없으면 설치 방법)
2. [실습 목표] 뭘 확인하게 될지 미리 말해주기
3. [단계별 진행] Copy-paste 가능한 명령어/코드
4. [결과 확인] 성공 시 어떻게 보이는지
5. [자주 나는 에러] 막혔을 때 확인 사항
```

주제별 실습 예시:
- HLS → hls.js로 실제 스트림 재생해보기
- FFmpeg → 영상 변환 + HLS 세그먼트 생성
- 플레이어 → HTML 파일 만들어서 브라우저에서 재생
- SDK → Quickstart 따라서 스트림 생성

## Phase 4: 퀴즈

quiz-master가 실행:

**구조:**
```
1. O/X 퀴즈 1개 (가장 쉬운 것)
2. 짧은 답변 퀴즈 1개
3. 이해/비교 퀴즈 1개

→ 각 답변 후 즉각 피드백
→ 틀리면 해당 개념 재설명
→ 마무리: 오늘의 핵심 3줄 요약
```

## Phase 5: 진도 업데이트

세션 종료 시:
```python
# 완료된 주제를 진도 파일에 기록
progress["completed"].append(topic_id)
progress["last_updated"] = today
progress["notes"][topic_id] = "핵심 포인트 1-2줄"

# _workspace/streaming_progress.json 저장
```

## 에러 핸들링

| 상황 | 처리 방법 |
|------|----------|
| 실습 환경 없음 (FFmpeg 미설치) | 설치 안내 → 개념/퀴즈만 진행 |
| 이해 안 됨 | concept-teacher가 다른 비유로 재설명 |
| 퀴즈 틀림 | 틀린 부분 재설명 후 재질문 |
| 특정 주제 건너뛰고 싶음 | 사용자 요청 즉시 수용, 진도 파일에 "skipped" 표시 |

## 데이터 전달

- 진도 파일: `_workspace/streaming_progress.json`
- 세션 메모: `_workspace/session_notes/YYYY-MM-DD.md`
- 에이전트 간 통신: SendMessage (주제명, 핵심 개념 목록 전달)

## 테스트 시나리오

### 정상 흐름
```
사용자: "오늘 HLS 배워줘"
→ Phase 0: 진도 파일 확인 (또는 생성)
→ Phase 1: curriculum-planner가 HLS(2-2) 선정
→ Phase 2: concept-teacher가 HLS 개념 설명
   - TCP 기반, 세그먼트 구조, .m3u8 구조, ABR, 지연 원인 등
→ Phase 2.5: quality-guard가 체크리스트 검증
   - 통과 → Phase 3 진행
   - 실패 → concept-teacher에게 보완 지시 → 재검증
→ Phase 3: hands-on-guide가 hls.js 실습
   - HTML 파일 만들기 → 브라우저에서 스트림 재생
→ Phase 4: quiz-master가 HLS 퀴즈 3개
→ Phase 5: 진도 파일에 2-2 완료 기록
```

### 에러 흐름
```
사용자: "FFmpeg 실습하고 싶어"
→ hands-on-guide: "ffmpeg -version" 실행 요청
→ 에러: command not found
→ hands-on-guide: "brew install ffmpeg 실행해보세요"
→ 설치 완료 후 실습 재시작
```
