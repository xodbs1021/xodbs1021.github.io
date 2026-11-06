import { Easing, interpolate } from "remotion";

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** start 프레임부터 duration 동안 0→1로 진행하는 값. */
export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = EASE_OUT,
): number =>
  interpolate(frame, [start, start + duration], [0, 1], { ...CLAMP, easing });

/** 구간 [inStart, outEnd] 동안만 보이고 양 끝에서 fade 되는 불투명도. */
export const visibleBetween = (
  frame: number,
  inStart: number,
  outEnd: number,
  fade = 12,
): number =>
  interpolate(
    frame,
    [inStart, inStart + fade, outEnd - fade, outEnd],
    [0, 1, 1, 0],
    CLAMP,
  );

/** 천천히 떠 있는 듯한 상하 흔들림(px). */
export const bob = (
  frame: number,
  amplitude = 8,
  periodFrames = 90,
  phase = 0,
): number =>
  Math.sin(((frame + phase) / periodFrames) * Math.PI * 2) * amplitude;
