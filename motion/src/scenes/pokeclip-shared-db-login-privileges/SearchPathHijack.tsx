// 콘티: _workspace/blog/pokeclip-shared-db-login-privileges/storyboard.md
// 첫 바퀴(고치기 전): 스키마 없는 pg_advisory_xact_lock(정수) 호출이 search_path 순서대로 pg_catalog(bigint 판)를
// 먼저 보지만 형 변환이 필요해 지나치고, 앱 계정이 public 에 심은 integer 판을 골라 media_indexer 신분으로 실행한다.
// 둘째 바퀴(고친 뒤): 호출에 pg_catalog 를 붙이자 그 판만 후보가 되고, public 쓰기는 회수돼 심은 판이 사라진다.
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, type NodeTone } from "../../components/Flow";
import { HopLine, type Point } from "../../components/Hops";
import { Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const SEARCH_PATH_HIJACK_FRAMES = 360;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Spot = { readonly x: number; readonly y: number };

type Layout = {
  readonly call: Box;
  readonly catalog: Box;
  readonly pub: Box;
  /** 첫 바퀴: 호출 → pg_catalog 를 들렀다(점선) → public 으로 간다. */
  readonly probe: readonly Point[];
  readonly hijack: readonly Point[];
  /** 둘째 바퀴: 호출 → pg_catalog. */
  readonly fixed: readonly Point[];
  readonly phase: Spot;
  readonly notes: { readonly catalog: Spot; readonly pub: Spot; readonly result: Spot };
  readonly text: { readonly node: number; readonly code: number; readonly tag: number };
  readonly radius: number;
};

const T = {
  probe: [30, 34],
  skip: 64,
  hijack: [80, 30],
  run: 116,
  reset: 190,
  fixed: [214, 30],
  revoke: 250,
  ok: 250,
} as const;

const D_CALL: Box = { x: 80, y: 360, w: 620, h: 190 };
const D_CAT: Box = { x: 1080, y: 150, w: 760, h: 190 };
const D_PUB: Box = { x: 1080, y: 560, w: 760, h: 190 };

const DESKTOP: Layout = {
  call: D_CALL,
  catalog: D_CAT,
  pub: D_PUB,
  probe: [[700, 420], [1080, 245]],
  hijack: [[1080, 290], [900, 520], [1080, 655]],
  fixed: [[700, 420], [1080, 245]],
  phase: { x: 80, y: 80 },
  notes: { catalog: { x: 1100, y: 360 }, pub: { x: 1100, y: 770 }, result: { x: 80, y: 600 } },
  text: { node: TEXT.label, code: TEXT.small, tag: TEXT.small },
  radius: 14,
};

const M_X = 60;
const M_W = 960;
const M_CALL: Box = { x: M_X, y: 140, w: M_W, h: 240 };
const M_CAT: Box = { x: M_X, y: 580, w: M_W, h: 200 };
const M_PUB: Box = { x: M_X, y: 930, w: M_W, h: 200 };

const MOBILE: Layout = {
  call: M_CALL,
  catalog: M_CAT,
  pub: M_PUB,
  probe: [[300, 380], [300, 580]],
  hijack: [[180, 780], [180, 930]],
  fixed: [[300, 380], [300, 580]],
  phase: { x: M_X, y: 40 },
  notes: { catalog: { x: 420, y: 450 }, pub: { x: 360, y: 815 }, result: { x: M_X, y: 1170 } },
  text: { node: MOBILE_TEXT.label, code: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
  radius: 16,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

const Code: React.FC<{ readonly size: number; readonly children: React.ReactNode }> = ({ size, children }) => (
  <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 600, letterSpacing: "-0.03em", marginTop: 8 }}>{children}</div>
);

export const SearchPathHijack: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const second = frame >= T.reset;
  const intro = progress(frame, 0, 15);
  const firstOut = 1 - progress(frame, T.reset - 12, 12);
  const secondIn = progress(frame, T.reset, 12);

  const catalogTone: NodeTone = second ? (frame >= T.ok ? "accent" : "ink") : "ink";
  const pubTone: NodeTone = second ? "muted" : frame >= T.hijack[0] + T.hijack[1] ? "danger" : "ink";
  const callTone: NodeTone = second ? "ink" : frame >= T.run ? "danger" : "ink";

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      <Tag x={l.phase.x} y={l.phase.y} tone="ink" size={l.text.tag} opacity={intro * firstOut}>
        고치기 전
      </Tag>
      <Tag x={l.phase.x} y={l.phase.y} tone="accent" size={l.text.tag} opacity={secondIn}>
        고친 뒤
      </Tag>

      {/* 선은 상자보다 먼저 그려 상자 가장자리에서 시작 · 끝나 보이게. */}
      {second ? (
        <HopLine hop={{ points: l.fixed, start: T.fixed[0], duration: T.fixed[1], color: COLOR.accent }} frame={frame} radius={l.radius} />
      ) : (
        <div style={{ position: "absolute", inset: 0, opacity: firstOut }}>
          <HopLine hop={{ points: l.probe, start: T.probe[0], duration: T.probe[1], color: COLOR.muted, dashed: true }} frame={frame} radius={l.radius} />
          <HopLine hop={{ points: l.hijack, start: T.hijack[0], duration: T.hijack[1], color: COLOR.danger }} frame={frame} radius={l.radius} />
        </div>
      )}

      <Node x={l.call.x} y={l.call.y} width={l.call.w} height={l.call.h} tone={callTone} size={l.text.node} opacity={intro}>
        사이드카의 잠금 호출
        <Code size={l.text.code}>{second ? "pg_catalog.\npg_advisory_xact_lock(…)" : "pg_advisory_xact_lock(정수)"}</Code>
      </Node>
      <Node x={l.catalog.x} y={l.catalog.y} width={l.catalog.w} height={l.catalog.h} tone={catalogTone} size={l.text.node} opacity={intro}>
        pg_catalog · 내장 함수
        <Code size={l.text.code}>pg_advisory_xact_lock(bigint)</Code>
      </Node>
      <Node
        x={l.pub.x}
        y={l.pub.y}
        width={l.pub.w}
        height={l.pub.h}
        tone={pubTone}
        size={l.text.node}
        opacity={intro * (second ? 1 - 0.55 * progress(frame, T.revoke, 14) : 1)}
      >
        public · 앱 계정이 심은 함수
        <Code size={l.text.code}>pg_advisory_xact_lock(integer)</Code>
      </Node>

      {/* 첫 바퀴 설명. */}
      <Tag x={l.notes.catalog.x} y={l.notes.catalog.y} tone="muted" size={l.text.tag} opacity={progress(frame, T.skip, 10) * firstOut}>
        먼저 찾지만 형 변환 필요
      </Tag>
      <Tag x={l.notes.pub.x} y={l.notes.pub.y} tone="danger" size={l.text.tag} opacity={progress(frame, T.hijack[0] + 10, 10) * firstOut}>
        형이 정확히 맞아 골라짐
      </Tag>
      <Tag x={l.notes.result.x} y={l.notes.result.y} tone="danger" size={l.text.tag} opacity={progress(frame, T.run, 10) * firstOut}>
        media_indexer 신분으로 실행
      </Tag>

      {/* 둘째 바퀴 설명. */}
      <Tag x={l.notes.pub.x} y={l.notes.pub.y} tone="muted" size={l.text.tag} opacity={progress(frame, T.revoke, 10)}>
        public 쓰기 회수 · 후보 아님
      </Tag>
      <Tag x={l.notes.result.x} y={l.notes.result.y} tone="accent" size={l.text.tag} opacity={progress(frame, T.ok + 6, 10)}>
        내장 함수만 실행
      </Tag>
    </AbsoluteFill>
  );
};
