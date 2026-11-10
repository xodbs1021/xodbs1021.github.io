// 콘티: _workspace/blog/pokeclip-database-authoritative-manifest-publishing/storyboard.md 「영상 1」
// writer A 가 장부에서 세대 10 을 예약하고 PUT 을 보낸 채 멈춘다(마감 검사는 이미 지났다). fence 가 B 로 넘어가고, B 가 세대 11 을 예약해
// S3 에 11번까지 담은 판을 If-Match 로 올린다. 늦게 도착한 A 의 PUT 은 S3 앞에서 412 로, 장부를 맞추려는
// 쓰기는 fence 불일치로 막힌다(412 뒤 재시도 없음). S3 에는 11번까지 담은 판이 남는다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const LATE_WRITER_FENCED_FRAMES = 345;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤에는 1초 이상 멈춘다. */
const T = {
  intro: 0,
  reserveA: 18,
  stallA: 66,
  fenceB: 102,
  reserveB: 132,
  putB: 168,
  wakeA: 216,
  putA: 228,
  confirmA: 270,
} as const;
const DRAW = 18;
const FADE = 12;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Point = { readonly x: number; readonly y: number };
type Line = { readonly from: Point; readonly to: Point };

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly a: Box;
  readonly b: Box;
  readonly db: Box;
  readonly s3: Box;
  readonly lines: {
    readonly reserveA: Line;
    readonly reserveB: Line;
    readonly putB: Line;
    readonly putA: Line;
    readonly confirmA: Line;
  };
  /** 막힘 이름표 자리(가운데 맞춤 x). */
  readonly tags: { readonly s3: Point; readonly confirm: Point };
  readonly text: { readonly title: number; readonly box: number; readonly tag: number };
};

