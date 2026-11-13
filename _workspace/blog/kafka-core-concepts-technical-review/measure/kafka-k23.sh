#!/bin/bash
C="docker exec tb6-kafka-client-1"; B=/opt/kafka/bin; BS=kafka1:9092,kafka2:9092,kafka3:9092
ts(){ TZ=Asia/Seoul date '+%H:%M:%S.%3N' 2>/dev/null || TZ=Asia/Seoul date '+%H:%M:%S'; }
T(){ python3 -c 'import time,datetime;print(datetime.datetime.fromtimestamp(time.time(),datetime.timezone(datetime.timedelta(hours=9))).strftime("%H:%M:%S.%f")[:-3])'; }
desc(){ $C $B/kafka-topics.sh --bootstrap-server ${2:-$BS} --describe --topic $1 2>&1 | grep -E "Partition: 0"; }
endoff(){ $C $B/kafka-get-offsets.sh --bootstrap-server ${2:-$BS} --topic $1 2>&1 | tail -1; }
prod(){ # topic acks n extra
 $C $B/kafka-producer-perf-test.sh --topic $1 --num-records $3 --record-size 100 --throughput -1 --bootstrap-server ${5:-$BS} --producer-props acks=$2 linger.ms=0 request.timeout.ms=5000 delivery.timeout.ms=8000 retries=0 $4 2>&1 | grep -E "records sent|Exception|Error" | sed 's/^.*\(org.apache.kafka.common.errors.[A-Za-z]*\).*/\1/' | sort | uniq -c | sed 's/^ *//'
}
echo "## K2 min.insync.replicas=2에서 팔로워 둘이 멈췄을 때 (시작 $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST'), load $(uptime | sed 's/.*load averages: //'))"
echo "\$ kafka-topics.sh --create --topic nr --replica-assignment 1:2:3 --config min.insync.replicas=2"
$C $B/kafka-topics.sh --bootstrap-server $BS --create --topic nr --replica-assignment 1:2:3 --config min.insync.replicas=2 2>&1
sleep 2; echo "[$(T)] $(desc nr)"
echo "[$(T)] \$ docker stop tb6-kafka-kafka2-1 tb6-kafka-kafka3-1"; docker stop tb6-kafka-kafka2-1 tb6-kafka-kafka3-1 >/dev/null
for i in 1 2 3 4 5 6; do sleep 3; echo "[$(T)] $(desc nr kafka1:9092)"; done
echo "[$(T)] acks=all 100건 (request.timeout.ms=5000 delivery.timeout.ms=8000 retries=0):"; prod nr all 100 "" kafka1:9092
echo "[$(T)] acks=1 100건:"; prod nr 1 100 "" kafka1:9092
echo "[$(T)] 끝 오프셋: $(endoff nr kafka1:9092)"
echo "[$(T)] \$ docker start tb6-kafka-kafka2-1 tb6-kafka-kafka3-1"; docker start tb6-kafka-kafka2-1 tb6-kafka-kafka3-1 >/dev/null
for i in 1 2 3 4 5 6 7 8; do sleep 3; d=$(desc nr); echo "[$(T)] $d"; echo "$d" | grep -q "Isr: [0-9],[0-9],[0-9]" && break; done
echo
echo "## K3 acks=1 기록이 리더 장애로 사라지는가 (시작 $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST'), load $(uptime | sed 's/.*load averages: //'))"
for A in 1 all; do
 t=loss-$A
 echo "### acks=$A, 토픽 $t (replica-assignment 1:2:3, min.insync.replicas=2)"
 $C $B/kafka-topics.sh --bootstrap-server $BS --create --topic $t --replica-assignment 1:2:3 --config min.insync.replicas=2 2>&1
 sleep 2
 echo "[$(T)] acks=all로 1,000건 먼저: $(prod $t all 1000)"; sleep 2
 echo "[$(T)] $(desc $t)  끝 오프셋 $(endoff $t)"
 echo "[$(T)] \$ docker pause tb6-kafka-kafka2-1 tb6-kafka-kafka3-1"; docker pause tb6-kafka-kafka2-1 tb6-kafka-kafka3-1 >/dev/null
 echo "[$(T)] acks=$A로 100건 (리더 kafka1에만): $(prod $t $A 100 "" kafka1:9092)"
 echo "[$(T)] 리더 끝 오프셋 $(endoff $t kafka1:9092)"
 echo "[$(T)] \$ docker kill tb6-kafka-kafka1-1"; docker kill tb6-kafka-kafka1-1 >/dev/null
 echo "[$(T)] \$ docker unpause tb6-kafka-kafka2-1 tb6-kafka-kafka3-1"; docker unpause tb6-kafka-kafka2-1 tb6-kafka-kafka3-1 >/dev/null
 for i in 1 2 3 4 5 6 7 8; do sleep 3; d=$(desc $t kafka2:9092,kafka3:9092); echo "[$(T)] $d"; echo "$d" | grep -qE "Leader: [23]" && break; done
 echo "[$(T)] 새 리더 끝 오프셋 $(endoff $t kafka2:9092,kafka3:9092)"
 echo "[$(T)] \$ docker start tb6-kafka-kafka1-1"; docker start tb6-kafka-kafka1-1 >/dev/null
 for i in 1 2 3 4 5 6 7 8 9 10; do sleep 3; d=$(desc $t); echo "$d" | grep -q "Isr: [0-9],[0-9],[0-9]" && break; done
 echo "[$(T)] $(desc $t)  복구 뒤 끝 오프셋 $(endoff $t)"
 echo "[$(T)] 처음부터 읽은 레코드 수: $($C $B/kafka-console-consumer.sh --bootstrap-server $BS --topic $t --from-beginning --timeout-ms 8000 2>/dev/null | wc -l | tr -d ' ')"
 sleep 3
done
echo "## 끝 $(TZ=Asia/Seoul date '+%H:%M:%S KST')"
