// 콘티: _workspace/blog/pokeclip-dependency-upgrade-contracts/storyboard.md 「영상 1」
// MediaMTX v1.21.1 계열에서 유효한 HLS 세션을 가진 플레이어가 송출을 끊은 뒤에도 같은 주소를 계속 요청하면
// +1–10초는 200, +11–40초는 404(세션은 살아 있음), +41초부터는 401을 받는다. 근거: PR #217 실측.
// 가로축은 실제 초에 비례한다(0–50초). 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Playhead, SegmentCell, Tag } from "../../components/Timeline";
import type { CellState } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const HLS_SESSION_AFTER_CUT_FRAMES = 330;

/** 장면 순서(프레임, 30fps). 0–50초를 sweep 동안 고르게 훑는다. */
const T = {
  intro: 0,
  cut: 8,
  sweep: 25,
  sweepFrames: 220,
  alive: 140,
  window: 255,
} as const;
const FADE = 12;
const AXIS_END = 50;
/** 요청 점 간격(초). 1 · 3 · … · 49초에 하나씩. */
const REQUEST_EVERY = 2;

type Segment = { readonly from: number; readonly to: number; readonly code: string; readonly state: CellState };

const SEGMENTS: readonly Segment[] = [
  { from: 0, to: 10, code: "200", state: "live" },
  { from: 10, to: 40, code: "404", state: "error" },
  { from: 40, to: AXIS_END, code: "401", state: "gone" },
];
const TICKS = [0, 10, 40] as const;

const DOT_COLOR = { live: COLOR.ink, error: COLOR.danger, gone: COLOR.muted } as const;
const CODE_COLOR = DOT_COLOR;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly x0: number;
  readonly pxPerSecond: number;
  readonly tagY: number;
  readonly cutAnchor: "left" | "center";
  readonly cutX: number;
  readonly reqLabel: { readonly x: number; readonly y: number };
  readonly dotY: number;
  readonly dotR: number;
  /** 재생점 머리의 y. 휴대폰판은 줄 이름표가 재생점 길에 있어 응답 칸 위에서 시작한다. */
  readonly headTop: number;
  readonly resLabel: { readonly x: number; readonly y: number };
  readonly cellY: number;
  readonly cellH: number;
  /** 응답 코드 글자를 띄우기 시작하는 칸 폭(px). */
  readonly codeMinWidth: number;
  readonly axisY: number;
  readonly tickLabelY: number;
  readonly bracketY: number;
  readonly windowTagY: number;
  readonly text: { readonly title: number; readonly label: number; readonly tag: number; readonly code: number };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "송출을 끊은 뒤 같은 HLS 세션이 받는 응답" }],
  titleX: 120,
  x0: 360,
  pxPerSecond: 28.8,
  tagY: 180,
  cutAnchor: "center",
  cutX: 360,
  reqLabel: { x: 120, y: 338 },
  dotY: 364,
  dotR: 13,
  headTop: 310,
  resLabel: { x: 120, y: 494 },
  cellY: 454,
  cellH: 130,
  codeMinWidth: 110,
  axisY: 670,
  tickLabelY: 694,
  bracketY: 820,
  windowTagY: 856,
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small, code: TEXT.label },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "송출을 끊은 뒤 같은 HLS" },
    { y: 124, text: "세션이 받는 응답" },
  ],
  titleX: 60,
  x0: 100,
  pxPerSecond: 18,
  tagY: 270,
  cutAnchor: "left",
  cutX: 60,
  reqLabel: { x: 126, y: 420 },
  dotY: 530,
  dotR: 10,
  headTop: 664,
  resLabel: { x: 126, y: 600 },
  cellY: 700,
  cellH: 150,
  codeMinWidth: 120,
  axisY: 930,
  tickLabelY: 956,
  bracketY: 1100,
  windowTagY: 1136,
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, code: MOBILE_TEXT.label },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const segmentAt = (t: number): Segment =>
  SEGMENTS.find((s) => t > s.from && t <= s.to) ?? SEGMENTS[SEGMENTS.length - 1];

const REQUEST_TIMES = Array.from({ length: AXIS_END / REQUEST_EVERY }, (_, i) => 1 + i * REQUEST_EVERY);

