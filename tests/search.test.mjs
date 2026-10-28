import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {makeSearch} from '../src/lib/search.mjs';import {posts,categories} from '../src/lib/posts.mjs';
const search=makeSearch(JSON.parse(fs.readFileSync('dist/search-index.json')));
test('search finds Korean subjects and English identifiers in published content',()=>{
 assert.match(search('DB 인증')[0].title,/DB 인증/);
 assert.ok(search('certloader').some(p=>p.title.includes('인증서')));
 assert.ok(search('녹화복구').length>0);
 assert.ok(search('MediaMTX').length>0);
 assert.ok(search('mediamtxx').length>0);
 assert.deepEqual(search(''),[]);assert.deepEqual(search('zxqvjyw9384'),[]);
});
test('every post belongs to exactly one nonempty public category',()=>{
 assert.equal(Object.keys(categories).length,4);
 for(const p of posts)assert.ok(categories[p.category]);
 for(const c of Object.keys(categories))assert.ok(posts.some(p=>p.category===c));
});
