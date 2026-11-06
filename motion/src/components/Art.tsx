import { Img, staticFile, useCurrentFrame } from "remotion";
import { bob, progress } from "../lib/motion";

// 모션그래픽 소재(gpt-image 스킬로 생성한 투명 배경 오브젝트)를 띄우는 부품.
// 등장할 때 아래에서 떠오르고 이후 천천히 흔들린다. 2026-10-31 migration-site FloatImg 를 옮겨 왔다.
// 소재 위치: motion/public/art/<글 slug>/<이름>.png — src 는 "<글 slug>/<이름>.png".
// 좌표는 1920×1080 캔버스의 px 이다. 글자 · 라벨은 소재에 없으므로 Tag · Label 로 얹는다.

/** 등장에 걸리는 프레임 수(30fps 에서 1초). */
const ENTER_FRAMES = 30;
/** 흔들림 한 주기(프레임). */
const DRIFT_PERIOD = 120;

type ArtProps = {
  readonly src: string;
  readonly x: number;
  readonly y: number;
  /** 그림 너비(px). 높이는 비율을 따른다. */
  readonly width: number;
  /** 등장을 시작하는 프레임. */
  readonly enter?: number;
  /** 흔들림 폭(px). 0 이면 멈춰 있다. */
  readonly drift?: number;
  /** 여러 소재가 같이 흔들리지 않게 주는 위상(프레임). */
  readonly phase?: number;
  readonly opacity?: number;
  /** 흐리게 · 회색으로 만들 때(예: 「grayscale(1) opacity(0.6)」). 안 주면 옅은 그림자. */
  readonly filter?: string;
};

export const Art: React.FC<ArtProps> = ({
  src,
  x,
  y,
  width,
  enter = 0,
  drift = 8,
  phase = 0,
  opacity = 1,
  filter,
}) => {
  const frame = useCurrentFrame();
  const shown = progress(frame, enter, ENTER_FRAMES);
  return (
    <Img
      src={staticFile(`art/${src}`)}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        opacity: shown * opacity,
        scale: 0.9 + shown * 0.1,
        translate: `0 ${(1 - shown) * 60 + bob(frame, drift, DRIFT_PERIOD, phase)}px`,
        filter: filter ?? "drop-shadow(0 30px 40px rgba(23, 44, 64, 0.18))",
      }}
    />
  );
};
