import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Playhead, SegmentCell, Tag, WindowBand } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, SAFE, TEXT } from "../../theme";
import {
  BAND_HEIGHT,
  BAND_LABEL_Y,
  BAND_TAG_Y,
  BAND_TOP,
  BAND_WIDTH,
  CELL,
  END_CELL_COUNT,
  END_WINDOW_START,
  LEFT,
  PAUSED_CELL,
  PAUSED_X,
  PLAYHEAD_HEIGHT,
  PLAYHEAD_TAG_Y,
  PLAYHEAD_TOP,
  ROW_Y,
  bandX,
  cellX,
} from "./layout";

// N1 — (나) 한 줄 흐름: 404 → 받기 멈춤 → 같은 주소로 플레이어를 새로 세워 목록을 다시 받음
//      → 시작 자리가 새 목록의 시작 하한보다 앞이면 하한으로 자름 → 실제로 밀렸으니 알림.
// 콘티: _workspace/blog/rewind-missing-segment/storyboard.md 「(나) 장면」 N1.
// 시작 상태는 장면 1 의 끝(조각 1–4 창 밖, 조각 5 404, 창 6–13)이라 좌표를 layout.ts 에서 함께 쓴다.
// 사실 정본: 원고 정리본 5절 1–4 — 시작 하한 = 새 목록의 첫 조각 + 맨 앞 세 조각(재생기가 원래 하던 자르기).
// 그래서 재생점은 첫 조각(6)이 아니라 9 번 조각의 시작에 선다.

export const REFETCH_FLOW_FRAMES = 270;

const LEAD_CELLS = 3;
const REQUESTED = PAUSED_CELL + 1;
const START_FLOOR_X = cellX(END_WINDOW_START + LEAD_CELLS);
const BAND_X = bandX(END_WINDOW_START);

const STOP_AT = 45;
const REFETCH_AT = 90;
const PAPER_AT = 110;
const ARRIVE_AT = 145;
const CLAMP_AT = 160;
const SLIDE_AT = 180;
const NOTIFY_AT = 215;

const CDN = { x: 1500, y: 640, width: 266 } as const;
const CHIP_Y = SAFE.bottom - 66;

/** 아래쪽 흐름 이름표 — 일어난 차례대로 켜진다. */
const STEPS = [
  { at: -12, text: "조각 404", tone: "danger" },
  { at: STOP_AT, text: "받기 멈춤", tone: "ink" },
  { at: REFETCH_AT, text: "같은 주소로 목록 다시 받기", tone: "ink" },
  { at: CLAMP_AT, text: "시작 하한 앞이면 자름", tone: "accent" },
  { at: NOTIFY_AT, text: "밀렸으니 알림", tone: "accent" },
] as const;

