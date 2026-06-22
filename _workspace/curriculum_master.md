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

## 2. 16개 트랙 + 시리즈 상세

각 트랙 헤더에 **이 갯수의 근거** 명시. 자기 점검 자동화.

각 시리즈마다: **hook** / **핵심 다룰 항목 5+개** / **다루지 않는 것** / **PokéClip 적용** / **면접 답변 주제**.

---

### A. 개발 도구 기초 (5 시리즈)

**갯수 근거**: 백지 학습자가 일상 도구 익히는 영역. 깊이 가지 않고 매일 쓰는 도구 5개 (터미널/Linux/Bash/Git/GitHub+에디터). 더 늘리면 도구학으로 흐름 → 5에서 멈춤.

#### A-1: 터미널 + zsh 입문
- hook: 모든 백엔드/AI/AWS 작업의 시작점
- 핵심 항목: 터미널 vs GUI / 셸 (bash/zsh) / 프롬프트 / 명령어-인자-옵션 / 환경 변수 / PATH / 탭 자동완성 / 히스토리 / Oh My Zsh / iTerm2
- 다루지 않는 것: 파일 시스템 명령 (A-2) / 셸 스크립팅 (A-3) / 프로세스 관리 (N 트랙)
- PokéClip 적용: 모든 코드/AWS/Docker 실행의 기반
- 면접 답변 주제: "왜 CLI 쓰시나요"

#### A-2: Linux 명령어 일상
- hook: 백엔드 서버는 Linux. GUI 없음
- 핵심 항목: 파일 (ls/cd/mkdir/rm/cp/mv) / 내용 (cat/less/head/tail/grep) / 권한 (chmod/chown/sudo) / 프로세스 (ps/top/kill/htop) / 네트워크 (ping/curl/wget/ss) / 검색 (find) / 압축 (tar/gzip) / 텍스트 (sed/awk/sort/uniq/wc) / 디스크 (df/du)
- 다루지 않는 것: 셸 스크립팅 (A-3) / 시스템 관리 깊이 (N 트랙)
- PokéClip 적용: EC2 디버깅 / 로그 확인
- 면접 답변 주제: "서버 로그 분석"

#### A-3: Bash 셸 스크립팅
- hook: 반복 작업 자동화. 배포/cron의 일상
- 핵심 항목: 변수와 따옴표 / 조건문 / 반복문 / 함수 / 인자 처리 / 종료 코드 / set -e / trap / 파이프와 리다이렉트 / 명령 치환 / 정규 표현식 / cron 표현식
- 다루지 않는 것: Python (B 트랙) / Makefile / 컨테이너 자동화 (H 트랙)
- PokéClip 적용: EC2 셋업 자동화 / 배포 스크립트
- 면접 답변 주제: "운영 자동화"

#### A-4: Git CLI 깊이
- hook: GUI는 한계. 실무 PR/충돌/rebase는 CLI
- 핵심 항목: Git 내부 모델 (commit/tree/blob/ref) / branch / merge vs rebase / stash / reset (soft/mixed/hard) / revert / cherry-pick / log/blame/bisect / .gitignore / hooks
- 다루지 않는 것: GitHub Actions (H-5) / 리뷰 워크플로우 (A-5)
- PokéClip 적용: 코드 버전 관리
- 면접 답변 주제: "merge vs rebase"

#### A-5: GitHub 협업 + 에디터 환경
- hook: 회사 개발 70%는 PR 리뷰 + 에디터 잘 쓰기
- 핵심 항목: Fork와 PR 흐름 / 이슈 템플릿 / 리뷰 (approve/request changes) / Projects / SSH 키 / Public vs Private / VSCode vs Cursor / 확장 (Python/Git/Docker) / 단축키 (멀티 커서/리팩토링) / LSP / 통합 터미널
- 다루지 않는 것: CI/CD (H-5)
- PokéClip 적용: PokéClip Public 저장소 = 포트폴리오 / 메인 에디터
- 면접 답변 주제: "코드 리뷰 / 디버깅"

---

### B. Python (15 시리즈)

**갯수 근거**: PokéClip 백엔드/분석 코드의 메인 언어. 학습자 백지 → asyncio + FastAPI + 테스팅까지. Python의 표면적이 매우 광범 (언어 기초 + 자료구조 + OOP + 동시성 + asyncio + 타입 + 테스팅) → 11개로는 부족. 각 영역에 1~2 시리즈씩 자연 배치.

#### B-1: 입문
- hook: PokéClip의 언어
- 핵심 항목: 설치 (pyenv) / 인터프리터 / REPL / 변수와 타입 / 자료구조 5종 (list/tuple/set/dict/str) / 제어문 / 기본 함수 / f-string / PEP 8 / print/input
- 다루지 않는 것: 자료구조 깊이 (B-2) / 함수 깊이 (B-3) / 모듈 (B-4)
- PokéClip 적용: 모든 Python 코드의 출발
- 면접 답변 주제: "Python 선호 이유"

#### B-2: 자료구조 깊이
- hook: list/dict 이상의 활용
- 핵심 항목: List comprehension / Dict comprehension / Generator expression / Slice 깊이 / 가변 vs 불변 / Hashable / collections (Counter/defaultdict/deque/OrderedDict/namedtuple) / heapq / bisect / sorted vs sort
- 다루지 않는 것: 함수 (B-3) / OOP (B-6)
- PokéClip 적용: 점수 데이터 처리
- 면접 답변 주제: "Counter / defaultdict 활용"