export const HlsSessionAfterCut: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const x = (t: number) => l.x0 + t * l.pxPerSecond;

  const intro = progress(frame, T.intro, 15);
  const cut = progress(frame, T.cut, FADE);
  const sweep = progress(frame, T.sweep, T.sweepFrames, (t) => t);
  const now = sweep * AXIS_END;
  const headX = x(now);
  const sweeping = frame >= T.sweep;
  const headOpacity = sweeping ? 1 - progress(frame, T.sweep + T.sweepFrames, FADE) : 0;
  const alive = progress(frame, T.alive, FADE);
  const windowOn = progress(frame, T.window, 15);

  const bracketL = x(10);
  const bracketR = x(40);
  const tick = 22;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 송출 끊음(0초) — 표시와 점선. */}
      <Tag x={l.cutX} y={l.tagY} tone="ink" size={l.text.tag} anchor={l.cutAnchor} opacity={cut}>
        송출 끊음
      </Tag>
      <div
        style={{
          position: "absolute",
          left: x(0) - 3,
          top: l.tagY + l.text.tag * 1.6,
          width: 0,
          height: l.axisY - (l.tagY + l.text.tag * 1.6),
          borderLeft: `6px dashed ${COLOR.ink}`,
          opacity: cut,
        }}
      />

      <Tag x={x(25)} y={l.tagY} tone="ink" size={l.text.tag} anchor="center" opacity={alive}>
        세션은 살아 있음
      </Tag>

      {/* 요청 줄: 같은 주소를 계속 요청한다. 점 색은 그때 받은 응답. */}
      <Label x={l.reqLabel.x} y={l.reqLabel.y} size={l.text.label} weight={700} opacity={intro}>
        요청
      </Label>
      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
        {REQUEST_TIMES.map((t) => {
          const shown = sweeping && now >= t;
          return (
            <circle
              key={t}
              cx={x(t)}
              cy={l.dotY}
              r={l.dotR}
              fill={DOT_COLOR[segmentAt(t).state]}
              opacity={shown ? 1 : 0}
            />
          );
        })}
      </svg>

      {/* 응답 줄: 재생점이 지나간 만큼 칸이 드러난다. */}
      <Label x={l.resLabel.x} y={l.resLabel.y} size={l.text.label} weight={700} opacity={intro}>
        응답
      </Label>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: sweeping ? headX : 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {SEGMENTS.map((s) => (
          <SegmentCell
            key={s.code}
            x={x(s.from) + 4}
            y={l.cellY}
            width={x(s.to) - x(s.from) - 8}
            height={l.cellH}
            state={s.state}
          />
        ))}
      </div>
      {/* 응답 코드는 드러난 부분의 가운데에 둔다(칸이 자라는 동안 함께 움직인다). */}
      {SEGMENTS.map((s) => {
        const right = Math.min(headX, x(s.to));
        const shown = sweeping
          ? interpolate(right - x(s.from), [l.codeMinWidth, l.codeMinWidth * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : 0;
        return (
          <Label
            key={s.code}
            x={(x(s.from) + right) / 2}
            y={l.cellY + l.cellH / 2 - l.text.code * 0.62}
            size={l.text.code}
            weight={700}
            color={CODE_COLOR[s.state]}
            anchor="center"
            opacity={shown}
          >
            {s.code}
          </Label>
        );
      })}

      {/* 시간축 — 실제 초에 비례. */}
      <svg style={{ position: "absolute", inset: 0, opacity: intro }} width="100%" height="100%">
        <line x1={x(0)} y1={l.axisY} x2={x(AXIS_END) + 30} y2={l.axisY} stroke={COLOR.ink} strokeWidth={5} strokeLinecap="round" />
        <polygon
          points={`${x(AXIS_END) + 52},${l.axisY} ${x(AXIS_END) + 30},${l.axisY - 13} ${x(AXIS_END) + 30},${l.axisY + 13}`}
          fill={COLOR.ink}
        />
        {TICKS.map((t) => (
          <line key={t} x1={x(t)} y1={l.axisY - 16} x2={x(t)} y2={l.axisY + 16} stroke={COLOR.ink} strokeWidth={5} strokeLinecap="round" />
        ))}
      </svg>
      {TICKS.map((t) => (
        <Label key={t} x={x(t)} y={l.tickLabelY} size={l.text.tag} weight={700} color={COLOR.ink} anchor="center" opacity={intro}>
          {`${t}초`}
        </Label>
      ))}

      <Playhead x={headX} top={l.headTop} height={l.axisY - l.headTop} color={COLOR.accent} opacity={headOpacity} />

      {/* 끝: 404 창 30초. */}
      <svg style={{ position: "absolute", inset: 0, opacity: windowOn }} width="100%" height="100%">
        <polyline
          points={`${bracketL},${l.bracketY - tick} ${bracketL},${l.bracketY} ${bracketR},${l.bracketY} ${bracketR},${l.bracketY - tick}`}
          fill="none"
          stroke={COLOR.danger}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <Tag x={x(25)} y={l.windowTagY} tone="danger" size={l.text.tag} anchor="center" opacity={windowOn}>
        404 창 30초
      </Tag>
    </AbsoluteFill>
  );
};
