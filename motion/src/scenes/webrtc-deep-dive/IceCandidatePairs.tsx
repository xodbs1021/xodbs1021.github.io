// 콘티: _workspace/blog/webrtc-deep-dive/storyboard.md 「영상 1」
// ICE(RFC 8445): 양쪽이 모은 후보 주소(host · srflx · relay)를 짝지어 연결 확인을 해 보고, 통한 쌍 하나를 골라 미디어를 보낸다.
//   1막 후보 모으기 — 피어 A · B 아래로 host · srflx · relay 칸이 차례로 생긴다(srflx · relay 는 STUN · TURN 상자에서 점선).
//   2막 연결 확인 — 같은 종류끼리 선 세 개가 그어지며 결과가 붙는다(host ✕ · srflx ✓ · relay ✓).
//   3막 고르기 — srflx 선이 굵어지고 패킷이 A→B 로 흐른다. relay 쌍은 회색 「예비」.
// 실제 ICE 는 모든 쌍을 우선순위대로 확인하지만 그림은 세 쌍만 보인다. 숫자 · IP 주소 없음. 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(IceCandidatePairsMobile) — 같은 움직임, 이름표를 줄인다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const ICE_CANDIDATE_PAIRS_FRAMES = 330;

const FADE = 12;
/** 시점(프레임). 상태가 바뀐 뒤 1초 이상 멈춘다. 끝 상태는 265 에 완성되어 330 까지 유지. */
const T = {
  intro: 0,
  host: 15,
  stunLine: 35,
  srflx: 50,
  turnLine: 70,
  relay: 85,
  helpersOut: 125,
  checks: [125, 160, 195] as const,
  pick: 245,
  pickTag: 250,
  note: 255,
  packets: 257,
} as const;
const HELPER_DRAW = 15;
const LINE_DRAW = 18;
const PACKETS = 3;
const PACKET_CYCLE = 45;
/** 패킷이 선 양 끝에서 칸 테두리에 겹치지 않게 비우는 길이(px). */
const PACKET_INSET = 30;

type Kind = "host" | "srflx" | "relay";
const KINDS: readonly Kind[] = ["host", "srflx", "relay"];
type Tone = "ink" | "accent" | "danger" | "muted";

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Layout = {
  readonly peers: readonly [Box, Box];
  readonly stun: Box;
  readonly turn: Box;
  /** 1막 점선이 서버 상자 아랫변에서 출발하는 x — [왼쪽 칸으로, 오른쪽 칸으로]. 피어 상자 · 후보 칸을 비켜 간다. */
  readonly helperFrom: { readonly srflx: readonly [number, number]; readonly relay: readonly [number, number] };
  /** 후보 칸 왼쪽 열 · 오른쪽 열의 x. */
  readonly cols: readonly [number, number];
  readonly cell: { readonly w: number; readonly h: number };
  readonly rowY: Record<Kind, number>;
  /** 칸 안 설명(종류 아래 줄). null 이면 종류만. */
  readonly cellText: Record<Kind, string | null>;
  readonly result: Record<Kind, string>;
  readonly backup: string;
  /** 결과 이름표 윗변이 선보다 위로 떨어진 거리. */
  readonly tagAbove: number;
  /** 「선택 · 미디어」 윗변이 srflx 선보다 아래로 떨어진 거리. */
  readonly pickTagBelow: number;
  readonly line: { readonly normal: number; readonly picked: number };
  readonly packet: number;
  readonly note: { readonly y: number; readonly text: string } | null;
  readonly text: {
    readonly peer: number;
    readonly server: number;
    readonly kind: number;
    readonly desc: number;
    readonly tag: number;
  };
};

const DESKTOP: Layout = {
  peers: [
    { x: 100, y: 110, w: 560, h: 100 },
    { x: 1260, y: 110, w: 560, h: 100 },
  ],
  stun: { x: 690, y: 120, w: 250, h: 80 },
  turn: { x: 980, y: 120, w: 250, h: 80 },
  helperFrom: { srflx: [765, 865], relay: [1055, 1155] },
  cols: [100, 1260],
  cell: { w: 560, h: 130 },
  rowY: { host: 290, srflx: 490, relay: 690 },
  cellText: { host: "(사설 주소)", srflx: "(STUN이 알려 준 공인 주소)", relay: "(TURN 서버 주소)" },
  result: { host: "✕ 서로 다른 망", srflx: "✓", relay: "✓" },
  backup: "✓ 예비",
  tagAbove: 92,
  pickTagBelow: 22,
  line: { normal: 6, picked: 16 },
  packet: 30,
  note: { y: 900, text: "이 예에서는 두 NAT 사이 srflx 쌍이 통함" },
  text: { peer: TEXT.label, server: TEXT.small, kind: TEXT.label, desc: TEXT.small, tag: TEXT.small },
};

