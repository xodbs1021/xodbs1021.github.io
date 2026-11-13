#!/bin/bash
cd /tmp/tb6w-buf/www
S=/tmp/tb6w-media/sintel_trailer-1080p.mp4
echo "## 3단계 사다리 VOD HLS 만들기 $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST')"
CMD=(ffmpeg -hide_banner -v error -y -stream_loop 1 -i $S -an -filter_complex "[0:v]split=3[a][b][c];[a]scale=1920:1080[v0];[b]scale=1280:720[v1];[c]scale=640:360[v2]"
 -map "[v0]" -c:v:0 libx264 -b:v:0 4000k -maxrate:v:0 4000k -bufsize:v:0 4000k
 -map "[v1]" -c:v:1 libx264 -b:v:1 2000k -maxrate:v:1 2000k -bufsize:v:1 2000k
 -map "[v2]" -c:v:2 libx264 -b:v:2 600k -maxrate:v:2 600k -bufsize:v:2 600k
 -preset veryfast -g 48 -keyint_min 48 -sc_threshold 0
 -f hls -hls_time 2 -hls_playlist_type vod -hls_segment_filename "vod/v%v/s%03d.ts" -master_pl_name master.m3u8 -var_stream_map "v:0 v:1 v:2" "vod/v%v/index.m3u8")
echo "\$ ${CMD[*]}"
"${CMD[@]}"
cat vod/master.m3u8; for v in 0 1 2; do n=$(ls vod/v$v/*.ts | wc -l); b=$(cat vod/v$v/*.ts | wc -c); echo "v$v: 조각 $n개, $b 바이트"; done
grep -m3 EXTINF vod/v0/index.m3u8; grep TARGETDURATION vod/v0/index.m3u8