const DESKTOP: Layout = {
  title: [{ y: 52, text: "늦게 도착한 PUT은 조건에 막힌다" }],
  titleX: 120,
  a: { x: 120, y: 250, w: 380, h: 150 },
  b: { x: 120, y: 680, w: 380, h: 150 },
  db: { x: 760, y: 220, w: 440, h: 180 },
  s3: { x: 1400, y: 440, w: 400, h: 180 },
  lines: {
    reserveA: { from: { x: 500, y: 300 }, to: { x: 760, y: 290 } },
    reserveB: { from: { x: 500, y: 700 }, to: { x: 840, y: 400 } },
    putB: { from: { x: 500, y: 780 }, to: { x: 1400, y: 600 } },
    putA: { from: { x: 500, y: 385 }, to: { x: 1400, y: 500 } },
    confirmA: { from: { x: 500, y: 340 }, to: { x: 760, y: 350 } },
  },
  tags: { s3: { x: 1600, y: 650 }, confirm: { x: 980, y: 140 } },
  text: { title: TEXT.title, box: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  title: [
    { y: 70, text: "늦게 도착한 PUT은" },
    { y: 142, text: "조건에 막힌다" },
  ],
  titleX: 60,
  db: { x: 60, y: 250, w: 960, h: 160 },
  a: { x: 60, y: 560, w: 440, h: 160 },
  b: { x: 580, y: 560, w: 440, h: 160 },
  s3: { x: 60, y: 990, w: 960, h: 160 },
  lines: {
    reserveA: { from: { x: 160, y: 560 }, to: { x: 160, y: 410 } },
    reserveB: { from: { x: 1000, y: 560 }, to: { x: 1000, y: 410 } },
    putB: { from: { x: 800, y: 720 }, to: { x: 800, y: 990 } },
    putA: { from: { x: 280, y: 720 }, to: { x: 280, y: 990 } },
    confirmA: { from: { x: 400, y: 560 }, to: { x: 400, y: 410 } },
  },
  tags: { s3: { x: 540, y: 1168 }, confirm: { x: 760, y: 448 } },
  text: { title: MOBILE_TEXT.title, box: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 화살표가 막혔을 때는 대상 앞 85% 에서 멈춘다. */
const BLOCKED_REACH = 0.85;

const along = (line: Line, t: number): Line => ({
  from: line.from,
  to: { x: line.from.x + (line.to.x - line.from.x) * t, y: line.from.y + (line.to.y - line.from.y) * t },
});

type FlowProps = {
  readonly line: Line;
  readonly draw: number;
  readonly color: string;
  readonly dashed?: boolean;
  readonly opacity: number;
};

const Flow: React.FC<FlowProps> = ({ line, draw, color, dashed = false, opacity }) => (
  <div style={{ position: "absolute", inset: 0, opacity: draw > 0 ? opacity : 0 }}>
    <Arrow x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} color={color} dashed={dashed} draw={draw} />
  </div>
);

export const LateWriterFenced: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];

  const intro = progress(frame, T.intro, 15);
  const reserveA = progress(frame, T.reserveA, DRAW);
  const stallA = progress(frame, T.stallA, FADE);
  const fenceB = progress(frame, T.fenceB, FADE);
  const reserveB = progress(frame, T.reserveB, DRAW);
  const putB = progress(frame, T.putB, DRAW);
  const landedB = progress(frame, T.putB + DRAW, FADE);
  const wakeA = progress(frame, T.wakeA, FADE);
  const putA = progress(frame, T.putA, DRAW);
  const rejectS3 = progress(frame, T.putA + DRAW, FADE);
  const confirmA = progress(frame, T.confirmA, DRAW);
  const rejectDb = progress(frame, T.confirmA + DRAW, FADE);

  // 장부 글자: fence 주인과 마지막 예약 세대.
  const fenceOwner = fenceB > 0.5 ? "B" : "A";
  const gen = reserveB > 0.5 ? 11 : reserveA > 0.5 ? 10 : 9;

  // A 는 예약 → 멈춤(회색) → 깨어나 PUT. B 는 대기 → fence 획득 → 세대 11 PUT.
  const aMuted = stallA * (1 - wakeA);
  const aState = wakeA > 0.5 ? "늦은 PUT 도착" : stallA > 0.5 ? "PUT 중 멈춤" : reserveA > 0.5 ? "세대 10 예약" : "쓰는 중";
  const bState = putB > 0.5 ? "세대 11 PUT" : fenceB > 0.5 ? "fence 획득" : "대기";

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 흐름: 예약 · PUT · 확정. 막힌 흐름은 위험색 점선으로 대상 앞에서 멈춘다. */}
      <Flow line={l.lines.reserveA} draw={reserveA} color={COLOR.ink} opacity={1 - stallA} />
      <Flow line={l.lines.reserveB} draw={reserveB} color={COLOR.accent} opacity={1 - landedB * 0.6} />
      <Flow line={l.lines.putB} draw={putB} color={COLOR.accent} opacity={1} />
      <Flow line={along(l.lines.putA, BLOCKED_REACH)} draw={putA} color={COLOR.danger} dashed opacity={1} />
      <Flow line={along(l.lines.confirmA, BLOCKED_REACH)} draw={confirmA} color={COLOR.danger} dashed opacity={1} />

      <Node x={l.db.x} y={l.db.y} width={l.db.w} height={l.db.h} tone="ink" size={l.text.box} opacity={intro}>
        {`DB 장부\nfence ${fenceOwner} · 세대 ${gen}`}
      </Node>
      <Node x={l.s3.x} y={l.s3.y} width={l.s3.w} height={l.s3.h} tone="ink" size={l.text.box} opacity={intro * (1 - landedB)}>
        {"S3 목록\n세대 9 · 9번까지"}
      </Node>
      <Node x={l.s3.x} y={l.s3.y} width={l.s3.w} height={l.s3.h} tone="accent" size={l.text.box} opacity={landedB}>
        {"S3 목록\n세대 11 · 11번까지"}
      </Node>

      <Node x={l.a.x} y={l.a.y} width={l.a.w} height={l.a.h} tone="ink" size={l.text.box} opacity={intro * (1 - aMuted)}>
        {`writer A\n${aState}`}
      </Node>
      <Node x={l.a.x} y={l.a.y} width={l.a.w} height={l.a.h} tone="muted" size={l.text.box} opacity={aMuted}>
        {`writer A\n${aState}`}
      </Node>
      <Node x={l.b.x} y={l.b.y} width={l.b.w} height={l.b.h} tone="ink" size={l.text.box} opacity={intro * (1 - fenceB)}>
        {`writer B\n${bState}`}
      </Node>
      <Node x={l.b.x} y={l.b.y} width={l.b.w} height={l.b.h} tone="accent" size={l.text.box} opacity={fenceB}>
        {`writer B\n${bState}`}
      </Node>

      {/* 막힘: S3 는 412, 장부는 fence 불일치. */}
      <Tag x={l.tags.s3.x} y={l.tags.s3.y} tone="danger" size={l.text.tag} anchor="center" opacity={rejectS3}>
        PUT 412 · ETag 불일치
      </Tag>
      <Tag x={l.tags.confirm.x} y={l.tags.confirm.y} tone="danger" size={l.text.tag} anchor="center" opacity={rejectDb}>
        장부 거절 · fence B
      </Tag>
    </AbsoluteFill>
  );
};
