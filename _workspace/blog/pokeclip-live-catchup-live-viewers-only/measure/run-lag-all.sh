#!/usr/bin/env bash
# hls.latency vs direct latency after seeks, app listener before (early) or after (late) hls.js. Needs ./up.sh.
source "$(dirname "$0")/lib.sh"
require_lab
for b in chrome webkit; do
  for l in early late; do
    run "lag-$b-$l${SUFFIX:-}" --browser "$b" --scenario lag --listener "$l"
  done
done
echo "lag done"
