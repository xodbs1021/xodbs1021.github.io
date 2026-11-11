// 콘티: _workspace/blog/pokeclip-live-editing-boundaries/storyboard.md 「영상 1」
// 녹화 조각이 하나 들어올 때마다 세 갈래로 간다. 라이브 목록은 정해진 창이 밀리며 옛 조각이 빠지고,
// 되감기 목록은 업로드를 확인한 뒤에만 늘어나며, 편집기는 구간 [in, out)을 골라 영상 1 · 소리 6 원본을 끌어온다.
// 반복 클립, 생성 소재 없음. 창 길이는 쓰지 않는다 — 운영 설정(900)과 로컬 · 10월 19일 결정값(7)이 달라 「정해진 창」으로만 쓴다. 그림의 7칸은 설명용.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, SegmentCell, Tag, WindowBand } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const SEGMENT_THREE_WAYS_FRAMES = 330;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤에는 1초 이상 멈춘다. */
const T = {
  intro: 0,
  arrive8: 30,
  slide8: 40,
  confirm8: 80,
  arrive9: 120,
  slide9: 130,
  confirm9: 160,
  bracket: 200,
  pull: 230,
  expand: 250,
} as const;
const FADE = 12;

const WINDOW = 7;
const PICK = [5, 6] as const;

type Row = { readonly labelY: number; readonly y: number };

type Layout = {
  readonly width: number;
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly x0: number;
  readonly cellW: number;
  readonly gap: number;
  readonly cellH: number;
  readonly stackH: number;
  readonly margin: number;
  readonly rows: { readonly rec: Row; readonly live: Row; readonly dvr: Row; readonly edit: Row };
  readonly text: { readonly title: number; readonly label: number; readonly tag: number; readonly cell: number };
};

const DESKTOP: Layout = {
  width: 1920,
  title: [{ y: 32, text: "녹화 조각 하나가 세 갈래로 갑니다" }],
  x0: 150,
  cellW: 180,
  gap: 10,
  cellH: 84,
  stackH: 190,
  margin: 80,
  rows: {
    rec: { labelY: 122, y: 180 },
    live: { labelY: 300, y: 358 },
    dvr: { labelY: 478, y: 536 },
    edit: { labelY: 656, y: 714 },
  },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small, cell: TEXT.label },
};

const MOBILE: Layout = {
  width: 1080,
  title: [
    { y: 56, text: "녹화 조각 하나가" },
    { y: 124, text: "세 갈래로 갑니다" },
  ],
  x0: 60,
  cellW: 106,
  gap: 8,
  cellH: 96,
  stackH: 250,
  margin: 50,
  rows: {
    rec: { labelY: 226, y: 306 },
    live: { labelY: 438, y: 518 },
    dvr: { labelY: 650, y: 730 },
    edit: { labelY: 862, y: 942 },
  },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, cell: MOBILE_TEXT.label },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 오른쪽 여백에 붙는 이름표. */
