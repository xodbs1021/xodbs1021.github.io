// 콘티: _workspace/blog/hls-deep-dive/storyboard.md 「영상 1」
// 목표 길이 6초인 일반 HLS 라이브. 인코더가 만드는 조각은 6초가 다 차야 목록 끝에 붙고(개정 초안 3.2),
// 플레이어는 목록 끝에서 목표 길이 세 배(18초) 뒤에서 재생을 시작한다(RFC 8216 6.3.3).
// 목록 재요청 간격(바뀌면 목표 길이, 그대로면 절반)은 이름표로 보인다(RFC 8216 6.3.4).
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(HoldBackStartMobile).
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Playhead, SegmentCell, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const HOLD_BACK_START_FRAMES = 330;

const TD = 6;
/** 처음 목록 끝(초)과 그때의 재생 시작 위치. */
const END0 = 36;
const START = END0 - 3 * TD;
const T = { intro: 0, start: 30, run: 70, runFrames: 200, reload: 120 } as const;
const RUN_END = T.run + T.runFrames;

type Layout = {
  readonly s0: number;
  readonly x0: number;
  readonly px: number;
  readonly cellY: number;
  readonly cellH: number;
  readonly firstSeg: number;
  readonly text: { readonly cell: number; readonly label: number; readonly tag: number };
  readonly bandY: number;
  readonly bandLabelY: number;
  readonly endLabelY: number;
  readonly startLabelY: number;
  readonly delayY: number;
  readonly reload: readonly { readonly x: number; readonly y: number }[];
  readonly copy: {
    readonly band: string;
    readonly end: string;
    readonly start: string;
    readonly now: string;
    readonly making: string;
    readonly delay: string;
    readonly reload: readonly string[];
  };
};

const DESKTOP: Layout = {
  s0: 0,
  x0: 150,
  px: 38,
  cellY: 380,
  cellH: 110,
  firstSeg: 100,
  text: { cell: TEXT.small, label: TEXT.label, tag: TEXT.small },
  bandY: 330,
  bandLabelY: 250,
  endLabelY: 160,
  startLabelY: 556,
  delayY: 680,
  reload: [
    { x: 150, y: 860 },
    { x: 860, y: 860 },
  ],
  copy: {
    band: "목표 길이 6초 × 3 = 18초",
    end: "목록 끝",
    start: "재생 시작 위치",
    now: "재생 위치(목록 끝 − 18초)",
    making: "만드는 중 · 목록에 없음",
    delay: "시청 지연 = 18초 + 만들던 조각",
    reload: ["목록이 바뀌었으면 6초 뒤 다시", "그대로면 3초 뒤 다시"],
  },
};

