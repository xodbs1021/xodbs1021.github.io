### K. 분산 시스템 (7 시리즈)

**갯수 근거**: 시니어 면접 영역. AI 시대 — 분산 트레이드오프 결정은 사람 몫. 5에서 7로 약간 강화 (실시간 처리 + 트레이드오프 케이스집 추가).

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

#### K-6: 실시간 처리 (Kafka Streams / Flink)
- hook: 스트리밍 데이터 처리. PokéClip 실시간 분석 후보
- 핵심 항목: 스트림 처리 vs 배치 / Kafka Streams 개요 / Flink 개요 / Window 처리 (Tumbling/Sliding/Session) / Event time vs Processing time / Watermark / Exactly-once 처리 / State 관리 / Checkpoint
- 다루지 않는 것: Spark Streaming
- PokéClip 적용: 실시간 점수 스트림
- 면접 답변 주제: "Stream Processing 패턴"

#### K-7: 분산 트레이드오프 케이스집 (신규)
- hook: 분산 시스템 결정의 실전 패턴
- 핵심 항목: 멀티 리전 vs 단일 리전 / 동기 복제 vs 비동기 복제 / Leader vs Leaderless / 강일관성 비용 vs 최종일관성 복잡도 / 분산 캐시 일관성 / 분산 락 vs 큐 / 멀티 마스터 vs 싱글 마스터 / 실제 시스템 케이스 (Cassandra/DynamoDB/Spanner 비교)
- 다루지 않는 것: 구체 알고리즘 (K-1~K-6)
- PokéClip 적용: 멀티 리전 / 멀티 마스터 결정
- 면접 답변 주제: "분산 시스템 결정 / 실제 시스템 비교"
