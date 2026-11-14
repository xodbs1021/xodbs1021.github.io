// Live charts always get a tooltip. Bars and lines read best per category (axis trigger, the whole
// column at once); scatter, pie and funnel per mark (item trigger). A line drawn without symbols can
// only answer an axis trigger, so a chart mixing lines or bars with points also uses the axis.
// A tooltip written in the post wins over these defaults key by key; the style (theme colors,
// confined to the chart) sits under it. Formatter strings are made safe earlier (chart-defaults.mjs).
const AXIS_TYPES = new Set(['bar', 'line']);
const seriesOf = option => [option.series].flat().filter(Boolean);

export function defaultTooltip(option) {
  const types = seriesOf(option).map(s => s.type);
  if (!types.some(t => AXIS_TYPES.has(t))) return {trigger: 'item'};
  return {trigger: 'axis', axisPointer: {type: types.every(t => t === 'bar') ? 'shadow' : 'line'}};
}

export function withDefaultTooltip(option, style = {}) {
  const own = option.tooltip;
  if (Array.isArray(own)) return {...option, tooltip: own.map(t => ({...style, ...t}))};
  const authored = own && typeof own === 'object' ? own : {};
  return {...option, tooltip: {...style, ...defaultTooltip(option), ...authored}};
}
