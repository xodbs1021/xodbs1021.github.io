// 콘티: _workspace/blog/av1-vp9-deep-dive/storyboard.md 「영상 1」
// 맨 위 줄은 부호화(디코딩) 순서: 키 프레임 0 → 숨은 ALTREF 4 → 1 → 2 → 3 → show_existing_frame 으로 4를 다시 표시.
// 가운데 줄은 참조 슬롯 8개(NUM_REF_FRAMES = 8). 아래 줄은 화면에 나오는 순서 0 1 2 3 4.
// 키 프레임은 슬롯 8개를 모두 채우고, ALTREF 4는 show_frame = 0 이라 슬롯에만 들어가고 출력되지 않는다.
// 프레임 1–3은 슬롯 8개 중 7개(REFS_PER_FRAME = 7)를 참조하고 자기도 슬롯 하나에 들어간다.
// 마지막에 show_existing_frame = 1 이 슬롯의 4를 다시 부호화하지 않고 출력한다. 슬롯 배치는 설명용. 개념도.
// 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(Av1RefSlotsMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const AV1_REF_SLOTS_FRAMES = 300;

type Step = {
  readonly start: number;
  readonly label: string;
  readonly sub?: string;
  readonly hidden?: boolean;
  readonly existing?: boolean;
  /** 이 단계 뒤 슬롯 내용 변화: 슬롯 번호 → 프레임 번호. */
  readonly refresh: Readonly<Record<number, number>>;
  /** 참조하는 슬롯(7개). */
  readonly refs?: readonly number[];
  /** 화면에 내보내는 프레임 번호. */
  readonly output?: number;
  readonly status: readonly [string, string];
};

const SEVEN = [0, 1, 2, 3, 4, 5, 6] as const;
const STEPS: readonly Step[] = [
  { start: 18, label: "0", sub: "KEY", refresh: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }, output: 0, status: ["KEY_FRAME", "슬롯 8개를 모두 채움"] },
  { start: 66, label: "4", sub: "ALTREF", hidden: true, refresh: { 6: 4 }, refs: SEVEN, status: ["show_frame=0", "슬롯에만 넣고 출력 안 함"] },
  { start: 114, label: "1", refresh: { 1: 1 }, refs: SEVEN, output: 1, status: ["프레임 1–3", "참조 이름 7개로 슬롯 참조"] },
  { start: 148, label: "2", refresh: { 2: 2 }, refs: SEVEN, output: 2, status: ["프레임 1–3", "참조 이름 7개로 슬롯 참조"] },
  { start: 182, label: "3", refresh: { 3: 3 }, refs: SEVEN, output: 3, status: ["프레임 1–3", "참조 이름 7개로 슬롯 참조"] },
  { start: 222, label: "4", sub: "다시 표시", existing: true, refresh: {}, output: 4, status: ["show_existing_frame=1", "슬롯의 프레임을 그대로 출력"] },
];
const STEP_LEN = 32;
const SHOW_SLOT = 6;

type Row = { readonly x0: number; readonly y: number; readonly w: number; readonly h: number; readonly gap: number };
type Layout = {
  readonly stream: Row;
  readonly slots: Row;
  readonly out: Row;
  readonly labelGap: number;
  readonly statusY: number;
  readonly center: number;
  readonly text: { readonly big: number; readonly label: number; readonly small: number };
};

const DESKTOP: Layout = {
  stream: { x0: 260, y: 140, w: 200, h: 150, gap: 40 },
  slots: { x0: 272, y: 430, w: 150, h: 120, gap: 25 },
  out: { x0: 380, y: 690, w: 200, h: 130, gap: 40 },
  labelGap: 62,
  statusY: 880,
  center: 960,
  text: { big: 64, label: TEXT.label, small: TEXT.small },
};

