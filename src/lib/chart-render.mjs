import * as echarts from 'echarts';
import {readableChartOption, narrowChartOption} from './chart-layout.mjs';
import {tokens, cssVar} from './tokens.mjs';
import {LEGACY_COLORS as LEGACY} from './chart-colors.mjs';

const LEGACY_COLORS = {...LEGACY};

// Charts are rendered once at build time as static SVG in two widths. Colors are written as
// CSS variables so one SVG follows the light/dark toggle without re-rendering.
export const CHART_WIDTHS = {narrow: 360, wide: 720};
const FONT = "'Pretendard Variable', Pretendard, sans-serif";

// Unique placeholders that no chart uses; rewritten to var(--token) after rendering.
const ROLE_KEYS = ['ink', 'muted', 'grid', 'dataMuted', 'accent', 'danger', 'cat1', 'cat2', 'cat3', 'cat4', 'cat5', 'surface', 'bg'];
// Blue channels are 8 apart: ECharts may lift a color by a step or two (label/emphasis styles).
const SENTINEL_RGB = Object.fromEntries(ROLE_KEYS.map((key, i) => [key, [10, 11, 16 + i * 8]]));
const SENTINEL = Object.fromEntries(Object.entries(SENTINEL_RGB).map(([key, rgb]) => [key, '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('')]));
const roleOfRgb = (r, g, b) => Object.entries(SENTINEL_RGB).find(([, [sr, sg, sb]]) => Math.abs(r - sr) <= 3 && Math.abs(g - sg) <= 3 && Math.abs(b - sb) <= 3)?.[0];
const roleOfHex = hex => roleOfRgb(...hex.slice(1).match(/\w\w/g).map(x => parseInt(x, 16)));

export {LEGACY_COLORS};
for (const [key, value] of Object.entries(tokens.themes.light)) if (ROLE_KEYS.includes(key)) LEGACY_COLORS[value] ??= key;

const axisTheme = {
  axisLine: {lineStyle: {color: SENTINEL.muted}}, axisTick: {lineStyle: {color: SENTINEL.muted}},
  axisLabel: {color: SENTINEL.muted}, splitLine: {lineStyle: {color: [SENTINEL.grid]}},
  nameTextStyle: {color: SENTINEL.muted}, splitArea: {show: false},
};
echarts.registerTheme('blog-ssr', {
  color: [SENTINEL.cat1, SENTINEL.cat2, SENTINEL.cat3, SENTINEL.cat4, SENTINEL.cat5],
  backgroundColor: 'transparent',
  textStyle: {color: SENTINEL.ink, fontFamily: FONT},
  title: {textStyle: {color: SENTINEL.ink}, subtextStyle: {color: SENTINEL.muted}},
  legend: {textStyle: {color: SENTINEL.ink}, inactiveColor: SENTINEL.dataMuted},
  categoryAxis: axisTheme, valueAxis: axisTheme, logAxis: axisTheme, timeAxis: axisTheme,
  markLine: {lineStyle: {color: SENTINEL.muted}, label: {color: SENTINEL.ink}},
  label: {color: SENTINEL.ink},
});

const isColor = v => typeof v === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v);
const fullHex = v => v.length === 4 ? '#' + [...v.slice(1)].map(c => c + c).join('') : v;
const RGB = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;
const toHex = (r, g, b) => '#' + [r, g, b].map(n => Number(n).toString(16).padStart(2, '0')).join('');

// Replace every literal color in the option with a sentinel; report the ones without a role.
function themeColors(option, unknown) {
  const walk = value => {
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
    if (isColor(value)) {
      const role = LEGACY_COLORS[fullHex(value.toLowerCase())];
      if (role) return SENTINEL[role];
      unknown.add(value);
    }
    const rgb = typeof value === 'string' && value.match(RGB);
    if (rgb && rgb[4] !== undefined && Number(rgb[4]) === 0) return value;
    if (rgb) {
      const role = LEGACY_COLORS[toHex(rgb[1], rgb[2], rgb[3])];
      if (role) return rgb[4] === undefined ? SENTINEL[role] : `rgba(${SENTINEL_RGB[role].join(',')},${rgb[4]})`;
      unknown.add(value);
    }
    return value;
  };
  return walk(option);
}

const axesOf = value => [value].flat().filter(Boolean);
const seriesOf = option => [option.series].flat().filter(Boolean);
const numeric = v => {
  const raw = v && typeof v === 'object' && !Array.isArray(v) ? v.value : v;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
};
export const narrowLayout = option => narrowChartOption(option, FONT);
export const wideLayout = option => readableChartOption(option, FONT);

const varFor = role => `var(${cssVar(role)})`;
function finishSvg(svg, {title, desc, idPrefix}) {
  const leftover = new Set();
  const colored = svg
    // Static output: drop hover styles and paints that are invisible anyway.
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/\sfill="[^"]*" fill-opacity="0"/g, ' fill="none"')
    .replace(/\sstroke="[^"]*" stroke-width="0"/g, ' stroke="none"')
    // ECharts paints hollow symbols with the page background: follow the figure surface instead.
    .replace(/(?<=(?:fill|stroke)=")#fff(?:fff)?(?=")/gi, varFor('surface'))
    .replace(/#[0-9a-f]{6}\b/gi, hex => {
      const role = roleOfHex(hex.toLowerCase());
      if (role) return varFor(role);
      leftover.add(hex.toLowerCase());
      return hex;
    })
    .replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g, (whole, r, g, b, a) => {
      if (a !== undefined && Number(a) === 0) return 'transparent';
      const role = roleOfRgb(Number(r), Number(g), Number(b));
      if (!role) { leftover.add(whole); return whole; }
      return a === undefined || Number(a) === 1 ? varFor(role) : `color-mix(in srgb, ${varFor(role)} ${Math.round(Number(a) * 100)}%, transparent)`;
    });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const svgOut = colored
    .replace(/<svg\b([^>]*?)\swidth="[\d.]+"\s+height="[\d.]+"/, '<svg$1')
    .replace(/<svg\b/, `<svg class="chart-svg" role="img" aria-labelledby="${idPrefix}-title ${idPrefix}-desc" focusable="false"`)
    .replace(/(<svg\b[^>]*>)/, `$1<title id="${idPrefix}-title">${esc(title)}</title><desc id="${idPrefix}-desc">${esc(desc)}</desc>`);
  return {svg: svgOut, leftover: [...leftover]};
}

