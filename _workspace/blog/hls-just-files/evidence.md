# hls-just-files — 근거 메모 (유형: 기술 해설)

확인일 2026-11-12. 모두 공개 1차 근거.

| 주장 | 근거 | 종류 |
|---|---|---|
| draft-pantos-http-live-streaming-00, 2009-05-01, 「unbounded streams of multimedia data over HTTP」 | ietf.org archive txt | 문헌값 |
| RFC 8216 2017-08 Informational, bis-22 2026-05-01 버전 13, ISE 「Sent to the RFC Editor」 | rfc8216.txt, bis-22 txt, datatracker | 문헌값 |
| M3U에서 파생, EXTM3U · EXTINF 상속, UTF-8, .m3u8/.m3u 또는 application/vnd.apple.mpegurl | RFC 8216 4 · 4.1 | 문헌값 |
| Master → Multivariant 이름 변경 | bis-22 4.4.6, Apple LL 문서 개정 2021-11-12 | 문헌값 |
| 목록 변경 4가지, VOD/EVENT, TD 불변 | RFC 8216 6.2.1 | 문헌값 |
| 목록 길이 3×TD 미만 금지 | RFC 8216 6.2.2 | 문헌값 |
| 6조각 MUST, 15분 SHOULD, 7.7 0.5초, 7.4 IDR MUST, 1.5 · 1.39 HEVC/AV1 fMP4, 8.6 · 8.8 | Apple 저작 규격(개정 2025-06-26) | 문헌값 |
| EXTINF 반올림 ≤ TD | RFC 8216 4.3.3.1 | 문헌값 |
| 조각 형식 TS/fMP4/묶음 오디오/WebVTT, TS 처음 두 패킷 PAT·PMT SHOULD, EXT-X-MAP 버전 6, 묶음 오디오 ID3 PRIV | RFC 8216 3, 3.2–3.4, 7 | 문헌값 |
| H.264 조각 IDR SHOULD | RFC 8216 3 | 문헌값 |
| hls_time 뒤 다음 키프레임에서 자름 | FFmpeg 형식 문서 hls | 문헌값 |
| MSE 레지스트리에 video/mp2t | W3C MSE byte stream format registry(2026-11-09 판) | 문헌값 |
| hls.js: fMP4 패스스루, TS · 묶음 오디오 transmux, Web Worker, Chrome 147 canPlayType 주의, iOS 17.1+ MMS | hls.js README, 1.5.0 릴리스(2024-01-09) | 문헌값 |
| Chromium enable_hls_demuxer 빌드 옵션 | chromium media_options.gni(main, 2026-11-12) | 문헌값 |
| hls.js 1.7.3 조각 404 갈래(가운데 gap, 마지막 6회 1·2·4·8·8·8초) | PokeClip 되감기 404 글(소스 커밋 e5ff358 인용) | 공개 기록 |
| PokeClip 28초 창, 7.66초 → 반올림 8 분할 | live-window-without-fork, pokeclip-round-vod | 공개 기록 |

삭제: 「모든 걸 바꿨다 · 독점」, 3G 숫자, WinAMP 기원, 「최근 3~5개」, 「첫 패킷 항상 PAT」, 「MSE는 fMP4만」, 「3번 재시도 후 건너뜀」, 서명 60초 · 대시보드 · 지연 18~25초, PTS/DTS 절, AI 이미지 5장, ExplanationLab latency 연결.

리뷰 반영(2026-11-12): Master → Multivariant 근거를 개정 초안 부록 A로, Content-Type에 audio/mpegurl(RFC 8216 4절) 추가, 7.66초 조각은 원인 미확인으로(round-vod 정본), PlaylistSlide를 EXTINF · 주소 두 줄로.