export const RefetchFlow: React.FC = () => {
  const frame = useCurrentFrame();

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

  const playheadX = interpolate(slide, [0, 1], [PAUSED_X, START_FLOOR_X]);
  const playheadColor = notify > 0.5 ? COLOR.ink : stopped > 0.5 ? COLOR.muted : COLOR.danger;
  // 장면 1 의 끝(「▶ 다시 재생」)에서 시작 → 옛 플레이어 정지 → 새 플레이어가 자리를 정함 → 이어 재생.
  const playheadTag =
    notify > 0.5 ? "▶ 이어 재생" : arrived > 0.5 ? "새 플레이어" : stopped > 0.5 ? "■ 받기 멈춤" : "▶ 다시 재생";
  const playheadTone = notify > 0.5 || stopped < 0.5 ? "ink" : "muted";

  const paperY = interpolate(paper, [0, 1], [CDN.y - 10, BAND_TOP + BAND_HEIGHT + 6]);
  const paperOpacity = paper > 0 ? 1 - arrived : 0;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={LEFT} y={96} size={TEXT.title} weight={760}>
        404 가 나면 목록을 다시 받아, 창 안에서 이어 봅니다
      </Label>

      <WindowBand x={BAND_X} y={BAND_TOP} width={BAND_WIDTH} height={BAND_HEIGHT} />
      <WindowBand x={BAND_X - 8 * pulse} y={BAND_TOP - 8 * pulse} width={BAND_WIDTH + 16 * pulse} height={BAND_HEIGHT + 16 * pulse} opacity={pulse} />
      <Label x={BAND_X} y={BAND_LABEL_Y} size={TEXT.small} color={COLOR.accent} weight={720}>
        목록 첫 조각
      </Label>
      <Label x={BAND_X + BAND_WIDTH} y={BAND_LABEL_Y} size={TEXT.small} color={COLOR.accent} weight={720} anchor="right">
        지금
      </Label>
      <Tag x={cellX(END_WINDOW_START + 6) + CELL.width / 2} y={BAND_TAG_Y} tone="accent" anchor="center">
        되감기 창
      </Tag>

      {Array.from({ length: END_CELL_COUNT }, (_, i) => {
        const outside = i < END_WINDOW_START;
        const isError = i === REQUESTED && refetch < 0.5;
        const state = isError ? "error" : outside ? "gone" : "live";
        return (
          <SegmentCell
            key={i}
            x={cellX(i)}
            y={ROW_Y}
            width={CELL.width}
            height={CELL.height}
            state={state}
            label={`${i + 1}`}
            opacity={state === "gone" ? 0.75 : 1}
          />
        );
      })}

      {/* 시작 하한 = 새 목록의 첫 조각 + 맨 앞 세 조각 */}
      <svg style={{ position: "absolute", inset: 0, opacity: clamp }} width="100%" height="100%">
        <line x1={cellX(END_WINDOW_START)} y1={ROW_Y + CELL.height + 44} x2={START_FLOOR_X - 16} y2={ROW_Y + CELL.height + 44} stroke={COLOR.accent} strokeWidth={4} />
        <line x1={cellX(END_WINDOW_START)} y1={ROW_Y + CELL.height + 32} x2={cellX(END_WINDOW_START)} y2={ROW_Y + CELL.height + 56} stroke={COLOR.accent} strokeWidth={4} />
        <line x1={START_FLOOR_X - 16} y1={ROW_Y + CELL.height + 32} x2={START_FLOOR_X - 16} y2={ROW_Y + CELL.height + 56} stroke={COLOR.accent} strokeWidth={4} />
        <line x1={START_FLOOR_X} y1={BAND_TOP} x2={START_FLOOR_X} y2={BAND_TOP + BAND_HEIGHT} stroke={COLOR.accent} strokeWidth={5} strokeDasharray="10 8" />
      </svg>
      <Label x={(cellX(END_WINDOW_START) + START_FLOOR_X - 16) / 2} y={ROW_Y + CELL.height + 66} size={TEXT.small} color={COLOR.accent} weight={700} opacity={clamp} anchor="center">
        + 맨 앞 세 조각
      </Label>
      <Label x={START_FLOOR_X} y={BAND_LABEL_Y} size={TEXT.small} color={COLOR.accent} weight={760} opacity={clamp} anchor="center">
        시작 하한
      </Label>

      {/* 요청한 자리에 남는 흔적과 밀린 거리 */}
      <svg style={{ position: "absolute", inset: 0, opacity: slide > 0 ? 0.9 : 0 }} width="100%" height="100%">
        <line x1={PAUSED_X} y1={PLAYHEAD_TOP + 24} x2={PAUSED_X} y2={PLAYHEAD_TOP + PLAYHEAD_HEIGHT} stroke={COLOR.muted} strokeWidth={5} strokeDasharray="10 9" />
      </svg>
      {slide > 0 ? (
        <Arrow x1={PAUSED_X + 14} y1={PLAYHEAD_TOP + 10} x2={START_FLOOR_X - 26} y2={PLAYHEAD_TOP + 10} color={COLOR.accent} draw={slide * 0.999} />
      ) : null}

      <Playhead x={playheadX} top={PLAYHEAD_TOP} height={PLAYHEAD_HEIGHT} color={playheadColor} />
      <Tag x={playheadX} y={PLAYHEAD_TAG_Y} tone={playheadTone} size={TEXT.small} anchor="center">
        {playheadTag}
      </Tag>

      <Tag
        x={cellX(REQUESTED) + CELL.width / 2}
        y={ROW_Y + CELL.height + 126}
        tone="danger"
        opacity={1 - refetch}
        anchor="center"
      >
        404 — 다음 조각이 없음
      </Tag>

      {/* CDN 에서 최신 목록이 올라온다 — 같은 주소, 새 플레이어 */}
      <Node x={CDN.x} y={CDN.y} width={CDN.width} tone="ink" size={TEXT.label} opacity={refetch}>
        <div style={{ textAlign: "center" }}>CDN</div>
      </Node>
      <Label x={CDN.x - 28} y={CDN.y + 6} size={TEXT.small} color={COLOR.ink} weight={680} opacity={refetch} anchor="right">
        같은 주소 · 새 플레이어로
      </Label>
      <Tag x={CDN.x + CDN.width / 2} y={paperY} tone="accent" size={TEXT.small} opacity={paperOpacity} anchor="center">
        최신 재생 목록
      </Tag>

      <Node x={1766 - 640} y={180} width={640} tone="accent" size={TEXT.small} opacity={notify}>
        <div style={{ textAlign: "center" }}>알림 「가장 오래된 지점으로 옮겼어요」</div>
      </Node>

      <StepChips frame={frame} />
    </AbsoluteFill>
  );
};

const CHIP_GAP = 56;

/** 아래쪽 흐름 이름표 줄 — 켜지기 전에는 흐린 회색. */
const StepChips: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <div style={{ position: "absolute", left: LEFT, top: CHIP_Y, display: "flex", alignItems: "center", gap: 0 }}>
    {STEPS.map((step, i) => {
      const on = progress(frame, step.at, 12);
      return (
        <div key={step.text} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 ? (
            <div style={{ width: CHIP_GAP, textAlign: "center", fontFamily: FONT, fontSize: TEXT.small, color: COLOR.muted, opacity: 0.4 + 0.6 * on }}>→</div>
          ) : null}
          <div style={{ position: "relative" }}>
            <Tag x={0} y={0} tone="muted" size={TEXT.small}>
              {step.text}
            </Tag>
            <div style={{ position: "absolute", inset: 0, opacity: on }}>
              <Tag x={0} y={0} tone={step.tone} size={TEXT.small}>
                {step.text}
              </Tag>
            </div>
            {/* 자리 잡기용 — 절대 위치 Tag 는 크기를 차지하지 않는다 */}
            <div style={{ visibility: "hidden", padding: "8px 22px", fontFamily: FONT, fontSize: TEXT.small, fontWeight: 700, whiteSpace: "nowrap" }}>
              {step.text}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);
