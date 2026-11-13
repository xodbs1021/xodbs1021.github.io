// 콘티: _workspace/blog/mediamtx-user-srt-passphrase-boundaries/storyboard.md 「AuthBodyWait」
// SRT 접속 → MediaMTX 경로 관리자가 HTTP 인증 요청 → 200 헤더는 바로 오지만 본문은 1초 늦게 온다.
// 그동안 같은 경로 관리자에 들어온 GET /v3/paths/list 가 기다린다. 본문이 오면 사용자 암호를 고르고
// 목록 응답이 나간다. 1초 · 1.0초는 v1.21.3과 #6306 의 재측정 중앙값(본문 1초 지연 조건), 그 밖은 개념도.
// layout="mobile" 은 1080×1350 휴대폰판(AuthBodyWaitMobile) — 세 참가자를 위아래로 쌓는다.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const AUTH_BODY_WAIT_FRAMES = 330;

const T = {
  connect: 16,
  post: 40,
  headers: 64,
  api: 78,
  body: 214, // 헤더 뒤 약 1초(150프레임)를 압축해 보여 준다
  choose: 232,
  release: 246,
} as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Layout = {
  readonly pub: Box;
  readonly mtx: Box;
  readonly auth: Box;
  readonly api: Box;
  readonly clock: { readonly x: number; readonly y: number };
  readonly note: { readonly x: number; readonly y: number };
  readonly vertical: boolean;
  /** 목록 상자 제목(휴대폰판은 짧게 — 캡션이 GET /v3/paths/list 를 다시 말한다). */
  readonly apiTitle: string;
  readonly noteLines: readonly string[];
  readonly text: { readonly label: number; readonly small: number };
};

const DESKTOP: Layout = {
  pub: { x: 100, y: 300, w: 340, h: 200 },
  mtx: { x: 760, y: 300, w: 400, h: 200 },
  auth: { x: 1480, y: 300, w: 340, h: 200 },
  api: { x: 760, y: 720, w: 400, h: 150 },
  clock: { x: 100, y: 80 },
  note: { x: 100, y: 940 },
  vertical: false,
  apiTitle: "GET /v3/paths/list",
  noteLines: ["대기는 v1.21.3 · #6306 같음 · 사용자 암호는 #6306만"],
  text: { label: TEXT.label, small: TEXT.small },
};

