"""HLS segment-count measurements for MediaMTX #6154 (run with python3 -I).

usage: run_hls.py <bin-dir> <new-out-dir> [runs]
<bin-dir> holds mediamtx-v1.20.1, mediamtx-v1.21.0, mediamtx-v1.21.3 (build.sh).
Needs ffmpeg on PATH. Ports: RTSP :18554, HLS 127.0.0.1:18888, API 127.0.0.1:19997.
Writes one folder per case (config, server log with monotonic offsets, result.json) and summary.json.
"""
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

RTSP = "rtsp://127.0.0.1:18554/test"
HLS = "http://127.0.0.1:18888/test/index.m3u8"
API = "http://127.0.0.1:19997"
START_WAIT = 4.0  # seconds to decide whether the server stayed up
CRASH_LINE = "muxer instance crashed"


def config(variant, count, hls=True, api=False):
    b = lambda v: "true" if v else "false"  # noqa: E731
    return (
        "logLevel: info\nlogDestinations: [stdout]\n"
        f"api: {b(api)}\napiAddress: 127.0.0.1:19997\n"
        "rtsp: true\nrtspTransports: [tcp]\nrtspAddress: :18554\n"
        "rtmp: false\nwebrtc: false\nsrt: false\nmoq: false\n"
        f"hls: {b(hls)}\nhlsAddress: 127.0.0.1:18888\nhlsAlwaysRemux: true\n"
        f"hlsVariant: {variant}\nhlsSegmentCount: {count}\n"
        "paths:\n  all_others:\n"
    )


class Server:
    def __init__(self, binary, out, cfg, env=None):
        os.makedirs(out)
        self.out = out
        with open(os.path.join(out, "mediamtx.yml"), "w") as f:
            f.write(cfg)
        full_env = dict(os.environ, **(env or {}))
        self.t0 = time.monotonic()
        self.proc = subprocess.Popen(
            [binary, os.path.join(out, "mediamtx.yml")], stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, env=full_env,
        )
        self.lines = []
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()

    def _read(self):
        for line in self.proc.stdout:
            self.lines.append((round(time.monotonic() - self.t0, 3), line.rstrip("\n")))

    def wait_start(self):
        """True if the server is still running after START_WAIT seconds."""
        try:
            self.proc.wait(timeout=START_WAIT)
            return False
        except subprocess.TimeoutExpired:
            return True

    def stop(self):
        if self.proc.poll() is None:
            self.proc.send_signal(2)
            try:
                self.proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.proc.kill()
                self.proc.wait()
        self.reader.join(timeout=5)
        with open(os.path.join(self.out, "server.log"), "w") as f:
            for t, line in self.lines:
                f.write(f"{t:9.3f} {line}\n")
        return self.proc.returncode


def publish(seconds, out):
    log = open(os.path.join(out, "ffmpeg.log"), "w")
    return subprocess.Popen(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-re", "-f", "lavfi",
         "-i", "testsrc2=size=320x240:rate=30", "-t", str(seconds),
         "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
         "-g", "30", "-pix_fmt", "yuv420p", "-f", "rtsp", "-rtsp_transport", "tcp", RTSP],
        stdout=log, stderr=subprocess.STDOUT,
    )


def http(method, url, body=None, timeout=10):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json"} if data else {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(400).decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read(400).decode(errors="replace")
    except Exception as e:  # timeout, refused
        return 0, type(e).__name__


def crash_times(lines):
    return [t for t, line in lines if CRASH_LINE in line]


def err_lines(lines):
    return [line for _, line in lines if " ERR " in line or "ERR:" in line]


def case_restart(binary, out, seconds=45):
    """(b) lowLatency, 6 segments, hlsAlwaysRemux: crashes while publishing."""
    srv = Server(binary, out, config("lowLatency", 6))
    up = srv.wait_start()
    res = {"started": up}
    if up:
        pub = publish(seconds, out)
        t_pub = round(time.monotonic() - srv.t0, 3)
        pub.wait()
        res["publish_start_s"] = t_pub
        res["publish_s"] = seconds
    res["exit_code"] = srv.stop()
    times = crash_times(srv.lines)
    res["crash_count"] = len(times)
    res["crash_times_s"] = times
    res["crash_intervals_s"] = [round(b - a, 3) for a, b in zip(times, times[1:])]
    res["error_lines"] = err_lines(srv.lines)[:3]
    return res


