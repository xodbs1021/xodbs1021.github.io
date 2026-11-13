// 콘티: _workspace/blog/mediamtx-certificate-watcher-close-join/storyboard.md 「CloseDuringReload」
// 두 줄 모두 watch() 가 인증서를 바꾼 뒤 Parent.Log 안에서 멈춰 있을 때 Close() 를 부른다.
// 위 줄 v1.21.1: Close() 는 종료 신호 · 정리(cert = nil) 뒤 먼저 반환하고, 로그가 풀리면 watch() 가
// select 로 돌아가 cert 를 다시 채운다. 아래 줄(고친 뒤): Close() 가 watch() 의 반환을 기다린 뒤 정리한다.
// layout="mobile" 은 1080×1350 휴대폰판(CloseDuringReloadMobile) — 인증서 상자를 아래에 둔다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import type { NodeTone } from "../../components/Flow";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const CLOSE_DURING_RELOAD_FRAMES = 330;

const T = {
  blocked: 18,
  signal: 50,
  cleanup: 80,
  returned: 110,
  release: 170,
  refill: 195,
  newReturn: 175,
  newCleanup: 205,
} as const;

type Pt = readonly [number, number];
type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Row = {
  readonly title: Pt;
  readonly watchLabel: Pt;
  readonly closeLabel: Pt;
  readonly watchChip: Pt;
  readonly closeChip: Pt;
  readonly cert: Box;
};
type Layout = {
  readonly rows: readonly [Row, Row];
  readonly release: Pt;
  readonly titles: readonly [string, string];
  readonly text: { readonly title: number; readonly label: number; readonly small: number };
};

const desktopRow = (y: number): Row => ({
  title: [120, y],
  watchLabel: [120, y + 108],
  closeLabel: [120, y + 238],
  watchChip: [400, y + 100],
  closeChip: [400, y + 230],
  cert: { x: 1360, y: y + 90, w: 440, h: 200 },
});
const DESKTOP: Layout = {
  rows: [desktopRow(60), desktopRow(560)],
  release: [1360, 470],
  titles: ["v1.21.1 · Close가 먼저 반환", "고친 뒤 · Close가 watch()를 기다림"],
  text: { title: TEXT.title, label: TEXT.label, small: TEXT.small },
};

const mobileRow = (y: number): Row => ({
  title: [60, y],
  watchLabel: [60, y + 100],
  closeLabel: [60, y + 220],
  watchChip: [280, y + 90],
  closeChip: [280, y + 210],
  cert: { x: 60, y: y + 330, w: 960, h: 130 },
});
const MOBILE: Layout = {
  rows: [mobileRow(40), mobileRow(720)],
  release: [60, 600],
  titles: ["v1.21.1 · 먼저 반환", "고친 뒤 · 기다린 뒤 반환"],
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

type Step = { readonly at: number; readonly text: string; readonly tone: "ink" | "accent" | "danger" | "muted" };

/** 시각 at 이 지난 마지막 단계를 한 자리에서 바꿔 보여 준다(바뀔 때 살짝 커졌다 돌아온다). */
const Chip: React.FC<{ readonly at: Pt; readonly steps: readonly Step[]; readonly frame: number; readonly size: number }> = ({
  at, steps, frame, size,
}) => {
  const current = [...steps].reverse().find((s) => frame >= s.at);
  if (!current) return null;
  const pop = interpolate(frame - current.at, [0, 6, 12], [0.9, 1.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fade = progress(frame, current.at, 8);
  return (
    <Tag x={at[0]} y={at[1]} tone={current.tone} size={size} scale={pop} opacity={fade}>
      {current.text}
    </Tag>
  );
};

const CertBox: React.FC<{ readonly box: Box; readonly value: string; readonly tone: NodeTone; readonly note: string; readonly size: number }> = ({
  box, value, tone, note, size,
}) => (
  <Node x={box.x} y={box.y} width={box.w} height={box.h} tone={tone} size={size}>
    {`cl.cert: ${value}`}
    {note ? <div style={{ fontSize: size * 0.85, fontWeight: 650, marginTop: 6 }}>{note}</div> : null}
  </Node>
);

const RowView: React.FC<{ readonly row: Row; readonly l: Layout; readonly fixed: boolean; readonly frame: number }> = ({
  row, l, fixed, frame,
}) => {
  const s = l.text.small;
  const watchSteps: readonly Step[] = fixed
    ? [
        { at: T.blocked, text: "Parent.Log에서 멈춤", tone: "muted" },
        { at: T.newReturn, text: "로그 끝나고 반환", tone: "accent" },
      ]
    : [
        { at: T.blocked, text: "Parent.Log에서 멈춤", tone: "muted" },
        { at: T.release, text: "select로 돌아감", tone: "ink" },
        { at: T.refill, text: "Close 뒤 cert 다시 채움", tone: "danger" },
      ];
  const closeSteps: readonly Step[] = fixed
    ? [
        { at: T.signal, text: "종료 신호", tone: "ink" },
        { at: T.cleanup, text: "watch() 반환을 기다림", tone: "muted" },
        { at: T.newCleanup, text: "정리한 뒤 반환", tone: "accent" },
      ]
    : [
        { at: T.signal, text: "종료 신호", tone: "ink" },
        { at: T.cleanup, text: "정리 · cert = nil", tone: "ink" },
        { at: T.returned, text: "먼저 반환", tone: "danger" },
      ];
  const certState = fixed
    ? frame >= T.newCleanup
      ? { value: "nil", tone: "accent" as const, note: "정리 뒤 그대로" }
      : { value: "인증서", tone: "ink" as const, note: "" }
    : frame >= T.refill
      ? { value: "인증서", tone: "danger" as const, note: "nil 뒤 다시 채워짐" }
      : frame >= T.cleanup
        ? { value: "nil", tone: "ink" as const, note: "" }
        : { value: "인증서", tone: "ink" as const, note: "" };
  return (
    <>
      <Label x={row.title[0]} y={row.title[1]} size={l.text.title} weight={780} color={fixed ? COLOR.accent : COLOR.ink}>
        {l.titles[fixed ? 1 : 0]}
      </Label>
      <Label x={row.watchLabel[0]} y={row.watchLabel[1]} size={l.text.label} weight={720} color={COLOR.muted}>watch()</Label>
      <Label x={row.closeLabel[0]} y={row.closeLabel[1]} size={l.text.label} weight={720} color={COLOR.muted}>Close()</Label>
      <Chip at={row.watchChip} steps={watchSteps} frame={frame} size={s} />
      <Chip at={row.closeChip} steps={closeSteps} frame={frame} size={s} />
      <CertBox box={row.cert} value={certState.value} tone={certState.tone} note={certState.note} size={l.text.label} />
    </>
  );
};

export const CloseDuringReload: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <RowView row={l.rows[0]} l={l} fixed={false} frame={frame} />
      <Tag x={l.release[0]} y={l.release[1]} tone="muted" size={l.text.small} opacity={progress(frame, T.release, 10)}>
        로그 풀림
      </Tag>
      <RowView row={l.rows[1]} l={l} fixed frame={frame} />
    </AbsoluteFill>
  );
};
