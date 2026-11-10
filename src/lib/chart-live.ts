// Loaded only for charts marked interactive="true": tree-shaken ECharts drawing the same
// palette as the static SVG (token colors resolved from the page's CSS variables).
import {init, use} from 'echarts/core';
import {BarChart, LineChart, PieChart, ScatterChart, FunnelChart} from 'echarts/charts';
import {GridComponent, TooltipComponent, LegendComponent, TitleComponent, MarkLineComponent, MarkPointComponent, MarkAreaComponent} from 'echarts/components';
import {SVGRenderer} from 'echarts/renderers';
import {readableChartOption, narrowChartOption} from './chart-layout.mjs';
import {LEGACY_COLORS, CATEGORICAL} from './chart-colors.mjs';

use([BarChart, LineChart, PieChart, ScatterChart, FunnelChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, MarkLineComponent, MarkPointComponent, MarkAreaComponent, SVGRenderer]);

const cssVar = (role: string) => '--' + role.replace(/[A-Z]/g, c => '-' + c.toLowerCase()).replace(/(\D)(\d)/g, '$1-$2');
const color = (role: string) => getComputedStyle(document.documentElement).getPropertyValue(cssVar(role)).trim();
const recolor = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(recolor);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, recolor(v)]));
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
    const role = (LEGACY_COLORS as Record<string, string>)[value.toLowerCase()];
    return role ? color(role) : value;
  }
  return value;
};

export function mountChart(el: HTMLElement, source: object, fontFamily: string) {
  const narrow = () => (el.parentElement?.clientWidth ?? 720) < 600;
  const create = () => {
    const axis = {axisLine: {lineStyle: {color: color('muted')}}, axisLabel: {color: color('muted')}, splitLine: {lineStyle: {color: color('grid')}}, nameTextStyle: {color: color('muted')}};
    const theme = {color: CATEGORICAL.map(color), backgroundColor: 'transparent', textStyle: {color: color('ink')}, legend: {textStyle: {color: color('ink')}}, categoryAxis: axis, valueAxis: axis, logAxis: axis};
    const option = recolor(source) as object;
    const chart = init(el, theme, {renderer: 'svg'});
    chart.setOption(narrow() ? narrowChartOption(option, fontFamily).option : readableChartOption(option, fontFamily));
    return chart;
  };
  let chart = create();
  new ResizeObserver(() => { chart.dispose(); chart = create(); }).observe(el.parentElement!);
  window.addEventListener('themechange', () => { chart.dispose(); chart = create(); });
}
