# review — chat-highlight-research-and-fallback (2026-11-12)

검증(2026-11-12): npm run build · npm test 39/39 통과. LAYOUT_PATH=0-to-1/chat-highlight-research-and-fallback 실패 0 · 경고 0(320 · 390 · 768 · 1440, light/dark, 움직임 줄이기). LAYOUT_PATH=0-to-1/pokeclip-v3-to-v4-cascade 실패 2 — 옛 차트(평균 vs 중앙값)의 「3.75배」 라벨이 SVG viewBox 밖. origin/main 원본으로 다시 빌드해도 같은 2건(이번 변경과 무관, 단건 검사에서만 실패 · 전체 검사에서는 경고). 본문 그림을 고치지 말라는 결정이라 손대지 않음. 링크 95개(두 글 + 목차 글) 200 · 내부 경로 존재. check-videos 통과(영상 0.15 · 0.17MB).

캡처 직접 확인: 도식 390 dark · 1440 light(TB 392px, 글자 겹침 없음), 영상 390 light 움직임 줄이기 포스터 · 1440 light 재생 중 · 1440 dark 움직임 줄이기.

판단 메모
- 옛 L17 · L44 「저는 … 정리했습니다」는 근거(공개 · 볼트)에서 주체 확인 안 됨 → 삭제. 역할은 「팀 실측」 · 「팀원 구현(PR #134)」만.
- 영상 순서는 코드 순서(판정 → 묶기 → 첫 창 위치 변환 → 앞뒤 여유).
- README 110–113행 「고유 채터가 더 깨끗」 단정은 7월 노트 6절 「가설」 · 7절 미결로 가설 처리.
- 배율 주석은 「임시값」, 최소 건수 주석은 「근거 없는 임시값」(둘을 구분해 인용).
