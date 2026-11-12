// 콘티: _workspace/blog/rtmp-still-alive/storyboard.md 「영상 1」
// RTMP 는 큰 영상 메시지를 청크로 쪼개 보내므로 그 사이에 작은 오디오 · 제어 메시지가 끼어들 수 있다(Adobe RTMP 사양 5.3절).
//   1줄 통째로 보내면 — 영상 막대 하나가 관(TCP 연결 하나)을 지나는 동안 오디오 · 제어가 관 입구 위에서 기다린다.
//   2줄 청크로 쪼개면 — 같은 영상이 V1–V6 으로 갈라지고, V2 뒤에 오디오 · V4 뒤에 제어가 끼어든다.
// 서버 아래 「받은 순서」 칸은 메시지가 끝까지 다 도착한 순서. 2줄은 V1–V6 이 다 오면 막대 하나로 합쳐진다.
// 두 줄은 같은 속도로 흐른다(판마다 관 길이 + 줄 길이를 프레임 20–250 에 지난다). 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(ChunkInterleaveMobile) — 같은 움직임을 큰 글자로, 128바이트 이름표는 뺀다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const CHUNK_INTERLEAVE_FRAMES = 330;

/** 맨 앞 칸이 관에 들어가기 시작하는 프레임과, 마지막 칸이 서버에 다 도착하는 프레임. */
const FLOW = { start: 20, end: 250 } as const;
/** 오디오 · 제어가 관 입구 위 대기 자리에 나타나는 프레임. */
const APPEAR = { audio: 30, control: 56 } as const;
/** 대기 자리에서 관 입구로 내려오는 데 걸리는 프레임. */
const DROP = 14;
const POP = 8;
const MERGE = 16;
const CHUNK_COUNT = 6;

type SmallId = "audio" | "control";
type Unit =
  | { readonly id: string; readonly kind: "video"; readonly label: string; readonly width: number }
  | { readonly id: SmallId; readonly kind: "small"; readonly label: string; readonly width: number };

type Layout = {
  readonly obs: { readonly x: number; readonly w: number };
  readonly pipe: { readonly x: number; readonly w: number; readonly h: number };
  readonly serverW: number;
  readonly unitH: number;
  readonly listH: number;
  readonly chunkW: number;
  readonly gap: number;
  readonly smallW: Record<SmallId, number>;
  readonly videoSlotW: number;
  readonly stageGap: number;
  readonly rowYs: readonly [number, number];
  /** 줄 머리(y0)에서 각 요소까지의 거리. */
  readonly dy: { readonly stage: number; readonly pipe: number; readonly list: number; readonly tag: number };
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly note: { readonly y: number; readonly text: string } | null;
  readonly text: { readonly title: number; readonly name: number; readonly unit: number; readonly tag: number };
};

// 데스크톱: OBS 100–290 · 관 290–1530 · 서버 1530–1820. 영상 막대(6청크 폭)가 관의 대부분을 차지한다.
const DESKTOP: Layout = {
  obs: { x: 100, w: 190 },
  pipe: { x: 290, w: 1240, h: 96 },
  serverW: 290,
  unitH: 72,
  listH: 64,
  chunkW: 150,
  gap: 12,
  smallW: { audio: 150, control: 120 },
  videoSlotW: 250,
  stageGap: 12,
  rowYs: [128, 556],
  dy: { stage: 64, pipe: 154, list: 282, tag: 360 },
  title: [{ y: 36, text: "큰 영상 메시지 사이에 끼어드는 작은 메시지" }],
  note: { y: 1004, text: "청크 크기 기본 128바이트 · Set Chunk Size로 바꿈" },
  text: { title: TEXT.title, name: TEXT.label, unit: TEXT.small, tag: TEXT.small },
};

