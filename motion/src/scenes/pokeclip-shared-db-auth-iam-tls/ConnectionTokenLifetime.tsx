// 콘티: _workspace/blog/pokeclip-shared-db-auth-iam-tls/storyboard.md
// 모션그래픽: 토큰은 로그인 때만 검사된다 — 기존 연결은 만료와 무관, 새 연결은 새 토큰, 캐시한 토큰은 약 20분 뒤 거부.
// 20분은 실험 RDS 1대 · 1회 실측(보장 값 아님) — 캡션이 밝힌다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Art } from "../../components/Art";
import { FlowPath } from "../../components/FlowPath";
import { Label, Playhead, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, TEXT } from "../../theme";

export const CONNECTION_TOKEN_LIFETIME_FRAMES = 360;

const ART = "pokeclip-shared-db-auth-iam-tls";

// 시간 띠: 서명 뒤 0–24분을 x 420–1500 에 놓고, 프레임 30–300 동안 재생점이 지나간다.
const BAR = { left: 420, right: 1500, y: 150 } as const;
const MINUTES = 24;
const CLOCK = { start: 30, end: 300 } as const;
const xOf = (minute: number) => BAR.left + ((BAR.right - BAR.left) * minute) / MINUTES;
const frameOf = (minute: number) => CLOCK.start + ((CLOCK.end - CLOCK.start) * minute) / MINUTES;

// 연결 세 줄. 서버 오른쪽 가장자리(330)에서 RDS 왼쪽 가장자리(1610)까지.
const LANE = { a: 370, b: 500, c: 630 } as const;
const lane = (y: number, endX = 1600) => `M 340 ${y} L ${endX} ${y}`;

const fadeIn = (frame: number, start: number) => progress(frame, start, 12);
const fadeOut = (frame: number, start: number) => 1 - progress(frame, start, 12);

export const ConnectionTokenLifetime: React.FC = () => {
  const frame = useCurrentFrame();
  const minute = Math.min(MINUTES, Math.max(0, ((frame - CLOCK.start) / (CLOCK.end - CLOCK.start)) * MINUTES));
  const expired = frameOf(15);
  const newConn = frameOf(17);
  const cached = frameOf(21);
  return (
    <AbsoluteFill style={{ background: COLOR.surface }}>
      {/* 시간 띠 */}
      <div style={{ position: "absolute", left: BAR.left, top: BAR.y, width: BAR.right - BAR.left, height: 6, background: COLOR.line, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: xOf(15) - 3, top: BAR.y - 14, width: 6, height: 34, background: COLOR.ink, borderRadius: 3 }} />
      <div style={{ position: "absolute", left: xOf(20) - 3, top: BAR.y - 14, width: 6, height: 34, background: COLOR.danger, borderRadius: 3 }} />
      <Label x={BAR.left} y={BAR.y - 70} size={TEXT.small} color={COLOR.muted}>토큰 서명 뒤</Label>
      <Label x={xOf(15)} y={BAR.y + 22} anchor="center" size={TEXT.small} color={COLOR.ink}>15분 공식 만료</Label>
      <Label x={xOf(20)} y={BAR.y - 70} anchor="center" size={TEXT.small} color={COLOR.danger}>~20분 실측 거부</Label>
      <Playhead x={xOf(minute)} top={BAR.y - 18} height={42} />

      <Art src={`${ART}/obj-server.png`} x={80} y={360} width={250} drift={4} />
      <Label x={205} y={640} anchor="center" size={TEXT.small}>사이드카 풀</Label>
      <Art src={`${ART}/obj-db.png`} x={1610} y={370} width={230} drift={4} phase={50} />
      <Label x={1725} y={640} anchor="center" size={TEXT.small}>RDS</Label>

      {/* 연결 1: 0분에 토큰 1 로 로그인 — 만료 뒤에도 연결은 그대로 질의한다 */}
      <FlowPath d={lane(LANE.a)} start={CLOCK.start} drawFrames={20} packets={3} cycleFrames={50} />
      <Tag x={420} y={LANE.a - 70} tone="accent" size={TEXT.small} opacity={fadeIn(frame, CLOCK.start) * fadeOut(frame, expired)}>
        연결 1 · 토큰 1 로그인
      </Tag>
      <Tag x={420} y={LANE.a - 70} tone="muted" size={TEXT.small} opacity={fadeIn(frame, expired)}>
        토큰 1 만료 — 연결 1 은 그대로
      </Tag>

      {/* 연결 2: 17분, 새 연결은 새 토큰으로 */}
      <FlowPath d={lane(LANE.b)} start={newConn} drawFrames={20} packets={2} cycleFrames={50} arrow />
      <Tag x={720} y={LANE.b - 70} tone="accent" size={TEXT.small} opacity={fadeIn(frame, newConn)}>
        연결 2 · 새 토큰 로그인
      </Tag>

      {/* 연결 3: 21분, 토큰 1 을 캐시해 다시 쓰면 RDS 까지 가서(TLS 는 통과) 로그인 단계에서 거부 */}
      <FlowPath d={lane(LANE.c)} start={cached} drawFrames={20} color={COLOR.danger} dashed />
      <Tag x={720} y={LANE.c - 70} tone="danger" size={TEXT.small} opacity={fadeIn(frame, cached)}>
        캐시한 토큰 1 재사용
      </Tag>
      <Tag x={1150} y={LANE.c + 30} tone="danger" size={TEXT.small} opacity={fadeIn(frame, cached + 24)}>
        RDS 가 거부 — PAM 인증 실패
      </Tag>
    </AbsoluteFill>
  );
};
