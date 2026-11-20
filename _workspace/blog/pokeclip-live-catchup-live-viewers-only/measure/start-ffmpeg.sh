#!/usr/bin/env bash
# Test source: testsrc2 640x360 30fps, GOP 2s (segments cut at 4s), AAC 1ch sine, published over RTMP.
# Writes ffmpeg.pid and fails unless ffmpeg is still running and MediaMTX serves the stream.
source "$(dirname "$0")/lib.sh"
ffmpeg -hide_banner -loglevel warning -re \
  -f lavfi -i testsrc2=size=640x360:rate=30 \
  -f lavfi -i sine=frequency=440:sample_rate=48000 \
  -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p -b:v 800k \
  -g 60 -keyint_min 60 -sc_threshold 0 \
  -c:a aac -ac 1 -b:a 64k \
  -f flv rtmp://127.0.0.1:31935/bench >logs/ffmpeg.log 2>&1 &
echo $! >ffmpeg.pid
wait_for 20 "stream at $HLS_URL" curl -sfL -o /dev/null "$HLS_URL"
kill -0 "$(cat ffmpeg.pid)" || { echo "ffmpeg exited — see logs/ffmpeg.log" >&2; exit 1; }
echo "ffmpeg running (pid $(cat ffmpeg.pid))"
