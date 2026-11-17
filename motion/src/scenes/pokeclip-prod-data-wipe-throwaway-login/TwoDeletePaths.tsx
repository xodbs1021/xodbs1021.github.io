// 콘티: _workspace/blog/pokeclip-prod-data-wipe-throwaway-login/storyboard.md 「TwoDeletePaths」
// 같은 DELETE 를 두 신분으로 했을 때 권한이 어디까지 열리는가(개념도 — 수치 없음).
// 왼쪽: 마스터 SET ROLE app_x → 앱 트리거 RESET ROLE → 마스터 권한(danger).
// 오른쪽: 일회용 로그인(표 권한만) → DELETE 됨 · INSERT 막힘 · 1시간 뒤 비밀번호 로그인 만료.
// layout="mobile" 은 1080×1350 휴대폰판 — 두 단을 세로로 쌓고 글자 48px 이상.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node, Wire } from "../../components/Flow";
import { Label, Tag } from "../../components/Timeline";
import { progress, visibleBetween } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const TWO_DELETE_PATHS_FRAMES = 300;

const T = {
  intro: 0,
  leftSetRole: 40,
  leftTrigger: 62,
  leftDanger: 84,
  rightDelete: 110,
  rightInsert: 132,
  rightExpire: 165,
  hold: 210,
} as const;

type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

type Layout = {
  readonly title: number;
  readonly text: number;
  readonly small: number;
  readonly head: { readonly leftX: number; readonly rightX: number; readonly y: number };
  readonly master: Box;
  readonly tableL: Box;
  readonly dangerL: Box;
  readonly oneoff: Box;
  readonly tableR: Box;
  readonly insertR: Box;
  readonly dangerR: Box;
  readonly divider: { readonly x: number; readonly y1: number; readonly y2: number } | null;
};

const DESKTOP: Layout = {
  title: TEXT.label,
  text: TEXT.small,
  small: TEXT.small,
  head: { leftX: 120, rightX: 1020, y: 70 },
  master: { x: 150, y: 170, w: 620, h: 120 },
  tableL: { x: 230, y: 400, w: 460, h: 110 },
  dangerL: { x: 120, y: 620, w: 680, h: 180 },
  oneoff: { x: 1050, y: 170, w: 680, h: 120 },
  tableR: { x: 1140, y: 400, w: 500, h: 110 },
  insertR: { x: 1140, y: 560, w: 500, h: 90 },
  dangerR: { x: 1050, y: 700, w: 680, h: 150 },
  divider: { x: 940, y1: 150, y2: 880 },
};

