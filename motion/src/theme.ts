import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import tokens from "../../src/styles/visual-tokens.json";

// 블로그와 같은 서체·팔레트를 쓴다.
// 글꼴 파일은 npm install 때 scripts/copy-fonts.mjs 가 public/fonts 로 복사한다.
const FAMILY = "Pretendard Variable";

loadFont({
  family: FAMILY,
  url: staticFile("fonts/PretendardVariable.woff2"),
  weight: "45 920",
});

export const FONT = `'${FAMILY}', 'Apple SD Gothic Neo', sans-serif`;
export const MONO = "'SF Mono', Menlo, monospace";

// 색은 블로그와 같은 원천(src/styles/visual-tokens.json)의 밝은 테마 값을 쓴다.
const LIGHT = tokens.themes.light;
export const COLOR = {
  ink: LIGHT.ink,
  muted: LIGHT.muted,
  line: LIGHT.line,
  surface: LIGHT.surface,
  accent: LIGHT.accent,
  accentSoft: LIGHT.accentSoft,
  danger: LIGHT.danger,
  dangerSoft: LIGHT.dangerSoft,
  white: LIGHT.bg,
} as const;

// 데스크톱 본문(760px)에서 약 0.4배, 390px 폭 휴대폰에서 약 0.17배로 줄어든다.
// 글자는 TEXT.small(36px) 이상 — 휴대폰에서는 작으므로 핵심은 캡션 문장이 다시 말한다(스킬 규약).
export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;
export const TEXT = { title: 52, label: 42, small: 36 } as const;
// bottom: 설명 영상(12초 초과)은 브라우저 재생 컨트롤과 그 그림자가 아래 약 20% 를 덮는다 — 핵심은 이 위에 둔다.
// 반복 영상(12초 이하)은 컨트롤 없이 재생하므로(블로그가 그림 밖에 버튼을 단다) 덮이지 않는다.
export const SAFE = { x: 120, y: 96, bottom: 840 } as const;
// 휴대폰판(4:5). 390px 폭에서 약 0.33배로 보이므로 글자는 48px 이상(화면에서 약 16px).
// 반복 영상은 브라우저 컨트롤 없이 재생하므로 아래를 비우지 않는다.
export const MOBILE_VIDEO = { width: 1080, height: 1350, fps: VIDEO.fps } as const;
export const MOBILE_TEXT = { title: 56, label: 48, small: 48 } as const;
export const MOBILE_SAFE = { x: 60, y: 96, bottom: 1250 } as const;
