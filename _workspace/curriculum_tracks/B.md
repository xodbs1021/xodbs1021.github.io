### B. Python (8 시리즈)

**갯수 근거**: AI 시대 — Python syntax는 AI가 짜줌. 사람이 이해해야 하는 *개념* (비동기/타입/테스트/디버깅) 중심으로 8개. 15에서 8로 슬림. 자료구조+OOP, 동시성+멀티프로세싱+asyncio 통합으로 압축.

#### B-1: 입문 (syntax 핵심 + 환경)
- hook: AI가 짠 Python 코드 *읽기*가 가능해야. 가상환경 / 패키지 의존성은 직접 통제
- 핵심 다룰 항목: 설치 (pyenv) / 인터프리터 / 변수와 타입 / 기본 자료형 (list/tuple/set/dict/str) / 제어문 / 함수 기본 / f-string / PEP 8 / 가상환경 (venv/poetry/uv) / pip / requirements.txt
- 다루지 않는 것: 자료구조 깊이 (B-2) / OOP (B-2) / 표준 라이브러리 (B-3)
- PokéClip 적용: 모든 Python 코드의 출발 / venv 격리
- 면접 답변 주제: 없음 (입문)

#### B-2: 자료구조 + 함수 + OOP 통합
- hook: AI가 짠 코드의 자료구조 선택이 맞는지 *판단*. OOP는 PyTorch/FastAPI 클래스 이해의 기반
- 핵심 다룰 항목: List/Dict comprehension / collections (Counter/defaultdict/deque) / heapq / 함수 깊이 (*args/**kwargs/lambda/클로저/데코레이터) / 클래스 / 상속 / property / 매직 메서드 (__str__/__repr__/__eq__/__hash__/context manager) / dataclass vs Pydantic
- 다루지 않는 것: 타입 힌트 (B-6) / 비동기 (B-5)
- PokéClip 적용: 분석 엔진 클래스 설계 / 점수 데이터 처리
- 면접 답변 주제: "Counter/defaultdict 활용" / "@property 언제" / "데코레이터 동작"

#### B-3: 표준 라이브러리 깊이
- hook: 외부 패키지 없이 70% 작업 가능. 면접 빈출
- 핵심 다룰 항목: os/sys/pathlib / json / datetime/timezone / itertools / functools (lru_cache/partial) / random / hashlib / uuid / shutil / subprocess / argparse / logging
- 다루지 않는 것: 동시성 (B-5) / 외부 라이브러리
- PokéClip 적용: 파일/로깅/해시/인자 처리
- 면접 답변 주제: "subprocess vs os.system" / "logging vs print 차이"

#### B-4: 에러 처리 + 로깅 + 디버깅
- hook: AI 출력의 에러 원인 파악 = 시니어와 주니어 갈림. 프로덕션 안정성의 핵심
- 핵심 다룰 항목: try/except/else/finally / 예외 계층 / 커스텀 예외 / 예외 체이닝 (raise from) / traceback 읽기 / logging Handler/Formatter/Level / Structured logging (JSON) / pdb/ipdb / VSCode 디버거 / py-spy 프로파일링 / 디버깅 마인드셋
- 다루지 않는 것: 분산 트레이싱 (H-7)
- PokéClip 적용: 분석 파이프라인 에러/로그/디버깅
- 면접 답변 주제: "프로덕션 에러 처리" / "로깅 vs 예외" / "디버깅 마인드셋"

#### B-5: 동시성 (스레드 + 프로세스 + asyncio 통합)
- hook: AI가 짠 동시성 코드의 함정 (GIL / 데드락 / 레이스) 검증은 사람 몫
- 핵심 다룰 항목: 동시성 vs 병렬성 / GIL / threading (I/O 바운드) / Lock/Semaphore / multiprocessing (CPU 바운드) / Pool / Queue / ProcessPoolExecutor / asyncio 이벤트 루프 / async/await / gather / create_task / asyncio.Queue / 비동기 함정 (blocking 호출)
- 다루지 않는 것: FastAPI 비동기 활용 (E-5)
- PokéClip 적용: 채널별 IO 동시 / 영상 분석 병렬 / 비동기 API
- 면접 답변 주제: "GIL과 스레딩" / "thread vs process 언제" / "asyncio vs threading"

#### B-6: 타입 힌트 + Pydantic
- hook: 런타임 에러 → 정적 검사. FastAPI/SQLAlchemy 필수. AI 출력의 타입 안정성 검증
- 핵심 다룰 항목: 타입 힌트 기본 / typing (List/Dict/Optional/Union/Literal/Final/Protocol/TypedDict) / Generic / mypy / pyright / Pydantic v2 / BaseModel / Field / model_validator / 검증 / serialization
- 다루지 않는 것: ORM (F-7) / FastAPI 라우터 (E-4)
- PokéClip 적용: API 요청/응답 검증 / 분석 결과 데이터 모델
- 면접 답변 주제: "Pydantic vs dataclass" / "타입 힌트 이점"

#### B-7: pytest 테스팅
- hook: AI가 짠 코드의 *동작 검증*. 테스트 없는 코드는 부서지는 코드
- 핵심 다룰 항목: 테스트 피라미드 / pytest 기본 / assert / fixture / parametrize / 마커 (skip/xfail) / mocking (unittest.mock/pytest-mock) / 커버리지 (pytest-cov) / 비동기 테스트 (pytest-asyncio) / TDD 개념
- 다루지 않는 것: 부하 테스트 / E2E
- PokéClip 적용: 분석 단위 테스트 / API 통합 테스트
- 면접 답변 주제: "테스트 짜는 법" / "mock 언제" / "TDD 경험"

#### B-8: 파일 처리 + 정규식
- hook: 로그/EDL/JSON 처리 일상. AI가 짠 정규식 패턴 검증
- 핵심 다룰 항목: open과 with / 텍스트 vs 바이너리 / 인코딩 (UTF-8/cp949) / CSV / JSON 깊이 / YAML / pathlib 깊이 / glob / re 모듈 / 정규식 패턴 (anchors/quantifiers/groups/lookahead) / 한국어 처리
- 다루지 않는 것: DB (F)
- PokéClip 적용: 분석 결과 JSON / EDL 파일 / 로그 정규식 추출
- 면접 답변 주제: "대용량 파일 처리" / "정규식 성능"
