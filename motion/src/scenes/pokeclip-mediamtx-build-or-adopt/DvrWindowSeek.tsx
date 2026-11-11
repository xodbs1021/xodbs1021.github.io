// 콘티: _workspace/blog/pokeclip-mediamtx-build-or-adopt/storyboard.md 「영상 1」
// 7월 24일 시험은 약 10초 창에서 창 밖으로 탐색해 라이브 끝으로 튕겼고(「되감기 불가」로 판정),
// 7월 25일 300초 창(조각 150개)과 따라잡기를 끈 플레이어로는 라이브 끝 −178초에 머물렀다(판정 뒤집힘).
// 위 줄의 탐색 거리(−60초)는 「창 밖」을 보이기 위한 설명용 값이다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Playhead, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const DVR_WINDOW_SEEK_FRAMES = 330;

const T = {
  intro: 0,
  drag1: 30,
  snap1: 90,
  bounced: 96,
  drag2: 140,
  stay2: 200,
} as const;
const FADE = 12;

const SPAN = 300;
const NARROW = 10;
const OUTSIDE = -60;
const STAY = -178;

type Row = { readonly titleY: number; readonly y: number; readonly tagY: number };

type Layout = {
  readonly width: number;
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly left: number;
  readonly right: number;
  readonly trackH: number;
  readonly rows: readonly [Row, Row];
  readonly rowTitles: readonly [string, string];
  readonly axisY: number;
  readonly margin: number;
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
};

