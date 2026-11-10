// 콘티: _workspace/blog/pokeclip-segment-overlap-contract/storyboard.md 「영상 1」
// 요청 창 [3.9초, 8초) 위에 조각 A [0,4) · B [4,8) · C [8,12). 위 줄 BETWEEN(시작점만, 양 끝 포함)은 B · C 를 고르고 A 를 빠뜨린다.
// 아래 줄 겹침(시작 < 8 AND 끝 > 3.9)은 A · B 를 고르고 끝점만 닿는 C 를 뺀다. 수치는 글 본문 예시와 같다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const OVERLAP_QUERY_FRAMES = 330;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤에는 1초 이상 멈춘 뒤 다음 줄로 간다. */
const T = {
  intro: 0,
  request: 18,
  starts: 48,
  rowA: 78,
  rowAMiss: 108,
  rowB: 168,
  rowBOverlap: 198,
  rowBExclude: 228,
} as const;
const FADE = 12;

const REQ_START = 3.9;
const REQ_END = 8;
const SEGMENTS = [
  { name: "A", start: 0, end: 4 },
  { name: "B", start: 4, end: 8 },
  { name: "C", start: 8, end: 12 },
] as const;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly x0: number;
  readonly pxPerSecond: number;
  readonly cellH: number;
  readonly gap: number;
  readonly between: { readonly labelY: number; readonly y: number; readonly tagY: number };
  readonly overlap: { readonly labelY: number; readonly y: number; readonly tagY: number };
  readonly axisY: number;
  readonly request: { readonly top: number; readonly bottom: number; readonly labelY: number };
  readonly text: { readonly title: number; readonly label: number; readonly tag: number; readonly cell: number };
  readonly copy: {
    readonly between: string;
    readonly overlap: string;
    readonly request: string;
    readonly miss: string;
    readonly extra: string;
    readonly exclude: string;
  };
};

