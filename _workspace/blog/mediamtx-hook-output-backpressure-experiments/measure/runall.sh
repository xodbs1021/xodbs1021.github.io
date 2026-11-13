#!/bin/bash
# Interleaves the two builds: for each repetition, fork then #6380, each over N = 1, 4, 8, 16.
ROOT=/tmp/osa1w-exp/out/full; mkdir -p $ROOT
echo "start $(TZ=Asia/Seoul date '+%F %T %Z') loadavg $(sysctl -n vm.loadavg)" >> $ROOT/timing.txt
for rep in $(seq 1 10); do
  python3 -I /tmp/osa1w-exp/out/measure.py fork /tmp/osa1w-bin/mediamtx-fork $ROOT 50000 $rep 1 4 8 16
  python3 -I /tmp/osa1w-exp/out/measure.py pr6380 /tmp/osa1w-bin/mediamtx-pr6380 $ROOT 50000 $rep 1 4 8 16
  echo "rep $rep done $(TZ=Asia/Seoul date '+%T') loadavg $(sysctl -n vm.loadavg)" >> $ROOT/timing.txt
done
echo "end $(TZ=Asia/Seoul date '+%F %T %Z') loadavg $(sysctl -n vm.loadavg)" >> $ROOT/timing.txt
