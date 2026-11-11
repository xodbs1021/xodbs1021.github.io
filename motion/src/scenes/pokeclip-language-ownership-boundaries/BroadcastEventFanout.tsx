// 콘티: _workspace/blog/pokeclip-language-ownership-boundaries/storyboard.md 「영상 1」
// Go 사이드카가 낸 방송 시작 봉투가 SNS FIFO → 소비자별 SQS FIFO → Spring 서버 둘(chat-collector · clip)로 간다.
// 언어가 달라도 받는 쪽 카드의 세 칸(streamId · ingestStreamId · eventId)은 보낸 쪽과 같다.
// 근거: media/internal/broadcast/envelope.go Envelope · infra/terraform/prod/runtime/broadcast_events.tf(소비자 clip · chat).
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Wire } from "../../components/Flow";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const BROADCAST_EVENT_FANOUT_FRAMES = 330;

const T = {
  intro: 0,
  legA: 30,
  atSns: 75,
  legB: 105,
  atSqs: 150,
  legC: 180,
  atApp: 225,
  cards: 230,
  same: 260,
} as const;
const LEG = 45;
const FADE = 12;

type Pt = readonly [number, number];
type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly sidecar: Box;
  readonly sns: Box;
  readonly sqs: readonly [Box, Box];
  readonly app: readonly [Box, Box];
  readonly sendCard: Box;
  readonly recvCard: readonly [Box, Box];
  readonly wireA: readonly Pt[];
  readonly wireB: readonly [readonly Pt[], readonly Pt[]];
  readonly wireC: readonly [readonly Pt[], readonly Pt[]];
  readonly sameTag: { readonly x: number; readonly y: number };
  /** 휴대폰판은 Spring 이름표를 상자 안 둘째 줄로 넣는다(모서리 이름표가 글자를 가린다). */
  readonly badgeInside: boolean;
  readonly text: { readonly title: number; readonly node: number; readonly tag: number; readonly row: number; readonly head: number };
};

const DESKTOP: Layout = {
  title: [{ y: 32, text: "Go가 보낸 봉투를 Spring 두 서버가 같은 칸으로 받습니다" }],
  titleX: 100,
  sidecar: { x: 100, y: 360, w: 320, h: 110 },
  sns: { x: 540, y: 360, w: 300, h: 110 },
  sqs: [
    { x: 960, y: 150, w: 300, h: 110 },
    { x: 960, y: 570, w: 300, h: 110 },
  ],
  app: [
    { x: 1380, y: 150, w: 420, h: 110 },
    { x: 1380, y: 570, w: 420, h: 110 },
  ],
  sendCard: { x: 100, y: 510, w: 360, h: 250 },
  recvCard: [
    { x: 1420, y: 290, w: 360, h: 250 },
    { x: 1420, y: 710, w: 360, h: 250 },
  ],
  wireA: [
    [420, 415],
    [540, 415],
  ],
  wireB: [
    [
      [840, 415],
      [900, 415],
      [900, 205],
      [960, 205],
    ],
    [
      [840, 415],
      [900, 415],
      [900, 625],
      [960, 625],
    ],
  ],
  wireC: [
    [
      [1260, 205],
      [1380, 205],
    ],
    [
      [1260, 625],
      [1380, 625],
    ],
  ],
  sameTag: { x: 1110, y: 385 },
  badgeInside: false,
  text: { title: TEXT.title, node: TEXT.label, tag: TEXT.small, row: TEXT.small, head: TEXT.label },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "Go가 보낸 봉투를 Spring" },
    { y: 124, text: "두 서버가 같은 칸으로 받습니다" },
  ],
  titleX: 60,
  sidecar: { x: 60, y: 240, w: 450, h: 110 },
  sns: { x: 60, y: 480, w: 450, h: 100 },
  sqs: [
    { x: 60, y: 650, w: 450, h: 100 },
    { x: 570, y: 650, w: 450, h: 100 },
  ],
  app: [
    { x: 60, y: 800, w: 450, h: 130 },
    { x: 570, y: 800, w: 450, h: 130 },
  ],
  sendCard: { x: 540, y: 210, w: 480, h: 300 },
  recvCard: [
    { x: 60, y: 950, w: 450, h: 292 },
    { x: 570, y: 950, w: 450, h: 292 },
  ],
  wireA: [
    [285, 350],
    [285, 480],
  ],
  wireB: [
    [
      [285, 580],
      [285, 650],
    ],
    [
      [510, 530],
      [795, 530],
      [795, 650],
    ],
  ],
  wireC: [
    [
      [285, 750],
      [285, 800],
    ],
    [
      [795, 750],
      [795, 800],
    ],
  ],
  sameTag: { x: 540, y: 1262 },
  badgeInside: true,
  text: { title: MOBILE_TEXT.title, node: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, row: MOBILE_TEXT.small, head: MOBILE_TEXT.label },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const FIELDS = ["streamId", "ingestStreamId", "eventId"] as const;

/** 꺾은선 위의 한 점(진행 0–1). */
const along = (points: readonly Pt[], t: number): Pt => {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  let left = total * t;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const r = lengths[i] === 0 ? 0 : Math.min(1, left / lengths[i]);
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * r, points[i][1] + (points[i + 1][1] - points[i][1]) * r];
    }
    left -= lengths[i];
  }
  return points[points.length - 1];
};

