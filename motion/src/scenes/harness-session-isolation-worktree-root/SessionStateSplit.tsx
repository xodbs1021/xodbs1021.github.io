// 콘티: _workspace/blog/harness-session-isolation-worktree-root/storyboard.md 「영상 1」
// 전: 서로 다른 워크트리의 두 세션이 표식(리뷰 필요 등)을 한 공유 상태 폴더에 쓴다 → A가 끝내려 하면
// B의 표식 때문에 종료가 막힌다. 후: 공유 폴더가 세션별 폴더 둘로 갈라지고, 각 세션은 자기 폴더에만
// 쓰고 읽는다. 2026-10-01 · 10-02 하네스 변경 기록을 바탕으로 한 설명용 그림. 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Box, Dot, Lines, travel } from "../../components/Stations";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const SESSION_STATE_SPLIT_FRAMES = 330;

const T = {
  markIn: 18,
  markEnd: 54,
  blocked: 70,
  split: 150,
  splitEnd: 176,
  mark2In: 186,
  mark2End: 222,
  own: 236,
} as const;

type P = { readonly x: number; readonly y: number };
type B = P & { readonly w: number; readonly h: number };
type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly a: B;
  readonly b: B;
  readonly aText: string;
  readonly bText: string;
  readonly shared: B;
  readonly aState: B;
  readonly bState: B;
  /** 공유 폴더 안에서 A · B 표식이 앉는 자리. */
  readonly sharedSlots: readonly [P, P];
  readonly ownSlots: readonly [P, P];
  readonly blockTag: P & { readonly text: string };
  readonly ownTag: P & { readonly text: string };
  readonly tagAnchor: "left" | "center";
  readonly note: (P & { readonly text: string }) | null;
  /** 갈라진 뒤에도 「전」 상태를 한 줄로 남겨 끝 프레임(포스터)만으로 전후가 읽히게 한다. */
  readonly recap: P & { readonly text: string };
  readonly text: { readonly title: number; readonly box: number; readonly tag: number };
};

