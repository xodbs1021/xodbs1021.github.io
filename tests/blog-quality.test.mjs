import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from 'cheerio';
import sharp from 'sharp';
import {posts} from '../src/lib/posts.mjs';
import {readingPaths,readingContext} from '../src/lib/reading-paths.mjs';
import {reconcile,playbackCases,playbackDecision,latencyBudget,labForSlug,labsForSlug,compatibilityCategories,compatibilityCategory,cutoverStages,cutoverStage} from '../src/lib/explanation-models.mjs';

test('missed events converge without duplicates, but missing bytes are not restored',()=>{
 const disk=[1,2,3,4,5,6,7];
 const first=reconcile(disk,[1,2,3,4,4]);
 assert.deepEqual(first.added,[5,6,7]);assert.equal(first.index.length,7);
 assert.deepEqual(reconcile(disk,first.index).added,[]);
 assert.ok(!first.index.includes(8));
});
test('access permission never overrides a mismatched or malformed playback target',()=>{
 for(const kind of Object.keys(playbackCases)){
   assert.equal(playbackDecision(kind,false).upstream,0);
   assert.equal(playbackDecision(kind,true).upstream,kind==='match'?1:0);
 }
 assert.throws(()=>playbackDecision('unknown',true));
});
test('latency budget follows stated units and assumptions at endpoints',()=>{
 assert.equal(latencyBudget(2,2,300,200).total,5.5);
 assert.equal(latencyBudget(6,4,1000,1000).total,29);
 assert.equal(latencyBudget(1,0,0,0).total,.5);
 assert.throws(()=>latencyBudget(-1,0,0,0));
});
test('curated reading sequences have valid, unique destinations and correct neighbors',()=>{
 for(const route of readingPaths){
  assert.equal(new Set(route.slugs).size,route.slugs.length);
  for(const slug of route.slugs) assert.ok(posts.some(p=>p.slug===slug),slug);
  const middle=posts.find(p=>p.slug===route.slugs[1]);
  const context=readingContext(middle,posts);
  assert.equal(context.previous.slug,route.slugs[0]);assert.equal(context.next.slug,route.slugs[2]);
  assert.ok(context.related.every(p=>p.slug!==middle.slug&&p.score>0));
 }
});
test('original heading anchors remain unchanged after corrections',()=>{
 const baseline=JSON.parse(fs.readFileSync('data/legacy-heading-ids.json'));
 for(const p of posts) assert.deepEqual(p.headings.map(h=>h.id),baseline[p.slug],p.slug);
});
test('responsive derivatives have the declared dimensions, formats, and original fallback',async()=>{
 const manifest=JSON.parse(fs.readFileSync('data/image-manifest.json'));
 for(const [src,entry] of Object.entries(manifest)){
  assert.equal(fs.statSync('static'+src).size,entry.bytes);
  if(entry.preserveQuality)assert.deepEqual(entry.variants,{});
  for(const [format,variants] of Object.entries(entry.variants)){
   for(const variant of variants){
    assert.ok(variant.width<=entry.width);
    const actual=await sharp('dist'+variant.src).metadata();
    assert.equal(actual.width,variant.width);assert.equal(actual.format,format==='avif'?'heif':format);
    assert.ok(Math.abs(actual.height-entry.height*variant.width/entry.width)<=1);
   }
  }
 }
 for(const post of posts){
  const $=load(fs.readFileSync(`dist${post.url}index.html`,'utf8'));
  $('.article-content img').each((_,el)=>{
   const img=$(el),entry=manifest[img.attr('src')];if(!entry)return;
   assert.equal(img.attr('data-original'),entry.original);assert.equal(Number(img.attr('width')),entry.width);
   assert.equal(img.attr('loading'),'lazy');
   if(!entry.preserveQuality)assert.equal(img.parent('picture').find('source').length,2);
  });
 }
});
test('corrected numerical claims and explicit model boundaries survive publishing',()=>{
 const h264=posts.find(p=>p.slug==='tech-blurting/h264-deep-dive');
 assert.ok(!h264.title.includes('10만'));assert.match(h264.raw,/497\.664/);assert.match(h264.raw,/8,160/);assert.match(h264.raw,/-r 60 -g 120/);
 assert.equal(1920*1080*3*60/750000,497.664);
 assert.equal(6e6*14400/8/1e9*50000,540000);
 for(const slug of ['0-to-1/pokeclip-indexer-recovery-without-events','0-to-1/pokeclip-nginx-playback-request-boundary','tech-blurting/hls-just-files']){
  const $=load(fs.readFileSync(`dist/posts/${slug}/index.html`,'utf8'));
  assert.equal($('[data-lab]').length,1);assert.match($('.explanation-lab').text(),/설명용 모형/);
  $('.explanation-lab input[type=range]').each((_,el)=>assert.equal($(`label[for="${$(el).attr('id')}"]`).length,1));
  assert.ok($('.explanation-lab noscript').length);assert.ok($('.explanation-lab [role=status]').length);
 }
});

