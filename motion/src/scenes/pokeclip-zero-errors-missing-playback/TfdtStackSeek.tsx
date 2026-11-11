// 콘티: _workspace/blog/pokeclip-zero-errors-missing-playback/storyboard.md 「영상 1」
// 목록은 조각을 141.97초에 걸쳐 차례로 놓으라고 하지만, 조각마다 tfdt 가 0 근처에서 다시 시작해 겹쳐 놓인다.
// 브라우저 구간은 80.03초에서 멈추고(오류 0건), 60초로 탐색하면 87초 장면이 나온다(2026-08-19 실측).
// 조각 수 · 겹침 모양은 단순화한 개념도다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Playhead, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const TFDT_STACK_SEEK_FRAMES = 330;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤에는 1초 이상 멈춘다. */
const T = {
  intro: 0,
  drop: 30,
  dropStep: 7,
  dropFrames: 24,
  buffer: 125,
  bufferFrames: 30,
  missing: 160,
  errors: 178,
  seek: 205,
  landed: 238,
} as const;
const FADE = 12;

const DECLARED = 141.97;
const BUFFERED = 80.03;
const SEEK_TO = 60;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly labelX: number;
  readonly x0: number;
  readonly x1: number;
  readonly cells: number;
  readonly cellH: number;
  readonly list: { readonly labelY: number; readonly y: number; readonly axisY: number };
  readonly placed: { readonly labelY: number; readonly y: number; readonly tagX: number };
  readonly buf: { readonly labelY: number; readonly y: number; readonly h: number; readonly tagY: number };
  readonly errorsAt: { readonly x: number; readonly y: number };
  readonly seekTag: { readonly x: number; readonly y: number; readonly anchor: "left" | "center" };
  readonly landedTag: { readonly x: number; readonly y: number; readonly anchor: "left" | "center" };
  readonly playhead: { readonly top: number; readonly height: number };
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
  readonly copy: {
    readonly list: string;
    readonly placed: string;
    readonly zero: string;
    readonly buf: string;
    readonly missing: string;
    readonly errors: string;
    readonly seek: string;
    readonly landed: string;
  };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "파일마다 0에서 시작하는 시각을 이어 붙이면" }],
  labelX: 120,
  x0: 440,
  x1: 1800,
  cells: 9,
  cellH: 84,
  list: { labelY: 172, y: 160, axisY: 256 },
  placed: { labelY: 382, y: 370, tagX: 1220 },
  buf: { labelY: 556, y: 560, h: 46, tagY: 630 },
  errorsAt: { x: 120, y: 760 },
  seekTag: { x: 1015, y: 760, anchor: "center" },
  landedTag: { x: 1015, y: 860, anchor: "center" },
  playhead: { top: 140, height: 490 },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
  copy: {
    list: "목록",
    placed: "놓인 자리",
    zero: "조각마다 시각 0부터",
    buf: "브라우저",
    missing: "61.94초 안 보임",
    errors: "hls.js 오류 0건",
    seek: "60초로 탐색",
    landed: "화면은 87초 장면",
  },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "파일마다 0에서 시작하는 시각을" },
    { y: 124, text: "이어 붙이면" },
  ],
  labelX: 60,
  x0: 60,
  x1: 1020,
  cells: 6,
  cellH: 84,
  list: { labelY: 214, y: 290, axisY: 388 },
  placed: { labelY: 480, y: 556, tagX: 470 },
  buf: { labelY: 676, y: 752, h: 46, tagY: 818 },
  errorsAt: { x: 60, y: 940 },
  seekTag: { x: 60, y: 1050, anchor: "left" },
  landedTag: { x: 60, y: 1150, anchor: "left" },
  playhead: { top: 270, height: 540 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  copy: {
    list: "목록",
    placed: "놓인 자리",
    zero: "시각 0부터",
    buf: "브라우저",
    missing: "61.94초 안 보임",
    errors: "hls.js 오류 0건",
    seek: "60초로 탐색",
    landed: "화면은 87초 장면",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type BarProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly fill: string;
  readonly border: string;
  readonly opacity?: number;
  readonly dashed?: boolean;
  readonly children?: React.ReactNode;
  readonly size?: number;
  readonly color?: string;
};

const Bar: React.FC<BarProps> = ({ x, y, w, h, fill, border, opacity = 1, dashed = false, children, size, color }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 12,
      background: fill,
      border: `4px ${dashed ? "dashed" : "solid"} ${border}`,
      boxSizing: "border-box",
      opacity,
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      color,
    }}
  >
    {children}
  </div>
);

