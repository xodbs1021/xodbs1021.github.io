# PokéClip 마스터 커리큘럼

이 문서는 **lesson-planner / lesson-author / lesson-quality-guard**가 매번 cat으로 읽는 단일 진실 원천. PokéClip 구현 + 치지직 백엔드/AI 입사 수준까지 끌어올리는 17개 트랙 + 영상 트랙(봉인된 5개 시리즈).

**연결 컨텍스트**: `_workspace/pokeclip_context.md` (기술 사양 + 학습자 진단 + Q&A 보존)

---

## 0. 학습 목표

**치지직 백엔드 + AI 두 트랙 동시 입사 대비.** PokéClip MVP를 6개월 안에 직접 구현하면서 포트폴리오 + 면접 수준 도달.

학습자 진단 (요약): **백지에서 시작.** 인공지능 전공이지만 실전 0. Python/Linux/Git CLI/AWS/Docker 모두 모름. 프론트엔드는 강의 제외 (AI 위임). 9to9 풀타임 학습 가능. 강의 수 무제한.

---

## 1. 영상 트랙 (봉인) — 완료

| 시리즈 | 주제 | 강의 수 | 상태 |
|---|---|---|---|
| 4-1 | FFmpeg 깊이 | 3 | ✅ 완료 |
| 4-2 | ABR Ladder 설계 | 4 | ✅ 완료 |
| 4-3 | NVENC와 GPU 트랜스코딩 | 4 | ✅ 완료 |
| 4-4 | CMAF 완전 정복 | 4 | ✅ 완료 |
| 4-5 | 라이브 트랜스코딩 인프라 종합 | 4 | ✅ 완료 |

위에 추가 영상 시리즈 안 만듦. PokéClip SRT 수신 서버 같은 영상 코드 구현은 **M 트랙(PokéClip 종합)**에서 다룸.

---

## 2. 17개 트랙 윤곽

### A. 개발 도구 기초
- A-1: 터미널 + zsh 입문
- A-2: Linux 명령어 일상
- A-3: Bash 셸 스크립팅
- A-4: Git CLI 깊이 (브랜치/머지/리베이스)
- A-5: GitHub 협업 (PR/리뷰/이슈)
- A-6: VSCode / Cursor / 에디터 환경 셋업

### B. Python 입문~심화
- B-1: Python 입문 (문법/자료형/제어문)
- B-2: 함수/모듈/패키지/가상환경
- B-3: 표준 라이브러리 깊이 (os/sys/json/datetime/pathlib)
- B-4: 객체지향 + 매직 메서드
- B-5: 에러 처리 + 디버깅
- B-6: 파일 처리 + 정규식
- B-7: 동시성 (threading / multiprocessing)
- B-8: asyncio + 이벤트 루프
- B-9: 타입 힌트 + pydantic
- B-10: pytest 테스팅
- B-11: 패키지 배포 (pip / poetry)

### C. AI/ML 입문
- C-1: AI/ML 큰 그림 (지도/비지도/강화학습)
- C-2: NumPy + 텐서 기초
- C-3: PyTorch 입문 (Tensor / autograd)
- C-4: 신경망 기초 (MLP / CNN / RNN)
- C-5: 학습 루프 + 최적화 (loss / optimizer / scheduler)
- C-6: 데이터 로더 + 전처리
- C-7: 평가 지표 (accuracy / precision / recall / F1 / mAP)
- C-8: 사전학습 모델 활용 (transformers / timm)
- C-9: Hugging Face 생태계
- C-10: LLM API 활용 (OpenAI / Anthropic / Gemini)

### D. AI 깊이 (PokéClip 핵심)
- D-1: Computer Vision 깊이 (객체 검출/세그멘테이션)
- D-2: YOLO 아키텍처 + 학습 (v8/v10)
- D-3: 데이터 라벨링 (Roboflow / CVAT)
- D-4: 도메인 특화 YOLO 파인튜닝 (LoL 킬피드/HUD/오브젝트)
- D-5: 모델 평가 + 디버깅
- D-6: Whisper STT 활용 + 파인튜닝
- D-7: 음성 효과음 패턴 매칭 (cross-correlation / DTW)
- D-8: LLM 프롬프트 엔지니어링
- D-9: 멀티모달 LLM (Qwen-VL / GPT-4V)
- D-10: 모델 경량화 (양자화/distillation)
- D-11: GPU 활용 (CUDA / MPS / 클라우드 GPU)
- D-12: MLOps 입문 (모델 버전 관리 / 서빙)
- D-13: 추론 최적화 (TensorRT / ONNX)
- D-14: 자체 분석 함수 설계 (점수 통합 알고리즘)

