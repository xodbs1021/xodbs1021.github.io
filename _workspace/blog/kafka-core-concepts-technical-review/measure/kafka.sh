#!/bin/bash
# tb6-kafka bench. Run on host; all broker/client commands via docker exec.
C="docker exec tb6-kafka-client-1"
B=/opt/kafka/bin
BS=kafka1:9092,kafka2:9092,kafka3:9092
ts(){ TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST'; }
ld(){ uptime | sed 's/.*load averages: //'; }
run(){ echo "\$ $*"; "$@" 2>&1; }
echo "## K0 기본값 ($(ts), load $(ld))"
run $C $B/kafka-topics.sh --bootstrap-server $BS --create --topic defaults --partitions 1 --replication-factor 3
$C $B/kafka-producer-perf-test.sh --topic defaults --num-records 10 --record-size 100 --throughput -1 --bootstrap-server $BS --print-metrics 2>&1 | grep -E "^\s*(acks|linger.ms|batch.size|enable.idempotence|compression.type|max.in.flight.requests.per.connection) =" | sort -u
echo "(위: 클라이언트 ProducerConfig 로그, 속성을 주지 않은 실행)"
$C $B/kafka-producer-perf-test.sh --topic defaults --num-records 10 --record-size 100 --throughput -1 --bootstrap-server $BS 2>&1 | grep -E "records sent"
echo "\$ kafka-configs.sh --describe --all --broker 1 | grep (min.insync.replicas|replica.lag.time.max.ms|unclean.leader.election.enable|log.flush.interval.messages|eligible.leader.replicas|broker.session.timeout.ms)"
$C $B/kafka-configs.sh --bootstrap-server $BS --describe --all --entity-type brokers --entity-name 1 2>&1 | grep -E "^\s*(min.insync.replicas|replica.lag.time.max.ms|unclean.leader.election.enable|log.flush.interval.messages|log.flush.interval.ms|broker.session.timeout.ms|replica.selector.class)=" | sed 's/ sensitive.*//'
echo "\$ kafka-features.sh describe"
$C $B/kafka-features.sh --bootstrap-server $BS describe 2>&1 | head -10
