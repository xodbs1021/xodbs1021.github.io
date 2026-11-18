| 경우 | Via | Content-Length | Transfer-Encoding | Content-Encoding | 받은 B | 상태 |
|---|---|---|---|---|---|---|
| (a) nginx 정적 파일 |  | 137945 |  |  | 137945 | HTTP/1.1 200 OK |
| 상류 직접 · 2,048B |  | 2048 |  |  | 2048 | HTTP/1.1 200 OK |
| 상류 직접 · 2,049B |  |  | chunked |  | 2049 | HTTP/1.1 200 OK |
| 상류 직접 · 1시간 목록 |  |  | chunked |  | 137945 | HTTP/1.1 200 OK |
| (b) 프록시 · buffering off · 2,048B |  | 2048 |  |  | 2048 | HTTP/1.1 200 OK |
| (b) 프록시 · buffering off · 2,049B |  |  | chunked |  | 2049 | HTTP/1.1 200 OK |
| (b) 프록시 · buffering off · 1시간 목록 |  |  | chunked |  | 137945 | HTTP/1.1 200 OK |
| (b) 대조 · buffering on · 2,049B |  |  | chunked |  | 2049 | HTTP/1.1 200 OK |
| (b) 대조 · buffering on · 1시간 목록 |  |  | chunked |  | 137945 | HTTP/1.1 200 OK |
| (c) gzip on · gzip_proxied 기본 · Via 없음 |  |  | chunked | gzip | 7154 | HTTP/1.1 200 OK |
| (c) gzip on · gzip_proxied 기본 · Via 있음 | 있음 |  | chunked |  | 137945 | HTTP/1.1 200 OK |
| (c) gzip on · gzip_proxied any · Via 있음 | 있음 |  | chunked | gzip | 7154 | HTTP/1.1 200 OK |