#### B-3: 함수 + 클로저 + 데코레이터
- hook: 함수 잘 알아야 비동기/테스트 다 됨
- 핵심 항목: 함수 깊이 (*args/**kwargs) / 키워드 전용 인자 / lambda / 클로저 / 일급 함수 / 데코레이터 (functools.wraps / 인자 받는 데코레이터) / 부분 적용 (functools.partial) / lru_cache / 재귀와 한계
- 다루지 않는 것: 비동기 함수 (B-13)
- PokéClip 적용: API 미들웨어 / 캐싱
- 면접 답변 주제: "데코레이터 동작" / "클로저"

#### B-4: 모듈/패키지/가상환경
- hook: 코드 재사용과 의존성 격리
- 핵심 항목: import 메커니즘 / sys.path / 패키지 / pip / requirements.txt / venv / poetry / uv / 가상환경 격리 이유 / PyPI / 의존성 충돌
- 다루지 않는 것: 배포 (B-15 별도 또는 생략)
- PokéClip 적용: PokéClip 의존성 관리
- 면접 답변 주제: "venv vs poetry"

#### B-5: 표준 라이브러리 깊이
- hook: 외부 패키지 없이 70% 작업 가능
- 핵심 항목: os / sys / pathlib / json / datetime/timezone / itertools / functools / random / hashlib / uuid / shutil / subprocess / argparse / logging
- 다루지 않는 것: 동시성 (B-11) / asyncio (B-13)
- PokéClip 적용: 파일/로깅/해시/인자 처리
- 면접 답변 주제: "subprocess vs os.system"

#### B-6: 객체지향
- hook: PyTorch/FastAPI/SQLAlchemy 다 클래스 기반
- 핵심 항목: 클래스/인스턴스 / __init__ / 메서드 / 상속 / 다형성 / 다중 상속 + MRO / abstract base class (abc) / classmethod vs staticmethod / property / 캡슐화
- 다루지 않는 것: 매직 메서드 (B-7) / 디자인 패턴
- PokéClip 적용: 분석 엔진 클래스 설계
- 면접 답변 주제: "Python OOP / @property"

#### B-7: 매직 메서드 + dataclass
- hook: 클래스를 Python답게 쓰는 핵심
- 핵심 항목: __str__/__repr__/__eq__/__hash__ / __len__/__iter__/__getitem__ / __enter__/__exit__ (context manager) / __call__ / dataclass (@dataclass) / frozen / Pydantic 비교 / NamedTuple
- 다루지 않는 것: 타입 힌트 깊이 (B-14)
- PokéClip 적용: 데이터 모델
- 면접 답변 주제: "context manager 직접 구현"

#### B-8: 에러 처리 + 로깅
- hook: 코드의 50%는 에러 처리. logging이 print 대체
- 핵심 항목: try/except/else/finally / 예외 계층 / raise / 커스텀 예외 / 예외 체이닝 (raise ... from) / traceback 읽기 / logging 모듈 / Handler / Formatter / Level / Structured logging (JSON)
- 다루지 않는 것: 디버깅 (B-9) / 모니터링 (H-8)
- PokéClip 적용: 분석 파이프라인 에러/로그
- 면접 답변 주제: "프로덕션 에러 처리"

#### B-9: 디버깅
- hook: 시니어와 주니어의 갈림
- 핵심 항목: pdb/ipdb / breakpoint() / VSCode 디버거 / 어설션 / py-spy 프로파일링 / cProfile / 메모리 프로파일링 / 멀티스레드 디버깅 / 분산 디버깅 (로그 + 트레이싱)
- 다루지 않는 것: 분산 트레이싱 (H-8 보강)
- PokéClip 적용: 분석 코드 디버깅
- 면접 답변 주제: "디버깅 마인드셋"

#### B-10: 파일 처리 + 정규식
- hook: 로그/EDL/JSON 처리 일상
- 핵심 항목: open과 with / 텍스트 vs 바이너리 / 인코딩 (UTF-8 / cp949) / CSV / JSON 깊이 / YAML / pathlib 깊이 / glob / re 모듈 / 정규식 패턴 (anchors/quantifiers/groups/lookahead) / 한국어 처리
- 다루지 않는 것: DB (F 트랙)
- PokéClip 적용: 분석 결과 JSON / EDL 파일 / 로그 추출
- 면접 답변 주제: "정규식 성능"

#### B-11: 멀티스레딩
- hook: I/O 바운드 동시 처리
- 핵심 항목: threading 모듈 / Lock / RLock / Semaphore / Condition / Event / Queue / GIL 영향 / I/O 바운드에서 효과 / ThreadPoolExecutor / 데드락 / 레이스 컨디션
- 다루지 않는 것: 프로세스 (B-12) / asyncio (B-13)
- PokéClip 적용: 채널별 IO 동시
- 면접 답변 주제: "GIL과 스레딩"

#### B-12: 멀티프로세싱
- hook: CPU 바운드 병렬. GIL 우회
- 핵심 항목: multiprocessing 모듈 / Process / Pool / Queue / Pipe / Manager / 공유 메모리 / ProcessPoolExecutor / fork vs spawn / IPC 비용 / Python 분산 (Ray 개요)
- 다루지 않는 것: 분산 처리 (K 트랙)
- PokéClip 적용: 영상 분석 병렬
- 면접 답변 주제: "thread vs process"

#### B-13: asyncio + 이벤트 루프
- hook: Python 비동기의 핵심 메커니즘. FastAPI/aiohttp 기반
- 핵심 항목: 동기 vs 비동기 vs 동시성 / 이벤트 루프 / async/await 문법 / asyncio.run / gather / create_task / Future vs Task / async context manager / async generator / asyncio.Queue / run_in_executor / 비동기 함정
- 다루지 않는 것: FastAPI 활용 (E-6 — 비동기 백엔드 활용 측면)
- PokéClip 적용: 분석 비동기 / aiohttp
- 면접 답변 주제: "asyncio vs threading" / "Event Loop"

#### B-14: 타입 힌트 + Pydantic
- hook: 런타임 → 정적 검사. FastAPI 필수
- 핵심 항목: 타입 힌트 기본 / typing 모듈 (List/Dict/Optional/Union/Literal/Final/Protocol/TypedDict) / Generic / mypy / pyright / Pydantic v2 / BaseModel / 검증 / Field / model_validator / serialization
- 다루지 않는 것: ORM (F-7) / FastAPI 라우터 (E-5)
- PokéClip 적용: API 요청/응답 검증
- 면접 답변 주제: "Pydantic vs dataclass"

#### B-15: pytest 테스팅
- hook: 테스트 없는 코드는 부서지는 코드
- 핵심 항목: 테스트 피라미드 / pytest 기본 / assert / fixture / parametrize / 마커 (skip/xfail) / mocking (unittest.mock / pytest-mock) / 커버리지 (pytest-cov) / 비동기 테스트 (pytest-asyncio) / TDD 개념
- 다루지 않는 것: 부하 테스트 / E2E
- PokéClip 적용: 분석 단위 테스트 / API 통합 테스트
- 면접 답변 주제: "테스트 짜는 법"

---

### C. AI 입문 (8 시리즈)

**갯수 근거**: AI 기본 흐름 (큰 그림 → NumPy → PyTorch → 신경망 → 학습 루프 → 데이터 → 평가 → 활용). 입문 트랙은 깊이 가지 않고 D 트랙 진입을 위한 발판. 8개가 흐름 깨지 않으면서 충분. C-8에 사전학습+HuggingFace+LLM API를 합쳐서 활용 한 번에.

#### C-1: AI/ML 큰 그림
- hook: AI 전공이지만 실전 0. 큰 그림 다시
- 핵심 항목: AI vs ML vs DL / 지도/비지도/강화/자기지도 / 분류/회귀/클러스터링 / Train/Val/Test / 과적합/과소적합 / 편향-분산 / 일반화 / 데이터셋 중요성 / Foundation Model / RAG / 멀티모달 흐름
- 다루지 않는 것: 코드 (C-2부터)
- PokéClip 적용: 영상/음성/채팅 분석 위치 매핑
- 면접 답변 주제: "지도 vs 비지도 / 과적합 방지"

#### C-2: NumPy + 텐서 기초
- hook: 모든 AI 라이브러리의 기반
- 핵심 항목: ndarray / shape/dtype/axis / 브로드캐스팅 / 슬라이싱 / 행렬 연산 / 통계 / 난수 / 텐서 개념 (스칼라/벡터/행렬/N차원) / NumPy vs PyTorch Tensor / Memory layout
- 다루지 않는 것: PyTorch (C-3) / GPU (D-18)
- PokéClip 적용: 점수 벡터 처리
- 면접 답변 주제: "브로드캐스팅"

#### C-3: PyTorch 입문
- hook: AI 생태계 표준
- 핵심 항목: torch.Tensor / autograd / requires_grad / nn.Module / nn.Linear / 순전파 / loss / optimizer / loss.backward() / optimizer.step() / state_dict / device 이동
- 다루지 않는 것: 신경망 깊이 (C-4) / 학습 루프 (C-5)
- PokéClip 적용: YOLO/Whisper 기반 직관
- 면접 답변 주제: "autograd / state_dict"

#### C-4: 신경망 기초
- hook: MLP/CNN/RNN/Transformer 직관
- 핵심 항목: 퍼셉트론 / MLP / 활성화 (ReLU/Sigmoid/Softmax) / Backprop 직관 / CNN (Conv2d / Pooling / Padding / Stride) / RNN/LSTM 개요 / Transformer 개요 (Self-Attention)
- 다루지 않는 것: CV 깊이 (D-1) / 학습 루프 (C-5)
- PokéClip 적용: YOLO = CNN / Whisper = Transformer
- 면접 답변 주제: "CNN / Self-Attention 직관"

#### C-5: 학습 루프 + 최적화
- hook: 패턴 익숙해지면 어떤 모델도 학습 가능
- 핵심 항목: 학습 루프 구조 / DataLoader / batch / epoch / SGD / Adam / AdamW / Learning rate / LR Scheduler / weight decay / gradient clipping / early stopping / 체크포인트
- 다루지 않는 것: 분산 학습
- PokéClip 적용: YOLO 파인튜닝 시 학습 루프
- 면접 답변 주제: "SGD vs Adam"

#### C-6: 데이터 로더 + 전처리
- hook: 모델보다 데이터가 중요
- 핵심 항목: Dataset / DataLoader / 배치 / num_workers / pin_memory / 이미지 전처리 (PIL/OpenCV/albumentations) / 정규화 / 데이터 증강 / 텍스트 토큰화 개요 / 오디오 전처리 (mel-spectrogram 개요)
- 다루지 않는 것: 라벨링 (D-4) / 오디오 깊이 (D-8)
- PokéClip 적용: 게임 프레임 전처리 / mel-spectrogram
- 면접 답변 주제: "데이터 증강 효과"

#### C-7: 평가 지표
- hook: 잘했는지 측정 못 하면 개선 방향 없음
- 핵심 항목: Accuracy / Precision / Recall / F1 / ROC-AUC / PR-AUC / Confusion Matrix / mAP / IoU / WER / 회귀 지표 (MSE/MAE/R²) / 클래스 불균형 대응
- 다루지 않는 것: 통계 검정 (I-10 / 별도)
- PokéClip 적용: YOLO mAP / Whisper WER
- 면접 답변 주제: "Precision vs Recall / mAP"

#### C-8: 사전학습 모델 + HuggingFace + LLM API
- hook: 처음부터 학습은 비용 폭주. 활용이 정석
- 핵심 항목: Transfer learning / Feature extraction vs Fine-tuning / Freeze / timm (CV) / huggingface_hub / Model Hub / transformers / pipeline 헬퍼 / datasets / OpenAI API / Anthropic / Gemini API / 메시지 구조 / 토큰 카운팅 / 비용 / 스트리밍 / Function Calling
- 다루지 않는 것: 본격 파인튜닝 (D 트랙) / 프롬프트 엔지니어링 깊이 (D-13)
- PokéClip 적용: Whisper 모델 / LLM 요약 API
- 면접 답변 주제: "Transfer learning / LLM API 비용"

---

### D. AI 깊이 (22 시리즈)

**갯수 근거**: PokéClip 핵심 영역 + 치지직 AI 입사 직격. CV(YOLO 학습 5+) + 음성(Whisper/효과음 4) + NLP/LLM(5) + MLOps/추론 최적화(5) + GPU(2) + 멀티모달(1). 각 하위 도메인을 깊이 가야 입사 수준. 22가 자연.

#### D-1: Computer Vision 깊이
- hook: PokéClip 영상 분석 출발
- 핵심 항목: 이미지 분류 (ResNet/VGG/EfficientNet) / 영상 task (분류/검출/세그멘테이션/포즈) / Two-stage vs One-stage / Backbone/Neck/Head / CV 특화 증강 (Mosaic/MixUp/CutMix)
- 다루지 않는 것: 객체 검출 이론 (D-2)
- PokéClip 적용: YOLO 학습 직관
- 면접 답변 주제: "Two-stage vs One-stage"

#### D-2: 객체 검출 이론
- hook: YOLO 이전 / 이후의 이론적 흐름
- 핵심 항목: R-CNN family (R-CNN/Fast/Faster) / YOLO 진화 (v1~v10) / SSD / RetinaNet (Focal Loss) / Anchor 개념 / Anchor-free / NMS 알고리즘 / Soft-NMS / DETR 개요
- 다루지 않는 것: YOLO 사용법 (D-3) / 학습 (D-5)
- PokéClip 적용: YOLO 선택 근거
- 면접 답변 주제: "NMS / Anchor 개념"

#### D-3: YOLO 사용법 (Ultralytics)
- hook: PokéClip 영상 분석 모델
- 핵심 항목: Ultralytics YOLO 설치 / 데이터 형식 (txt 어노테이션) / yaml config / 사전학습 모델 / train/val/predict 명령 / export (ONNX/TensorRT) / Loss 구조 (Box/Cls/Obj) / 학습 결과 해석
- 다루지 않는 것: 라벨링 (D-4) / 학습 깊이 (D-5/D-6)
- PokéClip 적용: LoL YOLO 출발
- 면접 답변 주제: "YOLO 학습 흐름"

#### D-4: 데이터 라벨링 도구 + 워크플로우
- hook: 라벨링이 80% 시간
- 핵심 항목: 어노테이션 종류 (bbox/polygon/keypoint/mask) / Roboflow / CVAT / Label Studio / 라벨링 가이드라인 / IAA / 라벨 오류 패턴 / 데이터셋 분할 (누수 방지) / Active Learning / Synthetic data 개요
- 다루지 않는 것: 파인튜닝 (D-5/D-6) / 자동 라벨링 깊이
- PokéClip 적용: LoL 킬피드 데이터셋
- 면접 답변 주제: "라벨링 품질 보장"

#### D-5: YOLO 파인튜닝 1단계 (데이터셋 구성)
- hook: 파인튜닝의 절반은 데이터 구성
- 핵심 항목: 클래스 정의 / 라벨링 일관성 / 분포 균형 / Train/Val 분할 / 데이터 증강 선택 / Negative samples / 데이터 검증 / 라벨 오류 자동 발견
- 다루지 않는 것: 학습 자체 (D-6)
- PokéClip 적용: LoL 킬피드 데이터셋 구성
- 면접 답변 주제: "데이터셋 분할 전략"

#### D-6: YOLO 파인튜닝 2단계 (학습 + 하이퍼파라미터)
- hook: 학습 자체. 하이퍼파라미터가 결과 결정
- 핵심 항목: 사전학습 가중치 선택 / 학습률 / epochs / batch / imgsz / Freeze 전략 / Validation 모니터링 / 손실 곡선 읽기 / mAP 추적 / Resume / Best model 선택 / 추론 후처리 (Confidence/NMS IoU)
- 다루지 않는 것: 평가 디버깅 (D-7)
- PokéClip 적용: LoL YOLO 파인튜닝
- 면접 답변 주제: "하이퍼파라미터 튜닝"

#### D-7: 모델 평가 + 디버깅 (CV)
- hook: 학습 끝났는데 잘 안 됨. 원인 찾기
- 핵심 항목: 학습 곡선 분석 / 클래스별 성능 / Confusion Matrix 해석 / FP/FN 케이스 시각화 / 데이터 vs 모델 문제 / TensorBoard / Weights & Biases / Ablation Study / 에러 분석 방법론
- 다루지 않는 것: 추론 최적화 (D-21)
- PokéClip 적용: 거짓 양성 ≤ 30% 달성
- 면접 답변 주제: "모델 성능 안 나올 때"

#### D-8: 음성 처리 기초
- hook: 음성 = 신호. PokéClip 음성 트랙 출발
- 핵심 항목: waveform / sample rate / 푸리에 변환 직관 / 스펙트로그램 / mel-spectrogram / MFCC / librosa 라이브러리 / VAD (Voice Activity Detection) / 오디오 IO (soundfile/pydub)
- 다루지 않는 것: STT (D-9) / 효과음 매칭 (D-11)
- PokéClip 적용: 마이크/Discord 트랙 전처리
- 면접 답변 주제: "Mel-spectrogram 직관"

#### D-9: Whisper STT 활용
- hook: PokéClip 음성 분석 핵심
- 핵심 항목: Whisper 모델 패밀리 (tiny/base/small/medium/large/turbo) / OpenAI Whisper / faster-whisper (CTranslate2) / API vs self-hosted / 타임스탬프 / Word-level / 언어 감지 / VAD 전처리 / 비용 비교
- 다루지 않는 것: 파인튜닝 (D-10) / 효과음 (D-11)
- PokéClip 적용: 마이크 STT
- 면접 답변 주제: "Whisper 모델 선택"

#### D-10: Whisper 파인튜닝 (한국어/도메인)
- hook: 일반 Whisper는 한국어 게임 슬랭에 약함
- 핵심 항목: 한국어 데이터셋 / 도메인 어휘 (게임 슬랭) / Whisper fine-tuning 흐름 / LoRA 활용 / 평가 (WER) / 화자 분리 / 노이즈 강건성
- 다루지 않는 것: 일반 fine-tuning (C-8 / D-6)
- PokéClip 적용: 게임 슬랭 정확도 개선
- 면접 답변 주제: "도메인 적응"

#### D-11: 음성 효과음 패턴 매칭
- hook: Penta Kill 사운드 = 매칭이 정답
- 핵심 항목: Cross-correlation / DTW (Dynamic Time Warping) / Template matching / 효과음 라이브러리 구축 / 임계값 결정 / 시간 정렬 / YAMNet 비교 (ML 분류)
- 다루지 않는 것: STT (D-9)
- PokéClip 적용: Penta Kill / 드래곤 처치 / 도네이션
- 면접 답변 주제: "Template vs ML"

#### D-12: NLP/LLM 입문
- hook: 토큰화부터 LLM까지 큰 흐름
- 핵심 항목: 토큰화 (BPE / WordPiece / SentencePiece) / 임베딩 / Word2Vec → BERT → GPT 진화 / LLM 패밀리 (GPT/Claude/Llama/Qwen) / Foundation Model 개념 / Instruction tuning / RLHF 개요
- 다루지 않는 것: 프롬프트 엔지니어링 (D-13) / RAG (D-14)
- PokéClip 적용: LLM 요약 기반 이해
- 면접 답변 주제: "Transformer 진화"

#### D-13: 프롬프트 엔지니어링
- hook: API 호출만으로 부족. 프롬프트가 80%
- 핵심 항목: 시스템 프롬프트 / Few-shot vs Zero-shot / Chain-of-Thought / Self-consistency / 역할 부여 / 출력 형식 강제 (JSON) / Function Calling / 프롬프트 인젝션 방어 / LLM-as-judge / 비용 최적화 패턴
- 다루지 않는 것: RAG (D-14)
- PokéClip 적용: 구간 요약 / 감정 분석
- 면접 답변 주제: "프롬프트 설계"

#### D-14: RAG 입문
- hook: LLM에 외부 지식 주입. 환각 줄임
- 핵심 항목: RAG (Retrieval Augmented Generation) 개념 / 임베딩 벡터 / 벡터 DB (Chroma/Qdrant/pgvector) / 청킹 전략 / 검색 (BM25 / Dense / Hybrid) / Re-ranking / 평가 (Faithfulness / Relevance) / LangChain 개요
- 다루지 않는 것: 멀티모달 (D-15)
- PokéClip 적용: 도메인 지식 주입 (선택)
- 면접 답변 주제: "RAG vs Fine-tuning"

#### D-15: 멀티모달 LLM (Qwen-VL / GPT-4V)
- hook: 비디오 분석 옵션
- 핵심 항목: Vision-Language Model / GPT-4V / Claude Vision / Gemini Vision / Qwen-VL / CLIP / 비디오 프레임 샘플링 / 비용 비교 (이미지 토큰) / 한국어 성능 / YOLO 보완 사용 사례
- 다루지 않는 것: VLA
- PokéClip 적용: 영상 분석 옵션
- 면접 답변 주제: "멀티모달 활용"

#### D-16: 모델 경량화 (양자화 / Distillation)
- hook: 큰 모델은 비용 폭주
- 핵심 항목: Quantization (INT8/FP16/INT4) / PTQ vs QAT / Pruning / Knowledge Distillation / GGUF / llama.cpp / 정확도 vs 크기 트레이드오프
- 다루지 않는 것: ONNX/TensorRT (D-17)
- PokéClip 적용: YOLO 경량화 / Whisper turbo
- 면접 답변 주제: "양자화 영향"

#### D-17: ONNX + TensorRT
- hook: 추론 표준 포맷 + GPU 최적화
- 핵심 항목: ONNX 포맷 / 변환 (PyTorch → ONNX) / ONNX Runtime / TensorRT / FP16/INT8 정밀도 / 동적 shape / 추론 성능 비교
- 다루지 않는 것: 모델 서빙 (D-20)
- PokéClip 적용: YOLO 추론 가속
- 면접 답변 주제: "ONNX vs TensorRT"

#### D-18: GPU 활용 (CUDA / MPS / 클라우드)
- hook: M5 Mac은 CUDA 없음. 환경별 차이
- 핵심 항목: GPU vs CPU / CUDA 개요 / NVIDIA 세대 (T4/A10/V100/A100/H100) / Apple MPS / PyTorch device 관리 / OOM 대응 / Mixed Precision (FP16/BF16) / nvidia-smi / Colab / AWS EC2 GPU / vast.ai/RunPod
- 다루지 않는 것: 컴퓨터 구조 (P-3)
- PokéClip 적용: 학습 = MPS/Colab, 추론 = AWS
- 면접 답변 주제: "GPU 메모리 관리"

#### D-19: MLOps 입문 (실험 추적 / 모델 버전)
- hook: 모델은 학습이 끝이 아님
- 핵심 항목: MLOps vs DevOps / 실험 추적 (MLflow / Weights & Biases) / 모델 버전 관리 / DVC (데이터 버전) / 재학습 파이프라인 / 데이터 드리프트 / 모델 드리프트
- 다루지 않는 것: 서빙 (D-20)
- PokéClip 적용: YOLO 모델 버전 관리
- 면접 답변 주제: "MLOps 경험"

#### D-20: 모델 서빙 (FastAPI / Triton)
- hook: 모델 → API → 호출 가능
- 핵심 항목: FastAPI로 모델 감싸기 / 입력 검증 (Pydantic) / 배치 처리 / TorchServe / Triton Inference Server / 모델 레지스트리 / Health check / 콜드 스타트 대응
- 다루지 않는 것: 추론 최적화 깊이 (D-21)
- PokéClip 적용: 분석 모델 API화
- 면접 답변 주제: "모델 서빙 구조"

#### D-21: 추론 최적화 (배치 / Continuous batching)
- hook: 추론 비용이 운영 비용 90%
- 핵심 항목: 배치 추론 vs 실시간 / Throughput vs Latency / 동적 배치 / Continuous batching (vLLM) / KV Cache (LLM) / Speculative decoding / 캐싱 / Triton dynamic batching
- 다루지 않는 것: 실시간 시스템 (D-22)
- PokéClip 적용: 분석 추론 처리량
- 면접 답변 주제: "Throughput 올리기"

#### D-22: 실시간 추론 시스템 (스트리밍)
- hook: PokéClip은 방송 중 점진 분석
- 핵심 항목: 스트리밍 입력 / 슬라이딩 윈도우 추론 / 백프레셔 / 큐 기반 서빙 / 모델 워밍업 / 콜드 스타트 / Auto-scaling 추론 / 모니터링 (지연/처리량/에러율) / 페일오버
- 다루지 않는 것: 추론 최적화 일반 (D-21)
- PokéClip 적용: 방송 중 실시간 분석
- 면접 답변 주제: "실시간 모델 서빙"

---

### E. 백엔드 아키텍처 (13 시리즈)

**갯수 근거**: HTTP/REST/WebSocket/gRPC 통신(4) + FastAPI/DI/비동기(3) + 메시지 큐(3) + 아키텍처(3). 백엔드 전 영역 균형. WebSocket은 활용 측면만 (프로토콜 RFC는 O-5).

#### E-1: HTTP 기초
- hook: 모든 웹 백엔드의 기반
- 핵심 항목: 클라이언트-서버 / HTTP 메시지 / 메서드 (GET/POST/PUT/PATCH/DELETE) / 상태 코드 / 헤더 (Content-Type/Authorization/Cache-Control) / 쿠키 / Stateless / HTTPS 개요
- 다루지 않는 것: HTTP/2/3 (O-4) / WebSocket (E-3)
- PokéClip 적용: API 통신 기반
- 면접 답변 주제: "PUT vs PATCH"

#### E-2: REST API 설계
- hook: 백엔드 API 표준
- 핵심 항목: REST 원칙 / URI 컨벤션 / Versioning / Pagination (offset vs cursor) / Filtering / Sorting / 에러 응답 표준 (RFC 7807) / HATEOAS 개요 / REST vs RPC vs GraphQL
- 다루지 않는 것: 구현 (E-5)
- PokéClip 적용: 대시보드 API 설계
- 면접 답변 주제: "REST 원칙"

#### E-3: WebSocket 활용 + 스케일링
- hook: 실시간 통신 활용 측면
- 핵심 항목: HTTP vs WebSocket 사용 결정 / FastAPI WebSocket / 연결 관리 (ping/pong/재연결) / Room/Channel 패턴 / 인증 / 스케일링 (Sticky session / pub-sub backend) / SSE 비교
- 다루지 않는 것: 프로토콜 RFC 6455 깊이 (O-5)
- PokéClip 적용: 치지직 채팅 / 대시보드 실시간
- 면접 답변 주제: "WebSocket 스케일링"

#### E-4: gRPC 개요
- hook: 마이크로서비스 간 통신 표준 후보
- 핵심 항목: gRPC vs REST / Protocol Buffers / 단방향/양방향 스트리밍 / Python grpcio / 코드 생성 / 인증 / 로드 밸런싱 / gRPC-Web
- 다루지 않는 것: 서비스 메시
- PokéClip 적용: 내부 서비스 통신 (선택)
- 면접 답변 주제: "gRPC 언제 쓰나"

#### E-5: FastAPI 입문
- hook: Python 백엔드 표준
- 핵심 항목: 설치와 첫 앱 / 라우터 / 경로/쿼리/본문 매개변수 / Pydantic 통합 / 응답 모델 / 자동 OpenAPI / Uvicorn 실행 / 환경 분리
- 다루지 않는 것: DI (E-7) / 비동기 활용 (E-6)
- PokéClip 적용: 대시보드 백엔드
- 면접 답변 주제: "FastAPI 선택 이유"

#### E-6: 비동기 백엔드 (FastAPI + asyncio 활용)
- hook: 동기 코드는 동시 요청에서 막힘. asyncio 활용 측면
- 핵심 항목: 비동기 라우트 활용 / 비동기 DB (asyncpg / SQLAlchemy 2.0 async) / 비동기 HTTP 클라이언트 (httpx / aiohttp) / 동기 코드 호출 (run_in_executor) / 동시 요청 처리 / blocking 함정
- 다루지 않는 것: Python asyncio 메커니즘 자체 (B-13)
- PokéClip 적용: 분석 API의 비동기 처리
- 면접 답변 주제: "asyncpg vs psycopg"

#### E-7: 의존성 주입 + 미들웨어
- hook: 큰 앱일수록 DI가 품질 결정
- 핵심 항목: DI 개념 / FastAPI Depends / 의존성 트리 / DB 세션 DI / 인증 DI / 미들웨어 흐름 / CORS / 로깅 미들웨어 / 요청 ID / 에러 핸들러 / Background tasks
- 다루지 않는 것: API 보안 (L-6)
- PokéClip 적용: API DI 구조
- 면접 답변 주제: "DI 왜 쓰나요"

#### E-8: 메시지 큐 입문 (Redis Pub/Sub)
- hook: 서비스 간 비동기 통신 출발
- 핵심 항목: 메시지 큐 개념 / Producer / Consumer / Pub/Sub vs Queue / Redis Pub/Sub / Lists를 큐로 (LPUSH/RPOP) / 메시지 손실 / 순서 보장
- 다루지 않는 것: Streams (E-9) / Kafka (E-10)
- PokéClip 적용: 분석 작업 디스패치
- 면접 답변 주제: "Pub/Sub 언제"

#### E-9: Redis Streams
- hook: PokéClip 분석 큐 후보
- 핵심 항목: Streams vs Pub/Sub vs Lists / XADD / XREAD / XREADGROUP / Consumer Group / 메시지 ack / Pending / 백프레셔 / maxlen 트리밍 / Persistence (RDB/AOF)
- 다루지 않는 것: Kafka (E-10)
- PokéClip 적용: 채널별 분석 큐
- 면접 답변 주제: "Redis Streams vs Kafka"

#### E-10: Apache Kafka
- hook: 대규모 이벤트 스트리밍 표준
- 핵심 항목: Kafka 아키텍처 (Broker/Topic/Partition/Replica) / Producer/Consumer/ConsumerGroup / Offset 관리 / 파티션 키와 순서 / Replication / ISR / 보존 정책 / Kafka Connect 개요
- 다루지 않는 것: Kafka Streams (K-6)
- PokéClip 적용: 대규모 분석 파이프라인
- 면접 답변 주제: "Kafka 파티션 설계"

#### E-11: 마이크로서비스 vs 모놀리스
- hook: 아키텍처 선택은 비즈니스 결정
- 핵심 항목: 모놀리스 장단점 / 마이크로서비스 장단점 / Modular Monolith / 서비스 경계 (DDD bounded context) / 통신 (REST/gRPC/Event) / Service Mesh 개요 / 마이크로서비스 함정
- 다루지 않는 것: 분산 트랜잭션 (K-5)
- PokéClip 적용: 아키텍처 결정 기준
- 면접 답변 주제: "MSA 전환"

#### E-12: 분석 파이프라인 설계
- hook: 데이터 파이프라인은 시니어 주력
- 핵심 항목: 파이프라인 패턴 (Pipe-Filter / Fan-out / Fan-in) / 단계 분리 / 에러 처리 / 재시도 / 멱등성 / 데드 레터 큐 / 순서 보장 / 처리량 vs 지연 / Lambda Architecture / Kappa Architecture
- 다루지 않는 것: 실시간 처리 깊이 (K-6)
- PokéClip 적용: 9단계 파이프라인 설계 일반화
- 면접 답변 주제: "Lambda vs Kappa"

#### E-13: 백프레셔 + 큐 관리
- hook: 큐 무한히 쌓이면 시스템 폭발
- 핵심 항목: 백프레셔 개념 / 큐 길이 제한 / Drop 전략 (FIFO/LIFO/우선순위) / Throttling / Rate limiting / Reactive Streams 개요 / 모니터링 / 알람 임계
- 다루지 않는 것: 분산 일관성 (K)
- PokéClip 적용: 분석 안정성
- 면접 답변 주제: "백프레셔"

---

### F. 데이터베이스 (12 시리즈)

**갯수 근거**: SQL 깊이(3) + 인덱스/트랜잭션(2) + PostgreSQL/ORM/마이그레이션(3) + NoSQL/DynamoDB(2) + 시계열(1) + 캐싱(1). 백엔드 면접 깊이 영역.

#### F-1: 관계형 DB 기초
- hook: 학교 들었지만 실전 0
- 핵심 항목: RDBMS 개념 / 테이블/행/컬럼 / 자료형 / PK / FK / 1:1 / 1:N / N:N 관계 / NULL / Constraint / 정규화 (1NF/2NF/3NF) / 역정규화 트레이드오프 / ER 다이어그램
- 다루지 않는 것: SQL 깊이 (F-2부터)
- PokéClip 적용: 데이터 모델링 기초
- 면접 답변 주제: "정규화 / FK"

#### F-2: SQL 깊이 (JOIN / 서브쿼리)
- hook: SELECT만 알면 부족
- 핵심 항목: SELECT/WHERE/GROUP BY/HAVING / JOIN 종류 (INNER/LEFT/RIGHT/FULL/CROSS) / 서브쿼리 (스칼라/인라인뷰/상관) / EXISTS vs IN / UNION / UPSERT (INSERT ... ON CONFLICT)
- 다루지 않는 것: 윈도우 (F-3) / 인덱스 (F-4)
- PokéClip 적용: 분석 데이터 쿼리
- 면접 답변 주제: "JOIN 종류"

#### F-3: 윈도우 함수 + CTE
- hook: 고급 분석 쿼리. 면접 자주
- 핵심 항목: ROW_NUMBER / RANK / DENSE_RANK / LAG / LEAD / 윈도우 프레임 (ROWS/RANGE) / PARTITION BY / CTE (WITH) / Recursive CTE / 윈도우 vs GROUP BY
- 다루지 않는 것: 인덱스 (F-4)
- PokéClip 적용: 시계열 점수 분석
- 면접 답변 주제: "윈도우 함수 사용"

#### F-4: 인덱스 + 쿼리 최적화
- hook: 느린 쿼리 못 잡으면 시니어 아님
- 핵심 항목: B-Tree 인덱스 동작 / 복합 인덱스 / 선택성 / Covering Index / Index-only scan / EXPLAIN / EXPLAIN ANALYZE 읽기 / N+1 / 통계 / 파티셔닝
- 다루지 않는 것: 분산 DB
- PokéClip 적용: 시계열 쿼리 최적화
- 면접 답변 주제: "EXPLAIN 읽는 법"

#### F-5: 트랜잭션 + 격리 수준
- hook: 동시성에서 일관성. 면접 단골
- 핵심 항목: ACID / BEGIN/COMMIT/ROLLBACK / Savepoint / 격리 수준 4단계 (RU/RC/RR/Serializable) / Phantom/Dirty/Non-repeatable Read / 잠금 / MVCC / 데드락
- 다루지 않는 것: 분산 트랜잭션 (K-5)
- PokéClip 적용: 동시 분석 저장
- 면접 답변 주제: "격리 수준 / MVCC"

#### F-6: PostgreSQL 깊이
- hook: 백엔드 메인 RDBMS
- 핵심 항목: PostgreSQL 특징 / 자료형 (JSON/JSONB/ARRAY/UUID) / 인덱스 종류 (B-Tree/Hash/GIN/GiST/BRIN) / VACUUM / autovacuum / Replication / Logical vs Physical / Extension (pgvector / TimescaleDB)
- 다루지 않는 것: 분산 PG (Citus)
- PokéClip 적용: 메인 DB 후보
- 면접 답변 주제: "JSONB / GIN 인덱스"

#### F-7: SQLAlchemy ORM
- hook: Raw SQL 한계
- 핵심 항목: ORM 개념 / SQLAlchemy 2.0 / Core vs ORM / Engine / Session / Model 정의 / Relationship / Lazy vs Eager loading / N+1 해결 (joinedload/selectinload) / 비동기 SQLAlchemy / Pydantic 통합
- 다루지 않는 것: 마이그레이션 (F-8)
- PokéClip 적용: 메타데이터 저장
- 면접 답변 주제: "ORM vs Raw SQL / Lazy 함정"

#### F-8: Alembic 마이그레이션
- hook: 스키마 변경의 표준
- 핵심 항목: Alembic 설정 / autogenerate / migration script 작성 / upgrade / downgrade / merge / branch / 무중단 마이그레이션 패턴 / DB 백업과 롤백 / Migration 보안 함정
- 다루지 않는 것: 데이터 마이그레이션 깊이
- PokéClip 적용: 스키마 진화
- 면접 답변 주제: "무중단 마이그레이션"

#### F-9: NoSQL 입문 (MongoDB / DynamoDB)
- hook: 관계형이 답이 아닌 경우
- 핵심 항목: NoSQL 종류 (Document/Key-Value/Column/Graph/Time-series) / MongoDB 기본 (Document/Collection) / DynamoDB 기본 / 스키마리스 트레이드오프 / 일관성 모델 / CAP 직관 / SQL vs NoSQL 결정
- 다루지 않는 것: DynamoDB 키 깊이 (F-10) / CAP 깊이 (K-1)
- PokéClip 적용: 메타데이터 후보
- 면접 답변 주제: "SQL vs NoSQL 선택"

#### F-10: DynamoDB 키 설계
- hook: PokéClip 후보 DB
- 핵심 항목: Partition Key / Sort Key / Composite Key / GSI / LSI / Hot Partition 함정 / Single-table design / Access Pattern 우선 / 쿼리 vs 스캔 / Capacity Mode (On-demand / Provisioned) / TTL / Streams / Conditional Write
- 다루지 않는 것: AWS Lambda 통합 (G-9)
- PokéClip 적용: 점수 시계열 / 클립 메타 키 설계
- 면접 답변 주제: "DynamoDB 키 설계"

#### F-11: 시계열 DB
- hook: PokéClip은 5초 단위 시계열
- 핵심 항목: 시계열 특성 (높은 쓰기 / 시간순) / TimescaleDB / InfluxDB / 압축 / 다운샘플링 / Continuous Aggregates / Retention 정책 / 시계열 vs DynamoDB vs PostgreSQL
- 다루지 않는 것: 빅데이터 OLAP
- PokéClip 적용: 점수 시계열 저장 대안
- 면접 답변 주제: "시계열 DB 선택"

#### F-12: Redis 캐싱 패턴
- hook: 빠른 응답의 80%는 캐싱
- 핵심 항목: 캐시 패턴 (Cache-aside/Read-through/Write-through/Write-behind) / TTL / Eviction Policy (LRU/LFU) / Cache Stampede / 캐시 무효화 / Distributed Cache / Redis 자료형 (String/Hash/List/Set/Sorted Set) / 분산 락 (Redlock) / Rate limiting 패턴
- 다루지 않는 것: Redis Streams (E-9)
- PokéClip 적용: 분석 결과 캐싱
- 면접 답변 주제: "캐시 무효화"

---

### G. AWS 인프라 (17 시리즈)

**갯수 근거**: 매우 광범. 컴퓨팅(EC2/Lambda 5) + 스토리지(S3 2) + 네트워크(VPC/ELB 3) + 모니터링/스케일/비용(4) + 컨테이너(2) + IAM 기초(1). 12개로는 부족. 치지직 입사 시 AWS 깊이 필수.

#### G-1: AWS 콘솔/CLI/IAM 기초
- hook: AWS의 시작
- 핵심 항목: 계정 / Region vs AZ / Console UI / AWS CLI 설치/설정 / Access Key vs Role / IAM User/Group/Role/Policy (JSON) / 최소 권한 원칙 / MFA / Billing 알람
- 다루지 않는 것: 각 서비스 (G-2부터)
- PokéClip 적용: AWS 작업 출발
- 면접 답변 주제: "IAM 원칙 / Key vs Role"

#### G-2: EC2 입문
- hook: 가장 기본 컴퓨팅
- 핵심 항목: 인스턴스 타입 (t/m/c/r) / AMI / Key Pair / Security Group / EBS / Elastic IP / 시작/중지/종료 / SSH / User Data / Instance Metadata
- 다루지 않는 것: 깊이 (G-3) / GPU (G-4)
- PokéClip 적용: 서버 호스팅
- 면접 답변 주제: "EC2 타입 선택"

#### G-3: EC2 깊이 (Spot / Reserved / Networking)
- hook: 비용 통제와 네트워크
- 핵심 항목: Spot vs On-Demand vs Reserved / Savings Plans / Placement Group / ENI (Elastic Network Interface) / EBS 볼륨 종류 (gp3/io2/st1) / Snapshot / 인스턴스 마이그레이션
- 다루지 않는 것: VPC 깊이 (G-12)
- PokéClip 적용: 비용 최적화 / 네트워크 설정
- 면접 답변 주제: "Spot 활용"

#### G-4: EC2 GPU 인스턴스
- hook: AI 워크로드 핵심
- 핵심 항목: GPU 패밀리 (g4dn/g5/p3/p4/p5) / NVIDIA T4/A10/V100/A100/H100 차이 / Deep Learning AMI / Container Toolkit / nvidia-smi / CUDA 드라이버 / 비용 / Spot GPU
- 다루지 않는 것: 추론 시스템 (D-22)
- PokéClip 적용: YOLO/Whisper 추론
- 면접 답변 주제: "GPU 인스턴스 선택"

#### G-5: S3 기초
- hook: AWS 객체 스토리지
- 핵심 항목: 버킷 / 객체 / 키 / Region / 스토리지 클래스 (Standard/IA/Glacier/Deep Archive) / Versioning / Multi-part Upload / 이벤트 알림 / 정적 호스팅 / 보안 (Block Public Access)
- 다루지 않는 것: 라이프사이클/Pre-signed (G-6)
- PokéClip 적용: 영상 보관
- 면접 답변 주제: "스토리지 클래스"

#### G-6: S3 라이프사이클 + Pre-signed URL
- hook: 비용 최적화 + 안전한 공유
- 핵심 항목: Lifecycle 정책 / Transition Rule / Expiration / Pre-signed URL 생성 / 만료 시간 / boto3 API / Server-Side Encryption (SSE-S3/SSE-KMS) / Object Lock / S3 Select
- 다루지 않는 것: CDN (CloudFront)
- PokéClip 적용: 영상 라이프사이클 / 다운로드 URL
- 면접 답변 주제: "Pre-signed URL 보안"

#### G-7: Lambda 기초
- hook: 서버리스 표준
- 핵심 항목: 서버리스 개념 / Lambda 함수 / 트리거 (API Gateway/S3/DynamoDB Streams/SQS/EventBridge/CloudWatch) / 런타임 / 실행 컨텍스트 / 콜드 스타트 / 메모리 vs CPU / 타임아웃 / 환경 변수 / IAM Role
- 다루지 않는 것: 깊이 (G-8) / 통합 (G-9)
- PokéClip 적용: 채팅 수집 / EDL 생성
- 면접 답변 주제: "Lambda 한계 / 콜드 스타트"

#### G-8: Lambda 깊이 (Layer / Concurrency / VPC)
- hook: 운영 단계 Lambda
- 핵심 항목: Layer (공유 라이브러리) / Reserved Concurrency / Provisioned Concurrency / Concurrent Executions 한도 / Lambda in VPC (NAT 비용) / Lambda Extensions / Container Image 배포 / 에러 처리 / Dead Letter Queue
- 다루지 않는 것: 통합 (G-9)
- PokéClip 적용: 운영 Lambda
- 면접 답변 주제: "Provisioned Concurrency"

#### G-9: Lambda + DynamoDB
- hook: 서버리스 백엔드 황금 조합
- 핵심 항목: boto3 / Lambda → DynamoDB 호출 / Item put/get/query/scan / Batch operations / Streams 트리거 / 트랜잭션 (TransactWriteItems) / 예외 처리 / 동시성 제어
- 다루지 않는 것: API Gateway (G-10)
- PokéClip 적용: 분석 결과 저장
- 면접 답변 주제: "Lambda + DynamoDB 패턴"

#### G-10: API Gateway
- hook: 서버리스 API 표준
- 핵심 항목: REST API vs HTTP API vs WebSocket API / 리소스/메서드 매핑 / Lambda 프록시 통합 / Stage / Deployment / Custom Domain / Throttling / API Key / Usage Plan / CORS / Cognito Authorizer / Custom Authorizer
- 다루지 않는 것: 인증 깊이 (L)
- PokéClip 적용: 대시보드 API 백엔드
- 면접 답변 주제: "API Gateway 패턴"

#### G-11: VPC 기초
- hook: AWS 네트워크 기반
- 핵심 항목: VPC / Subnet (Public/Private) / Internet Gateway / NAT Gateway / Route Table / Security Group vs NACL / CIDR / IPv4 vs IPv6 / Public vs Private IP
- 다루지 않는 것: 깊이 (G-12)
- PokéClip 적용: EC2/RDS 격리
- 면접 답변 주제: "Public vs Private Subnet"

#### G-12: VPC 깊이 (Peering / Endpoint / Transit)
- hook: 멀티 티어 / 보안 / 비용
- 핵심 항목: VPC Peering / Transit Gateway / VPN / Direct Connect / VPC Endpoint (Gateway/Interface) / PrivateLink / Flow Logs / 멀티 AZ 설계 / 비용 함정 (Cross-AZ / NAT)
- 다루지 않는 것: 네트워크 기초 (O)
- PokéClip 적용: 보안 경계 / 비용
- 면접 답변 주제: "VPC Endpoint 이점"

#### G-13: ELB (ALB / NLB)
- hook: 로드 밸런서가 PokéClip 트래픽 입구
- 핵심 항목: ALB vs NLB vs CLB / Listener / Target Group / Health Check / Path-based routing / Host-based routing / Sticky session / SSL termination / WebSocket 통과 / Auto-scaling 통합
- 다루지 않는 것: 일반 LB (O-7)
- PokéClip 적용: 분석 서버 LB
- 면접 답변 주제: "ALB vs NLB"

#### G-14: CloudWatch 모니터링
- hook: AWS 표준 모니터링
- 핵심 항목: Metrics / Logs / Logs Insights (쿼리) / 사용자 정의 메트릭 / Embedded Metric Format / Alarm / SNS 통합 / Dashboard / X-Ray (분산 트레이싱)
- 다루지 않는 것: Prometheus (H-8)
- PokéClip 적용: 운영 모니터링
- 면접 답변 주제: "메트릭 vs 로그"

#### G-15: Auto-scaling
- hook: 트래픽 변동 대응
- 핵심 항목: Auto Scaling Group / Launch Template / Scaling Policy (Target tracking/Step/Scheduled) / Health Check / LB 연동 / Cooldown / Lifecycle Hooks / Lambda Concurrency / DynamoDB On-demand
- 다루지 않는 것: 비용 (G-17)
- PokéClip 적용: 방송 트래픽 대응
- 면접 답변 주제: "Auto-scaling 정책"

#### G-16: ECR + ECS 개요
- hook: AWS 컨테이너 표준
- 핵심 항목: ECR (이미지 레지스트리) / 이미지 푸시 / 라이프사이클 정책 / ECS (Cluster/Service/Task) / Fargate vs EC2 launch / Task Definition / Service Discovery / ECS vs EKS / Fargate 비용
- 다루지 않는 것: Kubernetes (H-7)
- PokéClip 적용: 분석 서버 컨테이너화
- 면접 답변 주제: "ECS vs EKS"

#### G-17: 비용 최적화 + FinOps
- hook: 비용 통제 안 하면 폭주
- 핵심 항목: Cost Explorer / Budgets / 태깅 전략 / Reserved Instances / Savings Plans / Spot 패턴 / 데이터 전송 비용 함정 / S3 lifecycle / Lambda 메모리 튜닝 / 미사용 리소스 정리 / Trusted Advisor / FinOps 3단계 (Inform/Optimize/Operate)
- 다루지 않는 것: 비즈니스 FinOps
- PokéClip 적용: 운영 비용 통제
- 면접 답변 주제: "AWS 비용 절감 경험"

---

### H. DevOps (11 시리즈)

**갯수 근거**: Docker(4) + CI/CD(1) + 컨테이너 오케스트레이션(2) + 모니터링/로깅/알람(3) + IaC(1). 백엔드 입사 면접 자주.

#### H-1: Docker 개념 + 첫 컨테이너
- hook: 컨테이너 = 백엔드 표준
- 핵심 항목: 컨테이너 vs VM / Docker 설치 / 이미지 vs 컨테이너 / docker run/ps/stop/start/rm / pull/push / Docker Hub / 라이프사이클 / 포트 매핑 / 볼륨 / 환경 변수
- 다루지 않는 것: Dockerfile (H-2)
- PokéClip 적용: 분석 서버 컨테이너화 출발
- 면접 답변 주제: "컨테이너 vs VM"

#### H-2: Dockerfile 깊이
- hook: 이미지 정의의 코드
- 핵심 항목: Dockerfile 문법 / FROM / RUN / COPY vs ADD / ENV / WORKDIR / EXPOSE / ENTRYPOINT vs CMD / Multi-stage build / Layer 캐싱 / .dockerignore / 이미지 크기 줄이기 / 보안 (non-root) / Python 베이스 (slim/alpine) / GPU 이미지
- 다루지 않는 것: Compose (H-3)
- PokéClip 적용: PokéClip Dockerfile
- 면접 답변 주제: "Multi-stage / 이미지 크기"

#### H-3: Docker Compose
- hook: 로컬 멀티 컨테이너 표준
- 핵심 항목: docker-compose.yml 문법 / services / volumes / networks / depends_on / 환경 변수 (.env) / 빌드 vs 이미지 / Health check / Override 파일 / 한계
- 다루지 않는 것: K8s (H-7)
- PokéClip 적용: 로컬 개발 환경
- 면접 답변 주제: "Compose vs K8s"

#### H-4: 컨테이너 레지스트리
- hook: 이미지 저장소
- 핵심 항목: Docker Hub / GitHub Container Registry / AWS ECR / 이미지 태그 전략 / 이미지 스캔 / Pull rate limit / Private vs Public / aws ecr get-login-password / 라이프사이클
- 다루지 않는 것: CI/CD 통합 (H-5)
- PokéClip 적용: 이미지 저장
- 면접 답변 주제: "이미지 태그 전략"

#### H-5: GitHub Actions CI/CD
- hook: push → 테스트 → 배포 자동
- 핵심 항목: CI vs CD / 워크플로우 YAML / Trigger (push/PR/schedule) / Job / Step / Action / Matrix build / Secrets / Cache / Artifact / Reusable workflow / OIDC AWS 인증 / 빌드-테스트-배포 흐름
- 다루지 않는 것: 다른 CI 도구
- PokéClip 적용: PokéClip CI/CD
- 면접 답변 주제: "CI/CD 흐름"

#### H-6: ECS 깊이
- hook: AWS 컨테이너 오케스트레이션
- 핵심 항목: ECS 깊이 (Cluster/Service/Task/Task Definition) / Fargate vs EC2 launch / Auto Scaling / Service Discovery / CloudMap / Capacity Provider / Spot 통합 / ECS Blue/Green
- 다루지 않는 것: K8s (H-7)
- PokéClip 적용: 분석 서버 운영
- 면접 답변 주제: "ECS 운영"

#### H-7: Kubernetes 입문 (EKS)
- hook: K8s가 컨테이너 산업 표준
- 핵심 항목: K8s 개념 (Pod/Service/Deployment/Namespace/ConfigMap/Secret/Ingress) / kubectl / Helm 개요 / EKS 클러스터 / Node Group / IAM Role for Service Accounts (IRSA) / 컨테이너 보안
- 다루지 않는 것: K8s 깊이 (별도)
- PokéClip 적용: 운영 단계
- 면접 답변 주제: "K8s 기본 / Pod / Deployment"

#### H-8: Prometheus + Grafana
- hook: 표준 모니터링 스택
- 핵심 항목: Prometheus 모델 (Pull) / 메트릭 타입 (Counter/Gauge/Histogram/Summary) / PromQL 기본 / Exporter / Service Discovery / Grafana 대시보드 / 알람 (Alertmanager) / 분산 트레이싱 개요 (OpenTelemetry)
- 다루지 않는 것: 로깅 (H-9)
- PokéClip 적용: 분석 메트릭
- 면접 답변 주제: "Prometheus vs CloudWatch"

#### H-9: 로깅 (ELK / Loki)
- hook: 대규모 로그는 grep 안 됨
- 핵심 항목: ELK Stack (Elasticsearch/Logstash/Kibana) / Loki 비교 / 로그 수집 (Fluentd/Vector) / 구조화 로깅 (JSON) / 인덱스 관리 / 검색 / 시각화 / 보존 정책 / 비용 / AWS OpenSearch
- 다루지 않는 것: 검색 엔진 깊이
- PokéClip 적용: 로그 집중화
- 면접 답변 주제: "로그 집중화"

#### H-10: 알람 + Postmortem
- hook: 운영 문화의 표준
- 핵심 항목: 알람 분류 (P0/P1/P2) / On-call 로테이션 / PagerDuty / Slack 통합 / 알람 라우팅 / 알람 피로 / Runbook 작성 / Postmortem 문화 / Blameless culture / Action item 트래킹
- 다루지 않는 것: SRE 조직 깊이
- PokéClip 적용: 운영 알람 설계
- 면접 답변 주제: "Postmortem 경험"

#### H-11: Terraform IaC
- hook: 인프라 = 코드
- 핵심 항목: IaC 개념 / Terraform vs CloudFormation vs CDK / Provider / Resource / Variable / Output / State 파일 / Backend (S3 + DynamoDB lock) / Module / Plan / Apply / Workspace / Drift 감지
- 다루지 않는 것: 모듈 설계 깊이
- PokéClip 적용: 인프라 코드화
- 면접 답변 주제: "IaC / Terraform State"

---

### I. 점수/신호 알고리즘 (8 시리즈)

**갯수 근거**: PokéClip 특수 영역. 8개가 신호처리 입문→Peak Detection→융합→자체 함수→클립 추출까지 자연. 더 늘리면 학술적, 더 줄이면 PokéClip 부족.

#### I-1: 신호 처리 기초
- hook: 음성/영상/채팅 모두 시계열
- 핵심 항목: 신호란 / 이산 vs 연속 / 샘플링 / Nyquist / 양자화 / 시간 영역 vs 주파수 영역 / FFT 직관 (수학 깊이 X) / 노이즈 / SNR / 시계열 특성
- 다루지 않는 것: 수학 증명 / FFT 알고리즘
- PokéClip 적용: 신호 처리 기반
- 면접 답변 주제: "샘플링 정리"

#### I-2: 슬라이딩 윈도우 + 통계
- hook: PokéClip 5초 단위 점수 출발
- 핵심 항목: Fixed vs Sliding / 윈도우 크기 결정 / 윈도우 통계 (mean/std/min/max/percentile) / 누적 통계 (running mean / Welford) / 효율적 구현 (deque) / Online vs Batch
- 다루지 않는 것: 시계열 모델
- PokéClip 적용: 5초 윈도우 점수
- 면접 답변 주제: "Sliding Window 패턴"

#### I-3: 스무딩 + 이동 평균
- hook: 노이즈 줄이고 추세 추출
- 핵심 항목: SMA / WMA / EMA / Savitzky-Golay / Median filter / Gaussian smoothing / 윈도우 크기 vs 지연 트레이드오프 / Causal vs Non-causal
- 다루지 않는 것: Kalman filter
- PokéClip 적용: 채팅 점수 스무딩
- 면접 답변 주제: "이동 평균 종류"

#### I-4: Peak Detection
- hook: 하이라이트 추출의 핵심
- 핵심 항목: Peak 정의 / 단순 임계 / Local maxima / scipy.signal.find_peaks / prominence / distance / height 파라미터 / 다중 peak / Peak vs noise
- 다루지 않는 것: 딥러닝 이상 탐지
- PokéClip 적용: 임계 초과 시점 추출
- 면접 답변 주제: "Peak Detection"

#### I-5: 임계값 + 정규화 (방법 B)
- hook: 절대값 X. 상대값 정답
- 핵심 항목: 정규화 (Min-Max/Z-score/Robust) / 상대값 vs 절대값 / 누적 평균 baseline / 동적 임계 / Adaptive threshold / Otsu method / 첫 N 구간 cold start
- 다루지 않는 것: 분포 추정 깊이
- PokéClip 적용: 방법 B 정규화 / 30분 cold start
- 면접 답변 주제: "Adaptive threshold"

#### I-6: 신호 융합 + 가중치
- hook: 여러 신호 합쳐서 한 점수
- 핵심 항목: 가중 합 / 가중 평균 / 곱셈 결합 / Logical OR (max) / AND (min) / 베이지안 융합 개요 / Sensor fusion 패턴 / 가중치 결정 (그리드 서치 / 베타 튜닝) / 신호 상관관계
- 다루지 않는 것: 머신러닝 융합
- PokéClip 적용: 영상/음성/채팅 융합
- 면접 답변 주제: "신호 융합"

#### I-7: E Hybrid Voting (자체 함수)
- hook: PokéClip 핵심 알고리즘
- 핵심 항목: E Hybrid 정의 / 임계값별 hit 계산 / 다수결 / 가중 다수결 / Soft voting vs Hard voting / 신호 간 시간 정렬 / 채팅 딜레이 보정 / 시뮬레이션 / 베타 튜닝
- 다루지 않는 것: 신경망 융합
- PokéClip 적용: 자체 함수 설계
- 면접 답변 주제: "자체 점수 함수 설계 경험"

#### I-8: 클립 경계 추출 알고리즘
- hook: 시점은 점, 클립은 구간
- 핵심 항목: 이벤트 경계 감지 / Derivative 기반 / 0 교차 / Hysteresis threshold / 최소/최대 클립 길이 제약 / 인접 클립 병합 / 클립 padding
- 다루지 않는 것: 영상 편집
- PokéClip 적용: 10~90초 클립 자동 추출
- 면접 답변 주제: "이벤트 경계 감지"

---

### J. 시스템 디자인 (7 시리즈)

**갯수 근거**: 면접 표준 영역. 기초+패턴별 5개+면접 메타 1개=7. 패턴별 사례는 5개가 자연.

#### J-1: 기초 + 면접 방법론
- hook: 면접 단골 영역
- 핵심 항목: 요구사항 수집 (기능/비기능) / Capacity Estimation (DAU/QPS/저장량) / 컴포넌트 식별 / 데이터 모델 / API 설계 / 스케일링 / 트레이드오프 토론 / BLUF 패턴
- 다루지 않는 것: 구체 시스템
- PokéClip 적용: 자기 프로젝트 답변 방법론
- 면접 답변 주제: "시스템 디자인 방법론"

#### J-2: URL Shortener
- hook: 입문 패턴
- 핵심 항목: 요구사항 / Capacity / Hash vs Counter / 충돌 / Base62 / DB 스키마 / Read-heavy / 캐싱 / Rate limiting / 분석 / Custom alias
- 다루지 않는 것: 다른 시스템
- PokéClip 적용: 시스템 디자인 답변 패턴
- 면접 답변 주제: "URL Shortener 설계"

#### J-3: 채팅 서비스
- hook: 치지직 채팅의 직관
- 핵심 항목: 요구사항 / WebSocket / 메시지 영속화 / Message Queue / Online presence / Read receipt / Message ordering / 분산 채팅 (Sticky session/Pub-sub) / 모바일 푸시
- 다루지 않는 것: WebRTC
- PokéClip 적용: 치지직 채팅 직관
- 면접 답변 주제: "채팅 서비스 설계"

#### J-4: 라이브 스트리밍 플랫폼 (Twitch 클론)
- hook: 치지직 면접 직격
- 핵심 항목: 송출 (RTMP/SRT/WebRTC) / 인제스트 / 트랜스코딩 / CDN / 채팅 / VOD / 추천 / 광고 / 결제 / Capacity / 분산 / 비용 모델
- 다루지 않는 것: 추천 깊이 (J-5)
- PokéClip 적용: PokéClip 위 플랫폼 직관
- 면접 답변 주제: "라이브 스트리밍 설계"

#### J-5: 추천 시스템
- hook: 시스템 + AI 결합
- 핵심 항목: 종류 (Content-based/Collaborative/Hybrid) / Cold Start / Implicit vs Explicit / 오프라인 학습 + 온라인 추론 / Feature Store / A/B 테스트 / 다양성 vs 정확도 / Two-tower 모델
- 다루지 않는 것: 강화학습
- PokéClip 적용: 향후 클립 추천 (선택)
- 면접 답변 주제: "추천 시스템 설계"

#### J-6: 클립 추출 / 비디오 분석 파이프라인
- hook: PokéClip류 일반화
- 핵심 항목: 비디오 분석 시스템 요구사항 / 스트리밍 입력 / GPU 분석 클러스터 / 결과 저장 / 클립 추출 / 메타데이터 검색 / 다중 모달 / 비용 모델 / 확장 시나리오
- 다루지 않는 것: 다른 시스템
- PokéClip 적용: 면접 답변 흐름
- 면접 답변 주제: "PokéClip 자체 설명"

#### J-7: 면접 답변 패턴
- hook: 알아도 답변 못 하면 의미 없음
- 핵심 항목: Capacity Estimation 공식 / 트레이드오프 설명 / 화이트보드 활용 / Clarifying questions / "왜 선택" / 후속 대응 / 시간 분배 / Mock interview
- 다루지 않는 것: 구체 시스템
- PokéClip 적용: 면접 답변 메타
- 면접 답변 주제: "시스템 디자인 면접 메타"

---

### K. 분산 시스템 (5 시리즈)

**갯수 근거**: 시니어 면접 영역. CAP+일관성+합의+이벤트소싱+분산트랜잭션 = 5개 핵심만. 더 가면 학술적.

#### K-1: 분산 시스템 기초 (CAP / FLP / 시계)
- hook: 시니어 백엔드 필수
- 핵심 항목: 8 Fallacies / CAP 정리 / FLP Impossibility / PACELC / 시계 동기화 (NTP) / Lamport timestamps / Vector clock / Idempotency / Heartbeat
- 다루지 않는 것: 구체 알고리즘
- PokéClip 적용: 분산 사고 기반
- 면접 답변 주제: "CAP / 시계 동기화"

#### K-2: 일관성 모델
- hook: 일관성 강도가 성능 결정
- 핵심 항목: Strong / Linearizability / Sequential / Causal / Eventual / Read-your-writes / Monotonic reads / Bounded staleness / 일관성 vs 가용성 / 일관성 vs 지연
- 다루지 않는 것: 합의 (K-3)
- PokéClip 적용: DB 선택 시 일관성
- 면접 답변 주제: "Strong vs Eventual"

#### K-3: 합의 알고리즘 (Raft)
- hook: 분산의 심장
- 핵심 항목: 왜 합의 어려운가 / Paxos 개요 / Raft 동기 (Leader/Follower/Candidate) / Term / Log replication / Leader election / Safety / Liveness / Split brain / 멤버십 변경 / Snapshot
- 다루지 않는 것: Paxos 깊이 / BFT
- PokéClip 적용: 분산 기반 직관
- 면접 답변 주제: "Raft 동작"

#### K-4: 이벤트 소싱 + CQRS
- hook: 변경 이력 전체 보존
- 핵심 항목: CRUD vs Event Sourcing / Event Store / Aggregate / Projection / Snapshot / Replay / CQRS / Read Model 분리 / 일관성 / Kafka/EventStoreDB 패턴 / 트레이드오프
- 다루지 않는 것: DDD 깊이
- PokéClip 적용: 점수 시계열 이벤트 모델
- 면접 답변 주제: "이벤트 소싱"

#### K-5: 분산 트랜잭션 (Saga / 2PC)
- hook: 마이크로서비스 ACID 불가
- 핵심 항목: 2PC / 3PC / Saga 패턴 / Choreography vs Orchestration / Compensating transaction / 멱등성 / Outbox 패턴 / Inbox 패턴 / 이벤트 기반 일관성
- 다루지 않는 것: XA Protocol
- PokéClip 적용: 분석→저장→알림 트랜잭션
- 면접 답변 주제: "Saga / 2PC 한계"

---

### L. 보안/인증 (6 시리즈)

**갯수 근거**: TLS+JWT+OAuth+토큰관리/비밀+키패턴+API보안 = 6개 핵심. 인증 표준 + 보안 패턴 다 커버.

#### L-1: HTTPS + TLS
- hook: 웹 통신의 기본 보안
- 핵심 항목: 대칭 vs 비대칭 / TLS Handshake / 인증서 (Certificate) / CA / Let's Encrypt / 인증서 체인 / SAN / TLS 1.2 vs 1.3 / Perfect Forward Secrecy / HSTS / Mixed content
- 다루지 않는 것: TLS 프로토콜 깊이 (O-8)
- PokéClip 적용: 모든 API HTTPS
- 면접 답변 주제: "TLS Handshake"

#### L-2: 세션 vs JWT
- hook: 인증 방식 선택
- 핵심 항목: 세션 기반 / Server-side session / Cookie / Session store / JWT (Header/Payload/Signature) / 서명 알고리즘 (HS256/RS256) / Stateless 인증 / 무효화 어려움 / 보안 함정 (alg none)
- 다루지 않는 것: OAuth (L-3)
- PokéClip 적용: 인증 시스템
- 면접 답변 주제: "세션 vs JWT"

#### L-3: OAuth 2.0 + OIDC
- hook: 소셜 로그인 표준
- 핵심 항목: OAuth 2.0 흐름 (Authorization Code/Implicit/Client Credentials/Refresh/Device) / Authorization Server vs Resource Server / Access vs ID Token / Scope / PKCE / OIDC / 한국 소셜 (네이버/카카오)
- 다루지 않는 것: SAML
- PokéClip 적용: 소셜 로그인 (선택)
- 면접 답변 주제: "OAuth 흐름"

#### L-4: 토큰 관리 + 비밀 관리
- hook: Refresh / Rotation / 비밀 저장
- 핵심 항목: Access Token 수명 / Refresh Token / Rotation 패턴 / Reuse detection / 저장 위치 (Cookie httpOnly/Memory) / 무효화 / AWS Secrets Manager / Parameter Store / Vault / 비밀 회전 / Hardcoded secret 스캐닝 (gitleaks)
- 다루지 않는 것: SSO 깊이
- PokéClip 적용: 인증 + 키 관리
- 면접 답변 주제: "Refresh Token / 비밀 관리"

#### L-5: 스트림 키 / API 키 패턴
- hook: 사용자별 키 발급
- 핵심 항목: API Key 발급 흐름 / Key vs Token / Key 저장 (해시 vs 평문) / Rate limiting per key / 만료/회수 / Rotation / Audit log / Webhook 서명 검증 / Stream key 일회성
- 다루지 않는 것: OAuth (L-3)
- PokéClip 적용: 스트림 키 시스템
- 면접 답변 주제: "API Key 관리"

#### L-6: API 보안 (Rate Limit / OWASP)
- hook: API는 공격 표면 1순위
- 핵심 항목: Rate Limiting (Token bucket / Leaky bucket) / CORS / CSRF / SQL Injection / XSS / 입력 검증 / 에러 메시지 누출 / 보안 헤더 (CSP/HSTS) / OWASP Top 10
- 다루지 않는 것: 모바일 보안
- PokéClip 적용: API 보안
- 면접 답변 주제: "OWASP Top 10"

---

### N. 운영체제 (6 시리즈)

**갯수 근거**: 백엔드 면접 단골. 프로세스/메모리/스케줄링/동기화/파일/IO = 6 핵심.

#### N-1: 프로세스 + 스레드
- hook: 백엔드 면접 단골
- 핵심 항목: 프로세스 정의 / 상태 / PCB / Context switch / fork() / exec() / 좀비/고아 / 스레드 / 사용자 vs 커널 스레드 / 멀티스레드 장단점 / 비교
- 다루지 않는 것: Python GIL (B-11)
- PokéClip 적용: 워커 설계 직관
- 면접 답변 주제: "프로세스 vs 스레드"

#### N-2: 메모리 관리
- hook: OOM 방지 / 성능
- 핵심 항목: 가상 메모리 / 페이지 / 페이지 테이블 / Page fault / Swap / TLB / malloc / heap / 스택 vs 힙 / Python GC / 메모리 누수 패턴 / mmap
- 다루지 않는 것: 컴구조 (P)
- PokéClip 적용: OOM 방지
- 면접 답변 주제: "가상 메모리 / Stack vs Heap"

#### N-3: 스케줄링
- hook: OS의 프로세스 분배
- 핵심 항목: 스케줄링 종류 (FCFS/SJF/Priority/Round Robin/Multilevel) / Preemptive vs Non-preemptive / CFS / Linux nice / I/O bound vs CPU bound / 우선순위 역전
- 다루지 않는 것: 실시간 OS
- PokéClip 적용: 분석 작업 스케줄링 직관
- 면접 답변 주제: "Linux 스케줄링"

#### N-4: 동기화 + 락 + 데드락
- hook: 멀티스레드의 함정
- 핵심 항목: Race condition / Critical section / Mutex / Semaphore / Spinlock / Read-write lock / 데드락 4조건 / 데드락 방지 / Lock-free / CAS / Monitor 개념
- 다루지 않는 것: 분산 락 (F-12)
- PokéClip 적용: 동시성 제어
- 면접 답변 주제: "데드락 / Mutex vs Semaphore"

#### N-5: 파일 시스템
- hook: 파일 IO 병목 직관
- 핵심 항목: 파일 시스템 구조 (Inode/디렉토리/블록) / ext4 / XFS / Symbolic vs Hard link / 권한 / 파일 디스크립터 / Buffered IO / Direct IO / Page cache / fsync
- 다루지 않는 것: 분산 파일 시스템
- PokéClip 적용: 영상 IO 최적화
- 면접 답변 주제: "파일 시스템 캐싱"

#### N-6: I/O + epoll/kqueue
- hook: 비동기 IO의 OS 레벨
- 핵심 항목: Blocking vs Non-blocking / Synchronous vs Asynchronous / I/O 모델 5가지 / select / poll / epoll / kqueue / io_uring 개요 / Reactor 패턴 / Event loop 구현
- 다루지 않는 것: 커널 깊이
- PokéClip 적용: FastAPI/asyncio OS 기반
- 면접 답변 주제: "epoll / C10K"

---

### O. 네트워크 깊이 (9 시리즈)

**갯수 근거**: 백엔드 면접 핵심. OSI+TCP+UDP+HTTP진화+WebSocket프로토콜+DNS/CDN+LB+TLS프로토콜+보안 = 9 자연.

#### O-1: OSI 다시 보기
- hook: 학교 들었지만 실전 적용
- 핵심 항목: 7계층 vs TCP/IP 4계층 / 각 계층 역할 / 캡슐화 / 프레임/패킷/세그먼트/데이터그램 / 실전 디버깅에서 어느 계층 보나
- 다루지 않는 것: 각 프로토콜 (O-2부터)
- PokéClip 적용: 네트워크 진단 기반
- 면접 답변 주제: "OSI"

#### O-2: TCP 깊이
- hook: 면접 가장 많이 물어봄
- 핵심 항목: TCP 특징 / 3-way / 4-way handshake / 상태 다이어그램 / 헤더 (Sequence/ACK/Window) / 흐름 제어 / 혼잡 제어 (Slow start/Congestion avoidance/Fast retransmit/Fast recovery) / TIME_WAIT / Nagle / Keepalive / SYN flood
- 다루지 않는 것: HTTP (O-4)
- PokéClip 적용: 진단
- 면접 답변 주제: "TCP handshake / TIME_WAIT"

#### O-3: UDP + QUIC
- hook: UDP + 신뢰성 = QUIC
- 핵심 항목: UDP 특징 / TCP vs UDP / UDP 사용 사례 / QUIC 개요 / QUIC vs TCP+TLS / 0-RTT / 멀티플렉싱 / HOL blocking 해결 / HTTP/3 = QUIC
- 다루지 않는 것: SRT (영상 트랙)
- PokéClip 적용: 영상 SRT 직관 보강
- 면접 답변 주제: "QUIC 배경"

#### O-4: HTTP 진화 (1.1 → 2 → 3)
- hook: 매 버전 성능 도약
- 핵심 항목: HTTP/1.1 한계 (HOL/헤더 중복) / HTTP/2 (멀티플렉싱/HPACK/Server Push) / HTTP/3 (QUIC/0-RTT) / 마이그레이션 / 디버깅 (curl --http2)
- 다루지 않는 것: gRPC
- PokéClip 적용: API 프로토콜 선택
- 면접 답변 주제: "HTTP/2 vs HTTP/3"

#### O-5: WebSocket 프로토콜 (RFC 6455 레벨)
- hook: E-3 활용 위에 RFC 레벨 깊이
- 핵심 항목: HTTP Upgrade 흐름 / Sec-WebSocket-Key / Sec-WebSocket-Accept / 프레임 구조 (FIN/Opcode/Mask/Payload) / Ping/Pong / Close 프레임 / 확장 (permessage-deflate) / 서브프로토콜 / 보안 (wss://)
- 다루지 않는 것: WebSocket 활용 (E-3)
- PokéClip 적용: 채팅 WebSocket 프로토콜 디버깅
- 면접 답변 주제: "WebSocket Handshake"

#### O-6: DNS + CDN
- hook: 백엔드 관점 깊이
- 핵심 항목: DNS 계층 / 레코드 (A/AAAA/CNAME/MX/TXT/NS/SOA) / Recursive vs Iterative / TTL / DNS 캐싱 / DNS-over-HTTPS / CDN 동작 (Edge/Origin) / Anycast / GeoDNS
- 다루지 않는 것: CDN 영상 깊이 (4-X 완료)
- PokéClip 적용: 도메인 운영
- 면접 답변 주제: "DNS / CDN"

#### O-7: 로드 밸런서 + 프록시
- hook: 대규모 시스템 정문
- 핵심 항목: L4 vs L7 / Round Robin / Weighted / Least connections / Sticky session / Reverse proxy / Forward proxy / Nginx / HAProxy / Health check / SSL termination / WebSocket 통과
- 다루지 않는 것: AWS ELB (G-13)
- PokéClip 적용: 인프라 입구
- 면접 답변 주제: "L4 vs L7"

#### O-8: TLS 프로토콜 깊이
- hook: L-1 위에 RFC 레벨
- 핵심 항목: TLS 1.2 vs 1.3 handshake 차이 / 0-RTT 보안 / Cipher Suite / Forward Secrecy / Session resumption / OCSP Stapling / Certificate Transparency / SNI / mTLS
- 다루지 않는 것: 암호 알고리즘 깊이
- PokéClip 적용: 보안 깊이
- 면접 답변 주제: "TLS 1.3 / mTLS"

#### O-9: 네트워크 보안
- hook: 운영 단계 필수
- 핵심 항목: 방화벽 / IDS / IPS / WAF / DDoS 종류 / 완화 (Rate limit/GeoIP/Captcha) / SSL Strip / MitM / 인증서 핀닝 / VPN 종류
- 다루지 않는 것: 보안 (L)
- PokéClip 적용: 네트워크 보안
- 면접 답변 주제: "DDoS 대응"

---

### P. 컴퓨터 구조 (3 시리즈)

**갯수 근거**: 면접 가끔. 보조 트랙. CPU/메모리/GPU 3개로 충분. 더 가면 학술적.

#### P-1: CPU + 캐시
- hook: 성능 직관
- 핵심 항목: CPU 구조 (ALU/Register/Cache) / 파이프라이닝 / 슈퍼스칼라 / 분기 예측 / Out-of-order / 캐시 (L1/L2/L3) / 캐시 라인 / 캐시 미스 / Cache locality / False sharing
- 다루지 않는 것: 어셈블리
- PokéClip 적용: 성능 직관
- 면접 답변 주제: "캐시 미스"

#### P-2: 메모리 계층 + Latency Numbers
- hook: 100배 차이 직관
- 핵심 항목: 메모리 계층 (Register/L1/L2/L3/RAM/SSD/HDD) / 접근 지연 (cycle) / Latency Numbers / DRAM vs SRAM / ECC / NUMA / Memory bandwidth / 디스크 (HDD/SSD/NVMe)
- 다루지 않는 것: GPU 메모리 (P-3)
- PokéClip 적용: 비용/성능 직관
- 면접 답변 주제: "Latency Numbers"

#### P-3: GPU 구조 + CUDA 개요
- hook: AI 직관 보강
- 핵심 항목: GPU vs CPU 구조 / SIMD vs SIMT / CUDA 모델 (Grid/Block/Thread/Warp) / GPU 메모리 (Global/Shared/Register) / Memory coalescing / Tensor Core / 행렬 곱이 빠른 이유
- 다루지 않는 것: CUDA 프로그래밍
- PokéClip 적용: GPU 직관
- 면접 답변 주제: "GPU가 AI에 강한 이유"

---

### Q. 자료구조/알고리즘 면접용 (8 시리즈)

**갯수 근거**: 코테는 별도 학습. 강의는 면접 단골 깊이만. 배열/스택큐/해시/트리/그래프/정렬/DP+그리디/복잡도 = 8 자연.

#### Q-1: 배열 + 링크드 리스트
- hook: 가장 기본
- 핵심 항목: 배열 (정적/동적) / 시간 복잡도 / 메모리 연속성 / Python list 내부 / 링크드 리스트 (단일/이중/원형) / Iterator / 캐시 친화도
- 다루지 않는 것: 코테
- PokéClip 적용: 자료구조 선택 직관
- 면접 답변 주제: "배열 vs 링크드 리스트"

#### Q-2: 스택 + 큐 + 덱
- hook: 응용 많음
- 핵심 항목: 스택 (LIFO) / 큐 (FIFO) / 덱 / 우선순위 큐 / 원형 큐 / Python (list/deque) / 응용 (괄호/함수 호출/BFS/DFS) / 복잡도
- 다루지 않는 것: 힙 (Q-4)
- PokéClip 적용: 큐 직관
- 면접 답변 주제: "스택 응용"

#### Q-3: 해시 테이블
- hook: 가장 많이 쓰는 자료구조
- 핵심 항목: 해시 함수 / 충돌 / Chaining vs Open addressing / Linear/Quadratic/Double hashing / 로드 팩터 / Rehashing / Python dict 내부 / 해시 충돌 공격 / 해시 vs 트리
- 다루지 않는 것: 분산 해시
- PokéClip 적용: dict 직관
- 면접 답변 주제: "해시 충돌 / dict 내부"

#### Q-4: 트리 + 힙
- hook: BST/AVL/B-tree/힙 면접 단골
- 핵심 항목: 이진 트리 / BST / 균형 트리 (AVL/Red-Black) / B-tree (DB 인덱스) / 순회 (전위/중위/후위/레벨) / Trie / 힙 (Max/Min) / heapify / Python heapq / Top-K
- 다루지 않는 것: 그래프 (Q-5)
- PokéClip 적용: DB 인덱스 / Top-K
- 면접 답변 주제: "B-tree가 DB에 / 힙 응용"

#### Q-5: 그래프 + 탐색
- hook: 그래프 못 풀면 시니어 어려움
- 핵심 항목: 표현 (인접 행렬/리스트) / 방향/가중치 / BFS / DFS / 위상 정렬 / 사이클 감지 / 연결 요소 / 다익스트라 / 벨만-포드 / Floyd-Warshall / MST (Kruskal/Prim)
- 다루지 않는 것: 네트워크 플로우
- PokéClip 적용: 의존 그래프 직관
- 면접 답변 주제: "BFS vs DFS"

#### Q-6: 정렬 알고리즘
- hook: Python sort 내부 자주 물어봄
- 핵심 항목: Bubble / Selection / Insertion / Merge / Quick / Heap / Radix / Bucket / Counting / 복잡도 / 안정성 / In-place / Python Timsort / 비교 vs 비비교
- 다루지 않는 것: 외부 정렬
- PokéClip 적용: 정렬 선택
- 면접 답변 주제: "Quick vs Merge / Timsort"

#### Q-7: 동적 계획법 + 그리디
- hook: 면접 가장 어려운 영역
- 핵심 항목: DP 개념 / Memoization vs Tabulation / 점화식 / 1D/2D DP / 비트마스킹 DP / 그리디 정의 / 최적 부분 구조 / 그리디 증명 / 대표 그리디 (활동/허프만/MST)
- 다루지 않는 것: 코테
- PokéClip 적용: 알고리즘 직관
- 면접 답변 주제: "DP 패턴 / 그리디 정답"

#### Q-8: 복잡도 분석
- hook: Big-O 모르면 면접 진행 X
- 핵심 항목: Big-O / Big-Theta / Big-Omega / 시간 복잡도 / 공간 복잡도 / Amortized / 점화식 분석 / 마스터 정리 / Python 자료구조별 복잡도
- 다루지 않는 것: P vs NP
- PokéClip 적용: 알고리즘 선택 기준
- 면접 답변 주제: "Big-O"

---

## 3. 트랙별 시리즈 분포 자기 점검

| 트랙 | 갯수 | 본질 점검 |
|---|---|---|
| A | 5 | 일상 도구 5개 ✓ |
| B | 15 | Python 전 영역 ✓ |
| C | 8 | AI 입문 흐름 ✓ |
| D | 22 | PokéClip 핵심 + 입사 ✓ |
| E | 13 | 백엔드 전 영역 ✓ |
| F | 12 | DB 전 영역 ✓ |
| G | 17 | AWS 광범 ✓ |
| H | 11 | DevOps 표준 ✓ |
| I | 8 | 신호+점수+클립 ✓ |
| J | 7 | 면접 패턴 ✓ |
| K | 5 | 분산 핵심만 ✓ |
| L | 6 | 인증+보안 ✓ |
| N | 6 | OS 면접 ✓ |
| O | 9 | 네트워크 면접 ✓ |
| P | 3 | 보조 ✓ |
| Q | 8 | DSA 면접용 ✓ |

분포 3~22. 5~14 박스 깨짐. 작은 트랙(P=3) / 큰 트랙(D=22) 자연 분포. 트랙마다 갯수 근거 명시.

총 155 시리즈.

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

매번 cat:
- `lesson-planner` → `pokeclip_context.md` + `curriculum_master.md` + `curriculum_progress.json`
- `lesson-author` → 동일 3개 + 선행 강의
- `lesson-quality-guard` → `pokeclip_context.md` + 작성된 강의
- `curriculum-quality-guard` → `pokeclip_context.md` + 입력 파일

새 결정/제약 추가 시 누적 기록.
