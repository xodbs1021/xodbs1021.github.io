// Probe every video in static/videos and record what the renderer needs in data/video-manifest.json.
//   node scripts/check-videos.mjs           probe with ffprobe, enforce limits, rewrite the manifest
//   node scripts/check-videos.mjs --check   verify the manifest still matches the files (no ffprobe)
// The build reads the manifest only, so Vercel needs no ffprobe. Re-run after rendering a video.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {VIDEO_LIMITS, videoHash, videoMode} from '../src/lib/videos.mjs';

const DIR = 'static/videos';
const MANIFEST = 'data/video-manifest.json';
const checkOnly = process.argv.includes('--check');
const problems = [];

// Top-level MP4 boxes in file order. faststart means moov precedes mdat.
function boxOrder(buffer) {
  const order = [];
  for (let at = 0; at + 8 <= buffer.length;) {
    let size = buffer.readUInt32BE(at);
    const type = buffer.toString('latin1', at + 4, at + 8);
    if (size === 1) size = Number(buffer.readBigUInt64BE(at + 8));
    if (size === 0) size = buffer.length - at;
    if (size < 8) break;
    order.push(type);
    at += size;
  }
  return order;
}

function probe(file) {
  const out = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8'}));
  const video = out.streams.find(s => s.codec_type === 'video');
  const order = boxOrder(fs.readFileSync(file));
  return {
    codec: video?.codec_name ?? null,
    pixFmt: video?.pix_fmt ?? null,
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    duration: Math.round(Number(out.format.duration) * 100) / 100,
    audio: out.streams.filter(s => s.codec_type === 'audio').length,
    faststart: order.indexOf('moov') !== -1 && order.indexOf('moov') < order.indexOf('mdat'),
  };
}

function describe(file) {
  const buffer = fs.readFileSync(file);
  return {sha256: videoHash(buffer), bytes: buffer.length};
}

const names = fs.readdirSync(DIR).filter(f => f.endsWith('.mp4') && !f.endsWith('-mobile.mp4')).map(f => f.replace(/\.mp4$/, '')).sort();

if (checkOnly) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const listed = Object.keys(manifest).sort();
  if (JSON.stringify(listed) !== JSON.stringify(names)) problems.push(`manifest lists [${listed}] but ${DIR} has [${names}]`);
  for (const name of names) {
    const entry = manifest[name];
    if (!entry) continue;
    for (const [label, file, record] of [['', `${DIR}/${name}.mp4`, entry], ['mobile ', `${DIR}/${name}-mobile.mp4`, entry.mobile]]) {
      if (!record) { if (fs.existsSync(file)) problems.push(`${name}: ${label}file exists but manifest has no entry`); continue; }
      if (!fs.existsSync(file)) { problems.push(`${name}: ${label}file missing`); continue; }
      if (describe(file).sha256 !== record.sha256) problems.push(`${name}: ${label}file changed since the manifest was written`);
    }
  }
} else {
  // Scene id and alt come from the Remotion registry, which Vercel builds do not ship.
  const kebab = id => id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const registryFile = 'motion/src/scenes/registry.json';
  const scenes = fs.existsSync(registryFile) ? JSON.parse(fs.readFileSync(registryFile, 'utf8')).filter(s => s.kind === 'video') : [];
  const manifest = {};
  for (const name of names) {
    const file = `${DIR}/${name}.mp4`;
    const scene = scenes.find(s => `${s.post}-${kebab(s.id)}` === name);
    const entry = {...(scene ? {scene: scene.id, alt: scene.alt} : {}), ...describe(file), ...probe(file), poster: `/images/${name}-poster.jpg`};
    const mobileFile = `${DIR}/${name}-mobile.mp4`;
    if (fs.existsSync(mobileFile)) entry.mobile = {...describe(mobileFile), ...probe(mobileFile), poster: `/images/${name}-mobile-poster.jpg`};
    manifest[name] = entry;
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  for (const [name, entry] of Object.entries(manifest)) {
    for (const [label, record] of [['', entry], ['mobile ', entry.mobile]]) {
      if (!record) continue;
      const limit = VIDEO_LIMITS[videoMode(record.duration)];
      if (record.codec !== 'h264') problems.push(`${name}: ${label}codec ${record.codec} (h264 required)`);
      if (record.pixFmt !== 'yuv420p') problems.push(`${name}: ${label}pixel format ${record.pixFmt} (yuv420p required)`);
      if (record.audio) problems.push(`${name}: ${label}has ${record.audio} audio stream(s)`);
      if (!record.faststart) problems.push(`${name}: ${label}moov after mdat (re-encode with -movflags +faststart)`);
      if (record.bytes > limit.bytes) problems.push(`${name}: ${label}${(record.bytes / 1e6).toFixed(2)} MB over the ${videoMode(record.duration)} limit ${(limit.bytes / 1e6).toFixed(0)} MB`);
      if (record.duration > limit.maxSeconds) problems.push(`${name}: ${label}${record.duration}s over ${limit.maxSeconds}s`);
      if (!fs.existsSync(path.join('static', record.poster))) problems.push(`${name}: ${label}poster ${record.poster} missing`);
    }
    if (entry.mobile && (entry.mobile.width !== 1080 || entry.mobile.height !== 1350)) problems.push(`${name}: mobile copy is ${entry.mobile.width}×${entry.mobile.height} (1080×1350 expected)`);
  }
}

if (problems.length) {
  console.error(problems.map(p => `- ${p}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Videos: ${names.length} ${checkOnly ? 'match the manifest' : 'probed'} (${MANIFEST}).`);
}