const MOBILE: Layout = {
  s0: 12,
  x0: 60,
  px: 29,
  cellY: 560,
  cellH: 120,
  firstSeg: 102,
  text: { cell: MOBILE_TEXT.small, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  bandY: 500,
  bandLabelY: 400,
  endLabelY: 230,
  startLabelY: 734,
  delayY: 860,
  reload: [
    { x: 60, y: 1080 },
    { x: 60, y: 1190 },
  ],
  copy: {
    band: "6초 × 3 = 18초",
    end: "목록 끝",
    start: "재생 시작",
    now: "재생 위치",
    making: "만드는 중",
    delay: "지연 = 18초 + 만들던 몫",
    reload: ["바뀌었으면 6초 뒤 다시 받기", "그대로면 3초 뒤 다시 받기"],
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const HoldBackStart: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const xOf = (s: number): number => l.x0 + (s - l.s0) * l.px;
  const intro = progress(frame, T.intro, 16);
  const start = progress(frame, T.start, 18);
  /** 흐른 스트림 시간(0–6초). */
  const elapsed = interpolate(frame, [T.run, RUN_END], [0, TD], CLAMP);
  const done = frame >= RUN_END;
  const join = progress(frame, RUN_END, 14);
  const playlistEnd = END0 + TD * join;
  const now = END0 + elapsed;
  const playhead = START + elapsed;
  const reloadTags = progress(frame, T.reload, 16);
  /** 재생점이 시작 위치를 떠나면 시작 위치 표시는 사라지고, 끝에는 재생점 이름표 하나만 남는다. */
  const startFade = 1 - progress(frame, T.run + 40, 20);
  const firstCellS = Math.max(0, l.s0);
  const cells = Array.from({ length: (END0 - firstCellS) / TD }, (_, i) => firstCellS + i * TD);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 시작 위치에서 목록 끝까지의 18초 띠(처음 위치 기준, 그대로 남김). */}
      <div
        style={{
          position: "absolute",
          left: xOf(playhead),
          top: l.bandY,
          width: (playlistEnd - playhead) * l.px,
          height: l.cellH + 100,
          borderRadius: 18,
          background: COLOR.accentSoft,
          border: `4px solid ${COLOR.accent}`,
          boxSizing: "border-box",
          opacity: start * 0.9,
        }}
      />
      <Label x={xOf((playhead + playlistEnd) / 2)} y={l.bandLabelY} size={l.text.label} color={COLOR.accent} weight={760} anchor="center" opacity={start * (1 - progress(frame, T.run, 12)) + join}>
        {l.copy.band}
      </Label>

      {cells.map((s, i) => (
        <SegmentCell
          key={s}
          x={xOf(s) + 4}
          y={l.cellY}
          width={TD * l.px - 8}
          height={l.cellH}
          state="live"
          label={`${l.firstSeg + i}`}
          size={l.text.cell}
          opacity={intro}
        />
      ))}

      {/* 만드는 중인 조각: 점선 칸이 왼쪽부터 찬다. 다 차면 목록에 붙는다. */}
      <div
        style={{
          position: "absolute",
          left: xOf(END0) + 4,
          top: l.cellY,
          width: TD * l.px - 8,
          height: l.cellH,
          borderRadius: 14,
          border: `3px ${done ? "solid" : "dashed"} ${done ? COLOR.ink : COLOR.muted}`,
          boxSizing: "border-box",
          overflow: "hidden",
          opacity: intro,
        }}
      >
        <div style={{ width: `${(elapsed / TD) * 100}%`, height: "100%", background: done ? COLOR.white : COLOR.line }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: FONT,
            fontSize: l.text.cell,
            fontWeight: 650,
            color: done ? COLOR.ink : COLOR.muted,
          }}
        >
          {`${l.firstSeg + cells.length}`}
        </div>
      </div>
      <Label x={xOf(END0 + TD / 2)} y={l.startLabelY} size={l.text.tag} color={COLOR.muted} anchor="center" opacity={intro * (1 - join)}>
        {l.copy.making}
      </Label>

      {/* 목록 끝 표시: 조각이 다 차면 한 칸 오른쪽으로 뛴다. */}
      <div
        style={{
          position: "absolute",
          left: xOf(playlistEnd) - 3,
          top: l.endLabelY + 70,
          width: 6,
          height: l.cellY + l.cellH + 20 - (l.endLabelY + 70),
          background: COLOR.ink,
          opacity: intro,
        }}
      />
      <Tag x={xOf(playlistEnd)} y={l.endLabelY} size={l.text.tag} anchor="center" scale={done ? 1 + 0.15 * (1 - join) : 1} opacity={intro}>
        {l.copy.end}
      </Tag>

      <div
        style={{
          position: "absolute",
          left: xOf(START) - 2,
          top: l.cellY - 40,
          width: 0,
          height: l.startLabelY - (l.cellY - 40),
          borderLeft: `4px dashed ${COLOR.accent}`,
          opacity: start * progress(frame, T.run, 12) * startFade,
        }}
      />
      <Playhead x={xOf(playhead)} top={l.cellY - 40} height={l.cellH + 80} color={COLOR.accent} opacity={start} />
      <Label x={xOf(START)} y={l.startLabelY} size={l.text.tag} color={COLOR.accent} weight={760} anchor="center" opacity={start * startFade}>
        {l.copy.start}
      </Label>
      <Label x={xOf(playhead)} y={l.startLabelY} size={l.text.tag} color={COLOR.accent} weight={760} anchor="center" opacity={join}>
        {l.copy.now}
      </Label>

      {/* 지금 시각 — 회색 점선. */}
      <div
        style={{
          position: "absolute",
          left: xOf(now) - 2,
          top: l.cellY - 30,
          width: 0,
          height: l.cellH + 60,
          borderLeft: `4px dashed ${COLOR.muted}`,
          opacity: progress(frame, T.run - 10, 10),
        }}
      />

      {/* 재생점에서 지금까지: 시청 지연. */}
      <div
        style={{
          position: "absolute",
          left: xOf(playhead),
          top: l.delayY,
          width: (now - playhead) * l.px,
          height: 6,
          background: COLOR.ink,
          opacity: progress(frame, T.run, 14),
        }}
      />
      <Label x={xOf((playhead + now) / 2)} y={l.delayY + 22} size={l.text.tag} weight={700} anchor="center" opacity={progress(frame, T.run, 14)}>
        {l.copy.delay}
      </Label>

      {l.copy.reload.map((text, i) => (
        <Tag key={text} x={l.reload[i].x} y={l.reload[i].y} tone={i === 0 ? "ink" : "muted"} size={l.text.tag} opacity={reloadTags}>
          {text}
        </Tag>
      ))}
    </AbsoluteFill>
  );
};