const MOBILE: Layout = {
  pub: { x: 60, y: 200, w: 440, h: 170 },
  mtx: { x: 60, y: 560, w: 440, h: 200 },
  auth: { x: 60, y: 960, w: 440, h: 170 },
  api: { x: 600, y: 575, w: 420, h: 170 },
  clock: { x: 60, y: 70 },
  note: { x: 60, y: 1170 },
  vertical: true,
  apiTitle: "목록 API",
  noteLines: ["대기는 v1.21.3 · #6306 같음", "사용자 암호는 #6306만"],
  text: { label: MOBILE_TEXT.label, small: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 두 상자 사이 화살표의 시작 · 끝(가로 배치면 좌우 가장자리, 세로 배치면 위아래 가장자리). off 로 평행선을 띄운다. */
const between = (a: Box, b: Box, vertical: boolean, off: number) => {
  if (vertical) {
    const down = b.y > a.y;
    const x = a.x + a.w / 2 + off;
    return { x1: x, y1: down ? a.y + a.h : a.y, x2: x, y2: down ? b.y : b.y + b.h };
  }
  const right = b.x > a.x;
  const y = a.y + a.h / 2 + off;
  return { x1: right ? a.x + a.w : a.x, y1: y, x2: right ? b.x : b.x + b.w, y2: y };
};

export const AuthBodyWait: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const s = l.text.small;
  const intro = progress(frame, 0, 14);
  const connect = progress(frame, T.connect, 20);
  const post = progress(frame, T.post, 20);
  const headers = progress(frame, T.headers, 12);
  const apiIn = progress(frame, T.api, 12);
  const body = progress(frame, T.body, 16);
  const choose = progress(frame, T.choose, 12);
  const release = progress(frame, T.release, 12);
  const waiting = frame >= T.headers && frame < T.body + 16;
  const wait = interpolate(frame, [T.headers, T.body], [0, 1], CLAMP);

  const c = between(l.pub, l.mtx, l.vertical, -40);
  const back = between(l.mtx, l.pub, l.vertical, -40 + 80);
  const p = between(l.mtx, l.auth, l.vertical, -40);
  const h = between(l.auth, l.mtx, l.vertical, 40);
  const mid = (a: { x1: number; y1: number; x2: number; y2: number }) => ({ x: (a.x1 + a.x2) / 2, y: (a.y1 + a.y2) / 2 });
  const labelAt = (a: { x1: number; y1: number; x2: number; y2: number }, side: -1 | 1) => {
    const m = mid(a);
    return l.vertical ? { x: m.x + side * 24, y: m.y - s * 0.6, anchor: side > 0 ? ("left" as const) : ("right" as const) } : { x: m.x, y: m.y + (side < 0 ? -s * 1.6 : 14), anchor: "center" as const };
  };
  const lc = labelAt(c, -1);
  const lp = labelAt(p, -1);
  const lh = labelAt(h, 1);
  const apiLink = l.vertical
    ? { x1: l.api.x, y1: l.api.y + l.api.h / 2, x2: l.mtx.x + l.mtx.w, y2: l.api.y + l.api.h / 2 }
    : { x1: l.api.x + l.api.w / 2, y1: l.api.y, x2: l.api.x + l.api.w / 2, y2: l.mtx.y + l.mtx.h };

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <Label x={l.clock.x} y={l.clock.y} size={l.text.label} weight={780} opacity={intro}>
        {waiting || frame >= T.body ? `본문 대기 ${(wait * 1.0).toFixed(1)}초` : "인증 응답 본문을 1초 늦게 보냄"}
      </Label>

      <Node x={l.pub.x} y={l.pub.y} width={l.pub.w} height={l.pub.h} tone="ink" size={l.text.label} opacity={intro}>
        송출자
      </Node>
      <Node x={l.mtx.x} y={l.mtx.y} width={l.mtx.w} height={l.mtx.h} tone={waiting ? "muted" : choose > 0.5 ? "accent" : "ink"} size={l.text.label} opacity={intro}>
        {"MediaMTX\n경로 관리자"}
      </Node>
      <Node x={l.auth.x} y={l.auth.y} width={l.auth.w} height={l.auth.h} tone="ink" size={l.text.label} opacity={intro}>
        인증 응답기
      </Node>

      {connect > 0 ? <Arrow {...c} color={COLOR.ink} draw={connect} /> : null}
      <Label x={lc.x} y={lc.y} size={s} weight={700} anchor={lc.anchor} opacity={connect}>SRT 접속</Label>
      {post > 0 ? <Arrow {...p} color={COLOR.ink} draw={post} /> : null}
      <Label x={lp.x} y={lp.y} size={s} weight={700} anchor={lp.anchor} opacity={post}>인증 요청</Label>
      {headers > 0 ? <Arrow {...h} color={body > 0.5 ? COLOR.accent : COLOR.muted} dashed={body < 0.5} draw={headers} /> : null}
      <Label x={lh.x} y={lh.y} size={s} weight={700} anchor={lh.anchor} color={body > 0.5 ? COLOR.accent : COLOR.muted} opacity={headers}>
        {body > 0.5 ? "본문 도착" : "200 헤더만"}
      </Label>

      <div
        style={{
          position: "absolute", left: l.api.x, top: l.api.y, width: l.api.w, height: l.api.h, boxSizing: "border-box",
          border: `4px solid ${release > 0.5 ? COLOR.accent : COLOR.muted}`, borderRadius: 16,
          background: release > 0.5 ? COLOR.accentSoft : COLOR.surface, opacity: apiIn,
          display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px", fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: s, fontWeight: 760, color: COLOR.ink }}>{l.apiTitle}</div>
        <div style={{ fontSize: s, fontWeight: 650, color: release > 0.5 ? COLOR.accent : COLOR.muted }}>
          {release > 0.5 ? "응답 · 1.0초 뒤" : "대기 중"}
        </div>
        <div style={{ position: "absolute", left: 0, bottom: 0, height: 10, width: `${wait * 100}%`, background: release > 0.5 ? COLOR.accent : COLOR.muted, borderRadius: 8 }} />
      </div>
      {apiIn > 0 ? <Arrow {...apiLink} color={release > 0.5 ? COLOR.accent : COLOR.muted} dashed={release < 0.5} draw={apiIn} /> : null}

      {choose > 0 ? <Arrow {...back} color={COLOR.accent} draw={choose} /> : null}
      <Tag
        x={l.vertical ? l.pub.x + l.pub.w + 40 : l.pub.x}
        y={l.vertical ? l.pub.y + l.pub.h / 2 - 34 : l.pub.y + l.pub.h + 36}
        tone="accent" size={s} opacity={choose}
      >
        사용자 암호로 수락
      </Tag>
      {l.noteLines.map((line, i) => (
        <Label key={line} x={l.note.x} y={l.note.y + i * s * 1.3} size={s} weight={650} color={COLOR.muted} opacity={release}>
          {line}
        </Label>
      ))}
    </AbsoluteFill>
  );
};
