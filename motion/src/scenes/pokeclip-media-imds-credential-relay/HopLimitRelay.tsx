// 콘티: _workspace/blog/pokeclip-media-imds-credential-relay/storyboard.md
// 홉 상한 2 → 1 로 내리면 IMDS 토큰 응답이 docker 브리지를 넘지 못하고, 호스트 망의 창구만 자격을 받아 토큰 파일이
// 있는 두 소비자에게 건넨다. 반복 클립(12초), 생성 소재 없음. layout="mobile" 은 1080×1350 휴대폰판.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Node } from "../../components/Flow";
import { FlowPath } from "../../components/FlowPath";
import { Tag } from "../../components/Timeline";
import { progress, visibleBetween } from "../../lib/motion";
import { COLOR, FONT, MOBILE_TEXT, TEXT } from "../../theme";

export const HOP_LIMIT_RELAY_FRAMES = 360;

/** 단계가 바뀌는 프레임(30fps). 바뀐 뒤 1초 이상 멈춘다. */
const T = { hop1: 135, block: 165, relay: 240, deny: 285 } as const;

type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
type Point = { readonly x: number; readonly y: number };

type Layout = {
  readonly text: { readonly node: number; readonly tag: number; readonly region: number };
  readonly steps: readonly [Point, Point, Point];
  readonly imds: Box;
  readonly host: Box;
  readonly bridge: Box;
  readonly relay: Box;
  readonly mtx: Box;
  readonly sidecar: Box;
  readonly janitor: Box;
  readonly blockMark: Point;
  readonly denyMark: Point;
  readonly note: Point;
  readonly paths: {
    readonly toMtx: string;
    readonly toSidecar: string;
    readonly toJanitor: string;
    readonly blocked: string;
    readonly toRelay: string;
    readonly relayToSidecar: string;
    readonly relayToJanitor: string;
    readonly mtxToRelay: string;
  };
};

// 데스크톱: 왼쪽 IMDS → 가운데 호스트 망(창구) → 오른쪽 docker 브리지(컨테이너 셋).
const DESKTOP: Layout = {
  text: { node: TEXT.label, tag: TEXT.small, region: TEXT.small },
  steps: [{ x: 560, y: 48 }, { x: 960, y: 48 }, { x: 1380, y: 48 }],
  imds: { x: 100, y: 400, width: 260, height: 150 },
  host: { x: 440, y: 170, width: 560, height: 760 },
  bridge: { x: 1080, y: 170, width: 760, height: 760 },
  relay: { x: 520, y: 690, width: 400, height: 150 },
  mtx: { x: 1260, y: 250, width: 500, height: 140 },
  sidecar: { x: 1260, y: 480, width: 500, height: 140 },
  janitor: { x: 1260, y: 710, width: 500, height: 140 },
  blockMark: { x: 1080, y: 226 },
  denyMark: { x: 620, y: 590 },
  note: { x: 960, y: 980 },
  paths: {
    toMtx: "M 360 440 C 760 440, 900 320, 1260 320",
    toSidecar: "M 360 475 C 760 475, 900 550, 1260 550",
    toJanitor: "M 360 510 C 760 510, 900 780, 1260 780",
    blocked: "M 360 425 C 700 425, 860 270, 1060 262",
    toRelay: "M 230 550 C 230 765, 380 765, 520 765",
    relayToSidecar: "M 920 740 C 1080 740, 1100 570, 1260 570",
    relayToJanitor: "M 920 790 C 1080 790, 1100 780, 1260 780",
    mtxToRelay: "M 1260 345 C 980 345, 760 470, 740 690",
  },
};

// 휴대폰판: 왼쪽 위 IMDS, 왼쪽 아래 호스트 망(창구), 오른쪽 브리지 칸에 컨테이너 셋을 세로로. 글자 48px 이상.
const MOBILE: Layout = {
  text: { node: MOBILE_TEXT.label, tag: MOBILE_TEXT.small, region: MOBILE_TEXT.small },
  steps: [{ x: 160, y: 36 }, { x: 470, y: 36 }, { x: 850, y: 36 }],
  imds: { x: 60, y: 170, width: 400, height: 130 },
  host: { x: 30, y: 400, width: 470, height: 760 },
  bridge: { x: 540, y: 170, width: 520, height: 990 },
  relay: { x: 60, y: 780, width: 410, height: 150 },
  mtx: { x: 570, y: 270, width: 460, height: 160 },
  sidecar: { x: 570, y: 560, width: 460, height: 160 },
  janitor: { x: 570, y: 850, width: 460, height: 160 },
  blockMark: { x: 540, y: 300 },
  denyMark: { x: 290, y: 670 },
  note: { x: 540, y: 1215 },
  paths: {
    toMtx: "M 460 215 C 520 215, 520 330, 570 330",
    toSidecar: "M 460 235 C 520 240, 510 620, 570 620",
    toJanitor: "M 460 255 C 500 260, 500 910, 570 910",
    blocked: "M 460 215 C 500 215, 510 260, 525 290",
    toRelay: "M 140 300 L 140 780",
    relayToSidecar: "M 470 820 C 520 820, 520 660, 570 660",
    relayToJanitor: "M 470 880 C 520 880, 520 930, 570 930",
    mtxToRelay: "M 570 410 C 470 450, 420 640, 410 780",
  },
};

const LAYOUTS = { desktop: DESKTOP, mobile: MOBILE } as const;