export const BroadcastEventFanout: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];

  const intro = progress(frame, T.intro, 15);
  const a = progress(frame, T.legA, LEG);
  const b = progress(frame, T.legB, LEG);
  const c = progress(frame, T.legC, LEG);
  const cards = progress(frame, T.cards, FADE);
  const same = progress(frame, T.same, FADE);

  const on = (at: number) => frame >= at;

  const node = (box: Box, text: string, lit: boolean, key: string, sub?: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        borderRadius: 16,
        boxSizing: "border-box",
        border: lit ? `5px solid ${COLOR.accent}` : `3px solid ${COLOR.ink}`,
        background: lit ? COLOR.accentSoft : COLOR.white,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        lineHeight: 1.15,
        fontFamily: FONT,
        fontSize: l.text.node,
        fontWeight: 720,
        color: COLOR.ink,
        opacity: intro,
      }}
    >
      {text}
      {sub ? <span style={{ fontSize: l.text.tag, fontWeight: 760, color: COLOR.muted }}>{sub}</span> : null}
    </div>
  );

  const card = (box: Box, lit: number, opacity: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        borderRadius: 16,
        boxSizing: "border-box",
        border: `3px solid ${COLOR.ink}`,
        background: COLOR.white,
        padding: "18px 26px",
        fontFamily: FONT,
        opacity,
      }}
    >
      <div style={{ fontSize: l.text.head, fontWeight: 780, color: COLOR.ink, marginBottom: 10 }}>방송 시작</div>
      {FIELDS.map((f) => (
        <div key={f} style={{ position: "relative", fontSize: l.text.row, fontWeight: 650, color: COLOR.ink, lineHeight: 1.45, paddingLeft: 12 }}>
          <div
            style={{
              position: "absolute",
              left: -4,
              right: -10,
              top: 4,
              bottom: 4,
              borderRadius: 8,
              background: COLOR.accentSoft,
              borderLeft: `6px solid ${COLOR.accent}`,
              opacity: lit,
            }}
          />
          <span style={{ position: "relative" }}>{f}</span>
        </div>
      ))}
    </div>
  );

  const dot = (p: Pt, opacity: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: p[0] - 20,
        top: p[1] - 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        background: COLOR.accent,
        border: `5px solid ${COLOR.white}`,
        boxShadow: `0 0 0 4px ${COLOR.accent}`,
        boxSizing: "border-box",
        opacity,
      }}
    />
  );

  // 점은 상자 가장자리 사이 선 위로만 지난다.
  const sidecarLit = on(T.legA);
  const snsLit = on(T.atSns);
  const sqsLit = on(T.atSqs);
  const appLit = on(T.atApp);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <Wire points={l.wireA} color={sidecarLit ? COLOR.accent : COLOR.ink} opacity={intro} />
      {l.wireB.map((w, i) => (
        <Wire key={`b${i}`} points={w} color={snsLit && frame >= T.legB ? COLOR.accent : COLOR.ink} opacity={intro} />
      ))}
      {l.wireC.map((w, i) => (
        <Wire key={`c${i}`} points={w} color={sqsLit && frame >= T.legC ? COLOR.accent : COLOR.ink} opacity={intro} />
      ))}

      {/* 이동하는 봉투(점). */}
      {frame >= T.legA && frame < T.atSns + 4 ? dot(along(l.wireA, a), 1, "a") : null}
      {frame >= T.legB && frame < T.atSqs + 4 ? l.wireB.map((w, i) => dot(along(w, b), 1, `b${i}`)) : null}
      {frame >= T.legC && frame < T.atApp + 4 ? l.wireC.map((w, i) => dot(along(w, c), 1, `c${i}`)) : null}

      {node(l.sidecar, "사이드카", sidecarLit, "sidecar")}
      {node(l.sns, "SNS FIFO", snsLit, "sns")}
      {l.sqs.map((box, i) => node(box, "SQS FIFO", sqsLit, `sqs${i}`))}
      {node(l.app[0], "chat-collector", appLit, "app0", l.badgeInside ? "Spring" : undefined)}
      {node(l.app[1], "clip", appLit, "app1", l.badgeInside ? "Spring" : undefined)}

      <Tag x={l.sidecar.x + l.sidecar.w - 30} y={l.sidecar.y - 34} tone="ink" size={l.text.tag} anchor="center" opacity={intro}>
        Go
      </Tag>
      {l.badgeInside ? null : l.app.map((box, i) => (
        <Tag key={`sp${i}`} x={box.x + box.w - 70} y={box.y - 34} tone="ink" size={l.text.tag} anchor="center" opacity={intro}>
          Spring
        </Tag>
      ))}

      {card(l.sendCard, sidecarLit ? 1 : 0, intro, "send")}
      {l.recvCard.map((box, i) => card(box, cards, cards, `recv${i}`))}

      <Tag x={l.sameTag.x} y={l.sameTag.y} tone="accent" size={l.text.tag} anchor="center" opacity={same}>
        칸 이름 그대로
      </Tag>
    </AbsoluteFill>
  );
};
