#!/bin/sh
# runOnDisconnect hook. Once per "arm" file: PATCH logLevel, then poll the API (at most 10 s)
# until GET /v3/config/global/get reports the new level, and record what happened.
D="$1"; API="http://127.0.0.1:19997"
now() { perl -MTime::HiRes=time -e 'printf "%.6f\n", time'; }
mv "$D/arm" "$D/armed.$$" 2>/dev/null || exit 0
LEVEL=$(cat "$D/armed.$$"); rm -f "$D/armed.$$"
T0=$(now)
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 -X PATCH -H 'Content-Type: application/json' \
  -d "{\"logLevel\":\"$LEVEL\"}" "$API/v3/config/global/patch")
RES=gave_up_after_10s
END=$(perl -MTime::HiRes=time -e 'printf "%.3f", time + 10')
while perl -MTime::HiRes=time -e "exit(time < $END ? 0 : 1)"; do
  if curl -s --max-time 1 "$API/v3/config/global/get" | grep -q "\"logLevel\":\"$LEVEL\""; then RES=saw_new_level; break; fi
  sleep 0.1
done
echo "level=$LEVEL patch_sent=$T0 patch_code=$CODE result=$RES end=$(now)" >> "$D/hook_cycle.txt"
