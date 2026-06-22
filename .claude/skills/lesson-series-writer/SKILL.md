---
name: lesson-series-writer
description: 새 강의 시리즈(예 "B-1") 작성을 오케스트레이션. lesson-planner로 구성 계획 → 사용자 확인 → lesson-author로 각 강의 순차 작성 → lesson-quality-guard 검증 → 통과 시 다음 강의. 사용자가 "B-1 강의 만들어" 같이 트랙-레벨 식별자를 주면 트리거.
---

# lesson-series-writer

PokéClip 학습 트랙(A~Q)의 시리즈를 처음부터 끝까지 생성하는 오케스트레이션 스킬. **작성 → 검증 → 보완 루프**로 품질 보장.

## 트리거

- "B-1 강의 만들어"
- "A 트랙 시작"
- "AWS 기초 강의 시리즈"
- "<주제> 강의 만들어줘"

## 전체 흐름 (4단계)

### 단계 1: 시리즈 주제 파악 + 계획

1. 사용자에게 시리즈 식별자(예 "B-1") 또는 주제 확인
2. **`lesson-planner` 에이전트 호출** (Agent 도구, `subagent_type: lesson-planner`)
   - prompt: 시리즈 식별자 + 주제 + (있다면 사용자 제시 항목)
3. lesson-planner가 다음 cat:
   - `_workspace/pokeclip_context.md`
   - `_workspace/curriculum_master.md`
   - `_workspace/curriculum_progress.json`
4. lesson-planner가 `_workspace/lessons/<TRACK>/PLAN_<TRACK>-L.md` 저장 + 보고
5. 사용자에게 계획 보고 — **확인 받음**

### 단계 2: 사용자 검토

사용자가 계획을 보고:
- 강의 추가/제거/순서 변경 요청 가능
- "좋아 진행" 응답이면 다음 단계
- 조정 요청이면 lesson-planner 재호출

### 단계 3: 각 강의 순차 작성 + 검증 루프

확정된 계획의 각 강의를 **순차 작성**:

```
for K in 1..N:
  1. lesson-author 호출 (subagent_type: lesson-author)
     prompt: 강의 식별자 (<TRACK>-L-K) + 제목 + 핵심 항목 + 선행 강의
     - 컨텍스트 cat (pokeclip_context.md, 선행 강의 등) 의무
     - 본문 작성
     - _workspace/lessons/<TRACK>/<TRACK>-L-K.md 저장
  
  2. lesson-quality-guard 호출 (subagent_type: lesson-quality-guard)
     prompt: "_workspace/lessons/<TRACK>/<TRACK>-L-K.md 검증해줘"
     - 체크리스트 20항목 자동 검증
     - 판정: PASS / NEEDS_REVISION / FAIL
  
  3. 판정 처리:
     - PASS → 진도 파일 갱신 → 다음 강의 (K+1)
     - NEEDS_REVISION → lesson-author 재호출 (보완 지시 전달) → 재검증
       - 최대 2회 재시도
     - FAIL → 사용자에게 보고 + 사람 결정 대기
  
  4. PASS 확정 시 _workspace/curriculum_progress.json 갱신
```

### 단계 4: 전체 보고

```
[시리즈 <TRACK>-L 작성 완료]

트랙: <TRACK 이름>
저장된 파일:
- _workspace/lessons/<TRACK>/PLAN_<TRACK>-L.md
- _workspace/lessons/<TRACK>/<TRACK>-L-1.md (XXX줄, 검증 NN/100)
- _workspace/lessons/<TRACK>/<TRACK>-L-2.md (XXX줄, 검증 NN/100)
- ...

총 강의: N개
총 줄 수: XXXX
재시도 발생 강의: M개

진도 갱신:
- curriculum_progress.json 의 <TRACK>-L 상태: completed

다음 단계:
- 사용자가 강의 내용 검토 + 학습
- 학습 완료 시 블로그 글 작성 요청 시 visual-planner 스킬로 진행
```

## 검증 루프 정책 (확정)

