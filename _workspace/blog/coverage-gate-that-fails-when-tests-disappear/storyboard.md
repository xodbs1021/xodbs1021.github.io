# storyboard — coverage-gate-that-fails-when-tests-disappear

## 영상 1 `CoverageGateRuns` (11초 반복, 휴대폰판 있음)
- 근거: 2026-08-18 Actions 세 실행(32089173930 · 32089415103 · 32089609771)의 게이트 출력. 테스트 스텝은 하나이고 그 안의 9개 패키지가 모두 ok(콘티 초안의 「테스트 스텝 9개」는 사실과 달라 「9개 패키지 테스트」로 그림).
- 0–0.5초: 제목 「테스트는 세 번 다 성공, 게이트만 갈렸다」, 바닥선과 점선 80% 기준선.
- 실행마다 약 3초: 칸 9개가 청록으로 채워짐 → 「9개 패키지 테스트 ok」 → index 막대가 오름(81.8 / 52.3 빨강 / 81.8) → 「게이트 통과」·「게이트 실패」 이름표.
- 끝 프레임(포스터, 320): 세 열이 모두 보이고 둘째 막대만 80% 선 아래 빨강 + 「게이트 실패」.
- 휴대폰판: 열 머리 「① 정상 / ② 파일 제외 / ③ 재실행」, 범례 한 줄 「칸 = 패키지 테스트, 막대 = index」, 글자 48px.

## 정적 그림 `fig-coverage-by-run` (ECharts, 실측)
- 세 실행 × index·upload·indexer 커버리지 막대 + 80% markLine. index만 accent(둘째 실행은 danger), upload dataMuted, indexer ink.
