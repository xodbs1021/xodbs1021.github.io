// 콘티: _workspace/blog/nvenc-gpu-transcoding/storyboard.md 「영상 1」
// 같은 디코딩 → 스케일 → 인코딩 경로를 두 번 보여 준다. 앞 절반은 -hwaccel_output_format cuda 를 준 경우로,
// 프레임(점)이 GPU 안의 NVDEC → GPU 메모리 → scale_cuda → NVENC 만 지난다. 뒤 절반은 그 옵션이 없는 경우로,
// 디코딩한 프레임이 시스템 메모리로 내려갔다가(CPU 스케일) 다시 GPU 로 올라가 NVENC 에 들어간다.
// 개념도 — 시간 · 대역폭 수치는 없다. 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(GpuMemoryPathMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Label, Tag } from "../../components/Timeline";
import { progress, visibleBetween } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const GPU_MEMORY_PATH_FRAMES = 330;

/** 두 갈래의 시작 · 끝 프레임. 각 갈래 안에서 점이 경로를 한 번 지나고 1초 이상 멈춘다. */
const PHASE = [
  { from: 0, travel: [24, 110], to: 160 },
  { from: 165, travel: [190, 290], to: 330 },
] as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Pt = readonly [number, number];

type Layout = {
  readonly gpu: Box;
  readonly sys: Box;
  readonly nodes: { readonly nvdec: Box; readonly mem: Box; readonly scale: Box; readonly nvenc: Box };
  readonly gpuLabel: Pt;
  readonly sysLabel: Pt;
  readonly tag: Pt;
  readonly note: Pt;
  readonly text: { readonly node: number; readonly label: number; readonly tag: number; readonly code: number };
  readonly fast: readonly Pt[];
  readonly slow: readonly Pt[];
  readonly copy: { readonly down: Pt; readonly up: Pt };
  readonly words: { readonly fastNote: string; readonly slowNote: string };
};

const mid = (b: Box): Pt => [b.x + b.w / 2, b.y + b.h / 2];

const DESKTOP_NODES = {
  nvdec: { x: 170, y: 300, w: 300, h: 130 },
  mem: { x: 590, y: 300, w: 320, h: 130 },
  scale: { x: 1030, y: 300, w: 320, h: 130 },
  nvenc: { x: 1470, y: 300, w: 300, h: 130 },
} as const;

const DESKTOP: Layout = {
  gpu: { x: 110, y: 200, w: 1720, h: 330 },
  sys: { x: 590, y: 700, w: 760, h: 190 },
  nodes: DESKTOP_NODES,
  gpuLabel: [140, 214],
  sysLabel: [620, 716],
  tag: [110, 80],
  note: [110, 950],
  text: { node: TEXT.label, label: TEXT.small, tag: TEXT.small, code: TEXT.small },
  fast: [mid(DESKTOP_NODES.nvdec), mid(DESKTOP_NODES.mem), mid(DESKTOP_NODES.scale), mid(DESKTOP_NODES.nvenc), [1800, 365]],
  slow: [mid(DESKTOP_NODES.nvdec), [320, 830], [970, 830], [1620, 830], mid(DESKTOP_NODES.nvenc), [1800, 365]],
  copy: { down: [340, 590], up: [1640, 590] },
  words: { fastNote: "프레임이 GPU 메모리 안에서만 이동", slowNote: "프레임마다 GPU ↔ 시스템 메모리 복사" },
};

const MOBILE_NODES = {
  nvdec: { x: 90, y: 250, w: 440, h: 130 },
  mem: { x: 90, y: 460, w: 440, h: 130 },
  scale: { x: 90, y: 670, w: 440, h: 130 },
  nvenc: { x: 90, y: 880, w: 440, h: 130 },
} as const;

const MOBILE: Layout = {
  gpu: { x: 50, y: 170, w: 520, h: 880 },
  sys: { x: 640, y: 470, w: 400, h: 330 },
  nodes: MOBILE_NODES,
  gpuLabel: [74, 180],
  sysLabel: [664, 486],
  tag: [50, 60],
  note: [50, 1130],
  text: { node: MOBILE_TEXT.label, label: MOBILE_TEXT.small, tag: MOBILE_TEXT.small, code: MOBILE_TEXT.small },
  fast: [mid(MOBILE_NODES.nvdec), mid(MOBILE_NODES.mem), mid(MOBILE_NODES.scale), mid(MOBILE_NODES.nvenc), [310, 1036]],
  slow: [mid(MOBILE_NODES.nvdec), [990, 315], [990, 700], [990, 945], mid(MOBILE_NODES.nvenc), [310, 1036]],
  copy: { down: [600, 360], up: [800, 840] },
  words: { fastNote: "GPU 메모리 안에서만 이동", slowNote: "프레임마다 메모리 복사" },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 꺾은선 위의 위치(t: 0–1). */
const along = (pts: readonly Pt[], t: number): Pt => {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const r = seg[i] === 0 ? 0 : Math.min(1, d / seg[i]);
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r];
    }
    d -= seg[i];
  }
  return pts[pts.length - 1];
};

