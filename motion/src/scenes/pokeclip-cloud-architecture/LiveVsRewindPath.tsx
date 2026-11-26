// 콘티: _workspace/blog/pokeclip-cloud-architecture/storyboard.md 「LiveVsRewindPath」
// 같은 CloudFront 배포에서 라이브 목록 요청은 내부 ALB → EC2 미디어 상자로, 되감기 조각 요청은 S3로 간다.
// 경로 규칙은 2026-11-25 Terraform 기준, 움직임의 시각은 설명용. layout="mobile" 은 1080×1350 세로 배치.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, Wire } from "../../components/Flow";
import { Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const LIVE_VS_REWIND_PATH_FRAMES = 300;

type Point = readonly [number, number];
type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Layout = {
  readonly viewer: Box; readonly cf: Box; readonly alb: Box; readonly ec2: Box; readonly s3: Box;
  readonly toCf: ReadonlyArray<Point>; readonly cfToAlb: ReadonlyArray<Point>;
  readonly albToEc2: ReadonlyArray<Point>; readonly cfToS3: ReadonlyArray<Point>;
  readonly liveTag: Point; readonly rewindTag: Point; readonly text: number; readonly packet: number;
  readonly ec2Label: string;
};

const DESKTOP: Layout = {
  viewer: { x: 120, y: 470, w: 260, h: 120 },
  cf: { x: 520, y: 450, w: 440, h: 160 },
  alb: { x: 1100, y: 230, w: 280, h: 140 },
  ec2: { x: 1480, y: 210, w: 380, h: 180 },
  s3: { x: 1480, y: 680, w: 380, h: 160 },
  toCf: [[380, 530], [520, 530]],
  cfToAlb: [[960, 500], [1030, 500], [1030, 300], [1100, 300]],
  albToEc2: [[1380, 300], [1480, 300]],
  cfToS3: [[960, 560], [1030, 560], [1030, 760], [1480, 760]],
  liveTag: [1670, 150], rewindTag: [1670, 900], text: TEXT.small, packet: 30,
  ec2Label: "미디어 상자 EC2\nMediaMTX LL-HLS",
};
const MOBILE: Layout = {
  viewer: { x: 60, y: 110, w: 960, h: 120 },
  cf: { x: 60, y: 350, w: 960, h: 150 },
  alb: { x: 60, y: 640, w: 440, h: 130 },
  ec2: { x: 60, y: 900, w: 440, h: 160 },
  s3: { x: 580, y: 900, w: 440, h: 160 },
  toCf: [[540, 230], [540, 350]],
  cfToAlb: [[280, 500], [280, 640]],
  albToEc2: [[280, 770], [280, 900]],
  cfToS3: [[800, 500], [800, 900]],
  liveTag: [280, 1140], rewindTag: [800, 1140], text: MOBILE_TEXT.small, packet: 34,
  ec2Label: "미디어 상자\nEC2 · LL-HLS",
};
const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

// 시각(프레임)
const T = { fade: 20, live1: 30, live2: 62, live3: 104, liveDone: 134, liveTag: 150, rw1: 170, rw2: 202, rwDone: 252, rwTag: 266 } as const;

/** 꺾은선 위의 t(0–1) 지점. */
const along = (pts: ReadonlyArray<Point>, t: number): Point => {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let d = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const k = segs[i] === 0 ? 0 : Math.min(1, d / segs[i]);
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    d -= segs[i];
  }
  return pts[pts.length - 1];
};

const Packet: React.FC<{ readonly at: Point; readonly size: number }> = ({ at, size }) => (
  <div style={{ position: "absolute", left: at[0] - size / 2, top: at[1] - size / 2, width: size, height: size, borderRadius: 999, background: COLOR.accent, border: `4px solid ${COLOR.white}` }} />
);

export const LiveVsRewindPath: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const fade = progress(frame, 0, T.fade);
  const l1 = progress(frame, T.live1, T.live2 - T.live1, EASE_IN_OUT);
  const l2 = progress(frame, T.live2, T.live3 - T.live2, EASE_IN_OUT);
  const l3 = progress(frame, T.live3, T.liveDone - T.live3, EASE_IN_OUT);
  const r1 = progress(frame, T.rw1, T.rw2 - T.rw1, EASE_IN_OUT);
  const r2 = progress(frame, T.rw2, T.rwDone - T.rw2, EASE_IN_OUT);
  const liveAt = frame < T.live2 ? along(L.toCf, l1) : frame < T.live3 ? along(L.cfToAlb, l2) : along(L.albToEc2, l3);
  const rwAt = frame < T.rw2 ? along(L.toCf, r1) : along(L.cfToS3, r2);
  const showLive = frame >= T.live1 && frame < T.liveDone;
  const showRw = frame >= T.rw1 && frame < T.rwDone;
  const ec2Done = frame >= T.liveDone;
  const s3Done = frame >= T.rwDone;
  const box = (b: Box, label: string, tone: "ink" | "accent", size = L.text) => (
    <Node x={b.x} y={b.y} width={b.w} height={b.h} tone={tone} size={size} opacity={fade}>{label}</Node>
  );
  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Wire points={L.toCf} color={COLOR.muted} opacity={fade} />
      <Wire points={L.cfToAlb} color={COLOR.muted} opacity={fade} />
      <Wire points={L.albToEc2} color={COLOR.muted} opacity={fade} />
      <Wire points={L.cfToS3} color={COLOR.muted} opacity={fade} />
      {/* 지난 길은 청록으로 남는다 */}
      <Wire points={L.toCf} color={COLOR.accent} opacity={Math.max(l1, r1)} />
      <Wire points={L.cfToAlb} color={COLOR.accent} opacity={l2} />
      <Wire points={L.albToEc2} color={COLOR.accent} opacity={l3} />
      <Wire points={L.cfToS3} color={COLOR.accent} opacity={r2} />
      {box(L.viewer, "시청자", "ink")}
      {box(L.cf, "CloudFront\nmedia.pokeclip.com", "ink")}
      {box(L.alb, "내부 ALB", l2 > 0.95 || ec2Done ? "accent" : "ink")}
      {box(L.ec2, L.ec2Label, ec2Done ? "accent" : "ink")}
      {box(L.s3, "S3 rewind\n되감기 · VOD", s3Done ? "accent" : "ink")}
      {showLive ? <Packet at={liveAt} size={L.packet} /> : null}
      {showRw ? <Packet at={rwAt} size={L.packet} /> : null}
      <Tag x={L.liveTag[0]} y={L.liveTag[1]} tone="accent" size={L.text} anchor="center" opacity={progress(frame, T.liveTag, 12)}>/live → EC2</Tag>
      <Tag x={L.rewindTag[0]} y={L.rewindTag[1]} tone="accent" size={L.text} anchor="center" opacity={progress(frame, T.rwTag, 12)}>/dvr · /vod → S3</Tag>
    </AbsoluteFill>
  );
};
