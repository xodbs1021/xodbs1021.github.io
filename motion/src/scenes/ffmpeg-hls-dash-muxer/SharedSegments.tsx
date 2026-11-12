// 콘티: _workspace/blog/ffmpeg-hls-dash-muxer/storyboard.md 「영상 1」
// 같은 20초 입력으로 HLS와 DASH를 함께 낸다. 위: 출력 둘(-f hls + -f dash) — x264 인코더 둘이 2초 조각을 한 벌씩,
// 모두 두 벌(10개 × 2) 쌓고 합이 15.1MB. 아래: -f dash -hls_playlist 1 한 출력 — 인코더 하나가 조각 한 벌(10개, 7.56MB)을
// 쌓고, manifest.mpd 와 media_0.m3u8 이 같은 조각을 함께 가리킨다.
// 조각 수 · 바이트는 글의 FFmpeg 9.0.2 실측(_workspace/blog/ffmpeg-hls-dash-muxer/measure/c1-c2-two-outputs-vs-hls-playlist.txt)과 같다.
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(SharedSegmentsMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const SHARED_SEGMENTS_FRAMES = 330;

const SEGMENTS = 10;
const CELL_START = 30;
const CELL_STEP = 14;
const CELLS_DONE = CELL_START + SEGMENTS * CELL_STEP;
const LISTS_IN = CELLS_DONE + 10;
const ARROWS_IN = LISTS_IN + 14;
const TOTAL_IN = ARROWS_IN + 34;

type Row = { readonly label: string; readonly labelX: number; readonly labelY: number; readonly cellsY: number; readonly tone: "danger" | "accent" };
type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly text: string };
type Layout = {
  readonly titles: readonly { readonly x: number; readonly y: number; readonly text: string; readonly color: string }[];
  readonly cellsX: number;
  readonly cell: { readonly w: number; readonly h: number; readonly gap: number };
  readonly rows: readonly Row[];
  readonly encoders: readonly Box[];
  readonly input: Box | null;
  readonly lists: readonly Box[];
  readonly sharedRow: number;
  readonly totals: readonly { readonly x: number; readonly y: number; readonly text: string; readonly tone: "danger" | "accent" }[];
  readonly text: { readonly title: number; readonly label: number; readonly box: number };
};

const DESKTOP: Layout = {
  titles: [
    { x: 60, y: 50, text: "출력 둘: -f hls 와 -f dash", color: COLOR.danger },
    { x: 60, y: 520, text: "한 출력: -f dash -hls_playlist 1", color: COLOR.accent },
  ],
  cellsX: 640,
  cell: { w: 86, h: 70, gap: 12 },
  rows: [
    { label: "HLS", labelX: 1630, labelY: 150, cellsY: 140, tone: "danger" },
    { label: "DASH", labelX: 1630, labelY: 270, cellsY: 260, tone: "danger" },
    { label: "공유", labelX: 1630, labelY: 630, cellsY: 620, tone: "accent" },
  ],
  encoders: [
    { x: 340, y: 135, w: 240, h: 80, text: "x264 ①" },
    { x: 340, y: 255, w: 240, h: 80, text: "x264 ②" },
    { x: 340, y: 615, w: 240, h: 80, text: "x264 ①" },
  ],
  input: { x: 60, y: 195, w: 200, h: 80, text: "입력 20초" },
  lists: [
    { x: 700, y: 790, w: 380, h: 84, text: "manifest.mpd" },
    { x: 1180, y: 790, w: 380, h: 84, text: "media_0.m3u8" },
  ],
  sharedRow: 2,
  totals: [
    { x: 60, y: 390, text: "인코더 2 · 조각 두 벌 15.1MB", tone: "danger" },
    { x: 60, y: 930, text: "인코더 1 · 조각 한 벌 7.56MB", tone: "accent" },
  ],
  text: { title: TEXT.label, label: TEXT.small, box: TEXT.small },
};

