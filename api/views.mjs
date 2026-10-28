import {createHmac} from 'node:crypto';
import {Redis} from '@upstash/redis';
import slugs from '../data/post-slugs.json' with {type:'json'};

export const allowedSlugs=new Set(slugs);
// One atomic transaction: a bounded request budget, a short-lived client limit,
// daily post deduplication, and the durable total. No raw IP is persisted.
export const INCREMENT_SCRIPT=`
local global = redis.call('INCR', KEYS[1])
if global == 1 then redis.call('EXPIRE', KEYS[1], 172800) end
if global > 4000 then return {-2, 0} end
local rate = redis.call('INCR', KEYS[2])
if rate == 1 then redis.call('EXPIRE', KEYS[2], 60) end
if rate > 20 then return {-1, 0} end
local fresh = redis.call('SET', KEYS[3], '1', 'NX', 'EX', 172800)
if fresh then return {1, redis.call('INCR', KEYS[4])} end
return {0, tonumber(redis.call('GET', KEYS[4]) or '0')}
`;
export function identity(secret,ip,day){return createHmac('sha256',secret).update(`${day}:${ip}`).digest('hex').slice(0,32)}
export function createHandler({getRedis=()=>new Redis({url:process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL,token:process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN}),getSecret=()=>process.env.VIEWS_HASH_SECRET,now=()=>new Date()}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(code,data)=>res.status(code).json(data);
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(405,{error:'Method not allowed'})}
  const slug=new URL(req.url,'https://taeyun.blog').searchParams.get('slug');
  if(!slug||!allowedSlugs.has(slug))return send(404,{error:'Unknown article'});
  if(req.method==='POST' && (req.headers.origin!=='https://taeyun.blog'||Number(req.headers['content-length']||0)>256))return send(403,{error:'Request not allowed'});
  if(req.method==='POST' && /bot|crawler|spider|preview|linkedin|facebookexternalhit/i.test(req.headers['user-agent']||''))return send(204,{});
  try{
   const redis=getRedis();
   if(req.method==='GET'){const views=Number(await redis.get(`views:v1:${slug}`)||0);res.setHeader('Cache-Control','public, max-age=30, s-maxage=300, stale-while-revalidate=600');return send(200,{views})}
   const secret=getSecret();if(!secret)throw new Error('Missing counter secret');
   const ip=(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'').split(',')[0].trim();
   if(!ip)return send(400,{error:'Missing client address'});
   const day=now().toISOString().slice(0,10),client=identity(secret,ip,day);
   const [state,views]=await redis.eval(INCREMENT_SCRIPT,[`views:budget:${day}`,`views:rate:${client}`,`views:seen:${day}:${slug}:${client}`,`views:v1:${slug}`],[]);
   if(state<0){res.setHeader('Retry-After',state===-1?'60':'3600');return send(429,{error:'Please try later'})}
   return send(200,{views:Number(views)});
  }catch{return send(503,{error:'View counts temporarily unavailable'})}
 }
}
export default createHandler();
