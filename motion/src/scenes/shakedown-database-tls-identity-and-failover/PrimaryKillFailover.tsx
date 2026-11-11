// 콘티: _workspace/blog/shakedown-database-tls-identity-and-failover/storyboard.md 「영상 1」
// MongoDB 8.0 복제 세트(멤버 3). primary 컨테이너의 Docker 재시작을 끄고 SIGKILL 을 보낸다.
// 시계는 장애 요청 시점에서 시작한다. HTTP 실패 1.89초 · 7.15초, 새 primary 첫 쓰기 성공 12.24초(보고 값).
// 선출 시각은 재지 않았으므로 멤버 2 가 primary 로 바뀌는 순간에는 숫자를 붙이지 않는다.
// 근거: shakedown fa50609 docs/experiments/2026-10-10-mongodb-tls-failover.md 22행,
// docs/experiments/evidence/2026-10-10-mongodb-tls-failover.json failovers[1].trace,
// infra/aws/scripts/experiment-mongo-failover.py 29·31행.
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Wire } from "../../components/Flow";
import { Label, Playhead, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const PRIMARY_KILL_FAILOVER_FRAMES = 360;

// 시간축은 장애 요청(kill) 프레임에서 0초로 출발해 clockEnd 프레임에 12.24초에 닿는다(실제 시간 비율 근사).
const SECONDS = { fail1: 1.89, fail2: 7.15, success: 12.24 } as const;
// 반복 재생이므로 처음 상태는 0프레임부터 다 보인다(빈 화면으로 깜빡이지 않게).
const T = {
  kill: 30,
  clockEnd: 318,
  // 선출은 7.15초와 12.24초 사이 어딘가 — 잰 값이 아니므로 시간축에 표시하지 않는다.
  elect: 250,
} as const;
const FADE = 12;
const frameAt = (seconds: number) => T.kill + ((T.clockEnd - T.kill) * seconds) / SECONDS.success;
const F = {
  fail1: Math.round(frameAt(SECONDS.fail1)),
  fail2: Math.round(frameAt(SECONDS.fail2)),
  success: T.clockEnd,
} as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Pos = { readonly x: number; readonly y: number };
type Point = readonly [number, number];

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly app: Box;
  readonly members: readonly [Box, Box, Box];
  readonly writeTo1: readonly Point[];
  readonly writeTo2: readonly Point[];
  readonly writeLabel: Pos;
  readonly killTags: readonly { readonly y: number; readonly text: string }[];
  readonly electTagY: number;
  readonly axis: { readonly x0: number; readonly x1: number; readonly y: number };
  readonly failTagY: number;
  readonly successTagY: number;
  readonly playheadTop: number;
  readonly tickY: number;
  readonly origin: Pos;
  readonly originAnchor: "left" | "center";
  readonly unit: Pos;
  readonly marker: number;
  readonly text: { readonly title: number; readonly name: number; readonly role: number; readonly tag: number };
};

const centerX = (b: Box) => b.x + b.w / 2;

const DESKTOP_MEMBERS: Layout["members"] = [
  { x: 620, y: 330, w: 340, h: 150 },
  { x: 1000, y: 330, w: 340, h: 150 },
  { x: 1380, y: 330, w: 340, h: 150 },
];
const DESKTOP_APP: Box = { x: 120, y: 150, w: 300, h: 110 };
const DESKTOP_WIRE_Y = DESKTOP_APP.y + DESKTOP_APP.h / 2;

const DESKTOP: Layout = {
  title: [{ y: 32, text: "primary를 강제 종료한 뒤 쓰기가 돌아오기까지" }],
  titleX: 120,
  app: DESKTOP_APP,
  members: DESKTOP_MEMBERS,
  writeTo1: [
    [DESKTOP_APP.x + DESKTOP_APP.w, DESKTOP_WIRE_Y],
    [centerX(DESKTOP_MEMBERS[0]), DESKTOP_WIRE_Y],
    [centerX(DESKTOP_MEMBERS[0]), DESKTOP_MEMBERS[0].y - 8],
  ],
  writeTo2: [
    [DESKTOP_APP.x + DESKTOP_APP.w, DESKTOP_WIRE_Y],
    [centerX(DESKTOP_MEMBERS[1]), DESKTOP_WIRE_Y],
    [centerX(DESKTOP_MEMBERS[1]), DESKTOP_MEMBERS[1].y - 8],
  ],
  writeLabel: { x: 450, y: DESKTOP_WIRE_Y - 62 },
  killTags: [{ y: 505, text: "SIGKILL · 재시작 끔" }],
  electTagY: 505,
  axis: { x0: 200, x1: 1600, y: 830 },
  failTagY: 680,
  successTagY: 680,
  playheadTop: 766,
  tickY: 856,
  origin: { x: 200, y: 910 },
  originAnchor: "center",
  unit: { x: 1640, y: 806 },
  marker: 24,
  text: { title: TEXT.title, name: TEXT.label, role: TEXT.small, tag: TEXT.small },
};

