"""가짜 IMDS(IMDSv2) — 공개 재측정용. 실제 AWS 와 무관한 가짜 자격만 낸다.

흉내 내는 것
  PUT /latest/api/token                         X-aws-ec2-metadata-token-ttl-seconds 머리가 있어야 토큰을 준다
  GET /latest/meta-data/iam/security-credentials/        역할 이름 한 줄(토큰 필수)
  GET /latest/meta-data/iam/security-credentials/<역할>   역할 자격 JSON(토큰 필수)
흉내 내지 않는 것: 홉 상한(응답 TTL), 스로틀링, 자동 교대.

자격 한 벌의 만료는 기동 때 「지금 + ROLE_EXPIRES_S 초」 로 정하고, 다시 물어도 같은 값을 준다(실제 IMDS 처럼
교대 전까지 같은 자격 · 같은 만료).

측정 보조(실제 IMDS 에 없음)
  GET  /_bench/state           만료 · 모드 · 경로별 호출 수(JSON)
  POST /_bench/mode?m=ok|fail|slow   fail = 자격 경로 500, slow = 응답 전 SLOW_S 초 대기
요청마다 stdout 에 JSON 한 줄을 남긴다(값 · 토큰 원문은 싣지 않는다).
"""

import json
import os
import secrets
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROLE = "bench-role"
CREDS_PREFIX = "/latest/meta-data/iam/security-credentials/"
TOKEN_PATH = "/latest/api/token"
TTL_HEADER = "X-aws-ec2-metadata-token-ttl-seconds"
TOKEN_HEADER = "X-aws-ec2-metadata-token"

EXPIRES_S = int(os.environ.get("ROLE_EXPIRES_S", "21600"))
SLOW_S = float(os.environ.get("SLOW_S", "3"))
STARTED = datetime.now(timezone.utc)
EXPIRATION = (STARTED + timedelta(seconds=EXPIRES_S)).replace(microsecond=0)

LOCK = threading.Lock()
STATE = {"mode": "ok", "counts": {}}
TOKENS = set()


def iso(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def log(**kv):
    kv["ts"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    sys.stdout.write(json.dumps(kv, ensure_ascii=False) + "\n")
    sys.stdout.flush()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *_):  # 기본 접근 로그 대신 JSON 한 줄
        pass

    def _send(self, status, body=b"", ctype="text/plain", headers=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _count(self, key):
        with LOCK:
            STATE["counts"][key] = STATE["counts"].get(key, 0) + 1

    def do_PUT(self):
        path = urlparse(self.path).path
        if path != TOKEN_PATH:
            return self._send(404)
        ttl = self.headers.get(TTL_HEADER)
        if not ttl:
            log(method="PUT", path=path, status=400)
            return self._send(400)
        if STATE["mode"] == "slow":
            time.sleep(SLOW_S)
        tok = secrets.token_hex(16)
        with LOCK:
            TOKENS.add(tok)
        self._count("token")
        log(method="PUT", path=path, status=200, peer=self.client_address[0])
        self._send(200, tok.encode(), headers={TTL_HEADER: ttl})

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/_bench/state":
            with LOCK:
                body = {"expiration": iso(EXPIRATION), "expires_s": EXPIRES_S, "started": STARTED.isoformat(),
                        "mode": STATE["mode"], "counts": dict(STATE["counts"])}
            return self._send(200, json.dumps(body).encode(), "application/json")
        tok = self.headers.get(TOKEN_HEADER)
        with LOCK:
            valid = tok in TOKENS
        if not valid:
            log(method="GET", path=u.path, status=401, token="missing" if not tok else "bad", peer=self.client_address[0])
            return self._send(401)
        if u.path == CREDS_PREFIX:
            self._count("role_list")
            log(method="GET", path=u.path, status=200, peer=self.client_address[0])
            return self._send(200, ROLE.encode())
        if u.path == CREDS_PREFIX + ROLE:
            mode = STATE["mode"]
            if mode == "slow":
                time.sleep(SLOW_S)
            if mode == "fail":
                self._count("role_creds_fail")
                log(method="GET", path=u.path, status=500, peer=self.client_address[0])
                return self._send(500)
            self._count("role_creds")
            body = {
                "Code": "Success",
                "LastUpdated": iso(STARTED),
                "Type": "AWS-HMAC",
                "AccessKeyId": "ASIAFAKEBENCH0000001",
                "SecretAccessKey": "fake-secret-not-a-real-key",
                "Token": "fake-session-token",
                "Expiration": iso(EXPIRATION),
            }
            log(method="GET", path=u.path, status=200, peer=self.client_address[0])
            return self._send(200, json.dumps(body).encode())
        return self._send(404)

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/_bench/mode":
            return self._send(404)
        m = parse_qs(u.query).get("m", [""])[0]
        if m not in ("ok", "fail", "slow"):
            return self._send(400)
        with LOCK:
            STATE["mode"] = m
        log(method="POST", path=u.path, mode=m)
        return self._send(204)


if __name__ == "__main__":
    log(event="fakeimds_started", expiration=iso(EXPIRATION), expires_s=EXPIRES_S)
    ThreadingHTTPServer(("0.0.0.0", 80), Handler).serve_forever()
