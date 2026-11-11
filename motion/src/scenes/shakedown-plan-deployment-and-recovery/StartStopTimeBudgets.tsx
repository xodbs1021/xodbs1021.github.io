// 콘티: _workspace/blog/shakedown-plan-deployment-and-recovery/storyboard.md
// 기동과 중지의 시간 예산. 위 줄: Spring 기동 약 41초 막대가 유예 30초 세로선을 넘어 「태스크 교체」(위험색),
// 세로선이 120초로 옮겨 가며 「교체 없음」(강조색). 아래 줄: 「공개 경로 403」 뒤 중지 막대가 120초 제한을 넘어
// 「medium · 502」, 600초 · 630초 한도가 서고 「large · 204」. 두 줄의 가로 눈금은 다르다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const START_STOP_TIME_BUDGETS_FRAMES = 360;

type Row = {
  readonly barY: number;
  readonly maxSeconds: number;
  readonly title: { readonly x: number; readonly y: number };
  readonly markerTagY: readonly [number, number];
  readonly resultY: number;
};

type Layout = {
  readonly x0: number;
  readonly x1: number;
  readonly barH: number;
  readonly start: Row;
  readonly stop: Row;
  readonly text: { readonly tag: number; readonly title: number; readonly tick: number };
};

const T = {
  intro: 0,
  startBar: [14, 46],
  graceShort: 20,
  replaced: 64,
  graceMove: [104, 26],
  notReplaced: 132,
  gate: 160,
  stopBar: [176, 70],
  limit: 176,
  failed: 224,
  budgets: [262, 18],
  ok: 286,
} as const;

const START_SECONDS = 41;
const STOP_SECONDS = 189.7;

const DESKTOP: Layout = {
  x0: 360,
  x1: 1780,
  barH: 70,
  start: { barY: 190, maxSeconds: 150, title: { x: 120, y: 200 }, markerTagY: [296, 296], resultY: 380 },
  stop: { barY: 640, maxSeconds: 700, title: { x: 120, y: 650 }, markerTagY: [746, 816], resultY: 910 },
  text: { tag: TEXT.small, title: TEXT.label, tick: TEXT.small },
};

