// 콘티: _workspace/blog/shakedown-database-restore-proves-backup/storyboard.md 「영상 1」
// 장면 1(거짓 성공): 스냅샷을 새 RDS 인스턴스로 복원했지만 앱은 옛 URL Secret(원본 주소)을 그대로 쓴다.
// 응답은 「기존 행 ✓」 로 멀쩡해 보여도 DB 호스트가 원본이다 — 복원 대상을 읽지 않았다.
// 장면 2(진짜 확인): Secret 새 버전(복원 주소) → 새 task definition 으로 재배포(같은 이미지).
// 기존 행을 찾고, 새 쓰기가 되고, 응답의 DB 호스트가 복원 호스트로 바뀐다.
// 근거: shakedown 2788411 docs/experiments/2026-10-10-database-live-validation.md 33–42행,
// evidence/2026-10-10-database-live-validation.json(mysql.initial.host ≠ mysql.restored_verification.host).
// 주소 · 호스트 이름은 그리지 않는다(「원본」 / 「복원」 으로만). 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const RESTORE_TARGET_CHECK_FRAMES = 360;

const T = {
  intro: 0,
  oldWire: 30,
  oldPacket: 55,
  oldRow: 70,
  oldHost: 80,
  wrong: 100,
  swap: 150,
  newVersion: 165,
  newWire: 190,
  restoredOn: 205,
  newPacket: 215,
  newRow: 260,
  newHost: 266,
  newWrite: 272,
  verified: 290,
} as const;
const FADE = 12;
const PACKET_FRAMES = 30;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Pos = { readonly x: number; readonly y: number };

type Layout = {
  readonly phase: Pos;
  readonly app: Box;
  readonly appTag: Pos;
  readonly secret: Box;
  readonly original: Box;
  readonly restored: Box;
  readonly snapshotTag: Pos;
  readonly appOut: Pos;
  readonly secretIn: Pos;
  readonly secretOut: Pos;
  readonly originalIn: Pos;
  readonly restoredIn: Pos;
  /** 앱 → 응답 칸 보조 화살표(데스크톱만). */
  readonly responseArrow: readonly [Pos, Pos] | null;
  readonly panel: Box;
  readonly panelLabel: Pos;
  readonly rows: readonly [Box, Box, Box];
  readonly verdictTag: Pos;
  readonly text: { readonly node: number; readonly sub: number; readonly row: number; readonly tag: number };
};

