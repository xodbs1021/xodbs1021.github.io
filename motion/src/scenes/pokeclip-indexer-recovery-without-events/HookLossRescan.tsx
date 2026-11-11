// 콘티: _workspace/blog/pokeclip-indexer-recovery-without-events/storyboard.md 「영상 1」
// 녹화 파일 하나를 세 경로(완료 훅 · 파일 감시 · 재스캔)가 찾는다. 훅은 끊기고, 감시는 마지막 파일이라
// 유휴 10초를 기다린 뒤 장부에 한 줄을 넣고, 300초마다 도는 재스캔은 같은 파일을 다시 찾지만
// 장부 고유 제약에 막혀 줄이 늘지 않는다(PokeClip-mono develop 825a3dfe indexer.go 172행 · watcher.go 46행).
// 반복 클립, 생성 소재 없음. 시간 비율은 실제와 다르다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Box, Dot, Lines, shown, travel } from "../../components/Stations";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const HOOK_LOSS_RESCAN_FRAMES = 360;

const T = {
  go: 20,
  hookBreak: 58,
  watchGate: 70,
  watchGo: 150,
  watchIn: 192,
  rescanGate: 80,
  rescanGo: 222,
  rescanIn: 262,
} as const;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly src: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly ledger: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly lanes: readonly [number, number, number];
  readonly laneX0: number;
  readonly laneX1: number;
  readonly hookStop: number;
  readonly gateX: number;
  readonly gate: { readonly w: number; readonly h: number };
  readonly laneLabel: { readonly x: number; readonly dy: number };
  readonly result: { readonly x: number; readonly dy: number; readonly anchor: "left" | "center" };
  readonly rowTag: { readonly x: number; readonly y: number };
  readonly dupTag: { readonly x: number; readonly y: number };
  readonly feed: readonly { x1: number; y1: number; x2: number; y2: number }[];
  readonly copy: { readonly hook: string; readonly watch: string; readonly rescan: string };
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "세 경로가 같은 파일을 찾아도 장부에는 한 줄" }],
  titleX: 120,
  src: { x: 230, y: 560, w: 280, h: 140 },
  ledger: { x: 1680, y: 560, w: 300, h: 200 },
  lanes: [300, 560, 820],
  laneX0: 420,
  laneX1: 1460,
  hookStop: 780,
  gateX: 960,
  gate: { w: 270, h: 90 },
  laneLabel: { x: 460, dy: -84 },
  result: { x: 1220, dy: -90, anchor: "center" },
  rowTag: { x: 1680, y: 690 },
  dupTag: { x: 1680, y: 380 },
  feed: [
    { x1: 370, y1: 560, x2: 420, y2: 560 },
    { x1: 420, y1: 300, x2: 420, y2: 820 },
    { x1: 1460, y1: 300, x2: 1460, y2: 820 },
    { x1: 1460, y1: 560, x2: 1530, y2: 560 },
  ],
  copy: { hook: "완료 훅", watch: "파일 감시", rescan: "재스캔" },
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "세 경로가 같은 파일을 찾아도" },
    { y: 124, text: "장부에는 한 줄" },
  ],
  titleX: 60,
  src: { x: 540, y: 270, w: 420, h: 110 },
  ledger: { x: 920, y: 790, w: 280, h: 200 },
  lanes: [520, 790, 1060],
  laneX0: 40,
  laneX1: 760,
  hookStop: 330,
  gateX: 440,
  gate: { w: 290, h: 90 },
  laneLabel: { x: 60, dy: -112 },
  result: { x: 260, dy: -118, anchor: "left" },
  rowTag: { x: 920, y: 910 },
  dupTag: { x: 920, y: 600 },
  feed: [
    { x1: 330, y1: 270, x2: 40, y2: 270 },
    { x1: 40, y1: 270, x2: 40, y2: 1060 },
    { x1: 760, y1: 520, x2: 760, y2: 1060 },
    { x1: 760, y1: 790, x2: 780, y2: 790 },
  ],
  copy: { hook: "훅", watch: "감시", rescan: "재스캔" },
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const HookLossRescan: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const size = l.text.tag;
  const intro = progress(frame, 0, 15);
  const [hookY, watchY, rescanY] = l.lanes;
  const gateLeft = l.gateX - l.gate.w / 2 - 30;
  const ledgerIn = l.laneX1;

  const hook = travel(frame, T.go, T.hookBreak, { x: l.laneX0, y: hookY }, { x: l.hookStop, y: hookY });
  const watch =
    frame < T.watchGo
      ? travel(frame, T.go, T.watchGate, { x: l.laneX0, y: watchY }, { x: gateLeft, y: watchY })
      : travel(frame, T.watchGo, T.watchIn, { x: gateLeft, y: watchY }, { x: ledgerIn, y: watchY });
  const rescan =
    frame < T.rescanGo
      ? travel(frame, T.go, T.rescanGate, { x: l.laneX0, y: rescanY }, { x: gateLeft, y: rescanY })
      : travel(frame, T.rescanGo, T.rescanIn, { x: gateLeft, y: rescanY }, { x: ledgerIn, y: rescanY });

  const broken = shown(frame, T.hookBreak);
  const row = shown(frame, T.watchIn);
  const dup = shown(frame, T.rescanIn);
  const watchWaiting = frame >= T.watchGate && frame < T.watchGo;
  const rescanWaiting = frame >= T.rescanGate && frame < T.rescanGo;

  const lanes = [
    { y: hookY, text: l.copy.hook },
    { y: watchY, text: l.copy.watch },
    { y: rescanY, text: l.copy.rescan },
  ];

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <div style={{ opacity: intro }}>
        <Lines
          lines={[
            ...l.feed.map((f) => ({ ...f, color: COLOR.muted, width: 5 })),
            ...lanes.map((lane) => ({ x1: l.laneX0, y1: lane.y, x2: l.laneX1, y2: lane.y })),
          ]}
        />
        {lanes.map((lane) => (
          <Label key={lane.text} x={l.laneLabel.x} y={lane.y + l.laneLabel.dy} size={l.text.label} weight={760}>
            {lane.text}
          </Label>
        ))}
        <Box {...l.src} label="녹화 파일" size={l.text.label} />
        <Box x={l.gateX} y={watchY} w={l.gate.w} h={l.gate.h} label="유휴 10초" size={size} tone="muted" dashed />
        <Box x={l.gateX} y={rescanY} w={l.gate.w} h={l.gate.h} label="300초마다" size={size} tone="muted" dashed />
        <Box {...l.ledger} label="장부" size={l.text.label} tone={row > 0.5 ? "accent" : "ink"} />
      </div>

      <Dot x={hook.x} y={hook.y} color={broken > 0.5 ? COLOR.danger : COLOR.ink} opacity={shown(frame, T.go) * (1 - progress(frame, T.hookBreak + 30, 12))} />
      <Dot x={watch.x} y={watch.y} color={watchWaiting ? COLOR.muted : COLOR.ink} opacity={shown(frame, T.go, T.watchIn + 4, 4)} />
      <Dot x={rescan.x} y={rescan.y} color={rescanWaiting ? COLOR.muted : COLOR.ink} opacity={shown(frame, T.go, T.rescanIn + 4, 4)} />

      <Tag x={l.result.x} y={hookY + l.result.dy} tone="danger" size={size} anchor={l.result.anchor} opacity={broken}>
        끊김
      </Tag>
      <Tag x={l.result.x} y={watchY + l.result.dy} tone="accent" size={size} anchor={l.result.anchor} opacity={row}>
        등록
      </Tag>
      <Tag x={l.result.x} y={rescanY + l.result.dy} tone="muted" size={size} anchor={l.result.anchor} opacity={dup}>
        이미 있음
      </Tag>
      <Tag x={l.rowTag.x} y={l.rowTag.y} tone="accent" size={size} anchor="center" opacity={row}>
        1행
      </Tag>
      <Tag x={l.dupTag.x} y={l.dupTag.y} tone="muted" size={size} anchor="center" opacity={dup}>
        중복 막음
      </Tag>
    </AbsoluteFill>
  );
};