test('raw SVG stays in the SVG namespace across blank lines',()=>{
 const post=posts.find(p=>p.slug==='0-to-1/github-pages-blog-automation');
 const $=load(post.html);
 assert.ok($('.static-diagram svg text').length>10);
 assert.equal($('.diagram-viewport > p').length,0);
 assert.ok(!post.html.includes('BLOG_RAW_HTML_'));
});

test('a post can carry several explanation models, each a known mode',()=>{
 const known=new Set(['recovery','authorization','latency','compatibility','cutover']);
 for(const slug of Object.keys(labForSlug)){
  const modes=labsForSlug(slug);
  assert.ok(modes.length>=1);assert.equal(new Set(modes).size,modes.length);
  for(const mode of modes)assert.ok(known.has(mode),`${slug}: ${mode}`);
 }
 assert.deepEqual(labsForSlug('tech-blurting/hls-just-files'),['latency']);
 assert.deepEqual(labsForSlug('projects/multicloud-migration-design'),['compatibility','cutover']);
 assert.deepEqual(labsForSlug('no/such-post'),[]);
});
test('cutover model never lets two databases accept writes',()=>{
 const stages=cutoverStages.map((_,i)=>cutoverStage(i));
 for(const stage of stages)assert.ok(stage.writable.length<=1,stage.key);
 assert.deepEqual(stages.map(s=>s.key),['precheck','copying','ready','fencing','draining','stopping','switching','completed']);
 assert.deepEqual(stages.map(s=>s.writable[0]??null),['원본 DB','원본 DB','원본 DB',null,null,null,'대상 DB','대상 DB']);
 for(const i of [3,4,5])assert.match(stages[i].summary,/없음/);
 assert.match(stages[6].gate,/NEEDS_RECOVERY/);
 assert.throws(()=>cutoverStage(8));assert.throws(()=>cutoverStage(-1));
});
test('compatibility model covers the four classifications with an explicit next step',()=>{
 assert.equal(compatibilityCategories.length,4);
 for(const [i,c] of compatibilityCategories.entries()){
  for(const field of ['label','hint','title','body','example','next'])assert.ok(c[field],`${c.key}.${field}`);
  assert.equal(compatibilityCategory(i),c);
 }
 assert.throws(()=>compatibilityCategory(4));
});
test('built posts render one section per declared model',()=>{
 for(const slug of Object.keys(labForSlug)){
  const file=`dist/posts/${slug}/index.html`;
  if(!fs.existsSync(file))continue; // drafts and future posts are not built
  const $=load(fs.readFileSync(file,'utf8'));
  assert.deepEqual($('[data-lab]').map((_,el)=>$(el).attr('data-lab')).get(),labsForSlug(slug));
  assert.equal($('#lab-title').length,1);
 }
});

test('archify embeds stay unloaded in markup and only their own path may be framed',()=>{
 // Any post may embed an archify page; every embed must follow the same loading contract.
 for(const p of posts){
  const $=load(fs.readFileSync(`dist/posts/${p.slug}/index.html`,'utf8'));
  $('.diagram-embed').each((_,el)=>{
   const frame=$(el).find('iframe'),src=frame.attr('data-diagram-src');
   assert.equal(frame.attr('src'),undefined,'frame must be loaded by script on wide screens only');
   assert.ok(frame.attr('title'));assert.equal(frame.attr('loading'),'lazy');
   assert.ok(fs.existsSync(`dist${src}index.html`),src);
   assert.equal($(el).find('.diagram-open').attr('href'),src);
   assert.ok($(el).find('p img').attr('alt'));
  });
 }
 // Standalone archify pages stay published so links made before embeds were removed keep working.
 for(const page of ['multicloud-migration-architecture','multicloud-migration-cutover'])assert.ok(fs.existsSync(`dist/diagrams/${page}/index.html`),page);
 const rules=JSON.parse(fs.readFileSync('vercel.json','utf8')).headers;
 const value=(rule,key)=>rule.headers.find(h=>h.key===key)?.value||'';
 const site=rules.find(r=>r.source==='/((?!diagrams/).*)'),diagrams=rules.find(r=>r.source==='/diagrams/(.*)');
 assert.equal(value(site,'X-Frame-Options'),'DENY');assert.match(value(site,'Content-Security-Policy'),/frame-ancestors 'none'/);
 assert.equal(value(diagrams,'X-Frame-Options'),'SAMEORIGIN');assert.match(value(diagrams,'Content-Security-Policy'),/frame-ancestors 'self'/);
 assert.match(value(site,'Content-Security-Policy'),/frame-src 'self'/);
 assert.ok(!rules.some(r=>r.source==='/(.*)'),'no catch-all rule may re-add DENY to /diagrams/');
});
