// 콘티: _workspace/blog/sdl2-compat-textinput-null-push/storyboard.md 「TextInputNull」
// 앱이 SDL2 API 로 넣은 이벤트가 sdl2-compat 의 Event2to3 를 거쳐 SDL3 의 SDL_PushEvent 로 간다.
// 위 줄: SDL_KEYDOWN 은 SDL3 KEY_DOWN 으로 바뀌어 큐에 들어간다.
// 아래 줄: SDL_TEXTINPUT 은 바꿀 짝이 없어 Event2to3 가 NULL 을 돌려주고, 그 NULL 이 그대로 SDL3 로 넘어가
//          첫 필드(timestamp, 오프셋 8)를 읽다 SIGSEGV 로 떨어진다. 주소 0x8 은 lldb 재현 값이다.
// layout="mobile" 은 1080×1350 휴대폰판(TextInputNullMobile) — 단계를 세로로 쌓고 두 줄을 좌우로 둔다. 글자 48px 이상.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const TEXT_INPUT_NULL_FRAMES = 330;

// 위 줄(KEYDOWN): 등장 20 · 이동 40–70 · 변환 75 · 이동 95–125 · 큐 130.
// 아래 줄(TEXTINPUT): 등장 150 · 이동 165–195 · NULL 200 · 이동 222–246 · SIGSEGV 248 · 떨어짐 256–286. 그 뒤 멈춤.
const T = {
  intro: 0,
  keyIn: 20, keyMove1: 40, keyMorph: 75, keyMove2: 95, keyQueued: 130,
  textIn: 150, textMove1: 165, textNull: 200, textMove2: 222, crash: 248, fall: 256,
  move: 30,
} as const;

type Point = readonly [number, number];
type Band = { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly label: string };

type Layout = {
  readonly head: number;
  readonly text: number;
  readonly card: { readonly w: number; readonly h: number };
  readonly bands: readonly [Band, Band, Band];
  /** 줄(0 = KEYDOWN, 1 = TEXTINPUT)마다 세 단계의 카드 가운데 좌표. */
  readonly stops: readonly [readonly [Point, Point, Point], readonly [Point, Point, Point]];
  /** 단계 사이 화살표(줄마다 두 개). */
  readonly arrows: readonly [readonly [Point, Point], readonly [Point, Point]];
  readonly arrowAxis: "x" | "y";
  readonly queuedTag: Point;
  readonly nullTag: Point;
  readonly crashTag: Point;
  readonly fall: Point;
  readonly tilt: number;
};

const DESKTOP: Layout = {
  head: TEXT.label,
  text: TEXT.small,
  card: { w: 440, h: 150 },
  bands: [
    { x: 80, y: 40, w: 520, h: 960, label: "앱 · SDL2 API" },
    { x: 700, y: 40, w: 520, h: 960, label: "sdl2-compat · Event2to3" },
    { x: 1320, y: 40, w: 520, h: 960, label: "SDL3 · SDL_PushEvent" },
  ],
  stops: [
    [[340, 300], [960, 300], [1580, 300]],
    [[340, 700], [960, 700], [1580, 700]],
  ],
  arrows: [[[580, 300], [720, 300]], [[1200, 300], [1340, 300]]],
  arrowAxis: "x",
  queuedTag: [1580, 410],
  nullTag: [960, 810],
  crashTag: [1580, 530],
  fall: [20, 110],
  tilt: 10,
};

