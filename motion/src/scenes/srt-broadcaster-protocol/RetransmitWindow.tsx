// 콘티: _workspace/blog/srt-broadcaster-protocol/storyboard.md 「영상 1」
// SRT 받는 쪽 버퍼의 칸 1–6. 받는 쪽은 패킷을 「보낸 시각 + latency」(= 내보낼 시각)에 앱으로 내보낸다.
//   위 줄 — 잃은 3번의 재전송이 내보낼 시각 전에 와서 칸을 메우고, 1–6 이 모두 순서대로 나간다.
//   아래 줄 — 재전송이 그 시각까지 안 와서 3번을 건너뛰고(TLPKTDROP) 4번부터 내보낸다. 뒤늦게 온 3은 버린다.
// 근거: Haivision/srt API 소켓 옵션 SRTO_RCVLATENCY · SRTO_TLPKTDROP, draft-sharabayko-srt NAK.
// 시간축 눈금 · ms 수치 없음. 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(RetransmitWindowMobile) — 같은 움직임을 큰 칸 · 짧은 이름표로 그린다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { HopLine, pointAt, type Point } from "../../components/Hops";
import { Label, Playhead, SegmentCell, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const RETRANSMIT_WINDOW_FRAMES = 330;

const CELLS = [1, 2, 3, 4, 5, 6] as const;
/** 잃은 패킷 번호(칸 번호). */
const LOST = 3;
const LOST_INDEX = LOST - 1;
const FADE = 10;
const INTRO = 15;
/** NAK 이 3번 칸에서 송신 쪽으로 그려지는 구간. */
const NAK = { start: 20, duration: 30 } as const;
/** 재전송 패킷이 송신 쪽을 떠나는 프레임. */
const RESEND_START = 56;
/** 「내보낼 시각」 세로선이 칸 1 왼쪽에서 칸 6 오른쪽까지 가는 프레임. 끝 상태는 250 부터 유지. */
const SWEEP = { start: 70, end: 250 } as const;
/** 내보낸 칸: 옅어지는 정도와 아래로 빠지는 거리(px). 메운 3번은 강조색이 남도록 덜 옅게. */
const RELEASED = { opacity: 0.35, filledOpacity: 0.6, drop: 14 } as const;

type Copy = {
  readonly packet: string;
  readonly late: string;
  readonly filled: string;
  readonly skipped: string;
  /** 줄 이름(위 줄 · 아래 줄). 휴대폰판은 세로선 시작점 왼쪽에 들어가게 짧게 쓴다. */
  readonly names: readonly [string, string];
};

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly left: number;
  readonly sender: { readonly x: number; readonly width: number };
  readonly cells: { readonly left: number; readonly width: number; readonly gap: number; readonly height: number };
  /** 줄마다 칸 윗변 y. */
  readonly rowTops: readonly [number, number];
  /** 칸 윗변에서 위로 줄 이름 · NAK 이름표 · NAK 길까지의 거리. */
  readonly above: { readonly name: number; readonly nak: number; readonly lane: number };
  readonly tagGap: number;
  readonly line: { readonly labelY: number; readonly top: number; readonly bottomPad: number; readonly overshoot: number };
  /** 「내보낼 시각」 이름표 가운데가 머무를 가로 범위(화면 밖으로 나가지 않게). */
  readonly lineLabelX: readonly [number, number];
  readonly text: { readonly title: number; readonly name: number; readonly tag: number; readonly cell: number };
  readonly copy: Copy;
};

const DESKTOP: Layout = {
  title: [{ y: 52, text: "재전송이 내보낼 시각 전에 오는가" }],
  left: 120,
  sender: { x: 120, width: 200 },
  cells: { left: 560, width: 150, gap: 20, height: 120 },
  rowTops: [410, 800],
  above: { name: 190, nak: 138, lane: 60 },
  tagGap: 30,
  line: { labelY: 136, top: 192, bottomPad: 14, overshoot: 24 },
  lineLabelX: [240, 1680],
  text: { title: TEXT.title, name: TEXT.label, tag: TEXT.small, cell: TEXT.label },
  copy: { packet: "3 재전송", late: "3 늦음 · 버림", filled: "메움", skipped: "건너뜀 (TLPKTDROP)", names: ["재전송이 제때 옴", "재전송이 늦음"] },
};

