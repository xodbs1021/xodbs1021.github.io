// 콘티: _workspace/blog/pokeclip-audio-assignment-user-state/storyboard.md 「영상 1」
// 자동 배정은 처음 쓰기 전 소스마다 원래 트랙 체크를 컬렉션별로 백업하고, 끄면 지금 컬렉션부터 원래 체크로 돌린다.
// 리플레이 버퍼가 도는 동안은 되돌리기를 미루고, 다른 컬렉션은 열 때 돌린다. 값은 PR #195 리뷰 3판 실측과 같다.
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const AUTO_ASSIGN_RESTORE_FRAMES = 360;

/** 칸 하나의 채움: o = 체크(ink), a = 자동 배정이 바꾼 체크(accent), - = 빈칸. */
type Fill = "o" | "a" | "-";
/** 소스 두 줄(Tone · 마이크) × 트랙 1–6. */
type Checks = readonly [string, string];

const A_ORIGINAL: Checks = ["oooooo", "oooooo"];
const B_ORIGINAL: Checks = ["oooooo", "ooo---"];
const ASSIGNED: Checks = ["o-a---", "oa----"];

const TRACKS = [1, 2, 3, 4, 5, 6] as const;
const SOURCES = ["Tone", "마이크"] as const;

/** 격자 변화(프레임, 30fps). restore 는 되돌린 칸을 번쩍인다. stagger 는 트랙마다 늦추는 프레임. */
const STEPS: readonly { at: number; dur: number; to: Checks; stagger: number; restore: boolean }[] = [
  { at: 30, dur: 12, to: ASSIGNED, stagger: 2, restore: false },
  { at: 60, dur: 10, to: B_ORIGINAL, stagger: 0, restore: false },
  { at: 92, dur: 12, to: ASSIGNED, stagger: 2, restore: false },
  { at: 212, dur: 12, to: B_ORIGINAL, stagger: 2, restore: true },
  { at: 250, dur: 10, to: ASSIGNED, stagger: 0, restore: false },
  { at: 272, dur: 12, to: A_ORIGINAL, stagger: 2, restore: true },
];

/** 그 밖의 장면 순서. */
const T = {
  switchOn: 20,
  backupA: 20,
  tabB: 60,
  backupB: 80,
  replay: 120,
  switchOff: 132,
  hold: 150,
  replayStop: 192,
  holdEnd: 206,
  dropB: 236,
  tabA: 250,
  dropA: 296,
  replayStopEnd: 300,
  final: 310,
  thumb: 314,
} as const;
const FADE = 8;

type Layout = {
  readonly tabs: { readonly y: number; readonly h: number; readonly w: number; readonly xA: number; readonly xB: number };
  readonly toggle: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly labelX: number; readonly labelY: number };
  readonly grid: {
    readonly labelX: number;
    readonly x: number;
    readonly headerY: number;
    readonly rowY: readonly [number, number];
    readonly cell: number;
    readonly gap: number;
  };
  readonly status: { readonly y: number; readonly replayX: number; readonly holdX: number };
  readonly thumb: { readonly labelX: number; readonly x: number; readonly y: number; readonly dot: number; readonly gap: number };
  readonly backup: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly titleY: number;
    readonly rowY: readonly [number, number];
    readonly keyX: number;
    readonly miniX: number;
  };
  readonly mini: { readonly dot: number; readonly gap: number };
  readonly text: { readonly label: number; readonly small: number };
};

const DESKTOP: Layout = {
  tabs: { y: 150, h: 84, w: 280, xA: 120, xB: 420 },
  toggle: { x: 1380, y: 160, w: 116, h: 64, labelX: 1516, labelY: 165 },
  grid: { labelX: 120, x: 380, headerY: 300, rowY: [360, 540], cell: 140, gap: 24 },
  status: { y: 772, replayX: 380, holdX: 860 },
  thumb: { labelX: 790, x: 960, y: 771, dot: 30, gap: 9 },
  backup: { x: 1440, y: 480, w: 360, h: 380, titleY: 506, rowY: [600, 730], keyX: 1474, miniX: 1530 },
  mini: { dot: 30, gap: 9 },
  text: { label: TEXT.label, small: TEXT.small },
};

