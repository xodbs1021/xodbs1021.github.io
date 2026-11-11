// 콘티: _workspace/blog/pokeclip-multiaudio-end-to-end-verification/storyboard.md 「영상 1」
// 트랙이 지나는 단계(열)마다 어느 시험(행)이 무엇을 셌는지 왼쪽부터 켠다. 8월 3일 시험 넷은 개수 · 고르기
// 칸을 채우고, 「소리 내용」 칸은 9월 팀원의 톤 시험(−24.1dB)만 채운다. 칸 값은 원자료 그대로.
// 휴대폰판은 행과 열을 바꾼다(행 = 단계, 열 = 시험). 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const MULTIAUDIO_STAGE_PROOF_FRAMES = 360;

/** 장면 순서(프레임, 30fps). 단계마다 켜지는 시작 프레임 — 마지막이 「소리 내용」. */
const T = {
  intro: 0,
  stages: [20, 60, 100, 140, 180, 230],
  rowStagger: 4,
  proof: 252,
  summary: 290,
} as const;
const FADE = 12;
const SOUND = 5;
const TONE = 4;

const STAGES = ["fMP4 녹화", "HLS 목록", "hls.js 선택", "-map 추출", "DB 장부", "소리 내용"] as const;

const TESTS = [
  { name: "시험 1", detail: "ffmpeg 2트랙", short: "1" },
  { name: "시험 2", detail: "ffmpeg 6트랙", short: "2" },
  { name: "시험 3", detail: "OBS 6트랙(무음)", short: "3" },
  { name: "시험 4", detail: "ffmpeg 6트랙 300초", short: "4" },
  { name: "톤 시험", detail: "9월, 팀원", short: "톤" },
] as const;

// 칸 값[시험][단계]. null = 그 시험이 보지 않은 단계(「—」).
// 시험 4 의 hls.js audioTrack 5 는 0부터 센 번호라 여섯째 트랙(목록 이름 audio7)이다 — 「6번째」 로 쓴다.
type Row = readonly (string | null)[];
const VALUES: readonly Row[] = [
  ["오디오 2", "2", null, "1", "15 = 15", "안 봄"],
  ["오디오 6", "6", null, "1", "15 = 15", "안 봄"],
  ["오디오 6", "6", null, "1", "61 = 61", "안 봄"],
  [null, "6", "6번째 · 200", null, null, "안 봄"],
  ["AAC 6", "6", null, null, null, "−24.1dB"],
];
const SHORT_VALUES: readonly Row[] = [
  ["2", "2", null, "1", "15=15", "안 봄"],
  ["6", "6", null, "1", "15=15", "안 봄"],
  ["6", "6", null, "1", "61=61", "안 봄"],
  [null, "6", "6번째", null, null, "안 봄"],
  ["6", "6", null, null, null, "−24.1"],
];

type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Span = { readonly pos: number; readonly size: number };

type Layout = {
  /** 단계가 놓이는 방향: 데스크톱은 열(x), 휴대폰은 행(y). */
  readonly stageAxis: "x" | "y";
  readonly stagePos: readonly number[];
  readonly stageSize: number;
  readonly testPos: readonly number[];
  readonly testSize: number;
  /** 단계 머리 칸 · 시험 머리 칸의 교차축 자리. */
  readonly stageHead: Span;
  readonly testHead: Span;
  readonly values: readonly Row[];
  readonly srt: { readonly x: number; readonly y: number; readonly arrow: readonly [number, number, number, number] };
  readonly legend: readonly { readonly y: number; readonly text: string }[];
  readonly summary: { readonly x: number; readonly y: number };
  readonly text: { readonly head: number; readonly cell: number; readonly detail: number; readonly tag: number };
  /** 칸 값의 자간. 휴대폰판은 「15=15」 가 칸 안에 여유 있게 들게 더 좁힌다. */
  readonly cellTracking: string;
};

