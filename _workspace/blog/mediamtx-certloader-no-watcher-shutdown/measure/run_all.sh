#!/bin/bash
# usage: run_all.sh <folder-with-mediamtx-<rev>-binaries> <v1.21.3-default-mediamtx.yml> <new-output-root>
# Run as a non-root user (chmod 555 must stop writes).
set -u
BIN="$1"; DEFAULT_YML="$2"; OUT="$3"; HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir "$OUT" || exit 1
echo "start $(date '+%Y-%m-%dT%H:%M:%S%z') load: $(sysctl -n vm.loadavg) user: $(id -u)" > "$OUT/timing.txt"
for rev in b5df4626 989ea15a v1.21.3 065f94c2; do
  for mode in writable readonly; do
    python3 -I "$HERE/run_shutdown.py" "$BIN/mediamtx-$rev" "$HERE/moq-only.yml" "$OUT/moq_${rev}_${mode}" "$mode" 5 > /dev/null
  done
done
# v1.21.3 default configuration, every listener moved by 20000 through MTX_* variables
PORTS=(MTX_RTSPADDRESS=:28554 MTX_RTSPSADDRESS=:28322 MTX_RTPADDRESS=:28000 MTX_RTCPADDRESS=:28001
  MTX_SRTPADDRESS=:28004 MTX_SRTCPADDRESS=:28005 MTX_RTMPADDRESS=:21935 MTX_RTMPSADDRESS=:21936
  MTX_HLSADDRESS=:28888 MTX_WEBRTCADDRESS=:28889 MTX_WEBRTCLOCALUDPADDRESS=:28189 MTX_SRTADDRESS=:28890
  MTX_MOQHTTP2ADDRESS=:28892 MTX_MOQHTTP3ADDRESS=:28892 MTX_MOQQUICADDRESS=:28893)
for mode in writable readonly; do
  python3 -I "$HERE/run_shutdown.py" "$BIN/mediamtx-v1.21.3" "$DEFAULT_YML" "$OUT/default_v1.21.3_${mode}" "$mode" 1 "${PORTS[@]}" > /dev/null
done
echo "end $(date '+%Y-%m-%dT%H:%M:%S%z') load: $(sysctl -n vm.loadavg)" >> "$OUT/timing.txt"
