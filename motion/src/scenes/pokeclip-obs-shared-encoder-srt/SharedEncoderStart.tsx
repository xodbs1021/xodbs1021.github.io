// 콘티: _workspace/blog/pokeclip-obs-shared-encoder-srt/storyboard.md 「영상 1」
// OBS 시작 순서(프로필 설정 적용 → STREAMING_STARTING → 인코더 생성 → 출력 시작). 첫 바퀴: STREAMING_STARTING 에서
// keyint_sec 를 2로 맞추고, 인코더(x264 1개)가 만들어진 뒤 RTMP · SRT 두 줄로 같은 패킷이 흐르다 본방이 멈추면 SRT 도
// 함께 멈춘다. 둘째 바퀴: 녹화가 keyint 2 가 아닌 인코더를 이미 돌리고 있어 실행 중에는 GOP 를 바꿀 수 없으므로
// SRT 시작을 거절하고 본방은 계속 흐른다(이미 keyint 2 로 돌고 있으면 거절하지 않는다).
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT } from "../../theme";
import { LAYOUTS } from "./layout";

export const SHARED_ENCODER_START_FRAMES = 360;

/** 장면 순서(프레임, 30fps). */
const T = {
  // 첫 바퀴: 정상 시작.
  steps: [15, 45, 85, 115],
  stepsDone: 165,
  encoderIn: 85,
  linesIn: 115,
  packetsFrom: 123,
  mainStop: 165,
  outputsStop: 177,
  // 둘째 바퀴: 녹화가 keyint 2 가 아닌 인코더를 이미 쓰는 중.
  reset: 215,
  steps2: [235, 248],
  refuse: 260,
  resume: 272,
  rtmp2In: 268,
  packets2From: 276,
  srt2In: 274,
  srtRefuse: 284,
} as const;
const FADE = 10;
const DRAW = 12;
/** 패킷 간격과 한 줄을 지나는 시간(프레임). 두 줄이 같은 박자. */
const PACKET = { every: 14, travel: 34 } as const;
/** 패킷이 화살촉에 묻히지 않도록 줄 끝에서 멈추는 거리(px). */
const PACKET_END_GAP = 30;

type Tone = "ink" | "accent" | "danger" | "muted";

const BOX_TONE = {
  ink: { background: COLOR.white, border: `4px solid ${COLOR.ink}`, color: COLOR.ink },
  accent: { background: COLOR.accentSoft, border: `5px solid ${COLOR.accent}`, color: COLOR.ink },
  danger: { background: COLOR.dangerSoft, border: `5px solid ${COLOR.danger}`, color: COLOR.danger },
  muted: { background: COLOR.surface, border: `4px dashed ${COLOR.muted}`, color: COLOR.muted },
} as const;

type BoxProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly tone: Tone;
  readonly size: number;
  readonly note?: string;
  readonly noteSize?: number;
  readonly opacity?: number;
  readonly scale?: number;
  readonly children: React.ReactNode;
};

/** 높이를 정해 둔 상자 — 화살표가 가장자리에 정확히 붙도록. */
const Box: React.FC<BoxProps> = ({ x, y, w, h, tone, size, note, noteSize, opacity = 1, scale = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 16,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 720,
      letterSpacing: "-0.02em",
      lineHeight: 1.25,
      whiteSpace: "nowrap",
      opacity,
      transform: `scale(${scale})`,
      ...BOX_TONE[tone],
    }}
  >
    {children}
    {note ? (
      <div style={{ fontSize: noteSize, fontWeight: 650, color: tone === "danger" ? COLOR.danger : COLOR.muted, marginTop: 4 }}>
        {note}
      </div>
    ) : null}
  </div>
);

/** 첫 바퀴: 지나간 단계는 ink, 지금 단계는 accent, 아직은 muted. */
const firstRunTone = (frame: number, i: number): Tone => {
  const start = T.steps[i];
  const end = i < T.steps.length - 1 ? T.steps[i + 1] : T.stepsDone;
  if (frame < start) return "muted";
  return frame < end ? "accent" : "ink";
};