const MOBILE: Layout = {
  titles: [
    { x: 40, y: 30, text: "출력 둘: hls + dash", color: COLOR.danger },
    { x: 40, y: 580, text: "한 출력: -hls_playlist 1", color: COLOR.accent },
  ],
  cellsX: 40,
  cell: { w: 92, h: 70, gap: 9 },
  rows: [
    { label: "x264 ① → HLS 조각", labelX: 40, labelY: 110, cellsY: 180, tone: "danger" },
    { label: "x264 ② → DASH 조각", labelX: 40, labelY: 270, cellsY: 340, tone: "danger" },
    { label: "x264 ① → 조각 한 벌", labelX: 40, labelY: 660, cellsY: 730, tone: "accent" },
  ],
  encoders: [],
  input: null,
  lists: [
    { x: 40, y: 900, w: 480, h: 96, text: "manifest.mpd" },
    { x: 560, y: 900, w: 480, h: 96, text: "media_0.m3u8" },
  ],
  sharedRow: 2,
  totals: [
    { x: 40, y: 450, text: "인코더 2 · 15.1MB", tone: "danger" },
    { x: 40, y: 1060, text: "인코더 1 · 7.56MB", tone: "accent" },
  ],
  text: { title: MOBILE_TEXT.label, label: MOBILE_TEXT.small, box: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const SharedSegments: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 14);
  const listsShown = progress(frame, LISTS_IN, 12);
  const arrows = progress(frame, ARROWS_IN, 26);
  const totals = progress(frame, TOTAL_IN, 14);
  const cellX = (k: number): number => l.cellsX + k * (l.cell.w + l.cell.gap);
  const shared = l.rows[l.sharedRow];
  const sharedMid = cellX(0) + (cellX(SEGMENTS - 1) + l.cell.w - cellX(0)) / 2;

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {l.titles.map((t) => (
        <Label key={t.text} x={t.x} y={t.y} size={l.text.title} weight={760} color={t.color} opacity={intro}>
          {t.text}
        </Label>
      ))}
      {l.input ? (
        <>
          <Node x={l.input.x} y={l.input.y} width={l.input.w} height={l.input.h} size={l.text.box} opacity={intro}>
            {l.input.text}
          </Node>
          {l.encoders.slice(0, 2).map((e) => (
            <Arrow key={e.y} x1={l.input!.x + l.input!.w + 8} y1={l.input!.y + l.input!.h / 2} x2={e.x - 10} y2={e.y + e.h / 2} color={COLOR.muted} draw={intro} />
          ))}
          <Arrow x1={l.input.x + l.input.w + 8} y1={l.encoders[2].y + l.encoders[2].h / 2} x2={l.encoders[2].x - 10} y2={l.encoders[2].y + l.encoders[2].h / 2} color={COLOR.muted} draw={intro} />
          <Node x={l.input.x} y={l.encoders[2].y} width={l.input.w} height={l.input.h} size={l.text.box} opacity={intro}>
            {l.input.text}
          </Node>
        </>
      ) : null}
      {l.encoders.map((e, i) => (
        <Node key={`${e.y}`} x={e.x} y={e.y} width={e.w} height={e.h} size={l.text.box} tone={i < 2 ? "danger" : "accent"} opacity={intro}>
          {e.text}
        </Node>
      ))}
      {l.rows.map((row) => (
        <div key={row.label}>
          <Label x={row.labelX} y={row.labelY} size={l.text.label} weight={720} color={row.tone === "danger" ? COLOR.danger : COLOR.accent} opacity={intro}>
            {row.label}
          </Label>
          {Array.from({ length: SEGMENTS }, (_, k) => {
            const shown = progress(frame, CELL_START + k * CELL_STEP, 10);
            return (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: cellX(k),
                  top: row.cellsY,
                  width: l.cell.w,
                  height: l.cell.h,
                  boxSizing: "border-box",
                  borderRadius: 10,
                  border: `4px solid ${row.tone === "danger" ? COLOR.danger : COLOR.accent}`,
                  background: row.tone === "danger" ? COLOR.dangerSoft : COLOR.accentSoft,
                  opacity: shown,
                  transform: `scale(${0.85 + 0.15 * shown})`,
                }}
              />
            );
          })}
        </div>
      ))}
      {l.lists.map((box) => (
        <div key={box.text}>
          <Node x={box.x} y={box.y} width={box.w} height={box.h} size={l.text.box} tone="accent" opacity={listsShown}>
            {box.text}
          </Node>
          {arrows > 0.01 ? <Arrow
            x1={box.x + box.w / 2}
            y1={box.y - 8}
            x2={box.x + box.w / 2 + (sharedMid - (box.x + box.w / 2)) * 0.35}
            y2={shared.cellsY + l.cell.h + 14}
            color={COLOR.accent}
            draw={arrows}
          /> : null}
        </div>
      ))}
      {l.totals.map((t) => (
        <Tag key={t.text} x={t.x} y={t.y} tone={t.tone} size={l.text.label} opacity={totals}>
          {t.text}
        </Tag>
      ))}
    </AbsoluteFill>
  );
};