const DESKTOP: Layout = {
  phase: { x: 120, y: 70 },
  app: { x: 120, y: 300, w: 360, h: 150 },
  appTag: { x: 120, y: 214 },
  secret: { x: 700, y: 290, w: 460, h: 170 },
  original: { x: 1420, y: 150, w: 380, h: 150 },
  restored: { x: 1420, y: 510, w: 380, h: 170 },
  snapshotTag: { x: 1420, y: 704 },
  appOut: { x: 490, y: 375 },
  secretIn: { x: 690, y: 375 },
  secretOut: { x: 1172, y: 375 },
  originalIn: { x: 1410, y: 240 },
  restoredIn: { x: 1410, y: 590 },
  responseArrow: [
    { x: 300, y: 462 },
    { x: 300, y: 540 },
  ],
  panel: { x: 120, y: 550, w: 760, h: 420 },
  panelLabel: { x: 156, y: 572 },
  rows: [
    { x: 150, y: 646, w: 700, h: 88 },
    { x: 150, y: 750, w: 700, h: 88 },
    { x: 150, y: 854, w: 700, h: 88 },
  ],
  verdictTag: { x: 920, y: 764 },
  text: { node: TEXT.label, sub: TEXT.small, row: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  phase: { x: 60, y: 56 },
  app: { x: 60, y: 160, w: 420, h: 130 },
  appTag: { x: 520, y: 192 },
  secret: { x: 60, y: 370, w: 640, h: 170 },
  original: { x: 60, y: 630, w: 440, h: 150 },
  restored: { x: 580, y: 630, w: 440, h: 170 },
  snapshotTag: { x: 580, y: 816 },
  appOut: { x: 270, y: 298 },
  secretIn: { x: 270, y: 362 },
  secretOut: { x: 380, y: 548 },
  originalIn: { x: 280, y: 622 },
  restoredIn: { x: 800, y: 622 },
  responseArrow: null,
  panel: { x: 60, y: 910, w: 960, h: 410 },
  panelLabel: { x: 96, y: 930 },
  rows: [
    { x: 90, y: 1012, w: 900, h: 88 },
    { x: 90, y: 1112, w: 900, h: 88 },
    { x: 90, y: 1212, w: 900, h: 88 },
  ],
  verdictTag: { x: 380, y: 926 },
  text: { node: MOBILE_TEXT.label, sub: MOBILE_TEXT.small, row: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type Tone = "ink" | "accent" | "danger" | "muted";

const BOX_STYLE = {
  ink: { border: `3px solid ${COLOR.ink}`, background: COLOR.white, color: COLOR.ink },
  accent: { border: `5px solid ${COLOR.accent}`, background: COLOR.accentSoft, color: COLOR.ink },
  danger: { border: `4px solid ${COLOR.danger}`, background: COLOR.dangerSoft, color: COLOR.danger },
  muted: { border: `3px dashed ${COLOR.muted}`, background: COLOR.surface, color: COLOR.muted },
} as const;

const VALUE_COLOR = { ink: COLOR.ink, accent: COLOR.accent, danger: COLOR.danger, muted: COLOR.muted } as const;

/** 앱 → Secret, Secret → DB 두 선을 이어 t(0→1) 만큼 간 점. Secret 상자 안(글자 위)은 건너뛴다. */
const packetAt = (l: Layout, db: Pos, t: number): Pos => {
  const a = Math.hypot(l.secretIn.x - l.appOut.x, l.secretIn.y - l.appOut.y);
  const b = Math.hypot(db.x - l.secretOut.x, db.y - l.secretOut.y);
  const d = t * (a + b);
  const lerp = (p: Pos, q: Pos, k: number): Pos => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });
  return d <= a ? lerp(l.appOut, l.secretIn, d / a) : lerp(l.secretOut, db, (d - a) / b);
};

export const RestoreTargetCheck: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];

  const intro = progress(frame, T.intro, 20);
  const swapOut = 1 - progress(frame, T.swap, FADE);
  const newIn = progress(frame, T.newVersion, FADE);
  const switched = frame >= T.newVersion;
  const rewired = frame >= T.newWire;
  const restoredOn = frame >= T.restoredOn;

  // 장면 1 선: 앱 → Secret → 원본. 재배포 뒤 원본 쪽 선은 회색 점선이 되며 사라진다.
  const oldAppWire = progress(frame, T.oldWire, 15);
  const oldDbWire = progress(frame, T.oldWire + 12, 15);
  const oldDbFade = 1 - progress(frame, T.newWire, 40);
  const newDbWire = progress(frame, T.newWire, 25);

  // 요청 하나가 앱에서 DB 까지 가는 점.
  const packetT = (start: number) =>
    interpolate(frame, [start, start + PACKET_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const oldPacketOn = frame >= T.oldPacket && frame <= T.oldPacket + PACKET_FRAMES;
  const newPacketOn = frame >= T.newPacket && frame <= T.newPacket + PACKET_FRAMES;
  const packetPos = newPacketOn
    ? packetAt(l, l.restoredIn, packetT(T.newPacket))
    : packetAt(l, l.originalIn, packetT(T.oldPacket));

  const wrong = frame >= T.wrong;
  const wrongIn = progress(frame, T.wrong, FADE) * swapOut;
  const verified = progress(frame, T.verified, FADE);

  const box = (b: Box, title: string, sub: React.ReactNode, tone: Tone, opacity: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        borderRadius: 16,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT,
        letterSpacing: "-0.02em",
        opacity,
        ...BOX_STYLE[tone],
      }}
    >
      <div style={{ fontSize: l.text.node, fontWeight: 740 }}>{title}</div>
      {sub}
    </div>
  );

  const subText = (text: string, color: string, opacity = 1) => (
    <div style={{ fontSize: l.text.sub, fontWeight: 650, color, opacity, whiteSpace: "nowrap" }}>{text}</div>
  );

  // Secret 아랫줄: 옛 버전 → 새 버전. 같은 자리에서 바꿔 끼운다.
  const secretSub = (
    <div style={{ position: "relative", height: l.text.sub * 1.3, width: "100%" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
        {subText("옛 버전 · 원본 주소", COLOR.muted, swapOut)}
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
        {subText("새 버전 · 복원 주소", COLOR.accent, newIn)}
      </div>
    </div>
  );

  const row = (b: Box, name: string, value: string, tone: Tone, opacity: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        borderRadius: 12,
        boxSizing: "border-box",
        padding: "0 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: FONT,
        fontSize: l.text.row,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        opacity,
        border: tone === "ink" ? `3px solid ${COLOR.line}` : BOX_STYLE[tone].border,
        background: tone === "ink" ? COLOR.white : BOX_STYLE[tone].background,
        color: COLOR.ink,
      }}
    >
      <span>{name}</span>
      <span style={{ color: VALUE_COLOR[tone], fontWeight: 780 }}>{value}</span>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 지금 단계 */}
      <Label x={l.phase.x} y={l.phase.y} size={l.text.node} weight={760} opacity={progress(frame, T.oldWire, FADE) * swapOut}>
        옛 Secret 그대로
      </Label>
      <Label x={l.phase.x} y={l.phase.y} size={l.text.node} weight={760} color={COLOR.accent} opacity={newIn}>
        Secret 교체 · 재배포
      </Label>

      {/* 선: 앱 → Secret → RDS */}
      {oldAppWire > 0 ? (
        <Arrow
          x1={l.appOut.x}
          y1={l.appOut.y}
          x2={l.secretIn.x}
          y2={l.secretIn.y}
          color={rewired ? COLOR.accent : COLOR.ink}
          draw={oldAppWire}
        />
      ) : null}
      <AbsoluteFill style={{ opacity: oldDbWire > 0 ? oldDbFade : 0 }}>
        <Arrow
          x1={l.secretOut.x}
          y1={l.secretOut.y}
          x2={l.originalIn.x}
          y2={l.originalIn.y}
          color={rewired ? COLOR.muted : COLOR.ink}
          dashed={rewired}
          draw={oldDbWire}
        />
      </AbsoluteFill>
      {newDbWire > 0 ? (
        <Arrow
          x1={l.secretOut.x}
          y1={l.secretOut.y}
          x2={l.restoredIn.x}
          y2={l.restoredIn.y}
          color={COLOR.accent}
          draw={newDbWire}
        />
      ) : null}
      {l.responseArrow ? (
        <AbsoluteFill style={{ opacity: intro }}>
          <Arrow
            x1={l.responseArrow[0].x}
            y1={l.responseArrow[0].y}
            x2={l.responseArrow[1].x}
            y2={l.responseArrow[1].y}
            color={COLOR.muted}
          />
        </AbsoluteFill>
      ) : null}

      {/* 상자 */}
      {box(l.app, "앱(ECS)", null, switched ? "accent" : "ink", intro, "app")}
      {box(l.secret, "URL Secret", secretSub, switched ? "accent" : "ink", intro, "secret")}
      {box(l.original, "원본 RDS", null, rewired ? "muted" : "ink", intro * (1 - progress(frame, T.newWire, 50) * 0.5), "original")}
      {box(
        l.restored,
        "복원 RDS",
        subText("새 인스턴스", restoredOn ? COLOR.ink : COLOR.muted),
        restoredOn ? "accent" : "muted",
        intro * (restoredOn ? 1 : 0.6),
        "restored",
      )}
      <Tag x={l.snapshotTag.x} y={l.snapshotTag.y} tone="muted" size={l.text.tag} opacity={intro}>
        스냅샷에서 복원
      </Tag>
      <Tag x={l.appTag.x} y={l.appTag.y} tone="accent" size={l.text.tag} opacity={newIn}>
        새 task definition
      </Tag>

      {oldPacketOn || newPacketOn ? (
        <div
          style={{
            position: "absolute",
            left: packetPos.x - 16,
            top: packetPos.y - 16,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: newPacketOn ? COLOR.accent : COLOR.ink,
            border: `5px solid ${COLOR.white}`,
            boxSizing: "border-box",
          }}
        />
      ) : null}

      {/* 응답 칸 */}
      <div
        style={{
          position: "absolute",
          left: l.panel.x,
          top: l.panel.y,
          width: l.panel.w,
          height: l.panel.h,
          borderRadius: 18,
          boxSizing: "border-box",
          border: `3px solid ${COLOR.muted}`,
          background: COLOR.surface,
          opacity: intro,
        }}
      />
      <Label x={l.panelLabel.x} y={l.panelLabel.y} size={l.text.node} weight={740} color={COLOR.muted} opacity={intro}>
        응답
      </Label>

      {/* 장면 1: 기존 행은 보이지만 호스트는 원본 */}
      {row(l.rows[0], "기존 행", "✓", "ink", progress(frame, T.oldRow, FADE) * swapOut, "old-row")}
      {row(l.rows[1], "DB 호스트", "원본", wrong ? "danger" : "ink", progress(frame, T.oldHost, FADE) * swapOut, "old-host")}
      <Tag x={l.verdictTag.x} y={l.verdictTag.y} tone="danger" size={l.text.tag} opacity={wrongIn}>
        복원 대상을 읽지 않음
      </Tag>

      {/* 장면 2: 기존 행 · 복원 호스트 · 새 쓰기 */}
      {row(l.rows[0], "기존 행", "✓", "accent", progress(frame, T.newRow, FADE), "new-row")}
      {row(l.rows[1], "DB 호스트", "복원", "accent", progress(frame, T.newHost, FADE), "new-host")}
      {row(l.rows[2], "새 쓰기", "✓", "accent", progress(frame, T.newWrite, FADE), "new-write")}
      <Tag x={l.verdictTag.x} y={l.verdictTag.y} tone="accent" size={l.text.tag} opacity={verified}>
        복원한 대상에서 읽음
      </Tag>
    </AbsoluteFill>
  );
};
