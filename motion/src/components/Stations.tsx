// 상자 · 점 · 직선 — 구성 요소 사이를 점이 오가는 반복 클립에 쓰는 작은 부품.
// 좌표는 모두 가운데 기준이고, 색은 theme.ts 의 COLOR 만 쓴다.
import { interpolate } from "remotion";
import { EASE_IN_OUT, progress } from "../lib/motion";
import { COLOR, FONT } from "../theme";

export type Tone = "ink" | "muted" | "accent" | "danger";

const BOX_TONE = {
  ink: { background: COLOR.white, border: COLOR.ink, color: COLOR.ink },
  muted: { background: COLOR.surface, border: COLOR.muted, color: COLOR.muted },
  accent: { background: COLOR.accentSoft, border: COLOR.accent, color: COLOR.accent },
  danger: { background: COLOR.dangerSoft, border: COLOR.danger, color: COLOR.danger },
} as const;

type BoxProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly label: string;
  readonly size: number;
  readonly tone?: Tone;
  readonly dashed?: boolean;
  readonly opacity?: number;
};

/** 가운데 기준 상자. 높이를 정해 두어 글자 길이로 크기가 바뀌지 않는다. */
export const Box: React.FC<BoxProps> = ({ x, y, w, h, label, size, tone = "ink", dashed = false, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      borderRadius: 16,
      boxSizing: "border-box",
      background: BOX_TONE[tone].background,
      border: `5px ${dashed ? "dashed" : "solid"} ${BOX_TONE[tone].border}`,
      color: BOX_TONE[tone].color,
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 740,
      whiteSpace: "nowrap",
      opacity,
    }}
  >
    {label}
  </div>
);

/** 경로를 따라 움직이는 둥근 점. */
export const Dot: React.FC<{ x: number; y: number; color: string; opacity?: number; r?: number }> = ({ x, y, color, opacity = 1, r = 22 }) => (
  <div
    style={{
      position: "absolute",
      left: x - r,
      top: y - r,
      width: r * 2,
      height: r * 2,
      borderRadius: 999,
      background: color,
      boxShadow: `0 0 0 6px ${COLOR.white}`,
      opacity,
    }}
  />
);

/** 두 점 사이 직선(화면 전체를 덮는 svg 한 장에 그린다). */
export const Lines: React.FC<{
  lines: readonly { x1: number; y1: number; x2: number; y2: number; color?: string; dashed?: boolean; width?: number; opacity?: number }[];
}> = ({ lines }) => (
  <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
    {lines.map((l, i) => (
      <line
        key={i}
        x1={l.x1}
        y1={l.y1}
        x2={l.x2}
        y2={l.y2}
        stroke={l.color ?? COLOR.line}
        strokeWidth={l.width ?? 8}
        strokeLinecap="round"
        strokeDasharray={l.dashed ? "16 14" : undefined}
        opacity={l.opacity ?? 1}
      />
    ))}
  </svg>
);

/** [start, end] 프레임 동안 a → b 로 가는 점의 좌표. */
export const travel = (
  frame: number,
  start: number,
  end: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } => {
  const t = progress(frame, start, end - start, EASE_IN_OUT);
  return { x: interpolate(t, [0, 1], [a.x, b.x]), y: interpolate(t, [0, 1], [a.y, b.y]) };
};

/** [start, end) 동안만 1, 양 끝에서 fade 하는 값. end 가 없으면 끝까지 유지. */
export const shown = (frame: number, start: number, end = Number.POSITIVE_INFINITY, fade = 8): number =>
  progress(frame, start, fade) * (Number.isFinite(end) ? 1 - progress(frame, end - fade, fade) : 1);
