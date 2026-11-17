// 콘티: _workspace/blog/pokeclip-sidecar-rewind-playlist/storyboard.md 「StallLadder」
// 정체 사다리의 두 축(개념도 — 값은 코드의 설계 상수, 실측이 아니다).
// 위 축 holdAge: 머리 다음 조각이 캐시에 있을 때, 그 조각이 실렸어야 할 때(PDT + 길이 + E2E_BUDGET 2초)부터 잰다.
//   0.5초 L1 업로드 재시도 당김 → 2초 L2 GAP.
// 아래 축 stallAge: GAP 을 세울 수 없을 때(조각 없음 · 부적격 · GAP 틱 실패), 마지막 발행 성공부터 잰다.
//   5.5초 L2′ 봉인(스위치 · 기본 끔) → 7.5초 L4 경보.
// 재생점이 위 축을 먼저, 아래 축을 다음에 지나며 단계가 차례로 켜진다. 두 축의 0 은 서로 다른 시각이다.
// layout="mobile" 은 1080×1350 휴대폰판(StallLadderMobile) — 글자 48px 이상.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Playhead, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const STALL_LADDER_FRAMES = 360;

const T = {
  intro: 0,
  topRun: 24,
  topEnd: 114,
  bottomRun: 144,
  bottomEnd: 294,
} as const;

type Step = {
  readonly at: number; // 초
  readonly text: string;
  readonly tone: "accent" | "danger" | "muted";
  readonly tagX: number; // 이름표 왼쪽 끝 또는 가운데(anchor)
  readonly tagY: number;
  readonly anchor: "left" | "center";
};

type Lane = {
  readonly title: string;
  readonly sub: string;
  readonly titleY: number;
  readonly subY: number;
  readonly axisY: number;
  readonly max: number; // 축 끝(초)
  readonly ticks: readonly number[];
  readonly origin: string;
  readonly originY: number;
  readonly steps: readonly Step[];
};

type Layout = {
  readonly x0: number;
  readonly x1: number;
  readonly title: number;
  readonly text: number;
  readonly num: number;
  readonly top: Lane;
  readonly bottom: Lane;
};

const DESKTOP: Layout = {
  x0: 180,
  x1: 1740,
  title: TEXT.title,
  text: TEXT.label,
  num: TEXT.small,
  top: {
    title: "다음 조각이 캐시에 있을 때",
    sub: "holdAge",
    titleY: 70,
    subY: 70,
    axisY: 330,
    max: 2.5,
    ticks: [0, 0.5, 2],
    origin: "0 = 조각 끝 + 2초(실렸어야 할 때)",
    originY: 446,
    steps: [
      { at: 0.5, text: "L1 재시도 당김", tone: "accent", tagX: 492, tagY: 196, anchor: "center" },
      { at: 2, text: "L2 GAP", tone: "accent", tagX: 1428, tagY: 196, anchor: "center" },
    ],
  },
  bottom: {
    title: "GAP을 세울 수 없을 때",
    sub: "stallAge",
    titleY: 560,
    subY: 560,
    axisY: 820,
    max: 8,
    ticks: [0, 5.5, 7.5],
    origin: "0 = 마지막 발행 성공",
    originY: 936,
    steps: [
      { at: 5.5, text: "L2′ 봉인(스위치)", tone: "muted", tagX: 1252, tagY: 686, anchor: "center" },
      { at: 7.5, text: "L4 경보", tone: "danger", tagX: 1642, tagY: 686, anchor: "center" },
    ],
  },
};

