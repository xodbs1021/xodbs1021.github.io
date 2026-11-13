#!/bin/bash
# usage: BIN_DIR=<folder with mediamtx-v1212, mediamtx-v1213, mediamtx-pr6306> ROOT=<new output folder> ./runall.sh
HERE=$(cd "$(dirname "$0")" && pwd)
BIN_DIR=${BIN_DIR:-./bin}; ROOT=${ROOT:-./full}; mkdir -p "$ROOT"
echo "start $(TZ=Asia/Seoul date '+%F %T %Z') loadavg $(sysctl -n vm.loadavg)" >> "$ROOT/timing.txt"
for v in v1212 v1213 pr6306; do
  python3 -I "$HERE/timing.py" "$v" "$BIN_DIR/mediamtx-$v" "$ROOT" 20 fast delay:0.1 delay:1 hang:5
  echo "$v done $(TZ=Asia/Seoul date '+%T') loadavg $(sysctl -n vm.loadavg)" >> "$ROOT/timing.txt"
done
