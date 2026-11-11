// 콘티: _workspace/blog/pokeclip-cdn-cache-auth-measurement/storyboard.md 「영상 1」
// 10월 5일 실험 구성. 캐시 키에서 세션을 뺀 엣지가 Miss 를 원본으로 넘길 때 세션까지 빼면 401,
// 원본 요청 정책으로 세션을 넘기면 200 → 엣지에 조각 하나가 남고 B · C 는 Hit.
// 서명 쿠키 없는 D 는 캐시에 조각이 있어도 엣지에서 403. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Box, Dot, Lines, shown, travel } from "../../components/Stations";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const CACHE_KEY_VS_ORIGIN_FORWARD_FRAMES = 360;

const T = {
  a1: 20,
  a1Edge: 48,
  fwd1: 52,
  fwd1End: 80,
  back1End: 104,
  fix: 112,
  a2: 124,
  a2Edge: 148,
  fwd2End: 174,
  back2End: 198,
  bc: 210,
  bcEdge: 234,
  bcBack: 256,
  d: 266,
  dEdge: 290,
} as const;

type P = { readonly x: number; readonly y: number };
type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly viewers: readonly (P & { readonly join: P })[];
  readonly viewer: { readonly w: number; readonly h: number };
  readonly edge: P & { readonly w: number; readonly h: number };
  readonly edgeLabel: P;
  readonly slot: P & { readonly w: number; readonly h: number };
  readonly keyNote: P;
  readonly origin: P & { readonly w: number; readonly h: number };
  readonly fwd: readonly [P, P];
  readonly edgeTag: P;
  readonly originTag: P;
  readonly sendTag: P;
  readonly failTag: P;
  readonly lineTagAnchor: "left" | "center";
  readonly denyTag: P;
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "캐시 키에서 빼도 원본에는 넘긴다" }],
  titleX: 120,
  viewer: { w: 130, h: 100 },
  viewers: [
    { x: 220, y: 300, join: { x: 680, y: 380 } },
    { x: 220, y: 450, join: { x: 680, y: 470 } },
    { x: 220, y: 600, join: { x: 680, y: 580 } },
    { x: 220, y: 800, join: { x: 680, y: 680 } },
  ],
  edge: { x: 900, y: 520, w: 440, h: 380 },
  edgeLabel: { x: 900, y: 352 },
  slot: { x: 900, y: 500, w: 280, h: 90 },
  keyNote: { x: 900, y: 576 },
  origin: { x: 1620, y: 520, w: 340, h: 200 },
  fwd: [
    { x: 1120, y: 520 },
    { x: 1450, y: 520 },
  ],
  edgeTag: { x: 900, y: 262 },
  originTag: { x: 1620, y: 650 },
  sendTag: { x: 1285, y: 420 },
  failTag: { x: 1285, y: 560 },
  lineTagAnchor: "center",
  denyTag: { x: 460, y: 860 },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "캐시 키에서 빼도" },
    { y: 124, text: "원본에는 넘긴다" },
  ],
  titleX: 60,
  viewer: { w: 130, h: 100 },
  viewers: [
    { x: 170, y: 300, join: { x: 220, y: 540 } },
    { x: 410, y: 300, join: { x: 420, y: 540 } },
    { x: 650, y: 300, join: { x: 640, y: 540 } },
    { x: 900, y: 300, join: { x: 860, y: 540 } },
  ],
  edge: { x: 540, y: 720, w: 760, h: 360 },
  edgeLabel: { x: 540, y: 566 },
  slot: { x: 540, y: 750, w: 380, h: 96 },
  keyNote: { x: 540, y: 818 },
  origin: { x: 540, y: 1180, w: 440, h: 150 },
  fwd: [
    { x: 540, y: 900 },
    { x: 540, y: 1105 },
  ],
  edgeTag: { x: 540, y: 466 },
  originTag: { x: 880, y: 1150 },
  sendTag: { x: 580, y: 965 },
  failTag: { x: 110, y: 965 },
  lineTagAnchor: "left",
  denyTag: { x: 860, y: 160 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };
const NAMES = ["A", "B", "C", "D"] as const;

