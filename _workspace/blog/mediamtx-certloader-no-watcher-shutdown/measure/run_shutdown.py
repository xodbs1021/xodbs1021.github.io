#!/usr/bin/env python3
"""SIGINT-to-exit time of MediaMTX in a writable or read-only working directory (run with python3 -I).

usage: run_shutdown.py <mediamtx-binary> <config-file> <new-outdir> <writable|readonly> <runs> [ENV=VALUE ...]

Each run gets a new working directory that contains only <config-file> as mediamtx.yml.
readonly = chmod 555 on that directory (run as a non-root user). The server is started
without arguments from that directory, so it reads ./mediamtx.yml and tries to save
auto.key / auto.crt there. After the MoQ "started" line, SIGINT is sent; if the process
is still alive after 10 s it gets SIGKILL. The working directory is made writable again
afterwards so that it can be removed. Generated keys stay in the working directory and are
not copied to <new-outdir>; only server logs and results are.
"""
import json
import os
import shutil
import signal
import subprocess
import sys
import time

LIMIT_S = 10.0


def run_once(binary, conf, work, log_path, readonly, env):
    os.mkdir(work)
    shutil.copy(conf, os.path.join(work, "mediamtx.yml"))
    if readonly:
        os.chmod(work, 0o555)
    log = open(log_path, "w")
    proc = subprocess.Popen([binary], cwd=work, stdout=log, stderr=subprocess.STDOUT,
                            env={**os.environ, **env})
    started = False
    end = time.time() + 15
    while time.time() < end:
        with open(log_path) as f:
            text = f.read()
        if "[MoQ] started with listeners" in text:
            started = True
            break
        if proc.poll() is not None:
            break
        time.sleep(0.05)
    time.sleep(0.5)
    t0 = time.monotonic_ns()
    proc.send_signal(signal.SIGINT)
    try:
        code = proc.wait(LIMIT_S)
        elapsed = (time.monotonic_ns() - t0) / 1e6
        result = "exited"
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
        code = None
        elapsed = None
        result = "killed_after_10s"
    log.close()
    os.chmod(work, 0o755)
    with open(log_path) as f:
        text = f.read()
    return {
        "started": started,
        "save_failed": "failed to save TLS key" in text,
        "result": result,
        "exit_code": code,
        "sigint_to_exit_ms": None if elapsed is None else round(elapsed, 2),
        "last_line": text.strip().splitlines()[-1] if text.strip() else "",
    }


def main():
    if len(sys.argv) < 6:
        sys.exit(__doc__)
    binary, conf, out, mode, runs = sys.argv[1:6]
    env = dict(a.split("=", 1) for a in sys.argv[6:])
    os.mkdir(out)
    work_root = out + "-work"
    os.mkdir(work_root)
    results = []
    for i in range(int(runs)):
        r = run_once(binary, conf, os.path.join(work_root, f"run{i}"),
                     os.path.join(out, f"server_{i}.log"), mode == "readonly", env)
        r["i"] = i
        results.append(r)
        print(json.dumps(r, ensure_ascii=False))
        time.sleep(0.5)
    with open(os.path.join(out, "results.json"), "w") as f:
        json.dump(results, f, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
