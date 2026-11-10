// 콘티: _workspace/blog/pokeclip-media-timeline-over-wall-clock/storyboard.md 「영상 1」
// 섞기 규칙: 한 장 안은 미디어 길이를 누적해 잇고, 틈이 문턱을 넘으면 새 장을 열고,
// 1초 미만으로 일찍 온 조각은 표시 시각을 최대 999ms 당겨 적고 그 값으로 새 장을 연다(반복 클립, 생성 소재 없음).
// 영상 띠는 끝까지 끊기지 않는다 — 달라지는 것은 위 줄의 표시 시각과 아래 줄의 장뿐이다.
// layout="mobile" 은 1080×1350 휴대폰판(ChapterRuleMobile) — 같은 움직임을 큰 글자로 그린다.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Label, Tag } from "../../components/Timeline";
import { progress, visibleBetween } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const CHAPTER_RULE_FRAMES = 330;

/** 장면 순서(프레임, 30fps). 상태가 바뀐 뒤 최소 1초 멈춘다. */
const T = {
  seg: [0, 22, 44, 120, 210] as const,
  joinTag: 30,
  gapTag: 125,
  overlapTag: 215,
  pullBack: 230,
  summary: 275,
  end: CHAPTER_RULE_FRAMES,
} as const;

/** 조각마다 위 줄에 적히는 표시 시각(설명용 값). 다섯째는 0.3초 일찍 와 뒤로 당겨진다. */
const CLOCK = ["0:00", "0:04", "0:08", "2:12", "2:15.7"] as const;
/** 다섯째 조각이 일찍 오지 않았다면 받았을 시각(앞 조각 끝). */
const EXPECTED_FIFTH = "2:16";

/** 장 띠: 몇 번째 조각부터 몇 개, 어느 조각과 함께 나타나는가, 끝까지 남는 요약 줄. */
const CHAPTERS = [
  { name: "장 1", from: 0, count: 3, appear: 0, note: "장 1 · 문턱 안 → 이어 적기", noteAt: T.joinTag + 10 },
  { name: "장 2", from: 3, count: 1, appear: 3, note: "장 2 · 틈 → 새 장", noteAt: T.gapTag + 10 },
  { name: "장 3", from: 4, count: 1, appear: 4, note: "장 3 · 겹침 → 당겨 적고 새 장", noteAt: T.pullBack + 10 },
] as const;

type Layout = {
  readonly text: { readonly tag: number; readonly clock: number; readonly band: number };
  readonly phaseTag: { readonly x: number; readonly y: number };
  readonly clockY: number;
  readonly strip: { readonly x: number; readonly y: number; readonly segWidth: number; readonly height: number };
  readonly bandY: number;
  readonly bandHeight: number;
  /** 끝까지 남는 세 단계 요약 줄의 왼쪽·윗변·줄 간격. */
  readonly notes: { readonly x: number; readonly y: number; readonly gap: number };
};

// 데스크톱: 왼쪽에서 오른쪽으로 조각 다섯. 좌표는 SAFE.x(120) 안쪽.
const DESKTOP: Layout = {
  text: { tag: TEXT.small, clock: TEXT.label, band: TEXT.small },
  phaseTag: { x: 960, y: 96 },
  clockY: 270,
  strip: { x: 210, y: 400, segWidth: 300, height: 150 },
  bandY: 590,
  bandHeight: 70,
  notes: { x: 210, y: 720, gap: 62 },
};

