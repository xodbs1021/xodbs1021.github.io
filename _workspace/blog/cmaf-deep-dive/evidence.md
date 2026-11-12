# cmaf-deep-dive — 근거 메모 (유형: 기술 해설 + 로컬 실측)

확인일 2026-11-12. 실측 원자료: measure/ (init · seg-1 mp4dump, MPD, styp 첫 24바이트).

| 주장 | 근거 | 종류 |
|---|---|---|
| CMAF ISO/IEC 23000-19:2024 3판 2024-02-29 | IEC 웹스토어 92817, iTeh 견본(Third edition) | 문헌값 |
| CENC 23001-7:2023 4판 2023-08-08, 여러 DRM 공통 파일, DRM 아님, CTR · CBC 방식 | IEC 웹스토어 87807 | 문헌값 |
| HLS 조각 형식, fMP4 init 조건(iso6, mvex, 표본 수 0), tfdt 필수, CMAF가 만족 | RFC 8216 3 · 3.3 | 문헌값 |
| EXT-X-MAP 버전 6 | RFC 8216 7 | 문헌값 |
| Media3 DASH: FMP4 · WebM · Matroska, MPEG-TS 「No support planned」, Widevine cenc API19+ · cbcs API25+, PlayReady SL2000 cenc만 | developer.android.com Media3 DASH | 문헌값 |
| init/조각 상자 구조, timescale 15360, 표본 512, tfdt 0 · 7680 · 15360 · 23040, seg-2 30720, 청크 4개 × 15표본, mdat 크기, styp msdh(호환 msdh · msix), ftyp iso5 + cmfc | FFmpeg 9.0.2 + Bento4 mp4dump 1.6.0.0 (AI 실행) | 실측 |
| availabilityTimeOffset 1.500 | FFmpeg가 쓴 MPD | 실측 |
| 브랜드 분류 cmfc · cmf2 구조, cmfs · cmff · cmfl, msdh · msix DASH | MP4RA brands.csv | 문헌값 |
| tfdt 연속 MUST(7.3), EXT-X-MAP MUST(8.20), HEVC · AV1 fMP4(1.5 · 1.39), FPS SAMPLE-AES(13.2), 1:9(13.7), SAMPLE-AES-CTR 금지(13.11) | Apple 저작 규격 | 문헌값 |
| SAMPLE-AES fMP4 = cbcs | RFC 8216 4.3.2.4 | 문헌값 |
| cenc = AES-128 CTR, cbcs = AES-128 CBC | W3C eme-stream-mp4 | 문헌값 |
| Shaka Packager: 포장 · 암호화 도구, FairPlay 예시 --protection_scheme cbcs --protection_systems FairPlay, 패턴 기본 1:9 · 16바이트 블록, LL-DASH만 | Shaka Packager v3.9.3 README · raw_key.rst · general_encryption_options.rst · low_latency.rst | 문헌값 |
| PokeClip tfdt 사례 141.97/80.03초, 8.10 → 39.87초 · 193바이트 | zero-errors-missing-playback, cdn-timeline-normalization | 공개 기록 |
| DATERANGE SCTE35-OUT/IN, Interstitials | RFC 8216 4.3.2.7.1, bis-22 부록 D | 문헌값 |
| ENDLIST로 VOD는 EVENT일 때 | RFC 8216 6.2.1 · 6.3.4 | 문헌값 |
| DASH-IF 가용 창 | DASH-IF Timing Model 13.3 | 문헌값 |

삭제: 「2026-10-29 정정」 인용문, illustrativeMetrics, 「HLS v7(2016)」, 차트 6개(절감 · 지연 · TTL · 오버헤드 · 퍼널), 「major_brand cmfc」, Constraint 7항목, 「Shaka가 자동 보장」, iOS 10 · Android 5, LL 목록 예시(→ ll-hls), TTL 절(→ hls-deep-dive), PlayReady 비중, 가상의 --enable_fairplay_encryption, EXT-X-CUE-OUT/IN, SSAI · 비콘 · 채택사, QC 파이프라인, 장애 3종 표와 「운영 경험」 문장, 치지직 문장, AI 이미지 2장, data/legacy-figure-gaps.json의 cmaf 항목.
