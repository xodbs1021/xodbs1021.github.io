"""runOnInit exit-code measurements for MediaMTX #6155 (run with python3 -I).

usage: run_hook.py <bin-dir> <new-out-dir> [runs] [--signal]
<bin-dir> holds mediamtx-v1.20.1 and mediamtx-v1.21.0 (build.sh). Every server (RTSP, RTMP, HLS,
WebRTC, SRT, MoQ, API) is off; only the path "test" with a runOnInit hook exists.
Each case runs the server for 12 seconds, then SIGINT, and counts "command exited" lines.
--signal: the hook is `sh -c 'exec sleep 7.123'` and a helper sends SIGTERM to that sleep every second
(pkill -f matches the unique argument), so the child ends by a signal instead of an exit code.
MediaMTX expands $VAR in hook commands itself, so a shell-side `kill $$` cannot be used.
"""
import json
import os
import re
import subprocess
import sys
import threading
import time

SECONDS = 12
COMMANDS = {
    "exit5": "sh -c 'exit 5'",
    "exit1": "sh -c 'exit 1'",
}
SIGNAL_CMD = "sh -c 'exec sleep 7.123'"
EXITED = re.compile(r"command exited(?: with code (-?\d+))?")


def yml(cmd, restart):
    servers = "".join(f"{k}: false\n" for k in ("api", "rtsp", "rtmp", "hls", "webrtc", "srt", "moq"))
    return (f"logLevel: info\nlogDestinations: [stdout]\n{servers}"
            f"paths:\n  test:\n    runOnInit: {cmd}\n    runOnInitRestart: {'true' if restart else 'false'}\n")


def killer(stop):
    while not stop.wait(1.0):
        subprocess.run(["pkill", "-TERM", "-f", "sleep 7.123"], check=False)


def run_case(binary, out, cmd, restart, signal=False):
    os.makedirs(out)
    path = os.path.join(out, "mediamtx.yml")
    with open(path, "w") as f:
        f.write(yml(cmd, restart))
    t0 = time.monotonic()
    proc = subprocess.Popen([binary, path], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    lines = []

    def read():
        for line in proc.stdout:
            lines.append((round(time.monotonic() - t0, 3), line.rstrip("\n")))

    reader = threading.Thread(target=read, daemon=True)
    reader.start()
    stop = threading.Event()
    if signal:
        threading.Thread(target=killer, args=(stop,), daemon=True).start()
    time.sleep(SECONDS)
    stop.set()
    proc.send_signal(2)
    proc.wait(timeout=10)
    reader.join(timeout=5)
    with open(os.path.join(out, "server.log"), "w") as f:
        for t, line in lines:
            f.write(f"{t:8.3f} {line}\n")
    exited = [(t, line) for t, line in lines if "runOnInit" in line and "command exited" in line]
    codes = []
    for _, line in exited:
        m = EXITED.findall(line)
        codes.append(m[-1] if m else "")
    return {
        "restart": restart,
        "launched_lines": sum(1 for _, line in lines if "runOnInit" in line and "command" in line and "exited" not in line),
        "exited_lines": len(exited),
        "codes": codes,
        "exited_times_s": [t for t, _ in exited],
        "first_exited_line": exited[0][1] if exited else "",
        "server_exit": proc.returncode,
    }


def main():
    bindir, root = sys.argv[1], sys.argv[2]
    runs = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    signal = "--signal" in sys.argv
    os.makedirs(root)
    stamp = lambda: [time.strftime("%Y-%m-%dT%H:%M:%S%z"), os.getloadavg()]  # noqa: E731
    summary = {"start": stamp(), "cases": {}}
    for ver in ("v1.20.1", "v1.21.0"):
        b = os.path.join(bindir, f"mediamtx-{ver}")
        commands = {"sigterm": SIGNAL_CMD} if signal else COMMANDS
        for name, cmd in commands.items():
            for restart in (True, False):
                key = f"{ver}_{name}_restart-{'on' if restart else 'off'}"
                n = runs if name in ("exit5", "sigterm") else 1
                summary["cases"][key] = [run_case(b, f"{root}/{key}_run{i}", cmd, restart, signal) for i in range(1, n + 1)]
    summary["end"] = stamp()
    with open(os.path.join(root, "summary.json"), "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
