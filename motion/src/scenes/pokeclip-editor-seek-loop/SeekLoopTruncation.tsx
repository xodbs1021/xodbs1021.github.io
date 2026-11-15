// 콘티: _workspace/blog/pokeclip-editor-seek-loop/storyboard.md 「SeekLoopTruncation」
// 위 줄: 멈춘 영상에 구간 시작(10.4370111…초, 90kHz 틱 939,331개)을 넣으면 Chrome 이 µs 아래를 버려 10.437011 에 둔다.
//        「위치 < 시작」 엄격 비교는 그 자리를 시작 앞으로 보고 같은 값을 다시 넣어 끝없이 되풀이한다.
// 아래 줄: 「위치 < 시작 − 1ms」 이면 깎인 자리는 여유 안이라 그대로 머문다(넣기 1번).
// 10.437011 과 0.111µs 차는 2026-11-16 공개 재측정(Chrome 157) 값이다. 되풀이 속도와 횟수는 설명용이다.
// layout="mobile" 은 1080×1350 휴대폰판(SeekLoopTruncationMobile) — 같은 구성, 글자는 48px 이상.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const SEEK_LOOP_TRUNCATION_FRAMES = 330;

// 첫 바퀴: 앉기 20–30 · 깎임 40–52 · 판정 60 · (위 줄) 되돌아감 80–88. 그 뒤 위 줄만 30프레임마다 한 바퀴 더.
const T = { intro: 0, land: 20, snap: 40, judge: 60, back: 80, repeatFrom: 90, period: 30, repeats: 5 } as const;
// 시작 = …011 눈금과 …012 눈금 사이 0.111 지점(10.4370111…초)
const START_FRACTION = 1 / 9;

type Row = {
  readonly titleY: number;
  readonly subtitleY?: number;
  readonly startLabelY: number;
  readonly lineY: number;
  readonly tickLabelY: number;
  readonly cutTag: { readonly x: number; readonly y: number };
  readonly judgeTag: { readonly x: number; readonly y: number };
  readonly countTag?: { readonly x: number; readonly y: number };
  readonly band?: { readonly top: number; readonly height: number };
};

type Layout = {
  readonly ticks: readonly [number, number, number];
  readonly tickLabels: readonly [string, string, string];
  readonly bandX: readonly [number, number];
  readonly title: number;
  readonly text: number;
  readonly dot: number;
  readonly strict: Row;
  readonly tolerant: Row;
  readonly strictTitle: string;
  readonly strictSubtitle?: string;
  readonly tolerantTitle: string;
  readonly tolerantSubtitle?: string;
  readonly strictJudge: string;
  readonly tolerantJudge: string;
};

const DESKTOP: Layout = {
  ticks: [360, 960, 1560],
  tickLabels: ["10.437010", "10.437011", "10.437012"],
  bandX: [200, 1720],
  title: TEXT.label,
  text: TEXT.small,
  dot: 24,
  strict: {
    titleY: 60,
    startLabelY: 170,
    lineY: 320,
    tickLabelY: 352,
    cutTag: { x: 200, y: 420 },
    judgeTag: { x: 520, y: 420 },
    countTag: { x: 1230, y: 420 },
  },
  tolerant: {
    titleY: 560,
    startLabelY: 670,
    lineY: 820,
    tickLabelY: 852,
    cutTag: { x: 200, y: 920 },
    judgeTag: { x: 520, y: 920 },
    band: { top: 760, height: 84 },
  },
  strictTitle: "엄격 비교 · 위치 < 시작이면 다시 넣기",
  tolerantTitle: "1ms 여유 · 위치 < 시작 − 1ms 일 때만 다시 넣기",
  tolerantSubtitle: "띠 = 시작 − 1ms 안(시작으로 봄)",
  strictJudge: "10.437011 < 시작 → 다시 넣기",
  tolerantJudge: "띠 안 → 그대로 · 넣기 1번",
};

