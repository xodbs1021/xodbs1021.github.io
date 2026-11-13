"""HTTP authentication responder for MediaMTX timing and passphrase checks.

usage: python3 -I responder.py <port> <api-url> <results.csv> <mode>
mode: fast | delay:<seconds> | hang:<seconds>
For every publish/read request it answers 200 with Content-Length set and the
headers flushed at once, then waits before writing the body
{"srtPassphrase": <per-user value>}; "hang" closes without writing the body.
At the moment an SRT request arrives it fires GET <api-url> from another thread
and records how long that request took to complete, measured from the arrival.
"""
import csv, json, sys, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT, API, OUT, MODE = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
PASS = {"carol": "carolpass123", "timing": "userpass1234"}  # dave: no field
lock = threading.Lock()
seq = [0]

def record(row):
    with lock:
        new = not _exists[0]
        with open(OUT, "a", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(row.keys()))
            if new:
                w.writeheader()
                _exists[0] = True
            w.writerow(row)
_exists = [False]

def probe(n, t_arrive, user):
    t0 = time.monotonic_ns()
    try:
        with urllib.request.urlopen(API, timeout=30) as r:
            r.read()
            code = r.status
    except Exception as e:  # noqa: BLE001 - recorded, not hidden
        code = repr(e)
    t1 = time.monotonic_ns()
    record(dict(seq=n, mode=MODE, user=user, list_after_arrival_ms=round((t1 - t_arrive) / 1e6, 3),
                list_own_ms=round((t1 - t0) / 1e6, 3), list_status=code))

class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def do_POST(self):
        t_arrive = time.monotonic_ns()
        req = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        user = req.get("user", "")
        if req.get("protocol") == "srt":
            with lock:
                seq[0] += 1
                n = seq[0]
            threading.Thread(target=probe, args=(n, t_arrive, user), daemon=True).start()
        body = json.dumps({"srtPassphrase": PASS[user]} if user in PASS else {}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.flush()
        kind, _, val = MODE.partition(":")
        if kind == "delay":
            time.sleep(float(val))
        elif kind == "hang":
            time.sleep(float(val))
            self.close_connection = True
            return
        self.wfile.write(body)
        self.wfile.flush()

ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
