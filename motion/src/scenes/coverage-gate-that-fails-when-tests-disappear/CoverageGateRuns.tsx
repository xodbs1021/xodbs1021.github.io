// 콘티: _workspace/blog/coverage-gate-that-fails-when-tests-disappear/storyboard.md 「영상 1」
// 2026-08-18 실제 Actions 실행 세 번(정상 · 테스트 파일 하나 제외 · 임시 커밋 제거 후 재실행).
// 세 번 모두 테스트 스텝 하나가 돌린 9개 패키지 테스트는 ok 이고, index 커버리지만 81.8 → 52.3 → 81.8 로 움직여
// 80% 선 아래로 내려간 둘째 실행에서 커버리지 게이트만 실패한다(PR #77 본문 · Actions 실행 기록).
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Lines } from "../../components/Stations";
import { Label, Tag } from "../../components/Timeline";
import { EASE_IN_OUT, progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const COVERAGE_GATE_RUNS_FRAMES = 330;

/** 실행마다 시작 프레임. 각 실행은 테스트 칸 → 막대 → 게이트 순서로 켜지고, 마지막 실행 뒤 3초 넘게 멈춘다. */
const RUN_START = [12, 104, 196] as const;
const CELL_STEP = 3;
const BAR_AT = 34;
const BAR_LEN = 26;
const GATE_AT = 64;
const TESTS = 9;
const THRESHOLD = 80;

type Run = { readonly header: string; readonly value: number };

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly cols: readonly [number, number, number];
  readonly runs: readonly [Run, Run, Run];
  readonly headerY: number;
  readonly cell: { readonly y: number; readonly size: number; readonly gap: number };
  readonly passY: number;
  readonly passText: string;
  readonly bar: { readonly base: number; readonly top: number; readonly w: number };
  readonly line: { readonly x1: number; readonly x2: number; readonly labelX: number };
  readonly gateLabel: { readonly y: number; readonly text: string } | null;
  /** 휴대폰판은 막대 위 값에 index 를 붙이지 않으므로 막대 이름을 따로 단다. */
  readonly barLabel: { readonly y: number; readonly text: string } | null;
  readonly gateY: number;
  readonly gateText: { readonly pass: string; readonly fail: string };
  readonly text: { readonly title: number; readonly header: number; readonly tag: number; readonly value: number };
};

const DESKTOP: Layout = {
  title: [{ y: 36, text: "테스트는 세 번 다 성공, 게이트만 갈렸다" }],
  titleX: 120,
  cols: [440, 960, 1480],
  runs: [
    { header: "① 정상 실행", value: 81.8 },
    { header: "② 테스트 파일 하나 제외", value: 52.3 },
    { header: "③ 임시 커밋 제거 후 재실행", value: 81.8 },
  ],
  headerY: 140,
  cell: { y: 214, size: 36, gap: 8 },
  passY: 262,
  passText: "9개 패키지 테스트 ok",
  bar: { base: 900, top: 390, w: 180 },
  line: { x1: 250, x2: 1780, labelX: 120 },
  gateLabel: null,
  barLabel: null,
  gateY: 936,
  gateText: { pass: "게이트 통과", fail: "게이트 실패" },
  text: { title: TEXT.title, header: TEXT.small, tag: TEXT.small, value: TEXT.label },
};

