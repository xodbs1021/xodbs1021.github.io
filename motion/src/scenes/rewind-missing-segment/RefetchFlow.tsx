import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Playhead, SegmentCell, Tag, WindowBand } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_SAFE, MOBILE_TEXT, SAFE, TEXT } from "../../theme";
import { DESKTOP_ROW, END_CELL_COUNT, END_WINDOW_START, MOBILE_ROW, PAUSED_CELL, type RowGeometry } from "./layout";

// N1 — (나) 한 줄 흐름: 404 → 받기 멈춤 → 같은 주소로 플레이어를 새로 세워 목록을 다시 받음
//      → 시작 자리가 새 목록의 시작 하한보다 앞이면 하한으로 자름 → 실제로 밀렸으니 알림.
// 콘티: _workspace/blog/rewind-missing-segment/storyboard.md 「(나) 장면」 N1.
// 시작 상태는 장면 1 의 끝(조각 1–4 창 밖, 조각 5 404, 창 6–13)이라 좌표를 layout.ts 에서 함께 쓴다.
// 시작 하한 = 새 목록의 첫 조각 + 맨 앞 세 조각(재생기가 원래 하던 자르기). 그래서 재생점은 9 번 조각의 시작에 선다.
// layout="mobile" 은 1080×1350 휴대폰판(RefetchFlowMobile) — 같은 움직임을 좁은 간격 · 큰 글자로 그린다.
// 휴대폰판은 아래 흐름 이름표를 한 줄에 다 놓을 수 없어 지금 단계 하나만 보여 준다.

export const REFETCH_FLOW_FRAMES = 270;

const LEAD_CELLS = 3;
const REQUESTED = PAUSED_CELL + 1;

const STOP_AT = 45;
const REFETCH_AT = 90;
const PAPER_AT = 110;
const ARRIVE_AT = 145;
const CLAMP_AT = 160;
const SLIDE_AT = 180;
const NOTIFY_AT = 215;

/** 아래쪽 흐름 이름표 — 일어난 차례대로 켜진다. */
const STEPS = [
  { at: -12, text: "조각 404", tone: "danger" },
  { at: STOP_AT, text: "받기 멈춤", tone: "ink" },
  { at: REFETCH_AT, text: "같은 주소로 목록 다시 받기", tone: "ink" },
  { at: CLAMP_AT, text: "시작 하한 앞이면 자름", tone: "accent" },
  { at: NOTIFY_AT, text: "밀렸으니 알림", tone: "accent" },
] as const;

type Layout = {
  readonly row: RowGeometry;
  readonly text: { readonly title: number; readonly label: number; readonly small: number };
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly cdn: { readonly x: number; readonly y: number; readonly width: number };
  readonly cdnNote: { readonly x: number; readonly y: number; readonly text: string };
  readonly notify: { readonly x: number; readonly y: number; readonly width: number; readonly lines: readonly string[] };
  /** 「되감기 창」 이름표 — 휴대폰판은 「지금」 과 겹쳐 뺀다. */
  readonly bandTag: boolean;
  /** 「시작 하한」 라벨의 y. */
  readonly floorLabelY: number;
  readonly chips: { readonly x: number; readonly y: number; readonly mode: "all" | "current" };
};

