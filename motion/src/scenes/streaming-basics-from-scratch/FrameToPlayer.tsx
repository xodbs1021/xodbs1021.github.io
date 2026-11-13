// 콘티: _workspace/blog/streaming-basics-from-scratch/storyboard.md 「FrameToPlayer」
// 1080p30 화면 한 줄기가 원본(RGB) → 색 줄이기(YUV 4:2:0) → 압축(x264 6Mbps) → 송출 → 포장 → CDN 을 지나며
// 초당 바이트가 186.6MB → 93.3MB → 0.77MB 로 줄고, CDN 에서 같은 조각이 여러 시청자에게 퍼진다.
// 수치는 _workspace/blog/streaming-basics-from-scratch/measure/e1-bytes.txt 의 실측값(testsrc2 합성 입력), 흐름은 개념도.
// layout="mobile" 은 1080×1350 휴대폰판(FrameToPlayerMobile) — 단계를 세로로 쌓는다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const FRAME_TO_PLAYER_FRAMES = 360;

const STAGES: readonly (readonly [string, string])[] = [
  ["카메라·화면", "RGB 24비트"],
  ["색 줄이기", "YUV 4:2:0"],
  ["압축", "x264 6Mbps"],
  ["송출", "RTMP · SRT"],
  ["포장", "HLS 조각"],
  ["CDN", "엣지 캐시"],
];

// 단계마다 보이는 초당 바이트(실측). 세 번째 단계부터는 압축 출력이 그대로 간다.
const RATES: readonly (readonly [number, string, string])[] = [
  [186.624, "초당 186.6MB", "압축 전 · RGB 24비트"],
  [93.312, "초당 93.3MB", "압축 전 · YUV 4:2:0"],
  [0.77, "초당 0.77MB", "x264 출력 · 목표 6Mbps"],
];
const RATE_OF_STAGE = [0, 1, 2, 2, 2, 2] as const;

// 단계 i 에 도착하는 프레임. 이동은 도착 전 MOVE 프레임 동안.
const ARRIVE = [12, 72, 132, 180, 216, 252] as const;
const MOVE = 24;
const FAN = { start: 270, len: 30 } as const;
const VIEWERS = 3;

type Point = { readonly x: number; readonly y: number };
type Layout = {
  readonly box: (i: number) => Point;
  readonly w: number;
  readonly h: number;
  readonly vertical: boolean;
  readonly token: (i: number) => Point;
  readonly viewer: (k: number) => Point;
  readonly viewerLabel: Point;
  readonly fanFrom: Point;
  readonly rate: {
    readonly x: number; readonly y: number; readonly barY: number; readonly barW: number; readonly barH: number;
    readonly tickY: number; readonly noteY: number;
  };
  readonly text: { readonly big: number; readonly label: number; readonly small: number };
  readonly r: number;
};

const D = { x0: 80, w: 246, gap: 24, y: 620, h: 190 } as const;
const DESKTOP: Layout = {
  box: (i) => ({ x: D.x0 + i * (D.w + D.gap), y: D.y }),
  w: D.w,
  h: D.h,
  vertical: false,
  token: (i) => ({ x: D.x0 + D.w / 2 + i * (D.w + D.gap), y: D.y - 70 }),
  viewer: (k) => ({ x: 1790, y: D.y - 40 + k * 135 }),
  viewerLabel: { x: 1790, y: D.y - 150 },
  fanFrom: { x: D.x0 + 5 * (D.w + D.gap) + D.w, y: D.y + D.h / 2 },
  rate: { x: D.x0, y: 100, barY: 240, barW: 1596, barH: 64, tickY: 316, noteY: 400 },
  text: { big: 76, label: TEXT.label, small: TEXT.small },
  r: 40,
};

