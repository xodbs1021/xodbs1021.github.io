import MiniSearch from 'minisearch';
const compact=s=>s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function tokenize(text) {
  const words=text.toLocaleLowerCase().match(/[\p{L}\p{N}_]+/gu)||[];
  return words.flatMap(word=>{
    if(!/[가-힣]/.test(word)) return [word];
    const grams=[];
    for(let n=0;n<word.length-1;n++)grams.push(word.slice(n,n+2));
    return [...new Set([word,...grams])];
  });
}
export function makeSearch(documents) {
  const index=new MiniSearch({fields:['title','tags','description','text'],storeFields:['title','url','description','category','date'],tokenize,searchOptions:{boost:{title:8,tags:5,description:2},prefix:term=>term.length>=2,fuzzy:term=>/^[a-z]{5,}$/i.test(term)?0.15:false}});
  index.addAll(documents);
  const byId=new Map(documents.map(d=>[d.id,d]));
  return query=>{
    const q=query.trim().slice(0,160);if(!q)return [];
    const needle=compact(q), words=q.toLowerCase().split(/\s+/).filter(Boolean);
    const found=new Map(index.search(q).map(r=>[r.id,r]));
    // Compact matching recovers Korean compounds whose spacing changed.
    for(const d of documents)if(compact(d.title+' '+d.description+' '+d.text).includes(needle)&&!found.has(d.id))found.set(d.id,{...d,score:1});
    const ranked = [...found.values()].map(r=>{
      const d=byId.get(r.id), title=compact(d.title), body=compact(d.text);
      const coverage=words.filter(w=>compact(d.title+' '+d.tags+' '+d.text).includes(compact(w))).length/words.length;
      return {...r,coverage,score:r.score*(0.15+coverage*0.85)+(title.includes(needle)?1000:0)+(body.includes(needle)?80:0),snippet:snippet(d.text,q)||d.description};
    }).sort((a,b)=>b.score-a.score);
    const exactWords=ranked.filter(r=>r.coverage===1);
    return words.length>1 && exactWords.length ? exactWords : ranked;
  };
}
function snippet(text,query){const terms=query.toLowerCase().split(/\s+/).filter(Boolean);let at=-1;for(const term of terms){at=text.toLowerCase().indexOf(term);if(at>=0)break}const start=Math.max(0,at-55);return (start?'…':'')+text.slice(start,start+200)+(text.length>start+200?'…':'')}
