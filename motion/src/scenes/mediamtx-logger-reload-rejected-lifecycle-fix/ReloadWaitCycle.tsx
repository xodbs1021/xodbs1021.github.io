// 콘티: _workspace/blog/mediamtx-logger-reload-rejected-lifecycle-fix/storyboard.md 「ReloadWaitCycle」
// 위 줄 #6206: 훅이 PATCH 로 로그 재설정을 일으키고, 재설정은 API 를 닫은 뒤 훅이 끝나기를 기다린다.
// 훅은 API 가 새 설정으로 돌아오기를 기다리므로 둘이 서로를 기다린다(AI 가 만든 훅, 개념도).
// 아래 줄 v1.21.3: 로거를 닫지 않고 다시 읽으며 훅을 기다리지 않는다. logLevel 변경은 여전히 API 를 닫았다 열지만
// 기다림이 없어 곧바로 다시 열리고(재측정 약 2ms), 훅은 응답을 받아 끝난다.
// layout="mobile" 은 1080×1350 휴대폰판(ReloadWaitCycleMobile) — 세 상자를 삼각형으로 놓고 라벨을 줄인다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, Wire } from "../../components/Flow";
import type { NodeTone } from "../../components/Flow";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const RELOAD_WAIT_CYCLE_FRAMES = 330;

const T = {
  patch: 20,
  close: 50,
  wait: 80,
  poll: 110,
  stuck: 140,
  newPatch: 185,
  newReload: 210,
  newPoll: 235,
  newDone: 262,
} as const;

type Pt = readonly [number, number];
type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Edge = {
  readonly points: readonly Pt[];
  readonly label: { readonly x: number; readonly y: number; readonly anchor: "left" | "center" | "right" };
};
type Row = {
  readonly title: Pt;
  readonly hook: Box;
  readonly reload: Box;
  readonly api: Box;
  readonly patch: Edge;
  readonly wait: Edge;
  readonly close: Edge;
  readonly poll: Edge;
  readonly tag: Pt;
};
type Words = {
  readonly patch: string;
  readonly wait: string;
  readonly close: string;
  readonly poll: string;
  readonly answered: string;
};
type Layout = {
  readonly rows: readonly [Row, Row];
  readonly text: { readonly title: number; readonly label: number; readonly small: number };
  readonly words: Words;
  readonly titles: readonly [string, string];
  readonly apiBack: string;
  readonly reloadNew: string;
};

// 데스크톱: 줄마다 훅 · 재설정 · API 를 가로로 놓는다. 훅 → API 대기선은 상자 아래로 돈다.
const desktopRow = (y: number): Row => ({
  title: [120, y],
  hook: { x: 120, y: y + 90, w: 360, h: 180 },
  reload: { x: 780, y: y + 90, w: 360, h: 180 },
  api: { x: 1440, y: y + 90, w: 360, h: 180 },
  patch: { points: [[480, y + 145], [780, y + 145]], label: { x: 630, y: y + 92, anchor: "center" } },
  wait: { points: [[780, y + 220], [480, y + 220]], label: { x: 630, y: y + 232, anchor: "center" } },
  close: { points: [[1140, y + 180], [1440, y + 180]], label: { x: 1290, y: y + 126, anchor: "center" } },
  poll: {
    points: [[300, y + 270], [300, y + 330], [1620, y + 330], [1620, y + 270]],
    label: { x: 960, y: y + 342, anchor: "center" },
  },
  tag: [960, y + 400],
});
const DESKTOP: Layout = {
  rows: [desktopRow(40), desktopRow(560)],
  text: { title: TEXT.title, label: TEXT.label, small: TEXT.small },
  words: { patch: "PATCH logLevel", wait: "끝나길 기다림", close: "닫음", poll: "새 설정의 API를 기다림", answered: "응답 받음" },
  titles: ["#6206 · 재설정이 훅을 기다림", "v1.21.3 · 재설정이 훅을 기다리지 않음"],
  apiBack: "API\n바로 다시 열림",
  reloadNew: "재설정\n로거 다시 읽음",
};

