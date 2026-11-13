#!/bin/bash
set -u
cd /tmp/tb6w-buf
R="node /tmp/tb6w-scripts/buf-run.mjs"
O=/tmp/tb6w-buf/out; mkdir -p $O
SCHED='[[0,8000],[30,1500],[60,8000]]'
now(){ TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST'; }
echo "## B1 VOD maxBufferLength 30 $(now) load $(uptime | sed 's/.*load averages: //')"; $R vod-mbl30 /vod/master.m3u8 30 "$SCHED" 100 $O
echo "## B2 VOD maxBufferLength 10 $(now) load $(uptime | sed 's/.*load averages: //')"; $R vod-mbl10 /vod/master.m3u8 10 "$SCHED" 100 $O
S=/tmp/tb6w-media/sintel_trailer-1080p.mp4
LIVE=/tmp/tb6w-buf/www/live
mkdir -p $LIVE
LCMD=(ffmpeg -hide_banner -loglevel warning -stats -re -stream_loop -1 -i $S -an -filter_complex "[0:v]split=3[a][b][c];[a]scale=1920:1080[v0];[b]scale=1280:720[v1];[c]scale=640:360[v2]"
 -map "[v0]" -c:v:0 libx264 -b:v:0 4000k -maxrate:v:0 4000k -bufsize:v:0 4000k
 -map "[v1]" -c:v:1 libx264 -b:v:1 2000k -maxrate:v:1 2000k -bufsize:v:1 2000k
 -map "[v2]" -c:v:2 libx264 -b:v:2 600k -maxrate:v:2 600k -bufsize:v:2 600k
 -preset ultrafast -g 48 -keyint_min 48 -sc_threshold 0
 -f hls -hls_time 2 -hls_list_size 6 -hls_flags delete_segments+independent_segments -hls_segment_filename "www/live/v%v/s%05d.ts" -master_pl_name master.m3u8 -var_stream_map "v:0 v:1 v:2" "www/live/v%v/index.m3u8")
echo "## 라이브 인코더 $(now)"; echo "\$ ${LCMD[*]}"
"${LCMD[@]}" 2> $O/live-ffmpeg.log &
FP=$!
until [ -f $LIVE/master.m3u8 ] && [ $(ls $LIVE/v0/*.ts 2>/dev/null | wc -l) -ge 5 ]; do sleep 1; done
cat $LIVE/v0/index.m3u8
echo "## B3 라이브 maxBufferLength 30 $(now) load $(uptime | sed 's/.*load averages: //')"; $R live-mbl30 /live/master.m3u8 30 "$SCHED" 100 $O
echo "## B4 라이브 22초 끊김 $(now) load $(uptime | sed 's/.*load averages: //')"; $R live-outage /live/master.m3u8 30 '[[0,8000],[30,0],[52,8000]]' 90 $O
kill $FP; wait $FP 2>/dev/null
tail -c 600 $O/live-ffmpeg.log | tr '\r' '\n' | tail -3
echo "## 끝 $(now)"