const MOBILE_MEMBERS: Layout["members"] = [
  { x: 60, y: 440, w: 300, h: 140 },
  { x: 390, y: 440, w: 300, h: 140 },
  { x: 720, y: 440, w: 300, h: 140 },
];
const MOBILE_APP: Box = { x: 60, y: 220, w: 300, h: 110 };
const MOBILE_WIRE_Y = (MOBILE_APP.y + MOBILE_APP.h + MOBILE_MEMBERS[0].y) / 2;

const MOBILE: Layout = {
  title: [
    { y: 56, text: "primary를 강제 종료한 뒤" },
    { y: 124, text: "쓰기가 돌아오기까지" },
  ],
  titleX: 60,
  app: MOBILE_APP,
  members: MOBILE_MEMBERS,
  // 앱 바로 아래가 멤버 1 이라, 두 선 모두 앱 아래에서 나와 갈라진다.
  writeTo1: [
    [centerX(MOBILE_APP), MOBILE_APP.y + MOBILE_APP.h],
    [centerX(MOBILE_MEMBERS[0]), MOBILE_MEMBERS[0].y - 8],
  ],
  writeTo2: [
    [centerX(MOBILE_APP), MOBILE_APP.y + MOBILE_APP.h],
    [centerX(MOBILE_APP), MOBILE_WIRE_Y],
    [centerX(MOBILE_MEMBERS[1]), MOBILE_WIRE_Y],
    [centerX(MOBILE_MEMBERS[1]), MOBILE_MEMBERS[1].y - 8],
  ],
  writeLabel: { x: 84, y: 340 },
  killTags: [
    { y: 605, text: "SIGKILL" },
    { y: 690, text: "재시작 끔" },
  ],
  electTagY: 605,
  axis: { x0: 100, x1: 800, y: 1080 },
  failTagY: 940,
  successTagY: 850,
  playheadTop: 1016,
  tickY: 1110,
  origin: { x: 60, y: 1180 },
  originAnchor: "left",
  unit: { x: 840, y: 1046 },
  marker: 30,
  text: { title: MOBILE_TEXT.title, name: MOBILE_TEXT.label, role: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type Tone = "ink" | "accent" | "muted";

const BOX_STYLE = {
  ink: { border: `3px solid ${COLOR.ink}`, background: COLOR.white, color: COLOR.ink, roleColor: COLOR.muted },
  accent: { border: `5px solid ${COLOR.accent}`, background: COLOR.accentSoft, color: COLOR.ink, roleColor: COLOR.accent },
  muted: { border: `3px dashed ${COLOR.muted}`, background: COLOR.surface, color: COLOR.muted, roleColor: COLOR.muted },
} as const;

type MemberProps = {
  readonly box: Box;
  readonly name: string;
  readonly role: string;
  readonly tone: Tone;
  readonly nameSize: number;
  readonly roleSize: number;
};

const MemberBox: React.FC<MemberProps> = ({ box, name, role, tone, nameSize, roleSize }) => {
  const style = BOX_STYLE[tone];
  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        borderRadius: 16,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
        fontFamily: FONT,
        letterSpacing: "-0.02em",
        border: style.border,
        background: style.background,
      }}
    >
      <div style={{ fontSize: nameSize, fontWeight: 740, color: style.color }}>{name}</div>
      <div style={{ fontSize: roleSize, fontWeight: 680, color: style.roleColor }}>{role}</div>
    </div>
  );
};

type MarkerProps = {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly kind: "fail" | "ok";
  readonly opacity: number;
};

