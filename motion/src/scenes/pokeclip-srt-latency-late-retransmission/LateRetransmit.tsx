// 콘티: _workspace/blog/pokeclip-srt-latency-late-retransmission/storyboard.md 「영상 1」
// 급등 중 잃은 패킷의 재전송이 「보낸 시각 + latency」 창 안에 오는가. 세 줄이 같은 시간축(보낸 뒤 0–4초)을 함께 지난다.
//   1줄 latency 1초 · 잃음 — 창 끝(1초)에 그 자리를 건너뛰고, 2.8초에 온 재전송은 늦어서 버린다.
//   2줄 latency 3초 · 잃음 — 2.8초에 온 재전송이 창 안이라 그 자리를 메운다.
//   3줄 latency 1초 · 잃지 않고 늦기만 함 — 1.5초에 와도 버리지 않고 내보낸다.
// 급등 1.5초 · 재전송 도착 2.8초(≈ 2 × 급등을 창 안쪽에 둔 설명용 배치). 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(LateRetransmitMobile) — 같은 움직임을 큰 글자로 그린다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Playhead, Tag, WindowBand } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const LATE_RETRANSMIT_FRAMES = 330;

/** 시간축 끝(초). */
const SPAN = 4;
/** 재생점이 0초에서 SPAN 초까지 가는 프레임. 상태가 바뀐 뒤 1초 이상 멈춘다(끝 70프레임 유지). */
const SWEEP = { start: 20, end: 260 } as const;
const FADE = 8;

type Tone = "accent" | "danger" | "muted" | "ink";
type Outcome = { readonly at: number; readonly text: string; readonly tone: Tone; readonly anchor: "left" | "center" };
type Row = {
  readonly name: string;
  readonly latency: number;
  readonly lost: boolean;
  /** 패킷(또는 재전송)이 받는 쪽에 닿는 시각과 그 점의 색. */
  readonly arrival: { readonly at: number; readonly tone: Tone };
  readonly outcomes: readonly Outcome[];
};

type Layout = {
  readonly left: number;
  readonly pxPerSecond: number;
  readonly rowYs: readonly [number, number, number];
  readonly bandHeight: number;
  readonly nameGap: number;
  readonly tagGap: number;
  readonly tickY: number;
  readonly dot: number;
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly text: { readonly title: number; readonly name: number; readonly tag: number; readonly tick: number };
  readonly rows: readonly [Row, Row, Row];
};

const rows = (copy: {
  readonly skip: string;
  readonly late: string;
  readonly filled: string;
  readonly passed: string;
}): readonly [Row, Row, Row] => [
  {
    name: "latency 1초 · 급등 중 잃음",
    latency: 1,
    lost: true,
    arrival: { at: 2.8, tone: "muted" },
    outcomes: [
      { at: 1, text: copy.skip, tone: "danger", anchor: "left" },
      { at: 2.8, text: copy.late, tone: "muted", anchor: "center" },
    ],
  },
  {
    name: "latency 3초 · 급등 중 잃음",
    latency: 3,
    lost: true,
    arrival: { at: 2.8, tone: "accent" },
    outcomes: [{ at: 2.8, text: copy.filled, tone: "accent", anchor: "center" }],
  },
  {
    name: "latency 1초 · 잃지 않고 늦기만 함",
    latency: 1,
    lost: false,
    arrival: { at: 1.5, tone: "ink" },
    outcomes: [{ at: 1.5, text: copy.passed, tone: "ink", anchor: "left" }],
  },
];

// 데스크톱: 0–4초를 160–1760 에(1초 = 400px). 줄마다 이름(위) · 창 띠 · 결과 이름표(아래).
const DESKTOP: Layout = {
  left: 160,
  pxPerSecond: 400,
  rowYs: [250, 520, 790],
  bandHeight: 84,
  nameGap: 80,
  tagGap: 18,
  tickY: 985,
  dot: 44,
  title: [{ y: 64, text: "잃은 패킷의 재전송은 창 안에 오는가" }],
  text: { title: TEXT.title, name: TEXT.label, tag: TEXT.small, tick: TEXT.small },
  rows: rows({
    skip: "건너뜀 · 프레임 빠짐",
    late: "늦게 옴 · 버림",
    filled: "창 안에 옴 · 메움",
    passed: "늦어도 내보냄 · 구멍 없음",
  }),
};

