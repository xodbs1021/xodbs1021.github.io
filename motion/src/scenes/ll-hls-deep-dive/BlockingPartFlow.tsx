// 콘티: _workspace/blog/ll-hls-deep-dive/storyboard.md 「영상 1」
// 플레이어는 _HLS_msn=42&_HLS_part=2 로 다음 파트가 든 목록을 보류 요청하고, 직전 목록의 PRELOAD-HINT 가 가리킨 파트 2도 함께 요청한다.
// 서버는 두 요청을 붙잡아 두었다가 파트 2가 완성되는 순간 둘 다 답하고(개정 초안 6.2.5.2 · 6.2.6),
// 플레이어는 곧바로 파트 3으로 같은 요청을 건다. 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(BlockingPartFlowMobile).
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { Box } from "../../components/Stations";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const BLOCKING_PART_FLOW_FRAMES = 330;

const DRAW = 14;
/** 파트 2가 완성되는 프레임, 파트 3이 차기 시작하는 프레임. */
const PART2 = { from: 20, done: 150 } as const;
const PART3 = { from: 214, done: 330 } as const;

type Msg = { readonly dir: "right" | "left"; readonly start: number; readonly key: string; readonly accent?: boolean };
const MSGS: readonly Msg[] = [
  { dir: "right", start: 26, key: "pl2" },
  { dir: "right", start: 44, key: "hint2" },
  { dir: "left", start: 154, key: "res-pl", accent: true },
  { dir: "left", start: 168, key: "res-p2", accent: true },
  { dir: "right", start: 210, key: "pl3" },
  { dir: "right", start: 226, key: "hint3" },
];

type Layout = {
  readonly lane: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
  readonly head: { readonly y: number; readonly w: number; readonly h: number };
  readonly parts: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly gap: number };
  readonly partsLabel: { readonly x: number; readonly y: number };
  readonly msgY: Readonly<Record<string, number>>;
  readonly hold: readonly { readonly y: number }[];
  readonly holdX: number;
  readonly text: { readonly head: number; readonly msg: number; readonly part: number };
  readonly copy: Readonly<Record<string, string>>;
};

const DESKTOP: Layout = {
  lane: { left: 360, right: 1560, top: 340, bottom: 1030 },
  head: { y: 290, w: 300, h: 96 },
  parts: { x: 560, y: 60, w: 190, h: 90, gap: 14 },
  partsLabel: { x: 540, y: 82 },
  msgY: { pl2: 400, hint2: 480, "res-pl": 620, "res-p2": 700, pl3: 840, hint3: 920 },
  hold: [{ y: 420 }, { y: 860 }],
  holdX: 1590,
  text: { head: TEXT.label, msg: TEXT.small, part: TEXT.small },
  copy: {
    player: "플레이어",
    server: "서버",
    parts: "seg42",
    pl2: "목록 ?_HLS_msn=42&_HLS_part=2",
    hint2: "GET 파트 2 (PRELOAD-HINT)",
    "res-pl": "200 목록: PART 2 · 힌트 3",
    "res-p2": "200 파트 2",
    pl3: "목록 ?_HLS_msn=42&_HLS_part=3",
    hint3: "GET 파트 3 (PRELOAD-HINT)",
    hold: "보류",
  },
};