const DESKTOP: Layout = {
  stageAxis: "x",
  stagePos: [460, 684, 908, 1132, 1356, 1600],
  stageSize: 214,
  testPos: [272, 396, 520, 644, 768],
  testSize: 112,
  stageHead: { pos: 170, size: 78 },
  testHead: { pos: 100, size: 340 },
  values: VALUES,
  srt: { x: 100, y: 88, arrow: [300, 112, 1820, 112] },
  legend: [],
  summary: { x: 960, y: 936 },
  text: { head: TEXT.small, cell: TEXT.small, detail: TEXT.small, tag: TEXT.label },
  cellTracking: "-0.03em",
};

const MOBILE: Layout = {
  stageAxis: "y",
  stagePos: [250, 362, 474, 586, 698, 830],
  stageSize: 102,
  testPos: [288, 436, 584, 732, 880],
  testSize: 140,
  stageHead: { pos: 60, size: 216 },
  testHead: { pos: 150, size: 84 },
  values: SHORT_VALUES,
  srt: { x: 60, y: 60, arrow: [110, 132, 110, 236] },
  legend: [
    { y: 968, text: "1·2 ffmpeg · 3 OBS 무음" },
    { y: 1030, text: "4 300초 · 톤 = 9월 팀원" },
  ],
  summary: { x: 540, y: 1138 },
  text: { head: MOBILE_TEXT.label, cell: MOBILE_TEXT.label, detail: MOBILE_TEXT.small, tag: MOBILE_TEXT.label },
  cellTracking: "-0.06em",
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 단계 축 자리와 교차축 자리를 화면 좌표로 바꾼다. */
const place = (l: Layout, stage: Span, cross: Span): Rect =>
  l.stageAxis === "x"
    ? { x: stage.pos, w: stage.size, y: cross.pos, h: cross.size }
    : { x: cross.pos, w: cross.size, y: stage.pos, h: stage.size };

const stageSpan = (l: Layout, s: number): Span => ({ pos: l.stagePos[s], size: l.stageSize });
const testSpan = (l: Layout, t: number): Span => ({ pos: l.testPos[t], size: l.testSize });

type CellKind = "value" | "none" | "unchecked" | "proof";

const CELL_STYLE = {
  value: { background: COLOR.accentSoft, color: COLOR.ink, fontWeight: 700 },
  none: { background: "transparent", color: COLOR.muted, fontWeight: 600 },
  unchecked: { background: COLOR.white, border: `3px dashed ${COLOR.muted}`, color: COLOR.muted, fontWeight: 650 },
  proof: { background: COLOR.accentSoft, border: `4px solid ${COLOR.accent}`, color: COLOR.accent, fontWeight: 800 },
} as const;

const cellKind = (value: string | null, stage: number, test: number): CellKind => {
  if (value === null) return "none";
  if (stage !== SOUND) return "value";
  return test === TONE ? "proof" : "unchecked";
};

type BoxProps = {
  readonly rect: Rect;
  readonly style: React.CSSProperties;
  readonly children?: React.ReactNode;
  readonly opacity?: number;
  readonly scale?: number;
};

/** 표의 칸 하나. 글자는 가운데(style 로 바꿀 수 있다). */
const Box: React.FC<BoxProps> = ({ rect, style, children, opacity = 1, scale = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: rect.x,
      top: rect.y,
      width: rect.w,
      height: rect.h,
      borderRadius: 14,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: FONT,
      whiteSpace: "nowrap",
      letterSpacing: "-0.03em",
      opacity,
      transform: `scale(${scale})`,
      ...style,
    }}
  >
    {children}
  </div>
);

