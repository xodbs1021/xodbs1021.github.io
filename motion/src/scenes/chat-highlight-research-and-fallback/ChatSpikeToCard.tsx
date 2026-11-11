// 콘티: _workspace/blog/chat-highlight-research-and-fallback/storyboard.md 「영상 1」
// 채팅 급증 카드 하나가 만들어지는 순서(PokeClip-mono develop 2fc2323c 기본값).
// 5초 창 메시지 수 ≥ 최근 15분 중앙값 × 3 그리고 10건 이상 → 20초 안의 급증 창은 한 사건 →
// 첫 급증 창 시작을 − 3.9초 옮겨 영상 위치 → 앞 15초 · 뒤 5초를 붙여 카드 구간 → 카드 목록.
// 손으로 표시한 카드(OBS 핫키 · 웹 마킹)도 같은 목록에 들어온다.
// 막대 값과 기준선 6 은 설명용(실측 아님). 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, MOBILE_VIDEO, TEXT, VIDEO } from "../../theme";

export const CHAT_SPIKE_TO_CARD_FRAMES = 360;

/** 장면 순서(프레임, 30fps). */
const T = {
  bars: 6,
  lines: 80,
  spike: 120,
  group: 150,
  shift: 185,
  span: 225,
  fly: 265,
  hotkey: 290,
} as const;
const FADE = 12;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 5초 창의 메시지 수(설명용). 8 · 9 · 11 번 창이 급증, 7 번(14)은 10건은 넘지만 3배에 못 미친다. */
const COUNTS = [4, 5, 3, 5, 4, 5, 5, 14, 22, 26, 6, 20, 5, 4, 6, 5] as const;
const BASELINE = 6;
const RATIO = 3;
const MIN_COUNT = 10;
const SPIKES = COUNTS.map((c) => c >= MIN_COUNT && c >= RATIO * BASELINE);
const FIRST_SPIKE = SPIKES.indexOf(true);
const LAST_SPIKE = SPIKES.lastIndexOf(true);

/** 초 단위 값(코드 기본값). */
const WINDOW_S = 5;
const OFFSET_S = 3.9;
const LEAD_S = 15;
const TAIL_S = 5;

type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Layout = {
  readonly x0: number;
  /** 5초 창 하나의 폭(px). */
  readonly step: number;
  readonly barW: number;
  readonly chatTitleY: number;
  readonly axisY: number;
  /** 메시지 1건의 높이(px). */
  readonly unit: number;
  readonly groupLabelY: number;
  readonly bracketY: number;
  readonly highTagRight: number;
  readonly videoTitleY: number;
  readonly band: { readonly y: number; readonly h: number };
  readonly videoAxisY: number;
  readonly spanLabelY: number;
  readonly shiftTag: { readonly dx: number; readonly y: number };
  readonly panel: Rect;
  readonly listTitle: { readonly x: number; readonly y: number };
  readonly slots: readonly [Rect, Rect];
  readonly text: { readonly head: number; readonly tag: number; readonly card: number };
};

const DESKTOP: Layout = {
  x0: 120,
  step: 70,
  barW: 50,
  chatTitleY: 104,
  axisY: 560,
  unit: 11,
  groupLabelY: 150,
  bracketY: 236,
  highTagRight: 1240,
  videoTitleY: 640,
  band: { y: 744, h: 88 },
  videoAxisY: 852,
  spanLabelY: 870,
  shiftTag: { dx: 28, y: 604 },
  panel: { x: 1360, y: 104, w: 440, h: 872 },
  listTitle: { x: 1388, y: 132 },
  slots: [
    { x: 1380, y: 224, w: 400, h: 112 },
    { x: 1380, y: 364, w: 400, h: 112 },
  ],
  text: { head: TEXT.label, tag: TEXT.small, card: TEXT.small },
};

