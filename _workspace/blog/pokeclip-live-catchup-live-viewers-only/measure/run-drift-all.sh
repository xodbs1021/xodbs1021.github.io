#!/usr/bin/env bash
# Latency after induced stalls (the proxy holds HLS requests 6 s, then 13 s). One browser at a time; the pages of a
# run share the hold. Needs ./up.sh; independent of the other scenarios.
source "$(dirname "$0")/lib.sh"
require_lab
run "drift-chrome${SUFFIX:-}" --browser chrome --scenario drift --rules off,rateAndJump
run "drift-webkit${SUFFIX:-}" --browser webkit --scenario drift --rules off,jumpOnly,rateAndJump
echo "drift done"
