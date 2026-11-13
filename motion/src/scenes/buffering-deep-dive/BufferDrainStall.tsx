// 콘티: _workspace/blog/buffering-deep-dive/storyboard.md 「BufferDrainStall」
// 실측 재구성: _workspace/blog/buffering-deep-dive/measure/vod-mbs0-mbl10.json
// (hls.js 1.7.4, maxBufferLength 10 · maxBufferSize 0, Chrome 157 CDP 망 흉내 45초 8→1.5Mbps, 75초 1.5→8Mbps)
// 40–90초 구간을 0.5초 간격으로 뽑아(250ms 표본 중 가장 가까운 값) 50초를 10초로 압축해 그린다(시간 압축 → kind 재구성).
// 받는 속도가 떨어지면 버퍼(재생 위치 앞 초)가 1.66초까지 줄고, 다음 조각 변형(loadLevel)이 1080p → 720p → 360p로 내려간 뒤 버퍼가 다시 10초 근처로 찬다.
// 이 시험에서는 멈춤(버퍼 0)이 없었다 — 장면도 멈춤을 그리지 않는다.
// layout="mobile" 은 1080×1350 휴대폰판(BufferDrainStallMobile) — 그래프 위, 막대 · 변형 아래.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const BUFFER_DRAIN_STALL_FRAMES = 360;

const T0 = 40; // 측정 시각(초) 시작
const STEP = 0.5; // 표본 간격(초)
const DRAW_START = 20; // 그리기 시작 프레임
const FRAMES_PER_SAMPLE = 3; // 0.5초 → 3프레임(0.1초): 5배 압축
const NET_DROP = 45;
const NET_BACK = 75;

// 재생 위치 앞 버퍼(초), vod-mbs0-mbl10.json t=40.0–90.0, 0.5초 간격 101개
const BUF: readonly number[] = [
  11.16, 10.66, 10.16, 11.66, 11.16, 10.66, 10.16, 9.66, 9.16, 8.66, 8.16, 7.66, 7.16, 6.66, 8.16, 7.66, 7.16, 6.66, 6.16,
  5.66, 5.16, 4.66, 4.16, 3.66, 3.16, 2.66, 4.16, 3.66, 3.16, 2.66, 2.16, 1.66, 3.16, 4.66, 4.16, 7.66, 7.16, 8.66, 8.16,
  9.66, 9.16, 10.66, 10.16, 9.66, 11.16, 10.66, 10.16, 9.66, 11.16, 10.66, 10.16, 9.66, 9.16, 10.66, 10.16, 9.66, 9.16,
  10.66, 10.16, 9.66, 9.16, 10.66, 10.16, 9.66, 9.16, 10.66, 10.16, 11.66, 11.16, 10.66, 10.16, 11.66, 11.16, 10.66,
  10.16, 11.66, 11.16, 10.66, 10.16, 9.66, 11.16, 10.66, 10.16, 9.66, 11.16, 10.66, 10.16, 9.66, 11.16, 10.66, 10.16,
  11.66, 11.16, 10.66, 10.16, 11.66, 11.16, 10.66, 10.16, 11.66, 11.16,
];
// 다음 조각을 받을 변형(hls.loadLevel): 0 = 360p 0.72M, 1 = 720p 2.28M, 2 = 1080p 4.54M
const LVL: readonly number[] = [
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];
const VARIANTS = [
  { name: "360p", rate: "0.72M" },
  { name: "720p", rate: "2.28M" },
  { name: "1080p", rate: "4.54M" },
] as const;
const Y_MAX = 12;
const MIN_INDEX = 31; // 1.66초(t=55.5)

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Layout = {
  readonly chart: Box;
  readonly bar: Box;
  readonly variants: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly gap: number };
  readonly net: { readonly x: number; readonly y: number };
  readonly row: boolean;
  readonly text: { readonly label: number; readonly small: number };
};

const DESKTOP: Layout = {
  chart: { x: 190, y: 250, w: 1060, h: 580 },
  bar: { x: 1390, y: 250, w: 130, h: 580 },
  variants: { x: 1600, y: 320, w: 230, h: 140, gap: 30 },
  net: { x: 190, y: 90 },
  row: false,
  text: { label: TEXT.label, small: TEXT.small },
};
const MOBILE: Layout = {
  chart: { x: 140, y: 250, w: 870, h: 450 },
  bar: { x: 140, y: 880, w: 120, h: 340 },
  variants: { x: 330, y: 880, w: 680, h: 100, gap: 20 },
  net: { x: 60, y: 80 },
  row: true,
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};
const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const tAt = (i: number) => T0 + i * STEP;

