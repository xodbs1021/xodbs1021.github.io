// 콘티: _workspace/blog/cdn-for-live-streaming/storyboard.md 「CoalesceTiers」
// 새 조각 하나에 시청자 요청 200건이 엣지 4대로 흩어져 들어온다(엣지 i%4, 실측 구성과 같음).
// 각 엣지는 50건 중 한 건만 실드로 올리고(proxy_cache_lock), 실드는 4건 중 한 건만 원본으로 올린다.
// 원본 응답 하나가 실드 → 엣지 4대 → 시청자 200명으로 내려간다.
// 숫자 200 → 4 → 1 은 2026-11-13 nginx 1.31.3 실측(합치기 켬, 6/6회), 움직임의 시각은 설명용이다.
// layout="mobile" 은 1080×1350 휴대폰판(CoalesceTiersMobile) — 위에서 아래로 쌓는다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, Wire } from "../../components/Flow";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const COALESCE_TIERS_FRAMES = 360;

const VIEWERS = 200;
const EDGES = 4;

// 시각(프레임)
const T = {
  reqStart: 14, // 시청자 → 엣지 요청이 떠나기 시작
  reqSpread: 50, // 200건이 떠나는 데 걸리는 프레임
  reqTravel: 26,
  edgeUp: 104, // 엣지 → 실드
  shieldUp: 144, // 실드 → 원본
  up: 30,
  originHold: 180, // 원본이 응답을 만든다
  resp1: 196, // 원본 → 실드
  resp2: 222, // 실드 → 엣지
  resp3: 248, // 엣지 → 시청자
  resp: 24,
} as const;

type Point = readonly [number, number];
type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Layout = {
  readonly viewer: (i: number) => Point;
  readonly dot: number;
  readonly edge: (k: number) => Box;
  readonly shield: Box;
  readonly origin: Box;
  readonly edgeIn: (k: number) => Point;
  readonly edgeOut: (k: number) => Point;
  readonly shieldIn: (k: number) => Point;
  readonly shieldOut: Point;
  readonly originIn: Point;
  readonly count: { readonly viewers: Point; readonly shield: Point; readonly origin: Point };
  readonly countAnchor: "left" | "center";
  readonly title: Point | null;
  /** 엣지 상자 둘째 줄: [위로 한 건만 올릴 때, 응답을 내줄 때]. */
  readonly edgeNote: readonly [string, string];
  readonly text: { readonly label: number; readonly small: number };
};

// 데스크톱: 왼쪽 시청자 격자 → 엣지 4대 → 실드 → 원본
const DG = { x0: 130, y0: 200, cols: 10, gap: 34 } as const;
const DE = { x: 600, w: 300, h: 132, y0: 160, step: 186 } as const;
const DS: Box = { x: 1080, y: 380, w: 300, h: 160 };
const DO: Box = { x: 1530, y: 380, w: 280, h: 160 };
const DESKTOP: Layout = {
  viewer: (i) => [DG.x0 + (i % DG.cols) * DG.gap, DG.y0 + Math.floor(i / DG.cols) * DG.gap],
  dot: 20,
  edge: (k) => ({ x: DE.x, y: DE.y0 + k * DE.step, w: DE.w, h: DE.h }),
  shield: DS,
  origin: DO,
  edgeIn: (k) => [DE.x, DE.y0 + k * DE.step + DE.h / 2],
  edgeOut: (k) => [DE.x + DE.w, DE.y0 + k * DE.step + DE.h / 2],
  shieldIn: (k) => [DS.x, DS.y + 30 + k * ((DS.h - 60) / (EDGES - 1))],
  shieldOut: [DS.x + DS.w, DS.y + DS.h / 2],
  originIn: [DO.x, DO.y + DO.h / 2],
  count: {
    viewers: [DG.x0 + ((DG.cols - 1) * DG.gap) / 2, 900],
    shield: [DS.x + DS.w / 2, DS.y + DS.h + 40],
    origin: [DO.x + DO.w / 2, DO.y + DO.h + 40],
  },
  countAnchor: "center",
  title: [DG.x0 + ((DG.cols - 1) * DG.gap) / 2, 110],
  edgeNote: ["1건만 위로", "50건 응답"],
  text: { label: TEXT.label, small: TEXT.small },
};

