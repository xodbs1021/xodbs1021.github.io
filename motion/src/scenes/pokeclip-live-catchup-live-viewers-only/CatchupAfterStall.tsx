// 콘티: _workspace/blog/pokeclip-live-catchup-live-viewers-only/storyboard.md 「CatchupAfterStall」
// 끊김을 놓은 뒤의 지연(재구성 — 공개 재측정의 표본을 1초 간격으로 줄여 시간 · 지연 축에 비례해 다시 그린다).
// 위 칸: 6초 끊김 뒤. 회색 = 따라잡기 끔(Chrome), 회색 점선 = WebKit 점프만, 청록 = 배속 규칙(Chrome).
// 아래 칸: 13초 끊김 뒤. 같은 세 선 — 규칙과 WebKit 점프만은 10초를 넘어 점프한다.
// 재생점이 위 칸을 먼저, 아래 칸을 다음에 지나며 선이 그려진다. 청록 선 끝의 이름표가 그 순간의 배속이다.
// layout="mobile" 은 1080×1350 휴대폰판(CatchupAfterStallMobile) — 글자 48px 이상.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";
import { DRIFT } from "./data";

export const CATCHUP_AFTER_STALL_FRAMES = 360;

const T = { intro: 0, topRun: 20, topEnd: 170, bottomRun: 190, bottomEnd: 320 } as const;

type Point = readonly [number, number, number];
type Series = { readonly pts: readonly Point[]; readonly target: number; readonly jumps: readonly number[] };
type PanelData = { readonly off: Series; readonly rule: Series; readonly webkitJumpOnly: Series };

type Box = {
  readonly title: string;
  readonly titleY: number;
  readonly top: number; // 그림 칸 위(지연 최대)
  readonly bottom: number; // 그림 칸 아래(지연 0)
  readonly yMax: number; // 초
  readonly yTicks: readonly number[];
  readonly xTicks: readonly number[];
};

type Layout = {
  readonly x0: number;
  readonly x1: number;
  readonly title: number;
  readonly text: number;
  readonly num: number;
  /** 범례 세 항목의 왼쪽 위(휴대폰판은 두 줄) */
  readonly legend: readonly (readonly [number, number])[];
  readonly panels: readonly [Box, Box];
};

const DESKTOP: Layout = {
  x0: 250,
  x1: 1640,
  title: TEXT.title,
  text: TEXT.label,
  num: TEXT.small,
  legend: [
    [700, 40],
    [1010, 40],
    [1370, 40],
  ],
  panels: [
    { title: "6초 끊김 뒤", titleY: 40, top: 150, bottom: 450, yMax: 8, yTicks: [0, 4, 8], xTicks: [0, 25, 50] },
    { title: "13초 끊김 뒤", titleY: 540, top: 650, bottom: 950, yMax: 20, yTicks: [0, 10, 20], xTicks: [0, 20, 40] },
  ],
};

