import {createHash} from 'node:crypto';
import {createFigures, parseArgs} from './figures.mjs';
import {loadManifest, readDiagramSvg, diagramKey, FONT_SIZE} from './diagrams.mjs';
import {renderChart} from './chart-render.mjs';

// Figures are emitted as placeholders while Markdown renders, then numbered in reading order.
// Shown only when the drawing actually overflows (article-client sets data-wide).
const SCROLL_HINT = '<span class="visual-scroll-hint">좌우로 스크롤하여 전체를 볼 수 있습니다.</span>';
const withHint = figcaption => figcaption.replace('</figcaption>', `${SCROLL_HINT}</figcaption>`);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const manifest = loadManifest();
export const visualReport = {warnings: [], missingDiagrams: []};
export const interactiveCharts = new Map();

// Smallest phone column the figure must fit (390px viewport, article and figure padding).
export const PHONE_COLUMN = 354;
// Rendered text may shrink to 12px: a 15px diagram can scale down to 0.8 before it must scroll.
const MIN_TEXT = 12;
const minScale = MIN_TEXT / FONT_SIZE;
// Variant switch points come in 100px steps so the stylesheet can hold one rule per step.
export const SWITCH_STEPS = Array.from({length: 16}, (_, i) => 500 + i * 100);
const switchStep = px => SWITCH_STEPS.find(step => step >= px) ?? SWITCH_STEPS.at(-1);

// Only the root <svg> tag is rewritten: size comes from CSS, the accessible name from <title>.
function prepareSvg(svg, {rootId, newRootId, title}) {
  const renamed = svg.replaceAll(rootId, newRootId);
  const end = renamed.indexOf('>') + 1;
  let root = renamed.slice(0, end).replace(/\s(?:width|height|role)="[^"]*"/g, '');
  let rest = renamed.slice(end);
  const titleId = rest.match(/^\s*<title\b[^>]*\bid="([^"]+)"/)?.[1];
  if (titleId) {
    if (!/aria-labelledby=/.test(root)) root = root.replace(/^<svg\b/, `<svg aria-labelledby="${titleId}"`);
  } else {
    root = root.replace(/\saria-labelledby="[^"]*"/, '').replace(/^<svg\b/, `<svg aria-labelledby="${newRootId}-title"`);
    rest = `<title id="${newRootId}-title">${esc(title)}</title>` + rest;
  }
  return root.replace(/^<svg\b/, '<svg role="img" focusable="false"') + rest;
}

function mermaidFigure(item, figures, slug) {
  const {source, attrs} = item;
  const key = diagramKey(source);
  const entry = manifest[key];
  if (!entry) {
    visualReport.missingDiagrams.push({slug, key});
    return `<figure class="diagram diagram-missing"><p>도식 렌더 결과가 없습니다. <code>npm run render:diagrams</code>를 실행하고 결과를 커밋하세요.</p></figure>`;
  }
  const accTitle = source.match(/^\s*accTitle:\s*(.+)$/m)?.[1]?.trim();
  const fig = figures.add({type: 'diagram', id: attrs.id, kind: attrs.kind, caption: attrs.caption, source: attrs.source, fallbackCaption: accTitle});
  const variants = ['wide', 'narrow'].filter(v => entry[v]).map(variant => {
    const {width} = entry[variant];
    const min = Math.ceil(width * minScale);
    const svg = prepareSvg(readDiagramSvg(entry, variant), {rootId: `mmd-${key}-${variant}`, newRootId: `${fig.id}-${variant}`, title: fig.title})
      .replace(/<svg\b/, `<svg style="width:100%;max-width:${width}px;min-width:${Math.min(width, min)}px;height:auto"`);
    return {variant, width, min, svg};
  });
  const wide = variants[0], narrow = variants[1];
  // Narrow screens show the top-to-bottom copy once the original would need to shrink below 12px text.
  const switchClass = narrow ? ` switch-${switchStep(wide.min)}` : '';
  const phone = narrow || wide;
  const scrolls = Math.min(phone.width, phone.min) > PHONE_COLUMN;
  if (scrolls && fig.complete) visualReport.warnings.push(`${slug}: ${fig.label} is wider than a phone even at 12px text`);
  // Earlier posts may still scroll; new, fully described figures must fit (layout check fails otherwise).
  const scrollAttr = scrolls && !fig.complete ? ' data-scroll="allowed"' : '';
  const body = variants.map(v => `<div class="diagram-variant diagram-${v.variant}">${v.svg}</div>`).join('');
  return `<figure class="diagram mermaid-figure${switchClass}" id="${esc(fig.id)}"${scrollAttr}><div class="diagram-viewport" tabindex="0" role="group" aria-label="${esc(fig.label)}">${body}</div>${withHint(fig.figcaption)}</figure>`;
}

