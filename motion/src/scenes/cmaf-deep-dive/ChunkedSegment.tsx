// 콘티: _workspace/blog/cmaf-deep-dive/storyboard.md 「영상 1」
// 2초 CMAF 조각 seg-1.m4s 에 0.5초짜리 moof+mdat 청크가 하나씩 쌓이고, 청크가 완성될 때마다 LL-HLS 목록에 EXT-X-PART 줄이 붙는다.
// 네 번째 청크로 조각이 끝나면 EXTINF 줄이 붙는다. 청크 수 · tfdt 값(0 · 7680 · 15360 · 23040, timescale 15360)은
// 글의 FFmpeg 9.0.2 실측 파일과 같고, 목록 줄은 설명용이다. 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(ChunkedSegmentMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const CHUNKED_SEGMENT_FRAMES = 330;

const TFDT = [0, 7680, 15360, 23040] as const;
/** 청크 i 가 차기 시작하는 프레임과 완성되는 프레임. */
const CHUNK = TFDT.map((_, i) => ({ from: 24 + i * 52, done: 24 + (i + 1) * 52 })) as readonly { from: number; done: number }[];
const SEGMENT_DONE = CHUNK[3].done + 8;
const FADE = 12;

type Layout = {
  readonly file: { readonly x: number; readonly y: number; readonly w: number; readonly rowH: number; readonly gap: number; readonly stypH: number };
  readonly fileLabel: { readonly x: number; readonly y: number };
  readonly list: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly row: number; readonly textX: number; readonly top: number };
  readonly listLabel: { readonly x: number; readonly y: number };
  readonly moofW: number;
  readonly text: { readonly label: number; readonly box: number; readonly code: number; readonly tag: number };
  readonly done: { readonly x: number; readonly y: number };
  readonly copy: { readonly file: string; readonly list: string; readonly chunk: (i: number) => string; readonly done: string };
};

const DESKTOP: Layout = {
  file: { x: 120, y: 200, w: 760, rowH: 150, gap: 18, stypH: 70 },
  fileLabel: { x: 120, y: 110 },
  list: { x: 980, y: 200, w: 840, h: 760, row: 80, textX: 1020, top: 240 },
  listLabel: { x: 980, y: 110 },
  moofW: 170,
  text: { label: TEXT.label, box: TEXT.small, code: TEXT.small, tag: TEXT.small },
  done: { x: 980, y: 990 },
  copy: {
    file: "seg-1.m4s (2초 조각)",
    list: "LL-HLS 미디어 목록",
    chunk: (i) => `청크 ${i + 1} · tfdt ${TFDT[i]}`,
    done: "조각 완성 → EXTINF",
  },
};

const MOBILE: Layout = {
  file: { x: 40, y: 110, w: 1000, rowH: 120, gap: 12, stypH: 64 },
  fileLabel: { x: 40, y: 30 },
  list: { x: 40, y: 800, w: 1000, h: 520, row: 76, textX: 70, top: 830 },
  listLabel: { x: 40, y: 730 },
  moofW: 170,
  text: { label: MOBILE_TEXT.label, box: MOBILE_TEXT.small, code: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
  done: { x: 560, y: 724 },
  copy: {
    file: "seg-1.m4s · 2초",
    list: "LL-HLS 목록",
    chunk: (i) => `tfdt ${TFDT[i]}`,
    done: "EXTINF 붙음",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const Code: React.FC<{ readonly children: React.ReactNode; readonly x: number; readonly y: number; readonly size: number; readonly color?: string; readonly opacity?: number }> = ({
  children, x, y, size, color = COLOR.ink, opacity = 1,
}) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: MONO, fontSize: size, fontWeight: 600, color, opacity, whiteSpace: "pre" }}>{children}</div>
);

