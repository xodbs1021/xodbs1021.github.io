// 콘티: _workspace/blog/live-transcoding-infrastructure/storyboard.md 「영상 1」
// 같은 1080p30 합성 입력을 세 화질로 x264 인코딩하는 FFmpeg 프로세스를 3개 · 6개 동시에 돌린 1회차 실측(2026-11-13).
// 재생점이 벽시계 0초에서 56초로 가는 동안, 1080p 조각(2초)이 실제로 완성된 시각에 칸이 찬다.
// 흐린 눈금은 실시간이면 조각이 끝날 수 있는 가장 이른 시각(2k+2초)이다. 3개는 눈금마다 약 0.5초 뒤에 따라오고,
// 6개는 점점 뒤처져 19번째 조각이 14.2초 늦게 나온다. 값은 measure/f1-segment-lateness.txt 그대로.
// 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(SpeedBelowRealtimeMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Playhead, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const SPEED_BELOW_REALTIME_FRAMES = 330;

/** 채널 c1 · 1080p 조각 k(0–18)의 지연(초). 1회차 n3-023551, n6-023756. */
const LATE = {
  three: [0.53, 0.53, 0.53, 0.54, 0.55, 0.53, 0.53, 0.54, 0.53, 0.57, 0.53, 0.53, 0.55, 0.53, 0.54, 0.54, 0.54, 0.54, 0.53],
  six: [1.37, 1.98, 2.26, 3.07, 3.55, 4.07, 4.15, 4.8, 6.11, 7.4, 8.12, 8.74, 9.46, 10.29, 10.77, 11.03, 11.48, 13.2, 14.15],
} as const;
const T_MAX = 56;
const SWEEP = { from: 20, to: 260 } as const;

type Lane = { readonly key: keyof typeof LATE; readonly y: number; readonly name: string; readonly speed: string; readonly tone: "accent" | "danger" };

type Layout = {
  readonly x0: number;
  readonly x1: number;
  readonly axisY: number;
  readonly laneH: number;
  readonly lanes: readonly Lane[];
  readonly text: { readonly label: number; readonly small: number };
  readonly ticks: readonly number[];
  readonly result: (lane: Lane) => { readonly x: number; readonly y: number };
  readonly title: { readonly x: number; readonly y: number };
  readonly legend: { readonly x: number; readonly y: number };
};

const DESKTOP: Layout = {
  x0: 140,
  x1: 1800,
  axisY: 250,
  laneH: 110,
  lanes: [
    { key: "three", y: 420, name: "동시 3개", speed: "speed 1.01", tone: "accent" },
    { key: "six", y: 720, name: "동시 6개", speed: "speed 0.75", tone: "danger" },
  ],
  text: { label: TEXT.label, small: TEXT.small },
  ticks: [0, 10, 20, 30, 40, 50],
  result: (lane) => ({ x: 1100, y: lane.y - 90 }),
  title: { x: 140, y: 80 },
  legend: { x: 140, y: 900 },
};

const MOBILE: Layout = {
  x0: 70,
  x1: 1010,
  axisY: 290,
  laneH: 130,
  lanes: [
    { key: "three", y: 520, name: "동시 3개", speed: "speed 1.01", tone: "accent" },
    { key: "six", y: 930, name: "동시 6개", speed: "speed 0.75", tone: "danger" },
  ],
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
  ticks: [0, 20, 40],
  result: (lane) => ({ x: 70, y: lane.y + 150 }),
  title: { x: 70, y: 70 },
  legend: { x: 70, y: 160 },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const SpeedBelowRealtime: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const sx = (t: number): number => l.x0 + ((l.x1 - l.x0) * t) / T_MAX;
  const now = progress(frame, SWEEP.from, SWEEP.to - SWEEP.from, (x) => x) * T_MAX;
  const intro = progress(frame, 0, 14);
  const done = progress(frame, SWEEP.to, 16);
  const cellW = Math.max(6, ((l.x1 - l.x0) * 1.6) / T_MAX);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Label x={l.title.x} y={l.title.y} size={l.text.label} weight={760} opacity={intro}>
        1080p 조각이 완성된 벽시계 시각
      </Label>
      <Label x={l.legend.x} y={l.legend.y} size={l.text.small} color={COLOR.muted} opacity={intro}>
        회색 눈금 = 실시간이면 조각이 끝나는 시각
      </Label>
      <div style={{ position: "absolute", left: l.x0, top: l.axisY, width: l.x1 - l.x0, height: 4, background: COLOR.line, opacity: intro }} />
      {l.ticks.map((t) => (
        <Label key={t} x={sx(t)} y={l.axisY + 14} size={l.text.small} color={COLOR.muted} anchor="center" opacity={intro}>
          {`${t}초`}
        </Label>
      ))}

      {l.lanes.map((lane) => {
        const color = lane.tone === "accent" ? COLOR.accent : COLOR.danger;
        const soft = lane.tone === "accent" ? COLOR.accentSoft : COLOR.dangerSoft;
        const late = LATE[lane.key];
        const last = late.length - 1;
        const r = l.result(lane);
        return (
          <div key={lane.key}>
            <Label x={l.x0} y={lane.y - l.text.label * 1.7} size={l.text.label} weight={760} opacity={intro}>
              {lane.name}
            </Label>
            <div style={{ position: "absolute", left: l.x0, top: lane.y, width: l.x1 - l.x0, height: l.laneH, borderRadius: 12, background: COLOR.surface, opacity: intro }} />
            {late.map((_, k) => {
              const ideal = 2 * k + 2;
              return (
                <div
                  key={`i${ideal}`}
                  style={{ position: "absolute", left: sx(ideal) - 2, top: lane.y, width: 4, height: l.laneH, background: COLOR.muted, opacity: intro * 0.45 }}
                />
              );
            })}
            {late.map((d, k) => {
              const at = 2 * k + 2 + d;
              const shown = Math.max(0, Math.min(1, (now - at) / 0.8));
              if (shown <= 0) return null;
              return (
                <div
                  key={`s${k}`}
                  style={{
                    position: "absolute",
                    left: sx(at) - cellW / 2,
                    top: lane.y + 14,
                    width: cellW,
                    height: l.laneH - 28,
                    borderRadius: 6,
                    background: k === last ? color : soft,
                    border: `3px solid ${color}`,
                    boxSizing: "border-box",
                    opacity: shown,
                  }}
                />
              );
            })}
            <Tag x={r.x} y={r.y} tone={lane.tone} size={l.text.small} opacity={done}>
              {`${lane.speed} · 19번째 조각 ${late[last].toFixed(1)}초 늦음`}
            </Tag>
          </div>
        );
      })}

      <Playhead x={sx(now)} top={l.axisY - 30} height={l.lanes[1].y + l.laneH - l.axisY + 40} color={COLOR.ink} opacity={intro * (1 - done * 0.6)} />
    </AbsoluteFill>
  );
};
