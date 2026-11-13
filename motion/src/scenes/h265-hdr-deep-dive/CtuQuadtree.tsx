// 콘티: _workspace/blog/h265-hdr-deep-dive/storyboard.md 「영상 1」
// CTU(64×64) 두 개. 왼쪽은 평평한 면이라 쪼개지지 않고 64로 남는다. 오른쪽은 물체 가장자리(원호)가 지나가서,
// 가장자리가 걸친 블록만 4분 트리로 32 → 16 → 8까지 쪼개진다. 지금 쪼개는 단계의 선만 강조색, 앞 단계 선은 ink.
// 분할 규칙은 설명용(원호가 블록을 지나면 쪼갬)이며 실제 인코더의 율·왜곡 판단이 아니다. 개념도.
// 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(CtuQuadtreeMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const CTU_QUADTREE_FRAMES = 300;

/** 원호: CTU 좌표(0–64)에서 중심 (64, 64), 반지름 R. 블록이 원호에 걸치면 쪼갠다. */
const ARC = { cx: 66, cy: 66, r: 42 } as const;
/** 원호가 CTU 아래 변(y = 64)과 오른쪽 변(x = 64)을 지나는 자리. */
const EDGE_START = ARC.cx - Math.sqrt(ARC.r ** 2 - (64 - ARC.cy) ** 2);
const EDGE_END = ARC.cy - Math.sqrt(ARC.r ** 2 - (64 - ARC.cx) ** 2);
const LEVEL_START = { 32: 40, 16: 105, 8: 170 } as const;
const LEVEL_LEN = 40;

type Block = { readonly x: number; readonly y: number; readonly s: number };

const crosses = (b: Block): boolean => {
  const corners = [[b.x, b.y], [b.x + b.s, b.y], [b.x, b.y + b.s], [b.x + b.s, b.y + b.s]];
  const d = corners.map(([x, y]) => Math.hypot(x - ARC.cx, y - ARC.cy));
  const nx = Math.max(b.x, Math.min(ARC.cx, b.x + b.s));
  const ny = Math.max(b.y, Math.min(ARC.cy, b.y + b.s));
  const near = Math.hypot(nx - ARC.cx, ny - ARC.cy);
  return near < ARC.r && Math.max(...d) > ARC.r;
};

/** 쪼개지는 블록과 그 자식 크기. split 선은 자식 크기(32·16·8) 단계에 그려진다. */
const SPLITS: { readonly b: Block; readonly child: 32 | 16 | 8 }[] = [];
const walk = (b: Block): void => {
  if (b.s <= 8 || !crosses(b)) return;
  const h = b.s / 2;
  SPLITS.push({ b, child: h as 32 | 16 | 8 });
  for (const [dx, dy] of [[0, 0], [h, 0], [0, h], [h, h]]) walk({ x: b.x + dx, y: b.y + dy, s: h });
};
walk({ x: 0, y: 0, s: 64 });

type Layout = {
  readonly size: number;
  readonly left: { readonly x: number; readonly y: number };
  readonly right: { readonly x: number; readonly y: number };
  readonly text: { readonly label: number; readonly small: number };
  readonly titleGap: number;
  readonly names: readonly [string, string];
  readonly tagGap: number;
  readonly levelText: (c: number) => string;
};

const DESKTOP: Layout = {
  size: 600,
  left: { x: 250, y: 230 },
  right: { x: 1070, y: 230 },
  text: { label: TEXT.label, small: TEXT.small },
  titleGap: 92,
  names: ["평평한 면", "물체 가장자리"],
  tagGap: 40,
  levelText: (c) => `${c}×${c}`,
};

const MOBILE: Layout = {
  size: 470,
  left: { x: 40, y: 430 },
  right: { x: 570, y: 430 },
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
  titleGap: 96,
  names: ["평평한 면", "가장자리"],
  tagGap: 48,
  levelText: (c) => `${c}`,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const CtuQuadtree: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 16);
  const k = l.size / 64;
  const current = ([32, 16, 8] as const).find((c) => frame >= LEVEL_START[c] && frame < LEVEL_START[c] + LEVEL_LEN);
  const leftTag = progress(frame, LEVEL_START[8] + LEVEL_LEN + 6, 14);

  const square = (o: { x: number; y: number }, edge: boolean): React.ReactNode => (
    <svg style={{ position: "absolute", left: o.x, top: o.y, overflow: "visible" }} width={l.size} height={l.size}>
      <rect x={0} y={0} width={l.size} height={l.size} fill={COLOR.surface} />
      {edge ? (
        <path
          d={`M ${EDGE_START * k} ${l.size} A ${ARC.r * k} ${ARC.r * k} 0 0 1 ${l.size} ${EDGE_END * k} L ${l.size} ${l.size} Z`}
          fill={COLOR.muted}
          fillOpacity={0.35}
          stroke={COLOR.muted}
          strokeWidth={4}
        />
      ) : null}
      {edge
        ? SPLITS.map(({ b, child }, i) => {
            const draw = progress(frame, LEVEL_START[child] + 4, 22);
            if (draw <= 0) return null;
            const midX = (b.x + child) * k;
            const midY = (b.y + child) * k;
            const x0 = b.x * k;
            const y0 = b.y * k;
            const s = b.s * k;
            const active = current === child;
            const stroke = active ? COLOR.accent : COLOR.ink;
            const w = active ? 7 : child === 32 ? 6 : child === 16 ? 5 : 4;
            return (
              <g key={i} stroke={stroke} strokeWidth={w} strokeLinecap="square">
                <line x1={midX} y1={y0} x2={midX} y2={y0 + s * draw} />
                <line x1={x0} y1={midY} x2={x0 + s * draw} y2={midY} />
              </g>
            );
          })
        : null}
      <rect x={0} y={0} width={l.size} height={l.size} fill="none" stroke={COLOR.ink} strokeWidth={8} />
    </svg>
  );

  const levelTag = (c: 32 | 16 | 8, i: number): React.ReactNode => {
    const on = progress(frame, LEVEL_START[c], 10);
    const step = l.size / 3;
    return (
      <Tag
        key={c}
        x={l.right.x + step * i + step / 2}
        y={l.right.y + l.size + l.tagGap}
        tone={current === c ? "accent" : "ink"}
        size={l.text.small}
        anchor="center"
        opacity={on}
      >
        {l.levelText(c)}
      </Tag>
    );
  };

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={l.left.x} y={l.left.y - l.titleGap} size={l.text.label} weight={760} opacity={intro}>{l.names[0]}</Label>
      <Label x={l.right.x} y={l.right.y - l.titleGap} size={l.text.label} weight={760} opacity={intro}>{l.names[1]}</Label>
      <div style={{ opacity: intro }}>
        {square(l.left, false)}
        {square(l.right, true)}
      </div>
      <Tag
        x={l.left.x + l.size / 2}
        y={l.left.y + l.size + l.tagGap}
        tone={leftTag > 0.5 ? "accent" : "ink"}
        size={l.text.small}
        anchor="center"
        opacity={intro}
      >
        64×64 한 블록
      </Tag>
      {([32, 16, 8] as const).map((c, i) => levelTag(c, i))}
    </AbsoluteFill>
  );
};
