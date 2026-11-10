import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
import {load} from 'cheerio';
import {posts,renderBody} from '../src/lib/posts.mjs';
import {loadVideoManifest,videoMode} from '../src/lib/videos.mjs';
import {labForSlug,labsForSlug,cutoverStages} from '../src/lib/explanation-models.mjs';

// Inspect the built site, including its actual cascade and client-side renderers.
// LAYOUT_URL is also used after deployment; never increment public view counters.
const out = path.resolve(process.env.LAYOUT_REPORT || 'test-results/layout');
await fs.mkdir(out, {recursive: true});
const types = {'.mp4':'video/mp4','.jpg':'image/jpeg','.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2'};
// Video figures ({{< motion >}}) are also checked on a fixture page made from a real article
// template, so the shipped script and stylesheet are exercised before any post uses the shortcode.
const FIXTURE = '/__fixtures/motion/';
async function motionFixture(){
  const videos=loadVideoManifest(),names=Object.keys(videos);
  const loop=names.find(n=>videos[n].mobile&&videos[n].scene)||names.find(n=>videos[n].scene&&videoMode(videos[n].duration)==='loop');
  const explain=names.find(n=>videoMode(videos[n].duration)==='explain');
  if(!loop||!explain)return null;
  const filler=Array.from({length:6},()=>'반복 영상은 화면에 절반 이상 들어왔을 때만 재생하고, 벗어나면 멈춥니다. 이 문단은 영상이 첫 화면 아래에서 시작하도록 둔 채움 문장입니다.').join('\n\n');
  const markdown=[filler,'',`{{< motion scene="${videos[loop].scene}" id="fig-loop" kind="개념도" caption="반복 영상 시험" >}}`,'',filler,'',`{{< motion name="${explain}" id="fig-explain" alt="설명 영상 시험" kind="개념도" caption="설명 영상 시험" >}}`,'',filler].join('\n');
  const template=posts.find(p=>!labForSlug[p.slug]);
  const $=load(await fs.readFile(path.join('dist',template.url,'index.html'),'utf8'));
  $('.article-content').html(renderBody(markdown,'fixture/motion').html);
  return $.html();
}
let server;
if (!process.env.LAYOUT_URL) {
  const fixture = await motionFixture();
  server = http.createServer(async (req,res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (name === FIXTURE && fixture) { res.writeHead(200, {'Content-Type':'text/html'}).end(fixture); return; }
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
const report = {base, date:new Date().toISOString(), pages:[], visuals:[], states:[], failures:[], warnings:[]};
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
    if(!visible(el)) continue;
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
  let gap;
  for(const lab of document.querySelectorAll('[data-lab]')){
    const actions=lab.querySelector('.lab-actions'),result=lab.querySelector('.lab-result');
    const labGap=rect(result).top-rect(actions).bottom;
    gap??=labGap;
    if(labGap<11.5) issues.push(`${lab.dataset.lab}: actions/result gap ${labGap}px (minimum 12px)`);
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
  const queue=(['visuals','labs','videos'].includes(process.env.LAYOUT_PHASE)?[]:selected).flatMap(url=>widths.map(width=>({url,width})));
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
  // Every chart/diagram is checked as readers see it: the variant actually shown at this width,
  // its real rendered text size, how much of it fits before scrolling, contrast and accessible names.
  const visualPosts=posts.filter(p=>selected.includes(p.url)&&/class="(chart-figure|diagram)[ "]/.test(p.html));
  for(const {width,theme} of (['pages','labs','videos'].includes(process.env.LAYOUT_PHASE)?[]:[{width:390,theme:'light'},{width:1440,theme:'light'},{width:390,theme:'dark'}])){
    const page=await browser.newPage();
    await page.route('**/api/views/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"views":0}'}));
    // Layout shifts are recorded from the first paint; a shift whose source sits in a figure fails.
    await page.addInitScript(()=>{window.__shifts=[];new PerformanceObserver(list=>{for(const entry of list.getEntries())for(const source of entry.sources||[]){const n=source.node,r=x=>[x.x,x.y,x.width,x.height].map(Math.round).join(',');window.__shifts.push({value:entry.value,at:Math.round(entry.startTime),figure:!!n?.closest?.('figure'),node:n?`${n.nodeName.toLowerCase()}${n.id?'#'+n.id:''}${typeof n.className==='string'&&n.className?'.'+n.className.split(' ')[0]:''} in ${n.closest?.('figure')?.id||'-'}`:'?',from:r(source.previousRect),to:r(source.currentRect)})}}).observe({type:'layout-shift',buffered:true})});
    // Optional: reproduce slower CI runners locally (LAYOUT_CPU_THROTTLE=4). Thresholds are unchanged.
    if(process.env.LAYOUT_CPU_THROTTLE)await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.LAYOUT_CPU_THROTTLE)});
    const requests=[];
    page.on('request',request=>requests.push(request.url()));
    for(const post of visualPosts){
      requests.length=0;
      await open(page,post.url,width,theme);
      const figures=page.locator('.chart-figure,.diagram');
      // Layout shifts are judged on a reader's pass (load, then scroll past every figure) before any
      // capture: element screenshots of figures taller than the viewport briefly resize it, which
      // Chromium records as shifts that no visitor ever sees (CI run 42692708559).
      // Dwell at each figure like a reader, so late size changes happen while it is on screen.
      for(let i=0;i<await figures.count();i++){await figures.nth(i).scrollIntoViewIfNeeded();await page.waitForTimeout(200);}
      const shifts=await page.evaluate(()=>window.__shifts.filter(s=>s.figure));
      if(shifts.length)fail(`${post.url}@${width}/${theme}`,`layout shift from figures: ${shifts.map(s=>`${s.value.toFixed(4)} @${s.at}ms ${s.node} [${s.from}]→[${s.to}]`).join('; ')}`);
      for(let i=0;i<await figures.count();i++){
        const figure=figures.nth(i),scope=`${post.url}@${width}/${theme} figure ${i}`;
        try{
          await figure.scrollIntoViewIfNeeded();
          await figure.locator('svg:visible').first().waitFor({timeout:15000});
          const file=`visual-${slugName(post.slug)}-${width}-${theme}-${i}.png`;
          await figure.screenshot({path:path.join(out,file),animations:'disabled'});
          const sizes=await figure.evaluate((el,theme)=>{
            const svg=[...el.querySelectorAll('svg')].find(s=>s.getClientRects().length);
            const parse=color=>{
              if(!color||color==='none'||color==='transparent')return null;
              let v=color.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
              if(v)return {rgb:[v[1],v[2],v[3]].map(Number),alpha:v[4]===undefined?1:Number(v[4])};
              v=color.match(/[\d.]+/g)?.map(Number);
              if(!v||v.length<3)return null;
              return {rgb:v.slice(0,3).map(x=>x/255),alpha:v[3]??1};
            };
            const lum=({rgb})=>rgb.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0);
            const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
            const bg=parse(getComputedStyle(el).backgroundColor);
            if(!svg)return {error:true};
            const box=svg.getBoundingClientRect(),view=svg.viewBox.baseVal;
            const scale=view?.width?box.width/view.width:1;
            const viewport=svg.closest('.diagram-viewport')||el;
            const visibleRatio=Math.min(1,viewport.getBoundingClientRect().width/box.width);
            const texts=[...svg.querySelectorAll('text')].filter(t=>t.getClientRects().length&&t.textContent.trim());
            const textSizes=texts.map(t=>({text:t.textContent.trim().slice(0,30),px:parseFloat(getComputedStyle(t).fontSize)*scale}));
            const small=textSizes.filter(t=>t.px<11.5).map(t=>`${t.text} (${t.px.toFixed(1)}px)`);
            // Text sits either on a node shape (diagrams) or on the figure surface.
            const lowText=[],lowMarks=[],hardSurfaces=[];
            for(const t of texts){
              // Mermaid paints actor text on its <tspan>; the <text> element itself carries the box fill.
              const fill=parse(getComputedStyle(t.querySelector('tspan')||t).fill);if(!fill||fill.alpha<.9)continue;
              // Sequence step numbers sit on the badge circle of their marker, not on the figure.
              const node=t.classList.contains('sequenceNumber')?svg.querySelector('[id$="-sequencenumber"] circle'):t.closest('.node,.actor,g.label')?.parentElement?.querySelector?.(':scope > rect,:scope > polygon,:scope > path,:scope > circle');
              const under=node&&parse(getComputedStyle(node).fill)?.alpha>=.9?parse(getComputedStyle(node).fill):bg;
              if(under&&ratio(fill,under)<4.5)lowText.push(`${t.textContent.trim().slice(0,30)} (${ratio(fill,under).toFixed(2)}:1)`);
            }
            if(el.classList.contains('chart-figure'))for(const shape of svg.querySelectorAll('path,rect,circle')){
              const r=shape.getBoundingClientRect(),s=getComputedStyle(shape);
              const fill=parse(s.fill),stroke=parse(s.stroke),strokeWidth=parseFloat(s.strokeWidth)*scale;
              const mark=fill&&fill.alpha*parseFloat(s.fillOpacity||'1')>=.9&&r.width*r.height>=16?fill:stroke&&strokeWidth>=1.5&&stroke.alpha>=.9?stroke:null;
              if(mark&&bg&&ratio(mark,bg)<3&&ratio(mark,bg)>1.01)lowMarks.push(`${shape.tagName} ${ratio(mark,bg).toFixed(2)}:1`);
            }
            if(theme==='dark')for(const shape of svg.querySelectorAll('path,rect,polygon,circle')){
              const fill=parse(getComputedStyle(shape).fill),r=shape.getBoundingClientRect();
              if(fill&&fill.alpha>=.9&&r.width*r.height>100&&(fill.rgb.every(c=>c>.98)||fill.rgb.every(c=>c<.02)))hardSurfaces.push(shape.tagName);
            }
            const caption=el.querySelector('figcaption');
            const captionContrast=caption&&bg?ratio(parse(getComputedStyle(caption).color),bg):null;
            const title=svg.querySelector('title')?.textContent.trim();
            const authoredLegacy=el.dataset.authored==='legacy';
            return {authoredLegacy,variant:svg.closest('[class*="-variant"]')?.className||'svg',scale,visibleRatio,scrollAllowed:el.dataset.scroll==='allowed',minText:Math.min(...textSizes.map(t=>t.px)),small,lowText:[...new Set(lowText)].slice(0,8),lowMarks:[...new Set(lowMarks)].slice(0,8),hardSurfaces:hardSurfaces.length,captionContrast,title:!!title,desc:!!svg.querySelector('desc'),chart:el.classList.contains('chart-figure'),emptyStatic:el.classList.contains('static-diagram')&&!svg.querySelector('text'),error:!!el.querySelector('.diagram-missing')||el.classList.contains('diagram-missing')};
          },theme);
          if(sizes.error) fail(scope,'figure has no rendered SVG (missing pre-render?)');
          if(sizes.emptyStatic)fail(scope,'static SVG has no SVG text (HTML parser breakout)');
          // Earlier hand-drawn SVG (fixed sizes/colors in the post) is reported, not failed; PR 3 rewrites it.
          const authored=(message)=>sizes.authoredLegacy?report.warnings.push({scope,message:`earlier hand-drawn SVG: ${message}`}):fail(scope,message);
          if(sizes.small?.length)authored('figure text renders below 12px: '+sizes.small.slice(0,6).join(', '));
          if(sizes.lowText?.length)authored('figure text contrast below 4.5:1: '+sizes.lowText.join(', '));
          if(sizes.lowMarks?.length)fail(scope,'data marks below 3:1 against the figure: '+sizes.lowMarks.join(', '));
          if(sizes.hardSurfaces)fail(scope,`${sizes.hardSurfaces} hard-coded white/black surfaces in dark mode`);
          if(sizes.captionContrast!==null&&sizes.captionContrast<4.5)fail(scope,`caption contrast ${sizes.captionContrast.toFixed(2)}:1`);
          if(!sizes.title)fail(scope,'SVG has no <title>');
          if(sizes.chart&&!sizes.desc)fail(scope,'chart SVG has no <desc>');
          // At first view at least 80% of the drawing is visible; only earlier, undescribed figures may scroll.
          if(width<=390&&sizes.visibleRatio<.8){
            if(sizes.scrollAllowed)report.warnings.push({scope,message:`scrolls: ${(sizes.visibleRatio*100).toFixed(0)}% visible (earlier post, allowed)`});
            else fail(scope,`only ${(sizes.visibleRatio*100).toFixed(0)}% of the figure is visible before scrolling`);
          }
          if(sizes.visibleRatio<1){
            // Supplemental capture of the scrolled end; the real viewport capture above stays unchanged.
            const scrollFrame=figure.locator('.diagram-viewport').first();
            await scrollFrame.evaluate(el=>el.scrollLeft=el.scrollWidth);
            await figure.screenshot({path:path.join(out,file.replace('.png','-end.png')),animations:'disabled'});
            await scrollFrame.evaluate(el=>el.scrollLeft=0);
          }
          report.visuals.push({url:post.url,width,theme,index:i,file,...sizes});
          if(report.visuals.length%50===0)console.log(`Captured ${report.visuals.length} figures`);
        }catch(error){fail(scope,String(error));}
      }
      // Static figures need no chart or diagram runtime: report regressions in what the page downloads.
      if(!post.html.includes('is-interactive')){
        const heavy=requests.filter(u=>/\/_astro\/[^/]*(elk|echarts|mermaid|chart-live|flowDiagram|sequenceDiagram)[^/]*\.js/i.test(u));
        if(heavy.length)report.warnings.push({scope:`${post.url}@${width}/${theme}`,message:`static figures but loaded ${heavy.map(u=>u.split('/').pop()).join(', ')}`});
      }
    }
    await page.close();
  }
  // Videos: loops wait for the reader under reduced motion, play only on screen otherwise, pause from
  // the keyboard, pick the 4:5 copy on phones, never shift layout, and keep a caption with a kind.
  const videoPages=['pages','labs','visuals'].includes(process.env.LAYOUT_PHASE)?[]:[
    ...(server&&!process.env.LAYOUT_PATH?[FIXTURE]:[]),
    ...posts.filter(p=>selected.includes(p.url)&&p.html.includes('class="motion-figure"')).map(p=>p.url),
  ];
  for(const url of videoPages)for(const {width,theme,motion} of [{width:390,theme:'light',motion:'reduce'},{width:390,theme:'dark',motion:'no-preference'},{width:1440,theme:'light',motion:'no-preference'},{width:1440,theme:'dark',motion:'reduce'}]){
    const page=await browser.newPage();
    await page.route('**/api/views/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"views":0}'}));
    await page.addInitScript(()=>{window.__shifts=[];new PerformanceObserver(list=>{for(const entry of list.getEntries())for(const source of entry.sources||[])if(source.node?.closest?.('figure'))window.__shifts.push(entry.value)}).observe({type:'layout-shift',buffered:true})});
    await open(page,url,width,theme);
    await page.emulateMedia({colorScheme:theme,reducedMotion:motion});
    // The client reads the preference at load; reload so it starts under this setting.
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.documentElement.dataset.articleReady==='true');
    const figures=page.locator('.motion-figure');
    for(let i=0;i<await figures.count();i++){
      const figure=figures.nth(i),video=figure.locator('video'),scope=`${url}@${width}/${theme}/${motion} video ${i}`;
      try{
        const info=await figure.evaluate(el=>({play:el.dataset.play,mobile:el.hasAttribute('data-mobile'),label:el.querySelector('figcaption .fig-label')?.textContent,kind:!!el.querySelector('figcaption .fig-kind'),name:el.querySelector('video').getAttribute('aria-label')}));
        if(!info.label?.startsWith('그림 '))fail(scope,'caption has no "그림 N." label');
        if(!info.kind)report.warnings.push({scope,message:'caption has no kind'});
        if(!info.name)fail(scope,'video has no accessible name');
        const isPlaying=()=>video.evaluate(v=>!v.paused&&v.currentTime>0);
        if(info.play==='loop'){
          if(await video.evaluate(v=>v.controls))fail(scope,'loop clip still shows native controls with JavaScript on');
          const button=figure.locator('.motion-toggle');
          if(!await button.isVisible())fail(scope,'pause/play button hidden');
          else if((await button.boundingBox()).height<44)fail(scope,'pause/play button below 44px');
          await figure.scrollIntoViewIfNeeded();
          if(motion==='reduce'){
            await page.waitForTimeout(800);
            if(!await video.evaluate(v=>v.paused))fail(scope,'autoplays under prefers-reduced-motion');
            // What these readers see first: the poster and the play button.
            await figure.screenshot({path:path.join(out,`video-${slugName(url)}-${width}-${theme}-reduce-${i}-poster.png`),animations:'disabled'});
            await button.focus();await page.keyboard.press('Enter');
            if(!await page.waitForFunction(el=>!el.paused&&el.currentTime>0,await video.elementHandle(),{timeout:8000}).then(()=>true,()=>false))fail(scope,'Enter on the button did not start playback');
          }else if(!await page.waitForFunction(el=>!el.paused&&el.currentTime>0,await video.elementHandle(),{timeout:8000}).then(()=>true,()=>false))fail(scope,'loop did not start on screen');
          if(await isPlaying()){
            if(await button.textContent()!=='일시정지')fail(scope,'button does not offer pause while playing');
            await button.focus();await page.keyboard.press('Space');
            if(!await video.evaluate(v=>v.paused))fail(scope,'Space on the button did not pause');
            if(motion==='no-preference'){
              // A pause by the reader holds even when the clip scrolls away and back.
              await page.evaluate(()=>scrollTo(0,0));await figure.scrollIntoViewIfNeeded();await page.waitForTimeout(600);
              if(await isPlaying())fail(scope,'resumed after the reader paused it');
              await button.click();
              await page.waitForFunction(el=>!el.paused,await video.elementHandle(),{timeout:8000}).catch(()=>{});
              await page.evaluate(()=>scrollTo(0,0));
              if(!await page.waitForFunction(el=>el.paused,await video.elementHandle(),{timeout:4000}).then(()=>true,()=>false))fail(scope,'kept playing off screen');
              await figure.scrollIntoViewIfNeeded();
            }
          }
          const src=await video.evaluate(v=>v.currentSrc);
          if(info.mobile&&width<=600&&!src.includes('-mobile.mp4'))fail(scope,`phone did not pick the 4:5 copy (${src})`);
          if(width>600&&src.includes('-mobile.mp4'))fail(scope,'desktop picked the phone copy');
        }else{
          if(!await video.evaluate(v=>v.controls))fail(scope,'explainer has no controls');
          if(await figure.locator('.motion-toggle').count())fail(scope,'explainer has a loop button');
          await figure.scrollIntoViewIfNeeded();await page.waitForTimeout(400);
          if(await isPlaying())fail(scope,'explainer autoplayed');
        }
        // The poster or the playing frame fills a fixed-ratio frame.
        const box=await figure.locator('.motion-frame').evaluate(async el=>{
          const r=el.getBoundingClientRect(),img=el.querySelector('.motion-poster img'),video=el.querySelector('video');
          // Loops show a <picture> under the video; explainers use the poster attribute.
          const poster=img?img.complete&&img.naturalWidth>0:await new Promise(done=>{const probe=new Image();probe.onload=()=>done(probe.naturalWidth>0);probe.onerror=()=>done(false);probe.src=video.poster});
          return {w:r.width,h:r.height,poster};
        });
        if(!box.poster)fail(scope,'poster image did not load');
        const ratio=box.w/box.h,expected=info.mobile&&width<=600?1080/1350:16/9;
        if(Math.abs(ratio-expected)>.02)fail(scope,`frame ratio ${ratio.toFixed(3)} (expected ${expected.toFixed(3)})`);
        const file=`video-${slugName(url)}-${width}-${theme}-${motion}-${i}.png`;
        await figure.screenshot({path:path.join(out,file),animations:'disabled'});
        report.states.push({slug:url,mode:'video',width,theme,state:`${motion}-${i}`,file});
      }catch(error){fail(scope,String(error));}
    }
    const shifts=await page.evaluate(()=>window.__shifts);
    if(shifts.length)fail(`${url}@${width}/${theme}/${motion}`,`layout shift from video figures: ${shifts.map(v=>v.toFixed(4)).join(', ')}`);
    await page.close();
  }
  if(videoPages.length){
    // Without JavaScript a loop keeps native controls so readers can still play it.
    const noJs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:1000}});
    await noJs.goto(base+videoPages[0]);
    const first=noJs.locator('.motion-figure[data-play=loop] video').first();
    if(await first.count()&&!await first.evaluate(v=>v.controls))fail('video/no-js','loop clip has no controls without JavaScript');
    if(await noJs.locator('.motion-figure .motion-poster img').first().count()&&!await noJs.locator('.motion-figure .motion-poster img').first().isVisible())fail('video/no-js','poster hidden without JavaScript');
    await noJs.close();
  }
  // Mutate actual inputs, not the result text. Inspect long states as well as defaults.
  const labRuns=Object.keys(['pages','visuals','videos'].includes(process.env.LAYOUT_PHASE)?{}:labForSlug).flatMap(slug=>labsForSlug(slug).map(mode=>({slug,mode,multi:labsForSlug(slug).length>1})));
  for(const {slug,mode,multi} of labRuns){
    if(!selected.includes(`/posts/${slug}/`))continue;
    const labSelector=`[data-lab="${mode}"]`,labName=`lab-${slugName(slug)}${multi?'-'+mode:''}`;
    for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
      const page=await browser.newPage();
      await page.route('**/api/views/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"views":0}'}));
      await open(page,`/posts/${slug}/`,width,theme);
      const scope=`${mode}@${width}/${theme}`;
      const lab=page.locator(labSelector);
      const capture=async state=>{
        const result=await check(page,scope+'/'+state);
        const file=await screenshot(page,labSelector,`${labName}-${width}-${theme}-${state}`);
        report.states.push({slug,mode,width,theme,state,file,...result});
      };
      await capture('initial');
      if(mode==='recovery'){
        await lab.locator('[data-control=absent]').check();
        await lab.locator('[data-action=reconcile]').click();
        if(!await lab.locator('[data-result]').textContent().then(t=>t.includes('DB 7개')))fail(scope,'recovery action did not run');
        await capture('reconciled');
      }else if(mode==='authorization'){
        for(const value of ['mismatch','missing','duplicate','encoded','normalized']){
          await lab.locator('[data-control=request]').selectOption(value);
          await capture(value);
        }
        await lab.locator('[data-control=access]').uncheck();
        await capture('denied');
      }else if(mode==='compatibility'){
        for(const index of [1,2,3]){
          await lab.locator(`[data-choice="${index}"]`).click();
          if(await lab.getAttribute('data-selected')!==String(index))fail(scope,`category ${index} not selected`);
          await capture('category-'+index);
        }
        await lab.locator('[data-choice="3"]').focus();await page.keyboard.press('ArrowRight');
        if(await lab.locator('[data-choice="0"]').getAttribute('aria-pressed')!=='true')fail(scope,'arrow key did not wrap to the first category');
      }else if(mode==='cutover'){
        const fenced=cutoverStages.findIndex(stage=>stage.writer===null);
        await lab.locator(`[data-choice="${fenced}"]`).click();
        if(!await lab.locator('[data-result]').textContent().then(t=>t.includes('없음')))fail(scope,'switch stage still reports a writer');
        await capture('switch');
        await lab.locator('[data-action=reset]').click();
        for(let i=0;i<cutoverStages.length-1;i++){await lab.locator('[data-action=next]').focus();await page.keyboard.press('Enter');}
        if(!await lab.locator('[data-result]').textContent().then(t=>t.includes('대상 DB 하나')))fail(scope,'next button did not reach the final stage');
        if(!await lab.locator('[data-action=next]').isDisabled())fail(scope,'next stays enabled on the final stage');
        await capture('done');
      }else{
        for(const input of await lab.locator('input[type=range]').all()){
          await input.focus();await page.keyboard.press('End');
        }
        await capture('maximum');
      }
      await lab.locator('[data-action=reset]').focus();await page.keyboard.press('Enter');
      await capture('reset');
      if(mode==='authorization'&&!await lab.locator('[data-stage=upstream]').textContent().then(t=>t==='1회'))fail(scope,'keyboard reset failed');
      if(mode==='latency'&&!await lab.locator('[data-result]').textContent().then(t=>t.includes('5.50초')))fail(scope,'keyboard reset failed');
      if(mode==='recovery'&&!await lab.locator('[data-result]').textContent().then(t=>t.includes('DB 4개 / 디스크 8개')))fail(scope,'keyboard reset failed');
      if(mode==='compatibility'&&await lab.getAttribute('data-selected')!=='0')fail(scope,'keyboard reset failed');
      if(mode==='cutover'&&!await lab.locator('[data-result]').textContent().then(t=>t.includes('원본 DB 하나')))fail(scope,'keyboard reset failed');
      await page.close();
    }
  }
  if(!['pages','visuals','videos'].includes(process.env.LAYOUT_PHASE))for(const {slug,mode,multi} of labRuns){
    if(!selected.includes(`/posts/${slug}/`))continue;
    const labSelector=`[data-lab="${mode}"]`,labName=`lab-${slugName(slug)}${multi?'-'+mode:''}`;
    const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:320,height:1000}});
    await page.goto(base+`/posts/${slug}/`);
    await page.evaluate(()=>document.fonts.ready);
    if(await page.locator(`${labSelector} input:enabled,${labSelector} select:enabled,${labSelector} button:enabled`).count())fail(mode+'/no-js','inert controls appear enabled');
    if(!await page.locator(`${labSelector} noscript`).isVisible())fail(mode+'/no-js','static fallback missing');
    await screenshot(page,labSelector,`${labName}-no-js`);
    await page.close();
    const zoom=await browser.newPage({viewport:{width:1440,height:1000}});
    await open(zoom,`/posts/${slug}/`,1440);
    await zoom.evaluate(()=>document.documentElement.style.zoom='2');
    await check(zoom,mode+'/css-zoom-200');
    await screenshot(zoom,labSelector,`${labName}-zoom-200`);
    await zoom.close();
  }
  // archify embeds: wide screens get the live frame (loaded, themed); narrow screens and no-JS
  // keep the optimized image and an open link, and must never fetch the ~0.9MB frame.
  const embedPosts=['pages','visuals','labs','videos'].includes(process.env.LAYOUT_PHASE)?[]:posts.filter(p=>selected.includes(p.url)&&p.html.includes('data-diagram-src'));
  for(const post of embedPosts){
    for(const {width,theme} of [{width:1440,theme:'light'},{width:1440,theme:'dark'},{width:1024,theme:'light'},{width:390,theme:'light'},{width:390,theme:'dark'}]){
      const page=await browser.newPage();
      await page.route('**/api/views/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"views":0}'}));
      await open(page,post.url,width,theme);
      const figures=page.locator('.diagram-embed');
      for(let i=0;i<await figures.count();i++){
        const figure=figures.nth(i),frame=figure.locator('iframe'),scope=`embed-${i}@${width}/${theme}`;
        await figure.scrollIntoViewIfNeeded();
        if(width>=900){
          if(!await frame.isVisible())fail(scope,'live frame hidden on a wide screen');
          if(!(await frame.getAttribute('src')||'').includes(`theme=${theme}`))fail(scope,'frame theme does not follow the page');
          if(await figure.locator('p img').isVisible())fail(scope,'fallback image still visible beside the live frame');
          const content=await (await frame.elementHandle()).contentFrame();
          await content.waitForLoadState('load');
          // Toolbar icons are SVG too; count rendered diagram nodes instead.
          if(!await content.locator('[data-node-id]').count())fail(scope,'diagram nodes did not render inside the frame');
          if(width===1440&&theme==='light'){
            await content.locator('[data-node-id]').nth(3).click();
            if(!await content.waitForFunction(()=>location.hash.includes('focus='),null,{timeout:5000}).then(()=>true,()=>false))fail(scope,'node click did not focus inside the frame');
          }
        }else{
          if(await frame.isVisible())fail(scope,'live frame shown on a narrow screen');
          if(await frame.getAttribute('src'))fail(scope,'narrow screen fetched the frame');
          if(!await figure.locator('p img').isVisible())fail(scope,'fallback image hidden on a narrow screen');
        }
        const open=figure.locator('.diagram-open');
        if(!await open.isVisible())fail(scope,'open link missing');
        else if((await open.boundingBox()).height<44)fail(scope,'open link target below 44px');
        const file=await screenshot(page,`.diagram-embed >> nth=${i}`,`embed-${slugName(post.slug)}-${i}-${width}-${theme}`);
        report.states.push({slug:post.slug,mode:'embed',width,theme,state:String(i),file});
      }
      if(width===1440&&theme==='light'){
        await page.locator('#theme-toggle').click();
        await page.waitForFunction(()=>[...document.querySelectorAll('iframe[data-diagram-src]')].every(f=>(f.getAttribute('src')||'').includes('theme=dark')));
      }
      await page.close();
    }
    const noJs=await browser.newPage({javaScriptEnabled:false,viewport:{width:1440,height:1000}});
    await noJs.goto(base+post.url);
    for(let i=0;i<await noJs.locator('.diagram-embed').count();i++){
      const figure=noJs.locator('.diagram-embed').nth(i);
      if(await figure.locator('iframe').isVisible())fail(`embed-${i}/no-js`,'frame shown without JavaScript');
      if(!await figure.locator('p img').isVisible())fail(`embed-${i}/no-js`,'fallback image hidden without JavaScript');
    }
    await screenshot(noJs,'.diagram-embed >> nth=0',`embed-${slugName(post.slug)}-no-js`);
    await noJs.close();
  }
} finally {
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
  if(server) await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify({routes:selected.length,pageChecks:report.pages.length,visuals:report.visuals.length,states:report.states.length,failures:report.failures.length,warnings:report.warnings.length,report:path.join(out,'report.json')}));
if(report.failures.length){console.error(JSON.stringify(report.failures.slice(0,30),null,2));process.exitCode=1;}
