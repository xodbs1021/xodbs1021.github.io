### E. 백엔드 아키텍처 (10 시리즈)

**갯수 근거**: AI 시대 — 라우터 syntax는 AI가 짜줌. 사람이 결정하는 *아키텍처 / 큐 선택 / 파이프라인 설계* 중심. 13에서 10으로 슬림 (DI/미들웨어 통합, gRPC 제거).

#### E-1: HTTP 기초
- hook: 모든 웹 백엔드의 기반
- 핵심 항목: 클라이언트-서버 / HTTP 메시지 / 메서드 (GET/POST/PUT/PATCH/DELETE) / 상태 코드 / 헤더 (Content-Type/Authorization/Cache-Control) / 쿠키 / Stateless / HTTPS 개요
- 다루지 않는 것: HTTP/2/3 (O-4) / WebSocket (E-3)
- PokéClip 적용: API 통신 기반
- 면접 답변 주제: "PUT vs PATCH / 401 vs 403"

#### E-2: REST API 설계
- hook: 백엔드 API 표준
- 핵심 항목: REST 원칙 / URI 컨벤션 / Versioning / Pagination (offset vs cursor) / Filtering / Sorting / 에러 응답 표준 (RFC 7807) / HATEOAS 개요 / REST vs RPC vs GraphQL
- 다루지 않는 것: 구현 (E-4)
- PokéClip 적용: 대시보드 API 설계
- 면접 답변 주제: "REST 원칙 / cursor pagination"

#### E-3: WebSocket 활용 + 스케일링
- hook: 실시간 통신 활용
- 핵심 항목: HTTP vs WebSocket 결정 / FastAPI WebSocket / 연결 관리 (ping/pong/재연결) / Room/Channel 패턴 / 인증 / 스케일링 (Sticky session/pub-sub backend) / SSE 비교
- 다루지 않는 것: 프로토콜 RFC 6455 (O-5)
- PokéClip 적용: 치지직 채팅 / 대시보드 실시간
- 면접 답변 주제: "WebSocket 스케일링 / vs SSE"

#### E-4: FastAPI + DI + 미들웨어 통합
- hook: Python 백엔드 표준. DI는 큰 앱 품질 결정
- 핵심 항목: FastAPI 첫 앱 / 라우터 / 매개변수 (경로/쿼리/본문) / Pydantic 통합 / 응답 모델 / 자동 OpenAPI / Depends (DI) / 의존성 트리 / DB 세션 DI / 인증 DI / 미들웨어 흐름 / CORS / 로깅 미들웨어 / 요청 ID / 에러 핸들러 / Background tasks
- 다루지 않는 것: 비동기 활용 (E-5)
- PokéClip 적용: 대시보드 백엔드 + 분석 API DI 구조
- 면접 답변 주제: "DI 왜 쓰나" / "FastAPI 선택 이유"

#### E-5: 비동기 백엔드 (FastAPI + asyncio 활용)
- hook: 동기는 동시 요청에서 막힘
- 핵심 항목: 비동기 라우트 활용 / 비동기 DB (asyncpg / SQLAlchemy 2.0 async) / 비동기 HTTP 클라이언트 (httpx / aiohttp) / 동기 코드 호출 (run_in_executor) / 동시 요청 처리 / blocking 함정
- 다루지 않는 것: Python asyncio 메커니즘 (B-5)
- PokéClip 적용: 분석 API의 비동기 처리
- 면접 답변 주제: "asyncpg vs psycopg"

#### E-6: 메시지 큐 (Redis Pub/Sub + Streams 통합)
- hook: 서비스 간 비동기 통신
- 핵심 항목: 큐 개념 / Producer/Consumer / Pub/Sub vs Queue 차이 / Redis Pub/Sub / Lists를 큐로 (LPUSH/RPOP) / Streams vs Pub/Sub vs Lists / XADD / XREAD / XREADGROUP / Consumer Group / 메시지 ack / Pending / 백프레셔 / maxlen 트리밍 / Persistence (RDB/AOF)
- 다루지 않는 것: Kafka (E-7)
- PokéClip 적용: 채널별 분석 큐
- 면접 답변 주제: "Redis Streams vs Kafka / Consumer Group"

#### E-7: Apache Kafka
- hook: 대규모 이벤트 스트리밍 표준
- 핵심 항목: 아키텍처 (Broker/Topic/Partition/Replica) / Producer/Consumer/ConsumerGroup / Offset / 파티션 키와 순서 / Replication / ISR / 보존 정책 / Kafka Connect 개요
- 다루지 않는 것: Kafka Streams (K-6)
- PokéClip 적용: 대규모 분석 파이프라인
- 면접 답변 주제: "Kafka 파티션 설계"

#### E-8: 마이크로서비스 vs 모놀리스
- hook: 아키텍처 선택 비즈니스 결정
- 핵심 항목: 모놀리스 장단점 / MSA 장단점 / Modular Monolith / 서비스 경계 (DDD bounded context) / 통신 (REST/gRPC/Event) / Service Mesh 개요 / MSA 함정
- 다루지 않는 것: 분산 트랜잭션 (K-5)
- PokéClip 적용: 아키텍처 결정 기준
- 면접 답변 주제: "MSA 언제 / 전환 경험"

#### E-9: 분석 파이프라인 설계
- hook: 데이터 파이프라인은 시니어 주력
- 핵심 항목: 패턴 (Pipe-Filter / Fan-out / Fan-in) / 단계 분리 / 에러 처리 / 재시도 / 멱등성 / 데드 레터 큐 / 순서 보장 / 처리량 vs 지연 / Lambda Architecture / Kappa Architecture
- 다루지 않는 것: 실시간 (K-6)
- PokéClip 적용: 9단계 파이프라인 설계
- 면접 답변 주제: "데이터 파이프라인 / Lambda vs Kappa"

#### E-10: 백프레셔 + 큐 관리
- hook: 큐 무한 쌓이면 폭발
- 핵심 항목: 백프레셔 개념 / 큐 길이 제한 / Drop 전략 (FIFO/LIFO/우선순위) / Throttling / Rate limiting / Reactive Streams / 모니터링 / 알람 임계
- 다루지 않는 것: 분산 일관성 (K)
- PokéClip 적용: 분석 안정성
- 면접 답변 주제: "백프레셔 / 큐 쌓일 때 대응"
