import { AbsoluteFill } from "remotion";
import { Node, Wire } from "../../components/Flow";
import { Label } from "../../components/Timeline";
import { COLOR, TEXT } from "../../theme";

// 장면 2 — (가) 갈래 나무 vs (나) 한 줄 흐름(정지 그림).
// 콘티: _workspace/blog/rewind-missing-segment/storyboard.md 「(나) 장면」 장면 2.
// 사실 정본: 원고 정리본 3절((가) 의 갈래) · 4-1 표(버그가 나온 갈래 다섯 줄) · 5절 1–7((나) 의 흐름과 출구).
// 붉은 점 = 4-1 표 다섯 줄을 원인 갈래에 하나씩 찍은 것:
//   옮김 갈래 1(시작 자리 추정) · 막힘 갈래 2(저절로 풀림 · 막힘 아래 몰래 재생) · 또 404 갈래 2(알림 누락 · 20초 정지).
// 글자가 많아 휴대폰 폭에서는 못 읽는다 — 캡션이 「갈래 다섯에서 한 줄 + 출구 셋으로」 를 말한다.
// 상자 높이를 정해 두어 꺾은선이 상자 가장자리에 정확히 붙게 한다.

const ONE = 64;
const TWO = 110;
const DIVIDER_X = 920;

type Box = { readonly y: number; readonly h: number };
const mid = (b: Box) => b.y + b.h / 2;
const bottom = (b: Box) => b.y + b.h;

/** 왼쪽 (가) — 뿌리 하나, 줄기에서 갈래 넷, 막힘 아래 출구 하나. */
const TREE = {
  x: 100,
  trunkX: 150,
  branchX: 210,
  width: 660,
  root: { y: 270, h: ONE, text: "조각 404 → 제어면에 묻기" },
  branches: [
    { y: 374, h: ONE, dots: 1, text: "같은 회차 · 준비됨 → 하한 + 여유로 옮김" },
    { y: 468, h: ONE, dots: 0, text: "준비 안 됨 → 기다림" },
    { y: 562, h: TWO, dots: 2, text: "회차 모름 · 응답 실패 · 다른 회차 ·\n라이브 아님 → 막힘" },
    { y: 800, h: ONE, dots: 2, text: "옮긴 자리에서 또 404 → 10초 기다림" },
  ],
  blocked: { x: 270, y: 706, h: ONE, width: 600, text: "막힘 → 다시보기 · 녹화 · 20분 뒤 녹화" },
} as const;

/** 오른쪽 (나) — 한 줄 흐름 넷과 회색 출구 셋. */
const LINE = {
  x: 960,
  width: 450,
  railX: 1020,
  steps: [
    { y: 270, h: ONE, tone: "danger", text: "조각 404" },
    { y: 380, h: ONE, tone: "ink", text: "받기 멈춤" },
    { y: 490, h: ONE, tone: "ink", text: "같은 주소로 목록 다시 받기" },
    { y: 630, h: 180, tone: "accent", text: "목록 기준으로 이어 재생", note: "시작 하한 앞이면 자르고, 밀렸을 때만 알림" },
  ],
  exitX: 1455,
  exitWidth: 385,
  elbowX: 1432,
  exits: [
    { y: 376, h: TWO, from: 2, text: "목록에 끝 표시 →\n다시보기 판정" },
    { y: 506, h: TWO, from: 2, text: "다시 받기 실패 →\n끊김 알림" },
    { y: 666, h: TWO, from: 3, text: "화면 전에 또 404 →\n다시 받지 않고 막힘" },
  ],
} as const;

export const BranchTreeVsLine: React.FC = () => (
  <AbsoluteFill style={{ background: COLOR.white }}>
    <Label x={100} y={70} size={TEXT.title} weight={760}>
      갈래 다섯이 한 줄 흐름 + 출구 셋으로 줄었습니다
    </Label>

    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <line x1={DIVIDER_X} y1={180} x2={DIVIDER_X} y2={1000} stroke={COLOR.line} strokeWidth={4} />
    </svg>

    {/* 왼쪽 (가) 갈래 나무 */}
    <Label x={TREE.x} y={178} size={TEXT.label} weight={760}>
      (가) 제어면에 다시 묻기
    </Label>
    <Wire
      points={[[TREE.trunkX, bottom(TREE.root)], [TREE.trunkX, mid(TREE.branches[3])]]}
      color={COLOR.muted}
      arrow={false}
    />
    {TREE.branches.map((b) => (
      <Wire key={b.y} points={[[TREE.trunkX, mid(b)], [TREE.branchX, mid(b)]]} color={COLOR.muted} />
    ))}
    <Wire
      points={[
        [TREE.branchX + 40, bottom(TREE.branches[2])],
        [TREE.branchX + 40, mid(TREE.blocked)],
        [TREE.blocked.x, mid(TREE.blocked)],
      ]}
      color={COLOR.muted}
    />
    <Node x={TREE.x} y={TREE.root.y} width={520} height={TREE.root.h} tone="danger">
      {TREE.root.text}
    </Node>
    <Node x={TREE.blocked.x} y={TREE.blocked.y} width={TREE.blocked.width} height={TREE.blocked.h}>
      {TREE.blocked.text}
    </Node>
    {TREE.branches.map((b) => (
      <Node key={b.y} x={TREE.branchX} y={b.y} width={TREE.width} height={b.h} dots={b.dots}>
        {b.text}
      </Node>
    ))}
    <div style={{ position: "absolute", left: TREE.x, top: 924, width: 28, height: 28, borderRadius: 999, background: COLOR.danger }} />
    <Label x={TREE.x + 42} y={914} size={TEXT.small} color={COLOR.muted}>
      점 하나 = 리뷰에서 나온 버그 하나
    </Label>

    {/* 오른쪽 (나) 한 줄 흐름 */}
    <Label x={LINE.x} y={178} size={TEXT.label} weight={760}>
      (나) 목록을 다시 받기
    </Label>
    {LINE.steps.slice(1).map((s, i) => (
      <Wire key={s.y} points={[[LINE.railX, bottom(LINE.steps[i])], [LINE.railX, s.y]]} />
    ))}
    {LINE.exits.map((e) => {
      const from = mid(LINE.steps[e.from]);
      return (
        <Wire
          key={e.y}
          points={[[LINE.x + LINE.width, from], [LINE.elbowX, from], [LINE.elbowX, mid(e)], [LINE.exitX, mid(e)]]}
          color={COLOR.muted}
          dashed
        />
      );
    })}
    {LINE.steps.map((s) => (
      <Node
        key={s.y}
        x={LINE.x}
        y={s.y}
        width={LINE.width}
        height={s.h}
        tone={s.tone}
        note={"note" in s ? s.note : undefined}
      >
        {s.text}
      </Node>
    ))}
    {LINE.exits.map((e) => (
      <Node key={e.y} x={LINE.exitX} y={e.y} width={LINE.exitWidth} height={e.h} tone="muted">
        {e.text}
      </Node>
    ))}
  </AbsoluteFill>
);
