// 콘티: _workspace/blog/h264-deep-dive/storyboard.md 「영상 1」
// 위 줄은 표시 순서 I B B P, 아래 줄은 디코딩 순서 I P B B. 한 단계에 프레임 하나를 디코딩한다:
// 지금 디코딩하는 프레임만 강조색, 그 프레임이 참조하는 이미 디코딩한 프레임에서 화살표가 그려진다.
// I에서 나가는 참조는 위 줄 위쪽 호, P에서 나가는 참조는 위 줄 아래쪽 호. 개념도(x264 -bf 3 실측 순서는 storyboard 인용).
// 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(DecodeOrderMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const DECODE_ORDER_FRAMES = 240;

/** 표시 순서의 네 프레임. refs 는 참조하는 표시 위치. */
const PICS = [
  { type: "I", n: 1, refs: [] },
  { type: "B", n: 2, refs: [0, 3] },
  { type: "B", n: 3, refs: [0, 3] },
  { type: "P", n: 4, refs: [0] },
] as const;
/** 디코딩 순서(표시 위치). */
const DECODE = [0, 3, 1, 2] as const;
const STEP_START = [18, 66, 114, 162] as const;
const STEP_LEN = 44;

type Layout = {
  readonly cardW: number;
  readonly cardH: number;
  readonly gap: number;
  readonly x0: number;
  readonly topY: number;
  readonly bottomY: number;
  readonly arcUp: number;
  readonly arcDown: number;
  readonly labelPos: "left" | "above";
  readonly text: { readonly big: number; readonly label: number; readonly small: number };
  readonly legendY: number;
  readonly legend: string;
};

const DESKTOP: Layout = {
  cardW: 210,
  cardH: 210,
  gap: 120,
  x0: 470,
  topY: 290,
  bottomY: 720,
  arcUp: 150,
  arcDown: 110,
  labelPos: "left",
  text: { big: 96, label: TEXT.label, small: TEXT.small },
  legendY: 970,
  legend: "화살표: 참조 화면 → 그 화면으로 예측하는 화면 · 숫자: 표시 순서",
};

const MOBILE: Layout = {
  cardW: 190,
  cardH: 190,
  gap: 60,
  x0: 85,
  topY: 380,
  bottomY: 940,
  arcUp: 150,
  arcDown: 120,
  labelPos: "above",
  text: { big: 88, label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
  legendY: 1210,
  legend: "숫자: 표시 순서",
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const Card: React.FC<{
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  readonly type: string; readonly n: number; readonly state: "idle" | "now" | "done";
  readonly big: number; readonly small: number; readonly opacity?: number;
}> = ({ x, y, w, h, type, n, state, big, small, opacity = 1 }) => {
  const fill = state === "now" ? COLOR.accent : state === "done" ? COLOR.surface : COLOR.white;
  const border = state === "now" ? COLOR.accent : state === "done" ? COLOR.ink : COLOR.line;
  const ink = state === "now" ? COLOR.white : state === "done" ? COLOR.ink : COLOR.muted;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box",
        border: `6px solid ${border}`, borderRadius: 18, background: fill, opacity,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: FONT, color: ink,
      }}
    >
      <div style={{ fontSize: big, fontWeight: 820, lineHeight: 1 }}>{type}</div>
      <div style={{ fontSize: small, fontWeight: 650, marginTop: 10 }}>{n}</div>
    </div>
  );
};

