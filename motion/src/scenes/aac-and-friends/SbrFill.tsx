// 콘티: _workspace/blog/aac-and-friends/storyboard.md 「SbrFill」
// HE-AAC: AAC-LC 코어를 출력의 절반 표본률(24kHz)로 부호화해 낮은 대역만 담고,
// SBR 이 교차 주파수 아래 대역을 위로 옮긴 뒤 포락선(부가 정보)에 맞춰 깎아 높은 대역을 채운다.
// 출력 2,048표본(48kHz에서 42.7ms) 프레임마다 반복. 막대 높이와 교차 위치는 설명용(실제 스펙트럼 아님). 개념도.
// layout="mobile" 은 1080×1350 휴대폰판(SbrFillMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress, visibleBetween } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const SBR_FILL_FRAMES = 330;

const BANDS = 48; // 0.5kHz 씩, 0–24kHz
const CROSS = 22; // 교차: 11kHz (숫자는 그리지 않는다)
const PATCHES = [
  { from: 11, to: 22 },
  { from: 11, to: 33 },
] as const; // 5.5–11kHz 묶음을 11–16.5, 16.5–22kHz 로 옮김
const PATCH_LEN = 11;

// 설명용 스펙트럼 높이(0–1). 낮은 주파수일수록 크다.
const CORE = Array.from({ length: CROSS }, (_, i) => {
  const base = 0.95 - i * 0.022;
  const ripple = 0.08 * Math.sin(i * 1.7) + 0.05 * Math.cos(i * 0.9);
  return Math.max(0.25, base + ripple);
});
const SRC_MAX = Math.max(...CORE.slice(PATCHES[0].from, PATCHES[0].from + PATCH_LEN));
// 포락선: 높은 대역에서 원래 신호가 가졌던 에너지(부가 정보). 위로 갈수록 줄어든다.
const envelope = (band: number): number => 0.5 - (band - CROSS) * 0.016 + 0.04 * Math.sin(band * 0.8);

type Layout = {
  readonly x0: number;
  readonly x1: number;
  readonly base: number;
  readonly maxH: number;
  readonly text: { readonly label: number; readonly small: number };
  readonly frameTag: { readonly x: number; readonly y: number };
  readonly coreTag: { readonly x: number; readonly y: number };
  readonly copyTag: { readonly x: number; readonly y: number };
  readonly envTag: { readonly x: number; readonly y: number };
  readonly limitGap: number;
};

const DESKTOP: Layout = {
  x0: 220,
  x1: 1700,
  base: 800,
  maxH: 420,
  text: { label: TEXT.label, small: TEXT.small },
  frameTag: { x: 220, y: 80 },
  coreTag: { x: 560, y: 250 },
  copyTag: { x: 1240, y: 190 },
  envTag: { x: 1240, y: 290 },
  limitGap: 64,
};

