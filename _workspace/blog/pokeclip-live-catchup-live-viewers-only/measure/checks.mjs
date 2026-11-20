// Validity checks for one run file (run.mjs output). Returns a list of problems; empty = usable.
// run.mjs refuses to write a run that fails these, and `node analyze.mjs check …` re-checks published files.
export const WINDOW_MS = 1000;
const MIN_SAMPLES = 50;
const MIN_FRAMES = 3000; // ~100 s at 30 fps inside the measured span
const MIN_FRAMES_PER_WINDOW = 10;

export function problemsOf(raw) {
  const out = [];
  const { scenario } = raw.args;
  if (!Array.isArray(raw.pages) || raw.pages.length === 0) return ['no pages'];
  if (Array.isArray(raw.pageErrors) && raw.pageErrors.length) out.push(`page errors: ${raw.pageErrors.length}`);
  raw.pages.forEach((log, i) => {
    const tag = `page ${i} (${log.rule})`;
    if (log.rvfc !== true) out.push(`${tag}: requestVideoFrameCallback unsupported`);
    const fatal = log.events.filter((e) => e.type === 'hlserror' && e.fatal);
    if (fatal.length) out.push(`${tag}: fatal hls.js errors: ${fatal.map((e) => e.details).join(',')}`);
    if (log.events.some((e) => e.type === 'playfail')) out.push(`${tag}: play() rejected`);
    if (log.samples.filter((s) => s.direct !== null).length < MIN_SAMPLES) out.push(`${tag}: fewer than ${MIN_SAMPLES} samples`);
  });
  if (scenario === 'framegap') {
    const log = raw.pages[0];
    const start = log.marks.find((m) => m.kind === 'start')?.t;
    const end = log.marks.find((m) => m.kind === 'end')?.t;
    if (start === undefined || end === undefined) return [...out, 'framegap: start/end mark missing'];
    const frames = log.frames.filter(([now]) => now >= start - WINDOW_MS && now <= end);
    if (frames.length < MIN_FRAMES) out.push(`framegap: only ${frames.length} frames`);
    const switches = log.marks.filter((m) => m.kind === 'forced').map((m) => m.t);
    const centers = switches.length ? switches : Array.from({ length: 40 }, (_, i) => start + i * 3000);
    if (raw.args.rate !== 'none' && switches.length !== 40) out.push(`framegap: ${switches.length} switches, expected 40`);
    const thin = centers.filter((c) => frames.filter(([now]) => Math.abs(now - c) <= WINDOW_MS).length < MIN_FRAMES_PER_WINDOW);
    if (thin.length) out.push(`framegap: ${thin.length} windows with fewer than ${MIN_FRAMES_PER_WINDOW} frames`);
  }
  if (scenario === 'lag') {
    const log = raw.pages[0];
    const seeks = log.marks.filter((m) => m.kind === 'seek' || m.kind === 'seekSync');
    if (seeks.length !== 20) out.push(`lag: ${seeks.length} seeks, expected 20`);
    const unanswered = seeks.filter((m) => !log.samples.some((s) => s.t > m.t && s.t - m.t <= WINDOW_MS && s.direct !== null));
    if (unanswered.length) out.push(`lag: ${unanswered.length} seeks without a sample within ${WINDOW_MS} ms`);
  }
  if (scenario === 'drift') {
    const holds = raw.holds ?? [];
    if (holds.length !== 4) out.push(`drift: ${holds.length} hold switches, expected 4`);
    const releases = holds.filter((h) => h.hold === 0);
    raw.pages.forEach((log, i) => {
      releases.forEach((rel, k) => {
        const n = log.samples.filter((s) => s.direct !== null && s.wall >= rel.at && s.wall < rel.at + 30000).length;
        if (n < MIN_SAMPLES) out.push(`drift page ${i} (${log.rule}): ${n} samples in 30 s after release ${k + 1}`);
      });
    });
  }
  return out;
}
