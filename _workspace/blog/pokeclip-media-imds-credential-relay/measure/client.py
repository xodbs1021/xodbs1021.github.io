"""창구(cred-relay)에 직접 HTTP 요청을 보내고 결과를 JSON 한 줄씩 남긴다. 표준 라이브러리만 쓴다.

  client.py once   --label L [--token-file F | --auth S] [--method GET] [--path /v1/credentials]
  client.py series --label L --token-file F --every 초 --count N

남기는 것: 상태 코드 · 걸린 ms · 응답 Expiration(있으면) · 받은 시각(UTC) · 보낸 만료까지 남은 초.
자격 값은 남기지 않는다(가짜 값이어도).
"""

import argparse
import http.client
import json
import os
import sys
import time
from datetime import datetime, timezone

RELAY_HOST = os.environ.get("RELAY_HOST", "169.254.170.2")
RELAY_PORT = int(os.environ.get("RELAY_PORT", "8080"))


def parse_iso(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc) if "." not in s else \
        datetime.fromisoformat(s.replace("Z", "+00:00"))


def request(label, auth=None, method="GET", path="/v1/credentials"):
    headers = {}
    if auth is not None:
        headers["Authorization"] = auth
    t0 = time.time()
    conn = http.client.HTTPConnection(RELAY_HOST, RELAY_PORT, timeout=10)
    try:
        conn.request(method, path, headers=headers)
        resp = conn.getresponse()
        body = resp.read()
        status = resp.status
        ctype = resp.getheader("Content-Type")
        cache = resp.getheader("Cache-Control")
    except OSError as e:
        out = {"label": label, "status": None, "err": type(e).__name__ + ": " + str(e)}
        out["ms"] = round((time.time() - t0) * 1000, 1)
        print(json.dumps(out, ensure_ascii=False), flush=True)
        return out
    finally:
        conn.close()
    t1 = time.time()
    recv = datetime.fromtimestamp(t1, timezone.utc)
    out = {"label": label, "status": status, "ms": round((t1 - t0) * 1000, 1),
           "recv": recv.isoformat(timespec="milliseconds"), "content_type": ctype, "cache_control": cache}
    try:
        doc = json.loads(body)
    except ValueError:
        doc = None
    if isinstance(doc, dict):
        if "Expiration" in doc:
            exp = parse_iso(doc["Expiration"])
            out["expiration"] = doc["Expiration"]
            out["sent_left_s"] = round((exp - recv).total_seconds(), 3)
            out["fields"] = sorted(k for k in doc if k != "Expiration")
        if "code" in doc:
            out["code"] = doc["code"]
    print(json.dumps(out, ensure_ascii=False), flush=True)
    return out


def read_token(path):
    with open(path, "rb") as f:
        return f.read().decode()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["once", "series"])
    p.add_argument("--label", required=True)
    p.add_argument("--token-file")
    p.add_argument("--auth")
    p.add_argument("--method", default="GET")
    p.add_argument("--path", default="/v1/credentials")
    p.add_argument("--every", type=float, default=0)
    p.add_argument("--count", type=int, default=1)
    a = p.parse_args()

    auth = a.auth
    if a.token_file:
        auth = read_token(a.token_file)
    if a.cmd == "once":
        request(a.label, auth, a.method, a.path)
        return
    start = time.time()
    for i in range(a.count):
        target = start + i * a.every
        delay = target - time.time()
        if delay > 0:
            time.sleep(delay)
        request(f"{a.label}#{i}", auth, a.method, a.path)


if __name__ == "__main__":
    sys.exit(main())
