// 콘티: _workspace/blog/mediamtx-certloader-no-watcher-shutdown/storyboard.md 「NoWatcherShutdown」
// 세 줄: ① v1.21.3 인증서 저장됨 — Initialize 가 watch() 를 시작하고, Close() 가 done 을 기다리면 watch() 가 닫아
// 반환한다. ② v1.21.3 저장 안 됨 — watch() 를 시작하지 않아 done 을 닫을 주체가 없고 Close() 가 끝나지 않는다.
// ③ #6427 저장 안 됨 — Initialize 가 그 분기에서 done 을 닫아 Close() 가 바로 반환한다(개념도).
// layout="mobile" 은 1080×1350 휴대폰판(NoWatcherShutdownMobile) — 줄마다 상자를 두 줄(2×2)로 놓는다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, Wire } from "../../components/Flow";
import type { NodeTone } from "../../components/Flow";
import { Label } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const NO_WATCHER_SHUTDOWN_FRAMES = 330;

// 줄마다 시작 시각을 엇갈린다.
const START = [16, 110, 200] as const;
const STEP = { start: 0, wait: 26, close: 52, result: 74 } as const;

type Pt = readonly [number, number];
type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Edge = { readonly points: readonly Pt[]; readonly label: Pt; readonly anchor: "left" | "center" | "right" };
type Row = {
  readonly title: Pt;
  readonly init: Box;
  readonly watch: Box;
  readonly done: Box;
  readonly close: Box;
  readonly start: Edge;
  readonly watchCloses: Edge;
  readonly initCloses: Edge;
  readonly waits: Edge;
};
type Layout = {
  readonly rows: readonly [Row, Row, Row];
  readonly titles: readonly [string, string, string];
  readonly text: { readonly title: number; readonly label: number; readonly small: number };
};

// 데스크톱: Initialize → watch() → done ← Close() 를 한 줄에.
const desktopRow = (y: number): Row => ({
  title: [120, y],
  init: { x: 120, y: y + 70, w: 340, h: 150 },
  watch: { x: 600, y: y + 70, w: 320, h: 150 },
  done: { x: 1060, y: y + 70, w: 240, h: 150 },
  close: { x: 1460, y: y + 70, w: 340, h: 150 },
  start: { points: [[460, y + 145], [600, y + 145]], label: [530, y + 88], anchor: "center" },
  watchCloses: { points: [[920, y + 145], [1060, y + 145]], label: [990, y + 88], anchor: "center" },
  initCloses: {
    points: [[290, y + 220], [290, y + 262], [1180, y + 262], [1180, y + 220]],
    label: [760, y + 268], anchor: "center",
  },
  waits: { points: [[1460, y + 145], [1300, y + 145]], label: [1380, y + 88], anchor: "center" },
});
const DESKTOP: Layout = {
  rows: [desktopRow(30), desktopRow(380), desktopRow(730)],
  titles: ["v1.21.3 · 인증서 저장됨", "v1.21.3 · 저장 안 됨(읽기 전용)", "#6427 · 저장 안 됨"],
  text: { title: TEXT.label, label: TEXT.label, small: TEXT.small },
};