const STEP_NAMES = ["홉 상한 2", "홉 상한 1", "창구가 토큰 대조"] as const;
const NOTES = ["토큰 응답이 브리지를 건넘", "브리지를 건너면 TTL 0 — 버려짐", "토큰 파일이 있는 둘만 자격"] as const;

/** 점선 테두리 칸(호스트 망 · docker 브리지)과 왼쪽 위 이름. */
const Region: React.FC<{ readonly box: Box; readonly label: string; readonly size: number }> = ({ box, label, size }) => (
  <div
    style={{
      position: "absolute",
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      boxSizing: "border-box",
      border: `3px dashed ${COLOR.muted}`,
      borderRadius: 24,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 650,
      color: COLOR.muted,
      padding: "10px 22px",
    }}
  >
    {label}
  </div>
);

type Props = { readonly layout?: keyof typeof LAYOUTS };

export const HopLimitRelay: React.FC<Props> = ({ layout = "desktop" }) => {
  const frame = useCurrentFrame();
  const L = LAYOUTS[layout];
  const step = frame < T.hop1 ? 0 : frame < T.relay ? 1 : 2;
  const span = (i: number) => {
    const from = [-12, T.hop1, T.relay][i];
    const to = [T.hop1 + 6, T.relay + 6, HOP_LIMIT_RELAY_FRAMES + 30][i];
    return visibleBetween(frame, from, to, 12);
  };
  // 홉 상한 2 의 세 갈래는 홉 1 로 바뀌면 흐려진다.
  const hop2Opacity = 1 - progress(frame, T.hop1, 15);

  return (
    <AbsoluteFill style={{ background: COLOR.surface }}>
      <Region box={L.host} label="호스트 망" size={L.text.region} />
      <Region box={L.bridge} label="docker 브리지" size={L.text.region} />

      {STEP_NAMES.map((name, i) => (
        <Tag key={name} x={L.steps[i].x} y={L.steps[i].y} anchor="center" tone={i === step ? "accent" : i < step ? "ink" : "muted"} size={L.text.tag}>
          {name}
        </Tag>
      ))}

      {/* 홉 상한 2: IMDS 토큰 응답이 브리지 안 모든 컨테이너에 닿는다(위험). */}
      {[L.paths.toMtx, L.paths.toSidecar, L.paths.toJanitor].map((d, i) => (
        <FlowPath key={d} d={d} start={-30} color={COLOR.danger} packets={1} cycleFrames={45} packetsFrom={i * 8} packetsUntil={T.hop1} opacity={hop2Opacity} arrow />
      ))}

      {/* 홉 상한 1: 브리지를 건너는 응답은 경계에서 버려진다. */}
      <FlowPath d={L.paths.blocked} start={T.hop1 + 5} drawFrames={20} color={COLOR.danger} packets={1} cycleFrames={30} packetsFrom={T.hop1 + 10} packetsUntil={T.block + 30} />
      <Tag x={L.blockMark.x} y={L.blockMark.y} anchor="center" tone="danger" size={L.text.node} opacity={progress(frame, T.block, 12)}>
        ✕
      </Tag>
      {/* 호스트 망의 창구는 홉 1 이어도 받는다. */}
      <FlowPath d={L.paths.toRelay} start={T.hop1 + 10} drawFrames={20} color={COLOR.accent} packets={1} cycleFrames={40} packetsFrom={T.hop1 + 30} arrow />

      {/* 창구는 토큰 파일이 있는 두 소비자에게만 자격을 건넨다. */}
      <FlowPath d={L.paths.relayToSidecar} start={T.relay} drawFrames={20} color={COLOR.accent} packets={1} cycleFrames={40} packetsFrom={T.relay + 20} arrow />
      <FlowPath d={L.paths.relayToJanitor} start={T.relay + 6} drawFrames={20} color={COLOR.accent} packets={1} cycleFrames={40} packetsFrom={T.relay + 30} arrow />
      {/* 토큰 없는 MediaMTX · nginx 의 요청은 401. */}
      <FlowPath d={L.paths.mtxToRelay} start={T.relay + 10} drawFrames={25} dashed color={COLOR.danger} packets={1} cycleFrames={40} packetsFrom={T.relay + 35} packetsUntil={T.deny} arrow />
      <Tag x={L.denyMark.x} y={L.denyMark.y} anchor="center" tone="danger" size={L.text.tag} opacity={progress(frame, T.deny, 12)}>
        401
      </Tag>

      <Node {...L.imds} tone="ink" size={L.text.node}>IMDS</Node>
      {/* 창구는 홉 1 로 바꾼 뒤에 생긴다 — 홉 2 장면에서는 보이지 않는다. */}
      <Node {...L.relay} tone="accent" size={L.text.node} opacity={progress(frame, T.hop1, 15)}>
        대리 창구
      </Node>
      <Node {...L.mtx} tone={step === 0 ? "danger" : "ink"} size={L.text.node}>MediaMTX · nginx</Node>
      <Node {...L.sidecar} tone={step === 2 ? "accent" : step === 0 ? "danger" : "ink"} size={L.text.node}>
        {"사이드카\n토큰 파일"}
      </Node>
      <Node {...L.janitor} tone={step === 2 ? "accent" : step === 0 ? "danger" : "ink"} size={L.text.node}>
        {"janitor\n토큰 파일"}
      </Node>

      {NOTES.map((note, i) => (
        <Tag key={note} x={L.note.x} y={L.note.y} anchor="center" tone={i === 2 ? "accent" : "danger"} size={L.text.tag} opacity={span(i)}>
          {note}
        </Tag>
      ))}
    </AbsoluteFill>
  );
};
