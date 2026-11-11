// 콘티: _workspace/blog/shakedown-reboot-recovery-and-deletion/storyboard.md 「영상 1」
// EC2 호스트 하나(Amazon Linux 2023), Target API 로 배포한 Node/PostgreSQL 앱 하나(direct 방식).
// 재부팅 ①: Docker 가 앱 · DB 컨테이너를 되살리고(restart: unless-stopped), systemd 가 Docker 뒤에 Target API 를 띄운다.
// DELETE: 컨테이너 · 네트워크를 지우고 상태 파일에 삭제 표시(tombstone)를 남긴다. DB 볼륨은 남는다.
// 재부팅 ②: 컨테이너는 다시 생기지 않고, Target API 가 tombstone 을 읽어 GET 404 를 유지한다.
// 근거: shakedown 12ac8a8 docs/experiments/2026-10-10-direct-deployment-reboot.md 「Real EC2 test」 3–6단계,
// infra/local/delivery.mjs(unless-stopped) · infra/local/systemd/shakedown-local.service(After=docker) · infra/local/server.mjs(state.json).
// 반복 클립, 생성 소재 없음. 시간 비율은 실제가 아니다. 반복할 때 흰 화면이 끼지 않게 0프레임부터 전부 보인다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const REBOOT_TWICE_TOMBSTONE_FRAMES = 360;

const T = {
  reboot1: 36,
  docker1: 66,
  api1: 92,
  ok1: 110,
  remove: 150,
  removeTag: 160,
  reboot2: 205,
  docker2: 235,
  api2: 260,
  done: 280,
} as const;
const FADE = 12;

const STAGES = ["배포 · 데이터 2건", "재부팅 ①", "DELETE", "재부팅 ②"] as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Pos = { readonly x: number; readonly y: number };

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly host: Box;
  readonly hostLabel: Pos;
  readonly bootTag: Pos;
  readonly docker: Box;
  readonly dockerLabel: Pos;
  readonly dockerTag: Pos;
  readonly app: Box;
  readonly db: Box;
  readonly api: Box;
  readonly apiTitle: Pos;
  readonly apiNote: Pos;
  readonly apiTag: Pos;
  readonly disk: Box;
  readonly diskLabel: Pos;
  readonly state: Box;
  readonly volume: Box;
  readonly keptTag: Pos;
  readonly readX: number;
  readonly readLabel: Pos;
  readonly tombstoneText: string;
  readonly stages: readonly Box[];
  readonly result: Pos;
  readonly text: { readonly title: number; readonly node: number; readonly small: number };
};

const DESKTOP_STAGE_W = 402;
const DESKTOP_STAGE_GAP = 24;

const DESKTOP: Layout = {
  title: [{ y: 32, text: "재부팅에는 돌아오고, 삭제한 뒤에는 돌아오지 않습니다" }],
  titleX: 120,
  host: { x: 120, y: 120, w: 1680, h: 650 },
  hostLabel: { x: 150, y: 134 },
  bootTag: { x: 1500, y: 132 },
  docker: { x: 160, y: 210, w: 920, h: 230 },
  dockerLabel: { x: 185, y: 226 },
  dockerTag: { x: 340, y: 218 },
  app: { x: 200, y: 290, w: 400, h: 130 },
  db: { x: 640, y: 290, w: 400, h: 130 },
  api: { x: 1120, y: 210, w: 640, h: 230 },
  apiTitle: { x: 1150, y: 232 },
  apiNote: { x: 1150, y: 292 },
  apiTag: { x: 1150, y: 366 },
  disk: { x: 160, y: 500, w: 1600, h: 240 },
  diskLabel: { x: 185, y: 514 },
  state: { x: 1160, y: 560, w: 560, h: 150 },
  volume: { x: 640, y: 560, w: 400, h: 150 },
  keptTag: { x: 360, y: 604 },
  readX: 1440,
  readLabel: { x: 1466, y: 448 },
  tombstoneText: "삭제됨(tombstone)",
  stages: STAGES.map((_, i) => ({
    x: 120 + i * (DESKTOP_STAGE_W + DESKTOP_STAGE_GAP),
    y: 805,
    w: DESKTOP_STAGE_W,
    h: 100,
  })),
  result: { x: 960, y: 950 },
  text: { title: TEXT.title, node: TEXT.label, small: TEXT.small },
};

const MOBILE_STAGE_W = 470;