/** 시간축 위 표식 — 빨간 ✕(실패) 또는 청록 ✓(성공). 글꼴에 기대지 않게 선으로 그린다. */
const Marker: React.FC<MarkerProps> = ({ x, y, r, kind, opacity }) => {
  const k = r * 0.42;
  return (
    <svg style={{ position: "absolute", inset: 0, opacity }} width="100%" height="100%">
      <circle cx={x} cy={y} r={r} fill={kind === "fail" ? COLOR.danger : COLOR.accent} stroke={COLOR.white} strokeWidth={4} />
      {kind === "fail" ? (
        <path d={`M${x - k},${y - k} L${x + k},${y + k} M${x + k},${y - k} L${x - k},${y + k}`} stroke={COLOR.white} strokeWidth={6} strokeLinecap="round" />
      ) : (
        <path
          d={`M${x - k * 1.1},${y + k * 0.05} L${x - k * 0.25},${y + k * 0.85} L${x + k * 1.15},${y - k * 0.75}`}
          fill="none"
          stroke={COLOR.white}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

export const PrimaryKillFailover: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];

  const killIn = progress(frame, T.kill, FADE);
  const fail1 = progress(frame, F.fail1, FADE);
  const fail2 = progress(frame, F.fail2, FADE);
  const elect = progress(frame, T.elect, FADE);
  const success = progress(frame, F.success, FADE);

  const killed = frame >= T.kill;
  const failing = frame >= F.fail1;
  const elected = frame >= T.elect;

  const { x0, x1, y: axisY } = l.axis;
  const xAt = (seconds: number) => x0 + ((x1 - x0) * seconds) / SECONDS.success;
  const clock = Math.min(Math.max(frame - T.kill, 0) / (T.clockEnd - T.kill), 1);
  const playX = x0 + (x1 - x0) * clock;

  const failMarks = [
    { x: xAt(SECONDS.fail1), opacity: fail1, tick: "1.89" },
    { x: xAt(SECONDS.fail2), opacity: fail2, tick: "7.15" },
  ];
  const successX = xAt(SECONDS.success);
  const tagHeight = l.text.tag * 1.2 + 16;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760}>
          {line.text}
        </Label>
      ))}

      {/* 앱 → primary 쓰기 선 */}
      <Wire
        points={l.writeTo1}
        color={failing ? COLOR.danger : COLOR.accent}
        dashed={failing}
        opacity={1 - success}
      />
      <Wire points={l.writeTo2} color={COLOR.accent} opacity={success} />
      <Label x={l.writeLabel.x} y={l.writeLabel.y} size={l.text.tag} color={COLOR.muted} weight={700}>
        쓰기
      </Label>

      <div
        style={{
          position: "absolute",
          left: l.app.x,
          top: l.app.y,
          width: l.app.w,
          height: l.app.h,
          borderRadius: 16,
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: FONT,
          fontSize: l.text.name,
          fontWeight: 740,
          letterSpacing: "-0.02em",
          color: COLOR.ink,
          border: `3px solid ${COLOR.ink}`,
          background: COLOR.white,
        }}
      >
        앱(ECS)
      </div>

      {/* 복제 세트 멤버 셋 */}
      <MemberBox
        box={l.members[0]}
        name="멤버 1"
        role={killed ? "종료됨" : "primary"}
        tone={killed ? "muted" : "accent"}
        nameSize={l.text.name}
        roleSize={l.text.role}
      />
      <MemberBox
        box={l.members[1]}
        name="멤버 2"
        role={elected ? "primary" : "secondary"}
        tone={elected ? "accent" : "ink"}
        nameSize={l.text.name}
        roleSize={l.text.role}
      />
      <MemberBox
        box={l.members[2]}
        name="멤버 3"
        role="secondary"
        tone="ink"
        nameSize={l.text.name}
        roleSize={l.text.role}
      />
      {l.killTags.map((tag) => (
        <Tag key={tag.y} x={l.members[0].x} y={tag.y} tone="danger" size={l.text.tag} opacity={killIn}>
          {tag.text}
        </Tag>
      ))}
      <Tag x={centerX(l.members[1])} y={l.electTagY} tone="accent" size={l.text.tag} anchor="center" opacity={elect}>
        선출
      </Tag>

      {/* 시간축: 장애 요청 시점이 0초 */}
      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
        <line x1={x0} y1={axisY} x2={x1} y2={axisY} stroke={COLOR.line} strokeWidth={8} strokeLinecap="round" />
        {killed ? <line x1={x0} y1={axisY} x2={playX} y2={axisY} stroke={COLOR.ink} strokeWidth={8} strokeLinecap="round" /> : null}
        {failMarks.map((m) => (
          <line
            key={m.tick}
            x1={m.x}
            y1={l.failTagY + tagHeight}
            x2={m.x}
            y2={axisY - l.marker}
            stroke={COLOR.danger}
            strokeWidth={4}
            opacity={m.opacity}
          />
        ))}
        <line
          x1={successX}
          y1={l.successTagY + tagHeight}
          x2={successX}
          y2={axisY - l.marker}
          stroke={COLOR.accent}
          strokeWidth={4}
          opacity={success}
        />
      </svg>
      <Playhead x={playX} top={l.playheadTop} height={axisY - l.playheadTop + 20} opacity={killIn * (1 - success)} />

      {failMarks.map((m) => (
        <Marker key={m.tick} x={m.x} y={axisY} r={l.marker} kind="fail" opacity={m.opacity} />
      ))}
      <Marker x={successX} y={axisY} r={l.marker} kind="ok" opacity={success} />

      {failMarks.map((m) => (
        <Tag key={m.tick} x={m.x} y={l.failTagY} tone="danger" size={l.text.tag} anchor="center" opacity={m.opacity}>
          HTTP 실패
        </Tag>
      ))}
      <Tag x={successX} y={l.successTagY} tone="accent" size={l.text.tag} anchor="center" opacity={success}>
        쓰기 성공 · 12.24초
      </Tag>

      {/* 눈금 */}
      <Label x={x0} y={l.tickY} size={l.text.tag} weight={700} anchor="center" opacity={killIn}>
        0
      </Label>
      {failMarks.map((m) => (
        <Label key={m.tick} x={m.x} y={l.tickY} size={l.text.tag} weight={700} anchor="center" opacity={m.opacity}>
          {m.tick}
        </Label>
      ))}
      <Label x={successX} y={l.tickY} size={l.text.tag} weight={700} anchor="center" opacity={success}>
        12.24
      </Label>
      <Label x={l.unit.x} y={l.unit.y} size={l.text.tag} color={COLOR.muted} weight={700}>
        초
      </Label>
      <Label x={l.origin.x} y={l.origin.y} size={l.text.tag} color={COLOR.muted} weight={700} anchor={l.originAnchor} opacity={killIn}>
        장애 요청
      </Label>
    </AbsoluteFill>
  );
};
