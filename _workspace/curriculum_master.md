# PokéClip 마스터 커리큘럼

이 문서는 **lesson-planner / lesson-author / lesson-quality-guard / curriculum-quality-guard**가 매번 cat으로 읽는 단일 진실 원천. PokéClip 구현 + 치지직 백엔드/AI 입사 수준까지.

**연결 컨텍스트**: `_workspace/pokeclip_context.md`

---

## 0. 학습 목표

**치지직 백엔드 + AI 두 트랙 동시 입사 대비.** 강의로 기술/지식을 쌓고, 그 기술을 PokéClip 직접 구현에 적용해 포트폴리오 완성.

**중요 — 강의 범위 정의**:
- ✅ **기술/지식 영역만**: 언어/프레임워크/아키텍처 패턴/AI 모델/AWS 서비스/CS 기초
- ❌ **프로젝트 실행 영역 제외**: PokéClip 코드 작성/OBS 설정/프로젝트 구조 결정/배포 운영 등은 사용자가 PokéClip 만들면서 적용
- 강의 본문은 "이 기술이 PokéClip 어느 단계에 쓰인다" 인용까지만

학습자 진단: **백지에서 시작.** AI 전공이지만 실전 0. Python/Linux/Git CLI/AWS/Docker 모두 모름. 프론트 강의 제외. 9to9 풀타임. 강의 수 무제한.

---

## 1. 영상 트랙 (봉인) — 완료

| 시리즈 | 주제 | 강의 수 |
|---|---|---|
| 4-1 | FFmpeg 깊이 | 3 |
| 4-2 | ABR Ladder 설계 | 4 |
| 4-3 | NVENC와 GPU 트랜스코딩 | 4 |
| 4-4 | CMAF 완전 정복 | 4 |
| 4-5 | 라이브 트랜스코딩 인프라 종합 | 4 |

---

## 2. 16개 트랙 인덱스 (AI 시대 재설계)

**AI 시대 학습 원칙**: 사람은 **아키텍처/판단/검증**을 하고, AI는 **코딩/syntax**를 한다. 도구 사용법 / syntax / 보일러플레이트는 슬림화, 시스템 디자인 / 트레이드오프 / 모델 평가는 강화.

각 트랙의 시리즈 상세는 **`_workspace/curriculum_tracks/<TRACK>.md`** 파일에 있다. 강의 작성/검증 시 자기 트랙 파일만 cat (전체 마스터 cat 안 함 — 토큰 절감).

| 트랙 | 이름 | 시리즈 수 | 우선순위 | 상세 파일 |
|---|---|---|---|---|
| A | 개발 도구 기초 | 2 | 약함 (AI 도구 사용) | `curriculum_tracks/A.md` |
| B | Python | 8 | 중간 (syntax는 AI, 개념은 사람) | `curriculum_tracks/B.md` |
| C | AI 입문 | 8 | 높음 | `curriculum_tracks/C.md` |
| D | AI 깊이 | 22 | **매우 높음** (사람 판단 영역) | `curriculum_tracks/D.md` |
| E | 백엔드 아키텍처 | 10 | 높음 | `curriculum_tracks/E.md` |
| F | 데이터베이스 | 12 | 높음 | `curriculum_tracks/F.md` |
| G | AWS 인프라 | 13 | 중간 | `curriculum_tracks/G.md` |
| H | DevOps | 9 | 중간 | `curriculum_tracks/H.md` |
| I | 점수/신호 알고리즘 | 8 | **매우 높음** (자체 함수 설계) | `curriculum_tracks/I.md` |
| **J** | **시스템 디자인** | **12** | **매우 높음 ↑↑ (아키텍처 시대 핵심)** | `curriculum_tracks/J.md` |
| K | 분산 시스템 | 7 | 높음 | `curriculum_tracks/K.md` |
| L | 보안/인증 | 6 | 높음 | `curriculum_tracks/L.md` |
| N | 운영체제 | 6 | 중간 (면접 기반) | `curriculum_tracks/N.md` |
| O | 네트워크 깊이 | 7 | 중간 (면접 기반) | `curriculum_tracks/O.md` |
| P | 컴퓨터 구조 | 2 | 낮음 (보조) | `curriculum_tracks/P.md` |
| Q | 자료구조/알고리즘 (면접용) | 5 | 중간 (코테는 별도) | `curriculum_tracks/Q.md` |