const MOBILE: Layout = {
  tabs: { y: 72, h: 96, w: 290, xA: 60, xB: 380 },
  toggle: { x: 60, y: 206, w: 116, h: 64, labelX: 196, labelY: 207 },
  grid: { labelX: 60, x: 260, headerY: 312, rowY: [380, 510], cell: 110, gap: 20 },
  status: { y: 668, replayX: 60, holdX: 590 },
  thumb: { labelX: 480, x: 710, y: 666, dot: 34, gap: 9 },
  backup: { x: 60, y: 800, w: 960, h: 400, titleY: 828, rowY: [920, 1060], keyX: 104, miniX: 180 },
  mini: { dot: 44, gap: 12 },
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const fillAt = (checks: Checks, row: number, col: number): Fill => checks[row][col] as Fill;

type CellLook = { readonly ink: number; readonly accent: number; readonly flash: number };

/** 칸 하나가 이 프레임에 얼마나 ink · accent 로 차 있는지와 되돌림 번쩍임. */
const cellLook = (frame: number, row: number, col: number): CellLook =>
  STEPS.reduce(
    (acc, step) => {
      const start = step.at + col * step.stagger;
      const p = progress(frame, start, step.dur);
      const to = fillAt(step.to, row, col);
      const flash = step.restore && to !== acc.fill
        ? Math.max(acc.flash, interpolate(frame, [start, start + 6, start + 24], [0, 1, 0], CLAMP))
        : acc.flash;
      return {
        fill: to,
        ink: acc.ink + ((to === "o" ? 1 : 0) - acc.ink) * p,
        accent: acc.accent + ((to === "a" ? 1 : 0) - acc.accent) * p,
        flash,
      };
    },
    { fill: fillAt(A_ORIGINAL, row, col), ink: fillAt(A_ORIGINAL, row, col) === "o" ? 1 : 0, accent: 0, flash: 0 },
  );

const Check: React.FC<{ readonly size: number; readonly opacity: number }> = ({ size, opacity }) => (
  <svg style={{ position: "absolute", left: 0, top: 0, opacity }} width={size} height={size} viewBox="0 0 100 100">
    <polyline points="27,52 44,69 75,35" fill="none" stroke={COLOR.white} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Cell: React.FC<{ readonly x: number; readonly y: number; readonly size: number; readonly look: CellLook }> = ({ x, y, size, look }) => {
  const layer = { position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: 16 } as const;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size }}>
      <div style={{ ...layer, boxSizing: "border-box", border: `4px solid ${COLOR.muted}`, background: COLOR.white }} />
      <div style={{ ...layer, background: COLOR.ink, opacity: look.ink }} />
      <div style={{ ...layer, background: COLOR.accent, opacity: look.accent }} />
      <Check size={size} opacity={Math.max(look.ink, look.accent)} />
      <div
        style={{
          position: "absolute",
          left: -12,
          top: -12,
          width: size + 24,
          height: size + 24,
          borderRadius: 24,
          boxSizing: "border-box",
          border: `8px solid ${COLOR.accent}`,
          opacity: look.flash,
        }}
      />
    </div>
  );
};

/** 백업 줄 · 축소판의 작은 체크 격자(원래 체크라 accent 가 없다). */
const MiniChecks: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly dot: number;
  readonly gap: number;
  readonly checks: Checks;
  readonly opacity: number;
}> = ({ x, y, dot, gap, checks, opacity }) => (
  <div style={{ position: "absolute", left: x, top: y, opacity }}>
    {checks.map((line, row) =>
      TRACKS.map((track, col) => (
        <div
          key={`${row}-${track}`}
          style={{
            position: "absolute",
            left: col * (dot + gap),
            top: row * (dot + gap),
            width: dot,
            height: dot,
            borderRadius: 6,
            boxSizing: "border-box",
            background: line[col] === "o" ? COLOR.ink : COLOR.white,
            border: line[col] === "o" ? "none" : `3px solid ${COLOR.muted}`,
          }}
        />
      )),
    )}
  </div>
);

