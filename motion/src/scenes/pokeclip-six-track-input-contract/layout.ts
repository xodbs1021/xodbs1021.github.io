// SixTrackFunnel 의 좌표. 데스크톱(1920×1080)은 소스를 왼쪽 세로 열, 트랙을 오른쪽 열로,
// 휴대폰판(1080×1350)은 소스를 위쪽 2열 격자, 트랙을 아래쪽 세로 목록으로 둔다.
import { MOBILE_TEXT, TEXT } from "../../theme";

export const SOURCES = [
  "마이크", "게임", "디스코드", "BGM", "알림", "브라우저", "미디어", "데스크탑", "인트로 영상", "효과음",
] as const;

/** 원안에서 OBS 믹서 밖으로 새는 칸(7–10번, 0부터 센 번호). */
export const OUTSIDE_FROM = 6;

/** 소스 i 의 개별 트랙 번호(트랙 2–5 는 하나씩, 나머지는 트랙 6 「기타」). */
export const stemTrack = (i: number): number => (i < 4 ? i + 2 : 6);

export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Point = { readonly x: number; readonly y: number };

export type Layout = {
  readonly text: { readonly title: number; readonly label: number };
  readonly title: Point;
  readonly finalTag: Point;
  readonly sourcesHeader?: Point;
  readonly chips: readonly Rect[];
  /** 휴대폰판만: 칩 안 트랙 번호 꼬리표 자리. */
  readonly badges?: readonly Point[];
  readonly draft: {
    readonly header: Point;
    readonly headerText: string;
    readonly box?: Rect;
    readonly boxLabel?: Point;
    readonly cells: readonly Rect[];
    readonly cellText: (i: number) => string;
    readonly paths: readonly string[];
    /** 휴대폰판만: 칩 선들이 모여 내려가는 한 줄기(점선이 겹쳐 얼룩지지 않게 따로 그린다). */
    readonly trunk?: string;
    readonly bracket?: { readonly x: number; readonly y1: number; readonly y2: number };
    readonly outsideTag: Point;
  };
  readonly mixer: Rect;
  readonly mixerHeader: Point;
  readonly slots: readonly Rect[];
  readonly serverHeader: Point;
  readonly serverTags: readonly Point[];
  readonly mixPaths: readonly string[];
  /** 트랙 2–6 으로 가는 선. 데스크톱은 소스마다 하나, 휴대폰판은 트랙마다 하나. */
  readonly stemPaths: readonly { readonly d: string; readonly track: number }[];
};

const midY = (r: Rect): number => r.y + r.h / 2;

/** 왼쪽 점에서 오른쪽 점으로 가는 S 자 곡선. */
const curve = (x1: number, y1: number, x2: number, y2: number): string => {
  const cx = (x2 - x1) / 2;
  return `M${x1},${y1} C${x1 + cx},${y1} ${x2 - cx},${y2} ${x2},${y2}`;
};

