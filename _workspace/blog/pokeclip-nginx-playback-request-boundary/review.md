# review — pokeclip-nginx-playback-request-boundary (2026-11-12)

검증: npm run build · npm test 39/39, 단건 layout, 외부 링크 200, check-videos 통과. 독립 리뷰는 코디네이터가 따로 받음.

| 지시 대비 | 처리 |
|---|---|
| 런북 314–361행 | 경로 우회 15사례 정의는 358–380행(요청 3종 × 변형 5) — 이 범위로 링크 |
| 15사례의 대상 | 쿠키 없이 /live · /playback 에서 ../ 로 제어면을 노린 요청. 「보호 대상 상류」로 씀 |
| 교차 쿠키 시험 | 운영 런북의 교차 쿠키 시험은 라이브 목록용. 재생(녹화) 교차 시험은 운영에서 「남아 있다」로 |
| 원문 검사 | 첫 구현($uri 대조)이 /A/..%2fB/list?path=B 를 통과시킨 것을 커밋 리뷰가 잡은 사실을 추가 |
| live_auth | PR #487 11/7 머지, 11/9 운영 반영. /live/* 에만 붙어 재생 원문 검사는 nginx 혼자 |
| 5/5 반복 | 비공개 기록. 공개 PR 본문은 로컬 통과만 — 측정 조건에 밝힘 |

그림: 영상 PlaybackQueryGuard(12초, 휴대폰판), Mermaid fig-playback-path(TB 392px).
