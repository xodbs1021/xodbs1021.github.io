// 콘티: _workspace/blog/clip-edit-recipe-render-boundary/storyboard.md 「영상 1」
// 원본 조각(영상 1 + 소리 6)은 그대로 두고 레시피만 v1 → v2로 바꾼다. 같은 원본에서 1:1 출력 다음에 9:16 출력이 나오고,
// 음악 트랙은 음량 0이라 선만 끊긴다(막대는 원본에 그대로). 앞 출력은 회색으로 남는다.
// v1 코드의 출력 비율은 9:16 · 1:1 둘뿐이라 16:9 출력은 그리지 않는다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const RECIPE_RERENDER_FRAMES = 330;

const T = {
  intro: 0,
  out1Arrow: 30,
  out1: 50,
  v2: 110,
  out1Old: 130,
  musicOff: 140,
  out2Arrow: 170,
  out2: 190,
} as const;
const FADE = 12;

/** 원본 막대: 0 = 영상, 1–6 = 소리. 음악은 소리 가운데 하나. */
const MUSIC = 4;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly orig: Box & { readonly labelY: number };
  readonly bar: { readonly h: number; readonly gap: number; readonly pad: number };
  readonly keepTag: { readonly x: number; readonly y: number };
  readonly card: Box;
  readonly render: Box;
  readonly out1: Box;
  readonly out2: Box;
  readonly oldTag: { readonly x: number; readonly y: number };
  readonly rows: { readonly cut: string; readonly out1: string; readonly out2: string; readonly vol1: string; readonly vol2: string };
  readonly text: { readonly title: number; readonly label: number; readonly tag: number; readonly row: number; readonly bar: number };
};