const MOBILE: Layout = {
  x0: 60,
  x1: 1000,
  barH: 80,
  start: { barY: 230, maxSeconds: 150, title: { x: 60, y: 40 }, markerTagY: [340, 340], resultY: 440 },
  stop: { barY: 860, maxSeconds: 700, title: { x: 60, y: 670 }, markerTagY: [970, 1050], resultY: 1160 },
  text: { tag: MOBILE_TEXT.small, title: MOBILE_TEXT.label, tick: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const Marker: React.FC<{ readonly x: number; readonly y: number; readonly h: number; readonly color: string; readonly opacity: number }> = ({
  x, y, h, color, opacity,
}) => (
  <div style={{ position: "absolute", left: x - 3, top: y - 24, width: 6, height: h + 48, background: color, borderRadius: 3, opacity }} />
);

export const StartStopTimeBudgets: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, T.intro, 14);
  const xAt = (row: Row, seconds: number) => l.x0 + ((l.x1 - l.x0) * seconds) / row.maxSeconds;
  const tickY = (row: Row) => row.barY - (layout === "mobile" ? 76 : 62);

  // 기동 줄.
  const startShown = START_SECONDS * progress(frame, T.startBar[0], T.startBar[1]);
  const graceSeconds = interpolate(progress(frame, T.graceMove[0], T.graceMove[1]), [0, 1], [30, 120]);
  const graceMoved = frame >= T.graceMove[0];
  const graceColor = graceMoved ? COLOR.accent : COLOR.danger;
  const replaced = progress(frame, T.replaced, 10) * (1 - progress(frame, T.graceMove[0], 10));

  // 중지 줄.
  const stopShown = STOP_SECONDS * progress(frame, T.stopBar[0], T.stopBar[1]);
  const budgets = progress(frame, T.budgets[0], T.budgets[1]);
  const failed = progress(frame, T.failed, 10) * (1 - progress(frame, T.budgets[0], 10));

  const bar = (row: Row, seconds: number, color: string) => (
    <div
      style={{
        position: "absolute",
        left: l.x0,
        top: row.barY,
        width: xAt(row, seconds) - l.x0,
        height: l.barH,
        background: color,
        borderRadius: 10,
      }}
    />
  );
  const track = (row: Row) => (
    <div
      style={{
        position: "absolute",
        left: l.x0,
        top: row.barY,
        width: l.x1 - l.x0,
        height: l.barH,
        background: COLOR.surface,
        border: `2px solid ${COLOR.line}`,
        borderRadius: 10,
        boxSizing: "border-box",
        opacity: intro,
      }}
    />
  );
  const ticks = (row: Row) => (
    <>
      <Label x={l.x0} y={tickY(row)} size={l.text.tick} color={COLOR.muted} anchor="left" opacity={intro}>
        0
      </Label>
      <Label x={l.x1} y={tickY(row)} size={l.text.tick} color={COLOR.muted} anchor="right" opacity={intro}>
        {`${row.maxSeconds}초`}
      </Label>
    </>
  );

  const s = l.start;
  const p = l.stop;
  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={s.title.x} y={s.title.y} size={l.text.title} opacity={intro}>
        기동
      </Label>
      <Label x={p.title.x} y={p.title.y} size={l.text.title} opacity={intro}>
        중지
      </Label>
      {ticks(s)}
      {ticks(p)}

      {/* 기동: 막대(실제 기동 시간)와 유예 세로선 */}
      {track(s)}
      {bar(s, startShown, COLOR.ink)}
      <Marker x={xAt(s, graceSeconds)} y={s.barY} h={l.barH} color={graceColor} opacity={progress(frame, T.graceShort, 10)} />
      <Tag x={xAt(s, graceSeconds)} y={s.markerTagY[0]} anchor="center" tone={graceMoved ? "accent" : "danger"} size={l.text.tag} opacity={progress(frame, T.graceShort, 10)}>
        {graceMoved ? "유예 120초" : "유예 30초"}
      </Tag>
      <Tag x={l.x0} y={s.resultY} tone="ink" size={l.text.tag} opacity={progress(frame, T.startBar[0] + T.startBar[1], 8)}>
        Spring 기동 약 41초
      </Tag>
      <Tag x={layout === "mobile" ? l.x0 : l.x0 + 470} y={layout === "mobile" ? s.resultY + 90 : s.resultY} tone="danger" size={l.text.tag} opacity={replaced}>
        태스크 교체
      </Tag>
      <Tag x={layout === "mobile" ? l.x0 : l.x0 + 470} y={layout === "mobile" ? s.resultY + 90 : s.resultY} tone="accent" size={l.text.tag} opacity={progress(frame, T.notReplaced, 10)}>
        교체 없음
      </Tag>

      {/* 중지: 공개 차단 → 막대(실제 중지 시간), 120초 제한 → 600 · 630초 */}
      <Tag x={l.x0 + (layout === "mobile" ? 330 : 450)} y={tickY(p) - 6} tone="ink" size={l.text.tag} opacity={progress(frame, T.gate, 10)}>
        공개 경로 403
      </Tag>
      {track(p)}
      {bar(p, stopShown, COLOR.ink)}
      <Marker x={xAt(p, 120)} y={p.barY} h={l.barH} color={COLOR.danger} opacity={progress(frame, T.limit, 10) * (1 - budgets)} />
      <Tag x={xAt(p, 120)} y={p.markerTagY[0]} anchor="center" tone="danger" size={l.text.tag} opacity={progress(frame, T.limit, 10) * (1 - budgets)}>
        제한 120초
      </Tag>
      <Marker x={xAt(p, 600)} y={p.barY} h={l.barH} color={COLOR.accent} opacity={budgets} />
      <Marker x={xAt(p, 630)} y={p.barY} h={l.barH} color={COLOR.accent} opacity={budgets} />
      <Tag x={xAt(p, 600)} y={p.markerTagY[0]} anchor="center" tone="accent" size={l.text.tag} opacity={budgets}>
        어댑터 600초
      </Tag>
      <Tag x={xAt(p, 630)} y={p.markerTagY[1]} anchor="center" tone="accent" size={l.text.tag} opacity={budgets}>
        엔진 630초
      </Tag>
      <Tag x={l.x0} y={p.resultY} tone="danger" size={l.text.tag} opacity={failed}>
        medium · 120초에 502
      </Tag>
      <Tag x={l.x0} y={p.resultY} tone="accent" size={l.text.tag} opacity={progress(frame, T.ok, 10)}>
        large · 189.70초에 204
      </Tag>
    </AbsoluteFill>
  );
};
