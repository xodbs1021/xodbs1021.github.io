import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
import {posts} from '../src/lib/posts.mjs';
import {labForSlug} from '../src/lib/explanation-models.mjs';

// Inspect the built site, including its actual cascade and client-side renderers.
// LAYOUT_URL is also used after deployment; never increment public view counters.
const out = path.resolve(process.env.LAYOUT_REPORT || 'test-results/layout');
await fs.mkdir(out, {recursive: true});
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2'};
let server;
if (!process.env.LAYOUT_URL) {
  server = http.createServer(async (req,res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve('dist', '.' + name + (name.endsWith('/') ? 'index.html' : ''));
      if (!file.startsWith(path.resolve('dist') + path.sep)) throw new Error('outside dist');
      const body = await fs.readFile(file);
      res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'}).end(body);
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
}
const base = process.env.LAYOUT_URL || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const report = {base, date:new Date().toISOString(), pages:[], visuals:[], states:[], failures:[]};
const fail = (scope, message) => {report.failures.push({scope,message});console.error(`FAIL ${scope}: ${message}`)};
const slugName = url => url.replaceAll(/[^a-zA-Z0-9-]/g,'_');
const widths = [320,390,768,1440];
const sitemap = await fs.readFile('dist/sitemap.xml','utf8');
const routes = [...new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname))];
// Taxonomy/search pages may deliberately be absent from sitemap; still inspect them.
for(const entry of await fs.readdir('dist',{recursive:true})){
  if(!entry.endsWith('index.html'))continue;
  const html=await fs.readFile(path.join('dist',entry),'utf8');
  if(html.includes('class="site-header"')){
    const route='/'+entry.replace(/index\.html$/,'');
    if(!routes.includes(route))routes.push(route);
  }
}
const selected = process.env.LAYOUT_PATH ? routes.filter(r=>r.includes(process.env.LAYOUT_PATH)) : routes;
const metrics = () => {
  const issues=[];
  const rect = el => el.getBoundingClientRect();
  const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility!=='hidden';
  if(document.documentElement.scrollWidth>innerWidth+1) issues.push(`document overflow ${document.documentElement.scrollWidth}/${innerWidth}`);
  for(const el of document.querySelectorAll('.prose p,.prose li,.article-description,.explanation-lab p,.explanation-lab label,.explanation-lab button')) {
    if(!visible(el)||el.closest('.mermaid')) continue;
    const s=getComputedStyle(el),r=rect(el);
    if(r.width<1) continue;
    // Explicit inner scrollers (code/table) are permitted, cropped prose is not.
    if(el.scrollWidth>el.clientWidth+2 && !el.closest('pre,table') && !['auto','scroll'].includes(s.overflowX)) issues.push(`clipped text: ${el.textContent.trim().slice(0,65)}`);
    if(el.matches('p') && !el.closest('figcaption,blockquote,table') && parseFloat(s.lineHeight)/parseFloat(s.fontSize)<1.55) issues.push(`tight line height: ${el.className||el.tagName}`);
    if(parseFloat(s.letterSpacing)/parseFloat(s.fontSize)<-.035) issues.push(`tight letter spacing: ${el.className||el.tagName}`);
  }
  const header=document.querySelector('.article-header'),body=document.querySelector('.article-body'),end=document.querySelector('.article-end');
  if(header&&body&&end) {
    if(Math.abs(rect(header).left-rect(body).left)>1||Math.abs(rect(header).width-rect(body).width)>1||Math.abs(rect(end).left-rect(body).left)>1) issues.push('article header/body/footer columns do not align');
  }
  const lab=document.querySelector('[data-lab]');
  let gap;
  if(lab){
    const actions=lab.querySelector('.lab-actions'),result=lab.querySelector('.lab-result');
    gap=rect(result).top-rect(actions).bottom;
    if(gap<11.5) issues.push(`actions/result gap ${gap}px (minimum 12px)`);
    for(const label of lab.querySelectorAll('.lab-checkbox')){
      const input=label.querySelector('input'),r=rect(input),l=rect(label);
      if(Math.abs((r.top+r.bottom-l.top-l.bottom)/2)>1) issues.push('checkbox is not vertically centered');
      if(l.height<44) issues.push('checkbox target below 44px');
    }
    for(const button of lab.querySelectorAll('button')) if(rect(button).height<44) issues.push('button target below 44px');
    const children=[...lab.children].filter(el=>visible(el)&&el.tagName!=='NOSCRIPT');
    for(let i=1;i<children.length;i++) if(rect(children[i]).top<rect(children[i-1]).bottom+11.5) issues.push(`lab blocks touch: ${children[i].className||children[i].tagName}`);
  }
  return {issues:[...new Set(issues)],gap,bodyFont:getComputedStyle(document.body).fontFamily,proseWidth:body?.clientWidth};
};
async function open(page,url,width,theme='light'){
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  const response=await page.goto(base+url,{waitUntil:'load'});
  if(!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
  await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('.article-body').count())await page.waitForFunction(()=>document.documentElement.dataset.articleReady==='true');
  await page.addStyleTag({content:'html{scroll-behavior:auto!important}*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}'});
  if(await page.locator('[data-lab]').count()) await page.waitForFunction(()=>![...document.querySelectorAll('[data-lab] button')].some(b=>b.disabled));
}
async function check(page,scope){
  const result=await page.evaluate(metrics);
  for(const issue of result.issues) fail(scope,issue);
  return result;
}
async function screenshot(page,selector,name){
  const file=name+'.png';
  await page.locator(selector).screenshot({path:path.join(out,file),animations:'disabled'});
  return file;
}
try {
  const queue=(['visuals','labs'].includes(process.env.LAYOUT_PHASE)?[]:selected).flatMap(url=>widths.map(width=>({url,width})));
  await Promise.all(Array.from({length:4},async()=>{
    const page=await browser.newPage();
    await page.route('**/api/views/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"views":0}'}));
    while(queue.length){
      const {url,width}=queue.shift(),scope=`${url}@${width}`;
      try {
        await open(page,url,width);
        report.pages.push({url,width,...await check(page,scope)});
        if(report.pages.length%100===0)console.log(`Checked ${report.pages.length}/${selected.length*widths.length} pages`);
      } catch(error){fail(scope,String(error));}
    }
    await page.close();
  }));
  console.log(`Layout: ${report.pages.length} route/width checks, ${report.failures.length} issues`);
  // Every chart/diagram is rendered, captured and checked at both text extremes.
  // Images are not just loaded above the fold: visit each figure to trigger lazy rendering.
  const visualPosts=posts.filter(p=>selected.includes(p.url)&&/data-chart|class="mermaid"|<svg/.test(p.html));
  for(const {width,theme} of (['pages','labs'].includes(process.env.LAYOUT_PHASE)?[]:[{width:390,theme:'light'},{width:1440,theme:'light'},{width:390,theme:'dark'}])){
    const page=await browser.newPage();
    await page.route('**/api/views/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"views":0}'}));
    for(const post of visualPosts){
      await open(page,post.url,width,theme);
      const figures=page.locator('.chart-figure,.diagram');
      for(let i=0;i<await figures.count();i++){
        const figure=figures.nth(i),scope=`${post.url}@${width}/${theme} figure ${i}`;
        try{
          await figure.scrollIntoViewIfNeeded();
          await figure.locator('canvas,svg').first().waitFor({timeout:15000});
          await page.waitForTimeout(200); // Canvas animations have their own scheduler.
          const file=`visual-${slugName(post.slug)}-${width}-${theme}-${i}.png`;
          await figure.screenshot({path:path.join(out,file),animations:'disabled'});
          const sizes=await figure.evaluate(el=>{
            const svg=el.querySelector('.mermaid svg,.diagram-viewport svg');
            const chart=el.querySelector('.echart svg');
            const luminance=color=>{
              const values=color.match(/[\d.]+/g)?.map(Number);
              if(!values||values.length<3||values[3]===0)return null;
              const rgb=values.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
              return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
            };
            const contrastIssues=[...el.querySelectorAll('.mermaid .node')].flatMap(node=>{
              const shape=node.querySelector('rect,polygon,circle,path'),label=node.querySelector('.nodeLabel');
              if(!shape||!label)return [];
              const a=luminance(getComputedStyle(shape).fill),b=luminance(getComputedStyle(label).color);
              if(a===null||b===null)return [];
              const contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
              return contrast<4.5?[`${label.textContent.slice(0,40)} (${contrast.toFixed(2)}:1)`]:[];
            });
            const clipped=chart?[...chart.querySelectorAll('text')].filter(t=>{const r=t.getBoundingClientRect(),b=chart.getBoundingClientRect();return r.width&&r.height&&(r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2)}).map(t=>t.textContent):[];
            return {contrastIssues,chartWidth:chart?.getBoundingClientRect().width,clipped,error:el.textContent.includes('차트를 불러오지 못했습니다')||!!el.querySelector('.error-icon'),width:el.clientWidth,svgScale:svg?.viewBox.baseVal.width?svg.getBoundingClientRect().width/svg.viewBox.baseVal.width:null};
          });
          if(sizes.error) fail(scope,'visual renderer error');
          if(sizes.contrastIssues.length)fail(scope,'diagram text contrast below 4.5:1: '+sizes.contrastIssues.join(', '));
          if(sizes.chartWidth&&sizes.chartWidth<700)fail(scope,'chart readable width lost (CSS import/cascade)');
          if(sizes.clipped.length)fail(scope,'chart text outside canvas: '+sizes.clipped.join(', '));
          if(sizes.svgScale!==null&&sizes.svgScale<.85)fail(scope,`diagram text shrunk to ${sizes.svgScale.toFixed(2)}x`);
          const detail=figure.locator('.echart,.mermaid svg,.diagram-viewport svg').first();
          const detailFile=file.replace('.png','-detail.png');
          // Supplemental expanded image: real viewport capture above remains unchanged.
          const scrollFrame=figure.locator('.chart-viewport,.mermaid,.diagram-viewport').first();
          await scrollFrame.evaluate(el=>el.style.overflow='visible');
          await detail.screenshot({path:path.join(out,detailFile),animations:'disabled'});
          await scrollFrame.evaluate(el=>el.style.removeProperty('overflow'));
          await scrollFrame.evaluate(el=>el.scrollLeft=el.scrollWidth);
          await figure.screenshot({path:path.join(out,file.replace('.png','-end.png')),animations:'disabled'});
          await scrollFrame.evaluate(el=>el.scrollLeft=0);
          report.visuals.push({url:post.url,width,theme,index:i,file,...sizes});
          if(report.visuals.length%50===0)console.log(`Captured ${report.visuals.length} figures`);
        }catch(error){fail(scope,String(error));}
      }
    }
    await page.close();
  }
  // Mutate actual inputs, not the result text. Inspect long states as well as defaults.
  for(const [slug,mode] of Object.entries(['pages','visuals'].includes(process.env.LAYOUT_PHASE)?{}:labForSlug)){
    if(!selected.includes(`/posts/${slug}/`))continue;
    for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
      const page=await browser.newPage();
      await page.route('**/api/views/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"views":0}'}));
      await open(page,`/posts/${slug}/`,width,theme);
      const scope=`${mode}@${width}/${theme}`;
      const capture=async state=>{
        const result=await check(page,scope+'/'+state);
        const file=await screenshot(page,'[data-lab]',`lab-${slugName(slug)}-${width}-${theme}-${state}`);
        report.states.push({slug,mode,width,theme,state,file,...result});
      };
      await capture('initial');
      if(mode==='recovery'){
        await page.locator('[data-control=absent]').check();
        await page.locator('[data-action=reconcile]').click();
        if(!await page.locator('[data-result]').textContent().then(t=>t.includes('DB 7개')))fail(scope,'recovery action did not run');
        await capture('reconciled');
      }else if(mode==='authorization'){
        for(const value of ['mismatch','missing','duplicate','encoded','normalized']){
          await page.locator('[data-control=request]').selectOption(value);
          await capture(value);
        }
        await page.locator('[data-control=access]').uncheck();
        await capture('denied');
      }else{
        for(const input of await page.locator('input[type=range]').all()){
          await input.focus();await page.keyboard.press('End');
        }
        await capture('maximum');
      }
      await page.locator('[data-action=reset]').focus();await page.keyboard.press('Enter');
      await capture('reset');
      if(mode==='authorization'&&!await page.locator('[data-stage=upstream]').textContent().then(t=>t==='1회'))fail(scope,'keyboard reset failed');
      if(mode==='latency'&&!await page.locator('[data-result]').textContent().then(t=>t.includes('5.50초')))fail(scope,'keyboard reset failed');
      if(mode==='recovery'&&!await page.locator('[data-result]').textContent().then(t=>t.includes('DB 4개 / 디스크 8개')))fail(scope,'keyboard reset failed');
      await page.close();
    }
  }
  if(!['pages','visuals'].includes(process.env.LAYOUT_PHASE))for(const [slug,mode] of Object.entries(labForSlug)){
    if(!selected.includes(`/posts/${slug}/`))continue;
    const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:320,height:1000}});
    await page.goto(base+`/posts/${slug}/`);
    await page.evaluate(()=>document.fonts.ready);
    if(await page.locator('[data-lab] input:enabled,[data-lab] select:enabled,[data-lab] button:enabled').count())fail(mode+'/no-js','inert controls appear enabled');
    if(!await page.locator('[data-lab] noscript').isVisible())fail(mode+'/no-js','static fallback missing');
    await screenshot(page,'[data-lab]',`lab-${slugName(slug)}-no-js`);
    await page.close();
    const zoom=await browser.newPage({viewport:{width:1440,height:1000}});
    await open(zoom,`/posts/${slug}/`,1440);
    await zoom.evaluate(()=>document.documentElement.style.zoom='2');
    await check(zoom,mode+'/css-zoom-200');
    await screenshot(zoom,'[data-lab]',`lab-${slugName(slug)}-zoom-200`);
    await zoom.close();
  }
} finally {
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
  if(server) await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify({routes:selected.length,pageChecks:report.pages.length,visuals:report.visuals.length,states:report.states.length,failures:report.failures.length,report:path.join(out,'report.json')}));
if(report.failures.length){console.error(JSON.stringify(report.failures.slice(0,30),null,2));process.exitCode=1;}