const MOBILE: Layout = {
  lane: { left: 170, right: 910, top: 400, bottom: 1320 },
  head: { y: 350, w: 280, h: 96 },
  parts: { x: 250, y: 60, w: 180, h: 100, gap: 12 },
  partsLabel: { x: 40, y: 84 },
  msgY: { pl2: 470, hint2: 590, "res-pl": 760, "res-p2": 880, pl3: 1050, hint3: 1170 },
  hold: [{ y: 610 }, { y: 1190 }],
  holdX: 740,
  text: { head: MOBILE_TEXT.label, msg: MOBILE_TEXT.small, part: MOBILE_TEXT.small },
  copy: {
    player: "플레이어",
    server: "서버",
    parts: "seg42",
    pl2: "목록 part=2",
    hint2: "파트 2 미리",
    "res-pl": "목록 + 힌트 3",
    "res-p2": "파트 2",
    pl3: "목록 part=3",
    hint3: "파트 3 미리",
    hold: "보류",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 파트 칸: 다 찼으면 실선, 차는 중이면 회색이 왼쪽부터 찬다. */
const PartCell: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly label: string;
  readonly fill: number;
  readonly size: number;
  readonly accent: boolean;
  readonly opacity: number;
}> = ({ x, y, w, h, label, fill, size, accent, opacity }) => {
  const full = fill >= 1;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 12,
        boxSizing: "border-box",
        border: `4px ${full ? "solid" : "dashed"} ${full ? (accent ? COLOR.accent : COLOR.ink) : COLOR.muted}`,
        background: full && accent ? COLOR.accentSoft : COLOR.white,
        overflow: "hidden",
        opacity,
      }}
    >
      {full ? null : <div style={{ width: `${fill * 100}%`, height: "100%", background: COLOR.line }} />}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontFamily: FONT,
          fontSize: size,
          fontWeight: 700,
          color: full ? (accent ? COLOR.accent : COLOR.ink) : COLOR.muted,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const BlockingPartFlow: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 14);
  const fill2 = interpolate(frame, [PART2.from, PART2.done], [0, 1], CLAMP);
  const fill3 = interpolate(frame, [PART3.from, PART3.done - 10], [0, 0.95], CLAMP);
  const parts = [
    { label: "파트 0", fill: 1, accent: false },
    { label: "파트 1", fill: 1, accent: false },
    { label: "파트 2", fill: fill2, accent: true },
    { label: "파트 3", fill: fill3, accent: false },
  ];
  const holds = [
    interpolate(frame, [52, 60, 150, 156], [0, 1, 1, 0], CLAMP),
    interpolate(frame, [234, 242, 330, 331], [0, 1, 1, 1], CLAMP),
  ];
  const mobile = layout === "mobile";

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={l.partsLabel.x} y={l.partsLabel.y} size={l.text.part} weight={760} color={COLOR.muted} anchor={mobile ? "left" : "right"} opacity={intro}>
        {l.copy.parts}
      </Label>
      {parts.map((p, i) =>
        mobile ? (
          <PartCell
            key={p.label}
            x={l.parts.x + i * (l.parts.w + l.parts.gap)}
            y={l.parts.y}
            w={l.parts.w}
            h={l.parts.h}
            label={`${i}`}
            fill={p.fill}
            size={l.text.part}
            accent={p.accent}
            opacity={intro}
          />
        ) : (
          <PartCell
            key={p.label}
            x={l.parts.x + i * (l.parts.w + l.parts.gap)}
            y={l.parts.y}
            w={l.parts.w}
            h={l.parts.h}
            label={p.label}
            fill={p.fill}
            size={l.text.part}
            accent={p.accent}
            opacity={intro}
          />
        ),
      )}

      {/* 두 세로선과 머리 상자. */}
      {[l.lane.left, l.lane.right].map((x) => (
        <div key={x} style={{ position: "absolute", left: x - 3, top: l.lane.top, width: 6, height: l.lane.bottom - l.lane.top, background: COLOR.line, opacity: intro }} />
      ))}
      <Box x={l.lane.left} y={l.head.y} w={l.head.w} h={l.head.h} label={l.copy.player} size={l.text.head} opacity={intro} />
      <Box x={l.lane.right} y={l.head.y} w={l.head.w} h={l.head.h} label={l.copy.server} size={l.text.head} opacity={intro} />

      {MSGS.map((m) => {
        const draw = progress(frame, m.start, DRAW);
        if (draw <= 0) return null;
        const y = l.msgY[m.key];
        const [x1, x2] = m.dir === "right" ? [l.lane.left + 10, l.lane.right - 14] : [l.lane.right - 10, l.lane.left + 14];
        const color = m.accent ? COLOR.accent : COLOR.ink;
        return (
          <div key={m.key}>
            <Arrow x1={x1} y1={y} x2={x2} y2={y} color={color} draw={draw} />
            <Label x={(l.lane.left + l.lane.right) / 2} y={y - l.text.msg * 1.45} size={l.text.msg} weight={700} color={color} anchor="center" opacity={draw}>
              {l.copy[m.key]}
            </Label>
          </div>
        );
      })}

      {holds.map((h, i) => (
        <Tag key={l.hold[i].y} x={l.holdX} y={l.hold[i].y} tone="muted" size={l.text.msg} opacity={h}>
          {l.copy.hold}
        </Tag>
      ))}
    </AbsoluteFill>
  );
};
