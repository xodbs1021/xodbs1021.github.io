"""Local HTTP authentication responder for MediaMTX (authMethod: http).

usage: python3 -I auth_server.py <port> <received-bodies-file>

Answers 200 with an empty body to every POST and appends each received
request body (one JSON document per line) to <received-bodies-file>, so the
run can check that MediaMTX still sends the full body to the auth server
while its own debug log shows only the size. Listens on 127.0.0.1 only.
"""

import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802 (http.server naming)
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        with open(self.server.bodies_path, "ab") as f:
            f.write(body + b"\n")
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


def main():
    port = int(sys.argv[1])
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    srv.bodies_path = sys.argv[2]
    srv.serve_forever()


if __name__ == "__main__":
    main()