const MOBILE: Layout = {
  x0: 150,
  x1: 880,
  title: MOBILE_TEXT.title,
  text: MOBILE_TEXT.label,
  num: MOBILE_TEXT.small,
  legend: [
    [60, 1180],
    [480, 1180],
    [60, 1250],
  ],
  panels: [
    { title: "6초 끊김 뒤", titleY: 30, top: 140, bottom: 490, yMax: 8, yTicks: [0, 4, 8], xTicks: [0, 25, 50] },
    { title: "13초 끊김 뒤", titleY: 600, top: 720, bottom: 1070, yMax: 20, yTicks: [0, 10, 20], xTicks: [0, 20, 40] },
  ],
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const rateText = (r: number) => (r === 1 ? "1배" : `${r}배`);

/** 재생점 시각(초) t 까지의 꺾은선. t 사이의 값은 이웃 표본을 잇는다 */
function pathUntil(pts: readonly Point[], t: number, xOf: (s: number) => number, yOf: (v: number) => number): string {
  const drawn = pts.filter(([s]) => s <= t);
  if (drawn.length === 0) return "";
  const next = pts.find(([s]) => s > t);
  const last = drawn[drawn.length - 1];
  const tail =
    next && t > last[0]
      ? [[t, last[1] + ((next[1] - last[1]) * (t - last[0])) / (next[0] - last[0])] as const]
      : [];
  return [...drawn.map(([s, v]) => [s, v] as const), ...tail]
    .map(([s, v], i) => `${i === 0 ? "M" : "L"}${xOf(s).toFixed(1)},${yOf(v).toFixed(1)}`)
    .join(" ");
}

const PanelView: React.FC<{
  readonly L: Layout;
  readonly box: Box;
  readonly data: PanelData;
  readonly span: number;
  readonly frame: number;
  readonly run: number;
  readonly end: number;
  readonly intro: number;
}> = ({ L, box, data, span, frame, run, end, intro }) => {
  const xOf = (s: number) => L.x0 + ((L.x1 - L.x0) * s) / span;
  const yOf = (v: number) => box.bottom - ((box.bottom - box.top) * Math.min(v, box.yMax)) / box.yMax;
  const t = interpolate(frame, [run, end], [0, span], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const running = frame >= run;
  const target = data.rule.target;
  const passed = data.rule.pts.filter(([s]) => s <= t);
  const head = passed.length > 0 ? passed[passed.length - 1] : undefined;
  const jumpsShown = data.rule.jumps.filter((s) => s <= t);
  return (
    <>
      <Label x={60} y={box.titleY} size={L.title} weight={750} opacity={intro}>
        {box.title}
      </Label>
      <svg style={{ position: "absolute", inset: 0, opacity: intro }} width="100%" height="100%">
        <line x1={L.x0} y1={box.bottom} x2={L.x1} y2={box.bottom} stroke={COLOR.line} strokeWidth={6} />
        <line x1={L.x0} y1={box.top} x2={L.x0} y2={box.bottom} stroke={COLOR.line} strokeWidth={6} />
        <line
          x1={L.x0}
          y1={yOf(target)}
          x2={L.x1}
          y2={yOf(target)}
          stroke={COLOR.accent}
          strokeWidth={4}
          strokeDasharray="14 12"
          opacity={0.7}
        />
        {running && (
          <>
            <path d={pathUntil(data.off.pts, t, xOf, yOf)} fill="none" stroke={COLOR.muted} strokeWidth={8} strokeLinejoin="round" />
            <path
              d={pathUntil(data.webkitJumpOnly.pts, t, xOf, yOf)}
              fill="none"
              stroke={COLOR.muted}
              strokeWidth={6}
              strokeDasharray="18 14"
              strokeLinejoin="round"
            />
            <path d={pathUntil(data.rule.pts, t, xOf, yOf)} fill="none" stroke={COLOR.accent} strokeWidth={10} strokeLinejoin="round" />
          </>
        )}
      </svg>
      {box.yTicks.map((v) => (
        <Label key={v} x={L.x0 - 24} y={yOf(v) - L.num * 0.62} size={L.num} anchor="right" color={COLOR.muted} opacity={intro}>
          {`${v}초`}
        </Label>
      ))}
      {box.xTicks.map((s) => (
        <Label key={s} x={xOf(s)} y={box.bottom + 14} size={L.num} anchor="center" color={COLOR.muted} opacity={intro}>
          {`${s}초`}
        </Label>
      ))}
      <Label x={L.x1 + 20} y={yOf(target) - L.num * 0.62} size={L.num} color={COLOR.accent} weight={700} opacity={intro}>
        목표
      </Label>
      {/* 축 이름: 세로 = 지연(라이브 끝 − 재생 위치), 가로 = 끊김을 놓은 뒤의 시간 */}
      <Label x={L.x0 + 16} y={box.top - L.num * 0.62} size={L.num} color={COLOR.muted} weight={700} opacity={intro}>
        지연
      </Label>
      <Label
        x={(xOf(box.xTicks[1]) + xOf(box.xTicks[2])) / 2}
        y={box.bottom + 14}
        size={L.num}
        anchor="center"
        color={COLOR.muted}
        weight={700}
        opacity={intro}
      >
        놓은 뒤 →
      </Label>
      {jumpsShown.map((s) => (
        <Tag key={s} x={xOf(s) + L.num * 3.5} y={box.top - 10} tone="accent" size={L.num} opacity={progress(frame, run + ((end - run) * s) / span, 8)}>
          점프
        </Tag>
      ))}
      {running && head && jumpsShown.length === 0 && (
        <Tag
          x={Math.min(xOf(t) + 24, L.x1 - 160)}
          y={yOf(head[1]) - L.num * 2.1}
          tone={head[2] === 1 ? "muted" : "accent"}
          size={L.num}
        >
          {rateText(head[2])}
        </Tag>
      )}
    </>
  );
};

const Legend: React.FC<{ readonly L: Layout; readonly intro: number }> = ({ L, intro }) => {
  const items = [
    { text: "끔(Chrome)", color: COLOR.muted, dash: undefined, width: 8 },
    { text: "WebKit 점프만", color: COLOR.muted, dash: "14 10", width: 6 },
    { text: "배속 규칙(Chrome)", color: COLOR.accent, dash: undefined, width: 10 },
  ] as const;
  return (
    <>
      {items.map((it, i) => (
        <div key={it.text} style={{ position: "absolute", left: L.legend[i][0], top: L.legend[i][1], opacity: intro }}>
          <svg width={70} height={L.text} style={{ position: "absolute", left: 0, top: 0 }}>
            <line x1={0} y1={L.text / 2 + 4} x2={64} y2={L.text / 2 + 4} stroke={it.color} strokeWidth={it.width} strokeDasharray={it.dash} />
          </svg>
          <Label x={80} y={0} size={L.num} color={COLOR.ink}>
            {it.text}
          </Label>
        </div>
      ))}
    </>
  );
};

export const CatchupAfterStall: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const intro = progress(frame, T.intro, 16);
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <Legend L={L} intro={intro} />
      <PanelView L={L} box={L.panels[0]} data={DRIFT.panels[0]} span={DRIFT.spans[0]} frame={frame} run={T.topRun} end={T.topEnd} intro={intro} />
      <PanelView L={L} box={L.panels[1]} data={DRIFT.panels[1]} span={DRIFT.spans[1]} frame={frame} run={T.bottomRun} end={T.bottomEnd} intro={intro} />
    </AbsoluteFill>
  );
};
