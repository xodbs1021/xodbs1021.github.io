import fs from 'node:fs';
import {posts} from '../src/lib/posts.mjs';
import {visualReport} from '../src/lib/visuals.mjs';
fs.writeFileSync('data/post-slugs.json',JSON.stringify(posts.map(p=>p.slug)));
// Pre-rendered diagrams are committed; the build never launches a browser.
if(visualReport.missingDiagrams.length){
  console.error(`Missing pre-rendered diagrams (${visualReport.missingDiagrams.length}): ${visualReport.missingDiagrams.map(d=>`${d.slug}#${d.key}`).join(', ')}\nRun \`npm run render:diagrams\` and commit data/diagrams and data/diagram-manifest.json.`);
  process.exit(1);
}
const gaps=visualReport.warnings.filter(w=>/ lacks /.test(w)).length;
const other=visualReport.warnings.filter(w=>!/ lacks /.test(w));
console.log(`Figures: ${posts.reduce((n,p)=>n+p.figures.length,0)} in ${posts.filter(p=>p.figures.length).length} posts; ${gaps} without kind/caption (earlier posts, see data/legacy-figure-gaps.json).`);
for(const warning of other)console.warn(`warning: ${warning}`);
