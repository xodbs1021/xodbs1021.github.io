// 콘티: _workspace/blog/pokeclip-one-time-pairing-contract/storyboard.md
// 페어링 코드 하나의 수명. 위 줄 = 쓴 코드(교환 200 → 다시 입력 409 → 청소 뒤 404),
// 아래 줄 = 쓰지 않은 코드(10분 뒤 만료 → 입력 410 → 청소 뒤 404). 재생점이 시간축을 지나며
// 띠가 칠해지고 응답 이름표가 뜬다. 시간축 길이는 설명용(10분과 1시간을 같은 비율로 그리지 않는다).
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Playhead, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const PAIRING_CODE_LIFETIME_FRAMES = 360;

type Tone = "valid" | "used" | "expired" | "gone";
type Segment = { readonly from: number; readonly to: number; readonly tone: Tone; readonly label?: string };
type Reply = { readonly x: number; readonly at: number; readonly dy: number; readonly tone: "accent" | "ink" | "danger" | "muted"; readonly text: string };
type Row = { readonly title: string; readonly y: number; readonly segments: readonly Segment[]; readonly replies: readonly Reply[] };
type Tick = { readonly x: number; readonly text: string };

type Layout = {
  readonly axis: { readonly x1: number; readonly x2: number; readonly y: number };
  readonly ticks: readonly Tick[];
  /** 「만료 뒤 1시간 보관」 괄호 [x1, x2]. */
  readonly keep: readonly [number, number];
  readonly rows: readonly Row[];
  readonly band: number;
  readonly text: { readonly tick: number; readonly row: number; readonly band: number; readonly tag: number };
};

// 데스크톱 x: 발급 360 · 교환 560 · 만료 900 · 보관 끝 1500 · 청소 1560 · 끝 1800.
const DESKTOP: Layout = {
  axis: { x1: 360, x2: 1800, y: 170 },
  ticks: [
    { x: 360, text: "발급" },
    { x: 900, text: "10분 · 만료" },
    { x: 1560, text: "청소" },
  ],
  keep: [900, 1500],
  band: 76,
  rows: [
    {
      title: "쓴 코드",
      y: 400,
      segments: [
        { from: 360, to: 560, tone: "valid", label: "유효" },
        { from: 560, to: 1560, tone: "used", label: "사용됨 · 행 남음" },
        { from: 1560, to: 1800, tone: "gone", label: "행 없음" },
      ],
      replies: [
        { x: 480, at: 560, dy: 0, tone: "accent", text: "200 교환" },
        { x: 1040, at: 1040, dy: 0, tone: "ink", text: "다시 입력 → 409" },
        { x: 1560, at: 1600, dy: 0, tone: "muted", text: "→ 404" },
      ],
    },
    {
      title: "쓰지 않은 코드",
      y: 750,
      segments: [
        { from: 360, to: 900, tone: "valid", label: "유효" },
        { from: 900, to: 1560, tone: "expired", label: "만료 · 행 남음" },
        { from: 1560, to: 1800, tone: "gone", label: "행 없음" },
      ],
      replies: [
        { x: 1040, at: 1040, dy: 0, tone: "ink", text: "입력 → 410" },
        { x: 1560, at: 1600, dy: 0, tone: "muted", text: "→ 404" },
      ],
    },
  ],
  text: { tick: TEXT.small, row: TEXT.label, band: TEXT.small, tag: TEXT.small },
};

