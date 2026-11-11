// 콘티: _workspace/blog/pokeclip-stateful-media-deployment/storyboard.md 「영상 1」
// 위 줄: API 태스크는 새 태스크가 정상이 된 뒤 요청을 옮기고 옛 태스크를 내린다(요청 손실 0은 잰 적이 없어 쓰지 않는다).
// 아래 줄: 미디어 상자는 TERM → 최대 30초 기다림 → 내림. OBS의 UDP 송출은 끊기고, 업로드 전 조각은 볼륨에 남는다.
// 송출이 끊긴 뒤(앞 세션 마지막 조각 끝부터) 300초 안에 재접속하면 앞 세션을 잇는다.
// 근거: infra/media-host/systemd/pokeclip-media.service ExecStop(상한 30초) · bin/stop-media.sh(down 은 볼륨을 지우지 않음).
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const MEDIA_BOX_REPLACE_FRAMES = 360;

const T = {
  intro: 0,
  newTask: 25,
  healthy: 55,
  shift: 70,
  oldOut: 85,
  noLoss: 95,
  term: 120,
  timer: 130,
  down: 180,
  drop: 215,
  kept: 245,
  back: 285,
  reconnect: 295,
  inherit: 305,
} as const;
const FADE = 12;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Pos = { readonly x: number; readonly y: number };

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly row1Label: Pos;
  readonly req: Box;
  readonly oldTask: Box;
  readonly newTask: Box;
  readonly noLossTag: Pos;
  readonly noLossText: string;
  readonly row2Label: Pos;
  readonly obs: Box;
  readonly media: Box;
  readonly cells: readonly [Pos, Pos];
  readonly cellSize: { readonly w: number; readonly h: number };
  readonly pendingLabel: Pos;
  readonly udpLabel: Pos;
  readonly termTag: Pos;
  readonly timer: Box;
  readonly timerLabel: Pos;
  readonly cutTag: Pos;
  readonly volume: Box;
  readonly volCells: readonly [Pos, Pos];
  readonly keptTag: Pos;
  readonly inheritTag: Pos;
  readonly text: { readonly title: number; readonly label: number; readonly node: number; readonly tag: number };
};

