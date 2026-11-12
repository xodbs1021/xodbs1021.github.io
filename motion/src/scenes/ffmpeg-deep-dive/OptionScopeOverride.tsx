// 콘티: _workspace/blog/ffmpeg-deep-dive/storyboard.md 「영상 1」
// HLS 출력 하나에 세 화질(720p · 540p · 360p)을 담는다. 왼쪽은 -b:v 를 세 번 준 경우 — 옵션이 하나씩 들어올 때마다
// 앞 값이 덮여 세 인코더의 목표가 모두 600k 가 되고, 20초 평균이 699 · 657 · 650kbps 로 모인다.
// 오른쪽은 -b:v:0 · -b:v:1 · -b:v:2 로 나눈 경우 — 값마다 제 화질로 가서 3,118 · 1,581 · 650kbps 로 갈라진다.
// 수치는 글의 FFmpeg 9.0.2 실측(_workspace/blog/ffmpeg-deep-dive/measure/a1-option-override.txt)과 같다. 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(OptionScopeOverrideMobile) — 두 칸을 위아래로 쌓는다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const OPTION_SCOPE_OVERRIDE_FRAMES = 330;

const RUNGS = ["720p", "540p", "360p"] as const;
const TARGETS = ["3000k", "1500k", "600k"] as const;
const REPEAT_KBPS = [699, 657, 650] as const;
const SPLIT_KBPS = [3118, 1581, 650] as const;
const MAX_KBPS = 3200;

/** 옵션 칩 i 가 들어오는 프레임. */
const CHIP_IN = [24, 60, 96] as const;
const TARGET_IN = 132;
const BAR_IN = 156;
const BAR_DUR = 54;
const RESULT_IN = BAR_IN + BAR_DUR;

type Side = 0 | 1;
type Panel = { readonly x: number; readonly y: number };
type Layout = {
  readonly panels: readonly [Panel, Panel];
  readonly chipY: number;
  readonly chipW: number;
  readonly chipGap: number;
  readonly rowY: number;
  readonly rowH: number;
  readonly rungW: number;
  readonly targetW: number;
  readonly barMax: number;
  readonly divider: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly result: readonly [Panel, Panel] | null;
  readonly text: { readonly title: number; readonly chip: number; readonly row: number };
  readonly copy: {
    readonly title: readonly [string, string];
    readonly chip: (side: Side, i: number) => string;
    readonly target: (side: Side, i: number) => string;
    readonly result: readonly [string, string];
  };
};

const DESKTOP: Layout = {
  panels: [
    { x: 40, y: 70 },
    { x: 960, y: 70 },
  ],
  chipY: 90,
  chipW: 292,
  chipGap: 10,
  rowY: 250,
  rowH: 190,
  rungW: 120,
  targetW: 220,
  barMax: 360,
  divider: { x: 946, y: 70, w: 4, h: 920 },
  result: [
    { x: 40, y: 900 },
    { x: 960, y: 900 },
  ],
  text: { title: TEXT.label, chip: TEXT.small, row: TEXT.small },
  copy: {
    title: ["-b:v 를 세 번", "-b:v:0 · :1 · :2 로 나눔"],
    chip: (side, i) => (side === 0 ? `-b:v ${TARGETS[i]}` : `-b:v:${i} ${TARGETS[i]}`),
    target: (side, i) => (side === 0 ? "목표 600k" : `목표 ${TARGETS[i]}`),
    result: ["앞 값이 덮여 모두 600k", "화질마다 다른 목표"],
  },
};

