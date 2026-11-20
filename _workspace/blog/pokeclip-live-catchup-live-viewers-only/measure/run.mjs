// Playwright runner for the live catch-up lab. Writes <out>/<name>.json (page logs + environment).
//   node run.mjs --browser chrome|webkit --scenario framegap --rate 1.05|1.1|none --name <name> [--out raw]
//   node run.mjs --browser chrome|webkit --scenario lag --listener early|late --name <name> [--out raw]
//   node run.mjs --browser chrome|webkit --scenario drift --rules off,rateAndJump --name <name> [--out raw]
// chrome = installed Google Chrome through Playwright channel 'chrome' (the bundled open-source Chromium lacks H.264/AAC).
// Fails (exit 1, no <name>.json — an earlier one is moved to <name>.superseded-*.json first) on page errors, fatal hls.js errors, missing
// requestVideoFrameCallback, too few samples or empty windows (checks.mjs). The hold is always released and the
// browser always closed.
import { chromium, webkit } from 'playwright';
import { access, mkdir, rename, writeFile } from 'node:fs/promises';
import { problemsOf } from './checks.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
for (const k of ['browser', 'scenario', 'name']) if (!args[k]) throw new Error(`--${k} is required`);
const outDir = new URL(`${args.out ?? 'raw'}/`, import.meta.url);
const BASE = 'http://127.0.0.1:38300';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ctl(hold) {
  const res = await fetch(`${BASE}/__ctl?hold=${hold}`);
  if (!res.ok) throw new Error(`hold=${hold}: HTTP ${res.status}`);
  return res.json();
}

const launch = { chrome: () => chromium.launch({ channel: 'chrome', headless: true }), webkit: () => webkit.launch({ headless: true }) };
if (!launch[args.browser]) throw new Error(`unknown browser ${args.browser}`);

// An earlier <name>.json must not outlive a failed rerun: move it aside before running, so a failure leaves only
// <name>.failed.json and analysis of <name> fails instead of reading the stale success.
await mkdir(outDir, { recursive: true });
const target = new URL(`${args.name}.json`, outDir);
if (await access(target).then(() => true, () => false)) {
  const aside = new URL(`${args.name}.superseded-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, outDir);
  await rename(target, aside);
  console.log(`moved previous ${args.name}.json aside`);
}

const browser = await launch[args.browser]();
const out = { args, browserVersion: browser.version(), startedAt: new Date().toISOString(), pages: [], pageErrors: [] };
let holding = false;
try {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 450 } });
  const open = async (query) => {
    const page = await ctx.newPage();
    page.on('pageerror', (err) => out.pageErrors.push({ query, message: String(err) }));
    await page.goto(`${BASE}/lab/?${query}`);
    await page.waitForFunction(() => window.__log.events.some((e) => e.type === 'playing'), null, { timeout: 30000 });
    if (!(await page.evaluate(() => window.__rvfc))) throw new Error('requestVideoFrameCallback unsupported');
    return page;
  };
  const dump = (page) => page.evaluate(() => ({ ...window.__log, rvfc: window.__rvfc, perfNowAtDump: performance.now() }));

  if (args.scenario === 'framegap') {
    const page = await open('rule=off&listener=early');
    await sleep(12000);
    // start ~10 s behind the edge so 20 cycles at 1.1x never run into the live edge
    await page.evaluate(() => window.__seekBy(-8.5));
    await sleep(6000);
    await page.evaluate(() => window.__mark('start'));
    if (args.rate === 'none') {
      await sleep(120000);
    } else {
      const r = Number(args.rate);
      if (!(r > 1)) throw new Error(`--rate must be none or a number above 1, got ${args.rate}`);
      for (let i = 0; i < 40; i++) {
        await page.evaluate((to) => window.__setRateForced(to), i % 2 === 0 ? r : 1);
        await sleep(3000);
      }
    }
    await page.evaluate(() => window.__mark('end'));
    out.pages.push(await dump(page));
  } else if (args.scenario === 'lag') {
    const page = await open(`rule=off&listener=${args.listener}`);
    await sleep(14000);
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.__seekBy(-8));
      await sleep(4000);
      await page.evaluate(() => window.__seekToSync());
      await sleep(4000);
    }
    out.pages.push(await dump(page));
  } else if (args.scenario === 'drift') {
    const pages = [];
    for (const r of args.rules.split(',')) pages.push(await open(`rule=${r}&listener=early`));
    await sleep(20000);
    const holds = [];
    for (const holdMs of [6000, 13000]) {
      holding = true;
      holds.push({ hold: 1, ...(await ctl(1)) });
      await sleep(holdMs);
      holds.push({ hold: 0, ...(await ctl(0)) });
      holding = false;
      await sleep(holdMs === 6000 ? 60000 : 45000);
    }
    out.holds = holds;
    for (const p of pages) out.pages.push(await dump(p));
  } else {
    throw new Error(`unknown scenario ${args.scenario}`);
  }
  out.finishedAt = new Date().toISOString();

  const problems = problemsOf(out);
  if (problems.length) {
    await writeFile(new URL(`${args.name}.failed.json`, outDir), JSON.stringify(out));
    throw new Error(`run rejected: ${problems.join('; ')}`);
  }
  await writeFile(target, JSON.stringify(out));
  console.log(`wrote ${args.out ?? 'raw'}/${args.name}.json (${out.browserVersion})`);
} finally {
  if (holding) await ctl(0).catch((e) => console.error(`could not release hold: ${e}`));
  await browser.close();
}
