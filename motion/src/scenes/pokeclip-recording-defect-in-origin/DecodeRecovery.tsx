// 콘티: _workspace/blog/pokeclip-recording-defect-in-origin/storyboard.md 「영상 1」
// 결함 조각(1624)을 만난 재생점이 세 가지 처리에서 어디로 가는가. 위에서부터 차례로 한 줄씩 움직인다.
//   1줄 그대로 둠 — 오류 자리에서 굳는다(오류 알림 없음).
//   2줄 recoverMediaError()만 — 다시 붙일 때마다 같은 자리에서 또 오류, 상한 3회를 넘겨 끊김 덮개.
//   3줄 다시 붙이고 다음 조각 시작으로(B2) — 1625 시작으로 건너뛰어 이어 재생, 1624 나머지 약 5.4초를 잃는다.
// 조각 시작 · 오류 자리는 실험의 hls.js 조각 시작(초)을 비례해 그린다. 반복 클립, 생성 소재 없음.
// layout="mobile" 은 1080×1350 휴대폰판(DecodeRecoveryMobile) — 같은 움직임을 좁은 간격 · 큰 글자로 그린다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Arrow, Label, Playhead, SegmentCell, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const DECODE_RECOVERY_FRAMES = 360;

/** 조각 번호와 시작(초, 재생 목록 기준) · 길이. 1624 는 약 6초, 나머지는 약 4초. */
const SEGMENTS = [
  { seq: 1623, start: 32.925, duration: 4.0 },
  { seq: 1624, start: 36.925, duration: 5.995 },
  { seq: 1625, start: 42.92, duration: 4.01 },
  { seq: 1626, start: 46.93, duration: 4.0 },
] as const;
const DEFECT_INDEX = 1;
const START_AT = 33.5;
/** 복호 오류가 난 자리(1624 시작 + 약 0.4초). */
const ERROR_AT = 37.35;
const NEXT_START = SEGMENTS[DEFECT_INDEX + 1].start;
/** 다시 붙이면 hls.js 가 1624 의 첫 키프레임 근처(약 37.17초)부터 다시 받아 같은 자리까지 다시 푼다. */
const KEYFRAME_AT = 37.17;
/** 3줄이 이어 재생해 멈추는 자리(설명용 — 재생이 계속된다는 것만 보인다). */
const RESUME_END = 47.45;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤 1초 이상 멈춘다. */
const T = {
  intro: 15,
  rows: [
    { move: 15, hit: 60 },
    { move: 80, hit: 125 },
    { move: 210, hit: 250 },
  ],
  loops: [142, 160, 178] as const,
  cover: 198,
  jump: 262,
  jumpLength: 14,
  resumeEnd: 326,
} as const;

type RowCopy = { readonly name: string; readonly done: string };
const ROWS: readonly RowCopy[] = [
  { name: "그대로 둠", done: "그 자리에서 굳음 · 알림 없음" },
  { name: "recoverMediaError()만", done: "같은 자리 오류 4번 → 덮개" },
  { name: "다시 붙이고 다음 조각 시작으로", done: "이어짐 · 5.4초 건너뜀" },
];

type Layout = {
  readonly left: number;
  readonly pxPerSecond: number;
  readonly gap: number;
  readonly cellHeight: number;
  readonly rowYs: readonly [number, number, number];
  readonly nameGap: number;
  /** 상태 이름표 자리 — 데스크톱은 줄 이름과 같은 높이 오른쪽(가운데 x), 휴대폰은 조각 아래(왼쪽 끝). */
  readonly tag: { readonly x: number; readonly dy: number; readonly anchor: "left" | "center" };
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly text: { readonly title: number; readonly name: number; readonly tag: number; readonly cell: number };
};

// 데스크톱: 18초를 SAFE.x(120)부터 약 1800 까지. 줄마다 이름(위) · 조각 · 상태 이름표(아래).
const DESKTOP: Layout = {
  left: 120,
  pxPerSecond: 91,
  gap: 12,
  cellHeight: 100,
  rowYs: [260, 530, 800],
  nameGap: 88,
  tag: { x: 1400, dy: -96, anchor: "center" },
  title: [{ y: 70, text: "결함 조각을 만난 재생점은 어디로 가나" }],
  text: { title: TEXT.title, name: TEXT.label, tag: TEXT.small, cell: TEXT.small },
};

