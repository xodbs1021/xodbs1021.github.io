// 콘티: _workspace/blog/opus-deep-dive/storyboard.md 「OpusModeStrip」
// Sintel 예고편 소리(51.9초)를 libopus 32kbps(-application voip)로 인코딩한 두 파일의 패킷 모드 띠.
// 모드는 패킷 첫 바이트(TOC)의 구성 번호로 읽은 실측값이고, 구간 경계(초)도 실측이다.
// 줄 A: FEC 없음 — SILK → 하이브리드 → CELT 를 오간다. 줄 B: -fec 1 -packet_loss 10 — CELT 가 없다.
// 처음 0–0.15초 하이브리드-FB 묶음은 너무 짧아 두 줄 모두 하이브리드로 칠한다.
// 51.9초를 약 8초에 압축해 재생점이 지나간다. layout="mobile" 은 1080×1350 휴대폰판(OpusModeStripMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Playhead } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const OPUS_MODE_STRIP_FRAMES = 330;

type Mode = "silk" | "hybrid" | "celt";
type Run = { readonly a: number; readonly b: number; readonly mode: Mode; readonly name?: string };

const TOTAL = 51.93;
const DT = 0.02; // 패킷 하나 20ms — 구간 끝 패킷까지 칠한다.

const ROW_A: readonly Run[] = [
  { a: 0, b: 0.15, mode: "hybrid" },
  { a: 0.17, b: 3.21, mode: "silk" },
  { a: 3.23, b: 7.25, mode: "hybrid" },
  { a: 7.27, b: 8.85, mode: "celt" },
  { a: 8.87, b: 9.75, mode: "hybrid" },
  { a: 9.77, b: 38.11, mode: "celt", name: "CELT" },
  { a: 38.13, b: 38.71, mode: "hybrid" },
  { a: 38.73, b: 51.91, mode: "celt", name: "CELT" },
];
const ROW_B: readonly Run[] = [
  { a: 0, b: 0.15, mode: "hybrid" },
  { a: 0.17, b: 3.21, mode: "silk" },
  { a: 3.23, b: 9.33, mode: "hybrid" },
  { a: 9.35, b: 51.91, mode: "hybrid", name: "하이브리드" },
];

const FILL: Record<Mode, string> = { silk: COLOR.muted, hybrid: COLOR.ink, celt: COLOR.accent };
const LEGEND: readonly { readonly mode: Mode; readonly label: string }[] = [
  { mode: "silk", label: "SILK" },
  { mode: "hybrid", label: "하이브리드" },
  { mode: "celt", label: "CELT" },
];

type Row = { readonly labelX: number; readonly labelY: number; readonly y: number; readonly tagY: number };
type Layout = {
  readonly x0: number;
  readonly x1: number;
  readonly barH: number;
  readonly axisY: number;
  readonly legendY: number;
  readonly legendX: number;
  readonly legendGap: number;
  readonly rows: readonly [Row, Row];
  readonly tagX: number;
  readonly canvasW: number;
  readonly text: { readonly label: number; readonly small: number };
};

const DESKTOP: Layout = {
  x0: 440,
  x1: 1800,
  barH: 140,
  axisY: 250,
  legendY: 90,
  legendX: 440,
  legendGap: 60,
  rows: [
    { labelX: 120, labelY: 395, y: 360, tagY: 525 },
    { labelX: 120, labelY: 695, y: 660, tagY: 825 },
  ],
  tagX: 1800,
  canvasW: 1920,
  text: { label: TEXT.label, small: TEXT.small },
};

