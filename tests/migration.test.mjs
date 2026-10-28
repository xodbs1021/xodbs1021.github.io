import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {load} from 'cheerio';
import {posts,charts} from '../src/lib/posts.mjs';
const legacyPaths=JSON.parse(fs.readFileSync('data/legacy-paths.json'));
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
test('all published articles and old listing routes remain available',()=>{
 const baseline=Object.keys(JSON.parse(fs.readFileSync('data/legacy-heading-ids.json')));
 assert.ok(posts.length>=90);assert.ok(charts.size>=58);
 for(const slug of baseline)assert.ok(posts.some(p=>p.slug===slug),`missing original article: ${slug}`);
 for(const url of legacyPaths)assert.ok(fs.existsSync(`dist${decodeURI(url)}index.html`),url);
 for(const p of posts){const $=load(fs.readFileSync(`dist${p.url}index.html`,'utf8'));assert.equal($('link[rel=canonical]').attr('href'),`https://taeyun.blog${p.url}`);assert.equal($('[data-pagefind-meta=title]').text(),p.title);assert.equal($('.echart').length,(p.raw.match(/\{\{<\s*chart\s/g)||[]).length);assert.ok(!$('.article-content').text().includes('{{<'));}
});
test('every static asset is copied byte-for-byte',()=>{for(const p of files('static'))assert.deepEqual(fs.readFileSync(p),fs.readFileSync(path.join('dist',path.relative('static',p))),p)});
test('internal article links, local images, and explicit fragments resolve',()=>{
 const failures=[];
 for(const post of posts){const $=load(fs.readFileSync(`dist${post.url}index.html`,'utf8'));$('.article-content a[href],.article-content img[src]').each((_,el)=>{const raw=$(el).attr(el.tagName==='img'?'src':'href');if(!raw||raw.startsWith('data:'))return;let u;try{u=new URL(raw,`https://taeyun.blog${post.url}`)}catch{return}if(u.hostname!=='taeyun.blog')return;let file=`dist${decodeURI(u.pathname)}`;if(file.endsWith('/'))file+='index.html';else if(!path.extname(file))file+='/index.html';if(!fs.existsSync(file)){failures.push(`${post.slug}: ${raw}`);return}if(u.hash&&file.endsWith('.html')){const target=load(fs.readFileSync(file,'utf8'));const id=decodeURIComponent(u.hash.slice(1));if(!target('[id]').toArray().some(e=>target(e).attr('id')===id))failures.push(`${post.slug}: missing fragment ${raw}`)}})}
 assert.deepEqual(failures,[]);
});