// 휴대폰판: OBS 40–200 · 관 200–900 · 서버 900–1040. 글자 48px 이상.
const MOBILE: Layout = {
  obs: { x: 40, w: 160 },
  pipe: { x: 200, w: 700, h: 100 },
  serverW: 140,
  unitH: 76,
  listH: 72,
  chunkW: 84,
  gap: 10,
  smallW: { audio: 170, control: 124 },
  videoSlotW: 290,
  stageGap: 12,
  rowYs: [250, 770],
  dy: { stage: 78, pipe: 172, list: 306, tag: 396 },
  title: [
    { y: 64, text: "큰 영상 메시지 사이에" },
    { y: 136, text: "끼어드는 작은 메시지" },
  ],
  note: null,
  text: { title: MOBILE_TEXT.title, name: MOBILE_TEXT.label, unit: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type RowSpec = {
  readonly name: string;
  readonly units: readonly Unit[];
  /** 받은 순서 칸의 자리 순서. */
  readonly slots: readonly ("video" | SmallId)[];
  readonly result: { readonly text: string; readonly tone: "accent" | "danger" };
  readonly waits: boolean;
};

const small = (l: Layout, id: SmallId): Unit => ({
  id,
  kind: "small",
  label: id === "audio" ? "오디오" : "제어",
  width: l.smallW[id],
});

const chunk = (l: Layout, n: number): Unit => ({ id: `V${n}`, kind: "video", label: `V${n}`, width: l.chunkW });

const rowSpecs = (l: Layout): readonly [RowSpec, RowSpec] => {
  const videoW = CHUNK_COUNT * l.chunkW + (CHUNK_COUNT - 1) * l.gap;
  return [
    {
      name: "통째로 보내면",
      units: [{ id: "video", kind: "video", label: "영상 메시지", width: videoW }, small(l, "audio"), small(l, "control")],
      slots: ["video", "audio", "control"],
      result: { text: "영상 뒤에 도착", tone: "danger" },
      waits: true,
    },
    {
      name: "청크로 쪼개면",
      units: [
        chunk(l, 1), chunk(l, 2), small(l, "audio"), chunk(l, 3),
        chunk(l, 4), small(l, "control"), chunk(l, 5), chunk(l, 6),
      ],
      slots: ["audio", "control", "video"],
      result: { text: "먼저 도착", tone: "accent" },
      waits: false,
    },
  ];
};

/** 칸마다 관 입구를 지나는 시각(enter)과 서버에 다 도착하는 시각(done). 두 줄의 길이가 같아 속도도 같다. */
type Timed = Unit & { readonly enter: number; readonly done: number };

const schedule = (l: Layout, units: readonly Unit[]): { readonly timed: readonly Timed[]; readonly speed: number } => {
  const trainLength = units.reduce((sum, u) => sum + u.width, 0) + (units.length - 1) * l.gap;
  const speed = (l.pipe.w + trainLength) / (FLOW.end - FLOW.start);
  const offsets = units.map((_, i) => units.slice(0, i).reduce((sum, u) => sum + u.width + l.gap, 0));
  const timed = units.map((u, i) => {
    const enter = FLOW.start + offsets[i] / speed;
    return { ...u, enter, done: enter + (l.pipe.w + u.width) / speed };
  });
  return { timed, speed };
};

const UNIT_STYLE = {
  video: { background: COLOR.white, border: `3px solid ${COLOR.ink}`, color: COLOR.ink },
  small: { background: COLOR.accentSoft, border: `4px solid ${COLOR.accent}`, color: COLOR.accent },
} as const;

type BoxProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly kind: Unit["kind"];
  readonly label: string;
  readonly size: number;
  readonly opacity?: number;
  readonly scale?: number;
};

/** 메시지 · 청크 칸 하나. */
const Box: React.FC<BoxProps> = ({ x, y, w, h, kind, label, size, opacity = 1, scale = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 12,
      boxSizing: "border-box",
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 700,
      whiteSpace: "nowrap",
      opacity,
      transform: `scale(${scale})`,
      ...UNIT_STYLE[kind],
    }}
  >
    {label}
  </div>
);

/** 반쯤 들어온 긴 막대도 이름이 보이도록, 보이는 폭이 이만큼 이상이면 이름을 보이는 부분 가운데에 둔다. */
const STICKY_MIN = 240;

/**
 * 관 안에서 [clipLeft, clipRight] 밖은 잘라 그린다(OBS 에서 나오고 서버로 들어가는 것처럼).
 * sticky 면 이름을 칸 전체가 아니라 보이는 부분 가운데에 둔다(긴 영상 막대).
 */
const ClippedBox: React.FC<
  BoxProps & { readonly clipLeft: number; readonly clipRight: number; readonly sticky: boolean }
> = ({ clipLeft, clipRight, sticky, ...box }) => {
  const left = Math.max(box.x, clipLeft);
  const right = Math.min(box.x + box.w, clipRight);
  if (right <= left) return null;
  const width = right - left;
  return (
    <div style={{ position: "absolute", left, top: box.y, width, height: box.h, overflow: "hidden" }}>
      <Box {...box} x={box.x - left} y={0} label={sticky ? "" : box.label} />
      {sticky && width >= STICKY_MIN ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: FONT,
            fontSize: box.size,
            fontWeight: 700,
            whiteSpace: "nowrap",
            color: COLOR.ink,
            opacity: progress(width, STICKY_MIN, 40, (t) => t),
          }}
        >
          {box.label}
        </div>
      ) : null}
    </div>
  );
};

