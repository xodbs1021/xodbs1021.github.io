// 콘티: _workspace/blog/pokeclip-chat-ledger-query-plans/storyboard.md 「LedgerScanStop」
// 위 줄: EXISTS 꼴 역행 검사가 표 전체(세 방송, 907,200행)를 끝까지 읽고 「맞는 행 없음」 에서 끝난다.
// 아래 줄: ORDER BY … LIMIT 1 꼴은 그 방송의 판 NULL 색인 끝 항목에서 멈춘다.
// 두 막대는 같은 선형 눈금이고 길이는 조회 전체가 읽은 버퍼 수에 비례한다(12,685 : 21, 약 604배).
// 수치는 2026-11-14 재측정 measure/raw/summary.csv 의 legacy_exists · legacy_rewrite | idx-legacy-only | tail(판 NULL 만 방송, 꼬리 시각).
// 아래 막대는 1–3px 이라, 앞 100 버퍼를 60배로 키운 확대 칸을 함께 둔다. 훑는 속도는 설명용(실제 28ms 대 0.06ms).
// layout="mobile" 은 1080×1350 휴대폰판(LedgerScanStopMobile) — 같은 구성, 글자는 48px 이상.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const LEDGER_SCAN_STOP_FRAMES = 270;

/** 조회 전체가 읽은 버퍼(shared hit + read). */
const BUFFERS = { exists: 12685, limit: 21 } as const;
/** 확대 칸이 보여 주는 앞부분(버퍼)과 배율. */
const ZOOM = { span: 100, factor: 60 } as const;

const T = { intro: 0, scan: 20, scanFrames: 120, result: 146, stop: 20, zoom: 30, zoomFill: 40, stopTag: 62 } as const;

type Layout = {
  readonly x: number;
  readonly width: number;
  readonly barH: number;
  readonly title: number;
  readonly text: number;
  readonly tableTitle: string;
  readonly indexTitle: string;
  readonly tableTitleY: number;
  readonly tableBarY: number;
  readonly tableTagY: number;
  readonly scaleNote: { readonly x: number; readonly y: number; readonly anchor: "left" | "right" };
  readonly indexTitleY: number;
  readonly indexBarY: number;
  readonly zoomY: number;
  readonly stopTag: { readonly x: number; readonly y: number };
  readonly zoomNote: { readonly x: number; readonly y: number };
  readonly stopText: string;
};

const DESKTOP_ZOOM_W = 1680 * (ZOOM.span / BUFFERS.exists) * ZOOM.factor;
const DESKTOP: Layout = {
  x: 120,
  width: 1680,
  barH: 110,
  title: TEXT.label,
  text: TEXT.small,
  tableTitle: "EXISTS · 표 전체(세 방송) 907,200행",
  indexTitle: "ORDER BY … LIMIT 1 · 그 방송 색인",
  tableTitleY: 80,
  tableBarY: 160,
  tableTagY: 300,
  scaleNote: { x: 1800, y: 308, anchor: "right" },
  indexTitleY: 460,
  indexBarY: 540,
  zoomY: 770,
  stopTag: { x: 120 + DESKTOP_ZOOM_W + 48, y: 772 },
  zoomNote: { x: 120 + DESKTOP_ZOOM_W + 48, y: 852 },
  stopText: "색인 끝 항목에서 멈춤 · 21 버퍼",
};

const MOBILE: Layout = {
  x: 60,
  width: 960,
  barH: 120,
  title: MOBILE_TEXT.title,
  text: MOBILE_TEXT.small,
  tableTitle: "EXISTS · 표 전체 907,200행",
  indexTitle: "LIMIT 1 · 그 방송 색인",
  tableTitleY: 70,
  tableBarY: 170,
  tableTagY: 320,
  scaleNote: { x: 60, y: 410, anchor: "left" },
  indexTitleY: 540,
  indexBarY: 640,
  zoomY: 900,
  stopTag: { x: 60, y: 1060 },
  zoomNote: { x: 60, y: 1160 },
  stopText: "색인 끝에서 멈춤 · 21 버퍼",
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const Track: React.FC<{ readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly opacity: number; readonly dashed?: boolean }> = ({
  x, y, w, h, opacity, dashed = false,
}) => (
  <div
    style={{
      position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box", opacity,
      background: COLOR.white, border: `3px ${dashed ? "dashed" : "solid"} ${COLOR.line}`,
    }}
  />
);

const Fill: React.FC<{ readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly color: string; readonly opacity: number }> = ({
  x, y, w, h, color, opacity,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, background: color, opacity }} />
);

