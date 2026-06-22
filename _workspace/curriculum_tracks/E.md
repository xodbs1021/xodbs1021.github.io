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