### E. 백엔드 아키텍처
- E-1: HTTP 기초 (메서드/상태/헤더)
- E-2: REST API 설계
- E-3: WebSocket 깊이
- E-4: FastAPI 입문
- E-5: 의존성 주입 + 미들웨어
- E-6: 비동기 백엔드 (asyncio + FastAPI)
- E-7: 메시지 큐 입문 (Redis Pub/Sub)
- E-8: Redis Streams 깊이
- E-9: Apache Kafka 입문
- E-10: 마이크로서비스 vs 모놀리스
- E-11: 분석 파이프라인 설계 (PokéClip 9단계)
- E-12: 백프레셔 + 큐 깊이 관리

### F. 데이터베이스
- F-1: 관계형 DB 기초 (정규화/관계)
- F-2: SQL 깊이 (JOIN/서브쿼리/윈도우)
- F-3: 인덱스 + 쿼리 최적화
- F-4: 트랜잭션 + 격리 수준
- F-5: SQLAlchemy ORM
- F-6: NoSQL 입문 (DynamoDB / MongoDB)
- F-7: DynamoDB 키 설계
- F-8: 시계열 DB (TimescaleDB / InfluxDB)
- F-9: 캐싱 + Redis 활용
- F-10: 데이터 모델링 (PokéClip 점수 시계열)

### G. AWS 인프라
- G-1: AWS 콘솔/CLI/IAM 기초
- G-2: EC2 입문 (인스턴스 띄우기)
- G-3: EC2 GPU 인스턴스 (g4dn / g5)
- G-4: S3 + 라이프사이클
- G-5: Lambda 기초
- G-6: Lambda + DynamoDB 통합
- G-7: API Gateway + Lambda
- G-8: VPC 기초 (서브넷/보안 그룹)
- G-9: VPC 깊이 (NAT/라우팅/피어링)
- G-10: CloudWatch 모니터링
- G-11: Auto-scaling (EC2 + Lambda)
- G-12: 비용 최적화 (Reserved / Spot)

### H. DevOps
- H-1: Docker 개념 + 첫 컨테이너
- H-2: Dockerfile 작성
- H-3: Docker Compose
- H-4: 컨테이너 레지스트리 (ECR)
- H-5: GitHub Actions CI/CD
- H-6: AWS ECS / EKS 입문
- H-7: Prometheus + Grafana 모니터링
- H-8: ELK 로깅 (또는 Loki)
- H-9: 알람 (PagerDuty / Slack)
- H-10: Terraform 입문 (IaC)
- H-11: 무중단 배포 (Blue-Green / Canary)

### I. 점수/신호 알고리즘 (PokéClip 핵심)
- I-1: 신호 처리 기초 (이산/연속/샘플링)
- I-2: 슬라이딩 윈도우 + 통계
- I-3: 이동 평균 + 스무딩
- I-4: Peak Detection (scipy.signal)
- I-5: 임계값 결정 + 정규화 (방법 B 상대값)
- I-6: 가중치 설계 + 신호 융합
- I-7: 자체 점수 통합 함수 설계 (E Hybrid)
- I-8: 클립 경계 추출 알고리즘
- I-9: 이상 탐지 입문
- I-10: A/B 테스트 + 통계적 유의성

### J. 시스템 디자인
- J-1: 시스템 디자인 기초 (요구사항 → 컴포넌트)
- J-2: URL Shortener 설계
- J-3: 채팅 서비스 설계
- J-4: 라이브 스트리밍 플랫폼 (Twitch 클론) 설계
- J-5: 추천 시스템 설계
- J-6: PokéClip 자체 설계 (자기 프로젝트 면접 대비)
- J-7: 면접 답변 패턴 (Capacity Estimation / 트레이드오프 설명)

