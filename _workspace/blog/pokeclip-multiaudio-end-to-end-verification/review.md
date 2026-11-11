# review — pokeclip-multiaudio-end-to-end-verification (2026-11-11)

검증(2026-11-11): npm run build · npm test 39/39 통과, LAYOUT_PATH 단건 layout 실패 0 · 경고 0(320·390·768·1440, light/dark, 움직임 줄이기), 외부 링크 25개 200(ffmpeg.org 1회 시간 초과 뒤 재시도 200), 내부 링크·앵커 존재, check-videos 통과(영상 0.20–0.49MB). 독립 리뷰 1회(새 컨텍스트, 원자료·코드·정본·PDF 대조, MUST/SHOULD/NIT; 결과는 코디네이터 경유). 유출 0건, 인용 줄 번호 일치(2-S5 제외 → 반영). 공통: 그림 번호를 [[fig-id]] 참조로.

| 등급 | 지적 | 처리 |
|---|---|---|
| MUST | hls.js audioTrack 5는 여섯 번째 트랙 | 첫 문단 · 표 아래 문단 · description 「여섯 번째 트랙(hls.js 번호 5, 목록 이름 audio7)」, 영상 칸 「6번째 · 200」으로 다시 렌더 |
| SHOULD | 「톤 시험이 처음 확인」 | 「처음」 삭제, 「첫 트랙 하나는 9/19 재포장 실험에서 220Hz」 덧붙임 |
| NIT | 영상 안내 · 캡션 | 「(첫 트랙만 본 9/19 실험 제외)」 |

자체 수정: 차트 markLine 이름표가 가로축 눈금과 겹쳐 위쪽으로 옮김(390 · 1440 캡처 확인).
시각: 영상 MultiaudioStageProof(12초, 휴대폰판은 행렬 전치), 그림 2 ECharts 점 그림(실측, PR #195 본문 90–100행).
