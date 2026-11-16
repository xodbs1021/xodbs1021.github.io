// 콘티: _workspace/blog/pokeclip-rewind-cache-deadlock/storyboard.md 「LedgerReload」
// 장부(DB) 줄: 상자 a 의 0.3초 영상만 조각이 7125 에 먼저 들어가고, 상자 b 의 진짜 4초 조각은 번호 충돌로 버려진다.
// 고치기 전 캐시 뷰: 7126 · 7127 push 가 「다음 번호」 가 아니라 버려지고 목록 끝이 7124 에 멈춘다(WARN 한 줄).
// 고친 뒤 캐시 뷰: 빈 번호 뒤 push 가 장부 적재를 요구해 7125(업로드 실패) · 7126 · 7127 을 싣고, 7125 에 GAP 을 세워 이어 간다.
// 번호는 2026-11-16 사건 기록의 번호이고, 시간 간격은 설명용이다.
// layout="mobile" 은 1080×1350 휴대폰판(LedgerReloadMobile) — 7124–7127 네 칸, 글자 48px 이상.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, SegmentCell, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const LEDGER_RELOAD_FRAMES = 360;

const T = {
  intro: 0,
  aDrop: 30,
  bMove: 55,
  bReject: 72,
  ledger6: 90,
  ledger7: 115,
  push6: 100,
  push7: 128,
  reload: 160,
  gap: 220,
  endMove: 234,
  verdict: 250,
} as const;

type Row = {
  readonly titleY: number;
  readonly subtitleY: number;
  readonly cellY: number;
  readonly tag1Y: number;
  readonly tag2Y: number;
};

type Layout = {
  readonly seqs: readonly number[];
  readonly x0: number;
  readonly step: number;
  readonly cellW: number;
  readonly cellH: number;
  readonly titleX: number;
  readonly title: number;
  readonly text: number;
  readonly ledger: Row;
  readonly before: Row;
  readonly after: Row;
  readonly bFromX: number;
  readonly words: {
    readonly ledger: string;
    readonly ledgerSub: string;
    readonly before: string;
    readonly after: string;
    readonly viewSub: string;
    readonly aTag: string;
    readonly bTag: string;
    readonly drop: string;
    readonly stuck: string;
    readonly reload: string;
    readonly done: string;
  };
  readonly tagX: number;
};

const DESKTOP: Layout = {
  seqs: [7123, 7124, 7125, 7126, 7127],
  x0: 600,
  step: 224,
  cellW: 200,
  cellH: 110,
  titleX: 120,
  title: TEXT.label,
  text: TEXT.small,
  ledger: { titleY: 52, subtitleY: 106, cellY: 40, tag1Y: 172, tag2Y: 238 },
  before: { titleY: 352, subtitleY: 406, cellY: 340, tag1Y: 472, tag2Y: 538 },
  after: { titleY: 664, subtitleY: 718, cellY: 652, tag1Y: 818, tag2Y: 884 },
  bFromX: 1720,
  words: {
    ledger: "장부(DB)",
    ledgerSub: "두 상자가 같이 씀",
    before: "고치기 전",
    after: "고친 뒤",
    viewSub: "송출 상자 b 의 캐시 뷰",
    aTag: "a · 0.3초 · 소리 없음 → 7125",
    bTag: "b 의 4초 조각 · 번호 충돌로 버려짐",
    drop: "push 7126 · 7127 → 다음 번호 아님 → 버림",
    stuck: "목록 끝 7124 에서 멈춤 · WARN 한 줄",
    reload: "빈 번호 뒤 push → 장부에서 다시 싣기",
    done: "7125 에 GAP · 목록 이어짐",
  },
  tagX: 600,
};