export const LedgerScanStop: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, T.intro, 14);
  const perBuffer = l.width / BUFFERS.exists;

  // 위 줄: 왼쪽부터 끝까지 훑는다. 끝까지 읽으면 「맞는 행 없음」.
  const scan = progress(frame, T.scan, T.scanFrames, (t) => t);
  const scanning = scan > 0 && scan < 1;
  const tableW = scan * BUFFERS.exists * perBuffer;

  // 아래 줄: 같은 눈금으로 21 버퍼. 너무 짧아 확대 칸으로 다시 보여 준다.
  const stop = progress(frame, T.stop, 10);
  const indexW = BUFFERS.limit * perBuffer * stop;
  const zoomIn = progress(frame, T.zoom, 14);
  const zoomPer = perBuffer * ZOOM.factor;
  const zoomW = ZOOM.span * zoomPer;
  const zoomFill = BUFFERS.limit * zoomPer * progress(frame, T.zoomFill, 18);
  const spanEnd = l.x + ZOOM.span * perBuffer;
  const indexBottom = l.indexBarY + l.barH;

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <Label x={l.x} y={l.tableTitleY} size={l.title} weight={780} opacity={intro}>
        {l.tableTitle}
      </Label>
      <Track x={l.x} y={l.tableBarY} w={l.width} h={l.barH} opacity={intro} />
      <Fill x={l.x} y={l.tableBarY} w={tableW} h={l.barH} color={COLOR.muted} opacity={intro} />
      {scanning ? <Fill x={l.x + tableW - 8} y={l.tableBarY - 10} w={8} h={l.barH + 20} color={COLOR.danger} opacity={intro} /> : null}
      <Tag x={l.x} y={l.tableTagY} size={l.text} tone="danger" opacity={progress(frame, T.result, 14)}>
        맞는 행 없음 · 12,685 버퍼
      </Tag>
      <Label x={l.scaleNote.x} y={l.scaleNote.y} size={l.text} color={COLOR.muted} anchor={l.scaleNote.anchor} opacity={intro}>
        막대 길이 = 읽은 버퍼(같은 눈금)
      </Label>

      <Label x={l.x} y={l.indexTitleY} size={l.title} weight={780} color={COLOR.accent} opacity={intro}>
        {l.indexTitle}
      </Label>
      <Track x={l.x} y={l.indexBarY} w={l.width} h={l.barH} opacity={intro} />
      <Fill x={l.x} y={l.indexBarY} w={indexW} h={l.barH} color={COLOR.accent} opacity={intro} />

      {/* 확대 칸: 아래 막대의 앞 100 버퍼를 60배로. 안내선은 막대의 그 구간에서 확대 칸 양 끝으로 벌어진다. */}
      <svg style={{ position: "absolute", left: 0, top: 0 }} width="100%" height="100%">
        <polygon
          points={`${l.x},${indexBottom} ${spanEnd},${indexBottom} ${l.x + zoomW},${l.zoomY} ${l.x},${l.zoomY}`}
          fill={COLOR.accentSoft}
          stroke={COLOR.muted}
          strokeWidth={3}
          strokeDasharray="10 8"
          opacity={zoomIn * 0.9}
        />
      </svg>
      <Track x={l.x} y={l.zoomY} w={zoomW} h={l.barH} opacity={zoomIn} dashed />
      <Fill x={l.x} y={l.zoomY} w={zoomFill} h={l.barH} color={COLOR.accent} opacity={zoomIn} />
      <Tag x={l.stopTag.x} y={l.stopTag.y} size={l.text} tone="accent" opacity={progress(frame, T.stopTag, 14)}>
        {l.stopText}
      </Tag>
      <Label x={l.zoomNote.x} y={l.zoomNote.y} size={l.text} color={COLOR.muted} opacity={zoomIn}>
        {`${ZOOM.factor}배 확대 · 앞 ${ZOOM.span} 버퍼`}
      </Label>
    </AbsoluteFill>
  );
};
