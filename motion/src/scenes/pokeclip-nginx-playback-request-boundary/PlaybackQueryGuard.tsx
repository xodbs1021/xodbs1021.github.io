// 콘티: _workspace/blog/pokeclip-nginx-playback-request-boundary/storyboard.md 「영상 1」
// 요청 다섯 개가 차례로 nginx 관문에 닿는다. 경로의 방송과 쿼리의 방송이 같은 첫 요청만 재생 서버(:9996)까지 가고,
// 다른 방송 · 중복 path · 인코딩한 키 · 인코딩한 슬래시 요청은 관문에서 403으로 멈춘다. 끝에 「상류 도달 0」.
// 근거: 글 본문 표와 infra/media-host/test/proxy_contract.sh(거절과 상류 호출 0을 함께 검사).
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const PLAYBACK_QUERY_GUARD_FRAMES = 360;

const REQUESTS = [
  { text: "/A/list?path=A", pass: true },
  { text: "/A/list?path=B", pass: false },
  { text: "/A/list?path=A&path=B", pass: false },
  { text: "/A/list?pa%74h=B&path=A", pass: false },
  { text: "/A/..%2fB/list", pass: false },
] as const;

const T = {
  intro: 0,
  starts: [20, 86, 134, 182, 230],
  upstream: 276,
} as const;
const FADE = 12;
/** 요청이 관문에 닿기까지. */
const TO_GATE = 20;
/** 통과한 요청이 관문에서 재생 서버까지. */
const TO_UPSTREAM = 18;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Pos = { readonly x: number; readonly y: number };
type Anchored = Pos & { readonly anchor: "left" | "center" };

type Layout = {
  readonly pillX: number;
  readonly pillH: number;
  readonly pillPad: number;
  readonly rowY: readonly number[];
  /** 요청에서 관문까지의 꺾은선(행의 y 를 받아). 시작점은 요청 상자 뒤에 숨는다. */
  readonly toGate: (y: number) => readonly Pos[];
  /** 통과한 요청이 관문에서 재생 서버까지 가는 선. */
  readonly toUpstream: (y: number) => readonly Pos[];
  /** 거절된 요청 선을 403 이 뜰 때 지울지(휴대폰판은 선이 403 이름표 자리를 지난다). */
  readonly fadeRejected: boolean;
  /** 관문에 닿은 뒤 403 이 뜨기까지(휴대폰판은 멈춘 점과 빨간 길을 먼저 보인다). */
  readonly rejectDelay: number;
  /** 시작부터 흐리게 보이는 길(데스크톱만). */
  readonly guides: boolean;
  readonly gate: Box;
  readonly gateLabel: Anchored;
  readonly requestLabel: Pos | null;
  readonly upstream: Box;
  /** 403 이름표 가운데 x. */
  readonly rejectX: number;
  readonly zeroTag: Anchored;
  /** 거절된 넷을 묶는 괄호(SVG path). */
  readonly bracket: string | null;
  readonly packet: number;
  readonly line: number;
  readonly text: { readonly request: number; readonly label: number; readonly tag: number };
};

const DESKTOP_GATE: Box = { x: 980, y: 180, w: 60, h: 780 };
const DESKTOP_UPSTREAM: Box = { x: 1440, y: 200, w: 380, h: 120 };

const DESKTOP: Layout = {
  pillX: 100,
  pillH: 88,
  pillPad: 24,
  rowY: [260, 410, 560, 710, 860],
  toGate: (y) => [
    { x: 300, y },
    { x: DESKTOP_GATE.x, y },
  ],
  toUpstream: (y) => [
    { x: DESKTOP_GATE.x, y },
    { x: DESKTOP_UPSTREAM.x - 8, y },
  ],
  fadeRejected: false,
  rejectDelay: 0,
  guides: true,
  gate: DESKTOP_GATE,
  gateLabel: { x: DESKTOP_GATE.x + DESKTOP_GATE.w / 2, y: 100, anchor: "center" },
  requestLabel: { x: 100, y: 100 },
  upstream: DESKTOP_UPSTREAM,
  rejectX: 905,
  zeroTag: { x: 1150, y: 603, anchor: "left" },
  bracket: "M 1080 366 H 1112 V 904 H 1080",
  packet: 14,
  line: 6,
  text: { request: 40, label: TEXT.label, tag: TEXT.label },
};

