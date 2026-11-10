// 콘티: _workspace/blog/stream-id-contract-compatible-migration/storyboard.md 「영상 1」
// 두 줄. 위 줄(소비자 먼저): ① 소비자가 ingestStreamId 로 조각을 찾게 배포 → ② 생산자가 새 streamId 발행
// → 조각 조회 정상. 아래 줄(생산자 먼저): ① 생산자가 새 streamId 발행 → 옛 소비자가 경로 칸에 세션 id 를
// 넣어 조회 → 0행. 9월 3일 계약과 소비자 조회 조건을 바탕으로 한 설명용 그림(실제 0행 기록은 없다).
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(줄마다 세로 배치).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, type NodeTone } from "../../components/Flow";
import { Arrow, Label } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const DEPLOY_ORDER_FRAMES = 330;

/** 줄마다 세 걸음. 결과가 선 뒤에는 1초 이상 멈춘다. */
const LANE_START = [12, 126] as const;
const STEP_GAP = 30;
const FADE = 12;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Lane = {
  readonly label: { readonly x: number; readonly y: number; readonly text: string };
  readonly boxes: readonly [Box, Box, Box];
  readonly copy: readonly [string, string, string];
  readonly result: NodeTone;
};

type Layout = {
  readonly dir: "row" | "column";
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly lanes: readonly [Lane, Lane];
  readonly text: { readonly title: number; readonly lane: number; readonly box: number };
};

const row = (y: number): readonly [Box, Box, Box] => [
  { x: 120, y, w: 500, h: 170 },
  { x: 700, y, w: 500, h: 170 },
  { x: 1280, y, w: 520, h: 170 },
];

const column = (y: number): readonly [Box, Box, Box] => [
  { x: 60, y, w: 960, h: 110 },
  { x: 60, y: y + 140, w: 960, h: 110 },
  { x: 60, y: y + 280, w: 960, h: 110 },
];

const DESKTOP: Layout = {
  dir: "row",
  title: [{ y: 52, text: "배포 순서가 조회 결과를 가른다" }],
  titleX: 120,
  lanes: [
    {
      label: { x: 120, y: 190, text: "소비자 먼저" },
      boxes: row(260),
      copy: ["① 소비자 배포\ningestStreamId로 조회", "② 생산자가\n새 streamId 발행", "조각 조회 정상"],
      result: "accent",
    },
    {
      label: { x: 120, y: 600, text: "생산자 먼저" },
      boxes: row(670),
      copy: ["① 생산자가\n새 streamId 발행", "옛 소비자: 경로 칸에\n세션 id를 넣어 조회", "조회 0행"],
      result: "danger",
    },
  ],
  text: { title: TEXT.title, lane: TEXT.label, box: TEXT.small + 2 },
};

const MOBILE: Layout = {
  dir: "column",
  title: [
    { y: 70, text: "배포 순서가" },
    { y: 142, text: "조회 결과를 가른다" },
  ],
  titleX: 60,
  lanes: [
    {
      label: { x: 60, y: 250, text: "소비자 먼저" },
      boxes: column(320),
      copy: ["① ingestStreamId 읽는 소비자 배포", "② 생산자가 새 streamId 발행", "조각 조회 정상"],
      result: "accent",
    },
    {
      label: { x: 60, y: 770, text: "생산자 먼저" },
      boxes: column(840),
      copy: ["① 생산자가 새 streamId 발행", "옛 소비자: 경로 칸에 세션 id", "조회 0행"],
      result: "danger",
    },
  ],
  text: { title: MOBILE_TEXT.title, lane: MOBILE_TEXT.label, box: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 앞 상자의 끝에서 다음 상자의 시작으로 가는 화살표 좌표. */
const link = (dir: Layout["dir"], from: Box, to: Box) =>
  dir === "row"
    ? { x1: from.x + from.w + 8, y1: from.y + from.h / 2, x2: to.x - 8, y2: to.y + to.h / 2 }
    : { x1: from.x + 120, y1: from.y + from.h + 2, x2: to.x + 120, y2: to.y - 2 };

export const DeployOrder: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 15);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {l.lanes.map((lane, laneIndex) => {
        const start = LANE_START[laneIndex];
        const lit = lane.boxes.map((_, i) => progress(frame, start + i * STEP_GAP, FADE));
        const wires = [0, 1].map((i) => progress(frame, start + i * STEP_GAP + 8, STEP_GAP - 8));
        return (
          <div key={lane.label.text}>
            <Label x={lane.label.x} y={lane.label.y} size={l.text.lane} weight={760} opacity={intro}>
              {lane.label.text}
            </Label>
            {[0, 1].map((i) => {
              const a = link(l.dir, lane.boxes[i], lane.boxes[i + 1]);
              const color = i === 1 && lane.result === "danger" ? COLOR.danger : COLOR.ink;
              return (
                <div key={i} style={{ position: "absolute", inset: 0, opacity: wires[i] > 0 ? 1 : 0 }}>
                  <Arrow x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} color={color} draw={wires[i]} />
                </div>
              );
            })}
            {lane.boxes.map((b, i) => {
              const last = i === lane.boxes.length - 1;
              const tone: NodeTone = last ? lane.result : "ink";
              return (
                <div key={lane.copy[i]}>
                  <Node x={b.x} y={b.y} width={b.w} height={b.h} tone="muted" size={l.text.box} opacity={intro * (1 - lit[i])}>
                    {lane.copy[i]}
                  </Node>
                  <Node x={b.x} y={b.y} width={b.w} height={b.h} tone={tone} size={l.text.box} opacity={lit[i]}>
                    {lane.copy[i]}
                  </Node>
                </div>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
