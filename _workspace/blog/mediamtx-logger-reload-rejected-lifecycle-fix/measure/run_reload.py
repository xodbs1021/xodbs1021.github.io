#!/usr/bin/env python3
"""Logger-reload experiments for MediaMTX builds (run with python3 -I).

usage:
  run_reload.py gap   <mediamtx-binary> <new-outdir> <none|sigint3> <reloads> [logLevel|logFile]
  run_reload.py cycle <mediamtx-binary> <new-outdir> <reloads>

gap:   RTSP on :18554 with an FFmpeg RTSP publisher on /test, API on 127.0.0.1:19997.
       Each reload is a PATCH of logLevel (debug and info in turn) or, with logFile, of logFile
       (two names in turn; logs still go only to stdout). With sigint3 the path
       has a runOnInit hook that traps SIGINT and exits 3 s later.
cycle: a runOnDisconnect hook, armed once per reload, PATCHes logLevel and then polls
       GET /v3/config/global/get (at most 10 s) until it reports the new level.
       The reload is triggered with `nc -z` on the RTSP port.

The server log (structured JSONL), hook events and a per-reload result file are written to
<new-outdir>. The script stops every process it started.
"""
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = "http://127.0.0.1:19997"
RTSP_PORT = 18554


def write_conf(out, hook_init, hook_disconnect):
    lines = [
        "logLevel: info",
        "logDestinations: [stdout]",
        "logStructured: true",
        "api: true",
        "apiAddress: 127.0.0.1:19997",
        "rtsp: true",
        "rtspTransports: [tcp]",
        f"rtspAddress: :{RTSP_PORT}",
        "rtmp: false",
        "hls: false",
        "webrtc: false",
        "srt: false",
        "moq: false",
    ]
    if hook_disconnect:
        lines.append(f"runOnDisconnect: {hook_disconnect}")
    lines.append("paths:")
    lines.append("  test:")
    if hook_init:
        lines.append(f"    runOnInit: {hook_init}")
        lines.append("    runOnInitRestart: false")
    lines.append("  all_others:")
    path = os.path.join(out, "mediamtx.yml")
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")
    return path


def http(method, url, body=None, timeout=1.0):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except Exception as e:  # connection refused while the API is closed
        return None, str(e).encode()


def log_lines(out):
    res = []
    with open(os.path.join(out, "server.log")) as f:
        for line in f:
            line = line.strip()
            if line.startswith("{"):
                try:
                    res.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return res


def wait_for(pred, limit, step=0.05):
    end = time.time() + limit
    while time.time() < end:
        if pred():
            return True
        time.sleep(step)
    return False


def start_server(binary, out, conf):
    log = open(os.path.join(out, "server.log"), "w")
    srv = subprocess.Popen([binary, conf], stdout=log, stderr=subprocess.STDOUT, cwd=out)
    ok = wait_for(lambda: any("started with listeners" in e.get("message", "") for e in log_lines(out))
                  and http("GET", API + "/v3/config/global/get")[0] == 200, 10)
    if not ok:
        srv.kill()
        sys.exit("server did not start")
    return srv, log


def stop_server(srv, out):
    srv.send_signal(signal.SIGINT)
    try:
        code = srv.wait(15)
    except subprocess.TimeoutExpired:
        srv.kill()
        code = "killed"
    with open(os.path.join(out, "exit.txt"), "w") as f:
        f.write(f"server exit={code}\n")


def start_publisher(out, n):
    log = open(os.path.join(out, f"publisher_{n}.log"), "w")
    return subprocess.Popen(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-re", "-f", "lavfi",
         "-i", "testsrc2=size=320x240:rate=25", "-c:v", "libx264", "-preset", "ultrafast",
         "-tune", "zerolatency", "-g", "25", "-f", "rtsp", "-rtsp_transport", "tcp",
         f"rtsp://127.0.0.1:{RTSP_PORT}/test"],
        stdout=log, stderr=subprocess.STDOUT)


def path_ready():
    code, body = http("GET", API + "/v3/paths/get/test")
    return code == 200 and json.loads(body).get("ready") is True


VALUES = {"logLevel": ("debug", "info"), "logFile": ("reload-a.log", "reload-b.log")}


def gap(binary, out, hook, n, field="logLevel"):
    hook_cmd = None
    if hook == "sigint3":
        shutil.copy(os.path.join(HERE, "hook_sigint3.sh"), out)
        hook_cmd = f"sh {os.path.join(out, 'hook_sigint3.sh')} {out}"
    conf = write_conf(out, hook_cmd, None)
    srv, _ = start_server(binary, out, conf)
    pubs = 1
    pub = start_publisher(out, pubs)
    if not wait_for(path_ready, 10):
        sys.exit("publisher not ready")
    time.sleep(1)
    results = []
    for i in range(n):
        level = VALUES[field][i % 2]
        t0 = time.time_ns()
        code, _ = http("PATCH", API + "/v3/config/global/patch", {field: level}, timeout=30)
        back = wait_for(lambda: (lambda c, b: c == 200 and json.loads(b)[field] == level)(
            *http("GET", API + "/v3/config/global/get")), 30, 0.01)
        t1 = time.time_ns()
        time.sleep(4)  # lets a SIGINT-trapping hook finish before the next reload
        dropped = pub.poll() is not None
        if dropped:
            pubs += 1
            pub = start_publisher(out, pubs)
            wait_for(path_ready, 10)
            time.sleep(1)
        results.append({"i": i, "field": field, "value": level, "patch_code": code, "api_back": back,
                        "patch_to_api_ms": round((t1 - t0) / 1e6, 2), "publisher_dropped": dropped})
    pub.terminate()
    pub.wait(5)
    stop_server(srv, out)
    with open(os.path.join(out, "driver.json"), "w") as f:
        json.dump(results, f, indent=1)


def cycle(binary, out, n):
    shutil.copy(os.path.join(HERE, "hook_cycle.sh"), out)
    conf = write_conf(out, None, f"sh {os.path.join(out, 'hook_cycle.sh')} {out}")
    srv, _ = start_server(binary, out, conf)
    for i in range(n):
        level = "debug" if i % 2 == 0 else "info"
        with open(os.path.join(out, "arm"), "w") as f:
            f.write(level)
        before = count_lines(os.path.join(out, "hook_cycle.txt"))
        subprocess.run(["nc", "-z", "127.0.0.1", str(RTSP_PORT)], check=False)
        wait_for(lambda: count_lines(os.path.join(out, "hook_cycle.txt")) > before, 25)
        wait_for(lambda: (lambda c, b: c == 200 and json.loads(b)["logLevel"] == level)(
            *http("GET", API + "/v3/config/global/get")), 25, 0.05)
        time.sleep(2)
    stop_server(srv, out)


def count_lines(p):
    if not os.path.exists(p):
        return 0
    with open(p) as f:
        return sum(1 for _ in f)


def main():
    mode = sys.argv[1]
    binary, out = sys.argv[2], sys.argv[3]
    os.mkdir(out)
    if mode == "gap":
        gap(binary, out, sys.argv[4], int(sys.argv[5]), *sys.argv[6:7])
    elif mode == "cycle":
        cycle(binary, out, int(sys.argv[4]))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
