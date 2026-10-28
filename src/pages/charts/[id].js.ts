import {charts} from '../../lib/posts.mjs';
export function getStaticPaths(){return [...charts.keys()].map(id=>({params:{id}}))}
export function GET({params}){return new Response(`export default (${charts.get(params.id)});`,{headers:{'Content-Type':'text/javascript; charset=utf-8'}})}
