#!/bin/bash
# usage: run_test.sh <mediamtx-worktree> <test-file> <TestName> <count> <output-file>
# Copies <test-file> into internal/certloader unless the tree already has <TestName>, runs
# go test -race -count=<count> -v -run '^<TestName>$' ./internal/certloader, then removes the copy.
# Needs GOMODCACHE and GOCACHE in the environment.
set -u
SRC="$1"; FILE="$2"; NAME="$3"; COUNT="$4"; OUT="$5"
export GOFLAGS=-modcacherw
cd "$SRC" || exit 1
COPY=""
if ! grep -q "func $NAME(" internal/certloader/*_test.go; then
  COPY="internal/certloader/zz_$(basename "$FILE")"
  cp "$FILE" "$COPY"
fi
{
  echo "# tree $(git rev-parse --short=8 HEAD) ($(git describe --tags --always)), $(go version)"
  echo "# test copied: ${COPY:-no (already in tree)}"
  echo "# started $(date '+%Y-%m-%dT%H:%M:%S%z')"
  go test -race -count="$COUNT" -v -run "^$NAME\$" ./internal/certloader 2>&1
  echo "# exit $? at $(date '+%Y-%m-%dT%H:%M:%S%z')"
} > "$OUT"
[ -n "$COPY" ] && rm "$COPY"
grep -cE "^--- PASS: $NAME|^    --- PASS" "$OUT" | sed 's/^/pass lines: /'
grep -cE "^--- FAIL: $NAME|^    --- FAIL" "$OUT" | sed 's/^/fail lines: /'
