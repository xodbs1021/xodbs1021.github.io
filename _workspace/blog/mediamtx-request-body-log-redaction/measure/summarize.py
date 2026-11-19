"""Summarize results.json written by run.py.

usage: python3 -I summarize.py <results.json>

Prints, per build, the marker counts in the MediaMTX debug log (and whether
all runs agree), the markers the auth server received, the "(body of N bytes)"
lines next to the request body sizes that were sent, and the HTTP statuses.
"""

import json
import sys


def main():
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    markers = d["markers"]
    builds = list(d["results"])
    print("marker | meaning | " + " | ".join(builds))
    for m, meaning in markers:
        cells = []
        for b in builds:
            vals = {r["log_markers"][m] for r in d["results"][b]}
            cells.append(str(vals.pop()) if len(vals) == 1 else "differs:" + str(sorted(vals)))
        print(f"{m} | {meaning} | " + " | ".join(cells))
    print()
    for b in builds:
        runs = d["results"][b]
        same = all(r["log_markers"] == runs[0]["log_markers"] for r in runs)
        recv = {r["auth_server_markers"]["MTX6379W-APIPASS"] for r in runs}
        print(f"{b}: runs={len(runs)} identical_log_counts={same} "
              f"auth_requests_logged={[r['auth_requests_logged'] for r in runs]} "
              f"auth_server_got_APIPASS={sorted(recv)} "
              f"auth_body_bytes={runs[0]['auth_bodies_received_bytes']}")
        print(f"  statuses={[(s['request'], s['status'], s['body_bytes']) for s in runs[0]['statuses']]}")
        print(f"  body_of_lines(run1)={runs[0]['body_of_lines']}")


if __name__ == "__main__":
    main()
