#!/bin/bash
# usage: run_all.sh <folder-with-mediamtx-<rev>-binaries> <new-output-root>
set -u
BIN="$1"; OUT="$2"; HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir "$OUT" || exit 1
echo "start $(date '+%Y-%m-%dT%H:%M:%S%z') load: $(sysctl -n vm.loadavg)" > "$OUT/timing.txt"
for rev in v1.21.1 0151a87a 0b1fb9e1 ef80a852 v1.21.3; do
  for hook in none sigint3; do
    python3 -I "$HERE/run_reload.py" gap "$BIN/mediamtx-$rev" "$OUT/gap_${rev}_${hook}" "$hook" 10
  done
done
echo "gap done $(date '+%Y-%m-%dT%H:%M:%S%z') load: $(sysctl -n vm.loadavg)" >> "$OUT/timing.txt"
for rev in v1.21.1 0151a87a 0b1fb9e1 ef80a852 v1.21.3; do
  python3 -I "$HERE/run_reload.py" cycle "$BIN/mediamtx-$rev" "$OUT/cycle_${rev}" 5 2>/dev/null
done
echo "end $(date '+%Y-%m-%dT%H:%M:%S%z') load: $(sysctl -n vm.loadavg)" >> "$OUT/timing.txt"
# second pass (added after the first): PATCH logFile instead of logLevel
for rev in v1.21.1 0151a87a v1.21.3; do
  python3 -I "$HERE/run_reload.py" gap "$BIN/mediamtx-$rev" "$OUT/file_${rev}_sigint3" sigint3 10 logFile
done
echo "file pass end $(date '+%Y-%m-%dT%H:%M:%S%z') load: $(sysctl -n vm.loadavg)" >> "$OUT/timing.txt"