### K. 분산 시스템
- K-1: 분산 시스템 기초 (CAP / FLP)
- K-2: 일관성 모델
- K-3: 합의 알고리즘 (Raft 입문)
- K-4: 이벤트 소싱 + CQRS
- K-5: 분산 트랜잭션 (Saga 패턴)
- K-6: 실시간 처리 (Kafka Streams / Flink 입문)

### L. 보안/인증
- L-1: HTTPS + TLS 기초
- L-2: 세션 vs JWT
- L-3: OAuth 2.0 + OIDC
- L-4: 토큰 관리 (Refresh / Rotation)
- L-5: PokéClip stream key 발급/검증
- L-6: API 보안 (Rate Limit / CORS / CSRF)
- L-7: 비밀 관리 (AWS Secrets Manager / 환경 변수)

### M. PokéClip 종합 (코드 구현)
- M-1: 프로젝트 구조 + 모노레포 설계
- M-2: SRT 수신 서버 구현 (Python)
- M-3: FFmpeg Python 바인딩 (ffmpeg-python)
- M-4: 멀티 오디오 트랙 디멀티플렉싱
- M-5: 트랙 라우터 구현
- M-6: YOLO 분석 엔진 (LoL 도메인)
- M-7: Whisper STT 통합
- M-8: 효과음 패턴 매칭 구현
- M-9: 치지직 채팅 수집 (WebSocket / API)
- M-10: 채팅 점수 4신호 구현
- M-11: 점수 통합 + E Hybrid
- M-12: 클립 경계 추출
- M-13: DynamoDB 저장 + S3 영상 보관
- M-14: EDL/XML 내보내기
- M-15: 웹 대시보드 (React + FastAPI 통합)
- M-16: 인증 (스트림 키 발급 / 세션)
- M-17: 모니터링 + 알람
- M-18: 배포 (EC2 + Auto-scaling)
- M-19: 베타 운영 + 피드백 루프

### N. 운영체제
- N-1: 프로세스 + 스레드
- N-2: 메모리 관리 (가상 메모리 / 페이지)
- N-3: 스케줄링
- N-4: 동기화 + 락
- N-5: 파일 시스템
- N-6: I/O + epoll/kqueue (백엔드 깊이)

### O. 네트워크 깊이
- O-1: OSI 7계층 다시 보기
- O-2: TCP 깊이 (3-way / 4-way / Congestion Control)
- O-3: UDP + QUIC
- O-4: HTTP/1.1 → HTTP/2 → HTTP/3
- O-5: WebSocket 프로토콜
- O-6: DNS + CDN (영상 트랙 보강)
- O-7: 로드 밸런서 + 프록시
- O-8: 네트워크 보안 기초

### P. 컴퓨터 구조
- P-1: CPU 구조 (파이프라인 / 캐시)
- P-2: 메모리 계층 (L1/L2/L3/RAM)
- P-3: GPU 구조 + CUDA (D 트랙 보강)
- P-4: 디스크 + SSD
- P-5: NUMA + 멀티코어

### Q. 자료구조/알고리즘 (면접용 깊이, 코테는 별도)
- Q-1: 배열 + 링크드 리스트
- Q-2: 스택 + 큐 + 덱
- Q-3: 해시 테이블 깊이
- Q-4: 트리 (이진트리 / BST / AVL / B-tree)
- Q-5: 힙 + 우선순위 큐
- Q-6: 그래프 + 탐색 (BFS / DFS)
- Q-7: 정렬 알고리즘
- Q-8: 동적 계획법
- Q-9: 그리디 + 분할정복
- Q-10: 알고리즘 복잡도 분석

---

## 3. 트랙 의존 그래프

```
A (도구) ──────┬─→ 모든 트랙 (기본기)
               │
B (Python) ────┼─→ C, D, E, F, I, M
               │
C (AI 입문) ──┴─→ D (AI 깊이) ──→ M (PokéClip)
                                  │
F (DB) ────→ E (백엔드) ─────────┤
G (AWS) ────────────────────────┤
H (DevOps) ──────────────────────┘
I (알고리즘) ─→ M
L (보안) ─→ M

N (OS) + O (네트워크) ─→ K (분산 시스템) + J (시스템 디자인)
P (컴퓨터 구조) ─→ D (AI), H (DevOps) 보강
Q (DSA) — 독립 트랙 (면접 준비)
```