export const MultiaudioStageProof: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const desktop = l.stageAxis === "x";

  const intro = progress(frame, T.intro, 16);
  const summary = progress(frame, T.summary, FADE);

  // 지금 켜지는 단계에만 강조색 밑줄. 다음 단계가 켜지면 옮겨 간다.
  const underline = (s: number): number => {
    const on = progress(frame, T.stages[s], 10);
    return s + 1 < T.stages.length ? on * (1 - progress(frame, T.stages[s + 1], 8)) : on;
  };

  const cellOpacity = (s: number, t: number): number => {
    const at = s === SOUND && t === TONE ? T.proof : T.stages[s] + t * T.rowStagger;
    return progress(frame, at, FADE);
  };

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 모든 시험의 출발: SRT 송출 → 단계 순서. */}
      <Label x={l.srt.x} y={l.srt.y} size={l.text.head} weight={760} opacity={intro}>
        SRT 송출
      </Label>
      <Arrow
        x1={l.srt.arrow[0]} y1={l.srt.arrow[1]} x2={l.srt.arrow[2]} y2={l.srt.arrow[3]}
        color={COLOR.muted} draw={progress(frame, T.intro, 20)}
      />

      {/* 단계 머리와 지금 켜지는 단계의 밑줄. */}
      {STAGES.map((stage, s) => {
        const rect = place(l, stageSpan(l, s), l.stageHead);
        const bar = underline(s);
        const inset = desktop ? 16 : 0;
        return (
          <div key={stage}>
            <Box
              rect={rect}
              style={{ fontSize: l.text.head, fontWeight: 760, color: COLOR.ink, alignItems: desktop ? "center" : "flex-start" }}
              opacity={intro}
            >
              {stage}
            </Box>
            <div
              style={{
                position: "absolute",
                left: rect.x + inset,
                top: rect.y + rect.h - 12,
                width: (rect.w - inset * 2 - (desktop ? 0 : 16)) * bar,
                height: 8,
                borderRadius: 4,
                background: COLOR.accent,
                opacity: bar,
              }}
            />
          </div>
        );
      })}

      {/* 시험 머리. 데스크톱은 이름 + 회색 설명 두 줄, 휴대폰은 번호만(설명은 아래 범례). */}
      {TESTS.map((test, t) => (
        <Box
          key={test.name}
          rect={place(l, l.testHead, testSpan(l, t))}
          style={{ alignItems: desktop ? "flex-start" : "center", color: COLOR.ink }}
          opacity={intro}
        >
          {desktop ? (
            <>
              <div style={{ fontSize: TEXT.label, fontWeight: 780, lineHeight: 1.15 }}>{test.name}</div>
              <div style={{ fontSize: l.text.detail, fontWeight: 600, color: COLOR.muted, lineHeight: 1.2 }}>
                {test.detail}
              </div>
            </>
          ) : (
            <div style={{ fontSize: l.text.head, fontWeight: 780 }}>{test.short}</div>
          )}
        </Box>
      ))}

      {/* 빈 판. */}
      {STAGES.map((stage, s) =>
        TESTS.map((test, t) => (
          <Box
            key={`slot-${stage}-${test.name}`}
            rect={place(l, stageSpan(l, s), testSpan(l, t))}
            style={{ background: COLOR.surface }}
            opacity={intro}
          />
        )),
      )}

      {/* 칸 값: 단계 하나씩 왼쪽(휴대폰은 위)부터 켜진다. */}
      {STAGES.map((stage, s) =>
        TESTS.map((test, t) => {
          const value = l.values[t][s];
          const kind = cellKind(value, s, t);
          const p = cellOpacity(s, t);
          return (
            <Box
              key={`cell-${stage}-${test.name}`}
              rect={place(l, stageSpan(l, s), testSpan(l, t))}
              style={{ fontSize: l.text.cell, letterSpacing: l.cellTracking, ...CELL_STYLE[kind] }}
              opacity={p}
              scale={kind === "proof" ? 0.9 + 0.1 * p : 1}
            >
              {value ?? "—"}
            </Box>
          );
        }),
      )}

      {l.legend.map((line) => (
        <Label key={line.y} x={l.stageHead.pos} y={line.y} size={l.text.detail} color={COLOR.muted} weight={650} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <Tag x={l.summary.x} y={l.summary.y} anchor="center" tone="ink" size={l.text.tag} opacity={summary}>
        개수 · 고르기 · 내용은 다른 시험
      </Tag>
    </AbsoluteFill>
  );
};
