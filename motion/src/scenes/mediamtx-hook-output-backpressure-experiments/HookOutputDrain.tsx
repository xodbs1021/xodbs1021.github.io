// 콘티: _workspace/blog/mediamtx-hook-output-backpressure-experiments/storyboard.md 「HookOutputDrain」
// 훅 16개(그림에는 6개)가 함께 끝난다. 파이프마다 남은 출력이 로거의 잠금 하나를 지나 파일로 간다.
// 종료 1초 뒤 파이프를 닫고 남은 출력을 버린다(빨강). 41% 는 전체 출력(16 × 50,000줄) 대비. 그 뒤에도 command exited 줄이 잠금을 기다려
// 마지막 기록은 2.7초에 남는다. 41% · 2.7초는 #6380 head 16개 조건 실측 중앙값, 파이프별 잔량은 단순화(재구성).
// layout="mobile" 은 1080×1350 휴대폰판(HookOutputDrainMobile).
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const HOOK_OUTPUT_DRAIN_FRAMES = 330;

/** 훅이 끝나는 프레임과 실제 시간(초) → 프레임 환산. */
const EXIT_FRAME = 36;
const FRAMES_PER_SECOND_REAL = 78;
const CUT_FRAME = EXIT_FRAME + FRAMES_PER_SECOND_REAL; // 종료 후 1초
const LAST_SECONDS = 2.7;
const LAST_FRAME = EXIT_FRAME + Math.round(FRAMES_PER_SECOND_REAL * LAST_SECONDS);
/** 1초에 닿았을 때 파이프에 남은 비율(평균 0.41 — 실측 41%에 맞춘 단순화 값). */
const LEFT_AT_CUT = [0.51, 0.34, 0.51, 0.51, 0.34, 0.25] as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Layout = {
  readonly clock: { readonly x: number; readonly y: number };
  readonly pipe0: Box;
  readonly pipeGap: number;
  readonly logger: Box;
  readonly file: Box;
  readonly loss: { readonly x: number; readonly y: number };
  readonly last: { readonly x: number; readonly y: number };
  readonly cut: { readonly x: number; readonly y: number };
  readonly text: { readonly label: number; readonly small: number };
};

const DESKTOP: Layout = {
  clock: { x: 120, y: 64 },
  pipe0: { x: 120, y: 200, w: 600, h: 64 },
  pipeGap: 40,
  logger: { x: 900, y: 400, w: 380, h: 200 },
  file: { x: 1460, y: 400, w: 340, h: 200 },
  loss: { x: 120, y: 900 },
  last: { x: 1460, y: 900 },
  cut: { x: 760, y: 140 },
  text: { label: TEXT.label, small: TEXT.small },
};

