// 콘티: _workspace/blog/pokeclip-round-vod/storyboard.md 「영상 1」
// 목록이 둘로 갈린 회차의 다시보기가 어디까지 덮는가. 위 띠는 한 회차(약 2시간)이고, 앞 목록 seq 4–1626 과
// 뒤 목록 seq 1627–1733 을 EXTINF 합(6,784.8초 · 450.1초)에 비례해 그린다.
//   고치기 전 — 문서가 목록마다 하나라 둘이고, 회차 API 는 마지막 문서(7.5분)만 가리킨다.
//   고친 뒤 — 회차 문서 하나가 회차 전체를 덮고, 갈린 자리에 DISCONTINUITY 한 줄이 선다.
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(RoundDocumentMobile).
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const ROUND_DOCUMENT_FRAMES = 330;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤 1초 이상 멈춘다. */
const T = {
  intro: 0,
  split: 25,
  docA: 55,
  docB: 72,
  beforeBar: 100,
  dim: 150,
  roundDoc: 165,
  disc: 215,
  afterBar: 245,
} as const;
const DIM_TO = 0.7;

type Copy = {
  readonly round: string;
  readonly split: string;
  readonly frontRange: string;
  readonly tailRange: string;
  readonly before: string;
  readonly docA: string;
  readonly docB: string;
  readonly beforeGot: string;
  readonly after: string;
  readonly roundDoc: string;
  readonly disc: string;
  readonly afterGot: string;
};

type Layout = {
  readonly left: number;
  /** 앞 목록 폭 · 사이 간격 · 뒤 목록 폭(길이 비례). */
  readonly front: number;
  readonly gap: number;
  readonly tail: number;
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly y: {
    readonly roundLabel: number;
    readonly band: number;
    readonly rangeLabel: number;
    readonly splitTag: number;
    readonly beforeTag: number;
    readonly beforeDocs: number;
    readonly beforeBar: number;
    readonly afterTag: number;
    readonly afterDoc: number;
    readonly afterBar: number;
  };
  readonly bandHeight: number;
  readonly docHeight: number;
  readonly barHeight: number;
  readonly barTagGap: number;
  readonly text: { readonly title: number; readonly label: number; readonly small: number; readonly tag: number };
  readonly copy: Copy;
};

const DESKTOP: Layout = {
  left: 160,
  front: 1480,
  gap: 20,
  tail: 100,
  title: [{ y: 52, text: "갈린 목록, 다시보기는 어디까지 덮나" }],
  y: {
    roundLabel: 150,
    band: 210,
    rangeLabel: 290,
    splitTag: 140,
    beforeTag: 372,
    beforeDocs: 440,
    beforeBar: 552,
    afterTag: 672,
    afterDoc: 740,
    afterBar: 852,
  },
  bandHeight: 60,
  docHeight: 92,
  barHeight: 16,
  barTagGap: 14,
  text: { title: TEXT.title, label: TEXT.label, small: TEXT.small, tag: TEXT.small },
  copy: {
    round: "한 회차 · 약 2시간",
    split: "7.66초 조각 → 목록 둘",
    frontRange: "seq 4–1626 · TD 6",
    tailRange: "seq 1627–1733 · TD 8",
    before: "고치기 전",
    docA: "다시보기 문서 A · seq 4–1626",
    docB: "B",
    beforeGot: "회차 API가 준 다시보기 · 문서 B · 7.5분",
    after: "고친 뒤",
    roundDoc: "회차 문서 하나 · seq 4–1733",
    disc: "DISCONTINUITY",
    afterGot: "회차 API가 준 다시보기 · 회차 전체 · 약 2시간",
  },
};

