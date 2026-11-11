// 콘티: _workspace/blog/pokeclip-media-host-restart-lifecycle/storyboard.md 「영상 1」
// 위 줄(고치기 전): 유닛 cgroup에 SIGKILL → 정리가 컨테이너를 내리지 못해 MediaMTX가 옛 비밀을 든 채 헬스 200,
// 렌더된 비밀 파일만 지워짐 → 사이드카 재시작이 bind 원본(파일) 자리에 디렉터리를 만듦 → 다음 기동 실패 반복.
// 아래 줄(고친 뒤): ExecStopPost가 compose down으로 컨테이너를 내림 → 다음 기동이
// create_host_path: false · --force-recreate로 새 비밀 파일과 새 컨테이너를 만든다.
// 같은 네 칸(유닛 · 컨테이너 · bind 원본 · 다음 기동)에서 강조만 옮긴다. 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const CRASH_LEFTOVER_CONTAINER_FRAMES = 360;

const T = {
  intro: 0,
  kill: 20,
  health: 50,
  oldSecret: 75,
  deleted: 105,
  dir: 135,
  fail: 165,
  fixRow: 200,
  kill2: 210,
  down: 240,
  newFile: 270,
  newContainer: 300,
} as const;
const FADE = 12;
const RETRY_PERIOD = 30;
const DIM = 0.3;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Pos = { readonly x: number; readonly y: number };

/** 한 줄의 네 칸: 유닛 · 컨테이너 · bind 원본 · 다음 기동. */
type Row = {
  readonly label: Pos;
  readonly boxes: readonly [Box, Box, Box, Box];
  /** 칸마다 첫 이름표 자리. */
  readonly tags: readonly [Pos, Pos, Pos, Pos];
};

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly before: Row;
  readonly after: Row;
  /** 「옛 비밀」 자리(「헬스 200」 다음). */
  readonly oldSecretTag: Pos;
  /** 「파일 자리에 디렉터리」 자리. 「비밀 파일 삭제」와 같으면 그 이름표를 대신한다. */
  readonly dirTag: Pos;
  readonly separatorY: number;
  readonly separatorX: readonly [number, number];
  readonly tagAnchor: "left" | "center";
  readonly arrows: boolean;
  readonly unitText: string;
  readonly text: { readonly title: number; readonly label: number; readonly node: number; readonly tag: number };
};

const desktopRow = (labelY: number, boxY: number, tagY: number): Row => {
  const boxes = [
    { x: 80, y: boxY, w: 290, h: 110 },
    { x: 480, y: boxY, w: 320, h: 110 },
    { x: 990, y: boxY, w: 320, h: 110 },
    { x: 1500, y: boxY, w: 320, h: 110 },
  ] as const;
  const center = (b: Box) => b.x + b.w / 2;
  return {
    label: { x: 80, y: labelY },
    boxes,
    tags: [
      { x: center(boxes[0]), y: tagY },
      { x: center(boxes[1]), y: tagY },
      { x: center(boxes[2]), y: tagY },
      { x: center(boxes[3]), y: tagY },
    ],
  };
};

const DESKTOP_BEFORE = desktopRow(160, 240, 375);
const DESKTOP_AFTER = desktopRow(615, 690, 825);

const DESKTOP: Layout = {
  title: [{ y: 40, text: "정리를 건너뛰면 옛 컨테이너가 남습니다" }],
  titleX: 80,
  before: DESKTOP_BEFORE,
  after: DESKTOP_AFTER,
  oldSecretTag: { x: DESKTOP_BEFORE.tags[1].x, y: 450 },
  dirTag: { x: DESKTOP_BEFORE.tags[2].x, y: 450 },
  separatorY: 572,
  separatorX: [80, 1840],
  tagAnchor: "center",
  arrows: true,
  unitText: "systemd 유닛",
  text: { title: TEXT.title, label: TEXT.label, node: TEXT.label, tag: TEXT.small },
};

const MOBILE_BOX = { x: 60, w: 300, h: 84 } as const;
const MOBILE_TAG_X = 388;
const MOBILE_PITCH = 100;

