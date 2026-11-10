// 콘티: _workspace/blog/aws-gcp-bidirectional-cutover-experiment/storyboard.md 「영상 1」
// 전환하는 동안 요청은 접수 큐에 쌓였다가, 전환이 끝나면 쌓인 것부터 GCP 로 넘어간다(반복 클립, 생성 소재 없음).
// layout="mobile" 은 1080×1350 휴대폰판(CutoverQueuePauseMobile) — 같은 움직임을 세로 배치 · 큰 글자로 그린다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, type NodeTone } from "../../components/Flow";
import { FlowPath } from "../../components/FlowPath";
import { Label, Tag } from "../../components/Timeline";
import { progress, visibleBetween } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const CUTOVER_QUEUE_PAUSE_FRAMES = 300;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤 최소 1초(30프레임) 멈춘다. */
const T = {
  pause: 75,
  waitTag: 95,
  resume: 180,
  flushFrom: 195,
  flushUntil: 240,
  end: CUTOVER_QUEUE_PAUSE_FRAMES,
} as const;

/** 큐에 쌓이는 요청 수(사각형). */
const MAX_QUEUED = 7;

type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

type Layout = {
  readonly text: { readonly node: number; readonly tag: number };
  readonly phaseTag: { readonly x: number; readonly y: number };
  readonly waitTag: { readonly x: number; readonly y: number };
  readonly bot: Box;
  readonly queue: Box;
  /** 큐 상자 안 「접수 큐」 글자의 윗변. */
  readonly queueLabelY: number;
  /** 쌓인 요청 사각형 줄의 윗변 · 한 변 · 간격. */
  readonly stack: { readonly y: number; readonly size: number; readonly gap: number };
  readonly awsApp: Box;
  readonly awsDb: Box;
  readonly gcpApp: Box;
  readonly gcpDb: Box;
  readonly paths: {
    readonly botToQueue: string;
    readonly queueToAws: string;
    readonly queueToGcp: string;
    readonly awsAppToDb: string;
    readonly gcpAppToDb: string;
  };
};

// 데스크톱: 왼쪽에서 오른쪽으로 봇 → 큐 → (위: AWS, 아래: GCP). 좌표는 SAFE.x(120) 안쪽.
const DESKTOP: Layout = {
  text: { node: TEXT.label, tag: TEXT.small },
  phaseTag: { x: 960, y: 96 },
  waitTag: { x: 770, y: 680 },
  bot: { x: 120, y: 470, width: 300, height: 130 },
  queue: { x: 560, y: 440, width: 420, height: 190 },
  queueLabelY: 462,
  stack: { y: 560, size: 34, gap: 14 },
  awsApp: { x: 1150, y: 200, width: 300, height: 130 },
  awsDb: { x: 1530, y: 200, width: 270, height: 130 },
  gcpApp: { x: 1150, y: 730, width: 300, height: 130 },
  gcpDb: { x: 1530, y: 730, width: 270, height: 130 },
  paths: {
    botToQueue: "M 420 535 L 560 535",
    queueToAws: "M 980 500 C 1080 500, 1060 265, 1150 265",
    queueToGcp: "M 980 570 C 1080 570, 1060 795, 1150 795",
    awsAppToDb: "M 1450 265 L 1530 265",
    gcpAppToDb: "M 1450 795 L 1530 795",
  },
};