const MOBILE: Layout = {
  title: [{ y: 64, text: "재전송이 내보낼 시각 전에 오는가" }],
  left: 60,
  sender: { x: 60, width: 150 },
  cells: { left: 240, width: 118, gap: 12, height: 140 },
  rowTops: [520, 1010],
  above: { name: 235, nak: 165, lane: 70 },
  tagGap: 30,
  line: { labelY: 156, top: 225, bottomPad: 14, overshoot: 22 },
  lineLabelX: [200, 880],
  text: { title: MOBILE_TEXT.title, name: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, cell: MOBILE_TEXT.label },
  copy: { packet: "3", late: "3 늦음 · 버림", filled: "메움", skipped: "건너뜀", names: ["제때 옴", "늦음"] },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Scenario = { readonly name: string; readonly onTime: boolean; readonly resendFrames: number };

/** 위 줄은 세로선이 3번에 닿기(≈145) 전인 100 에 도착, 아래 줄은 지난 뒤인 206 에 도착. */
const SCENARIOS: readonly [Scenario, Scenario] = [
  { name: "재전송이 제때 옴", onTime: true, resendFrames: 44 },
  { name: "재전송이 늦음", onTime: false, resendFrames: 150 },
];

const cellX = (l: Layout, i: number): number => l.cells.left + i * (l.cells.width + l.cells.gap);
const cellCenter = (l: Layout, i: number): number => cellX(l, i) + l.cells.width / 2;
const lineStartX = (l: Layout): number => l.cells.left - l.line.overshoot;
const lineEndX = (l: Layout): number => cellX(l, CELLS.length - 1) + l.cells.width + l.line.overshoot;

/** 세로선의 지금 x. */
const lineX = (l: Layout, frame: number): number =>
  interpolate(progress(frame, SWEEP.start, SWEEP.end - SWEEP.start, (t) => t), [0, 1], [lineStartX(l), lineEndX(l)]);

/** 세로선이 칸 i 의 가운데를 지나는 프레임. */
const releaseFrame = (l: Layout, i: number): number =>
  SWEEP.start + ((cellCenter(l, i) - lineStartX(l)) / (lineEndX(l) - lineStartX(l))) * (SWEEP.end - SWEEP.start);

/** NAK 길: 3번 칸 윗변 → 길 → 송신 상자 윗변. 재전송은 이 길을 거꾸로 탄다. */
const nakPath = (l: Layout, top: number): Point[] => {
  const lane = top - l.above.lane;
  const lostX = cellCenter(l, LOST_INDEX);
  const senderX = l.sender.x + l.sender.width / 2;
  return [
    [lostX, top],
    [lostX, lane],
    [senderX, lane],
    [senderX, top],
  ];
};

type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

const centered = (box: Box) =>
  ({
    position: "absolute",
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    boxSizing: "border-box",
    display: "grid",
    placeItems: "center",
    fontFamily: FONT,
  }) as const;

type RowProps = { readonly l: Layout; readonly s: Scenario; readonly top: number; readonly frame: number };

type CellProps = RowProps & {
  readonly i: number;
  /** 위 줄에서 재전송이 칸을 메운 정도(0→1). */
  readonly filled: number;
  /** 아래 줄에서 3번을 건너뛴 정도(0→1). */
  readonly skipped: number;
};

const Cell: React.FC<CellProps> = ({ l, s, i, top, frame, filled, skipped }) => {
  const intro = progress(frame, 0, INTRO);
  const lost = i === LOST_INDEX;
  // 건너뛴 3번은 내보내지 않으므로 옅어지지 않고 구멍으로 남는다.
  const released = lost && !s.onTime ? 0 : progress(frame, releaseFrame(l, i), FADE);
  const fadedTo = lost ? RELEASED.filledOpacity : RELEASED.opacity;
  const opacity = interpolate(released, [0, 1], [1, fadedTo]);
  const box = { x: cellX(l, i), y: top + released * RELEASED.drop, width: l.cells.width, height: l.cells.height };

  if (!lost) {
    return <SegmentCell {...box} size={l.text.cell} state="live" label={String(i + 1)} opacity={opacity * intro} />;
  }
  return (
    <>
      {/* 빈 칸(✕). 위 줄은 재전송이 메우면 사라진다. */}
      <SegmentCell {...box} size={l.text.cell} state={skipped > 0.5 ? "error" : "gone"} opacity={intro * (1 - filled)} />
      <div style={{ ...centered(box), color: COLOR.danger, fontSize: l.text.cell, fontWeight: 800, opacity: intro * (1 - filled) }}>
        ✕
      </div>
      {s.onTime ? (
        <div
          style={{
            ...centered(box),
            borderRadius: 14,
            background: COLOR.accentSoft,
            border: `4px solid ${COLOR.accent}`,
            color: COLOR.ink,
            fontSize: l.text.cell,
            fontWeight: 650,
            opacity: filled * opacity,
            transform: `scale(${interpolate(filled, [0, 1], [0.8, 1])})`,
          }}
        >
          {LOST}
        </div>
      ) : null}
    </>
  );
};

/** 3번 칸 아래 결과 이름표: 위 줄 「메움」, 아래 줄 「건너뜀 (TLPKTDROP)」. */
const Outcome: React.FC<{ readonly l: Layout; readonly s: Scenario; readonly top: number; readonly shown: number }> = ({
  l, s, top, shown,
}) => (
  <Tag
    x={cellCenter(l, LOST_INDEX)}
    y={top + l.cells.height + l.tagGap}
    tone={s.onTime ? "accent" : "danger"}
    size={l.text.tag}
    anchor="center"
    opacity={shown}
    scale={interpolate(shown, [0, 1], [0.85, 1])}
  >
    {s.onTime ? l.copy.filled : l.copy.skipped}
  </Tag>
);

const BufferRow: React.FC<RowProps> = ({ l, s, top, frame }) => {
  const intro = progress(frame, 0, INTRO);
  const path = nakPath(l, top);
  // 재전송 경로: 송신 상자 위 → 길 → 제때면 3번 칸 가운데까지, 늦으면 3번 칸 위 길에서 멈춤.
  const into: Point[] = s.onTime ? [[cellCenter(l, LOST_INDEX), top + l.cells.height / 2]] : [];
  const back: Point[] = [path[3], path[2], path[1], ...into];
  const arrive = RESEND_START + s.resendFrames;
  const [px, py] = pointAt(back, progress(frame, RESEND_START, s.resendFrames, EASE_IN_OUT));
  const arrived = progress(frame, arrive, FADE);
  const skipped = s.onTime ? 0 : progress(frame, releaseFrame(l, LOST_INDEX), FADE);
  const late = !s.onTime && frame >= arrive;

  return (
    <>
      <Label x={l.left} y={top - l.above.name} size={l.text.name} weight={720} opacity={intro}>
        {l.copy.names[SCENARIOS.indexOf(s)]}
      </Label>
      <Node x={l.sender.x} y={top} width={l.sender.width} height={l.cells.height} size={l.text.name} opacity={intro}>
        <div style={{ textAlign: "center" }}>송신</div>
      </Node>

      <HopLine hop={{ points: path, start: NAK.start, duration: NAK.duration, dashed: true }} frame={frame} radius={10} />
      <Label
        x={l.sender.x + l.sender.width + 24}
        y={top - l.above.nak}
        size={l.text.tag}
        weight={700}
        opacity={progress(frame, NAK.start + 10, FADE)}
      >
        NAK 3
      </Label>

      {CELLS.map((n, i) => (
        <Cell key={n} l={l} s={s} i={i} top={top} frame={frame} filled={s.onTime ? arrived : 0} skipped={skipped} />
      ))}
      <Outcome l={l} s={s} top={top} shown={s.onTime ? arrived : skipped} />

      {/* 재전송 패킷. 늦은 줄은 도착하면 muted 「늦음 · 버림」 으로 바뀌어 길 위에 남는다. */}
      <Tag
        x={px}
        y={py - l.text.tag * 0.6 - 8}
        tone={late ? "muted" : "ink"}
        size={l.text.tag}
        anchor="center"
        opacity={progress(frame, RESEND_START, 8) * (s.onTime ? 1 - arrived : 1)}
        scale={late ? interpolate(arrived, [0, 0.5, 1], [1, 1.08, 1]) : 1}
      >
        {late ? l.copy.late : l.copy.packet}
      </Tag>
    </>
  );
};

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const RetransmitWindow: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, INTRO);
  const x = lineX(l, frame);
  const bottom = l.rowTops[1] + l.cells.height + l.line.bottomPad;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.left} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <Label
        x={Math.min(Math.max(x, l.lineLabelX[0]), l.lineLabelX[1])}
        y={l.line.labelY}
        size={l.text.tag}
        weight={720}
        anchor="center"
        opacity={intro}
      >
        내보낼 시각
      </Label>

      {SCENARIOS.map((s, r) => (
        <BufferRow key={s.name} l={l} s={s} top={l.rowTops[r]} frame={frame} />
      ))}

      {/* 세로선은 칸 위로 지난다. */}
      <Playhead x={x} top={l.line.top} height={bottom - l.line.top} color={COLOR.ink} opacity={intro} />
    </AbsoluteFill>
  );
};
