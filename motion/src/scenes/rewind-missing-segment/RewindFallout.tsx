import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Arrow, Label, Playhead, SegmentCell, Tag, WindowBand } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, SAFE, TEXT } from "../../theme";
import {
  BAND_HEIGHT,
  BAND_LABEL_Y,
  BAND_TAG_Y,
  BAND_TOP,
  BAND_WIDTH,
  CELL,
  FIRST_WINDOW,
  INITIAL_CELLS,
  LEFT,
  PAUSED_CELL,
  PAUSED_X,
  PLAYHEAD_HEIGHT,
  PLAYHEAD_TAG_Y,
  PLAYHEAD_TOP,
  PUBLISH_COUNT,
  ROW_Y,
  bandX as bandXAt,
  cellX,
} from "./layout";

// 장면 1 — 멈춘 사이 되감기 창이 밀려, 재생점이 창 밖으로 떨어진다.
// 콘티: _workspace/blog/rewind-missing-segment/storyboard.md 장면 1.
// 「하한」 · 「지금」 · 「되감기 창」 은 재생점 머리(ROW_Y - 60)보다 위에 둔다 — 창이 밀릴 때 겹치지 않게.

export const REWIND_FALLOUT_FRAMES = 270;

// 조각 줄 좌표는 N1(RefetchFlow)과 함께 쓰므로 layout.ts 에 있다.
// 발행 시각 — 개수는 layout.ts 의 PUBLISH_COUNT 와 같아야 한다.
const STEP_STARTS = [60, 110, 160] as const satisfies { length: typeof PUBLISH_COUNT };
const SLIDE = 30;
const RESUME_AT = 200;

export const RewindFallout: React.FC = () => {
  const frame = useCurrentFrame();
  const intro = progress(frame, 0, 20);

  // 창의 왼쪽 끝(조각 번호 단위). 발행 한 번마다 한 칸씩 오른쪽으로.
  const windowStart =
    FIRST_WINDOW + STEP_STARTS.reduce((sum, s) => sum + progress(frame, s, SLIDE), 0);
  const bandX = bandXAt(windowStart);
  const bandWidth = BAND_WIDTH;

  const resumed = progress(frame, RESUME_AT, 12);
  const hit = progress(frame, RESUME_AT + 15, 12);
  const playheadX = PAUSED_X;
  const requested = PAUSED_CELL + 1;
  const cellCount = INITIAL_CELLS + STEP_STARTS.length;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={LEFT} y={96} size={TEXT.title} weight={760} opacity={intro}>
        멈춘 사이 되감기 창이 밀리면, 재생점이 창 밖으로 떨어집니다
      </Label>

      <WindowBand x={bandX} y={BAND_TOP} width={bandWidth} height={BAND_HEIGHT} opacity={intro} />
      <Label x={bandX} y={BAND_LABEL_Y} size={TEXT.small} color={COLOR.accent} weight={720} opacity={intro}>
        하한
      </Label>
      <Label x={bandX + bandWidth} y={BAND_LABEL_Y} size={TEXT.small} color={COLOR.accent} weight={720} opacity={intro} anchor="right">
        지금
      </Label>
      <Tag x={bandX + bandWidth / 2} y={BAND_TAG_Y} tone="accent" opacity={intro} anchor="center">
        되감기 창
      </Tag>

      {Array.from({ length: cellCount }, (_, i) => {
        const stepIndex = i - INITIAL_CELLS;
        const born = stepIndex < 0 ? 1 : progress(frame, STEP_STARTS[stepIndex], 15);
        const outside = windowStart > i + 0.5;
        const state = i === requested && hit > 0.5 ? "error" : outside ? "gone" : "live";
        return (
          <SegmentCell
            key={i}
            x={cellX(i)}
            y={ROW_Y}
            width={CELL.width}
            height={CELL.height}
            state={state}
            label={`${i + 1}`}
            opacity={intro * born * (state === "gone" ? 0.75 : 1)}
            scale={0.6 + 0.4 * born}
          />
        );
      })}

      <Playhead
        x={playheadX}
        top={PLAYHEAD_TOP}
        height={PLAYHEAD_HEIGHT}
        color={hit > 0.5 ? COLOR.danger : COLOR.ink}
        opacity={intro}
      />
      <Tag x={playheadX} y={PLAYHEAD_TAG_Y} tone={resumed > 0.5 ? "ink" : "muted"} size={TEXT.small} opacity={progress(frame, 20, 15)} anchor="center">
        {resumed > 0.5 ? "▶ 다시 재생" : "❚❚ 일시정지"}
      </Tag>

      <Label x={LEFT} y={ROW_Y + CELL.height + 54} size={TEXT.small} color={COLOR.muted} opacity={progress(frame, 175, 20)}>
        창 밖 조각 — 지워졌거나 엣지가 막음
      </Label>
      <Tag
        x={cellX(requested) + CELL.width / 2}
        y={ROW_Y + CELL.height + 126}
        tone="danger"
        opacity={hit}
        scale={interpolate(hit, [0, 1], [0.7, 1])}
        anchor="center"
      >
        404 — 다음 조각이 없음
      </Tag>

      <Arrow x1={LEFT} y1={SAFE.bottom - 40} x2={cellX(cellCount - 1) + CELL.width} y2={SAFE.bottom - 40} color={COLOR.muted} draw={intro * 0.999} />
      <Label x={cellX(cellCount - 1) + CELL.width} y={SAFE.bottom - 92} size={TEXT.small} color={COLOR.muted} opacity={intro} anchor="right">
        시간
      </Label>
    </AbsoluteFill>
  );
};
