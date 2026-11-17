#!/usr/bin/env python3
"""서버에 넘길 SCRAM-SHA-256 검증값을 만든다(평문 비밀번호는 서버로 보내지 않는다).

평문은 환경 변수 WIPE_ONEOFF_PW 로만 받고(명령 줄 · 파일에 남지 않게),
표준 출력으로 PostgreSQL 이 저장하는 SCRAM 검증값 꼴을 낸다(RFC 5802 · RFC 7677).
"""
import base64
import hashlib
import hmac
import os
import sys

ITERATIONS = 4096
MECHANISM = "SCRAM-SHA-256"


def b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


def scram_verifier(password: str, salt: bytes, iterations: int = ITERATIONS) -> str:
    salted = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    stored_key = hashlib.sha256(client_key).digest()
    server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
    head = "%s%s%d" % (MECHANISM, "$", iterations)
    return "%s:%s$%s:%s" % (head, b64(salt), b64(stored_key), b64(server_key))


if __name__ == "__main__":
    pw = os.environ.get("WIPE_ONEOFF_PW")
    if not pw:
        sys.exit("WIPE_ONEOFF_PW 가 없다")
    print(scram_verifier(pw, os.urandom(16)))