const DESKTOP: Layout = {
  title: [{ y: 32, text: "같은 요청 [3.9, 8)에 두 조건이 고르는 조각" }],
  x0: 180,
  pxPerSecond: 130,
  cellH: 104,
  gap: 8,
  between: { labelY: 172, y: 296, tagY: 414 },
  overlap: { labelY: 526, y: 604, tagY: 722 },
  axisY: 856,
  request: { top: 280, bottom: 836, labelY: 112 },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small, cell: TEXT.label },
  copy: {
    between: "BETWEEN: 시작점이 [3.9, 8] 안",
    overlap: "겹침: 시작 < 8 AND 끝 > 3.9",
    request: "요청 [3.9, 8)",
    miss: "빠짐",
    extra: "더 고름",
    exclude: "끝점만 닿음 · 제외",
  },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "같은 요청 [3.9, 8)에" },
    { y: 124, text: "두 조건이 고르는 조각" },
  ],
  x0: 60,
  pxPerSecond: 80,
  cellH: 110,
  gap: 6,
  between: { labelY: 330, y: 470, tagY: 596 },
  overlap: { labelY: 720, y: 860, tagY: 986 },
  axisY: 1130,
  request: { top: 456, bottom: 1110, labelY: 226 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, cell: MOBILE_TEXT.label },
  copy: {
    between: "BETWEEN: 시작점만",
    overlap: "겹침: 구간이 겹치나",
    request: "요청 [3.9, 8)",
    miss: "빠짐",
    extra: "더 고름",
    exclude: "제외",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type CellTone = "idle" | "pick" | "miss" | "extra" | "skip";

const CELL = {
  idle: { background: COLOR.white, border: `3px solid ${COLOR.ink}`, color: COLOR.ink },
  pick: { background: COLOR.accentSoft, border: `5px solid ${COLOR.accent}`, color: COLOR.ink },
  miss: { background: COLOR.white, border: `5px dashed ${COLOR.danger}`, color: COLOR.danger },
  extra: { background: COLOR.dangerSoft, border: `5px solid ${COLOR.danger}`, color: COLOR.danger },
  skip: { background: COLOR.line, border: `3px dashed ${COLOR.muted}`, color: COLOR.muted },
} as const;

export const OverlapQuery: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;
  const x = (t: number) => l.x0 + t * l.pxPerSecond;

  const intro = progress(frame, T.intro, 15);
  const request = progress(frame, T.request, FADE);
  const starts = progress(frame, T.starts, FADE);
  const rowA = progress(frame, T.rowA, FADE);
  const rowAMiss = progress(frame, T.rowAMiss, FADE);
  const rowBOverlap = progress(frame, T.rowBOverlap, FADE);
  const rowBExclude = progress(frame, T.rowBExclude, FADE);

  const betweenTone = (name: string): CellTone => {
    if (frame < T.rowA) return "idle";
    if (name === "B") return "pick";
    if (name === "C") return "extra";
    return frame >= T.rowAMiss ? "miss" : "idle";
  };
  const overlapTone = (name: string): CellTone => {
    if (frame < T.rowB) return "idle";
    if (name === "C") return frame >= T.rowBExclude ? "skip" : "idle";
    return "pick";
  };

  const row = (y: number, tone: (name: string) => CellTone) =>
    SEGMENTS.map((s) => {
      const style = CELL[tone(s.name)];
      return (
        <div
          key={`${y}-${s.name}`}
          style={{
            position: "absolute",
            left: x(s.start) + l.gap / 2,
            top: y,
            width: (s.end - s.start) * l.pxPerSecond - l.gap,
            height: l.cellH,
            borderRadius: 14,
            boxSizing: "border-box",
            display: "grid",
            placeItems: "center",
            fontSize: l.text.cell,
            fontWeight: 760,
            fontFamily: FONT,
            opacity: intro,
            ...style,
          }}
        >
          {s.name}
        </div>
      );
    });

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.x0} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 요청 창: 두 줄을 가로지르는 청록 띠. */}
      <div
        style={{
          position: "absolute",
          left: x(REQ_START),
          top: l.request.top,
          width: (REQ_END - REQ_START) * l.pxPerSecond,
          height: l.request.bottom - l.request.top,
          borderRadius: 18,
          background: COLOR.accentSoft,
          border: `4px solid ${COLOR.accent}`,
          boxSizing: "border-box",
          opacity: request * 0.55,
        }}
      />
      <Tag x={x((REQ_START + REQ_END) / 2)} y={l.request.labelY} tone="accent" size={l.text.tag} anchor="center" opacity={request}>
        {c.request}
      </Tag>

      <Label x={l.x0} y={l.between.labelY} size={l.text.label} weight={700} opacity={intro}>
        {c.between}
      </Label>
      {row(l.between.y, betweenTone)}
      {/* 시작점 표식 — BETWEEN 이 보는 값. */}
      {SEGMENTS.map((s) => (
        <div
          key={`dot-${s.name}`}
          style={{
            position: "absolute",
            left: x(s.start) - 11,
            top: l.between.y - 30,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: COLOR.ink,
            opacity: starts,
          }}
        />
      ))}
      <Tag x={x(2)} y={l.between.tagY} tone="danger" size={l.text.tag} anchor="center" opacity={rowAMiss}>
        {c.miss}
      </Tag>
      <Tag x={x(10)} y={l.between.tagY} tone="danger" size={l.text.tag} anchor="center" opacity={rowA}>
        {c.extra}
      </Tag>

      <Label x={l.x0} y={l.overlap.labelY} size={l.text.label} weight={700} opacity={intro}>
        {c.overlap}
      </Label>
      {row(l.overlap.y, overlapTone)}
      <div
        style={{
          position: "absolute",
          left: x(REQ_START),
          top: l.overlap.y + l.cellH + 8,
          width: (REQ_END - REQ_START) * l.pxPerSecond,
          height: 10,
          borderRadius: 5,
          background: COLOR.accent,
          opacity: rowBOverlap,
        }}
      />
      <Tag x={x(10)} y={l.overlap.tagY} tone="muted" size={l.text.tag} anchor="center" opacity={rowBExclude}>
        {c.exclude}
      </Tag>

      {/* 시간 축. */}
      {[0, 4, 8, 12].map((t) => (
        <Label key={t} x={x(t)} y={l.axisY} size={l.text.tag} color={COLOR.muted} weight={650} anchor="center" opacity={intro}>
          {`${t}초`}
        </Label>
      ))}
      <Label x={x(REQ_START)} y={l.axisY + l.text.tag * 1.3} size={l.text.tag} color={COLOR.accent} weight={700} anchor="center" opacity={request}>
        3.9
      </Label>
    </AbsoluteFill>
  );
};
