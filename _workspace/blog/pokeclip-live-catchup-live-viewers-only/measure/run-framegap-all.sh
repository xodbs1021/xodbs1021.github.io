#!/usr/bin/env bash
# Frame-gap runs, one at a time: no-switch, 1<->1.05, 1<->1.1 for each browser. Needs ./up.sh.
source "$(dirname "$0")/lib.sh"
require_lab
for b in webkit chrome; do
  for r in none 1.05 1.1; do
    run "framegap-$b-$r${SUFFIX:-}" --browser "$b" --scenario framegap --rate "$r"
  done
done
echo "framegap done"
