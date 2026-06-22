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

