// 콘티: _workspace/blog/pokeclip-upload-state-and-recovery/storyboard.md 「영상 1」
// 업로더가 조각을 S3 에 PUT 한 직후 프로세스가 죽는다 → S3 에는 객체, 장부는 pending.
// 재기동 뒤 스위퍼가 pending 을 집어 같은 키로 다시 PUT 하고, 크기가 같을 때만 CAS 로 uploaded.
// (PokeClip-mono develop 825a3dfe media/internal/index/upload_store.go 168–170행). 반복 클립, 생성 소재 없음.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Box, Dot, Lines, shown, travel } from "../../components/Stations";
import { Label, Tag } from "../../components/Timeline";
import { progress } from "../../lib/motion";
import { COLOR, MOBILE_TEXT, TEXT } from "../../theme";

export const UPLOAD_CRASH_RESUME_FRAMES = 330;

const T = {
  put1: 20,
  put1End: 58,
  crash: 72,
  restart: 132,
  sweep: 148,
  sweepEnd: 180,
  put2: 186,
  put2End: 220,
  cas: 226,
  casEnd: 254,
} as const;

type P = { readonly x: number; readonly y: number };
type Layout = {
  readonly title: readonly { readonly y: number; readonly text: string }[];
  readonly titleX: number;
  readonly uploader: P & { readonly w: number; readonly h: number };
  readonly s3: P & { readonly w: number; readonly h: number };
  readonly ledger: P & { readonly w: number; readonly h: number };
  /** 업로더 → S3, 업로더 → 장부 선의 양 끝. */
  readonly toS3: readonly [P, P];
  readonly toLedger: readonly [P, P];
  readonly s3Tag: P;
  readonly ledgerTag: P;
  readonly upTag: P;
  readonly putTag: P;
  readonly casTag: P;
  readonly sweepTag: P;
  readonly tagAnchor: "left" | "center";
  readonly keepSweep: boolean;
  readonly text: { readonly title: number; readonly label: number; readonly tag: number };
};

const DESKTOP: Layout = {
  title: [{ y: 40, text: "업로드가 끝났는지는 장부로 본다" }],
  titleX: 120,
  uploader: { x: 400, y: 560, w: 320, h: 150 },
  s3: { x: 1480, y: 330, w: 420, h: 150 },
  ledger: { x: 1480, y: 790, w: 420, h: 150 },
  toS3: [
    { x: 560, y: 560 },
    { x: 1270, y: 330 },
  ],
  toLedger: [
    { x: 560, y: 560 },
    { x: 1270, y: 790 },
  ],
  s3Tag: { x: 1480, y: 430 },
  ledgerTag: { x: 1480, y: 890 },
  upTag: { x: 400, y: 660 },
  putTag: { x: 900, y: 340 },
  casTag: { x: 900, y: 700 },
  sweepTag: { x: 400, y: 400 },
  tagAnchor: "center",
  keepSweep: true,
  text: { title: TEXT.title, label: TEXT.label, tag: TEXT.small },
};

