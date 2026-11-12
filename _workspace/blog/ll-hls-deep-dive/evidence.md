# ll-hls-deep-dive — 근거 메모 (유형: 기술 해설)

확인일 2026-11-12.

| 주장 | 근거 | 종류 |
|---|---|---|
| 게시 지연, 파트 = 부모 표본의 부분집합, 같은 표본 · 시각, 파트 번호 0부터, MSN 같음, 파트 형식은 3.1 아무것(TS 포함) | bis-22 3.2 | 문헌값 |
| PART-TARGET, 파트 길이 ≤ 목표 · ≥ 85%(예외) | bis-22 4.4.4.9 | 문헌값 |
| INDEPENDENT SHOULD, 합류 · 전환 효율 | bis-22 4.4.4.9 | 문헌값 |
| 200ms × 30 예시, 3×TD 넘은 파트 제거, 「TV 방송 수준」, 불필요한 왕복 제거, 예시 목록 버전 6 | Apple Enabling LL-HLS(2024-05-21 개정) | 문헌값 |
| 보류 규칙(msn, part, 다음 부모 part 0, 전체 목록, 400 · 503, Advance Part Limit, ENDLIST 무시) | bis-22 6.2.5.2 | 문헌값 |
| 델타: CAN-SKIP-UNTIL ≥ 6×TD, EXT-X-SKIP 버전 9(v2 10) | bis-22 4.4.3.8, 6.2.5.1, 8 | 문헌값 |
| PRELOAD-HINT 정의 · 보류, B.1에서 필수 | bis-22 4.4.5.3, 부록 B.1 | 문헌값 |
| 파트는 링크 속도로 다 보낼 수 있을 때까지 한 바이트도 보내지 않음, ABR 측정 이유 | bis-22 6.2.6 | 문헌값 |
| 화질 보고 LAST-MSN · LAST-PART, B.1 MUST, 튠인(부록 C, Age) | bis-22 4.4.5.4, B.1, C | 문헌값 |
| PART-HOLD-BACK ≥ 2×(MUST) · 3×(SHOULD) | bis-22 4.4.3.8 | 문헌값 |
| 애플 14.2a–c(P95 RTT MUST, 3× SHOULD, 권장 1초), 14.3 3× MUST, 14.4 2분 초과 창 델타 SHOULD | Apple 저작 규격 | 문헌값 |
| PokeClip 파트 0.5초 · PART-HOLD-BACK 1.25초 · CAN-SKIP-UNTIL 24초 · 창 밖 400 | live-window-without-fork(실측 공개 기록) | 공개 기록 |
| 2.5배 = gohlslib 고정 계수 | gohlslib v2.4.3 muxer_stream.go 468행(v2.4.5도 같음) | 소스 |
| MediaMTX 기본 hlsPartDuration 200ms(참고, 본문 미사용) | mediamtx v1.21.1 mediamtx.yml | 소스 |
| 서버 구성 요건(HTTP/2 · 3, RFC 9218, 멱등, GZIP, 렌디션 동기, 요청 합치기, Age) | bis-22 부록 B.1 | 문헌값 |
| PokeClip CloudFront 라이브 목록: _HLS_* 3개만 캐시 키, 엣지 1초 | pokeclip-cdn-cache-auth-measurement | 공개 기록 |
| GS네오텍 고객 사례 2025-08-18: 「LL-HLS 기반 스트리밍 도입」, 「HLS 세그먼트 등)을 1초 이내에 전달」 | gsneotek.com 고객 사례 페이지 원문(2026-11-12 열람) | 업체 공개 사례 |
| hls.js 1.0.0 2021-04-01 Apple LL-HLS 지원 | GitHub 릴리스 API | 문헌값 |
| FFmpeg hls 묶개에 EXT-X-PART 옵션 없음, dash -lhls = EXT-X-PREFETCH 커뮤니티 LHLS(실험, Apple 방식 아님), -ldash | 로컬 ffmpeg 9.0.2 -h muxer=hls/dash, FFmpeg 형식 문서 | 로컬 확인 · 문헌값 |
| Shaka Packager 「Only LL-DASH is supported. LL-HLS support is yet to come.」 | v3.9.3(2026-07-27) low_latency.rst | 문헌값 |

삭제: 「2초 · 10배」, 25초 분해, 100만 RPS, 「HTTP/1.1 chunked · CDN 100% 호환」, 「200~500ms 표준」, 50ms 폴링 코드, CDN 3사 지원 단정, 델타 90%, 화질 보고 1초, 「fMP4만」, FFmpeg LL-HLS 명령, 비용 30% · 도입 현황, AI 이미지 4장.

리뷰 반영(2026-11-12): hls.js는 1.0.0부터 LL-HLS를 지원하되 PRELOAD-HINT는 해석만 함(v1.0.0 릴리스 노트 「The only features not implemented in v1.0.0 are "Hinted Part and Map Preloading"」, README 「Parsed but missing feature support (#5074)」), WWDC19 502 링크, GS네오텍 인용을 원문 그대로, 게시 지연 재설명을 한 문장으로.
