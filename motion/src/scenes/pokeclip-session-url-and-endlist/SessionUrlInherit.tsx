// 콘티: _workspace/blog/pokeclip-session-url-and-endlist/storyboard.md 「영상 1」
// 세션 A 목록에 ENDLIST 가 붙는다(송출 끊김). 끊긴 뒤 시간이 300초 창 안의 120초까지 흐르고,
// 새 세션 B 의 새 목록 주소가 열린다. A 조각 15개(0–14)가 B 목록 머리로 내려와 접두부가 되고,
// 경계에 DISCONTINUITY + 새 MAP 이 선 뒤 B 의 새 조각(15–)이 붙는다. A 목록은 ENDLIST 를 단 채 그대로.
// 수치는 2026-10-17 compose 실측(A 15조각 · 120초 뒤 재접속)과 같다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, SegmentCell, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const SESSION_URL_INHERIT_FRAMES = 345;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤에는 1초 이상 멈춘다. */
const T = {
  intro: 0,
  endlist: 24,
  clock: 66,
  clockFrames: 54,
  urlB: 138,
  prefix: 168,
  prefixFrames: 30,
  seam: 204,
  fresh: 222,
  verdict: 258,
} as const;
const FADE = 12;
const SECONDS_SHOWN = 120;
const WINDOW_SECONDS = 300;
const BAR_SECONDS = 400;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly x0: number;
  readonly cell: { readonly w: number; readonly h: number; readonly gap: number };
  readonly rowA: { readonly labelY: number; readonly y: number };
  readonly rowB: { readonly labelY: number; readonly y: number };
  readonly endlist: { readonly x: number; readonly y: number };
  readonly kept: { readonly x: number; readonly y: number };
  readonly bar: { readonly y: number; readonly w: number; readonly h: number };
  /** 주소 글자의 자리: 목록 이름표에서 얼마나 떨어지나. */
  readonly url: { readonly dx: number; readonly dy: number };
  readonly seamGap: number;
  readonly verdict: { readonly x: number; readonly y: number };
  readonly text: { readonly title: number; readonly label: number; readonly cell: number; readonly tag: number };
  readonly copy: {
    readonly a: string;
    readonly b: string;
    readonly urlA: string;
    readonly urlB: string;
    readonly seam: string;
    readonly verdict: string;
    readonly kept: string;
  };
};

const DESKTOP: Layout = {
  title: [{ y: 52, text: "끝난 목록은 그대로, 새 세션에는 새 주소" }],
  x0: 120,
  cell: { w: 130, h: 104, gap: 16 },
  rowA: { labelY: 160, y: 236 },
  rowB: { labelY: 590, y: 666 },
  endlist: { x: 870, y: 258 },
  kept: { x: 1140, y: 258 },
  bar: { y: 444, w: 900, h: 22 },
  url: { dx: 300, dy: 4 },
  seamGap: 44,
  verdict: { x: 120, y: 900 },
  text: { title: TEXT.title, label: TEXT.label, cell: TEXT.small, tag: TEXT.small },
  copy: {
    a: "세션 A 목록",
    b: "세션 B 목록",
    urlA: "…/A/index.m3u8",
    urlB: "…/B/index.m3u8 새 주소",
    seam: "DISCONTINUITY + 새 MAP",
    verdict: "300초 안 · 같은 코덱 사양 → 계승",
    kept: "그대로",
  },
};

