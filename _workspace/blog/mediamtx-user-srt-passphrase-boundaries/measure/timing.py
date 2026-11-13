"""Drive one MediaMTX build through 20 SRT publish attempts per body-delay mode.

usage: python3 -I timing.py <label> <mediamtx-binary> <outroot> <trials> <mode>...
"""
import csv, os, signal, subprocess, sys, time

HERE = "/tmp/osa1w-exp/srt"
CFG = """logLevel: info
logDestinations: [file]
logFile: {d}/server.log
rtsp: no
rtmp: no
hls: no
webrtc: no
moq: no
metrics: no
pprof: no
playback: no
srtAddress: :18890
api: yes
apiAddress: 127.0.0.1:19997
readTimeout: 2s
authMethod: http
authHTTPAddress: http://127.0.0.1:18081/auth
authHTTPExclude:
  - action: api
paths:
  test:
    srtPublishPassphrase: pathpass1234
"""

def rows(path):
    try:
        return list(csv.DictReader(open(path)))
    except FileNotFoundError:
        return []

def main():
    label, binary, root, trials = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    for mode in sys.argv[5:]:
        d = os.path.join(root, f"{label}_{mode.replace(':', '')}")
        os.makedirs(d)
        open(os.path.join(d, "cfg.yml"), "w").write(CFG.format(d=d))
        res = os.path.join(d, "responder.csv")
        rp = subprocess.Popen([sys.executable, "-I", f"{HERE}/responder.py", "18081", "http://127.0.0.1:19997/v3/paths/list", res, mode])
        sp = subprocess.Popen([binary, os.path.join(d, "cfg.yml")], stdout=open(os.path.join(d, "console.log"), "w"), stderr=subprocess.STDOUT)
        time.sleep(1.5)
        wait_s = {"fast": 0.5, "delay:0.1": 0.8, "delay:1": 1.8, "hang:5": 3.0}[mode]
        trial_rows = []
        for t in range(1, trials + 1):
            before = len(rows(res))
            pipe = subprocess.Popen(
                "ffmpeg -loglevel error -re -f lavfi -i testsrc2=size=320x240:rate=25 -t 4 -c:v libx264 -preset ultrafast "
                "-tune zerolatency -g 25 -f mpegts - | srt-live-transmit -q -a:no file://con "
                "'srt://127.0.0.1:18890?streamid=publish:test:timing:x&passphrase=userpass1234'",
                shell=True, start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            t0 = time.monotonic()
            while len(rows(res)) <= before and time.monotonic() - t0 < 10:
                time.sleep(0.05)
            time.sleep(wait_s)
            try:
                os.killpg(pipe.pid, signal.SIGINT)
            except (ProcessLookupError, PermissionError):
                pass  # the publisher already exited (rejected connection)
            try:
                pipe.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(pipe.pid, signal.SIGKILL)
                pipe.wait()
            r = rows(res)
            first = r[before] if len(r) > before else None
            trial_rows.append(dict(label=label, mode=mode, trial=t,
                                   list_after_arrival_ms=first["list_after_arrival_ms"] if first else "",
                                   list_own_ms=first["list_own_ms"] if first else "",
                                   list_status=first["list_status"] if first else "no-auth-request",
                                   auth_requests_in_trial=len(r) - before))
            time.sleep(0.6)
        sp.send_signal(signal.SIGINT)
        sp.wait(timeout=10)
        rp.terminate()
        rp.wait()
        with open(os.path.join(d, "trials.csv"), "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(trial_rows[0].keys()))
            w.writeheader()
            w.writerows(trial_rows)
        print(label, mode, "done", flush=True)

main()