const MOBILE: Layout = {
  clock: { x: 60, y: 64 },
  pipe0: { x: 60, y: 230, w: 480, h: 64 },
  pipeGap: 40,
  logger: { x: 640, y: 290, w: 380, h: 190 },
  file: { x: 640, y: 600, w: 380, h: 170 },
  loss: { x: 60, y: 1010 },
  last: { x: 60, y: 1130 },
  cut: { x: 60, y: 880 },
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const HookOutputDrain: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 14);
  const exitOn = progress(frame, EXIT_FRAME - 6, 10);
  const cutOn = progress(frame, CUT_FRAME, 10);
  const seconds = interpolate(frame, [EXIT_FRAME, LAST_FRAME], [0, LAST_SECONDS], CLAMP);
  const done = progress(frame, LAST_FRAME, 12);
  const pipeY = (i: number) => l.pipe0.y + i * (l.pipe0.h + l.pipeGap);
  const lc = { x: l.logger.x, y: l.logger.y + l.logger.h / 2 };
  // command exited 줄이 잠금을 지나 하나씩 기록된다(1초부터 2.7초 사이에 6개).
  const exitedCount = Math.max(
    0,
    Math.min(LEFT_AT_CUT.length, Math.floor(interpolate(frame, [CUT_FRAME - 30, LAST_FRAME], [0, LEFT_AT_CUT.length], CLAMP))),
  );
  const flowing = frame >= EXIT_FRAME && frame < LAST_FRAME;
  const dot = ((frame % 18) / 18);
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <Label x={l.clock.x} y={l.clock.y} size={l.text.label} weight={780} opacity={intro}>
        {frame < EXIT_FRAME ? "훅 16개가 함께 끝남" : `종료 후 ${seconds.toFixed(1)}초`}
      </Label>
      <Label x={l.pipe0.x} y={l.pipe0.y - l.text.small * 1.5} size={l.text.small} color={COLOR.muted} weight={650} opacity={intro}>
        파이프에 남은 출력(6개만 그림)
      </Label>

      {LEFT_AT_CUT.map((left, i) => {
        const y = pipeY(i);
        // 끝난 순간부터 1초까지 남은 양이 1 → left 로 줄어든다(파이프마다 조금씩 늦게 시작).
        const drained = interpolate(frame, [EXIT_FRAME + i * 4, CUT_FRAME], [1, left], CLAMP);
        const fillW = l.pipe0.w * drained;
        const cut = frame >= CUT_FRAME;
        return (
          <div key={i} style={{ opacity: intro }}>
            <div
              style={{
                position: "absolute", left: l.pipe0.x, top: y, width: l.pipe0.w, height: l.pipe0.h, boxSizing: "border-box",
                border: `3px solid ${COLOR.ink}`, borderRadius: 999, background: COLOR.white, overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: fillW,
                  background: cut ? COLOR.danger : COLOR.accent, opacity: cut ? 1 - 0.55 * cutOn : 1,
                }}
              />
            </div>
            <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
              <line
                x1={l.pipe0.x + l.pipe0.w} y1={y + l.pipe0.h / 2} x2={lc.x} y2={lc.y}
                stroke={COLOR.line} strokeWidth={4}
              />
            </svg>
          </div>
        );
      })}

      <Node x={l.logger.x} y={l.logger.y} width={l.logger.w} height={l.logger.h} tone={flowing ? "accent" : "ink"} size={l.text.label} opacity={intro}>
        {"로거\n잠금 1개"}
      </Node>
      <Node x={l.file.x} y={l.file.y} width={l.file.w} height={l.file.h} tone="ink" size={l.text.label} opacity={intro}>
        파일
      </Node>
      {layout === "desktop" ? (
        <Arrow x1={l.logger.x + l.logger.w} y1={lc.y} x2={l.file.x} y2={l.file.y + l.file.h / 2} color={COLOR.ink} draw={intro} />
      ) : (
        <Arrow x1={l.logger.x + l.logger.w / 2} y1={l.logger.y + l.logger.h} x2={l.file.x + l.file.w / 2} y2={l.file.y} color={COLOR.ink} draw={intro} />
      )}
      {flowing ? (
        layout === "desktop" ? (
          <div style={{ position: "absolute", left: l.logger.x + l.logger.w + dot * (l.file.x - l.logger.x - l.logger.w - 30), top: lc.y - 36, width: 22, height: 22, borderRadius: 6, background: COLOR.accent }} />
        ) : (
          <div style={{ position: "absolute", left: l.logger.x + l.logger.w / 2 + 24, top: l.logger.y + l.logger.h + dot * (l.file.y - l.logger.y - l.logger.h - 30), width: 22, height: 22, borderRadius: 6, background: COLOR.accent }} />
        )
      ) : null}
      <Label x={l.file.x + 24} y={l.file.y + l.file.h + 18} size={l.text.small} weight={700} color={COLOR.accent} opacity={exitOn}>
        {`exited ${exitedCount} / 6`}
      </Label>

      <Tag x={l.cut.x} y={l.cut.y} tone="danger" size={l.text.small} opacity={cutOn}>
        1초: 파이프 닫고 남은 줄 버림
      </Tag>
      <Tag x={l.loss.x} y={l.loss.y} tone="danger" size={l.text.label} opacity={cutOn}>
        전체 줄의 41% 유실
      </Tag>
      <Tag x={l.last.x} y={l.last.y} tone="accent" size={l.text.label} opacity={done}>
        마지막 exited 2.7초
      </Tag>
    </AbsoluteFill>
  );
};
