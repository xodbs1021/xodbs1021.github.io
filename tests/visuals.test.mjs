import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from 'cheerio';
import {tokens, tokensCss, contrast} from '../src/lib/tokens.mjs';
import {createFigures, parseArgs, FIGURE_KINDS} from '../src/lib/figures.mjs';
import {collectDiagrams, loadManifest, narrowSource, DIAGRAM_DIR} from '../src/lib/diagrams.mjs';
import {narrowChartOption} from '../src/lib/chart-layout.mjs';
import {posts, renderBody, charts} from '../src/lib/posts.mjs';

test('token colors keep text at 4.5:1 and graphics at 3:1 on both backgrounds in both themes', () => {
  for (const [theme, values] of Object.entries(tokens.themes)) {
    for (const background of ['bg', 'surface']) {
      for (const role of tokens.roles.text) assert.ok(contrast(values[role], values[background]) >= 4.5, `${theme} ${role} on ${background}: ${contrast(values[role], values[background]).toFixed(2)}`);
      for (const role of tokens.roles.graphic) assert.ok(contrast(values[role], values[background]) >= 3, `${theme} ${role} on ${background}: ${contrast(values[role], values[background]).toFixed(2)}`);
    }
  }
  assert.equal(tokens.themes.light.muted, '#5d6e80');
});

test('site CSS and motion scenes read colors from the token file only', () => {
  assert.equal(fs.readFileSync('src/styles/tokens.css', 'utf8'), tokensCss(), 'run node scripts/build-tokens.mjs');
  const global = fs.readFileSync('src/styles/global.css', 'utf8');
  for (const name of ['--ink', '--muted', '--surface', '--accent', '--line']) assert.ok(!global.includes(`${name}:#`), `${name} redefined in global.css`);
  assert.match(fs.readFileSync('motion/src/theme.ts', 'utf8'), /from "\.\.\/\.\.\/src\/styles\/visual-tokens\.json"/);
});

test('figures are numbered in reading order and captions carry label, kind and source', () => {
  const figures = createFigures('t');
  const a = figures.add({type: 'chart', kind: '실측', caption: '처리량', source: 'https://example.com/report'});
  const b = figures.add({type: 'diagram', id: 'fig-flow'});
  assert.equal(a.label, '그림 1');
  assert.match(a.figcaption, /<span class="fig-label">그림 1\.<\/span> 처리량 <span class="fig-kind">실측<\/span> <span class="fig-source">출처: <a href="https:\/\/example\.com\/report">example\.com<\/a><\/span>/);
  assert.equal(b.number, 2);
  assert.equal(b.complete, false);
  assert.equal(figures.linkReferences('<p>[[fig-flow]]</p>'), '<p><a class="fig-ref" href="#fig-flow">그림 2</a></p>');
  figures.add({type: 'image', kind: '추측', caption: 'x'});
  assert.ok(figures.warnings.some(w => w.includes('unknown kind "추측"')));
  assert.deepEqual(parseArgs('caption="두 단어, 쉼표" kind="설명용 가정" height="420px"'), {caption: '두 단어, 쉼표', kind: '설명용 가정', height: '420px'});
});

test('Markdown fixtures: Mermaid fence attributes, chart shortcode, image figures and references', () => {
  const diagram = collectDiagrams()[0].source;
  const chart = '{"xAxis":{"type":"category","data":["a","b"]},"yAxis":{"type":"value","name":"ms"},"series":[{"name":"지연","type":"bar","data":[3,5]}]}';
  const {html, figures} = renderBody([
    '[[fig-flow]]를 보면 흐름이 보입니다.',
    '',
    '![로그 화면](/images/none.png){kind="스크린샷" caption="실제 오류 로그"}',
    '',
    '```mermaid {#fig-flow kind="개념도" caption="요청이 거절되는 경로" source="https://example.com"}',
    diagram.trimEnd(),
    '```',
    '',
    `{{< chart caption="단계별 지연" kind="실측" source="사내 측정" interactive="true" >}}\n${chart}\n{{< /chart >}}`,
  ].join('\n'), 'fixture/one');
  const $ = load(html);
  assert.deepEqual(figures.map(f => [f.number, f.type, f.kind, f.complete]), [[1, 'image', '스크린샷', true], [2, 'diagram', '개념도', true], [3, 'chart', '실측', true]]);
  assert.equal($('p > figure').length, 0, 'image figure must not sit inside a paragraph');
  assert.equal($('.image-figure img').attr('kind'), undefined);
  assert.equal($('#fig-flow figcaption .fig-label').text(), '그림 2.');
  assert.equal($('a.fig-ref').attr('href'), '#fig-flow');
  assert.equal($('a.fig-ref').text(), '그림 2');
  assert.ok($('#fig-flow svg[role=img] title').length >= 1);
  const live = $('.chart-figure.is-interactive [data-chart]').attr('data-chart');
  assert.ok(charts.has(live), 'interactive chart source is served from /charts/');
  assert.equal($('.chart-figure svg').length, 2);
  assert.equal($('.chart-figure svg title').first().text(), '단계별 지연');
  assert.match($('.chart-figure svg desc').first().text(), /지연: 최대 b 5, 최소 a 3/);
  assert.equal($('.chart-figure .figure-data table tbody tr').length, 2);
});

