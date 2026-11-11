// 콘티: _workspace/blog/pokeclip-six-track-input-contract/storyboard.md 「영상 1」
// 원안: 소스마다 트랙 하나(믹서 우회 · 직접 후킹) — 소스 10개면 트랙 10개, 7–10번은 OBS 믹서 밖.
// 결정: OBS 믹서 6칸에 모은다 — 트랙 1 = 본방 믹스(모든 소스), 트랙 2–6 = 소스별, 서버 이름 audio1–audio6.
// 반복 클립, 생성 소재 없음. 좌표는 layout.ts.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, FONT } from "../../theme";
import { BADGE_SIZE, DESKTOP, MOBILE, OUTSIDE_FROM, SOURCES, stemTrack, type Rect } from "./layout";

export const SIX_TRACK_FUNNEL_FRAMES = 330;

/** 장면 순서(프레임, 30fps). */
const T = {
  chips: 15,
  chipStep: 9,
  lineDelay: 4,
  lineDur: 12,
  bypass: 108,
  outside: 116,
  swap: 155,
  mixer: 162,
  mix: 180,
  mixStep: 1.5,
  mixDur: 16,
  stems: 212,
  stemStep: 6,
  stemDur: 14,
  server: 252,
  serverStep: 4,
  final: 284,
} as const;
const FADE = 10;

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

type Tone = "ink" | "accent" | "danger" | "muted";

const BOX_TONE = {
  ink: { background: COLOR.white, border: COLOR.ink, color: COLOR.ink },
  accent: { background: COLOR.accentSoft, border: COLOR.accent, color: COLOR.ink },
  danger: { background: COLOR.dangerSoft, border: COLOR.danger, color: COLOR.danger },
  muted: { background: COLOR.surface, border: COLOR.muted, color: COLOR.muted },
} as const;

type BoxProps = {
  readonly r: Rect;
  readonly tone: Tone;
  readonly size: number;
  readonly dashed?: boolean;
  readonly thick?: boolean;
  readonly opacity?: number;
  readonly shift?: number;
  readonly children?: React.ReactNode;
};

const Box: React.FC<BoxProps> = ({ r, tone, size, dashed = false, thick = false, opacity = 1, shift = 0, children }) => (
  <div
    style={{
      position: "absolute",
      left: r.x,
      top: r.y,
      width: r.w,
      height: r.h,
      borderRadius: 14,
      background: BOX_TONE[tone].background,
      border: `${thick ? 6 : 3}px ${dashed ? "dashed" : "solid"} ${BOX_TONE[tone].border}`,
      color: BOX_TONE[tone].color,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      paddingLeft: 22,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: thick ? 760 : 680,
      letterSpacing: "-0.02em",
      whiteSpace: "nowrap",
      opacity,
      transform: `translateX(${shift}px)`,
    }}
  >
    {children}
  </div>
);

type Stroke = {
  readonly d: string;
  readonly color: string;
  readonly width: number;
  /** 0→1 로 선이 그려지는 정도. */
  readonly draw: number;
  readonly dashed?: boolean;
  readonly opacity?: number;
};

/** 선 묶음 — 캔버스 전체를 덮는 SVG 한 장. 점선은 실선 마스크로 그려 나간다. */
const Strokes: React.FC<{ readonly id: string; readonly items: readonly Stroke[] }> = ({ id, items }) => (
  <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
    {items.map((s, i) => {
      if (s.draw <= 0 || s.opacity === 0) return null;
      const reveal = s.draw >= 1 ? undefined : `${s.draw} 1`;
      if (!s.dashed) {
        return (
          <path
            key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinejoin="round"
            pathLength={1} strokeDasharray={reveal} opacity={s.opacity ?? 1}
          />
        );
      }
      const maskId = `${id}-${i}`;
      return (
        <g key={i} opacity={s.opacity ?? 1}>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <path d={s.d} fill="none" stroke="white" strokeWidth={s.width + 4} pathLength={1} strokeDasharray={reveal} />
          </mask>
          <path d={s.d} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinejoin="round" strokeDasharray="14 12" mask={`url(#${maskId})`} />
        </g>
      );
    })}
  </svg>
);

