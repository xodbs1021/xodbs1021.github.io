// Every chart (unless marked interactive="false") becomes a live ECharts chart once it scrolls
// near the viewport: tree-shaken ECharts drawing the same palette as the static SVG (token colors
// resolved from the page's CSS variables). The static SVG stays for readers without JavaScript and
// for the first paint; the live chart takes the height the static SVG had, so nothing shifts.
import {init, use, type ECharts} from 'echarts/core';
import {BarChart, LineChart, PieChart, ScatterChart, FunnelChart} from 'echarts/charts';
import {GridComponent, TooltipComponent, LegendComponent, TitleComponent, MarkLineComponent, MarkPointComponent, MarkAreaComponent} from 'echarts/components';
import {SVGRenderer} from 'echarts/renderers';
import {readableChartOption, narrowChartOption, NARROW_CHART_WIDTH} from './chart-layout.mjs';
import {chartTheme} from './chart-colors.mjs';
import {withDefaultTooltip} from './chart-tooltip.mjs';
import {chartDefaults} from './chart-defaults.mjs';

use([BarChart, LineChart, PieChart, ScatterChart, FunnelChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, MarkLineComponent, MarkPointComponent, MarkAreaComponent, SVGRenderer]);

// The phone copy of the static SVG is at most this wide (article-visuals.css .chart-narrow).
const NARROW_MAX_WIDTH = 480;
// Later changes (a legend toggle) animate briefly. The first draw never animates, so the swap from
// the static SVG is not a flash of bars growing from zero.
const UPDATE_ANIMATION_MS = 300;
const TOOLTIP_TRANSITION_S = 0.2;

const cssVar = (role: string) => '--' + role.replace(/[A-Z]/g, c => '-' + c.toLowerCase()).replace(/(\D)(\d)/g, '$1-$2');
const color = (role: string) => getComputedStyle(document.documentElement).getPropertyValue(cssVar(role)).trim();
// Colors arrive as "@token:<role>[/alpha]" (chart-render.mjs roleColors); token values are #rrggbb.
const TOKEN = /^@token:(\w+)(?:\/([\d.]+))?$/;
const withAlpha = (hex: string, alpha: number) => `rgba(${hex.slice(1).match(/\w\w/g)!.map(x => parseInt(x, 16)).join(',')},${alpha})`;
const recolor = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(recolor);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, recolor(v)]));
  const token = typeof value === 'string' && value.match(TOKEN);
  if (token) return token[2] === undefined ? color(token[1]) : withAlpha(color(token[1]), Number(token[2]));
  return value;
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Content width of the figure: the box the container query (and the static SVG) is sized against.
function contentWidth(figure: HTMLElement) {
  const style = getComputedStyle(figure);
  return figure.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

// Height of the static SVG this chart replaces at the given width (same aspect ratio).
function staticHeight(figure: HTMLElement, narrow: boolean, width: number, fallback: number) {
  const box = figure.querySelector<SVGSVGElement>(narrow ? '.chart-narrow svg' : '.chart-wide svg')?.viewBox.baseVal;
  if (!box?.width || !box.height) return fallback;
  return Math.min(width, narrow ? NARROW_MAX_WIDTH : width) * box.height / box.width;
}

function liveOption(source: object, narrow: boolean, fontFamily: string) {
  const option = chartDefaults(recolor(source)) as Record<string, unknown>;
  const layout = narrow ? narrowChartOption(option, fontFamily).option : readableChartOption(option, fontFamily);
  const reduce = reducedMotion.matches;
  const tooltipStyle = {
    backgroundColor: color('surface'), borderColor: color('grid'), borderWidth: 1, confine: true,
    textStyle: {color: color('ink'), fontFamily, fontSize: 13},
    transitionDuration: reduce ? 0 : TOOLTIP_TRANSITION_S,
  };
  return withDefaultTooltip({...layout, animation: !reduce, animationDuration: 0, animationDurationUpdate: UPDATE_ANIMATION_MS}, tooltipStyle);
}

export function mountChart(el: HTMLElement, source: object, fontFamily: string) {
  const figure = el.parentElement!;
  const fallbackHeight = Number(el.dataset.height) || 360;
  let chart: ECharts | undefined;
  let drawn = {width: -1, narrow: false};
  // Rebuild for a new theme or motion setting and when the phone/wide layout flips; otherwise resize.
  const draw = (rebuild: boolean) => {
    const width = contentWidth(figure), narrow = width < NARROW_CHART_WIDTH;
    if (!rebuild && width === drawn.width) return;
    el.style.height = `${staticHeight(figure, narrow, width, fallbackHeight)}px`;
    if (chart && !rebuild && narrow === drawn.narrow) { chart.resize(); drawn = {width, narrow}; return; }
    chart?.dispose();
    chart = init(el, chartTheme(color), {renderer: 'svg'});
    chart.setOption(liveOption(source, narrow, fontFamily));
    drawn = {width, narrow};
  };
  draw(true);
  new ResizeObserver(() => draw(false)).observe(figure);
  window.addEventListener('themechange', () => draw(true));
  reducedMotion.addEventListener('change', () => draw(true));
}
