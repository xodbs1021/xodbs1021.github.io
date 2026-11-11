# evidence — pokeclip-live-window-without-fork (다시 쓰기, 2026-11-11)

유형: 의사결정. 공개 근거만 링크한다.

## 역할

- 작성자: 8/25 6초 → 8/28 14초 → 10/19 28초 결정, 적용 순서(되감기 주소 서비스 뒤), 10/17 AWS 실측 비용 승인.
- AI(Claude Code · Codex): 규격·소스 조사, 6초용 gohlslib 패치(5곳) 시험, 8/28 착수 시험, 10/17 CloudFront 실측. 두 AI 상호 리뷰.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| gohlslib LL-HLS 조각 7 미만 거부, 기본 7 | gohlslib v2.4.3 muxer.go L225–226, L318–320 | 공개 소스 |
| 7 = CAN-SKIP-UNTIL 약속을 지키는 최소 창(추정) | 팀 내부 조사(8/25), 본문에 「커밋 기록으로 확인한 이유 아님」 | 추정 |
| 애플 8.11 라이브 목록 최소 6조각 MUST | Apple HLS Authoring Spec 원문 직접 확인(2026-11-11 WebFetch) | 문헌값 |
| 8/25에 애플 설명 페이지만 보고 잘못 판단, 8/28 사후 확인 | 팀 내부 결정(8/28) | 비공개 |
| PART-HOLD-BACK = LL 시작 거리, HOLD-BACK 기본 3 × TD, 클라이언트는 그보다 가까이 시작 안 함 | draft-pantos-hls-rfc8216bis-22 4.4.3.8, 6.3.3 | 문헌값 |
| 조각 자르는 조건 「경과 ≥ 설정」 | gohlslib v2.4.3 muxer_segmenter.go L579–580 | 공개 소스 |
| 이전 4초 설정 평균 3.99초 | 팀 내부 실측 | 비공개 |
| 8/28 착수 시험: EXTINF 2.00000, TD 2, PHB 1.25, CAN-SKIP 12, 창 밖 404 | 팀 내부 결정·실측 | 비공개 |
| 10/17: EXTINF·TD·PHB·CAN-SKIP·15초/30초 결과 표 | 팀 내부 실측 기록(비공개) | 실측 |
| 창 밖 MSN 400 | gohlslib muxer_stream.go L344–352, bis-22 6.2.5.2(목록 전체 반환 MUST) | 공개 |
| 등호 경계: 설정 2s·4s, 45회, EXTINF 315줄 정확, TD 불변 | 팀 내부 실측 | 비공개 |
| hlsTrustedProxies로 401 해소, 캐시 효과 0 | 팀 내부 실측 | 비공개 |
| 10/19 28초(4초 × 7), 설정 변경 개수 하나 | 팀 내부 결정 | 비공개 |
| 비LL 폴백 3 × TD 계산값 6 → 12초 | 계산값 | 가정·모형 |
| 적용 조건: 되감기 주소 서비스 뒤 | 팀 내부 결정. 운영 적용 여부는 쓰지 않음(사용자 결정) | — |
| bis-22 6.2.2 Availability Duration | 초안 원문 | 문헌값 |
| PDF 6쪽 「약 14초 창」 = 8/28 결정 기준 | pdftotext | 고정본 |