def case_matrix(binary, out, variant, count, hls=True):
    """(c) does the server start, and if so does /test/index.m3u8 answer while publishing."""
    srv = Server(binary, out, config(variant, count, hls=hls))
    up = srv.wait_start()
    res = {"variant": variant, "count": count, "hls": hls, "started": up}
    if up:
        pub = publish(16, out)
        time.sleep(10)
        res["m3u8_status"], body = http("GET", HLS, timeout=6)
        res["m3u8_head"] = body[:120]
        pub.wait()
    res["exit_code"] = srv.stop()
    res["crash_count"] = len(crash_times(srv.lines))
    res["error_lines"] = err_lines(srv.lines)[:2]
    return res


def case_env(binary, out):
    """(d) environment variable path: file says 7, MTX_HLSSEGMENTCOUNT=6."""
    srv = Server(binary, out, config("lowLatency", 7), env={"MTX_HLSSEGMENTCOUNT": "6"})
    up = srv.wait_start()
    res = {"started": up}
    res["exit_code"] = srv.stop()
    res["error_lines"] = err_lines(srv.lines)[:2]
    return res


def case_api(binary, out):
    """(d) API path: running with 7, PATCH hlsSegmentCount to 6."""
    srv = Server(binary, out, config("lowLatency", 7, api=True))
    up = srv.wait_start()
    res = {"started": up}
    if up:
        res["patch_status"], res["patch_body"] = http(
            "PATCH", API + "/v3/config/global/patch", {"hlsSegmentCount": 6})
        time.sleep(1)
        res["get_status"], body = http("GET", API + "/v3/config/global/get")
        try:
            res["hlsSegmentCount_after"] = json.loads(body).get("hlsSegmentCount")
        except ValueError:
            # body is truncated to 400 bytes; fall back to a fresh full read
            with urllib.request.urlopen(API + "/v3/config/global/get", timeout=5) as r:
                res["hlsSegmentCount_after"] = json.loads(r.read()).get("hlsSegmentCount")
    res["exit_code"] = srv.stop()
    return res


MATRIX = [("lowLatency", 6), ("lowLatency", 7), ("lowLatency", 0),
          ("fmp4", 2), ("fmp4", 3), ("mpegts", 2), ("mpegts", 3)]


def main():
    bindir, root = sys.argv[1], sys.argv[2]
    runs = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    os.makedirs(root)
    bins = {v: os.path.join(bindir, f"mediamtx-{v}") for v in ("v1.20.1", "v1.21.0", "v1.21.3")}
    summary = {"restart": {}, "matrix": {}, "env": {}, "api": {}}
    stamp = lambda: time.strftime("%Y-%m-%dT%H:%M:%S%z")  # noqa: E731
    load = lambda: os.getloadavg()  # noqa: E731
    summary["start"] = [stamp(), load()]
    for ver, b in bins.items():
        summary["restart"][ver] = [case_restart(b, f"{root}/restart_{ver}_run{i}") for i in range(1, runs + 1)]
    summary["after_restart"] = [stamp(), load()]
    for ver in ("v1.20.1", "v1.21.0"):
        rows = []
        for i in range(1, runs + 1):
            for variant, count in MATRIX:
                rows.append(case_matrix(bins[ver], f"{root}/matrix_{ver}_{variant}{count}_run{i}", variant, count))
            rows.append(case_matrix(bins[ver], f"{root}/matrix_{ver}_hlsoff1_run{i}", "lowLatency", 1, hls=False))
        summary["matrix"][ver] = rows
    summary["after_matrix"] = [stamp(), load()]
    for ver in ("v1.20.1", "v1.21.0"):
        summary["env"][ver] = case_env(bins[ver], f"{root}/env_{ver}")
        summary["api"][ver] = case_api(bins[ver], f"{root}/api_{ver}")
    summary["end"] = [stamp(), load()]
    with open(os.path.join(root, "summary.json"), "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
