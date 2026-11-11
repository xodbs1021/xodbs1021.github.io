// 콘티: _workspace/blog/pokeclip-scratch-volume-ownership/storyboard.md 「영상 1」
// Docker는 빈 named volume을 처음 붙일 때만 이미지의 같은 경로 내용을 소유권까지 볼륨으로 복사한다.
// 세 칸을 같은 형태로: ① 이미지에 경로 없음 → 볼륨 root:root → UID 10002 쓰기 실패
// ② 이미지에 10002 소유 빈 디렉터리 → 소유권 복사 → 쓰기 성공 ③ 볼륨에 이미 데이터 → 복사 안 함 → 이미지 변경 미반영.
// 근거: https://docs.docker.com/engine/storage/volumes/#mounting-a-volume-over-existing-data
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const VOLUME_FIRST_COPY_FRAMES = 270;

const T = {
  intro: 0,
  copy: 25,
  dot: 30,
  copyTag: 50,
  owner: 64,
  write: 110,
  result: 136,
} as const;
const FADE = 12;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Pos = { readonly x: number; readonly y: number };

// 칸 안 좌표는 모두 칸 원점(origins) 기준이다.
type Layout = {
  readonly title: Pos & { readonly text: string };
  readonly origins: readonly [Pos, Pos, Pos];
  readonly dividers: readonly { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }[];
  readonly image: Box;
  readonly volume: Box;
  /** true면 상자 이름(「이미지」 · 「볼륨」)과 상태를 한 줄에 나란히 쓴다(휴대폰판). */
  readonly inline: boolean;
  readonly writer: Box;
  readonly writerLines: readonly string[];
  readonly copyArrow: { readonly x: number; readonly y1: number; readonly y2: number; readonly bar: number };
  readonly copyTag: Pos;
  readonly writeArrow: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number };
  readonly resultTag: Pos;
  readonly staleText: string;
  readonly dot: number;
  readonly text: { readonly title: number; readonly caption: number; readonly main: number; readonly tag: number };
};