test('every Mermaid block has a committed render whose colors are theme variables', () => {
  const manifest = loadManifest();
  const keys = new Set(collectDiagrams().map(d => d.key));
  assert.deepEqual(Object.keys(manifest).sort(), [...keys].sort(), 'run npm run render:diagrams (and commit) after changing diagrams');
  for (const [key, entry] of Object.entries(manifest)) {
    for (const variant of ['wide', 'narrow'].filter(v => entry[v])) {
      const svg = fs.readFileSync(`${DIAGRAM_DIR}/${entry[variant].file}`, 'utf8');
      assert.ok(!/(?<=[:"(,]\s*)#[0-9a-f]{3,6}(?![0-9a-f])/i.test(svg), `${key}-${variant}: literal hex color`);
      assert.ok(!/\brgba?\(/.test(svg), `${key}-${variant}: literal rgb color`);
      assert.ok(!/<filter\b/.test(svg), `${key}-${variant}: shadow filter`);
    }
    if (entry.narrow) assert.ok(entry.wide.width > 700);
  }
  assert.equal(narrowSource('%%{init: {}}%%\nflowchart LR\n  A --> B'), '%%{init: {}}%%\nflowchart TB\n  A --> B');
  assert.equal(narrowSource('sequenceDiagram\n  A->>B: hi'), null);
  assert.equal(fs.readdirSync(DIAGRAM_DIR).length, Object.values(manifest).reduce((n, e) => n + (e.narrow ? 2 : 1), 0), 'orphaned renders');
});

test('earlier posts may lack figure metadata only as recorded; new posts must describe every figure', () => {
  const baseline = JSON.parse(fs.readFileSync('data/legacy-figure-gaps.json', 'utf8'));
  const current = Object.fromEntries(posts.map(p => [p.slug, p.figures.filter(f => !f.complete).length]).filter(([, n]) => n));
  assert.deepEqual(current, baseline, 'fill kind and caption for new figures; when fixing earlier ones, shrink data/legacy-figure-gaps.json');
  for (const post of posts) for (const figure of post.figures) if (figure.kind) assert.ok(FIGURE_KINDS.includes(figure.kind), `${post.slug} ${figure.id}: ${figure.kind}`);
});

test('built pages number figures in order and use no client renderer or fixed captions', () => {
  for (const post of posts.filter(p => p.figures.length)) {
    const $ = load(fs.readFileSync(`dist${post.url}index.html`, 'utf8'));
    const labels = $('.article-content figcaption .fig-label').map((_, el) => $(el).text()).get();
    assert.deepEqual(labels, post.figures.map(f => `그림 ${f.number}.`), post.slug);
    assert.equal($('pre.mermaid').length, 0);
    assert.ok(!$('.article-content').text().includes('구조와 흐름'), post.slug);
    $('.chart-figure').each((_, el) => {
      assert.equal($(el).find('.chart-wide svg title').length, 1);
      assert.equal($(el).find('.chart-narrow svg desc').length, 1);
      assert.ok(!/(fill|stroke)="#[0-9a-f]{6}"/i.test($(el).find('svg').toString()), `${post.slug}: literal chart color`);
    });
  }
});

test('narrow chart layout turns category bars horizontal without changing data', () => {
  const source = {xAxis: {type: 'category', name: '단계', data: ['인증', '할당']}, yAxis: {type: 'value', name: '지연 (ms)'}, series: [{type: 'bar', data: [100, 200], label: {show: true, position: 'top'}}]};
  const snapshot = structuredClone(source);
  const {option, axisNames, minHeight} = narrowChartOption(source, 'sans-serif');
  assert.deepEqual(source, snapshot);
  assert.equal(option.yAxis.type, 'category');
  assert.deepEqual(option.yAxis.data, ['인증', '할당']);
  assert.equal(option.xAxis.type, 'value');
  assert.deepEqual(option.series[0].data, [100, 200]);
  assert.equal(option.series[0].label.position, 'right');
  assert.deepEqual(axisNames, [['가로축', '지연 (ms)'], ['세로축', '단계']]);
  assert.ok(minHeight >= 2 * 36);
});

test('accTitle/accDescr follow the diagram declaration (mermaid fails to detect the type otherwise)', async () => {
  const {mermaidSourceProblem} = await import('../src/lib/diagrams.mjs');
  assert.match(mermaidSourceProblem('accTitle: 흐름\naccDescr: 설명\nflowchart TB\n  A --> B'), /comes before the diagram type/);
  assert.equal(mermaidSourceProblem('flowchart TB\n  accTitle: 흐름\n  accDescr: 설명\n  A --> B'), null);
  assert.equal(mermaidSourceProblem('---\ntitle: t\n---\nsequenceDiagram\n  accTitle: 순서'), null);
  for (const d of collectDiagrams()) assert.equal(mermaidSourceProblem(d.source), null, d.file);
});
