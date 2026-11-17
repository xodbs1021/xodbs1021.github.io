// 콘티: _workspace/blog/pokeclip-live-dvr-url-split/storyboard.md 「PipelineStop」
// 되감기 · 녹화 공정(사이드카)이 멈춰도 라이브 갈래는 계속 흐른다(개념도 — 수치 없음).
// 위 갈래: MediaMTX → /live(Media 상자) → 플레이어. 아래 갈래: MediaMTX → 사이드카 → S3(/dvr · /vod) → 플레이어.
// 사이드카가 멈추면 MediaMTX → 사이드카 → S3 만 멈추고, 이미 올린 조각은 S3 → 플레이어로 계속 나간다.
// layout="mobile" 은 1080×1350 휴대폰판 — 왼쪽 열이 라이브, 오른쪽 열이 되감기, 글자 48px 이상.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { FlowPath } from "../../components/FlowPath";
import { Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const PIPELINE_STOP_FRAMES = 300;

const T = {
  boxes: 0,
  wires: 18,
  packets: 40,
  stop: 125,
  tags: 150,
} as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Layout = {
  readonly text: number;
  readonly tag: number;
  readonly obs: Box;
  readonly mtx: Box;
  readonly live: Box;
  readonly side: Box;
  readonly s3: Box;
  readonly player: Box;
  /** 선 경로(SVG path) — 상자 가장자리에서 시작 · 끝. */
  readonly paths: {
    readonly obsMtx: string;
    readonly mtxLive: string;
    readonly livePlayer: string;
    readonly mtxSide: string;
    readonly sideS3: string;
    readonly s3Player: string;
  };
  readonly liveTag: { readonly x: number; readonly y: number };
  readonly stopTag: { readonly x: number; readonly y: number };
  readonly headTag: { readonly x: number; readonly y: number };
};

const D_OBS: Box = { x: 100, y: 440, w: 220, h: 110 };
const D_MTX: Box = { x: 400, y: 440, w: 290, h: 110 };
const D_LIVE: Box = { x: 820, y: 200, w: 520, h: 120 };
const D_SIDE: Box = { x: 820, y: 680, w: 400, h: 120 };
const D_S3: Box = { x: 1300, y: 680, w: 300, h: 120 };
const D_PLAYER: Box = { x: 1600, y: 440, w: 240, h: 110 };

const right = (b: Box) => b.x + b.w;
const midY = (b: Box) => b.y + b.h / 2;
const midX = (b: Box) => b.x + b.w / 2;

const DESKTOP: Layout = {
  text: TEXT.small,
  tag: TEXT.small,
  obs: D_OBS,
  mtx: D_MTX,
  live: D_LIVE,
  side: D_SIDE,
  s3: D_S3,
  player: D_PLAYER,
  paths: {
    obsMtx: `M${right(D_OBS)},${midY(D_OBS)} L${D_MTX.x},${midY(D_MTX)}`,
    mtxLive: `M${midX(D_MTX)},${D_MTX.y} L${midX(D_MTX)},${midY(D_LIVE)} L${D_LIVE.x},${midY(D_LIVE)}`,
    livePlayer: `M${right(D_LIVE)},${midY(D_LIVE)} L${midX(D_PLAYER)},${midY(D_LIVE)} L${midX(D_PLAYER)},${D_PLAYER.y}`,
    mtxSide: `M${midX(D_MTX)},${D_MTX.y + D_MTX.h} L${midX(D_MTX)},${midY(D_SIDE)} L${D_SIDE.x},${midY(D_SIDE)}`,
    sideS3: `M${right(D_SIDE)},${midY(D_SIDE)} L${D_S3.x},${midY(D_S3)}`,
    s3Player: `M${right(D_S3)},${midY(D_S3)} L${midX(D_PLAYER)},${midY(D_S3)} L${midX(D_PLAYER)},${D_PLAYER.y + D_PLAYER.h}`,
  },
  liveTag: { x: 1080, y: 110 },
  stopTag: { x: 1020, y: 590 },
  headTag: { x: 1220, y: 850 },
};

const M_OBS: Box = { x: 290, y: 90, w: 500, h: 110 };
const M_MTX: Box = { x: 290, y: 280, w: 500, h: 110 };
const M_LIVE: Box = { x: 50, y: 520, w: 440, h: 140 };
const M_SIDE: Box = { x: 590, y: 520, w: 440, h: 140 };
const M_S3: Box = { x: 590, y: 790, w: 440, h: 120 };
const M_PLAYER: Box = { x: 290, y: 1110, w: 500, h: 110 };

const MOBILE: Layout = {
  text: MOBILE_TEXT.small,
  tag: MOBILE_TEXT.small,
  obs: M_OBS,
  mtx: M_MTX,
  live: M_LIVE,
  side: M_SIDE,
  s3: M_S3,
  player: M_PLAYER,
  paths: {
    obsMtx: `M${midX(M_OBS)},${M_OBS.y + M_OBS.h} L${midX(M_MTX)},${M_MTX.y}`,
    mtxLive: `M${M_MTX.x + 120},${M_MTX.y + M_MTX.h} L${M_MTX.x + 120},450 L${midX(M_LIVE)},450 L${midX(M_LIVE)},${M_LIVE.y}`,
    livePlayer: `M${midX(M_LIVE)},${M_LIVE.y + M_LIVE.h} L${midX(M_LIVE)},${midY(M_PLAYER)} L${M_PLAYER.x},${midY(M_PLAYER)}`,
    mtxSide: `M${right(M_MTX) - 120},${M_MTX.y + M_MTX.h} L${right(M_MTX) - 120},450 L${midX(M_SIDE)},450 L${midX(M_SIDE)},${M_SIDE.y}`,
    sideS3: `M${midX(M_SIDE)},${M_SIDE.y + M_SIDE.h} L${midX(M_S3)},${M_S3.y}`,
    s3Player: `M${midX(M_S3)},${M_S3.y + M_S3.h} L${midX(M_S3)},${midY(M_PLAYER)} L${right(M_PLAYER)},${midY(M_PLAYER)}`,
  },
  liveTag: { x: 270, y: 690 },
  stopTag: { x: 940, y: 436 },
  headTag: { x: 810, y: 688 },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const PipelineStop: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];

  const boxes = progress(frame, T.boxes, 18);
  const stopped = progress(frame, T.stop, 12);
  const tags = progress(frame, T.tags, 18);
  const sideTone = frame >= T.stop ? "danger" : "accent";
  const lowerColor = frame >= T.stop ? COLOR.muted : COLOR.accent;

  const flow = (d: string, until = Infinity, color: string = COLOR.accent) => (
    <FlowPath
      d={d}
      start={T.wires}
      drawFrames={20}
      color={color}
      width={5}
      arrow
      packets={2}
      cycleFrames={54}
      packetsFrom={T.packets}
      packetsUntil={until}
      packetColor={COLOR.accent}
    />
  );

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {flow(L.paths.obsMtx)}
      {flow(L.paths.mtxLive)}
      {flow(L.paths.livePlayer)}
      {flow(L.paths.mtxSide, T.stop, lowerColor)}
      {flow(L.paths.sideS3, T.stop, lowerColor)}
      {flow(L.paths.s3Player)}

      <Node x={L.obs.x} y={L.obs.y} width={L.obs.w} height={L.obs.h} size={L.text} opacity={boxes}>
        OBS 송출
      </Node>
      <Node x={L.mtx.x} y={L.mtx.y} width={L.mtx.w} height={L.mtx.h} size={L.text} opacity={boxes}>
        MediaMTX
      </Node>
      <Node x={L.live.x} y={L.live.y} width={L.live.w} height={L.live.h} tone="accent" size={L.text} opacity={boxes}>
        {"/live · Media 상자\n라이브 창 28초"}
      </Node>
      <Node x={L.side.x} y={L.side.y} width={L.side.w} height={L.side.h} tone={sideTone} size={L.text} opacity={boxes}>
        {"사이드카\n재포장 · 업로드"}
      </Node>
      <Node
        x={L.s3.x}
        y={L.s3.y}
        width={L.s3.w}
        height={L.s3.h}
        tone="ink"
        size={L.text}
        opacity={boxes}
      >
        {"S3\n/dvr · /vod"}
      </Node>
      <Node x={L.player.x} y={L.player.y} width={L.player.w} height={L.player.h} size={L.text} opacity={boxes}>
        플레이어
      </Node>

      <Tag x={L.stopTag.x} y={L.stopTag.y} anchor="center" tone="danger" size={L.tag} scale={0.9 + 0.1 * stopped} opacity={stopped}>
        멈춤
      </Tag>
      <Tag x={L.liveTag.x} y={L.liveTag.y} anchor="center" tone="accent" size={L.tag} opacity={tags}>
        라이브는 계속
      </Tag>
      <Tag x={L.headTag.x} y={L.headTag.y} anchor="center" tone="danger" size={L.tag} opacity={tags}>
        되감기 머리가 멈춤
      </Tag>
    </AbsoluteFill>
  );
};
