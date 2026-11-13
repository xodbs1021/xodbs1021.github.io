"""Logger reload while a hook is writing (logHookOutput on).

usage: python3 -I reload.py <label> <mediamtx-binary> <outroot> <reps>
One path runs a hook that writes 1,000 numbered lines, 2 ms apart. About 1 s in,
the configuration file is rewritten with a different logFile, which makes
MediaMTX reload its logger. We count which numbered lines reached either log
file, and whether any reached the console instead.
"""
import os, re, signal, subprocess, sys, time

# reload_hook.pl lives next to this script unless HOOK is set.
HOOK = os.environ.get("HOOK", os.path.join(os.path.dirname(os.path.abspath(__file__)), "reload_hook.pl"))
CFG = """logLevel: info
logDestinations: [file]
logFile: {log}
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
  p01:
    runOnInit: {hook}
"""

def main():
    label, binary, root, reps = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    print("label,run,in_first_log,in_second_log,distinct,duplicates,missing,on_console,reloaded")
    for rep in range(1, reps + 1):
        d = os.path.join(root, f"reload_{label}_run{rep:02d}")
        os.makedirs(d)
        cfg = os.path.join(d, "cfg.yml")
        log1, log2 = os.path.join(d, "server1.log"), os.path.join(d, "server2.log")
        open(cfg, "w").write(CFG.format(log=log1, hook=HOOK))
        con = os.path.join(d, "console.log")
        p = subprocess.Popen([binary, cfg], stdout=open(con, "w"), stderr=subprocess.STDOUT)
        time.sleep(1.0)
        open(cfg, "w").write(CFG.format(log=log2, hook=HOOK))
        time.sleep(4.0)
        p.send_signal(signal.SIGINT)
        p.wait(timeout=30)
        seen = []
        counts = []
        for f in (log1, log2):
            n = 0
            if os.path.exists(f):
                for line in open(f):
                    m = re.search(r"\[path p01\] r (\d+)$", line.rstrip())
                    if m:
                        seen.append(int(m.group(1)))
                        n += 1
            counts.append(n)
        txt = open(log1).read() + (open(log2).read() if os.path.exists(log2) else "")
        on_console = sum(1 for l in open(con) if re.match(r"r \d+$", l.strip()))
        reloaded = "reloading configuration" in txt
        print(f"{label},{rep},{counts[0]},{counts[1]},{len(set(seen))},{len(seen)-len(set(seen))},{1000-len(set(seen))},{on_console},{reloaded}", flush=True)

main()
