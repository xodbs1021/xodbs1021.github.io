import { AbsoluteFill } from "remotion";
import { Label } from "../../components/Timeline";
import { COLOR, FONT, TEXT } from "../../theme";

// 장면 3 — 엣지 하한은 늘 재생 목록의 첫 조각보다 늦게 따라온다(정지 그림).
// 콘티: _workspace/blog/rewind-missing-segment/storyboard.md 장면 3.
// 수치: 목록 5분마다 발행, 엣지 하한은 「60초 전까지 발행된 목록의 첫 조각」 + 전파 30–60초 → 90–120초 늦음.
// 그림은 가장 늦은 경우(EDGE_LAG = 2분)로 그린다 — 라벨에 「최대」 를 밝힌다.

const X0 = 230;
const X1 = 1500;
const Y_BOTTOM = 880;
const Y_TOP = 300;
const MINUTES = 21;
const PUBLISH_EVERY = 5;
const EDGE_LAG = 2;
const MAX_LEVEL = 5.3;
const PROBE_AT = 11.5;

const x = (minute: number) => X0 + (minute / MINUTES) * (X1 - X0);
const y = (level: number) => Y_BOTTOM - (level / MAX_LEVEL) * (Y_BOTTOM - Y_TOP);

/** 재생 목록의 첫 조각(창 하한): 발행 때마다 한 칸 오른다. */
const playlistLevel = (minute: number) => 1 + Math.floor(minute / PUBLISH_EVERY);
/** 엣지 하한: 같은 계단을 EDGE_LAG 분 늦게 밟는다. */
const edgeLevel = (minute: number) => (minute < EDGE_LAG ? 0 : playlistLevel(minute - EDGE_LAG));

/** 계단 함수를 SVG 경로 점 목록으로. */
const stepPoints = (level: (m: number) => number, offset: number): Array<[number, number]> => {
  const points: Array<[number, number]> = [[0, level(0)]];
  for (let m = offset; m < MINUTES; m += PUBLISH_EVERY) {
    if (m <= 0) continue;
    points.push([m, level(m - 0.001)], [m, level(m)]);
  }
  points.push([MINUTES, level(MINUTES - 0.001)]);
  return points;
};

const toPath = (points: Array<[number, number]>) =>
  points.map(([m, l], i) => `${i === 0 ? "M" : "L"}${x(m)},${y(l)}`).join(" ");

export const EdgeLagsPlaylist: React.FC = () => {
  const playlist = stepPoints(playlistLevel, 0);
  const edge = stepPoints(edgeLevel, EDGE_LAG);
  const gap = `${toPath(playlist)} ${[...edge].reverse().map(([m, l]) => `L${x(m)},${y(l)}`).join(" ")} Z`;
  const probeX = x(PROBE_AT);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={X0 - 76} y={96} size={TEXT.title} weight={760}>
        엣지 하한은 늘 재생 목록보다 늦게 따라옵니다
      </Label>

      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
        <path d={gap} fill={COLOR.accentSoft} />
        <line x1={X0} y1={Y_BOTTOM} x2={X1} y2={Y_BOTTOM} stroke={COLOR.muted} strokeWidth={3} />
        {[0, 5, 10, 15, 20].map((m) => (
          <g key={m}>
            <line x1={x(m)} y1={Y_BOTTOM} x2={x(m)} y2={Y_BOTTOM + 16} stroke={COLOR.muted} strokeWidth={3} />
            <text x={x(m)} y={Y_BOTTOM + 62} fontSize={TEXT.small} fill={COLOR.muted} textAnchor="middle">
              {m}분
            </text>
          </g>
        ))}
        <path d={toPath(playlist)} fill="none" stroke={COLOR.accent} strokeWidth={9} strokeLinejoin="round" />
        <path d={toPath(edge)} fill="none" stroke={COLOR.danger} strokeWidth={9} strokeLinejoin="round" />

        {/* 발행 주기 괄호 — 0→5분, 첫 계단 위 */}
        <line x1={x(0)} y1={y(1) - 60} x2={x(5) - 12} y2={y(1) - 60} stroke={COLOR.ink} strokeWidth={3} />
        <line x1={x(0)} y1={y(1) - 74} x2={x(0)} y2={y(1) - 46} stroke={COLOR.ink} strokeWidth={3} />
        <line x1={x(5) - 12} y1={y(1) - 74} x2={x(5) - 12} y2={y(1) - 46} stroke={COLOR.ink} strokeWidth={3} />
        <text x={(x(0) + x(5) - 12) / 2} y={y(1) - 86} fontSize={TEXT.small} fill={COLOR.ink} textAnchor="middle" fontWeight={650}>
          5분마다 발행
        </text>

        {/* 늦게 따라오는 시간 괄호 — 15→17분, 셋째 엣지 계단 아래 */}
        <line x1={x(15)} y1={y(3) + 56} x2={x(17)} y2={y(3) + 56} stroke={COLOR.danger} strokeWidth={3} />
        <line x1={x(15)} y1={y(3) + 42} x2={x(15)} y2={y(3) + 70} stroke={COLOR.danger} strokeWidth={3} />
        <line x1={x(17)} y1={y(3) + 42} x2={x(17)} y2={y(3) + 70} stroke={COLOR.danger} strokeWidth={3} />
        <text x={x(15)} y={y(3) + 112} fontSize={TEXT.small} fill={COLOR.danger} textAnchor="start" fontWeight={650}>
          최대 약 2분 늦게(여유 60초 + 전파 30–60초)
        </text>

        {/* 방금 받은 목록 */}
        <line x1={probeX} y1={Y_TOP + 40} x2={probeX} y2={Y_BOTTOM} stroke={COLOR.ink} strokeWidth={3} strokeDasharray="12 10" />
        <circle cx={probeX} cy={y(playlistLevel(PROBE_AT))} r={14} fill={COLOR.accent} />
        <circle cx={probeX} cy={y(edgeLevel(PROBE_AT))} r={14} fill={COLOR.danger} />
      </svg>

      <Label x={X1 + 30} y={y(playlistLevel(MINUTES)) - 34} size={TEXT.label} color={COLOR.accent} weight={760}>
        재생 목록의 첫 조각
      </Label>
      <Label x={X1 + 30} y={y(edgeLevel(MINUTES)) + 4} size={TEXT.label} color={COLOR.danger} weight={760}>
        엣지 하한
      </Label>
      <Label x={X1 + 30} y={y(edgeLevel(MINUTES)) + 58} size={TEXT.small} color={COLOR.muted}>
        이보다 앞 조각은 막음
      </Label>
      <Label x={probeX + 24} y={Y_BOTTOM - 96} size={TEXT.small} weight={700}>
        방금 받은 목록의 첫 조각 ≥ 엣지 하한 → 막히지 않음 ✓
      </Label>
      <Label x={X0 - 76} y={Y_TOP - 110} size={TEXT.small} color={COLOR.muted}>
        ↑ 창 하한(조각 번호)
      </Label>
    </AbsoluteFill>
  );
};
