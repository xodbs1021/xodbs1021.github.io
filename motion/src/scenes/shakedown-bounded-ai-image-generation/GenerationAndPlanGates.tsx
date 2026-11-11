// 콘티: _workspace/blog/shakedown-bounded-ai-image-generation/storyboard.md
// 2026-10-09 실제 호출 두 건. 왼쪽: Dockerfile 없는 Flask 저장소가 기존 Dockerfile → 규칙 → Claude 1회 → 검사 →
// 별도 사본 빌드로 내려가 HTTP 200. 오른쪽: 150 RPS 계획의 최소 등급 large 에서 small 선택은 400 에서 멈추고
// large 선택만 200 으로 저장된다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, type NodeTone } from "../../components/Flow";
import { HopLine, type Point } from "../../components/Hops";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const GENERATION_AND_PLAN_GATES_FRAMES = 360;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Name = "existing" | "rules" | "claude" | "check" | "build" | "need" | "floor" | "pickSmall" | "pickLarge" | "rejected" | "saved";
type Spot = { readonly x: number; readonly y: number };
type TagName = "none" | "outside" | "time" | "pass" | "http";

type Layout = {
  readonly boxes: Record<Name, Box>;
  readonly labels: Record<Name, string>;
  readonly tags: Record<TagName, Spot>;
  readonly titles: { readonly left: Spot; readonly right: Spot };
  readonly text: { readonly node: number; readonly tag: number; readonly title: number };
  readonly radius: number;
};

const T = {
  intro: 0,
  existing: 18,
  rules: 48,
  claude: 80,
  check: 118,
  build: 148,
  floor: 186,
  small: 222,
  rejected: 246,
  large: 282,
  saved: 306,
} as const;
const HOP = 20;

const bottom = (b: Box): Point => [b.x + b.w / 2, b.y + b.h];
const top = (b: Box): Point => [b.x + b.w / 2, b.y];

const DESKTOP_LABELS: Record<Name, string> = {
  existing: "기존 Dockerfile",
  rules: "지원 스택 규칙",
  claude: "Claude 1회",
  check: "형식 · 금지 요소 검사",
  build: "별도 사본에서 빌드",
  need: "150 RPS · 높은 가용성\n급증 가능",
  floor: "최소 등급 large",
  pickSmall: "small 선택",
  pickLarge: "large 선택",
  rejected: "HTTP 400",
  saved: "200 · 저장",
};

const LX = 100;
const LW = 640;
const LH = 118;
const ly = (i: number) => 150 + i * 168;
const RX = 1100;
const RW = 720;
const HALF = 340;

const DB: Record<Name, Box> = {
  existing: { x: LX, y: ly(0), w: LW, h: LH },
  rules: { x: LX, y: ly(1), w: LW, h: LH },
  claude: { x: LX, y: ly(2), w: LW, h: LH },
  check: { x: LX, y: ly(3), w: LW, h: LH },
  build: { x: LX, y: ly(4), w: LW, h: LH },
  need: { x: RX, y: 150, w: RW, h: 150 },
  floor: { x: RX, y: 370, w: RW, h: LH },
  pickSmall: { x: RX, y: 600, w: HALF, h: LH },
  pickLarge: { x: RX + RW - HALF, y: 600, w: HALF, h: LH },
  rejected: { x: RX, y: 822, w: HALF, h: LH },
  saved: { x: RX + RW - HALF, y: 822, w: HALF, h: LH },
};

const DESKTOP: Layout = {
  boxes: DB,
  labels: DESKTOP_LABELS,
  tags: {
    none: { x: LX + LW + 24, y: ly(0) + 34 },
    outside: { x: LX + LW + 24, y: ly(1) + 34 },
    time: { x: LX + LW + 24, y: ly(2) + 34 },
    pass: { x: LX + LW + 24, y: ly(3) + 34 },
    http: { x: LX + LW + 24, y: ly(4) + 34 },
  },
  titles: { left: { x: LX, y: 62 }, right: { x: RX, y: 62 } },
  text: { node: TEXT.label, tag: TEXT.small, title: TEXT.label },
  radius: 14,
};

// 휴대폰판(1080×1350): 왼쪽 열은 좁은 상자와 그 오른쪽 이름표, 오른쪽 열은 규모 선택.
const MLX = 30;
const MLW = 320;
const MLH = 150;
const mly = (i: number) => 150 + i * 220;
const MRX = 670;
const MRW = 380;
const MHALF = 180;

const MOBILE_LABELS: Record<Name, string> = {
  existing: "기존\nDockerfile",
  rules: "지원 스택\n규칙",
  claude: "Claude 1회",
  check: "형식 · 금지\n요소 검사",
  build: "별도 사본\n빌드",
  need: "150 RPS\n높은 가용성\n급증 가능",
  floor: "최소 등급\nlarge",
  pickSmall: "small",
  pickLarge: "large",
  rejected: "400",
  saved: "200",
};