const MOBILE: Layout = {
  stream: { x0: 60, y: 170, w: 140, h: 150, gap: 24 },
  slots: { x0: 52, y: 490, w: 108, h: 116, gap: 16 },
  out: { x0: 80, y: 780, w: 160, h: 140, gap: 30 },
  labelGap: 76,
  statusY: 1020,
  center: 540,
  text: { big: 64, label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const at = (r: Row, i: number): number => r.x0 + i * (r.w + r.gap);

const Box: React.FC<{
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  readonly tone: "now" | "done" | "idle" | "ref"; readonly dashed?: boolean; readonly opacity?: number;
  readonly children?: React.ReactNode;
}> = ({ x, y, w, h, tone, dashed = false, opacity = 1, children }) => {
  const style = {
    now: { background: COLOR.accent, border: COLOR.accent, color: COLOR.white },
    ref: { background: COLOR.accentSoft, border: COLOR.accent, color: COLOR.ink },
    done: { background: COLOR.surface, border: COLOR.ink, color: COLOR.ink },
    idle: { background: COLOR.white, border: COLOR.line, color: COLOR.muted },
  }[tone];
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box",
        border: `5px ${dashed ? "dashed" : "solid"} ${style.border}`, borderRadius: 16,
        background: style.background, color: style.color, opacity, fontFamily: FONT,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
};

export const Av1RefSlots: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 14);
  // 마지막 단계(show_existing_frame)는 끝까지 강조해 포스터에서도 보이게 한다.
  const currentIdx = STEPS.findIndex((s, i) => frame >= s.start && (frame < s.start + STEP_LEN || i === STEPS.length - 1));
  const lastIdx = STEPS.reduce((acc, s, i) => (frame >= s.start ? i : acc), -1);
  const current = currentIdx >= 0 ? STEPS[currentIdx] : undefined;

  const slotContent: (number | undefined)[] = Array.from({ length: 8 }, () => undefined);
  const slotChanged: number[] = Array.from({ length: 8 }, () => -1);
  STEPS.forEach((s, i) => {
    if (frame >= s.start + 12) {
      for (const [slot, f] of Object.entries(s.refresh)) {
        slotContent[Number(slot)] = f;
        slotChanged[Number(slot)] = i;
      }
    }
  });
  const shown = STEPS.filter((s) => s.output !== undefined && frame >= s.start + 14).map((s) => s.output as number);
  const status = lastIdx >= 0 ? STEPS[lastIdx].status : undefined;
  const statusOn = lastIdx >= 0 ? progress(frame, STEPS[lastIdx].start, 10) : 0;
  const showArrow = progress(frame, STEPS[5].start + 4, 16);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={l.stream.x0} y={l.stream.y - l.labelGap} size={l.text.label} weight={760} opacity={intro}>부호화 순서</Label>
      <Label x={l.slots.x0} y={l.slots.y - l.labelGap} size={l.text.label} weight={760} opacity={intro}>참조 슬롯 8개</Label>
      <Label x={l.out.x0} y={l.out.y - l.labelGap} size={l.text.label} weight={760} opacity={intro}>화면에 나오는 순서</Label>

      {STEPS.map((s, i) => {
        const on = frame >= s.start;
        const tone = i === currentIdx ? "now" : on ? "done" : "idle";
        return (
          <Box key={i} x={at(l.stream, i)} y={l.stream.y} w={l.stream.w} h={l.stream.h} tone={tone}
            dashed={s.hidden === true || s.existing === true} opacity={intro}>
            <div style={{ fontSize: l.text.big, fontWeight: 820, lineHeight: 1 }}>{s.label}</div>
            {s.sub && layout === "desktop" ? <div style={{ fontSize: l.text.small, fontWeight: 650, marginTop: 8 }}>{s.sub}</div> : null}
          </Box>
        );
      })}

      {slotContent.map((f, i) => {
        const refNow = current?.refs?.includes(i) === true && frame >= (current?.start ?? 0) + 4;
        const justChanged = slotChanged[i] === currentIdx && currentIdx >= 0;
        const isShowSlot = currentIdx === 5 && i === SHOW_SLOT;
        const tone = justChanged || isShowSlot ? "now" : refNow ? "ref" : f === undefined ? "idle" : "done";
        return (
          <Box key={i} x={at(l.slots, i)} y={l.slots.y} w={l.slots.w} h={l.slots.h} tone={tone} opacity={intro}>
            <div style={{ fontSize: l.text.big, fontWeight: 800, lineHeight: 1 }}>{f === undefined ? "–" : f}</div>
          </Box>
        );
      })}

      {[0, 1, 2, 3, 4].map((n) => {
        const visible = shown.includes(n);
        const isNow = current?.output === n;
        return (
          <Box key={n} x={at(l.out, n)} y={l.out.y} w={l.out.w} h={l.out.h} tone={visible ? (isNow ? "now" : "done") : "idle"}
            dashed={!visible} opacity={intro}>
            <div style={{ fontSize: l.text.big, fontWeight: 820, lineHeight: 1, opacity: visible ? 1 : 0 }}>{n}</div>
          </Box>
        );
      })}

      {showArrow > 0 ? (
        <Arrow
          x1={at(l.slots, SHOW_SLOT) + l.slots.w / 2}
          y1={l.slots.y + l.slots.h + 8}
          x2={at(l.out, 4) + l.out.w / 2}
          y2={l.out.y - 10}
          color={COLOR.accent}
          draw={showArrow}
        />
      ) : null}

      {status ? (
        <>
          <Tag x={l.center} y={l.statusY} tone="ink" size={l.text.small} anchor="center" opacity={statusOn}>{status[0]}</Tag>
          <Label x={l.center} y={l.statusY + l.text.small * 2.1} size={l.text.small} anchor="center" color={COLOR.ink} opacity={statusOn}>{status[1]}</Label>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
