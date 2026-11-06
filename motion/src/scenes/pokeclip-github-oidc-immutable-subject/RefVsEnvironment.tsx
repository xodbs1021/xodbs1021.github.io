// 콘티: _workspace/blog/pokeclip-github-oidc-immutable-subject/storyboard.md 「영상 2」
// 모션그래픽(motion-explainer 「모션그래픽」 절): 소재는 SubMismatch 와 같다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Art } from "../../components/Art";
import { FlowPath } from "../../components/FlowPath";
import { Label, Tag } from "../../components/Timeline";
import { progress, visibleBetween } from "../../lib/motion";
import { COLOR, TEXT } from "../../theme";
import { ART, CONDITION_Y, GATE, GATE_CENTER_X, KEY, KEY_CENTER_X, UNDER_Y } from "./layout";

export const REF_VS_ENVIRONMENT_FRAMES = 360;

const RUN_TOP = { x: 120, y: 100, width: 240 } as const;
const RUN_BOTTOM = { x: 120, y: 450, width: 240 } as const;

// 두 잡 오른쪽 가장자리 → 검문 아치 안 → 열쇠. 아래 잡의 막힘 경로는 검문 앞에서 끝난다.
const TOP_PASS = "M 370 220 C 620 220, 700 440, 960 440 C 1200 440, 1300 440, 1500 440";
const BOTTOM_PASS = "M 370 570 C 620 570, 700 470, 960 470 C 1200 470, 1300 470, 1500 470";
const BOTTOM_BLOCK = "M 370 570 C 600 570, 700 480, 800 480";

/** 장면 순서(프레임). */
const T = {
  refCondition: 50,
  paths: 70,
  packets: 100,
  leak: 140,
  narrow: 190,
  blockPath: 215,
  blocked: 275,
} as const;

const fadeIn = (frame: number, start: number) => progress(frame, start, 12);

export const RefVsEnvironment: React.FC = () => {
  const frame = useCurrentFrame();
  const refPhase = visibleBetween(frame, T.refCondition, T.narrow + 10);
  return (
    <AbsoluteFill style={{ background: COLOR.surface }}>
      <Art src={`${ART}/obj-runner.png`} {...RUN_TOP} />
      <Label x={RUN_TOP.x + RUN_TOP.width / 2} y={355} anchor="center" size={TEXT.label}>
        배포 잡
      </Label>
      <Art src={`${ART}/obj-runner.png`} {...RUN_BOTTOM} enter={8} phase={50} />
      <Label x={RUN_BOTTOM.x + RUN_BOTTOM.width / 2} y={705} anchor="center" size={TEXT.label}>
        Claude Code 잡
      </Label>

      <Art src={`${ART}/obj-gate.png`} {...GATE} enter={14} phase={30} />
      <Label x={GATE_CENTER_X} y={UNDER_Y} anchor="center" size={TEXT.label}>
        STS · 신뢰 정책
      </Label>
      <Art src={`${ART}/obj-key.png`} {...KEY} enter={20} phase={70} />
      <Label x={KEY_CENTER_X} y={UNDER_Y} anchor="center" size={TEXT.label}>
        임시 자격
      </Label>

      <Tag x={GATE_CENTER_X} y={CONDITION_Y} anchor="center" tone="ink" size={TEXT.small} opacity={refPhase}>
        신뢰 조건: develop ref
      </Tag>
      <Tag x={GATE_CENTER_X} y={CONDITION_Y} anchor="center" tone="accent" size={TEXT.small} opacity={fadeIn(frame, T.narrow)}>
        신뢰 조건: environment dev-deploy
      </Tag>

      <FlowPath d={TOP_PASS} start={T.paths} packets={1} packetsFrom={T.packets} cycleFrames={60} arrow />

      <FlowPath
        d={BOTTOM_PASS}
        start={T.paths}
        color={COLOR.danger}
        packets={1}
        packetsFrom={T.packets + 20}
        cycleFrames={60}
        arrow
        opacity={visibleBetween(frame, T.paths, T.narrow + 10)}
      />
      <Tag x={640} y={640} anchor="center" tone="danger" size={TEXT.small} opacity={visibleBetween(frame, T.leak, T.narrow + 10)}>
        조건상 통과
      </Tag>

      <FlowPath
        d={BOTTOM_BLOCK}
        start={T.blockPath}
        color={COLOR.danger}
        packets={1}
        packetsUntil={T.blocked}
        cycleFrames={40}
      />
      <Tag x={780} y={510} anchor="center" tone="danger" size={TEXT.small} opacity={fadeIn(frame, T.blocked)}>
        ✕
      </Tag>
      <Tag x={570} y={640} anchor="center" tone="danger" size={TEXT.small} opacity={fadeIn(frame, T.blocked + 6)}>
        environment 없음 — 막힘
      </Tag>
    </AbsoluteFill>
  );
};
