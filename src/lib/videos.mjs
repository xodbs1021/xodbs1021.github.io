import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Videos are described by data/video-manifest.json (written locally by scripts/check-videos.mjs with
// ffprobe). Vercel builds without motion/ and ffprobe, so the renderer reads only the manifest.
export const VIDEO_MANIFEST = 'data/video-manifest.json';
// Short clips loop silently while on screen; longer explainers wait for the reader.
export const LOOP_MAX_SECONDS = 12;
export const VIDEO_LIMITS = {
  loop: {bytes: 1_000_000, maxSeconds: LOOP_MAX_SECONDS},
  explain: {bytes: 4_000_000, maxSeconds: 60},
};
// The poster readers actually download (960px AVIF from the image pipeline).
export const POSTER_MAX_BYTES = 60_000;
// Phones (≤600px wide) get the 4:5 copy when one exists.
export const MOBILE_QUERY = '(max-width: 600px)';

export const videoMode = seconds => seconds <= LOOP_MAX_SECONDS ? 'loop' : 'explain';
export const videoHash = buffer => createHash('sha256').update(buffer).digest('hex');

export function loadVideoManifest(root = process.cwd()) {
  const file = path.join(root, VIDEO_MANIFEST);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

// {{< motion scene="RewindFallout" … >}} or {{< motion name="multicloud-migration-film" alt="…" … >}}
export function resolveVideo(args, manifest) {
  const name = args.name || Object.keys(manifest).find(key => manifest[key].scene === args.scene);
  const entry = name && manifest[name];
  if (!entry) return {error: `motion ${args.scene ? `scene "${args.scene}"` : `name "${args.name}"`} is not in ${VIDEO_MANIFEST} (render it, then run node scripts/check-videos.mjs)`};
  const alt = args.alt || entry.alt;
  if (!alt) return {error: `motion "${name}" needs alt="…" (no registry alt in ${VIDEO_MANIFEST})`};
  return {name, entry, alt, mode: videoMode(entry.duration)};
}

// Cache-busting query: /videos/* is served immutable only when ?v= is present (vercel.json).
export const videoUrl = (name, record, suffix = '') => `/videos/${name}${suffix}.mp4?v=${record.sha256.slice(0, 12)}`;
