// 콘티: _workspace/blog/pokeclip-playback-producer-boundaries/storyboard.md 「영상 1」
// 녹화 조각 하나가 ② 원본 · ③ 재포장 · init 세 축으로 갈라져 각자 PUT 뒤 장부 CAS 로 확정된다.
// ③ 은 세션 init 이 확정될 때까지 보류 목록에서 기다린다. 다음 조각의 ③ PUT 이 실패하면 30초마다 도는
// 스위퍼가 그 축만 다시 집는다(PokeClip-mono media/README.md 「③ 축은 어떻게 도나」). 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const THREE_AXIS_UPLOAD_FRAMES = 345;

/** 장면 순서(프레임, 30fps). */
const T = {
  intro: 0,
  go: 20,
  archivePut: 50,
  archiveDone: 78,
  initPut: 62,
  initDone: 100,
  waitArrive: 46,
  release: 104,
  playbackPut: 136,
  playbackDone: 166,
  next: 196,
  nextArchiveDone: 236,
  nextFail: 226,
  sweep: 254,
  retryPut: 272,
  retryDone: 298,
} as const;
const FADE = 10;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly src: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly laneX0: number;
  readonly laneX1: number;
  readonly lanes: { readonly archive: number; readonly playback: number; readonly init: number };
  readonly laneLabel: { readonly x: number; readonly dy: number };
  readonly waitX: number;
  readonly putX: number;
  readonly casX: number;
  readonly doneX: number;
  readonly doneDy: number;
  readonly stopW: number;
  readonly stopH: number;
  readonly sweep: { readonly x: number; readonly y: number; readonly anchor: "left" | "center" };
  readonly fork: { readonly x: number };
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
  readonly copy: {
    readonly src: string;
    readonly next: string;
    readonly archive: string;
    readonly playback: string;
    readonly init: string;
    readonly wait: string;
    readonly put: string;
    readonly cas: string;
    readonly done: string;
    readonly initKept: string;
    readonly fail: string;
    readonly sweep: string;
  };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "조각 하나, 세 축이 따로 확정된다" }],
  src: { x: 120, y: 420, w: 230, h: 110 },
  laneX0: 400,
  laneX1: 1560,
  lanes: { archive: 250, playback: 475, init: 700 },
  laneLabel: { x: 430, dy: -78 },
  waitX: 760,
  putX: 1060,
  casX: 1390,
  doneX: 1600,
  doneDy: -26,
  stopW: 190,
  stopH: 74,
  sweep: { x: 1060, y: 568, anchor: "center" },
  fork: { x: 380 },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
  copy: {
    src: "녹화 조각",
    next: "다음 조각",
    archive: "② 원본",
    playback: "③ 재포장",
    init: "init",
    wait: "init 대기",
    put: "PUT",
    cas: "장부 CAS",
    done: "확정",
    initKept: "이미 확정",
    fail: "PUT 실패",
    sweep: "스위퍼 30초마다 다시 집음",
  },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "조각 하나," },
    { y: 124, text: "세 축이 따로 확정된다" },
  ],
  src: { x: 60, y: 212, w: 300, h: 96 },
  laneX0: 60,
  laneX1: 1020,
  lanes: { archive: 470, playback: 730, init: 1000 },
  laneLabel: { x: 60, dy: -112 },
  waitX: 300,
  putX: 560,
  casX: 820,
  doneX: 820,
  doneDy: 56,
  stopW: 200,
  stopH: 80,
  sweep: { x: 60, y: 1180, anchor: "left" },
  fork: { x: 30 },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  copy: {
    src: "녹화 조각",
    next: "다음 조각",
    archive: "② 원본",
    playback: "③ 재포장",
    init: "init",
    wait: "init 대기",
    put: "PUT",
    cas: "CAS",
    done: "확정",
    initKept: "이미 확정",
    fail: "PUT 실패",
    sweep: "스위퍼 30초마다 다시 집음",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type StopProps = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly label: string;
  readonly size: number;
  readonly tone?: "ink" | "muted" | "accent" | "danger";
  readonly dashed?: boolean;
  readonly opacity?: number;
};

const STOP_TONE = {
  ink: { background: COLOR.white, border: COLOR.ink, color: COLOR.ink },
  muted: { background: COLOR.surface, border: COLOR.muted, color: COLOR.muted },
  accent: { background: COLOR.accentSoft, border: COLOR.accent, color: COLOR.accent },
  danger: { background: COLOR.dangerSoft, border: COLOR.danger, color: COLOR.danger },
} as const;