| 항목 | 값 |
|---|---|
| 통과 기준 | lesson-quality-guard 90/100 이상 |
| NEEDS_REVISION 처리 | lesson-author에게 보완 지시 + 재작성 |
| 최대 재시도 | 2회 |
| 3차도 실패 | 사용자 호출, 사람 결정 |
| FAIL 처리 | 즉시 사용자 호출 (재작성 안 함) |

## 트랙별 폴더 구조

```
_workspace/
├── pokeclip_context.md          # PokéClip 단일 진실 원천
├── curriculum_master.md          # 마스터 커리큘럼
├── curriculum_progress.json      # 진도 추적
├── streaming_lessons/            # 영상 트랙 (4-1~4-5에서 봉인)
│   ├── 4-1-1.md ~ 4-5-4.md
│   └── ...
└── lessons/                      # 새 트랙들
    ├── A_tools/                  # A: 개발 도구 기초
    │   ├── PLAN_A-1.md
    │   ├── A-1-1.md
    │   └── ...
    ├── B_python/                 # B: Python 입문~심화
    ├── C_ai_intro/               # C: AI/ML 입문
    ├── D_ai_advanced/            # D: AI 깊이
    ├── E_backend/                # E: 백엔드 아키텍처
    ├── F_database/               # F: 데이터베이스
    ├── G_aws/                    # G: AWS 인프라
    ├── H_devops/                 # H: DevOps
    ├── I_algorithm/              # I: 점수/신호 알고리즘
    ├── J_system_design/          # J: 시스템 디자인
    ├── K_distributed/            # K: 분산 시스템
    ├── L_security/               # L: 보안/인증
    ├── M_pokeclip/               # M: PokéClip 종합 (코드 구현)
    ├── N_os/                     # N: 운영체제
    ├── O_network/                # O: 네트워크 깊이
    ├── P_arch/                   # P: 컴퓨터 구조
    └── Q_dsa/                    # Q: 자료구조/알고리즘 (면접용)
```

## 사용자 메모리 정합

- `feedback_streaming_lesson_style` — 실무 위주, Q/D 트랙만 수학 OK
- `feedback_lesson_output` — 강의 파일은 cat만 (Read 금지)
- `feedback_article_style` — 구체적 수치 필수
- `feedback_internal_terms` — "레벨 N" 본문 노출 금지 (헤더만 OK)
- `feedback_english_terms` — 어색한 음차 금지
- `feedback_markdown_range` — 숫자~숫자 OK
- `feedback_lesson_count` — 강의 수 패턴화 금지
- `feedback_no_image_pattern` — 시각화 패턴화 금지

## 협업

이 스킬은 **새 강의 시리즈 작성** 전담.

이후 흐름:
- 사용자가 강의 검토 + 학습
- 학습 완료 후 "<TRACK>-L 블로그 글 만들어줘" → `visual-planner` 스킬 (이미지/ECharts/Mermaid/표 결정)
- 이미지 다운로드 후 블로그 글 작성

## 단계별 실패 처리

| 실패 | 처리 |
|---|---|
| lesson-planner 결과가 너무 얕음 | 사용자에게 보고, 재호출 또는 항목 보강 |
| lesson-author가 정형 스타일 어김 | lesson-quality-guard가 잡음 → 보완 재작성 |
| lesson-quality-guard 3차 실패 | 사용자 호출, 사람 결정 |
| 선행 강의 누락 | 진도 파일 확인 → 선행 시리즈 먼저 작성 권장 |
| 강의 파일 저장 실패 | 디렉토리 권한 확인, 사용자 호출 |

## 관련 에이전트/스킬

- `lesson-planner` 에이전트 — 시리즈 구성 계획만
- `lesson-author` 에이전트 — 강의 1개 작성만
- `lesson-quality-guard` 에이전트 — 작성된 강의 검증
- `streaming-tutor` 스킬 — 실시간 학습 진행 (다른 용도, 가르치는 흐름)
- `visual-planner` 스킬 — 강의 → 블로그 시각화 설계 (다음 단계)
