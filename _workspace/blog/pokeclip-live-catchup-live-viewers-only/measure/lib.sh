#!/usr/bin/env bash
# Shared helpers for the lab entry scripts. Source it; do not run it.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"
mkdir -p logs raw
LAB_URL=http://127.0.0.1:38300
HLS_URL=http://127.0.0.1:38888/bench/index.m3u8

# Wait until a command succeeds, or fail with a message.
wait_for() { # <seconds> <description> <command...>
  local secs=$1 what=$2; shift 2
  for _ in $(seq "$secs"); do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  echo "timeout: $what" >&2
  return 1
}

# Every scenario needs MediaMTX serving the stream and the lab server answering.
require_lab() {
  curl -sfL -o /dev/null "$HLS_URL" || { echo "stream not available at $HLS_URL — run ./up.sh first" >&2; return 1; }
  curl -sf -o /dev/null "$LAB_URL/lab/" || { echo "lab server not answering at $LAB_URL — run ./up.sh first" >&2; return 1; }
}

# One run: node run.mjs …, with its own log file. set -e stops the calling script on a non-zero exit.
run() { # <name> <run.mjs args...>
  local name=$1; shift
  echo "run $name"
  node run.mjs --name "$name" --out "${OUT:-raw}" "$@" >"logs/$name.log" 2>&1 || { echo "FAILED $name (see logs/$name.log)" >&2; tail -5 "logs/$name.log" >&2; return 1; }
}
