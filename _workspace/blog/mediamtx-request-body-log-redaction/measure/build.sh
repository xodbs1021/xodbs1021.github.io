#!/bin/bash
# usage: build.sh <work-dir>
# Fetches and builds the four MediaMTX trees measured in this post, in the order used on
# 2026-11-19 (Go 1.27.2 darwin/arm64). Binaries end up in <work-dir>/bin/mediamtx-<label>.
#   v1.21.3   tag, git clone --depth 1                      (9540cb6c)
#   v1.21.4   tag, git clone --depth 1                      (e65f9411)
#   9c68b477  parent of the PR #6379 merge commit, git fetch --depth 2 + worktree
#   c12bac19  PR #6379 squash merge commit,        git fetch --depth 2 + worktree
# On 2026-11-19 the same steps were run by hand with /tmp/mtx6379w-* folders.
# No network access beyond GitHub and the Go module proxy:
#   - internal/core/VERSION is written by hand (versiongetter would call git describe).
#   - internal/servers/hls/hls.min.js is an empty placeholder. hlsjsdownloader would
#     fetch hls.js from the internet; HLS is switched off in the measured config.
# GOMODCACHE and GOCACHE go to <work-dir>; GOFLAGS=-modcacherw keeps them deletable.
set -eu
WORK="$1"
REPO=https://github.com/bluenviron/mediamtx.git
mkdir -p "$WORK/bin"
export GOMODCACHE="$WORK/gomod" GOCACHE="$WORK/gocache" GOFLAGS=-modcacherw

build_one() { # <source-dir> <label>
  local src="$1" label="$2"
  printf "%s" "$label" > "$src/internal/core/VERSION"
  : > "$src/internal/servers/hls/hls.min.js"
  (cd "$src" && go build -o "$WORK/bin/mediamtx-$label" .)
  echo "built mediamtx-$label from $(git -C "$src" rev-parse --short=8 HEAD), $(go version)"
}

git clone -q --depth 1 --branch v1.21.3 "$REPO" "$WORK/v1213"
git clone -q --depth 1 --branch v1.21.4 "$REPO" "$WORK/v1214"
git init -q "$WORK/merge"
git -C "$WORK/merge" remote add origin "$REPO"
git -C "$WORK/merge" fetch -q --depth 2 origin c12bac192dc0bfe2fdf970324983ab0f48ffa705
git -C "$WORK/merge" worktree add -q --detach "$WORK/9c68b477" 9c68b477
git -C "$WORK/merge" worktree add -q --detach "$WORK/c12bac19" c12bac19

build_one "$WORK/v1213" v1.21.3
build_one "$WORK/v1214" v1.21.4
build_one "$WORK/9c68b477" 9c68b477
build_one "$WORK/c12bac19" c12bac19

# then (3 runs per build):
# python3 -I run.py <out-dir> 3 v1.21.3=$WORK/bin/mediamtx-v1.21.3 \
#   9c68b477=$WORK/bin/mediamtx-9c68b477 c12bac19=$WORK/bin/mediamtx-c12bac19 \
#   v1.21.4=$WORK/bin/mediamtx-v1.21.4
