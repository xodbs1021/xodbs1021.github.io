// 콘티: _workspace/blog/pokeclip-playlist-gzip/storyboard.md 「GzipGates」
// CloudFront 압축의 네 조건(compress · gzip 허용 · Content-Length · 1,000B 이상)을 요청 셋이 지난다(개념도).
// 1줄 되감기 목록: 넷 다 ✓ → gzip(138→5.5KB, 재측정 measure/raw/size.md 의 s08_gap1).
// 2줄 라이브 목록: ①② 는 켜더라도(점선) ③ 에서 ✕ — MediaMTX 가 2KB 넘는 목록을 chunked 로 보낸다.
// 3줄 조각: 목록 규칙이 아니라 /dvr/* 규칙이라 관문을 타지 않고 그대로 간다.
// layout="mobile" 은 1080×1350 휴대폰판 — 열 머리를 위 범례로 옮기고 글자 48px 이상.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const GZIP_GATES_FRAMES = 360;

type GateState = "idle" | "pass" | "maybe" | "fail" | "skip";

const GATE_STYLE = {
  idle: { background: COLOR.white, border: `4px solid ${COLOR.line}`, color: COLOR.muted },
  pass: { background: COLOR.accentSoft, border: `4px solid ${COLOR.accent}`, color: COLOR.accent },
  maybe: { background: COLOR.white, border: `4px dashed ${COLOR.accent}`, color: COLOR.accent },
  fail: { background: COLOR.dangerSoft, border: `5px solid ${COLOR.danger}`, color: COLOR.danger },
  skip: { background: COLOR.surface, border: `4px dashed ${COLOR.muted}`, color: COLOR.muted },
} as const;

const MARK = { idle: "", pass: "✓", maybe: "✓", fail: "✕", skip: "–" } as const;

const HEADS = [
  { no: "①", name: "compress" },
  { no: "②", name: "gzip 허용" },
  { no: "③", name: "Content-Length" },
  { no: "④", name: "1,000B 이상" },
] as const;

type Row = {
  readonly name: string;
  readonly rule: string;
  /** 꾸러미가 움직이기 시작 · 끝나는 프레임. */
  readonly from: number;
  readonly to: number;
  /** 0 부터 센 관문까지 가고 멈춘다(없으면 끝까지). */
  readonly stopAt?: number;
  readonly gates: (lit: readonly boolean[]) => readonly GateState[];
  readonly tag: { readonly text: string; readonly tone: "accent" | "danger" | "muted"; readonly at: number };
  readonly detail: string;
};

const ROWS: readonly Row[] = [
  {
    name: "되감기 목록",
    rule: "/dvr/*.m3u8 규칙",
    from: 20,
    to: 140,
    gates: (lit) => lit.map((l) => (l ? "pass" : "idle")),
    tag: { text: "gzip", tone: "accent", at: 136 },
    detail: "138→5.5KB",
  },
  {
    name: "라이브 목록 · 켜더라도",
    rule: "/live/*.m3u8 규칙",
    from: 140,
    to: 230,
    stopAt: 2,
    gates: (lit) => lit.map((l, i) => (!l ? "idle" : i < 2 ? "maybe" : "fail")),
    tag: { text: "길이 없음", tone: "danger", at: 214 },
    detail: "chunked",
  },
  {
    name: "조각",
    rule: "/dvr/* 규칙",
    from: 230,
    to: 300,
    gates: () => ["skip", "skip", "skip", "skip"],
    tag: { text: "압축 안 함", tone: "muted", at: 290 },
    detail: "목록 규칙 밖",
  },
];

type Layout = {
  readonly cols: readonly number[];
  readonly gate: { readonly w: number; readonly h: number; readonly mark: number };
  readonly rows: readonly number[];
  readonly lineFrom: number;
  readonly lineTo: number;
  readonly name: { readonly x: number; readonly dy: number; readonly size: number };
  readonly rule: { readonly dy: number; readonly size: number };
  /** 요청 점의 지름과 끝 위치(마지막 관문 오른쪽). */
  readonly dot: { readonly d: number; readonly end: number };
  readonly tag: { readonly x: number; readonly dy: number; readonly size: number };
  readonly detail: { readonly x: number; readonly dy: number; readonly size: number };
  readonly heads: "columns" | "legend";
  readonly headSize: number;
};

const DESKTOP: Layout = {
  cols: [700, 990, 1280, 1570],
  gate: { w: 150, h: 104, mark: 60 },
  rows: [430, 670, 910],
  lineFrom: 120,
  lineTo: 1720,
  name: { x: 120, dy: -118, size: TEXT.label },
  rule: { dy: -64, size: TEXT.small },
  dot: { d: 44, end: 1700 },
  tag: { x: 1650, dy: -116, size: TEXT.label },
  detail: { x: 1650, dy: 52, size: TEXT.small },
  heads: "columns",
  headSize: TEXT.label,
};