const CollectionTab: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly active: number;
  readonly size: number;
  readonly children: string;
}> = ({ x, y, w, h, active, size, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 18,
      boxSizing: "border-box",
      border: `4px solid ${interpolateColors(active, [0, 1], [COLOR.line, COLOR.ink])}`,
      background: interpolateColors(active, [0, 1], [COLOR.surface, COLOR.ink]),
      color: interpolateColors(active, [0, 1], [COLOR.muted, COLOR.white]),
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 720,
    }}
  >
    {children}
  </div>
);

/** 자동 배정 스위치. on 0→1 로 손잡이가 오른쪽으로 간다. */
const Toggle: React.FC<{ readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly on: number }> = ({ x, y, w, h, on }) => {
  const knob = h - 12;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: h / 2,
        background: interpolateColors(on, [0, 1], [COLOR.muted, COLOR.accent]),
      }}
    >
      <div style={{ position: "absolute", left: 6 + (w - knob - 12) * on, top: 6, width: knob, height: knob, borderRadius: knob / 2, background: COLOR.white }} />
    </div>
  );
};

/** 점선 테두리 이름표(보류 상태). */
const DashedTag: React.FC<{ readonly x: number; readonly y: number; readonly size: number; readonly opacity: number; readonly children: string }> = ({
  x, y, size, opacity, children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y - 4,
      padding: "8px 22px",
      borderRadius: 999,
      border: `4px dashed ${COLOR.muted}`,
      background: COLOR.white,
      color: COLOR.muted,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      whiteSpace: "nowrap",
      opacity,
    }}
  >
    {children}
  </div>
);