const MOBILE: Layout = {
  title: [
    { y: 56, text: "업로드가 끝났는지는" },
    { y: 124, text: "장부로 본다" },
  ],
  titleX: 60,
  s3: { x: 540, y: 330, w: 560, h: 140 },
  uploader: { x: 540, y: 700, w: 520, h: 140 },
  ledger: { x: 540, y: 1080, w: 560, h: 140 },
  toS3: [
    { x: 300, y: 630 },
    { x: 300, y: 400 },
  ],
  toLedger: [
    { x: 300, y: 770 },
    { x: 300, y: 1010 },
  ],
  s3Tag: { x: 560, y: 420 },
  ledgerTag: { x: 560, y: 1170 },
  upTag: { x: 560, y: 790 },
  putTag: { x: 340, y: 520 },
  casTag: { x: 340, y: 890 },
  sweepTag: { x: 340, y: 890 },
  tagAnchor: "left",
  keepSweep: false,
  text: { title: MOBILE_TEXT.title, label: MOBILE_TEXT.label, tag: MOBILE_TEXT.small },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;
type Props = { readonly layout?: keyof typeof LAYOUTS };

export const UploadCrashResume: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const l = LAYOUTS[layout];
  const size = l.text.tag;
  const intro = progress(frame, 0, 15);

  const crashed = frame >= T.crash && frame < T.restart;
  const objectIn = shown(frame, T.put1End);
  const uploaded = shown(frame, T.casEnd);

  const put1 = travel(frame, T.put1, T.put1End, l.toS3[0], l.toS3[1]);
  const sweepDot = travel(frame, T.sweep, T.sweepEnd, l.toLedger[1], l.toLedger[0]);
  const put2 = travel(frame, T.put2, T.put2End, l.toS3[0], l.toS3[1]);
  const casDot = travel(frame, T.cas, T.casEnd, l.toLedger[0], l.toLedger[1]);

  const sweepOpacity = l.keepSweep ? shown(frame, T.sweep) : shown(frame, T.sweep, T.cas);

  return (
    <AbsoluteFill style={{ background: COLOR.white }}>
      {l.title.map((line) => (
        <Label key={line.y} x={l.titleX} y={line.y} size={l.text.title} weight={760} opacity={intro}>
          {line.text}
        </Label>
      ))}

      <div style={{ opacity: intro }}>
        <Lines
          lines={[
            { x1: l.toS3[0].x, y1: l.toS3[0].y, x2: l.toS3[1].x, y2: l.toS3[1].y },
            { x1: l.toLedger[0].x, y1: l.toLedger[0].y, x2: l.toLedger[1].x, y2: l.toLedger[1].y },
          ]}
        />
        <Box {...l.s3} label="S3" size={l.text.label} tone={objectIn > 0.5 ? "accent" : "ink"} />
        <Box {...l.ledger} label="DB 장부" size={l.text.label} tone={uploaded > 0.5 ? "accent" : "ink"} />
        <Box {...l.uploader} label="업로더" size={l.text.label} tone={crashed ? "danger" : "ink"} dashed={crashed} />
      </div>

      {/* 점: 첫 PUT · 스위퍼가 집음 · 같은 키로 다시 PUT · CAS. */}
      <Dot x={put1.x} y={put1.y} color={COLOR.ink} opacity={shown(frame, T.put1, T.put1End + 4, 4)} />
      <Dot x={sweepDot.x} y={sweepDot.y} color={COLOR.muted} opacity={shown(frame, T.sweep, T.sweepEnd + 4, 4)} />
      <Dot x={put2.x} y={put2.y} color={COLOR.ink} opacity={shown(frame, T.put2, T.put2End + 4, 4)} />
      <Dot x={casDot.x} y={casDot.y} color={COLOR.accent} opacity={shown(frame, T.cas, T.casEnd + 4, 4)} />

      {/* 상태 이름표. */}
      <Tag x={l.s3Tag.x} y={l.s3Tag.y} tone="accent" size={size} anchor={l.tagAnchor} opacity={objectIn}>
        객체 있음
      </Tag>
      <Tag x={l.ledgerTag.x} y={l.ledgerTag.y} tone="muted" size={size} anchor={l.tagAnchor} opacity={intro * (1 - uploaded)}>
        pending
      </Tag>
      <Tag x={l.ledgerTag.x} y={l.ledgerTag.y} tone="accent" size={size} anchor={l.tagAnchor} opacity={uploaded}>
        uploaded
      </Tag>
      <Tag x={l.upTag.x} y={l.upTag.y} tone="danger" size={size} anchor={l.tagAnchor} opacity={shown(frame, T.crash, T.restart)}>
        프로세스 종료
      </Tag>
      <Tag x={l.upTag.x} y={l.upTag.y} tone="ink" size={size} anchor={l.tagAnchor} opacity={shown(frame, T.restart, T.put2 + 10)}>
        재기동
      </Tag>

      {/* 흐름 이름표. */}
      <Tag x={l.putTag.x} y={l.putTag.y} tone="ink" size={size} anchor={l.tagAnchor} opacity={shown(frame, T.put1, T.crash)}>
        PUT
      </Tag>
      <Tag x={l.putTag.x} y={l.putTag.y} tone="ink" size={size} anchor={l.tagAnchor} opacity={shown(frame, T.put2)}>
        같은 키로 다시 PUT
      </Tag>
      <Tag x={l.sweepTag.x} y={l.sweepTag.y} tone="muted" size={size} anchor={l.tagAnchor} opacity={sweepOpacity}>
        스위퍼가 pending을 집음
      </Tag>
      <Tag x={l.casTag.x} y={l.casTag.y} tone="accent" size={size} anchor={l.tagAnchor} opacity={shown(frame, T.cas)}>
        크기 같을 때만 CAS
      </Tag>
    </AbsoluteFill>
  );
};