// 휴대폰판: 위 칸 Initialize → watch(), 아래 칸 done ← Close().
const mobileRow = (y: number): Row => ({
  title: [60, y],
  init: { x: 60, y: y + 66, w: 400, h: 140 },
  watch: { x: 620, y: y + 66, w: 400, h: 140 },
  done: { x: 60, y: y + 262, w: 400, h: 140 },
  close: { x: 620, y: y + 262, w: 400, h: 140 },
  start: { points: [[460, y + 136], [620, y + 136]], label: [540, y + 74], anchor: "center" },
  watchCloses: { points: [[700, y + 206], [380, y + 262]], label: [720, y + 208], anchor: "left" },
  initCloses: { points: [[260, y + 206], [260, y + 262]], label: [280, y + 208], anchor: "left" },
  waits: { points: [[620, y + 332], [460, y + 332]], label: [540, y + 272], anchor: "center" },
});
const MOBILE: Layout = {
  rows: [mobileRow(20), mobileRow(470), mobileRow(920)],
  titles: ["v1.21.3 · 저장됨", "v1.21.3 · 저장 안 됨", "#6427 · 저장 안 됨"],
  text: { title: MOBILE_TEXT.label, label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

type Kind = "saved" | "hang" | "fixed";

const EdgeView: React.FC<{
  readonly edge: Edge; readonly text: string; readonly size: number; readonly color: string;
  readonly dashed?: boolean; readonly show: number;
}> = ({ edge, text, size, color, dashed = false, show }) =>
  show > 0 ? (
    <>
      <Wire points={edge.points} color={color} dashed={dashed} opacity={show} />
      <Label x={edge.label[0]} y={edge.label[1]} size={size} weight={720} color={color} anchor={edge.anchor} opacity={show}>
        {text}
      </Label>
    </>
  ) : null;

const BoxView: React.FC<{ readonly box: Box; readonly tone: NodeTone; readonly size: number; readonly text: string }> = ({
  box, tone, size, text,
}) => (
  <Node x={box.x} y={box.y} width={box.w} height={box.h} tone={tone} size={size}>
    {text}
  </Node>
);

const RowView: React.FC<{ readonly row: Row; readonly l: Layout; readonly kind: Kind; readonly index: 0 | 1 | 2; readonly frame: number }> = ({
  row, l, kind, index, frame,
}) => {
  const s = l.text.small;
  const t0 = START[index];
  const started = progress(frame, t0 + STEP.start, 12);
  const waiting = progress(frame, t0 + STEP.wait, 12);
  const closing = progress(frame, t0 + STEP.close, 12);
  const result = frame >= t0 + STEP.result;
  const hasWatch = kind === "saved";
  const doneClosed = kind === "fixed" ? started > 0.5 : kind === "saved" && closing > 0.5;
  const closeTone: NodeTone = !result ? "ink" : kind === "hang" ? "danger" : "accent";
  const closeText = !result || waiting < 0.5 ? (waiting > 0.5 ? "Close()\ndone 대기" : "Close()") : kind === "hang" ? "Close()\n끝나지 않음" : "Close()\n반환";
  return (
    <>
      <Label x={row.title[0]} y={row.title[1]} size={l.text.title} weight={780} color={kind === "fixed" ? COLOR.accent : COLOR.ink}>
        {l.titles[index]}
      </Label>
      <BoxView box={row.init} size={s} tone="ink" text="Initialize()" />
      <BoxView box={row.watch} size={s} tone={hasWatch ? "ink" : "muted"} text={hasWatch ? "watch()" : "watch() 없음"} />
      <BoxView box={row.done} size={s} tone={doneClosed ? "accent" : kind === "hang" && result ? "danger" : "muted"} text={doneClosed ? "done\n닫힘" : "done\n열림"} />
      <BoxView box={row.close} size={s} tone={closeTone} text={closeText} />
      {hasWatch ? <EdgeView edge={row.start} text="시작" size={s} color={COLOR.ink} show={started} /> : null}
      <EdgeView edge={row.waits} text="기다림" size={s} color={kind === "hang" && result ? COLOR.danger : COLOR.muted} dashed show={waiting} />
      {kind === "saved" ? <EdgeView edge={row.watchCloses} text="닫음" size={s} color={COLOR.accent} show={closing} /> : null}
      {kind === "fixed" ? <EdgeView edge={row.initCloses} text="close(done)" size={s} color={COLOR.accent} show={started} /> : null}
    </>
  );
};

export const NoWatcherShutdown: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <RowView row={l.rows[0]} l={l} kind="saved" index={0} frame={frame} />
      <RowView row={l.rows[1]} l={l} kind="hang" index={1} frame={frame} />
      <RowView row={l.rows[2]} l={l} kind="fixed" index={2} frame={frame} />
    </AbsoluteFill>
  );
};
