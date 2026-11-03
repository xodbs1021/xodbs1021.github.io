import { AbsoluteFill } from "remotion";
import { Label, Playhead, SegmentCell, Tag, WindowBand } from "../../components/Timeline";
import { COLOR, TEXT } from "../../theme";
import { BAND_WIDTH, CELL, END_CELL_COUNT, END_WINDOW_START, LEFT, bandX, cellX } from "./layout";

// N2 — 다시 시작할 자리를 어디서 정하나(정지 그림). 위 (가) 추정 · 아래 (나) 다시 받은 목록.
// 콘티: _workspace/blog/rewind-missing-segment/storyboard.md 「(나) 장면」 N2.
// 사실 정본: 원고 정리본 3절 · 4-1 표 다섯째 줄 · 5절 3 · 6절 표 셋째 줄.
// - 두 설계 모두 「하한 + 맨 앞 세 조각(여유)」 에서 시작한다. 다른 것은 하한을 어디서 가져오느냐다.
// - (가) 는 제어면이 알려 준 하한(목록보다 늦거나 빠를 수 있음)에 여유를 더한 추정이라 실제와 어긋날 수 있다.
//   그림은 제어면 값이 한 조각 늦은 경우(5 — 실제 목록 첫 조각은 6)로 그린다.
// - (나) 는 다시 받은 목록의 첫 조각에서 바로 세므로 어긋날 일이 없다.
// 조각 줄 가로 좌표는 장면 1 · N1 과 같게 쓰고, 세로만 두 줄로 나눈다.

const LEAD_CELLS = 3;
const CONTROL_FLOOR = END_WINDOW_START - 1;
const ROW_A = 360;
const ROW_B = 780;
const BRACKET_GAP = 44;

const floorX = (firstCell: number) => cellX(firstCell + LEAD_CELLS);

type BracketProps = {
  readonly from: number;
  readonly to: number;
  readonly y: number;
  readonly color: string;
  readonly label: string;
};

/** 조각 줄 아래 괄호와 가운데 라벨. */
const Bracket: React.FC<BracketProps> = ({ from, to, y, color, label }) => (
  <>
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <line x1={from} y1={y} x2={to} y2={y} stroke={color} strokeWidth={4} />
      <line x1={from} y1={y - 12} x2={from} y2={y + 12} stroke={color} strokeWidth={4} />
      <line x1={to} y1={y - 12} x2={to} y2={y + 12} stroke={color} strokeWidth={4} />
    </svg>
    <Label x={(from + to) / 2} y={y + 18} size={TEXT.small} color={color} weight={700} anchor="center">
      {label}
    </Label>
  </>
);

/** 창 6–13 의 조각 줄 한 벌. */
const Row: React.FC<{ readonly y: number }> = ({ y }) => (
  <>
    <WindowBand x={bandX(END_WINDOW_START)} y={y - 30} width={BAND_WIDTH} height={CELL.height + 60} />
    {Array.from({ length: END_CELL_COUNT }, (_, i) => {
      const gone = i < END_WINDOW_START;
      return (
        <SegmentCell
          key={i}
          x={cellX(i)}
          y={y}
          width={CELL.width}
          height={CELL.height}
          state={gone ? "gone" : "live"}
          label={`${i + 1}`}
          opacity={gone ? 0.75 : 1}
        />
      );
    })}
  </>
);

/** 실제 시작 하한 자리 — 창 띠를 세로로 가르는 점선. */
const FloorLine: React.FC<{ readonly y: number }> = ({ y }) => (
  <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
    <line
      x1={floorX(END_WINDOW_START)} y1={y - 30} x2={floorX(END_WINDOW_START)} y2={y + CELL.height + 30}
      stroke={COLOR.accent} strokeWidth={5} strokeDasharray="10 8"
    />
  </svg>
);

export const StartPositionCompare: React.FC = () => {
  const estimateX = floorX(CONTROL_FLOOR);
  const actualX = floorX(END_WINDOW_START);
  const belowA = ROW_A + CELL.height + BRACKET_GAP;
  const belowB = ROW_B + CELL.height + BRACKET_GAP;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={LEFT} y={96} size={TEXT.title} weight={760}>
        시작 자리를 추정하지 않고, 다시 받은 목록에서 읽습니다
      </Label>

      {/* 위 (가) — 제어면 하한 + 여유 = 추정 */}
      <Label x={LEFT} y={186} size={TEXT.label} weight={760}>
        (가) 제어면이 알려 준 하한에 여유를 더해 추정
      </Label>
      <Row y={ROW_A} />
      <FloorLine y={ROW_A} />
      <Tag x={cellX(CONTROL_FLOOR) + CELL.width / 2} y={ROW_A - 104} tone="muted" size={TEXT.small} anchor="center">
        제어면 하한 = {CONTROL_FLOOR + 1}
      </Tag>
      <Label x={actualX} y={ROW_A - 96} size={TEXT.small} color={COLOR.accent} weight={760} anchor="center">
        실제 시작 하한
      </Label>
      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
        <line x1={estimateX} y1={ROW_A - 50} x2={estimateX} y2={ROW_A + CELL.height + 26} stroke={COLOR.danger} strokeWidth={6} strokeDasharray="12 10" />
      </svg>
      <Bracket from={cellX(CONTROL_FLOOR)} to={estimateX - 16} y={belowA} color={COLOR.muted} label="+ 맨 앞 세 조각" />
      <Label x={estimateX + 10} y={belowA + 18} size={TEXT.small} color={COLOR.danger} weight={720}>
        추정한 자리 — 실제와 어긋날 수 있음
      </Label>

      {/* 아래 (나) — 다시 받은 목록의 첫 조각 + 여유 = 실제 */}
      <Label x={LEFT} y={606} size={TEXT.label} weight={760}>
        (나) 다시 받은 목록에서 바로 읽음
      </Label>
      <Row y={ROW_B} />
      <FloorLine y={ROW_B} />
      <Label x={actualX} y={ROW_B - 116} size={TEXT.small} color={COLOR.accent} weight={760} anchor="center">
        시작 하한
      </Label>
      <Playhead x={actualX} top={ROW_B - 60} height={CELL.height + 86} color={COLOR.ink} />
      <Bracket from={cellX(END_WINDOW_START)} to={actualX - 16} y={belowB} color={COLOR.accent} label="목록 첫 조각 + 세 조각" />
      <Label x={actualX + 30} y={belowB + 18} size={TEXT.small} color={COLOR.accent} weight={720}>
        목록 그대로 — 어긋날 일 없음 ✓
      </Label>
    </AbsoluteFill>
  );
};
