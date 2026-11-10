// 콘티: _workspace/blog/pokeclip-black-screen-three-causes/storyboard.md 「영상 1」
// 8월 18일의 조사 순서. 송출이 ① 변환 → ② 목록·조각 → ③ hls.js 초기화를 지나 화면까지 가는 길에서,
// 진행선이 한 단계에 닿으면 그 단계가 막히고(빨강 · 막힘 이름표), 고치면 통과(청록 · 통과 증거)한 뒤
// 다음 단계로 나아간다. 셋째 단계를 넘어야 검은 화면이 「재생」으로 바뀐다.
// 11월의 정정(①의 원인 설명, ②가 화면을 막지 않았을 가능성)은 캡션과 본문이 말한다.
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(StageUnblockMobile, 세로 배치).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const STAGE_UNBLOCK_FRAMES = 345;

/** 장면 순서(프레임, 30fps). 막힘과 통과 뒤에는 1초 이상 멈춘다. */
const T = {
  intro: 0,
  go: [15, 97, 179, 261],
  block: [37, 119, 201],
  pass: [77, 159, 241],
  play: 279,
} as const;
const GO_FRAMES = [22, 22, 22, 18];
const FADE = 12;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Layout = {
  readonly dir: "row" | "column";
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly obs: Box;
  readonly stages: readonly [Box, Box, Box];
  readonly screen: Box;
  /** 이름표 자리: row 는 상자 위(막힘) · 아래(통과) 가운데, column 은 상자 오른쪽 같은 자리. */
  readonly tagGap: number;
  readonly lineWidth: number;
  readonly dot: number;
  readonly text: { readonly title: number; readonly box: number; readonly tag: number };
  readonly copy: {
    readonly obs: string;
    readonly stages: readonly [string, string, string];
    readonly blocked: readonly [string, string, string];
    readonly passed: readonly [string, string, string];
    readonly screen: string;
    readonly playing: string;
    readonly playTag: string;
  };
};

const DESKTOP: Layout = {
  dir: "row",
  title: [{ y: 52, text: "검은 화면 뒤의 세 단계" }],
  titleX: 150,
  obs: { x: 150, y: 430, w: 150, h: 150 },
  stages: [
    { x: 400, y: 430, w: 330, h: 150 },
    { x: 800, y: 430, w: 330, h: 150 },
    { x: 1200, y: 430, w: 330, h: 150 },
  ],
  screen: { x: 1600, y: 430, w: 170, h: 150 },
  tagGap: 34,
  lineWidth: 10,
  dot: 34,
  text: { title: TEXT.title, box: TEXT.label, tag: TEXT.label },
  copy: {
    obs: "OBS",
    stages: ["① 변환\nMediaMTX", "② 목록·조각", "③ 초기화\nhls.js"],
    blocked: ["muxer 오류 반복", "GAP 7개 · 401", "생성자 예외"],
    passed: ["오류 0건", "창 30에서 GAP 0개", "생성자 통과"],
    screen: "화면",
    playing: "재생",
    playTag: "재생 · 되감기",
  },
};

