import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from 'cheerio';
import {renderBody} from '../src/lib/posts.mjs';
import {loadVideoManifest, videoHash, videoMode, VIDEO_LIMITS, POSTER_MAX_BYTES, MOBILE_QUERY} from '../src/lib/videos.mjs';

const manifest = loadVideoManifest();
const images = JSON.parse(fs.readFileSync('data/image-manifest.json', 'utf8'));
const records = Object.entries(manifest).flatMap(([name, entry]) => [[name, entry], ...(entry.mobile ? [[`${name}-mobile`, entry.mobile]] : [])]);

test('video manifest matches every file in static/videos (run node scripts/check-videos.mjs after rendering)', () => {
  const files = fs.readdirSync('static/videos').filter(f => f.endsWith('.mp4')).map(f => f.replace(/\.mp4$/, '')).sort();
  assert.deepEqual(records.map(([name]) => name).sort(), files);
  for (const [name, record] of records) assert.equal(videoHash(fs.readFileSync(`static/videos/${name}.mp4`)), record.sha256, `${name} changed since the manifest was written`);
});

test('videos are silent H.264 yuv420p with moov first and stay within size limits', () => {
  for (const [name, record] of records) {
    const mode = videoMode(record.duration);
    assert.equal(record.codec, 'h264', name);
    assert.equal(record.pixFmt, 'yuv420p', name);
    assert.equal(record.audio, 0, `${name} has audio`);
    assert.ok(record.faststart, `${name}: moov after mdat`);
    assert.ok(record.bytes <= VIDEO_LIMITS[mode].bytes, `${name}: ${record.bytes} bytes over the ${mode} limit`);
    assert.ok(record.duration <= VIDEO_LIMITS[mode].maxSeconds, `${name}: ${record.duration}s`);
  }
  for (const [name, entry] of Object.entries(manifest)) {
    if (entry.mobile) assert.deepEqual([entry.mobile.width, entry.mobile.height, entry.mobile.duration], [1080, 1350, entry.duration], `${name} phone copy`);
  }
});

test('posters readers download (960px AVIF and WebP) stay under the poster budget', () => {
  for (const [name, record] of records) {
    const image = images[record.poster];
    assert.ok(image, `${name}: poster ${record.poster} not optimized`);
    for (const format of ['avif', 'webp']) {
      const variant = image.variants[format].find(v => v.width >= Math.min(960, image.width));
      assert.ok(variant.bytes <= POSTER_MAX_BYTES, `${name}: ${format} poster ${variant.bytes} bytes`);
    }
  }
});

test('motion shortcode: loop clip with phone copy, explainer with controls, numbered with the other figures', () => {
  const scene = Object.values(manifest).find(e => e.mobile && e.scene);
  const explainer = Object.entries(manifest).find(([, e]) => videoMode(e.duration) === 'explain')[0];
  const {html, figures} = renderBody([
    `{{< motion scene="${scene.scene}" id="fig-fall" kind="개념도" caption="창이 밀려 재생점이 떨어진다" >}}`,
    '',
    '[[fig-fall]]처럼 반복 영상도 그림 번호를 받습니다.',
    '',
    `{{< motion name="${explainer}" alt="설명 영상" kind="개념도" caption="긴 설명 영상" />}}`,
  ].join('\n'), 'fixture/video');
  const $ = load(html);
  assert.deepEqual(figures.map(f => [f.number, f.type, f.kind]), [[1, 'video', '개념도'], [2, 'video', '개념도']]);
  const loop = $('#fig-fall');
  assert.equal(loop.attr('data-play'), 'loop');
  assert.equal(loop.attr('data-mobile'), '');
  const video = loop.find('video');
  for (const attr of ['muted', 'loop', 'playsinline', 'controls']) assert.notEqual(video.attr(attr), undefined, attr);
  assert.equal(video.attr('preload'), 'none');
  assert.equal(video.attr('aria-label'), scene.alt);
  const sources = video.find('source').map((_, s) => [[$(s).attr('media') ?? '', $(s).attr('src')]]).get();
  assert.equal(sources[0][0], MOBILE_QUERY, 'phone copy is tried first');
  assert.match(sources[0][1], /-mobile\.mp4\?v=[0-9a-f]{12}$/);
  assert.match(sources[1][1], /^\/videos\/[a-z0-9-]+\.mp4\?v=[0-9a-f]{12}$/);
  assert.equal(loop.find('.motion-poster source').first().attr('media'), MOBILE_QUERY);
  assert.equal(loop.find('.motion-poster img').attr('alt'), '', 'poster is decorative; the video carries the name');
  assert.equal(loop.find('button.motion-toggle').length, 1);
  assert.equal(loop.find('figcaption .fig-label').text(), '그림 1.');
  assert.match(html, /<a class="fig-ref" href="#fig-fall">그림 1<\/a>/);
  const long = $('figure.motion-figure').eq(1);
  assert.equal(long.attr('data-play'), 'explain');
  assert.equal(long.find('video').attr('loop'), undefined);
  assert.equal(long.find('button').length, 0);
  assert.match(long.find('video').attr('poster'), /^\/images\/optimized\/[0-9a-f]+-960\.webp$/, 'explainer poster is the optimized WebP');
  assert.equal(long.find('.motion-poster').length, 0);
  assert.throws(() => renderBody('{{< motion scene="NoSuchScene" >}}', 'fixture/missing'), /not in data\/video-manifest\.json/);
  assert.throws(() => renderBody(`{{< motion name="${explainer}" >}}`, 'fixture/alt'), /needs alt=/);
});

test('versioned video URLs are immutable; unversioned ones revalidate hourly', () => {
  const rules = JSON.parse(fs.readFileSync('vercel.json', 'utf8')).headers.filter(h => h.source === '/videos/(.*)');
  const cache = rule => rule.headers.find(h => h.key === 'Cache-Control').value;
  assert.match(cache(rules.find(r => r.has?.[0]?.key === 'v')), /immutable/);
  assert.doesNotMatch(cache(rules.find(r => r.missing?.[0]?.key === 'v')), /immutable/);
});