const LAYOUTS: Record<"desktop" | "mobile", Layout> = {
  desktop: {
    row: DESKTOP_ROW,
    text: TEXT,
    title: [{ y: 96, text: "404 가 나면 목록을 다시 받아, 창 안에서 이어 봅니다" }],
    cdn: { x: 1500, y: 640, width: 266 },
    cdnNote: { x: 1472, y: 646, text: "같은 주소 · 새 플레이어로" },
    notify: { x: 1766 - 640, y: 180, width: 640, lines: ["알림 「가장 오래된 지점으로 옮겼어요」"] },
    bandTag: true,
    floorLabelY: DESKTOP_ROW.bandLabelY,
    chips: { x: DESKTOP_ROW.left, y: SAFE.bottom - 66, mode: "all" },
  },
  mobile: {
    row: MOBILE_ROW,
    text: MOBILE_TEXT,
    title: [
      { y: 110, text: "404 가 나면 목록을 다시 받아," },
      { y: 184, text: "창 안에서 이어 봅니다" },
    ],
    cdn: { x: 740, y: 1040, width: 260 },
    cdnNote: { x: 716, y: 1048, text: "같은 주소로" },
    notify: { x: MOBILE_SAFE.x, y: 262, width: 1080 - MOBILE_SAFE.x * 2, lines: ["알림", "「가장 오래된 지점으로 옮겼어요」"] },
    bandTag: false,
    floorLabelY: MOBILE_ROW.rowY + MOBILE_ROW.cell.height + 136,
    chips: { x: 540, y: MOBILE_SAFE.bottom - 92, mode: "current" },
  },
};

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const RefetchFlow: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const { row, text } = L;
  const { cell, cellX, rowY, bandTop, bandHeight, bandWidth, playheadTop, playheadHeight, pausedX, bandLabelY, bandTagY, playheadTagY } = row;
  const startFloorX = cellX(END_WINDOW_START + LEAD_CELLS);
  const bandX = row.bandX(END_WINDOW_START);
  const tick = layout === "mobile" ? 3 : 4;

  const stopped = progress(frame, STOP_AT, 12);
  const refetch = progress(frame, REFETCH_AT, 15);
  const paper = progress(frame, PAPER_AT, ARRIVE_AT - PAPER_AT, EASE_IN_OUT);
  const arrived = progress(frame, ARRIVE_AT, 12);
  const pulse = interpolate(frame, [ARRIVE_AT, ARRIVE_AT + 8, ARRIVE_AT + 22], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clamp = progress(frame, CLAMP_AT, 15);
  const slide = progress(frame, SLIDE_AT, 30, EASE_IN_OUT);
  const notify = progress(frame, NOTIFY_AT, 15);

  const playheadX = interpolate(slide, [0, 1], [pausedX, startFloorX]);
  const playheadColor = notify > 0.5 ? COLOR.ink : stopped > 0.5 ? COLOR.muted : COLOR.danger;
  // 장면 1 의 끝(「▶ 다시 재생」)에서 시작 → 옛 플레이어 정지 → 새 플레이어가 자리를 정함 → 이어 재생.
  const playheadTag =
    notify > 0.5 ? "▶ 이어 재생" : arrived > 0.5 ? "새 플레이어" : stopped > 0.5 ? "■ 받기 멈춤" : "▶ 다시 재생";
  const playheadTone = notify > 0.5 || stopped < 0.5 ? "ink" : "muted";

  const paperY = interpolate(paper, [0, 1], [L.cdn.y - 10, bandTop + bandHeight + 6]);
  const paperOpacity = paper > 0 ? 1 - arrived : 0;
  const underRow = rowY + cell.height;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {L.title.map((line) => (
        <Label key={line.y} x={row.left} y={line.y} size={text.title} weight={760}>
          {line.text}
        </Label>
      ))}

      <WindowBand x={bandX} y={bandTop} width={bandWidth} height={bandHeight} />
      <WindowBand x={bandX - 8 * pulse} y={bandTop - 8 * pulse} width={bandWidth + 16 * pulse} height={bandHeight + 16 * pulse} opacity={pulse} />
      <Label x={bandX} y={bandLabelY} size={text.small} color={COLOR.accent} weight={720}>
        목록 첫 조각
      </Label>
      <Label x={bandX + bandWidth} y={bandLabelY} size={text.small} color={COLOR.accent} weight={720} anchor="right">
        지금
      </Label>
      {L.bandTag ? (
        <Tag x={cellX(END_WINDOW_START + 6) + cell.width / 2} y={bandTagY} tone="accent" anchor="center">
          되감기 창
        </Tag>
      ) : null}

      {Array.from({ length: END_CELL_COUNT }, (_, i) => {
        const outside = i < END_WINDOW_START;
        const isError = i === REQUESTED && refetch < 0.5;
        const state = isError ? "error" : outside ? "gone" : "live";
        return (
          <SegmentCell
            key={i}
            x={cellX(i)}
            y={rowY}
            width={cell.width}
            height={cell.height}
            state={state}
            label={`${i + 1}`}
            opacity={state === "gone" ? 0.75 : 1}
          />
        );
      })}

      {/* 시작 하한 = 새 목록의 첫 조각 + 맨 앞 세 조각 */}
      <svg style={{ position: "absolute", inset: 0, opacity: clamp }} width="100%" height="100%">
        <line x1={cellX(END_WINDOW_START)} y1={underRow + 44} x2={startFloorX - 16} y2={underRow + 44} stroke={COLOR.accent} strokeWidth={tick} />
        <line x1={cellX(END_WINDOW_START)} y1={underRow + 32} x2={cellX(END_WINDOW_START)} y2={underRow + 56} stroke={COLOR.accent} strokeWidth={tick} />
        <line x1={startFloorX - 16} y1={underRow + 32} x2={startFloorX - 16} y2={underRow + 56} stroke={COLOR.accent} strokeWidth={tick} />
        <line x1={startFloorX} y1={bandTop} x2={startFloorX} y2={bandTop + bandHeight} stroke={COLOR.accent} strokeWidth={tick + 1} strokeDasharray="10 8" />
      </svg>
      <Label x={(cellX(END_WINDOW_START) + startFloorX - 16) / 2} y={underRow + 66} size={text.small} color={COLOR.accent} weight={700} opacity={clamp} anchor="center">
        + 맨 앞 세 조각
      </Label>
      <Label x={startFloorX} y={L.floorLabelY} size={text.small} color={COLOR.accent} weight={760} opacity={clamp} anchor="center">
        시작 하한
      </Label>

      {/* 요청한 자리에 남는 흔적과 밀린 거리 */}
      <svg style={{ position: "absolute", inset: 0, opacity: slide > 0 ? 0.9 : 0 }} width="100%" height="100%">
        <line x1={pausedX} y1={playheadTop + 24} x2={pausedX} y2={playheadTop + playheadHeight} stroke={COLOR.muted} strokeWidth={tick + 1} strokeDasharray="10 9" />
      </svg>
      {slide > 0 ? (
        <Arrow x1={pausedX + 14} y1={playheadTop + 10} x2={startFloorX - 26} y2={playheadTop + 10} color={COLOR.accent} draw={slide * 0.999} />
      ) : null}

      <Playhead x={playheadX} top={playheadTop} height={playheadHeight} color={playheadColor} />
      <Tag x={playheadX} y={playheadTagY} tone={playheadTone} size={text.small} anchor="center">
        {playheadTag}
      </Tag>

      <Tag x={cellX(REQUESTED) + cell.width / 2} y={underRow + 126} tone="danger" size={text.small} opacity={1 - refetch} anchor="center">
        404 — 다음 조각이 없음
      </Tag>

      {/* CDN 에서 최신 목록이 올라온다 — 같은 주소, 새 플레이어 */}
      <Node x={L.cdn.x} y={L.cdn.y} width={L.cdn.width} tone="ink" size={text.label} opacity={refetch}>
        <div style={{ textAlign: "center" }}>CDN</div>
      </Node>
      <Label x={L.cdnNote.x} y={L.cdnNote.y} size={text.small} color={COLOR.ink} weight={680} opacity={refetch} anchor="right">
        {L.cdnNote.text}
      </Label>
      <Tag x={L.cdn.x + L.cdn.width / 2} y={paperY} tone="accent" size={text.small} opacity={paperOpacity} anchor="center">
        최신 재생 목록
      </Tag>

      <Node x={L.notify.x} y={L.notify.y} width={L.notify.width} tone="accent" size={text.small} opacity={notify}>
        {L.notify.lines.map((line) => (
          <div key={line} style={{ textAlign: "center" }}>
            {line}
          </div>
        ))}
      </Node>

      {L.chips.mode === "all" ? <StepChips frame={frame} x={L.chips.x} y={L.chips.y} size={text.small} /> : <CurrentStep frame={frame} x={L.chips.x} y={L.chips.y} size={text.small} />}
    </AbsoluteFill>
  );
};

