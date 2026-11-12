// 콘티: _workspace/blog/x264-live-rate-control-gop/storyboard.md 「영상 1」
// 같은 10초 영상(maxrate 3,000kbps)을 bufsize 750k(위) · 6,000k(아래)로 인코딩해 0.25초마다 실린 비트를 시간순으로 쌓는다.
// 3,000 선을 넘은 막대만 강조색, 각 줄의 최댓값(4,316 · 5,605)이 나오면 이름표를 띄운다. 오른쪽 막대는 VBV 버퍼 수위 계산값.
// 숫자는 모두 글의 실측(_workspace/blog/x264-live-rate-control-gop/measure/b4-*)과 같다. 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(VbvBufferMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const VBV_BUFFER_FRAMES = 330;

/** 0.25초(6프레임) 창의 kbps와 그 창 첫 프레임 직후의 버퍼 수위 — measure/b4-vbv-series.json. */
const RUNS = [
  {
    name: "bufsize 750k",
    peak: 4316,
    kbps: [2614, 2192, 2436, 2414, 2363, 2179, 1039, 1988, 4316, 2971, 3226, 2962, 2408, 2774, 2599, 2919, 3163, 2834, 2508, 2750, 2618, 2764, 3028, 2999, 3055, 3151, 3464, 2764, 3202, 3264, 2079, 2402, 41, 3030, 4299, 3190, 2682, 2155, 2636, 4312],
    level: [0.735, 0.902, 0.869, 0.862, 0.89, 0.904, 0.863, 0.998, 0.555, 0.2, 0.236, 0.178, 0.24, 0.378, 0.482, 0.598, 0.374, 0.575, 0.641, 0.789, 0.856, 0.856, 0.845, 0.795, 0.667, 0.798, 0.699, 0.578, 0.678, 0.56, 0.573, 0.86, 0.993, 0.999, 0.587, 0.198, 0.152, 0.326, 0.583, 0.664],
  },
  {
    name: "bufsize 6,000k",
    peak: 5605,
    kbps: [3093, 2242, 2483, 2267, 2113, 2114, 1019, 1827, 5481, 5276, 5605, 5572, 3579, 3858, 3416, 3555, 3929, 2987, 2762, 2754, 2662, 2814, 3137, 3047, 3047, 3094, 3401, 2851, 3214, 3232, 2020, 2155, 40, 2208, 3686, 3995, 4098, 2358, 2744, 4607],
    level: [0.853, 0.899, 0.935, 0.953, 0.99, 0.988, 0.983, 1.0, 0.928, 0.843, 0.753, 0.641, 0.547, 0.521, 0.489, 0.472, 0.397, 0.414, 0.414, 0.423, 0.436, 0.449, 0.454, 0.447, 0.43, 0.447, 0.437, 0.424, 0.432, 0.417, 0.421, 0.459, 0.508, 0.632, 0.641, 0.61, 0.564, 0.534, 0.559, 0.564],
  },
] as const;

const MAXRATE = 3000;
const SCALE_MAX = 7000;
const FIRST = 20;
const STEP = 7; // 막대 하나가 나오는 간격(프레임). 40개 → 300프레임에 끝나고 30프레임 멈춘다.

type Layout = {
  readonly rowTop: readonly [number, number];
  readonly chartX: number;
  readonly chartW: number;
  readonly chartH: number;
  readonly gaugeX: number;
  readonly gaugeW: number;
  readonly text: { readonly label: number; readonly small: number };
  readonly titleGap: number;
  readonly axisLabels: boolean;
  readonly legend: string;
};

const DESKTOP: Layout = {
  rowTop: [200, 670],
  chartX: 140,
  chartW: 1420,
  chartH: 290,
  gaugeX: 1660,
  gaugeW: 90,
  text: { label: TEXT.label, small: TEXT.small },
  titleGap: 110,
  axisLabels: true,
  legend: "점선 = maxrate 3,000",
};

const MOBILE: Layout = {
  rowTop: [220, 830],
  chartX: 50,
  chartW: 820,
  chartH: 380,
  gaugeX: 930,
  gaugeW: 100,
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
  titleGap: 120,
  axisLabels: false,
  legend: "점선 3,000",
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const VbvBuffer: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 14);
  const shown = Math.max(0, Math.min(40, Math.floor((frame - FIRST) / STEP) + 1));
  const slot = l.chartW / 40;
  const barW = slot * 0.74;
  const y = (top: number, kbps: number): number => top + l.chartH - (Math.min(kbps, SCALE_MAX) / SCALE_MAX) * l.chartH;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {RUNS.map((run, r) => {
        const top = l.rowTop[r];
        const lineY = y(top, MAXRATE);
        const peakIndex = (run.kbps as readonly number[]).indexOf(run.peak);
        const peakShown = progress(frame, FIRST + peakIndex * STEP, 10);
        const level = run.level[Math.max(0, shown - 1)];
        return (
          <div key={run.name}>
            <Label x={l.chartX} y={top - l.titleGap} size={l.text.label} weight={760} opacity={intro}>
              {run.name}
            </Label>
            <div style={{ position: "absolute", left: l.chartX, top: top + l.chartH, width: l.chartW, height: 3, background: COLOR.line, opacity: intro }} />
            {run.kbps.slice(0, shown).map((v, i) => {
              const barTop = y(top, v);
              const full = top + l.chartH - barTop;
              const appear = progress(frame, FIRST + i * STEP, 6);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: l.chartX + i * slot + (slot - barW) / 2,
                    top: top + l.chartH - full * appear,
                    width: barW,
                    height: full * appear,
                    background: v > MAXRATE ? COLOR.accent : COLOR.muted,
                    borderRadius: 3,
                  }}
                />
              );
            })}
            <div style={{ position: "absolute", left: l.chartX, top: lineY - 2, width: l.chartW, height: 0, borderTop: `4px dashed ${COLOR.ink}`, opacity: intro }} />
            <Label x={l.chartX + l.chartW} y={top - l.titleGap + (l.text.label - l.text.small) / 2} size={l.text.small} anchor="right" weight={700} color={COLOR.ink} opacity={intro}>
              {l.legend}
            </Label>
            <Tag
              x={l.chartX + peakIndex * slot + slot / 2}
              y={y(top, run.peak) - l.text.small * 1.9}
              tone="accent"
              size={l.text.small}
              anchor="center"
              opacity={peakShown}
            >
              {run.peak.toLocaleString("en-US")}
            </Tag>
            <div
              style={{
                position: "absolute",
                left: l.gaugeX,
                top,
                width: l.gaugeW,
                height: l.chartH,
                border: `4px solid ${COLOR.ink}`,
                borderRadius: 10,
                boxSizing: "border-box",
                overflow: "hidden",
                opacity: intro,
              }}
            >
              <div style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: `${level * 100}%`, background: COLOR.accentSoft, borderTop: `4px solid ${COLOR.accent}` }} />
            </div>
            <Label x={l.gaugeX + l.gaugeW / 2} y={top + l.chartH + 12} size={l.text.small} anchor="center" color={COLOR.muted} opacity={intro}>
              버퍼
            </Label>
            {l.axisLabels && (
              <>
                <Label x={l.chartX} y={top + l.chartH + 12} size={l.text.small} color={COLOR.muted} opacity={intro}>
                  0초
                </Label>
                <Label x={l.chartX + l.chartW} y={top + l.chartH + 12} size={l.text.small} anchor="right" color={COLOR.muted} opacity={intro}>
                  10초
                </Label>
              </>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