export const TfdtStackSeek: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;

  const width = l.x1 - l.x0;
  const atSec = (s: number) => l.x0 + (width * s) / DECLARED;
  const cellW = width / l.cells;
  const bufEnd = atSec(BUFFERED);
  const placedStep = (bufEnd - l.x0 - cellW) / (l.cells - 1);

  const intro = progress(frame, T.intro, 15);
  const zeroTag = progress(frame, T.drop + T.dropStep * (l.cells - 1) + T.dropFrames, FADE);
  const buffer = progress(frame, T.buffer, T.bufferFrames, EASE_IN_OUT);
  const missing = progress(frame, T.missing, FADE);
  const errors = progress(frame, T.errors, FADE);
  const seek = progress(frame, T.seek, FADE);
  const landed = progress(frame, T.landed, FADE);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.labelX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 1행: 목록이 말하는 자리. */}
      <Label x={l.labelX} y={l.list.labelY} size={l.text.label} weight={700} opacity={intro}>
        {c.list}
      </Label>
      {Array.from({ length: l.cells }, (_, i) => (
        <Bar
          key={`list-${i}`}
          x={l.x0 + i * cellW + 3}
          y={l.list.y}
          w={cellW - 6}
          h={l.cellH}
          fill={COLOR.surface}
          border={COLOR.muted}
          opacity={intro}
          size={l.text.tag}
          color={COLOR.muted}
        >
          {i + 1}
        </Bar>
      ))}
      <Label x={l.x0} y={l.list.axisY} size={l.text.tag} color={COLOR.muted} weight={650} opacity={intro}>
        0초
      </Label>
      <Label x={l.x1} y={l.list.axisY} size={l.text.tag} color={COLOR.muted} weight={650} opacity={intro} anchor="right">
        141.97초
      </Label>

      {/* 2행: 시각이 0 근처라 겹쳐 놓인 조각. */}
      <Label x={l.labelX} y={l.placed.labelY} size={l.text.label} weight={700} opacity={intro}>
        {c.placed}
      </Label>
      <Tag x={l.placed.tagX} y={l.placed.labelY - 4} tone="muted" size={l.text.tag} opacity={zeroTag}>
        {c.zero}
      </Tag>
      {Array.from({ length: l.cells }, (_, i) => {
        const p = progress(frame, T.drop + i * T.dropStep, T.dropFrames, EASE_IN_OUT);
        const fromX = l.x0 + i * cellW + 3;
        const toX = l.x0 + i * placedStep;
        const x = interpolate(p, [0, 1], [fromX, toX]);
        const y = interpolate(p, [0, 1], [l.list.y, l.placed.y]);
        return (
          <Bar
            key={`placed-${i}`}
            x={x}
            y={y}
            w={cellW - 6}
            h={l.cellH}
            fill={COLOR.accentSoft}
            border={COLOR.accent}
            opacity={p > 0 ? 0.82 : 0}
          />
        );
      })}

      {/* 3행: 브라우저가 잡은 구간. 80.03초에서 멈추고 나머지는 보이지 않는다. */}
      <Label x={l.labelX} y={l.buf.labelY} size={l.text.label} weight={700} opacity={intro}>
        {c.buf}
      </Label>
      <Bar
        x={l.x0}
        y={l.buf.y}
        w={Math.max(0, (bufEnd - l.x0) * buffer)}
        h={l.buf.h}
        fill={COLOR.accentSoft}
        border={COLOR.accent}
        opacity={buffer > 0 ? 1 : 0}
      />
      <Label x={bufEnd - 8} y={l.buf.tagY} size={l.text.tag} color={COLOR.accent} weight={760} opacity={missing} anchor="right">
        80.03초
      </Label>
      <Bar x={bufEnd + 8} y={l.buf.y} w={l.x1 - bufEnd - 8} h={l.buf.h} fill={COLOR.dangerSoft} border={COLOR.danger} opacity={missing} dashed />
      <Tag x={(bufEnd + l.x1) / 2} y={l.buf.tagY} tone="danger" size={l.text.tag} anchor="center" opacity={missing}>
        {c.missing}
      </Tag>
      <Tag x={l.errorsAt.x} y={l.errorsAt.y} tone="ink" size={l.text.tag} opacity={errors}>
        {c.errors}
      </Tag>

      {/* 60초로 탐색하면 87초 장면. */}
      <Playhead x={atSec(SEEK_TO)} top={l.playhead.top} height={l.playhead.height} opacity={seek} />
      <Tag x={l.seekTag.x} y={l.seekTag.y} tone="ink" size={l.text.tag} anchor={l.seekTag.anchor} opacity={seek}>
        {c.seek}
      </Tag>
      <Tag x={l.landedTag.x} y={l.landedTag.y} tone="danger" size={l.text.tag} anchor={l.landedTag.anchor} opacity={landed}>
        {c.landed}
      </Tag>
    </AbsoluteFill>
  );
};
