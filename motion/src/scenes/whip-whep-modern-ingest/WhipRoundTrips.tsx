// 콘티: _workspace/blog/whip-whep-modern-ingest/storyboard.md 「영상 1」
// WHIP 은 HTTP POST 한 번으로 SDP 를 주고받지만, 미디어가 흐르기 전에 ICE 연결 확인과 DTLS 핸드셰이크 왕복이 더 남는다.
// RFC 9725 Figure 1 순서: POST/201 → ICE/STUN → DTLS → RTP/RTCP. 시퀀스도(시간은 위 → 아래), 단계가 끝날 때마다 왕복 카운터가 1 → 2 → 4.
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(WhipRoundTripsMobile) — 세로선 간격을 좁히고 카운터를 위로.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Box } from "../../components/Stations";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const WHIP_ROUND_TRIPS_FRAMES = 330;

/** 화살표 하나가 그려지는 프레임 수. */
const DRAW = 14;
const DTLS_DRAW = 12;
const INTRO = 15;
/** RTP 화살표 셋이 차례로 그려지기 시작하는 프레임. */
const MEDIA_START = 224;
const RTP_STAGGER = 13;
/** RTP 점선 무늬가 프레임마다 앞으로 가는 거리(px). */
const RTP_FLOW_SPEED = 3;

type Dir = "right" | "left";
type PhaseKey = "http" | "ice" | "dtls";

/** 화살표 차례와 시작 프레임. 이름표 글자는 배치표가 정한다. */
const STEPS: readonly { readonly phase: PhaseKey; readonly dir: Dir; readonly start: number; readonly draw: number }[] = [
  { phase: "http", dir: "right", start: 16, draw: DRAW },
  { phase: "http", dir: "left", start: 33, draw: DRAW },
  { phase: "ice", dir: "right", start: 78, draw: DRAW },
  { phase: "ice", dir: "left", start: 94, draw: DRAW },
  { phase: "dtls", dir: "right", start: 139, draw: DTLS_DRAW },
  { phase: "dtls", dir: "left", start: 153, draw: DTLS_DRAW },
  { phase: "dtls", dir: "right", start: 167, draw: DTLS_DRAW },
  { phase: "dtls", dir: "left", start: 181, draw: DTLS_DRAW },
];

/** 단계가 끝나 카운터가 오르는 프레임과 그때의 왕복 수. 오른 뒤 30프레임(1초) 멈춘다. */
const COUNTS: readonly { readonly at: number; readonly value: number }[] = [
  { at: 48, value: 1 },
  { at: 109, value: 2 },
  { at: 194, value: 4 },
];

const PHASES: readonly { readonly key: PhaseKey; readonly tag: string }[] = [
  { key: "http", tag: "HTTP" },
  { key: "ice", tag: "ICE" },
  { key: "dtls", tag: "DTLS" },
];

type Layout = {
  readonly leftX: number;
  readonly rightX: number;
  readonly head: { readonly y: number; readonly w: number; readonly h: number };
  readonly lifelineBottom: number;
  /** STEPS 와 같은 차례의 화살표 출발 y. */
  readonly stepYs: readonly number[];
  readonly stepLabels: readonly string[];
  /** 도착 쪽이 출발 쪽보다 내려가는 정도(시간이 흐름). */
  readonly slant: number;
  readonly labelGap: number;
  readonly phaseTagX: number;
  readonly bracketX: number;
  readonly rtpYs: readonly number[];
  readonly rtpLabel: string;
  readonly counter: { readonly x: number; readonly y: number; readonly size: number; readonly tagGap: number };
  readonly note: { readonly x: number; readonly y: number; readonly lines: readonly string[]; readonly lineGap: number };
  readonly text: { readonly head: number; readonly arrow: number; readonly phase: number; readonly tag: number; readonly note: number };
};

// 데스크톱: 세로선 360 · 1180, 카운터는 오른편(1270–).
const DESKTOP: Layout = {
  leftX: 360,
  rightX: 1180,
  head: { y: 90, w: 340, h: 88 },
  lifelineBottom: 1050,
  stepYs: [212, 292, 392, 472, 572, 652, 732, 812],
  stepLabels: [
    "POST · SDP 제안",
    "201 Created · SDP 응답 · Location",
    "STUN 연결 확인",
    "응답",
    "DTLS 핸드셰이크",
    "",
    "",
    "",
  ],
  slant: 14,
  labelGap: 52,
  phaseTagX: 150,
  bracketX: 290,
  rtpYs: [912, 962, 1012],
  rtpLabel: "RTP 미디어",
  counter: { x: 1270, y: 360, size: 88, tagGap: 26 },
  note: { x: 1270, y: 490, lines: ["DTLS 1.2 기준", "HTTPS 연결 수립 제외"], lineGap: 50 },
  text: { head: TEXT.label, arrow: TEXT.small, phase: TEXT.small, tag: TEXT.label, note: TEXT.small },
};