const DESKTOP: Layout = {
  title: [{ y: 32, text: "API는 갈아 끼우고, 미디어 상자는 멈췄다 다시 띄웁니다" }],
  titleX: 120,
  row1Label: { x: 120, y: 130 },
  req: { x: 120, y: 245, w: 240, h: 100 },
  oldTask: { x: 760, y: 190, w: 340, h: 90 },
  newTask: { x: 760, y: 310, w: 340, h: 90 },
  noLossTag: { x: 1160, y: 324 },
  noLossText: "새 태스크가 뜬 뒤 옛 태스크를 내림",
  row2Label: { x: 120, y: 470 },
  obs: { x: 120, y: 560, w: 240, h: 120 },
  media: { x: 760, y: 520, w: 440, h: 200 },
  cells: [
    { x: 800, y: 630 },
    { x: 900, y: 630 },
  ],
  cellSize: { w: 86, h: 60 },
  pendingLabel: { x: 1010, y: 638 },
  udpLabel: { x: 560, y: 560 },
  termTag: { x: 1250, y: 524 },
  timer: { x: 1250, y: 610, w: 400, h: 34 },
  timerLabel: { x: 1250, y: 656 },
  cutTag: { x: 560, y: 650 },
  volume: { x: 760, y: 790, w: 440, h: 130 },
  volCells: [
    { x: 880, y: 830 },
    { x: 980, y: 830 },
  ],
  keptTag: { x: 1250, y: 824 },
  inheritTag: { x: 120, y: 960 },
  text: { title: TEXT.title, label: TEXT.label, node: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "API는 갈아 끼우고, 미디어" },
    { y: 124, text: "상자는 멈췄다 다시 띄웁니다" },
  ],
  titleX: 60,
  row1Label: { x: 60, y: 222 },
  req: { x: 60, y: 300, w: 220, h: 100 },
  oldTask: { x: 420, y: 250, w: 340, h: 90 },
  newTask: { x: 420, y: 360, w: 340, h: 90 },
  noLossTag: { x: 420, y: 470 },
  noLossText: "뜬 뒤에 내림",
  row2Label: { x: 60, y: 570 },
  obs: { x: 60, y: 690, w: 200, h: 110 },
  media: { x: 440, y: 650, w: 580, h: 220 },
  cells: [
    { x: 470, y: 770 },
    { x: 580, y: 770 },
  ],
  cellSize: { w: 96, h: 66 },
  pendingLabel: { x: 700, y: 778 },
  udpLabel: { x: 350, y: 676 },
  termTag: { x: 820, y: 566 },
  timer: { x: 440, y: 892, w: 580, h: 30 },
  timerLabel: { x: 440, y: 930 },
  cutTag: { x: 60, y: 832 },
  volume: { x: 440, y: 1010, w: 580, h: 140 },
  volCells: [
    { x: 620, y: 1056 },
    { x: 730, y: 1056 },
  ],
  keptTag: { x: 60, y: 1046 },
  inheritTag: { x: 60, y: 1200 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, node: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type Tone = "ink" | "accent" | "muted";

const BOX_STYLE = {
  ink: { border: `3px solid ${COLOR.ink}`, background: COLOR.white, color: COLOR.ink },
  accent: { border: `5px solid ${COLOR.accent}`, background: COLOR.accentSoft, color: COLOR.ink },
  muted: { border: `3px dashed ${COLOR.muted}`, background: COLOR.surface, color: COLOR.muted },
} as const;

export const MediaBoxReplace: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];

  const intro = progress(frame, T.intro, 15);
  const newIn = progress(frame, T.newTask, FADE);
  const noLoss = progress(frame, T.noLoss, FADE);
  const term = frame < T.back ? progress(frame, T.term, FADE) : 1 - progress(frame, T.back, FADE);
  const timerFill = progress(frame, T.timer, T.down - T.timer - 5, (t) => t);
  const cut = frame < T.reconnect ? progress(frame, T.down, FADE) : 1 - progress(frame, T.reconnect, FADE);
  const drop = progress(frame, T.drop, 25);
  const kept = progress(frame, T.kept, FADE);
  const inherit = progress(frame, T.inherit, FADE);

  const healthy = frame >= T.healthy;
  const shifted = frame >= T.shift;
  const oldGone = frame >= T.oldOut;
  const isDown = frame >= T.down && frame < T.back;
  const reconnected = frame >= T.reconnect;

  const box = (b: Box, text: string, tone: Tone, opacity: number, key: string, align: "center" | "top" = "center") => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        borderRadius: 16,
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "center",
        alignItems: align === "center" ? "center" : "flex-start",
        paddingTop: align === "top" ? 14 : 0,
        fontFamily: FONT,
        fontSize: l.text.node,
        fontWeight: 720,
        opacity,
        ...BOX_STYLE[tone],
      }}
    >
      {text}
    </div>
  );

  const cellAt = (p: Pos, tone: "ink" | "accent", key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: l.cellSize.w,
        height: l.cellSize.h,
        borderRadius: 10,
        boxSizing: "border-box",
        border: tone === "accent" ? `4px solid ${COLOR.accent}` : `3px solid ${COLOR.ink}`,
        background: tone === "accent" ? COLOR.accentSoft : COLOR.white,
        opacity: intro,
      }}
    />
  );

  const reqRight = { x: l.req.x + l.req.w + 8, y: l.req.y + l.req.h / 2 };
  const obsRight = { x: l.obs.x + l.obs.w, y: l.obs.y + l.obs.h / 2 };
  const mediaLeft = { x: l.media.x, y: obsRight.y };
  const gapMid = (obsRight.x + mediaLeft.x) / 2;
  const lineColor = reconnected ? COLOR.accent : isDown ? COLOR.danger : COLOR.ink;
  const gap = isDown ? 46 : 0;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 위 줄: API 태스크 */}
      <Label x={l.row1Label.x} y={l.row1Label.y} size={l.text.label} weight={700} opacity={intro}>
        API 태스크(ECS)
      </Label>
      {box(l.req, "요청", "ink", intro, "req")}
      <Arrow
        x1={reqRight.x}
        y1={reqRight.y}
        x2={l.oldTask.x - 10}
        y2={l.oldTask.y + l.oldTask.h / 2}
        color={shifted ? COLOR.muted : COLOR.ink}
        dashed={shifted}
        draw={oldGone ? 0 : intro}
      />
      <Arrow
        x1={reqRight.x}
        y1={reqRight.y}
        x2={l.newTask.x - 10}
        y2={l.newTask.y + l.newTask.h / 2}
        color={COLOR.accent}
        draw={progress(frame, T.shift, 15)}
      />
      {box(l.oldTask, "옛 태스크", oldGone ? "muted" : "ink", oldGone ? 1 - progress(frame, T.oldOut, 30) * 0.5 : intro, "old")}
      {box(l.newTask, healthy ? "새 태스크" : "새 태스크 준비 중", healthy ? "accent" : "muted", newIn, "new")}
      <Tag x={l.noLossTag.x} y={l.noLossTag.y} tone="accent" size={l.text.tag} opacity={noLoss}>
        {l.noLossText}
      </Tag>

      {/* 아래 줄: 미디어 상자 */}
      <Label x={l.row2Label.x} y={l.row2Label.y} size={l.text.label} weight={700} opacity={intro}>
        미디어 상자(EC2)
      </Label>
      {box(l.obs, "OBS", "ink", intro, "obs")}
      <svg style={{ position: "absolute", inset: 0, opacity: intro }} width="100%" height="100%">
        <line x1={obsRight.x + 6} y1={obsRight.y} x2={gapMid - gap} y2={mediaLeft.y} stroke={lineColor} strokeWidth={7} strokeLinecap="round" />
        <line x1={gapMid + gap} y1={obsRight.y} x2={mediaLeft.x - 6} y2={mediaLeft.y} stroke={lineColor} strokeWidth={7} strokeLinecap="round" />
      </svg>
      <Label x={l.udpLabel.x} y={l.udpLabel.y} size={l.text.tag} color={COLOR.muted} weight={700} anchor="center" opacity={intro}>
        UDP
      </Label>
      <Tag x={l.cutTag.x} y={l.cutTag.y} tone="danger" size={l.text.tag} anchor={layout === "mobile" ? "left" : "center"} opacity={cut}>
        송출 끊김
      </Tag>

      {/* 볼륨 */}
      <div
        style={{
          position: "absolute",
          left: l.volume.x,
          top: l.volume.y,
          width: l.volume.w,
          height: l.volume.h,
          borderRadius: 16,
          boxSizing: "border-box",
          border: `3px solid ${COLOR.muted}`,
          background: COLOR.surface,
          opacity: intro,
        }}
      />
      <Label x={l.volume.x + 24} y={l.volume.y + l.volume.h / 2 - l.text.tag * 0.65} size={l.text.tag} color={COLOR.muted} weight={720} opacity={intro}>
        볼륨
      </Label>
      {box(l.media, "미디어 상자", isDown ? "muted" : "ink", intro, "media", "top")}
      {/* 업로드 전 조각: 상자 안 → 내릴 때 볼륨으로 떨어져 남는다. */}
      {[0, 1].map((i) => {
        const from = l.cells[i];
        const to = l.volCells[i];
        const p = { x: from.x + (to.x - from.x) * drop, y: from.y + (to.y - from.y) * drop };
        return cellAt(p, drop >= 1 ? "accent" : "ink", `cell-${i}`);
      })}
      <Label x={l.pendingLabel.x} y={l.pendingLabel.y} size={l.text.tag} color={COLOR.muted} weight={700} opacity={intro * (1 - drop)}>
        업로드 전
      </Label>

      <Tag x={l.termTag.x} y={l.termTag.y} tone="ink" size={l.text.tag} opacity={term}>
        TERM
      </Tag>
      <div
        style={{
          position: "absolute",
          left: l.timer.x,
          top: l.timer.y,
          width: l.timer.w,
          height: l.timer.h,
          borderRadius: 999,
          border: `3px solid ${COLOR.ink}`,
          boxSizing: "border-box",
          overflow: "hidden",
          opacity: term,
        }}
      >
        <div style={{ width: `${timerFill * 100}%`, height: "100%", background: COLOR.ink }} />
      </div>
      <Label x={l.timerLabel.x} y={l.timerLabel.y} size={l.text.tag} color={COLOR.ink} weight={700} opacity={term}>
        최대 30초
      </Label>

      <Tag x={l.keptTag.x} y={l.keptTag.y} tone="accent" size={l.text.tag} opacity={kept}>
        볼륨에 남음
      </Tag>
      <Tag x={l.inheritTag.x} y={l.inheritTag.y} tone="accent" size={l.text.tag} opacity={inherit}>
        300초 안 재접속 → 앞 세션을 이음
      </Tag>
    </AbsoluteFill>
  );
};
