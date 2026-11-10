# review — pokeclip-database-authoritative-manifest-publishing (2026-11-11)

검증: npm run build · npm test(39/39) 통과, LAYOUT_PATH 단건 layout 실패 0(390·1440, light/dark, 움직임 줄이기), 링크 36개 200, check-videos 통과. 독립 리뷰 1회(새 컨텍스트, 원자료 대조).

| 등급 | 지적 | 처리 |
|---|---|---|
| MUST | 412 뒤 「한 번 다시 시도」는 코드와 다름(화해 뒤 틱 포기, README 35행) | 캡션·accDescr·노드·본문 고침, 대가(한 틱) 명시 |
| SHOULD | 멈춘 A가 3초 마감 뒤 PUT을 보낼 수 없음(모순) | 「마감 검사를 지나 이미 출발한 PUT이 늦게 도착」으로 시나리오·영상 이름표 수정 |
| SHOULD | README 링크 범위가 주장과 어긋남 | 비용 L2190–2195, 35행 L2456, 실측 L2387–2395로 나눔 |
| SHOULD | 옛 id 「설계-당시-받아들인-비용과-통합-과제」 삭제 | 뼈대에 대응 소제목이 없어 의도적으로 뺌. 저장소·PDF 안 내부 링크 없음(리뷰어 확인). 사용자 판단 필요 |
| NIT | 재시작 겹침 근거 없음 | PR #289 Why 문구에 맞춤 |
| NIT | RFC 6.2.1 허용 변경 넷 중 둘만 | 넷 모두 |
| NIT | 첫 PUT은 If-None-Match: * | 캡션에 반영 |
추가: ENDLIST 봉인 시점(PR #461) 문장 추가. 시퀀스도는 961px라 TB 흐름도로 바꿈.