총 16 트랙 / **137 시리즈** (이전 155에서 18 슬림).

각 트랙 파일 구조 (정형):
- 트랙 헤더: 이름 + 갯수 + 갯수 근거 (패턴화 자기 점검)
- 각 시리즈: hook / 핵심 항목 5+개 / 다루지 않는 것 / PokéClip 적용 / 면접 답변 주제

## 3. 트랙별 시리즈 분포 자기 점검 (AI 시대 재설계)

| 트랙 | 갯수 | 본질 점검 |
|---|---|---|
| A | 2 | 도구 사용은 AI에 위임. Git+터미널 핵심만 ✓ |
| B | 8 | Python syntax는 AI, 개념(비동기/타입/테스트)은 사람 ✓ |
| C | 8 | AI 입문 흐름 (이론) ✓ |
| D | 22 | PokéClip + 치지직 AI 입사 핵심. 모델 선택/평가/MLOps 사람 판단 ✓ |
| E | 10 | 라우터 syntax 빼고 아키텍처/큐/파이프라인 ✓ |
| F | 12 | 모델링/트랜잭션/인덱스는 사람 판단 ✓ |
| G | 13 | 서비스 선택/비용 설계 사람. 콘솔 클릭 AI ✓ |
| H | 9 | Dockerfile은 AI, 배포 전략/모니터링은 사람 ✓ |
| I | 8 | 자체 점수 함수 설계 사람 몫 ✓ |
| **J** | **12** | **아키텍처 시대 핵심 강화 (+5)** ✓ |
| K | 7 | 분산 트레이드오프 케이스집 신규 ✓ |
| L | 6 | 보안 정책 사람 결정 ✓ |
| N | 6 | OS 면접 기반 ✓ |
| O | 7 | DNS/CDN/LB 통합 ✓ |
| P | 2 | 면접 비중 낮음, CPU+메모리/GPU+디스크 2개로 ✓ |
| Q | 5 | 자료구조 통합, 코테는 사용자 직접 ✓ |

분포 2~22. 갯수 근거 모두 본문에 명시.

총 137 시리즈.

---

## 4. 트랙 의존 그래프

```
A (도구) ──────┬─→ 모든 트랙의 기본
               │
B (Python) ────┼─→ C, D, E, F, I, Q
               │
C (AI 입문) ──┴─→ D (AI 깊이)

F (DB) ────────┐
G (AWS) ───────┼─→ E (백엔드) + H (DevOps)
A (도구) ──────┘

E + F + G + H ─→ J (시스템 디자인)
N (OS) + O (네트워크) ─→ K (분산 시스템)

P (컴퓨터 구조) — D + H 보강 (직접 의존 X)
L (보안) — E 선행 권장
Q (DSA) — B 선행, 독립 진행 가능
```

**핵심 관문**: A → B → (C/F/G 병행) → D + E

**병렬 진행 가능 쌍**:
- A 안에서 일부 병렬
- B와 G (G는 A만 의존)
- C와 F (둘 다 B만 의존)
- D와 E (D는 C, E는 B+F+G — 의존 끝나면 병렬)
- N / O / P / Q — 의존 적어 전 기간 자유 배치

**의존 깊이**:
- J: A → B → F+G → E+H → J = 5단계
- K: A → N+O → K = 3단계
- D: A → B → C → D = 4단계

---

## 5. 1주차 시작 트랙 (학습 출발점)

| 트랙-레벨 | 주제 | PokéClip 적용 영역 |
|---|---|---|
| **A-1** | 터미널 + zsh 입문 | 모든 도구 기반 |
| **A-4** | Git CLI 깊이 | 코드 버전 관리 |
| **B-1** | Python 입문 | PokéClip 백엔드/분석 |
| **G-1** | AWS 콘솔/CLI/IAM | AWS 기반 |

---

## 6. 진행 정책

