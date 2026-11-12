// 콘티: _workspace/blog/abr-ladder-design/storyboard.md 「영상 1」
// 비트레이트(가로, 로그 눈금)를 왼쪽에서 오른쪽으로 쓸면서 해상도 4개의 VMAF 곡선이 함께 그려지고,
// 그 시점에 가장 높은 곡선(윗선)이 강조색으로 이어진다. 윗선의 주인은 540p → 720p → 1080p 로 넘어가고 360p 는 한 번도 올라서지 않는다.
// 점은 모두 글의 실측(_workspace/blog/abr-ladder-design/measure/e1-vmaf-grid.csv)과 같은 값. 점 사이는 로그 가로축에서 직선으로 이었다.
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(ConvexHullClimbMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const CONVEX_HULL_CLIMB_FRAMES = 330;

/** [실제 kbps, VMAF] — 10초 Sintel 발췌, x264 medium, 1080p로 확대해 VMAF(vmaf_v0.6.1). */
const CURVES = [
  { name: "1080p", points: [[314, 35.0], [625, 62.13], [1039, 82.21], [1658, 92.27], [2567, 96.75], [4039, 98.6], [5914, 99.04]] },
  { name: "720p", points: [[311, 46.58], [619, 72.87], [1021, 83.66], [1620, 89.74], [2526, 93.0], [4028, 94.85], [5973, 95.79]] },
  { name: "540p", points: [[311, 55.9], [616, 73.6], [1016, 81.38], [1619, 86.0], [2515, 88.58], [3951, 90.16], [5828, 90.99]] },
  { name: "360p", points: [[312, 54.98], [614, 68.48], [1008, 74.49], [1592, 77.9], [2469, 79.83], [3891, 81.04], [5847, 81.75]] },
] as const;

const X_MIN = 300;
const X_MAX = 6000;
const Y_MIN = 30;
const Y_MAX = 100;
const SWEEP_START = 20;
const SWEEP_LEN = 270;

type Layout = {
  readonly plot: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly ticks: readonly number[];
  readonly text: { readonly label: number; readonly small: number };
  readonly lineW: number;
  readonly title: { readonly x: number; readonly y: number };
  readonly tagX: number;
  readonly tagY: number;
};

const DESKTOP: Layout = {
  plot: { x: 200, y: 150, w: 1400, h: 720 },
  ticks: [300, 600, 1000, 1600, 2500, 4000, 6000],
  text: { label: TEXT.label, small: TEXT.small },
  lineW: 5,
  title: { x: 200, y: 50 },
  tagX: 1290,
  tagY: 50,
};

const MOBILE: Layout = {
  plot: { x: 150, y: 260, w: 760, h: 860 },
  ticks: [300, 1000, 2500, 6000],
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
  lineW: 6,
  title: { x: 40, y: 60 },
  tagX: 590,
  tagY: 150,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const lx = (kbps: number): number => (Math.log(kbps) - Math.log(X_MIN)) / (Math.log(X_MAX) - Math.log(X_MIN));

/** 로그 가로축에서 점 사이를 직선으로 이은 곡선의 값. 범위 밖이면 null. */
const valueAt = (points: readonly (readonly [number, number])[], kbps: number): number | null => {
  if (kbps < points[0][0] || kbps > points[points.length - 1][0]) return null;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (kbps <= x1) {
      const t = (Math.log(kbps) - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
      return y0 + t * (y1 - y0);
    }
  }
  return null;
};

const SAMPLES = Array.from({ length: 241 }, (_, i) => Math.exp(Math.log(314) + (i / 240) * (Math.log(5828) - Math.log(314))));

/** 각 표본 지점에서 가장 높은 곡선. 네 곡선이 모두 정의된 구간(314–5,828kbps)만. */
const ENVELOPE = SAMPLES.map((kbps) => {
  let best = { name: "", v: -1 };
  for (const c of CURVES) {
    const v = valueAt(c.points, kbps);
    if (v !== null && v > best.v) best = { name: c.name, v };
  }
  return { kbps, ...best };
});

export const ConvexHullClimb: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const p = l.plot;
  const intro = progress(frame, 0, 14);
  const sweep = progress(frame, SWEEP_START, SWEEP_LEN, (t) => t);
  const sweepKbps = Math.exp(Math.log(X_MIN) + sweep * (Math.log(X_MAX) - Math.log(X_MIN)));
  const px = (kbps: number): number => p.x + lx(kbps) * p.w;
  const py = (v: number): number => p.y + p.h - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * p.h;

  const curvePath = (points: readonly (readonly [number, number])[]): string => {
    const shown = points.filter(([x]) => x <= sweepKbps).map(([x, y]) => `${px(x)},${py(y)}`);
    const tip = valueAt(points, Math.min(sweepKbps, points[points.length - 1][0]));
    if (sweepKbps > points[0][0] && sweepKbps < points[points.length - 1][0] && tip !== null) shown.push(`${px(sweepKbps)},${py(tip)}`);
    return shown.join(" ");
  };
  const envelope = ENVELOPE.filter((e) => e.kbps <= sweepKbps);
  const current = envelope.length ? envelope[envelope.length - 1] : null;
  const ends = CURVES.map((c) => ({ name: c.name, y: py(c.points[c.points.length - 1][1]) }));
  // 끝 이름표가 겹치지 않게 아래로 밀어 낸다.
  const gap = l.text.small * 1.25;
  const placed = ends.reduce<{ name: string; y: number }[]>((acc, e) => [...acc, { name: e.name, y: acc.length ? Math.max(e.y, acc[acc.length - 1].y + gap) : e.y }], []);
  const endsShown = progress(frame, SWEEP_START + SWEEP_LEN - 10, 12);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={l.title.x} y={l.title.y} size={l.text.label} weight={760} opacity={intro}>
        VMAF
      </Label>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {[40, 60, 80, 100].map((v) => (
          <line key={v} x1={p.x} x2={p.x + p.w} y1={py(v)} y2={py(v)} stroke={COLOR.line} strokeWidth={2} opacity={intro} />
        ))}
        <line x1={p.x} x2={p.x + p.w} y1={p.y + p.h} y2={p.y + p.h} stroke={COLOR.muted} strokeWidth={3} opacity={intro} />
        {CURVES.map((c) => (
          <polyline key={c.name} points={curvePath(c.points)} fill="none" stroke={COLOR.muted} strokeWidth={l.lineW - 2} strokeLinejoin="round" />
        ))}
        {CURVES.flatMap((c) =>
          c.points.filter(([x]) => x <= sweepKbps).map(([x, y]) => <circle key={`${c.name}-${x}`} cx={px(x)} cy={py(y)} r={l.lineW + 2} fill={COLOR.muted} />),
        )}
        {envelope.length > 1 && (
          <polyline points={envelope.map((e) => `${px(e.kbps)},${py(e.v)}`).join(" ")} fill="none" stroke={COLOR.accent} strokeWidth={l.lineW + 4} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {sweep > 0 && sweep < 1 && <line x1={px(sweepKbps)} x2={px(sweepKbps)} y1={p.y} y2={p.y + p.h} stroke={COLOR.ink} strokeWidth={3} strokeDasharray="10 10" />}
      </svg>
      {[40, 60, 80, 100].map((v) => (
        <Label key={v} x={p.x - 20} y={py(v) - l.text.small * 0.62} size={l.text.small} anchor="right" color={COLOR.muted} opacity={intro}>
          {String(v)}
        </Label>
      ))}
      {l.ticks.map((t) => (
        <Label key={t} x={px(t)} y={p.y + p.h + 14} size={l.text.small} anchor="center" color={COLOR.muted} opacity={intro}>
          {t.toLocaleString("en-US")}
        </Label>
      ))}
      <Label x={p.x + p.w} y={p.y + p.h + 14 + l.text.small * 1.4} size={l.text.small} anchor="right" color={COLOR.ink} weight={700} opacity={intro}>
        kbps(로그 눈금)
      </Label>
      {placed.map((e) => (
        <Label key={e.name} x={p.x + p.w + 18} y={e.y - l.text.small * 0.62} size={l.text.small} weight={700} color={COLOR.muted} opacity={endsShown}>
          {e.name}
        </Label>
      ))}
      {current && (
        <Tag x={l.tagX} y={l.tagY} tone="accent" size={l.text.label} anchor="left" opacity={intro} scale={1}>
          {`윗선: ${current.name}`}
        </Tag>
      )}
    </AbsoluteFill>
  );
};
