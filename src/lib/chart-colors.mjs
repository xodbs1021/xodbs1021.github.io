// Colors hard-coded by earlier chart JSON, mapped to the nearest token role. chart-render.mjs adds
// the light token values and resolves both renderers' colors from this one map (the live chart gets
// "@token:<role>" markers), so the static SVG and the live chart draw the same palette.
export const LEGACY_COLORS = {
  '#3b82f6': 'cat1', '#f59e0b': 'cat2', '#fbbf24': 'cat2', '#10b981': 'cat3', '#76b900': 'cat3',
  '#ef4444': 'cat4', '#a78bfa': 'cat5', '#8b5cf6': 'cat5', '#94a3b8': 'dataMuted',
  '#087f8b': 'accent', '#172c40': 'ink', '#b42318': 'danger', '#7f1d1d': 'danger',
};
export const CATEGORICAL = ['cat1', 'cat2', 'cat3', 'cat4', 'cat5'];

// One ECharts theme for both renderers: `role` maps a token role to a color (build-time sentinels
// that become CSS variables, or the page's resolved CSS variables in the live chart).
export function chartTheme(role, fontFamily) {
  const axis = {
    axisLine: {lineStyle: {color: role('muted')}}, axisTick: {lineStyle: {color: role('muted')}},
    axisLabel: {color: role('muted')}, splitLine: {lineStyle: {color: [role('grid')]}},
    nameTextStyle: {color: role('muted')}, splitArea: {show: false},
  };
  return {
    color: CATEGORICAL.map(role),
    backgroundColor: 'transparent',
    textStyle: {color: role('ink'), ...(fontFamily ? {fontFamily} : {})},
    title: {textStyle: {color: role('ink')}, subtextStyle: {color: role('muted')}},
    legend: {textStyle: {color: role('ink')}, inactiveColor: role('dataMuted')},
    categoryAxis: axis, valueAxis: axis, logAxis: axis, timeAxis: axis,
    markLine: {lineStyle: {color: role('muted')}, label: {color: role('ink')}},
    // Without this, outside value labels get ECharts' #333 text with a white halo (unreadable in dark).
    label: {color: role('ink')},
  };
}
