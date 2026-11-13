#!/bin/bash
# usage: build.sh <mediamtx-worktree> <output-binary>
# Needs GOMODCACHE and GOCACHE in the environment (any writable folders); GOFLAGS=-modcacherw keeps them deletable.
# go generate downloads hls.min.js (hls.js release) and the version string is written from git describe.
set -eu
SRC="$1"; OUT="$2"
export GOFLAGS=-modcacherw
cd "$SRC"
printf "%s" "$(git describe --tags --always)" > internal/core/VERSION
(cd internal/servers/hls && go generate . ) > /dev/null
go build -o "$OUT" .
echo "built $OUT from $(git rev-parse --short=8 HEAD) ($(cat internal/core/VERSION)), $(go version)"
