#!/usr/bin/env python3
"""Summarise run_all.sh output (run with python3 -I).

usage: analyze.py <output-root>

gap_<rev>_<hook>: for every "reloading configuration (API request)" line, the time from
  "[RTSP] closing" to the next "[RTSP] started with listeners" (none if RTSP was not closed),
  whether "waiting for running hooks" was printed, and whether the FFmpeg publisher dropped.
cycle_<rev>: per armed reload, the hook's own result and, from the server log, the time from
  "reloading configuration (API request)" to the next "[API] started with listener" (API down).
"""
import datetime
import json
import os
import re
import statistics
import sys

TS = re.compile(r"^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d+))?(Z|[+-]\d\d:\d\d)$")


def ns(entry):
    m = TS.match(entry["timestamp"])
    base = datetime.datetime.fromisoformat(m.group(1) + (m.group(3) if m.group(3) != "Z" else "+00:00"))
    frac = (m.group(2) or "").ljust(9, "0")
    return int(base.timestamp()) * 1_000_000_000 + int(frac)


def entries(path):
    out = []
    with open(path) as f:
        for line in f:
            if line.startswith("{"):
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return out


def reload_slices(es):
    starts = [i for i, e in enumerate(es) if e["message"] == "reloading configuration (API request)"]
    stop = [i for i, e in enumerate(es) if e["message"] == "shutting down gracefully"]
    bounds = starts + stop[:1] + [len(es)]
    return [(es[a:b], es[a]) for a, b in zip(starts, bounds[1:])]


def gap_summary(d):
    es = entries(os.path.join(d, "server.log"))
    rows = []
    for sl, head in reload_slices(es):
        closing = next((e for e in sl if e["message"] == "[RTSP] closing"), None)
        started = None
        if closing:
            after = sl[sl.index(closing):]
            started = next((e for e in after if e["message"].startswith("[RTSP] started with listeners")), None)
        rows.append({
            "rtsp_closed": closing is not None,
            "rtsp_gap_ms": round((ns(started) - ns(closing)) / 1e6, 3) if closing and started else None,
            "waited_for_hooks": any(e["message"] == "waiting for running hooks" for e in sl),
        })
    driver = json.load(open(os.path.join(d, "driver.json")))
    for r, dr in zip(rows, driver):
        r["publisher_dropped"] = dr["publisher_dropped"]
        r["patch_to_new_level_ms"] = dr["patch_to_api_ms"]
    return rows


def hook_order(d):
    p = os.path.join(d, "hook_events.txt")
    if not os.path.exists(p):
        return ""
    ev = [l.split() for l in open(p)]
    ev.sort(key=lambda x: float(x[2]))
    return " ".join(e[0] for e in ev if e[0] in ("start", "exit"))


def cycle_summary(d):
    es = entries(os.path.join(d, "server.log"))
    hook = [dict(kv.split("=", 1) for kv in l.split()) for l in open(os.path.join(d, "hook_cycle.txt"))]
    rows = []
    for (sl, head), h in zip(reload_slices(es), hook):
        api_closed = any(e["message"] == "[API] closing" for e in sl)
        back = next((e for e in sl if e["message"].startswith("[API] started with listener")), None)
        rows.append({
            "hook_result": h["result"],
            "hook_patch_to_end_s": round(float(h["end"]) - float(h["patch_sent"]), 2),
            "api_closed": api_closed,
            "api_down_s": round((ns(back) - ns(head)) / 1e9, 3) if api_closed and back else None,
            "waited_for_hooks": any(e["message"] == "waiting for running hooks" for e in sl),
        })
    return rows


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs), 3) if xs else None


def main():
    root = sys.argv[1]
    summary = {}
    for name in sorted(os.listdir(root)):
        d = os.path.join(root, name)
        if not os.path.exists(os.path.join(d, "exit.txt")):
            continue  # unfinished run
        if name.startswith(("gap_", "file_")):
            rows = gap_summary(d)
            gaps = [r["rtsp_gap_ms"] for r in rows]
            summary[name] = {
                "reloads": len(rows),
                "rtsp_closed": sum(r["rtsp_closed"] for r in rows),
                "rtsp_gap_ms_median": med(gaps),
                "rtsp_gap_ms_min": min([g for g in gaps if g is not None], default=None),
                "rtsp_gap_ms_max": max([g for g in gaps if g is not None], default=None),
                "waited_for_hooks": sum(r["waited_for_hooks"] for r in rows),
                "publisher_dropped": sum(r["publisher_dropped"] for r in rows),
                "patch_to_new_level_ms_median": med([r["patch_to_new_level_ms"] for r in rows]),
                "hook_order": hook_order(d),
                "rows": rows,
            }
        elif name.startswith("cycle_"):
            rows = cycle_summary(d)
            summary[name] = {
                "reloads": len(rows),
                "hook_results": [r["hook_result"] for r in rows],
                "hook_patch_to_end_s": [r["hook_patch_to_end_s"] for r in rows],
                "api_closed": sum(r["api_closed"] for r in rows),
                "api_down_s": [r["api_down_s"] for r in rows],
                "waited_for_hooks": sum(r["waited_for_hooks"] for r in rows),
            }
    json.dump(summary, sys.stdout, indent=1)
    print()


if __name__ == "__main__":
    main()
