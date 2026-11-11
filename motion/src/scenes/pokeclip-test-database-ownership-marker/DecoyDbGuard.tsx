// 콘티: _workspace/blog/pokeclip-test-database-ownership-marker/storyboard.md 「영상 1」
// 같은 미끼 DB(public 표가 stream_segments 하나뿐 — 공용 개발 DB와 모양이 같다)에 두 판정이 닿는다.
// 왼쪽(옛 판정: 표 개수): 표가 1개라 테스트 DB로 보고 행을 비운다 → 미끼 행(하나) 삭제.
// 오른쪽(새 판정: 소유 표식): CREATE DATABASE 가 「이미 있음」 → 표식 확인 → 없음 → 사용 · 정리 거부, 행 그대로.
// PR #61 본문의 미끼 DB 반례(RED → GREEN)와 병합 코드 testdb_test.go 를 바탕으로 한 설명용 그림.
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판(두 판정을 위아래로).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Label, SegmentCell, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const DECOY_DB_GUARD_FRAMES = 330;

/** 판정마다 시작 프레임. 왼쪽 결과 뒤 1초 넘게, 오른쪽 결과 뒤 2초 넘게 멈춘다. */
const SIDE_START = [14, 150] as const;
const STEP_GAP = 30;
const RESULT_AT = 78;

type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Side = {
  readonly header: { readonly x: number; readonly y: number; readonly text: string };
  readonly steps: readonly { readonly rect: Rect; readonly text: string }[];
  readonly db: Rect;
  readonly dbLabel: { readonly x: number; readonly y: number };
  readonly cells: readonly Rect[];
  readonly tag: { readonly x: number; readonly y: number; readonly text: string };
  readonly deletes: boolean;
};
type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly sides: readonly [Side, Side];
  readonly dbText: string;
  readonly text: { readonly title: number; readonly header: number; readonly box: number; readonly tag: number };
};

const desktopSide = (cx: number, header: string, steps: readonly [string, string], tag: string, deletes: boolean): Side => ({
  header: { x: cx - 380, y: 140, text: header },
  steps: [
    { rect: { x: cx - 380, y: 214, w: 760, h: 92 }, text: steps[0] },
    { rect: { x: cx - 380, y: 326, w: 760, h: 92 }, text: steps[1] },
  ],
  db: { x: cx - 380, y: 452, w: 760, h: 380 },
  dbLabel: { x: cx - 350, y: 474 },
  // 미끼 DB에는 행이 하나뿐이었다(PR #61 본문).
  cells: [{ x: cx - 340, y: 610, w: 680, h: 96 }],
  tag: { x: cx - 380, y: 870, text: tag },
  deletes,
});

const DESKTOP: Layout = {
  title: [{ y: 36, text: "표 모양이 같아도 표식이 없으면 손대지 않는다" }],
  titleX: 120,
  sides: [
    desktopSide(500, "옛 판정 · 표 개수", ["① public 표 1개 → 테스트 DB로 봄", "② 행 비우기"], "미끼 DB의 행 삭제", true),
    desktopSide(1420, "새 판정 · 소유 표식", ["① CREATE DATABASE → 이미 있음", "② 소유 표식 확인 → 없음"], "사용 · 정리 거부", false),
  ],
  dbText: "미끼 DB · stream_segments",
  text: { title: TEXT.title, header: TEXT.label, box: TEXT.small, tag: TEXT.small },
};

const mobileSide = (top: number, header: string, step: string, tag: string, deletes: boolean): Side => ({
  header: { x: 60, y: top, text: header },
  steps: [{ rect: { x: 60, y: top + 70, w: 960, h: 100 }, text: step }],
  db: { x: 60, y: top + 196, w: 960, h: 196 },
  dbLabel: { x: 90, y: top + 210 },
  cells: [{ x: 90, y: top + 290, w: 900, h: 72 }],
  tag: { x: 60, y: top + 412, text: tag },
  deletes,
});

const MOBILE: Layout = {
  title: [
    { y: 52, text: "표 모양이 같아도" },
    { y: 120, text: "표식이 없으면 손대지 않는다" },
  ],
  titleX: 60,
  sides: [
    mobileSide(212, "옛 판정 · 표 개수", "표 1개 → 테스트 DB로 봄", "미끼 DB의 행 삭제", true),
    mobileSide(746, "새 판정 · 소유 표식", "이미 있는 DB · 표식 없음", "사용 · 정리 거부", false),
  ],
  dbText: "미끼 DB",
  text: { title: MOBILE_TEXT.title, header: MOBILE_TEXT.label, box: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const DecoyDbGuard: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 15);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {l.sides.map((side, sideIndex) => {
        const start = SIDE_START[sideIndex];
        const on = progress(frame, start, 12);
        const result = progress(frame, start + RESULT_AT, 12);
        const dbTone = side.deletes ? (result > 0.5 ? "danger" : "ink") : result > 0.5 ? "accent" : "ink";
        return (
          <div key={side.header.text}>
            <Label x={side.header.x} y={side.header.y} size={l.text.header} weight={760} opacity={intro}>
              {side.header.text}
            </Label>

            {side.steps.map((step, i) => {
              const lit = progress(frame, start + 12 + i * STEP_GAP, 12);
              const last = i === side.steps.length - 1;
              const tone = lit > 0.5 ? (last && !side.deletes ? "accent" : "ink") : "muted";
              return (
                <Node key={step.text} x={step.rect.x} y={step.rect.y} width={step.rect.w} height={step.rect.h} tone={tone} size={l.text.box} opacity={intro}>
                  {step.text}
                </Node>
              );
            })}

            {/* 미끼 DB — 공용 개발 DB와 같은 모양(public 표 하나). */}
            <Node x={side.db.x} y={side.db.y} width={side.db.w} height={side.db.h} tone={dbTone} size={l.text.box} opacity={intro}>
              {""}
            </Node>
            <Label x={side.dbLabel.x} y={side.dbLabel.y} size={l.text.box} weight={720} opacity={intro} color={COLOR.ink}>
              {l.dbText}
            </Label>
            {side.cells.map((c, i) => {
              const gone = side.deletes ? progress(frame, start + RESULT_AT + i * 6, 8) : 0;
              return (
                <div key={i}>
                  <SegmentCell x={c.x} y={c.y} width={c.w} height={c.h} state="live" label="행 하나" size={l.text.box} opacity={intro * (1 - gone)} />
                  <SegmentCell x={c.x} y={c.y} width={c.w} height={c.h} state="error" label="지워짐" size={l.text.box} opacity={gone} />
                </div>
              );
            })}

            <Tag x={side.tag.x} y={side.tag.y} tone={side.deletes ? "danger" : "accent"} size={l.text.tag} opacity={result * on}>
              {side.tag.text}
            </Tag>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
