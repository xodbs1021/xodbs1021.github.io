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

