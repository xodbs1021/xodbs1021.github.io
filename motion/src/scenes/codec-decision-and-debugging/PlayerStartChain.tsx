// 콘티: _workspace/blog/codec-decision-and-debugging/storyboard.md 「PlayerStartChain」
// 재생을 시작할 때 코덱 정보가 지나는 다섯 단계: 다변형 목록 CODECS → isTypeSupported() → addSourceBuffer()
// → init 조각(moov · ASC) → 디코딩. 첫 번째 토큰 mp4a.40.2 는 다섯 단계를 모두 지난다.
// 두 번째 토큰 ec-3 는 isTypeSupported() 에서 false 가 되어 멈춘다(Chrome 157 실측값, 그 밖은 개념도).
// layout="mobile" 은 1080×1350 휴대폰판(PlayerStartChainMobile) — 단계를 세로로 쌓는다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const PLAYER_START_CHAIN_FRAMES = 330;

const STAGES: readonly (readonly [string, string])[] = [
  ["다변형 목록", "CODECS"],
  ["isType", "Supported()"],
  ["addSource", "Buffer()"],
  ["init 조각", "moov · ASC"],
  ["디코딩", "출력"],
];

const PASS1 = { start: 12, step: 24 } as const; // 단계 i 도착 = start + i*step
const RESET = { start: 132, len: 26 } as const;
const PASS2 = { start: 166, step: 24 } as const;
const FAIL_AT = 1;
const FAIL_FRAME = PASS2.start + FAIL_AT * PASS2.step + 6;

type Layout = {
  readonly box: (i: number) => { readonly x: number; readonly y: number };
  readonly w: number;
  readonly h: number;
  readonly token: (pos: number) => { readonly x: number; readonly y: number };
  readonly failLabel: { readonly x: number; readonly y: number; readonly anchor: "left" | "center" };
  readonly vertical: boolean;
  readonly text: { readonly label: number; readonly small: number };
};

const D = { x0: 100, w: 320, gap: 30, y: 420, h: 210 } as const;
const DESKTOP: Layout = {
  box: (i) => ({ x: D.x0 + i * (D.w + D.gap), y: D.y }),
  w: D.w,
  h: D.h,
  token: (pos) => ({ x: D.x0 + D.w / 2 + pos * (D.w + D.gap), y: D.y - 120 }),
  failLabel: { x: D.x0 + D.w / 2 + FAIL_AT * (D.w + D.gap), y: D.y + D.h + 50, anchor: "center" },
  vertical: false,
  text: { label: TEXT.label, small: TEXT.small },
};

const M = { x: 60, w: 600, y0: 110, h: 170, gap: 66 } as const;
const MOBILE: Layout = {
  box: (i) => ({ x: M.x, y: M.y0 + i * (M.h + M.gap) }),
  w: M.w,
  h: M.h,
  token: (pos) => ({ x: M.x + M.w + 50 + 165, y: M.y0 + M.h / 2 - 40 + pos * (M.h + M.gap) }),
  failLabel: { x: M.x + M.w + 50, y: M.y0 + FAIL_AT * (M.h + M.gap) + M.h / 2 + 40, anchor: "left" },
  vertical: true,
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 토큰 위치(단계 번호, 소수 = 이동 중). */
const tokenPos = (frame: number, start: number, step: number, last: number): number => {
  const raw = (frame - start) / step;
  const whole = Math.floor(raw);
  const frac = raw - whole;
  // 도착 뒤 잠시 머무르고 다음 단계로 이동한다.
  const move = interpolate(frac, [0.45, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });
  return Math.min(last, Math.max(0, whole + move));
};

export const PlayerStartChain: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 12);
  const pass2 = frame >= RESET.start + RESET.len;
  const resetFade = pass2 ? 1 : 1 - progress(frame, RESET.start, RESET.len);
  const failOn = progress(frame, FAIL_FRAME, 12);

  const pos = pass2
    ? tokenPos(frame, PASS2.start, PASS2.step, FAIL_AT)
    : tokenPos(frame, PASS1.start, PASS1.step, STAGES.length - 1);
  const tokenIn = pass2 ? progress(frame, PASS2.start - 10, 10) : intro * resetFade;
  const t = l.token(pos);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {STAGES.map((s, i) => {
        const b = l.box(i);
        const passed1 = !pass2 && frame >= PASS1.start + i * PASS1.step;
        const passed2 = pass2 && i === 0 && frame >= PASS2.start;
        const failed = pass2 && i === FAIL_AT && failOn > 0;
        const dimmed = pass2 && i > FAIL_AT && failOn > 0;
        const ok = (passed1 ? resetFade : 0) + (passed2 ? 1 : 0);
        const border = failed ? COLOR.danger : ok > 0.5 ? COLOR.accent : COLOR.ink;
        const background = failed ? COLOR.dangerSoft : ok > 0.5 ? COLOR.accentSoft : COLOR.white;
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: b.x, top: b.y, width: l.w, height: l.h, boxSizing: "border-box",
              border: `${failed ? 7 : 5}px solid ${border}`, borderRadius: 18, background,
              opacity: intro * (dimmed ? 1 - 0.65 * failOn : 1), fontFamily: FONT, color: COLOR.ink,
              display: "flex", flexDirection: l.vertical ? "row" : "column", alignItems: "center",
              justifyContent: l.vertical ? "flex-start" : "center", gap: l.vertical ? 28 : 6, paddingLeft: l.vertical ? 30 : 0,
            }}
          >
            <div
              style={{
                width: l.text.label * 1.5, height: l.text.label * 1.5, borderRadius: 999, flexShrink: 0,
                background: failed ? COLOR.danger : ok > 0.5 ? COLOR.accent : COLOR.ink, color: COLOR.white,
                display: "grid", placeItems: "center", fontSize: l.text.small, fontWeight: 800,
                marginBottom: l.vertical ? 0 : 8,
              }}
            >
              {i + 1}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: l.vertical ? "flex-start" : "center", lineHeight: 1.15 }}>
              <div style={{ fontSize: l.text.label, fontWeight: 760 }}>{s[0]}</div>
              <div style={{ fontSize: l.text.small, fontWeight: 600, color: COLOR.muted }}>{s[1]}</div>
            </div>
          </div>
        );
      })}

      <Tag x={t.x} y={t.y} anchor="center" tone={pass2 ? (failOn > 0 ? "danger" : "ink") : "accent"} size={l.text.label} opacity={tokenIn}>
        {pass2 ? "ec-3" : "mp4a.40.2"}
      </Tag>

      {pass2 ? (
        l.vertical ? (
          <>
            <Label x={l.failLabel.x} y={l.failLabel.y} size={l.text.small} color={COLOR.danger} weight={760} opacity={failOn}>Chrome 157</Label>
            <Label x={l.failLabel.x} y={l.failLabel.y + l.text.small * 1.25} size={l.text.small} color={COLOR.danger} weight={760} opacity={failOn}>→ false</Label>
          </>
        ) : (
          <Tag x={l.failLabel.x} y={l.failLabel.y} anchor="center" tone="danger" size={l.text.small} opacity={failOn}>Chrome 157: false</Tag>
        )
      ) : null}
    </AbsoluteFill>
  );
};
