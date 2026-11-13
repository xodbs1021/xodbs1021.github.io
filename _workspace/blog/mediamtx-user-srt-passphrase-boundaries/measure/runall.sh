#!/bin/bash
ROOT=/tmp/osa1w-exp/srt/full; mkdir -p $ROOT
echo "start $(TZ=Asia/Seoul date '+%F %T %Z') loadavg $(sysctl -n vm.loadavg)" >> $ROOT/timing.txt
for v in v1212 v1213 pr6306; do
  python3 -I /tmp/osa1w-exp/srt/timing.py $v /tmp/osa1w-bin/mediamtx-$v $ROOT 20 fast delay:0.1 delay:1 hang:5
  echo "$v done $(TZ=Asia/Seoul date '+%T') loadavg $(sysctl -n vm.loadavg)" >> $ROOT/timing.txt
done