const MOBILE: Layout = {
  title: [
    { y: 52, text: "테스트는 세 번 다 성공" },
    { y: 120, text: "게이트만 갈렸다" },
  ],
  titleX: 60,
  cols: [250, 585, 920],
  runs: [
    { header: "① 정상", value: 81.8 },
    { header: "② 파일 제외", value: 52.3 },
    { header: "③ 재실행", value: 81.8 },
  ],
  headerY: 232,
  cell: { y: 312, size: 24, gap: 6 },
  passY: 350,
  passText: "9개 ok",
  bar: { base: 1080, top: 520, w: 150 },
  line: { x1: 160, x2: 1040, labelX: 36 },
  gateLabel: { y: 1104, text: "커버리지 게이트" },
  barLabel: { y: 424, text: "칸 = 패키지 테스트, 막대 = index" },
  gateY: 1184,
  gateText: { pass: "통과", fail: "실패" },
  text: { title: MOBILE_TEXT.title, header: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, value: MOBILE_TEXT.label },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const barTop = (l: Layout, value: number): number => l.bar.base - ((l.bar.base - l.bar.top) * value) / 100;

export const CoverageGateRuns: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 15);
  const lineY = barTop(l, THRESHOLD);
  const cellRow = TESTS * l.cell.size + (TESTS - 1) * l.cell.gap;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {/* 바닥선과 80% 기준선. */}
      <div style={{ opacity: intro }}>
        <Lines
          lines={[
            { x1: l.line.x1, y1: l.bar.base, x2: l.line.x2, y2: l.bar.base, color: COLOR.line, width: 6 },
            { x1: l.line.x1, y1: lineY, x2: l.line.x2, y2: lineY, color: COLOR.ink, width: 5, dashed: true },
          ]}
        />
        <Label x={l.line.labelX} y={lineY - l.text.tag * 0.65} size={l.text.tag} weight={760}>
          80%
        </Label>
        {l.barLabel ? (
          <Label x={540} y={l.barLabel.y} size={l.text.tag} color={COLOR.muted} anchor="center">
            {l.barLabel.text}
          </Label>
        ) : null}
        {l.gateLabel ? (
          <Label x={540} y={l.gateLabel.y} size={l.text.tag} color={COLOR.muted} anchor="center">
            {l.gateLabel.text}
          </Label>
        ) : null}
      </div>

      {l.runs.map((run, i) => {
        const cx = l.cols[i];
        const start = RUN_START[i];
        const active = progress(frame, start, 10);
        const grow = progress(frame, start + BAR_AT, BAR_LEN, EASE_IN_OUT);
        const gate = progress(frame, start + GATE_AT, 10);
        const fails = run.value < THRESHOLD;
        const shownValue = interpolate(grow, [0, 1], [0, run.value]);
        const top = interpolate(grow, [0, 1], [l.bar.base, barTop(l, run.value)]);
        const passed = progress(frame, start + TESTS * CELL_STEP + 4, 8);
        return (
          <div key={run.header}>
            <Label x={cx} y={l.headerY} size={l.text.header} weight={740} anchor="center" opacity={intro} color={active > 0.5 ? COLOR.ink : COLOR.muted}>
              {run.header}
            </Label>

            {/* 패키지 테스트 9개 — 세 실행 모두 ok. */}
            {Array.from({ length: TESTS }, (_, k) => {
              const on = progress(frame, start + k * CELL_STEP, 6);
              return (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: cx - cellRow / 2 + k * (l.cell.size + l.cell.gap),
                    top: l.cell.y,
                    width: l.cell.size,
                    height: l.cell.size,
                    borderRadius: 8,
                    boxSizing: "border-box",
                    border: `3px solid ${on > 0.5 ? COLOR.accent : COLOR.line}`,
                    background: on > 0.5 ? COLOR.accent : COLOR.white,
                    opacity: intro,
                  }}
                />
              );
            })}
            <Label x={cx} y={l.passY} size={l.text.tag} color={COLOR.accent} weight={700} anchor="center" opacity={passed}>
              {l.passText}
            </Label>

            {/* index 커버리지 막대. */}
            <div
              style={{
                position: "absolute",
                left: cx - l.bar.w / 2,
                top,
                width: l.bar.w,
                height: l.bar.base - top,
                borderRadius: "12px 12px 0 0",
                background: fails ? COLOR.danger : COLOR.accent,
                opacity: grow > 0 ? 1 : 0,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: cx,
                top: top - l.text.value * 1.45,
                transform: "translateX(-50%)",
                fontFamily: FONT,
                fontSize: l.text.value,
                fontWeight: 760,
                color: fails ? COLOR.danger : COLOR.ink,
                whiteSpace: "nowrap",
                opacity: grow > 0 ? 1 : 0,
              }}
            >
              {layout === "desktop" ? `index ${shownValue.toFixed(1)}%` : `${shownValue.toFixed(1)}%`}
            </div>

            <Tag x={cx} y={l.gateY} tone={fails ? "danger" : "accent"} size={l.text.tag} anchor="center" opacity={gate}>
              {fails ? l.gateText.fail : l.gateText.pass}
            </Tag>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
