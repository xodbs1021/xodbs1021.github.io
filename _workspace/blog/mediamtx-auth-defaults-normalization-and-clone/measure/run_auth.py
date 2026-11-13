"""Binary measurements for MediaMTX #6205 (run with python3 -I).

usage: run_auth.py <mediamtx-git-clone> <bin-dir> <new-out-dir> [runs]
<bin-dir> holds mediamtx-v1.15.6, mediamtx-v1.21.0, mediamtx-v1.21.1 (build.sh).
Each binary gets the mediamtx.yml shipped with its own tag (read from the clone), with every
media server turned off and the API on 127.0.0.1:29997 so that only configuration loading is measured.

Cases:
  shipped_legacy  shipped mediamtx.yml + a path with readUser/readPass   -> does it start?
  env_legacy      file with only that path + MTX_AUTHINTERNALUSERS_0_USER=alice -> start? alice kept?
  api_add_legacy  shipped mediamtx.yml, then POST /v3/config/paths/add/cam with readUser/readPass
"""
import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

API = "http://127.0.0.1:29997"
START_WAIT = 4.0
LEGACY_PATH = "  cam:\n    readUser: myuser\n    readPass: mypass\n"
SERVERS_OFF = ("rtsp", "rtmp", "hls", "webrtc", "srt", "moq")


def shipped_yml(clone, tag):
    yml = subprocess.run(["git", "-C", clone, "show", f"{tag}:mediamtx.yml"],
                         capture_output=True, text=True, check=True).stdout
    for key in SERVERS_OFF:
        yml = re.sub(rf"(?m)^{key}: \S+$", f"{key}: false", yml)
    yml = re.sub(r"(?m)^api: \S+$", "api: true", yml)
    yml = re.sub(r"(?m)^apiAddress: \S+$", "apiAddress: 127.0.0.1:29997", yml)
    assert yml.rstrip().endswith("all_others:"), "expected paths section at the end"
    return yml


def minimal_yml():
    return ("api: true\napiAddress: 127.0.0.1:29997\n"
            + "".join(f"{k}: false\n" for k in SERVERS_OFF if k != "moq")
            + "paths:\n" + LEGACY_PATH)


def http(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json"} if data else {})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")
    except Exception as e:
        return 0, type(e).__name__


class Server:
    def __init__(self, binary, out, yml, env=None):
        os.makedirs(out)
        self.out = out
        path = os.path.join(out, "mediamtx.yml")
        with open(path, "w") as f:
            f.write(yml)
        self.proc = subprocess.Popen([binary, path], stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                     text=True, env=dict(os.environ, **(env or {})))
        self.lines = []
        self.reader = threading.Thread(target=lambda: self.lines.extend(self.proc.stdout), daemon=True)
        self.reader.start()

    def started(self):
        try:
            self.proc.wait(timeout=START_WAIT)
            return False
        except subprocess.TimeoutExpired:
            return True

    def stop(self):
        if self.proc.poll() is None:
            self.proc.send_signal(2)
            self.proc.wait(timeout=10)
        self.reader.join(timeout=5)
        with open(os.path.join(self.out, "server.log"), "w") as f:
            f.writelines(self.lines)
        return self.proc.returncode

    def errors(self):
        return [line.strip() for line in self.lines if "ERR" in line][:2]


def users(body):
    try:
        return [u.get("user") for u in json.loads(body).get("authInternalUsers", [])]
    except ValueError:
        return None


def case_shipped(binary, out, clone, tag, legacy):
    yml = shipped_yml(clone, tag) + (LEGACY_PATH if legacy else "")
    srv = Server(binary, out, yml)
    res = {"started": srv.started()}
    res["exit_code"] = srv.stop()
    res["errors"] = srv.errors()
    return res


def case_env(binary, out):
    srv = Server(binary, out, minimal_yml(), env={"MTX_AUTHINTERNALUSERS_0_USER": "alice"})
    res = {"started": srv.started()}
    if res["started"]:
        status, body = http("GET", API + "/v3/config/global/get")
        res["get_status"] = status
        res["users"] = users(body)
        res["alice_kept"] = res["users"] is not None and "alice" in res["users"]
    res["exit_code"] = srv.stop()
    res["errors"] = srv.errors()
    return res


def case_api_add(binary, out, clone, tag):
    srv = Server(binary, out, shipped_yml(clone, tag))
    res = {"started": srv.started()}
    if res["started"]:
        status, body = http("POST", API + "/v3/config/paths/add/cam",
                            {"readUser": "myuser", "readPass": "mypass"})
        res["add_status"] = status
        res["add_body"] = body.strip()[:200]
    res["exit_code"] = srv.stop()
    return res


def main():
    clone, bindir, root = sys.argv[1], sys.argv[2], sys.argv[3]
    runs = int(sys.argv[4]) if len(sys.argv) > 4 else 3
    os.makedirs(root)
    stamp = lambda: [time.strftime("%Y-%m-%dT%H:%M:%S%z"), os.getloadavg()]  # noqa: E731
    summary = {"start": stamp(), "cases": {}}
    for tag in ("v1.15.6", "v1.21.0", "v1.21.1"):
        b = os.path.join(bindir, f"mediamtx-{tag}")
        rows = summary["cases"][tag] = {"shipped": [], "shipped_legacy": [], "env_legacy": [], "api_add_legacy": []}
        for i in range(1, runs + 1):
            rows["shipped"].append(case_shipped(b, f"{root}/{tag}_shipped_run{i}", clone, tag, False))
            rows["shipped_legacy"].append(case_shipped(b, f"{root}/{tag}_shipped_legacy_run{i}", clone, tag, True))
            rows["env_legacy"].append(case_env(b, f"{root}/{tag}_env_legacy_run{i}"))
            rows["api_add_legacy"].append(case_api_add(b, f"{root}/{tag}_api_add_legacy_run{i}", clone, tag))
    summary["end"] = stamp()
    with open(os.path.join(root, "summary.json"), "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
