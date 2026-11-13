#!/bin/bash
C="docker exec tb6-kafka-client-1"; B=/opt/kafka/bin; BS=kafka1:9092,kafka2:9092,kafka3:9092
ts(){ TZ=Asia/Seoul date '+%H:%M:%S'; }
echo "## K1b 고정 처리량 2,000건/초에서 지연 (시작 $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST'))"
echo "명령: kafka-producer-perf-test.sh --topic bench --num-records 20000 --record-size 1000 --throughput 2000 --bootstrap-server $BS --producer-props acks=<A> linger.ms=<L>"
echo "acks,linger_ms,rep,시각,load1,결과"
for rep in 1 2 3; do for A in 1 all; do for L in 0 5; do
 r=$($C $B/kafka-producer-perf-test.sh --topic bench --num-records 20000 --record-size 1000 --throughput 2000 --bootstrap-server $BS --producer-props acks=$A linger.ms=$L 2>&1 | grep "records sent" | tail -1)
 echo "$A,$L,$rep,$(ts),$(uptime | sed 's/.*load averages: //' | cut -d' ' -f1),\"$r\""
done; done; done
echo "## K1c 최대 처리량 (--throughput -1, 200,000건 × 1,000바이트) 재시험"
echo "acks,linger_ms,rep,시각,load1,결과"
for rep in 1 2 3; do for A in 1 all; do for L in 0 5; do
 r=$($C $B/kafka-producer-perf-test.sh --topic bench --num-records 200000 --record-size 1000 --throughput -1 --bootstrap-server $BS --producer-props acks=$A linger.ms=$L 2>&1 | grep "records sent" | tail -1)
 echo "$A,$L,$rep,$(ts),$(uptime | sed 's/.*load averages: //' | cut -d' ' -f1),\"$r\""
done; done; done
echo "## 끝 $(TZ=Asia/Seoul date '+%H:%M:%S KST')"