const M = { x: 60, w: 660, y0: 430, h: 118, gap: 34 } as const;
const MOBILE_CDN_Y = M.y0 + 5 * (M.h + M.gap) + M.h / 2;
const MOBILE: Layout = {
  box: (i) => ({ x: M.x, y: M.y0 + i * (M.h + M.gap) }),
  w: M.w,
  h: M.h,
  vertical: true,
  token: (i) => ({ x: M.x + M.w + 70, y: M.y0 + M.h / 2 + i * (M.h + M.gap) }),
  viewer: (k) => ({ x: 960, y: MOBILE_CDN_Y - 230 + k * 115 }),
  viewerLabel: { x: 960, y: MOBILE_CDN_Y - 350 },
  fanFrom: { x: M.x + M.w, y: MOBILE_CDN_Y },
  rate: { x: M.x, y: 70, barY: 200, barW: 960, barH: 56, tickY: 262, noteY: 340 },
  text: { big: 72, label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
  r: 40,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 토큰 위치(단계 번호, 소수 = 이동 중). */
const stagePos = (frame: number): number =>
  ARRIVE.slice(1).reduce(
    (sum, at) => sum + interpolate(frame, [at - MOVE, at], [0, 1], { ...CLAMP, easing: EASE_IN_OUT }),
    0,
  );

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const FrameToPlayer: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 12);
  const pos = stagePos(frame);
  const stage = Math.min(STAGES.length - 1, Math.floor(pos + 0.5));
  const fan = progress(frame, FAN.start, FAN.len, EASE_IN_OUT);

  // 막대 길이는 단계 사이에서 줄어들고, 숫자 이름표는 반쯤 왔을 때 바뀐다.
  const rateIdx = RATE_OF_STAGE[stage];
  const barRate = interpolate(pos, [0, 1, 2], [RATES[0][0], RATES[1][0], RATES[2][0]], CLAMP);
  const barW = Math.max(10, (barRate / RATES[0][0]) * l.rate.barW);
  const compressed = rateIdx === 2;

  const lo = Math.floor(pos);
  const hi = Math.min(STAGES.length - 1, lo + 1);
  const a = l.token(lo);
  const b = l.token(hi);
  const tok = { x: lerp(a.x, b.x, pos - lo), y: lerp(a.y, b.y, pos - lo) };
  const tokenSize = 60;

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <Label x={l.rate.x} y={l.rate.y} size={l.text.big} weight={800} color={compressed ? COLOR.accent : COLOR.ink} opacity={intro}>
        {RATES[rateIdx][1]}
      </Label>
      <div
        style={{
          position: "absolute", left: l.rate.x, top: l.rate.barY, width: l.rate.barW, height: l.rate.barH,
          borderRadius: 10, background: COLOR.surface, opacity: intro,
        }}
      />
      <div
        style={{
          position: "absolute", left: l.rate.x, top: l.rate.barY, width: barW, height: l.rate.barH,
          borderRadius: 10, background: compressed ? COLOR.accent : COLOR.ink, opacity: intro,
        }}
      />
      {/* 지나온 값의 눈금: 압축 전 두 값이 막대 어디까지였는지 남긴다. */}
      {RATES.slice(0, 2).map(([value, label], i) => {
        const shown = progress(frame, ARRIVE[i + 1], 12);
        const x = l.rate.x + (value / RATES[0][0]) * l.rate.barW;
        return (
          <div key={label}>
            <div
              style={{
                position: "absolute", left: x - 3, top: l.rate.barY - 10, width: 6, height: l.rate.barH + 20,
                background: COLOR.muted, opacity: intro * shown,
              }}
            />
            <Label x={x} y={l.rate.tickY} size={l.text.small} weight={600} color={COLOR.muted} anchor="right" opacity={intro * shown}>
              {label.replace("초당 ", "")}
            </Label>
          </div>
        );
      })}
      <Label x={l.rate.x} y={l.rate.noteY} size={l.text.small} weight={600} color={COLOR.muted} opacity={intro}>
        {RATES[rateIdx][2]}
      </Label>

      {STAGES.map((s, i) => {
        const bx = l.box(i);
        const current = i === stage && fan === 0;
        const passed = i < stage || fan > 0;
        const border = current ? COLOR.accent : passed ? COLOR.muted : COLOR.ink;
        return (
          <div
            key={s[0]}
            style={{
              position: "absolute", left: bx.x, top: bx.y, width: l.w, height: l.h, boxSizing: "border-box",
              border: `${current ? 7 : 4}px solid ${border}`, borderRadius: 18,
              background: current ? COLOR.accentSoft : COLOR.white, opacity: intro,
              display: "flex", flexDirection: l.vertical ? "row" : "column", alignItems: "center",
              justifyContent: l.vertical ? "space-between" : "center",
              padding: l.vertical ? "0 28px" : 0, gap: l.vertical ? 16 : 8, color: COLOR.ink,
            }}
          >
            <div style={{ fontSize: l.text.label, fontWeight: 760, whiteSpace: "nowrap" }}>{s[0]}</div>
            <div style={{ fontSize: l.text.small, fontWeight: 600, color: COLOR.muted, whiteSpace: "nowrap" }}>{s[1]}</div>
          </div>
        );
      })}

      {fan < 1 ? (
        <div
          style={{
            position: "absolute", left: tok.x - tokenSize / 2, top: tok.y - tokenSize / 2, width: tokenSize, height: tokenSize,
            borderRadius: 12, background: compressed ? COLOR.accent : COLOR.ink, opacity: intro * (1 - fan),
          }}
        />
      ) : null}

      <Label x={l.viewerLabel.x} y={l.viewerLabel.y} size={l.text.small} weight={700} anchor="center" opacity={intro}>
        시청자
      </Label>
      <svg style={{ position: "absolute", left: 0, top: 0 }} width="100%" height="100%">
        {Array.from({ length: VIEWERS }, (_, k) => {
          const v = l.viewer(k);
          return (
            <line
              key={k}
              x1={l.fanFrom.x} y1={l.fanFrom.y} x2={v.x - l.r} y2={v.y}
              stroke={fan > 0 ? COLOR.accent : COLOR.line} strokeWidth={5} strokeDasharray={fan > 0 ? undefined : "10 10"}
              opacity={intro}
            />
          );
        })}
      </svg>
      {Array.from({ length: VIEWERS }, (_, k) => {
        const v = l.viewer(k);
        const lit = fan > 0.95;
        const px = lerp(l.fanFrom.x, v.x - l.r, fan);
        const py = lerp(l.fanFrom.y, v.y, fan);
        return (
          <div key={k}>
            <div
              style={{
                position: "absolute", left: v.x - l.r, top: v.y - l.r, width: l.r * 2, height: l.r * 2, borderRadius: 999,
                border: `5px solid ${lit ? COLOR.accent : COLOR.ink}`, background: lit ? COLOR.accentSoft : COLOR.white,
                boxSizing: "border-box", opacity: intro,
              }}
            />
            {fan > 0 && fan < 1 ? (
              <div
                style={{
                  position: "absolute", left: px - 18, top: py - 18, width: 36, height: 36, borderRadius: 8, background: COLOR.accent,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