const MOBILE: Layout = {
  x0: 70,
  x1: 1010,
  base: 1080,
  maxH: 460,
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
  frameTag: { x: 70, y: 90 },
  coreTag: { x: 70, y: 220 },
  copyTag: { x: 70, y: 310 },
  envTag: { x: 70, y: 400 },
  limitGap: 76,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const T = {
  core: 8,
  coreTag: 34,
  copy: 66,
  copyTag: 70,
  env: 138,
  envTag: 150,
  hold: 214,
  next: 262,
  fade: 300,
} as const;

export const SbrFill: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const bw = (l.x1 - l.x0) / BANDS;
  const xOf = (band: number) => l.x0 + band * bw;
  const fadeAll = 1 - progress(frame, T.fade, 28);
  const intro = progress(frame, 0, 12);

  const coreH = (i: number) => CORE[i] * l.maxH * progress(frame, T.core + i * 1.6, 14) * fadeAll;
  const envP = progress(frame, T.env, 46);
  const shave = progress(frame, T.env + 26, 36);

  const highBars: { band: number; src: number; h: number; x: number; y: number; opacity: number }[] = [];
  PATCHES.forEach((p, pi) => {
    const pp = progress(frame, T.copy + pi * 14, 44);
    for (let k = 0; k < PATCH_LEN; k++) {
      const src = p.from + k;
      const band = p.to + k;
      const copied = CORE[src];
      const shaped = Math.min(copied, envelope(band)) * 0.92;
      const h = (copied + (shaped - copied) * shave) * l.maxH * fadeAll;
      const x = xOf(src) + (xOf(band) - xOf(src)) * pp;
      const lift = Math.sin(Math.PI * pp) * l.maxH * 0.25;
      highBars.push({ band, src, h, x, y: l.base - h - lift, opacity: pp > 0 ? 1 : 0 });
    }
  });

  const envPts = Array.from({ length: BANDS - CROSS - 4 + 1 }, (_, j) => {
    const band = CROSS + j;
    return `${xOf(band) + bw / 2},${l.base - envelope(band) * l.maxH * 0.92}`;
  });
  const envVisible = Math.round(envPts.length * envP);

  const ticks = [0, 6, 12, 18, 24];
  const isNext = frame >= T.next;

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <Tag x={l.frameTag.x} y={l.frameTag.y} tone="ink" size={l.text.small} opacity={intro}>
        {isNext ? "다음 프레임 · 2,048표본" : "프레임 1 · 2,048표본(42.7ms)"}
      </Tag>

      {/* 축 */}
      <div style={{ position: "absolute", left: l.x0, top: l.base, width: l.x1 - l.x0, height: 5, background: COLOR.ink, opacity: intro }} />
      {ticks.map((k) => (
        <Label key={k} x={l.x0 + (k / 24) * (l.x1 - l.x0)} y={l.base + 18} size={l.text.small} anchor={k === 24 ? "right" : k === 0 ? "left" : "center"} color={COLOR.ink} opacity={intro}>
          {k === 24 ? "24kHz" : String(k)}
        </Label>
      ))}
      <Label x={l.x0 + 0.5 * (l.x1 - l.x0)} y={l.base + 18 + l.limitGap} size={l.text.small} anchor="center" color={COLOR.muted} opacity={intro}>
        코어 한계(24kHz 표본률의 절반)
      </Label>

      {/* 교차 */}
      <div
        style={{
          position: "absolute", left: xOf(CROSS) - 2, top: l.base - l.maxH - 40, width: 0, height: l.maxH + 40,
          borderLeft: `4px dashed ${COLOR.muted}`, opacity: intro * fadeAll,
        }}
      />
      <Label x={xOf(CROSS)} y={l.base - l.maxH - 40 - l.text.small * 1.4} size={l.text.small} anchor="center" color={COLOR.muted} opacity={intro * fadeAll}>
        교차
      </Label>

      {/* 코어 막대 */}
      {CORE.map((_, i) => {
        const h = coreH(i);
        return (
          <div key={`c${i}`} style={{ position: "absolute", left: xOf(i) + 2, top: l.base - h, width: bw - 4, height: h, background: COLOR.accent, borderRadius: 3 }} />
        );
      })}

      {/* 옮길 원본 대역(교차 아래 묶음) */}
      <div
        style={{
          position: "absolute", left: xOf(PATCHES[0].from) - 6, top: l.base - SRC_MAX * l.maxH - 24, width: PATCH_LEN * bw + 12, height: SRC_MAX * l.maxH + 30,
          boxSizing: "border-box", border: `5px dashed ${COLOR.ink}`, borderRadius: 10, opacity: visibleBetween(frame, T.copy - 10, T.env + 10),
        }}
      />

      {/* 옮겨진 높은 대역 */}
      {highBars.map((b) => (
        <div
          key={`h${b.band}`}
          style={{
            position: "absolute", left: b.x + 2, top: b.y, width: bw - 4, height: b.h, boxSizing: "border-box",
            background: COLOR.surface, border: `3px ${shave > 0.5 ? "solid" : "dashed"} ${COLOR.muted}`, borderRadius: 3, opacity: b.opacity,
          }}
        />
      ))}

      {/* 포락선 */}
      {envVisible > 1 ? (
        <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
          <polyline points={envPts.slice(0, envVisible).join(" ")} fill="none" stroke={COLOR.ink} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" opacity={fadeAll} />
        </svg>
      ) : null}

      <Tag x={l.coreTag.x} y={l.coreTag.y} tone="accent" size={l.text.small} anchor={layout === "desktop" ? "center" : "left"} opacity={visibleBetween(frame, T.coreTag, T.fade + 20)}>
        AAC-LC 코어
      </Tag>
      <Tag x={l.copyTag.x} y={l.copyTag.y} tone="muted" size={l.text.small} anchor={layout === "desktop" ? "center" : "left"} opacity={visibleBetween(frame, T.copyTag, T.fade + 20)}>
        낮은 대역을 위로 옮김
      </Tag>
      <Tag x={l.envTag.x} y={l.envTag.y} tone="ink" size={l.text.small} anchor={layout === "desktop" ? "center" : "left"} opacity={visibleBetween(frame, T.envTag, T.fade + 20)}>
        포락선으로 깎음(SBR 부가 정보)
      </Tag>
    </AbsoluteFill>
  );
};
