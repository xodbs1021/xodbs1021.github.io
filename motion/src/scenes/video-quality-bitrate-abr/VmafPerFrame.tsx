// 콘티: _workspace/blog/video-quality-bitrate-abr/storyboard.md 「VmafPerFrame」
// Sintel 예고편 전체(1,253프레임)를 라이브식 CBR 2,500kbps로 인코딩한 결과의 화면별 VMAF(실측값 그대로, perFrameData.ts).
// 선이 왼쪽에서 오른쪽으로 그려지는 동안 평균선(93.4)은 처음부터 있고, 12.5–12.9초 결이 많은 장면에서 선이
// 77.1까지 내려간다. 다 그린 뒤 하위 1%선(79.4)이 나타나 평균과 14점 벌어진 것을 보여 준다.
// layout="mobile" 은 1080×1350 휴대폰판(VmafPerFrameMobile) — 같은 그래프를 세로로 키운다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";
import { VMAF_FPS, VMAF_MEAN, VMAF_MIN, VMAF_P1, VMAF_PER_FRAME } from "./perFrameData";

export const VMAF_PER_FRAME_FRAMES = 360;

const DRAW = { start: 18, len: 252 } as const; // 선을 그리는 구간(프레임)
const P1_IN = DRAW.start + DRAW.len + 6;
const GAP_IN = P1_IN + 22;
const Y_MIN = 70;
const Y_MAX = 100;
const N = VMAF_PER_FRAME.length;

type Layout = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly title: readonly string[];
  readonly titleX: number;
  readonly titleY: number;
  readonly p1LabelX: number;
  /** 평균 라벨의 위쪽 좌표. 데스크톱은 평균선 바로 위, 휴대폰판은 그래프 위 오른쪽(선 근처에 자료가 몰려 있음). */
  readonly meanLabelY: (yMean: number, size: number) => number;
  readonly gapX: number;
  readonly text: { readonly title: number; readonly label: number; readonly small: number };
};

const DESKTOP: Layout = {
  left: 230, right: 1780, top: 210, bottom: 900,
  title: ["화면별 VMAF · Sintel 예고편 52초 · CBR 2,500kbps"], titleX: 120, titleY: 70,
  p1LabelX: 1000, gapX: 1730,
  meanLabelY: (yMean, size) => yMean - size * 1.45,
  text: { title: TEXT.label, label: TEXT.label, small: TEXT.small },
};

const MOBILE: Layout = {
  left: 170, right: 1010, top: 330, bottom: 1180,
  title: ["화면별 VMAF", "Sintel 52초 · CBR 2,500kbps"], titleX: 60, titleY: 70,
  p1LabelX: 470, gapX: 975,
  meanLabelY: () => 245,
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const VmafPerFrame: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const t = l.text;
  const sx = (i: number) => l.left + ((l.right - l.left) * i) / (N - 1);
  const sy = (v: number) => l.bottom - ((l.bottom - l.top) * (v - Y_MIN)) / (Y_MAX - Y_MIN);

  const intro = progress(frame, 0, 14);
  const drawn = Math.max(1, Math.round(progress(frame, DRAW.start, DRAW.len, EASE_IN_OUT) * N));
  const points = VMAF_PER_FRAME.slice(0, drawn)
    .map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`)
    .join(" ");
  const dipOn = drawn > VMAF_MIN.frame + 6 ? Math.min(1, (drawn - VMAF_MIN.frame - 6) / 40) : 0;
  const p1On = progress(frame, P1_IN, 16);
  const gapOn = progress(frame, GAP_IN, 16);

  const yMean = sy(VMAF_MEAN);
  const yP1 = sy(VMAF_P1);
  const xMin = sx(VMAF_MIN.frame);
  const yMinPt = sy(VMAF_MIN.value);
  const yTicks = [70, 80, 90, 100];
  const xTicks = [0, 10, 20, 30, 40, 50];

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {l.title.map((line, i) => (
        <Label
          key={line}
          x={l.titleX}
          y={l.titleY + i * t.title * 1.3}
          size={i === 0 ? t.title : t.small}
          weight={i === 0 ? 760 : 600}
          color={i === 0 ? COLOR.ink : COLOR.muted}
          opacity={intro}
        >
          {line}
        </Label>
      ))}

      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: intro }}>
        {yTicks.map((v) => (
          <line key={v} x1={l.left} x2={l.right} y1={sy(v)} y2={sy(v)} stroke={COLOR.line} strokeWidth={2} />
        ))}
        <line x1={l.left} x2={l.right} y1={yMean} y2={yMean} stroke={COLOR.muted} strokeWidth={4} strokeDasharray="18 12" />
        <line x1={l.left} x2={l.right} y1={yP1} y2={yP1} stroke={COLOR.accent} strokeWidth={5} strokeDasharray="18 12" opacity={p1On} />
        <polyline points={points} fill="none" stroke={COLOR.ink} strokeWidth={3} strokeLinejoin="round" />
        <circle cx={xMin} cy={yMinPt} r={16} fill="none" stroke={COLOR.accent} strokeWidth={5} opacity={dipOn} />
        <g opacity={gapOn} stroke={COLOR.accent} strokeWidth={5}>
          <line x1={l.gapX} x2={l.gapX} y1={yMean + 4} y2={yP1 - 4} />
          <line x1={l.gapX - 16} x2={l.gapX + 16} y1={yMean + 4} y2={yMean + 4} />
          <line x1={l.gapX - 16} x2={l.gapX + 16} y1={yP1 - 4} y2={yP1 - 4} />
        </g>
      </svg>

      {yTicks.filter((v) => v > Y_MIN).map((v) => (
        <Label key={v} x={l.left - 20} y={sy(v) - t.small * 0.62} size={t.small} color={COLOR.muted} weight={600} anchor="right" opacity={intro}>
          {v}
        </Label>
      ))}
      {xTicks.map((s) => (
        <Label key={s} x={sx(s * VMAF_FPS)} y={l.bottom + 14} size={t.small} color={COLOR.muted} weight={600} anchor="center" opacity={intro}>
          {s === 50 ? "50초" : `${s}`}
        </Label>
      ))}

      <Label x={l.right} y={l.meanLabelY(yMean, t.label)} size={t.label} color={COLOR.muted} weight={760} anchor="right" opacity={intro}>
        {`평균 ${VMAF_MEAN}`}
      </Label>
      <Label x={l.p1LabelX} y={yP1 + 10} size={t.label} color={COLOR.accent} weight={780} opacity={p1On}>
        {`하위 1% ${VMAF_P1}`}
      </Label>
      <Tag x={xMin} y={yMinPt + 30} anchor="center" tone="accent" size={t.small} opacity={dipOn}>
        {`${(VMAF_MIN.frame / VMAF_FPS).toFixed(1)}초 ${VMAF_MIN.value}`}
      </Tag>
      <Label x={l.gapX - 28} y={(yMean + yP1) / 2 - t.label * 0.62} size={t.label} color={COLOR.accent} weight={800} anchor="right" opacity={gapOn}>
        {`${(VMAF_MEAN - VMAF_P1).toFixed(0)}점 차이`}
      </Label>
    </AbsoluteFill>
  );
};
