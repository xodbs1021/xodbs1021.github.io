// 콘티: _workspace/blog/mediamtx-auth-defaults-normalization-and-clone/storyboard.md 「SharedDefaultAlias」
// 위 줄 v1.21.0: 전역 기본값과 conf 가 같은 저장 공간을 가리킨다. 환경변수가 user 를 alice 로 바꾸면 두 쪽이
// 함께 바뀌어 비교가 「같음」이 되고, 이전 인증이 목록을 덮어써 alice 가 사라진다.
// 아래 줄 v1.21.1: deepClone 으로 저장 공간이 둘이라 conf 쪽만 바뀌고 비교가 「다름」 → 기동 거부.
// 11월 13일 재측정(v1.21.0 기동 · alice 없음, v1.21.1 종료 코드 1)을 줄인 개념도.
// layout="mobile" 은 1080×1350 휴대폰판(SharedDefaultAliasMobile) — 같은 구성, 글자는 48px 이상.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const SHARED_DEFAULT_ALIAS_FRAMES = 330;

const T = { intro: 0, point: 16, env: 60, write: 96, compare: 140, result: 180 } as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Row = {
  readonly title: { readonly x: number; readonly y: number };
  readonly def: Box;
  readonly conf: Box;
  /** 공유일 때는 store[0] 하나만, 분리일 때는 [기본값 쪽, conf 쪽]. */
  readonly storeShared: Box;
  readonly storeSplit: readonly [Box, Box];
  readonly env: { readonly x: number; readonly y: number };
  /** 환경변수 화살표가 출발하는 x(이름표 아래쪽). 끝은 바뀌는 저장 공간의 오른쪽 가운데. */
  readonly envArrowX: number;
  readonly result: { readonly x: number; readonly y: number };
};
type Layout = {
  readonly rows: readonly [Row, Row];
  readonly title: number;
  readonly text: number;
  /** 줄 제목 — 휴대폰판은 환경변수 이름표와 같은 줄에 들어가게 짧게. */
  readonly sharedTitle: string;
  readonly clonedTitle: string;
};

const desktopRow = (y: number): Row => ({
  title: { x: 120, y },
  def: { x: 120, y: y + 90, w: 300, h: 110 },
  conf: { x: 120, y: y + 240, w: 300, h: 110 },
  storeShared: { x: 560, y: y + 150, w: 380, h: 140 },
  storeSplit: [{ x: 560, y: y + 80, w: 380, h: 120 }, { x: 560, y: y + 235, w: 380, h: 120 }],
  env: { x: 1040, y: y + 4 },
  envArrowX: 1100,
  result: { x: 1040, y: y + 190 },
});
const DESKTOP: Layout = {
  rows: [desktopRow(70), desktopRow(590)], title: TEXT.label, text: TEXT.small, sharedTitle: "v1.21.0 · 같은 저장 공간",
  clonedTitle: "v1.21.1 · deepClone",
};

const mobileRow = (y: number): Row => ({
  title: { x: 60, y },
  def: { x: 60, y: y + 90, w: 330, h: 120 },
  conf: { x: 60, y: y + 260, w: 330, h: 120 },
  storeShared: { x: 540, y: y + 160, w: 420, h: 150 },
  storeSplit: [{ x: 540, y: y + 90, w: 420, h: 120 }, { x: 540, y: y + 260, w: 420, h: 120 }],
  env: { x: 560, y: y + 4 },
  envArrowX: 990,
  result: { x: 60, y: y + 410 },
});
const MOBILE: Layout = {
  rows: [mobileRow(30), mobileRow(700)], title: MOBILE_TEXT.title, text: MOBILE_TEXT.small, sharedTitle: "v1.21.0 · 공유",
  clonedTitle: "v1.21.1 · 복제",
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const RowView: React.FC<{ readonly row: Row; readonly l: Layout; readonly cloned: boolean; readonly frame: number }> = ({
  row, l, cloned, frame,
}) => {
  const intro = progress(frame, T.intro, 14);
  const point = progress(frame, T.point, 20);
  const env = progress(frame, T.env, 16);
  const write = progress(frame, T.write, 20);
  const compare = progress(frame, T.compare, 14);
  const result = progress(frame, T.result, 14);
  const s = l.text;
  const { def, conf } = row;
  const [sd, sc] = cloned ? row.storeSplit : [row.storeShared, row.storeShared];
  const written = write > 0.5;
  const confText = written ? "user: alice" : "user: any";
  const defText = !cloned && written ? "user: alice" : "user: any";
  const target = cloned ? sc : row.storeShared;
  return (
    <>
      <Label x={row.title.x} y={row.title.y} size={l.title} weight={780} color={cloned ? COLOR.accent : COLOR.ink} opacity={intro}>
        {cloned ? l.clonedTitle : l.sharedTitle}
      </Label>
      <Node x={def.x} y={def.y} width={def.w} height={def.h} tone="ink" size={s} opacity={intro}>
        전역 기본값
      </Node>
      <Node x={conf.x} y={conf.y} width={conf.w} height={conf.h} tone="ink" size={s} opacity={intro}>
        conf
      </Node>
      {cloned ? (
        <>
          <Node x={sd.x} y={sd.y} width={sd.w} height={sd.h} tone="muted" size={s} opacity={intro}>{defText}</Node>
          <Node x={sc.x} y={sc.y} width={sc.w} height={sc.h} tone={written ? "accent" : "muted"} size={s} opacity={intro}>{confText}</Node>
        </>
      ) : (
        <Node x={sd.x} y={sd.y} width={sd.w} height={sd.h} tone={written ? "danger" : "muted"} size={s} opacity={intro}>{confText}</Node>
      )}
      {point > 0 ? (
        <>
          <Arrow x1={def.x + def.w} y1={def.y + def.h / 2} x2={sd.x} y2={sd.y + sd.h * (cloned ? 0.5 : 0.3)} color={COLOR.muted} draw={point} />
          <Arrow x1={conf.x + conf.w} y1={conf.y + conf.h / 2} x2={sc.x} y2={sc.y + sc.h * (cloned ? 0.5 : 0.7)} color={COLOR.muted} draw={point} />
        </>
      ) : null}
      <Tag x={row.env.x} y={row.env.y} size={s} tone="ink" opacity={env}>
        환경변수 user=alice
      </Tag>
      {write > 0 ? (
        <Arrow
          x1={row.envArrowX} y1={row.env.y + s * 1.6} x2={target.x + target.w} y2={target.y + target.h / 2}
          color={cloned ? COLOR.accent : COLOR.danger} draw={write}
        />
      ) : null}
      <Tag x={row.result.x} y={row.result.y} size={s} tone={cloned ? "accent" : "danger"} opacity={compare}>
        {cloned ? "비교: 다름" : "비교: 같음"}
      </Tag>
      <Tag x={row.result.x} y={row.result.y + s * 2.1} size={s} tone={cloned ? "accent" : "danger"} opacity={result}>
        {cloned ? "충돌 → 기동 거부" : "이전 인증이 덮어씀 → alice 없음"}
      </Tag>
    </>
  );
};

export const SharedDefaultAlias: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      <RowView row={l.rows[0]} l={l} cloned={false} frame={frame} />
      <RowView row={l.rows[1]} l={l} cloned frame={frame} />
    </AbsoluteFill>
  );
};