/** 둘째 바퀴: 1 → 2 순서로 강조, 2번에서 거절(danger), 본방은 3 · 4 를 지나 계속. */
const secondRunTone = (frame: number, i: number): Tone => {
  if (i === 0) {
    if (frame < T.steps2[0]) return "muted";
    return frame < T.steps2[1] ? "accent" : "ink";
  }
  if (i === 1) {
    if (frame < T.steps2[1]) return "muted";
    return frame < T.refuse ? "accent" : "danger";
  }
  return frame < T.resume ? "muted" : "ink";
};

const stepTone = (frame: number, i: number): Tone =>
  frame < T.reset ? firstRunTone(frame, i) : secondRunTone(frame, i);

const encoderTone = (frame: number): Tone => {
  if (frame < T.linesIn) return "accent";
  if (frame < T.outputsStop) return "ink";
  // 본방이 멈추면 인코더도 쉰다. 둘째 바퀴는 녹화가 이미 켜 둔 상태(ink).
  return frame < T.reset ? "muted" : "ink";
};

type PacketsProps = {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly from: number;
  /** 이 프레임에 패킷이 그 자리에 멈추고 회색이 된다. 없으면 끝까지 흐른다. */
  readonly stopAt?: number;
  readonly frame: number;
  readonly radius: number;
};

/** 줄 위를 같은 박자로 흐르는 패킷 점들. */
const Packets: React.FC<PacketsProps> = ({ x1, x2, y, from, stopAt, frame, radius }) => {
  const now = stopAt === undefined ? frame : Math.min(frame, stopAt);
  const stopped = stopAt !== undefined && frame >= stopAt;
  const count = Math.max(0, Math.floor((now - from) / PACKET.every) + 1);
  const dots = Array.from({ length: count }, (_, k) => ({ k, t: (now - (from + k * PACKET.every)) / PACKET.travel }))
    .filter(({ t }) => t >= 0 && t <= 1);
  return (
    <>
      {dots.map(({ k, t }) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: x1 + (x2 - x1) * t - radius,
            top: y - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: 999,
            background: stopped ? COLOR.muted : COLOR.accent,
          }}
        />
      ))}
    </>
  );
};

type OutputLineProps = {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly draw: number;
  readonly color: string;
  readonly dashed?: boolean;
};

/** 인코더 가장자리에서 나가는 출력 줄. 그리기 전(draw 0)에는 둥근 선 끝이 점으로 남지 않게 아예 그리지 않는다. */
const OutputLine: React.FC<OutputLineProps> = ({ x1, x2, y, draw, color, dashed = false }) =>
  draw > 0 ? <Arrow x1={x1} y1={y} x2={x2} y2={y} draw={draw} color={color} dashed={dashed} /> : null;