// 휴대폰판: 같은 18초를 60–1020 에. 글자 48px 이상.
const MOBILE: Layout = {
  left: 60,
  pxPerSecond: 52,
  gap: 8,
  cellHeight: 100,
  rowYs: [400, 730, 1060],
  nameGap: 96,
  tag: { x: 60, dy: 136, anchor: "left" },
  title: [
    { y: 84, text: "결함 조각을 만난" },
    { y: 156, text: "재생점은 어디로 가나" },
  ],
  text: { title: MOBILE_TEXT.title, name: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, cell: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 조각 i 의 왼쪽 x. */
const segX = (l: Layout, i: number): number =>
  l.left + SEGMENTS.slice(0, i).reduce((sum, s) => sum + s.duration * l.pxPerSecond + l.gap, 0);

/** 재생 위치(초)의 x. */
const timeX = (l: Layout, t: number): number => {
  const i = SEGMENTS.findIndex((s) => t < s.start + s.duration);
  const index = i < 0 ? SEGMENTS.length - 1 : i;
  const seg = SEGMENTS[index];
  return segX(l, index) + Math.max(0, t - seg.start) * l.pxPerSecond;
};

const segWidth = (l: Layout, i: number): number => SEGMENTS[i].duration * l.pxPerSecond;

/** 줄 r 의 재생 위치(초)와 상태. */
const rowState = (frame: number, r: number) => {
  const { move, hit } = T.rows[r];
  const toError = START_AT + (ERROR_AT - START_AT) * progress(frame, move, hit - move, EASE_IN_OUT);
  const hitNow = frame >= hit;
  const retry = r === 1 ? T.loops.find((f) => frame >= f && frame < f + 10) : undefined;
  if (retry !== undefined) {
    return { t: KEYFRAME_AT + (ERROR_AT - KEYFRAME_AT) * progress(frame, retry, 10), hitNow };
  }
  if (r !== 2 || frame < T.jump + T.jumpLength) {
    return { t: toError, hitNow };
  }
  const resumed = progress(frame, T.jump + T.jumpLength, T.resumeEnd - T.jump - T.jumpLength, EASE_IN_OUT);
  return { t: NEXT_START + (RESUME_END - NEXT_START) * resumed, hitNow };
};

/** 2줄: 다시 붙인 직후 잠깐 정상(ink)이었다가 같은 자리에서 다시 오류. */
const loopCount = (frame: number): number => T.loops.filter((f) => frame >= f).length;
const inRetry = (frame: number): boolean => T.loops.some((f) => frame >= f && frame < f + 10);

export const DecodeRecovery: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, T.intro);
  const errorX = timeX(l, ERROR_AT);
  const nextX = segX(l, DEFECT_INDEX + 1);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.left} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {ROWS.map((row, r) => {
        const rowY = l.rowYs[r];
        const { t, hitNow } = rowState(frame, r);
        const loops = r === 1 ? loopCount(frame) : 0;
        const covered = r === 1 && frame >= T.cover;
        const jumped = r === 2 && frame >= T.jump;
        const resumed = r === 2 && frame >= T.jump + T.jumpLength;
        const failing = hitNow && !resumed && !(r === 1 && inRetry(frame));
        const playheadColor = resumed ? COLOR.accent : failing ? COLOR.danger : COLOR.ink;
        const tagIn = r === 2 ? progress(frame, T.jump + T.jumpLength + 4, 10) : progress(frame, r === 1 ? T.cover : T.rows[0].hit + 6, 10);
        const retryTag = r === 1 && loops > 0 && !covered;
        const skipOverlay = progress(frame, T.jump, T.jumpLength);

        return (
          <div key={row.name}>
            <Label x={l.left} y={rowY - l.nameGap} size={l.text.name} weight={720} opacity={intro}>
              {row.name}
            </Label>

            {SEGMENTS.map((seg, i) => (
              <SegmentCell
                key={seg.seq}
                x={segX(l, i)}
                y={rowY}
                width={segWidth(l, i)}
                height={l.cellHeight}
                state={i === DEFECT_INDEX && hitNow ? "error" : "live"}
                label={`${seg.seq}`}
                size={l.text.cell}
                opacity={intro}
              />
            ))}

            {/* 3줄: 건너뛴 1624 나머지를 흐리게 덮는다. */}
            {r === 2 ? (
              <div
                style={{
                  position: "absolute",
                  left: errorX,
                  top: rowY + 4,
                  width: nextX - l.gap - errorX - 4,
                  height: l.cellHeight - 8,
                  borderRadius: 10,
                  background: COLOR.line,
                  opacity: 0.9 * skipOverlay,
                }}
              />
            ) : null}
            {jumped ? (
              <Arrow
                x1={errorX}
                y1={rowY + l.cellHeight * 0.8}
                x2={nextX + 4}
                y2={rowY + l.cellHeight * 0.8}
                color={COLOR.accent}
                dashed
                draw={progress(frame, T.jump, T.jumpLength)}
              />
            ) : null}

            {/* 2줄: 다시 붙인 횟수 표시(↺ n/3). */}
            {retryTag ? (
              <Tag x={l.tag.x} y={rowY + l.tag.dy} tone="muted" size={l.text.tag} anchor={l.tag.anchor}>
                {`↺ 다시 붙임 ${loops}/3`}
              </Tag>
            ) : null}

            <Tag
              x={l.tag.x}
              y={rowY + l.tag.dy}
              anchor={l.tag.anchor}
              tone={r === 2 ? "accent" : "danger"}
              size={l.text.tag}
              opacity={tagIn}
              scale={interpolate(tagIn, [0, 1], [0.85, 1])}
            >
              {row.done}
            </Tag>

            <Playhead
              x={timeX(l, t)}
              top={rowY - 30}
              height={l.cellHeight + 52}
              color={playheadColor}
              opacity={intro * (covered ? 0.35 : 1)}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