const MOBILE: Layout = {
  title: [
    { y: 70, text: "끝난 목록은 그대로," },
    { y: 142, text: "새 세션에는 새 주소" },
  ],
  x0: 60,
  cell: { w: 100, h: 100, gap: 10 },
  rowA: { labelY: 250, y: 400 },
  rowB: { labelY: 790, y: 940 },
  endlist: { x: 620, y: 410 },
  kept: { x: 620, y: 300 },
  bar: { y: 640, w: 960, h: 26 },
  url: { dx: 0, dy: 65 },
  seamGap: 30,
  verdict: { x: 60, y: 1170 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, cell: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
  copy: {
    a: "세션 A 목록",
    b: "세션 B 목록 · 새 주소",
    urlA: "…/A/index.m3u8",
    urlB: "…/B/index.m3u8",
    seam: "끊김 표시 + 새 MAP",
    verdict: "300초 안 · 같은 코덱 → 계승",
    kept: "그대로",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

/** A 조각 15개(0–14)는 칸 다섯으로 줄여 그린다. */
const A_LABELS = ["0", "1", "…", "13", "14"] as const;
const B_LABELS = ["15", "16", "17"] as const;

export const SessionUrlInherit: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;
  const step = l.cell.w + l.cell.gap;

  const intro = progress(frame, T.intro, 15);
  const endlist = progress(frame, T.endlist, FADE);
  const clockShow = progress(frame, T.clock, FADE);
  const clock = progress(frame, T.clock, T.clockFrames, EASE_IN_OUT);
  const urlB = progress(frame, T.urlB, FADE);
  const prefix = progress(frame, T.prefix, T.prefixFrames, EASE_IN_OUT);
  const seam = progress(frame, T.seam, FADE);
  const fresh = progress(frame, T.fresh, FADE);
  const verdict = progress(frame, T.verdict, FADE);

  const seconds = Math.round(clock * SECONDS_SHOWN);
  const pxPerSecond = l.bar.w / BAR_SECONDS;
  const markerX = l.x0 + seconds * pxPerSecond;
  const windowW = WINDOW_SECONDS * pxPerSecond;

  const prefixEnd = l.x0 + A_LABELS.length * step - l.cell.gap;
  const seamX = prefixEnd + l.seamGap / 2;
  const freshX0 = prefixEnd + l.seamGap;
  const prefixY = interpolate(prefix, [0, 1], [l.rowA.y, l.rowB.y]);
  const tagH = l.text.tag * 1.6;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.x0} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 세션 A 목록: 조각 다섯 칸과 ENDLIST. 끝까지 바뀌지 않는다. */}
      <Label x={l.x0} y={l.rowA.labelY} size={l.text.label} opacity={intro}>
        {c.a}
      </Label>
      <Label x={l.x0 + l.url.dx} y={l.rowA.labelY + l.url.dy} size={l.text.tag} color={COLOR.muted} weight={600} opacity={intro}>
        {c.urlA}
      </Label>
      {A_LABELS.map((label, i) => (
        <SegmentCell
          key={`a-${label}`}
          x={l.x0 + i * step}
          y={l.rowA.y}
          width={l.cell.w}
          height={l.cell.h}
          state="live"
          label={label}
          size={l.text.cell}
          opacity={intro}
        />
      ))}
      <Tag x={l.endlist.x} y={l.endlist.y} tone="ink" size={l.text.tag} opacity={endlist}>
        ENDLIST
      </Tag>
      <Tag x={l.kept.x} y={l.kept.y} tone="muted" size={l.text.tag} opacity={verdict}>
        {c.kept}
      </Tag>

      {/* 끊긴 뒤 흐른 시간: 0–400초 막대 위에 300초 창(청록). */}
      <div style={{ opacity: clockShow }}>
        <div
          style={{
            position: "absolute",
            left: l.x0,
            top: l.bar.y,
            width: l.bar.w,
            height: l.bar.h,
            borderRadius: l.bar.h / 2,
            background: COLOR.line,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: l.x0,
            top: l.bar.y,
            width: windowW,
            height: l.bar.h,
            borderRadius: l.bar.h / 2,
            background: COLOR.accentSoft,
            border: `3px solid ${COLOR.accent}`,
            boxSizing: "border-box",
          }}
        />
        <Label x={l.x0 + windowW} y={l.bar.y + l.bar.h + 14} size={l.text.tag} color={COLOR.accent} anchor="center">
          300초
        </Label>
        <Label x={l.x0} y={l.bar.y + l.bar.h + 14} size={l.text.tag} color={COLOR.muted} weight={600}>
          끊김
        </Label>
        <div
          style={{
            position: "absolute",
            left: markerX - 5,
            top: l.bar.y - 16,
            width: 10,
            height: l.bar.h + 32,
            borderRadius: 5,
            background: COLOR.ink,
          }}
        />
        <Tag x={markerX} y={l.bar.y - tagH - 22} tone="ink" size={l.text.tag} anchor="center">
          {`${seconds}초`}
        </Tag>
      </div>

      {/* 세션 B: 새 주소가 열리고, A 조각이 접두부로 내려온 뒤 경계와 새 조각이 붙는다. */}
      <Label x={l.x0} y={l.rowB.labelY} size={l.text.label} color={COLOR.accent} opacity={urlB}>
        {c.b}
      </Label>
      <Label x={l.x0 + l.url.dx} y={l.rowB.labelY + l.url.dy} size={l.text.tag} color={COLOR.accent} weight={600} opacity={urlB}>
        {c.urlB}
      </Label>
      {A_LABELS.map((label, i) => (
        <SegmentCell
          key={`p-${label}`}
          x={l.x0 + i * step}
          y={prefixY}
          width={l.cell.w}
          height={l.cell.h}
          state="live"
          label={label}
          size={l.text.cell}
          opacity={prefix > 0 ? 1 : 0}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: seamX - 4,
          top: l.rowB.y - 14,
          width: 8,
          height: l.cell.h + 28,
          borderRadius: 4,
          background: COLOR.accent,
          opacity: seam,
        }}
      />
      <Tag x={seamX} y={l.rowB.y + l.cell.h + 24} tone="accent" size={l.text.tag} anchor="center" opacity={seam}>
        {c.seam}
      </Tag>
      {B_LABELS.map((label, i) => (
        <div key={`b-${label}`} style={{ opacity: fresh }}>
          <div
            style={{
              position: "absolute",
              left: freshX0 + i * step,
              top: l.rowB.y,
              width: l.cell.w,
              height: l.cell.h,
              borderRadius: 14,
              boxSizing: "border-box",
              background: COLOR.accentSoft,
              border: `4px solid ${COLOR.accent}`,
            }}
          />
          <Label x={freshX0 + i * step + l.cell.w / 2} y={l.rowB.y + l.cell.h / 2 - l.text.cell * 0.62} size={l.text.cell} anchor="center">
            {label}
          </Label>
        </div>
      ))}

      <Tag x={l.verdict.x} y={l.verdict.y} tone="accent" size={l.text.tag} opacity={verdict}>
        {c.verdict}
      </Tag>
    </AbsoluteFill>
  );
};