const STEP_LABELS = ["프로필 설정 적용", "STREAMING_STARTING", "인코더 생성", "출력 시작"] as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const SharedEncoderStart: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const second = frame >= T.reset;

  const intro = progress(frame, 0, 15);
  // 첫 바퀴에만 보이는 것들은 초기화 때 사라진다.
  const firstOut = 1 - progress(frame, T.reset, FADE);

  const encoderIn = progress(frame, T.encoderIn, FADE + 4);

  const { x1, x2, rtmpY, srtY } = l.lines;
  const packetX2 = x2 - PACKET_END_GAP;
  // 첫 바퀴의 두 줄: 본방이 멈추면 둘 다 회색 점선.
  const draw1 = progress(frame, T.linesIn, DRAW);
  const stopped1 = frame >= T.outputsStop;
  const line1 = stopped1 ? COLOR.muted : COLOR.ink;
  // 둘째 바퀴: RTMP 는 다시 흐르고, SRT 는 거절(빨간 점선).
  const drawRtmp2 = progress(frame, T.rtmp2In, DRAW);
  const drawSrt2 = progress(frame, T.srt2In, DRAW);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 위: 시작 순서 상자 4개. */}
      {l.stepArrows.map(([ax1, ay1, ax2, ay2]) => (
        <div key={`${ax1}-${ay1}`} style={{ position: "absolute", inset: 0, opacity: intro }}>
          <Arrow x1={ax1} y1={ay1} x2={ax2} y2={ay2} color={COLOR.muted} />
        </div>
      ))}
      {l.steps.map((s, i) => (
        <Box
          key={STEP_LABELS[i]}
          x={s.x}
          y={s.y}
          w={s.w}
          h={s.h}
          tone={stepTone(frame, i)}
          size={l.text.box}
          note={i === 1 ? "keyint 2" : undefined}
          noteSize={l.text.note}
          opacity={intro}
        >
          {STEP_LABELS[i]}
        </Box>
      ))}

      {/* 2번 상자 아래: 첫 바퀴는 keyint_sec → 2, 둘째 바퀴는 실행 중 GOP 변경 불가. */}
      <Tag
        x={l.keyTag.x} y={l.keyTag.y} anchor={l.keyTag.anchor} tone="accent" size={l.text.tag}
        opacity={progress(frame, T.steps[1], FADE) * firstOut}
      >
        keyint_sec → 2
      </Tag>
      <Tag
        x={l.keyTag.x} y={l.keyTag.y} anchor={l.keyTag.anchor} tone="danger" size={l.text.tag}
        opacity={progress(frame, T.refuse, FADE)}
      >
        실행 중 GOP 변경 불가
      </Tag>

      {/* 아래: 출력 두 줄. 둘 다 인코더 오른쪽 가장자리에서 시작한다. */}
      {second ? null : (
        <div style={{ position: "absolute", inset: 0, opacity: firstOut }}>
          <OutputLine x1={x1} x2={x2} y={rtmpY} draw={draw1} color={line1} dashed={stopped1} />
          <OutputLine x1={x1} x2={x2} y={srtY} draw={draw1} color={line1} dashed={stopped1} />
          <Label x={l.lineLabels.x} y={l.lineLabels.rtmpY} size={l.text.label} color={line1} opacity={draw1}>
            RTMP → 치지직
          </Label>
          <Label x={l.lineLabels.x} y={l.lineLabels.srtY} size={l.text.label} color={line1} opacity={draw1}>
            SRT → PokeClip
          </Label>
          <Packets x1={x1} x2={packetX2} y={rtmpY} from={T.packetsFrom} stopAt={T.outputsStop} frame={frame} radius={l.packetRadius} />
          <Packets x1={x1} x2={packetX2} y={srtY} from={T.packetsFrom} stopAt={T.outputsStop} frame={frame} radius={l.packetRadius} />
        </div>
      )}
      {second ? (
        <>
          <OutputLine x1={x1} x2={x2} y={rtmpY} draw={drawRtmp2} color={COLOR.ink} />
          <Label x={l.lineLabels.x} y={l.lineLabels.rtmpY} size={l.text.label} opacity={drawRtmp2}>
            RTMP → 치지직
          </Label>
          <Packets x1={x1} x2={packetX2} y={rtmpY} from={T.packets2From} frame={frame} radius={l.packetRadius} />
          <OutputLine x1={x1} x2={x2} y={srtY} draw={drawSrt2} color={COLOR.danger} dashed />
          <Label x={l.lineLabels.x} y={l.lineLabels.srtY} size={l.text.label} color={COLOR.danger} opacity={drawSrt2}>
            SRT → PokeClip
          </Label>
        </>
      ) : null}

      {/* 인코더 1개 — 선보다 위에 그려 선 시작점이 가장자리에 붙어 보이게. */}
      <Box
        x={l.encoder.x}
        y={l.encoder.y}
        w={l.encoder.w}
        h={l.encoder.h}
        tone={encoderTone(frame)}
        size={l.text.encoder}
        opacity={encoderIn}
        scale={0.92 + 0.08 * encoderIn}
      >
        x264 1개
      </Box>

      <Tag x={l.recordingTag.x} y={l.recordingTag.y} tone="muted" size={l.text.tag} opacity={progress(frame, T.reset, FADE)}>
        녹화 중 · keyint ≠ 2
      </Tag>

      {/* 줄 끝 결과. */}
      <Tag x={l.outcomeTags.x} y={l.outcomeTags.rtmpY} tone="ink" size={l.text.tag} opacity={progress(frame, T.mainStop, FADE) * firstOut}>
        본방 정지
      </Tag>
      <Tag x={l.outcomeTags.x} y={l.outcomeTags.srtY} tone="muted" size={l.text.tag} opacity={progress(frame, T.outputsStop, FADE) * firstOut}>
        SRT도 함께 정지
      </Tag>
      <Tag x={l.outcomeTags.x} y={l.outcomeTags.srtY} tone="danger" size={l.text.tag} opacity={progress(frame, T.srtRefuse, FADE)}>
        SRT 시작 거절
      </Tag>
    </AbsoluteFill>
  );
};
