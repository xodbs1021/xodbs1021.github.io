# review — pokeclip-live-window-without-fork (2026-11-11)

검증(2026-11-11): npm run build · npm test 39/39 통과, LAYOUT_PATH 단건 layout 실패 0(390·1440, light/dark, 움직임 줄이기), 네 글 외부 링크 47개 200, check-videos 통과(영상 0.15–0.23MB). 독립 리뷰 1회(새 컨텍스트, 원자료·코드·정본 대조, MUST/SHOULD/NIT).

| 등급 | 지적 | 처리 |
|---|---|---|
| MUST | 「그 전에는 900을 둡니다」가 운영값을 현재형으로 말함(사용자 결정 3) | 「서비스된 뒤에만 라이브 창을 줄이기로 했습니다」로 |
| SHOULD | 표 열 「PokeClip의 값」이 적용값처럼 읽힘 | 「정한 값」 |
| SHOULD | 6.2.5.2 문장이 400을 규격 준수처럼 읽게 함 | 「초안과 다른 공통 동작」으로 |
| SHOULD | 10/17 실측 1.21.1은 gohlslib v2.4.5 | 측정 조건에 판 차이와 세 인용 지점 동작 동일(v2.4.5 소스 대조) 명시 |
| NIT | 「올린 수정」 → 「올릴 수정」, 7초 창만 GOP 1초, HLS 시청 세션 구분, 「고른 값」 | 반영 |

화면: 차트 markLine 이름표가 축 숫자와 겹쳐 위쪽으로 옮김. 시각: 그림 1 차트(실측), 그림 2 영상 LiveWindowPause.