const MOBILE: Layout = {
  x0: 60,
  step: 60,
  barW: 42,
  chatTitleY: 48,
  axisY: 560,
  unit: 11,
  groupLabelY: 124,
  bracketY: 220,
  highTagRight: 1020,
  videoTitleY: 610,
  band: { y: 696, h: 80 },
  videoAxisY: 792,
  spanLabelY: 808,
  shiftTag: { dx: 22, y: 596 },
  panel: { x: 40, y: 900, w: 1000, h: 270 },
  listTitle: { x: 60, y: 920 },
  slots: [
    { x: 60, y: 1010, w: 460, h: 128 },
    { x: 560, y: 1010, w: 460, h: 128 },
  ],
  text: { head: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, card: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const box = (x: number, y: number, w: number, h: number) =>
  ({ position: "absolute", left: x, top: y, width: Math.max(0, w), height: Math.max(0, h) }) as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 위쪽이 막힌 괄호(가로선 + 양 끝 세로 눈금). */
const TopBracket: React.FC<{ x0: number; x1: number; y: number; opacity: number }> = ({ x0, x1, y, opacity }) => {
  const edge = `6px solid ${COLOR.ink}`;
  return (
    <div
      style={{
        ...box(x0, y, x1 - x0, 26),
        borderTop: edge,
        borderLeft: edge,
        borderRight: edge,
        borderRadius: "6px 6px 0 0",
        boxSizing: "border-box",
        opacity,
      }}
    />
  );
};

export const ChatSpikeToCard: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const pxPerS = l.step / WINDOW_S;
  const x1 = l.x0 + COUNTS.length * l.step;
  const winX = (i: number) => l.x0 + i * l.step;
  const countY = (c: number) => l.axisY - c * l.unit;
  const tagH = l.text.tag * 1.2 + 16;
  const canvasWidth = layout === "mobile" ? MOBILE_VIDEO.width : VIDEO.width;

  const intro = progress(frame, 0, 15);
  const lines = progress(frame, T.lines, 20);
  const spike = progress(frame, T.spike, 15);
  const group = progress(frame, T.group, 18);
  const shift = progress(frame, T.shift, 22);
  const shiftTag = progress(frame, T.shift + 14, FADE);
  const span = progress(frame, T.span, 26, EASE_IN_OUT);
  const spanLabels = progress(frame, T.span + 14, FADE);
  const fly = progress(frame, T.fly, 28, EASE_IN_OUT);
  const flyIn = progress(frame, T.fly, 6);
  const hotkey = progress(frame, T.hotkey, 18);

  // 사건 구간(채팅 시각)과 영상 위치로 옮긴 구간.
  const eventStart = winX(FIRST_SPIKE);
  const eventEnd = winX(LAST_SPIKE + 1);
  const offsetPx = OFFSET_S * pxPerS;
  const videoStart = eventStart - offsetPx;
  const videoEnd = eventEnd - offsetPx;
  const cardStart = videoStart - LEAD_S * pxPerS;
  const cardEnd = videoEnd + TAIL_S * pxPerS;
  const bandStart = lerp(videoStart, cardStart, span);
  const bandEnd = lerp(videoEnd, cardEnd, span);

  const slot = l.slots[0];
  const flyRect = {
    x: lerp(cardStart, slot.x, fly),
    y: lerp(l.band.y, slot.y, fly),
    w: lerp(cardEnd - cardStart, slot.w, fly),
    h: lerp(l.band.h, slot.h, fly),
  };
  const hotSlot = l.slots[1];
  const hotOffset = interpolate(hotkey, [0, 1], [layout === "mobile" ? 60 : 80, 0], CLAMP);

  const thresholdY = countY(RATIO * BASELINE);
  const baselineY = countY(BASELINE);

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {/* 채팅 시각 축: 5초 창 막대. */}
      <Label x={l.x0} y={l.chatTitleY} size={l.text.head} weight={760} opacity={intro}>
        채팅 시각 · 5초 창
      </Label>
      <div style={{ ...box(l.x0, l.axisY, x1 - l.x0, 4), background: COLOR.line, opacity: intro }} />
      {COUNTS.map((c, i) => {
        const grow = progress(frame, T.bars + i * 4, 14);
        const h = c * l.unit * grow;
        const hot = SPIKES[i];
        return (
          <div
            key={i}
            style={{
              ...box(winX(i) + (l.step - l.barW) / 2, l.axisY - h, l.barW, h),
              background: hot && spike > 0 ? COLOR.accent : COLOR.muted,
              opacity: hot ? 0.45 + 0.55 * spike : 0.45,
              borderRadius: "6px 6px 0 0",
            }}
          />
        );
      })}

      {/* 기준선(점선)과 임계선(실선). */}
      <svg style={{ position: "absolute", inset: 0, opacity: lines }} width="100%" height="100%">
        <line x1={l.x0} y1={baselineY} x2={x1} y2={baselineY} stroke={COLOR.muted} strokeWidth={4} strokeDasharray="14 12" />
        <line x1={l.x0} y1={thresholdY} x2={x1} y2={thresholdY} stroke={COLOR.ink} strokeWidth={4} />
      </svg>
      <Tag x={l.x0 + 4} y={baselineY - tagH - 6} tone="muted" size={l.text.tag} opacity={lines}>
        최근 15분 중앙값
      </Tag>
      <Tag x={l.x0 + 4} y={thresholdY - tagH - 6} size={l.text.tag} opacity={lines}>
        중앙값 × 3
      </Tag>
      {/* 오른쪽 끝에 맞춘 이름표(Tag 와 같은 모양, 오른쪽 기준이라 직접 그린다). */}
      <div
        style={{
          position: "absolute",
          top: thresholdY - tagH - 6,
          right: canvasWidth - l.highTagRight,
          padding: "8px 22px",
          borderRadius: 999,
          fontSize: l.text.tag,
          fontWeight: 700,
          whiteSpace: "nowrap",
          background: COLOR.ink,
          color: COLOR.white,
          opacity: lines,
        }}
      >
        10건 이상
      </div>

      {/* 20초 안의 급증 창은 한 사건. */}
      <TopBracket x0={eventStart + 4} x1={eventEnd - 4} y={l.bracketY} opacity={group} />
      <Label x={(eventStart + eventEnd) / 2} y={l.groupLabelY} size={l.text.tag} weight={720} anchor="center" opacity={group}>
        20초 안 → 한 사건
      </Label>

      {/* 영상 위치 축. */}
      <Label x={l.x0} y={l.videoTitleY} size={l.text.head} weight={760} opacity={intro}>
        영상 위치
      </Label>
      <div style={{ ...box(l.x0, l.videoAxisY, x1 - l.x0, 4), background: COLOR.line, opacity: intro }} />

      {/* 첫 급증 창 시작 → − 3.9초 → 영상 위치. */}
      {shift > 0 ? (
        <Arrow x1={eventStart} y1={l.axisY + 14} x2={videoStart} y2={l.band.y - 10} color={COLOR.accent} draw={shift} />
      ) : null}
      <Tag x={eventStart + l.shiftTag.dx} y={l.shiftTag.y} tone="accent" size={l.text.tag} opacity={shiftTag}>
        − 3.9초
      </Tag>

      {/* 카드 구간: 사건을 옮긴 자리에서 앞 15초 · 뒤 5초로 늘어난다. */}
      <div
        style={{
          ...box(bandStart, l.band.y, bandEnd - bandStart, l.band.h),
          background: COLOR.accentSoft,
          border: `4px solid ${COLOR.accent}`,
          borderRadius: 12,
          boxSizing: "border-box",
          opacity: progress(frame, T.shift + 10, FADE),
        }}
      />
      <div
        style={{
          ...box(videoStart, l.band.y + 12, videoEnd - videoStart, l.band.h - 24),
          background: COLOR.accent,
          borderRadius: 8,
          opacity: progress(frame, T.shift + 10, FADE),
        }}
      />
      <Label x={(cardStart + videoStart) / 2} y={l.spanLabelY} size={l.text.tag} weight={720} anchor="center" opacity={spanLabels}>
        앞 15초
      </Label>
      <Label x={(videoEnd + cardEnd) / 2} y={l.spanLabelY} size={l.text.tag} weight={720} anchor="center" opacity={spanLabels}>
        뒤 5초
      </Label>

      {/* 카드 목록. */}
      <div
        style={{
          ...box(l.panel.x, l.panel.y, l.panel.w, l.panel.h),
          background: COLOR.surface,
          borderRadius: 20,
          opacity: intro,
        }}
      />
      <Label x={l.listTitle.x} y={l.listTitle.y} size={l.text.head} weight={760} opacity={intro}>
        카드 목록
      </Label>
      {fly > 0 ? (
        <div style={{ opacity: flyIn }}>
          <Node x={flyRect.x} y={flyRect.y} width={flyRect.w} height={flyRect.h} tone="accent" size={l.text.card}>
            <span style={{ display: "block", textAlign: "center", whiteSpace: "nowrap", opacity: progress(frame, T.fly + 18, 10) }}>
              자동 · 채팅 급증
            </span>
          </Node>
        </div>
      ) : null}
      <Node x={hotSlot.x + hotOffset} y={hotSlot.y} width={hotSlot.w} height={hotSlot.h} tone="ink" size={l.text.card} opacity={hotkey}>
        <span style={{ display: "block", textAlign: "center", whiteSpace: "nowrap" }}>핫키 · 손으로 표시</span>
      </Node>
    </AbsoluteFill>
  );
};