const DESKTOP: Layout = {
  title: [{ y: 36, text: "검사 상태를 세션마다 따로 둔다" }],
  titleX: 120,
  a: { x: 480, y: 250, w: 600, h: 130 },
  b: { x: 1440, y: 250, w: 600, h: 130 },
  aText: "세션 A · 워크트리 A",
  bText: "세션 B · 워크트리 B",
  shared: { x: 960, y: 760, w: 1200, h: 260 },
  aState: { x: 480, y: 760, w: 600, h: 260 },
  bState: { x: 1440, y: 760, w: 600, h: 260 },
  sharedSlots: [
    { x: 900, y: 820 },
    { x: 1020, y: 820 },
  ],
  ownSlots: [
    { x: 480, y: 820 },
    { x: 1440, y: 820 },
  ],
  blockTag: { x: 480, y: 350, text: "B의 표식 때문에 종료 차단" },
  ownTag: { x: 480, y: 350, text: "A의 표식만 읽음" },
  tagAnchor: "center",
  note: null,
  recap: { x: 960, y: 940, text: "전: 공유 폴더 하나 → A가 B의 표식 때문에 종료 차단" },
  text: { title: TEXT.title, box: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  title: [
    { y: 52, text: "검사 상태를" },
    { y: 120, text: "세션마다 따로 둔다" },
  ],
  titleX: 60,
  a: { x: 285, y: 340, w: 450, h: 130 },
  b: { x: 795, y: 340, w: 450, h: 130 },
  aText: "세션 A",
  bText: "세션 B",
  shared: { x: 540, y: 900, w: 960, h: 300 },
  aState: { x: 285, y: 900, w: 450, h: 300 },
  bState: { x: 795, y: 900, w: 450, h: 300 },
  sharedSlots: [
    { x: 480, y: 980 },
    { x: 600, y: 980 },
  ],
  ownSlots: [
    { x: 285, y: 980 },
    { x: 795, y: 980 },
  ],
  blockTag: { x: 60, y: 440, text: "A: B의 표식 때문에 종료 차단" },
  ownTag: { x: 60, y: 440, text: "A: 자기 표식만 읽음" },
  tagAnchor: "left",
  note: { x: 60, y: 200, text: "워크트리가 다른 두 세션" },
  recap: { x: 60, y: 1100, text: "전: 공유 폴더 하나\n→ B의 표식으로 A 종료 차단" },
  text: { title: MOBILE_TEXT.title, box: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const bottom = (b: B): P => ({ x: b.x, y: b.y + b.h / 2 });

export const SessionStateSplit: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 15);
  const split = progress(frame, T.split, T.splitEnd - T.split);

  // 전: 두 세션의 표식이 공유 폴더 한가운데로 모인다. 후: 각자의 폴더로.
  const markA1 = travel(frame, T.markIn, T.markEnd, bottom(l.a), l.sharedSlots[0]);
  const markB1 = travel(frame, T.markIn + 8, T.markEnd + 8, bottom(l.b), l.sharedSlots[1]);
  const markA2 = travel(frame, T.mark2In, T.mark2End, bottom(l.a), l.ownSlots[0]);
  const markB2 = travel(frame, T.mark2In + 8, T.mark2End + 8, bottom(l.b), l.ownSlots[1]);
  const before = 1 - split;
  const blocked = progress(frame, T.blocked, 10) * (1 - progress(frame, T.split - 10, 10));
  const own = progress(frame, T.own, 10);
  const dotSize = layout === "mobile" ? 26 : 24;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {l.note ? (
        <Label x={l.note.x} y={l.note.y} size={l.text.tag} color={COLOR.muted} opacity={intro}>
          {l.note.text}
        </Label>
      ) : null}

      <div style={{ opacity: intro }}>
        <Box {...l.a} label={l.aText} size={l.text.box} tone={blocked > 0.5 ? "danger" : "ink"} />
        <Box {...l.b} label={l.bText} size={l.text.box} tone="ink" />
      </div>

      {/* 세션 → 상태 폴더 연결선: 전에는 한 폴더로 모이고, 후에는 각자 아래로. */}
      <div style={{ opacity: intro * before }}>
        <Lines
          lines={[
            { x1: bottom(l.a).x, y1: bottom(l.a).y, x2: l.sharedSlots[0].x, y2: l.shared.y - l.shared.h / 2 },
            { x1: bottom(l.b).x, y1: bottom(l.b).y, x2: l.sharedSlots[1].x, y2: l.shared.y - l.shared.h / 2 },
          ]}
        />
      </div>
      <div style={{ opacity: split }}>
        <Lines
          lines={[
            { x1: bottom(l.a).x, y1: bottom(l.a).y, x2: l.aState.x, y2: l.aState.y - l.aState.h / 2 },
            { x1: bottom(l.b).x, y1: bottom(l.b).y, x2: l.bState.x, y2: l.bState.y - l.bState.h / 2 },
          ]}
        />
      </div>

      {/* 공유 상태 폴더(전) → 세션별 폴더 둘(후). */}
      <Box {...l.shared} label="" size={l.text.box} tone="ink" opacity={intro * before} />
      <Label x={l.shared.x} y={l.shared.y - l.shared.h / 2 + 28} size={l.text.box} weight={720} anchor="center" opacity={intro * before}>
        공유 상태 폴더 하나
      </Label>
      <Box {...l.aState} label="" size={l.text.box} tone="accent" opacity={split} />
      <Box {...l.bState} label="" size={l.text.box} tone="accent" opacity={split} />
      <Label x={l.aState.x} y={l.aState.y - l.aState.h / 2 + 28} size={l.text.box} weight={720} anchor="center" opacity={split} color={COLOR.accent}>
        A의 상태
      </Label>
      <Label x={l.bState.x} y={l.bState.y - l.bState.h / 2 + 28} size={l.text.box} weight={720} anchor="center" opacity={split} color={COLOR.accent}>
        B의 상태
      </Label>

      {/* 표식 — A는 강조색, B는 검정. */}
      <Dot x={markA1.x} y={markA1.y} r={dotSize} color={COLOR.accent} opacity={progress(frame, T.markIn, 6) * before} />
      <Dot x={markB1.x} y={markB1.y} r={dotSize} color={COLOR.ink} opacity={progress(frame, T.markIn + 8, 6) * before} />
      <Dot x={markA2.x} y={markA2.y} r={dotSize} color={COLOR.accent} opacity={progress(frame, T.mark2In, 6)} />
      <Dot x={markB2.x} y={markB2.y} r={dotSize} color={COLOR.ink} opacity={progress(frame, T.mark2In + 8, 6)} />

      <Tag x={l.blockTag.x} y={l.blockTag.y} tone="danger" size={l.text.tag} anchor={l.tagAnchor} opacity={blocked}>
        {l.blockTag.text}
      </Tag>
      <div
        style={{
          position: "absolute",
          left: l.recap.x,
          top: l.recap.y,
          transform: l.tagAnchor === "center" ? "translateX(-50%)" : undefined,
          fontFamily: FONT,
          fontSize: l.text.tag,
          fontWeight: 650,
          lineHeight: 1.3,
          color: COLOR.muted,
          whiteSpace: "pre",
          opacity: own,
        }}
      >
        {l.recap.text}
      </div>
      <Tag x={l.ownTag.x} y={l.ownTag.y} tone="accent" size={l.text.tag} anchor={l.tagAnchor} opacity={own}>
        {l.ownTag.text}
      </Tag>
    </AbsoluteFill>
  );
};
