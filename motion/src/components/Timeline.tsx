import { COLOR, FONT, TEXT } from "../theme";

// 시간축 개념도의 공통 부품. 위치·애니메이션 값은 장면이 계산해 넘긴다.
// 좌표는 1920×1080 캔버스의 px 이다.

export type CellState = "live" | "gone" | "error";

const CELL_STYLE = {
  live: { background: COLOR.white, border: `3px solid ${COLOR.ink}`, color: COLOR.ink },
  gone: { background: COLOR.line, border: `3px dashed ${COLOR.muted}`, color: COLOR.muted },
  error: { background: COLOR.dangerSoft, border: `4px solid ${COLOR.danger}`, color: COLOR.danger },
} as const;

type CellProps = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly state: CellState;
  readonly label?: string;
  readonly opacity?: number;
  readonly scale?: number;
};

/** 영상 조각 하나. */
export const SegmentCell: React.FC<CellProps> = ({
  x, y, width, height, state, label, opacity = 1, scale = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      borderRadius: 14,
      boxSizing: "border-box",
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: TEXT.small,
      fontWeight: 650,
      opacity,
      transform: `scale(${scale})`,
      ...CELL_STYLE[state],
    }}
  >
    {label}
  </div>
);

type BandProps = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly opacity?: number;
};

/** 되감기 창 — 반투명 띠. */
export const WindowBand: React.FC<BandProps> = ({ x, y, width, height, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      borderRadius: 22,
      background: COLOR.accentSoft,
      border: `4px solid ${COLOR.accent}`,
      boxSizing: "border-box",
      opacity,
    }}
  />
);

type PlayheadProps = {
  readonly x: number;
  readonly top: number;
  readonly height: number;
  readonly color?: string;
  readonly opacity?: number;
};

/** 재생점 — 세로 막대와 삼각형 머리. x 는 막대 중심. */
export const Playhead: React.FC<PlayheadProps> = ({
  x, top, height, color = COLOR.ink, opacity = 1,
}) => (
  <div style={{ position: "absolute", left: x - 18, top, width: 36, height, opacity }}>
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: "18px solid transparent",
        borderRight: "18px solid transparent",
        borderTop: `26px solid ${color}`,
      }}
    />
    <div style={{ marginLeft: 15, width: 6, height: height - 26, background: color }} />
  </div>
);

type TagTone = "ink" | "accent" | "danger" | "muted";

const TAG_STYLE = {
  ink: { background: COLOR.ink, color: COLOR.white },
  accent: { background: COLOR.accent, color: COLOR.white },
  danger: { background: COLOR.danger, color: COLOR.white },
  muted: { background: COLOR.surface, color: COLOR.muted },
} as const;

type TagProps = {
  readonly children: React.ReactNode;
  readonly x: number;
  readonly y: number;
  readonly tone?: TagTone;
  readonly size?: number;
  readonly opacity?: number;
  readonly scale?: number;
  /** x 를 태그의 가운데로 볼지 왼쪽 끝으로 볼지. */
  readonly anchor?: "left" | "center";
};

/** 둥근 이름표. */
export const Tag: React.FC<TagProps> = ({
  children, x, y, tone = "ink", size = TEXT.label, opacity = 1, scale = 1, anchor = "left",
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translateX(${anchor === "center" ? "-50%" : "0"}) scale(${scale})`,
      transformOrigin: "center",
      padding: "8px 22px",
      borderRadius: 999,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      whiteSpace: "nowrap",
      opacity,
      ...TAG_STYLE[tone],
    }}
  >
    {children}
  </div>
);

type TextProps = {
  readonly children: React.ReactNode;
  readonly x: number;
  readonly y: number;
  readonly size?: number;
  readonly color?: string;
  readonly weight?: number;
  readonly opacity?: number;
  readonly anchor?: "left" | "center" | "right";
};

/** 맨 글자 라벨. */
export const Label: React.FC<TextProps> = ({
  children, x, y, size = TEXT.label, color = COLOR.ink, weight = 650, opacity = 1, anchor = "left",
}) => {
  const shift = anchor === "center" ? "-50%" : anchor === "right" ? "-100%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(${shift})`,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        color,
        whiteSpace: "nowrap",
        letterSpacing: "-0.02em",
        opacity,
      }}
    >
      {children}
    </div>
  );
};

type ArrowProps = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color?: string;
  readonly dashed?: boolean;
  /** 0→1 로 화살표가 그려지는 정도. */
  readonly draw?: number;
};

/** 두 점을 잇는 화살표. 캔버스 전체를 덮는 SVG 한 장으로 그린다. */
export const Arrow: React.FC<ArrowProps> = ({
  x1, y1, x2, y2, color = COLOR.ink, dashed = false, draw = 1,
}) => {
  const ex = x1 + (x2 - x1) * draw;
  const ey = y1 + (y2 - y1) * draw;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 22;
  const p1 = `${ex - head * Math.cos(angle - 0.45)},${ey - head * Math.sin(angle - 0.45)}`;
  const p2 = `${ex - head * Math.cos(angle + 0.45)},${ey - head * Math.sin(angle + 0.45)}`;
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <line
        x1={x1} y1={y1} x2={ex} y2={ey}
        stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={dashed ? "16 14" : undefined}
      />
      {draw > 0.05 ? <polygon points={`${ex},${ey} ${p1} ${p2}`} fill={color} /> : null}
    </svg>
  );
};