const MOBILE: Layout = {
  peers: [
    { x: 40, y: 300, w: 360, h: 100 },
    { x: 680, y: 300, w: 360, h: 100 },
  ],
  stun: { x: 140, y: 120, w: 360, h: 100 },
  turn: { x: 580, y: 120, w: 360, h: 100 },
  helperFrom: { srflx: [450, 490], relay: [590, 630] },
  cols: [40, 680],
  cell: { w: 360, h: 120 },
  rowY: { host: 500, srflx: 760, relay: 1080 },
  cellText: { host: null, srflx: null, relay: null },
  result: { host: "✕", srflx: "✓", relay: "✓" },
  backup: "✓ 예비",
  tagAbove: 104,
  pickTagBelow: 75,
  line: { normal: 7, picked: 18 },
  packet: 32,
  note: null,
  text: {
    peer: MOBILE_TEXT.label,
    server: MOBILE_TEXT.small,
    kind: MOBILE_TEXT.label,
    desc: MOBILE_TEXT.small,
    tag: MOBILE_TEXT.small,
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const LINE_COLOR: Record<Kind, string> = { host: COLOR.danger, srflx: COLOR.accent, relay: COLOR.ink };
const RESULT_TONE: Record<Kind, Tone> = { host: "danger", srflx: "accent", relay: "ink" };
const CELL_AT: Record<Kind, number> = { host: T.host, srflx: T.srflx, relay: T.relay };

const fadeIn = (frame: number, at: number): number => progress(frame, at, FADE, EASE_IN_OUT);

const CellBody: React.FC<{ readonly kind: Kind; readonly l: Layout }> = ({ kind, l }) => {
  const desc = l.cellText[kind];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: l.text.kind, fontWeight: 780 }}>{kind}</div>
      {desc ? <div style={{ fontSize: l.text.desc, fontWeight: 600, marginTop: 2 }}>{desc}</div> : null}
    </div>
  );
};

type PairLineProps = {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly draw: number;
  readonly color: string;
  readonly width: number;
  readonly opacity?: number;
};

/** 쌍 선(가로) — 왼쪽 칸 안쪽 가장자리에서 오른쪽 칸 안쪽 가장자리로 그어진다. */
const PairLine: React.FC<PairLineProps> = ({ x1, x2, y, draw, color, width, opacity = 1 }) =>
  draw <= 0 ? null : (
    <svg style={{ position: "absolute", inset: 0, opacity }} width="100%" height="100%">
      <line x1={x1} y1={y} x2={x1 + (x2 - x1) * draw} y2={y} stroke={color} strokeWidth={width} strokeLinecap="butt" />
    </svg>
  );

type PacketsProps = { readonly frame: number; readonly x1: number; readonly x2: number; readonly y: number; readonly size: number };

/** 고른 쌍 위를 A→B 로 흐르는 패킷 점. */
const Packets: React.FC<PacketsProps> = ({ frame, x1, x2, y, size }) => {
  if (frame < T.packets) {
    return null;
  }
  const appear = progress(frame, T.packets, FADE);
  const span = x2 - x1 - PACKET_INSET * 2;
  return (
    <>
      {Array.from({ length: PACKETS }, (_, i) => {
        const t = ((((frame - T.packets) / PACKET_CYCLE + i / PACKETS) % 1) + 1) % 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x1 + PACKET_INSET + span * t - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: COLOR.ink,
              border: `4px solid ${COLOR.white}`,
              boxSizing: "border-box",
              opacity: appear * Math.min(1, t * 6, (1 - t) * 6),
            }}
          />
        );
      })}
    </>
  );
};

type PairProps = { readonly kind: Kind; readonly index: number; readonly frame: number; readonly l: Layout; readonly pick: number };

