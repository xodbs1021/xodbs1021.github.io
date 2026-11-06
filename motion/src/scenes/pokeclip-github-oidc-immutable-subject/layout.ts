// 콘티: _workspace/blog/pokeclip-github-oidc-immutable-subject/storyboard.md
// 두 장면(SubMismatch · RefVsEnvironment)이 같은 소재 · 같은 검문 자리를 쓴다.

export const ART = "pokeclip-github-oidc-immutable-subject";

/** 검문(STS · 신뢰 정책)과 임시 자격 — 두 장면 공통. 경로는 검문 아치 안을 지나 열쇠 왼쪽 가장자리에서 끝난다. */
export const GATE = { x: 810, y: 250, width: 300 } as const;
export const KEY = { x: 1510, y: 300, width: 250 } as const;
export const GATE_CENTER_X = GATE.x + GATE.width / 2;
export const KEY_CENTER_X = KEY.x + KEY.width / 2;
/** 검문 아래 이름표 · 열쇠 아래 이름표 높이. */
export const UNDER_Y = 600;
/** 검문 위 「신뢰 조건」 이름표 높이. */
export const CONDITION_Y = 150;
