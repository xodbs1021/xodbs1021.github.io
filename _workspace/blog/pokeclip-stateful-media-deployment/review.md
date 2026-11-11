# review — pokeclip-stateful-media-deployment (2026-11-11)

검증(2026-11-11): npm run build · npm test 39/39 통과, LAYOUT_PATH 단건 layout 실패 0(390·1440, light/dark, 움직임 줄이기 — 캡처 직접 확인), 다섯 글 외부 링크 46개 200, check-videos 통과(영상 0.13–0.26MB). 독립 리뷰 1회(새 컨텍스트, 공개 코드 825a3dfe · gh · 정본 글 · 비공개 결정 기록 대조, MUST/SHOULD/NIT). 비공개 패턴 검사 전체 diff 0건.

| 등급 | 지적 | 처리 |
|---|---|---|
| SHOULD | 300초 기준이 「다시 뜬 뒤」 — 실제는 송출이 끊긴 뒤 | 캡션 · alt 고침 |
| SHOULD | 7/27 「옮겼습니다」 — 결정일 | 「옮기기로 정했습니다」 |
| SHOULD | 업로드 전 파일을 잃는다/남는다 모순 | 인스턴스 교체면 잃고 같은 상자 재기동이면 남는다로 |
| SHOULD | 825a3dfe 날짜 | 반영 |
| NIT | 「컨테이너에 TERM」 | 「compose에 TERM」 |
| NIT | rds.tf 70–79 앵커가 인스턴스 등급 줄 포함 | 77–79행으로 |
| NIT | 월 약 50달러는 7월 추정 | 「7월 추정」 |
| NIT | 「트래픽이 엔드포인트로 나간 것을 확인」 과장 | 라우팅 표 항목 확인으로 |
| NIT | ECS · S3 엔드포인트 문서가 출처에만 | 본문에 연결 |
