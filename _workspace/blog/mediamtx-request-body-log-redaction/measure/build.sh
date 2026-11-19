#!/bin/bash
# usage: build.sh <mediamtx-source-dir> <version-label> <output-binary>
# Builds a MediaMTX source tree (git clone --depth 1 of a tag) without network access
# beyond the Go module proxy:
#   - internal/core/VERSION is written by hand (versiongetter would call git describe).
#   - internal/servers/hls/hls.min.js is an empty placeholder. hlsjsdownloader would
#     fetch hls.js from the internet; HLS is switched off in the measured config.
# Needs GOMODCACHE and GOCACHE in the environment (any writable folders);
# GOFLAGS=-modcacherw keeps them deletable.
set -eu
SRC="$1"; LABEL="$2"; OUT="$3"
export GOFLAGS=-modcacherw
cd "$SRC"
printf "%s" "$LABEL" > internal/core/VERSION
: > internal/servers/hls/hls.min.js
go build -o "$OUT" .
echo "built $OUT from $(git rev-parse --short=8 HEAD) ($LABEL), $(go version)"