const polyline = (points: readonly (readonly [number, number])[]): string =>
  points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px},${py}`).join(" ");

// ── 데스크톱 ──────────────────────────────────────────────

const D_CHIP = { x: 120, y0: 160, pitch: 86, w: 300, h: 62 } as const;
const D_DRAFT = { x: 1100, w: 220 } as const;
const D_MIXER = { x: 1080, y: 150, w: 420, h: 850 } as const;
const D_SLOT = { x: 1104, y0: 214, pitch: 132, w: 372, h: 100 } as const;
const D_SERVER_X = 1560;
const D_TAG_H = 59;

const dChips: readonly Rect[] = SOURCES.map((_, i) => ({
  x: D_CHIP.x, y: D_CHIP.y0 + i * D_CHIP.pitch, w: D_CHIP.w, h: D_CHIP.h,
}));
const dSlots: readonly Rect[] = Array.from({ length: 6 }, (_, k) => ({
  x: D_SLOT.x, y: D_SLOT.y0 + k * D_SLOT.pitch, w: D_SLOT.w, h: D_SLOT.h,
}));
const dChipRight = D_CHIP.x + D_CHIP.w;

export const DESKTOP: Layout = {
  text: { title: TEXT.title, label: TEXT.small },
  title: { x: 120, y: 36 },
  finalTag: { x: D_MIXER.x, y: 36 },
  sourcesHeader: { x: D_CHIP.x, y: 108 },
  chips: dChips,
  draft: {
    header: { x: D_DRAFT.x, y: 108 },
    headerText: "믹서 우회 · 직접 후킹",
    cells: dChips.map((c) => ({ x: D_DRAFT.x, y: c.y, w: D_DRAFT.w, h: c.h })),
    cellText: (i) => `트랙 ${i + 1}`,
    paths: dChips.map((c) => polyline([[dChipRight, midY(c)], [D_DRAFT.x, midY(c)]])),
    bracket: { x: 1356, y1: dChips[OUTSIDE_FROM].y, y2: dChips[9].y + D_CHIP.h },
    outsideTag: {
      x: 1390,
      y: (dChips[OUTSIDE_FROM].y + dChips[9].y + D_CHIP.h) / 2 - D_TAG_H / 2,
    },
  },
  mixer: D_MIXER,
  mixerHeader: { x: D_SLOT.x, y: 160 },
  slots: dSlots,
  serverHeader: { x: D_SERVER_X, y: 160 },
  serverTags: dSlots.map((s) => ({ x: D_SERVER_X, y: midY(s) - D_TAG_H / 2 })),
  mixPaths: dChips.map((c) => curve(dChipRight, midY(c), D_SLOT.x, midY(dSlots[0]))),
  stemPaths: dChips.map((c, i) => ({
    d: curve(dChipRight, midY(c), D_SLOT.x, midY(dSlots[stemTrack(i) - 1])),
    track: stemTrack(i),
  })),
};

// ── 휴대폰판 ──────────────────────────────────────────────

const M_CHIP = { cols: [60, 580], y0: 140, pitch: 86, w: 440, h: 70 } as const;
/** 두 칩 열 사이 골의 가운데 — 모든 선이 여기로 모인다. */
const M_TRUNK_X = 540;
const M_JUNCTION_Y = 600;
const M_LOWER_Y = 640;
const M_BUS_X = 100;
const M_SLOT = { x: 140, y0: 720, pitch: 82, w: 540, h: 68 } as const;
const M_SERVER_X = 730;
const M_TAG_H = 74;
const M_BADGE = { w: 72, h: 56, inset: 10 } as const;
const M_CELL = { x0: 88, w: 168, gap: 16, rows: [724, 810], h: 70 } as const;

const mChips: readonly Rect[] = SOURCES.map((_, i) => ({
  x: M_CHIP.cols[i % 2], y: M_CHIP.y0 + Math.floor(i / 2) * M_CHIP.pitch, w: M_CHIP.w, h: M_CHIP.h,
}));
/** 칩에서 골로 나가는 가장자리 점. */
const mEdge = (c: Rect): number => (c.x < M_TRUNK_X ? c.x + c.w : c.x);
const mSlots: readonly Rect[] = Array.from({ length: 6 }, (_, k) => ({
  x: M_SLOT.x, y: M_SLOT.y0 + k * M_SLOT.pitch, w: M_SLOT.w, h: M_SLOT.h,
}));

export const MOBILE: Layout = {
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label },
  title: { x: 60, y: 44 },
  finalTag: { x: 60, y: 1244 },
  chips: mChips,
  badges: mChips.map((c) => ({ x: c.x + c.w - M_BADGE.w - M_BADGE.inset, y: midY(c) - M_BADGE.h / 2 })),
  draft: {
    header: { x: 60, y: 930 },
    headerText: "믹서 우회 · 직접 후킹",
    box: { x: 60, y: M_LOWER_Y, w: 960, h: 260 },
    boxLabel: { x: 84, y: 652 },
    cells: SOURCES.map((_, i) => ({
      x: M_CELL.x0 + (i % 5) * (M_CELL.w + M_CELL.gap),
      y: M_CELL.rows[Math.floor(i / 5)],
      w: M_CELL.w,
      h: M_CELL.h,
    })),
    cellText: (i) => `${i + 1}`,
    paths: mChips.map((c) => polyline([[mEdge(c), midY(c)], [M_TRUNK_X, midY(c)]])),
    trunk: polyline([[M_TRUNK_X, midY(mChips[0])], [M_TRUNK_X, M_LOWER_Y]]),
    outsideTag: { x: 600, y: 924 },
  },
  mixer: { x: 60, y: M_LOWER_Y, w: 640, h: 580 },
  mixerHeader: { x: M_SLOT.x, y: 650 },
  slots: mSlots,
  serverHeader: { x: M_SERVER_X, y: 650 },
  serverTags: mSlots.map((s) => ({ x: M_SERVER_X, y: midY(s) - M_TAG_H / 2 })),
  mixPaths: mChips.map((c) => polyline([[mEdge(c), midY(c)], [M_TRUNK_X, midY(c)], [M_TRUNK_X, M_SLOT.y0]])),
  stemPaths: mSlots.slice(1).map((s, k) => ({
    d: polyline([[M_TRUNK_X, M_JUNCTION_Y], [M_BUS_X, M_JUNCTION_Y], [M_BUS_X, midY(s)], [s.x, midY(s)]]),
    track: k + 2,
  })),
};

export const BADGE_SIZE = M_BADGE;
