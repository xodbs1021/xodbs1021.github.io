#!/usr/bin/env bash
# Start the lab: MediaMTX (labelled container, 127.0.0.1 only), the ffmpeg test source and the lab server.
source "$(dirname "$0")/lib.sh"
docker compose -f compose.yml up -d
wait_for 30 "MediaMTX HLS port" curl -s -o /dev/null http://127.0.0.1:38888/
./start-ffmpeg.sh
node server.mjs >logs/server.log 2>&1 &
echo $! >server.pid
wait_for 10 "lab server" curl -sf -o /dev/null "$LAB_URL/lab/"
require_lab
echo "lab up"