export const BufferDrainStall: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const { chart } = l;
  const last = BUF.length - 1;
  const idx = Math.max(0, Math.min(last, (frame - DRAW_START) / FRAMES_PER_SAMPLE));
  const i0 = Math.floor(idx);
  const i1 = Math.min(last, i0 + 1);
  const buf = i1 === i0 ? BUF[i0] : interpolate(idx, [i0, i1], [BUF[i0], BUF[i1]]);
  const lvl = LVL[i0];
  const now = tAt(idx);
  const slow = now >= NET_DROP && now < NET_BACK;
  const intro = progress(frame, 0, 16);

  const px = (i: number) => chart.x + (i / last) * chart.w;
  const py = (v: number) => chart.y + chart.h - (v / Y_MAX) * chart.h;
  const pts = BUF.slice(0, i0 + 1).map((v, i) => `${px(i)},${py(v)}`);
  pts.push(`${px(idx)},${py(buf)}`);
  const bandX0 = px((NET_DROP - T0) / STEP);
  const bandX1 = px((NET_BACK - T0) / STEP);
  const minOn = progress(frame, DRAW_START + MIN_INDEX * FRAMES_PER_SAMPLE, 10);
  const ticks = [0, 4, 8, 12];

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT, opacity: intro }}>
      <Tag x={l.net.x} y={l.net.y} tone={slow ? "danger" : "ink"} size={l.text.label}>
        {slow ? "받는 속도 1.5 Mbps" : "받는 속도 8 Mbps"}
      </Tag>

      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <rect x={bandX0} y={chart.y} width={bandX1 - bandX0} height={chart.h} fill={COLOR.dangerSoft} />
        {ticks.map((v) => (
          <line key={v} x1={chart.x} x2={chart.x + chart.w} y1={py(v)} y2={py(v)} stroke={COLOR.line} strokeWidth={2} />
        ))}
        <polyline points={pts.join(" ")} fill="none" stroke={COLOR.accent} strokeWidth={7} strokeLinejoin="round" />
        <circle cx={px(idx)} cy={py(buf)} r={12} fill={COLOR.accent} />
        <circle cx={px(MIN_INDEX)} cy={py(BUF[MIN_INDEX])} r={16} fill="none" stroke={COLOR.ink} strokeWidth={4} opacity={minOn} />
      </svg>
      {ticks.map((v) => (
        <Label key={v} x={chart.x - 24} y={py(v) - l.text.small * 0.62} size={l.text.small} color={COLOR.muted} anchor="right">
          {v}
        </Label>
      ))}
      <Label x={chart.x} y={chart.y - l.text.small * 1.7} size={l.text.small} color={COLOR.muted}>
        버퍼(초)
      </Label>
      <Label x={(bandX0 + bandX1) / 2} y={chart.y - l.text.small * 1.7} size={l.text.small} color={COLOR.danger} weight={720} anchor="center">
        1.5 Mbps 구간
      </Label>
      <Label x={chart.x} y={chart.y + chart.h + 14} size={l.text.small} color={COLOR.muted}>
        40초
      </Label>
      <Label x={chart.x + chart.w} y={chart.y + chart.h + 14} size={l.text.small} color={COLOR.muted} anchor="right">
        90초
      </Label>
      <Label x={px(MIN_INDEX) + 30} y={py(BUF[MIN_INDEX]) - l.text.small * 0.4} size={l.text.small} weight={760} opacity={minOn}>
        최저 1.66초
      </Label>

      {/* 버퍼 막대 */}
      <div
        style={{
          position: "absolute", left: l.bar.x, top: l.bar.y, width: l.bar.w, height: l.bar.h, boxSizing: "border-box",
          border: `5px solid ${COLOR.ink}`, borderRadius: 18, overflow: "hidden", background: COLOR.white,
        }}
      >
        <div
          style={{
            position: "absolute", left: 0, right: 0, bottom: 0, height: `${(buf / Y_MAX) * 100}%`,
            background: buf < 3 ? COLOR.danger : COLOR.accent,
          }}
        />
      </div>
      <Label x={l.bar.x + l.bar.w / 2} y={l.bar.y + l.bar.h + 12} size={l.text.label} weight={760} anchor="center">
        {`${buf.toFixed(1)}초`}
      </Label>

      {/* 다음 조각 변형 */}
      <Label x={l.variants.x + l.variants.w / 2} y={l.variants.y - l.text.small * 1.6} size={l.text.small} color={COLOR.muted} anchor="center">
        다음 조각
      </Label>
      {[2, 1, 0].map((v, k) => {
        const on = v === lvl;
        const y = l.variants.y + k * (l.variants.h + l.variants.gap);
        return (
          <div
            key={v}
            style={{
              position: "absolute", left: l.variants.x, top: y, width: l.variants.w, height: l.variants.h, boxSizing: "border-box",
              border: `${on ? 7 : 4}px solid ${on ? COLOR.accent : COLOR.line}`, borderRadius: 18,
              background: on ? COLOR.accentSoft : COLOR.white, display: "flex", flexDirection: l.row ? "row" : "column",
              alignItems: "center", justifyContent: "center", gap: l.row ? 28 : 0, lineHeight: 1.15,
              color: on ? COLOR.ink : COLOR.muted,
            }}
          >
            <div style={{ fontSize: l.text.label, fontWeight: 780 }}>{VARIANTS[v].name}</div>
            <div style={{ fontSize: l.text.small, fontWeight: 600 }}>{VARIANTS[v].rate}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