/** OBS · 서버 상자. */
const Endpoint: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly label: string;
  readonly size: number;
  readonly opacity: number;
}> = ({ x, y, w, h, label, size, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 18,
      boxSizing: "border-box",
      background: COLOR.white,
      border: `4px solid ${COLOR.ink}`,
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 760,
      color: COLOR.ink,
      opacity,
    }}
  >
    {label}
  </div>
);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

type RowProps = { readonly l: Layout; readonly spec: RowSpec; readonly y0: number; readonly frame: number; readonly intro: number };

/** 관 안을 흐르는 칸들과, 대기 자리에서 내려오는 오디오 · 제어. */
const Flowing: React.FC<RowProps & { readonly timed: readonly Timed[]; readonly speed: number }> = ({
  l, spec, y0, frame, timed, speed,
}) => {
  const pipeRight = l.pipe.x + l.pipe.w;
  const unitY = y0 + l.dy.pipe + (l.pipe.h - l.unitH) / 2;
  const stageY = y0 + l.dy.stage;
  const stageX: Record<SmallId, number> = { audio: l.pipe.x + l.stageGap, control: l.pipe.x + l.smallW.audio + 2 * l.stageGap };
  return (
    <>
      {timed.map((u) => {
        const tail = l.pipe.x + speed * (frame - u.enter) - u.width;
        const box = { y: unitY, w: u.width, h: l.unitH, kind: u.kind, label: u.label, size: l.text.unit };
        if (u.kind === "video") {
          const sticky = u.width > l.chunkW;
          return <ClippedBox key={u.id} {...box} x={tail} clipLeft={l.pipe.x} clipRight={pipeRight} sticky={sticky} />;
        }
        const dropEnd = u.enter + u.width / speed;
        const drop = progress(frame, dropEnd - DROP, DROP, EASE_IN_OUT);
        if (drop >= 1) {
          return <ClippedBox key={u.id} {...box} x={tail} clipLeft={l.pipe.x} clipRight={pipeRight} sticky={false} />;
        }
        const shown = progress(frame, APPEAR[u.id], POP);
        return (
          <Box
            key={u.id}
            {...box}
            x={lerp(stageX[u.id], tail, drop)}
            y={lerp(stageY, unitY, drop)}
            opacity={shown}
            scale={interpolate(shown, [0, 1], [0.85, 1])}
          />
        );
      })}
      {spec.waits ? <WaitTag l={l} y0={y0} frame={frame} timed={timed} speed={speed} /> : null}
    </>
  );
};

/** 1줄: 오디오 · 제어가 대기 자리에 있는 동안 「기다림」. */
const WaitTag: React.FC<{
  readonly l: Layout;
  readonly y0: number;
  readonly frame: number;
  readonly timed: readonly Timed[];
  readonly speed: number;
}> = ({ l, y0, frame, timed, speed }) => {
  const audio = timed.find((u) => u.id === "audio");
  if (!audio) return null;
  const leave = audio.enter + audio.width / speed - DROP;
  const opacity = progress(frame, APPEAR.audio + 6, POP) * (1 - progress(frame, leave, POP));
  const tagH = l.text.tag * 1.2 + 16;
  return (
    <Tag
      x={l.pipe.x + l.smallW.audio + l.smallW.control + 2 * l.stageGap + 24}
      y={y0 + l.dy.stage + (l.unitH - tagH) / 2}
      tone="danger"
      size={l.text.tag}
      opacity={opacity}
    >
      기다림
    </Tag>
  );
};

/** 서버 아래 「받은 순서」 칸: 메시지가 다 도착한 순서대로. */
const Received: React.FC<RowProps & { readonly timed: readonly Timed[] }> = ({ l, spec, y0, frame, intro, timed }) => {
  const listRight = l.pipe.x + l.pipe.w + l.serverW;
  const widths = spec.slots.map((s) => (s === "video" ? l.videoSlotW : l.smallW[s]));
  const total = widths.reduce((a, b) => a + b, 0) + (widths.length - 1) * l.gap;
  const xs = widths.map((_, i) => listRight - total + widths.slice(0, i).reduce((a, b) => a + b + l.gap, 0));
  const y = y0 + l.dy.list;
  const at = (id: string): number => timed.find((u) => u.id === id)?.done ?? Infinity;
  const smallX = spec.slots.flatMap((s, i) => (s === "video" ? [] : [{ x: xs[i], w: widths[i] }]));
  const smallLeft = Math.min(...smallX.map((s) => s.x));
  const smallRight = Math.max(...smallX.map((s) => s.x + s.w));
  const resultShown = progress(frame, Math.max(at("audio"), at("control")) + 2, POP + 4);

  return (
    <>
      <Label
        x={listRight - total - 24}
        y={y + (l.listH - l.text.unit * 1.25) / 2}
        size={l.text.unit}
        color={COLOR.muted}
        weight={650}
        anchor="right"
        opacity={intro}
      >
        받은 순서
      </Label>
      {spec.slots.map((s, i) => {
        if (s === "video") {
          return <VideoSlot key={s} l={l} x={xs[i]} y={y} w={widths[i]} frame={frame} timed={timed} />;
        }
        const shown = progress(frame, at(s), POP);
        return (
          <Box
            key={s}
            x={xs[i]}
            y={y}
            w={widths[i]}
            h={l.listH}
            kind="small"
            label={s === "audio" ? "오디오" : "제어"}
            size={l.text.unit}
            opacity={shown}
            scale={interpolate(shown, [0, 1], [0.85, 1])}
          />
        );
      })}
      <Tag
        x={(smallLeft + smallRight) / 2}
        y={y0 + l.dy.tag}
        tone={spec.result.tone}
        size={l.text.tag}
        anchor="center"
        opacity={resultShown}
        scale={interpolate(resultShown, [0, 1], [0.85, 1])}
      >
        {spec.result.text}
      </Tag>
    </>
  );
};

