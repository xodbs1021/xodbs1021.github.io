// 콘티: _workspace/blog/microphone-selection-without-always-on-vad/storyboard.md 「영상 1」
// 위 줄: 상시 전 트랙 VAD(뺀 설계) — 스캐너가 방송 내내 모든 트랙을 쓸고, 마이크와 게임 줄이 둘 다 「음성」으로 잡힌다.
// 아래 줄: 클립 구간 안에서만 트랙별 파형을 보고, 마이크 한 트랙만 켜서 들은 뒤 자막 입력(설계)으로 고른다.
// 파형 모양은 설명용(고정 수식) — 실측이 아니다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node, Wire } from "../../components/Flow";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const TRACK_PICK_IN_CLIP_FRAMES = 360;

/** 장면 순서(프레임, 30fps). */
const T = {
  intro: 0,
  scanStart: 20,
  scanEnd: 115,
  warn: 115,
  lower: 130,
  bracket: 140,
  waveStart: 160,
  waveEnd: 205,
  focus: 210,
  route: 270,
  box: 280,
} as const;
const FADE = 12;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Wave = "busy" | "speech" | "steady" | "flat";
type Track = { readonly name: string; readonly wave: Wave; readonly seed: number };

const MIC = "마이크";
const GAME = "게임";

const ALL_TRACKS: readonly Track[] = [
  { name: "믹스", wave: "busy", seed: 0.4 },
  { name: MIC, wave: "speech", seed: 1.3 },
  { name: GAME, wave: "speech", seed: 3.9 },
  { name: "디스코드", wave: "flat", seed: 0 },
  { name: "BGM", wave: "steady", seed: 2.2 },
  { name: "기타", wave: "flat", seed: 0 },
];
// 휴대폰판은 콘티대로 네 줄로 줄인다(두 줄 모두 같게).
const MOBILE_TRACKS = ALL_TRACKS.filter((t) => ["믹스", MIC, GAME, "BGM"].includes(t.name));

/** 위 줄에서 VAD 가 「음성」으로 잡는 자리(줄 폭에 대한 비율). 첫 구간 뒤에 Tag 가 뜬다. */
const SPEECH: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  [MIC]: [[0.12, 0.2], [0.45, 0.53], [0.8, 0.88]],
  [GAME]: [[0.27, 0.37], [0.62, 0.72]],
};
/** 아래 줄의 클립 구간(줄 폭에 대한 비율). */
const CLIP = [0.3, 0.7] as const;

type Point = readonly [number, number];

type Layout = {
  readonly tracks: readonly Track[];
  readonly nameX: number;
  readonly top: { readonly headY: number; readonly rowY: number; readonly x0: number; readonly x1: number; readonly warn: Point };
  readonly low: { readonly headY: number; readonly rowY: number; readonly x0: number; readonly x1: number; readonly clipLabelY: number };
  readonly pitch: number;
  readonly bar: number;
  readonly waveHalf: number;
  readonly waveStep: number;
  readonly listen: { readonly x: number; readonly y: number; readonly anchor: "left" | "center" };
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly noteY: number };
  /** 마이크 줄에서 자막 입력 상자로 가는 꺾은선(첫 점은 구간 오른쪽 끝). */
  readonly route: readonly Point[];
  readonly text: { readonly head: number; readonly name: number; readonly tag: number };
};

const DESKTOP_PITCH = 54;
const DESKTOP_MIC_Y = 600 + DESKTOP_PITCH;
const MOBILE_PITCH = 72;
const MOBILE_MIC_Y = 790 + MOBILE_PITCH;

const DESKTOP: Layout = {
  tracks: ALL_TRACKS,
  nameX: 120,
  top: { headY: 32, rowY: 130, x0: 300, x1: 1800, warn: [1440, 30] },
  low: { headY: 486, rowY: 600, x0: 300, x1: 1300, clipLabelY: 506 },
  pitch: DESKTOP_PITCH,
  bar: 28,
  waveHalf: 22,
  waveStep: 10,
  listen: { x: 800, y: 932, anchor: "center" },
  box: { x: 1440, y: DESKTOP_MIC_Y - 50, w: 360, h: 100, noteY: DESKTOP_MIC_Y + 64 },
  route: [[1012, DESKTOP_MIC_Y], [1436, DESKTOP_MIC_Y]],
  text: { head: TEXT.label, name: TEXT.small, tag: TEXT.small },
};

