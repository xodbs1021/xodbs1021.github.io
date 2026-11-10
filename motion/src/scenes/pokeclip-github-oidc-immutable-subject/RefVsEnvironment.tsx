// 콘티: _workspace/blog/pokeclip-github-oidc-immutable-subject/storyboard.md
// 신뢰 조건이 받는 값을 브랜치 값 → (브랜치 값 + environment 값, Claude Code 잡 꺼 둠) → environment 값으로 옮긴 두 걸음.
// 반복 클립(12초 이하), 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(RefVsEnvironmentMobile).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, type NodeTone } from "../../components/Flow";
import { FlowPath } from "../../components/FlowPath";
import { Label, Tag } from "../../components/Timeline";
import { progress, visibleBetween } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const REF_VS_ENVIRONMENT_FRAMES = 360;

/** 단계가 바뀌는 프레임(30fps). 바뀐 뒤 1초 이상 멈춘다. */
const T = { step1: 115, step2: 230, block: 265 } as const;

type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
type Point = { readonly x: number; readonly y: number };

type Layout = {
  readonly text: { readonly node: number; readonly tag: number };
  readonly steps: readonly [Point, Point, Point];
  readonly conditionLabel: Point;
  readonly condition: Point;
  readonly deploy: Box;
  readonly claude: Box;
  readonly claudeStatus: Point;
  /** 1단계부터 배포 잡 자신의 sub 가 바뀌었음을 알리는 이름표. */
  readonly deployChange: Point;
  readonly gate: Box;
  readonly key: Box;
  readonly blockMark: Point;
  readonly blockTag: Point;
  readonly paths: {
    readonly deploy: string;
    readonly claudePass: string;
    readonly claudeBlock: string;
    readonly gateToKey: string;
  };
};

// 데스크톱: 왼쪽 두 잡 → 가운데 검문(STS · 신뢰 정책) → 오른쪽 임시 자격.
const DESKTOP: Layout = {
  text: { node: TEXT.label, tag: TEXT.small },
  steps: [{ x: 600, y: 96 }, { x: 960, y: 96 }, { x: 1320, y: 96 }],
  conditionLabel: { x: 1060, y: 200 },
  condition: { x: 1060, y: 268 },
  deploy: { x: 120, y: 330, width: 360, height: 130 },
  claude: { x: 120, y: 640, width: 360, height: 130 },
  claudeStatus: { x: 300, y: 820 },
  deployChange: { x: 300, y: 258 },
  gate: { x: 860, y: 470, width: 400, height: 150 },
  key: { x: 1500, y: 470, width: 300, height: 150 },
  blockMark: { x: 790, y: 640 },
  blockTag: { x: 1060, y: 860 },
  paths: {
    deploy: "M 480 395 C 660 395, 700 520, 860 520",
    claudePass: "M 480 705 C 660 705, 700 575, 860 575",
    claudeBlock: "M 480 705 C 600 705, 660 660, 760 645",
    gateToKey: "M 1260 545 L 1500 545",
  },
};

