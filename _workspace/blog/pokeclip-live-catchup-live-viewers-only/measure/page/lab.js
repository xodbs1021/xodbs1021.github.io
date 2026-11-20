// Live catch-up lab page. Original minimal harness for the blog re-measurement (not PokeClip code).
// Query: ?rule=off|rateAndJump|jumpOnly  &listener=early|late
//   rule      : which catch-up rule the page itself runs on timeupdate (off = none)
//   listener  : attach the page's timeupdate sampler before hls.js attaches its own (early) or after (late)
/* global Hls */
const q = new URLSearchParams(location.search);
const RULE = q.get('rule') ?? 'off';
const LISTENER = q.get('listener') ?? 'early';
const SRC = '/bench/index.m3u8';

const video = document.querySelector('video');
const log = { samples: [], events: [], frames: [], marks: [], rule: RULE, listener: LISTENER, ua: navigator.userAgent };
window.__log = log;
const t = () => performance.now();

for (const type of ['waiting', 'playing', 'seeking', 'seeked', 'ratechange', 'stalled', 'pause', 'play']) {
  video.addEventListener(type, () => log.events.push({ type, t: t(), ct: video.currentTime, rate: video.playbackRate }));
}

// Every presented frame. requestVideoFrameCallback gives the time the callback was called ("now", quantised to the
// display refresh) and the frame's media time.
window.__rvfc = typeof video.requestVideoFrameCallback === 'function';
if (window.__rvfc) {
  const onFrame = (now, meta) => {
    log.frames.push([now, meta.mediaTime, meta.presentedFrames]);
    video.requestVideoFrameCallback(onFrame);
  };
  video.requestVideoFrameCallback(onFrame);
}

const hls = new Hls({ lowLatencyMode: true, maxLiveSyncPlaybackRate: 1, backBufferLength: 90 });
window.__hls = hls;

function bufferAhead(time) {
  const b = video.buffered;
  for (let i = 0; i < b.length; i++) if (b.start(i) <= time && time < b.end(i)) return b.end(i) - time;
  return 0;
}

// ---- minimal catch-up rule (the decision described in the post, re-implemented from its prose) ----
const RATE_ON = 0.5, FAST_EXCESS = 1, RATE_OFF = 0.1, MIN_BUFFER = 1;
const JUMP_LATENCY = 10, JUMP_MIN_FORWARD = 1, JUMP_COOLDOWN_MS = 8000;
const rule = { rate: 1, stale: false, fresh: 0, lastJump: -Infinity };
function setRate(r) { if (video.playbackRate !== r) { log.marks.push({ kind: 'rate', to: r, t: t() }); video.playbackRate = r; } rule.rate = r; }
function step(s) {
  if (RULE === 'off' || !s.d) return;
  const { ageS, tdS } = s.d;
  if (!rule.stale && ageS > 2 * tdS) { rule.stale = true; rule.fresh = 0; }
  else if (rule.stale) { rule.fresh = ageS < tdS ? rule.fresh + 1 : 0; if (rule.fresh >= 2) rule.stale = false; }
  if (rule.stale) { setRate(1); return; }
  if (video.paused || video.seeking) return;
  const lsp = s.lsp;
  if (s.direct > JUMP_LATENCY && lsp !== null && lsp - video.currentTime > JUMP_MIN_FORWARD && t() - rule.lastJump >= JUMP_COOLDOWN_MS) {
    rule.lastJump = t();
    setRate(1);
    log.marks.push({ kind: 'jump', from: video.currentTime, to: lsp, t: t() });
    video.currentTime = lsp;
    return;
  }
  if (RULE === 'jumpOnly') { setRate(1); return; }
  const excess = s.direct - s.target;
  const short = bufferAhead(video.currentTime) < MIN_BUFFER;
  if (rule.rate !== 1) { if (excess <= RATE_OFF || short) setRate(1); return; }
  if (excess > RATE_ON && !short) setRate(excess >= FAST_EXCESS ? 1.1 : 1.05);
}

// ---- sampler: one record per timeupdate ----
let seq = 0;
function sample(phase) {
  const d = hls.latestLevelDetails;
  const rec = {
    seq: seq++, phase, t: t(), wall: Date.now(), ct: video.currentTime, rate: video.playbackRate,
    hlsLatency: hls.latency, target: hls.targetLatency, lsp: hls.liveSyncPosition,
    d: d ? { edge: d.edge, ageS: d.age, tdS: d.targetduration, live: d.live } : null,
    buf: bufferAhead(video.currentTime), seeking: video.seeking, paused: video.paused,
  };
  rec.direct = d ? d.edge + d.age - video.currentTime : null;
  return rec;
}
const onTimeUpdate = () => {
  const rec = sample('timeupdate');
  log.samples.push(rec);
  step(rec);
  // read again after every other listener of this dispatch has run (hls.js updates its cached latency in its own listener)
  setTimeout(() => { rec.hlsLatencyAfter = hls.latency; }, 0);
};

if (LISTENER === 'early') video.addEventListener('timeupdate', onTimeUpdate);
hls.on(Hls.Events.MEDIA_ATTACHED, () => { if (LISTENER === 'late') video.addEventListener('timeupdate', onTimeUpdate); });
hls.on(Hls.Events.ERROR, (_e, data) => log.events.push({ type: 'hlserror', t: t(), details: data.details, fatal: data.fatal }));
hls.loadSource(SRC);
hls.attachMedia(video);
hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch((e) => log.events.push({ type: 'playfail', t: t(), msg: String(e) })); });

// harness helpers called from Playwright
window.__mark = (kind, extra = {}) => log.marks.push({ kind, t: t(), ...extra });
window.__setRateForced = (r) => { log.marks.push({ kind: 'forced', from: video.playbackRate, to: r, t: t() }); video.playbackRate = r; };
window.__seekBy = (dS) => { log.marks.push({ kind: 'seek', by: dS, from: video.currentTime, t: t() }); video.currentTime = video.currentTime + dS; };
window.__seekToSync = () => { const p = hls.liveSyncPosition; log.marks.push({ kind: 'seekSync', from: video.currentTime, to: p, t: t() }); if (p !== null) video.currentTime = p; };