| 항목 | 정책 |
|---|---|
| 강의 수 | **무제한** (`feedback_lesson_count`) |
| 시리즈 수 | **무제한** (이 마스터의 트랙별 갯수도 본질 판단) |
| 트랙 진행 | **부분 병렬** |
| 강의 식별자 | `<TRACK>-L-K.md` |
| 저장 위치 | `_workspace/lessons/<TRACK>_<이름>/<TRACK>-L-K.md` |
| 강의 작성 단위 | 시리즈 통째 |
| 검증 | curriculum-quality-guard 모드 1 (계획) + lesson-quality-guard (본문) |
| 진도 추적 | `_workspace/curriculum_progress.json` |
| 블로그 매핑 | **트랙 안 레벨 1개 = 블로그 1개** |

---

## 7. 트랙 학습 우선순위 (PokéClip 적용 시점 매핑)

PokéClip 일정은 사용자가 직접 관리. 강의 트랙은 PokéClip 어느 영역 구현 전에 학습이 도움 되는지만 매핑.

| PokéClip 영역 | 학습이 필요한 트랙 |
|---|---|
| 기본 개발 환경 / Git 운영 | A |
| Python 백엔드 코드 | B |
| SRT 수신 서버 / 분석 서버 | B + E + G |
| 영상 분석 (YOLO LoL) | C + D-1~D-7 |
| 음성 분석 (Whisper / 효과음) | C + D-8~D-11 |
| 채팅 분석 + WebSocket | E-3 + G-7 |
| 점수 통합 + 클립 추출 | I 트랙 전반 |
| 데이터 저장 (DynamoDB / S3) | F-9/F-10 + G-5/G-6 |
| EDL/XML 내보내기 | B + 약간 도메인 |
| 인증 시스템 | L |
| 배포 + 운영 | G-15/G-16 + H |
| 면접 답변 (PokéClip 자체) | J-6 + 종합 |
| 면접 답변 (백엔드) | J / K / N / O / Q |

---

## 8. 강의 본문에서 PokéClip 인용 방식

각 강의 본문은 **"이 기술이 PokéClip 어디에 쓰이는지" 인용**까지만. 실제 PokéClip 코드/프로젝트 결정/OBS 설정은 강의 범위 밖.

예시:
- ✅ "FastAPI 의존성 주입은 PokéClip 분석 파이프라인 트랙 라우터 구현 시 쓰인다"
- ❌ "PokéClip의 SRT 수신 서버 코드는..."

강의는 도구를 가르치고, 프로젝트는 도구를 쓰는 곳.

---

## 9. 블로그 매핑

```
A-1 → 블로그 "터미널 입문 정리" 1편
B-1 → 블로그 "Python 입문 정리" 1편
...
```

작성 흐름:
1. 강의 시리즈 학습 완료
2. 사용자 "B-1 블로그 만들어"
3. `visual-planner` 스킬
4. 사용자 이미지 다운로드
5. 블로그 글 작성 + 빌드 + git push

---

## 10. 휘발 방지

매번 cat (토큰 절감 — 트랙 분할 적용):
- `lesson-planner` → `pokeclip_context.md` + `curriculum_master.md` (인덱스만, lean) + `curriculum_tracks/<자기 TRACK>.md` + `curriculum_progress.json`
- `lesson-author` → 동일 + 선행 강의
- `lesson-quality-guard` → `pokeclip_context.md` + `curriculum_tracks/<자기 TRACK>.md` + 작성된 강의
- `curriculum-quality-guard` (모드 1 PLAN 검증) → `pokeclip_context.md` + `curriculum_master.md` + `curriculum_tracks/<자기 TRACK>.md` + 입력 PLAN
- `curriculum-quality-guard` (모드 2 마스터 검증) → `pokeclip_context.md` + `curriculum_master.md` + `curriculum_tracks/*.md` 전체 (필요 시)

**중요**: 자기 트랙 외 다른 트랙 파일 cat 금지 (토큰 낭비). 의존 그래프 확인용으론 마스터 인덱스(`curriculum_master.md`) 충분.

새 결정/제약 추가 시 누적 기록.
