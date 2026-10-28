import fs from 'node:fs';import path from 'node:path';import {posts,site,escape} from '../src/lib/posts.mjs';
const output=process.argv[2]||'.legacy-site';
fs.mkdirSync(output,{recursive:true});
// Keep old image and PDF URLs working too; HTML paths transfer to the new site.
fs.cpSync('static',output,{recursive:true});
for(const name of ['index.xml','sitemap.xml']) if(fs.existsSync('dist/'+name)) fs.copyFileSync('dist/'+name,path.join(output,name));
const paths=new Set([...JSON.parse(fs.readFileSync('data/legacy-paths.json')),...posts.map(p=>p.url),'/']);
function html(url){const target=site+url;return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>taeyun.blog로 이동합니다</title><link rel="canonical" href="${escape(target)}"><meta http-equiv="refresh" content="0;url=${escape(target)}"><script>location.replace('https://taeyun.blog'+location.pathname+location.search+location.hash)</script></head><body><p>블로그가 이전되었습니다. <a href="${escape(target)}">같은 글을 taeyun.blog에서 읽기</a></p></body></html>`}
for(const url of paths){const file=path.join(output,decodeURI(url),'index.html');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html(url))}
fs.writeFileSync(path.join(output,'404.html'),html('/'));
fs.writeFileSync(path.join(output,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://taeyun.blog/sitemap.xml\n');
console.log(`Generated ${paths.size} legacy redirects; queries and fragments preserved in browsers.`);
