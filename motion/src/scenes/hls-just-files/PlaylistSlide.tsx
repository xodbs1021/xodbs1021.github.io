// 콘티: _workspace/blog/hls-just-files/storyboard.md 「영상 1」
// 라이브 미디어 목록이 갱신되는 모습: 끝에 새 EXTINF 줄이 붙고, 맨 앞 조각이 빠지며 EXT-X-MEDIA-SEQUENCE 가 1 오른다(100 → 101 → 102).
// 목록에는 늘 조각 6개가 남고(애플 저작 규격 8.11), 방송이 끝나면 EXT-X-ENDLIST 가 붙는다(RFC 8216 6.2.1).
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(PlaylistSlideMobile).
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const PLAYLIST_SLIDE_FRAMES = 330;

const FIRST = 100;
const SEGMENTS = [100, 101, 102, 103, 104, 105, 106, 107] as const;
const STEP = 20;
/** 단계마다 [새 줄이 붙는 프레임, 맨 앞 줄이 빠지는 프레임, 줄이 올라가는 프레임]. */
const STEPS = [
  { add: 40, remove: 66, shift: 88 },
  { add: 140, remove: 166, shift: 188 },
] as const;
const ENDLIST_AT = 236;

type Layout = {
  readonly panel: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly headY: readonly number[];
  readonly rowY0: number;
  readonly row: number;
  /** 한 조각(EXTINF 줄 + 주소 줄) 안의 줄 간격. row = 2 × line. */
  readonly line: number;
  readonly code: number;
  readonly tag: number;
  readonly textX: number;
  readonly tags: {
    readonly add: { readonly x: number; readonly y: number };
    readonly remove: { readonly x: number; readonly y: number };
    readonly history: { readonly x: number; readonly y: number };
    readonly end: { readonly x: number; readonly y: number };
  };
  readonly copy: { readonly add: string; readonly remove: string; readonly end: string };
};

const DESKTOP: Layout = {
  panel: { x: 120, y: 30, w: 1040, h: 980 },
  headY: [64, 120, 176],
  rowY0: 254,
  row: 100,
  line: 50,
  code: TEXT.small,
  tag: TEXT.small,
  textX: 170,
  tags: {
    add: { x: 1220, y: 860 },
    remove: { x: 1220, y: 254 },
    history: { x: 1220, y: 172 },
    end: { x: 1220, y: 860 },
  },
  copy: { add: "끝에 새 조각이 붙음", remove: "맨 앞 조각이 빠짐", end: "방송 끝 · 더 바뀌지 않음" },
};

const MOBILE: Layout = {
  panel: { x: 40, y: 110, w: 1000, h: 1080 },
  headY: [136, 192, 248],
  rowY0: 326,
  row: 120,
  line: 58,
  code: MOBILE_TEXT.label,
  tag: MOBILE_TEXT.small,
  textX: 80,
  tags: {
    add: { x: 40, y: 1214 },
    remove: { x: 560, y: 1214 },
    history: { x: 40, y: 40 },
    end: { x: 40, y: 1214 },
  },
  copy: { add: "끝에 붙음", remove: "앞에서 빠짐", end: "방송 끝 · ENDLIST" },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 조각 n 이 목록에 나타난 정도(0–1). 처음 6개는 처음부터 있다. */
const appear = (frame: number, n: number): number => {
  const i = n - FIRST - 6;
  return i < 0 ? 1 : progress(frame, STEPS[i].add, STEP);
};

/** 조각 n 이 목록에서 빠진 정도(0–1). */
const removal = (frame: number, n: number): number => {
  const i = n - FIRST;
  return i < STEPS.length ? progress(frame, STEPS[i].remove, STEP) : 0;
};

/** 위로 올라간 줄 수(0–2, 연속). */
const shifted = (frame: number): number => STEPS.reduce((sum, s) => sum + progress(frame, s.shift, STEP), 0);

/** 지금 보이는 MEDIA-SEQUENCE 값. 줄이 다 올라간 순간 바뀐다. */
const mediaSequence = (frame: number): number => FIRST + STEPS.filter((s) => frame >= s.shift + STEP / 2).length;

/** 값이 바뀐 직후 강조 정도. */
const seqPulse = (frame: number): number =>
  Math.max(...STEPS.map((s) => interpolate(frame, [s.shift + STEP / 2, s.shift + STEP / 2 + 6, s.shift + 60], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));

const Code: React.FC<{
  readonly children: React.ReactNode;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly color?: string;
  readonly opacity?: number;
  readonly strike?: boolean;
}> = ({ children, x, y, size, color = COLOR.ink, opacity = 1, strike = false }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      fontFamily: MONO,
      fontSize: size,
      fontWeight: 600,
      color,
      opacity,
      whiteSpace: "pre",
      textDecoration: strike ? "line-through" : "none",
    }}
  >
    {children}
  </div>
);

