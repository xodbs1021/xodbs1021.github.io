// node buf-run.mjs <name> <src path> <maxBufferLength> <schedule json [[t_s, kbps|0=offline], ...]> <duration_s> <outdir>
import { createRequire } from 'module';
const require = createRequire('<repo>/package.json');
const { chromium } = require('playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const [name, src, mbl, schedJson, durS, outdir] = process.argv.slice(2);
const ROOT = '/tmp/tb6w-buf/www';
const types = { '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t', '.m4s': 'video/iso.segment', '.mp4': 'video/mp4', '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise(r => srv.on('listening', r));
const port = srv.address().port;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const sched = JSON.parse(schedJson); const applied = [];
const setNet = async (kbps) => cdp.send('Network.emulateNetworkConditions', kbps === 0
  ? { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }
  : { offline: false, latency: 20, downloadThroughput: kbps * 1000 / 8, uploadThroughput: 5e6 / 8 });
await setNet(sched[0][1]);
const t0 = Date.now(); applied.push([0, sched[0][1]]);
await page.goto(`http://127.0.0.1:${port}/player.html?src=${encodeURIComponent(src)}&mbl=${mbl}${process.env.MBS !== undefined ? '&mbs=' + process.env.MBS : ''}`);
for (const [ts, kbps] of sched.slice(1)) {
  const wait = ts * 1000 - (Date.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait));
  await setNet(kbps); applied.push([+((Date.now() - t0) / 1000).toFixed(2), kbps]);
}
const rest = durS * 1000 - (Date.now() - t0); if (rest > 0) await new Promise(r => setTimeout(r, rest));
const log = await page.evaluate(() => window.__log);
const ver = await page.evaluate(() => Hls.version);
const ua = await browser.version();
fs.mkdirSync(outdir, { recursive: true });
fs.writeFileSync(path.join(outdir, `${name}.json`), JSON.stringify({ name, src, maxBufferLength: +mbl, maxBufferSize: process.env.MBS !== undefined ? +process.env.MBS : 'default(60000000)', schedule: sched, applied, hlsjs: ver, chrome: ua,
  columns: ['t', 'currentTime', 'bufferAhead', 'currentLevel', 'loadLevel', 'bandwidthEstimate', 'latency', 'liveSyncPosition', 'paused', 'readyState'], ...log }));
await browser.close(); srv.close();
console.log(name, 'hls.js', ver, 'chrome', ua, 'samples', log.samples.length, 'events', log.events.length);
