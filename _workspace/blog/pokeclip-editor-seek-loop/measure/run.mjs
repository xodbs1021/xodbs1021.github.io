// 재측정 실행기. Playwright 로 브라우저를 띄우고 pages/*.html 을 가짜 출처(http://seekw.test/)로 열어 잰다.
// 로컬 서버를 띄우지 않는다 — 요청은 page.route 가 디스크에서 바로 돌려준다.
//
//   node run.mjs --browser chrome --video <mp4> --out <결과 폴더>
//
// --browser: chrome(설치된 Google Chrome, Playwright channel 'chrome') · chromium · firefox · webkit
import { chromium, firefox, webkit } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const browserName = args.browser ?? 'chrome';
const video = args.video;
const out = args.out;
if (!video || !out) throw new Error('--video 와 --out 이 필요합니다');

const REPEAT = 3;
// 90kHz 틱 939,331개 = 10.437011111…초. µs 아래 자릿수가 있는 구간 시작
const TICK_START = 939331 / 90000;
// µs 에 딱 맞는 구간 시작(대조)
const US_EXACT_START = 10.437;
const LOOP_MS = 5000;

const launchers = {
  chrome: () => chromium.launch({ channel: 'chrome', headless: true }),
  chromium: () => chromium.launch({ headless: true }),
  firefox: () => firefox.launch({ headless: true }),
  webkit: () => webkit.launch({ headless: true }),
};

async function openPage(browser, name) {
  const page = await browser.newPage();
  await page.route('http://seekw.test/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/video.mp4') {
      return route.fulfill({ status: 200, contentType: 'video/mp4', body: await readFile(video) });
    }
    const file = path.join(HERE, 'pages', path.basename(url.pathname));
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: await readFile(file) });
  });
  await page.goto(`http://seekw.test/${name}`);
  return page;
}

async function main() {
  await mkdir(out, { recursive: true });
  const browser = await launchers[browserName]();
  const result = { browser: browserName, version: browser.version(), measuredAt: new Date().toISOString() };
  try {
    const snapPage = await openPage(browser, 'snap.html');
    result.userAgent = await snapPage.evaluate(() => navigator.userAgent);
    result.snap = [];
    for (let i = 0; i < REPEAT; i += 1) result.snap.push(await snapPage.evaluate((u) => window.runSnap(u), 'http://seekw.test/video.mp4'));
    result.ticks = await snapPage.evaluate(([u, f, c]) => window.runTicks(u, f, c), ['http://seekw.test/video.mp4', 939330, 900]);
    result.ms = await snapPage.evaluate(([u, f, c]) => window.runMs(u, f, c), ['http://seekw.test/video.mp4', 10000, 1000]);
    await snapPage.close();

    const loopPage = await openPage(browser, 'loop.html');
    const conditions = [
      { name: 'strict-tick-start', start: TICK_START, tolerance: 0 },
      { name: 'strict-us-exact-start', start: US_EXACT_START, tolerance: 0 },
      { name: 'tolerance-1ms-tick-start', start: TICK_START, tolerance: 0.001 },
    ];
    result.loop = [];
    for (let i = 0; i < REPEAT; i += 1) {
      for (const c of conditions) {
        const r = await loopPage.evaluate(
          ([u, o]) => window.runLoop(u, o),
          ['http://seekw.test/video.mp4', { start: c.start, tolerance: c.tolerance, durationMs: LOOP_MS, sampleMs: 50 }],
        );
        result.loop.push({ round: i + 1, condition: c.name, ...r });
      }
    }
    await loopPage.close();
  } finally {
    await browser.close();
  }
  const file = path.join(out, `${browserName}.json`);
  await writeFile(file, JSON.stringify(result, null, 2) + '\n');
  console.log(file);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
