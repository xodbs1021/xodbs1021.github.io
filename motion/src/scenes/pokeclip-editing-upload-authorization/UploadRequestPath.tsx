// 콘티: _workspace/blog/pokeclip-editing-upload-authorization/storyboard.md
// 편집자의 업로드 요청이 YouTube 비공개 영상이 되기까지. 처음에 clip 에서 갈라지는 7월 설계의 「승인 대기함」
// 갈래가 점선으로 보였다가 「8월 30일 · 만들지 않음」과 함께 흐려져 사라진다. 이어 요청이
// 편집자 → clip → 렌더 일꾼 → 업로드 일꾼으로 가고, 업로드 일꾼이 Auth 에서 채널 주인의 토큰을 받아
// YouTube 에 비공개로 올린다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, type NodeTone } from "../../components/Flow";
import { HopLine, type Point } from "../../components/Hops";
import { Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const UPLOAD_REQUEST_PATH_FRAMES = 360;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Name = "editor" | "clip" | "render" | "upload" | "youtube" | "auth" | "approval";
type HopName = "order" | "render" | "handoff" | "ask" | "token" | "put";
type Spot = { readonly x: number; readonly y: number };

type Layout = {
  readonly boxes: Record<Name, Box>;
  readonly hops: Record<HopName, readonly Point[]>;
  readonly approvalWire: readonly Point[];
  readonly tags: { readonly approval: Spot; readonly ask: Spot; readonly token: Spot; readonly privacy: Spot };
  readonly text: { readonly node: number; readonly tag: number };
  readonly radius: number;
};

const T = {
  approvalIn: 15,
  approvalNote: 50,
  approvalOut: 90,
  hops: {
    order: [120, 22],
    render: [146, 22],
    handoff: [172, 22],
    ask: [200, 20],
    token: [224, 20],
    put: [250, 26],
  },
  privacy: 278,
} as const;

const LABELS: Record<Name, string> = {
  editor: "편집자",
  clip: "clip 서버",
  render: "렌더 일꾼",
  upload: "업로드 일꾼",
  youtube: "YouTube",
  auth: "Auth",
  approval: "승인 대기함",
};

const right = (b: Box): Point => [b.x + b.w, b.y + b.h / 2];
const left = (b: Box): Point => [b.x, b.y + b.h / 2];
const bottom = (b: Box, dx = 0): Point => [b.x + b.w / 2 + dx, b.y + b.h];
const top = (b: Box, dx = 0): Point => [b.x + b.w / 2 + dx, b.y];

const D_Y = 460;
const D_H = 130;
const DB: Record<Name, Box> = {
  editor: { x: 60, y: D_Y, w: 260, h: D_H },
  clip: { x: 420, y: D_Y, w: 280, h: D_H },
  render: { x: 800, y: D_Y, w: 280, h: D_H },
  upload: { x: 1180, y: D_Y, w: 300, h: D_H },
  youtube: { x: 1580, y: D_Y, w: 280, h: D_H },
  auth: { x: 1180, y: 800, w: 300, h: D_H },
  approval: { x: 380, y: 140, w: 360, h: D_H },
};

const DESKTOP: Layout = {
  boxes: DB,
  hops: {
    order: [right(DB.editor), left(DB.clip)],
    render: [right(DB.clip), left(DB.render)],
    handoff: [right(DB.render), left(DB.upload)],
    ask: [bottom(DB.upload, -60), top(DB.auth, -60)],
    token: [top(DB.auth, 60), bottom(DB.upload, 60)],
    put: [right(DB.upload), left(DB.youtube)],
  },
  approvalWire: [top(DB.clip), bottom(DB.approval)],
  tags: {
    approval: { x: 780, y: 172 },
    ask: { x: 860, y: 680 },
    token: { x: 1420, y: 750 },
    privacy: { x: 1600, y: 612 },
  },
  text: { node: TEXT.label, tag: TEXT.small },
  radius: 14,
};

// 휴대폰판: 위에서 아래로. Auth 는 업로드 일꾼 오른쪽, 승인 대기함은 clip 오른쪽.
const M_X = 60;
const M_W = 460;
const M_H = 120;
const MB: Record<Name, Box> = {
  editor: { x: M_X, y: 40, w: M_W, h: M_H },
  clip: { x: M_X, y: 280, w: M_W, h: M_H },
  render: { x: M_X, y: 520, w: M_W, h: M_H },
  upload: { x: M_X, y: 760, w: M_W, h: M_H },
  youtube: { x: M_X, y: 1060, w: M_W, h: M_H },
  auth: { x: 660, y: 760, w: 360, h: M_H },
  approval: { x: 640, y: 280, w: 380, h: M_H },
};

const MOBILE: Layout = {
  boxes: MB,
  hops: {
    order: [bottom(MB.editor), top(MB.clip)],
    render: [bottom(MB.clip), top(MB.render)],
    handoff: [bottom(MB.render), top(MB.upload)],
    ask: [[MB.upload.x + MB.upload.w, 795], [MB.auth.x, 795]],
    token: [[MB.auth.x, 845], [MB.upload.x + MB.upload.w, 845]],
    put: [bottom(MB.upload), top(MB.youtube)],
  },
  approvalWire: [right(MB.clip), left(MB.approval)],
  tags: {
    approval: { x: 640, y: 420 },
    ask: { x: 560, y: 660 },
    token: { x: 560, y: 920 },
    privacy: { x: 560, y: 1090 },
  },
  text: { node: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  radius: 16,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
const HOPS: readonly HopName[] = ["order", "render", "handoff", "ask", "token", "put"];
const MAIN: readonly Name[] = ["editor", "clip", "render", "upload", "youtube", "auth"];

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const UploadRequestPath: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 15);
  const approval = progress(frame, T.approvalIn, 12) * (1 - progress(frame, T.approvalOut, 24));
  const tokenDone = frame >= T.hops.token[0] + T.hops.token[1];
  const putDone = frame >= T.hops.put[0] + T.hops.put[1];

  const toneOf = (name: Name): NodeTone => {
    if (name === "youtube" && putDone) return "accent";
    if (name === "auth" && frame >= T.hops.ask[0] && !tokenDone) return "accent";
    return "ink";
  };

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 7월 설계의 승인 대기함 갈래 — 점선으로 보였다가 사라진다. */}
      <div style={{ position: "absolute", inset: 0, opacity: approval }}>
        <HopLine
          hop={{ points: l.approvalWire, start: T.approvalIn, duration: 16, color: COLOR.muted, dashed: true }}
          frame={frame}
          radius={l.radius}
        />
        <Node
          x={l.boxes.approval.x}
          y={l.boxes.approval.y}
          width={l.boxes.approval.w}
          height={l.boxes.approval.h}
          tone="muted"
          size={l.text.node}
        >
          <div style={{ textAlign: "center" }}>{LABELS.approval}</div>
        </Node>
      </div>
      <Tag x={l.tags.approval.x} y={l.tags.approval.y} tone="muted" size={l.text.tag} opacity={progress(frame, T.approvalIn, 12) * (1 - progress(frame, T.approvalNote, 10))}>
        7월 설계
      </Tag>
      <Tag x={l.tags.approval.x} y={l.tags.approval.y} tone="ink" size={l.text.tag} opacity={progress(frame, T.approvalNote, 10) * (1 - progress(frame, T.approvalOut + 10, 20))}>
        8월 30일 · 만들지 않음
      </Tag>

      {HOPS.map((name) => {
        const [start, duration] = T.hops[name];
        const color = name === "token" || name === "put" ? COLOR.accent : COLOR.ink;
        return <HopLine key={name} hop={{ points: l.hops[name], start, duration, color }} frame={frame} radius={l.radius} />;
      })}

      {MAIN.map((name) => {
        const b = l.boxes[name];
        return (
          <Node key={name} x={b.x} y={b.y} width={b.w} height={b.h} tone={toneOf(name)} size={l.text.node} opacity={intro}>
            <div style={{ textAlign: "center" }}>{LABELS[name]}</div>
          </Node>
        );
      })}

      <Tag x={l.tags.ask.x} y={l.tags.ask.y} tone="ink" size={l.text.tag} opacity={progress(frame, T.hops.ask[0], 10)}>
        채널 주인 번호
      </Tag>
      <Tag x={l.tags.token.x} y={l.tags.token.y} tone="accent" size={l.text.tag} opacity={progress(frame, T.hops.token[0], 10)}>
        채널 주인의 토큰
      </Tag>
      <Tag x={l.tags.privacy.x} y={l.tags.privacy.y} tone="accent" size={l.text.tag} opacity={progress(frame, T.privacy, 10)}>
        기본 비공개
      </Tag>
    </AbsoluteFill>
  );
};
