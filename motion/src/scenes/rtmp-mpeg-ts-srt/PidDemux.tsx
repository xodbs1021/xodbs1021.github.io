// 콘티: _workspace/blog/rtmp-mpeg-ts-srt/storyboard.md 「영상 1」
// MPEG-TS 는 영상 하나 · 오디오 여섯을 188바이트 패킷 한 줄에 섞어 보내고, 받는 쪽은 패킷 머리의 PID 만 보고 트랙별로 다시 나눈다.
// PID 는 실측값(FFmpeg 9.0.2 기본값으로 만든 TS): 영상 0x100, 오디오 0x101–0x106. 맨 앞에 PAT · PMT 칸이 지나가 표 상자로 들어간다.
// 실측에서 영상 패킷이 대부분이라(3,354 중 2,128) 장면도 영상 칸을 가장 많이 둔다(비율은 맞추지 않음). 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(PidDemuxMobile) — 같은 움직임을 세로로 재배치하고 이름표를 줄인다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, EASE_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const PID_DEMUX_FRAMES = 330;

type Pt = readonly [number, number];
type Tone = "ink" | "muted" | "accent";

/** 트랙 0 = 영상 0x100, 1–6 = 오디오 0x101–0x106. 오디오6 만 강조. */
const TRACK_TONE: readonly Tone[] = ["ink", "muted", "muted", "muted", "muted", "muted", "accent"];
const pidTail = (track: number): string => `10${track}`;

/** 관에 들어가는 데이터 칸 순서 — 영상 몇 개 뒤에 오디오 몇 개가 끼는 식(영상 12, 오디오 트랙마다 2). */
const ORDER: readonly number[] = [0, 0, 0, 1, 2, 0, 0, 0, 3, 4, 5, 6, 0, 0, 0, 1, 2, 3, 0, 0, 0, 4, 5, 6];

// 시간(프레임). 데이터 칸 하나: 이름표 → 관 입구(A) → 관 통과(B) → 출구에서 제 줄로(C).
const A_DUR = 12;
const B_DUR = 32;
const C_DUR = 20;
const TABLE_T0 = { PAT: 14, PMT: 24 } as const;
const DATA_T0 = 50;
const DATA_GAP = 6.4;
const INTRO = 12;
/** PMT 가 표 상자에 닿는 프레임 — 이때 상자와 7줄이 나타난다. */
const PMT_LANDED = TABLE_T0.PMT + B_DUR + C_DUR;
/** 마지막 칸이 줄에 닿은 뒤 「0x106만 꺼냄」 이 나타난다(끝 상태 완성 ≈ 264, 이후 유지). */
const ALL_LANDED = DATA_T0 + (ORDER.length - 1) * DATA_GAP + B_DUR + C_DUR;
const TAKE_AT = Math.ceil(ALL_LANDED) + 2;

const linear = (t: number): number => t;
const last = (pts: readonly Pt[]): Pt => pts[pts.length - 1];

type Source = { readonly text: string; readonly tone: Tone; readonly x: number; readonly y: number };
type Anchor = "left" | "center" | "right";

type Layout = {
  readonly text: {
    readonly tag: number;
    readonly pipe: number;
    readonly note: number;
    readonly cell: number;
    readonly box: number;
    readonly head: number;
  };
  readonly sources: readonly Source[];
  /** 트랙 칸이 이름표에서 관 입구까지 가는 경로(끝 점 = 관 입구). */
  readonly sourcePath: (track: number) => readonly Pt[];
  /** 이름표에서 관으로 모이는 선. */
  readonly funnel: readonly (readonly Pt[])[];
  readonly pipe: { readonly x0: number; readonly x1: number; readonly y: number; readonly h: number };
  readonly entry: Pt;
  readonly exit: Pt;
  readonly pipeTitle: { readonly x: number; readonly y: number; readonly anchor: Anchor };
  readonly pipeNote: { readonly x: number; readonly y: number; readonly anchor: Anchor };
  readonly cell: { readonly w: number; readonly h: number };
  readonly laneCell: { readonly w: number; readonly h: number };
  readonly rows: readonly number[];
  /** 줄 왼쪽의 PID 이름표 x(휴대폰판만). */
  readonly laneLabelX: number | null;
  readonly slotX: (slot: number) => number;
  /** 관 출구에서 줄의 자리까지 가는 경로(첫 점 = 관 출구). */
  readonly sinkPath: (track: number, slotX: number) => readonly Pt[];
  /** 관 출구에서 7줄로 갈라지는 선과 줄 바닥선. */
  readonly fan: readonly (readonly Pt[])[];
  readonly head: { readonly x: number; readonly y: number };
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly pad: number; readonly line: number };
  readonly take: { readonly x: number; readonly y: number };
};

