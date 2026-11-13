// 콘티: _workspace/blog/mediamtx-hls-segment-count-validation/storyboard.md 「SegmentCountGate」
// 위 줄 v1.20.1: 조각 6개 설정으로 기동한 뒤 송출이 들어오자 먹서가 실패하고 10초마다 다시 실패한다.
// 아래 줄 v1.21.0: 같은 설정을 읽는 순간 기동을 거부한다(종료 코드 1). 실패 시각은 11월 13일 재측정
// (45초 송출, 송출 시작 뒤 0.1 · 10.1 · 20.1 · 30.1 · 40.1초)을 따른 개념도다.
// layout="mobile" 은 1080×1350 휴대폰판(SegmentCountGateMobile) — 같은 구성을 세로로 늘리고 글자를 48px 이상으로.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const SEGMENT_COUNT_GATE_FRAMES = 300;

/** 축이 나타내는 송출 시간(초)과 재측정의 실패 시각(송출 시작 기준, 초). */
const AXIS_SECONDS = 45;
const CRASH_SECONDS = [0.1, 10.1, 20.1, 30.1, 40.1] as const;
const AXIS_TICKS = [0, 10, 20, 30, 40] as const;

const T = {
  intro: 0,
  verdict: 24,
  sweepStart: 60,
  sweepEnd: 240,
} as const;

type Layout = {
  readonly x0: number;
  readonly x1: number;
  readonly rowY: readonly [number, number];
  readonly trackDy: number;
  readonly trackH: number;
  readonly title: number;
  readonly text: number;
  readonly tagDy: number;
};

const DESKTOP: Layout = {
  x0: 140, x1: 1780, rowY: [90, 590], trackDy: 170, trackH: 110, title: TEXT.label, text: TEXT.small, tagDy: 70,
};
const MOBILE: Layout = {
  x0: 70, x1: 1010, rowY: [70, 700], trackDy: 230, trackH: 130, title: MOBILE_TEXT.title, text: MOBILE_TEXT.small, tagDy: 90,
};
const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const xAt = (l: Layout, seconds: number) => l.x0 + ((l.x1 - l.x0) * seconds) / AXIS_SECONDS;
/** 「실패」 이름표(두 글자 + 좌우 여백 22px)의 너비 어림값. 가운데를 실패 시각에 두되 띠 밖으로 나가지 않게 한다. */
const tagWidth = (l: Layout) => l.text * 2 + 44;
const tagX = (l: Layout, seconds: number) =>
  Math.min(Math.max(xAt(l, seconds) - tagWidth(l) / 2, l.x0 + 6), l.x1 - tagWidth(l) - 6);

const Axis: React.FC<{ readonly l: Layout; readonly y: number; readonly opacity: number }> = ({ l, y, opacity }) => (
  <>
    {AXIS_TICKS.map((s) => (
      <Label key={s} x={xAt(l, s)} y={y} size={l.text} color={COLOR.muted} anchor="center" opacity={opacity}>
        {s === 40 ? "40초" : String(s)}
      </Label>
    ))}
  </>
);

export const SegmentCountGate: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, T.intro, 14);
  const verdict = progress(frame, T.verdict, 12);
  const sweep = Math.min(1, Math.max(0, (frame - T.sweepStart) / (T.sweepEnd - T.sweepStart)));
  const nowSeconds = sweep * AXIS_SECONDS;
  const [ya, yb] = l.rowY;
  const ta = ya + l.trackDy;
  const tb = yb + l.trackDy;
  const trackW = l.x1 - l.x0;
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {/* 위 줄: v1.20.1 */}
      <Label x={l.x0} y={ya} size={l.title} weight={780} opacity={intro}>
        v1.20.1 · 조각 6개
      </Label>
      <Tag x={l.x0} y={ya + l.tagDy} size={l.text} tone="ink" opacity={verdict}>
        기동함
      </Tag>
      <div
        style={{
          position: "absolute", left: l.x0, top: ta, width: trackW, height: l.trackH, borderRadius: 14,
          background: COLOR.surface, border: `3px solid ${COLOR.line}`, boxSizing: "border-box", opacity: intro,
        }}
      />
      <div
        style={{
          position: "absolute", left: l.x0, top: ta, width: trackW * sweep, height: l.trackH, borderRadius: 14,
          background: COLOR.line,
        }}
      />
      {CRASH_SECONDS.map((s) => {
        const shown = nowSeconds >= s ? progress(frame, T.sweepStart + ((T.sweepEnd - T.sweepStart) * s) / AXIS_SECONDS, 8) : 0;
        return (
          <Tag key={s} x={tagX(l, s)} y={ta + l.trackH / 2 - l.text * 0.85} size={l.text} tone="danger" opacity={shown}>
            실패
          </Tag>
        );
      })}
      <div
        style={{
          position: "absolute", left: l.x0 + trackW * sweep - 3, top: ta - 16, width: 6, height: l.trackH + 32,
          background: COLOR.ink, opacity: sweep > 0 && sweep < 1 ? 1 : 0,
        }}
      />
      <Axis l={l} y={ta + l.trackH + 14} opacity={intro} />

      {/* 아래 줄: v1.21.0 */}
      <Label x={l.x0} y={yb} size={l.title} weight={780} color={COLOR.accent} opacity={intro}>
        v1.21.0 · 조각 6개
      </Label>
      <Tag x={l.x0} y={yb + l.tagDy} size={l.text} tone="danger" opacity={verdict}>
        기동 거부 · 종료 코드 1
      </Tag>
      <div
        style={{
          position: "absolute", left: l.x0, top: tb, width: trackW, height: l.trackH, borderRadius: 14,
          background: COLOR.white, border: `3px dashed ${COLOR.muted}`, boxSizing: "border-box", opacity: intro,
        }}
      />
      <Label x={l.x0 + trackW / 2} y={tb + l.trackH / 2 - l.text * 0.62} size={l.text} color={COLOR.muted} anchor="center" opacity={verdict}>
        송출을 받기 전에 끝남
      </Label>
      <Axis l={l} y={tb + l.trackH + 14} opacity={intro} />
    </AbsoluteFill>
  );
};
