// 콘티: _workspace/blog/pokeclip-go-remux-same-io-benchmark/storyboard.md 「영상 1」
// FFmpeg 경로: 조각마다 프로세스가 떴다 사라지고, 산출 init 해시가 조각마다 다르며(9월 4일 실측 3조각의 앞자리),
// 파트 4개를 2개로 다시 자른다. Go 경로: 사이드카 안에 머물며 파트 4개를 그대로 두고 init 해시 하나
// (9월 19일 150조각의 앞자리). 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const REMUX_INIT_DRIFT_FRAMES = 340;

/** 장면 순서(프레임, 30fps). 조각 하나마다 70프레임. */
const T = {
  intro: 0,
  first: 26,
  cycle: 70,
  spawn: 10,
  output: 26,
  hash: 34,
  exit: 52,
  summary: 250,
} as const;
const FADE = 10;

const FFMPEG_HASHES = ["644df424…", "495e60f7…", "7e2c749c…"] as const;
const GO_HASH = "4fcd68e6…";

type Lane = {
  readonly labelY: number;
  readonly subY: number;
  readonly y: number;
  readonly hashY: number;
  readonly summaryY: number;
  readonly partsY: number;
};

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly labelX: number;
  readonly subX: number;
  readonly inX: number;
  readonly procX: number;
  readonly outX: number;
  readonly boxW: number;
  readonly boxH: number;
  readonly hashX: number;
  readonly hashStep: number;
  readonly summaryX: number;
  readonly partsX: number;
  readonly ff: Lane;
  readonly go: Lane;
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
  readonly copy: {
    readonly ff: string;
    readonly ffSub: string;
    readonly go: string;
    readonly goSub: string;
    readonly ffBox: string;
    readonly goBox: string;
    readonly ffSummary: string;
    readonly goSummary: string;
    readonly ffParts: string;
    readonly goParts: string;
    readonly seg: string;
  };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "조각이 들어올 때마다 init 해시는?" }],
  labelX: 120,
  subX: 120,
  inX: 500,
  procX: 790,
  outX: 1080,
  boxW: 220,
  boxH: 96,
  hashX: 1380,
  hashStep: 54,
  summaryX: 1380,
  partsX: 1080,
  ff: { labelY: 178, subY: 234, y: 170, hashY: 150, summaryY: 330, partsY: 290 },
  go: { labelY: 548, subY: 604, y: 540, hashY: 520, summaryY: 700, partsY: 660 },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
  copy: {
    ff: "FFmpeg",
    ffSub: "조각마다 실행",
    go: "Go 재포장",
    goSub: "사이드카 안 상주",
    ffBox: "ffmpeg",
    goBox: "Go",
    ffSummary: "init 해시 3개",
    goSummary: "init 해시 1개",
    ffParts: "파트 4 → 2",
    goParts: "파트 4 → 4",
    seg: "조각",
  },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "조각이 들어올 때마다" },
    { y: 124, text: "init 해시는?" },
  ],
  labelX: 60,
  subX: 330,
  inX: 60,
  procX: 340,
  outX: 620,
  boxW: 220,
  boxH: 96,
  hashX: 60,
  hashStep: 62,
  summaryX: 620,
  partsX: 620,
  ff: { labelY: 216, subY: 216, y: 290, hashY: 412, summaryY: 412, partsY: 500 },
  go: { labelY: 676, subY: 676, y: 750, hashY: 872, summaryY: 872, partsY: 960 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  copy: {
    ff: "FFmpeg",
    ffSub: "조각마다 실행",
    go: "Go",
    goSub: "사이드카 안 상주",
    ffBox: "ffmpeg",
    goBox: "Go",
    ffSummary: "해시 3개",
    goSummary: "해시 1개",
    ffParts: "파트 4→2",
    goParts: "파트 4→4",
    seg: "조각",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type BoxProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly tone: "ink" | "accent" | "danger" | "muted";
  readonly opacity?: number;
  readonly scale?: number;
  readonly dashed?: boolean;
  readonly children?: React.ReactNode;
  readonly size: number;
};

const BOX_TONE = {
  ink: { background: COLOR.white, border: COLOR.ink, color: COLOR.ink },
  accent: { background: COLOR.accentSoft, border: COLOR.accent, color: COLOR.accent },
  danger: { background: COLOR.dangerSoft, border: COLOR.danger, color: COLOR.danger },
  muted: { background: COLOR.surface, border: COLOR.muted, color: COLOR.muted },
} as const;

const Box: React.FC<BoxProps> = ({ x, y, w, h, tone, opacity = 1, scale = 1, dashed = false, children, size }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 14,
      background: BOX_TONE[tone].background,
      border: `4px ${dashed ? "dashed" : "solid"} ${BOX_TONE[tone].border}`,
      color: BOX_TONE[tone].color,
      boxSizing: "border-box",
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 720,
      opacity,
      transform: `scale(${scale})`,
    }}
  >
    {children}
  </div>
);

