# evidence — clip-edit-recipe-render-boundary (다시 쓰기, 2026-11-11)

유형: 설계·아키텍처(실측 없음 → 측정 조건 절 없음). 코드 근거는 PokeClip-mono develop `825a3dfe`.

## 역할

- 작성자: 7월 20일 클립 내보내기 결정 묶음, 8월 25일 레시피 계약 초안(작성자 쪽 발행, 팀원 확인 — 위키 비공개라 링크 없음).
- 렌더 일꾼: 9월 14일 작성자 → 팀원 이관(https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/README.md?plain=1#L3), 이후 팀원 구현.
- AI: 설계 조사.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| cut = UTC epoch ms 반열린 구간 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/src/main/java/com/pokeclip/render/recipe/Recipe.java#L5-L16 | 공개 코드 |
| 출력 비율 9:16 · 1:1만(v1) | Recipe.java L104–107, https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/recipe/RecipeValidator.java#L55 | 공개 코드 |
| 구간 5초–3분 | RecipeValidator.java L41–42 | 공개 코드 |
| cut null = 템플릿 통과 | RecipeValidator.java L96–99 | 공개 코드 |
| 자막 3모드 | Recipe.java L134–137 | 공개 코드 |
| 트랙 0–5, gain 0.0–2.0 | Recipe.java L82–84 | 공개 코드 |
| 렌더 단계, fail-closed, 실패 분류, 한 일꾼 한 주문 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/README.md?plain=1#L18-L28 이하 | 공개 코드 |
| -14 LUFS는 렌더 상수 | workers/render/.../media/Loudness.java L7 | 공개 코드 |
| 레시피 지우는 문 없음, PUT 통째 교체 · recipeVersion +1 | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L2402-L2420 | 공개 코드 |
| 조각 없으면 SOURCE_EXPIRED | workers/render/README.md L26 | 공개 코드 |
| 7/20 smart cut 기각, 항상 재인코딩, 비율 5종, 자동 업로드 템플릿, 미리보기 클라이언트 | 팀 내부 결정(7월 20일, 비공개) | 비공개 |
| 원본 VOD 60일(7/20), 운영 만료 미연결 | 팀 내부 결정(7월 20일), round-vod 글 「만료」 항목 | 공개 글 |
| 11/2 · 11/3 시간축 결정, #475 · #496 draft | media-timeline 글 119 · 127행, gh pr view | 공개 |

## 쓰지 않은 것

- 「재인코딩 수 초」: 잰 적 없음. README 176행의 렌더 실측(15초 컷 7초)은 수행 주체 불명이라 인용하지 않음.
- 자동 업로드 흐름의 실제 템플릿 사용 여부: 미확인으로 씀.
