# evidence — kafka-core-concepts-technical-review

유형: 기술 해설(3인칭, 스트리밍 연재 밖 독립 글). 확인: 2026-11-13, AI(Claude Code). 문서 판: Apache Kafka 4.4 (4.4.0, 2026-10-22).

| 주장 | 근거 URL | 확인 날짜 | 근거 종류 |
|---|---|---|---|
| 순차 쓰기 약 600MB/s, 임의 쓰기 약 100kB/s(6,000배 이상) — JBOD 7200rpm SATA 6개 RAID-5 예 | https://kafka.apache.org/44/design/design/ (Persistence) | 2026-11-13 | 문헌값(옛 하드디스크 수치) |
| 디스크 탐색 한 번 10ms | 같은 문서(Constant Time Suffices) | 2026-11-13 | 문헌값 |
| 모든 데이터를 flush 없이 바로 파일 시스템 로그에 씀, 힙 캐시는 중복 · 객체 오버헤드 · GC, 재시작 뒤에도 캐시 유지 | 같은 문서(Don't fear the filesystem!) | 2026-11-13 | 문헌값 |
| sendfile로 페이지 캐시 → 소켓, 따라잡은 소비자는 디스크 읽기 없음, SSL에서는 sendfile 안 씀 | 같은 문서(Efficiency) | 2026-11-13 | 문헌값 |
| 여러 메시지를 함께 압축해야 압축률, 배치 단위 압축 | 같은 문서(End-to-end Batch Compression) | 2026-11-13 | 문헌값 |
| 파티션은 그룹 안 정확히 한 소비자, 위치는 파티션마다 정수 하나 | 같은 문서(The Consumer) | 2026-11-13 | 문헌값 |
| 공유 그룹: 파티션 여러 소비자, 소비자 수 > 파티션 가능, 개별 확인 응답, 배달 횟수, 잠금 기본 30초 share.record.lock.duration.ms | 같은 문서(The Share Consumer) | 2026-11-13 | 문헌값 |
| ISR 조건(컨트롤러 세션 broker.session.timeout.ms, replica.lag.time.max.ms), committed = ISR 전원, 확정된 것만 소비자에게, 보장 = ISR 하나라도 살아 있는 한 | 같은 문서(Replication, Availability and Durability Guarantees) | 2026-11-13 | 문헌값 |
| acks와 무관하게 ISR ≥ min.insync.replicas 이어야 소비자에게 보임 / strict min ISR: ISR < min ISR이면 HW 안 오름 | 같은 문서 + https://kafka.apache.org/44/operations/eligible-leader-replicas/ | 2026-11-13 | 문헌값 |
| fsync 매 쓰기는 성능 2–3 자릿수 저하 → 복제로 내구성 | 같은 문서(Replicated Logs) | 2026-11-13 | 문헌값; 「전원 동시 상실은 보장 밖」은 추론으로 표시 |
| unclean.leader.election.enable 기본 false | https://kafka.apache.org/44/configuration/broker-configs/ + 실측 k0.txt | 2026-11-13 | 문헌값 · 실측 |
| min.insync.replicas 기본 1, replica.lag.time.max.ms 30000, broker.session.timeout.ms 9000, log.retention.hours 168, log.flush.interval.messages Long.MAX, replica.selector.class null | 같은 broker-configs 페이지 + 실측 k0.txt | 2026-11-13 | 문헌값 · 실측 |
| acks=0/1/all 정의, acks=1은 리더 장애 시 유실 가능 | https://kafka.apache.org/44/configuration/producer-configs/ | 2026-11-13 | 문헌값 |
| linger.ms 기본 5, 4.0에서 0→5 / batch.size 16384 | producer-configs + https://kafka.apache.org/44/getting-started/upgrade/ (4.0 notable) + 실측 producer-defaults.txt | 2026-11-13 | 문헌값 · 실측 (KIP 번호는 문서에 없어 쓰지 않음) |
| acks=all · 멱등성 기본 3.0.0(KIP-679), 3.0.0·3.1.0 버그로 멱등 기본 미적용, 3.0.1 수정(KAFKA-13598) | https://kafka.apache.org/30/getting-started/upgrade/ | 2026-11-13 | 문헌값 |
| ELR: 4.0 도입, 4.1부터 새 클러스터 기본 켜짐, 선출 순서 ISR → ELR(펜싱 안 된) → 마지막 리더 | upgrade(4.1 notable) + eligible-leader-replicas 문서 | 2026-11-13 | 문헌값; 실측 k0 eligible.leader.replicas.version=1 |
| 공유 그룹 4.1 미리 보기, 4.2 production-ready(KIP-932) | upgrade 문서(4.1.0, 4.2.0 notable) | 2026-11-13 | 문헌값 |
| 팔로워 읽기 replica.selector.class(KIP-392), 2.4.0 | https://cwiki.apache.org/confluence/display/KAFKA/KIP-392... + JIRA KAFKA-8443 fixVersions 2.4.0 (REST API) | 2026-11-13 | 문헌값 |
| KRaft 3.3.x 운영 준비 첫 판, 4.0 ZooKeeper 모드 제거, 4.x 업그레이드는 3.3.x 이상 KRaft 필요 | upgrade 문서 | 2026-11-13 | 문헌값 |
| 컨트롤러 3 또는 5, 과반 필요 | https://kafka.apache.org/44/operations/kraft/ | 2026-11-13 | 문헌값 |
| 출시일 4.4.0 2026-10-22, 4.2.0 2026-02-17, 4.0.0 2025-03-18, 3.3.1 2022-10-03 | https://kafka.apache.org/community/downloads/ | 2026-11-13 | 문헌값 |
| 기본값 실측(acks=all, linger.ms=5, batch.size=16384, enable.idempotence=true) | measure/producer-defaults.txt | 2026-11-13 | 실측 |
| 팔로워 둘 stop → ~7초 안 ISR 1 · ELR 3, acks=all 100건 NotEnoughReplicasException, acks=1 100건 성공, HW 0 | measure/k23.txt K2 | 2026-11-13 | 실측 1회 |
| acks=1 확인 100건이 리더 장애 뒤 사라짐(새 리더 2, 끝 오프셋 1000, 읽은 레코드 1000) / acks=all 100건 TimeoutException, ELR 3이 새 리더, 손실 0 | measure/k23.txt K3 | 2026-11-13 | 실측 1회 |
| 고정 2,000건/초 p50: acks=1·l0 1·1·1, acks=1·l5 5·5·5, all·l0 2·1·4, all·l5 5·7·6 ms | measure/k1-set2.txt | 2026-11-13 | 실측 3회 |
| 최대 처리량은 반복 사이 2–3배 흔들림 → 결론 금지 | measure/k1-set1-highload.txt, k1-set2.txt | 2026-11-13 | 실측 |

## 정정한 옛 글 서술
- 「헤더 이동」 → 디스크 「헤드」 이동(탐색).
- 「jvm에 접근하지 않고」 → 브로커는 JVM에서 돌고, 데이터는 힙 대신 페이지 캐시에 둔다.
- 「데이터 유실 없이」 → acks=all + min.insync.replicas + unclean 끔 조건부, acks=1은 실측으로 유실.
- 600MB/s · 100kB/s는 옛 JBOD 하드디스크 수치임을 밝힘.
- ZooKeeper 또는 KRaft 「도입되어 통합되고 있다」 → 3.3 운영 준비, 4.0에서 ZooKeeper 제거(완료).
- 「한 파티션은 한 컨슈머」 → 공유 그룹(4.2 정식) 예외 추가.
- 메모 · AI 피드백 형식 · 1인칭 삭제, 해커톤 · 연재 링크 없음.

## 시각 자료
- 그림 1 Mermaid fig-kafka-partition-roles(개념도) — 없으면 리더 · 팔로워 · 그룹 관계를 문장으로만 읽어야 함.
- 그림 2 Remotion AcksIsrCommit(재구성, 실측 순서) — 없으면 「확인 응답을 받았는데 사라진다」의 순서가 안 보임.
- 그림 3 ECharts fig-linger-latency(실측) — 4조건 × 3회 같은 단위 수치 비교.
- 표: acks 값 3개의 속성(서로 다른 범주 정의) — 차트가 아닌 표가 맞음.