// 휴대폰판: 재설정을 위에, 훅과 API 를 아래 양쪽에 둔다.
const mobileRow = (y: number): Row => ({
  title: [60, y],
  hook: { x: 60, y: y + 390, w: 300, h: 150 },
  reload: { x: 390, y: y + 100, w: 300, h: 150 },
  api: { x: 720, y: y + 390, w: 300, h: 150 },
  patch: { points: [[150, y + 390], [150, y + 150], [390, y + 150]], label: { x: 270, y: y + 88, anchor: "center" } },
  wait: { points: [[390, y + 215], [270, y + 215], [270, y + 390]], label: { x: 290, y: y + 280, anchor: "left" } },
  close: { points: [[690, y + 175], [870, y + 175], [870, y + 390]], label: { x: 890, y: y + 250, anchor: "left" } },
  poll: { points: [[360, y + 470], [720, y + 470]], label: { x: 540, y: y + 400, anchor: "center" } },
  tag: [540, y + 560],
});
const MOBILE: Layout = {
  rows: [mobileRow(30), mobileRow(700)],
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
  words: { patch: "PATCH", wait: "기다림", close: "닫음", poll: "API 기다림", answered: "응답" },
  titles: ["#6206 · 훅을 기다림", "v1.21.3 · 기다리지 않음"],
  apiBack: "API\n바로 열림",
  reloadNew: "로거\n다시 읽음",
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const BoxView: React.FC<{ readonly box: Box; readonly tone: NodeTone; readonly size: number; readonly text: string }> = ({
  box, tone, size, text,
}) => (
  <Node x={box.x} y={box.y} width={box.w} height={box.h} tone={tone} size={size}>
    {text}
  </Node>
);

const EdgeView: React.FC<{
  readonly edge: Edge; readonly text: string; readonly size: number; readonly color: string;
  readonly dashed?: boolean; readonly show: number;
}> = ({ edge, text, size, color, dashed = false, show }) =>
  show > 0 ? (
    <>
      <Wire points={edge.points} color={color} dashed={dashed} opacity={show} />
      <Label x={edge.label.x} y={edge.label.y} size={size} weight={720} color={color} anchor={edge.label.anchor} opacity={show}>
        {text}
      </Label>
    </>
  ) : null;

const OldRow: React.FC<{ readonly row: Row; readonly l: Layout; readonly frame: number }> = ({ row, l, frame }) => {
  const s = l.text.small;
  const closed = progress(frame, T.close, 14);
  const stuck = progress(frame, T.stuck, 12);
  const waiting = frame >= T.wait;
  const polling = frame >= T.poll;
  return (
    <>
      <Label x={row.title[0]} y={row.title[1]} size={l.text.title} weight={780}>{l.titles[0]}</Label>
      <BoxView box={row.hook} size={l.text.label} tone={stuck > 0.5 ? "danger" : "ink"} text={polling ? "훅\nAPI 대기" : "훅"} />
      <BoxView box={row.reload} size={l.text.label} tone={stuck > 0.5 ? "danger" : "ink"} text={waiting ? "재설정\n훅 대기" : "재설정"} />
      <BoxView box={row.api} size={l.text.label} tone={closed > 0.5 ? "muted" : "ink"} text={closed > 0.5 ? "API\n닫힘" : "API"} />
      <EdgeView edge={row.patch} text={l.words.patch} size={s} color={COLOR.ink} show={progress(frame, T.patch, 14)} />
      <EdgeView edge={row.close} text={l.words.close} size={s} color={COLOR.ink} show={closed} />
      <EdgeView edge={row.wait} text={l.words.wait} size={s} color={COLOR.danger} dashed show={progress(frame, T.wait, 14)} />
      <EdgeView edge={row.poll} text={l.words.poll} size={s} color={COLOR.danger} dashed show={progress(frame, T.poll, 14)} />
      <Tag x={row.tag[0]} y={row.tag[1]} tone="danger" size={s} anchor="center" opacity={stuck}>
        서로 기다림
      </Tag>
    </>
  );
};

const NewRow: React.FC<{ readonly row: Row; readonly l: Layout; readonly frame: number }> = ({ row, l, frame }) => {
  const s = l.text.small;
  const done = progress(frame, T.newDone, 12);
  const reloaded = frame >= T.newReload;
  return (
    <>
      <Label x={row.title[0]} y={row.title[1]} size={l.text.title} weight={780} color={COLOR.accent}>{l.titles[1]}</Label>
      <BoxView box={row.hook} size={l.text.label} tone={done > 0.5 ? "accent" : "ink"} text={done > 0.5 ? "훅\n끝남" : "훅"} />
      <BoxView box={row.reload} size={l.text.label} tone="ink" text={reloaded ? l.reloadNew : "재설정"} />
      <BoxView box={row.api} size={l.text.label} tone="ink" text={reloaded ? l.apiBack : "API"} />
      <EdgeView edge={row.patch} text={l.words.patch} size={s} color={COLOR.ink} show={progress(frame, T.newPatch, 14)} />
      <EdgeView edge={row.poll} text={l.words.answered} size={s} color={COLOR.accent} show={progress(frame, T.newPoll, 14)} />
      <Tag x={row.tag[0]} y={row.tag[1]} tone="accent" size={s} anchor="center" opacity={done}>
        기다림 없음
      </Tag>
    </>
  );
};

export const ReloadWaitCycle: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <OldRow row={l.rows[0]} l={l} frame={frame} />
      <NewRow row={l.rows[1]} l={l} frame={frame} />
    </AbsoluteFill>
  );
};
