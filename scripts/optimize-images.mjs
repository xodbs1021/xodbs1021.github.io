import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

// Originals stay untouched. Regenerate on a source or encoder-policy change.
const output = 'static/images/optimized';
const manifest = {};
const policy = 'v1-sharp0355-webp82-avif60-effort2';
const files = (await fs.readdir('static/images')).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
await fs.mkdir(output, {recursive:true});
let next = 0;
await Promise.all(Array.from({length:3}, async () => {
  while (next < files.length) {
    const name = files[next++];
    const original = `/images/${name}`;
    const source = await fs.readFile(`static${original}`);
    const metadata = await sharp(source).metadata();
    if (!metadata.width || !metadata.height || metadata.pages > 1) continue;
    const {width,height} = metadata;
    // Do not introduce additional lossy encoding into visual quality comparisons.
    const evidence = /comparison|hdr-vs-sdr|chroma-subsampling/.test(name);
    const entry = {width,height,bytes:source.length,original,variants:{},preserveQuality:evidence};
    manifest[original] = entry;
    if (evidence) continue;
    const key = createHash('sha256').update(source).update(policy).digest('hex').slice(0,16);
    const widths = [...new Set([480,960,Math.min(width,1536)].filter(w => w <= width))].sort((a,b)=>a-b);
    for (const format of ['webp','avif']) {
      entry.variants[format] = [];
      for (const w of widths) {
        const filename = `${key}-${w}.${format}`;
        const target = path.join(output,filename);
        try { await fs.access(target); } catch {
          let image = sharp(source).resize({width:w,withoutEnlargement:true});
          image = format === 'webp' ? image.webp({quality:82}) : image.avif({quality:60,effort:2,chromaSubsampling:'4:4:4'});
          await image.toFile(target);
        }
        entry.variants[format].push({width:w,src:`/images/optimized/${filename}`,bytes:(await fs.stat(target)).size});
      }
    }
  }
}));
await fs.writeFile('data/image-manifest.json',JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()),null,2)+'\n');
const optimized = Object.values(manifest).filter(m=>m.variants.avif);
const before = optimized.reduce((n,m)=>n+m.bytes,0);
const mobile = optimized.reduce((n,m)=>n+m.variants.avif.find(v=>v.width>=Math.min(960,m.width)).bytes,0);
console.log(`Images: ${optimized.length} responsive, ${Object.keys(manifest).length-optimized.length} original-quality; 960px AVIF ${(mobile/1e6).toFixed(2)} MB / originals ${(before/1e6).toFixed(2)} MB.`);
