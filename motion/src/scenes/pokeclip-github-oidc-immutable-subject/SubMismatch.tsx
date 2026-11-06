// 콘티: _workspace/blog/pokeclip-github-oidc-immutable-subject/storyboard.md 「영상 1」
// 모션그래픽(motion-explainer 「모션그래픽」 절): 소재 = gpt-image 로 만든 잡 · 토큰 · 검문 · 열쇠(motion/public/art/<글>/).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Art } from "../../components/Art";
import { FlowPath } from "../../components/FlowPath";
import { Label, Tag } from "../../components/Timeline";
import { progress, visibleBetween } from "../../lib/motion";
import { COLOR, TEXT } from "../../theme";
import { ART, CONDITION_Y, GATE, GATE_CENTER_X, KEY, KEY_CENTER_X, UNDER_Y } from "./layout";

export const SUB_MISMATCH_FRAMES = 360;

const RUNNER = { x: 120, y: 290, width: 300 } as const;
const TOKEN = { x: 300, y: 160, width: 150 } as const;

// 잡 오른쪽 가장자리 → 검문 앞(막힘) / 잡 → 검문 아치 안 → 열쇠(통과).
const TO_GATE = "M 430 430 C 560 430, 680 430, 800 430";
const THROUGH = "M 430 470 C 760 470, 1200 470, 1500 470";

/** 장면 순서(프레임). */
const T = {
  token: 40,
  oldCondition: 60,
  deniedPath: 80,
  denied: 140,
  fix: 200,
  passPath: 220,
  passPackets: 250,
  issued: 300,
} as const;

const fadeIn = (frame: number, start: number) => progress(frame, start, 12);

export const SubMismatch: React.FC = () => {
  const frame = useCurrentFrame();
  const before = visibleBetween(frame, T.oldCondition, T.fix + 10);
  return (
    <AbsoluteFill style={{ background: COLOR.surface }}>
      <Art src={`${ART}/obj-runner.png`} {...RUNNER} />
      <Label x={RUNNER.x + RUNNER.width / 2} y={UNDER_Y} anchor="center" size={TEXT.label}>
        배포 잡
      </Label>

      <Art src={`${ART}/obj-gate.png`} {...GATE} enter={10} phase={40} />
      <Label x={GATE_CENTER_X} y={UNDER_Y} anchor="center" size={TEXT.label}>
        STS · 신뢰 정책
      </Label>

      <Art src={`${ART}/obj-key.png`} {...KEY} enter={20} phase={70} />
      <Label x={KEY_CENTER_X} y={UNDER_Y} anchor="center" size={TEXT.label}>
        임시 자격
      </Label>

      <Art src={`${ART}/obj-token.png`} {...TOKEN} enter={T.token} drift={6} phase={80} />
      <Tag x={375} y={80} anchor="center" tone="ink" size={TEXT.small} opacity={fadeIn(frame, T.token + 6)}>
        토큰 sub: 숫자 ID 형식
      </Tag>

      <Tag x={GATE_CENTER_X} y={CONDITION_Y} anchor="center" tone="muted" size={TEXT.small} opacity={before}>
        신뢰 조건: 이름 형식
      </Tag>
      <Tag x={GATE_CENTER_X} y={CONDITION_Y} anchor="center" tone="accent" size={TEXT.small} opacity={fadeIn(frame, T.fix)}>
        신뢰 조건: 숫자 ID 형식
      </Tag>

      <FlowPath
        d={TO_GATE}
        start={T.deniedPath}
        color={COLOR.danger}
        packets={1}
        packetsUntil={T.denied}
        cycleFrames={40}
        opacity={visibleBetween(frame, T.deniedPath, T.fix + 10)}
      />
      <Tag x={770} y={330} anchor="center" tone="danger" size={TEXT.small} opacity={visibleBetween(frame, T.denied, T.fix + 10)}>
        ✕
      </Tag>
      <Tag x={615} y={500} anchor="center" tone="danger" size={TEXT.small} opacity={visibleBetween(frame, T.denied + 6, T.fix + 10)}>
        AccessDenied
      </Tag>

      <FlowPath d={THROUGH} start={T.passPath} packets={1} packetsFrom={T.passPackets} cycleFrames={50} arrow />
      <Tag x={KEY_CENTER_X} y={210} anchor="center" tone="accent" size={TEXT.small} opacity={fadeIn(frame, T.issued)}>
        임시 자격 발급
      </Tag>
    </AbsoluteFill>
  );
};