/** 축 위의 정거장(가운데 x 기준). */
const Stop: React.FC<StopProps> = ({ x, y, w, h, label, size, tone = "ink", dashed = false, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      borderRadius: 14,
      boxSizing: "border-box",
      background: STOP_TONE[tone].background,
      border: `4px ${dashed ? "dashed" : "solid"} ${STOP_TONE[tone].border}`,
      color: STOP_TONE[tone].color,
      display: "grid",
      placeItems: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 720,
      whiteSpace: "nowrap",
      opacity,
    }}
  >
    {label}
  </div>
);

/** 축을 따라 움직이는 패킷. */
const Packet: React.FC<{ x: number; y: number; color: string; opacity: number }> = ({ x, y, color, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: x - 20,
      top: y - 20,
      width: 40,
      height: 40,
      borderRadius: 999,
      background: color,
      boxShadow: `0 0 0 6px ${COLOR.white}`,
      opacity,
    }}
  />
);

/** a→b 를 [start, end] 프레임 동안 움직인 위치. */
const along = (frame: number, start: number, end: number, a: number, b: number) =>
  interpolate(progress(frame, start, end - start, EASE_IN_OUT), [0, 1], [a, b]);

export const ThreeAxisUpload: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const c = l.copy;
  const L = l.lanes;

  const intro = progress(frame, T.intro, 15);
  const first = 1 - progress(frame, T.next - 6, FADE);
  const second = progress(frame, T.next, FADE);

  // 첫 조각.
  const archiveX = frame < T.archivePut ? along(frame, T.go, T.archivePut, l.laneX0, l.putX) : along(frame, T.archivePut + 4, T.archiveDone, l.putX, l.casX);
  const initX = frame < T.initPut ? along(frame, T.go, T.initPut, l.laneX0, l.putX) : along(frame, T.initPut + 8, T.initDone - 6, l.putX, l.casX);
  // 기다리는 패킷과 실패한 패킷은 정거장 이름을 가리지 않게 정거장 왼쪽에 세운다.
  const waitAt = l.waitX - l.stopW / 2 - 26;
  const failAt = l.putX - (l.stopW * 0.7) / 2 - 26;
  const playbackX =
    frame < T.release
      ? along(frame, T.go, T.waitArrive, l.laneX0, waitAt)
      : frame < T.playbackPut
        ? along(frame, T.release, T.playbackPut, waitAt, l.putX)
        : along(frame, T.playbackPut + 4, T.playbackDone - 4, l.putX, l.casX);
  const moving = frame >= T.go ? first : 0;

  const archiveDone = progress(frame, T.archiveDone, FADE) * first;
  const initDone = progress(frame, T.initDone, FADE) * first;
  const playbackDone = progress(frame, T.playbackDone, FADE) * first;
  const waiting = frame >= T.waitArrive && frame < T.release ? 1 : 0;
  const release = progress(frame, T.initDone, FADE) * (1 - progress(frame, T.playbackPut, FADE));

  // 다음 조각: ② 는 바로 확정, ③ 은 PUT 실패 뒤 스위퍼가 다시 집는다. init 은 이미 확정돼 요청하지 않는다.
  const nArchiveX = frame < T.nextArchiveDone - 18 ? along(frame, T.next + 4, T.nextArchiveDone - 18, l.laneX0, l.putX) : along(frame, T.nextArchiveDone - 16, T.nextArchiveDone, l.putX, l.casX);
  const nPlaybackX = frame < T.retryPut ? along(frame, T.next + 4, T.nextFail, l.laneX0, failAt) : along(frame, T.retryPut, T.retryDone - 4, failAt, l.casX);
  const nArchiveDone = progress(frame, T.nextArchiveDone, FADE);
  const fail = progress(frame, T.nextFail, FADE) * (1 - progress(frame, T.retryPut, FADE));
  const sweep = progress(frame, T.sweep, FADE);
  const retryDone = progress(frame, T.retryDone, FADE);

  const laneY = [L.archive, L.playback, L.init];
  const srcMidY = l.src.y + l.src.h / 2;

  const doneTag = (y: number, opacity: number, text: string = c.done, tone: "accent" | "muted" = "accent") => (
    <Tag x={l.doneX} y={y + l.doneDy} tone={tone} size={l.text.tag} opacity={opacity} anchor={layout === "mobile" ? "center" : "left"}>
      {text}
    </Tag>
  );

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={layout === "mobile" ? 60 : 120} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 녹화 조각과 세 갈래. */}
      <Stop
        x={l.src.x + l.src.w / 2}
        y={srcMidY}
        w={l.src.w}
        h={l.src.h}
        label={second > 0.5 ? c.next : c.src}
        size={l.text.label}
        tone="ink"
        opacity={intro}
      />
      <svg style={{ position: "absolute", inset: 0, opacity: intro }} width="100%" height="100%">
        {layout === "mobile" ? (
          <>
            <line x1={l.src.x} y1={srcMidY} x2={l.fork.x} y2={srcMidY} stroke={COLOR.muted} strokeWidth={5} />
            <line x1={l.fork.x} y1={srcMidY} x2={l.fork.x} y2={L.init} stroke={COLOR.muted} strokeWidth={5} />
          </>
        ) : (
          <line x1={l.src.x + l.src.w} y1={srcMidY} x2={l.fork.x} y2={srcMidY} stroke={COLOR.muted} strokeWidth={5} />
        )}
        {layout === "mobile" ? null : <line x1={l.fork.x} y1={L.archive} x2={l.fork.x} y2={L.init} stroke={COLOR.muted} strokeWidth={5} />}
        {laneY.map((y) => (
          <line key={y} x1={l.fork.x} y1={y} x2={l.laneX1} y2={y} stroke={COLOR.line} strokeWidth={8} strokeLinecap="round" />
        ))}
      </svg>

      {/* 축 이름. */}
      {[
        [c.archive, L.archive],
        [c.playback, L.playback],
        [c.init, L.init],
      ].map(([text, y]) => (
        <Label key={String(text)} x={l.laneLabel.x} y={Number(y) + l.laneLabel.dy} size={l.text.label} weight={760} opacity={intro}>
          {text}
        </Label>
      ))}

      {/* 정거장. */}
      {laneY.map((y) => (
        <div key={`stops-${y}`}>
          <Stop x={l.putX} y={y} w={l.stopW * 0.7} h={l.stopH} label={c.put} size={l.text.tag} tone="ink" opacity={intro} />
          <Stop x={l.casX} y={y} w={l.stopW} h={l.stopH} label={c.cas} size={l.text.tag} tone="ink" opacity={intro} />
        </div>
      ))}
      <Stop x={l.waitX} y={L.playback} w={l.stopW} h={l.stopH} label={c.wait} size={l.text.tag} tone="muted" dashed opacity={intro} />

      {/* init 확정이 ③ 대기를 풀어 준다. */}
      <svg style={{ position: "absolute", inset: 0, opacity: release }} width="100%" height="100%">
        <line x1={l.casX} y1={L.init - l.stopH / 2} x2={l.waitX} y2={L.playback + l.stopH / 2} stroke={COLOR.accent} strokeWidth={5} strokeDasharray="14 12" />
      </svg>

      {/* 첫 조각의 패킷. */}
      <Packet x={archiveX} y={L.archive} color={COLOR.ink} opacity={moving * (1 - archiveDone)} />
      <Packet x={initX} y={L.init} color={COLOR.ink} opacity={moving * (1 - initDone)} />
      <Packet x={playbackX} y={L.playback} color={waiting ? COLOR.muted : COLOR.ink} opacity={moving * (1 - playbackDone)} />
      {doneTag(L.archive, archiveDone)}
      {doneTag(L.init, initDone)}
      {doneTag(L.playback, playbackDone)}

      {/* 다음 조각. */}
      <Packet x={nArchiveX} y={L.archive} color={COLOR.ink} opacity={second * (1 - nArchiveDone)} />
      <Packet x={nPlaybackX} y={L.playback} color={fail > 0.5 ? COLOR.danger : COLOR.ink} opacity={second * (1 - retryDone)} />
      {doneTag(L.archive, nArchiveDone)}
      {doneTag(L.init, second, c.initKept, "muted")}
      <Tag x={l.putX} y={L.playback - l.stopH / 2 - 64} tone="danger" size={l.text.tag} anchor="center" opacity={fail}>
        {c.fail}
      </Tag>
      <Tag x={l.sweep.x} y={l.sweep.y} tone="ink" size={l.text.tag} anchor={l.sweep.anchor} opacity={sweep}>
        {c.sweep}
      </Tag>
      {doneTag(L.playback, retryDone)}
    </AbsoluteFill>
  );
};
