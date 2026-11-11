// 콘티: _workspace/blog/shakedown-java-syntax-before-security-scan/storyboard.md
// 같은 깨진 Java 입력이 두 번 지나간다. 위 「수정 전」: 입력 → Semgrep 1.180.0 → 위험색 「ALLOW」(잘못된 통과).
// 아래 「수정 후」: 입력 → Tree-sitter 에서 멈추고 강조색 「SCAN_FAILED」, 뒤의 Semgrep 은 회색으로 남는다.
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, type NodeTone } from "../../components/Flow";
import { HopLine, type Point } from "../../components/Hops";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const BROKEN_JAVA_GATE_FRAMES = 360;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Name = "beforeInput" | "beforeSemgrep" | "afterInput" | "treeSitter" | "afterSemgrep";
type Spot = { readonly x: number; readonly y: number };

type Layout = {
  readonly boxes: Record<Name, Box>;
  readonly hops: { readonly before: readonly Point[]; readonly after: readonly Point[]; readonly skipped: readonly Point[] };
  readonly titles: { readonly before: Spot; readonly after: Spot };
  readonly tags: { readonly allow: Spot; readonly failed: Spot };
  readonly text: { readonly node: number; readonly code: number; readonly tag: number; readonly title: number };
  readonly radius: number;
};

const T = {
  intro: 0,
  beforeHop: [20, 28],
  allow: 56,
  afterHop: [150, 28],
  failed: 186,
} as const;

const right = (b: Box): Point => [b.x + b.w, b.y + b.h / 2];
const left = (b: Box): Point => [b.x, b.y + b.h / 2];
const top = (b: Box): Point => [b.x + b.w / 2, b.y];

const DB: Record<Name, Box> = {
  beforeInput: { x: 120, y: 180, w: 560, h: 150 },
  beforeSemgrep: { x: 820, y: 180, w: 460, h: 150 },
  afterInput: { x: 120, y: 620, w: 560, h: 150 },
  treeSitter: { x: 820, y: 620, w: 400, h: 150 },
  afterSemgrep: { x: 1360, y: 620, w: 400, h: 150 },
};

const DESKTOP: Layout = {
  boxes: DB,
  hops: {
    before: [right(DB.beforeInput), left(DB.beforeSemgrep)],
    after: [right(DB.afterInput), left(DB.treeSitter)],
    skipped: [right(DB.treeSitter), left(DB.afterSemgrep)],
  },
  titles: { before: { x: 120, y: 100 }, after: { x: 120, y: 540 } },
  tags: { allow: { x: 1330, y: 226 }, failed: { x: 820, y: 806 } },
  text: { node: TEXT.label, code: TEXT.small, tag: TEXT.label, title: TEXT.label },
  radius: 14,
};

// 휴대폰판(1080×1350): 줄마다 입력 상자 아래에 검사 상자를 둔다.
const MB: Record<Name, Box> = {
  beforeInput: { x: 40, y: 130, w: 1000, h: 150 },
  beforeSemgrep: { x: 40, y: 360, w: 480, h: 130 },
  afterInput: { x: 40, y: 700, w: 1000, h: 150 },
  treeSitter: { x: 40, y: 930, w: 480, h: 130 },
  afterSemgrep: { x: 560, y: 930, w: 480, h: 130 },
};

const MOBILE: Layout = {
  boxes: MB,
  hops: {
    before: [[MB.beforeSemgrep.x + MB.beforeSemgrep.w / 2, MB.beforeInput.y + MB.beforeInput.h], top(MB.beforeSemgrep)],
    after: [[MB.treeSitter.x + MB.treeSitter.w / 2, MB.afterInput.y + MB.afterInput.h], top(MB.treeSitter)],
    skipped: [right(MB.treeSitter), left(MB.afterSemgrep)],
  },
  titles: { before: { x: 40, y: 50 }, after: { x: 40, y: 620 } },
  tags: { allow: { x: 560, y: 390 }, failed: { x: 40, y: 1110 } },
  text: { node: MOBILE_TEXT.label, code: MOBILE_TEXT.small, tag: MOBILE_TEXT.label, title: MOBILE_TEXT.label },
  radius: 16,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const BrokenJavaGate: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const b = l.boxes;
  const intro = progress(frame, T.intro, 14);
  const beforeArrived = frame >= T.beforeHop[0] + T.beforeHop[1];
  const afterArrived = frame >= T.afterHop[0] + T.afterHop[1];

  const toneOf = (name: Name): NodeTone => {
    if (name === "beforeSemgrep") return beforeArrived ? "danger" : "ink";
    if (name === "treeSitter") return afterArrived ? "accent" : "ink";
    if (name === "afterSemgrep") return "muted";
    return "ink";
  };

  const code = (
    <div style={{ fontFamily: MONO, fontSize: l.text.code, fontWeight: 600, lineHeight: 1.35, textAlign: "left", whiteSpace: "pre" }}>
      {"class Broken {\n  void broken( {"}
    </div>
  );
  const labels: Record<Name, React.ReactNode> = {
    beforeInput: code,
    beforeSemgrep: <div style={{ textAlign: "center" }}>Semgrep 1.180.0</div>,
    afterInput: code,
    treeSitter: <div style={{ textAlign: "center" }}>Tree-sitter</div>,
    afterSemgrep: <div style={{ textAlign: "center" }}>Semgrep</div>,
  };

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={l.titles.before.x} y={l.titles.before.y} size={l.text.title} color={COLOR.muted} opacity={intro}>
        수정 전
      </Label>
      <Label x={l.titles.after.x} y={l.titles.after.y} size={l.text.title} color={COLOR.muted} opacity={intro}>
        수정 후
      </Label>

      <HopLine hop={{ points: l.hops.before, start: T.beforeHop[0], duration: T.beforeHop[1], color: COLOR.ink }} frame={frame} radius={l.radius} />
      <HopLine hop={{ points: l.hops.after, start: T.afterHop[0], duration: T.afterHop[1], color: COLOR.ink }} frame={frame} radius={l.radius} />
      {/* 수정 후에는 Tree-sitter 에서 멈추므로 Semgrep 으로 가는 선은 점선 회색으로만 둔다. */}
      <HopLine hop={{ points: l.hops.skipped, start: 0, duration: 1, color: COLOR.muted, dashed: true }} frame={frame} radius={l.radius} opacity={intro} />

      {(Object.keys(b) as Name[]).map((name) => (
        <Node key={name} x={b[name].x} y={b[name].y} width={b[name].w} height={b[name].h} tone={toneOf(name)} size={l.text.node} opacity={intro}>
          {labels[name]}
        </Node>
      ))}

      <Tag x={l.tags.allow.x} y={l.tags.allow.y} tone="danger" size={l.text.tag} opacity={progress(frame, T.allow, 10)}>
        ALLOW
      </Tag>
      <Tag x={l.tags.failed.x} y={l.tags.failed.y} tone="accent" size={l.text.tag} opacity={progress(frame, T.failed, 10)}>
        SCAN_FAILED
      </Tag>
    </AbsoluteFill>
  );
};
