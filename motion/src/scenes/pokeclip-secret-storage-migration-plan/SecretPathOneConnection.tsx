// 콘티: _workspace/blog/pokeclip-secret-storage-migration-plan/storyboard.md
// 송출 연결 하나에서 passphrase 가 지나는 길. OBS 가 streamid 로 접속하면 MediaMTX 가 응답기에 묻고,
// 응답기가 Auth 에 판정을 청한다. Auth 는 PG 에서 streamid 해시로 행을 찾아 비밀 이름을 얻고,
// Secrets Manager 에서 원문을 읽어 응답기 → MediaMTX 로 돌려준다. 원문을 읽는 칸은 Secrets Manager 하나(강조).
// PG 에는 해시와 이름만. 끝에 MediaMTX 와 OBS 사이가 암호 연결로 바뀐다.
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, Wire, type NodeTone } from "../../components/Flow";
import { HopLine, type Hop, type Point } from "../../components/Hops";
import { Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const SECRET_PATH_ONE_CONNECTION_FRAMES = 360;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Name = "obs" | "mtx" | "resp" | "auth" | "sm" | "pg";
type TagSpot = { readonly x: number; readonly y: number };

type Layout = {
  readonly boxes: Record<Name, Box>;
  /** 미디어 서버 묶음(점선 테두리) — MediaMTX 와 응답기를 감싼다. */
  readonly media: Box;
  readonly mediaLabel: TagSpot;
  readonly hops: Record<HopName, readonly Point[]>;
  readonly tags: Record<HopName, TagSpot>;
  readonly final: TagSpot;
  /** PG 아래 「해시 · 비밀 이름만」 이름표를 따로 둘지(휴대폰판은 상자 안 둘째 줄). */
  readonly pgNote: boolean;
  readonly text: { readonly node: number; readonly tag: number };
  readonly radius: number;
};

type HopName = "connect" | "ask" | "resolve" | "lookup" | "ref" | "read" | "secret" | "back1" | "back2";

/** 건너기 순서(프레임). */
const T: Record<HopName, readonly [number, number]> = {
  connect: [20, 26],
  ask: [52, 22],
  resolve: [80, 24],
  lookup: [112, 20],
  ref: [136, 18],
  read: [166, 22],
  secret: [194, 22],
  back1: [224, 24],
  back2: [252, 22],
};
const SECURE_AT = 284;

const LABELS: Record<Name, string> = {
  obs: "OBS",
  mtx: "MediaMTX",
  resp: "응답기",
  auth: "Auth",
  sm: "Secrets Manager",
  pg: "PG",
};

const TAG_TEXT: Record<HopName, string> = {
  connect: "streamid",
  ask: "인증 요청",
  resolve: "판정",
  lookup: "해시로 찾기",
  ref: "비밀 이름",
  read: "이름으로 읽기",
  secret: "원문",
  back1: "passphrase",
  back2: "passphrase",
};

// 가장자리 좌표 도우미.
const right = (b: Box): Point => [b.x + b.w, b.y + b.h / 2];
const left = (b: Box): Point => [b.x, b.y + b.h / 2];
const bottom = (b: Box, dx = 0): Point => [b.x + b.w / 2 + dx, b.y + b.h];
const top = (b: Box, dx = 0): Point => [b.x + b.w / 2 + dx, b.y];

const D_W = 300;
const D_H = 130;
const D_Y = 330;
const DB: Record<Name, Box> = {
  obs: { x: 60, y: D_Y, w: 240, h: D_H },
  mtx: { x: 400, y: D_Y, w: D_W, h: D_H },
  resp: { x: 780, y: D_Y, w: 260, h: D_H },
  auth: { x: 1140, y: D_Y, w: 240, h: D_H },
  sm: { x: 1520, y: D_Y, w: 340, h: D_H },
  pg: { x: 1180, y: 720, w: 400, h: 150 },
};
const shift = (p: Point, dy: number): Point => [p[0], p[1] + dy];

const DESKTOP: Layout = {
  boxes: DB,
  media: { x: 370, y: D_Y - 80, w: 700, h: D_H + 120 },
  mediaLabel: { x: 390, y: D_Y - 66 },
  hops: {
    connect: [right(DB.obs), left(DB.mtx)],
    ask: [right(DB.mtx), left(DB.resp)],
    resolve: [shift(right(DB.resp), -30), shift(left(DB.auth), -30)],
    lookup: [bottom(DB.auth, 0), top(DB.pg, -60)],
    ref: [top(DB.pg, 60), bottom(DB.auth, 80)],
    read: [shift(right(DB.auth), -30), shift(left(DB.sm), -30)],
    secret: [shift(left(DB.sm), 30), shift(right(DB.auth), 30)],
    back1: [shift(left(DB.auth), 30), shift(right(DB.resp), 30)],
    back2: [bottom(DB.resp), [910, 560], [550, 560], bottom(DB.mtx)],
  },
  tags: {
    connect: { x: 180, y: 220 },
    ask: { x: 720, y: 170 },
    resolve: { x: 1090, y: 220 },
    lookup: { x: 960, y: 620 },
    ref: { x: 1470, y: 600 },
    read: { x: 1450, y: 220 },
    secret: { x: 1450, y: 490 },
    back1: { x: 990, y: 500 },
    back2: { x: 560, y: 590 },
  },
  final: { x: 60, y: 520 },
  pgNote: true,
  text: { node: TEXT.label, tag: TEXT.small },
  radius: 14,
};

// 휴대폰판: 위에서 아래로 OBS → MediaMTX → 응답기 → Auth → Secrets Manager, PG 는 Auth 오른쪽.
// 내려가는 선은 상자 왼쪽(가운데 −120), 올라오는 선은 오른쪽(+120). 이름표는 모두 상자 오른쪽 빈칸에 두고,
// 같은 칸을 쓰는 이름표는 뒤의 것이 뜰 때 앞의 것이 사라진다.
const M_X = 60;
const M_W = 480;
const M_H = 120;
const MB: Record<Name, Box> = {
  obs: { x: M_X, y: 40, w: M_W, h: M_H },
  mtx: { x: M_X, y: 270, w: M_W, h: M_H },
  resp: { x: M_X, y: 470, w: M_W, h: M_H },
  auth: { x: M_X, y: 780, w: M_W, h: M_H },
  sm: { x: M_X, y: 1150, w: M_W, h: M_H },
  pg: { x: 640, y: 765, w: 380, h: 150 },
};
const downX = (b: Box): number => b.x + b.w / 2 - 120;
const upX = (b: Box): number => b.x + b.w / 2 + 120;

const MOBILE: Layout = {
  boxes: MB,
  media: { x: 30, y: 240, w: 540, h: 380 },
  mediaLabel: { x: 600, y: 500 },
  hops: {
    connect: [bottom(MB.obs, -120), top(MB.mtx, -120)],
    ask: [bottom(MB.mtx, -120), top(MB.resp, -120)],
    resolve: [[downX(MB.resp), MB.resp.y + M_H], [downX(MB.auth), MB.auth.y]],
    lookup: [shift(right(MB.auth), -25), shift(left(MB.pg), -25)],
    ref: [shift(left(MB.pg), 25), shift(right(MB.auth), 25)],
    read: [[downX(MB.auth), MB.auth.y + M_H], [downX(MB.sm), MB.sm.y]],
    secret: [[upX(MB.sm), MB.sm.y], [upX(MB.auth), MB.auth.y + M_H]],
    back1: [[upX(MB.auth), MB.auth.y], [upX(MB.resp), MB.resp.y + M_H]],
    back2: [[upX(MB.resp), MB.resp.y], [upX(MB.mtx), MB.mtx.y + M_H]],
  },
  tags: {
    connect: { x: 600, y: 180 },
    ask: { x: 600, y: 396 },
    resolve: { x: 600, y: 604 },
    lookup: { x: 640, y: 690 + 6 },
    ref: { x: 640, y: 690 + 6 },
    read: { x: 600, y: 990 },
    secret: { x: 600, y: 990 },
    back1: { x: 600, y: 604 },
    back2: { x: 600, y: 396 },
  },
  final: { x: 600, y: 70 },
  pgNote: false,
  text: { node: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
  radius: 16,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

const HOP_ORDER: readonly HopName[] = ["connect", "ask", "resolve", "lookup", "ref", "read", "secret", "back1", "back2"];
/** 원문(passphrase)이 지나는 건너기는 강조색. */
const SECRET_HOPS = new Set<HopName>(["secret", "back1", "back2"]);

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const SecretPathOneConnection: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 15);

  const toneOf = (name: Name): NodeTone => {
    if (name === "sm" && frame >= T.read[0] + T.read[1]) return "accent";
    if (name === "pg" && frame >= T.lookup[0] && frame < T.ref[0] + T.ref[1] + 10) return "accent";
    return "ink";
  };
  const secure = progress(frame, SECURE_AT, 14);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 미디어 서버 묶음. */}
      <div
        style={{
          position: "absolute",
          left: l.media.x,
          top: l.media.y,
          width: l.media.w,
          height: l.media.h,
          border: `4px dashed ${COLOR.muted}`,
          borderRadius: 24,
          opacity: intro,
        }}
      />
      <Tag x={l.mediaLabel.x} y={l.mediaLabel.y} tone="muted" size={l.text.tag} opacity={intro}>
        미디어 서버
      </Tag>

      {HOP_ORDER.map((name) => {
        const [start, duration] = T[name];
        const hop: Hop = {
          points: l.hops[name],
          start,
          duration,
          color: SECRET_HOPS.has(name) ? COLOR.accent : COLOR.ink,
        };
        return <HopLine key={name} hop={hop} frame={frame} radius={l.radius} />;
      })}

      {(Object.keys(LABELS) as Name[]).map((name) => {
        const b = l.boxes[name];
        return (
          <Node key={name} x={b.x} y={b.y} width={b.w} height={b.h} tone={toneOf(name)} size={l.text.node} opacity={intro}>
            <div style={{ textAlign: "center" }}>{name === "pg" && !l.pgNote ? "PG\n해시 · 이름만" : LABELS[name]}</div>
          </Node>
        );
      })}

      {/* PG 안에 무엇이 있는지 — 해시와 이름만. */}
      <Tag
        x={l.boxes.pg.x + l.boxes.pg.w / 2}
        y={l.boxes.pg.y + l.boxes.pg.h + 20}
        anchor="center"
        tone="muted"
        size={l.text.tag}
        opacity={l.pgNote ? intro : 0}
      >
        해시 · 비밀 이름만
      </Tag>

      {HOP_ORDER.map((name) => {
        const [start] = T[name];
        // 같은 자리를 쓰는 이름표는 뒤의 것이 뜰 때 앞의 것이 사라진다.
        const later = HOP_ORDER.slice(HOP_ORDER.indexOf(name) + 1).find(
          (other) => l.tags[other].x === l.tags[name].x && l.tags[other].y === l.tags[name].y,
        );
        const fadeOut = later ? 1 - progress(frame, T[later][0], 8) : 1;
        return (
          <Tag
            key={name}
            x={l.tags[name].x}
            y={l.tags[name].y}
            tone={SECRET_HOPS.has(name) ? "accent" : "ink"}
            size={l.text.tag}
            opacity={progress(frame, start, 10) * fadeOut}
          >
            {TAG_TEXT[name]}
          </Tag>
        );
      })}

      {secure > 0 ? <Wire points={l.hops.connect} color={COLOR.accent} opacity={secure} /> : null}
      <Tag x={l.final.x} y={l.final.y} tone="accent" size={l.text.tag} opacity={secure}>
        암호 연결 성립
      </Tag>
    </AbsoluteFill>
  );
};
