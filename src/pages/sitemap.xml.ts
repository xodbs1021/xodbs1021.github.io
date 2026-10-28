import {posts,site,escape,categories} from '../lib/posts.mjs';
export function GET(){
 const pages=['/','/posts/','/series/','/about/','/categories/',...Object.keys(categories).map(c=>`/categories/${c}/`)];
 const entries=pages.map(url=>({url,lastmod:null})).concat(posts.map(p=>({url:p.url,lastmod:new Date(p.lastmod||p.date).toISOString()})));
 return new Response(`<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(({url,lastmod})=>`<url><loc>${escape(site+url)}</loc>${lastmod?`<lastmod>${lastmod}</lastmod>`:''}</url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}})
}
