// 콘티: _workspace/blog/pokeclip-path-reconciler-design-history/storyboard.md 「영상 1」
// 대안 T(연결마다 인증)를 MediaMTX 1.21.1 에서 잰 10월 5일 로컬 실측을 옮긴 개념도.
// 송출 연결 10개가 동시에 들어오지만 HTTP 인증 응답(0.3초 지연 스텁)을 한 줄로 하나씩 기다려,
// 첫 연결은 약 0.3초, 열 번째 연결은 3.057초에 수락된다. 끝에 새 HLS 세션 · 목록 API 요청도 같은 줄 끝에서 기다린다.
// 시간은 0–3.057초에 비례해 그린다(인증 한 번 = 3.057 / 10 초). 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const AUTH_QUEUE_SERIAL_FRAMES = 330;

const CONNECTIONS = 10;
const COLUMNS = 5;
/** 연결 10개를 모두 수락하는 데 걸린 시간(초). 이 길이를 simStart–simEnd 구간에 비례로 펼친다. */
const LAST_ACCEPT_SECONDS = 3.057;

/** 장면 순서(프레임, 30fps). */
const T = {
  intro: 0,
  arrive: 8,
  simStart: 34,
  simEnd: 229,
  requestsIn: 262,
  requestsWait: 276,
} as const;
const STEP = (T.simEnd - T.simStart) / CONNECTIONS;
const MOVE = 7;
const FADE = 12;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Pos = { readonly x: number; readonly y: number };
type Line = { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number };

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly queueLabel: Pos;
  readonly queue: Pos;
  readonly cell: { readonly w: number; readonly h: number; readonly gap: number };
  readonly gateLabel: Pos;
  readonly gate: Box;
  readonly gateNote: Pos;
  readonly acceptLabel: Pos;
  readonly accepted: Pos;
  readonly inArrow: Line;
  readonly outArrow: Line;
  readonly axisLabel: Pos;
  readonly axis: { readonly x0: number; readonly x1: number; readonly y: number; readonly h: number };
  readonly axisTextY: number;
  /** 축 시작의 「0」 — 휴대폰판은 첫 눈금 「0.3초」와 겹쳐 뺀다. */
  readonly showZero: boolean;
  readonly requests: readonly (Box & { readonly text: string })[];
  readonly waitTag: Pos;
  readonly waitArrow: Line;
  readonly text: { readonly title: number; readonly label: number; readonly cell: number; readonly tag: number };
};