function renderWidth(option, width, height) {
  const chart = echarts.init(null, 'blog-ssr', {renderer: 'svg', ssr: true, width, height});
  try {
    chart.setOption({...option, animation: false});
    return chart.renderToSVGString();
  } finally { chart.dispose(); }
}

// Plain-language summary for <desc>: extremes per series, using category names when present.
export function summarize(option) {
  const xs = axesOf(option.xAxis), ys = axesOf(option.yAxis);
  const categoryAxis = [...xs, ...ys].find(a => a.type === 'category' && Array.isArray(a.data));
  const valueAxis = [...ys, ...xs].find(a => a && a.type !== 'category');
  const unit = valueAxis?.name ? ` (${valueAxis.name})` : '';
  const parts = seriesOf(option).map((s, i) => {
    const name = s.name || `계열 ${i + 1}`;
    if (s.type === 'pie' || s.type === 'funnel') {
      const items = (s.data || []).map(d => ({name: d.name, value: numeric(d)})).filter(d => d.value !== null);
      const total = items.reduce((n, d) => n + d.value, 0);
      return `${name}: ` + items.map(d => `${d.name} ${d.value}${total ? ` (${(d.value / total * 100).toFixed(1)}%)` : ''}`).join(', ');
    }
    const values = (s.data || []).map((d, j) => {
      const pair = Array.isArray(d) ? d : Array.isArray(d?.value) ? d.value : null;
      if (pair) return typeof pair[1] === 'number' ? {label: pair[0], value: pair[1]} : {label: pair[1], value: pair[0]};
      return {label: categoryAxis?.data?.[j] ?? j + 1, value: numeric(d)};
    }).filter(d => typeof d.value === 'number');
    if (!values.length) return `${name}: 값 없음`;
    const max = values.reduce((a, b) => b.value > a.value ? b : a), min = values.reduce((a, b) => b.value < a.value ? b : a);
    return `${name}: 최대 ${max.label} ${max.value}, 최소 ${min.label} ${min.value}`;
  });
  return `${seriesOf(option).length}개 계열${unit}. ${parts.join('. ')}.`;
}

