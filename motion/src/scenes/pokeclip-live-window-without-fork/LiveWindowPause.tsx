// 콘티: _workspace/blog/pokeclip-live-window-without-fork/storyboard.md 「영상 1」
// 7 · 14 · 28초 라이브 창이 라이브 끝을 따라 15초 동안 오른쪽으로 밀린다. 멈춘 플레이어가 기다리던 조각(MSN)은 제자리에 남는다.
// 창 아래끝이 그 조각을 지나치면 그 줄은 400, 끝까지 창 안이면 200. 결과는 2026-10-17 CloudFront 실측(15초 멈춤: 28초 창만 200)과 같다.
// 조각 길이(1 · 2 · 4초)도 실측 구성과 같다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, SegmentCell, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const LIVE_WINDOW_PAUSE_FRAMES = 345;

/** 장면 순서(프레임, 30fps). 15초 멈춤을 240프레임(8초)으로 줄여 보여 준다. */
const T = {
  intro: 0,
  pause: 24,
  slide: 40,
  slideFrames: 240,
  verdict28: 284,
} as const;
const FADE = 12;
const PAUSE_SECONDS = 15;
/** 멈춘 순간의 라이브 끝(초). 기다리던 조각은 여기서 시작한다. */
const EDGE0 = 30;
const T_MIN = 6;

const ROWS = [
  { window: 7, seg: 1 },
  { window: 14, seg: 2 },
  { window: 28, seg: 4 },
] as const;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly x0: number;
  readonly pxPerSecond: number;
  readonly clock: { readonly x: number; readonly y: number };
  readonly rows: readonly { readonly labelY: number; readonly y: number }[];
  readonly bandH: number;
  readonly marker: { readonly top: number; readonly bottom: number; readonly labelY: number };
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
  readonly copy: { readonly paused: string; readonly waiting: string; readonly edge: string };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "멈춘 사이 창이 밀려도 기다리던 조각이 남는가" }],
  x0: 150,
  pxPerSecond: 36,
  clock: { x: 150, y: 128 },
  rows: [
    { labelY: 300, y: 360 },
    { labelY: 510, y: 570 },
    { labelY: 720, y: 780 },
  ],
  bandH: 96,
  marker: { top: 268, bottom: 900, labelY: 216 },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
  copy: { paused: "멈춘 시간", waiting: "기다리던 조각", edge: "라이브 끝" },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "멈춘 사이 창이 밀려도" },
    { y: 124, text: "기다리던 조각이 남는가" },
  ],
  x0: 40,
  pxPerSecond: 22,
  clock: { x: 60, y: 214 },
  rows: [
    { labelY: 460, y: 524 },
    { labelY: 700, y: 764 },
    { labelY: 940, y: 1004 },
  ],
  bandH: 96,
  marker: { top: 420, bottom: 1130, labelY: 340 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  copy: { paused: "멈춘 시간", waiting: "기다리던 조각", edge: "라이브 끝" },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const LiveWindowPause: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;
  const x = (t: number) => l.x0 + (t - T_MIN) * l.pxPerSecond;

  const intro = progress(frame, T.intro, 15);
  const paused = progress(frame, T.pause, FADE);
  const slide = progress(frame, T.slide, T.slideFrames, (t) => t);
  const elapsed = slide * PAUSE_SECONDS;
  const edge = EDGE0 + elapsed;
  const markerX = x(EDGE0);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.x0} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <Tag x={l.clock.x} y={l.clock.y} tone="ink" size={l.text.tag} opacity={paused}>
        {`${c.paused} ${Math.round(elapsed)}초`}
      </Tag>

      {/* 기다리던 조각의 자리 — 세 줄을 가로지르는 점선. */}
      <div
        style={{
          position: "absolute",
          left: markerX - 3,
          top: l.marker.top,
          width: 0,
          height: l.marker.bottom - l.marker.top,
          borderLeft: `6px dashed ${COLOR.ink}`,
          opacity: paused,
        }}
      />
      <Label x={markerX} y={l.marker.labelY} size={l.text.tag} weight={700} anchor="center" opacity={paused}>
        {c.waiting}
      </Label>

      {ROWS.map((row, i) => {
        const r = l.rows[i];
        const lower = edge - row.window;
        // 창 아래끝이 기다리던 조각의 시작을 지나치면 그 조각은 목록에서 빠진다.
        const evicted = lower > EDGE0;
        const evictedAt = T.slide + ((row.window / PAUSE_SECONDS) * T.slideFrames);
        const verdictOn = evicted ? progress(frame, evictedAt, FADE) : progress(frame, T.verdict28, FADE);
        const bandX = x(Math.max(lower, T_MIN));
        const bandW = x(edge) - bandX;
        return (
          <div key={row.window} style={{ opacity: intro }}>
            <Label x={l.x0} y={r.labelY} size={l.text.label} weight={700}>
              {`${row.window}초 창 (${row.seg}초 × 7)`}
            </Label>
            <div
              style={{
                position: "absolute",
                left: bandX,
                top: r.y,
                width: bandW,
                height: l.bandH,
                borderRadius: 18,
                background: COLOR.accentSoft,
                border: `4px solid ${COLOR.accent}`,
                boxSizing: "border-box",
              }}
            />
            <SegmentCell
              x={markerX + 4}
              y={r.y + 12}
              width={Math.max(row.seg * l.pxPerSecond - 8, 18)}
              height={l.bandH - 24}
              state={evicted ? "error" : "live"}
              opacity={paused}
            />
            <div
              style={{
                position: "absolute",
                left: x(edge) - 3,
                top: r.y - 14,
                width: 6,
                height: l.bandH + 28,
                borderRadius: 3,
                background: COLOR.ink,
              }}
            />
            <Tag
              x={x(edge) + 24}
              y={r.y + l.bandH / 2 - l.text.tag * 0.8}
              tone={evicted ? "danger" : "accent"}
              size={l.text.tag}
              opacity={frame >= T.slide ? verdictOn : 0}
            >
              {evicted ? "400" : "200"}
            </Tag>
          </div>
        );
      })}

      <Label x={x(EDGE0 + PAUSE_SECONDS)} y={l.marker.bottom + 12} size={l.text.tag} color={COLOR.muted} weight={650} anchor="center" opacity={progress(frame, T.verdict28, FADE)}>
        {c.edge}
      </Label>
    </AbsoluteFill>
  );
};