export const PlaylistSlide: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 16);
  const shift = shifted(frame);
  const end = progress(frame, ENDLIST_AT, STEP);
  const seq = mediaSequence(frame);
  const pulse = seqPulse(frame);
  const addTag = Math.max(...STEPS.map((s) => interpolate(frame, [s.add, s.add + 8, s.remove + 10, s.remove + 18], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const removeTag = Math.max(...STEPS.map((s) => interpolate(frame, [s.remove, s.remove + 8, s.shift + STEP + 16, s.shift + STEP + 26], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const mobile = layout === "mobile";

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <div
        style={{
          position: "absolute",
          left: l.panel.x,
          top: l.panel.y,
          width: l.panel.w,
          height: l.panel.h,
          borderRadius: 24,
          background: COLOR.surface,
          border: `4px solid ${COLOR.line}`,
          boxSizing: "border-box",
          opacity: intro,
        }}
      />
      <Code x={l.textX} y={l.headY[0]} size={l.code} opacity={intro}>#EXTM3U</Code>
      <Code x={l.textX} y={l.headY[1]} size={l.code} opacity={intro}>#EXT-X-TARGETDURATION:6</Code>
      <div
        style={{
          position: "absolute",
          left: l.textX - 14,
          top: l.headY[2] - 8,
          height: l.code * 1.4 + 16,
          width: l.panel.w - (l.textX - l.panel.x) * 2 + 28,
          borderRadius: 12,
          background: COLOR.accentSoft,
          opacity: pulse,
        }}
      />
      <Code x={l.textX} y={l.headY[2]} size={l.code} opacity={intro}>
        #EXT-X-MEDIA-SEQUENCE:<span style={{ color: pulse > 0.05 ? COLOR.accent : COLOR.ink }}>{seq}</span>
      </Code>

      {SEGMENTS.map((n) => {
        const a = appear(frame, n);
        const r = removal(frame, n);
        if (a <= 0) return null;
        const slot = n - FIRST - shift;
        const y = l.rowY0 + slot * l.row;
        const fresh = n >= FIRST + 6 ? 1 - progress(frame, STEPS[n - FIRST - 6].add + 50, 30) : 0;
        return (
          <div key={n}>
            <div
              style={{
                position: "absolute",
                left: l.textX - 14,
                top: y - 6,
                height: l.row - 4,
                width: l.panel.w - (l.textX - l.panel.x) * 2 + 28,
                borderRadius: 12,
                background: r > 0 ? COLOR.line : COLOR.accentSoft,
                opacity: Math.max(fresh * a, r > 0 ? 0.8 * (1 - r) : 0),
              }}
            />
            <Code
              x={l.textX - r * 80}
              y={y + (1 - a) * 40}
              size={l.code}
              color={r > 0 ? COLOR.muted : COLOR.ink}
              opacity={a * (1 - r) * intro}
              strike={r > 0}
            >
              {"#EXTINF:6.000,"}
            </Code>
            <Code
              x={l.textX - r * 80}
              y={y + l.line + (1 - a) * 40}
              size={l.code}
              color={r > 0 ? COLOR.muted : COLOR.ink}
              opacity={a * (1 - r) * intro}
              strike={r > 0}
            >
              {`seg${n}.ts`}
            </Code>
          </div>
        );
      })}

      <Code x={l.textX} y={l.rowY0 + 6 * l.row + (1 - end) * 30} size={l.code} color={COLOR.accent} opacity={end}>
        #EXT-X-ENDLIST
      </Code>

      <Label x={l.tags.history.x} y={l.tags.history.y} size={l.tag} color={COLOR.muted} weight={700} opacity={intro}>
        {`${mobile ? "MEDIA-SEQUENCE" : "번호"} ${seq === FIRST ? FIRST : `${FIRST} → ${seq}`}`}
      </Label>
      <Tag x={l.tags.add.x} y={l.tags.add.y} tone="accent" size={l.tag} opacity={addTag * (1 - end)}>
        {l.copy.add}
      </Tag>
      <Tag x={l.tags.remove.x} y={l.tags.remove.y} tone="muted" size={l.tag} opacity={removeTag * (1 - end)}>
        {l.copy.remove}
      </Tag>
      <Tag x={l.tags.end.x} y={l.tags.end.y} tone="ink" size={l.tag} opacity={end}>
        {l.copy.end}
      </Tag>
    </AbsoluteFill>
  );
};
