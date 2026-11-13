// 콘티: _workspace/blog/mediamtx-offline-recording-source-lifecycle/storyboard.md 「OfflineRecordingGate」
// 네 줄이 같은 시간축(오프라인 → 온라인 → 오프라인)을 공유한다. 얇은 띠는 상태(청록 = 온라인), 굵은 막대는 녹화다.
// 재생점이 지나가며 녹화 막대가 자란다.
// true 는 오프라인에도 녹화하고, false 는 publisher · static source · 오프라인 중 reload 모두 온라인 구간만 녹화한다.
// 아래 두 줄에는 원 PR 커밋(4a69843a)의 동작을 빨간 이름표로 겹쳐 둔다. 개념도다(실제 길이 · 시각이 아님).
// layout="mobile" 은 1080×1350 휴대폰판(OfflineRecordingGateMobile) — 줄 간격만 늘리고 글자는 48px 이상.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const OFFLINE_RECORDING_GATE_FRAMES = 360;

const T = { intro: 0, sweepStart: 30, sweepEnd: 270 } as const;
/** 시간축 위 온라인 구간(0–1 비율)과 reload 시점. */
const ONLINE = { from: 0.36, to: 0.68 } as const;
const RELOAD_AT = 0.16;

type Case = {
  readonly title: string;
  /** 녹화가 켜지는 구간들(0–1). */
  readonly rec: ReadonlyArray<readonly [number, number]>;
  readonly tone: "ink" | "accent";
  readonly reload?: boolean;
  /** 원 PR 커밋의 다른 동작 — 이름표와 그 위치(0–1). */
  readonly original?: { readonly at: number; readonly text: string };
};

const CASES: readonly Case[] = [
  { title: "true (기본값)", rec: [[0, 1]], tone: "ink" },
  { title: "false · publisher", rec: [[ONLINE.from, ONLINE.to]], tone: "accent" },
  {
    title: "false · static source", rec: [[ONLINE.from, ONLINE.to]], tone: "accent",
    original: { at: ONLINE.from, text: "원 PR: 녹화 없음" },
  },
  {
    title: "false · 오프라인 중 reload", rec: [[ONLINE.from, ONLINE.to]], tone: "accent", reload: true,
    original: { at: RELOAD_AT, text: "원 PR: 녹화 시작" },
  },
];

type Layout = {
  readonly x0: number;
  readonly x1: number;
  readonly top: number;
  readonly rowH: number;
  readonly stateH: number;
  readonly recH: number;
  readonly text: number;
  readonly titleDy: number;
  readonly stateDy: number;
  readonly recDy: number;
};

const DESKTOP: Layout = {
  x0: 620, x1: 1800, top: 120, rowH: 230, stateH: 16, recH: 56, text: TEXT.small, titleDy: 52, stateDy: 50, recDy: 84,
};
const MOBILE: Layout = {
  x0: 60, x1: 1020, top: 150, rowH: 300, stateH: 16, recH: 60, text: MOBILE_TEXT.small, titleDy: 0, stateDy: 84, recDy: 118,
};
const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const OfflineRecordingGate: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, T.intro, 14);
  const sweep = Math.min(1, Math.max(0, (frame - T.sweepStart) / (T.sweepEnd - T.sweepStart)));
  const w = l.x1 - l.x0;
  const xAt = (r: number) => l.x0 + w * r;
  const titleX = layout === "mobile" ? l.x0 : 120;
  const legendY = layout === "mobile" ? 40 : 40;
  return (
    <AbsoluteFill style={{ background: COLOR.white, fontFamily: FONT }}>
      {/* 상태 띠 범례: 회색 = 오프라인(대체 화면), 청록 = 온라인 */}
      <Label x={xAt(ONLINE.from / 2)} y={legendY} size={l.text} color={COLOR.muted} anchor="center" opacity={intro}>
        오프라인
      </Label>
      <Label x={xAt((ONLINE.from + ONLINE.to) / 2)} y={legendY} size={l.text} color={COLOR.accent} weight={760} anchor="center" opacity={intro}>
        온라인
      </Label>
      <Label x={xAt((ONLINE.to + 1) / 2)} y={legendY} size={l.text} color={COLOR.muted} anchor="center" opacity={intro}>
        오프라인
      </Label>
      {/* 재생점은 이름표 아래에 깐다 */}
      <div
        style={{
          position: "absolute", left: l.x0 + w * sweep - 3, top: l.top + l.stateDy - 14, width: 6,
          height: (CASES.length - 1) * l.rowH + l.recDy - l.stateDy + l.recH + 28,
          background: COLOR.ink, opacity: sweep > 0 && sweep < 1 ? 1 : 0,
        }}
      />
      {CASES.map((c, i) => {
        const y = l.top + i * l.rowH;
        const sy = y + l.stateDy;
        const ry = y + l.recDy;
        const reloadShown = c.reload && sweep >= RELOAD_AT ? progress(frame, T.sweepStart + (T.sweepEnd - T.sweepStart) * RELOAD_AT, 8) : 0;
        const origShown = c.original && sweep >= c.original.at
          ? progress(frame, T.sweepStart + (T.sweepEnd - T.sweepStart) * c.original.at, 10)
          : 0;
        return (
          <div key={c.title}>
            <Label x={titleX} y={y + l.titleDy} size={l.text} weight={720} opacity={intro}>
              {c.title}
            </Label>
            {/* 상태 띠 */}
            <div style={{ position: "absolute", left: l.x0, top: sy, width: w, height: l.stateH, borderRadius: 10, background: COLOR.line, opacity: intro }} />
            <div
              style={{
                position: "absolute", left: xAt(ONLINE.from), top: sy, width: w * (ONLINE.to - ONLINE.from), height: l.stateH,
                borderRadius: 10, background: COLOR.accent, opacity: intro,
              }}
            />
            {/* 녹화 막대: 바닥 테두리 + 재생점까지 자란 구간 */}
            <div
              style={{
                position: "absolute", left: l.x0, top: ry, width: w, height: l.recH, borderRadius: 10, boxSizing: "border-box",
                border: `3px dashed ${COLOR.muted}`, opacity: intro,
              }}
            />
            {c.rec.map(([a, b]) => {
              const end = Math.min(b, sweep);
              if (end <= a) return null;
              return (
                <div
                  key={a}
                  style={{
                    position: "absolute", left: xAt(a), top: ry, width: w * (end - a), height: l.recH, borderRadius: 10,
                    background: c.tone === "ink" ? COLOR.ink : COLOR.accent,
                  }}
                />
              );
            })}
            {c.reload ? (
              <Tag x={xAt(RELOAD_AT)} y={ry + l.recH / 2 - l.text * 0.72 - 8} size={l.text} tone="ink" anchor="center" opacity={reloadShown}>
                reload
              </Tag>
            ) : null}
            {c.original ? (
              <Tag
                x={Math.min(xAt(c.original.at), l.x1 - 460)} y={ry + l.recH + 8} size={l.text} tone="danger" opacity={origShown}
              >
                {c.original.text}
              </Tag>
            ) : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
