// 콘티: _workspace/blog/media-ci-path-filter-required-check-tradeoff/storyboard.md 「영상 1」
// 두 줄. 위 줄(워크플로부터 바꾸면): 보호가 아직 media-gate 를 필수로 기다리는데 새 워크플로는 그 체크를
// 만들지 않으므로 웹 PR · 미디어 PR 모두 Pending. 아래 줄(보호를 먼저 풀면): 웹 PR 은 media-ci 체크 0개,
// 미디어 PR 은 check 1개 성공. PR #163 계획 · 병합 직후 임시 PR #164 · #165 확인을 바탕으로 한 설명용 그림.
// 반복 클립, 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { Arrow, Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const PROTECTION_FIRST_ORDER_FRAMES = 330;

/** 줄마다 시작 프레임. 위 줄 결과 뒤 1초 이상, 아래 줄 결과 뒤 2초 넘게 멈춘다. */
const LANE_START = [14, 140] as const;
const ROW_GAP = 26;

type TagTone = "ink" | "accent" | "danger" | "muted";
type Row = {
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly text: string;
  readonly tag: { readonly x: number; readonly text: string; readonly tone: TagTone };
};
type Lane = {
  readonly title: { readonly x: number; readonly y: number; readonly text: string };
  readonly chip: { readonly x: number; readonly y: number; readonly text: string; readonly tone: TagTone };
  readonly rows: readonly [Row, Row];
};
type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly lanes: readonly [Lane, Lane];
  readonly text: { readonly title: number; readonly lane: number; readonly box: number; readonly tag: number };
};

const desktopRow = (y: number, text: string, tag: Row["tag"]["text"], tone: TagTone): Row => ({
  box: { x: 120, y, w: 1000, h: 104 },
  text,
  tag: { x: 1230, text: tag, tone },
});

const DESKTOP: Layout = {
  title: [{ y: 36, text: "보호를 먼저 풀어야 PR이 멈추지 않는다" }],
  titleX: 120,
  lanes: [
    {
      title: { x: 120, y: 150, text: "워크플로부터 바꾸면" },
      chip: { x: 620, y: 150, text: "보호: media-gate 필수 그대로", tone: "danger" },
      rows: [
        desktopRow(230, "웹 PR · 미디어 워크플로 생략", "Pending", "danger"),
        desktopRow(360, "미디어 PR · check만 실행, media-gate 없음", "Pending", "danger"),
      ],
    },
    {
      title: { x: 120, y: 580, text: "보호를 먼저 풀면" },
      chip: { x: 560, y: 580, text: "보호: media-gate 해제", tone: "accent" },
      rows: [
        desktopRow(660, "웹 PR · 미디어 워크플로 생략", "media-ci 체크 0개", "muted"),
        desktopRow(790, "미디어 PR · check 실행", "check 1개 성공", "accent"),
      ],
    },
  ],
  text: { title: TEXT.title, lane: TEXT.label, box: TEXT.small + 2, tag: TEXT.small },
};

const mobileRow = (y: number, text: string, tag: Row["tag"]["text"], tone: TagTone): Row => ({
  box: { x: 60, y, w: 610, h: 130 },
  text,
  tag: { x: 700, text: tag, tone },
});

const MOBILE: Layout = {
  title: [
    { y: 52, text: "보호를 먼저 풀어야" },
    { y: 120, text: "PR이 멈추지 않는다" },
  ],
  titleX: 60,
  lanes: [
    {
      title: { x: 60, y: 222, text: "워크플로부터 바꾸면" },
      chip: { x: 60, y: 290, text: "media-gate 필수 그대로", tone: "danger" },
      rows: [
        mobileRow(390, "웹 PR\n워크플로 생략", "Pending", "danger"),
        mobileRow(540, "미디어 PR\nmedia-gate 없음", "Pending", "danger"),
      ],
    },
    {
      title: { x: 60, y: 730, text: "보호를 먼저 풀면" },
      chip: { x: 60, y: 798, text: "media-gate 해제", tone: "accent" },
      rows: [
        mobileRow(900, "웹 PR\n워크플로 생략", "체크 0개", "muted"),
        mobileRow(1050, "미디어 PR\ncheck 실행", "check 1개 성공", "accent"),
      ],
    },
  ],
  text: { title: MOBILE_TEXT.title, lane: MOBILE_TEXT.label, box: MOBILE_TEXT.small, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const ProtectionFirstOrder: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const intro = progress(frame, 0, 15);
  const mobile = layout === "mobile";

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      {l.lanes.map((lane, laneIndex) => {
        const start = LANE_START[laneIndex];
        const laneOn = progress(frame, start, 12);
        return (
          <div key={lane.title.text}>
            <Label x={lane.title.x} y={lane.title.y} size={l.text.lane} weight={760} opacity={laneOn}>
              {lane.title.text}
            </Label>
            <Tag x={lane.chip.x} y={lane.chip.y} tone={lane.chip.tone} size={l.text.tag} opacity={laneOn}>
              {lane.chip.text}
            </Tag>
            {lane.rows.map((row, i) => {
              const rowOn = progress(frame, start + 16 + i * ROW_GAP, 12);
              const tagOn = progress(frame, start + 40 + i * ROW_GAP, 10);
              const b = row.box;
              // 이름표 높이 ≈ 글자 1.2배 + 위아래 여백 16px — 상자 가운데에 맞춘다.
              const tagY = b.y + b.h / 2 - (l.text.tag * 1.2 + 16) / 2;
              return (
                <div key={row.text}>
                  <Node x={b.x} y={b.y} width={b.w} height={b.h} tone="ink" size={l.text.box} opacity={rowOn}>
                    {row.text}
                  </Node>
                  {mobile ? null : (
                    <div style={{ position: "absolute", inset: 0, opacity: tagOn }}>
                      <Arrow x1={b.x + b.w + 10} y1={b.y + b.h / 2} x2={row.tag.x - 14} y2={b.y + b.h / 2} color={COLOR.muted} draw={tagOn} />
                    </div>
                  )}
                  <Tag x={row.tag.x} y={tagY} tone={row.tag.tone} size={l.text.tag} opacity={tagOn}>
                    {row.tag.text}
                  </Tag>
                </div>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
