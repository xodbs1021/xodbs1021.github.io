# Origin for tb6-cdn bench: logs every request, delays, serves fake segments/playlists.
import http.server, socketserver, time, sys, threading, os
START = time.time()
LOG = open('/log/origin.log', 'a', buffering=1)
LOCK = threading.Lock()
SEG = os.urandom(1_000_000)  # 1MB body
SEG_DELAY = 0.3
PL_DELAY = 0.3
LATE_AT = {}  # path -> epoch when it becomes available
class H(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *a): pass
    def do_GET(self):
        now = time.time()
        with LOCK:
            LOG.write(f"{now:.3f} {self.headers.get('X-Hop','-')} {self.path}\n")
        p = self.path
        if p.endswith('.m3u8'):
            time.sleep(PL_DELAY)
            gen = time.time()
            seq = int(gen // 2)
            body = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:%d\n#GEN:%.3f\n" % (seq, gen)
            for i in range(5):
                body += "#EXTINF:2.000,\nseg-%d.ts\n" % (seq + i)
            b = body.encode()
            self.send_response(200); self.send_header('Content-Type','application/vnd.apple.mpegurl')
            self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        if '/late-' in p:
            key = p
            # first request registers: becomes available 3s later
            with LOCK:
                LATE_AT.setdefault(key, now + 3.0)
            if now < LATE_AT[key]:
                b = b'not yet\n'
                self.send_response(404); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        if p.endswith('.ts'):
            time.sleep(SEG_DELAY)
            self.send_response(200); self.send_header('Content-Type','video/mp2t')
            self.send_header('Content-Length', str(len(SEG))); self.end_headers(); self.wfile.write(SEG); return
        self.send_response(404); self.send_header('Content-Length','0'); self.end_headers()
class S(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True; request_queue_size = 1024
S(('', 8000), H).serve_forever()