const BoxCell: React.FC<{ readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly label: string; readonly size: number; readonly tone: "ink" | "accent" | "muted"; readonly opacity: number }> = ({
  x, y, w, h, label, size, tone, opacity,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 12,
      boxSizing: "border-box",
      border: `4px solid ${tone === "accent" ? COLOR.accent : tone === "muted" ? COLOR.muted : COLOR.ink}`,
      background: tone === "accent" ? COLOR.accentSoft : tone === "muted" ? COLOR.surface : COLOR.white,
      color: tone === "accent" ? COLOR.accent : tone === "muted" ? COLOR.muted : COLOR.ink,
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 720,
      opacity,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </div>
);

export const ChunkedSegment: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 14);
  const segDone = progress(frame, SEGMENT_DONE, FADE);
  const rowTop = (i: number): number => l.file.y + l.file.stypH + l.file.gap + i * (l.file.rowH + l.file.gap);
  const mdatW = l.file.w - l.moofW - 12;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={l.fileLabel.x} y={l.fileLabel.y} size={l.text.label} weight={760} opacity={intro}>
        {l.copy.file}
      </Label>
      <BoxCell x={l.file.x} y={l.file.y} w={l.file.w} h={l.file.stypH} label="styp" size={l.text.box} tone="muted" opacity={intro} />

      {CHUNK.map((c, i) => {
        const appear = progress(frame, c.from, 10);
        const done = frame >= c.done;
        const fill = Math.min(1, Math.max(0, (frame - c.from) / (c.done - c.from)));
        const latest = done && (i === CHUNK.length - 1 || frame < CHUNK[i + 1].done);
        const tone = latest && frame < SEGMENT_DONE + 40 ? "accent" : "ink";
        const y = rowTop(i);
        if (appear <= 0) return null;
        return (
          <div key={TFDT[i]}>
            <BoxCell x={l.file.x} y={y} w={l.moofW} h={l.file.rowH} label="moof" size={l.text.box} tone={done ? tone : "muted"} opacity={appear} />
            <div
              style={{
                position: "absolute",
                left: l.file.x + l.moofW + 12,
                top: y,
                width: mdatW,
                height: l.file.rowH,
                borderRadius: 12,
                boxSizing: "border-box",
                border: `4px ${done ? "solid" : "dashed"} ${done ? (tone === "accent" ? COLOR.accent : COLOR.ink) : COLOR.muted}`,
                overflow: "hidden",
                opacity: appear,
              }}
            >
              <div style={{ width: `${fill * 100}%`, height: "100%", background: done ? (tone === "accent" ? COLOR.accentSoft : COLOR.white) : COLOR.line }} />
            </div>
            <Label x={l.file.x + l.moofW + 40} y={y + l.file.rowH / 2 - l.text.box * 0.62} size={l.text.box} weight={700} color={done ? COLOR.ink : COLOR.muted} opacity={appear}>
              {`mdat · ${l.copy.chunk(i)}`}
            </Label>
          </div>
        );
      })}

      <Label x={l.listLabel.x} y={l.listLabel.y} size={l.text.label} weight={760} opacity={intro}>
        {l.copy.list}
      </Label>
      <div
        style={{
          position: "absolute",
          left: l.list.x,
          top: l.list.y,
          width: l.list.w,
          height: l.list.h,
          borderRadius: 20,
          background: COLOR.surface,
          border: `4px solid ${COLOR.line}`,
          boxSizing: "border-box",
          opacity: intro,
        }}
      />
      {CHUNK.map((c, i) => {
        const shown = progress(frame, c.done, FADE);
        return shown > 0 ? (
          <Code key={c.done} x={l.list.textX} y={l.list.top + i * l.list.row} size={l.text.code} color={COLOR.ink} opacity={shown}>
            {"#EXT-X-PART:DURATION=0.5"}
          </Code>
        ) : null;
      })}
      <Code x={l.list.textX} y={l.list.top + 4 * l.list.row} size={l.text.code} color={COLOR.accent} opacity={segDone}>
        {"#EXTINF:2.000,"}
      </Code>
      <Code x={l.list.textX} y={l.list.top + 5 * l.list.row} size={l.text.code} color={COLOR.accent} opacity={segDone}>
        {"seg-1.m4s"}
      </Code>
      <Tag x={l.done.x} y={l.done.y} tone="accent" size={l.text.tag} opacity={segDone}>
        {l.copy.done}
      </Tag>
    </AbsoluteFill>
  );
};