const MOBILE: Layout = {
  panels: [
    { x: 40, y: 30 },
    { x: 40, y: 700 },
  ],
  chipY: 86,
  chipW: 320,
  chipGap: 20,
  rowY: 210,
  rowH: 140,
  rungW: 150,
  targetW: 0,
  barMax: 560,
  divider: { x: 40, y: 668, w: 1000, h: 4 },
  result: null,
  text: { title: MOBILE_TEXT.label, chip: MOBILE_TEXT.small, row: MOBILE_TEXT.small },
  copy: {
    title: ["-b:v 세 번 → 모두 600k", "-b:v:N 으로 나눔"],
    chip: (side, i) => (side === 0 ? TARGETS[i] : `:${i} ${TARGETS[i]}`),
    target: () => "",
    result: ["", ""],
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

type ChipState = "fresh" | "live" | "gone";

const Chip: React.FC<{ readonly x: number; readonly y: number; readonly w: number; readonly size: number; readonly text: string; readonly state: ChipState; readonly opacity: number }> = ({
  x, y, w, size, text, state, opacity,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: Math.round(size * 1.9),
      boxSizing: "border-box",
      borderRadius: 14,
      border: `4px ${state === "gone" ? "dashed" : "solid"} ${state === "gone" ? COLOR.muted : COLOR.accent}`,
      background: state === "gone" ? COLOR.surface : state === "fresh" ? COLOR.accentSoft : COLOR.white,
      color: state === "gone" ? COLOR.muted : COLOR.ink,
      display: "grid",
      placeItems: "center",
      fontFamily: MONO,
      fontVariantLigatures: "none",
      fontSize: size,
      fontWeight: 650,
      textDecoration: state === "gone" ? "line-through" : "none",
      whiteSpace: "nowrap",
      opacity,
    }}
  >
    {text}
  </div>
);

export const OptionScopeOverride: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 14);
  const targetShown = progress(frame, TARGET_IN, 14);
  const bar = progress(frame, BAR_IN, BAR_DUR);
  const valueShown = progress(frame, RESULT_IN - 10, 12);
  const resultShown = progress(frame, RESULT_IN, 14);

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: l.divider.x, top: l.divider.y, width: l.divider.w, height: l.divider.h, background: COLOR.line, opacity: intro }} />
      {l.panels.map((p, index) => {
        const side = index as Side;
        const kbps = side === 0 ? REPEAT_KBPS : SPLIT_KBPS;
        const tone = side === 0 ? COLOR.danger : COLOR.accent;
        return (
          <div key={side}>
            <Label x={p.x} y={p.y} size={l.text.title} weight={760} color={tone} opacity={intro}>
              {l.copy.title[side]}
            </Label>
            {CHIP_IN.map((start, i) => {
              const shown = progress(frame, start, 12);
              if (shown <= 0) return null;
              // 왼쪽: 다음 칩이 들어오면 앞 칩은 덮인다(같은 출력이라 마지막 값만 남는다).
              const overwritten = side === 0 && i < CHIP_IN.length - 1 && frame >= CHIP_IN[i + 1];
              const state: ChipState = overwritten ? "gone" : frame < start + 30 ? "fresh" : "live";
              return (
                <Chip
                  key={TARGETS[i]}
                  x={p.x + i * (l.chipW + l.chipGap)}
                  y={p.y + l.chipY}
                  w={l.chipW}
                  size={l.text.chip}
                  text={l.copy.chip(side, i)}
                  state={state}
                  opacity={shown}
                />
              );
            })}
            {RUNGS.map((rung, i) => {
              const y = p.y + l.rowY + i * l.rowH;
              const barX = p.x + l.rungW + l.targetW;
              const width = (kbps[i] / MAX_KBPS) * l.barMax * bar;
              return (
                <div key={rung}>
                  <Label x={p.x} y={y} size={l.text.row} weight={720} opacity={intro}>
                    {rung}
                  </Label>
                  {l.targetW > 0 ? (
                    <Label x={p.x + l.rungW} y={y} size={l.text.row} weight={650} color={side === 0 ? COLOR.danger : COLOR.ink} opacity={targetShown}>
                      {l.copy.target(side, i)}
                    </Label>
                  ) : null}
                  <div
                    style={{
                      position: "absolute",
                      left: barX,
                      top: y + 6,
                      width,
                      height: Math.round(l.text.row * 1.05),
                      borderRadius: 8,
                      background: tone,
                    }}
                  />
                  <Label x={barX + width + 16} y={y} size={l.text.row} weight={760} opacity={valueShown}>
                    {`${kbps[i].toLocaleString("en-US")}kbps`}
                  </Label>
                </div>
              );
            })}
          </div>
        );
      })}
      {l.result
        ? l.result.map((p, side) => (
            <Tag key={side} x={p.x} y={p.y} tone={side === 0 ? "danger" : "accent"} size={TEXT.small} opacity={resultShown}>
              {l.copy.result[side]}
            </Tag>
          ))
        : null}
    </AbsoluteFill>
  );
};