// 휴대폰판: 같은 0–4초를 60–1020 에(1초 = 240px). 글자 48px 이상.
const MOBILE: Layout = {
  left: 60,
  pxPerSecond: 240,
  rowYs: [360, 695, 1030],
  bandHeight: 84,
  nameGap: 92,
  tagGap: 18,
  tickY: 1262,
  dot: 44,
  title: [
    { y: 80, text: "잃은 패킷의 재전송은" },
    { y: 150, text: "창 안에 오는가" },
  ],
  text: { title: MOBILE_TEXT.title, name: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, tick: MOBILE_TEXT.small },
  rows: rows({
    skip: "건너뜀",
    late: "늦게 옴 · 버림",
    filled: "창 안에 옴",
    passed: "늦어도 내보냄",
  }),
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const DOT_COLOR: Record<Tone, string> = {
  accent: COLOR.accent,
  danger: COLOR.danger,
  muted: COLOR.muted,
  ink: COLOR.ink,
};

/** 재생점이 지금 가리키는 시각(초). */
const nowSeconds = (frame: number): number =>
  SPAN * progress(frame, SWEEP.start, SWEEP.end - SWEEP.start, (t) => t);

/** 시각 at 에 재생점이 닿은 뒤 0→1 로 나타나는 정도. */
const reveal = (frame: number, at: number): number =>
  progress(frame, SWEEP.start + ((SWEEP.end - SWEEP.start) * at) / SPAN, FADE, EASE_IN_OUT);

export const LateRetransmit: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const x = (t: number): number => l.left + t * l.pxPerSecond;
  const intro = progress(frame, 0, 15);
  const now = nowSeconds(frame);
  const gridTop = l.rowYs[0] - 24;
  const gridBottom = l.rowYs[2] + l.bandHeight + 12;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.left} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 1초마다 옅은 세로 눈금선과 아래 눈금 글자. */}
      {Array.from({ length: SPAN + 1 }, (_, s) => (
        <div key={s}>
          <div
            style={{
              position: "absolute",
              left: x(s) - 1,
              top: gridTop,
              width: 0,
              height: gridBottom - gridTop,
              borderLeft: `3px dashed ${COLOR.line}`,
              opacity: intro,
            }}
          />
          <Label
            x={x(s)}
            y={l.tickY}
            size={l.text.tick}
            color={COLOR.muted}
            weight={600}
            anchor={s === 0 ? "left" : s === SPAN ? "right" : "center"}
            opacity={intro}
          >
            {s === 0 ? "보냄" : `${s}초`}
          </Label>
        </div>
      ))}

      {l.rows.map((row, r) => {
        const y = l.rowYs[r];
        const arrived = reveal(frame, row.arrival.at);
        const dotSize = l.dot * interpolate(arrived, [0, 1], [0.4, 1]);
        return (
          <div key={row.name}>
            <Label x={l.left} y={y - l.nameGap} size={l.text.name} weight={720} opacity={intro}>
              {row.name}
            </Label>

            {/* 창: 보낸 시각 + latency 까지 받는 쪽이 기다리는 구간. */}
            <WindowBand x={x(0)} y={y} width={row.latency * l.pxPerSecond} height={l.bandHeight} opacity={intro} />

            {row.lost ? (
              <Label
                x={x(0) + 26}
                y={y + l.bandHeight / 2 - l.text.name * 0.62}
                size={l.text.name}
                color={COLOR.danger}
                weight={800}
                opacity={reveal(frame, 0)}
              >
                ✕
              </Label>
            ) : null}

            {/* 패킷(줄 3) 또는 재전송(줄 1 · 2)이 닿는 점. */}
            <div
              style={{
                position: "absolute",
                left: x(row.arrival.at) - dotSize / 2,
                top: y + l.bandHeight / 2 - dotSize / 2,
                width: dotSize,
                height: dotSize,
                borderRadius: "50%",
                background: DOT_COLOR[row.arrival.tone],
                opacity: arrived,
              }}
            />

            {row.outcomes.map((o) => {
              const shown = reveal(frame, o.at);
              return (
                <Tag
                  key={o.text}
                  x={o.anchor === "left" ? x(o.at) - 18 : x(o.at)}
                  y={y + l.bandHeight + l.tagGap}
                  tone={o.tone}
                  size={l.text.tag}
                  anchor={o.anchor}
                  opacity={shown}
                  scale={interpolate(shown, [0, 1], [0.85, 1])}
                >
                  {o.text}
                </Tag>
              );
            })}

            <Playhead x={x(now)} top={y - 22} height={l.bandHeight + 36} color={COLOR.ink} opacity={intro} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
