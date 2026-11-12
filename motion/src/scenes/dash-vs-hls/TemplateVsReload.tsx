// 콘티: _workspace/blog/dash-vs-hls/storyboard.md 「영상 1」
// 같은 2초 조각(13 · 14번)이 만들어질 때, HLS 플레이어는 목록을 다시 받아 새 조각 줄을 확인한 뒤 그 조각을 요청하고,
// DASH 플레이어는 MPD 의 SegmentTemplate 규칙과 시계로 번호를 계산해 바로 요청한다(DASH-IF Timing Model 13.3 · 13.6.2).
// 시각 · 번호는 설명용(startNumber 1, 2초 조각: t=26초 → 13번, t=28초 → 14번). 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(TemplateVsReloadMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, SegmentCell, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const TEMPLATE_VS_RELOAD_FRAMES = 330;

/** 조각이 완성되는 프레임(13번, 14번). */
const CYCLES = [
  { seg: 13, t: 26, at: 40 },
  { seg: 14, t: 28, at: 170 },
] as const;
const FADE = 12;

type Chip = { readonly text: string; readonly at: number; readonly local: boolean };

const hlsChips = (mobile: boolean): readonly Chip[] =>
  CYCLES.flatMap((c) => [
    { text: mobile ? "목록 다시 받기" : "목록 다시 받기 → 새 줄 확인", at: c.at + 10, local: false },
    { text: mobile ? `seg${c.seg} 받기` : `GET seg${c.seg}.m4s`, at: c.at + 44, local: false },
  ]);

const dashChips = (mobile: boolean): readonly Chip[] =>
  CYCLES.flatMap((c) => [
    { text: mobile ? `t=${c.t}초 → ${c.seg}번` : `시계 t=${c.t}초 → ${c.seg}번 계산`, at: c.at + 10, local: true },
    { text: mobile ? `seg-${c.seg} 받기` : `GET seg-${c.seg}.m4s`, at: c.at + 24, local: false },
  ]);

type Layout = {
  readonly strip: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly gap: number };
  readonly cols: readonly { readonly x: number; readonly w: number }[];
  readonly titleY: number;
  readonly chipY0: number;
  readonly chipH: number;
  readonly chipGap: number;
  readonly countY: number;
  readonly text: { readonly title: number; readonly chip: number; readonly cell: number };
  readonly titles: readonly string[];
};

const DESKTOP: Layout = {
  strip: { x: 420, y: 50, w: 340, h: 100, gap: 20 },
  cols: [
    { x: 120, w: 800 },
    { x: 1000, w: 800 },
  ],
  titleY: 210,
  chipY0: 300,
  chipH: 100,
  chipGap: 28,
  countY: 840,
  text: { title: TEXT.label, chip: TEXT.small, cell: TEXT.small },
  titles: ["HLS · 목록을 다시 받아 앎", "DASH · 규칙과 시계로 셈"],
};

const MOBILE: Layout = {
  strip: { x: 60, y: 40, w: 300, h: 110, gap: 30 },
  cols: [
    { x: 30, w: 500 },
    { x: 550, w: 500 },
  ],
  titleY: 210,
  chipY0: 330,
  chipH: 150,
  chipGap: 40,
  countY: 1110,
  text: { title: MOBILE_TEXT.label, chip: MOBILE_TEXT.small, cell: MOBILE_TEXT.small },
  titles: ["HLS", "DASH"],
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const ChipBox: React.FC<{ readonly chip: Chip; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly size: number; readonly frame: number }> = ({
  chip, x, y, w, h, size, frame,
}) => {
  const a = progress(frame, chip.at, FADE);
  if (a <= 0) return null;
  const fresh = 1 - progress(frame, chip.at + 30, 30);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + (1 - a) * 24,
        width: w,
        height: h,
        borderRadius: 16,
        boxSizing: "border-box",
        border: `4px ${chip.local ? "dashed" : "solid"} ${chip.local ? COLOR.muted : COLOR.ink}`,
        background: chip.local ? COLOR.surface : fresh > 0.05 ? COLOR.accentSoft : COLOR.white,
        color: chip.local ? COLOR.muted : COLOR.ink,
        display: "grid",
        placeItems: "center",
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 720,
        whiteSpace: "nowrap",
        opacity: a,
      }}
    >
      {chip.text}
    </div>
  );
};

export const TemplateVsReload: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const mobile = layout === "mobile";
  const intro = progress(frame, 0, 14);
  const lanes = [hlsChips(mobile), dashChips(mobile)];
  const requests = lanes.map((chips) => chips.filter((c) => !c.local && frame >= c.at).length);
  const segs = [12, 13, 14] as const;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {segs.map((n, i) => {
        const cycle = CYCLES.find((c) => c.seg === n);
        const ready = cycle === undefined || frame >= cycle.at;
        const pulse = cycle === undefined ? 0 : progress(frame, cycle.at, 10) * (1 - progress(frame, cycle.at + 40, 20));
        return (
          <SegmentCell
            key={n}
            x={l.strip.x + i * (l.strip.w + l.strip.gap)}
            y={l.strip.y}
            width={l.strip.w}
            height={l.strip.h}
            state={ready ? "live" : "gone"}
            label={`${n}번`}
            size={l.text.cell}
            opacity={intro}
            scale={1 + 0.06 * pulse}
          />
        );
      })}

      {l.cols.map((col, ci) => (
        <div key={col.x}>
          <Label x={col.x} y={l.titleY} size={l.text.title} weight={780} color={ci === 0 ? COLOR.ink : COLOR.accent} opacity={intro}>
            {l.titles[ci]}
          </Label>
          {lanes[ci].map((chip, k) => (
            <ChipBox key={chip.text} chip={chip} x={col.x} y={l.chipY0 + k * (l.chipH + l.chipGap)} w={col.w} h={l.chipH} size={l.text.chip} frame={frame} />
          ))}
          <Tag x={col.x} y={l.countY} tone={ci === 0 ? "ink" : "accent"} size={l.text.chip} opacity={intro}>
            {`네트워크 요청 ${requests[ci]}번`}
          </Tag>
        </div>
      ))}
    </AbsoluteFill>
  );
};
