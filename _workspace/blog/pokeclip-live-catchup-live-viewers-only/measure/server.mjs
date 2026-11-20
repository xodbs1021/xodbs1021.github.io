// Static page server + same-origin proxy to MediaMTX with a "hold" switch (127.0.0.1 only).
//   GET /lab/*             -> page files (/lab/hls.js = hls.js 1.7.3 dist)
//   GET anything else      -> http://127.0.0.1:38888/<same path>  (held while hold=1)
//   GET /__ctl?hold=1|0    -> start / release holding HLS requests
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const PORT = Number(process.env.PORT ?? 38300);
const UPSTREAM = { host: '127.0.0.1', port: 38888 };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };

let held = [];
let holding = false;

function forward(req, res) {
  const path = req.url;
  const up = http.request({ ...UPSTREAM, path, method: 'GET', headers: { accept: '*/*' } }, (ur) => {
    res.writeHead(ur.statusCode ?? 502, ur.headers);
    ur.pipe(res);
  });
  up.on('error', () => { res.writeHead(502); res.end(); });
  up.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__ctl') {
    holding = url.searchParams.get('hold') === '1';
    if (!holding) { const q = held; held = []; q.forEach(([a, b]) => forward(a, b)); }
    res.end(JSON.stringify({ holding, at: Date.now() }));
    return;
  }
  if (!url.pathname.startsWith('/lab/')) {
    if (holding) held.push([req, res]); else forward(req, res);
    return;
  }
  const rest = url.pathname.slice('/lab/'.length);
  const file = rest === '' ? 'page/index.html'
    : rest === 'hls.js' ? 'node_modules/hls.js/dist/hls.js'
    : join('page', rest);
  try {
    const body = await readFile(join(HERE, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`lab server on 127.0.0.1:${PORT}`));
