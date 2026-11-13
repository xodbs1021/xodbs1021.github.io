// 콘티: _workspace/blog/mediamtx-seven-hooks-missing-exit-callback/storyboard.md 「SilentExecFailure」
// 위 줄 v1.21.3(OnExit 없음), 아래 줄 #6259(OnExit 있음). 두 줄 모두 MediaMTX 가 launched 를 남기고
// 없는 명령을 exec 하지만 자식 프로세스는 생기지 않고 stderr 도 없다. 실패는 MediaMTX 로 돌아오고,
// 아래 줄만 OnExit 가 그 실패를 exited 줄로 남긴다. 로그 문구는 재측정의 실제 줄을 줄인 것(개념도).
// layout="mobile" 은 1080×1350 휴대폰판(SilentExecFailureMobile) — 줄마다 상자를 둘로 놓고 로그를 아래에 둔다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const SILENT_EXEC_FAILURE_FRAMES = 300;

const T = {
  intro: 0,
  launched: 18,
  exec: 36,
  execLen: 36,
  fail: 78,
  back: 112,
  backLen: 30,
  exited: 150,
} as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Row = {
  readonly title: { readonly x: number; readonly y: number };
  readonly child: Box;
  readonly mtx: Box;
  readonly log: Box;
};
type Layout = {
  readonly rows: readonly [Row, Row];
  readonly text: { readonly label: number; readonly small: number };
  /** 로그 상자가 MediaMTX 오른쪽(가로)인지 아래(세로)인지. */
  readonly logBelow: boolean;
};

const desktopRow = (y: number): Row => ({
  title: { x: 120, y },
  child: { x: 120, y: y + 80, w: 400, h: 200 },
  mtx: { x: 760, y: y + 80, w: 380, h: 200 },
  log: { x: 1300, y: y + 80, w: 500, h: 200 },
});
const DESKTOP: Layout = {
  rows: [desktopRow(110), desktopRow(590)],
  text: { label: TEXT.label, small: TEXT.small },
  logBelow: false,
};

const mobileRow = (y: number): Row => ({
  title: { x: 60, y },
  child: { x: 60, y: y + 90, w: 300, h: 230 },
  mtx: { x: 720, y: y + 90, w: 300, h: 230 },
  log: { x: 60, y: y + 420, w: 960, h: 170 },
});
const MOBILE: Layout = {
  rows: [mobileRow(50), mobileRow(690)],
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
  logBelow: true,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const RowView: React.FC<{ readonly row: Row; readonly l: Layout; readonly hasOnExit: boolean; readonly frame: number }> = ({
  row, l, hasOnExit, frame,
}) => {
  const intro = progress(frame, T.intro, 14);
  const launched = progress(frame, T.launched, 10);
  const exec = progress(frame, T.exec, T.execLen);
  const fail = progress(frame, T.fail, 12);
  const back = progress(frame, T.back, T.backLen);
  const exited = progress(frame, T.exited, 12);
  const s = l.text.small;
  const { child, mtx, log } = row;
  // exec 화살표: MediaMTX 왼쪽 가장자리 → 자식 자리 오른쪽 가장자리(위쪽 3분의 1), 돌아오는 화살표는 아래쪽 3분의 1.
  const ex1 = mtx.x;
  const ex2 = child.x + child.w;
  const yOut = child.y + child.h * 0.32;
  const yBack = child.y + child.h * 0.72;
  const toLog = l.logBelow
    ? { x1: mtx.x + mtx.w / 2, y1: mtx.y + mtx.h, x2: mtx.x + mtx.w / 2, y2: log.y }
    : { x1: mtx.x + mtx.w, y1: mtx.y + mtx.h / 2, x2: log.x, y2: log.y + log.h / 2 };
  const lineY = (i: number) => log.y + 30 + i * (s * 1.5);
  return (
    <>
      <Label x={row.title.x} y={row.title.y} size={l.text.label} weight={780} color={hasOnExit ? COLOR.accent : COLOR.ink} opacity={intro}>
        {hasOnExit ? "#6259 · OnExit 있음" : "v1.21.3 · OnExit 없음"}
      </Label>
      <Node x={child.x} y={child.y} width={child.w} height={child.h} tone={fail > 0.5 ? "danger" : "muted"} size={s} opacity={intro}>
        {fail > 0.5 ? "자식 프로세스\n생기지 않음" : "자식 프로세스"}
      </Node>
      <Label x={child.x + 8} y={child.y + child.h + 14} size={s} color={COLOR.danger} weight={700} opacity={fail}>
        stderr 없음
      </Label>
      <Node x={mtx.x} y={mtx.y} width={mtx.w} height={mtx.h} tone={hasOnExit && exited > 0.5 ? "accent" : "ink"} size={l.text.label} opacity={intro}>
        MediaMTX
      </Node>
      <div
        style={{
          position: "absolute", left: log.x, top: log.y, width: log.w, height: log.h, boxSizing: "border-box",
          border: `3px solid ${COLOR.line}`, borderRadius: 16, background: COLOR.surface, opacity: intro,
        }}
      />
      <Label x={log.x + 24} y={lineY(0)} size={s} weight={650} opacity={launched}>
        launched
      </Label>
      {hasOnExit ? (
        <Label x={log.x + 24} y={lineY(1)} size={s} weight={760} color={COLOR.accent} opacity={exited}>
          exited: no such file
        </Label>
      ) : (
        <Label x={log.x + 24} y={lineY(1)} size={s} weight={650} color={COLOR.muted} opacity={exited}>
          (더 없음)
        </Label>
      )}
      {launched > 0 ? <Arrow x1={toLog.x1} y1={toLog.y1} x2={toLog.x2} y2={toLog.y2} color={COLOR.muted} draw={launched} /> : null}
      {exec > 0 ? <Arrow x1={ex1} y1={yOut} x2={ex2} y2={yOut} color={COLOR.ink} draw={exec} /> : null}
      {back > 0 ? (
        <Arrow
          x1={ex2} y1={yBack} x2={ex1} y2={yBack}
          color={hasOnExit ? COLOR.accent : COLOR.muted} dashed={!hasOnExit} draw={back}
        />
      ) : null}
      <Label x={(ex1 + ex2) / 2} y={yOut - s * 1.45} size={s} weight={700} anchor="center" opacity={exec}>
        exec
      </Label>
      <Label
        x={(ex1 + ex2) / 2} y={yBack + 12} size={s} weight={700} anchor="center"
        color={hasOnExit ? COLOR.accent : COLOR.muted} opacity={back}
      >
        {hasOnExit ? "OnExit" : "받을 곳 없음"}
      </Label>
    </>
  );
};

export const SilentExecFailure: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <RowView row={l.rows[0]} l={l} hasOnExit={false} frame={frame} />
      <RowView row={l.rows[1]} l={l} hasOnExit frame={frame} />
    </AbsoluteFill>
  );
};