const MOBILE_GATE: Box = { x: 60, y: 300, w: 960, h: 80 };
const MOBILE_UPSTREAM: Box = { x: 520, y: 50, w: 500, h: 120 };
const MOBILE_TRUNK_X = 980;

const MOBILE: Layout = {
  pillX: 60,
  pillH: 84,
  pillPad: 20,
  rowY: [480, 625, 770, 915, 1060],
  toGate: (y) => [
    { x: 300, y },
    { x: MOBILE_TRUNK_X, y },
    { x: MOBILE_TRUNK_X, y: MOBILE_GATE.y + MOBILE_GATE.h },
  ],
  toUpstream: () => [
    { x: MOBILE_TRUNK_X, y: MOBILE_GATE.y + MOBILE_GATE.h },
    { x: MOBILE_TRUNK_X, y: MOBILE_UPSTREAM.y + MOBILE_UPSTREAM.h + 8 },
  ],
  fadeRejected: true,
  rejectDelay: 10,
  guides: false,
  gate: MOBILE_GATE,
  gateLabel: { x: MOBILE_GATE.x + 32, y: MOBILE_GATE.y + 10, anchor: "left" },
  requestLabel: null,
  upstream: MOBILE_UPSTREAM,
  rejectX: 857,
  zeroTag: { x: 857, y: 1150, anchor: "center" },
  bracket: null,
  packet: 16,
  line: 7,
  text: { request: MOBILE_TEXT.small, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const segLength = (a: Pos, b: Pos) => Math.hypot(b.x - a.x, b.y - a.y);

/** 꺾은선을 처음부터 t(0–1) 만큼만 자른 점들과 그 끝점. */
const partial = (points: readonly Pos[], t: number): { readonly points: readonly Pos[]; readonly head: Pos } => {
  const lengths = points.slice(1).map((p, i) => segLength(points[i], p));
  const total = lengths.reduce((a, b) => a + b, 0);
  let left = total * t;
  const out: Pos[] = [points[0]];
  for (let i = 0; i < lengths.length; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (left >= lengths[i]) {
      out.push(b);
      left -= lengths[i];
      continue;
    }
    const k = lengths[i] === 0 ? 0 : left / lengths[i];
    const head = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    return { points: [...out, head], head };
  }
  return { points: out, head: points[points.length - 1] };
};

const toSvg = (points: readonly Pos[]) => points.map((p) => `${p.x},${p.y}`).join(" ");

const arrowHead = (from: Pos, to: Pos, size: number) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const p1 = `${to.x - size * Math.cos(angle - 0.45)},${to.y - size * Math.sin(angle - 0.45)}`;
  const p2 = `${to.x - size * Math.cos(angle + 0.45)},${to.y - size * Math.sin(angle + 0.45)}`;
  return `${to.x},${to.y} ${p1} ${p2}`;
};

export const PlaybackQueryGuard: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];

  const intro = progress(frame, T.intro, 15);
  const zero = progress(frame, T.upstream, FADE);
  const tagH = l.text.tag * 1.2 + 16;

  const rows = REQUESTS.map((req, i) => {
    const start = T.starts[i];
    return {
      req,
      y: l.rowY[i],
      toGate: progress(frame, start, TO_GATE, EASE_IN_OUT),
      arrived: frame >= start + TO_GATE,
      toUp: req.pass ? progress(frame, start + TO_GATE, TO_UPSTREAM, EASE_IN_OUT) : 0,
      result: progress(frame, start + TO_GATE + (req.pass ? 0 : l.rejectDelay), FADE),
    };
  });

  const lane = (r: (typeof rows)[number]) => {
    if (r.toGate <= 0) {
      return null;
    }
    const drawn = partial(l.toGate(r.y), r.toGate);
    const color = r.req.pass ? COLOR.accent : r.arrived ? COLOR.danger : COLOR.ink;
    const up = r.req.pass && r.toUp > 0 ? partial(l.toUpstream(r.y), r.toUp) : null;
    const head = up ? up.head : drawn.head;
    const showPacket = r.req.pass ? r.toUp < 1 : !r.arrived || l.fadeRejected;
    const opacity = !r.req.pass && l.fadeRejected ? 1 - r.result : 1;
    return (
      <g key={`lane-${r.req.text}`} opacity={opacity}>
        <polyline
          points={toSvg(drawn.points)}
          fill="none"
          stroke={color}
          strokeWidth={l.line}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {up ? (
          <polyline
            points={toSvg(up.points)}
            fill="none"
            stroke={COLOR.accent}
            strokeWidth={l.line}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {up && r.toUp >= 1 ? (
          <polygon
            points={arrowHead(up.points[up.points.length - 2], up.head, l.packet * 1.7)}
            fill={COLOR.accent}
          />
        ) : null}
        {showPacket ? <circle cx={head.x} cy={head.y} r={l.packet} fill={color} /> : null}
      </g>
    );
  };

  const pill = (r: (typeof rows)[number]) => {
    const tone = !r.arrived ? "ink" : r.req.pass ? "accent" : "danger";
    const border = tone === "ink" ? `3px solid ${COLOR.ink}` : `4px solid ${COLOR[tone]}`;
    const background = tone === "accent" ? COLOR.accentSoft : tone === "danger" ? COLOR.dangerSoft : COLOR.white;
    return (
      <div
        key={`pill-${r.req.text}`}
        style={{
          position: "absolute",
          left: l.pillX,
          top: r.y - l.pillH / 2,
          height: l.pillH,
          lineHeight: `${l.pillH - 8}px`,
          padding: `0 ${l.pillPad}px`,
          borderRadius: 14,
          boxSizing: "border-box",
          border,
          background,
          fontFamily: MONO,
          fontSize: l.text.request,
          fontWeight: 600,
          color: COLOR.ink,
          whiteSpace: "nowrap",
          opacity: intro,
        }}
      >
        {r.req.text}
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.requestLabel ? (
        <Label x={l.requestLabel.x} y={l.requestLabel.y} size={l.text.label} weight={700} opacity={intro}>
          요청
        </Label>
      ) : null}

      {/* nginx 관문 */}
      <div
        style={{
          position: "absolute",
          left: l.gate.x,
          top: l.gate.y,
          width: l.gate.w,
          height: l.gate.h,
          borderRadius: 18,
          boxSizing: "border-box",
          border: `4px solid ${COLOR.ink}`,
          background: COLOR.surface,
          opacity: intro,
        }}
      />
      <Label
        x={l.gateLabel.x}
        y={l.gateLabel.y}
        size={l.text.label}
        weight={760}
        anchor={l.gateLabel.anchor}
        opacity={intro}
      >
        nginx
      </Label>

      <div
        style={{
          position: "absolute",
          left: l.upstream.x,
          top: l.upstream.y,
          width: l.upstream.w,
          height: l.upstream.h,
          borderRadius: 16,
          boxSizing: "border-box",
          border: `3px solid ${COLOR.ink}`,
          background: COLOR.white,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: FONT,
          fontSize: l.text.label,
          fontWeight: 720,
          color: COLOR.ink,
          opacity: intro,
        }}
      >
        재생 서버 :9996
      </div>

      {/* 길 · 요청 점. 점은 요청 상자 뒤에서 나와 관문으로 간다. */}
      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
        {l.guides
          ? rows.map((r) => (
              <polyline
                key={`guide-${r.req.text}`}
                points={toSvg(l.toGate(r.y))}
                fill="none"
                stroke={COLOR.line}
                strokeWidth={l.line - 2}
                strokeLinecap="round"
                opacity={intro}
              />
            ))
          : null}
        {rows.map(lane)}
        {l.bracket ? (
          <path
            d={l.bracket}
            fill="none"
            stroke={COLOR.muted}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={zero}
          />
        ) : null}
      </svg>

      {rows.map(pill)}

      {/* 403 이름표: 거절된 요청 옆 */}
      {rows
        .filter((r) => !r.req.pass)
        .map((r) => (
          <Tag
            key={`deny-${r.req.text}`}
            x={l.rejectX}
            y={r.y - tagH / 2}
            tone="danger"
            size={l.text.tag}
            anchor="center"
            opacity={r.result}
            scale={0.85 + 0.15 * r.result}
          >
            403
          </Tag>
        ))}

      <Tag x={l.zeroTag.x} y={l.zeroTag.y} tone="ink" size={l.text.tag} anchor={l.zeroTag.anchor} opacity={zero}>
        상류 도달 0
      </Tag>
    </AbsoluteFill>
  );
};