export const DecodeOrder: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 14);
  const cx = (i: number): number => l.x0 + i * (l.cardW + l.gap) + l.cardW / 2;
  const stepOf = (pos: number): number => DECODE.indexOf(pos as (typeof DECODE)[number]);
  const current = STEP_START.findIndex((s) => frame >= s && frame < s + STEP_LEN);

  const arcs = DECODE.flatMap((target, step) =>
    PICS[target].refs.map((ref) => ({ ref, target, step })),
  );

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.labelPos === "left" ? (
        <>
          <Label x={l.x0 - 60} y={l.topY + l.cardH / 2 - l.text.label * 0.65} size={l.text.label} weight={760} anchor="right" opacity={intro}>표시 순서</Label>
          <Label x={l.x0 - 60} y={l.bottomY + l.cardH / 2 - l.text.label * 0.65} size={l.text.label} weight={760} anchor="right" opacity={intro}>디코딩 순서</Label>
        </>
      ) : (
        <>
          <Label x={l.x0} y={l.topY - l.arcUp - l.text.label * 1.9} size={l.text.label} weight={760} opacity={intro}>표시 순서</Label>
          <Label x={l.x0} y={l.bottomY - l.text.label * 1.7} size={l.text.label} weight={760} opacity={intro}>디코딩 순서</Label>
        </>
      )}

      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
        <defs>
          <marker id="do-head-accent" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={COLOR.accent} />
          </marker>
          <marker id="do-head-muted" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={COLOR.muted} />
          </marker>
        </defs>
        {arcs.map(({ ref, target, step }) => {
          const draw = progress(frame, STEP_START[step] + 6, 22);
          if (draw <= 0) return null;
          const fromI = ref === 0;
          const dist = Math.abs(target - ref);
          // 먼 참조일수록 바깥쪽에서 출발해 더 크게 휘어, 호끼리 겹치지 않게 한다.
          const x1 = cx(ref) + (fromI ? (2 - dist) * 30 : (dist - 1.5) * 50);
          const x2 = cx(target) + (ref < target ? -18 : 18);
          const yEdge = fromI ? l.topY - 8 : l.topY + l.cardH + 8;
          const bend = fromI ? -(l.arcUp + (dist - 1) * 18) : l.arcDown * (0.55 + 0.45 * (dist - 1));
          const c = yEdge + bend * 1.33;
          const d = `M ${x1} ${yEdge} C ${x1} ${c} ${x2} ${c} ${x2} ${yEdge}`;
          const active = step === current;
          const len = 1600;
          return (
            <path
              key={`${ref}-${target}`}
              d={d}
              fill="none"
              stroke={active ? COLOR.accent : COLOR.muted}
              strokeWidth={active ? 7 : 5}
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - draw)}
              markerEnd={draw > 0.9 ? `url(#do-head-${active ? "accent" : "muted"})` : undefined}
            />
          );
        })}
      </svg>

      {PICS.map((p, i) => {
        const s = stepOf(i);
        const state = s === current ? "now" : frame >= STEP_START[s] ? "done" : "idle";
        return (
          <Card key={i} x={cx(i) - l.cardW / 2} y={l.topY} w={l.cardW} h={l.cardH} type={p.type} n={p.n}
            state={state} big={l.text.big} small={l.text.small} opacity={intro} />
        );
      })}

      {DECODE.map((pos, slot) => {
        const appear = progress(frame, STEP_START[slot] + 8, 14);
        if (appear <= 0) {
          return (
            <div key={slot} style={{ position: "absolute", left: cx(slot) - l.cardW / 2, top: l.bottomY, width: l.cardW, height: l.cardH,
              boxSizing: "border-box", border: `5px dashed ${COLOR.line}`, borderRadius: 18, opacity: intro }} />
          );
        }
        const p = PICS[pos];
        return (
          <Card key={slot} x={cx(slot) - l.cardW / 2} y={l.bottomY + (1 - appear) * -40} w={l.cardW} h={l.cardH}
            type={p.type} n={p.n} state={slot === current ? "now" : "done"} big={l.text.big} small={l.text.small} opacity={appear} />
        );
      })}

      <Label x={layout === "desktop" ? 960 : 540} y={l.legendY} size={l.text.small} anchor="center" color={COLOR.muted} opacity={intro}>
        {l.legend}
      </Label>
    </AbsoluteFill>
  );
};
