// 콘티: _workspace/blog/mediamtx-request-body-log-redaction/storyboard.md 「BodyContentGate」
// v1.21.4(PR #6379 머지 뒤) debug 로그의 요청 본문 판정을 세 요청으로 보인다(재구성).
// 1줄 SDP(140 B)는 목록에 있어 본문이 로그로 간다. 2 · 3줄 JSON(API 128 B · 인증 167 B)은 목록 밖이라
// 본문을 읽지 않고 (body of N bytes) 만 남는다. 숫자는 재측정 원자료(measure/raw)와 같다.
// layout="mobile" 은 1080×1350 휴대폰판 — 로그 줄을 카드 아래로 내리고 글자 48px 이상.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const BODY_CONTENT_GATE_FRAMES = 330;

type Lane = {
  readonly contentType: string;
  readonly what: string;
  readonly secret: boolean;
  readonly pass: boolean;
  readonly size: string;
  readonly requestLine: string;
  readonly logBody: string;
  /** 꾸러미가 출발하는 프레임. */
  readonly start: number;
};

const LANES: readonly Lane[] = [
  {
    contentType: "application/sdp",
    what: "WHEP 제안 · 140 B",
    secret: false,
    pass: true,
    size: "140 B",
    requestLine: "POST /probe/whep",
    logBody: "s=MTX6379W-SDP",
    start: 20,
  },
  {
    contentType: "application/json",
    what: "API 설정 · 128 B",
    secret: true,
    pass: false,
    size: "128 B",
    requestLine: "POST …/paths/add/probe",
    logBody: "(body of 128 bytes)",
    start: 110,
  },
  {
    contentType: "application/json",
    what: "인증 요청 · 167 B",
    secret: true,
    pass: false,
    size: "167 B",
    requestLine: "POST /auth",
    logBody: "(body of 167 bytes)",
    start: 200,
  },
];

const TO_GATE = 35;
const AT_GATE = 15;
const TO_LOG = 30;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Layout = {
  readonly title: { readonly x: number; readonly y: number; readonly size: number };
  readonly legend: { readonly x: number; readonly y: number; readonly size: number; readonly text: string };
  readonly card: (i: number) => Box;
  readonly gate: (i: number) => Box;
  /** 로그 줄의 왼쪽 위. 요청 줄 다음에 본문 줄이 온다. */
  readonly log: (i: number) => { readonly x: number; readonly y: number };
  readonly showRequestLine: boolean;
  readonly text: { readonly big: number; readonly small: number; readonly mark: number };
  readonly token: { readonly w: number; readonly h: number };
};

const DESKTOP: Layout = {
  title: { x: 120, y: 64, size: TEXT.title },
  legend: {
    x: 120,
    y: 150,
    size: TEXT.small,
    text: "본문을 남기는 목록: application/sdp · application/trickle-ice-sdpfrag",
  },
  card: (i) => ({ x: 120, y: 250 + i * 250, w: 500, h: 180 }),
  gate: (i) => ({ x: 760, y: 280 + i * 250, w: 150, h: 120 }),
  log: (i) => ({ x: 1040, y: 270 + i * 250 }),
  showRequestLine: true,
  text: { big: TEXT.label, small: TEXT.small, mark: 64 },
  token: { w: 150, h: 64 },
};

const MOBILE: Layout = {
  title: { x: 60, y: 64, size: MOBILE_TEXT.title },
  legend: { x: 60, y: 150, size: MOBILE_TEXT.small, text: "본문을 남기는 목록: SDP · trickle ICE" },
  card: (i) => ({ x: 60, y: 260 + i * 350, w: 640, h: 170 }),
  gate: (i) => ({ x: 790, y: 270 + i * 350, w: 230, h: 150 }),
  log: (i) => ({ x: 60, y: 450 + i * 350 }),
  showRequestLine: false,
  text: { big: MOBILE_TEXT.label, small: MOBILE_TEXT.small, mark: 72 },
  token: { w: 170, h: 72 },
};

const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

const Card: React.FC<{ lane: Lane; box: Box; L: Layout }> = ({ lane, box, L }) => (
  <div
    style={{
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.w,
      height: box.h,
      boxSizing: "border-box",
      padding: "18px 26px",
      borderRadius: 18,
      background: COLOR.white,
      border: `4px solid ${COLOR.line}`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: 10,
    }}
  >
    <div style={{ fontFamily: MONO, fontSize: L.text.small, color: COLOR.ink, fontWeight: 600 }}>
      {lane.contentType}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <span style={{ fontFamily: FONT, fontSize: L.text.small, color: COLOR.muted }}>{lane.what}</span>
      {lane.secret ? (
        <span
          style={{
            fontFamily: FONT,
            fontSize: L.text.small,
            fontWeight: 700,
            color: COLOR.danger,
            background: COLOR.dangerSoft,
            border: `3px solid ${COLOR.danger}`,
            borderRadius: 999,
            padding: "0 18px",
            lineHeight: 1.3,
          }}
        >
          비밀
        </span>
      ) : null}
    </div>
  </div>
);

