// 콘티: _workspace/blog/pokeclip-manifest-window-boundaries/storyboard.md 「영상 1」
// 조각 9–13. 9·10 완료, 11·12·13 대기. 공개 경계(청록 띠)는 10 뒤에 있다. 12 가 먼저 완료돼도
// 경계는 11 앞에서 멈춘다. 11 이 완료되는 순간 경계가 12 뒤까지 한 번에 늘어난다. 13 은 대기로 남는다.
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const PUBLISH_BOUNDARY_FRAMES = 330;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤에는 1초 이상 멈춘다. */
const T = {
  intro: 0,
  done12: 40,
  hold: 64,
  done11: 150,
  grow: 174,
  growFrames: 24,
  verdict: 204,
} as const;
const FADE = 12;

const SEQS = [9, 10, 11, 12, 13] as const;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly x0: number;
  readonly cell: { readonly w: number; readonly h: number; readonly gap: number; readonly y: number };
  readonly bandPad: number;
  readonly boundaryTagY: number;
  readonly stateGap: number;
  readonly holdTag: { readonly x: number; readonly y: number };
  readonly verdict: { readonly x: number; readonly y: number };
  readonly text: { readonly title: number; readonly cell: number; readonly tag: number };
  readonly copy: { readonly boundary: string; readonly hold: string; readonly verdict: string };
};

const DESKTOP: Layout = {
  title: [{ y: 52, text: "공개 경계는 연속으로 확정된 조각까지" }],
  x0: 240,
  cell: { w: 230, h: 180, gap: 40, y: 400 },
  bandPad: 22,
  boundaryTagY: 250,
  stateGap: 30,
  holdTag: { x: 895, y: 690 },
  verdict: { x: 240, y: 790 },
  text: { title: TEXT.title, cell: TEXT.label + 18, tag: TEXT.small },
  copy: {
    boundary: "공개 경계",
    hold: "11번을 기다리는 동안 멈춤",
    verdict: "11번 완료 → 12번까지 한 번에",
  },
};

const MOBILE: Layout = {
  title: [
    { y: 70, text: "공개 경계는 연속으로" },
    { y: 142, text: "확정된 조각까지" },
  ],
  x0: 60,
  cell: { w: 170, h: 170, gap: 27, y: 520 },
  bandPad: 14,
  boundaryTagY: 380,
  stateGap: 26,
  holdTag: { x: 454, y: 810 },
  verdict: { x: 60, y: 1010 },
  text: { title: MOBILE_TEXT.title, cell: MOBILE_TEXT.label + 12, tag: MOBILE_TEXT.small },
  copy: {
    boundary: "공개 경계",
    hold: "11번 대기 → 멈춤",
    verdict: "11번 완료 → 12번까지",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type CellProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly label: string;
  readonly done: number;
  readonly size: number;
};

/** 대기(회색 점선) → 완료(검정 실선)로 바뀌는 조각 칸. */
const Segment: React.FC<CellProps> = ({ x, y, w, h, label, done, size }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 16,
      boxSizing: "border-box",
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      background: done > 0.5 ? COLOR.white : COLOR.surface,
      border: done > 0.5 ? `4px solid ${COLOR.ink}` : `4px dashed ${COLOR.muted}`,
      color: done > 0.5 ? COLOR.ink : COLOR.muted,
    }}
  >
    {label}
  </div>
);

export const PublishBoundary: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;
  const step = l.cell.w + l.cell.gap;
  const cellX = (i: number) => l.x0 + i * step;

  const intro = progress(frame, T.intro, 15);
  const done12 = progress(frame, T.done12, FADE);
  const hold = progress(frame, T.hold, FADE);
  const done11 = progress(frame, T.done11, FADE);
  const grow = progress(frame, T.grow, T.growFrames, EASE_IN_OUT);
  const verdict = progress(frame, T.verdict, FADE);

  // 9 · 10 은 처음부터 완료, 11 · 12 는 차례로, 13 은 대기.
  const done = [1, 1, done11, done12, 0];

  // 공개 띠의 오른쪽 끝: 10 뒤 → 12 뒤.
  const edgeBefore = cellX(1) + l.cell.w + l.cell.gap / 2;
  const edgeAfter = cellX(3) + l.cell.w + l.cell.gap / 2;
  const edge = interpolate(grow, [0, 1], [edgeBefore, edgeAfter]);
  const bandLeft = cellX(0) - l.bandPad;
  const bandTop = l.cell.y - l.bandPad;
  const bandH = l.cell.h + l.bandPad * 2;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.x0} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 공개 범위 띠와 경계선. */}
      <div
        style={{
          position: "absolute",
          left: bandLeft,
          top: bandTop,
          width: edge - bandLeft,
          height: bandH,
          borderRadius: 22,
          background: COLOR.accentSoft,
          border: `4px solid ${COLOR.accent}`,
          boxSizing: "border-box",
          opacity: intro,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: edge - 5,
          top: l.boundaryTagY + l.text.tag * 1.6 + 8,
          width: 10,
          height: bandTop + bandH - (l.boundaryTagY + l.text.tag * 1.6 + 8),
          borderRadius: 5,
          background: COLOR.accent,
          opacity: intro,
        }}
      />
      <Tag x={edge} y={l.boundaryTagY} tone="accent" size={l.text.tag} anchor="center" opacity={intro}>
        {c.boundary}
      </Tag>

      {SEQS.map((seq, i) => (
        <div key={seq} style={{ opacity: intro }}>
          <Segment x={cellX(i)} y={l.cell.y} w={l.cell.w} h={l.cell.h} label={String(seq)} done={done[i]} size={l.text.cell} />
          <Label
            x={cellX(i) + l.cell.w / 2}
            y={l.cell.y + l.cell.h + l.stateGap}
            size={l.text.tag}
            anchor="center"
            color={done[i] > 0.5 ? COLOR.ink : COLOR.muted}
          >
            {done[i] > 0.5 ? "완료" : "대기"}
          </Label>
        </div>
      ))}

      <Tag x={l.holdTag.x} y={l.holdTag.y} tone="muted" size={l.text.tag} anchor="center" opacity={hold * (1 - done11)}>
        {c.hold}
      </Tag>
      <Tag x={l.verdict.x} y={l.verdict.y} tone="accent" size={l.text.tag} opacity={verdict}>
        {c.verdict}
      </Tag>
    </AbsoluteFill>
  );
};