export const SixTrackFunnel: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const size = l.text.label;

  const intro = progress(frame, 0, 15);
  const draftOut = 1 - progress(frame, T.swap, 14);
  const titleB = progress(frame, T.swap + 8, 14);
  const mixerIn = progress(frame, T.mixer, 16);
  const bypass = progress(frame, T.bypass, FADE) * draftOut;
  const outside = progress(frame, T.outside, FADE) * draftOut;

  const chipAt = (i: number) => T.chips + i * T.chipStep;
  const draftLineAt = (i: number) => chipAt(i) + T.lineDelay;
  const mixAt = (i: number) => T.mix + i * T.mixStep;
  /** 트랙 k(2–6)로 가는 선이 그려지기 시작하는 프레임. */
  const stemAt = (track: number) => T.stems + (track - 2) * T.stemStep;
  const mixDone = progress(frame, mixAt(SOURCES.length - 1) + T.mixDur - 4, FADE);

  const draftColor = (i: number) => (i >= OUTSIDE_FROM ? COLOR.danger : COLOR.muted);

  const strokes: Stroke[] = [
    ...l.draft.paths.map((d, i) => ({
      d, color: draftColor(i), width: 4, dashed: true,
      draw: progress(frame, draftLineAt(i), T.lineDur), opacity: draftOut,
    })),
    ...(l.draft.trunk
      ? [{
        d: l.draft.trunk, color: COLOR.muted, width: 4, dashed: true,
        draw: progress(frame, draftLineAt(0), draftLineAt(SOURCES.length - 1) + T.lineDur - draftLineAt(0)), opacity: draftOut,
      }]
      : []),
    ...l.mixPaths.map((d, i) => ({
      d, color: COLOR.accent, width: 4, draw: progress(frame, mixAt(i), T.mixDur),
    })),
    ...l.stemPaths.map((s) => ({
      d: s.d, color: COLOR.ink, width: 4, draw: progress(frame, stemAt(s.track), T.stemDur),
    })),
  ];

  const bracket = l.draft.bracket;

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {/* 제목: 원안의 질문 → 결정. */}
      <Label x={l.title.x} y={l.title.y} size={l.text.title} weight={760} opacity={intro * draftOut}>
        소스마다 트랙 하나?
      </Label>
      <Label x={l.title.x} y={l.title.y} size={l.text.title} weight={760} opacity={titleB}>
        OBS 믹서 6칸에 모은다
      </Label>
      {l.sourcesHeader ? (
        <Label x={l.sourcesHeader.x} y={l.sourcesHeader.y} size={size} color={COLOR.muted} opacity={intro}>
          소스 10개
        </Label>
      ) : null}

      {/* 원안의 칸(휴대폰판은 「트랙 10개」 상자 하나에 담는다). */}
      {l.draft.box ? (
        <Box r={l.draft.box} tone="muted" dashed size={size} opacity={progress(frame, T.chips, FADE) * draftOut} />
      ) : null}
      {l.draft.boxLabel ? (
        <Label x={l.draft.boxLabel.x} y={l.draft.boxLabel.y} size={size} color={COLOR.muted} opacity={progress(frame, T.chips, FADE) * draftOut}>
          트랙 10개
        </Label>
      ) : null}

      {/* OBS 믹서 6칸. */}
      <Box r={l.mixer} tone="muted" size={size} opacity={mixerIn} />
      <Label x={l.mixerHeader.x} y={l.mixerHeader.y} size={size} weight={760} color={COLOR.ink} opacity={mixerIn}>
        OBS 믹서
      </Label>

      <Strokes id={`six-${layout}`} items={strokes} />

      {l.draft.cells.map((r, i) => (
        <Box
          key={`cell-${i}`} r={r} tone={i >= OUTSIDE_FROM ? "danger" : "muted"} dashed size={size}
          opacity={progress(frame, draftLineAt(i) + T.lineDur - 4, FADE) * draftOut}
        >
          {l.draft.cellText(i)}
        </Box>
      ))}
      <Label x={l.draft.header.x} y={l.draft.header.y} size={size} color={COLOR.muted} opacity={bypass}>
        {l.draft.headerText}
      </Label>
      {bracket ? (
        <div
          style={{
            position: "absolute", left: bracket.x, top: bracket.y1, width: 6, height: (bracket.y2 - bracket.y1) * outside,
            borderRadius: 3, background: COLOR.danger, opacity: outside,
          }}
        />
      ) : null}
      <Tag x={l.draft.outsideTag.x} y={l.draft.outsideTag.y} tone="danger" size={size} opacity={outside}>
        OBS 믹서 밖
      </Tag>

      {l.slots.map((r, k) => {
        const track = k + 1;
        const arrived = track === 1 ? mixDone : progress(frame, stemAt(track) + T.stemDur - 4, FADE);
        const live: Tone = track === 1 ? "accent" : "ink";
        const label = track === 1 ? "트랙 1 · 본방 믹스" : track === 6 ? "트랙 6 · 기타" : `트랙 ${track}`;
        return (
          <div key={`slot-${track}`} style={{ opacity: mixerIn }}>
            <Box r={r} tone="muted" size={size}>{label}</Box>
            <Box r={r} tone={live} thick={track === 1} size={size} opacity={arrived}>{label}</Box>
          </div>
        );
      })}

      {SOURCES.map((name, i) => (
        <Box
          key={name} r={l.chips[i]} tone="ink" size={size}
          opacity={progress(frame, chipAt(i), FADE)} shift={-24 * (1 - progress(frame, chipAt(i), FADE))}
        >
          {name}
        </Box>
      ))}

      {/* 휴대폰판: 칩마다 자기 개별 트랙 번호(선이 한 줄기로 모이므로 번호로 짝을 보인다). */}
      {l.badges?.map((b, i) => (
        <div
          key={`badge-${i}`}
          style={{
            position: "absolute", left: b.x, top: b.y, width: BADGE_SIZE.w, height: BADGE_SIZE.h,
            borderRadius: 999, background: COLOR.ink, color: COLOR.white, display: "grid", placeItems: "center",
            fontFamily: FONT, fontSize: size, fontWeight: 760, lineHeight: 1,
            opacity: progress(frame, stemAt(stemTrack(i)), FADE),
          }}
        >
          {stemTrack(i)}
        </div>
      ))}

      <Label x={l.serverHeader.x} y={l.serverHeader.y} size={size} color={COLOR.muted} opacity={progress(frame, T.server, FADE)}>
        서버
      </Label>
      {l.serverTags.map((p, k) => (
        <Tag
          key={`audio-${k}`} x={p.x} y={p.y} tone={k === 0 ? "accent" : "ink"} size={size}
          opacity={progress(frame, T.server + k * T.serverStep, FADE)}
        >
          {`audio${k + 1}`}
        </Tag>
      ))}

      <Tag x={l.finalTag.x} y={l.finalTag.y} tone="accent" size={size} opacity={progress(frame, T.final, FADE)}>
        믹스 1 + 소스별 5
      </Tag>
    </AbsoluteFill>
  );
};