const MOBILE: Layout = {
  head: MOBILE_TEXT.label,
  text: MOBILE_TEXT.small,
  card: { w: 440, h: 150 },
  bands: [
    { x: 40, y: 40, w: 1000, h: 360, label: "앱 · SDL2 API" },
    { x: 40, y: 470, w: 1000, h: 380, label: "sdl2-compat · Event2to3" },
    { x: 40, y: 920, w: 1000, h: 400, label: "SDL3 · SDL_PushEvent" },
  ],
  stops: [
    [[290, 245], [290, 685], [290, 1135]],
    [[790, 245], [790, 685], [790, 1135]],
  ],
  arrows: [[[540, 340], [540, 470]], [[540, 790], [540, 920]]],
  arrowAxis: "y",
  queuedTag: [290, 1235],
  nullTag: [790, 785],
  crashTag: [790, 1235],
  fall: [10, -10],
  tilt: 6,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** 세 단계를 두 번 옮겨 가는 카드의 현재 가운데. */
const cardAt = (stops: readonly [Point, Point, Point], frame: number, move1: number, move2: number): Point => {
  const a = progress(frame, move1, T.move, EASE_IN_OUT);
  const b = progress(frame, move2, T.move, EASE_IN_OUT);
  return b > 0 ? lerp(stops[1], stops[2], b) : lerp(stops[0], stops[1], a);
};

export const TextInputNull: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const { w, h } = L.card;

  const intro = progress(frame, T.intro, 20);

  // 위 줄 — KEYDOWN
  const keyIn = progress(frame, T.keyIn, 14);
  const keyPos = cardAt(L.stops[0], frame, T.keyMove1, T.keyMove2);
  const keyMorphed = frame >= T.keyMorph;
  const queued = progress(frame, T.keyQueued, 14);

  // 아래 줄 — TEXTINPUT
  const textIn = progress(frame, T.textIn, 14);
  const textPos = cardAt(L.stops[1], frame, T.textMove1, T.textMove2);
  const isNull = frame >= T.textNull;
  const nullPop = progress(frame, T.textNull, 14);
  const crash = progress(frame, T.crash, 12);
  const fall = progress(frame, T.fall, 30, EASE_IN_OUT);
  const fallen: Point = [textPos[0] + L.fall[0] * fall, textPos[1] + L.fall[1] * fall];
  const tilt = interpolate(fall, [0, 1], [0, L.tilt]);
  // 카드가 떠난 자리에는 원래 이벤트를 옅게 남긴다(끝 프레임만 봐도 출발점이 보이게).
  const keyGhost = progress(frame, T.keyMove1, 12) * 0.55;
  const textGhost = progress(frame, T.textMove1, 12) * 0.55;

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {/* 세 단계 띠 */}
      {L.bands.map((b) => (
        <div
          key={b.label}
          style={{
            position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h,
            borderRadius: 24, background: COLOR.surface, opacity: intro,
          }}
        />
      ))}
      {L.bands.map((b) => (
        <Label key={`${b.label}-head`} x={b.x + 30} y={b.y + 24} size={L.head} weight={760} opacity={intro}>
          {b.label}
        </Label>
      ))}

      {/* 단계 사이 화살표(두 줄이 같은 길) */}
      {L.arrows.map(([p, q]) => (
        <div key={`${p[0]}-${p[1]}`} style={{ position: "absolute", inset: 0, opacity: intro * 0.55 }}>
          <Arrow x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} color={COLOR.muted} />
        </div>
      ))}

      {/* 떠난 자리에 남는 원래 이벤트 */}
      <Node x={L.stops[0][0][0] - w / 2} y={L.stops[0][0][1] - h / 2} width={w} height={h} tone="muted" size={L.text} opacity={keyGhost}>
        {"SDL_KEYDOWN\nSDL2 이벤트"}
      </Node>
      <Node x={L.stops[1][0][0] - w / 2} y={L.stops[1][0][1] - h / 2} width={w} height={h} tone="muted" size={L.text} opacity={textGhost}>
        {"SDL_TEXTINPUT\ntext[32] = \"a\""}
      </Node>

      {/* 위 줄 카드: SDL_KEYDOWN → SDL3 KEY_DOWN */}
      <Node
        x={keyPos[0] - w / 2} y={keyPos[1] - h / 2} width={w} height={h}
        tone={keyMorphed ? "accent" : "ink"} size={L.text} opacity={keyIn}
      >
        {keyMorphed ? "KEY_DOWN\nSDL3 이벤트" : "SDL_KEYDOWN\nSDL2 이벤트"}
      </Node>
      <Tag x={L.queuedTag[0]} y={L.queuedTag[1]} anchor="center" tone="accent" size={L.text} opacity={queued}>
        큐에 들어감
      </Tag>

      {/* 아래 줄 카드: SDL_TEXTINPUT → NULL */}
      <div
        style={{
          position: "absolute", inset: 0,
          transform: `rotate(${tilt}deg)`, transformOrigin: `${fallen[0]}px ${fallen[1]}px`,
          opacity: textIn * (1 - 0.6 * fall),
        }}
      >
        <Node
          x={fallen[0] - w / 2} y={fallen[1] - h / 2} width={w} height={h}
          tone={isNull ? "danger" : "ink"} size={L.text}
        >
          {isNull ? "NULL" : "SDL_TEXTINPUT\ntext[32] = \"a\""}
        </Node>
      </div>
      <Tag
        x={L.nullTag[0]} y={L.nullTag[1]} anchor="center" tone="danger" size={L.text}
        scale={0.9 + 0.1 * nullPop} opacity={nullPop}
      >
        짝 없음 → NULL
      </Tag>
      <Tag
        x={L.crashTag[0]} y={L.crashTag[1]} anchor="center" tone="danger" size={L.text}
        scale={0.9 + 0.1 * crash} opacity={crash}
      >
        SIGSEGV · 주소 0x8
      </Tag>
    </AbsoluteFill>
  );
};