// 휴대폰판: 위에서 아래로 단계 → 신뢰 조건 → 두 잡 → 검문 → 임시 자격. 글자 48px 이상.
const MOBILE: Layout = {
  text: { node: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  steps: [{ x: 210, y: 40 }, { x: 540, y: 40 }, { x: 870, y: 40 }],
  conditionLabel: { x: 540, y: 150 },
  condition: { x: 540, y: 225 },
  deploy: { x: 60, y: 400, width: 440, height: 130 },
  claude: { x: 580, y: 400, width: 440, height: 130 },
  claudeStatus: { x: 880, y: 565 },
  deployChange: { x: 280, y: 314 },
  gate: { x: 240, y: 710, width: 600, height: 150 },
  key: { x: 340, y: 990, width: 400, height: 130 },
  blockMark: { x: 660, y: 645 },
  blockTag: { x: 540, y: 1200 },
  paths: {
    deploy: "M 280 530 C 280 630, 420 640, 420 710",
    claudePass: "M 660 530 L 660 710",
    claudeBlock: "M 660 530 L 660 630",
    gateToKey: "M 540 860 L 540 990",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

const STEP_NAMES = ["PR 279 뒤", "1단계", "2단계"] as const;
const CONDITIONS = ["브랜치 값", "브랜치 값 + environment 값", "environment 값"] as const;
const CLAUDE_STATUS = ["켜짐", "꺼 둠", "다시 켬"] as const;
const NOTES = ["같은 브랜치의 다른 잡도 조건상 통과", "두 값을 받는 동안 다른 잡은 꺼 둠", "environment 없는 잡은 막힘"] as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const RefVsEnvironment: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const step = frame < T.step1 ? 0 : frame < T.step2 ? 1 : 2;
  const claudeTone: NodeTone = step === 1 ? "muted" : "ink";
  // 각 단계 구간에서만 보이는 값(단계가 바뀔 때 겹쳐 사라지고 나타난다).
  const span = (i: number) => {
    const from = [-12, T.step1, T.step2][i];
    const to = [T.step1 + 6, T.step2 + 6, REF_VS_ENVIRONMENT_FRAMES + 30][i];
    return visibleBetween(frame, from, to, 12);
  };

  return (
    <AbsoluteFill style={{ background: COLOR.surface }}>
      {/* 단계 표시: 지난 단계 ink, 지금 단계 accent, 다음 단계 muted. 끝 프레임에도 세 단계가 다 보인다. */}
      {STEP_NAMES.map((name, i) => (
        <Tag key={name} x={L.steps[i].x} y={L.steps[i].y} anchor="center" tone={i === step ? "accent" : i < step ? "ink" : "muted"} size={L.text.tag}>
          {name}
        </Tag>
      ))}

      <Label x={L.conditionLabel.x} y={L.conditionLabel.y} anchor="center" size={L.text.tag}>
        신뢰 조건이 받는 sub
      </Label>
      {CONDITIONS.map((value, i) => (
        <Tag key={value} x={L.condition.x} y={L.condition.y} anchor="center" tone={i === 2 ? "accent" : "ink"} size={L.text.tag} opacity={span(i)}>
          {value}
        </Tag>
      ))}

      {/* 배포 잡: 세 단계 모두 통과한다(강조 경로는 이것 하나). */}
      <FlowPath d={L.paths.deploy} start={-30} color={COLOR.accent} packets={1} cycleFrames={50} packetsFrom={0} arrow />
      <FlowPath d={L.paths.gateToKey} start={-30} color={COLOR.accent} packets={1} cycleFrames={40} packetsFrom={10} arrow />

      {/* Claude Code 잡: PR 279 뒤에는 같은 sub 라 조건상 통과할 수 있었다(점선, 실제 사용 흔적은 없음). */}
      <FlowPath
        d={L.paths.claudePass}
        start={-30}
        dashed
        color={COLOR.muted}
        packetColor={COLOR.ink}
        packets={1}
        cycleFrames={50}
        packetsFrom={20}
        packetsUntil={T.step1 - 20}
        opacity={span(0)}
        arrow
      />
      {/* 2단계: 다시 켠 Claude Code 잡은 environment 가 없어 검문 앞에서 막힌다. */}
      <FlowPath
        d={L.paths.claudeBlock}
        start={T.step2 + 10}
        drawFrames={15}
        color={COLOR.danger}
        packets={1}
        cycleFrames={36}
        packetsFrom={T.step2 + 20}
        packetsUntil={T.block}
      />
      <Tag x={L.blockMark.x} y={L.blockMark.y} anchor="center" tone="danger" size={L.text.tag} opacity={progress(frame, T.block, 12)}>
        ✕
      </Tag>

      <Node {...L.deploy} tone="accent" size={L.text.node}>배포 잡</Node>
      {/* 1단계부터 배포 잡의 sub 도 브랜치 값 → environment 값으로 바뀐다(그래서 두 값이 잠시 필요했다). */}
      <Tag x={L.deployChange.x} y={L.deployChange.y} anchor="center" tone="accent" size={L.text.tag} opacity={progress(frame, T.step1, 12)}>
        브랜치 → environment
      </Tag>
      <Node {...L.claude} tone={claudeTone} size={L.text.node}>Claude Code 잡</Node>
      {CLAUDE_STATUS.map((status, i) => (
        <Tag key={status} x={L.claudeStatus.x} y={L.claudeStatus.y} anchor="center" tone={i === 1 ? "muted" : "ink"} size={L.text.tag} opacity={span(i)}>
          {status}
        </Tag>
      ))}
      <Node {...L.gate} tone="ink" size={L.text.node}>STS · 신뢰 정책</Node>
      <Node {...L.key} tone="accent" size={L.text.node}>임시 자격</Node>

      {NOTES.map((note, i) => (
        <Tag key={note} x={L.blockTag.x} y={L.blockTag.y} anchor="center" tone={i === 2 ? "danger" : "muted"} size={L.text.tag} opacity={span(i)}>
          {note}
        </Tag>
      ))}
    </AbsoluteFill>
  );
};