const MOBILE: Layout = {
  title: MOBILE_TEXT.title,
  text: MOBILE_TEXT.small,
  small: MOBILE_TEXT.small,
  head: { leftX: 70, rightX: 70, y: 60 },
  master: { x: 70, y: 150, w: 940, h: 130 },
  tableL: { x: 140, y: 330, w: 800, h: 120 },
  dangerL: { x: 70, y: 500, w: 940, h: 150 },
  oneoff: { x: 70, y: 770, w: 940, h: 130 },
  tableR: { x: 140, y: 950, w: 800, h: 110 },
  insertR: { x: 140, y: 1090, w: 800, h: 90 },
  dangerR: { x: 70, y: 1210, w: 940, h: 120 },
  divider: null,
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

const bottom = (b: Box): [number, number] => [b.x + b.w / 2, b.y + b.h];

export const TwoDeletePaths: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const mobile = layout === "mobile";

  const introL = progress(frame, T.intro, 24);
  const setRole = progress(frame, T.leftSetRole, 20);
  const trigFire = progress(frame, T.leftTrigger, 18);
  const dangerL = visibleBetween(frame, T.leftDanger, TWO_DELETE_PATHS_FRAMES, 14);
  const dangerPop = progress(frame, T.leftDanger, 16);
  const delR = progress(frame, T.rightDelete, 18);
  const insR = visibleBetween(frame, T.rightInsert, TWO_DELETE_PATHS_FRAMES, 12);
  // 1시간 뒤: 일회용 로그인이 흐려진다(muted).
  const expire = progress(frame, T.rightExpire, 36);
  const oneoffOpacity = 1 - 0.45 * expire;

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {/* 열 구분선 */}
      {L.divider ? (
        <div style={{ position: "absolute", left: L.divider.x, top: L.divider.y1, width: 2, height: L.divider.y2 - L.divider.y1, background: COLOR.line, opacity: introL }} />
      ) : null}

      {/* 제목 */}
      <Label x={L.head.leftX} y={L.head.y} size={L.title} weight={780} opacity={introL}>
        마스터로 지우기
      </Label>
      <Label x={mobile ? L.head.rightX : L.head.rightX} y={mobile ? 700 : L.head.y} size={L.title} weight={780} opacity={introL}>
        일회용 계정으로 지우기
      </Label>

      {/* ===== 왼쪽: 마스터 SET ROLE 경로 ===== */}
      <Node x={L.master.x} y={L.master.y} width={L.master.w} height={L.master.h} tone="ink" size={L.text} opacity={introL}>
        {"마스터\nSET ROLE app_x"}
      </Node>
      <Wire points={[bottom(L.master), [bottom(L.master)[0], L.tableL.y]]} arrow opacity={setRole} />
      <Node x={L.tableL.x} y={L.tableL.y} width={L.tableL.w} height={L.tableL.h} tone="accent" size={L.text} opacity={introL}>
        {"앱 표 app_x.table_a — DELETE"}
      </Node>
      <Wire points={[bottom(L.tableL), [bottom(L.tableL)[0], L.dangerL.y]]} arrow color={COLOR.danger} opacity={trigFire} />
      <Node x={L.dangerL.x} y={L.dangerL.y} width={L.dangerL.w} height={L.dangerL.h} tone="danger" size={L.text} opacity={dangerL}>
        {"앱이 심은 트리거가\nRESET ROLE → 마스터 권한으로 돎"}
      </Node>
      <Tag x={L.dangerL.x + L.dangerL.w / 2} y={L.dangerL.y - 46} anchor="center" tone="danger" size={L.small} scale={0.9 + 0.1 * dangerPop} opacity={dangerPop}>
        권한 상승
      </Tag>

      {/* ===== 오른쪽: 일회용 로그인 경로 ===== */}
      <Node x={L.oneoff.x} y={L.oneoff.y} width={L.oneoff.w} height={L.oneoff.h} tone="ink" size={L.text} opacity={introL * oneoffOpacity}>
        {"일회용 로그인\n표 권한만 · 멤버십 없음"}
      </Node>
      <Wire points={[bottom(L.oneoff), [bottom(L.oneoff)[0], L.tableR.y]]} arrow opacity={delR} />
      <Node x={L.tableR.x} y={L.tableR.y} width={L.tableR.w} height={L.tableR.h} tone="accent" size={L.text} opacity={progress(frame, T.rightDelete, 18)}>
        {"앱 표 app_x.table_a — DELETE 됨"}
      </Node>
      <Node x={L.insertR.x} y={L.insertR.y} width={L.insertR.w} height={L.insertR.h} tone="muted" size={L.small} opacity={insR}>
        {"INSERT 거부 · 상승 없음"}
      </Node>
      <Node x={L.dangerR.x} y={L.dangerR.y} width={L.dangerR.w} height={L.dangerR.h} tone="muted" size={L.small} opacity={insR}>
        {"트리거가 돌아갈 곳은\n일회용 계정뿐"}
      </Node>
      <Tag
        x={mobile ? 600 : L.oneoff.x + L.oneoff.w / 2}
        y={L.oneoff.y - 46}
        anchor={mobile ? "left" : "center"}
        tone="ink"
        size={L.small}
        opacity={expire}
      >
        1시간 뒤 로그인 만료
      </Tag>
    </AbsoluteFill>
  );
};