const Region: React.FC<{ readonly box: Box; readonly color: string; readonly fill: string; readonly dashed?: boolean }> = ({ box, color, fill, dashed = false }) => (
  <div
    style={{
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.w,
      height: box.h,
      borderRadius: 24,
      boxSizing: "border-box",
      border: `4px ${dashed ? "dashed" : "solid"} ${color}`,
      background: fill,
    }}
  />
);

export const GpuMemoryPath: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const slowPhase = frame >= PHASE[1].from;
  const p = slowPhase ? PHASE[1] : PHASE[0];
  const show = visibleBetween(frame, p.from, p.to, 10);
  const t = progress(frame, p.travel[0], p.travel[1] - p.travel[0], (x) => x);
  const pts = slowPhase ? l.slow : l.fast;
  const [dx, dy] = along(pts, t);
  const line = slowPhase ? COLOR.danger : COLOR.accent;
  const path = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const arrived = progress(frame, p.travel[1], 12);
  const n = l.nodes;
  const active = slowPhase ? "danger" : "accent";
  const skipped = slowPhase ? "muted" : "accent";
  const sysColor = slowPhase ? COLOR.danger : COLOR.muted;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Region box={l.gpu} color={COLOR.ink} fill={COLOR.surface} />
      <Label x={l.gpuLabel[0]} y={l.gpuLabel[1]} size={l.text.label} weight={760}>
        GPU
      </Label>
      <Region box={l.sys} color={sysColor} fill={slowPhase ? COLOR.dangerSoft : COLOR.white} dashed={!slowPhase} />
      <Label x={l.sysLabel[0]} y={l.sysLabel[1]} size={l.text.label} weight={760} color={sysColor}>
        시스템 메모리
      </Label>
      <Label x={l.sysLabel[0]} y={l.sysLabel[1] + l.text.label * 1.35} size={l.text.label} weight={650} color={sysColor}>
        CPU 스케일
      </Label>

      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
        <polyline
          points={path}
          fill="none"
          stroke={line}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={slowPhase ? "18 14" : undefined}
          opacity={show * 0.85}
        />
      </svg>

      <Node x={n.nvdec.x} y={n.nvdec.y} width={n.nvdec.w} height={n.nvdec.h} size={l.text.node} tone={active}>NVDEC</Node>
      <Node x={n.mem.x} y={n.mem.y} width={n.mem.w} height={n.mem.h} size={l.text.node} tone={skipped}>GPU 메모리</Node>
      <Node x={n.scale.x} y={n.scale.y} width={n.scale.w} height={n.scale.h} size={l.text.node} tone={skipped}>scale_cuda</Node>
      <Node x={n.nvenc.x} y={n.nvenc.y} width={n.nvenc.w} height={n.nvenc.h} size={l.text.node} tone={active}>NVENC</Node>


      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
          <circle cx={dx} cy={dy} r={26} fill={line} stroke={COLOR.white} strokeWidth={6} opacity={show} />
      </svg>

      {slowPhase ? (
        <>
          <Tag x={l.copy.down[0]} y={l.copy.down[1]} tone="danger" size={l.text.tag} opacity={show * progress(frame, PHASE[1].travel[0] + 10, 10)}>
            GPU → CPU
          </Tag>
          <Tag x={l.copy.up[0]} y={l.copy.up[1]} tone="danger" size={l.text.tag} opacity={show * progress(frame, PHASE[1].travel[0] + 60, 10)} anchor="center">
            CPU → GPU
          </Tag>
        </>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: l.tag[0],
          top: l.tag[1],
          fontFamily: MONO,
          fontSize: l.text.code,
          fontWeight: 700,
          color: line,
          opacity: show,
          whiteSpace: "nowrap",
        }}
      >
        {slowPhase ? "-hwaccel_output_format 없음" : "-hwaccel_output_format cuda"}
      </div>
      <Label x={l.note[0]} y={l.note[1]} size={l.text.label} weight={700} color={line} opacity={show * arrived}>
        {slowPhase ? l.words.slowNote : l.words.fastNote}
      </Label>
    </AbsoluteFill>
  );
};
