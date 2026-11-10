import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {collectDiagrams, mermaidSourceProblem, diagramKey, narrowSource, DIAGRAM_DIR, MANIFEST_PATH, MERMAID_SENTINELS, FONT_SIZE, RENDER_POLICY, mermaidVersion, loadManifest} from '../src/lib/diagrams.mjs';
import {cssVar} from '../src/lib/tokens.mjs';

// Run locally or in CI after adding/changing a Mermaid block, then commit data/diagrams and the manifest.
// The site build only reads these files; it never launches a browser (Vercel build images cannot).
const force = process.argv.includes('--force');
const FONT_CSS = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css';
const FONT = "'Pretendard Variable', Pretendard, sans-serif";
const mermaidDist = path.resolve('node_modules/mermaid/dist');

const diagrams = collectDiagrams();
const invalid = diagrams.map(d => [d, mermaidSourceProblem(d.source)]).filter(([, problem]) => problem);
if (invalid.length) {
  console.error(invalid.map(([d, problem]) => `${d.file}: ${problem}`).join('\n'));
  process.exit(1);
}
const unique = [...new Map(diagrams.map(d => [d.key, d])).values()];
const previous = loadManifest();
const manifest = {};
const todo = [];
for (const d of unique) {
  const entry = previous[d.key];
  const present = entry && await Promise.all(['wide', 'narrow'].filter(v => entry[v]).map(v => fs.access(path.join(DIAGRAM_DIR, entry[v].file)).then(() => true, () => false))).then(r => r.every(Boolean));
  if (entry && present && !force) manifest[d.key] = entry; else todo.push(d);
}
console.log(`Diagrams: ${unique.length} unique (${diagrams.length} blocks), ${todo.length} to render, policy ${RENDER_POLICY}, mermaid ${mermaidVersion}`);

