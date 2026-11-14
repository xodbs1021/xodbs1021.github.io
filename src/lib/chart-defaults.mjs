// Presentation defaults shared by the build-time SVG and the live chart (both call chartDefaults):
// - value labels written as "{c}" (optionally with text around it) show numbers with thousands
//   separators, like the axes and the tables ("12,685", not "12685");
// - scatter points are opaque (ECharts' default 0.8 lets a gray point fall below 3:1);
// - formatter strings holding JavaScript functions are made safe (JSON cannot carry functions).
// An option written in the post wins: only unset values are filled in.
const SCATTER_TYPES = new Set(['scatter', 'effectScatter']);
const seriesOf = option => [option.series].flat().filter(Boolean);
const formatNumber = value => (typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US', {maximumFractionDigits: 20}) : value);
const valueOf = v => (v && typeof v === 'object' && !Array.isArray(v) ? v.value : v);

// --- formatter strings ---------------------------------------------------------------------------
// "function(v){return v + '%'}", "v => v + '건'", "function(v){return v===null?'-':v+'건'}" and the
// same on `p.value` become a real function that appends the unit. Any other function text is
// dropped (nothing from the post is evaluated); template strings such as "{b}: {c}" stay.
const FUNCTION_TEXT = /^\s*(?:async\s+)?(?:function\b|(?:\([^()]*\)|[A-Za-z_$][\w$]*)\s*=>)/;
const HEAD = [
  /^\s*function\s*[\w$]*\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{\s*return\s+([\s\S]*?)\s*;?\s*\}\s*$/,
  /^\s*\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>\s*\{\s*return\s+([\s\S]*?)\s*;?\s*\}\s*$/,
  /^\s*\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>\s*([\s\S]*?)\s*;?\s*$/,
];
function unitFormatter(text) {
  for (const head of HEAD) {
    const match = text.match(head);
    if (!match) continue;
    const p = `${match[1].replace(/\$/g, '\\$')}(?:\\.value)?`;
    const body = match[2].match(new RegExp(`^(?:${p}\\s*===?\\s*null\\s*\\?\\s*(['"])(.*?)\\1\\s*:\\s*)?${p}\\s*\\+\\s*(['"])(.*?)\\3$`));
    if (!body) return null;
    const empty = body[2] ?? '-', unit = body[4];
    return arg => {
      const v = valueOf(arg);
      return v === null || v === undefined || v === '-' ? empty : `${formatNumber(v)}${unit}`;
    };
  }
  return null;
}
const FORMATTER_KEYS = new Set(['formatter', 'valueFormatter']);
function safeFormatters(value) {
  if (Array.isArray(value)) return value.map(safeFormatters);
  if (!value || typeof value !== 'object') return value;
  const next = {};
  for (const [key, v] of Object.entries(value)) {
    if (FORMATTER_KEYS.has(key) && typeof v === 'string' && (key === 'valueFormatter' || FUNCTION_TEXT.test(v))) {
      const unit = unitFormatter(v);
      if (unit) next[key] = unit;
      continue;
    }
    next[key] = safeFormatters(v);
  }
  return next;
}

// --- value labels --------------------------------------------------------------------------------
// "{c}" with plain text around it, on series whose values are single numbers (not [x, y] pairs).
const VALUE_TEMPLATE = /^([^{}]*)\{c\}([^{}]*)$/;
function numberLabel(label, data) {
  if (!label || typeof label.formatter !== 'string') return label;
  const match = label.formatter.match(VALUE_TEMPLATE);
  if (!match || (data || []).some(d => Array.isArray(valueOf(d)))) return label;
  const [, before, after] = match;
  return {...label, formatter: params => `${before}${formatNumber(params.value)}${after}`};
}
function withNumberLabels(s) {
  const data = s.data || [];
  return {
    ...s,
    ...(s.label ? {label: numberLabel(s.label, data)} : {}),
    ...(Array.isArray(s.data) ? {data: data.map(d => (d && typeof d === 'object' && !Array.isArray(d) && d.label ? {...d, label: numberLabel(d.label, data)} : d))} : {}),
  };
}

const opaqueScatter = s => (SCATTER_TYPES.has(s.type) ? {...s, itemStyle: {opacity: 1, ...s.itemStyle}} : s);

export function chartDefaults(option) {
  const safe = safeFormatters(option);
  if (!safe.series) return safe;
  const series = seriesOf(safe).map(s => withNumberLabels(opaqueScatter(s)));
  return {...safe, series: Array.isArray(safe.series) ? series : series[0]};
}
