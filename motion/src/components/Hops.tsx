import { COLOR } from "../theme";
import { progress } from "../lib/motion";
import { Wire } from "./Flow";

// 상자 사이를 차례로 건너는 흐름(요청 · 응답)의 공통 부품. 한 건너기(hop)는 꺾은선 하나와 그 위를 지나는 점 하나다.
// 좌표는 캔버스 px. 장면이 hop 목록과 시작 프레임을 정하고, 이 부품은 그리기만 한다.

export type Point = readonly [number, number];

export type Hop = {
  /** 꺾은선이 지나는 점들 — 두 개 이상. 상자 가장자리에서 시작 · 끝나게 장면이 계산한다. */
  readonly points: readonly Point[];
  /** 점이 출발하는 프레임. */
  readonly start: number;
  /** 점이 끝에 닿기까지 프레임 수. */
  readonly duration: number;
  readonly color?: string;
  readonly dashed?: boolean;
};

const segmentLengths = (points: readonly Point[]): number[] =>
  points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));

/** 꺾은선 위에서 길이 비율 t(0–1)에 있는 점. */
export const pointAt = (points: readonly Point[], t: number): Point => {
  const lengths = segmentLengths(points);
  const total = lengths.reduce((a, b) => a + b, 0);
  let left = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const r = lengths[i] === 0 ? 0 : left / lengths[i];
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      return [x1 + (x2 - x1) * r, y1 + (y2 - y1) * r];
    }
    left -= lengths[i];
  }
  return points[points.length - 1];
};

/** 꺾은선의 앞쪽 t 비율만 잘라 낸 점들(선이 그려지는 모습). */
const partial = (points: readonly Point[], t: number): Point[] => {
  if (t >= 1) return [...points];
  const lengths = segmentLengths(points);
  const total = lengths.reduce((a, b) => a + b, 0);
  let left = Math.max(0, t) * total;
  const out: Point[] = [points[0]];
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i]) {
      out.push(pointAt([points[i], points[i + 1]], lengths[i] === 0 ? 0 : left / lengths[i]));
      return out;
    }
    out.push(points[i + 1]);
    left -= lengths[i];
  }
  return out;
};

type HopLineProps = {
  readonly hop: Hop;
  readonly frame: number;
  readonly radius: number;
  /** 점이 끝에 닿은 뒤에도 선을 남길지. 기본은 남긴다. */
  readonly keep?: boolean;
  readonly opacity?: number;
};

/** 한 건너기: 선이 점을 따라 그려지고, 점은 끝에 닿으면 사라진다. */
export const HopLine: React.FC<HopLineProps> = ({ hop, frame, radius, keep = true, opacity = 1 }) => {
  const t = progress(frame, hop.start, hop.duration);
  if (t <= 0) return null;
  const color = hop.color ?? COLOR.ink;
  const drawn = partial(hop.points, t);
  const [px, py] = pointAt(hop.points, t);
  const moving = t < 1;
  if (!moving && !keep) return null;
  return (
    <>
      {drawn.length >= 2 ? (
        <Wire points={drawn} color={color} dashed={hop.dashed} arrow={!moving} opacity={opacity} />
      ) : null}
      {moving ? (
        <div
          style={{
            position: "absolute",
            left: px - radius,
            top: py - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: 999,
            background: color,
            opacity,
          }}
        />
      ) : null}
    </>
  );
};
