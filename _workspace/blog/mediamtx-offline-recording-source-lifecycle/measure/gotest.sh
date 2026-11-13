#!/bin/bash
# usage: gotest.sh <new-output-file> <mediamtx-worktree> <package> <-run regex> <runs> [extra go test flags...]
# Runs `go test -count=1 -v` <runs> times in a row and appends every run to one file with a header.
# Needs GOMODCACHE and GOCACHE in the environment; internal/core/VERSION and internal/servers/hls/hls.min.js
# must exist (build.sh writes both).
set -u
OUT="$1"; SRC="$2"; PKG="$3"; RUN="$4"; N="$5"; shift 5
[ -e "$OUT" ] && { echo "exists: $OUT"; exit 1; }
export GOFLAGS=-modcacherw
cd "$SRC" || exit 1
{
  echo "# tree $(git rev-parse --short=8 HEAD) ($(git describe --tags --always)); local changes:"
  git status --porcelain --untracked-files=normal | sed 's/^/#   /'
  echo "# $(go version); go test -count=1 -v -run '$RUN' $* $PKG; runs=$N"
} > "$OUT"
for i in $(seq 1 "$N"); do
  echo "## run $i start $(date '+%Y-%m-%dT%H:%M:%S%z') load: $(sysctl -n vm.loadavg)" >> "$OUT"
  go test -count=1 -v -run "$RUN" "$@" "$PKG" >> "$OUT" 2>&1
  echo "## run $i exit $?" >> "$OUT"
done
