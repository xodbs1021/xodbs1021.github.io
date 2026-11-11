# review — pokeclip-dependency-upgrade-contracts (2026-11-12)

검증: npm run build · npm test 39/39, 단건 layout, 외부 링크 200, check-videos 통과. 독립 리뷰는 코디네이터가 따로 받음.

| 지시 대비 | 처리 |
|---|---|
| 날짜 | #6292 상류 머지 10/6 01:39 KST(10/5 아님), v1.21.2 10/9, v1.21.3 10/25 |
| 골든 | 입력은 새 fixture가 아니라 1.19.3 녹화 segment_4s.mp4. 「같은 입력에서 재포장 계약 유지」로 씀. 판 일치 시험이 짝 |
| README 2842행 | 골든 바이트 · 기대값 6개는 PR #217 본문과 producer_test.go에 있음 — 그쪽으로 링크 |
| 중복 FROM | 8/4 첫 판에만. 8/30부터 마지막 FROM만 봄 |
| 194 · 7/7 | 본문에서 빼고 PDF 정정 문장에서 「8/4 훅 스풀 PR의 값, 7/7은 뮤턴트 사고실험」으로 |
| #6261 | 10/25 닫힘, 메인테이너 재구현(#6417)이 v1.21.3에 |
| 통과 조건 | 골든 불변은 미리 정한 조건이 아니라 결과. 조건은 「골든 · 기대값은 별도 프로그램 산출로만 고친다」(AI) |
| 태그 | 원래 tags 유지 |

그림: 영상 HlsSessionAfterCut(11초, 휴대폰판), Mermaid fig-mtx-pin-timeline(TB 184px).
