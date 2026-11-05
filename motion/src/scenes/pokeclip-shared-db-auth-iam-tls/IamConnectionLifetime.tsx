// 콘티: _workspace/blog/pokeclip-shared-db-auth-iam-tls/storyboard.md
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { COLOR, FONT } from "../../theme";

export const IAM_CONNECTION_LIFETIME_FRAMES = 360;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const LifetimeTracks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const expired = frame >= 4 * fps;
  const rejected = frame >= 6 * fps && frame < 8 * fps;
  const renewed = frame >= 8 * fps;
  const connected = frame >= fps;
  const dot = ((frame % (2 * fps)) / (2 * fps)) * 760;
  return <>
    <Label x={120} y={225} size={52} color={COLOR.muted}>로그인 토큰</Label>
    <Tag x={555} y={218} size={52} tone={expired ? "muted" : "accent"}>
      {expired ? "이전 토큰 만료" : "토큰 발급 · 로그인"}
    </Tag>
    <Label x={1190} y={230} size={44} color={COLOR.muted}>공식 유효기간 15분</Label>

    <div style={{ position: "absolute", left: 120, top: 340, width: 1680, height: 170,
      background: COLOR.accentSoft, borderRadius: 24 }} />
    <Label x={155} y={388} size={64}>기존 연결 A</Label>
    <div style={{ position: "absolute", left: 555, top: 423, width: interpolate(frame, [fps, 2 * fps], [0, 820], clamp), height: 10,
      borderRadius: 10, background: COLOR.accent }} />
    {connected && <div style={{position:"absolute", left: 570 + dot, top: 411, width: 34, height: 34,
      borderRadius: 30, background: COLOR.accent }} />}
    <Label x={1430} y={392} size={58} color={COLOR.accent}>{connected ? "쿼리 계속" : "연결 중"}</Label>

    <div style={{ position: "absolute", left: 120, top: 545, width: 1680, height: 170,
      background: rejected ? COLOR.dangerSoft : renewed ? COLOR.accentSoft : COLOR.surface, borderRadius: 24 }} />
    <Label x={155} y={591} size={64}>새 연결 B</Label>
    <Label x={555} y={598} size={52} color={rejected ? COLOR.danger : renewed ? COLOR.accent : COLOR.muted}>
      {renewed ? "새 토큰 발급 → 로그인" : rejected ? "이전 토큰 재사용 → 거부" : "아직 연결하지 않음"}
    </Label>
    <Label x={1430} y={595} size={58} color={renewed ? COLOR.accent : rejected ? COLOR.danger : COLOR.muted}>
      {renewed ? "접속 성공" : rejected ? "접속 실패" : "대기"}
    </Label>
    <Label x={960} y={762} size={48} anchor="center" color={COLOR.ink}>
      {renewed ? "새 물리 연결 직전에 새 토큰을 만든다" : expired ? "토큰이 만료돼도 기존 DB 세션은 끊기지 않는다" : "토큰은 로그인할 때 사용한다"}
    </Label>
  </>;
};

export const IamConnectionLifetime: React.FC = () => (
  <AbsoluteFill style={{background:COLOR.white, fontFamily:FONT}}>
    <Label x={120} y={80} size={72} weight={780}>토큰 수명 ≠ DB 연결 수명</Label>
    <LifetimeTracks />
  </AbsoluteFill>
);