// 휴대폰: 위 시청자 격자 → 엣지 4대 한 줄 → 실드 → 원본
const MG = { x0: 92, y0: 170, cols: 20, gap: 47 } as const;
const ME = { x0: 40, w: 230, gap: 13, y: 680, h: 160 } as const;
const MS: Box = { x: 60, y: 950, w: 400, h: 130 };
const MO: Box = { x: 60, y: 1170, w: 400, h: 130 };
const MOBILE: Layout = {
  viewer: (i) => [MG.x0 + (i % MG.cols) * MG.gap, MG.y0 + Math.floor(i / MG.cols) * MG.gap],
  dot: 20,
  edge: (k) => ({ x: ME.x0 + k * (ME.w + ME.gap), y: ME.y, w: ME.w, h: ME.h }),
  shield: MS,
  origin: MO,
  edgeIn: (k) => [ME.x0 + k * (ME.w + ME.gap) + ME.w / 2, ME.y],
  edgeOut: (k) => [ME.x0 + k * (ME.w + ME.gap) + ME.w / 2, ME.y + ME.h],
  shieldIn: (k) => [MS.x + 50 + k * ((MS.w - 100) / (EDGES - 1)), MS.y],
  shieldOut: [MS.x + MS.w / 2, MS.y + MS.h],
  originIn: [MO.x + MO.w / 2, MO.y],
  count: {
    viewers: [540, 60],
    shield: [MS.x + MS.w + 40, MS.y + 32],
    origin: [MO.x + MO.w + 40, MO.y + 32],
  },
  countAnchor: "left",
  title: null,
  edgeNote: ["1건만", "50건"],
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** 움직이는 패킷(점). */
const Packet: React.FC<{ readonly at: Point; readonly size: number; readonly color: string }> = ({ at, size, color }) => (
  <div
    style={{
      position: "absolute", left: at[0] - size / 2, top: at[1] - size / 2, width: size, height: size,
      borderRadius: 999, background: color,
    }}
  />
);

const moving = (t: number) => t > 0 && t < 1;

export const CoalesceTiers: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 12);

  // 요청 i 가 떠나는 시각 — i 순서로 흩뿌리고 엣지는 i % 4(실측 클라이언트와 같은 배정).
  const reqLeave = (i: number) => T.reqStart + (i / VIEWERS) * T.reqSpread;
  const reqT = (i: number) => progress(frame, reqLeave(i), T.reqTravel, EASE_IN_OUT);
  const arrived = (k: number) => {
    let n = 0;
    for (let i = k; i < VIEWERS; i += EDGES) if (frame >= reqLeave(i) + T.reqTravel) n += 1;
    return n;
  };

  const up1 = progress(frame, T.edgeUp, T.up, EASE_IN_OUT);
  const up2 = progress(frame, T.shieldUp, T.up, EASE_IN_OUT);
  const r1 = progress(frame, T.resp1, T.resp, EASE_IN_OUT);
  const r2 = progress(frame, T.resp2, T.resp, EASE_IN_OUT);
  const r3 = progress(frame, T.resp3, T.resp, EASE_IN_OUT);

  const shieldLit = frame >= T.resp1 + T.resp;
  const edgesLit = frame >= T.resp2 + T.resp;
  const viewersLit = r3 > 0.5;
  const dot = l.dot;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 연결선 */}
      {Array.from({ length: EDGES }, (_, k) => (
        <Wire key={`w${k}`} points={[l.edgeOut(k), l.shieldIn(k)]} color={COLOR.line} arrow={false} opacity={intro} />
      ))}
      <Wire points={[l.shieldOut, l.originIn]} color={COLOR.line} arrow={false} opacity={intro} />

      {/* 시청자 200명 */}
      {Array.from({ length: VIEWERS }, (_, i) => {
        const [x, y] = l.viewer(i);
        return (
          <div
            key={`v${i}`}
            style={{
              position: "absolute", left: x - dot / 2, top: y - dot / 2, width: dot, height: dot,
              borderRadius: 999, boxSizing: "border-box", opacity: intro,
              border: `3px solid ${viewersLit ? COLOR.accent : COLOR.muted}`,
              background: viewersLit ? COLOR.accent : COLOR.white,
            }}
          />
        );
      })}

      {/* 엣지 4대 */}
      {Array.from({ length: EDGES }, (_, k) => {
        const b = l.edge(k);
        const n = arrived(k);
        const waiting = frame >= T.edgeUp && !edgesLit;
        return (
          <Node key={`e${k}`} x={b.x} y={b.y} width={b.w} height={b.h} tone={edgesLit ? "accent" : "ink"} size={l.text.label} opacity={intro}>
            {`엣지 ${k + 1}`}
            <div style={{ fontSize: l.text.small, fontWeight: 650, color: COLOR.muted }}>
              {edgesLit ? l.edgeNote[1] : waiting ? l.edgeNote[0] : n > 0 ? `${n}건` : " "}
            </div>
          </Node>
        );
      })}

      <Node x={l.shield.x} y={l.shield.y} width={l.shield.w} height={l.shield.h} tone={shieldLit ? "accent" : "ink"} size={l.text.label} opacity={intro}>
        실드
      </Node>
      <Node x={l.origin.x} y={l.origin.y} width={l.origin.w} height={l.origin.h} tone={frame >= T.originHold ? "accent" : "ink"} size={l.text.label} opacity={intro}>
        원본
      </Node>

      {/* 요청 패킷: 시청자 → 엣지 */}
      {Array.from({ length: VIEWERS }, (_, i) => {
        const t = reqT(i);
        return moving(t) ? <Packet key={`r${i}`} at={lerp(l.viewer(i), l.edgeIn(i % EDGES), t)} size={dot * 0.7} color={COLOR.ink} /> : null;
      })}

      {/* 엣지 → 실드: 엣지마다 한 건 / 실드 → 원본: 한 건 */}
      {moving(up1)
        ? Array.from({ length: EDGES }, (_, k) => <Packet key={`u${k}`} at={lerp(l.edgeOut(k), l.shieldIn(k), up1)} size={dot} color={COLOR.ink} />)
        : null}
      {moving(up2) ? <Packet at={lerp(l.shieldOut, l.originIn, up2)} size={dot} color={COLOR.ink} /> : null}

      {/* 응답: 원본 → 실드 → 엣지 → 시청자 */}
      {moving(r1) ? <Packet at={lerp(l.originIn, l.shieldOut, r1)} size={dot * 1.2} color={COLOR.accent} /> : null}
      {moving(r2)
        ? Array.from({ length: EDGES }, (_, k) => <Packet key={`d${k}`} at={lerp(l.shieldIn(k), l.edgeOut(k), r2)} size={dot * 1.2} color={COLOR.accent} />)
        : null}
      {moving(r3)
        ? Array.from({ length: VIEWERS }, (_, i) => (
            <Packet key={`b${i}`} at={lerp(l.edgeIn(i % EDGES), l.viewer(i), r3)} size={dot * 0.6} color={COLOR.accent} />
          ))
        : null}

      {/* 개수 이름표 */}
      {l.title ? (
        <Label x={l.title[0]} y={l.title[1]} anchor="center" size={l.text.small} color={COLOR.muted} opacity={intro}>
          시청자 200명
        </Label>
      ) : null}
      <Tag x={l.count.viewers[0]} y={l.count.viewers[1]} anchor="center" tone="ink" size={l.text.small} opacity={progress(frame, T.reqStart + 6, 10)}>
        새 조각 요청 200건
      </Tag>
      <Tag x={l.count.shield[0]} y={l.count.shield[1]} anchor={l.countAnchor} tone="ink" size={l.text.small} opacity={progress(frame, T.edgeUp + T.up, 10)}>
        실드에 4건
      </Tag>
      <Tag x={l.count.origin[0]} y={l.count.origin[1]} anchor={l.countAnchor} tone="accent" size={l.text.small} opacity={progress(frame, T.shieldUp + T.up, 10)}>
        원본에 1건
      </Tag>
    </AbsoluteFill>
  );
};
