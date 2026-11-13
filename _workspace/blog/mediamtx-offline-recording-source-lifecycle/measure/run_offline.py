"""Offline-period recording with alwaysAvailableRecorded true / false (run with python3 -I).

usage: run_offline.py <bin-dir> <new-out-dir> [runs]
<bin-dir> holds mediamtx-v1.21.0 (build.sh). Needs ffmpeg on PATH. RTSP on :28554, other servers off.
Timeline per run: server up with no publisher for 8 s (offline) -> RTSP publisher for 8 s (online)
-> publisher gone for 8 s (offline again). Recorded fMP4 files (2 s segments) are counted after each phase.
"""
import json
import os
import subprocess
import sys
import time

PHASE = 8


def yml(out, recorded):
    servers = "".join(f"{k}: false\n" for k in ("api", "rtmp", "hls", "webrtc", "srt", "moq"))
    return (
        "logLevel: info\nlogDestinations: [stdout]\n" + servers
        + "rtsp: true\nrtspTransports: [tcp]\nrtspAddress: :28554\n"
        + "paths:\n  test:\n"
        + "    alwaysAvailable: true\n    alwaysAvailableTracks:\n      - codec: H264\n"
        + f"    alwaysAvailableRecorded: {'true' if recorded else 'false'}\n"
        + "    record: true\n"
        + f"    recordPath: {out}/rec/%path/%Y-%m-%d_%H-%M-%S-%f\n"
        + "    recordSegmentDuration: 2s\n    recordPartDuration: 1s\n"
    )


def files(out):
    d = os.path.join(out, "rec", "test")
    if not os.path.isdir(d):
        return 0, 0
    names = os.listdir(d)
    return len(names), sum(os.path.getsize(os.path.join(d, n)) for n in names)


def run(binary, out, recorded):
    os.makedirs(out)
    cfg = os.path.join(out, "mediamtx.yml")
    with open(cfg, "w") as f:
        f.write(yml(out, recorded))
    log = open(os.path.join(out, "server.log"), "w")
    srv = subprocess.Popen([binary, cfg], stdout=log, stderr=subprocess.STDOUT)
    res = {"alwaysAvailableRecorded": recorded}
    time.sleep(PHASE)
    res["after_offline_1"] = files(out)
    pub = subprocess.Popen(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-re", "-f", "lavfi",
         "-i", "testsrc2=size=320x240:rate=30", "-t", str(PHASE), "-c:v", "libx264",
         "-preset", "ultrafast", "-tune", "zerolatency", "-g", "30", "-pix_fmt", "yuv420p",
         "-f", "rtsp", "-rtsp_transport", "tcp", "rtsp://127.0.0.1:28554/test"],
        stdout=subprocess.DEVNULL, stderr=open(os.path.join(out, "ffmpeg.log"), "w"))
    pub.wait()
    time.sleep(0.5)
    res["after_online"] = files(out)
    time.sleep(PHASE)
    res["after_offline_2"] = files(out)
    srv.send_signal(2)
    srv.wait(timeout=10)
    res["server_exit"] = srv.returncode
    res["final"] = files(out)
    return res


def main():
    bindir, root = sys.argv[1], sys.argv[2]
    runs = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    os.makedirs(root)
    stamp = lambda: [time.strftime("%Y-%m-%dT%H:%M:%S%z"), os.getloadavg()]  # noqa: E731
    summary = {"start": stamp(), "binary": "mediamtx-v1.21.0", "runs": []}
    b = os.path.join(bindir, "mediamtx-v1.21.0")
    for i in range(1, runs + 1):
        for recorded in (True, False):
            name = f"recorded-{'true' if recorded else 'false'}_run{i}"
            summary["runs"].append(dict(run(b, os.path.join(root, name), recorded), name=name))
    summary["end"] = stamp()
    with open(os.path.join(root, "summary.json"), "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
