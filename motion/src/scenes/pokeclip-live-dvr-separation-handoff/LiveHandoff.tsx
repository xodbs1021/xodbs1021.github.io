// 콘티: _workspace/blog/pokeclip-live-dvr-separation-handoff/storyboard.md 「영상 1」
// 되감기 재생점 P 가 목록 끝 E 앞 1 × TD 띠에 들어서면 라이브 시작 하한을 재고(하한 ≤ P), 라이브 목록으로 넘긴다.
// ① 시한 「(E − P) + 2 × TD」 안에 이어 재생되면 확정. ② 이어지지 않고 시한을 넘기면 되감기로 돌아간다(시청자가 멈춰 뒀으면 멈춘 채).
// 기준: PokeClip-mono develop 825a3dfe web/src/features/player/liveHandoff.ts. 칸 수 · 위치는 설명용이다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Playhead, SegmentCell, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const LIVE_HANDOFF_FRAMES = 345;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤에는 1초 이상 멈춘다. */
const T = {
  intro: 0,
  moveA: 12,
  moveAFrames: 54,
  band: 66,
  floor: 82,
  jumpA: 104,
  playA: 116,
  playAFrames: 40,
  okA: 138,
  resetB: 178,
  jumpB: 196,
  fillB: 206,
  fillBFrames: 70,
  stuckB: 214,
  failB: 280,
  backB: 292,
  noteB: 304,
} as const;
const FADE = 12;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 시간 좌표(초). 되감기 목록은 4초 조각 7개, E = 28, 띠 = [E − 4, E]. */
const TD = 4;
const E = 28;
const P_START = 14;
const P_HANDOFF = 24.8;
const P_CONFIRM = 28.6;
const FLOOR = 23.2;
const LIVE_FROM = 20;
const LIVE_CELLS = 6;
const DEADLINE = E - P_HANDOFF + 2 * TD;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly x0: number;
  readonly pxPerSecond: number;
  readonly cellGap: number;
  readonly cellH: number;
  readonly outcomes: readonly { readonly x: number; readonly y: number }[];
  readonly rewind: { readonly labelY: number; readonly y: number };
  readonly live: { readonly labelY: number; readonly y: number };
  readonly deadline: { readonly labelY: number; readonly y: number; readonly w: number; readonly h: number };
  readonly verdict: { readonly x: number; readonly y: number };
  readonly note: { readonly x: number; readonly y: number };
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
  readonly copy: {
    readonly outcomeA: string;
    readonly outcomeB: string;
    readonly rewind: string;
    readonly live: string;
    readonly band: string;
    readonly floor: string;
    readonly deadline: string;
    readonly okA: string;
    readonly stuck: string;
    readonly failB: string;
    readonly noteB: string;
  };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "되감기 끝에서 라이브로 넘기고, 시한 안에 확인한다" }],
  x0: 150,
  pxPerSecond: 38,
  cellGap: 10,
  cellH: 90,
  outcomes: [
    { x: 150, y: 128 },
    { x: 760, y: 128 },
  ],
  rewind: { labelY: 228, y: 296 },
  live: { labelY: 470, y: 538 },
  deadline: { labelY: 704, y: 772, w: 900, h: 30 },
  verdict: { x: 150, y: 850 },
  note: { x: 150, y: 940 },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
  copy: {
    outcomeA: "① 이어 재생 → 확정",
    outcomeB: "② 시한 초과 → 되감기로",
    rewind: "되감기 목록",
    live: "라이브 목록",
    band: "E 앞 1 × TD",
    floor: "라이브 시작 하한 ≤ P",
    deadline: "확인 시한 = (E − P) + 2 × TD",
    okA: "시한 안에 이어 재생 → 확정",
    stuck: "이어지지 않음",
    failB: "시한 초과 → 넘기기 전 자리로",
    noteB: "시청자가 멈춰 뒀으면 멈춘 채 둔다",
  },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "되감기 끝에서 라이브로 넘기고," },
    { y: 124, text: "시한 안에 확인한다" },
  ],
  x0: 60,
  pxPerSecond: 21,
  cellGap: 6,
  cellH: 84,
  outcomes: [
    { x: 60, y: 214 },
    { x: 60, y: 290 },
  ],
  rewind: { labelY: 392, y: 460 },
  live: { labelY: 628, y: 696 },
  deadline: { labelY: 918, y: 990, w: 960, h: 30 },
  verdict: { x: 60, y: 1070 },
  note: { x: 60, y: 1164 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  copy: {
    outcomeA: "① 이어 재생 → 확정",
    outcomeB: "② 시한 초과 → 되감기로",
    rewind: "되감기 목록",
    live: "라이브 목록",
    band: "E − 1 TD",
    floor: "하한 ≤ P",
    deadline: "시한 (E − P) + 2 × TD",
    okA: "이어 재생 → 확정",
    stuck: "이어지지 않음",
    failB: "시한 초과 → 되감기로",
    noteB: "멈춰 뒀으면 멈춘 채",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const LiveHandoff: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;
  const x = (t: number) => l.x0 + t * l.pxPerSecond;
  const cellW = TD * l.pxPerSecond - l.cellGap;

  const intro = progress(frame, T.intro, 15);
  const phaseB = frame >= T.resetB;
  // ① 진행: P 가 띠로 들어가고(moveA), 라이브로 넘어가(jumpA) 이어 재생한다(playA).
  const moveA = progress(frame, T.moveA, T.moveAFrames, EASE_IN_OUT);
  const playA = progress(frame, T.playA, T.playAFrames, EASE_IN_OUT);
  const pA = P_START + (P_HANDOFF - P_START) * moveA + (P_CONFIRM - P_HANDOFF) * playA;
  const jumpA = progress(frame, T.jumpA, FADE, EASE_IN_OUT);
  // ② 진행: 같은 자리에서 다시 넘기지만 라이브가 이어지지 않아 시한이 다 차고 되감기로 돌아간다.
  const resetB = progress(frame, T.resetB, FADE);
  const jumpB = progress(frame, T.jumpB, FADE, EASE_IN_OUT);
  const backB = progress(frame, T.backB, FADE, EASE_IN_OUT);
  const onLive = phaseB ? jumpB * (1 - backB) : jumpA;
  const p = phaseB ? P_HANDOFF : pA;

  const bandOn = phaseB ? 1 : progress(frame, T.band, FADE);
  const floorOn = phaseB ? 1 : progress(frame, T.floor, FADE);
  const liveOn = phaseB ? 1 : progress(frame, T.floor, FADE);
  const fill = phaseB
    ? progress(frame, T.fillB, T.fillBFrames, (t) => t)
    : interpolate(frame, [T.playA, T.playA + T.playAFrames], [0, (P_CONFIRM - P_HANDOFF) / DEADLINE], CLAMP);
  const deadlineOn = phaseB ? 1 : progress(frame, T.jumpA, FADE);
  const okA = phaseB ? 1 - resetB : progress(frame, T.okA, FADE);
  const stuck = phaseB ? progress(frame, T.stuckB, FADE) * (1 - backB) : 0;
  const failB = progress(frame, T.failB, FADE);
  const noteB = progress(frame, T.noteB, FADE);

  const rowTop = interpolate(onLive, [0, 1], [l.rewind.y, l.live.y]);
  const headTop = rowTop - 34;
  const headH = l.cellH + 52;
  const deadlineColor = phaseB && fill >= 0.999 ? COLOR.danger : COLOR.accent;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.x0} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 두 결말 — 지금 보여 주는 쪽만 색을 칠한다. */}
      <Tag x={l.outcomes[0].x} y={l.outcomes[0].y} tone={phaseB ? "muted" : "accent"} size={l.text.tag} opacity={intro}>
        {c.outcomeA}
      </Tag>
      <Tag x={l.outcomes[1].x} y={l.outcomes[1].y} tone={phaseB ? "danger" : "muted"} size={l.text.tag} opacity={intro}>
        {c.outcomeB}
      </Tag>

      {/* 되감기 목록: 조각 7개, 끝 E, 띠 [E − TD, E]. */}
      <Label x={l.x0} y={l.rewind.labelY} size={l.text.label} opacity={intro}>
        {c.rewind}
      </Label>
      {Array.from({ length: 7 }, (_, i) => (
        <SegmentCell
          key={`r-${i}`}
          x={x(i * TD)}
          y={l.rewind.y}
          width={cellW}
          height={l.cellH}
          state="live"
          opacity={intro}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: x(E - TD) - 6,
          top: l.rewind.y - 8,
          width: TD * l.pxPerSecond + 2,
          height: l.cellH + 16,
          borderRadius: 16,
          background: COLOR.accentSoft,
          border: `5px solid ${COLOR.accent}`,
          boxSizing: "border-box",
          opacity: bandOn * 0.9,
        }}
      />
      <Label x={x(E - TD / 2)} y={l.rewind.y + l.cellH + 14} size={l.text.tag} color={COLOR.accent} anchor="center" opacity={bandOn}>
        {c.band}
      </Label>
      <Label x={x(E) + 14} y={l.rewind.y + l.cellH / 2 - l.text.label * 0.62} size={l.text.label} weight={760} opacity={intro}>
        E
      </Label>

      {/* 라이브 목록: 창의 조각들, 시작 하한 표시. */}
      <Label x={l.x0} y={l.live.labelY} size={l.text.label} opacity={liveOn}>
        {c.live}
      </Label>
      {Array.from({ length: LIVE_CELLS }, (_, i) => (
        <SegmentCell
          key={`l-${i}`}
          x={x(LIVE_FROM + i * TD)}
          y={l.live.y}
          width={cellW}
          height={l.cellH}
          state="live"
          opacity={liveOn}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: x(FLOOR) - 3,
          top: l.live.y - 22,
          width: 6,
          height: l.cellH + 44,
          borderRadius: 3,
          background: COLOR.accent,
          opacity: floorOn,
        }}
      />
      <Tag x={x(FLOOR)} y={l.live.y + l.cellH + 26} tone="accent" size={l.text.tag} anchor="center" opacity={floorOn}>
        {c.floor}
      </Tag>

      {/* 재생점 P. */}
      <Playhead x={x(p)} top={headTop} height={headH} color={COLOR.ink} opacity={intro} />
      <Label x={x(p)} y={headTop - l.text.label * 1.25} size={l.text.label} weight={760} anchor="center" opacity={intro}>
        P
      </Label>
      <Tag x={x(p) + 34} y={l.live.y + 6} tone="danger" size={l.text.tag} opacity={stuck}>
        {c.stuck}
      </Tag>

      {/* 확인 시한 막대. */}
      <div style={{ opacity: deadlineOn }}>
        <Label x={l.x0} y={l.deadline.labelY} size={l.text.tag} color={COLOR.muted} weight={650}>
          {c.deadline}
        </Label>
        <div
          style={{
            position: "absolute",
            left: l.x0,
            top: l.deadline.y,
            width: l.deadline.w,
            height: l.deadline.h,
            borderRadius: l.deadline.h / 2,
            background: COLOR.line,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: l.x0,
            top: l.deadline.y,
            width: Math.max(l.deadline.h, l.deadline.w * fill),
            height: l.deadline.h,
            borderRadius: l.deadline.h / 2,
            background: deadlineColor,
            opacity: fill > 0 ? 1 : 0,
          }}
        />
      </div>

      <Tag x={l.verdict.x} y={l.verdict.y} tone="accent" size={l.text.tag} opacity={okA}>
        {c.okA}
      </Tag>
      <Tag x={l.verdict.x} y={l.verdict.y} tone="danger" size={l.text.tag} opacity={failB}>
        {c.failB}
      </Tag>
      <Label x={l.note.x} y={l.note.y} size={l.text.tag} color={COLOR.muted} weight={650} opacity={noteB}>
        {c.noteB}
      </Label>
    </AbsoluteFill>
  );
};