export const AutoAssignRestore: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const g = l.grid;
  const fadeIn = (at: number) => progress(frame, at, FADE);

  const activeB = fadeIn(T.tabB) * (1 - fadeIn(T.tabA));
  const switchOn = fadeIn(T.switchOn) * (1 - progress(frame, T.switchOff, 10));
  const replayOn = fadeIn(T.replay) * (1 - fadeIn(T.replayStop - 2));
  const replayStop = fadeIn(T.replayStop) * (1 - fadeIn(T.replayStopEnd));
  const hold = fadeIn(T.hold) * (1 - fadeIn(T.holdEnd));
  const backupA = progress(frame, T.backupA, 10) * (1 - progress(frame, T.dropA, 10));
  const backupB = progress(frame, T.backupB, 10) * (1 - progress(frame, T.dropB, 10));
  const final = progress(frame, T.final, 10);
  const thumb = progress(frame, T.thumb, 10);

  const cellX = (col: number) => g.x + col * (g.cell + g.gap);
  const labelOffset = (g.cell - l.text.label * 1.2) / 2;
  const miniH = l.mini.dot * 2 + l.mini.gap;
  const keyOffset = (miniH - l.text.label * 1.2) / 2;
  const thumbOffset = (l.thumb.dot * 2 + l.thumb.gap - l.text.label * 1.2) / 2;
  // 백업이 없을 때(시작과 끝) 상자가 비었음을 이름표로 보인다.
  const empty = Math.max(1 - progress(frame, T.backupA, 6), progress(frame, T.dropA + 10, FADE));
  const backupRows = [
    { key: "A", checks: A_ORIGINAL, opacity: backupA },
    { key: "B", checks: B_ORIGINAL, opacity: backupB },
  ] as const;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <CollectionTab x={l.tabs.xA} y={l.tabs.y} w={l.tabs.w} h={l.tabs.h} active={1 - activeB} size={l.text.label}>
        컬렉션 A
      </CollectionTab>
      <CollectionTab x={l.tabs.xB} y={l.tabs.y} w={l.tabs.w} h={l.tabs.h} active={activeB} size={l.text.label}>
        컬렉션 B
      </CollectionTab>

      <Toggle x={l.toggle.x} y={l.toggle.y} w={l.toggle.w} h={l.toggle.h} on={switchOn} />
      <Label x={l.toggle.labelX} y={l.toggle.labelY} size={l.text.label} weight={720} color={COLOR.accent} opacity={switchOn}>
        자동 배정 켬
      </Label>
      <Label x={l.toggle.labelX} y={l.toggle.labelY} size={l.text.label} weight={720} color={COLOR.muted} opacity={1 - switchOn}>
        자동 배정 끔
      </Label>

      {/* 트랙 머리와 소스 이름. */}
      <Label x={g.labelX} y={g.headerY} size={l.text.small} color={COLOR.muted}>
        트랙
      </Label>
      {TRACKS.map((track, col) => (
        <Label key={track} x={cellX(col) + g.cell / 2} y={g.headerY} size={l.text.small} color={COLOR.muted} weight={720} anchor="center">
          {String(track)}
        </Label>
      ))}
      {SOURCES.map((source, row) => (
        <Label key={source} x={g.labelX} y={g.rowY[row] + labelOffset} size={l.text.label} weight={720}>
          {source}
        </Label>
      ))}

      {/* 체크 격자: 지금 탭의 컬렉션. */}
      {SOURCES.map((source, row) =>
        TRACKS.map((track, col) => (
          <Cell key={`${source}-${track}`} x={cellX(col)} y={g.rowY[row]} size={g.cell} look={cellLook(frame, row, col)} />
        )),
      )}

      {/* 리플레이 버퍼와 되돌리기 보류. */}
      <Tag x={l.status.replayX} y={l.status.y} tone="muted" size={l.text.label} opacity={replayOn}>
        리플레이 버퍼 중
      </Tag>
      <Tag x={l.status.replayX} y={l.status.y} tone="ink" size={l.text.label} opacity={replayStop}>
        리플레이 버퍼 정지
      </Tag>
      <DashedTag x={l.status.holdX} y={l.status.y} size={l.text.label} opacity={hold}>
        되돌리기 보류
      </DashedTag>

      {/* 끝: 컬렉션마다 자기 원래 체크. B 는 축소판으로 함께 보인다. */}
      <Tag x={l.status.replayX} y={l.status.y} tone="accent" size={l.text.label} opacity={final}>
        각자 원래 체크로
      </Tag>
      <Label x={l.thumb.labelX} y={l.thumb.y + thumbOffset} size={l.text.label} weight={720} opacity={thumb}>
        컬렉션 B
      </Label>
      <MiniChecks x={l.thumb.x} y={l.thumb.y} dot={l.thumb.dot} gap={l.thumb.gap} checks={B_ORIGINAL} opacity={thumb} />

      {/* 원래 체크 백업: 컬렉션별 줄. */}
      <div
        style={{
          position: "absolute",
          left: l.backup.x,
          top: l.backup.y,
          width: l.backup.w,
          height: l.backup.h,
          borderRadius: 20,
          boxSizing: "border-box",
          border: `4px solid ${COLOR.line}`,
          background: COLOR.surface,
        }}
      />
      <Label x={l.backup.keyX} y={l.backup.titleY} size={l.text.small} color={COLOR.muted} weight={720}>
        원래 체크 백업
      </Label>
      <Label
        x={l.backup.x + l.backup.w / 2}
        y={(l.backup.rowY[0] + l.backup.rowY[1] + miniH - l.text.small * 1.2) / 2}
        size={l.text.small}
        color={COLOR.muted}
        anchor="center"
        opacity={empty}
      >
        비어 있음
      </Label>
      {backupRows.map((row, i) => (
        <div key={row.key}>
          <Label x={l.backup.keyX} y={l.backup.rowY[i] + keyOffset} size={l.text.label} weight={760} opacity={row.opacity}>
            {row.key}
          </Label>
          <MiniChecks x={l.backup.miniX} y={l.backup.rowY[i]} dot={l.mini.dot} gap={l.mini.gap} checks={row.checks} opacity={row.opacity} />
        </div>
      ))}
    </AbsoluteFill>
  );
};
