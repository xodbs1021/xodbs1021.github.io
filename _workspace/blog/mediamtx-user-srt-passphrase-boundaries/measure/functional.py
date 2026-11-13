"""Accept / reject check of per-user SRT passphrases.

usage: python3 -I functional.py <mediamtx-binary> <outroot>
Publishes to /test with srt-live-transmit for each (user, passphrase) case and
reads the server log: "is publishing to path" = accepted.
"""
import os, re, signal, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))  # responder.py is next to this script
BASE = """logLevel: info
logDestinations: [file]
logFile: {d}/server.log
rtsp: no
rtmp: no
hls: no
webrtc: no
moq: no
api: no
metrics: no
pprof: no
playback: no
srtAddress: :18890
"""
INTERNAL = """authMethod: internal
authInternalUsers:
  - user: alice
    pass: alicepw
    ips: []
    srtPassphrase: alicepass123
    permissions:
      - action: publish
  - user: bob
    pass: bobpw
    ips: []
    permissions:
      - action: publish
paths:
  test:
    srtPublishPassphrase: pathpass1234
"""
HTTP = """authMethod: http
authHTTPAddress: http://127.0.0.1:18081/auth
paths:
  test:
    srtPublishPassphrase: pathpass1234
"""
CASES = {
    "internal": [("alice", "alicepw", "alicepass123"), ("alice", "alicepw", "pathpass1234"),
                 ("bob", "bobpw", "pathpass1234"), ("bob", "bobpw", "alicepass123")],
    "http": [("carol", "x", "carolpass123"), ("carol", "x", "pathpass1234"),
             ("dave", "x", "pathpass1234"), ("dave", "x", "carolpass123")],
}

def run(binary, root, name, auth):
    d = os.path.join(root, f"functional_{name}")
    os.makedirs(d)
    open(os.path.join(d, "cfg.yml"), "w").write(BASE.format(d=d) + auth)
    rp = None
    if name == "http":
        rp = subprocess.Popen([sys.executable, "-I", f"{HERE}/responder.py", "18081", "http://127.0.0.1:1/unused", os.path.join(d, "responder.csv"), "fast"])
    sp = subprocess.Popen([binary, os.path.join(d, "cfg.yml")], stdout=open(os.path.join(d, "console.log"), "w"), stderr=subprocess.STDOUT)
    time.sleep(1.5)
    if sp.poll() is not None:
        print(name, "server exited:", open(os.path.join(d, "console.log")).read().strip().splitlines()[-1])
        if rp:
            rp.terminate(); rp.wait()
        return
    for user, pw, phrase in CASES[name]:
        before = open(os.path.join(d, "server.log")).read()
        pipe = subprocess.Popen(
            "ffmpeg -loglevel error -re -f lavfi -i testsrc2=size=320x240:rate=25 -t 3 -c:v libx264 -preset ultrafast "
            f"-tune zerolatency -g 25 -f mpegts - | srt-live-transmit -q -a:no file://con "
            f"'srt://127.0.0.1:18890?streamid=publish:test:{user}:{pw}&passphrase={phrase}'",
            shell=True, start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(2.5)
        try:
            os.killpg(pipe.pid, signal.SIGINT)
        except (ProcessLookupError, PermissionError):
            pass
        pipe.wait()
        time.sleep(0.8)
        new = open(os.path.join(d, "server.log")).read()[len(before):]
        verdict = "accepted" if "is publishing to path 'test'" in new else "rejected"
        reason = ""
        m = re.search(r"closed: (.*)", new)
        if m:
            reason = m.group(1)
        print(f"{name},{user},{phrase},{verdict},{reason}", flush=True)
    sp.send_signal(signal.SIGINT); sp.wait(timeout=10)
    if rp:
        rp.terminate(); rp.wait()

binary, root = sys.argv[1], sys.argv[2]
for name in ("internal", "http"):
    run(binary, root, name, INTERNAL if name == "internal" else HTTP)
