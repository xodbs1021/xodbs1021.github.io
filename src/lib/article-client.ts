import 'highlight.js/styles/github-dark.css';
if(matchMedia('(max-width: 800px)').matches)document.querySelector('.toc details')?.removeAttribute('open');
await document.fonts.ready;
const fontFamily=getComputedStyle(document.body).fontFamily;
// Charts and diagrams are static SVG from the build. Only interactive="true" charts load ECharts.
// Observe the figure: the live container stays hidden (no box) until ECharts mounts.
const liveCharts=[...document.querySelectorAll<HTMLElement>('.chart-figure.is-interactive')];
if(liveCharts.length){
  const observer=new IntersectionObserver(async entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      observer.unobserve(entry.target);
      const figure=entry.target as HTMLElement,el=figure.querySelector<HTMLElement>('[data-chart]')!;
      try{
        const [{mountChart},{default:source}]=await Promise.all([import('./chart-live'),import(/* @vite-ignore */ `/charts/${el.dataset.chart}.js`)]);
        el.style.height=`${Number(el.dataset.height)||360}px`;
        el.hidden=false;figure.classList.add('is-live');
        mountChart(el,source,fontFamily);
      }catch{el.hidden=true;figure.classList.remove('is-live')} // the static SVG stays in place
    }
  },{rootMargin:'300px'});
  liveCharts.forEach(figure=>observer.observe(figure));
}
document.querySelectorAll('pre').forEach(pre=>{const button=document.createElement('button');button.className='copy-code';button.textContent='복사';button.setAttribute('aria-label','코드 복사');button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(pre.querySelector('code')?.textContent||'');button.textContent='복사됨';setTimeout(()=>button.textContent='복사',1800)}catch{button.textContent='복사 실패'}});pre.append(button)});
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

// Diagrams that still overflow (earlier, wide drawings) say so under the caption.
for(const viewport of document.querySelectorAll<HTMLElement>('.diagram-viewport')){
  const figure=viewport.closest<HTMLElement>('figure');
  const update=()=>{if(figure)figure.dataset.wide=String(viewport.scrollWidth>viewport.clientWidth+1)};
  update();new ResizeObserver(update).observe(viewport);
}
// Screenshot/interaction readiness includes asynchronous diagram layout.
// archify diagrams: live only on wide screens (the canvas is ~1560px wide); never fetched on mobile.
const diagramFrames=[...document.querySelectorAll<HTMLIFrameElement>('iframe[data-diagram-src]')];
if(diagramFrames.length){
  const wide=matchMedia('(min-width: 900px)');
  const syncDiagrams=()=>{
    const theme=document.documentElement.dataset.theme==='dark'?'dark':'light';
    for(const frame of diagramFrames){
      const figure=frame.closest<HTMLElement>('.diagram-embed');
      if(!wide.matches){figure?.classList.remove('is-live');continue;}
      const src=`${frame.dataset.diagramSrc}?embed=1&theme=${theme}`;
      if(frame.getAttribute('src')!==src)frame.src=src;
      figure?.classList.add('is-live');
    }
  };
  syncDiagrams();
  wide.addEventListener('change',syncDiagrams);
  window.addEventListener('themechange',syncDiagrams);
}
document.documentElement.dataset.articleReady='true';
