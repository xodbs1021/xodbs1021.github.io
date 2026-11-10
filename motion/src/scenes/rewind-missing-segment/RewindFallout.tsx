import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Arrow, Label, Playhead, SegmentCell, Tag, WindowBand } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_SAFE, MOBILE_TEXT, SAFE, TEXT } from "../../theme";
import {
  DESKTOP_ROW,
  FIRST_WINDOW,
  INITIAL_CELLS,
  MOBILE_ROW,
  PAUSED_CELL,
  PUBLISH_COUNT,
} from "./layout";

// 장면 1 — 멈춘 사이 되감기 창이 밀려, 재생점이 창 밖으로 떨어진다.
// 콘티: _workspace/blog/rewind-missing-segment/storyboard.md 장면 1.
// 「하한」 · 「지금」 · 「되감기 창」 은 재생점 머리(rowY - 60)보다 위에 둔다 — 창이 밀릴 때 겹치지 않게.
// layout="mobile" 은 1080×1350 휴대폰판(RewindFalloutMobile) — 같은 움직임을 좁은 간격 · 큰 글자로 그린다.

export const REWIND_FALLOUT_FRAMES = 270;

// 조각 줄 좌표는 N1(RefetchFlow)과 함께 쓰므로 layout.ts 에 있다.
// 발행 시각 — 개수는 layout.ts 의 PUBLISH_COUNT 와 같아야 한다.
const STEP_STARTS = [60, 110, 160] as const satisfies { length: typeof PUBLISH_COUNT };
const SLIDE = 30;
const RESUME_AT = 200;

const LAYOUTS = {
  desktop: {
    row: DESKTOP_ROW,
    text: { title: TEXT.title, tag: TEXT.label, small: TEXT.small, cell: TEXT.small },
    title: [{ y: 96, text: "멈춘 사이 되감기 창이 밀리면, 재생점이 창 밖으로 떨어집니다" }],
    goneLabelGap: 54,
    errorTagGap: 126,
    timeY: SAFE.bottom - 40,
    timeLabelGap: 52,
  },
  mobile: {
    row: MOBILE_ROW,
    text: { title: MOBILE_TEXT.title, tag: MOBILE_TEXT.label, small: MOBILE_TEXT.small, cell: MOBILE_TEXT.small },
    title: [
      { y: 110, text: "멈춘 사이 되감기 창이 밀리면," },
      { y: 184, text: "재생점이 창 밖으로 떨어집니다" },
    ],
    goneLabelGap: 50,
    errorTagGap: 128,
    timeY: MOBILE_SAFE.bottom - 60,
    timeLabelGap: 66,
  },
} as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const RewindFallout: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const intro = progress(frame, 0, 20);
  const { row, text, title, goneLabelGap, errorTagGap, timeY, timeLabelGap } = LAYOUTS[layout];
  const { cell, cellX, rowY } = row;

  // 창의 왼쪽 끝(조각 번호 단위). 발행 한 번마다 한 칸씩 오른쪽으로.
  const windowStart =
    FIRST_WINDOW + STEP_STARTS.reduce((sum, s) => sum + progress(frame, s, SLIDE), 0);
  const bandX = row.bandX(windowStart);
  const bandWidth = row.bandWidth;

  const resumed = progress(frame, RESUME_AT, 12);
  const hit = progress(frame, RESUME_AT + 15, 12);
  const playheadX = row.pausedX;
  const requested = PAUSED_CELL + 1;
  const cellCount = INITIAL_CELLS + STEP_STARTS.length;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {title.map((line) => (
        <Label key={line.y} x={row.left} y={line.y} size={text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <WindowBand x={bandX} y={row.bandTop} width={bandWidth} height={row.bandHeight} opacity={intro} />
      <Label x={bandX} y={row.bandLabelY} size={text.small} color={COLOR.accent} weight={720} opacity={intro}>
        하한
      </Label>
      <Label x={bandX + bandWidth} y={row.bandLabelY} size={text.small} color={COLOR.accent} weight={720} opacity={intro} anchor="right">
        지금
      </Label>
      <Tag x={bandX + bandWidth / 2} y={row.bandTagY} tone="accent" size={text.tag} opacity={intro} anchor="center">
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
            y={rowY}
            width={cell.width}
            height={cell.height}
            state={state}
            label={`${i + 1}`}
            size={text.cell}
            opacity={intro * born * (state === "gone" ? 0.75 : 1)}
            scale={0.6 + 0.4 * born}
          />
        );
      })}

      <Playhead
        x={playheadX}
        top={row.playheadTop}
        height={row.playheadHeight}
        color={hit > 0.5 ? COLOR.danger : COLOR.ink}
        opacity={intro}
      />
      <Tag x={playheadX} y={row.playheadTagY} tone={resumed > 0.5 ? "ink" : "muted"} size={text.small} opacity={progress(frame, 20, 15)} anchor="center">
        {resumed > 0.5 ? "▶ 다시 재생" : "❚❚ 일시정지"}
      </Tag>

      <Label x={row.left} y={rowY + cell.height + goneLabelGap} size={text.small} color={COLOR.muted} opacity={progress(frame, 175, 20)}>
        창 밖 조각 — 지워졌거나 엣지가 막음
      </Label>
      <Tag
        x={cellX(requested) + cell.width / 2}
        y={rowY + cell.height + errorTagGap}
        tone="danger"
        size={text.tag}
        opacity={hit}
        scale={interpolate(hit, [0, 1], [0.7, 1])}
        anchor="center"
      >
        404 — 다음 조각이 없음
      </Tag>

      <Arrow x1={row.left} y1={timeY} x2={cellX(cellCount - 1) + cell.width} y2={timeY} color={COLOR.muted} draw={intro * 0.999} />
      <Label x={cellX(cellCount - 1) + cell.width} y={timeY - timeLabelGap} size={text.small} color={COLOR.muted} opacity={intro} anchor="right">
        시간
      </Label>
    </AbsoluteFill>
  );
};
