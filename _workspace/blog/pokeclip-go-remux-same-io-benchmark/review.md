# review — pokeclip-go-remux-same-io-benchmark (다시 쓰기, 2026-11-11)

## 자동 검사

- `npm run build` 통과, `npm test` 39/39 통과.
- `LAYOUT_PATH=0-to-1/pokeclip-go-remux-same-io-benchmark npm run test:layout` 실패 0, 경고 0(390·1440, light/dark, 움직임 줄이기 켬/끔).
- 링크: 본문 외부 링크 전부 200(curl), 내부 링크·PDF 쪽 링크는 dist에 존재.
- 기계 문체 검사: 메타 문장 0, 본문 '~다.' 0.
- 공개 저장소 비공개 패턴 검사(Jira 키·ADR 번호·내부 단계명·세션 이름·IP·볼트 경로·쓰지 않기로 한 링크): 0.

## 시각 자료 판단

| 위치 | 놓침 신호 | 형식 | 없으면 놓치는 것 | 근거 |
|---|---|---|---|---|
| 첫 절 | 조각이 들어올 때마다 상태가 바뀜 | 영상 RemuxInitDrift(개념도) | FFmpeg은 조각마다 init이 바뀌고 Go는 하나라는 대비 | 9/4·9/19 실측 해시 앞자리 |
| 넷째 절 | 같은 단위 수치 4개 | ECharts 가로 막대 p50·p95(실측) — 옛 matplotlib SVG 교체 | 같은 범위에서도 7.69배 차이 | 10/4 실측(비공개) |

동시성 표는 단위가 다른 두 지표(MiB, ms)를 정확한 값으로 보여 줘야 해 표로 둠(이중 y축 금지). 옛 SVG `static/images/portfolio-2026-10-15-v2/repack-p50.svg`는 이 글에서만 참조(PDF 링크 82개 중 이미지 없음)해 삭제.
필수 수량: 움직이는 설명 1, 정적 그림 1 — 충족.

## 독립 리뷰 지적과 처리

- MUST description이 「옛 10.9배와 같은 범위」로 본문과 반대 → 「옛 10.9배와 달리 두 경로의 범위를 맞춰」로 고침.
- SHOULD Safari 재생 날짜(9/19 아님, 9/23) → hls.js 1.5.15(9/19), hls.js 1.7.3·Safari(9/23)로 고침.
- SHOULD 영상의 파트 4→2가 세 조각 모두 같음 → 캡션에 단순화와 실제 6→3·4→2·3→1 명시.
- NIT 출처의 「생산자」가 PDT 생산자와 헷갈림 → 「재포장 부품(Producer)」.
