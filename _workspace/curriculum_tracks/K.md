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