const MOBILE: Layout = {
  tracks: MOBILE_TRACKS,
  nameX: 60,
  top: { headY: 48, rowY: 196, x0: 260, x1: 1020, warn: [260, 470] },
  low: { headY: 594, rowY: 790, x0: 260, x1: 1020, clipLabelY: 670 },
  pitch: MOBILE_PITCH,
  bar: 32,
  waveHalf: 26,
  waveStep: 10,
  listen: { x: 60, y: 1100, anchor: "left" },
  box: { x: 720, y: 1100, w: 300, h: 100, noteY: 1212 },
  route: [[804, MOBILE_MIC_Y], [870, MOBILE_MIC_Y], [870, 1096]],
  text: { head: MOBILE_TEXT.label, name: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 설명용 파형 높이(0–1). 고정 수식이라 매번 같다. */
const amplitude = (wave: Wave, seed: number, i: number): number => {
  const a = Math.abs(Math.sin(i * 0.9 + seed) * 0.55 + Math.sin(i * 0.31 + seed * 1.7) * 0.45);
  if (wave === "flat") return 0.05;
  if (wave === "steady") return 0.4 + 0.12 * Math.sin(i * 0.5 + seed);
  if (wave === "busy") return 0.3 + 0.6 * a;
  return Math.sin(i * 0.4 + seed) > -0.5 ? 0.25 + 0.75 * a : 0.06;
};

/** 꺾은선을 앞에서부터 t(0–1)만큼 잘라 낸 점들. */
const partialPath = (points: readonly Point[], t: number): Point[] => {
  const lengths = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
  let left = lengths.reduce((s, n) => s + n, 0) * t;
  const out: Point[] = [points[0]];
  for (let i = 0; i < lengths.length && left > 0; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const k = Math.min(1, left / lengths[i]);
    out.push([ax + (bx - ax) * k, ay + (by - ay) * k]);
    left -= lengths[i];
  }
  return out.length > 1 ? out : [points[0], points[0]];
};

const box = (x: number, y: number, w: number, h: number) =>
  ({ position: "absolute", left: x, top: y, width: Math.max(0, w), height: h }) as const;

type HeadingProps = {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly noteSize: number;
  readonly opacity: number;
  readonly text: string;
  readonly note?: string;
};

/** 줄 제목과 (있으면) 회색 이름표를 한 줄에 둔다. */
const Heading: React.FC<HeadingProps> = ({ x, y, size, noteSize, opacity, text, note }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 20, opacity, fontFamily: FONT }}>
    <span style={{ fontSize: size, fontWeight: 760, color: COLOR.ink, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{text}</span>
    {note ? (
      <span style={{ fontSize: noteSize, fontWeight: 700, color: COLOR.muted, background: COLOR.surface, padding: "6px 20px", borderRadius: 999, whiteSpace: "nowrap" }}>
        {note}
      </span>
    ) : null}
  </div>
);

/** 구간 괄호 한쪽. side 쪽 테두리만 그린다. */
const Bracket: React.FC<{ x: number; top: number; bottom: number; side: "left" | "right" }> = ({ x, top, bottom, side }) => {
  const edge = `6px solid ${COLOR.ink}`;
  return (
    <div
      style={{
        ...box(x, top, 22, bottom - top),
        borderTop: edge,
        borderBottom: edge,
        ...(side === "left" ? { borderLeft: edge, borderRadius: "6px 0 0 6px" } : { borderRight: edge, borderRadius: "0 6px 6px 0" }),
        boxSizing: "border-box",
      }}
    />
  );
};

export const TrackPickInClip: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const { top, low } = l;
  const topW = top.x1 - top.x0;
  const lowW = low.x1 - low.x0;
  const tagH = l.text.tag * 1.2 + 16;
  const rowCenter = (y0: number, i: number) => y0 + i * l.pitch;
  const nameY = (cy: number) => cy - l.text.name * 0.62;

  const intro = progress(frame, T.intro, 15);
  const scanX = interpolate(frame, [T.scanStart, T.scanEnd], [top.x0, top.x1], CLAMP);
  const scanOpacity = progress(frame, T.scanStart - 6, 8) * (1 - progress(frame, T.scanEnd, FADE));
  /** 스캐너가 x 에 닿는 프레임. */
  const scanReach = (x: number) => T.scanStart + ((x - top.x0) / topW) * (T.scanEnd - T.scanStart);
  const warn = progress(frame, T.warn, FADE);

  const lower = progress(frame, T.lower, 15);
  const spread = progress(frame, T.bracket, 20);
  const clip0 = low.x0 + lowW * CLIP[0];
  const clip1 = low.x0 + lowW * CLIP[1];
  const clipMid = (clip0 + clip1) / 2;
  const half = ((clip1 - clip0) / 2) * spread;
  const waveX = interpolate(frame, [T.waveStart, T.waveEnd], [clip0, clip1], CLAMP);
  const focus = progress(frame, T.focus, 15);
  const listen = progress(frame, T.focus + 5, FADE);
  const route = progress(frame, T.route, 20);
  const target = progress(frame, T.box, 15);
  const note = progress(frame, T.box + 5, FADE);

  const lowTop = rowCenter(low.rowY, 0) - l.waveHalf - 18;
  const lowBottom = rowCenter(low.rowY, l.tracks.length - 1) + l.waveHalf + 18;
  const bandX = clip0 + 6;
  const bandW = clip1 - clip0 - 12;
  const bars = Math.floor((clip1 - clip0 - 24) / l.waveStep);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 위 줄: 상시 전 트랙 VAD(뺀 설계). */}
      <Heading x={l.nameX} y={top.headY} size={l.text.head} noteSize={l.text.tag} opacity={intro} text="상시 전 트랙 VAD" note="뺀 설계" />
      {l.tracks.map((track, i) => {
        const cy = rowCenter(top.rowY, i);
        const by = cy - l.bar / 2;
        const segs = SPEECH[track.name] ?? [];
        return (
          <div key={`top-${track.name}`} style={{ opacity: intro }}>
            <Label x={l.nameX} y={nameY(cy)} size={l.text.name} weight={680}>
              {track.name}
            </Label>
            <div style={{ ...box(top.x0, by, topW, l.bar), background: COLOR.surface, border: `2px solid ${COLOR.line}`, borderRadius: 8, boxSizing: "border-box" }} />
            {/* 스캐너가 지나간 자리 = 상시 연산. */}
            <div style={{ ...box(top.x0, by, scanX - top.x0, l.bar), background: COLOR.muted, opacity: 0.4, borderRadius: 8 }} />
            {segs.map(([s, e]) => {
              const sx = top.x0 + topW * s;
              const ex = Math.min(top.x0 + topW * e, scanX);
              return <div key={s} style={{ ...box(sx, by, ex - sx, l.bar), background: COLOR.ink, borderRadius: 6 }} />;
            })}
          </div>
        );
      })}
      <div
        style={{
          ...box(scanX - 4, rowCenter(top.rowY, 0) - l.bar / 2 - 18, 8, (l.tracks.length - 1) * l.pitch + l.bar + 36),
          background: COLOR.muted,
          borderRadius: 4,
          opacity: scanOpacity,
        }}
      />
      {/* 「음성」 이름표는 스캐너 위에 얹는다(지나가며 가리지 않게). */}
      {l.tracks.map((track, i) => {
        const first = SPEECH[track.name]?.[0];
        if (!first) return null;
        const endX = top.x0 + topW * first[1];
        return (
          <Tag
            key={`speech-${track.name}`}
            x={endX + 12}
            y={rowCenter(top.rowY, i) - tagH / 2}
            size={l.text.tag}
            opacity={intro * progress(frame, scanReach(endX), 10)}
          >
            음성
          </Tag>
        );
      })}
      <Tag x={top.warn[0]} y={top.warn[1]} tone="danger" size={l.text.tag} opacity={warn} scale={0.92 + 0.08 * warn}>
        게임 대사도 음성
      </Tag>

      {/* 아래 줄: 클립 구간 안에서 고르기. */}
      <Heading x={l.nameX} y={low.headY} size={l.text.head} noteSize={l.text.tag} opacity={intro} text="클립 구간 안에서 고르기" />
      {l.tracks.map((track, i) => {
        const cy = rowCenter(low.rowY, i);
        const isMic = track.name === MIC;
        const dim = isMic ? 1 : 1 - 0.65 * focus;
        const waveColor = isMic && focus > 0 ? COLOR.accent : COLOR.ink;
        return (
          <div key={`low-${track.name}`} style={{ opacity: lower }}>
            <Label x={l.nameX} y={nameY(cy)} size={l.text.name} weight={isMic ? 760 : 680} color={isMic && focus > 0.5 ? COLOR.accent : COLOR.ink} opacity={dim}>
              {track.name}
            </Label>
            {/* 구간 밖은 빈 줄. */}
            <div style={{ ...box(low.x0, cy - 2, lowW, 4), background: COLOR.line, borderRadius: 2, opacity: dim }} />
            <div style={{ ...box(bandX, cy - l.waveHalf - 4, bandW, l.waveHalf * 2 + 8), background: COLOR.surface, borderRadius: 8, opacity: spread * dim }} />
            {isMic ? (
              <div
                style={{
                  ...box(bandX, cy - l.waveHalf - 4, bandW, l.waveHalf * 2 + 8),
                  background: COLOR.accentSoft,
                  border: `3px solid ${COLOR.accent}`,
                  borderRadius: 8,
                  boxSizing: "border-box",
                  opacity: focus,
                }}
              />
            ) : null}
            <svg style={{ position: "absolute", inset: 0, opacity: dim }} width="100%" height="100%">
              {Array.from({ length: bars }, (_, b) => {
                const bx = clip0 + 12 + b * l.waveStep + l.waveStep / 2;
                if (bx > waveX) return null;
                const h = Math.max(3, amplitude(track.wave, track.seed, b) * l.waveHalf * 2);
                return <rect key={b} x={bx - 2.5} y={cy - h / 2} width={5} height={h} rx={2.5} fill={waveColor} />;
              })}
            </svg>
          </div>
        );
      })}

      {/* 구간 괄호: 가운데에서 양쪽으로 펼쳐진다. */}
      <div style={{ opacity: lower * Math.min(1, spread * 4) }}>
        <Bracket x={clipMid - half - 6} top={lowTop} bottom={lowBottom} side="left" />
        <Bracket x={clipMid + half - 16} top={lowTop} bottom={lowBottom} side="right" />
      </div>
      <Label x={clipMid} y={low.clipLabelY} size={l.text.tag} weight={720} anchor="center" opacity={spread}>
        클립 구간
      </Label>

      <Tag x={l.listen.x} y={l.listen.y} tone="accent" size={l.text.tag} anchor={l.listen.anchor} opacity={listen}>
        한 트랙만 켜서 듣기
      </Tag>

      {/* 마이크 줄 → 자막 입력(설계, 점선 상자). */}
      <Wire points={partialPath(l.route, route)} color={COLOR.accent} arrow={route > 0.95} opacity={route > 0 ? 1 : 0} />
      <Node x={l.box.x} y={l.box.y} width={l.box.w} height={l.box.h} tone="muted" size={l.text.name} opacity={target}>
        <span style={{ display: "block", textAlign: "center" }}>자막 입력</span>
      </Node>
      <Label x={l.box.x + l.box.w / 2} y={l.box.noteY} size={l.text.tag} color={COLOR.muted} weight={680} anchor="center" opacity={note}>
        설계
      </Label>
    </AbsoluteFill>
  );
};