// Data table fallback (<details>) for every chart with readable values.
export function dataTable(option) {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const xs = axesOf(option.xAxis), ys = axesOf(option.yAxis), series = seriesOf(option);
  const categoryAxis = [...xs, ...ys].find(a => a.type === 'category' && Array.isArray(a.data));
  const table = (head, rows) => `<table><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table>`;
  const pie = series.find(s => s.type === 'pie' || s.type === 'funnel');
  if (pie) return table(['항목', pie.name || '값'], (pie.data || []).map(d => [d.name, numeric(d) ?? '']));
  const pairs = s => (s.data || []).map(d => Array.isArray(d) ? d : Array.isArray(d?.value) ? d.value : null).filter(Boolean);
  if (series.some(s => s.type === 'scatter')) {
    return table(['계열', xs[0]?.name || '가로축', ys[0]?.name || '세로축'], series.flatMap((s, i) => pairs(s).map(d => [s.name || `계열 ${i + 1}`, d[0], d[1]])));
  }
  if (categoryAxis) {
    const rows = categoryAxis.data.map((c, j) => [typeof c === 'object' ? c.value : c, ...series.map(s => {const d = s.data?.[j]; return Array.isArray(d) ? d[1] : numeric(d) ?? '';})]);
    return table([categoryAxis.name || '항목', ...series.map((s, i) => s.name || `계열 ${i + 1}`)], rows);
  }
  const points = series.flatMap((s, i) => pairs(s).map(d => [s.name || `계열 ${i + 1}`, d[0], d[1]]));
  if (points.length) return table(['계열', xs[0]?.name || 'x', ys[0]?.name || 'y'], points);
  return '';
}

export function renderChart(source, {height = 360, title, idPrefix}) {
  const unknownColors = new Set();
  const option = themeColors(source, unknownColors);
  const desc = summarize(source);
  const narrow = narrowLayout(option);
  const wide = finishSvg(renderWidth(wideLayout(option), CHART_WIDTHS.wide, height), {title, desc, idPrefix: idPrefix + '-w'});
  const narrowSvg = finishSvg(renderWidth(narrow.option, CHART_WIDTHS.narrow, Math.max(height, narrow.minHeight)), {title, desc, idPrefix: idPrefix + '-n'});
  const yAxes = axesOf(source.yAxis), categories = (axesOf(source.xAxis).find(a => a.type === 'category')?.data || []).length;
  const warnings = [];
  if (unknownColors.size) warnings.push(`colors outside tokens: ${[...unknownColors].join(', ')}`);
  if (yAxes.length > 1) warnings.push('dual y-axis');
  const seriesCount = seriesOf(source).length;
  if (seriesCount > 5) warnings.push(`${seriesCount} series (more than 5 colors)`);
  const leftover = [...new Set([...wide.leftover, ...narrowSvg.leftover])];
  if (leftover.length) warnings.push(`renderer colors not mapped to tokens: ${leftover.join(', ')}`);
  return {wide: wide.svg, narrow: narrowSvg.svg, axisNames: narrow.axisNames, table: dataTable(source), desc, warnings, categories};
}
