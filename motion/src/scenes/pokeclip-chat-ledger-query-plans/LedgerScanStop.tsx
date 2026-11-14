// 콘티: _workspace/blog/pokeclip-chat-ledger-query-plans/storyboard.md 「LedgerScanStop」
// 위 줄: EXISTS 꼴 역행 검사가 표 전체(세 방송, 907,200행)를 왼쪽부터 끝까지 읽고 「맞는 행 없음」 에서 끝난다.
// 아래 줄: ORDER BY … LIMIT 1 꼴은 그 방송의 판 NULL 색인 끝 한 칸만 읽고 멈춘다.
// 수치는 2026-11-14 재측정(옛 역행 검사 · 꼬리 시각 · 판 NULL 만 방송: 12,685 → 21 버퍼). 칸 수는 설명용이다.
// layout="mobile" 은 1080×1350 휴대폰판(LedgerScanStopMobile) — 같은 구성, 칸을 줄이고 글자는 48px 이상.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const LEDGER_SCAN_STOP_FRAMES = 270;

const T = { intro: 0, scan: 20, scanFrames: 120, stop: 20, stopFrames: 18, result: 146 } as const;
const GAP = 8;

type Row = {
  readonly titleY: number;
  readonly bandY: number;
  readonly cells: number;
  readonly groupLabelY: number;
  readonly resultY: number;
};
type Layout = {
  readonly x: number;
  readonly width: number;
  readonly cellH: number;
  readonly title: number;
  readonly text: number;
  readonly table: Row;
  /** 위 줄 칸 묶음(방송별 칸 수)과 이름. */
  readonly groups: readonly { readonly n: number; readonly name: string }[];
  readonly index: Row;
  readonly tableTitle: string;
  readonly indexTitle: string;
  readonly indexName: string;
  /** 아래 줄 결과 이름표를 띠 오른쪽에 둘지(데스크톱) 띠 아래에 둘지(휴대폰). */
  readonly resultBeside: boolean;
};

const DESKTOP: Layout = {
  x: 120,
  width: 1680,
  cellH: 120,
  title: TEXT.label,
  text: TEXT.small,
  table: { titleY: 96, bandY: 186, cells: 24, groupLabelY: 326, resultY: 400 },
  groups: [
    { n: 8, name: "판 2 방송" },
    { n: 8, name: "판 NULL 방송" },
    { n: 8, name: "롤백 방송" },
  ],
  index: { titleY: 590, bandY: 680, cells: 8, groupLabelY: 820, resultY: 700 },
  tableTitle: "EXISTS · 표 전체 907,200행",
  indexTitle: "ORDER BY … LIMIT 1 · 그 방송 색인",
  indexName: "판 NULL 방송 색인 · 파일명 시각 순",
  resultBeside: true,
};

const MOBILE: Layout = {
  x: 60,
  width: 960,
  cellH: 130,
  title: MOBILE_TEXT.title,
  text: MOBILE_TEXT.small,
  table: { titleY: 70, bandY: 170, cells: 16, groupLabelY: 320, resultY: 410 },
  groups: [
    { n: 5, name: "판 2" },
    { n: 5, name: "판 NULL" },
    { n: 6, name: "롤백" },
  ],
  index: { titleY: 720, bandY: 820, cells: 6, groupLabelY: 970, resultY: 1070 },
  tableTitle: "EXISTS · 표 전체",
  indexTitle: "LIMIT 1 · 그 방송 색인",
  indexName: "판 NULL 방송 색인",
  resultBeside: false,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

type CellLook = "idle" | "read" | "reading" | "hit";

const CELL_STYLE = {
  idle: { background: COLOR.white, border: `3px solid ${COLOR.line}` },
  read: { background: COLOR.surface, border: `3px solid ${COLOR.muted}` },
  reading: { background: COLOR.dangerSoft, border: `5px solid ${COLOR.danger}` },
  hit: { background: COLOR.accentSoft, border: `5px solid ${COLOR.accent}` },
} as const;

const Cell: React.FC<{ readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly look: CellLook; readonly opacity: number }> = ({
  x, y, w, h, look, opacity,
}) => (
  <div
    style={{
      position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 10, boxSizing: "border-box", opacity,
      ...CELL_STYLE[look],
    }}
  />
);

export const LedgerScanStop: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, T.intro, 14);
  const cellW = (l.width - (l.table.cells - 1) * GAP) / l.table.cells;
  const cellX = (i: number) => l.x + i * (cellW + GAP);

  // 위 줄: 왼쪽부터 한 칸씩 읽는다. 끝까지 읽으면 「맞는 행 없음」.
  const scanned = Math.floor(progress(frame, T.scan, T.scanFrames, (t) => t) * l.table.cells);
  const tableDone = frame >= T.scan + T.scanFrames;
  const tableLook = (i: number): CellLook =>
    i < scanned || tableDone ? "read" : i === scanned && frame >= T.scan ? "reading" : "idle";

  // 아래 줄: 색인 끝(가장 늦은 파일명 시각) 한 칸만 읽고 멈춘다.
  const stop = progress(frame, T.stop, T.stopFrames);
  const last = l.index.cells - 1;
  const indexLook = (i: number): CellLook => (i === last && stop > 0.5 ? "hit" : "idle");

  let start = 0;
  const groupLabels = l.groups.map((g) => {
    const center = cellX(start) + (g.n * cellW + (g.n - 1) * GAP) / 2;
    start += g.n;
    return { center, name: g.name };
  });
  const indexEnd = cellX(last) + cellW;

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <Label x={l.x} y={l.table.titleY} size={l.title} weight={780} opacity={intro}>
        {l.tableTitle}
      </Label>
      {Array.from({ length: l.table.cells }, (_, i) => (
        <Cell key={`t${i}`} x={cellX(i)} y={l.table.bandY} w={cellW} h={l.cellH} look={tableLook(i)} opacity={intro} />
      ))}
      {groupLabels.map((g) => (
        <Label key={g.name} x={g.center} y={l.table.groupLabelY} size={l.text} color={COLOR.muted} anchor="center" opacity={intro}>
          {g.name}
        </Label>
      ))}
      <Tag x={l.x} y={l.table.resultY} size={l.text} tone="danger" opacity={progress(frame, T.result, 14)}>
        맞는 행 없음 · 12,685 버퍼
      </Tag>

      <Label x={l.x} y={l.index.titleY} size={l.title} weight={780} color={COLOR.accent} opacity={intro}>
        {l.indexTitle}
      </Label>
      {Array.from({ length: l.index.cells }, (_, i) => (
        <Cell key={`i${i}`} x={cellX(i)} y={l.index.bandY} w={cellW} h={l.cellH} look={indexLook(i)} opacity={intro} />
      ))}
      <Label x={l.x} y={l.index.groupLabelY} size={l.text} color={COLOR.muted} opacity={intro}>
        {l.indexName}
      </Label>
      <Tag
        x={l.resultBeside ? indexEnd + 48 : l.x}
        y={l.index.resultY}
        size={l.text}
        tone="accent"
        opacity={progress(frame, T.stop + T.stopFrames + 6, 14)}
      >
        끝 한 칸에서 멈춤 · 21 버퍼
      </Tag>
    </AbsoluteFill>
  );
};