export const CacheKeyVsOriginForward: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const size = l.text.tag;
  const intro = progress(frame, 0, 15);
  const [A, B, C, D] = l.viewers;
  const at = (v: P) => ({ x: v.x, y: v.y });

  const a1 = travel(frame, T.a1, T.a1Edge, at(A), A.join);
  const f1 = frame < T.fwd1End ? travel(frame, T.fwd1, T.fwd1End, l.fwd[0], l.fwd[1]) : travel(frame, T.fwd1End + 2, T.back1End, l.fwd[1], l.fwd[0]);
  const a2 = travel(frame, T.a2, T.a2Edge, at(A), A.join);
  const f2 = frame < T.fwd2End ? travel(frame, T.a2Edge + 2, T.fwd2End, l.fwd[0], l.fwd[1]) : travel(frame, T.fwd2End + 2, T.back2End, l.fwd[1], l.fwd[0]);
  const b = frame < T.bcEdge ? travel(frame, T.bc, T.bcEdge, at(B), B.join) : travel(frame, T.bcEdge + 2, T.bcBack, B.join, at(B));
  const c = frame < T.bcEdge ? travel(frame, T.bc + 4, T.bcEdge, at(C), C.join) : travel(frame, T.bcEdge + 4, T.bcBack, C.join, at(C));
  const d = travel(frame, T.d, T.dEdge, at(D), D.join);

  const fail = frame >= T.fwd1End && frame < T.back1End + 4;
  const stored = shown(frame, T.back2End);
  const denied = shown(frame, T.dEdge);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <div style={{ opacity: intro }}>
        <Lines
          lines={[
            ...l.viewers.map((v) => ({ x1: v.x, y1: v.y, x2: v.join.x, y2: v.join.y, width: 6 })),
            { x1: l.fwd[0].x, y1: l.fwd[0].y, x2: l.fwd[1].x, y2: l.fwd[1].y },
          ]}
        />
        {l.viewers.map((v, i) => (
          <Box key={NAMES[i]} x={v.x} y={v.y} w={l.viewer.w} h={l.viewer.h} label={NAMES[i]} size={l.text.label} tone={i === 3 && denied > 0.5 ? "danger" : "ink"} dashed={i === 3} />
        ))}
        <Box {...l.edge} label="" size={l.text.label} tone="ink" />
        <Label x={l.edgeLabel.x} y={l.edgeLabel.y} size={l.text.label} weight={760} anchor="center">
          엣지 캐시
        </Label>
        <Box {...l.slot} label={stored > 0.5 ? "조각 하나" : "비어 있음"} size={size} tone={stored > 0.5 ? "accent" : "muted"} dashed={stored <= 0.5} />
        <Label x={l.keyNote.x} y={l.keyNote.y} size={size} color={COLOR.muted} anchor="center">
          키: URI만 · 쿠키 없음
        </Label>
        <Box {...l.origin} label="원본" size={l.text.label} tone="ink" />
      </div>

      {/* 점: A 의 첫 요청과 401, 고친 뒤 200, B · C 의 Hit, 서명 없는 D. */}
      <Dot x={a1.x} y={a1.y} color={COLOR.ink} opacity={shown(frame, T.a1, T.a1Edge + 4, 4)} />
      <Dot x={f1.x} y={f1.y} color={fail ? COLOR.danger : COLOR.ink} opacity={shown(frame, T.fwd1, T.back1End + 4, 4)} />
      <Dot x={a2.x} y={a2.y} color={COLOR.ink} opacity={shown(frame, T.a2, T.a2Edge + 4, 4)} />
      <Dot x={f2.x} y={f2.y} color={frame >= T.fwd2End ? COLOR.accent : COLOR.ink} opacity={shown(frame, T.a2Edge, T.back2End + 4, 4)} />
      <Dot x={b.x} y={b.y} color={frame >= T.bcEdge ? COLOR.accent : COLOR.ink} opacity={shown(frame, T.bc, T.bcBack + 4, 4)} />
      <Dot x={c.x} y={c.y} color={frame >= T.bcEdge ? COLOR.accent : COLOR.ink} opacity={shown(frame, T.bc + 4, T.bcBack + 4, 4)} />
      <Dot x={d.x} y={d.y} color={denied > 0.5 ? COLOR.danger : COLOR.ink} opacity={shown(frame, T.d, T.dEdge + 24, 8)} />

      <Tag x={l.edgeTag.x} y={l.edgeTag.y} tone="muted" size={size} anchor="center" opacity={shown(frame, T.a1Edge, T.bcEdge)}>
        Miss
      </Tag>
      <Tag x={l.edgeTag.x} y={l.edgeTag.y} tone="accent" size={size} anchor="center" opacity={shown(frame, T.bcEdge)}>
        Hit
      </Tag>
      <Tag x={l.failTag.x} y={l.failTag.y} tone="danger" size={size} anchor={l.lineTagAnchor} opacity={shown(frame, T.fwd1End)}>
        세션도 빼면 401
      </Tag>
      <Tag x={l.sendTag.x} y={l.sendTag.y} tone="accent" size={size} anchor={l.lineTagAnchor} opacity={shown(frame, T.fix)}>
        원본에 세션 전달
      </Tag>
      <Tag x={l.originTag.x} y={l.originTag.y} tone="danger" size={size} anchor="center" opacity={shown(frame, T.fwd1End, T.fix)}>
        401
      </Tag>
      <Tag x={l.originTag.x} y={l.originTag.y} tone="accent" size={size} anchor="center" opacity={shown(frame, T.fwd2End)}>
        200
      </Tag>
      <Tag x={l.denyTag.x} y={l.denyTag.y} tone="danger" size={size} anchor="center" opacity={denied}>
        서명 없음 403
      </Tag>
    </AbsoluteFill>
  );
};
