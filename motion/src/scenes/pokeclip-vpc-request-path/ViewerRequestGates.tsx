// 콘티: _workspace/blog/pokeclip-vpc-request-path/storyboard.md 「ViewerRequestGates」
// 라이브 목록 요청이 CloudFront(서명 쿠키 · live-auth) → 내부 ALB(/live 접두사 제거) → nginx(원문 경로 검사) → MediaMTX(CDN 비밀 대조)를 지난다.
// 둘째 요청 /playback/s1/list?path=s2 는 쿠키(s1)와 ALB 는 지나지만 nginx 의 경로 · 쿼리 대조에서 403 으로 멈춘다. 검사 순서는 2026-11-25 설정 기준, 움직임의 시각은 설명용.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, Wire } from "../../components/Flow";
import { Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const VIEWER_REQUEST_GATES_FRAMES = 360;

type Point = readonly [number, number];
type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Layout = {
  readonly gates: ReadonlyArray<Box>;
  /** 패킷이 멈추는 자리 — 관문 앞. */
  readonly stops: ReadonlyArray<Point>;
  readonly start: Point;
  /** 패킷 이름표 위치(패킷 기준 오프셋). */
  readonly tagOffset: Point;
  readonly okTag: (i: number) => Point;
  /** 둘째 줄 이름표(playback 요청) 위치. */
  readonly p2Tag: (i: number) => Point;
  readonly text: number; readonly packet: number; readonly tagSize: number;
};

const GATE_LABELS = ["CloudFront", "내부 ALB", "nginx", "MediaMTX"] as const;
/** 라이브 요청(청록)이 관문마다 받는 검사. */
const OK_LABELS = ["쿠키 ✓ · 함수 Bearer", "/live 제거", "원문 ✓", "CDN 비밀 ✓ 200"] as const;
/** playback 요청(빨강)이 관문마다 받는 검사 — nginx 에서 멈춘다. */
const P2_LABELS = ["쿠키 ✓ · 함수 없음", "/playback 제거", "403 · s1 ≠ s2"] as const;

const DG = { x0: 150, step: 430, y: 430, w: 360, h: 200 } as const;
const DESKTOP: Layout = {
  gates: [0, 1, 2, 3].map((i) => ({ x: DG.x0 + i * DG.step, y: DG.y, w: DG.w, h: DG.h })),
  stops: [0, 1, 2, 3].map((i) => [DG.x0 + i * DG.step - 40, DG.y + DG.h / 2] as Point),
  start: [60, DG.y + DG.h / 2],
  tagOffset: [0, -150],
  okTag: (i) => [DG.x0 + i * DG.step + DG.w / 2, DG.y + DG.h + 60],
  p2Tag: (i) => [DG.x0 + i * DG.step + DG.w / 2, DG.y + DG.h + 150],
  text: TEXT.small, packet: 32, tagSize: TEXT.small,
};
const MG = { x: 150, y0: 120, step: 300, w: 870, h: 230 } as const;
const MOBILE: Layout = {
  gates: [0, 1, 2, 3].map((i) => ({ x: MG.x, y: MG.y0 + i * MG.step, w: MG.w, h: MG.h })),
  stops: [0, 1, 2, 3].map((i) => [80, MG.y0 + i * MG.step + MG.h / 2] as Point),
  start: [80, 60],
  tagOffset: [40, -160],
  okTag: (i) => [MG.x, MG.y0 + i * MG.step + MG.h + 14],
  p2Tag: (i) => [MG.x, MG.y0 + i * MG.step + MG.h + 14],
  text: MOBILE_TEXT.small, packet: 36, tagSize: MOBILE_TEXT.small,
};
const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const HOP = 26;
const T = { fade: 20, p1: 24, p1Gap: 24, p2: 200, p2Gap: 24 } as const;

const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** start 프레임부터 관문 i 까지 간 패킷의 위치와 지난 관문 수. */
const travel = (L: Layout, frame: number, start: number, gap: number, maxGate: number) => {
  let at: Point = L.start;
  let passed = 0;
  for (let i = 0; i <= maxGate; i++) {
    const s = start + i * (HOP + gap);
    const t = progress(frame, s, HOP, EASE_IN_OUT);
    const from = i === 0 ? L.start : L.stops[i - 1];
    if (frame >= s) at = lerp(from, L.stops[i], t);
    if (t >= 1 && i < maxGate) passed = i + 1;
    if (t >= 1 && i === maxGate) passed = maxGate + 1;
  }
  return { at, passed };
};

const Packet: React.FC<{ readonly at: Point; readonly size: number; readonly color: string }> = ({ at, size, color }) => (
  <div style={{ position: "absolute", left: at[0] - size / 2, top: at[1] - size / 2, width: size, height: size, borderRadius: 999, background: color, border: `4px solid ${COLOR.white}` }} />
);

export const ViewerRequestGates: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const fade = progress(frame, 0, T.fade);
  const p1 = travel(L, frame, T.p1, T.p1Gap, 3);
  const p2 = travel(L, frame, T.p2, T.p2Gap, 2);
  const p1Visible = frame >= T.p1;
  const p2Visible = frame >= T.p2;
  const p1Label = p1.passed >= 2 ? "/s1/index.m3u8" : "/live/s1/index.m3u8";
  const p2Label = p2.passed >= 2 ? "/s1/list?path=s2" : "/playback/s1/list?path=s2";
  const p2Blocked = p2.passed >= 3;
  const wire = (i: number) => {
    const from = i === 0 ? L.start : L.stops[i - 1];
    return <Wire key={i} points={[from, L.stops[i]]} color={COLOR.muted} opacity={fade} arrow />;
  };
  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {[0, 1, 2, 3].map(wire)}
      {L.gates.map((g, i) => {
        const okTone = p1.passed > i ? "accent" : "ink";
        const tone = i === 2 && p2Blocked ? "danger" : okTone;
        const noteParts = layout === "mobile" ? [p1.passed > i ? OK_LABELS[i] : null, i < 3 && p2.passed > i ? P2_LABELS[i] : null].filter(Boolean) : [];
        const note = noteParts.length ? noteParts.join("\n") : undefined;
        return (
          <Node key={i} x={g.x} y={g.y} width={g.w} height={g.h} tone={tone} size={L.text} opacity={fade} note={note}>{GATE_LABELS[i]}</Node>
        );
      })}
      {layout === "mobile" ? null : [0, 1, 2, 3].map((i) => (
        <Tag key={`ok${i}`} x={L.okTag(i)[0]} y={L.okTag(i)[1]} tone="accent" size={L.tagSize} anchor="center" opacity={p1.passed > i ? 1 : 0}>{OK_LABELS[i]}</Tag>
      ))}
      {layout === "mobile" ? null : [0, 1, 2].map((i) => (
        <Tag key={`p2${i}`} x={L.p2Tag(i)[0]} y={L.p2Tag(i)[1]} tone={i === 2 ? "danger" : "muted"} size={L.tagSize} anchor="center" opacity={p2.passed > i ? 1 : 0}>{P2_LABELS[i]}</Tag>
      ))}
      {p1Visible ? (
        <>
          <Packet at={p1.at} size={L.packet} color={COLOR.accent} />
          <Tag x={p1.at[0] + L.tagOffset[0]} y={p1.at[1] + L.tagOffset[1]} tone="accent" size={L.tagSize} anchor={layout === "mobile" ? "left" : "center"} opacity={p1.passed < 4 ? 1 : 0}>{p1Label}</Tag>
        </>
      ) : null}
      {p2Visible ? (
        <>
          <Packet at={p2.at} size={L.packet} color={COLOR.danger} />
          <Tag x={p2.at[0] + L.tagOffset[0]} y={p2.at[1] + L.tagOffset[1]} tone="danger" size={L.tagSize} anchor={layout === "mobile" ? "left" : "center"}>{p2Blocked ? "403 · s1 ≠ s2" : p2Label}</Tag>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