const MOBILE: Layout = {
  seqs: [7124, 7125, 7126, 7127],
  x0: 90,
  step: 230,
  cellW: 210,
  cellH: 110,
  titleX: 90,
  title: MOBILE_TEXT.title,
  text: MOBILE_TEXT.small,
  ledger: { titleY: 36, subtitleY: 36, cellY: 116, tag1Y: 246, tag2Y: 322 },
  before: { titleY: 432, subtitleY: 432, cellY: 512, tag1Y: 642, tag2Y: 718 },
  after: { titleY: 836, subtitleY: 836, cellY: 916, tag1Y: 1082, tag2Y: 1158 },
  bFromX: 1080,
  words: {
    ledger: "장부(DB)",
    ledgerSub: "",
    before: "고치기 전 · 캐시 뷰",
    after: "고친 뒤 · 캐시 뷰",
    viewSub: "",
    aTag: "a · 0.3초 · 소리 없음",
    bTag: "b 의 4초 · 버려짐",
    drop: "push → 다음 번호 아님 → 버림",
    stuck: "7124 에서 멈춤 · WARN 한 줄",
    reload: "빈 번호 뒤 push → 다시 싣기",
    done: "7125 에 GAP · 이어짐",
  },
  tagX: 90,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const cellX = (l: Layout, seq: number): number => l.x0 + (seq - l.seqs[0]) * l.step;
const centerX = (l: Layout, seq: number): number => cellX(l, seq) + l.cellW / 2;

/** 목록 끝 막대 — 마지막으로 목록에 들어간 칸 바로 뒤. */
const EndBar: React.FC<{ readonly x: number; readonly y: number; readonly h: number; readonly opacity: number }> = ({ x, y, h, opacity }) => (
  <div style={{ position: "absolute", left: x - 5, top: y - 14, width: 10, height: h + 28, borderRadius: 5, background: COLOR.accent, opacity }} />
);

/** 인덱서가 캐시에 넘기는 INSERT 알림(push). */
const Packet: React.FC<{ readonly x: number; readonly y: number; readonly label: string; readonly size: number; readonly opacity: number }> = ({
  x, y, label, size, opacity,
}) => (
  <div
    style={{
      position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", padding: "4px 18px", borderRadius: 999,
      background: COLOR.white, border: `4px solid ${COLOR.ink}`, color: COLOR.ink, fontFamily: FONT, fontSize: size, fontWeight: 700,
      whiteSpace: "nowrap", opacity,
    }}
  >
    {label}
  </div>
);

const Cross: React.FC<{ readonly x: number; readonly y: number; readonly size: number; readonly opacity: number }> = ({ x, y, size, opacity }) => (
  <div
    style={{
      position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", fontFamily: FONT, fontSize: size, fontWeight: 800,
      color: COLOR.danger, opacity,
    }}
  >
    ✕
  </div>
);

const RowTitle: React.FC<{ readonly l: Layout; readonly row: Row; readonly title: string; readonly sub: string; readonly color: string; readonly opacity: number }> = ({
  l, row, title, sub, color, opacity,
}) => (
  <>
    <Label x={l.titleX} y={row.titleY} size={l.title} weight={780} color={color} opacity={opacity}>
      {title}
    </Label>
    {sub ? (
      <Label x={l.titleX} y={row.subtitleY} size={l.text} color={COLOR.muted} opacity={opacity}>
        {sub}
      </Label>
    ) : null}
  </>
);

/** 캐시 줄 바로 위(from 칸 위)에서 그 줄의 7125 자리로 내려오는 push 한 개의 위치(0→1). */
const pushPos = (l: Layout, row: Row, from: number, t: number): { x: number; y: number } => {
  const x0 = centerX(l, from);
  const y0 = row.cellY - 40;
  const x1 = centerX(l, 7125);
  const y1 = row.cellY + l.cellH / 2;
  return { x: interpolate(t, [0, 1], [x0, x1]), y: interpolate(t, [0, 1], [y0, y1]) };
};

export const LedgerReload: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, T.intro, 14);

  // 장부 줄
  const aIn = progress(frame, T.aDrop, 14);
  const bMove = progress(frame, T.bMove, 16, EASE_IN_OUT);
  const bFade = 1 - progress(frame, T.bReject + 8, 14);
  const bX = interpolate(bMove, [0, 1], [l.bFromX, cellX(l, 7125)]);
  const bCross = progress(frame, T.bReject, 6) * bFade;
  const in6 = progress(frame, T.ledger6, 12);
  const in7 = progress(frame, T.ledger7, 12);

  // push 두 개(고치기 전 줄) · 하나(고친 뒤 줄)
  const p6 = progress(frame, T.push6, 18, EASE_IN_OUT);
  const p7 = progress(frame, T.push7, 18, EASE_IN_OUT);
  const p6Fade = 1 - progress(frame, T.push6 + 24, 10);
  const p7Fade = 1 - progress(frame, T.push7 + 24, 10);
  const p6Show = progress(frame, T.push6, 4) * p6Fade;
  const p7Show = progress(frame, T.push7, 4) * p7Fade;
  const cross6 = progress(frame, T.push6 + 18, 4) * p6Fade;
  const cross7 = progress(frame, T.push7 + 18, 4) * p7Fade;
  const p6After = progress(frame, T.push6, 4) * (1 - progress(frame, T.push6 + 22, 8));

  // 고친 뒤 줄: 적재
  const load = [7125, 7126, 7127].map((_, i) => progress(frame, T.reload + i * 10, 18, EASE_IN_OUT));
  const gapIn = progress(frame, T.gap, 12);
  const endMove = progress(frame, T.endMove, 22, EASE_IN_OUT);
  const endX = (row: Row, last: number) => ({ x: cellX(l, last) + l.cellW + (l.step - l.cellW) / 2, y: row.cellY });
  const afterEnd = interpolate(endMove, [0, 1], [endX(l.after, 7124).x, endX(l.after, 7127).x]);

  const baseCells = (row: Row) =>
    l.seqs
      .filter((s) => s <= 7124)
      .map((s) => (
        <SegmentCell key={`${row.cellY}-${s}`} x={cellX(l, s)} y={row.cellY} width={l.cellW} height={l.cellH} state="live" label={String(s)} size={l.text} opacity={intro} />
      ));

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {/* 장부(DB) */}
      <RowTitle l={l} row={l.ledger} title={l.words.ledger} sub={l.words.ledgerSub} color={COLOR.ink} opacity={intro} />
      {baseCells(l.ledger)}
      <SegmentCell x={cellX(l, 7125)} y={l.ledger.cellY} width={l.cellW} height={l.cellH} state="error" label="7125" size={l.text} opacity={aIn} />
      <SegmentCell x={cellX(l, 7126)} y={l.ledger.cellY} width={l.cellW} height={l.cellH} state="live" label="7126" size={l.text} opacity={in6} />
      <SegmentCell x={cellX(l, 7127)} y={l.ledger.cellY} width={l.cellW} height={l.cellH} state="live" label="7127" size={l.text} opacity={in7} />
      <Tag x={l.tagX} y={l.ledger.tag1Y} size={l.text} tone="danger" opacity={aIn}>
        {l.words.aTag}
      </Tag>
      {/* 상자 b 의 진짜 4초 조각: 7125 로 오다 충돌해 버려짐 */}
      <SegmentCell x={bX} y={l.ledger.cellY} width={l.cellW} height={l.cellH} state="gone" label="b 4초" size={l.text} opacity={progress(frame, T.bMove, 6) * bFade} />
      <Cross x={centerX(l, 7125)} y={l.ledger.cellY + l.cellH / 2} size={l.title * 2} opacity={bCross} />
      <Tag x={l.tagX} y={l.ledger.tag2Y} size={l.text} tone="muted" opacity={progress(frame, T.bReject, 10)}>
        {l.words.bTag}
      </Tag>

      {/* 고치기 전 */}
      <RowTitle l={l} row={l.before} title={l.words.before} sub={l.words.viewSub} color={COLOR.danger} opacity={intro} />
      {baseCells(l.before)}
      <EndBar x={endX(l.before, 7124).x} y={l.before.cellY} h={l.cellH} opacity={intro} />
      <Packet {...pushPos(l, l.before, 7126, p6)} label="7126" size={l.text} opacity={p6Show} />
      <Packet {...pushPos(l, l.before, 7127, p7)} label="7127" size={l.text} opacity={p7Show} />
      <Cross x={centerX(l, 7125)} y={l.before.cellY + l.cellH / 2} size={l.title * 1.6} opacity={Math.max(cross6, cross7)} />
      <Tag x={l.tagX} y={l.before.tag1Y} size={l.text} tone="muted" opacity={progress(frame, T.push6 + 18, 10)}>
        {l.words.drop}
      </Tag>
      <Tag x={l.tagX} y={l.before.tag2Y} size={l.text} tone="danger" opacity={progress(frame, T.verdict, 12)}>
        {l.words.stuck}
      </Tag>

      {/* 고친 뒤 */}
      <RowTitle l={l} row={l.after} title={l.words.after} sub={l.words.viewSub} color={COLOR.accent} opacity={intro} />
      {baseCells(l.after)}
      {[7125, 7126, 7127].map((seq, i) => (
        <SegmentCell
          key={`load-${seq}`}
          x={cellX(l, seq)}
          y={interpolate(load[i], [0, 1], [l.after.cellY - 90, l.after.cellY])}
          width={l.cellW}
          height={l.cellH}
          state={seq === 7125 ? "error" : "live"}
          label={String(seq)}
          size={l.text}
          opacity={progress(frame, T.reload + i * 10, 6)}
        />
      ))}
      <Tag x={centerX(l, 7125)} y={l.after.cellY + l.cellH - 30} size={l.text} tone="accent" anchor="center" opacity={gapIn}>
        GAP
      </Tag>
      <EndBar x={afterEnd} y={l.after.cellY} h={l.cellH} opacity={intro} />
      <Packet {...pushPos(l, l.after, 7126, p6)} label="7126" size={l.text} opacity={p6After} />
      <Tag x={l.tagX} y={l.after.tag1Y} size={l.text} tone="accent" opacity={progress(frame, T.push6 + 20, 10)}>
        {l.words.reload}
      </Tag>
      <Tag x={l.tagX} y={l.after.tag2Y} size={l.text} tone="accent" opacity={progress(frame, T.verdict, 12)}>
        {l.words.done}
      </Tag>
    </AbsoluteFill>
  );
};
