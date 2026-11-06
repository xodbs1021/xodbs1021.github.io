// 콘티: _workspace/blog/pokeclip-shared-db-auth-iam-tls/storyboard.md
// 모션그래픽(motion-explainer 「모션그래픽」 절): 소재 = gpt-image 로 만든 서버 · 토큰 · DB(motion/public/art/<글>/).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Art } from "../../components/Art";
import { FlowPath } from "../../components/FlowPath";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, TEXT } from "../../theme";

export const TOKEN_TO_VERIFIED_DB_FRAMES = 360;

const ART = "pokeclip-shared-db-auth-iam-tls";

// 소재 자리(1920×1080, 아래 840 위로). 경로는 서버 오른쪽 가장자리에서 출발한다.
const SERVER = { x: 140, y: 300, width: 300 } as const;
const REAL_DB = { x: 1460, y: 90, width: 280 } as const;
const OTHER_DB = { x: 1460, y: 470, width: 280 } as const;
const TOKEN = { x: 330, y: 190, width: 150 } as const;

// 위: 인증서 · 호스트 이름이 맞는 RDS 까지 간다. 아래: 다른 서버 앞에서 끊긴다.
const TO_REAL = "M 450 430 C 750 430, 900 230, 1450 230";
const TO_OTHER = "M 450 470 C 700 470, 820 610, 1080 610";

/** 장면 순서(프레임). */
const T = {
  token: 40,
  realPath: 70,
  verified: 95,
  packets: 100,
  login: 160,
  otherDb: 200,
  otherPath: 220,
  otherPackets: 250,
  blocked: 280,
} as const;

const fadeIn = (frame: number, start: number) => progress(frame, start, 12);

export const TokenToVerifiedDb: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: COLOR.surface }}>
      <Art src={`${ART}/obj-server.png`} {...SERVER} />
      <Label x={SERVER.x + SERVER.width / 2} y={615} anchor="center" size={TEXT.label}>
        사이드카
      </Label>

      <Art src={`${ART}/obj-db.png`} {...REAL_DB} enter={10} phase={40} />
      <Label x={REAL_DB.x + REAL_DB.width / 2} y={385} anchor="center" size={TEXT.small}>
        RDS — 인증서 · 이름 일치
      </Label>

      <Art src={`${ART}/obj-token.png`} {...TOKEN} enter={T.token} drift={6} phase={80} />
      <Tag x={TOKEN.x + TOKEN.width / 2} y={120} anchor="center" tone="accent" size={TEXT.small} opacity={fadeIn(frame, T.token + 6)}>
        연결마다 새 토큰
      </Tag>

      <FlowPath d={TO_REAL} start={T.realPath} packets={1} packetsFrom={T.packets} cycleFrames={60} arrow />
      <Tag x={1010} y={150} anchor="center" tone="ink" size={TEXT.small} opacity={fadeIn(frame, T.verified)}>
        verify-full 통과
      </Tag>
      <Tag x={1250} y={300} anchor="center" tone="accent" size={TEXT.small} opacity={fadeIn(frame, T.login)}>
        로그인
      </Tag>

      <Art
        src={`${ART}/obj-db.png`}
        {...OTHER_DB}
        enter={T.otherDb}
        phase={10}
        filter="grayscale(1) opacity(0.55)"
      />
      <Label x={OTHER_DB.x + OTHER_DB.width / 2} y={765} anchor="center" size={TEXT.small} color={COLOR.muted} opacity={fadeIn(frame, T.otherDb + 10)}>
        다른 서버
      </Label>

      <FlowPath
        d={TO_OTHER}
        start={T.otherPath}
        color={COLOR.danger}
        packets={1}
        packetsFrom={T.otherPackets}
        packetsUntil={T.blocked}
        cycleFrames={40}
      />
      <Tag x={1090} y={570} anchor="center" tone="danger" size={TEXT.small} opacity={fadeIn(frame, T.blocked)}>
        ✕
      </Tag>
      <Tag x={1000} y={680} anchor="center" tone="danger" size={TEXT.small} opacity={fadeIn(frame, T.blocked + 6)}>
        인증서 불일치 — 토큰 보내기 전에 끊음
      </Tag>
    </AbsoluteFill>
  );
};