const MOBILE: Layout = {
  left: 60,
  front: 884,
  gap: 16,
  tail: 60,
  title: [
    { y: 70, text: "갈린 목록, 다시보기는" },
    { y: 142, text: "어디까지 덮나" },
  ],
  y: {
    roundLabel: 250,
    band: 320,
    rangeLabel: 404,
    splitTag: 396,
    beforeTag: 520,
    beforeDocs: 598,
    beforeBar: 716,
    afterTag: 864,
    afterDoc: 942,
    afterBar: 1060,
  },
  bandHeight: 64,
  docHeight: 100,
  barHeight: 18,
  barTagGap: 16,
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, small: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
  copy: {
    round: "한 회차 · 약 2시간",
    split: "7.66초 → 목록 둘",
    frontRange: "seq 4–1626",
    tailRange: "",
    before: "고치기 전",
    docA: "문서 A",
    docB: "",
    beforeGot: "받은 다시보기 7.5분",
    after: "고친 뒤",
    roundDoc: "회차 문서 하나",
    disc: "DISCONTINUITY",
    afterGot: "받은 다시보기 약 2시간",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type EndTagProps = {
  readonly children: React.ReactNode;
  readonly right: number;
  readonly y: number;
  readonly background: string;
  readonly color: string;
  readonly size: number;
  readonly opacity: number;
};

/** 오른쪽 끝을 right 에 맞춘 둥근 이름표(공통 Tag 는 왼쪽 · 가운데 기준만 있다). */
const EndTag: React.FC<EndTagProps> = ({ children, right, y, background, color, size, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: right,
      top: y,
      transform: "translateX(-100%)",
      padding: "8px 22px",
      borderRadius: 999,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      whiteSpace: "nowrap",
      background,
      color,
      opacity,
    }}
  >
    {children}
  </div>
);

type BarProps = { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly color: string };

const Bar: React.FC<BarProps> = ({ x, y, width, height, color }) => (
  <div style={{ position: "absolute", left: x, top: y, width, height, borderRadius: height / 2, background: color }} />
);

export const RoundDocument: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;
  const total = l.front + l.gap + l.tail;
  const right = l.left + total;
  const tailX = l.left + l.front + l.gap;
  const splitX = l.left + l.front + l.gap / 2;

  const intro = progress(frame, T.intro, 15);
  const split = progress(frame, T.split, 18, EASE_IN_OUT);
  const docA = progress(frame, T.docA, 15);
  const docB = progress(frame, T.docB, 15);
  const beforeBar = progress(frame, T.beforeBar, 22, EASE_IN_OUT);
  const dim = interpolate(progress(frame, T.dim, 15, EASE_IN_OUT), [0, 1], [1, DIM_TO]);
  const after = progress(frame, T.roundDoc, 12);
  const grow = progress(frame, T.roundDoc + 6, 40, EASE_IN_OUT);
  const disc = progress(frame, T.disc, 18, EASE_IN_OUT);
  const afterBar = progress(frame, T.afterBar, 28, EASE_IN_OUT);

  const chain = (x: number, width: number) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: l.y.band,
        width,
        height: l.bandHeight,
        borderRadius: 12,
        boxSizing: "border-box",
        background: COLOR.surface,
        border: `3px solid ${COLOR.muted}`,
        opacity: intro,
      }}
    />
  );

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.left} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 한 회차 — 앞 목록과 뒤 목록을 길이 비례로. */}
      <Label x={l.left} y={l.y.roundLabel} size={l.text.label} weight={720} opacity={intro}>
        {c.round}
      </Label>
      {chain(l.left, l.front)}
      {chain(tailX, l.tail)}
      <Label x={l.left} y={l.y.rangeLabel} size={l.text.small} color={COLOR.muted} weight={600} opacity={split}>
        {c.frontRange}
      </Label>
      {c.tailRange ? (
        <Label x={right} y={l.y.rangeLabel} size={l.text.small} color={COLOR.muted} weight={600} anchor="right" opacity={split}>
          {c.tailRange}
        </Label>
      ) : null}

      {/* 목록이 갈린 자리. */}
      <div
        style={{
          position: "absolute",
          left: splitX - 3,
          top: l.y.band - 18,
          width: 6,
          height: (l.bandHeight + 36) * split,
          background: COLOR.danger,
          borderRadius: 3,
        }}
      />
      <EndTag right={right} y={l.y.splitTag} background={COLOR.danger} color={COLOR.white} size={l.text.tag} opacity={split}>
        {c.split}
      </EndTag>

      {/* 고치기 전 — 문서가 목록마다 하나. 회차 API 는 마지막 문서만. */}
      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        <Tag x={l.left} y={l.y.beforeTag} tone="ink" size={l.text.tag} opacity={docA}>
          {c.before}
        </Tag>
        <Node x={l.left} y={l.y.beforeDocs} width={l.front} height={l.docHeight} tone="muted" size={l.text.small} opacity={docA}>
          {c.docA}
        </Node>
        <Node x={tailX} y={l.y.beforeDocs} width={l.tail} height={l.docHeight} tone="ink" size={l.text.small} opacity={docB}>
          {c.docB}
        </Node>
        <Bar x={tailX} y={l.y.beforeBar} width={l.tail * beforeBar} height={l.barHeight} color={COLOR.danger} />
        <EndTag
          right={right}
          y={l.y.beforeBar + l.barHeight + l.barTagGap}
          background={COLOR.danger}
          color={COLOR.white}
          size={l.text.tag}
          opacity={beforeBar}
        >
          {c.beforeGot}
        </EndTag>
      </div>

      {/* 고친 뒤 — 회차 문서 하나가 회차 전체를, 갈린 자리에 DISCONTINUITY. */}
      <Tag x={l.left} y={l.y.afterTag} tone="accent" size={l.text.tag} opacity={after}>
        {c.after}
      </Tag>
      <div
        style={{
          position: "absolute",
          left: l.left,
          top: l.y.afterDoc,
          width: total * grow,
          height: l.docHeight,
          overflow: "hidden",
        }}
      >
        <Node x={0} y={0} width={total} height={l.docHeight} tone="accent" size={l.text.small}>
          {c.roundDoc}
        </Node>
      </div>
      <div
        style={{
          position: "absolute",
          left: splitX - 3,
          top: l.y.afterDoc - 10,
          width: 6,
          height: (l.docHeight + 20) * disc,
          background: COLOR.ink,
          borderRadius: 3,
        }}
      />
      <EndTag right={right} y={l.y.afterTag} background={COLOR.ink} color={COLOR.white} size={l.text.tag} opacity={disc}>
        {c.disc}
      </EndTag>
      <Bar x={l.left} y={l.y.afterBar} width={total * afterBar} height={l.barHeight} color={COLOR.accent} />
      <Tag
        x={l.left}
        y={l.y.afterBar + l.barHeight + l.barTagGap}
        tone="accent"
        size={l.text.tag}
        opacity={afterBar}
      >
        {c.afterGot}
      </Tag>
    </AbsoluteFill>
  );
};
