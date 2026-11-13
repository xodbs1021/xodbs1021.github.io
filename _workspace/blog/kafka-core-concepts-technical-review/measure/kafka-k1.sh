#!/bin/bash
C="docker exec tb6-kafka-client-1"; B=/opt/kafka/bin; BS=kafka1:9092,kafka2:9092,kafka3:9092
ts(){ TZ=Asia/Seoul date '+%H:%M:%S'; }
echo "## K1 처리량·지연 격자 (시작 $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST'))"
echo "\$ kafka-topics.sh --create --topic bench --partitions 6 --replication-factor 3 --config min.insync.replicas=2"
$C $B/kafka-topics.sh --bootstrap-server $BS --create --topic bench --partitions 6 --replication-factor 3 --config min.insync.replicas=2 2>&1
echo "명령: kafka-producer-perf-test.sh --topic bench --num-records 200000 --record-size 1000 --throughput -1 --bootstrap-server $BS --producer-props acks=<A> linger.ms=<L>"
echo "acks,linger_ms,rep,시각,load1,결과"
for rep in 1 2 3; do for A in 1 all; do for L in 0 5; do
 r=$($C $B/kafka-producer-perf-test.sh --topic bench --num-records 200000 --record-size 1000 --throughput -1 --bootstrap-server $BS --producer-props acks=$A linger.ms=$L 2>&1 | grep "records sent" | tail -1)
 echo "$A,$L,$rep,$(ts),$(uptime | sed 's/.*load averages: //' | cut -d' ' -f1),\"$r\""
done; done; done
echo "## K1 끝 $(TZ=Asia/Seoul date '+%H:%M:%S KST')"
