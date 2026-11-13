import { chromium } from 'playwright';
import fs from 'node:fs';
const dir = '/tmp/tb5w-m/hls/he_audio/';
const init = fs.readFileSync(dir + 'init.mp4').toString('base64');
const seg = fs.readFileSync(dir + 'a0.m4s').toString('base64');
const browser = await chromium.launch({ executablePath: '<Google Chrome 157 실행 파일>', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto('about:blank');
const out = {};
for (const codec of ['mp4a.40.2', 'mp4a.40.5']) {
  out[codec] = await page.evaluate(async ({ init, seg, codec }) => {
    const b = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const a = document.createElement('audio'); document.body.appendChild(a);
    const ms = new MediaSource(); a.src = URL.createObjectURL(ms);
    await new Promise(r => ms.addEventListener('sourceopen', r, { once: true }));
    const sb = ms.addSourceBuffer(`audio/mp4; codecs="${codec}"`);
    const app = d => new Promise((res, rej) => { sb.addEventListener('updateend', res, { once: true }); sb.addEventListener('error', rej, { once: true }); sb.appendBuffer(d); });
    let err = null;
    try { await app(b(init)); await app(b(seg)); } catch (e) { err = 'append error'; }
    const buffered = sb.buffered.length ? [sb.buffered.start(0), sb.buffered.end(0)] : [];
    let played = null;
    try { a.muted = true; await a.play(); await new Promise(r => setTimeout(r, 1500)); played = a.currentTime; } catch (e) { played = 'play error ' + e.message; }
    return { err, buffered, played, mediaError: a.error && a.error.message };
  }, { init, seg, codec });
}
console.log(JSON.stringify(out));
await browser.close();
