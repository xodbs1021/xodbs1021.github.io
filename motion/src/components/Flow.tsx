import { COLOR, FONT, TEXT } from "../theme";

// 흐름도 · 갈래 나무의 공통 부품(상자 · 꺾은선). 위치는 장면이 계산해 넘긴다.
// 좌표는 1920×1080 캔버스의 px 이다. 화살표 하나짜리 직선은 Timeline 의 Arrow 를 쓴다.

export type NodeTone = "ink" | "accent" | "danger" | "muted";

const NODE_STYLE = {
  ink: { background: COLOR.white, border: `3px solid ${COLOR.ink}`, color: COLOR.ink },
  accent: { background: COLOR.accentSoft, border: `4px solid ${COLOR.accent}`, color: COLOR.ink },
  danger: { background: COLOR.dangerSoft, border: `4px solid ${COLOR.danger}`, color: COLOR.danger },
  muted: { background: COLOR.surface, border: `3px dashed ${COLOR.muted}`, color: COLOR.muted },
} as const;

/** 상자 안쪽 여백(px) — 글자가 테두리에 붙지 않게. */
const NODE_PADDING = { x: 24, y: 12 } as const;

type NodeProps = {
  readonly children: React.ReactNode;
  readonly x: number;
  readonly y: number;
  /** 상자 너비. 글자가 넘치면 줄을 바꾼다(글자 안의 \n 에서도 바꾼다). */
  readonly width: number;
  /** 상자 높이. 주면 글자를 세로 가운데에 두고, 꺾은선을 상자 가장자리에 정확히 붙일 수 있다. 안 주면 글자에 맞춘다. */
  readonly height?: number;
  readonly tone?: NodeTone;
  readonly size?: number;
  /** 본문 아래 회색 보충 설명. */
  readonly note?: React.ReactNode;
  /** 상자 오른쪽 위에 찍는 붉은 점 수(리뷰에서 나온 버그 수 등). */
  readonly dots?: number;
  readonly opacity?: number;
};

/** 흐름도의 상자 하나. x · y 는 상자 왼쪽 위. */
export const Node: React.FC<NodeProps> = ({
  children, x, y, width, height, tone = "ink", size = TEXT.small, note, dots = 0, opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      boxSizing: "border-box",
      padding: `${NODE_PADDING.y}px ${NODE_PADDING.x}px`,
      borderRadius: 16,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 680,
      lineHeight: 1.3,
      letterSpacing: "-0.02em",
      wordBreak: "keep-all",
      // 글자 안의 \n 은 줄바꿈으로 — 어디서 끊을지 장면이 정할 수 있게.
      whiteSpace: "pre-line",
      opacity,
      ...NODE_STYLE[tone],
    }}
  >
    {children}
    {note ? (
      <div style={{ fontSize: TEXT.small, fontWeight: 600, color: COLOR.muted, marginTop: 4 }}>{note}</div>
    ) : null}
    {dots > 0 ? (
      <div style={{ position: "absolute", top: -14, right: -14, display: "flex", gap: 6 }}>
        {Array.from({ length: dots }, (_, i) => (
          <div
            key={i}
            style={{ width: 28, height: 28, borderRadius: 999, background: COLOR.danger, border: `4px solid ${COLOR.white}` }}
          />
        ))}
      </div>
    ) : null}
  </div>
);

type WireProps = {
  /** 꺾은선이 지나는 점들([x, y]) — 두 개 이상. */
  readonly points: ReadonlyArray<readonly [number, number]>;
  readonly color?: string;
  readonly dashed?: boolean;
  /** 마지막 점에 화살촉을 그릴지. */
  readonly arrow?: boolean;
  readonly opacity?: number;
};

/** 상자를 잇는 꺾은선. 캔버스 전체를 덮는 SVG 한 장으로 그린다. */
export const Wire: React.FC<WireProps> = ({
  points, color = COLOR.ink, dashed = false, arrow = true, opacity = 1,
}) => {
  const path = points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px},${py}`).join(" ");
  const [ex, ey] = points[points.length - 1];
  const [sx, sy] = points[points.length - 2];
  const angle = Math.atan2(ey - sy, ex - sx);
  const head = 20;
  const p1 = `${ex - head * Math.cos(angle - 0.45)},${ey - head * Math.sin(angle - 0.45)}`;
  const p2 = `${ex - head * Math.cos(angle + 0.45)},${ey - head * Math.sin(angle + 0.45)}`;
  return (
    <svg style={{ position: "absolute", inset: 0, opacity }} width="100%" height="100%">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={dashed ? "14 12" : undefined}
      />
      {arrow ? <polygon points={`${ex},${ey} ${p1} ${p2}`} fill={color} /> : null}
    </svg>
  );
};
