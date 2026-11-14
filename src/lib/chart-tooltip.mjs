// Live charts always get a tooltip. Bars and lines read best per category (axis trigger, the whole
// column at once); scatter, pie and funnel per mark (item trigger). A line drawn without symbols can
// only answer an axis trigger, so a chart mixing lines or bars with points also uses the axis.
// A tooltip written in the post wins over these defaults key by key; the style (theme colors,
// confined to the chart) sits under it.
const AXIS_TYPES = new Set(['bar', 'line']);
const seriesOf = option => [option.series].flat().filter(Boolean);

export function defaultTooltip(option) {
  const types = seriesOf(option).map(s => s.type);
  if (!types.some(t => AXIS_TYPES.has(t))) return {trigger: 'item'};
  return {trigger: 'axis', axisPointer: {type: types.every(t => t === 'bar') ? 'shadow' : 'line'}};
}

// Chart options are JSON, so a formatter written as "function(v){return v + '%'}" arrives as a
// string that ECharts would call and throw on. A unit suffix is kept as a real function; any other
// function text is dropped (nothing from the post is evaluated). Template strings ("{c}") stay.
const FUNCTION_TEXT = /^\s*(function\b|\(?\s*\w*\s*\)?\s*=>)/;
const SUFFIX = /return\s+(?:v\s*===?\s*null\s*\?\s*(['"])(.*?)\1\s*:\s*)?v\s*\+\s*(['"])(.*?)\3\s*;?\s*\}\s*$/;
function safeFormatters(tooltip) {
  const next = {...tooltip};
  if (typeof next.valueFormatter === 'string') {
    const suffix = next.valueFormatter.match(SUFFIX);
    if (suffix) {
      const empty = suffix[2] ?? '-', unit = suffix[4];
      next.valueFormatter = v => (v === null || v === undefined || v === '-' ? empty : `${v}${unit}`);
    } else delete next.valueFormatter;
  }
  if (typeof next.formatter === 'string' && FUNCTION_TEXT.test(next.formatter)) delete next.formatter;
  return next;
}

export function withDefaultTooltip(option, style = {}) {
  const own = option.tooltip;
  if (Array.isArray(own)) return {...option, tooltip: own.map(t => safeFormatters({...style, ...t}))};
  const authored = own && typeof own === 'object' ? own : {};
  return {...option, tooltip: safeFormatters({...style, ...defaultTooltip(option), ...authored})};
}