const DESKTOP: Layout = {
  width: 1920,
  title: [{ y: 32, text: "창 밖으로 감기면 튕기고, 창 안이면 머뭅니다" }],
  left: 220,
  right: 1700,
  trackH: 96,
  rows: [
    { titleY: 140, y: 214, tagY: 336 },
    { titleY: 462, y: 554, tagY: 676 },
  ],
  rowTitles: ["7월 24일 · 창 약 10초", "7월 25일 · 창 300초 · 따라잡기 끔"],
  axisY: 840,
  margin: 80,
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  width: 1080,
  title: [
    { y: 56, text: "창 밖으로 감기면 튕기고," },
    { y: 124, text: "창 안이면 머뭅니다" },
  ],
  left: 110,
  right: 940,
  trackH: 110,
  rows: [
    { titleY: 250, y: 330, tagY: 466 },
    { titleY: 600, y: 720, tagY: 856 },
  ],
  rowTitles: ["7월 24일 · 창 약 10초", "7월 25일 · 창 300초 · 따라잡기 끔"],
  axisY: 1020,
  margin: 50,
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 이름표를 캔버스 안에 가둔다(가운데 기준, 대략 폭 추정). */
const clampCenter = (x: number, text: string, size: number, width: number, margin: number) => {
  const half = (text.length * size * 0.9 + 44) / 2;
  return Math.min(Math.max(x, margin + half), width - margin - half);
};

export const DvrWindowSeek: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const mobile = layout === "mobile";
  const x = (t: number) => l.right + (t / SPAN) * (l.right - l.left);

  const intro = progress(frame, T.intro, 15);
  const drag1 = progress(frame, T.drag1, 40, EASE_IN_OUT);
  const snap1 = progress(frame, T.snap1, 6);
  const bounced = progress(frame, T.bounced, FADE);
  const drag2 = progress(frame, T.drag2, 50, EASE_IN_OUT);
  const stay2 = progress(frame, T.stay2, FADE);

  const head1 = OUTSIDE * drag1 * (1 - snap1);
  const head2 = STAY * drag2;
  const outsideTag = frame >= T.drag1 + 6 && frame < T.snap1 ? progress(frame, T.drag1 + 6, FADE) : 0;

  const track = (row: Row) => (
    <div
      style={{
        position: "absolute",
        left: l.left,
        top: row.y + l.trackH / 2 - 6,
        width: l.right - l.left,
        height: 12,
        borderRadius: 6,
        background: COLOR.line,
        opacity: intro,
      }}
    />
  );

  const band = (row: Row, from: number) => (
    <div
      style={{
        position: "absolute",
        left: x(from),
        top: row.y,
        width: x(0) - x(from),
        height: l.trackH,
        borderRadius: 16,
        background: COLOR.accentSoft,
        border: `4px solid ${COLOR.accent}`,
        boxSizing: "border-box",
        opacity: intro,
      }}
    />
  );

  const liveEdge = (row: Row) => (
    <div style={{ position: "absolute", left: x(0) - 3, top: row.y - 14, width: 6, height: l.trackH + 28, background: COLOR.ink, opacity: intro }} />
  );

  const outsideText = "창 밖으로 탐색";
  const bouncedText = "라이브로 튕김";
  const stayText = `${STAY}초에 머묾`.replace("-", "−");

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={mobile ? 60 : 120} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 위 줄: 약 10초 창 */}
      <Label x={l.left} y={l.rows[0].titleY} size={l.text.label} weight={700} opacity={intro}>
        {l.rowTitles[0]}
      </Label>
      {track(l.rows[0])}
      {band(l.rows[0], -NARROW)}
      {liveEdge(l.rows[0])}
      <Playhead x={x(head1)} top={l.rows[0].y - 30} height={l.trackH + 50} color={snap1 > 0 ? COLOR.danger : COLOR.ink} opacity={intro} />
      <Tag
        x={clampCenter(x(OUTSIDE), outsideText, l.text.tag, l.width, l.margin)}
        y={l.rows[0].tagY}
        tone="ink"
        size={l.text.tag}
        anchor="center"
        opacity={outsideTag}
      >
        {outsideText}
      </Tag>
      <Tag
        x={clampCenter(x(0), bouncedText, l.text.tag, l.width, l.margin)}
        y={l.rows[0].tagY}
        tone="danger"
        size={l.text.tag}
        anchor="center"
        opacity={bounced}
      >
        {bouncedText}
      </Tag>

      {/* 아래 줄: 300초 창 + 따라잡기 끔 */}
      <Label x={l.left} y={l.rows[1].titleY} size={l.text.label} weight={700} opacity={intro}>
        {l.rowTitles[1]}
      </Label>
      {track(l.rows[1])}
      {band(l.rows[1], -SPAN)}
      {liveEdge(l.rows[1])}
      <Playhead x={x(head2)} top={l.rows[1].y - 30} height={l.trackH + 50} color={stay2 > 0 ? COLOR.accent : COLOR.ink} opacity={intro} />
      <Tag
        x={clampCenter(x(STAY), stayText, l.text.tag, l.width, l.margin)}
        y={l.rows[1].tagY}
        tone="accent"
        size={l.text.tag}
        anchor="center"
        opacity={stay2}
      >
        {stayText}
      </Tag>

      {/* 시간 축 */}
      <div style={{ position: "absolute", left: l.left, top: l.axisY, width: l.right - l.left, height: 4, background: COLOR.muted, opacity: intro }} />
      {[-SPAN, 0].map((t) => (
        <div key={t} style={{ position: "absolute", left: x(t) - 2, top: l.axisY - 14, width: 4, height: 32, background: COLOR.muted, opacity: intro }} />
      ))}
      <div style={{ position: "absolute", left: x(STAY) - 3, top: l.axisY - 18, width: 6, height: 40, background: COLOR.accent, opacity: stay2 }} />
      <Label x={x(-SPAN)} y={l.axisY + 28} size={l.text.tag} color={COLOR.muted} weight={650} anchor="center" opacity={intro}>
        −300초
      </Label>
      <Label x={x(STAY)} y={l.axisY + 28} size={l.text.tag} color={COLOR.accent} weight={720} anchor="center" opacity={stay2}>
        −178초
      </Label>
      <Label x={x(0)} y={l.axisY + 28} size={l.text.tag} color={COLOR.ink} weight={720} anchor="center" opacity={intro}>
        0
      </Label>
      <Label x={x(0)} y={l.axisY + 28 + l.text.tag * 1.35} size={l.text.tag} color={COLOR.ink} weight={720} anchor={mobile ? "right" : "center"} opacity={intro}>
        라이브 끝
      </Label>
      {/* 끌린 흔적 — 위 줄의 탐색 화살표 */}
      <div
        style={{
          position: "absolute",
          left: x(OUTSIDE),
          top: l.rows[0].y + l.trackH / 2 - 3,
          width: x(0) - x(OUTSIDE),
          height: 6,
          borderTop: `6px dashed ${COLOR.danger}`,
          opacity: bounced * 0.8,
          fontFamily: FONT,
        }}
      />
    </AbsoluteFill>
  );
};