// 휴대폰판: 카운터 · 보조 이름표가 위, 세로선 310 · 870.
const MOBILE: Layout = {
  leftX: 310,
  rightX: 870,
  head: { y: 300, w: 360, h: 92 },
  lifelineBottom: 1310,
  stepYs: [430, 518, 622, 710, 814, 902, 990, 1078],
  stepLabels: ["POST · 제안", "201 · 응답", "STUN 확인", "응답", "DTLS", "", "", ""],
  slant: 12,
  labelGap: 66,
  phaseTagX: 110,
  bracketX: 230,
  rtpYs: [1180, 1230, 1280],
  rtpLabel: "RTP",
  counter: { x: 60, y: 40, size: 80, tagGap: 26 },
  note: { x: 60, y: 160, lines: ["DTLS 1.2 기준 · HTTPS 연결 수립 제외"], lineGap: 0 },
  text: { head: MOBILE_TEXT.label, arrow: MOBILE_TEXT.small, phase: MOBILE_TEXT.small, tag: MOBILE_TEXT.label, note: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type ArrowProps = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly draw: number;
  readonly color: string;
  readonly width: number;
  readonly head: number;
  /** 주면 선을 점선으로 그리고 이만큼 무늬를 앞으로 민다(흐름). */
  readonly flowOffset?: number;
};

/** 시퀀스도 화살표. 선은 화살촉 밑에서 끝나 둥근 끝이 촉 밖으로 나오지 않는다. */
const SeqArrow: React.FC<ArrowProps> = ({ x1, y1, x2, y2, draw, color, width, head, flowOffset }) => {
  if (draw <= 0) return null;
  const ex = x1 + (x2 - x1) * draw;
  const ey = y1 + (y2 - y1) * draw;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const lineEndX = ex - head * 0.7 * Math.cos(angle);
  const lineEndY = ey - head * 0.7 * Math.sin(angle);
  const p1 = `${ex - head * Math.cos(angle - 0.42)},${ey - head * Math.sin(angle - 0.42)}`;
  const p2 = `${ex - head * Math.cos(angle + 0.42)},${ey - head * Math.sin(angle + 0.42)}`;
  const flowing = flowOffset !== undefined;
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <line
        x1={x1}
        y1={y1}
        x2={lineEndX}
        y2={lineEndY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap={flowing ? "butt" : "round"}
        strokeDasharray={flowing ? "34 16" : undefined}
        strokeDashoffset={flowing ? -flowOffset : undefined}
      />
      {draw > 0.05 ? <polygon points={`${ex},${ey} ${p1} ${p2}`} fill={color} /> : null}
    </svg>
  );
};

/** 지금 프레임의 왕복 수와 그 값이 바뀐 프레임. 아직 없으면 null. */
const currentCount = (frame: number): { readonly value: number; readonly at: number } | null =>
  COUNTS.reduce<{ readonly value: number; readonly at: number } | null>(
    (acc, c) => (frame >= c.at ? { value: c.value, at: c.at } : acc),
    null,
  );

export const WhipRoundTrips: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, INTRO);
  const lifelineTop = l.head.y + l.head.h / 2;
  const count = currentCount(frame);
  const countPop = count ? progress(frame, count.at, 10) : 0;
  const media = progress(frame, MEDIA_START, 10);
  // 「왕복 N」 의 대략 너비(한글 두 자 + 띄어쓰기 + 숫자) — 옆 이름표 자리.
  const counterWidth = l.counter.size * 2.55;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 세로선과 머리 상자. */}
      <svg style={{ position: "absolute", inset: 0, opacity: intro }} width="100%" height="100%">
        {[l.leftX, l.rightX].map((x) => (
          <line key={x} x1={x} y1={lifelineTop} x2={x} y2={l.lifelineBottom} stroke={COLOR.muted} strokeWidth={4} />
        ))}
      </svg>
      <Box x={l.leftX} y={l.head.y} w={l.head.w} h={l.head.h} label="송출기 (OBS)" size={l.text.head} opacity={intro} />
      <Box x={l.rightX} y={l.head.y} w={l.head.w} h={l.head.h} label="WHIP 서버" size={l.text.head} opacity={intro} />

      {/* 단계 이름표와 괄호선 — 그 단계의 첫 화살표가 나올 때 함께. */}
      {PHASES.map((p) => {
        const idx = STEPS.flatMap((s, i) => (s.phase === p.key ? [i] : []));
        const top = l.stepYs[idx[0]] - l.labelGap + 6;
        const bottom = l.stepYs[idx[idx.length - 1]] + l.slant + 6;
        const shown = progress(frame, STEPS[idx[0]].start, 10);
        return (
          <div key={p.key} style={{ opacity: shown }}>
            <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
              <path
                d={`M${l.bracketX + 16},${top} H${l.bracketX} V${bottom} H${l.bracketX + 16}`}
                fill="none"
                stroke={COLOR.ink}
                strokeWidth={4}
                strokeLinejoin="round"
              />
            </svg>
            <Tag x={l.phaseTagX} y={(top + bottom) / 2 - l.text.phase * 0.85} tone="ink" size={l.text.phase} anchor="center">
              {p.tag}
            </Tag>
          </div>
        );
      })}

      {/* 제어 화살표 8개: HTTP 왕복 · ICE 왕복 · DTLS 왕복 둘. */}
      {STEPS.map((s, i) => {
        const y = l.stepYs[i];
        const [x1, x2] = s.dir === "right" ? [l.leftX, l.rightX] : [l.rightX, l.leftX];
        const draw = progress(frame, s.start, s.draw);
        const label = l.stepLabels[i];
        return (
          <div key={i}>
            <SeqArrow x1={x1} y1={y} x2={x2} y2={y + l.slant} draw={draw} color={COLOR.ink} width={5} head={22} />
            {label ? (
              <Label
                x={(l.leftX + l.rightX) / 2}
                y={y - l.labelGap}
                size={l.text.arrow}
                weight={650}
                anchor="center"
                opacity={progress(frame, s.start, 8)}
              >
                {label}
              </Label>
            ) : null}
          </div>
        );
      })}

      {/* RTP 미디어: 굵은 accent 화살표 셋이 차례로 그려진 뒤 점선 무늬가 왼 → 오로 계속 흐른다. */}
      <Label
        x={(l.leftX + l.rightX) / 2}
        y={l.rtpYs[0] - l.labelGap}
        size={l.text.arrow}
        color={COLOR.accent}
        weight={760}
        anchor="center"
        opacity={media}
      >
        {l.rtpLabel}
      </Label>
      {l.rtpYs.map((y, i) => {
        const start = MEDIA_START + i * RTP_STAGGER;
        const draw = progress(frame, start, DRAW);
        const flowOffset = Math.max(0, frame - start) * RTP_FLOW_SPEED;
        return (
          <SeqArrow
            key={y}
            x1={l.leftX}
            y1={y}
            x2={l.rightX}
            y2={y + l.slant}
            draw={draw}
            color={COLOR.accent}
            width={12}
            head={34}
            flowOffset={flowOffset}
          />
        );
      })}

      {/* 왕복 카운터 · 미디어 시작 · 보조 이름표. */}
      {count ? (
        <Label
          x={l.counter.x}
          y={l.counter.y}
          size={l.counter.size}
          weight={820}
          opacity={interpolate(countPop, [0, 1], [0.4, 1])}
        >
          <span style={{ display: "inline-block", transform: `scale(${interpolate(countPop, [0, 1], [1.12, 1])})`, transformOrigin: "left center" }}>
            왕복 {count.value}
          </span>
        </Label>
      ) : null}
      <Tag
        x={l.counter.x + counterWidth + l.counter.tagGap}
        y={l.counter.y + l.counter.size * 0.62 - l.text.tag * 0.62}
        tone="accent"
        size={l.text.tag}
        opacity={media}
        scale={interpolate(media, [0, 1], [0.85, 1])}
      >
        미디어 시작
      </Tag>
      {l.note.lines.map((line, i) => (
        <Label key={line} x={l.note.x} y={l.note.y + i * l.note.lineGap} size={l.text.note} color={COLOR.muted} weight={600} opacity={intro}>
          {line}
        </Label>
      ))}
    </AbsoluteFill>
  );
};