// 휴대폰판: 같은 띠를 좁게, 글자 48px 이상.
const MOBILE: Layout = {
  text: { tag: MOBILE_TEXT.small, clock: MOBILE_TEXT.label, band: MOBILE_TEXT.small },
  phaseTag: { x: 540, y: 96 },
  clockY: 360,
  strip: { x: 50, y: 520, segWidth: 196, height: 170 },
  bandY: 740,
  bandHeight: 84,
  notes: { x: 50, y: 900, gap: 84 },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const ChapterRule: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const segX = (i: number) => L.strip.x + i * L.strip.segWidth;
  const shown = (i: number) => progress(frame, T.seg[i], 12);
  const pulled = progress(frame, T.pullBack, 18);
  // 지금 장 = 가장 늦게 나타난 장. 강조색은 그 하나만.
  const current = CHAPTERS.reduce((at, c, i) => (frame >= T.seg[c.appear] ? i : at), 0);

  return (
    <AbsoluteFill style={{ background: COLOR.surface }}>
      {/* 구간 이름표 — 한 번에 하나만 보인다. 끝 프레임에는 요약. */}
      <Tag x={L.phaseTag.x} y={L.phaseTag.y} anchor="center" tone="ink" size={L.text.tag} opacity={visibleBetween(frame, T.joinTag, T.gapTag + 6, 12)}>
        차이가 문턱 안 → 이어 적기
      </Tag>
      <Tag x={L.phaseTag.x} y={L.phaseTag.y} anchor="center" tone="ink" size={L.text.tag} opacity={visibleBetween(frame, T.gapTag, T.overlapTag + 6, 12)}>
        틈이 문턱 밖 → 새 장
      </Tag>
      <Tag x={L.phaseTag.x} y={L.phaseTag.y} anchor="center" tone="accent" size={L.text.tag} opacity={visibleBetween(frame, T.overlapTag, T.summary + 6, 12)}>
        일찍 옴 → 최대 999ms 당기고 새 장
      </Tag>
      <Tag x={L.phaseTag.x} y={L.phaseTag.y} anchor="center" tone="ink" size={L.text.tag} opacity={progress(frame, T.summary, 12)}>
        영상은 이어지고, 표시 시각만 바뀝니다
      </Tag>

      {/* 위 줄: 조각 시작마다 적히는 표시 시각. */}
      <Label x={L.strip.x - 20} y={L.clockY - L.text.clock * 1.6} size={L.text.band} color={COLOR.muted} opacity={shown(0)}>
        표시 시각
      </Label>
      {CLOCK.map((value, i) => {
        const isFifth = i === 4;
        // 다섯째는 앞 조각 끝(2:16) 자리에서 시작해 0.3초만큼 왼쪽으로 당겨진다.
        const shift = isFifth ? -L.strip.segWidth * 0.18 * pulled : 0;
        const label = isFifth && pulled < 0.5 ? EXPECTED_FIFTH : value;
        const emphasised = (i === 3 && frame >= T.gapTag && frame < T.overlapTag) || (isFifth && frame >= T.overlapTag);
        return (
          <Label
            key={value}
            x={segX(i) + 12 + shift}
            y={L.clockY}
            size={L.text.clock}
            weight={emphasised ? 760 : 560}
            color={emphasised ? COLOR.accent : COLOR.ink}
            opacity={shown(i)}
          >
            {label}
          </Label>
        );
      })}

      {/* 건너뜀과 당김의 크기 — 보조 글자라 회색. */}
      <Label x={segX(3) - 6} y={L.clockY + L.text.clock * 1.35} size={L.text.band} color={COLOR.muted} anchor="center" opacity={progress(frame, T.gapTag + 10, 12)}>
        +2분
      </Label>
      <Label x={segX(4) + 12} y={L.clockY + L.text.clock * 1.35} size={L.text.band} color={COLOR.muted} opacity={progress(frame, T.pullBack + 10, 12)}>
        −0.3초
      </Label>

      {/* 영상 띠: 조각이 차례로 붙는다. 틈이 있어도 띠는 이어진다. */}
      {CLOCK.map((_, i) => (
        <div
          key={`seg-${i}`}
          style={{
            position: "absolute",
            left: segX(i),
            top: L.strip.y,
            width: L.strip.segWidth - 10,
            height: L.strip.height,
            borderRadius: 14,
            boxSizing: "border-box",
            background: COLOR.white,
            border: `4px solid ${COLOR.ink}`,
            opacity: shown(i),
          }}
        />
      ))}

      {/* 아래 줄: 장. 지금 장만 강조색. */}
      {CHAPTERS.map((c, i) => {
        const active = i === current;
        return (
          <div key={c.name}>
            <div
              style={{
                position: "absolute",
                left: segX(c.from),
                top: L.bandY,
                width: L.strip.segWidth * c.count - 10,
                height: L.bandHeight,
                borderRadius: 12,
                boxSizing: "border-box",
                background: active ? COLOR.accentSoft : COLOR.line,
                border: `3px solid ${active ? COLOR.accent : COLOR.muted}`,
                opacity: shown(c.appear),
              }}
            />
            <Label x={segX(c.from) + 24} y={L.bandY + (L.bandHeight - L.text.band) / 2 - 4} size={L.text.band} weight={700} color={active ? COLOR.accent : COLOR.muted} opacity={shown(c.appear)}>
              {c.name}
            </Label>
          </div>
        );
      })}

      {/* 세 단계 요약 — 끝 프레임(포스터)에도 남는다. 실패가 아니므로 danger 색을 쓰지 않는다. */}
      {CHAPTERS.map((c, i) => (
        <Label key={c.note} x={L.notes.x} y={L.notes.y + i * L.notes.gap} size={L.text.band} weight={600} color={COLOR.ink} opacity={progress(frame, c.noteAt, 12)}>
          {c.note}
        </Label>
      ))}
    </AbsoluteFill>
  );
};
