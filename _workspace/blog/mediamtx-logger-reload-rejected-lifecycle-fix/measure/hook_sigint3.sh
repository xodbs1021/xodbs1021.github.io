#!/bin/sh
# runOnInit hook: records start, traps SIGINT and exits 3 s after it.
D="$1"
now() { perl -MTime::HiRes=time -e 'printf "%.6f\n", time'; }
echo "start $$ $(now)" >> "$D/hook_events.txt"
trap 'echo "sigint $$ $(now)" >> "$D/hook_events.txt"; sleep 3; echo "exit $$ $(now)" >> "$D/hook_events.txt"; exit 0' INT
while :; do sleep 0.1; done
