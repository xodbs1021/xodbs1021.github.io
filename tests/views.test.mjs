import test from 'node:test';import assert from 'node:assert/strict';
import {createHandler,identity,allowedSlugs} from '../api/views.mjs';
const slug=[...allowedSlugs][0];
function response(){return {code:0,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(data){this.data=data;return this}}}
test('rejects arbitrary keys, foreign origins, and unsupported methods before touching Redis',async()=>{
 let calls=0;const handle=createHandler({getRedis:()=>{calls++;throw Error()}});
 for(const [method,url,origin,code] of [['POST','/api/views?slug=evil','https://taeyun.blog',404],['POST',`/api/views?slug=${slug}`,'https://evil.example',403],['DELETE',`/api/views?slug=${slug}`,'https://taeyun.blog',405]]){const res=response();await handle({method,url,headers:{origin}},res);assert.equal(res.code,code)}assert.equal(calls,0);
});
test('daily identity hides raw IP and changes across days',()=>{const a=identity('secret','203.0.113.7','2026-10-29');assert.equal(a.length,32);assert.notEqual(a,identity('secret','203.0.113.7','2026-10-30'));assert.notEqual(a,identity('other','203.0.113.7','2026-10-29'))});
test('cacheable GET never increments, POST uses daily dedup and limits',async()=>{
 let keys;const redis={get:async()=>7,eval:async(s,k)=>{keys=k;return[0,7]}};const h=createHandler({getRedis:()=>redis,getSecret:()=> 'test-secret',now:()=>new Date('2026-10-29')});
 let r=response();await h({method:'GET',url:`/?slug=${slug}`,headers:{}},r);assert.equal(r.data.views,7);assert.match(r.headers['Cache-Control'],/s-maxage=300/);assert.equal(keys,undefined);
 r=response();await h({method:'POST',url:`/?slug=${slug}`,headers:{origin:'https://taeyun.blog','x-vercel-forwarded-for':'203.0.113.7'}},r);assert.equal(r.data.views,7);assert.equal(keys.length,4);assert.ok(keys.every(k=>!k.includes('203.0.113.7')));assert.equal(r.headers['Cache-Control'],'no-store');
});
test('quota exhaustion returns 429 and Redis failure never reports false zero',async()=>{
 const req={method:'POST',url:`/?slug=${slug}`,headers:{origin:'https://taeyun.blog','x-vercel-forwarded-for':'203.0.113.7'}};
 for(const [redis,status]of[[{eval:async()=>[-1,0]},429],[{eval:async()=>{throw Error()}},503]]){const r=response();await createHandler({getRedis:()=>redis,getSecret:()=> 'test'})(req,r);assert.equal(r.code,status);assert.equal(r.data.views,undefined)}
});