const DESKTOP: Layout = {
  title: [{ y: 52, text: "연결마다 인증하면 한 줄로 하나씩 기다립니다" }],
  titleX: 120,
  queueLabel: { x: 120, y: 172 },
  queue: { x: 120, y: 252 },
  cell: { w: 96, h: 80, gap: 16 },
  gateLabel: { x: 960, y: 172 },
  gate: { x: 820, y: 252, w: 280, h: 176 },
  gateNote: { x: 960, y: 442 },
  acceptLabel: { x: 1256, y: 172 },
  accepted: { x: 1256, y: 252 },
  inArrow: { x1: 684, y1: 340, x2: 806, y2: 340 },
  outArrow: { x1: 1114, y1: 340, x2: 1240, y2: 340 },
  axisLabel: { x: 160, y: 716 },
  axis: { x0: 160, x1: 1620, y: 786, h: 40 },
  axisTextY: 854,
  showZero: true,
  requests: [
    { x: 120, y: 466, w: 270, h: 84, text: "새 HLS 세션" },
    { x: 410, y: 466, w: 230, h: 84, text: "목록 API" },
  ],
  waitTag: { x: 120, y: 576 },
  waitArrow: { x1: 656, y1: 506, x2: 806, y2: 414 },
  text: { title: TEXT.title, label: TEXT.label, cell: TEXT.small, tag: TEXT.small },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "연결마다 인증하면" },
    { y: 124, text: "한 줄로 하나씩 기다립니다" },
  ],
  titleX: 60,
  queueLabel: { x: 60, y: 222 },
  queue: { x: 60, y: 296 },
  cell: { w: 104, h: 84, gap: 16 },
  gateLabel: { x: 890, y: 222 },
  gate: { x: 760, y: 296, w: 260, h: 184 },
  gateNote: { x: 890, y: 494 },
  acceptLabel: { x: 60, y: 806 },
  accepted: { x: 436, y: 744 },
  inArrow: { x1: 656, y1: 388, x2: 748, y2: 388 },
  outArrow: { x1: 890, y1: 568, x2: 890, y2: 732 },
  axisLabel: { x: 110, y: 990 },
  axis: { x0: 110, x1: 860, y: 1064, h: 40 },
  axisTextY: 1128,
  showZero: false,
  requests: [
    { x: 60, y: 512, w: 300, h: 88, text: "새 HLS 세션" },
    { x: 380, y: 512, w: 250, h: 88, text: "목록 API" },
  ],
  waitTag: { x: 60, y: 624 },
  waitArrow: { x1: 644, y1: 540, x2: 750, y2: 474 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, cell: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type CellTone = "queued" | "gate" | "accepted";

const CELL_STYLE = {
  queued: { border: `3px solid ${COLOR.ink}`, background: COLOR.white, color: COLOR.ink },
  gate: { border: `5px solid ${COLOR.accent}`, background: COLOR.white, color: COLOR.ink },
  accepted: { border: `4px solid ${COLOR.accent}`, background: COLOR.accentSoft, color: COLOR.ink },
} as const;

const lerp = (a: Pos, b: Pos, t: number): Pos => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

const gridSlot = (origin: Pos, cell: Layout["cell"], index: number): Pos => ({
  x: origin.x + (index % COLUMNS) * (cell.w + cell.gap),
  y: origin.y + Math.floor(index / COLUMNS) * (cell.h + cell.gap),
});

/** 연결 i 가 인증을 시작하는 프레임과 수락되는 프레임. */
const enterFrame = (i: number) => T.simStart + i * STEP;
const acceptFrame = (i: number) => T.simStart + (i + 1) * STEP;

export const AuthQueueSerial: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];

  const intro = progress(frame, T.intro, 15);
  const arrive = progress(frame, T.arrive, 18);
  const processing = frame >= T.simStart && frame < T.simEnd;
  const simT = interpolate(frame, [T.simStart, T.simEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stepFill = processing ? ((frame - T.simStart) % STEP) / STEP : 0;
  const requestsIn = progress(frame, T.requestsIn, 14);
  const requestsWait = frame >= T.requestsWait;
  const firstShown = progress(frame, acceptFrame(0), FADE);
  const lastShown = progress(frame, acceptFrame(CONNECTIONS - 1), FADE);

  const gateSlot: Pos = { x: l.gate.x + (l.gate.w - l.cell.w) / 2, y: l.gate.y + 30 };
  const axisX = (t: number) => l.axis.x0 + (l.axis.x1 - l.axis.x0) * t;

  const cells = Array.from({ length: CONNECTIONS }, (_, i) => {
    const queued = gridSlot(l.queue, l.cell, i);
    const done = gridSlot(l.accepted, l.cell, i);
    const enter = progress(frame, enterFrame(i), MOVE);
    const leave = progress(frame, acceptFrame(i), MOVE);
    const pos = leave > 0 ? lerp(gateSlot, done, leave) : lerp(queued, gateSlot, enter);
    const tone: CellTone = frame >= acceptFrame(i) ? "accepted" : frame >= enterFrame(i) ? "gate" : "queued";
    return (
      <div
        key={`conn-${i}`}
        style={{
          position: "absolute",
          left: pos.x - (1 - arrive) * 260,
          top: pos.y,
          width: l.cell.w,
          height: l.cell.h,
          borderRadius: 12,
          boxSizing: "border-box",
          display: "grid",
          placeItems: "center",
          fontFamily: FONT,
          fontSize: l.text.cell,
          fontWeight: 700,
          opacity: arrive,
          ...CELL_STYLE[tone],
        }}
      >
        {i + 1}
      </div>
    );
  });

  const slotGhosts = (origin: Pos, key: string) =>
    Array.from({ length: CONNECTIONS }, (_, i) => {
      const p = gridSlot(origin, l.cell, i);
      return (
        <div
          key={`${key}-${i}`}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: l.cell.w,
            height: l.cell.h,
            borderRadius: 12,
            boxSizing: "border-box",
            border: `3px dashed ${COLOR.line}`,
            opacity: intro,
          }}
        />
      );
    });

  const ticks = Array.from({ length: CONNECTIONS }, (_, i) => (
    <div
      key={`tick-${i}`}
      style={{
        position: "absolute",
        left: axisX((i + 1) / CONNECTIONS) - 3,
        top: l.axis.y - 14,
        width: 6,
        height: l.axis.h + 28,
        borderRadius: 3,
        background: COLOR.accent,
        opacity: progress(frame, acceptFrame(i), 6),
      }}
    />
  ));

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <Label x={l.queueLabel.x} y={l.queueLabel.y} size={l.text.label} weight={700} opacity={intro}>
        송출 연결 10개
      </Label>
      <Label x={l.gateLabel.x} y={l.gateLabel.y} size={l.text.label} weight={700} anchor="center" opacity={intro}>
        인증
      </Label>
      <Label x={l.acceptLabel.x} y={l.acceptLabel.y} size={l.text.label} weight={700} opacity={intro}>
        수락
      </Label>

      {slotGhosts(l.queue, "q")}
      {slotGhosts(l.accepted, "a")}

      {/* 인증 관문: 한 번에 연결 하나만 들어가고, 아래 막대가 0.3초를 채운다. */}
      <div
        style={{
          position: "absolute",
          left: l.gate.x,
          top: l.gate.y,
          width: l.gate.w,
          height: l.gate.h,
          borderRadius: 18,
          boxSizing: "border-box",
          border: processing ? `5px solid ${COLOR.accent}` : `3px solid ${COLOR.ink}`,
          background: processing ? COLOR.accentSoft : COLOR.surface,
          opacity: intro,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: l.gate.x + 30,
          top: l.gate.y + l.gate.h - 44,
          width: l.gate.w - 60,
          height: 18,
          borderRadius: 999,
          boxSizing: "border-box",
          border: `3px solid ${COLOR.ink}`,
          overflow: "hidden",
          opacity: intro,
        }}
      >
        <div style={{ width: `${stepFill * 100}%`, height: "100%", background: COLOR.ink }} />
      </div>
      <Label x={l.gateNote.x} y={l.gateNote.y} size={l.text.tag} color={COLOR.muted} weight={700} anchor="center" opacity={intro}>
        하나씩 0.3초
      </Label>

      <Arrow {...l.inArrow} color={COLOR.ink} draw={intro} />
      <Arrow {...l.outArrow} color={COLOR.accent} draw={intro} />

      {cells}

      {/* 수락 시각: 0–3.057초를 축 길이에 비례로 펼친다. */}
      <Label x={l.axisLabel.x} y={l.axisLabel.y} size={l.text.tag} color={COLOR.muted} weight={700} opacity={intro}>
        수락 시각
      </Label>
      <div
        style={{
          position: "absolute",
          left: l.axis.x0,
          top: l.axis.y,
          width: l.axis.x1 - l.axis.x0,
          height: l.axis.h,
          borderRadius: 999,
          background: COLOR.surface,
          border: `3px solid ${COLOR.line}`,
          boxSizing: "border-box",
          opacity: intro,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: l.axis.x0,
          top: l.axis.y,
          width: (l.axis.x1 - l.axis.x0) * simT,
          height: l.axis.h,
          borderRadius: 999,
          background: COLOR.ink,
          opacity: intro,
        }}
      />
      {ticks}
      {l.showZero ? (
        <Label x={l.axis.x0} y={l.axisTextY} size={l.text.tag} color={COLOR.muted} weight={700} anchor="center" opacity={intro}>
          0
        </Label>
      ) : null}
      <Label x={axisX(1 / CONNECTIONS)} y={l.axisTextY} size={l.text.tag} color={COLOR.accent} weight={760} anchor="center" opacity={firstShown}>
        0.3초
      </Label>
      <Tag x={axisX(1)} y={l.axisTextY - 8} tone="accent" size={l.text.tag} anchor="center" opacity={lastShown}>
        {`${LAST_ACCEPT_SECONDS}초`}
      </Tag>

      {/* 같은 줄 끝: 새 HLS 세션 · 목록 API 요청도 인증 차례를 기다린다. */}
      {l.requests.map((r) => (
        <div
          key={r.text}
          style={{
            position: "absolute",
            left: r.x - (1 - requestsIn) * 200,
            top: r.y,
            width: r.w,
            height: r.h,
            borderRadius: 16,
            boxSizing: "border-box",
            display: "grid",
            placeItems: "center",
            fontFamily: FONT,
            fontSize: l.text.tag,
            fontWeight: 720,
            opacity: requestsIn,
            border: requestsWait ? `4px dashed ${COLOR.danger}` : `3px dashed ${COLOR.muted}`,
            background: requestsWait ? COLOR.dangerSoft : COLOR.surface,
            color: requestsWait ? COLOR.danger : COLOR.muted,
          }}
        >
          {r.text}
        </div>
      ))}
      {frame > T.requestsWait ? <Arrow {...l.waitArrow} color={COLOR.danger} dashed draw={progress(frame, T.requestsWait, FADE)} /> : null}
      <Tag x={l.waitTag.x} y={l.waitTag.y} tone="danger" size={l.text.tag} opacity={progress(frame, T.requestsWait, FADE)}>
        새 HLS 세션 · 목록 API도 대기
      </Tag>
    </AbsoluteFill>
  );
};