const MOBILE: Layout = {
  cols: [330, 520, 710, 900],
  gate: { w: 140, h: 110, mark: 64 },
  rows: [430, 790, 1150],
  lineFrom: 60,
  lineTo: 1030,
  name: { x: 60, dy: -176, size: MOBILE_TEXT.label },
  rule: { dy: -118, size: MOBILE_TEXT.small },
  dot: { d: 44, end: 1010 },
  tag: { x: 60, dy: 74, size: MOBILE_TEXT.label },
  detail: { x: 480, dy: 82, size: MOBILE_TEXT.small },
  heads: "legend",
  headSize: MOBILE_TEXT.label,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const Gate: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly mark: number;
  readonly state: GateState;
  readonly label?: string;
  readonly opacity: number;
}> = ({ x, y, w, h, mark, state, label, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      borderRadius: 22,
      boxSizing: "border-box",
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: mark,
      fontWeight: 800,
      opacity,
      ...GATE_STYLE[state],
    }}
  >
    {MARK[state] || label}
  </div>
);

export const GzipGates: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const intro = progress(frame, 0, 20);

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {L.heads === "columns"
        ? HEADS.map((h, i) => (
            <div key={h.no} style={{ opacity: intro }}>
              <Label x={L.cols[i]} y={140} size={L.headSize} weight={800} anchor="center">
                {h.no}
              </Label>
              <Label x={L.cols[i]} y={196} size={TEXT.small} color={COLOR.ink} weight={650} anchor="center">
                {h.name}
              </Label>
            </div>
          ))
        : (
          <div style={{ opacity: intro }}>
            <Label x={L.lineFrom} y={60} size={L.headSize} weight={700}>
              ① compress  ② gzip 허용
            </Label>
            <Label x={L.lineFrom} y={124} size={L.headSize} weight={700}>
              ③ Content-Length  ④ 1,000B↑
            </Label>
          </div>
        )}

      {ROWS.map((row, r) => {
        const y = L.rows[r];
        const dot = L.dot;
        const span = row.stopAt === undefined ? dot.end : L.cols[row.stopAt] - L.gate.w / 2 - dot.d / 2 - 10;
        const move = progress(frame, row.from, row.to - row.from - 10, EASE_IN_OUT);
        const start = L.lineFrom + dot.d / 2;
        const px = interpolate(move, [0, 1], [start, span]);
        const lit = L.cols.map((cx, i) => (row.stopAt === undefined ? px >= cx : i <= row.stopAt && (i < row.stopAt ? px >= cx : move >= 0.98)));
        const states = row.gates(lit);
        const done = progress(frame, row.tag.at, 12);
        const active = frame >= row.from;
        const tone = { accent: COLOR.accent, danger: COLOR.danger, muted: COLOR.muted }[row.tag.tone];
        const dotColor = row.tag.tone === "danger" && move < 0.98 ? COLOR.ink : tone;

        return (
          <div key={row.name} style={{ opacity: intro }}>
            <Label x={L.name.x} y={y + L.name.dy} size={L.name.size} weight={780}>
              {row.name}
            </Label>
            <div
              style={{
                position: "absolute",
                left: L.name.x,
                top: y + L.rule.dy,
                fontFamily: MONO,
                fontSize: L.rule.size,
                color: COLOR.muted,
                whiteSpace: "nowrap",
              }}
            >
              {row.rule}
            </div>
            <div
              style={{
                position: "absolute",
                left: L.lineFrom,
                top: y - 3,
                width: L.lineTo - L.lineFrom,
                height: 6,
                borderRadius: 3,
                background: COLOR.line,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: L.lineFrom,
                top: y - 4,
                width: active ? px - L.lineFrom : 0,
                height: 8,
                borderRadius: 4,
                background: dotColor,
              }}
            />
            {L.cols.map((cx, i) => (
              <Gate
                key={cx}
                x={cx}
                y={y}
                w={L.gate.w}
                h={L.gate.h}
                mark={L.gate.mark}
                state={states[i]}
                label={L.heads === "legend" ? HEADS[i].no : undefined}
                opacity={1}
              />
            ))}
            {/* 요청 — 선 위를 가는 점 */}
            <div
              style={{
                position: "absolute",
                left: px - dot.d / 2,
                top: y - dot.d / 2,
                width: dot.d,
                height: dot.d,
                borderRadius: "50%",
                background: dotColor,
                border: `6px solid ${COLOR.white}`,
                boxSizing: "border-box",
                boxShadow: `0 0 0 4px ${dotColor}`,
                opacity: active ? 1 : 0,
              }}
            />
            <Tag
              x={L.tag.x}
              y={y + L.tag.dy}
              tone={row.tag.tone}
              size={L.tag.size}
              opacity={done}
              scale={0.92 + 0.08 * done}
            >
              {row.tag.text}
            </Tag>
            <Label
              x={L.detail.x}
              y={y + L.detail.dy}
              size={L.detail.size}
              color={COLOR.muted}
              weight={650}
              opacity={done}
            >
              {row.detail}
            </Label>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
