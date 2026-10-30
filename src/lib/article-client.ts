import 'highlight.js/styles/github-dark.css';
import {readableChartOption} from './chart-layout.mjs';
if(matchMedia('(max-width: 800px)').matches)document.querySelector('.toc details')?.removeAttribute('open');
await document.fonts.ready;
const fontFamily=getComputedStyle(document.body).fontFamily;
function updateOverflow(el:HTMLElement){
  const frame=el.closest<HTMLElement>('figure');
  if(frame)frame.dataset.wide=String(el.scrollWidth>el.clientWidth+1);
}
const chartElements=[...document.querySelectorAll<HTMLElement>('[data-chart]')];
if(chartElements.length){
  const observer=new IntersectionObserver(async entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      observer.unobserve(entry.target);
      const el=entry.target as HTMLElement;
      try{
        const echarts=await import('echarts');
        const {default:source}=await import(/* @vite-ignore */ `/charts/${el.dataset.chart}.js`);
        const option=readableChartOption(source,fontFamily);
        const create=()=>{
          const chart=echarts.init(el,document.documentElement.dataset.theme==='dark'?'dark':undefined,{renderer:'svg'});
          chart.setOption(option);
          return chart;
        };
        let chart=create();
        const viewport=el.parentElement!;
        new ResizeObserver(()=>{chart.resize();updateOverflow(viewport)}).observe(viewport);
        updateOverflow(viewport);
        window.addEventListener('themechange',()=>{chart.dispose();chart=create()});
      }catch{el.textContent='차트를 불러오지 못했습니다. 새로고침해 주세요.'}
    }
  },{rootMargin:'300px'});
  chartElements.forEach(el=>observer.observe(el));
}
const diagrams=[...document.querySelectorAll<HTMLElement>('.mermaid')];
if(diagrams.length){
  try{
    const {default:mermaid}=await import('mermaid');
    const sources=diagrams.map(d=>d.textContent||'');
    const render=async()=>{
      mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:document.documentElement.dataset.theme==='dark'?'dark':'neutral',fontFamily});
      diagrams.forEach((d,i)=>{d.removeAttribute('data-processed');d.textContent=sources[i]});
      await mermaid.run({nodes:diagrams,suppressErrors:true});
      for(const d of diagrams){
        const svg=d.querySelector('svg');
        if(svg?.viewBox.baseVal.width){
          svg.style.width=`${svg.viewBox.baseVal.width}px`;
          svg.style.maxWidth='none';
          svg.style.height='auto';
        }
        updateOverflow(d);
      }
    };
    await render();
    diagrams.forEach(d=>new ResizeObserver(()=>updateOverflow(d)).observe(d));
    window.addEventListener('themechange',render);
  }catch{}
}
document.querySelectorAll('pre:not(.mermaid)').forEach(pre=>{const button=document.createElement('button');button.className='copy-code';button.textContent='복사';button.setAttribute('aria-label','코드 복사');button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(pre.querySelector('code')?.textContent||'');button.textContent='복사됨';setTimeout(()=>button.textContent='복사',1800)}catch{button.textContent='복사 실패'}});pre.append(button)});
document.querySelector('.copy-url')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(location.href);(e.target as HTMLElement).textContent='주소를 복사했어요'}catch{(e.target as HTMLElement).textContent='주소창에서 주소를 복사해 주세요'}});
const dialog=document.querySelector<HTMLDialogElement>('#image-dialog');
document.querySelectorAll<HTMLImageElement>('.prose img').forEach(img=>{img.loading='lazy';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label',`${img.alt||'이미지'} 확대`);const show=()=>{const large=dialog!.querySelector('img')!;large.src=img.dataset.original||img.src;large.alt=img.alt;dialog!.showModal()};img.addEventListener('click',show);img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show()}})});
dialog?.addEventListener('click',e=>{if(e.target===dialog||(e.target as HTMLElement).tagName==='BUTTON')dialog.close()});
const slug=document.querySelector<HTMLElement>('[data-slug]')?.dataset.slug;
if(slug && location.hostname==='taeyun.blog'){
 const key=`view:${slug}:${new Date().toISOString().slice(0,10)}`;
 let seen=false;try{seen=!!localStorage.getItem(key)}catch{}
 try{const response=await fetch(`/api/views/?slug=${encodeURIComponent(slug)}`,{method:seen?'GET':'POST',headers:seen?{}:{'Content-Type':'application/json'}});if(response.ok){const data=await response.json();document.querySelector('#views')!.textContent=Number(data.views).toLocaleString('ko-KR');if(!seen)try{localStorage.setItem(key,'1')}catch{}}}catch{}
}
const sectionObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('.toc a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${entry.target.id}`))}},{rootMargin:'-10% 0px -65% 0px'});document.querySelectorAll('.prose h2[id]').forEach(h=>sectionObserver.observe(h));

for(const el of document.querySelectorAll<HTMLElement>('.diagram-viewport')){
  updateOverflow(el);
  new ResizeObserver(()=>updateOverflow(el)).observe(el);
}
// Screenshot/interaction readiness includes asynchronous diagram layout.
document.documentElement.dataset.articleReady='true';