const MB: Record<Name, Box> = {
  existing: { x: MLX, y: mly(0), w: MLW, h: MLH },
  rules: { x: MLX, y: mly(1), w: MLW, h: MLH },
  claude: { x: MLX, y: mly(2), w: MLW, h: MLH },
  check: { x: MLX, y: mly(3), w: MLW, h: MLH },
  build: { x: MLX, y: mly(4), w: MLW, h: MLH },
  need: { x: MRX, y: 150, w: MRW, h: 230 },
  floor: { x: MRX, y: 450, w: MRW, h: MLH },
  pickSmall: { x: MRX, y: 700, w: MHALF, h: 110 },
  pickLarge: { x: MRX + MRW - MHALF, y: 700, w: MHALF, h: 110 },
  rejected: { x: MRX, y: 900, w: MHALF, h: 110 },
  saved: { x: MRX + MRW - MHALF, y: 900, w: MHALF, h: 110 },
};

const MOBILE: Layout = {
  boxes: MB,
  labels: MOBILE_LABELS,
  tags: {
    none: { x: MLX + MLW + 16, y: mly(0) + 42 },
    outside: { x: MLX + MLW + 16, y: mly(1) + 42 },
    time: { x: MLX + MLW + 16, y: mly(2) + 42 },
    pass: { x: MLX + MLW + 16, y: mly(3) + 42 },
    http: { x: MLX + MLW + 16, y: mly(4) + 42 },
  },
  titles: { left: { x: MLX, y: 60 }, right: { x: MRX, y: 60 } },
  text: { node: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, title: MOBILE_TEXT.label },
  radius: 16,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
const LEFT: readonly Name[] = ["existing", "rules", "claude", "check", "build"];
const ALWAYS: readonly Name[] = [...LEFT, "need", "floor", "pickSmall", "pickLarge"];

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const GenerationAndPlanGates: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const b = l.boxes;
  const intro = progress(frame, T.intro, 14);
  // 점이 닿은 뒤의 색: 건너뛴 단계는 회색, 지나간 검사는 강조색, 거부된 선택은 위험색.
  const AFTER: Partial<Record<Name, readonly [number, NodeTone]>> = {
    existing: [T.existing, "muted"],
    rules: [T.rules, "muted"],
    claude: [T.claude, "accent"],
    check: [T.check, "accent"],
    build: [T.build, "accent"],
    floor: [T.floor, "accent"],
    pickSmall: [T.small, "danger"],
    pickLarge: [T.large, "accent"],
    rejected: [0, "danger"],
    saved: [0, "accent"],
  };
  const toneOf = (name: Name): NodeTone => {
    const after = AFTER[name];
    return after && frame >= after[0] ? after[1] : "ink";
  };

  // 건너기: 점이 앞 상자에서 다음 상자로 간다(시작 프레임 = 도착 프레임 - HOP).
  const hops: ReadonlyArray<{ readonly from: Name; readonly to: Name; readonly at: number; readonly color: string }> = [
    { from: "existing", to: "rules", at: T.rules, color: COLOR.ink },
    { from: "rules", to: "claude", at: T.claude, color: COLOR.ink },
    { from: "claude", to: "check", at: T.check, color: COLOR.accent },
    { from: "check", to: "build", at: T.build, color: COLOR.accent },
    { from: "need", to: "floor", at: T.floor, color: COLOR.ink },
    { from: "floor", to: "pickSmall", at: T.small, color: COLOR.ink },
    { from: "pickSmall", to: "rejected", at: T.rejected, color: COLOR.danger },
    { from: "floor", to: "pickLarge", at: T.large, color: COLOR.ink },
    { from: "pickLarge", to: "saved", at: T.saved, color: COLOR.accent },
  ];

  const tag = (name: TagName, at: number, tone: "ink" | "accent" | "muted" | "danger", text: string) => (
    <Tag x={l.tags[name].x} y={l.tags[name].y} tone={tone} size={l.text.tag} opacity={progress(frame, at, 10)}>
      {text}
    </Tag>
  );

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={l.titles.left.x} y={l.titles.left.y} size={l.text.title} color={COLOR.muted} opacity={intro}>
        이미지 생성
      </Label>
      <Label x={l.titles.right.x} y={l.titles.right.y} size={l.text.title} color={COLOR.muted} opacity={intro}>
        규모 선택
      </Label>

      {hops.map((h) => (
        <HopLine
          key={`${h.from}-${h.to}`}
          hop={{ points: [bottom(b[h.from]), top(b[h.to])], start: h.at - HOP, duration: HOP, color: h.color }}
          frame={frame}
          radius={l.radius}
        />
      ))}

      {ALWAYS.map((name) => (
        <Node key={name} x={b[name].x} y={b[name].y} width={b[name].w} height={b[name].h} tone={toneOf(name)} size={l.text.node} opacity={intro}>
          <div style={{ textAlign: "center" }}>{l.labels[name]}</div>
        </Node>
      ))}
      {(["rejected", "saved"] as const).map((name) => (
        <Node
          key={name}
          x={b[name].x}
          y={b[name].y}
          width={b[name].w}
          height={b[name].h}
          tone={toneOf(name)}
          size={l.text.node}
          opacity={progress(frame, name === "rejected" ? T.rejected : T.saved, 8)}
        >
          <div style={{ textAlign: "center" }}>{l.labels[name]}</div>
        </Node>
      ))}

      {tag("none", T.existing, "muted", "없음")}
      {tag("outside", T.rules, "muted", "규칙 밖")}
      {tag("time", T.claude, "accent", "3.679초")}
      {tag("pass", T.check, "accent", "통과")}
      {tag("http", T.build, "accent", "HTTP 200")}
    </AbsoluteFill>
  );
};
