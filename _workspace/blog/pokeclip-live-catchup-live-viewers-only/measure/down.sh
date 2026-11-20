#!/usr/bin/env bash
# Stop everything up.sh started and remove the labelled container and network.
source "$(dirname "$0")/lib.sh"
for f in ffmpeg.pid server.pid; do
  if [[ -f $f ]]; then kill "$(cat "$f")" 2>/dev/null || true; rm -f "$f"; fi
done
docker compose -f compose.yml down
echo "residue:"
echo "  containers $(docker ps -a --filter label=com.techblog.bench=live-catchup -q | wc -l)"
echo "  networks   $(docker network ls --filter label=com.techblog.bench=live-catchup -q | wc -l)"
echo "  volumes    $(docker volume ls --filter label=com.techblog.bench=live-catchup -q | wc -l)"
