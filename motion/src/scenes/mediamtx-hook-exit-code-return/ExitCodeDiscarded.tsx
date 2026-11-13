// 콘티: _workspace/blog/mediamtx-hook-exit-code-return/storyboard.md 「ExitCodeDiscarded」
// 위 줄 v1.20.1: 자식이 5로 끝나고 ExitCode() 가 5를 계산하지만 그 값을 버리고 0을 돌려준다.
// 재시작 켬은 「code 0」 줄, 재시작 끔은 아무 줄도 남기지 않는다. 아래 줄 v1.21.0: 5를 그대로 돌려줘
// 두 설정 모두 「code 5」 줄을 남긴다. 결과 줄은 11월 13일 재측정의 실제 로그를 줄인 것(개념도).
// layout="mobile" 은 1080×1350 휴대폰판(ExitCodeDiscardedMobile) — 줄마다 상자를 두 단으로, 글자는 48px 이상.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const EXIT_CODE_DISCARDED_FRAMES = 300;

const T = {
  intro: 0,
  exit: 20,
  calc: 50, // 계산 상자는 처음부터 보인다(타이밍 표식용)
  ret: 95,
  result: 140,
} as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Row = {
  readonly title: { readonly x: number; readonly y: number };
  readonly child: Box;
  readonly calc: Box;
  readonly ret: Box;
  /** 결과 이름표 두 개(재시작 켬 · 끔)의 왼쪽 위. */
  readonly results: readonly [{ x: number; y: number }, { x: number; y: number }];
};
type Layout = { readonly rows: readonly [Row, Row]; readonly title: number; readonly text: number; readonly twoTier: boolean };

const desktopRow = (y: number): Row => ({
  title: { x: 120, y },
  child: { x: 120, y: y + 80, w: 330, h: 150 },
  calc: { x: 530, y: y + 80, w: 330, h: 150 },
  ret: { x: 940, y: y + 80, w: 280, h: 150 },
  results: [{ x: 1300, y: y + 86 }, { x: 1300, y: y + 166 }],
});
const DESKTOP: Layout = { rows: [desktopRow(90), desktopRow(570)], title: TEXT.label, text: TEXT.small, twoTier: false };

const mobileRow = (y: number): Row => ({
  title: { x: 60, y },
  child: { x: 60, y: y + 90, w: 420, h: 150 },
  calc: { x: 600, y: y + 90, w: 420, h: 150 },
  ret: { x: 60, y: y + 320, w: 420, h: 150 },
  results: [{ x: 540, y: y + 335 }, { x: 540, y: y + 420 }],
});
const MOBILE: Layout = { rows: [mobileRow(40), mobileRow(700)], title: MOBILE_TEXT.title, text: MOBILE_TEXT.small, twoTier: true };

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const RowView: React.FC<{ readonly row: Row; readonly l: Layout; readonly fixed: boolean; readonly frame: number }> = ({
  row, l, fixed, frame,
}) => {
  const intro = progress(frame, T.intro, 14);
  const exit = progress(frame, T.exit, 24);
  const ret = progress(frame, T.ret, 24);
  const result = progress(frame, T.result, 14);
  const s = l.text;
  const { child, calc: c, ret: r } = row;
  // 자식 → 계산(가로), 계산 → 반환(가로 또는 두 단이면 아래로 꺾지 않고 왼쪽 아래로 대각선)
  const a1 = { x1: child.x + child.w, y1: child.y + child.h / 2, x2: c.x, y2: c.y + c.h / 2 };
  const a2 = l.twoTier
    ? { x1: c.x + c.w / 2, y1: c.y + c.h, x2: r.x + r.w / 2, y2: r.y }
    : { x1: c.x + c.w, y1: c.y + c.h / 2, x2: r.x, y2: r.y + r.h / 2 };
  return (
    <>
      <Label x={row.title.x} y={row.title.y} size={l.title} weight={780} color={fixed ? COLOR.accent : COLOR.ink} opacity={intro}>
        {fixed ? "v1.21.0 · return 추가" : "v1.20.1 · return 빠짐"}
      </Label>
      <Node x={child.x} y={child.y} width={child.w} height={child.h} tone="ink" size={s} opacity={intro}>
        {"자식 프로세스\nexit 5"}
      </Node>
      <Node x={c.x} y={c.y} width={c.w} height={c.h} tone="ink" size={s} opacity={intro}>
        {"ExitCode()\n= 5"}
      </Node>
      <Node
        x={r.x} y={r.y} width={r.w} height={r.h} size={s}
        tone={ret < 0.5 ? "muted" : fixed ? "accent" : "danger"} opacity={intro}
      >
        {ret < 0.5 ? "반환값" : fixed ? "return 5" : "return 0"}
      </Node>
      {exit > 0 ? <Arrow {...a1} color={COLOR.ink} draw={exit} /> : null}
      {ret > 0 ? <Arrow {...a2} color={fixed ? COLOR.accent : COLOR.danger} dashed={!fixed} draw={ret} /> : null}
      {!fixed ? (
        <Tag
          x={(a2.x1 + a2.x2) / 2 + (l.twoTier ? 30 : 0)} y={l.twoTier ? (a2.y1 + a2.y2) / 2 - s * 0.7 : c.y + c.h + 16}
          size={s} tone="danger" anchor={l.twoTier ? "left" : "center"} opacity={ret}
        >
          5는 버림
        </Tag>
      ) : null}
      <Tag x={row.results[0].x} y={row.results[0].y} size={s} tone={fixed ? "accent" : "danger"} opacity={result}>
        {fixed ? "재시작 켬: code 5" : "재시작 켬: code 0"}
      </Tag>
      <Tag x={row.results[1].x} y={row.results[1].y} size={s} tone={fixed ? "accent" : "muted"} opacity={result}>
        {fixed ? "재시작 끔: code 5" : "재시작 끔: 줄 없음"}
      </Tag>
    </>
  );
};

export const ExitCodeDiscarded: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <RowView row={l.rows[0]} l={l} fixed={false} frame={frame} />
      <RowView row={l.rows[1]} l={l} fixed frame={frame} />
    </AbsoluteFill>
  );
};
