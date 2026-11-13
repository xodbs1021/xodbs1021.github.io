#!/usr/bin/env python3
"""usage: summarize.py <output-root of run_all.sh>  — one line per condition (run with python3 -I)."""
import json
import os
import sys

root = sys.argv[1]
for name in sorted(os.listdir(root)):
    p = os.path.join(root, name, "results.json")
    if not os.path.exists(p):
        continue
    r = json.load(open(p))
    ms = [x["sigint_to_exit_ms"] for x in r if x["sigint_to_exit_ms"] is not None]
    print(f"{name}: exited {sum(x['result'] == 'exited' for x in r)}/{len(r)}, "
          f"killed after 10 s {sum(x['result'] == 'killed_after_10s' for x in r)}, "
          f"save failed {sum(x['save_failed'] for x in r)}, "
          f"SIGINT to exit ms {min(ms) if ms else '-'}–{max(ms) if ms else '-'}, "
          f"last line of run 0: {r[0]['last_line'][20:]}")