const MOBILE: Layout = {
  ticks: [140, 540, 940],
  tickLabels: ["…010", "…011", "…012"],
  bandX: [60, 1020],
  title: MOBILE_TEXT.title,
  text: MOBILE_TEXT.small,
  dot: 26,
  strict: {
    titleY: 50,
    subtitleY: 122,
    startLabelY: 200,
    lineY: 340,
    tickLabelY: 374,
    cutTag: { x: 60, y: 450 },
    judgeTag: { x: 60, y: 535 },
    countTag: { x: 640, y: 450 },
  },
  tolerant: {
    titleY: 680,
    subtitleY: 752,
    startLabelY: 830,
    lineY: 970,
    tickLabelY: 1004,
    cutTag: { x: 60, y: 1080 },
    judgeTag: { x: 60, y: 1165 },
    band: { top: 906, height: 92 },
  },
  strictTitle: "엄격 비교",
  strictSubtitle: "위치 < 시작이면 다시 넣기",
  tolerantTitle: "1ms 여유",
  tolerantSubtitle: "띠 = 시작 − 1ms 안",
  strictJudge: "시작 앞 → 다시 넣기",
  tolerantJudge: "띠 안 → 그대로 · 넣기 1번",
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 위 줄에서 몇 번째 바퀴까지 시작으로 되돌아갔는지(첫 넣기 = 1). */
const strictPass = (frame: number): number => {
  let pass = frame >= T.land ? 1 : 0;
  if (frame >= T.back) pass += 1;
  for (let k = 1; k < T.repeats; k += 1) if (frame >= T.repeatFrom + T.period * k) pass += 1;
  return pass;
};

/** 위 줄 점의 x: 시작과 …011 눈금 사이를 오간다. 0 = 시작, 1 = 깎인 자리. */
const strictCut = (frame: number): number => {
  if (frame < T.back) return progress(frame, T.snap, 12, EASE_IN_OUT);
  // 되돌아갈 때마다 시작으로 튀고(6프레임) 12프레임 뒤 다시 깎인다(6프레임)
  const backs = [T.back, ...Array.from({ length: T.repeats - 1 }, (_, i) => T.repeatFrom + T.period * (i + 1))];
  const last = [...backs].reverse().find((b) => frame >= b) ?? T.back;
  const toStart = progress(frame, last, 6, EASE_IN_OUT);
  const toCut = progress(frame, last + 12, 6, EASE_IN_OUT);
  return 1 - toStart + toCut;
};

const Dot: React.FC<{ readonly x: number; readonly y: number; readonly r: number; readonly color: string; readonly opacity: number }> = ({
  x, y, r, color, opacity,
}) => (
  <div
    style={{
      position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%",
      background: color, border: `4px solid ${COLOR.white}`, boxShadow: `0 0 0 3px ${color}`, opacity,
    }}
  />
);

const Ruler: React.FC<{ readonly l: Layout; readonly row: Row; readonly opacity: number }> = ({ l, row, opacity }) => {
  const startX = l.ticks[1] + (l.ticks[2] - l.ticks[1]) * START_FRACTION;
  return (
    <>
      {row.band ? (
        <div
          style={{
            position: "absolute", left: l.bandX[0], top: row.band.top, width: l.bandX[1] - l.bandX[0], height: row.band.height,
            background: COLOR.accentSoft, borderRadius: 12, opacity,
          }}
        />
      ) : null}
      <div style={{ position: "absolute", left: l.bandX[0], top: row.lineY - 2, width: l.bandX[1] - l.bandX[0], height: 4, background: COLOR.muted, opacity }} />
      {l.ticks.map((x, i) => (
        <div key={x}>
          <div style={{ position: "absolute", left: x - 2, top: row.lineY - 22, width: 4, height: 44, background: COLOR.ink, opacity }} />
          <Label x={x} y={row.tickLabelY} size={l.text} color={COLOR.muted} anchor="center" opacity={opacity}>
            {l.tickLabels[i]}
          </Label>
        </div>
      ))}
      <div style={{ position: "absolute", left: startX - 3, top: row.startLabelY + 64, width: 6, height: row.lineY + 30 - (row.startLabelY + 64), background: COLOR.accent, opacity }} />
      <Label x={startX} y={row.startLabelY} size={l.text} color={COLOR.accent} weight={760} anchor="center" opacity={opacity}>
        시작 10.4370111…
      </Label>
    </>
  );
};

export const SeekLoopTruncation: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, T.intro, 14);
  const startX = l.ticks[1] + (l.ticks[2] - l.ticks[1]) * START_FRACTION;
  const cutX = l.ticks[1];

  // 첫 넣기: 시작 선 위에서 내려와 앉는다
  const drop = progress(frame, T.land, 10);
  const dropOffset = interpolate(drop, [0, 1], [-110, 0]);
  const dotOpacity = progress(frame, T.land, 6);

  const strictX = interpolate(strictCut(frame), [0, 1], [startX, cutX]);
  const tolerantX = interpolate(progress(frame, T.snap, 12, EASE_IN_OUT), [0, 1], [startX, cutX]);
  const cutOpacity = progress(frame, T.snap + 4, 12);
  const judgeOpacity = progress(frame, T.judge, 12);
  const pass = strictPass(frame);

  const rows = [
    { row: l.strict, title: l.strictTitle, subtitle: l.strictSubtitle, titleColor: COLOR.ink, x: strictX, dotColor: COLOR.danger },
    { row: l.tolerant, title: l.tolerantTitle, subtitle: l.tolerantSubtitle, titleColor: COLOR.accent, x: tolerantX, dotColor: COLOR.accent },
  ] as const;

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {rows.map(({ row, title, subtitle, titleColor, x, dotColor }) => (
        <div key={title}>
          <Label x={l.bandX[0]} y={row.titleY} size={l.title} weight={780} color={titleColor} opacity={intro}>
            {title}
          </Label>
          {subtitle && row.subtitleY !== undefined ? (
            <Label x={l.bandX[0]} y={row.subtitleY} size={l.text} color={COLOR.muted} opacity={intro}>
              {subtitle}
            </Label>
          ) : null}
          <Ruler l={l} row={row} opacity={intro} />
          <Dot x={x} y={row.lineY + dropOffset} r={l.dot} color={dotColor} opacity={dotOpacity} />
          <Tag x={row.cutTag.x} y={row.cutTag.y} size={l.text} tone="muted" opacity={cutOpacity}>
            µs 아래 버림
          </Tag>
        </div>
      ))}
      {/* 데스크톱은 아래 줄 띠 설명을 제목 오른쪽에 둔다 */}
      {layout === "desktop" && l.tolerantSubtitle ? (
        <Label x={l.bandX[1]} y={l.tolerant.startLabelY} size={l.text} color={COLOR.muted} anchor="right" opacity={intro}>
          {l.tolerantSubtitle}
        </Label>
      ) : null}
      <Tag x={l.strict.judgeTag.x} y={l.strict.judgeTag.y} size={l.text} tone="danger" opacity={judgeOpacity}>
        {l.strictJudge}
      </Tag>
      {l.strict.countTag ? (
        <Tag x={l.strict.countTag.x} y={l.strict.countTag.y} size={l.text} tone="ink" opacity={progress(frame, T.back, 10)}>
          {`넣기 ${pass}번째 …`}
        </Tag>
      ) : null}
      <Tag x={l.tolerant.judgeTag.x} y={l.tolerant.judgeTag.y} size={l.text} tone="accent" opacity={judgeOpacity}>
        {l.tolerantJudge}
      </Tag>
    </AbsoluteFill>
  );
};