const DESKTOP: Layout = {
  title: [{ y: 32, text: "원본은 그대로, 레시피만 바꿔 다시 만듭니다" }],
  orig: { x: 120, y: 200, w: 380, h: 420, labelY: 140 },
  bar: { h: 42, gap: 12, pad: 22 },
  keepTag: { x: 310, y: 650 },
  card: { x: 700, y: 140, w: 600, h: 300 },
  render: { x: 840, y: 560, w: 320, h: 110 },
  out1: { x: 1400, y: 500, w: 230, h: 230 },
  out2: { x: 1680, y: 340, w: 180, h: 320 },
  oldTag: { x: 1515, y: 750 },
  rows: { cut: "구간 [in, out)", out1: "출력 1:1", out2: "출력 9:16", vol1: "음악 트랙 음량 1.0", vol2: "음악 트랙 음량 0" },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small, row: TEXT.label, bar: TEXT.small },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "원본은 그대로," },
    { y: 124, text: "레시피만 바꿔 다시 만듭니다" },
  ],
  orig: { x: 60, y: 300, w: 420, h: 470, labelY: 230 },
  bar: { h: 48, gap: 14, pad: 24 },
  keepTag: { x: 270, y: 790 },
  card: { x: 530, y: 230, w: 490, h: 330 },
  render: { x: 560, y: 680, w: 400, h: 110 },
  out1: { x: 150, y: 970, w: 260, h: 260 },
  out2: { x: 680, y: 900, w: 190, h: 338 },
  oldTag: { x: 280, y: 1250 },
  rows: { cut: "구간 [in, out)", out1: "출력 1:1", out2: "출력 9:16", vol1: "음악 음량 1.0", vol2: "음악 음량 0" },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, row: MOBILE_TEXT.label, bar: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const RecipeRerender: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const mobile = layout === "mobile";

  const intro = progress(frame, T.intro, 15);
  const out1Arrow = progress(frame, T.out1Arrow, 18);
  const out1 = progress(frame, T.out1, FADE);
  const v2 = progress(frame, T.v2, FADE);
  const out1Old = progress(frame, T.out1Old, FADE);
  const musicOff = progress(frame, T.musicOff, FADE);
  const out2Arrow = progress(frame, T.out2Arrow, 18);
  const out2 = progress(frame, T.out2, FADE);

  const barY = (i: number) => l.orig.y + l.bar.pad + i * (l.bar.h + l.bar.gap);
  const barX = l.orig.x + l.bar.pad;
  const barW = l.orig.w - l.bar.pad * 2;
  const barRight = l.orig.x + l.orig.w;

  // 원본 막대 → 렌더 상자로 모이는 선.
  const renderIn = { x: l.render.x, y: l.render.y + l.render.h / 2 };

  const rowY = (i: number) => l.card.y + 92 + i * (l.text.row * 1.55);
  const renderOut = { x: l.render.x + l.render.w / 2, y: l.render.y + l.render.h };
  const renderRight = { x: l.render.x + l.render.w, y: l.render.y + l.render.h / 2 };

  const out1Target = mobile
    ? { x: l.out1.x + l.out1.w / 2, y: l.out1.y - 12 }
    : { x: l.out1.x - 12, y: l.out1.y + l.out1.h / 2 };
  const out1From = mobile ? renderOut : renderRight;
  const out2Target = mobile
    ? { x: l.out2.x + l.out2.w / 2, y: l.out2.y - 12 }
    : { x: l.out2.x - 12, y: l.out2.y + 40 };
  const out2From = mobile ? renderOut : { x: l.render.x + l.render.w - 48, y: l.render.y - 8 };

  const outBox = (b: Box, text: string, tone: "accent" | "muted", opacity: number) => (
    <div
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        borderRadius: 14,
        boxSizing: "border-box",
        border: tone === "accent" ? `5px solid ${COLOR.accent}` : `4px dashed ${COLOR.muted}`,
        background: tone === "accent" ? COLOR.accentSoft : COLOR.surface,
        color: tone === "accent" ? COLOR.ink : COLOR.muted,
        display: "grid",
        placeItems: "center",
        fontFamily: FONT,
        fontSize: l.text.label,
        fontWeight: 760,
        opacity,
      }}
    >
      {text}
    </div>
  );

  const row = (i: number, before: string, after: string | null) => {
    const changed = after !== null;
    const t = changed ? v2 : 0;
    return (
      <div key={i} style={{ position: "absolute", left: l.card.x + 28, top: rowY(i), opacity: intro }}>
        {changed ? (
          <div
            style={{
              position: "absolute",
              left: -14,
              top: -6,
              width: l.card.w - 28,
              height: l.text.row * 1.35,
              borderRadius: 10,
              background: COLOR.accentSoft,
              opacity: t,
            }}
          />
        ) : null}
        <div style={{ position: "relative", fontFamily: FONT, fontSize: l.text.row, fontWeight: 650, color: COLOR.ink, whiteSpace: "nowrap" }}>
          <span style={{ opacity: 1 - t, position: changed ? "absolute" : "relative" }}>{before}</span>
          {changed ? <span style={{ opacity: t, color: COLOR.accent, fontWeight: 760 }}>{after}</span> : null}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={mobile ? 60 : 120} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 원본 조각 */}
      <Label x={l.orig.x} y={l.orig.labelY} size={l.text.label} weight={700} opacity={intro}>
        원본 조각
      </Label>
      <div
        style={{
          position: "absolute",
          left: l.orig.x,
          top: l.orig.y,
          width: l.orig.w,
          height: l.orig.h,
          borderRadius: 18,
          border: `3px solid ${COLOR.ink}`,
          boxSizing: "border-box",
          opacity: intro,
        }}
      />
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={`bar-${i}`}
          style={{
            position: "absolute",
            left: barX,
            top: barY(i),
            width: barW,
            height: l.bar.h,
            borderRadius: 8,
            background: i === 0 ? COLOR.ink : COLOR.line,
            color: i === 0 ? COLOR.white : COLOR.ink,
            fontFamily: FONT,
            fontSize: l.text.bar,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            boxSizing: "border-box",
            opacity: intro,
          }}
        >
          {i === 0 ? "영상" : i === MUSIC ? "음악" : `소리 ${i}`}
        </div>
      ))}
      <Tag x={l.keepTag.x} y={l.keepTag.y} tone="muted" size={l.text.tag} anchor="center" opacity={intro}>
        덮어쓰지 않음
      </Tag>

      {/* 원본 막대 → 렌더 선. 음악 선만 v2에서 회색 점선. */}
      <svg style={{ position: "absolute", inset: 0, opacity: intro }} width="100%" height="100%">
        {Array.from({ length: 7 }, (_, i) => {
          const y = barY(i) + l.bar.h / 2;
          const off = i === MUSIC ? musicOff : 0;
          return (
            <line
              key={`wire-${i}`}
              x1={barRight + 6}
              y1={y}
              x2={renderIn.x}
              y2={renderIn.y}
              stroke={off > 0.5 ? COLOR.muted : COLOR.ink}
              strokeWidth={off > 0.5 ? 5 : 4}
              strokeDasharray={off > 0.5 ? "4 14" : undefined}
              strokeLinecap="round"
              opacity={off > 0.5 ? 1 : 0.7}
            />
          );
        })}
      </svg>

      {/* 레시피 카드 */}
      <div
        style={{
          position: "absolute",
          left: l.card.x,
          top: l.card.y,
          width: l.card.w,
          height: l.card.h,
          borderRadius: 18,
          boxSizing: "border-box",
          border: `3px solid ${COLOR.ink}`,
          background: COLOR.white,
          opacity: intro,
        }}
      />
      <div style={{ position: "absolute", left: l.card.x + 28, top: l.card.y + 22, fontFamily: FONT, fontSize: l.text.label, fontWeight: 780, color: COLOR.ink, opacity: intro }}>
        <span style={{ opacity: 1 - v2, position: "absolute", whiteSpace: "nowrap" }}>레시피 v1</span>
        <span style={{ opacity: v2, color: COLOR.accent, whiteSpace: "nowrap" }}>레시피 v2</span>
      </div>
      {row(0, l.rows.cut, null)}
      {row(1, l.rows.out1, l.rows.out2)}
      {row(2, l.rows.vol1, l.rows.vol2)}
      <Arrow
        x1={l.card.x + l.card.w / 2}
        y1={l.card.y + l.card.h + 8}
        x2={l.card.x + l.card.w / 2 + (l.render.x + l.render.w / 2 - (l.card.x + l.card.w / 2))}
        y2={l.render.y - 10}
        color={COLOR.ink}
        draw={intro}
      />

      {/* 렌더 */}
      <div
        style={{
          position: "absolute",
          left: l.render.x,
          top: l.render.y,
          width: l.render.w,
          height: l.render.h,
          borderRadius: 16,
          boxSizing: "border-box",
          border: `3px solid ${COLOR.ink}`,
          background: COLOR.white,
          display: "grid",
          placeItems: "center",
          fontFamily: FONT,
          fontSize: l.text.label,
          fontWeight: 760,
          color: COLOR.ink,
          opacity: intro,
        }}
      >
        렌더
      </div>

      {/* 출력 */}
      {out1Arrow > 0 ? <Arrow
        x1={out1From.x + (mobile ? -60 : 8)}
        y1={out1From.y + (mobile ? 8 : 0)}
        x2={out1Target.x}
        y2={out1Target.y}
        color={out1Old > 0.5 ? COLOR.muted : COLOR.accent}
        dashed={out1Old > 0.5}
        draw={out1Arrow}
      /> : null}
      {outBox(l.out1, "1:1", out1Old > 0.5 ? "muted" : "accent", out1)}
      <Tag x={l.oldTag.x} y={l.oldTag.y} tone="muted" size={l.text.tag} anchor="center" opacity={out1Old}>
        앞 출력
      </Tag>
      {out2Arrow > 0 ? <Arrow
        x1={out2From.x + (mobile ? 60 : 0)}
        y1={out2From.y + (mobile ? 8 : 0)}
        x2={out2Target.x}
        y2={out2Target.y}
        color={COLOR.accent}
        draw={out2Arrow}
      /> : null}
      {outBox(l.out2, "9:16", "accent", out2)}
    </AbsoluteFill>
  );
};
