#!/bin/bash
# Interleaves the two builds: for each repetition, fork then #6380, each over N = 1, 4, 8, 16.
# usage: BIN_DIR=<folder with mediamtx-fork and mediamtx-pr6380> ROOT=<new output folder> ./runall.sh
# nowns must be built next to this script first: cc -O2 -o nowns nowns.c
HERE=$(cd "$(dirname "$0")" && pwd)
BIN_DIR=${BIN_DIR:-./bin}; ROOT=${ROOT:-./full}; mkdir -p "$ROOT"
echo "start $(TZ=Asia/Seoul date '+%F %T %Z') loadavg $(sysctl -n vm.loadavg)" >> "$ROOT/timing.txt"
for rep in $(seq 1 10); do
  python3 -I "$HERE/measure.py" fork "$BIN_DIR/mediamtx-fork" "$ROOT" 50000 "$rep" 1 4 8 16
  python3 -I "$HERE/measure.py" pr6380 "$BIN_DIR/mediamtx-pr6380" "$ROOT" 50000 "$rep" 1 4 8 16
  echo "rep $rep done $(TZ=Asia/Seoul date '+%T') loadavg $(sysctl -n vm.loadavg)" >> "$ROOT/timing.txt"
done
echo "end $(TZ=Asia/Seoul date '+%F %T %Z') loadavg $(sysctl -n vm.loadavg)" >> "$ROOT/timing.txt"