**핵심 관문**: A → B → (C/F/G 병행) → D + E + M

---

## 4. 1주차 시작 트랙 (PokéClip 1개월차 마일스톤 동기화)

| 트랙-레벨 | 주제 | PokéClip 활용 |
|---|---|---|
| **A-1** | 터미널 + zsh 입문 | 모든 작업의 출발 |
| **A-4** | Git CLI 깊이 | PokéClip GitHub Public 저장소 셋업 |
| **B-1** | Python 입문 | SRT 수신 서버 코드 작성 준비 |
| **G-1** | AWS 콘솔/CLI/IAM | EC2 직접 띄우기 준비 |
| **G-2** | EC2 입문 | SRT 수신 서버 호스팅 |
| **M-1** | 프로젝트 구조 + 모노레포 | PokéClip 코드베이스 시작 |
| **M-2** | SRT 수신 서버 구현 (Python) | 1개월차 핵심 액션 |

이 7개 시리즈가 1주차에 부분 병렬로 진행.

---

## 5. 진행 정책

| 항목 | 정책 |
|---|---|
| 강의 수 | **무제한** (트랙별 강의 수 패턴화 절대 금지 — `feedback_lesson_count`) |
| 트랙 진행 | **부분 병렬** — 의존 끝난 트랙은 동시 진행 가능 |
| 강의 식별자 | `<TRACK>-L-K.md` (예: `B-1-3.md`) |
| 저장 위치 | `_workspace/lessons/<TRACK>_<이름>/<TRACK>-L-K.md` |
| 강의 작성 단위 | 시리즈 통째 (사용자 "B-1 만들어" 시 N강 전체 작성) |
| 검증 | lesson-quality-guard 90/100 이상 의무. 실패 시 2회 재시도 |
| 진도 추적 | `_workspace/curriculum_progress.json` 자동 갱신 + 사용자 보고 |
| 블로그 매핑 | **트랙 안 레벨 1개 = 블로그 1개** (강의 5~10강 = 블로그 1편) |

---

## 6. 학습 동기화 (PokéClip 6개월 일정)

| 개월 | 마일스톤 | 우선 트랙 |
|---|---|---|
| 1 | 편집자 인터뷰 / SRT 수신 서버 프로토타입 / OBS 가이드 | A / B / G / M-1~M-3 |
| 2 | SRT 디멀티플렉싱 + 멀티 오디오 + 채팅 분석 엔진 | M-4~M-10 / E / F |
| 3 | YOLO 도메인 학습 + Whisper+LLM + 점수 산정 | D / I / M-11 |
| 4 | MVP 완성 (대시보드 + 2트랙 UI + EDL) | M-12~M-17 / L |
| 5 | 베타 배포 + 피드백 + 튜닝 | M-18~M-19 / H |
| 6 | 고도화 + 소마 심사 제출 | J / K / Q (면접 준비) |

위 동기화는 가이드. 사용자 진도에 따라 유연하게.

---

## 7. 블로그 매핑

각 트랙 레벨 1개 완료 시 블로그 글 1편:

```
A-1 (터미널 입문 N강) 완료 → 블로그 "터미널 입문 정리" 1편
B-1 (Python 입문 N강) 완료 → 블로그 "Python 입문 정리" 1편
...
```

블로그 작성 흐름:
1. 강의 시리즈 학습 완료
2. 사용자가 "B-1 블로그 만들어" 요청
3. `visual-planner` 스킬 발동 (이미지/ECharts/Mermaid/표 결정)
4. 사용자 이미지 다운로드
5. 블로그 글 작성 + 빌드 + git push

---

## 8. 휘발 방지 메커니즘

이 문서가 단일 진실 원천. 매번 cat:

- `lesson-planner` → `pokeclip_context.md` + `curriculum_master.md` + `curriculum_progress.json`
- `lesson-author` → 동일 3개 + 선행 강의
- `lesson-quality-guard` → `pokeclip_context.md` + 작성된 강의

새 결정/제약 추가 시 두 파일에 누적 기록.
