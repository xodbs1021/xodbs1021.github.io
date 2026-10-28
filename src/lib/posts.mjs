import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import anchor from 'markdown-it-anchor';
import hljs from 'highlight.js';

const root = process.cwd();
const oldHeadings = JSON.parse(fs.readFileSync(path.join(root, 'data/legacy-heading-ids.json'), 'utf8'));
export const site = 'https://taeyun.blog';
export {categories} from './taxonomy.mjs';
import {classify} from './taxonomy.mjs';
export const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const slugify = s => s.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/\s/g, '-');
const files = dir => fs.readdirSync(dir, { withFileTypes:true }).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : [path.join(dir,e.name)]);
function parse(raw) {
  if (!raw.trimStart().startsWith('{')) return matter(raw);
  let depth=0, quoted=false, escaped=false;
  const offset=raw.indexOf('{');
  for(let i=offset;i<raw.length;i++) {
    const c=raw[i];
    if(quoted) { if(escaped) escaped=false; else if(c==='\\') escaped=true; else if(c==='"') quoted=false; }
    else if(c==='"') quoted=true;
    else if(c==='{') depth++;
    else if(c==='}' && --depth===0) return {data:JSON.parse(raw.slice(offset,i+1)),content:raw.slice(i+1)};
  }
  throw new Error('Invalid JSON frontmatter');
}
const md = new MarkdownIt({html:true, linkify:true, typographer:false, highlight(code, lang) {
  if(lang && hljs.getLanguage(lang)) return hljs.highlight(code,{language:lang,ignoreIllegals:true}).value;
  return escape(code);
}}).disable('strikethrough').use(attrs).use(anchor,{slugify});
const fence = md.renderer.rules.fence;
md.renderer.rules.fence=(tokens,idx,options,env,self)=> {
  if(tokens[idx].info.trim()==='mermaid') return `<figure class="diagram"><pre class="mermaid">${escape(tokens[idx].content)}</pre><figcaption>구조와 흐름</figcaption></figure>`;
  return fence(tokens,idx,options,env,self);
};
export const charts = new Map();
export const posts = files(path.join(root,'content/posts')).filter(p=>p.endsWith('.md')&&!path.basename(p).startsWith('_')).map(file=>{
  const {data,content}=parse(fs.readFileSync(file,'utf8'));
  const slug=path.relative(path.join(root,'content/posts'),file).replace(/\.md$/,'').split(path.sep).join('/');
  const body=content.replaceAll('https://xodbs1021.github.io','https://taeyun.blog')
    .replace(/\{\{<\s*chart\s*([^>]*?)>\}\}([\s\S]*?)\{\{<\s*\/chart\s*>\}\}/g,(_,args,source)=>{
      const id=createHash('sha256').update(source).digest('hex').slice(0,16);
      charts.set(id,source.trim());
      const caption=args.match(/caption="([^"]*)"/)?.[1]||'실험 결과';
      const height=args.match(/height="(\d+)px"/)?.[1]||360;
      return `\n<figure class="chart-figure"><div class="echart" data-chart="${id}" style="height:${Number(height)}px" role="img" aria-label="${escape(caption)}"></div><figcaption>${escape(caption)}</figcaption></figure>\n`;
    }).replace(/\{\{<\s*\/?rawhtml\s*>\}\}/g,'');
  const tokens=md.parse(body,{}), headings=[];
  let headingIndex=0;
  for(let i=0;i<tokens.length;i++) if(tokens[i].type==='heading_open') {
    const id=oldHeadings[slug]?.[headingIndex++]||tokens[i].attrGet('id');
    tokens[i].attrSet('id',id);
    headings.push({depth:Number(tokens[i].tag.slice(1)),id,text:tokens[i+1].children?.filter(t=>t.type==='text'||t.type==='code_inline').map(t=>t.content).join('')||tokens[i+1].content});
  }
  const html=md.renderer.render(tokens,md.options,{});
  const plain=content.replace(/\{\{<[\s\S]*?>\}\}/g,'').replace(/<[^>]*>/g,'').replace(/[#*`\[\]]/g,'').replace(/\s+/g,' ').trim();
  const lead=content.trim().split(/\n\s*\n/)[0].replace(/[#*`]/g,'').replace(/\s+/g,' ').trim();
  return {...data,slug,url:`/posts/${slug}/`,html,headings,raw:content,file:path.relative(root,file),category:classify(slug,data.categories?.[0]||slug.split('/')[0]),tags:data.tags||[],date:new Date(data.date),description:data.description||(lead.length>180?lead.slice(0,177)+'…':lead),minutes:Math.max(1,Math.ceil(plain.length/650))};
}).filter(p=>!p.draft && p.date <= new Date()).sort((a,b)=>b.date-a.date);
export const formatDate = date => new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(date));
export const tags = [...new Set(posts.flatMap(p=>p.tags))];
export const featured = ['0-to-1/portfolio-engineering-notes','open-source-analysis/mediamtx-certloader-no-watcher-shutdown','0-to-1/pokeclip-live-dvr-separation-handoff'].map(slug=>posts.find(p=>p.slug===slug)).filter(Boolean);