const MOBILE: Layout = {
  dir: "column",
  title: [
    { y: 70, text: "검은 화면 뒤의" },
    { y: 142, text: "세 단계" },
  ],
  titleX: 60,
  obs: { x: 60, y: 260, w: 460, h: 120 },
  stages: [
    { x: 60, y: 450, w: 460, h: 120 },
    { x: 60, y: 640, w: 460, h: 120 },
    { x: 60, y: 830, w: 460, h: 120 },
  ],
  screen: { x: 60, y: 1020, w: 460, h: 120 },
  tagGap: 40,
  lineWidth: 12,
  dot: 40,
  text: { title: MOBILE_TEXT.title, box: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
  copy: {
    obs: "OBS",
    stages: ["① 변환", "② 목록·조각", "③ hls.js 초기화"],
    blocked: ["muxer 오류 반복", "GAP 7개 · 401", "생성자 예외"],
    passed: ["오류 0건", "창 30에서 GAP 0개", "생성자 통과"],
    screen: "화면",
    playing: "재생",
    playTag: "재생 · 되감기",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 진행선이 나아가는 축 위의 좌표: row 는 x, column 은 y. */
const along = (l: Layout, b: Box, edge: "start" | "center" | "end"): number => {
  const start = l.dir === "row" ? b.x : b.y;
  const size = l.dir === "row" ? b.w : b.h;
  return edge === "start" ? start : edge === "center" ? start + size / 2 : start + size;
};

/** 진행선이 놓이는 다른 축의 좌표(상자 가운데). */
const across = (l: Layout, b: Box): number => (l.dir === "row" ? b.y + b.h / 2 : b.x + b.w / 2);

type StageTagProps = {
  readonly l: Layout;
  readonly box: Box;
  readonly where: "blocked" | "passed";
  readonly tone: "danger" | "accent";
  readonly opacity: number;
  readonly children: React.ReactNode;
};

/** row 는 상자 위(막힘) · 아래(통과)에 가운데 맞춤, column 은 상자 오른쪽 같은 자리. */
const StageTag: React.FC<StageTagProps> = ({ l, box, where, tone, opacity, children }) => {
  if (l.dir === "row") {
    const y = where === "blocked" ? box.y - l.tagGap - l.text.tag * 1.6 : box.y + box.h + l.tagGap;
    return (
      <Tag x={box.x + box.w / 2} y={y} tone={tone} size={l.text.tag} anchor="center" opacity={opacity}>
        {children}
      </Tag>
    );
  }
  return (
    <Tag x={box.x + box.w + l.tagGap} y={box.y + box.h / 2 - l.text.tag * 0.8} tone={tone} size={l.text.tag} opacity={opacity}>
      {children}
    </Tag>
  );
};

export const StageUnblock: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;

  const intro = progress(frame, T.intro, 15);
  const go = T.go.map((start, i) => progress(frame, start, GO_FRAMES[i], EASE_IN_OUT));
  const block = T.block.map((start) => progress(frame, start, FADE));
  const pass = T.pass.map((start) => progress(frame, start, FADE));
  const play = progress(frame, T.play, FADE);

  // 진행선 끝: OBS 끝 → 각 단계의 앞 가장자리 → 화면 앞 가장자리.
  const stops = [along(l, l.obs, "end"), ...l.stages.map((b) => along(l, b, "start")), along(l, l.screen, "start")];
  const tip = stops[0] + go.reduce((sum, g, i) => sum + (stops[i + 1] - stops[i]) * g, 0);
  const lineStart = along(l, l.obs, "center");
  const lineEnd = along(l, l.screen, "center");
  const mid = across(l, l.obs);

  // 지금 막혀 있는 단계가 있으면 진행점은 빨강.
  const blockedNow = block.some((b, i) => b > 0.5 && pass[i] < 0.5);
  const dotColor = blockedNow ? COLOR.danger : COLOR.accent;
  const moving = go.some((g) => g > 0 && g < 1);
  const dotOpacity = intro * (1 - play);

  const bar = (from: number, to: number, thickness: number, color: string, opacity = 1) =>
    l.dir === "row" ? (
      <div
        style={{
          position: "absolute",
          left: from,
          top: mid - thickness / 2,
          width: Math.max(0, to - from),
          height: thickness,
          borderRadius: thickness / 2,
          background: color,
          opacity,
        }}
      />
    ) : (
      <div
        style={{
          position: "absolute",
          left: mid - thickness / 2,
          top: from,
          width: thickness,
          height: Math.max(0, to - from),
          borderRadius: thickness / 2,
          background: color,
          opacity,
        }}
      />
    );

  const dotX = l.dir === "row" ? tip : mid;
  const dotY = l.dir === "row" ? mid : tip;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 길: 옅은 바탕선 위로 진행선이 단계마다 나아간다(상자 뒤). */}
      {bar(lineStart, lineEnd, 4, COLOR.line, intro)}
      {bar(lineStart, tip, l.lineWidth, COLOR.accent, intro)}

      <Node x={l.obs.x} y={l.obs.y} width={l.obs.w} height={l.obs.h} tone="ink" size={l.text.box} opacity={intro}>
        {c.obs}
      </Node>

      {l.stages.map((b, i) => {
        const idle = 1 - block[i];
        const danger = block[i] * (1 - pass[i]);
        return (
          <div key={c.stages[i]}>
            <Node x={b.x} y={b.y} width={b.w} height={b.h} tone="ink" size={l.text.box} opacity={intro * idle}>
              {c.stages[i]}
            </Node>
            <Node x={b.x} y={b.y} width={b.w} height={b.h} tone="danger" size={l.text.box} opacity={danger}>
              {c.stages[i]}
            </Node>
            <Node x={b.x} y={b.y} width={b.w} height={b.h} tone="accent" size={l.text.box} opacity={pass[i]}>
              {c.stages[i]}
            </Node>
            <StageTag l={l} box={b} where="blocked" tone="danger" opacity={danger}>
              {c.blocked[i]}
            </StageTag>
            <StageTag l={l} box={b} where="passed" tone="accent" opacity={pass[i]}>
              {c.passed[i]}
            </StageTag>
          </div>
        );
      })}

      {/* 화면: 검은 상자 → 재생. */}
      <div
        style={{
          position: "absolute",
          left: l.screen.x,
          top: l.screen.y,
          width: l.screen.w,
          height: l.screen.h,
          boxSizing: "border-box",
          borderRadius: 16,
          background: COLOR.ink,
          color: COLOR.white,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontSize: l.text.box,
          fontWeight: 680,
          opacity: intro * (1 - play),
        }}
      >
        {c.screen}
      </div>
      <Node x={l.screen.x} y={l.screen.y} width={l.screen.w} height={l.screen.h} tone="accent" size={l.text.box} opacity={play}>
        <div style={{ textAlign: "center" }}>{c.playing}</div>
      </Node>
      <StageTag l={l} box={l.screen} where="passed" tone="accent" opacity={play}>
        {c.playTag}
      </StageTag>

      {/* 진행점: 움직이는 동안과 막힌 동안만 보인다. */}
      <div
        style={{
          position: "absolute",
          left: dotX - l.dot / 2,
          top: dotY - l.dot / 2,
          width: l.dot,
          height: l.dot,
          borderRadius: l.dot / 2,
          background: dotColor,
          border: `5px solid ${COLOR.white}`,
          boxSizing: "border-box",
          opacity: moving || blockedNow ? dotOpacity : 0,
        }}
      />
    </AbsoluteFill>
  );
};
