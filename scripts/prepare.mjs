import fs from 'node:fs';
import {posts} from '../src/lib/posts.mjs';
fs.writeFileSync('data/post-slugs.json',JSON.stringify(posts.map(p=>p.slug)));
