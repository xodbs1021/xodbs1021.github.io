// 콘티: _workspace/blog/pokeclip-reconnect-audio-gap/storyboard.md 「영상 1」
// 끊기기 직전 조각의 소리가 영상보다 약 0.2초 먼저 끝난다(실측 0.19–0.22초, 그림은 폭을 크게 늘림).
// ① 다음 조각을 늦게 끝난 영상 끝에 놓으면 소리가 빈다. ② 먼저 끝난 소리 끝으로 당기면 소리는 잇고 영상이 겹친다.
// ③ 끊김 표시가 있으면 hls.js 가 다시 배치해 버퍼가 셋, 같은 세션 안에서 표시를 빼면 하나(2026-09-19 실측 A · B · C).
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const AUDIO_GAP_SEAM_FRAMES = 345;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤에는 1초 이상 멈춘다. */
const T = {
  intro: 0,
  next: 24,
  gap: 48,
  pull: 104,
  pullFrames: 30,
  overlap: 140,
  buffers: 196,
  tagged: 214,
  untagged: 262,
} as const;
const FADE = 12;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly x0: number;
  /** 앞 조각 영상 끝(늦은 끝)과 소리 끝(이른 끝)의 x. */
  readonly videoEnd: number;
  readonly audioEnd: number;
  readonly nextW: number;
  readonly trackH: number;
  readonly video: { readonly y: number };
  readonly audio: { readonly y: number };
  readonly trackLabelX: number;
  readonly issue: { readonly y: number };
  readonly buf: {
    readonly x: number;
    readonly w: number;
    readonly h: number;
    readonly taggedLabelY: number;
    readonly taggedY: number;
    readonly plainLabelY: number;
    readonly plainY: number;
    readonly threeX: number;
    readonly oneX: number;
  };
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
  readonly copy: {
    readonly video: string;
    readonly audio: string;
    readonly prev: string;
    readonly next: string;
    readonly gap: string;
    readonly overlap: string;
    readonly tagged: string;
    readonly plain: string;
    readonly three: string;
    readonly one: string;
  };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "다음 조각을 어느 끝에 붙이고, 끊김 표시를 달까" }],
  x0: 330,
  videoEnd: 1060,
  audioEnd: 900,
  nextW: 640,
  trackH: 76,
  video: { y: 176 },
  audio: { y: 286 },
  trackLabelX: 120,
  issue: { y: 394 },
  buf: { x: 120, w: 1680, h: 46, taggedLabelY: 540, taggedY: 606, plainLabelY: 720, plainY: 786, threeX: 470, oneX: 610 },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
  copy: {
    video: "영상",
    audio: "소리",
    prev: "앞 조각",
    next: "다음 조각",
    gap: "소리 빔",
    overlap: "영상 겹침",
    tagged: "끊김 표시 있음",
    plain: "같은 세션 · 표시 없음",
    three: "버퍼 3개",
    one: "버퍼 1개",
  },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "다음 조각을 어느 끝에 붙이고," },
    { y: 124, text: "끊김 표시를 달까" },
  ],
  x0: 190,
  videoEnd: 640,
  audioEnd: 500,
  nextW: 400,
  trackH: 80,
  video: { y: 230 },
  audio: { y: 340 },
  trackLabelX: 40,
  issue: { y: 450 },
  buf: { x: 60, w: 960, h: 46, taggedLabelY: 640, taggedY: 734, plainLabelY: 900, plainY: 994, threeX: 440, oneX: 650 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  copy: {
    video: "영상",
    audio: "소리",
    prev: "앞",
    next: "다음",
    gap: "소리 빔",
    overlap: "영상 겹침",
    tagged: "끊김 표시 있음",
    plain: "같은 세션 · 표시 없음",
    three: "버퍼 3개",
    one: "버퍼 1개",
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
  readonly dashed?: boolean;
};

const Bar: React.FC<BarProps> = ({ x, y, w, h, fill, border, opacity = 1, dashed = false }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 12,
      background: fill,
      border: `4px ${dashed ? "dashed" : "solid"} ${border}`,
      boxSizing: "border-box",
      opacity,
    }}
  />
);

/** 10분 녹화의 두 경계 자리(전체 길이 대비 비율 — 238.7초 · 477.5초 / 596.9초). */
const SEAMS: readonly number[] = [0.4, 0.8];