/** 영상 자리. 통째로면 막대 하나가 한 번에, 청크면 조각이 하나씩 쌓이다가 V6 에서 막대 하나로 합쳐진다. */
const VideoSlot: React.FC<{
  readonly l: Layout;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly frame: number;
  readonly timed: readonly Timed[];
}> = ({ l, x, y, w, frame, timed }) => {
  const parts = timed.filter((u) => u.kind === "video");
  const last = Math.max(...parts.map((u) => u.done));
  const bar = { x, y, w, h: l.listH, kind: "video" as const, label: "영상 메시지", size: l.text.unit };
  if (parts.length === 1) {
    const shown = progress(frame, last, POP);
    return <Box {...bar} opacity={shown} scale={interpolate(shown, [0, 1], [0.85, 1])} />;
  }
  const merged = progress(frame, last, MERGE, EASE_IN_OUT);
  const frameShown = progress(frame, parts[0].done, POP) * (1 - merged);
  const inset = 8;
  const pieceW = (w - inset * 2 - (parts.length - 1) * 4) / parts.length;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: l.listH,
          borderRadius: 12,
          boxSizing: "border-box",
          border: `3px dashed ${COLOR.muted}`,
          opacity: frameShown,
        }}
      />
      {parts.map((u, k) => (
        <div
          key={u.id}
          style={{
            position: "absolute",
            left: x + inset + k * (pieceW + 4),
            top: y + inset,
            width: pieceW,
            height: l.listH - inset * 2,
            borderRadius: 6,
            background: COLOR.ink,
            opacity: progress(frame, u.done, POP) * (1 - merged),
          }}
        />
      ))}
      <Box {...bar} opacity={merged} scale={interpolate(merged, [0, 1], [0.92, 1])} />
    </>
  );
};

const Row: React.FC<RowProps> = (props) => {
  const { l, spec, y0, intro } = props;
  const { timed, speed } = schedule(l, spec.units);
  const pipeY = y0 + l.dy.pipe;
  const boxY = pipeY - 12;
  const boxH = l.pipe.h + 24;
  return (
    <>
      <Label x={l.obs.x} y={y0} size={l.text.name} weight={740} opacity={intro}>
        {spec.name}
      </Label>
      {/* 관: 같은 TCP 연결 하나. */}
      <div
        style={{
          position: "absolute",
          left: l.pipe.x - 4,
          top: pipeY,
          width: l.pipe.w + 8,
          height: l.pipe.h,
          boxSizing: "border-box",
          background: COLOR.surface,
          borderTop: `3px solid ${COLOR.line}`,
          borderBottom: `3px solid ${COLOR.line}`,
          opacity: intro,
        }}
      />
      <Endpoint x={l.obs.x} y={boxY} w={l.obs.w} h={boxH} label="OBS" size={l.text.name} opacity={intro} />
      <Flowing {...props} timed={timed} speed={speed} />
      <Endpoint
        x={l.pipe.x + l.pipe.w}
        y={boxY}
        w={l.serverW}
        h={boxH}
        label="서버"
        size={l.text.name}
        opacity={intro}
      />
      <Received {...props} timed={timed} />
    </>
  );
};

export const ChunkInterleave: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 15);
  const specs = rowSpecs(l);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.obs.x} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}
      {specs.map((spec, r) => (
        <Row key={spec.name} l={l} spec={spec} y0={l.rowYs[r]} frame={frame} intro={intro} />
      ))}
      {l.note ? (
        <Label x={l.obs.x} y={l.note.y} size={TEXT.small} color={COLOR.muted} weight={600} opacity={intro}>
          {l.note.text}
        </Label>
      ) : null}
    </AbsoluteFill>
  );
};
