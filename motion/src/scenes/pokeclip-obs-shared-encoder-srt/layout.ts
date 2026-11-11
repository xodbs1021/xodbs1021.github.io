// SharedEncoderStart 의 좌표. 데스크톱 1920×1080, 휴대폰판 1080×1350.
import { MOBILE_TEXT, TEXT } from "../../theme";

export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Segment = readonly [number, number, number, number];

export type SharedEncoderLayout = {
  /** 시작 순서 상자 4개(프로필 설정 적용 → STREAMING_STARTING → 인코더 생성 → 출력 시작). */
  readonly steps: readonly [Rect, Rect, Rect, Rect];
  /** 상자 사이 화살표 [x1, y1, x2, y2]. */
  readonly stepArrows: readonly Segment[];
  /** 2번 상자 아래 이름표(keyint_sec → 2, 실행 중 GOP 변경 불가). */
  readonly keyTag: { readonly x: number; readonly y: number; readonly anchor: "left" | "center" };
  readonly encoder: Rect;
  /** 녹화 중 · keyint ≠ 2 — 인코더 상자 옆. */
  readonly recordingTag: { readonly x: number; readonly y: number };
  /** 출력 두 줄. x1 은 인코더 오른쪽 가장자리. */
  readonly lines: {
    readonly x1: number;
    readonly x2: number;
    readonly rtmpY: number;
    readonly srtY: number;
  };
  /** 줄 이름(RTMP → 치지직 · SRT → PokeClip) 의 왼쪽 위. */
  readonly lineLabels: { readonly x: number; readonly rtmpY: number; readonly srtY: number };
  /** 줄 결과 이름표(본방 정지 · SRT도 함께 정지 · SRT 시작 거절) 의 왼쪽 위. */
  readonly outcomeTags: { readonly x: number; readonly rtmpY: number; readonly srtY: number };
  readonly text: { readonly box: number; readonly note: number; readonly label: number; readonly tag: number; readonly encoder: number };
  readonly packetRadius: number;
};

const D_STEP_Y = 220;
const D_STEP_H = 150;
const D_ENCODER: Rect = { x: 580, y: 550, w: 360, h: 300 };
const D_RTMP_Y = 640;
const D_SRT_Y = 770;

export const DESKTOP: SharedEncoderLayout = {
  steps: [
    { x: 121, y: D_STEP_Y, w: 370, h: D_STEP_H },
    { x: 547, y: D_STEP_Y, w: 540, h: D_STEP_H },
    { x: 1143, y: D_STEP_Y, w: 300, h: D_STEP_H },
    { x: 1499, y: D_STEP_Y, w: 300, h: D_STEP_H },
  ],
  stepArrows: [
    [495, D_STEP_Y + D_STEP_H / 2, 543, D_STEP_Y + D_STEP_H / 2],
    [1091, D_STEP_Y + D_STEP_H / 2, 1139, D_STEP_Y + D_STEP_H / 2],
    [1447, D_STEP_Y + D_STEP_H / 2, 1495, D_STEP_Y + D_STEP_H / 2],
  ],
  keyTag: { x: 547 + 540 / 2, y: D_STEP_Y + D_STEP_H + 26, anchor: "center" },
  encoder: D_ENCODER,
  recordingTag: { x: 120, y: D_ENCODER.y + D_ENCODER.h / 2 - 33 },
  lines: { x1: D_ENCODER.x + D_ENCODER.w, x2: 1420, rtmpY: D_RTMP_Y, srtY: D_SRT_Y },
  lineLabels: { x: 980, rtmpY: D_RTMP_Y - 66, srtY: D_SRT_Y - 66 },
  outcomeTags: { x: 1450, rtmpY: D_RTMP_Y - 33, srtY: D_SRT_Y - 33 },
  text: { box: TEXT.label, note: TEXT.small, label: TEXT.label, tag: TEXT.label, encoder: TEXT.title },
  packetRadius: 14,
};

// 휴대폰판: 시작 순서를 세로 4줄(위쪽), 인코더와 두 출력 줄을 아래쪽에. 상자 사이 화살표는 왼쪽에 두어
// 2번 상자 아래 이름표가 화살표와 겹치지 않게 한다.
const M_X = 60;
const M_W = 960;
const M_ARROW_X = 160;
const M_ENCODER: Rect = { x: M_X, y: 900, w: 320, h: 360 };
const M_RTMP_Y = 980;
const M_SRT_Y = 1170;

export const MOBILE: SharedEncoderLayout = {
  steps: [
    { x: M_X, y: 40, w: M_W, h: 110 },
    { x: M_X, y: 200, w: M_W, h: 160 },
    { x: M_X, y: 480, w: M_W, h: 110 },
    { x: M_X, y: 640, w: M_W, h: 110 },
  ],
  stepArrows: [
    [M_ARROW_X, 154, M_ARROW_X, 196],
    [M_ARROW_X, 364, M_ARROW_X, 476],
    [M_ARROW_X, 594, M_ARROW_X, 636],
  ],
  keyTag: { x: 230, y: 382, anchor: "left" },
  encoder: M_ENCODER,
  recordingTag: { x: M_X, y: 800 },
  lines: { x1: M_ENCODER.x + M_ENCODER.w, x2: 1000, rtmpY: M_RTMP_Y, srtY: M_SRT_Y },
  lineLabels: { x: 420, rtmpY: M_RTMP_Y - 74, srtY: M_SRT_Y - 74 },
  outcomeTags: { x: 420, rtmpY: M_RTMP_Y + 18, srtY: M_SRT_Y + 18 },
  text: {
    box: MOBILE_TEXT.label,
    note: MOBILE_TEXT.small,
    label: MOBILE_TEXT.label,
    tag: MOBILE_TEXT.small,
    encoder: MOBILE_TEXT.title,
  },
  packetRadius: 16,
};

export const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