const MOBILE: Layout = {
  x0: 90,
  x1: 990,
  title: MOBILE_TEXT.title,
  text: MOBILE_TEXT.label,
  num: MOBILE_TEXT.small,
  top: {
    title: "다음 조각이 캐시에 있을 때",
    sub: "holdAge",
    titleY: 70,
    subY: 140,
    axisY: 400,
    max: 2.5,
    ticks: [0, 0.5, 2],
    origin: "0 = 실렸어야 할 때",
    originY: 540,
    steps: [
      { at: 0.5, text: "L1 재시도", tone: "accent", tagX: 120, tagY: 250, anchor: "left" },
      { at: 2, text: "L2 GAP", tone: "accent", tagX: 810, tagY: 250, anchor: "center" },
    ],
  },
  bottom: {
    title: "GAP을 세울 수 없을 때",
    sub: "stallAge",
    titleY: 660,
    subY: 730,
    axisY: 990,
    max: 8,
    ticks: [0, 5.5, 7.5],
    origin: "0 = 마지막 발행",
    originY: 1200,
    steps: [
      { at: 5.5, text: "L2′ 봉인", tone: "muted", tagX: 709, tagY: 840, anchor: "center" },
      { at: 7.5, text: "L4 경보", tone: "danger", tagX: 990 - 250, tagY: 1086, anchor: "left" },
    ],
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const fmt = (s: number) => (Number.isInteger(s) ? `${s}` : s.toFixed(1));

const LaneView: React.FC<{
  readonly L: Layout;
  readonly lane: Lane;
  readonly frame: number;
  readonly run: number;
  readonly end: number;
  readonly intro: number;
}> = ({ L, lane, frame, run, end, intro }) => {
  const xOf = (s: number) => L.x0 + ((L.x1 - L.x0) * s) / lane.max;
  const t = interpolate(frame, [run, end], [0, lane.max], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const headX = xOf(t);
  const running = frame >= run;
  return (
    <>
      <Label x={L.x0} y={lane.titleY} size={L.title} weight={750} opacity={intro}>
        {lane.title}
      </Label>
      <Label
        x={L === MOBILE ? L.x0 : L.x1}
        y={lane.subY}
        size={L.text}
        color={COLOR.muted}
        anchor={L === MOBILE ? "left" : "right"}
        opacity={intro}
      >
        {lane.sub}
      </Label>
      <svg style={{ position: "absolute", inset: 0, opacity: intro }} width="100%" height="100%">
        <line x1={L.x0} y1={lane.axisY} x2={L.x1} y2={lane.axisY} stroke={COLOR.line} strokeWidth={10} strokeLinecap="round" />
        {running && (
          <line x1={L.x0} y1={lane.axisY} x2={headX} y2={lane.axisY} stroke={COLOR.accent} strokeWidth={10} strokeLinecap="round" />
        )}
        {lane.ticks.map((s) => (
          <line key={s} x1={xOf(s)} y1={lane.axisY - 28} x2={xOf(s)} y2={lane.axisY + 28} stroke={COLOR.ink} strokeWidth={5} />
        ))}
      </svg>
      {lane.ticks.map((s) => (
        <Label key={s} x={xOf(s)} y={lane.axisY + 36} size={L.num} anchor="center" color={COLOR.ink} opacity={intro}>
          {`${fmt(s)}초`}
        </Label>
      ))}
      <Label x={L.x0} y={lane.originY} size={L.num} color={COLOR.muted} weight={600} opacity={intro}>
        {lane.origin}
      </Label>
      {lane.steps.map((st) => {
        const litAt = run + ((end - run) * st.at) / lane.max;
        const lit = progress(frame, litAt, 10);
        const tone = lit > 0 ? st.tone : "muted";
        return (
          <Tag
            key={st.text}
            x={st.tagX}
            y={st.tagY}
            anchor={st.anchor}
            tone={tone}
            size={L.text}
            scale={0.92 + 0.08 * lit}
            opacity={intro * (0.35 + 0.65 * lit)}
          >
            {st.text}
          </Tag>
        );
      })}
      {running && <Playhead x={headX} top={lane.axisY - 92} height={120} color={COLOR.ink} opacity={frame <= end + 20 ? 1 : 0.4} />}
    </>
  );
};

export const StallLadder: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const intro = progress(frame, T.intro, 16);
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <LaneView L={L} lane={L.top} frame={frame} run={T.topRun} end={T.topEnd} intro={intro} />
      <LaneView L={L} lane={L.bottom} frame={frame} run={T.bottomRun} end={T.bottomEnd} intro={intro} />
    </AbsoluteFill>
  );
};
