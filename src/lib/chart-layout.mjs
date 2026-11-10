// Preserve data/units while reserving room for axes, outer values and legends.
export function readableChartOption(option, fontFamily) {
  const series = Array.isArray(option.series) ? option.series : [option.series].filter(Boolean);
  const pie = series.find(s => s.type === 'pie');
  const axis = (value, horizontal) => {
    if (!value) return value;
    const format = a => ({...a, splitNumber:a.splitNumber ?? 4,
      ...(horizontal && a.name ? {nameLocation:'middle', nameGap:36} : {}),
      axisLabel:{...a.axisLabel, hideOverlap:true}});
    return Array.isArray(value) ? value.map(format) : format(value);
  };
  const grid = g => ({...g, containLabel:true, top:g?.top ?? 60,
    right:Math.max(typeof g?.right==='number'?g.right:0,80), bottom:60});
  return {...option, animation:false, backgroundColor:'transparent',
    textStyle:{...option.textStyle,fontFamily,fontSize:13},
    xAxis:axis(option.xAxis,true), yAxis:axis(option.yAxis,false),
    ...(option.xAxis || option.yAxis ? {grid:Array.isArray(option.grid)?option.grid.map(grid):grid(option.grid)} : {}),
    ...(pie ? {
      legend:{...option.legend,orient:'vertical',left:12,top:'middle',
        formatter:name=>{
          const total=pie.data.reduce((sum,d)=>sum+Number(d.value),0);
          const item=pie.data.find(d=>d.name===name);
          return item&&total?`${name} · ${Number((item.value/total*100).toFixed(1))}%`:name;
        }},
      series:series.map(s=>s.type==='pie'?{...s,center:['72%','50%'],radius:['28%','52%'],label:{...s.label,show:false},labelLine:{show:false}}:s)
    } : {})};
}

const axesOf = value => [value].flat().filter(Boolean);
const seriesOf = option => [option.series].flat().filter(Boolean);
// Narrow screens: horizontal bars, wrapped labels, axis names moved under the chart.
export function narrowChartOption(option, fontFamily) {
  const base = readableChartOption(option, fontFamily);
  const xs = axesOf(base.xAxis), ys = axesOf(base.yAxis), series = seriesOf(base);

  const strip = a => ({...a, name: '', axisLabel: {...a.axisLabel, fontSize: 12, width: 104, overflow: 'break', hideOverlap: true}});
  let next = {...base, textStyle: {...base.textStyle, fontSize: 12}};
  const horizontal = xs.length === 1 && xs[0].type === 'category' && ys.length === 1 && series.length && series.every(s => s.type === 'bar');
  // Axis names move under the chart; after the swap the category axis is the vertical one.
  const axisNames = (horizontal
    ? [ys[0].name && ['가로축', ys[0].name], xs[0].name && ['세로축', xs[0].name]]
    : [...xs.map(a => a.name && ['가로축', a.name]), ...ys.map(a => a.name && ['세로축', a.name])]).filter(Boolean);
  if (horizontal) {
    next = {...next,
      yAxis: strip({...xs[0], inverse: true}),
      xAxis: strip(ys[0]),
      series: series.map(s => ({...s,
        label: s.label && {...s.label, position: s.label.position === 'top' ? 'right' : s.label.position},
        markLine: s.markLine && {...s.markLine, data: s.markLine.data?.map(d => d && 'yAxis' in d ? {...d, xAxis: d.yAxis, yAxis: undefined} : d)}}))};
  } else if (xs.length || ys.length) {
    next = {...next, xAxis: Array.isArray(base.xAxis) ? xs.map(strip) : base.xAxis && strip(base.xAxis), yAxis: Array.isArray(base.yAxis) ? ys.map(strip) : base.yAxis && strip(base.yAxis)};
  }
  if (xs.length || ys.length) next.grid = {left: 8, right: 16, top: next.legend ? 52 : 24, bottom: 12, containLabel: true};
  const pie = series.find(s => s.type === 'pie' || s.type === 'funnel');
  if (pie) {
    next.legend = {...base.legend, orient: 'horizontal', left: 'center', top: 'bottom', itemGap: 10, textStyle: {fontSize: 12}};
    next.series = series.map(s => s.type === 'pie' ? {...s, center: ['50%', '42%'], radius: ['26%', '50%']} : s.type === 'funnel' ? {...s, left: 8, right: 8, top: 12, bottom: 64} : s);
  } else if (next.legend) {
    next.legend = {...next.legend, left: 'center', top: 0, itemGap: 10, textStyle: {fontSize: 12}};
  }
  const categories = horizontal ? (xs[0].data || []).length : 0;
  return {option: next, axisNames, minHeight: horizontal ? categories * 36 + 80 : 0};
}