const Gate: React.FC<{ lane: Lane; box: Box; frame: number; L: Layout }> = ({ lane, box, frame, L }) => {
  const lit = progress(frame, lane.start + TO_GATE, AT_GATE);
  const on = lit > 0.5;
  const tone = lane.pass ? COLOR.accent : COLOR.muted;
  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        boxSizing: "border-box",
        borderRadius: 18,
        background: on ? (lane.pass ? COLOR.accentSoft : COLOR.surface) : COLOR.white,
        border: on ? `5px ${lane.pass ? "solid" : "dashed"} ${tone}` : `4px solid ${COLOR.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: L.text.mark,
        color: tone,
      }}
    >
      <span style={{ opacity: lit }}>{lane.pass ? "✓" : "✕"}</span>
    </div>
  );
};

const Token: React.FC<{ lane: Lane; i: number; frame: number; L: Layout }> = ({ lane, i, frame, L }) => {
  const card = L.card(i);
  const gate = center(L.gate(i));
  const log = L.log(i);
  const from = { x: card.x + card.w - L.token.w / 2, y: card.y + card.h / 2 };
  const toLog = L.showRequestLine
    ? { x: log.x + L.token.w / 2, y: log.y + 90 }
    : { x: log.x + L.token.w / 2, y: log.y + 40 };
  const t1 = progress(frame, lane.start, TO_GATE, EASE_IN_OUT);
  const t2 = progress(frame, lane.start + TO_GATE + AT_GATE, TO_LOG, EASE_IN_OUT);
  const x = interpolate(t2, [0, 1], [interpolate(t1, [0, 1], [from.x, gate.x]), toLog.x]);
  const y = interpolate(t2, [0, 1], [interpolate(t1, [0, 1], [from.y, gate.y]), toLog.y]);
  const end = lane.start + TO_GATE + AT_GATE + TO_LOG;
  const opacity = interpolate(frame, [lane.start, lane.start + 6, end - 2, end + 6], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const judged = frame >= lane.start + TO_GATE + AT_GATE / 2;
  const sizeOnly = judged && !lane.pass;
  return (
    <div
      style={{
        position: "absolute",
        left: x - L.token.w / 2,
        top: y - L.token.h / 2,
        width: L.token.w,
        height: L.token.h,
        borderRadius: 999,
        background: sizeOnly ? COLOR.surface : lane.pass ? COLOR.accent : COLOR.dangerSoft,
        border: `3px solid ${sizeOnly ? COLOR.muted : lane.pass ? COLOR.accent : COLOR.danger}`,
        color: sizeOnly ? COLOR.ink : lane.pass ? COLOR.white : COLOR.danger,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: L.text.small,
        opacity,
      }}
    >
      {sizeOnly ? lane.size : "본문"}
    </div>
  );
};

const LogLine: React.FC<{ lane: Lane; i: number; frame: number; L: Layout }> = ({ lane, i, frame, L }) => {
  const at = lane.start + TO_GATE + AT_GATE + TO_LOG - 6;
  const o = progress(frame, at, 12);
  const pos = L.log(i);
  return (
    <div style={{ position: "absolute", left: pos.x, top: pos.y, opacity: o }}>
      {L.showRequestLine ? (
        <div style={{ fontFamily: MONO, fontSize: L.text.small, color: COLOR.muted, lineHeight: 1.4 }}>
          [c-&gt;s] {lane.requestLine}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: MONO,
          fontSize: L.text.big,
          fontWeight: 700,
          color: lane.pass ? COLOR.accent : COLOR.ink,
          lineHeight: 1.4,
        }}
      >
        {L.showRequestLine ? "" : "로그 ▸ "}
        {lane.logBody}
      </div>
    </div>
  );
};

export const BodyContentGate: React.FC<{ layout?: "desktop" | "mobile" }> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = layout === "mobile" ? MOBILE : DESKTOP;
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          left: L.title.x,
          top: L.title.y,
          fontSize: L.title.size,
          fontWeight: 800,
          color: COLOR.ink,
        }}
      >
        v1.21.4 · debug 로그
      </div>
      <div
        style={{
          position: "absolute",
          left: L.legend.x,
          top: L.legend.y,
          fontSize: L.legend.size,
          color: COLOR.muted,
        }}
      >
        {L.legend.text}
      </div>
      {LANES.map((lane, i) => (
        <Card key={`c${i}`} lane={lane} box={L.card(i)} L={L} />
      ))}
      {LANES.map((lane, i) => (
        <Gate key={`g${i}`} lane={lane} box={L.gate(i)} frame={frame} L={L} />
      ))}
      {LANES.map((lane, i) => (
        <LogLine key={`l${i}`} lane={lane} i={i} frame={frame} L={L} />
      ))}
      {LANES.map((lane, i) => (
        <Token key={`t${i}`} lane={lane} i={i} frame={frame} L={L} />
      ))}
    </AbsoluteFill>
  );
};
