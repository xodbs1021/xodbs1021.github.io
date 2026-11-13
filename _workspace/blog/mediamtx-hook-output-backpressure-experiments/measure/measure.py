"""Hook output under concurrent exit.

usage: python3 -I measure.py <label> <mediamtx-binary> <outroot> <K> <rep> <N>...
For each N (one repetition per call): N paths whose runOnInit prints K lines of "a", records the
exit wall clock (ns) and exits 1. The server logs to a file in JSON with
logHookOutput on. Per path we count the "a" entries and take
D = time of the "command exited" entry - exit wall clock.
"""
import csv, json, os, re, signal, subprocess, sys, time
from datetime import datetime, timezone

# hook.sh and nowns live next to this script unless HOOK is set.
HOOK = os.environ.get("HOOK", os.path.join(os.path.dirname(os.path.abspath(__file__)), "hook.sh"))

CFG = """logLevel: info
logDestinations: [file]
logStructured: yes
logFile: {d}/server.log
logHookOutput: yes
rtsp: no
rtmp: no
hls: no
webrtc: no
srt: no
moq: no
api: no
metrics: no
pprof: no
playback: no
paths:
{paths}"""

def ts_ns(s):
    # RFC3339Nano -> ns since epoch (keeps all fraction digits)
    m = re.match(r"(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d+))?(Z|[+-]\d\d:\d\d)$", s)
    base = datetime.strptime(m.group(1) + (m.group(3).replace("Z", "+00:00")), "%Y-%m-%dT%H:%M:%S%z")
    frac = (m.group(2) or "").ljust(9, "0")[:9]
    return int(base.timestamp()) * 10**9 + int(frac)

def one(label, binary, root, k, n, rep):
    d = os.path.join(root, f"{label}_N{n:02d}_run{rep:02d}")
    os.makedirs(d)
    paths = "".join(f"  p{i:02d}:\n    runOnInit: {HOOK} {k} {d}/exit_p{i:02d}.ts\n" for i in range(1, n + 1))
    open(os.path.join(d, "cfg.yml"), "w").write(CFG.format(d=d, paths=paths))
    log = os.path.join(d, "server.log")
    t0 = time.monotonic()
    p = subprocess.Popen([binary, os.path.join(d, "cfg.yml")], stdout=open(os.path.join(d, "console.log"), "w"), stderr=subprocess.STDOUT)
    status = "ok"
    while True:
        time.sleep(0.2)
        try:
            c = open(log, "rb").read().count(b"runOnInit command exited")
        except FileNotFoundError:
            c = 0
        if c >= n:
            break
        if time.monotonic() - t0 > 60:
            status = "timeout"
            break
    time.sleep(0.5)
    p.send_signal(signal.SIGINT)
    p.wait(timeout=30)
    wall = time.monotonic() - t0
    lines = {i: 0 for i in range(1, n + 1)}
    exited = {}
    for raw in open(log, "rb"):
        e = json.loads(raw)
        m = re.match(r"\[path p(\d\d)\] (.*)$", e["message"])
        if not m:
            continue
        i, msg = int(m.group(1)), m.group(2)
        if msg == "a":
            lines[i] += 1
        elif msg.startswith("runOnInit command exited"):
            exited[i] = ts_ns(e["timestamp"])
    rows = []
    for i in range(1, n + 1):
        try:
            texit = int(open(os.path.join(d, f"exit_p{i:02d}.ts")).read())
        except (FileNotFoundError, ValueError):
            texit = None
        D = (exited[i] - texit) / 1e6 if (texit and i in exited) else None
        rows.append(dict(label=label, N=n, run=rep, path=i, K=k, logged=lines[i], lost=k - lines[i],
                         D_ms=None if D is None else round(D, 3), wall_s=round(wall, 2), status=status))
    # keep only a small sample of the log
    with open(log, "rb") as f:
        data = f.readlines()
    with open(os.path.join(d, "server.sample.log"), "wb") as f:
        f.writelines(data[:20] + [b"...\n"] + [l for l in data if b"command" in l or b"MediaMTX" in l][:200] + [b"...\n"] + data[-20:])
    os.remove(log)
    return rows

def main():
    label, binary, root, k, rep = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
    ns = [int(x) for x in sys.argv[6:]]
    out = os.path.join(root, f"summary_{label}_run{rep:02d}.csv")
    with open(out, "w", newline="") as f:
        w = None
        for _ in [0]:
            for n in ns:
                for r in one(label, binary, root, k, n, rep):
                    if w is None:
                        w = csv.DictWriter(f, fieldnames=list(r.keys()))
                        w.writeheader()
                    w.writerow(r)
                f.flush()
                print(label, n, rep, flush=True)

main()