export const AudioGapSeam: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;

  const intro = progress(frame, T.intro, 15);
  const next = progress(frame, T.next, FADE);
  const gap = progress(frame, T.gap, FADE) * (1 - progress(frame, T.pull, FADE));
  const pull = progress(frame, T.pull, T.pullFrames, EASE_IN_OUT);
  const overlap = progress(frame, T.overlap, FADE);
  const buffers = progress(frame, T.buffers, FADE);
  const tagged = progress(frame, T.tagged, FADE);
  const untagged = progress(frame, T.untagged, FADE);

  const nextX = interpolate(pull, [0, 1], [l.videoEnd, l.audioEnd]);
  const prevVideoW = l.videoEnd - l.x0;
  const prevAudioW = l.audioEnd - l.x0;
  const b = l.buf;
  const gapPx = 22;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.trackLabelX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 트랙 이름. */}
      <Label x={l.trackLabelX} y={l.video.y + l.trackH / 2 - l.text.label * 0.62} size={l.text.label} weight={700} opacity={intro}>
        {c.video}
      </Label>
      <Label x={l.trackLabelX} y={l.audio.y + l.trackH / 2 - l.text.label * 0.62} size={l.text.label} weight={700} opacity={intro}>
        {c.audio}
      </Label>

      {/* 앞 조각: 영상이 늦게, 소리가 먼저 끝난다. */}
      <Bar x={l.x0} y={l.video.y} w={prevVideoW} h={l.trackH} fill={COLOR.surface} border={COLOR.ink} opacity={intro} />
      <Bar x={l.x0} y={l.audio.y} w={prevAudioW} h={l.trackH} fill={COLOR.surface} border={COLOR.ink} opacity={intro} />
      <Label x={l.x0 + 24} y={l.video.y + l.trackH / 2 - l.text.tag * 0.62} size={l.text.tag} color={COLOR.muted} weight={650} opacity={intro}>
        {c.prev}
      </Label>

      {/* 다음 조각: 처음엔 영상 끝에, 그다음 소리 끝으로 당긴다. */}
      <div style={{ opacity: next }}>
        <Bar x={nextX} y={l.video.y} w={l.nextW} h={l.trackH} fill={COLOR.accentSoft} border={COLOR.accent} opacity={0.92} />
        <Bar x={nextX} y={l.audio.y} w={l.nextW} h={l.trackH} fill={COLOR.accentSoft} border={COLOR.accent} opacity={0.92} />
        <Label x={nextX + l.nextW - 24} y={l.video.y + l.trackH / 2 - l.text.tag * 0.62} size={l.text.tag} color={COLOR.accent} weight={700} anchor="right">
          {c.next}
        </Label>
      </div>

      {/* ① 소리 빈틈. */}
      <Bar x={l.audioEnd} y={l.audio.y} w={l.videoEnd - l.audioEnd} h={l.trackH} fill={COLOR.dangerSoft} border={COLOR.danger} opacity={gap} dashed />
      <Tag x={(l.audioEnd + l.videoEnd) / 2} y={l.issue.y} tone="danger" size={l.text.tag} anchor="center" opacity={gap}>
        {c.gap}
      </Tag>

      {/* ② 영상 겹침. */}
      <Bar x={l.audioEnd} y={l.video.y - 10} w={l.videoEnd - l.audioEnd} h={l.trackH + 20} fill="transparent" border={COLOR.danger} opacity={overlap} dashed />
      <Tag x={(l.audioEnd + l.videoEnd) / 2} y={l.issue.y} tone="danger" size={l.text.tag} anchor="center" opacity={overlap}>
        {c.overlap}
      </Tag>

      {/* ③ 끊김 표시가 있으면 버퍼 셋, 같은 세션에서 빼면 하나. */}
      <div style={{ opacity: buffers }}>
        <Label x={b.x} y={b.taggedLabelY} size={l.text.label} weight={700}>
          {c.tagged}
        </Label>
        {SEAMS.concat([1]).map((end, i) => {
          const start = i === 0 ? 0 : SEAMS[i - 1];
          const x = b.x + start * b.w + (i === 0 ? 0 : gapPx / 2);
          const w = (end - start) * b.w - (i === 0 || end === 1 ? gapPx / 2 : gapPx);
          return <Bar key={end} x={x} y={b.taggedY} w={w} h={b.h} fill={COLOR.dangerSoft} border={COLOR.danger} opacity={tagged} />;
        })}
        <Tag x={b.threeX} y={b.taggedLabelY - 2} tone="danger" size={l.text.tag} opacity={tagged}>
          {c.three}
        </Tag>
      </div>
      <div style={{ opacity: buffers }}>
        <Label x={b.x} y={b.plainLabelY} size={l.text.label} weight={700}>
          {c.plain}
        </Label>
        <Bar x={b.x} y={b.plainY} w={b.w} h={b.h} fill={COLOR.accentSoft} border={COLOR.accent} opacity={untagged} />
        <Tag x={b.oneX} y={b.plainLabelY - 2} tone="accent" size={l.text.tag} opacity={untagged}>
          {c.one}
        </Tag>
      </div>
    </AbsoluteFill>
  );
};