function chartFigure(item, figures, slug) {
  const args = parseArgs(item.args);
  const fig = figures.add({type: 'chart', id: args.id, kind: args.kind, caption: args.caption, source: args.source});
  let option;
  try { option = JSON.parse(item.source); }
  catch (error) { throw new Error(`${slug}: ${fig.label} chart is not valid JSON (${error.message})`); }
  const height = Number(String(args.height || '360').replace(/px$/, '')) || 360;
  const chart = renderChart(option, {height, title: fig.title, idPrefix: fig.id});
  for (const warning of chart.warnings) visualReport.warnings.push(`${slug}: ${fig.label} ${warning}`);
  const interactive = args.interactive === 'true';
  let live = '';
  if (interactive) {
    const id = createHash('sha256').update(item.source).digest('hex').slice(0, 16);
    interactiveCharts.set(id, item.source.trim());
    live = `<div class="echart" data-chart="${id}" data-height="${height}" hidden></div>`;
  }
  const axes = chart.axisNames.length ? `<p class="chart-axes">${chart.axisNames.map(([axis, name]) => `${axis}: ${esc(name)}`).join(' · ')}</p>` : '';
  const table = chart.table ? `<details class="figure-data"><summary>데이터 표</summary><div class="figure-data-table">${chart.table}</div></details>` : '';
  return `<figure class="chart-figure${interactive ? ' is-interactive' : ''}" id="${esc(fig.id)}"><div class="chart-variant chart-wide">${chart.wide}</div><div class="chart-variant chart-narrow">${chart.narrow}${axes}</div>${live}${table}${fig.figcaption}</figure>`;
}

function staticSvgFigure(item, figures) {
  const title = item.svg.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] || item.svg.match(/aria-label="([^"]*)"/)?.[1];
  const fig = figures.add({type: 'svg', fallbackCaption: title});
  const width = Number(item.svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) [\d.]+"/)?.[1]) || 720;
  // Hand-drawn SVG is content: its sizes and colors are fixed in the post, so earlier ones are only reported.
  const legacy = fig.complete ? '' : `${width > PHONE_COLUMN ? ' data-scroll="allowed"' : ''} data-authored="legacy"`;
  const svg = /<title\b/.test(item.svg) ? item.svg : item.svg.replace(/(<svg\b[^>]*>)/, `$1<title>${esc(fig.title)}</title>`);
  return `<figure class="diagram static-diagram" id="${esc(fig.id)}"${legacy}><div class="diagram-viewport" tabindex="0" role="group" aria-label="${esc(fig.label)}" style="--diagram-width:${width}px">${svg}</div>${withHint(fig.figcaption)}</figure>`;
}

function imageFigure(item, figures) {
  const fig = figures.add({type: 'image', id: item.attrs.id, kind: item.attrs.kind, caption: item.attrs.caption, source: item.attrs.source});
  return `<figure class="image-figure" id="${esc(fig.id)}">${item.html}${fig.figcaption}</figure>`;
}

export function createVisuals(slug) {
  const pending = [];
  const figures = createFigures(slug);
  return {
    figures,
    placeholder(item) { pending.push(item); return `<!--BLOG_FIG_${pending.length - 1}-->`; },
    // Raw inline SVG from {{< rawhtml >}} blocks is wrapped as a numbered figure too.
    wrapStaticSvg(html) {
      return html.replace(/<svg\b[\s\S]*?<\/svg>/g, svg => this.placeholder({type: 'svg', svg}));
    },
    finish(html) {
      const build = {diagram: mermaidFigure, chart: chartFigure, svg: staticSvgFigure, image: imageFigure};
      const out = html.replace(/<!--BLOG_FIG_(\d+)-->/g, (_, i) => {
        const item = pending[Number(i)];
        return build[item.type](item, figures, slug);
      });
      const linked = figures.linkReferences(out);
      visualReport.warnings.push(...figures.warnings);
      return linked;
    },
  };
}