const mobileRow = (labelY: number, firstY: number): Row => {
  const ys = [0, 1, 2, 3].map((i) => firstY + i * MOBILE_PITCH);
  const box = (y: number): Box => ({ x: MOBILE_BOX.x, y, w: MOBILE_BOX.w, h: MOBILE_BOX.h });
  const tag = (y: number): Pos => ({ x: MOBILE_TAG_X, y: y + 4 });
  return {
    label: { x: 60, y: labelY },
    boxes: [box(ys[0]), box(ys[1]), box(ys[2]), box(ys[3])],
    tags: [tag(ys[0]), tag(ys[1]), tag(ys[2]), tag(ys[3])],
  };
};

const MOBILE_BEFORE = mobileRow(232, 310);
const MOBILE_AFTER = mobileRow(772, 850);

const MOBILE: Layout = {
  title: [
    { y: 56, text: "정리를 건너뛰면" },
    { y: 124, text: "옛 컨테이너가 남습니다" },
  ],
  titleX: 60,
  before: MOBILE_BEFORE,
  after: MOBILE_AFTER,
  oldSecretTag: { x: 648, y: MOBILE_BEFORE.tags[1].y },
  dirTag: MOBILE_BEFORE.tags[2],
  separatorY: 738,
  separatorX: [60, 1020],
  tagAnchor: "left",
  arrows: false,
  unitText: "유닛",
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, node: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type Tone = "ink" | "accent" | "muted" | "danger";

const BOX_STYLE = {
  ink: { border: `3px solid ${COLOR.ink}`, background: COLOR.white, color: COLOR.ink },
  accent: { border: `5px solid ${COLOR.accent}`, background: COLOR.accentSoft, color: COLOR.ink },
  muted: { border: `3px solid ${COLOR.muted}`, background: COLOR.surface, color: COLOR.muted },
  danger: { border: `5px solid ${COLOR.danger}`, background: COLOR.dangerSoft, color: COLOR.ink },
} as const;

export const CrashLeftoverContainer: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const before = l.before;
  const after = l.after;

  const intro = progress(frame, T.intro, 15);
  const at = (start: number) => progress(frame, start, FADE);
  const reached = (start: number) => frame >= start;

  // 위 줄
  const kill = at(T.kill);
  const health = at(T.health);
  const oldSecret = at(T.oldSecret);
  const deleted = at(T.deleted);
  const dir = at(T.dir);
  const fail = at(T.fail);
  const dirReplacesDeleted = l.dirTag.x === before.tags[2].x && l.dirTag.y === before.tags[2].y;

  // 아래 줄: 차례가 오기 전에는 흐리게 깔아 둔다.
  const afterOpacity = intro * (DIM + (1 - DIM) * progress(frame, T.fixRow, 15));
  const kill2 = at(T.kill2);
  const down = at(T.down);
  const newFile = at(T.newFile);
  const newContainer = at(T.newContainer);

  // 기동 실패 반복: 실패한 뒤 일정 박자로 테두리 고리가 퍼진다.
  const retryPhase = reached(T.fail) ? ((frame - T.fail) % RETRY_PERIOD) / RETRY_PERIOD : 0;
  const retryRing = reached(T.fail + FADE) ? 1 - retryPhase : 0;

  const box = (b: Box, text: string, tone: Tone, opacity: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        borderRadius: 16,
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT,
        fontSize: l.text.node,
        fontWeight: 720,
        whiteSpace: "nowrap",
        opacity,
        ...BOX_STYLE[tone],
      }}
    >
      {text}
    </div>
  );

  const tag = (p: Pos, text: string, tone: "ink" | "accent" | "danger" | "muted", opacity: number) => (
    <Tag x={p.x} y={p.y} tone={tone} size={l.text.tag} anchor={l.tagAnchor} opacity={opacity}>
      {text}
    </Tag>
  );

  const arrowsOf = (row: Row, colors: readonly [string, string, string], opacity: number, key: string) =>
    l.arrows ? (
      <div key={key} style={{ position: "absolute", inset: 0, opacity }}>
        {[0, 1, 2].map((i) => {
          const from = row.boxes[i];
          const to = row.boxes[i + 1];
          const y = from.y + from.h / 2;
          return <Arrow key={i} x1={from.x + from.w + 14} y1={y} x2={to.x - 14} y2={y} color={colors[i]} />;
        })}
      </div>
    ) : null;

  // 위 줄 상태
  const unitBefore: Tone = reached(T.kill) ? "muted" : "ink";
  const bindBefore: Tone = reached(T.dir) ? "danger" : reached(T.deleted) ? "muted" : "ink";
  const bindBeforeText = reached(T.dir) ? "디렉터리" : "비밀 파일";
  const startBefore: Tone = reached(T.fail) ? "danger" : "ink";

  // 아래 줄 상태
  const unitAfter: Tone = reached(T.kill2) ? "muted" : "ink";
  const containerAfter: Tone = reached(T.down) ? "muted" : "ink";
  const bindAfter: Tone = reached(T.newFile) ? "accent" : "ink";
  const startAfter: Tone = reached(T.newContainer) ? "accent" : "ink";
  const startBox = before.boxes[3];
  const ringGrow = 1 + 0.1 * retryPhase;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 위 줄: 고치기 전 */}
      <Label x={before.label.x} y={before.label.y} size={l.text.label} weight={700} opacity={intro}>
        고치기 전
      </Label>
      {arrowsOf(before, [COLOR.ink, COLOR.ink, reached(T.fail) ? COLOR.danger : COLOR.ink], intro, "arrows-before")}
      {box(before.boxes[0], l.unitText, unitBefore, intro, "unit-before")}
      {box(before.boxes[1], "MediaMTX", "ink", intro, "container-before")}
      {box(before.boxes[2], bindBeforeText, bindBefore, intro, "bind-before")}
      {/* 실패 반복 고리 */}
      <div
        style={{
          position: "absolute",
          left: startBox.x,
          top: startBox.y,
          width: startBox.w,
          height: startBox.h,
          borderRadius: 16,
          boxSizing: "border-box",
          border: `4px solid ${COLOR.danger}`,
          transform: `scale(${ringGrow})`,
          opacity: retryRing * 0.8,
        }}
      />
      {box(startBox, "다음 기동", startBefore, intro, "start-before")}

      {tag(before.tags[0], "SIGKILL", "danger", kill)}
      {tag(before.tags[1], "헬스 200", "ink", health)}
      {tag(l.oldSecretTag, "옛 비밀", "danger", oldSecret)}
      {tag(before.tags[2], "비밀 파일 삭제", "muted", dirReplacesDeleted ? deleted * (1 - dir) : deleted)}
      {tag(l.dirTag, "파일 자리에 디렉터리", "danger", dir)}
      {tag(before.tags[3], "기동 실패 반복", "danger", fail)}

      <div
        style={{
          position: "absolute",
          left: l.separatorX[0],
          top: l.separatorY,
          width: l.separatorX[1] - l.separatorX[0],
          height: 3,
          background: COLOR.line,
          opacity: intro,
        }}
      />

      {/* 아래 줄: 고친 뒤 */}
      <div style={{ position: "absolute", inset: 0, opacity: afterOpacity }}>
        <Label x={after.label.x} y={after.label.y} size={l.text.label} weight={700}>
          고친 뒤
        </Label>
        {arrowsOf(
          after,
          [
            reached(T.down) ? COLOR.accent : COLOR.ink,
            reached(T.newFile) ? COLOR.accent : COLOR.ink,
            reached(T.newContainer) ? COLOR.accent : COLOR.ink,
          ],
          1,
          "arrows-after",
        )}
        {box(after.boxes[0], l.unitText, unitAfter, 1, "unit-after")}
        {box(after.boxes[1], "MediaMTX", containerAfter, 1, "container-after")}
        {box(after.boxes[2], reached(T.newFile) ? "새 비밀 파일" : "비밀 파일", bindAfter, 1, "bind-after")}
        {box(after.boxes[3], reached(T.newContainer) ? "새 컨테이너" : "다음 기동", startAfter, 1, "start-after")}

        {tag(after.tags[0], "SIGKILL", "danger", kill2)}
        {tag(after.tags[1], "ExecStopPost → down", "accent", down)}
        {tag(after.tags[2], "create_host_path: false", "accent", newFile)}
        {tag(after.tags[3], "--force-recreate", "accent", newContainer)}
      </div>
    </AbsoluteFill>
  );
};
