import test from 'node:test';
import assert from 'node:assert/strict';
import {readableChartOption} from '../src/lib/chart-layout.mjs';

test('layout adaptation keeps series values, axes, units and source options intact',()=>{
  const source={xAxis:{name:'비용 (USD)',type:'log'},yAxis:{type:'category',data:['A','B']},series:[{type:'bar',data:[12,24]}]};
  const snapshot=structuredClone(source);
  const result=readableChartOption(source,'sans-serif');
  assert.deepEqual(source,snapshot);
  assert.deepEqual(result.series,source.series);
  assert.equal(result.xAxis.type,'log');
  assert.equal(result.xAxis.name,'비용 (USD)');
  assert.deepEqual(result.yAxis.data,['A','B']);
});

test('pie legends retain every category and disclose shares without changing data',()=>{
  const source={series:[{type:'pie',data:[{name:'A',value:3},{name:'B',value:1}]}]};
  const result=readableChartOption(source,'sans-serif');
  assert.deepEqual(result.series[0].data,source.series[0].data);
  assert.equal(result.legend.formatter('A'),'A · 75%');
  assert.equal(result.legend.formatter('B'),'B · 25%');
  assert.equal(source.series[0].label,undefined);
});