/** 같은 종류끼리 잇는 쌍 하나 — 선 · 결과 이름표(relay 는 3막에 회색 「예비」 로 바뀐다). */
const Pair: React.FC<PairProps> = ({ kind, index, frame, l, pick }) => {
  const start = T.checks[index];
  const draw = progress(frame, start, LINE_DRAW, EASE_IN_OUT);
  const result = fadeIn(frame, start + LINE_DRAW);
  const x1 = l.cols[0] + l.cell.w;
  const x2 = l.cols[1];
  const midX = (x1 + x2) / 2;
  const y = l.rowY[kind] + l.cell.h / 2;
  const width = kind === "srflx" ? interpolate(pick, [0, 1], [l.line.normal, l.line.picked]) : l.line.normal;
  const toBackup = kind === "relay" ? pick : 0;
  return (
    <>
      <PairLine x1={x1} x2={x2} y={y} draw={draw} color={LINE_COLOR[kind]} width={width} opacity={1 - toBackup} />
      {kind === "relay" ? (
        <PairLine x1={x1} x2={x2} y={y} draw={draw} color={COLOR.muted} width={width} opacity={toBackup} />
      ) : null}
      <Tag
        x={midX}
        y={y - l.tagAbove}
        tone={RESULT_TONE[kind]}
        size={l.text.tag}
        anchor="center"
        opacity={result * (1 - toBackup)}
        scale={interpolate(result, [0, 1], [0.85, 1])}
      >
        {l.result[kind]}
      </Tag>
      {kind === "relay" ? (
        <Tag x={midX} y={y - l.tagAbove} tone="muted" size={l.text.tag} anchor="center" opacity={toBackup}>
          {l.backup}
        </Tag>
      ) : null}
    </>
  );
};

export const IceCandidatePairs: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = fadeIn(frame, T.intro);
  const helpers = 1 - fadeIn(frame, T.helpersOut);
  const pick = fadeIn(frame, T.pick);
  const pickTag = fadeIn(frame, T.pickTag);
  const innerLeft = l.cols[0] + l.cell.w;
  const innerRight = l.cols[1];
  const midX = (innerLeft + innerRight) / 2;
  const rowMid = (k: Kind): number => l.rowY[k] + l.cell.h / 2;

  // 서버 상자 아래에서 양쪽 후보 칸 안쪽 가장자리로 내려오는 점선(1막만, 2막 시작에 걷힌다).
  const helperLines = [
    { box: l.stun, kind: "srflx" as const, start: T.stunLine },
    { box: l.turn, kind: "relay" as const, start: T.turnLine },
  ];

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {helperLines.map(({ box, kind, start }) => {
        const draw = progress(frame, start, HELPER_DRAW);
        if (draw <= 0 || helpers <= 0) {
          return null;
        }
        const y0 = box.y + box.h;
        return (
          <div key={kind} style={{ position: "absolute", inset: 0, opacity: helpers }}>
            <Arrow x1={l.helperFrom[kind][0]} y1={y0} x2={innerLeft} y2={rowMid(kind)} color={COLOR.muted} dashed draw={draw} />
            <Arrow x1={l.helperFrom[kind][1]} y1={y0} x2={innerRight} y2={rowMid(kind)} color={COLOR.muted} dashed draw={draw} />
          </div>
        );
      })}

      {l.peers.map((p, i) => (
        <Node key={i} x={p.x} y={p.y} width={p.w} height={p.h} size={l.text.peer} opacity={intro}>
          <div style={{ textAlign: "center", fontWeight: 780 }}>{i === 0 ? "피어 A" : "피어 B"}</div>
        </Node>
      ))}
      {[
        { box: l.stun, name: "STUN 서버" },
        { box: l.turn, name: "TURN 서버" },
      ].map(({ box, name }) => (
        <Node key={name} x={box.x} y={box.y} width={box.w} height={box.h} tone="muted" size={l.text.server} opacity={intro}>
          <div style={{ textAlign: "center" }}>{name}</div>
        </Node>
      ))}

      {KINDS.map((k) =>
        l.cols.map((x) => (
          <div key={`${k}-${x}`}>
            <Node x={x} y={l.rowY[k]} width={l.cell.w} height={l.cell.h} opacity={fadeIn(frame, CELL_AT[k])}>
              <CellBody kind={k} l={l} />
            </Node>
            {k === "srflx" ? (
              <Node x={x} y={l.rowY[k]} width={l.cell.w} height={l.cell.h} tone="accent" opacity={pick}>
                <CellBody kind={k} l={l} />
              </Node>
            ) : null}
          </div>
        )),
      )}

      {KINDS.map((k, i) => (
        <Pair key={k} kind={k} index={i} frame={frame} l={l} pick={pick} />
      ))}

      <Packets frame={frame} x1={innerLeft} x2={innerRight} y={rowMid("srflx")} size={l.packet} />

      <Tag
        x={midX}
        y={rowMid("srflx") + l.pickTagBelow}
        tone="accent"
        size={l.text.tag}
        anchor="center"
        opacity={pickTag}
        scale={interpolate(pickTag, [0, 1], [0.85, 1])}
      >
        선택 · 미디어
      </Tag>

      {l.note ? (
        <Label
          x={midX}
          y={l.note.y}
          size={TEXT.small}
          color={COLOR.muted}
          weight={600}
          anchor="center"
          opacity={fadeIn(frame, T.note)}
        >
          {l.note.text}
        </Label>
      ) : null}
    </AbsoluteFill>
  );
};
