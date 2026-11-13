// 콘티: _workspace/blog/kafka-core-concepts-technical-review/storyboard.md 「AcksIsrCommit」
// 복제 3(리더 B1, 팔로워 B2 · B3), min.insync.replicas=2 파티션에 1,000건이 확정된 상태에서
// 팔로워 둘이 멈춘 사이 100건을 쓰고, 리더가 죽은 뒤 새 리더에 무엇이 남는지를 acks=1(왼쪽 · 위)과
// acks=all(오른쪽 · 아래)로 나란히 보여 준다. 순서와 수치(1,000건 · 100건, 새 리더 B2 · B3)는
// apache/kafka 4.4.0 실측(measure/k23.txt K3)을 다시 그린 것이다.
// layout="mobile" 은 1080×1350 휴대폰판(AcksIsrCommitMobile) — 두 판을 위아래로 쌓는다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const ACKS_ISR_COMMIT_FRAMES = 360;

const T = {
  intro: 0,
  pause: 30, // 팔로워 B2 · B3 멈춤
  write: 60, // 100건 쓰기 시작
  ack: 104, // 확인 응답 결과
  crash: 150, // 리더 B1 장애
  elect: 188, // 새 리더(팔로워도 다시 살아남)
  outcome: 228, // 결과
} as const;

type Panel = { readonly x: number; readonly y: number };

type Layout = {
  readonly panels: readonly [Panel, Panel];
  readonly rowY: readonly [number, number, number];
  readonly labelW: number;
  readonly barW: number;
  readonly barH: number;
  readonly ackDy: number;
  readonly outcomeDy: number;
  readonly text: { readonly title: number; readonly label: number; readonly small: number };
};

const DESKTOP: Layout = {
  panels: [{ x: 110, y: 70 }, { x: 1010, y: 70 }],
  rowY: [170, 330, 490],
  labelW: 250,
  barW: 440,
  barH: 64,
  ackDy: 680,
  outcomeDy: 800,
  text: { title: TEXT.title, label: TEXT.label, small: TEXT.small },
};

const MOBILE: Layout = {
  panels: [{ x: 60, y: 50 }, { x: 60, y: 700 }],
  rowY: [100, 205, 310],
  labelW: 275,
  barW: 480,
  barH: 66,
  ackDy: 420,
  outcomeDy: 510,
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

type Scenario = {
  readonly title: string;
  readonly acked: boolean; // 100건이 확인 응답을 받았나
  readonly newLeader: 1 | 2; // 행 번호(0 = B1)
  readonly newLeaderText: string;
  readonly ackText: string;
  readonly outcomeText: string;
};

const SCENARIOS: readonly [Scenario, Scenario] = [
  {
    title: "acks=1",
    acked: true,
    newLeader: 1,
    newLeaderText: "B2 새 리더",
    ackText: "확인 응답 100건",
    outcomeText: "확인 받은 100건 사라짐",
  },
  {
    title: "acks=all",
    acked: false,
    newLeader: 2,
    newLeaderText: "B3 새 리더",
    ackText: "확인 응답 0건(시간 초과)",
    outcomeText: "확인 받은 기록 손실 0",
  },
];

const ROW_NAMES = ["B1 리더", "B2 팔로워", "B3 팔로워"] as const;
const PAUSED_NAMES = ["B1 리더", "B2 멈춤", "B3 멈춤"] as const;

const PanelView: React.FC<{ readonly l: Layout; readonly p: Panel; readonly s: Scenario; readonly frame: number }> = ({
  l, p, s, frame,
}) => {
  const intro = progress(frame, T.intro, 16);
  const paused = progress(frame, T.pause, 12);
  const grow = progress(frame, T.write, 40);
  const ack = progress(frame, T.ack, 12);
  const crash = progress(frame, T.crash, 12);
  const elect = progress(frame, T.elect, 14);
  const outcome = progress(frame, T.outcome, 16);
  const followerDim = paused * (1 - elect);
  const extraW = (l.barW / 10) * grow; // 100건 = 1,000건의 10%
  const extraFade = 1 - outcome; // 새 리더에는 없으므로 결과 단계에서 사라진다
  const extraX = p.x + l.labelW + l.barW + 6;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: intro }}>
      <Label x={p.x} y={p.y} size={l.text.title} weight={800}>
        {s.title}
      </Label>
      {ROW_NAMES.map((name, i) => {
        const y = p.y + l.rowY[i];
        const isOld = i === 0;
        const crashed = isOld && crash > 0.5;
        const elected = i === s.newLeader && elect > 0.5;
        const pausedNow = i > 0 && followerDim > 0.5;
        const dim = isOld ? crash * 0.6 : followerDim * 0.55;
        const tone = crashed ? COLOR.danger : elected ? COLOR.accent : pausedNow ? COLOR.muted : COLOR.ink;
        return (
          <div key={name}>
            <Label x={p.x} y={y + (l.barH - l.text.label * 1.25) / 2} size={l.text.label} weight={760} color={tone}>
              {elected ? s.newLeaderText : crashed ? "B1 장애" : pausedNow ? PAUSED_NAMES[i] : name}
            </Label>
            {/* 확정된 1,000건 */}
            <div
              style={{
                position: "absolute", left: p.x + l.labelW, top: y, width: l.barW, height: l.barH, boxSizing: "border-box",
                background: COLOR.ink, border: `5px solid ${tone}`, borderRadius: 10, opacity: 1 - dim,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONT, fontSize: l.text.small, fontWeight: 700, color: COLOR.white,
              }}
            >
              1,000건
            </div>
            {/* 리더에만 쓰인 100건: acks=1 은 확인 응답을 받은 칸, acks=all 은 확정되지 않은 점선 칸 */}
            {isOld ? (
              <>
                <div
                  style={{
                    position: "absolute", left: extraX, top: y, width: extraW, height: l.barH,
                    boxSizing: "border-box", borderRadius: 8,
                    background: s.acked ? (outcome > 0.01 ? COLOR.danger : COLOR.accent) : COLOR.white,
                    border: s.acked ? "none" : `4px dashed ${COLOR.muted}`,
                    opacity: extraFade,
                  }}
                />
                <Label
                  x={extraX + l.barW / 10 + 14}
                  y={y + (l.barH - l.text.small * 1.25) / 2}
                  size={l.text.small}
                  weight={760}
                  color={s.acked ? COLOR.accent : COLOR.muted}
                  opacity={grow * extraFade}
                >
                  +100
                </Label>
              </>
            ) : null}
          </div>
        );
      })}
      <Tag x={p.x} y={p.y + l.ackDy} tone={s.acked ? "accent" : "danger"} size={l.text.small} opacity={ack}>
        {s.ackText}
      </Tag>
      <Tag x={p.x} y={p.y + l.outcomeDy} tone={s.acked ? "danger" : "accent"} size={l.text.small} opacity={outcome}>
        {s.outcomeText}
      </Tag>
    </div>
  );
};

export const AcksIsrCommit: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <PanelView l={l} p={l.panels[0]} s={SCENARIOS[0]} frame={frame} />
      <PanelView l={l} p={l.panels[1]} s={SCENARIOS[1]} frame={frame} />
    </AbsoluteFill>
  );
};