const BOX_LINES = ["PMT: 0x100 영상", "0x101–0x106 오디오"] as const;

// 데스크톱: 왼쪽 7개 이름표 → 관(540–1180) → 오른쪽 7줄(이름표와 같은 높이, 칸은 왼쪽부터 쌓임).
const D_ROWS = [340, 446, 552, 658, 764, 870, 976] as const;
const D_PIPE = { x0: 540, x1: 1180, y: 658, h: 100 } as const;
const D_CELL = { w: 92, h: 76 } as const;
const D_ENTRY: Pt = [D_PIPE.x0 + 8 + D_CELL.w / 2, D_PIPE.y];
const D_EXIT: Pt = [D_PIPE.x1 - 8 - D_CELL.w / 2, D_PIPE.y];
const D_LANE = { x0: 1290, x1: 1860 } as const;
const D_SLOT0 = D_LANE.x0 + 40;
const D_SLOT_PITCH = 46;
const D_TAG_RIGHT = 380;

const DESKTOP: Layout = {
  text: { tag: TEXT.small, pipe: TEXT.label, note: TEXT.small, cell: TEXT.small, box: TEXT.small, head: TEXT.label },
  sources: D_ROWS.map((y, track) => ({
    text: track === 0 ? "영상 0x100" : `오디오${track} 0x${pidTail(track)}`,
    tone: TRACK_TONE[track],
    x: 60,
    y: y - 30,
  })),
  sourcePath: (track) => [[D_TAG_RIGHT + 20, D_ROWS[track]], D_ENTRY],
  funnel: D_ROWS.map((y): readonly Pt[] => [[D_TAG_RIGHT, y], [D_PIPE.x0, D_PIPE.y]]),
  pipe: D_PIPE,
  entry: D_ENTRY,
  exit: D_EXIT,
  pipeTitle: { x: (D_PIPE.x0 + D_PIPE.x1) / 2, y: 488, anchor: "center" },
  pipeNote: { x: (D_PIPE.x0 + D_PIPE.x1) / 2, y: 548, anchor: "center" },
  cell: D_CELL,
  laneCell: { w: 40, h: 56 },
  rows: D_ROWS,
  laneLabelX: null,
  slotX: (slot) => D_SLOT0 + slot * D_SLOT_PITCH,
  sinkPath: (track, x) => [D_EXIT, [D_LANE.x0, D_ROWS[track]], [x, D_ROWS[track]]],
  fan: D_ROWS.map((y): readonly Pt[] => [[D_PIPE.x1, D_PIPE.y], [D_LANE.x0, y], [D_LANE.x1, y]]),
  head: { x: D_LANE.x0, y: 40 },
  box: { x: D_LANE.x0, y: 110, w: 560, pad: 16, line: 46 },
  take: { x: D_SLOT0 + 2 * D_SLOT_PITCH, y: D_ROWS[6] - 30 },
};

