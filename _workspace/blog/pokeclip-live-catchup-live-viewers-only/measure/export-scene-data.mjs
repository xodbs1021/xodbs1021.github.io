// Downsample drift runs to 1 s points per release for the Remotion scene (measured values, redrawn proportionally).
// Usage: node export-scene-data.mjs <out.ts>
import { readFile, writeFile } from 'node:fs/promises';

const load = async (n) => JSON.parse(await readFile(new URL(`raw/${n}.json`, import.meta.url), 'utf8'));
const SPAN_S = [50, 40]; // seconds drawn after release 1 (6 s hold) and release 2 (13 s hold)

function series(raw, rule, i) {
  const page = raw.pages.find((p) => p.rule === rule);
  const rel = raw.holds.filter((h) => h.hold === 0)[i];
  const pts = [];
  for (let s = 0; s <= SPAN_S[i]; s++) {
    const at = rel.at + s * 1000;
    // nearest sample at or after this second
    const x = page.samples.find((p) => p.direct !== null && p.wall >= at);
    if (!x) break;
    pts.push([s, Number(x.direct.toFixed(2)), x.rate]);
  }
  const target = Number(page.samples.find((p) => p.wall >= rel.at + 1000).target.toFixed(2));
  const jumps = page.marks.filter((m) => m.kind === 'jump').map((m) => {
    const s = page.samples.find((p) => p.t >= m.t);
    return s ? Number(((s.wall - rel.at) / 1000).toFixed(1)) : null;
  }).filter((s) => s !== null && s >= 0 && s <= SPAN_S[i]);
  return { pts, target, jumps };
}

const chrome = await load('drift-chrome');
const webkit = await load('drift-webkit');
const out = {
  spans: SPAN_S,
  panels: [0, 1].map((i) => ({
    off: series(chrome, 'off', i),
    rule: series(chrome, 'rateAndJump', i),
    webkitJumpOnly: series(webkit, 'jumpOnly', i),
  })),
};
const header = '// 자동 생성: _workspace/blog/pokeclip-live-catchup-live-viewers-only/measure/export-scene-data.mjs\n// 공개 재측정(measure/raw/drift-chrome.json · drift-webkit.json)의 지연 표본을 끊김을 놓은 뒤 1초 간격으로 줄인 값. [초, 지연(초), 배속]\n';
await writeFile(process.argv[2], `${header}export const DRIFT = ${JSON.stringify(out)} as const;\n`);
console.log(JSON.stringify(out.panels.map((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { first: v.pts[1], last: v.pts.at(-1), target: v.target, jumps: v.jumps }])))));
