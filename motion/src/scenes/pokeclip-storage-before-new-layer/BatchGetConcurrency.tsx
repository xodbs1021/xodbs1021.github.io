// 콘티: _workspace/blog/pokeclip-storage-before-new-layer/storyboard.md 「영상 1」
// 같은 객체 8개를 위 줄은 하나씩 차례로, 아래 줄은 8개를 동시에 받는다. 재생점이 지나가며 막대가 차고,
// 각 줄은 마지막 객체가 도착한 자리에서 「배치 끝」을 받는다. 막대 길이는 설명용이며 실측값이 아니다.
// 반복 클립, 생성 소재 없음.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Lines } from "../../components/Stations";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const BATCH_GET_CONCURRENCY_FRAMES = 330;

const SWEEP = { start: 25, end: 255 } as const;
/** 동시에 받을 때 객체마다 걸리는 상대 길이(설명용 — 서로 조금씩 다르다). */
const PARALLEL_SHARE = [0.85, 0.91, 0.79, 0.97, 0.88, 0.92, 0.82, 1] as const;

type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly x0: number;
  readonly x1: number;
  readonly blockW: number;
  readonly parallelMax: number;
  readonly seq: { readonly y: number; readonly h: number; readonly labelY: number };
  readonly par: { readonly y: number; readonly h: number; readonly gap: number; readonly labelY: number };
  readonly endDy: number;
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "배치는 마지막 객체가 도착해야 끝난다" }],
  titleX: 120,
  x0: 320,
  x1: 1580,
  blockW: 150,
  parallelMax: 660,
  seq: { y: 300, h: 84, labelY: 200 },
  par: { y: 560, h: 28, gap: 10, labelY: 460 },
  endDy: 36,
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "배치는 마지막 객체가" },
    { y: 124, text: "도착해야 끝난다" },
  ],
  titleX: 60,
  x0: 60,
  x1: 1000,
  blockW: 110,
  parallelMax: 450,
  seq: { y: 360, h: 90, labelY: 262 },
  par: { y: 660, h: 34, gap: 12, labelY: 562 },
  endDy: 40,
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

/** 왼쪽 x 부터 길이 w 인 막대를 재생점 head 까지 채운다. */
const Bar: React.FC<{ x: number; y: number; w: number; h: number; head: number; color: string }> = ({ x, y, w, h, head, color }) => {
  const filled = Math.max(0, Math.min(w, head - x));
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, width: w - 4, height: h, borderRadius: 8, boxSizing: "border-box", border: `3px solid ${COLOR.line}`, background: COLOR.white }} />
      <div style={{ position: "absolute", left: x, top: y, width: Math.max(0, filled - 4), height: h, borderRadius: 8, background: color }} />
    </>
  );
};

export const BatchGetConcurrency: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const size = l.text.tag;
  const intro = progress(frame, 0, 15);
  const head = interpolate(frame, [SWEEP.start, SWEEP.end], [l.x0, l.x1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const seqEnd = l.x0 + l.blockW * 8;
  const parEnd = l.x0 + l.parallelMax;
  const parBottom = l.par.y + 8 * (l.par.h + l.par.gap) - l.par.gap;
  const headFade = 1 - 0.6 * progress(frame, SWEEP.end, 10);
  // 끝 이름표는 재생점이 지난 프레임부터 서서히 나타난다.
  const seqTag = progress(frame, SWEEP.start + ((seqEnd - l.x0) / (l.x1 - l.x0)) * (SWEEP.end - SWEEP.start), 10);
  const parTag = progress(frame, SWEEP.start + ((parEnd - l.x0) / (l.x1 - l.x0)) * (SWEEP.end - SWEEP.start), 10);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <div style={{ opacity: intro }}>
        <Label x={l.x0} y={l.seq.labelY} size={l.text.label} weight={760}>
          하나씩 차례로
        </Label>
        <Label x={l.x0} y={l.par.labelY} size={l.text.label} weight={760}>
          8개 동시에
        </Label>
        {Array.from({ length: 8 }, (_, i) => (
          <Bar key={`s${i}`} x={l.x0 + i * l.blockW} y={l.seq.y} w={l.blockW} h={l.seq.h} head={head} color={i === 7 ? COLOR.accent : COLOR.muted} />
        ))}
        {PARALLEL_SHARE.map((share, j) => (
          <Bar
            key={`p${j}`}
            x={l.x0}
            y={l.par.y + j * (l.par.h + l.par.gap)}
            w={l.parallelMax * share}
            h={l.par.h}
            head={head}
            color={share === 1 ? COLOR.accent : COLOR.muted}
          />
        ))}
      </div>

      {/* 각 줄의 끝: 마지막 객체가 도착한 자리. */}
      <Lines
        lines={[
          { x1: seqEnd, y1: l.seq.y - 20, x2: seqEnd, y2: l.seq.y + l.seq.h + 20, color: COLOR.accent, width: 5, dashed: true, opacity: seqTag },
          { x1: parEnd, y1: l.par.y - 20, x2: parEnd, y2: parBottom + 20, color: COLOR.accent, width: 5, dashed: true, opacity: parTag },
          { x1: head, y1: l.seq.y - 40, x2: head, y2: parBottom + 30, color: COLOR.ink, width: 4, opacity: intro * headFade },
        ]}
      />
      <Tag x={seqEnd} y={l.seq.y + l.seq.h + l.endDy} tone="accent" size={size} anchor="center" opacity={seqTag}>
        배치 끝
      </Tag>
      <Tag x={parEnd} y={parBottom + l.endDy} tone="accent" size={size} anchor="center" opacity={parTag}>
        배치 끝
      </Tag>
    </AbsoluteFill>
  );
};
