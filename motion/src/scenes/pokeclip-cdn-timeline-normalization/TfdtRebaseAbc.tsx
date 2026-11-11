// 콘티: _workspace/blog/pokeclip-cdn-timeline-normalization/storyboard.md 「영상 1」
// 같은 녹화 파일 10개. A · B(tfdt 그대로)는 파일마다 0 근처에 겹쳐 놓여 버퍼가 8.10초에서 끝나고
// 20초 탐색이 8.10초에 멈춘다. C(tfdt만 mtxi 위치로)는 39.87초 전체가 버퍼에 들고 20초 탐색이 선다
// (2026-08-30 실측, hls.js 1.5.15). 겹침 모양은 단순화한 개념도다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Playhead, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const TFDT_REBASE_ABC_FRAMES = 330;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤에는 1초 이상 멈춘다. */
const T = {
  intro: 0,
  files: 24,
  fileStep: 6,
  fileFrames: 24,
  buffer: 110,
  bufferFrames: 26,
  seek: 170,
  snap: 200,
  snapFrames: 14,
  result: 222,
} as const;
const FADE = 12;

const FILES = 10;
const AXIS_MAX = 40;
const FILE_SEC = 4;
/** 파일마다 mtxi 누적 DTS(0→35.776초)를 고르게 나눈 값. */
const MTXI_STEP = 35.776 / (FILES - 1);
const AB_END = 8.1;
const C_END = 39.87;
const SEEK_TO = 20;

type Row = {
  readonly labelY: number;
  readonly subY: number;
  readonly y: number;
  readonly bufY: number;
  readonly tagY: number;
};

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly labelX: number;
  readonly subX: number;
  readonly x0: number;
  readonly x1: number;
  readonly fileH: number;
  readonly bufH: number;
  readonly ab: Row;
  readonly c: Row;
  readonly axisY: number;
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
  readonly copy: {
    readonly ab: string;
    readonly abSub: string;
    readonly c: string;
    readonly cSub: string;
    readonly abStop: string;
    readonly cOk: string;
  };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "같은 파일 10개, tfdt만 바꾸면" }],
  labelX: 120,
  subX: 120,
  x0: 520,
  x1: 1800,
  fileH: 80,
  bufH: 40,
  ab: { labelY: 176, subY: 232, y: 170, bufY: 276, tagY: 340 },
  c: { labelY: 506, subY: 562, y: 500, bufY: 606, tagY: 670 },
  axisY: 780,
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
  copy: {
    ab: "A · B",
    abSub: "tfdt 그대로",
    c: "C",
    cSub: "tfdt만 바꿈",
    abStop: "20초 탐색 → 8.10초에서 멈춤",
    cOk: "20초 탐색 → 그 자리에 섬",
  },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "같은 파일 10개," },
    { y: 124, text: "tfdt만 바꾸면" },
  ],
  labelX: 60,
  subX: 240,
  x0: 60,
  x1: 1020,
  fileH: 80,
  bufH: 40,
  ab: { labelY: 214, subY: 214, y: 290, bufY: 386, tagY: 448 },
  c: { labelY: 620, subY: 620, y: 696, bufY: 792, tagY: 854 },
  axisY: 990,
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  copy: {
    ab: "A · B",
    abSub: "tfdt 그대로",
    c: "C",
    cSub: "tfdt만 바꿈",
    abStop: "20초 탐색 → 8.10초",
    cOk: "20초 탐색 → 20초",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type BarProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly fill: string;
  readonly border: string;
  readonly opacity?: number;
};

const Bar: React.FC<BarProps> = ({ x, y, w, h, fill, border, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 12,
      background: fill,
      border: `4px solid ${border}`,
      boxSizing: "border-box",
      opacity,
    }}
  />
);