const sentinelToVar = Object.fromEntries(Object.values(MERMAID_SENTINELS).map(([hex, role]) => [hex, `var(${cssVar(role)})`]));
// Colors written in post sources (`style X fill:…`): keep the hue, follow the theme.
const tint = role => `color-mix(in srgb, var(${cssVar(role)}) 16%, var(--bg))`;
const SOURCE_COLORS = {'#e0f2fe': tint('cat1'), '#dcfce7': tint('cat3'), '#fef3c7': tint('cat2'), '#dcf5dc': tint('cat3'), '#172c40': 'var(--ink)'};
// Mermaid's own defaults that ignore theme variables (katex glyphs, actor lines, attributes the
// stylesheet overrides): dark → ink, middle → muted, light → surface.
const expand = hex => hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex;
function byLuminance(hex) {
  const [r, g, b] = expand(hex).slice(1).match(/\w\w/g).map(x => parseInt(x, 16) / 255);
  const l = .2126 * r + .7152 * g + .0722 * b;
  return l < .2 ? 'var(--ink)' : l < .7 ? 'var(--muted)' : 'var(--surface)';
}
function themeSvg(svg) {
  const leftover = new Set();
  const out = svg
    // No shadows in the blog's visual language.
    .replace(/<filter\b[\s\S]*?<\/filter>/g, '')
    .replace(/filter:\s*(drop-shadow|url)\([^;}]*\)\s*;?/g, '')
    .replace(/\sfilter="url\([^)]*\)"/g, '')
    .replace(/(\.arrowheadPath\{fill:)#[0-9a-f]{6}/gi, '$1var(--muted)')
    // Sequence step badges: Mermaid draws them at 12px in a generic font; keep them readable after scaling.
    .replace(/<text\b([^>]*?)font-size="12px"([^>]*?class="sequenceNumber")/g, `<text$1font-size="${FONT_SIZE}px"$2`)
    .replace(/font-family="sans-serif"/g, `font-family="${FONT.replaceAll('"', "'")}"`)
    // Only color positions (attribute values, CSS declarations): label text such as "PR #311" stays.
    .replace(/(?<=[:"(,]\s*)#(?:[0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-f])/gi, raw => {
      const hex = expand(raw.toLowerCase());
      const mapped = sentinelToVar[hex] ?? SOURCE_COLORS[hex];
      if (mapped) return mapped;
      if (/^#0a0c/.test(hex)) leftover.add(hex); // an unmapped sentinel means the config above is incomplete
      return byLuminance(hex);
    });
  const rgbOut = out
    .replace(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g, (whole, r, g, b, a) => {
      const hex = '#' + [r, g, b].map(n => Number(n).toString(16).padStart(2, '0')).join('');
      const color = sentinelToVar[hex] ?? SOURCE_COLORS[hex] ?? byLuminance(hex);
      if (/^#0a0c/.test(hex) && !sentinelToVar[hex]) leftover.add(hex);
      return a === undefined || Number(a) === 1 ? color : `color-mix(in srgb, ${color} ${Math.round(Number(a) * 100)}%, transparent)`;
    })
    .replace(/(?<=(?:fill|stroke)=")(black|white)(?=")/g, name => name === 'black' ? 'var(--ink)' : 'var(--bg)');
  return {svg: rgbOut, leftover: [...leftover]};
}

if (todo.length) {
  await fs.mkdir(DIAGRAM_DIR, {recursive: true});
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route('http://render.local/**', async route => {
      const name = new URL(route.request().url()).pathname;
      if (name === '/') return route.fulfill({contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${FONT_CSS}"><style>body{font-family:${FONT};margin:0}</style><body></body>`});
      const file = path.resolve(mermaidDist, '.' + name);
      if (!file.startsWith(mermaidDist + path.sep)) return route.fulfill({status: 404});
      return route.fulfill({contentType: 'text/javascript', body: await fs.readFile(file)});
    });
    await page.goto('http://render.local/');
    await page.evaluate(async size => { await document.fonts.load(`${size}px 'Pretendard Variable'`); await document.fonts.ready; }, FONT_SIZE);
    const loaded = await page.evaluate(() => document.fonts.check("15px 'Pretendard Variable'"));
    if (!loaded) throw new Error('Pretendard did not load; diagrams would be measured with a fallback font');
    const sentinel = Object.fromEntries(Object.entries(MERMAID_SENTINELS).map(([k, [hex]]) => [k, hex]));
    const render = (id, source) => page.evaluate(async ({id, source, sentinel, font, size}) => {
      const {default: mermaid} = await import('/mermaid.esm.min.mjs');
      mermaid.initialize({
        startOnLoad: false, securityLevel: 'strict', theme: 'base', look: 'classic', fontFamily: font, htmlLabels: false,
        themeVariables: {
          fontFamily: font, fontSize: `${size}px`, darkMode: false,
          background: sentinel.tertiary, primaryColor: sentinel.node, primaryTextColor: sentinel.text, primaryBorderColor: sentinel.border,
          secondaryColor: sentinel.secondary, secondaryTextColor: sentinel.text, secondaryBorderColor: sentinel.border,
          tertiaryColor: sentinel.tertiary, tertiaryTextColor: sentinel.text, tertiaryBorderColor: sentinel.border,
          mainBkg: sentinel.node, nodeBorder: sentinel.border, nodeTextColor: sentinel.text, textColor: sentinel.text, titleColor: sentinel.text,
          lineColor: sentinel.line, defaultLinkColor: sentinel.line, edgeLabelBackground: sentinel.label,
          clusterBkg: sentinel.cluster, clusterBorder: sentinel.border,
          noteBkgColor: sentinel.note, noteTextColor: sentinel.text, noteBorderColor: sentinel.border,
          actorBkg: sentinel.node, actorBorder: sentinel.border, actorTextColor: sentinel.text, actorLineColor: sentinel.line,
          signalColor: sentinel.text, signalTextColor: sentinel.text, labelBoxBkgColor: sentinel.node, labelBoxBorderColor: sentinel.border,
          labelTextColor: sentinel.text, loopTextColor: sentinel.text, activationBkgColor: sentinel.cluster, activationBorderColor: sentinel.border,
          sequenceNumberColor: sentinel.node, altBackground: sentinel.cluster,
        },
        flowchart: {htmlLabels: false, padding: 12, nodeSpacing: 36, rankSpacing: 44, useMaxWidth: false},
        sequence: {useMaxWidth: false, mirrorActors: false, actorFontFamily: font, messageFontFamily: font, noteFontFamily: font},
      });
      const {svg} = await mermaid.render(id, source);
      const host = document.createElement('div');
      host.innerHTML = svg;
      document.body.append(host);
      const box = host.querySelector('svg').viewBox.baseVal;
      const result = {svg, width: Math.ceil(box.width), height: Math.ceil(box.height)};
      host.remove();
      return result;
    }, {id, source, sentinel, font: FONT, size: FONT_SIZE});

    for (const d of todo) {
      const entry = {source: d.file};
      const variants = [['wide', d.source], ['narrow', narrowSource(d.source)]];
      for (const [variant, source] of variants) {
        if (!source) continue;
        const rendered = await render(`mmd-${d.key}-${variant}`, source);
        // A top-to-bottom copy only helps when the original is wider than the article column.
        if (variant === 'narrow' && entry.wide.width <= 700) continue;
        const {svg, leftover} = themeSvg(rendered.svg);
        const file = `${d.key}-${variant}.svg`;
        await fs.writeFile(path.join(DIAGRAM_DIR, file), svg);
        entry[variant] = {file, width: rendered.width, height: rendered.height, bytes: Buffer.byteLength(svg)};
        if (leftover.length) entry[variant].leftoverColors = leftover;
      }
      manifest[d.key] = entry;
      console.log(`  ${d.key} ${d.file} wide ${entry.wide.width}x${entry.wide.height}${entry.narrow ? ` narrow ${entry.narrow.width}x${entry.narrow.height}` : ''}`);
    }
  } finally { await browser.close(); }
}

// Keep exactly the current diagrams; drop renders no post uses any more.
const sorted = Object.fromEntries(Object.entries(manifest).sort());
await fs.writeFile(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n');
const keep = new Set(Object.values(sorted).flatMap(e => ['wide', 'narrow'].filter(v => e[v]).map(v => e[v].file)));
for (const file of await fs.readdir(DIAGRAM_DIR).catch(() => [])) if (!keep.has(file)) await fs.rm(path.join(DIAGRAM_DIR, file));
const leftovers = Object.entries(sorted).filter(([, e]) => e.wide.leftoverColors || e.narrow?.leftoverColors);
if (leftovers.length) console.warn(`Diagrams with colors outside tokens: ${leftovers.map(([k]) => k).join(', ')}`);
console.log(`Diagram manifest: ${Object.keys(sorted).length} entries`);