// 휴대폰판: 위 이름표 둘 → 가로 관(60–960) → 오른쪽 세로 갈래선 → 아래 7줄(칸은 오른쪽부터 쌓임).
const M_ROWS = [790, 872, 954, 1036, 1118, 1200, 1282] as const;
const M_PIPE = { x0: 60, x1: 960, y: 310, h: 100 } as const;
const M_CELL = { w: 120, h: 80 } as const;
const M_ENTRY: Pt = [M_PIPE.x0 + 8 + M_CELL.w / 2, M_PIPE.y];
const M_EXIT: Pt = [M_PIPE.x1 - 8 - M_CELL.w / 2, M_PIPE.y];
const M_BUS_X = 1030;
const M_LANE_X0 = 205;
const M_SLOT0 = M_BUS_X - 52;
const M_SLOT_PITCH = 50;
/** 이름표 아래 가운데(영상 · 오디오). */
const M_SRC: readonly Pt[] = [[206, 124], [664, 124]];
const M_FUNNEL_BEND: Pt = [M_ENTRY[0], 215];
const mSource = (track: number): Pt => M_SRC[track === 0 ? 0 : 1];

const MOBILE: Layout = {
  text: {
    tag: MOBILE_TEXT.small,
    pipe: MOBILE_TEXT.label,
    note: MOBILE_TEXT.small,
    cell: MOBILE_TEXT.small,
    box: MOBILE_TEXT.small,
    head: MOBILE_TEXT.label,
  },
  sources: [
    { text: "영상 0x100", tone: "ink", x: 60, y: 40 },
    { text: "오디오 0x101…0x106", tone: "muted", x: 400, y: 40 },
  ],
  sourcePath: (track) => [mSource(track), M_FUNNEL_BEND, M_ENTRY],
  funnel: M_SRC.map((p): readonly Pt[] => [p, M_FUNNEL_BEND, [M_ENTRY[0], M_PIPE.y - M_PIPE.h / 2]]),
  pipe: M_PIPE,
  entry: M_ENTRY,
  exit: M_EXIT,
  pipeTitle: { x: M_PIPE.x0, y: 380, anchor: "left" },
  pipeNote: { x: M_PIPE.x1, y: 180, anchor: "right" },
  cell: M_CELL,
  laneCell: { w: 44, h: 56 },
  rows: M_ROWS,
  laneLabelX: 40,
  slotX: (slot) => M_SLOT0 - slot * M_SLOT_PITCH,
  sinkPath: (track, x) => [M_EXIT, [M_BUS_X, M_PIPE.y], [M_BUS_X, M_ROWS[track]], [x, M_ROWS[track]]],
  fan: [
    [[M_PIPE.x1, M_PIPE.y], [M_BUS_X, M_PIPE.y], [M_BUS_X, M_ROWS[6]]],
    ...M_ROWS.map((y): readonly Pt[] => [[M_LANE_X0, y], [M_BUS_X, y]]),
  ],
  head: { x: 660, y: 598 },
  box: { x: 60, y: 548, w: 560, pad: 18, line: 60 },
  take: { x: M_LANE_X0 + 10, y: M_ROWS[6] - 37 },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const FILL: Record<Tone, string> = { ink: COLOR.ink, muted: COLOR.muted, accent: COLOR.accent };

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** 꺾은선 pts 위에서 길이 비율 t(0–1)의 점. */
const along = (pts: readonly Pt[], t: number): Pt => {
  const lengths = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lengths.reduce((sum, d) => sum + d, 0);
  const target = Math.min(Math.max(t, 0), 1) * total;
  const found = lengths.reduce<{ readonly left: number; readonly point: Pt | null }>(
    (acc, d, i) => {
      if (acc.point !== null) return acc;
      if (acc.left <= d) return { left: 0, point: lerpPt(pts[i], pts[i + 1], d === 0 ? 1 : acc.left / d) };
      return { left: acc.left - d, point: null };
    },
    { left: target, point: null },
  );
  return found.point ?? last(pts);
};

type CellView = { readonly at: Pt; readonly big: number; readonly opacity: number };

/** 데이터 칸의 위치 · 크기(0 = 줄 칸, 1 = 관 칸) · 불투명도. 출발 전이면 null. */
const dataView = (frame: number, t0: number, track: number, slot: number, l: Layout): CellView | null => {
  const start = t0 - A_DUR;
  const exitAt = t0 + B_DUR;
  if (frame < start) return null;
  const opacity = progress(frame, start, 4, linear);
  if (frame < t0) {
    return { at: along(l.sourcePath(track), (frame - start) / A_DUR), big: 0, opacity };
  }
  if (frame < exitAt) {
    return { at: lerpPt(l.entry, l.exit, (frame - t0) / B_DUR), big: progress(frame, t0, 5, linear), opacity };
  }
  const u = progress(frame, exitAt, C_DUR, EASE_OUT);
  return { at: along(l.sinkPath(track, l.slotX(slot)), u), big: 1 - progress(frame, exitAt, 6, linear), opacity };
};

const boxCenter = (l: Layout): Pt => [l.box.x + l.box.w / 2, l.box.y + l.box.pad + l.box.line];

/** PAT · PMT 칸: 관 입구에서 나타나 관을 지나 표 상자로 들어가며 사라진다. */
const tableView = (frame: number, t0: number, l: Layout): CellView | null => {
  const exitAt = t0 + B_DUR;
  const end = exitAt + C_DUR;
  if (frame < t0 - 6 || frame >= end) return null;
  if (frame < exitAt) {
    const u = Math.max(0, (frame - t0) / B_DUR);
    return { at: lerpPt(l.entry, l.exit, u), big: 1, opacity: progress(frame, t0 - 6, 6, linear) };
  }
  const u = progress(frame, exitAt, C_DUR, EASE_IN_OUT);
  return { at: lerpPt(l.exit, boxCenter(l), u), big: 1, opacity: 1 - progress(frame, end - 6, 6, linear) };
};

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type CellProps = {
  readonly view: CellView;
  readonly l: Layout;
  readonly text: string;
  /** null 이면 표 칸(흰 바탕 · ink 테두리). */
  readonly fill: string | null;
};

/** 패킷 칸 하나. 관 안에서는 크게(PID 글자), 줄에 쌓이면 작게(글자 없음). */
const Packet: React.FC<CellProps> = ({ view, l, text, fill }) => {
  const w = lerp(l.laneCell.w, l.cell.w, view.big);
  const h = lerp(l.laneCell.h, l.cell.h, view.big);
  return (
    <div
      style={{
        position: "absolute",
        left: view.at[0] - w / 2,
        top: view.at[1] - h / 2,
        width: w,
        height: h,
        borderRadius: 10,
        boxSizing: "border-box",
        background: fill ?? COLOR.white,
        border: fill === null ? `4px solid ${COLOR.ink}` : "none",
        display: "grid",
        placeItems: "center",
        fontFamily: FONT,
        fontSize: l.text.cell,
        fontWeight: 720,
        letterSpacing: "-0.02em",
        color: fill === null ? COLOR.ink : COLOR.white,
        opacity: view.opacity,
      }}
    >
      <span style={{ opacity: interpolate(view.big, [0.6, 1], [0, 1], CLAMP) }}>{text}</span>
    </div>
  );
};

const Lines: React.FC<{ readonly paths: readonly (readonly Pt[])[]; readonly opacity: number }> = ({ paths, opacity }) => (
  <svg style={{ position: "absolute", inset: 0, opacity }} width="100%" height="100%">
    {paths.map((pts) => {
      const points = pts.map((p) => p.join(",")).join(" ");
      return (
        <polyline
          key={points}
          points={points}
          fill="none"
          stroke={COLOR.line}
          strokeWidth={5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);

const DATA = ORDER.map((track, i) => ({
  key: `d${i}`,
  track,
  t0: DATA_T0 + i * DATA_GAP,
  slot: ORDER.slice(0, i).filter((t) => t === track).length,
}));

export const PidDemux: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, INTRO);
  const lanes = progress(frame, PMT_LANDED - 4, 12);
  const take = progress(frame, TAKE_AT, 12);
  const boxH = l.box.pad * 2 + l.box.line * BOX_LINES.length;

  return (
    // Pretendard 의 합자 · 문맥 대체가 일부 「0x1…」 의 x 를 곱하기 기호로 바꾸므로 끈다.
    <AbsoluteFill style={{ background: COLOR.white, fontFeatureSettings: '"calt" 0, "liga" 0, "clig" 0', fontVariantLigatures: "none" }}>
      <Lines paths={l.funnel} opacity={intro} />
      <Lines paths={l.fan} opacity={lanes} />

      {l.sources.map((s) => (
        <Tag key={s.text} x={s.x} y={s.y} tone={s.tone} size={l.text.tag} opacity={intro}>
          {s.text}
        </Tag>
      ))}

      {/* 관: MPEG-TS 한 흐름. */}
      <div
        style={{
          position: "absolute",
          left: l.pipe.x0,
          top: l.pipe.y - l.pipe.h / 2,
          width: l.pipe.x1 - l.pipe.x0,
          height: l.pipe.h,
          borderRadius: l.pipe.h / 2,
          boxSizing: "border-box",
          background: COLOR.surface,
          border: `4px solid ${COLOR.muted}`,
          opacity: intro,
        }}
      />
      <Label x={l.pipeTitle.x} y={l.pipeTitle.y} size={l.text.pipe} weight={760} anchor={l.pipeTitle.anchor} opacity={intro}>
        MPEG-TS 한 흐름 (SRT 안)
      </Label>
      <Label
        x={l.pipeNote.x}
        y={l.pipeNote.y}
        size={l.text.note}
        weight={650}
        color={COLOR.muted}
        anchor={l.pipeNote.anchor}
        opacity={intro}
      >
        패킷 188바이트
      </Label>

      {/* 받는 쪽: PID 로 나눔 · PMT 표 상자 · 7줄. */}
      <Label x={l.head.x} y={l.head.y} size={l.text.head} weight={760} opacity={intro}>
        PID로 나눔
      </Label>
      <div
        style={{
          position: "absolute",
          left: l.box.x,
          top: l.box.y,
          width: l.box.w,
          height: boxH,
          borderRadius: 18,
          boxSizing: "border-box",
          background: COLOR.surface,
          border: `4px solid ${COLOR.ink}`,
          opacity: lanes,
          transform: `scale(${interpolate(lanes, [0, 1], [0.9, 1])})`,
        }}
      />
      {BOX_LINES.map((line, i) => (
        <Label
          key={line}
          x={l.box.x + l.box.pad + 14}
          y={l.box.y + l.box.pad + i * l.box.line + (l.box.line - l.text.box * 1.2) / 2}
          size={l.text.box}
          weight={i === 0 ? 760 : 650}
          opacity={lanes}
        >
          {line}
        </Label>
      ))}

      {l.laneLabelX === null
        ? null
        : l.rows.map((y, track) => (
            <Label
              key={y}
              x={l.laneLabelX ?? 0}
              y={y - l.text.tag * 0.6}
              size={l.text.tag}
              weight={760}
              color={FILL[TRACK_TONE[track]]}
              opacity={lanes}
            >
              {`0x${pidTail(track)}`}
            </Label>
          ))}

      {(["PAT", "PMT"] as const).map((name) => {
        const view = tableView(frame, TABLE_T0[name], l);
        return view === null ? null : <Packet key={name} view={view} l={l} text={name} fill={null} />;
      })}

      {DATA.map((d) => {
        const view = dataView(frame, d.t0, d.track, d.slot, l);
        return view === null ? null : (
          <Packet key={d.key} view={view} l={l} text={pidTail(d.track)} fill={FILL[TRACK_TONE[d.track]]} />
        );
      })}

      <Tag x={l.take.x} y={l.take.y} tone="accent" size={l.text.tag} opacity={take} scale={interpolate(take, [0, 1], [0.85, 1])}>
        0x106만 꺼냄
      </Tag>
    </AbsoluteFill>
  );
};
