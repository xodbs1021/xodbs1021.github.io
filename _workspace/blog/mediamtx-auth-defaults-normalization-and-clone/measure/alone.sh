#!/bin/bash
# usage: alone.sh <new-output-file> <runs> <label>=<worktree> ...
# Runs each of the five auth tests in its own `go test` process (so no earlier Load in the same
# process can touch the shared default) on every tree, <runs> times, and prints PASS/FAIL per run.
# Trees: parent 7bdbc965 + merged conf_test.go, 7bdbc965 + only_ips.patch, 7bdbc965 + only_clone.patch, merge 4906684c.
set -u
OUT="$1"; N="$2"; shift 2
[ -e "$OUT" ] && { echo "exists: $OUT"; exit 1; }
export GOFLAGS=-modcacherw
TESTS="TestConfDeprecatedAuth TestDefaultAuthInternalUsersIsNormalized TestConfDeprecatedAuthWithExplicitDefaults TestConfDefaultsAreNotShared TestConfDeprecatedAuthWithEnvUser"
echo "# $(go version); start $(date '+%Y-%m-%dT%H:%M:%S%z') load: $(sysctl -n vm.loadavg)" > "$OUT"
for pair in "$@"; do
  label="${pair%%=*}"; src="${pair#*=}"
  echo "# $label = $(git -C "$src" rev-parse --short=8 HEAD) + $(git -C "$src" status --porcelain | tr '\n' ' ')" >> "$OUT"
  for t in $TESTS; do
    res=""
    for i in $(seq 1 "$N"); do
      (cd "$src" && go test -count=1 -run "^$t\$" ./internal/conf > /dev/null 2>&1) && res="$res PASS" || res="$res FAIL"
    done
    echo "$label $t$res" >> "$OUT"
  done
done
echo "# end $(date '+%Y-%m-%dT%H:%M:%S%z') load: $(sysctl -n vm.loadavg)" >> "$OUT"
