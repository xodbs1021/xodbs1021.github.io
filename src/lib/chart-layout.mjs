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