const RightTag: React.FC<{
  readonly children: React.ReactNode;
  readonly right: number;
  readonly y: number;
  readonly tone: "accent" | "muted" | "ink";
  readonly size: number;
  readonly opacity: number;
}> = ({ children, right, y, tone, size, opacity }) => {
  const style = {
    accent: { background: COLOR.accent, color: COLOR.white },
    muted: { background: COLOR.surface, color: COLOR.muted },
    ink: { background: COLOR.ink, color: COLOR.white },
  }[tone];
  return (
    <div
      style={{
        position: "absolute",
        right,
        top: y,
        padding: "8px 22px",
        borderRadius: 999,
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 700,
        whiteSpace: "nowrap",
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const SegmentThreeWays: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const x = (n: number) => l.x0 + (n - 1) * l.cellW;
  const w = l.cellW - l.gap;

  const intro = progress(frame, T.intro, 15);
  const arrived = frame >= T.arrive9 ? 9 : frame >= T.arrive8 ? 8 : 7;
  const arriveIn = (n: number) => (n === 8 ? progress(frame, T.arrive8, FADE) : n === 9 ? progress(frame, T.arrive9, FADE) : 1);

  // 라이브 창의 첫 조각 번호: 1 → 2 → 3, 밀리는 동안 보간.
  const liveStart = 1 + progress(frame, T.slide8, 15) + progress(frame, T.slide9, 15);
  const liveFirst = frame >= T.slide9 + 8 ? 3 : frame >= T.slide8 + 8 ? 2 : 1;

  // 되감기: 확인된 마지막 번호와 업로드 중인 번호.
  const confirmed = frame >= T.confirm9 ? 9 : frame >= T.confirm8 ? 8 : 7;
  const pending = frame >= T.slide9 && frame < T.confirm9 ? 9 : frame >= T.slide8 && frame < T.confirm8 ? 8 : null;
  const pendingIn = pending === 9 ? progress(frame, T.slide9, FADE) : pending === 8 ? progress(frame, T.slide8, FADE) : 0;
  const uploading = pending !== null ? 1 : 0;
  const confirmTag =
    frame >= T.confirm8 && frame < T.arrive9 ? progress(frame, T.confirm8, FADE) : frame >= T.confirm9 ? progress(frame, T.confirm9, FADE) : 0;

  const bracket = progress(frame, T.bracket, FADE);
  const pull = progress(frame, T.pull, 18);
  const expand = progress(frame, T.expand, 18);

  const cell = (n: number, y: number, state: "live" | "gone", opacity: number, key: string) => (
    <SegmentCell key={key} x={x(n) + l.gap / 2} y={y} width={w} height={l.cellH} state={state} label={String(n)} opacity={opacity} size={l.text.cell} />
  );

  const stackTop = l.rows.edit.y;
  const barGap = layout === "mobile" ? 8 : 6;
  const videoH = layout === "mobile" ? 56 : 44;
  const audioH = (l.stackH - videoH - barGap * 6) / 6;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.x0} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 녹화 조각 */}
      <Label x={l.x0} y={l.rows.rec.labelY} size={l.text.label} weight={700} opacity={intro}>
        녹화 조각
      </Label>
      {Array.from({ length: arrived }, (_, i) => i + 1).map((n) =>
        cell(n, l.rows.rec.y - (1 - arriveIn(n)) * 40, "live", intro * arriveIn(n), `rec-${n}`),
      )}

      {/* 라이브 목록: 정해진 창(그림에서는 7칸)이 오른쪽으로 밀린다. */}
      <Label x={l.x0} y={l.rows.live.labelY} size={l.text.label} weight={700} opacity={intro}>
        라이브 목록
      </Label>
      <RightTag right={l.margin} y={l.rows.live.labelY - 8} tone="ink" size={l.text.tag} opacity={intro}>
        정해진 창
      </RightTag>
      <WindowBand
        x={x(liveStart) - 4}
        y={l.rows.live.y - 10}
        width={WINDOW * l.cellW + 8 - l.gap}
        height={l.cellH + 20}
        opacity={intro * 0.9}
      />
      {Array.from({ length: arrived }, (_, i) => i + 1).map((n) =>
        cell(n, l.rows.live.y, n < liveFirst ? "gone" : "live", intro * arriveIn(n), `live-${n}`),
      )}

      {/* 되감기 목록: 업로드를 확인한 조각만 붙는다. */}
      <Label x={l.x0} y={l.rows.dvr.labelY} size={l.text.label} weight={700} opacity={intro}>
        되감기 목록
      </Label>
      <RightTag right={l.margin} y={l.rows.dvr.labelY - 8} tone="muted" size={l.text.tag} opacity={uploading * pendingIn}>
        업로드 중
      </RightTag>
      <RightTag right={l.margin} y={l.rows.dvr.labelY - 8} tone="accent" size={l.text.tag} opacity={uploading ? 0 : confirmTag}>
        업로드 확인 ✓
      </RightTag>
      {Array.from({ length: confirmed }, (_, i) => i + 1).map((n) => (
        <SegmentCell
          key={`dvr-${n}`}
          x={x(n) + l.gap / 2}
          y={l.rows.dvr.y}
          width={w}
          height={l.cellH}
          state="live"
          label={String(n)}
          opacity={intro}
          size={l.text.cell}
        />
      ))}
      {pending !== null ? (
        <div
          style={{
            position: "absolute",
            left: x(pending) + l.gap / 2,
            top: l.rows.dvr.y,
            width: w,
            height: l.cellH,
            borderRadius: 14,
            boxSizing: "border-box",
            border: `4px dashed ${COLOR.muted}`,
            background: COLOR.surface,
            color: COLOR.muted,
            display: "grid",
            placeItems: "center",
            fontFamily: FONT,
            fontSize: l.text.cell,
            fontWeight: 650,
            opacity: pendingIn,
          }}
        >
          {pending}
        </div>
      ) : null}
      {/* 막 확인된 조각을 잠깐 청록 테두리로. */}
      {[8, 9].map((n) => {
        const at = n === 8 ? T.confirm8 : T.confirm9;
        const glow = frame >= at ? 1 - progress(frame, at + 20, 20) : 0;
        return (
          <div
            key={`glow-${n}`}
            style={{
              position: "absolute",
              left: x(n) + l.gap / 2,
              top: l.rows.dvr.y,
              width: w,
              height: l.cellH,
              borderRadius: 14,
              boxSizing: "border-box",
              border: `6px solid ${COLOR.accent}`,
              opacity: glow,
            }}
          />
        );
      })}

      {/* 편집 원본: 구간을 고르면 그 조각의 6트랙 원본을 끌어온다. */}
      <Label x={l.x0} y={l.rows.edit.labelY} size={l.text.label} weight={700} opacity={intro}>
        편집 원본
      </Label>
      <RightTag right={l.margin} y={l.rows.edit.labelY - 8} tone="accent" size={l.text.tag} opacity={expand}>
        영상 1 · 소리 6
      </RightTag>
      {/* 구간 괄호: 녹화 조각 줄부터 편집 줄까지 내려오는 청록 띠. */}
      <div
        style={{
          position: "absolute",
          left: x(PICK[0]),
          top: l.rows.rec.y - 14,
          width: PICK.length * l.cellW - l.gap / 2,
          height: l.cellH + 28,
          borderRadius: 16,
          border: `5px solid ${COLOR.accent}`,
          boxSizing: "border-box",
          opacity: bracket,
        }}
      />
      <Tag
        x={x(PICK[0]) + (PICK.length * l.cellW) / 2}
        y={l.rows.rec.labelY - 6}
        tone="accent"
        size={l.text.tag}
        anchor="center"
        opacity={bracket}
      >
        [in, out)
      </Tag>
      {PICK.map((n) => {
        const left = x(n) + l.gap / 2;
        const fromY = l.rows.rec.y;
        const top = fromY + (stackTop - fromY) * pull;
        const h = l.cellH + (l.stackH - l.cellH) * expand;
        return (
          <div key={`edit-${n}`} style={{ position: "absolute", left, top, width: w, height: h, opacity: pull > 0 ? 1 : 0 }}>
            {/* 펼치기 전: 조각 칸 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 14,
                boxSizing: "border-box",
                border: `4px solid ${COLOR.accent}`,
                background: COLOR.accentSoft,
                display: "grid",
                placeItems: "center",
                fontFamily: FONT,
                fontSize: l.text.cell,
                fontWeight: 700,
                color: COLOR.ink,
                opacity: 1 - expand,
              }}
            >
              {n}
            </div>
            {/* 펼친 뒤: 영상 1 + 소리 6 막대 */}
            <div style={{ position: "absolute", inset: 0, opacity: expand }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: videoH, borderRadius: 8, background: COLOR.ink }} />
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: videoH + barGap + i * (audioH + barGap),
                    height: audioH,
                    borderRadius: 6,
                    background: COLOR.accent,
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
