// Summarise run files from run.mjs. Usage: node analyze.mjs check|framegap|lag|drift <names...>
// Reads raw/<name>.json (RAW_DIR=<dir> to read elsewhere). Every summary first re-checks each run (checks.mjs) and
// that its scenario matches the subcommand; an invalid run, an empty window or an empty segment exits non-zero.
import { readFile } from 'node:fs/promises';
import { problemsOf, WINDOW_MS } from './checks.mjs';

const [kind, ...names] = process.argv.slice(2);
const RAW_DIR = process.env.RAW_DIR ?? 'raw';
const readRun = async (n) => JSON.parse(await readFile(new URL(`${RAW_DIR}/${n}.json`, import.meta.url), 'utf8'));
// Summaries never read a run that fails its checks or belongs to another scenario.
async function load(n) {
  const raw = await readRun(n);
  if (raw.args?.scenario !== kind) throw new Error(`${n}: scenario ${raw.args?.scenario}, not ${kind}`);
  const problems = problemsOf(raw);
  if (problems.length) throw new Error(`${n}: invalid run — ${problems.join('; ')}`);
  return raw;
}
if (!['check', 'framegap', 'lag', 'drift'].includes(kind) || names.length === 0) {
  console.error('usage: node analyze.mjs check|framegap|lag|drift <names...>');
  process.exit(2);
}
const nonEmpty = (xs, what) => {
  if (!xs.length) throw new Error(`empty: ${what}`);
  return xs;
};
const maxOf = (xs, what) => Math.max(...nonEmpty(xs, what));
const minOf = (xs, what) => Math.min(...nonEmpty(xs, what));
const r1 = (x) => (x === null || x === undefined ? 'null' : Number(x).toFixed(1));
const r2 = (x) => (x === null || x === undefined ? 'null' : Number(x).toFixed(2));
// p99: nearest rank from below. median: mean of the two middle values when the count is even.
const quant = (xs, p) => { const s = [...nonEmpty(xs, 'quantile')].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const median = (xs) => { const s = [...nonEmpty(xs, 'median')].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const FREEZE_MS = 200;

if (kind === 'check') {
  let bad = 0;
  for (const n of names) {
    const raw = await readRun(n);
    const problems = problemsOf(raw);
    const errs = Array.isArray(raw.pageErrors) ? `${raw.pageErrors.length} page errors` : 'page errors not recorded (run predates the check)';
    console.log(`${n}: ${problems.length ? `REJECT ${problems.join('; ')}` : 'ok'} · ${errs}`);
    if (problems.length) bad++;
  }
  if (bad) process.exit(1);
}

function frameGaps(log) {
  const start = log.marks.find((m) => m.kind === 'start').t;
  const end = log.marks.find((m) => m.kind === 'end').t;
  const f = log.frames.filter(([now]) => now >= start - WINDOW_MS && now <= end);
  const gaps = [];
  for (let i = 1; i < f.length; i++) gaps.push({ at: f[i][0], gap: f[i][0] - f[i - 1][0] });
  return { gaps, start, end };
}

if (kind === 'framegap') {
  for (const n of names) {
    const raw = await load(n);
    const log = raw.pages[0];
    const { gaps } = frameGaps(log);
    const switches = log.marks.filter((m) => m.kind === 'forced');
    const waits = log.events.filter((e) => e.type === 'waiting').map((e) => e.t);
    const inAnyWindow = (at) => switches.some((s) => Math.abs(at - s.t) <= WINDOW_MS);
    const baseline = gaps.filter((g) => !inAnyWindow(g.at)).map((g) => g.gap);
    const rows = switches.map((s) => {
      const w = gaps.filter((g) => Math.abs(g.at - s.t) <= WINDOW_MS).map((g) => g.gap);
      return { dir: s.to === 1 ? 'down' : 'up', max: maxOf(w, `window ${s.t}`), waiting: waits.some((t) => Math.abs(t - s.t) <= WINDOW_MS) };
    });
    console.log(`\n## ${n} — ${raw.browserVersion} · rVFC=${log.rvfc} · frames=${log.frames.length} · waiting=${waits.length}`);
    console.log(`baseline gaps (outside ±${WINDOW_MS}ms of any switch): n=${baseline.length} median=${r1(median(baseline))} p99=${r1(quant(baseline, 0.99))} max=${r1(maxOf(baseline, 'baseline'))} ms`);
    for (const dir of ['up', 'down']) {
      const sel = rows.filter((r) => r.dir === dir);
      if (!sel.length) continue;
      const clean = sel.filter((r) => !r.waiting).map((r) => r.max);
      console.log(`${dir === 'up' ? '1 -> r' : 'r -> 1'}: switches=${sel.length} with-waiting=${sel.length - clean.length} | max-gap-in-window (no waiting): min=${r1(minOf(clean, dir))} median=${r1(median(clean))} max=${r1(maxOf(clean, dir))} ms · over ${FREEZE_MS}ms: ${clean.filter((x) => x > FREEZE_MS).length}/${clean.length}`);
    }
    if (!switches.length) {
      // same schedule as the switch runs (a window every 3 s from 'start'), so the no-switch run is compared like for like
      const start = log.marks.find((m) => m.kind === 'start').t;
      const pseudo = Array.from({ length: 40 }, (_, i) => start + i * 3000);
      const maxes = pseudo.map((p) => maxOf(gaps.filter((g) => Math.abs(g.at - p) <= WINDOW_MS).map((g) => g.gap), `pseudo window ${p}`));
      console.log(`no switches; all gaps max=${r1(maxOf(gaps.map((g) => g.gap), 'gaps'))} | pseudo windows (every 3 s, ±${WINDOW_MS}ms): n=${maxes.length} min=${r1(minOf(maxes, 'pseudo'))} median=${r1(median(maxes))} max=${r1(maxOf(maxes, 'pseudo'))} ms · over ${FREEZE_MS}ms: ${maxes.filter((x) => x > FREEZE_MS).length}/${maxes.length}`);
    }
  }
}

if (kind === 'lag') {
  for (const n of names) {
    const raw = await load(n);
    const log = raw.pages[0];
    const seeks = log.marks.filter((m) => m.kind === 'seek' || m.kind === 'seekSync');
    console.log(`\n## ${n} — ${raw.browserVersion} · listener=${log.listener}`);
    let stale = 0;
    let staleAfter = 0;
    for (const m of seeks) {
      const after = log.samples.filter((s) => s.t > m.t).slice(0, 2);
      if (!after.length) throw new Error(`no sample after seek at ${m.t}`);
      const [a, b] = after;
      const d1 = a.hlsLatency - a.direct;
      if (Math.abs(d1) > 1) stale++;
      if (a.hlsLatencyAfter !== undefined && Math.abs(a.hlsLatencyAfter - a.direct) > 1) staleAfter++;
      console.log(`${m.kind.padEnd(8)} 1st sample +${r1(a.t - m.t)}ms: hls.latency=${r2(a.hlsLatency)} direct=${r2(a.direct)} diff=${r2(d1)} | same dispatch, after other listeners: hls.latency=${r2(a.hlsLatencyAfter)} | 2nd sample: hls.latency=${r2(b?.hlsLatency)} direct=${r2(b?.direct)}`);
    }
    console.log(`first sample after seek with |hls.latency - direct| > 1 s: ${stale}/${seeks.length} · re-read after the dispatch: ${staleAfter}/${seeks.length}`);
  }
}

if (kind === 'drift') {
  for (const n of names) {
    const raw = await load(n);
    const holds = raw.holds;
    const releases = holds.filter((h) => h.hold === 0);
    console.log(`\n## ${n} — ${raw.browserVersion}`);
    for (const log of raw.pages) {
      // wall clock is shared between runner (/__ctl answers with Date.now()) and page samples
      const s = log.samples.filter((x) => x.direct !== null);
      console.log(`- rule=${log.rule}`);
      releases.forEach((rel, i) => {
        const nextHold = holds.filter((h) => h.hold === 1)[i + 1];
        const until = nextHold ? nextHold.at : Infinity;
        const seg = s.filter((x) => x.wall >= rel.at && x.wall < until);
        const at = (sec) => seg.find((x) => x.wall >= rel.at + sec * 1000);
        const back = seg.find((x) => x.wall > rel.at + 1000 && x.direct - x.target <= 0.5);
        const marks = log.marks.filter((m) => m.kind === 'rate' || m.kind === 'jump');
        const segStartT = seg[0]?.t ?? Infinity;
        const segEndT = seg.at(-1)?.t ?? -Infinity;
        const inSeg = marks.filter((m) => m.t >= segStartT - 1000 && m.t <= segEndT);
        const waits = log.events.filter((e) => e.type === 'waiting' && e.t >= segStartT - 15000 && e.t <= segEndT).length;
        const fmt = (x) => (x ? `${r2(x.direct)}/${r2(x.target)}` : 'n/a');
        nonEmpty(seg, `${n} ${log.rule} release ${i + 1}`);
        const lat = seg.map((x) => x.direct);
        const buf = seg.map((x) => x.buf);
        const rateChanges = inSeg.filter((m) => m.kind === 'rate').length;
        console.log(`  release ${i + 1}: latency/target +1s ${fmt(at(1))} · +10s ${fmt(at(10))} · +30s ${fmt(at(30))} · end ${fmt(seg.at(-1))} | back within target+0.5s: ${back ? `${r1((back.wall - rel.at) / 1000)} s` : 'no'} | rate changes ${inSeg.filter((m) => m.kind === 'rate').map((m) => m.to).join('→') || 0} · jumps ${inSeg.filter((m) => m.kind === 'jump').length} · waiting ${waits}`);
        console.log(`             rate change count ${rateChanges} · latency min ${r2(minOf(lat, 'lat'))} max ${r2(maxOf(lat, 'lat'))} · forward buffer median ${r2(median(buf))} max ${r2(maxOf(buf, 'buf'))}`);
      });
    }
  }
}
