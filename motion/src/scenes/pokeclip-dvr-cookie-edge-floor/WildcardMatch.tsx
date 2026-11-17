// 콘티: _workspace/blog/pokeclip-dvr-cookie-edge-floor/storyboard.md 「WildcardMatch」
// CloudFront 서명 쿠키 정책 Resource 의 `*` 는 `/` · `?` 를 가리지 않는다(개념도 — 수치 없음).
// 위 줄: 옛 정책 {base}/*/A/* 가 남의 방송 요청에 맞는다(앞 * 가 live/B/index.m3u8?x= 를 먹음).
// 아래 줄: 종류별 정책 {base}/live/A/* 는 B 에서 어긋난다.
// 먹은 글자는 재측정 measure/raw/wildcard.tsv 의 「앞 * 가 먹은 글자」 와 같다.
// layout="mobile" 은 1080×1350 휴대폰판 — 두 줄을 세로로 쌓고 글자 48px 이상.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, MONO, TEXT } from "../../theme";

export const WILDCARD_MATCH_FRAMES = 300;

const REQUEST = "{base}/live/B/index.m3u8?x=/A/";
const OLD_POLICY = "{base}/*/A/*";
const NEW_POLICY = "{base}/live/A/*";
/** 요청에서 옛 정책의 앞 `*` 가 먹는 구간 [시작, 끝). */
const STAR_FROM = "{base}/".length;
const STAR_TO = REQUEST.indexOf("/A/");
/** 종류별 정책과 맞물리는 앞부분 길이와 어긋나는 글자 자리. */
const NEW_PREFIX = "{base}/live/".length;
const MISMATCH_AT = NEW_PREFIX;

const T = {
  oldIn: 0,
  starFrom: 22,
  starFrames: 60,
  tail: 82,
  oldResult: 100,
  newIn: 136,
  newMatchFrom: 156,
  newMatchFrames: 30,
  mismatch: 188,
  newResult: 204,
} as const;

type Layout = {
  readonly mono: number;
  readonly head: number;
  readonly tag: number;
  readonly x: number;
  readonly rows: readonly [number, number];
  /** 줄 머리 → 정책 → 요청 → 이름표 사이 세로 간격. */
  readonly gap: { readonly policy: number; readonly request: number; readonly tag: number };
};

const DESKTOP: Layout = {
  mono: 56,
  head: TEXT.label,
  tag: TEXT.label,
  x: 160,
  rows: [70, 560],
  gap: { policy: 70, request: 160, tag: 270 },
};

const MOBILE: Layout = {
  mono: 50,
  head: MOBILE_TEXT.label,
  tag: MOBILE_TEXT.label,
  x: 60,
  rows: [150, 760],
  gap: { policy: 80, request: 180, tag: 300 },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

type Paint = { readonly bg?: string; readonly color?: string; readonly weight?: number; readonly underline?: string };

const Mono: React.FC<{
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly paint: (i: number) => Paint;
  readonly opacity: number;
}> = ({ text, x, y, size, paint, opacity }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", fontFamily: MONO, fontSize: size, opacity, whiteSpace: "pre" }}>
    {[...text].map((c, i) => {
      const p = paint(i);
      return (
        <span
          // 글자 자리마다 고정 — 같은 글자가 여러 번 나와 key 로 자리를 쓴다.
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          style={{
            background: p.bg ?? "transparent",
            color: p.color ?? COLOR.ink,
            fontWeight: p.weight ?? 500,
            borderBottom: `6px solid ${p.underline ?? "transparent"}`,
            padding: "4px 0",
          }}
        >
          {c}
        </span>
      );
    })}
  </div>
);

export const WildcardMatch: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const [y1, y2] = L.rows;

  const oldIn = progress(frame, T.oldIn, 16);
  const starFill = progress(frame, T.starFrom, T.starFrames);
  const starEdge = STAR_FROM + Math.round(starFill * (STAR_TO - STAR_FROM));
  const tail = frame >= T.tail;
  const oldResult = progress(frame, T.oldResult, 16);

  const newIn = progress(frame, T.newIn, 16);
  const newEdge = Math.round(progress(frame, T.newMatchFrom, T.newMatchFrames) * NEW_PREFIX);
  const mismatch = frame >= T.mismatch;
  const newResult = progress(frame, T.newResult, 16);

  const oldPolicyPaint = (i: number): Paint => {
    if (OLD_POLICY[i] === "*" && i === OLD_POLICY.indexOf("*") && frame >= T.starFrom) {
      return { bg: COLOR.accentSoft, color: COLOR.accent, weight: 800 };
    }
    if (tail && i >= OLD_POLICY.indexOf("/A/") && i < OLD_POLICY.indexOf("/A/") + 3) {
      return { weight: 800, underline: COLOR.accent };
    }
    return {};
  };
  const oldRequestPaint = (i: number): Paint => {
    if (i >= STAR_FROM && i < starEdge) return { bg: COLOR.accentSoft, color: COLOR.accent, weight: 700 };
    if (tail && i >= STAR_TO && i < STAR_TO + 3) return { weight: 800, underline: COLOR.accent };
    if (i >= STAR_TO + 3) return { color: COLOR.muted };
    return {};
  };
  const newPolicyPaint = (i: number): Paint => {
    if (i < newEdge) return { weight: 800, underline: COLOR.accent };
    if (mismatch && i === MISMATCH_AT) return { bg: COLOR.dangerSoft, color: COLOR.danger, weight: 800 };
    return {};
  };
  const newRequestPaint = (i: number): Paint => {
    if (i < newEdge) return { weight: 800, underline: COLOR.accent };
    if (mismatch && i === MISMATCH_AT) return { bg: COLOR.dangerSoft, color: COLOR.danger, weight: 800 };
    if (mismatch && i > MISMATCH_AT) return { color: COLOR.muted };
    return {};
  };

  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {/* 위 줄 — 옛 정책 */}
      <Label x={L.x} y={y1} size={L.head} weight={780} opacity={oldIn}>
        옛 정책 · Path=/ 한 벌
      </Label>
      <Mono text={OLD_POLICY} x={L.x} y={y1 + L.gap.policy} size={L.mono} paint={oldPolicyPaint} opacity={oldIn} />
      <Mono text={REQUEST} x={L.x} y={y1 + L.gap.request} size={L.mono} paint={oldRequestPaint} opacity={oldIn} />
      <Tag x={L.x} y={y1 + L.gap.tag} tone="accent" size={L.tag} opacity={progress(frame, T.starFrom + 20, 14) * (1 - oldResult)}>
        * 가 / 와 ? 를 넘어 먹음
      </Tag>
      <Tag x={L.x} y={y1 + L.gap.tag} tone="danger" size={L.tag} scale={0.92 + 0.08 * oldResult} opacity={oldResult}>
        일치 · 남의 방송이 열림
      </Tag>

      {/* 아래 줄 — 종류별 정책 */}
      <Label x={L.x} y={y2} size={L.head} weight={780} opacity={newIn}>
        종류별 정책 · Path=/live/A
      </Label>
      <Mono text={NEW_POLICY} x={L.x} y={y2 + L.gap.policy} size={L.mono} paint={newPolicyPaint} opacity={newIn} />
      <Mono text={REQUEST} x={L.x} y={y2 + L.gap.request} size={L.mono} paint={newRequestPaint} opacity={newIn} />
      <Tag x={L.x} y={y2 + L.gap.tag} tone="accent" size={L.tag} scale={0.92 + 0.08 * newResult} opacity={newResult}>
        불일치 · 403
      </Tag>
    </AbsoluteFill>
  );
};