/** 조각 안 파트(moof) 칸 n개. */
const Parts: React.FC<{ x: number; y: number; w: number; h: number; n: number; color: string; opacity: number }> = ({
  x, y, w, h, n, color, opacity,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, display: "flex", gap: 8, padding: 12, boxSizing: "border-box", opacity }}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} style={{ flex: 1, borderRadius: 6, background: color }} />
    ))}
  </div>
);

export const RemuxInitDrift: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;

  const intro = progress(frame, T.intro, 15);
  const summary = progress(frame, T.summary, FADE);

  // 지금 처리 중인 조각 번호(0–2)와 그 주기 안의 프레임.
  const index = Math.max(0, Math.min(2, Math.floor((frame - T.first) / T.cycle)));
  const local = frame - T.first - index * T.cycle;
  const started = frame >= T.first;
  const segIn = started ? progress(local, 0, FADE) : 0;
  const spawn = started ? progress(local, T.spawn, FADE) * (1 - progress(local, T.exit, FADE)) : 0;
  const output = started ? progress(local, T.output, FADE) : 0;

  const hashesShown = (lane: "ff" | "go") =>
    Array.from({ length: 3 }, (_, i) => {
      const at = T.first + i * T.cycle + T.hash;
      const p = progress(frame, at, FADE);
      const text = lane === "ff" ? FFMPEG_HASHES[i] : GO_HASH;
      const y = (lane === "ff" ? l.ff.hashY : l.go.hashY) + i * l.hashStep;
      return (
        <Label key={`${lane}-${i}`} x={l.hashX} y={y} size={l.text.tag} weight={720} color={lane === "ff" ? COLOR.danger : COLOR.accent} opacity={p}>
          {`${i + 1}  ${text}`}
        </Label>
      );
    });

  const lanes = [
    { key: "ff", lane: l.ff, label: c.ff, sub: c.ffSub },
    { key: "go", lane: l.go, label: c.go, sub: c.goSub },
  ] as const;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.labelX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {lanes.map(({ key, lane, label, sub }) => (
        <div key={key}>
          <Label x={l.labelX} y={lane.labelY} size={l.text.label} weight={760} opacity={intro}>
            {label}
          </Label>
          <Label x={l.subX} y={lane.subY} size={l.text.tag} color={COLOR.muted} weight={650} opacity={intro}>
            {sub}
          </Label>
          {/* 들어오는 녹화 조각: 파트 4개. */}
          <Box x={l.inX} y={lane.y} w={l.boxW} h={l.boxH} tone="muted" opacity={segIn} size={l.text.tag} />
          <Parts x={l.inX} y={lane.y} w={l.boxW} h={l.boxH} n={4} color={COLOR.muted} opacity={segIn * 0.55} />
        </div>
      ))}

      {/* FFmpeg: 조각마다 프로세스가 떴다 사라진다(자리는 점선으로 남긴다). */}
      <Box x={l.procX} y={l.ff.y} w={l.boxW} h={l.boxH} tone="muted" dashed opacity={intro * 0.8} size={l.text.tag}>
        {c.ffBox}
      </Box>
      <Box x={l.procX} y={l.ff.y} w={l.boxW} h={l.boxH} tone="ink" opacity={spawn} scale={0.9 + 0.1 * spawn} size={l.text.tag}>
        {c.ffBox}
      </Box>
      {/* Go: 처음부터 끝까지 상주한다. */}
      <Box x={l.procX} y={l.go.y} w={l.boxW} h={l.boxH} tone="accent" opacity={intro} size={l.text.tag}>
        {c.goBox}
      </Box>

      {/* 산출 조각: FFmpeg 은 파트 2개, Go 는 4개. */}
      <Box x={l.outX} y={l.ff.y} w={l.boxW} h={l.boxH} tone="danger" opacity={output} size={l.text.tag} />
      <Parts x={l.outX} y={l.ff.y} w={l.boxW} h={l.boxH} n={2} color={COLOR.danger} opacity={output * 0.6} />
      <Box x={l.outX} y={l.go.y} w={l.boxW} h={l.boxH} tone="accent" opacity={output} size={l.text.tag} />
      <Parts x={l.outX} y={l.go.y} w={l.boxW} h={l.boxH} n={4} color={COLOR.accent} opacity={output * 0.6} />

      <Label x={l.partsX} y={l.ff.partsY} size={l.text.tag} color={COLOR.danger} weight={720} opacity={output}>
        {c.ffParts}
      </Label>
      <Label x={l.partsX} y={l.go.partsY} size={l.text.tag} color={COLOR.accent} weight={720} opacity={output}>
        {c.goParts}
      </Label>

      {/* init 해시: 조각마다 한 줄씩 쌓인다. */}
      {hashesShown("ff")}
      {hashesShown("go")}

      <Tag x={l.summaryX} y={l.ff.summaryY} tone="danger" size={l.text.tag} opacity={summary}>
        {c.ffSummary}
      </Tag>
      <Tag x={l.summaryX} y={l.go.summaryY} tone="accent" size={l.text.tag} opacity={summary}>
        {c.goSummary}
      </Tag>
    </AbsoluteFill>
  );
};