// 휴대폰판: 위에서 아래로 봇 → 큐 → (왼쪽 AWS | 오른쪽 GCP) → DB. 글자 48px 이상.
const MOBILE: Layout = {
  text: { node: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  phaseTag: { x: 540, y: 40 },
  waitTag: { x: 540, y: 1230 },
  bot: { x: 320, y: 150, width: 440, height: 130 },
  queue: { x: 250, y: 400, width: 580, height: 190 },
  queueLabelY: 420,
  stack: { y: 510, size: 44, gap: 16 },
  awsApp: { x: 60, y: 780, width: 420, height: 130 },
  awsDb: { x: 90, y: 1060, width: 360, height: 120 },
  gcpApp: { x: 600, y: 780, width: 420, height: 130 },
  gcpDb: { x: 630, y: 1060, width: 360, height: 120 },
  paths: {
    botToQueue: "M 540 280 L 540 400",
    queueToAws: "M 540 590 C 540 690, 270 680, 270 780",
    queueToGcp: "M 540 590 C 540 690, 810 680, 810 780",
    awsAppToDb: "M 270 910 L 270 1060",
    gcpAppToDb: "M 810 910 L 810 1060",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

/** 프레임마다 큐에 쌓여 있는 요청 수: 멈춘 동안 1→7, 다시 열리면 앞에서부터 빠져 0. */
const queuedAt = (frame: number): number => {
  if (frame < T.pause) return 0;
  if (frame < T.flushFrom) return Math.min(MAX_QUEUED, Math.floor((frame - T.pause) / 14) + 1);
  if (frame < T.flushUntil) {
    const step = (T.flushUntil - T.flushFrom) / MAX_QUEUED;
    return Math.max(0, MAX_QUEUED - Math.floor((frame - T.flushFrom) / step) - 1);
  }
  return 0;
};

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const CutoverQueuePause: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const paused = frame >= T.pause && frame < T.resume;
  const toGcp = frame >= T.resume;
  const awsFade = 1 - 0.75 * progress(frame, T.pause, 15);
  const awsTone: NodeTone = toGcp ? "ink" : paused ? "muted" : "accent";
  const gcpTone: NodeTone = toGcp ? "accent" : "ink";
  const queued = queuedAt(frame);
  const stackWidth = MAX_QUEUED * L.stack.size + (MAX_QUEUED - 1) * L.stack.gap;
  const stackLeft = L.queue.x + (L.queue.width - stackWidth) / 2;

  return (
    <AbsoluteFill style={{ background: COLOR.surface }}>
      {/* 구간 이름표 — 한 번에 하나만 보인다. */}
      <Tag x={L.phaseTag.x} y={L.phaseTag.y} anchor="center" tone="ink" size={L.text.tag} opacity={visibleBetween(frame, -12, T.pause + 6, 12)}>
        전환 전
      </Tag>
      <Tag x={L.phaseTag.x} y={L.phaseTag.y} anchor="center" tone="ink" size={L.text.tag} opacity={visibleBetween(frame, T.pause, T.resume + 6, 12)}>
        전환 중 · 전달 멈춤
      </Tag>
      <Tag x={L.phaseTag.x} y={L.phaseTag.y} anchor="center" tone="accent" size={L.text.tag} opacity={progress(frame, T.resume, 12)}>
        쌓인 요청부터 GCP로
      </Tag>

      {/* 봇 → 큐: 전환과 상관없이 계속 들어온다(회색 선, 강조는 지금 흐르는 대상 경로 하나만). */}
      <FlowPath d={L.paths.botToQueue} start={-30} color={COLOR.muted} packetColor={COLOR.ink} packets={2} cycleFrames={36} packetsFrom={0} arrow />

      {/* 큐 → AWS: 전환 전에는 흐르고, 멈추면 흐려진다. */}
      <FlowPath d={L.paths.queueToAws} start={-30} packets={2} cycleFrames={40} packetsFrom={0} packetsUntil={T.pause} opacity={awsFade} arrow />
      <FlowPath d={L.paths.awsAppToDb} start={-30} packets={1} cycleFrames={30} packetsFrom={0} packetsUntil={T.pause} opacity={awsFade} arrow />

      {/* 큐 → GCP: 다시 열리면 그려지고, 쌓인 요청이 몰려간 뒤 평소 흐름으로. */}
      <FlowPath d={L.paths.queueToGcp} start={T.resume} drawFrames={15} color={COLOR.accent} arrow />
      <FlowPath d={L.paths.queueToGcp} start={T.resume} drawFrames={1} packets={5} cycleFrames={30} packetsFrom={T.flushFrom} packetsUntil={T.flushUntil} />
      <FlowPath d={L.paths.queueToGcp} start={T.resume} drawFrames={1} packets={2} cycleFrames={40} packetsFrom={T.flushUntil} />
      <FlowPath d={L.paths.gcpAppToDb} start={T.resume + 10} drawFrames={10} packets={1} cycleFrames={30} packetsFrom={T.flushFrom + 10} arrow />

      <Node {...L.bot} tone="ink" size={L.text.node}>트래픽 봇</Node>
      <Node {...L.queue} tone="ink" size={L.text.node}>{" "}</Node>
      <Label x={L.queue.x + L.queue.width / 2} y={L.queueLabelY} anchor="center" size={L.text.node} weight={680}>
        접수 큐
      </Label>
      {Array.from({ length: MAX_QUEUED }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: stackLeft + i * (L.stack.size + L.stack.gap),
            top: L.stack.y,
            width: L.stack.size,
            height: L.stack.size,
            borderRadius: 8,
            boxSizing: "border-box",
            background: i < queued ? COLOR.ink : "transparent",
            border: `3px ${i < queued ? "solid" : "dashed"} ${i < queued ? COLOR.ink : COLOR.line}`,
          }}
        />
      ))}

      <Node {...L.awsApp} tone={awsTone} size={L.text.node}>AWS 앱</Node>
      <Node {...L.awsDb} tone={toGcp || paused ? "ink" : "accent"} size={L.text.node}>RDS</Node>
      <Node {...L.gcpApp} tone={gcpTone} size={L.text.node}>GCP 앱</Node>
      <Node {...L.gcpDb} tone={gcpTone} size={L.text.node}>Cloud SQL</Node>

      {/* 실측값은 본문과 같은 8,249ms. 실패가 아니므로 danger 색을 쓰지 않는다. */}
      <Tag x={L.waitTag.x} y={L.waitTag.y} anchor="center" tone="muted" size={L.text.tag} opacity={progress(frame, T.waitTag, 12)}>
        가장 긴 대기 8.2초(실측)
      </Tag>
    </AbsoluteFill>
  );
};