export const TfdtRebaseAbc: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;

  const pxPerSec = (l.x1 - l.x0) / AXIS_MAX;
  const atSec = (s: number) => l.x0 + s * pxPerSec;
  const fileW = FILE_SEC * pxPerSec;
  const abSpread = AB_END * pxPerSec - fileW;

  const intro = progress(frame, T.intro, 15);
  const buffer = progress(frame, T.buffer, T.bufferFrames, EASE_IN_OUT);
  const seek = progress(frame, T.seek, FADE);
  const snap = progress(frame, T.snap, T.snapFrames, EASE_IN_OUT);
  const result = progress(frame, T.result, FADE);

  const startX = l.x1 - fileW;
  const abHeadX = interpolate(snap, [0, 1], [atSec(SEEK_TO), atSec(AB_END)]);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.labelX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 행 이름. */}
      <Label x={l.labelX} y={l.ab.labelY} size={l.text.label} weight={760} opacity={intro}>
        {c.ab}
      </Label>
      <Label x={l.subX} y={l.ab.subY} size={l.text.tag} color={COLOR.muted} weight={650} opacity={intro}>
        {c.abSub}
      </Label>
      <Label x={l.labelX} y={l.c.labelY} size={l.text.label} weight={760} opacity={intro}>
        {c.c}
      </Label>
      <Label x={l.subX} y={l.c.subY} size={l.text.tag} color={COLOR.muted} weight={650} opacity={intro}>
        {c.cSub}
      </Label>

      {/* 파일 10개: 위 줄은 0 근처에 겹치고, 아래 줄은 mtxi 위치로 밀린다. */}
      {Array.from({ length: FILES }, (_, i) => {
        const p = progress(frame, T.files + i * T.fileStep, T.fileFrames, EASE_IN_OUT);
        const abX = interpolate(p, [0, 1], [startX, l.x0 + (abSpread * i) / (FILES - 1)]);
        const cX = interpolate(p, [0, 1], [startX, atSec(i * MTXI_STEP)]);
        const shown = p > 0 ? 1 : 0;
        return (
          <div key={i}>
            <Bar x={abX} y={l.ab.y} w={fileW} h={l.fileH} fill={COLOR.surface} border={COLOR.muted} opacity={0.7 * shown} />
            <Bar x={cX} y={l.c.y} w={fileW - 4} h={l.fileH} fill={COLOR.accentSoft} border={COLOR.accent} opacity={shown} />
          </div>
        );
      })}

      {/* 버퍼. */}
      <Bar
        x={l.x0}
        y={l.ab.bufY}
        w={Math.max(0, AB_END * pxPerSec * buffer)}
        h={l.bufH}
        fill={COLOR.dangerSoft}
        border={COLOR.danger}
        opacity={buffer > 0 ? 1 : 0}
      />
      <Label x={atSec(AB_END) + 18} y={l.ab.bufY - 4} size={l.text.tag} color={COLOR.danger} weight={760} opacity={buffer >= 1 ? 1 : 0}>
        8.10초
      </Label>
      <Bar
        x={l.x0}
        y={l.c.bufY}
        w={Math.max(0, C_END * pxPerSec * buffer)}
        h={l.bufH}
        fill={COLOR.accentSoft}
        border={COLOR.accent}
        opacity={buffer > 0 ? 1 : 0}
      />
      <Label x={atSec(C_END)} y={l.c.tagY} size={l.text.tag} color={COLOR.accent} weight={760} opacity={buffer >= 1 ? 1 : 0} anchor="right">
        39.87초
      </Label>

      {/* 20초 탐색. */}
      <Playhead x={abHeadX} top={l.ab.y - 20} height={l.ab.bufY + l.bufH - l.ab.y + 30} color={snap > 0 ? COLOR.danger : COLOR.ink} opacity={seek} />
      <Tag x={l.x0} y={l.ab.tagY} tone="danger" size={l.text.tag} opacity={result}>
        {c.abStop}
      </Tag>
      <Playhead x={atSec(SEEK_TO)} top={l.c.y - 20} height={l.c.bufY + l.bufH - l.c.y + 30} color={snap > 0 ? COLOR.accent : COLOR.ink} opacity={seek} />
      <Tag x={l.x0} y={l.c.tagY} tone="accent" size={l.text.tag} opacity={result}>
        {c.cOk}
      </Tag>

      {/* 눈금. */}
      {[0, 20, 40].map((s) => (
        <Label
          key={s}
          x={atSec(s)}
          y={l.axisY}
          size={l.text.tag}
          color={COLOR.muted}
          weight={650}
          opacity={intro}
          anchor={s === 0 ? "left" : s === AXIS_MAX ? "right" : "center"}
        >
          {`${s}초`}
        </Label>
      ))}
    </AbsoluteFill>
  );
};