// 휴대폰 x: 발급 90 · 교환 200 · 만료 380 · 보관 끝 800 · 청소 840 · 끝 1000.
const MOBILE: Layout = {
  axis: { x1: 90, x2: 1000, y: 150 },
  ticks: [
    { x: 90, text: "발급" },
    { x: 380, text: "만료" },
    { x: 840, text: "청소" },
  ],
  keep: [380, 800],
  band: 96,
  rows: [
    {
      title: "쓴 코드",
      y: 430,
      segments: [
        { from: 90, to: 200, tone: "valid" },
        { from: 200, to: 840, tone: "used", label: "사용됨" },
        { from: 840, to: 1000, tone: "gone" },
      ],
      replies: [
        { x: 60, at: 200, dy: 0, tone: "accent", text: "200" },
        { x: 400, at: 480, dy: 0, tone: "ink", text: "다시 → 409" },
        { x: 740, at: 870, dy: 104, tone: "muted", text: "→ 404" },
      ],
    },
    {
      title: "쓰지 않은 코드",
      y: 920,
      segments: [
        { from: 90, to: 380, tone: "valid", label: "유효" },
        { from: 380, to: 840, tone: "expired", label: "만료" },
        { from: 840, to: 1000, tone: "gone" },
      ],
      replies: [
        { x: 400, at: 480, dy: 0, tone: "ink", text: "입력 → 410" },
        { x: 740, at: 870, dy: 104, tone: "muted", text: "→ 404" },
      ],
    },
  ],
  text: { tick: MOBILE_TEXT.small, row: MOBILE_TEXT.label, band: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

/** 재생점이 축을 지나는 구간(프레임). 끝에서 2초 남짓 멈춘다. */
const PLAY = { start: 20, end: 290 } as const;

const SEGMENT_STYLE = {
  valid: { background: COLOR.accentSoft, border: `4px solid ${COLOR.accent}`, color: COLOR.ink },
  used: { background: COLOR.white, border: `4px solid ${COLOR.ink}`, color: COLOR.ink },
  expired: { background: COLOR.surface, border: `4px solid ${COLOR.muted}`, color: COLOR.muted },
  gone: { background: COLOR.white, border: `4px dashed ${COLOR.muted}`, color: COLOR.muted },
} as const;

type BandProps = { readonly seg: Segment; readonly y: number; readonly height: number; readonly reveal: number; readonly size: number };

/** 상태 띠 한 칸 — 재생점이 지난 만큼만 보인다. 글자는 칸이 다 드러난 뒤에 뜬다. */
const Band: React.FC<BandProps> = ({ seg, y, height, reveal, size }) => {
  const shown = Math.max(0, Math.min(seg.to, reveal) - seg.from);
  if (shown <= 0) return null;
  const full = reveal >= seg.to;
  return (
    <div
      style={{
        position: "absolute",
        left: seg.from,
        top: y,
        width: shown,
        height,
        boxSizing: "border-box",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 680,
        whiteSpace: "nowrap",
        ...SEGMENT_STYLE[seg.tone],
      }}
    >
      {full && seg.label ? seg.label : null}
    </div>
  );
};

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const PairingCodeLifetime: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const { x1, x2, y: axisY } = l.axis;
  const t = progress(frame, PLAY.start, PLAY.end - PLAY.start, (v) => v);
  const head = x1 + (x2 - x1) * t;
  const intro = progress(frame, 0, 15);
  const keepShown = head >= l.keep[1];
  const rowsBottom = l.rows[l.rows.length - 1].y + l.band;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 시간축과 눈금. */}
      <div style={{ position: "absolute", left: x1, top: axisY, width: x2 - x1, height: 6, background: COLOR.ink, opacity: intro }} />
      {l.ticks.map((tick) => (
        <div key={tick.text} style={{ opacity: intro }}>
          <div style={{ position: "absolute", left: tick.x - 3, top: axisY - 16, width: 6, height: 38, background: COLOR.ink }} />
          <Label x={tick.x} y={axisY - 74} size={l.text.tick} anchor="center">
            {tick.text}
          </Label>
        </div>
      ))}
      {/* 만료 뒤 1시간 보관 괄호. */}
      <div
        style={{
          position: "absolute",
          left: l.keep[0],
          top: axisY + 30,
          width: l.keep[1] - l.keep[0],
          height: 22,
          borderLeft: `4px solid ${COLOR.muted}`,
          borderRight: `4px solid ${COLOR.muted}`,
          borderBottom: `4px solid ${COLOR.muted}`,
          opacity: keepShown ? 1 : 0.25,
        }}
      />
      <Label
        x={(l.keep[0] + l.keep[1]) / 2}
        y={axisY + 62}
        size={l.text.tick}
        color={COLOR.muted}
        anchor="center"
        opacity={keepShown ? 1 : 0.25}
      >
        만료 뒤 1시간 보관
      </Label>

      {l.rows.map((row) => (
        <div key={row.title}>
          <Label x={x1} y={row.y - 66} size={l.text.row} weight={720} opacity={intro}>
            {row.title}
          </Label>
          {row.segments.map((seg) => (
            <Band key={`${seg.from}-${seg.tone}`} seg={seg} y={row.y} height={l.band} reveal={head} size={l.text.band} />
          ))}
          {row.replies.map((reply) => (
            <Tag
              key={reply.text + reply.x}
              x={reply.x}
              y={row.y + l.band + 22 + reply.dy}
              tone={reply.tone}
              size={l.text.tag}
              opacity={progress(frame, PLAY.start + ((reply.at - x1) / (x2 - x1)) * (PLAY.end - PLAY.start), 10)}
            >
              {reply.text}
            </Tag>
          ))}
        </div>
      ))}

      <Playhead x={head} top={axisY - 10} height={rowsBottom - axisY + 40} color={COLOR.ink} opacity={intro} />
    </AbsoluteFill>
  );
};
