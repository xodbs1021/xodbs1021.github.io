"""Count fake marker strings in MediaMTX debug logs, per build.

usage: python3 -I run.py <out-dir> <runs> <label>=<binary> [<label>=<binary> ...]

For every build and run:
  1. start auth_server.py on 127.0.0.1:28181 (answers 200, records bodies)
  2. start MediaMTX with mediamtx.yml (logLevel: debug, log to a file)
  3. send the same 5 requests (below), all with fake marker values
  4. stop MediaMTX with SIGINT, stop the auth server
  5. count each marker in the MediaMTX log and in the bodies the auth server got,
     and collect the "(body of N bytes)" lines

Every value is a made-up test string that starts with MTX6379W-.
Only loopback addresses are used.
"""

import base64
import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = "http://127.0.0.1:29997"
WEBRTC = "http://127.0.0.1:28889"
AUTH_PORT = 28181
PORTS = [29997, 28889, AUTH_PORT]

API_USER, API_PASS = "apiuser", "MTX6379W-APIPASS"
WHEP_USER, WHEP_PASS = "whepuser", "MTX6379W-WHEPPASS"

SDP_OFFER = (
    "v=0\r\n"
    "o=- 1 1 IN IP4 127.0.0.1\r\n"
    "s=MTX6379W-SDP\r\n"
    "t=0 0\r\n"
    "m=video 9 UDP/TLS/RTP/SAVPF 96\r\n"
    "c=IN IP4 0.0.0.0\r\n"
    "a=rtpmap:96 H264/90000\r\n"
    "a=recvonly\r\n"
)

# (name, method, url, content-type, body, user, password)
REQUESTS = [
    ("api_paths_add", "POST", API + "/v3/config/paths/add/probe", "application/json",
     json.dumps({"srtPublishPassphrase": "MTX6379W-SRTPUB-A",
                 "srtReadPassphrase": "MTX6379W-SRTREAD",
                 "whepBearerToken": "MTX6379W-WHEPBEARER"}), API_USER, API_PASS),
    ("api_paths_patch", "PATCH", API + "/v3/config/paths/patch/probe", "application/json",
     json.dumps({"srtPublishPassphrase": "MTX6379W-SRTPUB-B"}), API_USER, API_PASS),
    ("api_global_patch", "PATCH", API + "/v3/config/global/patch", "application/json",
     json.dumps({"hlsCDNSecret": "MTX6379W-HLSCDN",
                 "authInternalUsers": [{"user": "u1", "pass": "MTX6379W-USERPASS",
                                        "ips": [], "permissions": [{"action": "publish"}]}]}),
     API_USER, API_PASS),
    ("api_paths_get", "GET", API + "/v3/config/paths/get/probe", None, None, API_USER, API_PASS),
    ("whep_offer", "POST", WEBRTC + "/probe/whep?token=MTX6379W-QUERYTOKEN", "application/sdp",
     SDP_OFFER, WHEP_USER, WHEP_PASS),
]

MARKERS = [
    ("MTX6379W-SRTPUB-A", "API body: srtPublishPassphrase (paths/add)"),
    ("MTX6379W-SRTREAD", "API body: srtReadPassphrase (paths/add)"),
    ("MTX6379W-WHEPBEARER", "API body: whepBearerToken (paths/add)"),
    ("MTX6379W-SRTPUB-B", "API body: srtPublishPassphrase (paths/patch)"),
    ("MTX6379W-HLSCDN", "API body: hlsCDNSecret (global/patch)"),
    ("MTX6379W-USERPASS", "API body: authInternalUsers[].pass (global/patch)"),
    ("MTX6379W-APIPASS", "auth body: password+token of the 4 API requests"),
    ("MTX6379W-WHEPPASS", "auth body: password+token of the WHEP request"),
    ("MTX6379W-QUERYTOKEN", "WHEP query: request line + auth body query"),
    ("MTX6379W-SDP", "WHEP body: SDP offer (application/sdp)"),
]


def wait_port(port, up, timeout=15.0):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        with socket.socket() as s:
            s.settimeout(0.2)
            ok = s.connect_ex(("127.0.0.1", port)) == 0
        if ok == up:
            return
        time.sleep(0.05)
    raise RuntimeError(f"port {port} did not become {'open' if up else 'closed'}")


def send(method, url, ctype, body, user, password):
    data = body.encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if ctype:
        req.add_header("Content-Type", ctype)
    cred = base64.b64encode(f"{user}:{password}".encode()).decode()
    req.add_header("Authorization", "Basic " + cred)
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status, len(data or b"")
    except urllib.error.HTTPError as e:
        return e.code, len(data or b"")


def one_run(binary, rundir):
    os.makedirs(rundir)
    with open(os.path.join(HERE, "mediamtx.yml")) as f:
        conf = f.read().replace("{RUNDIR}", rundir)
    conf_path = os.path.join(rundir, "mediamtx.yml")
    with open(conf_path, "w") as f:
        f.write(conf)
    bodies = os.path.join(rundir, "auth_bodies.jsonl")
    open(bodies, "w").close()

    auth = subprocess.Popen([sys.executable, "-I", os.path.join(HERE, "auth_server.py"),
                             str(AUTH_PORT), bodies])
    mtx = None
    try:
        wait_port(AUTH_PORT, True)
        mtx = subprocess.Popen([binary, conf_path], cwd=rundir,
                               stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        wait_port(29997, True)
        wait_port(28889, True)
        statuses = []
        for name, method, url, ctype, body, user, password in REQUESTS:
            code, size = send(method, url, ctype, body, user, password)
            statuses.append({"request": name, "status": code, "body_bytes": size})
            time.sleep(0.3)
        time.sleep(0.5)
    finally:
        if mtx is not None:
            mtx.send_signal(signal.SIGINT)
            mtx.wait(timeout=15)
        auth.terminate()
        auth.wait(timeout=5)
    for p in PORTS:
        wait_port(p, False)
    with open(os.path.join(rundir, "statuses.json"), "w") as f:
        json.dump(statuses, f, indent=1)
    return statuses


def count(rundir):
    with open(os.path.join(rundir, "mediamtx.log"), encoding="utf-8") as f:
        log = f.read()
    with open(os.path.join(rundir, "auth_bodies.jsonl"), encoding="utf-8") as f:
        received = f.read()
    auth_sizes = [len(line.encode()) for line in received.splitlines() if line]
    return {
        "log_markers": {m: log.count(m) for m, _ in MARKERS},
        "auth_server_markers": {m: received.count(m) for m, _ in MARKERS},
        "body_of_lines": re.findall(r"\(body of (\d+) bytes\)", log),
        "auth_requests_logged": len(re.findall(r"\[c->s\] POST /auth HTTP/1\.1", log)),
        "auth_bodies_received_bytes": auth_sizes,
    }


def main():
    out, runs, builds = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
    os.makedirs(out, exist_ok=True)
    results = {}
    for spec in builds:
        label, binary = spec.split("=", 1)
        for i in range(1, runs + 1):
            rundir = os.path.join(out, label, f"run{i}")
            if os.path.exists(rundir):
                shutil.rmtree(rundir)
            statuses = one_run(binary, rundir)
            results.setdefault(label, []).append({"statuses": statuses, **count(rundir)})
            print(label, i, json.dumps(results[label][-1]["log_markers"]), flush=True)
    with open(os.path.join(out, "results.json"), "w") as f:
        json.dump({"markers": MARKERS, "requests": [r[0] for r in REQUESTS],
                   "results": results}, f, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