type ChipProps = { readonly frame: number; readonly x: number; readonly y: number; readonly size: number };

const CHIP_GAP = 56;

/** 아래쪽 흐름 이름표 줄 — 켜지기 전에는 흐린 회색. */
const StepChips: React.FC<ChipProps> = ({ frame, x, y, size }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 0 }}>
    {STEPS.map((step, i) => {
      const on = progress(frame, step.at, 12);
      return (
        <div key={step.text} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 ? (
            <div style={{ width: CHIP_GAP, textAlign: "center", fontFamily: FONT, fontSize: size, color: COLOR.muted, opacity: 0.4 + 0.6 * on }}>→</div>
          ) : null}
          <div style={{ position: "relative" }}>
            <Tag x={0} y={0} tone="muted" size={size}>
              {step.text}
            </Tag>
            <div style={{ position: "absolute", inset: 0, opacity: on }}>
              <Tag x={0} y={0} tone={step.tone} size={size}>
                {step.text}
              </Tag>
            </div>
            {/* 자리 잡기용 — 절대 위치 Tag 는 크기를 차지하지 않는다 */}
            <div style={{ visibility: "hidden", padding: "8px 22px", fontFamily: FONT, fontSize: size, fontWeight: 700, whiteSpace: "nowrap" }}>
              {step.text}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

/** 휴대폰판 — 지금 단계 이름표 하나. */
const CurrentStep: React.FC<ChipProps> = ({ frame, x, y, size }) => {
  const index = STEPS.reduce((last, step, i) => (frame >= step.at + 6 ? i : last), 0);
  const step = STEPS[index];
  return (
    <Tag x={x} y={y} tone={step.tone} size={size} anchor="center">
      {step.text}
    </Tag>
  );
};