const MOBILE: Layout = {
  x0: 60,
  x1: 1020,
  barH: 160,
  axisY: 230,
  legendY: 90,
  legendX: 60,
  legendGap: 56,
  rows: [
    { labelX: 60, labelY: 340, y: 420, tagY: 600 },
    { labelX: 60, labelY: 770, y: 850, tagY: 1030 },
  ],
  tagX: 1020,
  canvasW: 1080,
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 오른쪽 끝을 맞춘 둥근 이름표. */
const Pill: React.FC<{
  readonly children: React.ReactNode; readonly right: number; readonly y: number;
  readonly tone: "accent" | "ink"; readonly size: number; readonly opacity: number;
}> = ({ children, right, y, tone, size, opacity }) => (
  <div
    style={{
      position: "absolute", right, top: y, padding: "8px 22px", borderRadius: 999, fontFamily: FONT,
      fontSize: size, fontWeight: 700, whiteSpace: "nowrap", opacity, color: COLOR.white,
      background: tone === "accent" ? COLOR.accent : COLOR.ink,
    }}
  >
    {children}
  </div>
);

const SWEEP_START = 18;
const SWEEP_LEN = 240; // 8초
const END_TAGS = SWEEP_START + SWEEP_LEN + 6;

export const OpusModeStrip: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const width = l.x1 - l.x0;
  const xOf = (t: number) => l.x0 + (t / TOTAL) * width;
  const intro = progress(frame, 0, 14);
  const sweep = progress(frame, SWEEP_START, SWEEP_LEN, (t) => t);
  const now = sweep * TOTAL;
  const tags = progress(frame, END_TAGS, 14);

  const drawRow = (runs: readonly Run[], row: Row, key: string) => (
    <>
      <div
        key={`${key}-bg`}
        style={{
          position: "absolute", left: l.x0, top: row.y, width, height: l.barH, boxSizing: "border-box",
          border: `3px solid ${COLOR.line}`, borderRadius: 10, background: COLOR.white, opacity: intro,
        }}
      />
      {runs.map((r, i) => {
        if (now <= r.a) return null;
        const end = Math.min(r.b + DT, now);
        const left = xOf(r.a);
        const w = Math.max(2, xOf(end) - left);
        const fullW = xOf(r.b + DT) - left;
        return (
          <div
            key={`${key}-${i}`}
            style={{
              position: "absolute", left, top: row.y, width: w, height: l.barH, background: FILL[r.mode],
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "flex-start",
            }}
          >
            {r.name ? (
              <div style={{ width: fullW, flexShrink: 0, textAlign: "center", color: COLOR.white, fontFamily: FONT, fontSize: l.text.label, fontWeight: 760 }}>
                {r.name}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {LEGEND.map((g, i) => {
        const widths = layout === "desktop" ? [200, 280, 200] : [190, 290, 200];
        const x = l.legendX + widths.slice(0, i).reduce((s, w) => s + w + l.legendGap, 0);
        return (
          <div key={g.mode} style={{ position: "absolute", left: x, top: l.legendY, display: "flex", alignItems: "center", gap: 14, opacity: intro }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: FILL[g.mode] }} />
            <div style={{ fontFamily: FONT, fontSize: l.text.small, fontWeight: 700, color: COLOR.ink }}>{g.label}</div>
          </div>
        );
      })}

      {[0, 10, 20, 30, 40].map((t) => (
        <Label key={t} x={xOf(t)} y={l.axisY} size={l.text.small} anchor={t === 0 ? "left" : "center"} color={COLOR.muted} opacity={intro}>
          {t === 0 ? "0초" : String(t)}
        </Label>
      ))}
      <Label x={l.x1} y={l.axisY} size={l.text.small} anchor="right" color={COLOR.muted} opacity={intro}>52초</Label>

      <Label x={l.rows[0].labelX} y={l.rows[0].labelY} size={l.text.label} weight={760} opacity={intro}>32kbps</Label>
      <Label x={l.rows[1].labelX} y={l.rows[1].labelY} size={l.text.label} weight={760} opacity={intro}>32kbps + FEC</Label>
      {layout === "desktop" ? (
        <>
          <Label x={l.rows[0].labelX} y={l.rows[0].labelY + 56} size={l.text.small} color={COLOR.muted} opacity={intro}>FEC 없음</Label>
          <Label x={l.rows[1].labelX} y={l.rows[1].labelY + 56} size={l.text.small} color={COLOR.muted} opacity={intro}>손실 10% 가정</Label>
        </>
      ) : null}

      {drawRow(ROW_A, l.rows[0], "a")}
      {drawRow(ROW_B, l.rows[1], "b")}

      {sweep > 0 && sweep < 1 ? (
        <Playhead x={xOf(now)} top={l.rows[0].y - 40} height={l.rows[1].y + l.barH - l.rows[0].y + 50} color={COLOR.ink} />
      ) : null}

      <Pill right={l.canvasW - l.tagX} y={l.rows[0].tagY} tone="accent" size={l.text.small} opacity={tags}>CELT 2,158개</Pill>
      <Pill right={l.canvasW - l.tagX} y={l.rows[1].tagY} tone="ink" size={l.text.small} opacity={tags}>CELT 0개</Pill>
    </AbsoluteFill>
  );
};