const MOBILE: Layout = {
  title: [
    { y: 50, text: "재부팅에는 돌아오고," },
    { y: 116, text: "삭제한 뒤에는 돌아오지 않습니다" },
  ],
  titleX: 60,
  host: { x: 60, y: 200, w: 960, h: 815 },
  hostLabel: { x: 90, y: 214 },
  bootTag: { x: 640, y: 208 },
  docker: { x: 90, y: 290, w: 900, h: 250 },
  dockerLabel: { x: 115, y: 302 },
  dockerTag: { x: 290, y: 296 },
  app: { x: 120, y: 385, w: 400, h: 130 },
  db: { x: 560, y: 385, w: 400, h: 130 },
  api: { x: 90, y: 570, w: 900, h: 170 },
  apiTitle: { x: 120, y: 586 },
  apiNote: { x: 420, y: 586 },
  apiTag: { x: 120, y: 652 },
  disk: { x: 90, y: 770, w: 900, h: 225 },
  diskLabel: { x: 115, y: 780 },
  state: { x: 120, y: 855, w: 480, h: 125 },
  volume: { x: 640, y: 855, w: 320, h: 125 },
  keptTag: { x: 700, y: 766 },
  readX: 360,
  readLabel: { x: 386, y: 772 },
  tombstoneText: "tombstone",
  stages: STAGES.map((_, i) => ({
    x: 60 + (i % 2) * (MOBILE_STAGE_W + 20),
    y: 1035 + Math.floor(i / 2) * 90,
    w: MOBILE_STAGE_W,
    h: 75,
  })),
  result: { x: 540, y: 1228 },
  text: { title: MOBILE_TEXT.title, node: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type Tone = "ink" | "accent" | "muted" | "bold";

const BOX_STYLE = {
  ink: { border: `3px solid ${COLOR.ink}`, background: COLOR.white, color: COLOR.ink },
  accent: { border: `5px solid ${COLOR.accent}`, background: COLOR.accentSoft, color: COLOR.ink },
  muted: { border: `2px dashed ${COLOR.muted}`, background: "transparent", color: COLOR.muted },
  bold: { border: `7px solid ${COLOR.ink}`, background: COLOR.white, color: COLOR.ink },
} as const;

/** from 에서 켜지고(FADE), to 가 있으면 그 직전에 꺼지는 불투명도. */
const shownFrom = (frame: number, from: number, to?: number): number =>
  to === undefined ? progress(frame, from, FADE) : progress(frame, from, FADE) * (1 - progress(frame, to - 8, 8));

const stageAt = (frame: number): number =>
  frame >= T.reboot2 ? 3 : frame >= T.remove ? 2 : frame >= T.reboot1 ? 1 : 0;

export const RebootTwiceTombstone: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];

  const offline = (frame >= T.reboot1 && frame < T.docker1) || (frame >= T.reboot2 && frame < T.docker2);

  // 컨테이너: 처음 실행 중 → 재부팅 ①에 꺼짐 → Docker 가 되살림 → DELETE 로 지워져 다시 생기지 않음.
  const containers = frame < T.docker1 ? 1 - progress(frame, T.reboot1, 8) : shownFrom(frame, T.docker1, T.remove);
  const containerTone: Tone = frame < T.reboot1 ? "ink" : "accent";
  const containerScale = frame >= T.docker1 && frame < T.remove ? 0.9 + 0.1 * progress(frame, T.docker1, FADE) : 1;

  // Target API: 재부팅마다 꺼졌다가 Docker 뒤에 다시 켜진다.
  const api =
    frame < T.api1
      ? 1 - progress(frame, T.reboot1, 8)
      : frame < T.api2
        ? shownFrom(frame, T.api1, T.reboot2 + 8)
        : shownFrom(frame, T.api2);
  const apiTone: Tone = frame < T.reboot1 || (frame >= T.remove && frame < T.api2) ? "ink" : "accent";
  const afterDocker = shownFrom(frame, T.api1, T.remove) + shownFrom(frame, T.api2);
  const readDraw =
    frame < T.api2 ? progress(frame, T.api1, 15) * (1 - progress(frame, T.remove - 8, 8)) : progress(frame, T.api2, 15);

  const deleted = frame >= T.remove;
  const tombstoneIn = progress(frame, T.remove, FADE);

  const box = (b: Box, tone: Tone, opacity: number, key: string, children: React.ReactNode, scale = 1) => (
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
        fontFamily: FONT,
        fontSize: l.text.node,
        fontWeight: 720,
        lineHeight: 1.12,
        letterSpacing: "-0.02em",
        whiteSpace: "nowrap",
        opacity,
        transform: `scale(${scale})`,
        ...BOX_STYLE[tone],
      }}
    >
      {children}
    </div>
  );

  const header = (text: string) => (
    <div style={{ fontSize: l.text.small, fontWeight: 620, color: COLOR.muted }}>{text}</div>
  );

  const frameStyle = (b: Box, on: boolean, onBackground: string) => ({
    position: "absolute" as const,
    left: b.x,
    top: b.y,
    width: b.w,
    height: b.h,
    borderRadius: 22,
    boxSizing: "border-box" as const,
    border: on ? `3px solid ${COLOR.muted}` : `3px dashed ${COLOR.muted}`,
    background: on ? onBackground : "transparent",
  });

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760}>
          {line.text}
        </Label>
      ))}

      {/* EC2 호스트: 재부팅 동안 어두워진다. */}
      <div
        style={{
          ...frameStyle(l.host, true, COLOR.white),
          borderRadius: 28,
          border: offline ? `3px dashed ${COLOR.muted}` : `3px solid ${COLOR.ink}`,
          background: offline ? COLOR.surface : COLOR.white,
        }}
      />
      <Label x={l.hostLabel.x} y={l.hostLabel.y} size={l.text.node} weight={760} color={offline ? COLOR.muted : COLOR.ink}>
        EC2 호스트
      </Label>
      <Tag x={l.bootTag.x} y={l.bootTag.y} tone="ink" size={l.text.small} opacity={shownFrom(frame, T.reboot1 + 4, T.remove)}>
        boot ID 바뀜
      </Tag>

      {/* Docker 와 컨테이너 칸. 칸(점선)은 늘 있고, 실행 중인 컨테이너가 그 위에 얹힌다. */}
      <div style={frameStyle(l.docker, !offline, COLOR.surface)} />
      <Label x={l.dockerLabel.x} y={l.dockerLabel.y} size={l.text.small} weight={720} color={COLOR.muted}>
        Docker
      </Label>
      <Tag x={l.dockerTag.x} y={l.dockerTag.y} tone="accent" size={l.text.small} opacity={shownFrom(frame, T.docker1 + 4, T.remove)}>
        unless-stopped
      </Tag>
      <Tag x={l.dockerTag.x} y={l.dockerTag.y} tone="ink" size={l.text.small} opacity={shownFrom(frame, T.remove + 4)}>
        컨테이너 · 네트워크 지움
      </Tag>
      {box(l.app, "muted", 0.8, "app-slot", "앱")}
      {box(l.db, "muted", 0.8, "db-slot", "DB")}
      {box(l.app, containerTone, containers, "app", "앱", containerScale)}
      {box(l.db, containerTone, containers, "db", "DB", containerScale)}

      {/* Target API(systemd) */}
      {box(l.api, "muted", 0.8, "api-slot", null)}
      {box(l.api, apiTone, api, "api", null)}
      <Label x={l.apiTitle.x} y={l.apiTitle.y} size={l.text.node} weight={760} color={api > 0.5 ? COLOR.ink : COLOR.muted}>
        Target API
      </Label>
      <Label x={l.apiNote.x} y={l.apiNote.y} size={l.text.small} weight={620} color={COLOR.muted}>
        systemd
      </Label>
      <Tag x={l.apiTag.x} y={l.apiTag.y} tone="accent" size={l.text.small} opacity={afterDocker}>
        Docker 뒤 시작
      </Tag>

      {/* 디스크: 재부팅에도 남는다. */}
      <div style={frameStyle(l.disk, true, COLOR.white)} />
      <Label x={l.diskLabel.x} y={l.diskLabel.y} size={l.text.small} weight={720} color={COLOR.muted}>
        디스크
      </Label>
      {box(
        l.state,
        deleted ? "bold" : "ink",
        1,
        "state",
        <>
          {header("상태 파일")}
          <div style={{ opacity: deleted ? tombstoneIn : 1 }}>{deleted ? l.tombstoneText : "ready"}</div>
        </>,
      )}
      {box(
        l.volume,
        "ink",
        1,
        "volume",
        <>
          {header("DB 볼륨")}
          <div>데이터 2건</div>
        </>,
      )}
      <Tag x={l.keptTag.x} y={l.keptTag.y} tone="ink" size={l.text.small} opacity={shownFrom(frame, T.removeTag)}>
        볼륨 남김
      </Tag>

      {/* Target API 가 시작할 때 상태 파일을 읽는다. */}
      {readDraw > 0 ? (
        <Arrow
          x1={l.readX}
          y1={l.state.y - 6}
          x2={l.readX}
          y2={l.api.y + l.api.h + 6}
          color={COLOR.accent}
          draw={readDraw}
        />
      ) : null}
      <Label x={l.readLabel.x} y={l.readLabel.y} size={l.text.small} weight={720} color={COLOR.accent} opacity={Math.min(1, readDraw * 2)}>
        읽음
      </Label>

      {/* 단계 띠: 지금 단계만 강조한다. */}
      {l.stages.map((b, i) => {
        const current = stageAt(frame) === i;
        return (
          <div
            key={STAGES[i]}
            style={{
              position: "absolute",
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              borderRadius: 16,
              boxSizing: "border-box",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: FONT,
              fontSize: l.text.node,
              fontWeight: current ? 760 : 640,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              border: current ? `5px solid ${COLOR.accent}` : "none",
              background: current ? COLOR.accentSoft : COLOR.surface,
              color: current ? COLOR.ink : COLOR.muted,
            }}
          >
            {STAGES[i]}
          </div>
        );
      })}

      {/* 단계별 결과 */}
      <Tag x={l.result.x} y={l.result.y} tone="accent" size={l.text.small} anchor="center" opacity={shownFrom(frame, T.ok1, T.remove)}>
        수동 명령 없이 복귀 · 데이터 2건
      </Tag>
      <Tag x={l.result.x} y={l.result.y} tone="ink" size={l.text.small} anchor="center" opacity={shownFrom(frame, T.removeTag, T.reboot2)}>
        204 · 다시 DELETE 204 · GET 404
      </Tag>
      <Tag x={l.result.x} y={l.result.y} tone="accent" size={l.text.small} anchor="center" opacity={shownFrom(frame, T.done)}>
        컨테이너 다시 생기지 않음 · GET 404
      </Tag>
    </AbsoluteFill>
  );
};
