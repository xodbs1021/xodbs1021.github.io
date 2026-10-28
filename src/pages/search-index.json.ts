import {load} from 'cheerio';
import {posts,categories} from '../lib/posts.mjs';
export function GET(){
 const docs=posts.map(p=>{const $=load(p.html);$('script,style,.diagram,.chart-figure').remove();return {id:p.slug,title:p.title,url:p.url,description:p.description,tags:p.tags.join(' '),category:categories[p.category].title,date:p.date.toISOString().slice(0,10),text:$.text().replace(/\s+/g,' ').trim()}});
 return new Response(JSON.stringify(docs),{headers:{'Content-Type':'application/json; charset=utf-8'}});
}
