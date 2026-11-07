import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import { useCurrentFrame } from "remotion";
import { progress } from "../lib/motion";
import { COLOR } from "../theme";

// 모션그래픽의 흐름선: 경로가 스스로 그려진 뒤 그 위로 패킷(토큰 · 요청 같은 것)이 흘러간다.
// 2026-10-31 migration-site FlowPath 를 옮겨 왔다. 좌표는 1920×1080 캔버스 전체를 덮는 SVG 의 px 이다.
// 경로(d)는 SVG path 문자열 — 이어지는 장면과 함께 쓰는 좌표는 scenes/<글 slug>/layout.ts 에 둔다.

/** 패킷 한 변(px). */
const PACKET = 16;
/** 경로 끝에서 화살촉 방향을 잴 때 뒤로 물러서는 길이(px). */
const TANGENT_STEP = 2;

type Point = { readonly x: number; readonly y: number };

/** getPointAtLength 는 경로에 따라 null 이나 NaN 좌표를 돌려준다(길이 0 곡선) — (0,0) 으로 대신한다. */
const pointAt = (d: string, length: number): Point => {
  const p = getPointAtLength(d, length);
  return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: 0, y: 0 };
};

type FlowPathProps = {
  readonly d: string;
  /** 선을 그리기 시작하는 프레임. */
  readonly start: number;
  readonly drawFrames?: number;
  readonly color?: string;
  readonly width?: number;
  /** 다 그린 뒤 점선으로 바꿔 흐르게 한다(대기 · 재시도처럼 「아직 안 닿음」 을 나타낼 때). */
  readonly dashed?: boolean;
  readonly opacity?: number;
  /** 경로 위를 도는 패킷 수. 0 이면 선만 그린다. */
  readonly packets?: number;
  /** 패킷 하나가 경로를 한 바퀴 도는 프레임 수. */
  readonly cycleFrames?: number;
  /** 패킷이 흐르기 시작하는 프레임. 안 주면 선을 다 그린 직후. */
  readonly packetsFrom?: number;
  /** 패킷이 멈추는 프레임(막힘 · 거부를 보일 때). */
  readonly packetsUntil?: number;
  readonly packetColor?: string;
  /** 다 그린 뒤 끝에 화살촉을 단다. */
  readonly arrow?: boolean;
};

export const FlowPath: React.FC<FlowPathProps> = ({
  d,
  start,
  drawFrames = 30,
  color = COLOR.accent,
  width = 4,
  dashed = false,
  opacity = 1,
  packets = 0,
  cycleFrames = 60,
  packetsFrom,
  packetsUntil = Infinity,
  packetColor,
  arrow = false,
}) => {
  const frame = useCurrentFrame();
  // 빈 경로 · 길이 0 경로는 그리지 않는다 — getLength · evolvePath 가 던지거나 NaN 을 낸다.
  const length = d.trim() === "" ? 0 : getLength(d);
  if (!Number.isFinite(length) || length <= 0) {
    return null;
  }
  // 0 이하 · 비유한 값은 1프레임으로 — interpolate 는 입력 구간이 엄격히 증가해야 한다.
  const draw = Number.isFinite(drawFrames) ? Math.max(1, drawFrames) : 1;
  const drawn = progress(frame, start, draw);
  const { strokeDasharray, strokeDashoffset } = evolvePath(drawn, d);
  const cycle = Number.isFinite(cycleFrames) ? Math.max(1, cycleFrames) : 1;
  const flowStart = packetsFrom ?? start + draw;
  const flowing = frame >= flowStart && frame < packetsUntil;
  const end = pointAt(d, length);
  const beforeEnd = pointAt(d, Math.max(0, length - TANGENT_STEP));
  const angle = (Math.atan2(end.y - beforeEnd.y, end.x - beforeEnd.x) * 180) / Math.PI;
  const fill = packetColor ?? color;

  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity, overflow: "visible" }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={0.16}
        strokeWidth={width + 10}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed && drawn >= 1 ? "4 14" : strokeDasharray}
        strokeDashoffset={dashed && drawn >= 1 ? -frame * 0.8 : strokeDashoffset}
      />
      {arrow && drawn >= 1 ? (
        <path d="M -14 -10 L 4 0 L -14 10 z" fill={color} transform={`translate(${end.x} ${end.y}) rotate(${angle})`} />
      ) : null}
      {flowing
        ? Array.from({ length: packets }, (_, i) => {
            const t = ((((frame - flowStart) / cycle + i / packets) % 1) + 1) % 1;
            const p = pointAt(d, t * length);
            const fade = Math.min(1, t * 6, (1 - t) * 6);
            return (
              <rect
                key={i}
                x={p.x - PACKET / 2}
                y={p.y - PACKET / 2}
                width={PACKET}
                height={PACKET}
                rx={4}
                fill={fill}
                opacity={fade}
                style={{ filter: `drop-shadow(0 0 8px ${fill})` }}
              />
            );
          })
        : null}
    </svg>
  );
};
