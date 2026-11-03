// 장면 1(RewindFallout) 과 N1(RefetchFlow) 이 함께 쓰는 조각 줄 좌표.
// N1 은 장면 1 의 끝 상태에서 이어지므로, 두 장면의 조각 · 창 띠 · 재생점이 같은 자리에 있어야 한다.
// 좌표는 1920×1080 캔버스의 px 이다.

export const LEFT = 154;
export const PITCH = 124;
export const CELL = { width: 108, height: 120 } as const;
export const ROW_Y = 470;

/** 되감기 창에 드는 조각 수. */
export const WINDOW_CELLS = 8;
/** 장면 1 이 시작할 때 창의 왼쪽 끝(조각 번호 - 1). */
export const FIRST_WINDOW = 2;
/** 장면 1 이 시작할 때 이미 있는 조각 수. */
export const INITIAL_CELLS = 10;
/** 장면 1 에서 새로 발행되는 조각 수 — 창도 이만큼 밀린다. */
export const PUBLISH_COUNT = 3;
/** 재생점이 멈춘 조각(번호 - 1). */
export const PAUSED_CELL = 3;

/** 장면 1 의 끝 상태(= N1 의 시작 상태). */
export const END_WINDOW_START = FIRST_WINDOW + PUBLISH_COUNT;
export const END_CELL_COUNT = INITIAL_CELLS + PUBLISH_COUNT;

export const cellX = (i: number) => LEFT + i * PITCH;

/** 창 띠 — 창의 왼쪽 끝(조각 단위, 소수 가능)에서 x 를 구한다. */
export const bandX = (windowStart: number) => cellX(windowStart) - 10;
export const BAND_WIDTH = WINDOW_CELLS * PITCH - (PITCH - CELL.width) + 20;
export const BAND_TOP = ROW_Y - 30;
export const BAND_HEIGHT = CELL.height + 60;

/** 재생점 — 머리는 창 띠보다 위, 막대는 조각 아래까지. */
export const PLAYHEAD_TOP = ROW_Y - 60;
export const PLAYHEAD_HEIGHT = CELL.height + 86;
/** 멈춘 재생점의 x(조각 안 왼쪽 22% 자리). */
export const PAUSED_X = cellX(PAUSED_CELL) + CELL.width * 0.22;

/** 창 위 라벨(「하한」 · 「지금」)과 이름표(「되감기 창」)의 y — 재생점 머리보다 위. */
export const BAND_LABEL_Y = ROW_Y - 128;
export const BAND_TAG_Y = ROW_Y - 140;
/** 재생점 위 상태 이름표(「일시정지」 등)의 y. */
export const PLAYHEAD_TAG_Y = ROW_Y - 200;
