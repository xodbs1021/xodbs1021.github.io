#!/bin/bash
# usage: run.sh <mediamtx-binary> <new-outdir>
# Fires the seven hooks that have no OnExit on v1.21.3 with nonexistent commands, then counts log lines.
set -u
BIN="$1"; OUT="$2"; mkdir "$OUT" || exit 1; mkdir -p "$OUT/rec"
sed "s#__OUT__#$OUT#g" "$(dirname "$0")/probe.yml" > "$OUT/probe.yml"
"$BIN" "$OUT/probe.yml" > "$OUT/console.log" 2>&1 &
SRV=$!
for i in $(seq 1 100); do grep -q "listener opened on :18890" "$OUT/server.log" 2>/dev/null && break; sleep 0.1; done
ffmpeg -loglevel error -re -f lavfi -i testsrc2=size=320x240:rate=25 -t 7 -c:v libx264 -preset ultrafast -tune zerolatency -g 25 -f rtsp -rtsp_transport tcp rtsp://127.0.0.1:18554/test > "$OUT/pub.log" 2>&1 &
PUB=$!
sleep 3
ffmpeg -loglevel error -rtsp_transport tcp -i rtsp://127.0.0.1:18554/test -t 2 -f null - > "$OUT/reader_rtsp.log" 2>&1 &
R1=$!
( srt-live-transmit -q "srt://127.0.0.1:18890?streamid=read:test" file://con > /dev/null 2> "$OUT/reader_srt.log" & SP=$!; sleep 2; kill -INT $SP; wait $SP ) &
R2=$!
ffmpeg -loglevel error -rtsp_transport tcp -i rtsp://127.0.0.1:18554/ondemand -t 3 -f null - > "$OUT/reader_ondemand.log" 2>&1 &
R3=$!
nc -z 127.0.0.1 18554
wait $R1 $R2 $R3 $PUB
sleep 4
kill -INT $SRV; wait $SRV; echo "server exit=$?" > "$OUT/exit.txt"