const DESKTOP: Layout = {
  title: { x: 120, y: 40, text: "빈 볼륨이 처음 붙을 때만 이미지의 소유권이 복사됩니다" },
  origins: [
    { x: 120, y: 0 },
    { x: 690, y: 0 },
    { x: 1260, y: 0 },
  ],
  dividers: [
    { x1: 675, y1: 150, x2: 675, y2: 960 },
    { x1: 1245, y1: 150, x2: 1245, y2: 960 },
  ],
  image: { x: 0, y: 150, w: 540, h: 140 },
  volume: { x: 0, y: 440, w: 540, h: 190 },
  inline: false,
  writer: { x: 0, y: 750, w: 420, h: 110 },
  writerLines: ["녹화기 UID 10002"],
  copyArrow: { x: 120, y1: 298, y2: 432, bar: 395 },
  copyTag: { x: 230, y: 335 },
  writeArrow: { x1: 120, y1: 742, x2: 120, y2: 638 },
  resultTag: { x: 0, y: 896 },
  staleText: "이미지 변경 반영 안 됨",
  dot: 16,
  text: { title: TEXT.title, caption: TEXT.small, main: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  title: { x: 60, y: 40, text: "빈 볼륨일 때만 소유권이 복사됩니다" },
  origins: [
    { x: 60, y: 140 },
    { x: 60, y: 540 },
    { x: 60, y: 940 },
  ],
  dividers: [
    { x1: 60, y1: 510, x2: 1020, y2: 510 },
    { x1: 60, y1: 910, x2: 1020, y2: 910 },
  ],
  image: { x: 0, y: 0, w: 600, h: 84 },
  volume: { x: 0, y: 184, w: 520, h: 156 },
  inline: true,
  writer: { x: 620, y: 184, w: 340, h: 156 },
  writerLines: ["녹화기", "UID 10002"],
  copyArrow: { x: 110, y1: 92, y2: 176, bar: 156 },
  copyTag: { x: 230, y: 97 },
  writeArrow: { x1: 612, y1: 262, x2: 528, y2: 262 },
  resultTag: { x: 620, y: 97 },
  staleText: "이미지 미반영",
  dot: 18,
  text: { title: MOBILE_TEXT.title, caption: MOBILE_TEXT.small, main: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type Tone = "ink" | "accent" | "danger" | "muted";

const BOX_STYLE = {
  ink: { border: `3px solid ${COLOR.ink}`, background: COLOR.white },
  accent: { border: `5px solid ${COLOR.accent}`, background: COLOR.accentSoft },
  danger: { border: `5px solid ${COLOR.danger}`, background: COLOR.dangerSoft },
  muted: { border: `3px dashed ${COLOR.muted}`, background: COLOR.surface },
} as const;

const TONE_COLOR = { ink: COLOR.ink, accent: COLOR.accent, danger: COLOR.danger, muted: COLOR.muted } as const;

// 세 칸의 차이. 같은 형태로 그리고 내용과 색만 바꾼다.
type Case = {
  readonly imageMain: string;
  readonly imageTone: "ink" | "muted";
  readonly volumeMain: string;
  readonly copy: "none" | "copy" | "blocked";
  readonly copyText: string;
  readonly owner: string;
  readonly ownerTone: Tone;
  readonly result: "fail" | "ok" | "stale";
};

const CASES: readonly [Case, Case, Case] = [
  {
    imageMain: "경로 없음",
    imageTone: "muted",
    volumeMain: "비어 있음",
    copy: "none",
    copyText: "복사할 것 없음",
    owner: "소유 root:root",
    ownerTone: "ink",
    result: "fail",
  },
  {
    imageMain: "빈 디렉터리 10002",
    imageTone: "ink",
    volumeMain: "비어 있음",
    copy: "copy",
    copyText: "소유권 복사",
    owner: "소유 10002",
    ownerTone: "accent",
    result: "ok",
  },
  {
    imageMain: "빈 디렉터리 10002",
    imageTone: "ink",
    volumeMain: "이전 데이터 있음",
    copy: "blocked",
    copyText: "복사 안 함",
    owner: "소유 그대로",
    ownerTone: "muted",
    result: "stale",
  },
];

const RESULT = {
  fail: { tone: "danger", text: "쓰기 실패" },
  ok: { tone: "accent", text: "쓰기 성공" },
  stale: { tone: "muted", text: "" },
} as const;

export const VolumeFirstCopy: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];

  const intro = progress(frame, T.intro, 15);
  const copyDraw = progress(frame, T.copy, 20);
  const dotRun = progress(frame, T.dot, 26);
  const copyTag = progress(frame, T.copyTag, FADE);
  const owner = progress(frame, T.owner, FADE);
  const writeDraw = progress(frame, T.write, 22);
  const result = progress(frame, T.result, FADE);
  const settled = frame >= T.result;

  const boxFrame = (b: Box, o: Pos, tone: Tone, key: string, children: React.ReactNode) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: o.x + b.x,
        top: o.y + b.y,
        width: b.w,
        height: b.h,
        borderRadius: 16,
        boxSizing: "border-box",
        padding: "10px 22px",
        fontFamily: FONT,
        lineHeight: 1.15,
        letterSpacing: "-0.02em",
        opacity: intro,
        ...BOX_STYLE[tone],
      }}
    >
      {children}
    </div>
  );

  const caption = (text: string) => (
    <span style={{ fontSize: l.text.caption, fontWeight: 650, color: COLOR.muted }}>{text}</span>
  );
  const main = (text: string, tone: Tone) => (
    <span style={{ fontSize: l.text.main, fontWeight: 740, color: TONE_COLOR[tone] }}>{text}</span>
  );

  const cell = (c: Case, o: Pos, i: number) => {
    const res = RESULT[c.result];
    const volumeTone: Tone = settled && c.result !== "stale" ? res.tone : "ink";
    const writeColor = c.result === "fail" ? COLOR.danger : c.result === "ok" ? COLOR.accent : COLOR.muted;
    const a = l.copyArrow;
    const arrowEnd = c.copy === "blocked" ? a.bar - 6 : a.y2;
    const dotEnd = c.copy === "blocked" ? a.bar - l.dot - 8 : a.y2 - l.dot;
    const dotY = o.y + a.y1 + l.dot + (dotEnd - a.y1 - l.dot) * dotRun;
    const dotOpacity = c.copy === "none" ? 0 : Math.min(dotRun * 4, 1) * (c.copy === "blocked" ? 1 - progress(frame, T.copyTag, FADE) : 1 - owner);
    const copyTone: Tone = c.copy === "copy" ? "accent" : "muted";
    const resultText = c.result === "stale" ? l.staleText : res.text;

    return (
      <div key={`cell-${i}`}>
        {boxFrame(l.image, o, c.imageTone, `img-${i}`, (
          l.inline ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", gap: 18 }}>
              {caption("이미지")}
              {main(c.imageMain, c.imageTone)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {caption("이미지")}
              {main(c.imageMain, c.imageTone)}
            </div>
          )
        ))}

        {copyDraw > 0 ? (
          <Arrow
            x1={o.x + a.x}
            y1={o.y + a.y1}
            x2={o.x + a.x}
            y2={o.y + arrowEnd}
            color={c.copy === "copy" ? COLOR.accent : COLOR.muted}
            dashed={c.copy === "none"}
            draw={copyDraw}
          />
        ) : null}
        {c.copy === "blocked" ? (
          <svg style={{ position: "absolute", inset: 0, opacity: copyTag }} width="100%" height="100%">
            <line
              x1={o.x + a.x - 44}
              y1={o.y + a.bar}
              x2={o.x + a.x + 44}
              y2={o.y + a.bar}
              stroke={COLOR.muted}
              strokeWidth={9}
              strokeLinecap="round"
            />
          </svg>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: o.x + a.x - l.dot,
            top: dotY - l.dot,
            width: l.dot * 2,
            height: l.dot * 2,
            borderRadius: 999,
            background: c.copy === "copy" ? COLOR.accent : COLOR.muted,
            opacity: dotOpacity,
          }}
        />
        <Tag x={o.x + l.copyTag.x} y={o.y + l.copyTag.y} tone={copyTone} size={l.text.tag} opacity={copyTag}>
          {c.copyText}
        </Tag>

        {boxFrame(l.volume, o, volumeTone, `vol-${i}`, (
          <div style={{ display: "flex", flexDirection: "column", gap: l.inline ? 10 : 6 }}>
            {l.inline ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
                {caption("볼륨")}
                {main(c.volumeMain, "ink")}
              </div>
            ) : (
              <>
                {caption("볼륨")}
                {main(c.volumeMain, "ink")}
              </>
            )}
            <div style={{ position: "relative", height: l.text.tag * 1.6, opacity: owner }}>
              <Tag x={0} y={0} tone={c.ownerTone} size={l.text.tag}>
                {c.owner}
              </Tag>
            </div>
          </div>
        ))}

        {writeDraw > 0 ? (
          <Arrow
            x1={o.x + l.writeArrow.x1}
            y1={o.y + l.writeArrow.y1}
            x2={o.x + l.writeArrow.x2}
            y2={o.y + l.writeArrow.y2}
            color={writeColor}
            dashed={c.result === "stale"}
            draw={writeDraw}
          />
        ) : null}
        {boxFrame(l.writer, o, "ink", `writer-${i}`, (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {l.writerLines.map((line) => (
              <span key={line} style={{ fontSize: l.text.main, fontWeight: 720, color: COLOR.ink }}>
                {line}
              </span>
            ))}
          </div>
        ))}
        <Tag x={o.x + l.resultTag.x} y={o.y + l.resultTag.y} tone={res.tone} size={l.text.tag} opacity={result}>
          {resultText}
        </Tag>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={l.title.x} y={l.title.y} size={l.text.title} weight={760} opacity={intro}>
        {l.title.text}
      </Label>
      <svg style={{ position: "absolute", inset: 0, opacity: intro }} width="100%" height="100%">
        {l.dividers.map((d) => (
          <line key={`${d.x1}-${d.y1}`} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={COLOR.line} strokeWidth={3} />
        ))}
      </svg>
      {CASES.map((c, i) => cell(c, l.origins[i], i))}
    </AbsoluteFill>
  );
};
