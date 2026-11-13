# codec-decision-and-debugging 근거 메모

유형: 기술 해설(트러블슈팅 요소). 실측 수행: AI(Claude Code), 2026-11-13 14:15–14:50 KST, MacBook Air M5, FFmpeg 9.0.2, Chrome 157. 원자료는 `measure/`.

| 주장 | 근거 | 종류 |
|---|---|---|
| CDN 바이트 산식, VMAF 93 비트레이트(1,799 · 1,184 · 1,201 · 867kbps) | h265-hdr-deep-dive 측정 조건(묶음 4) | 실측(재인용) · 계산값 |
| FFmpeg hls 먹서가 HE · HEv2에 mp4a.40.2(fMP4 · TS) | measure/hls_codecs.txt, he_fmp4_master.m3u8, codecstring.c 213–222 | 실측 · 문헌값 |
| Apple 부록 .5 · .29, 2.24 SBR 명시 MUST, 8.16 | Apple HLS Authoring Spec | 문헌값 |
| Chrome 157 MSE · decodingInfo 결과, .2 · .5 선언 모두 재생 | measure/chrome_probe.json, mse_he_play.json | 실측 |
| ffprobe csv 순서, flags=K 2,445 대 10 | 본문 명령(재실행 가능) | 실측 |
| 로그 문자열 위치 | ffmpeg_filter.c 2599, movenc.c 7082, flvenc.c 1331, ffmpeg_mux.c 180, audio_frame_queue.c 61 (n9.0.2) | 문헌값 |
| -r 15에서 drop=12, verbose에서 *** dropping frame | 본문 명령 | 실측 |
| -vsync 거부(Unrecognized option) | 본문 명령 | 실측 |
| hls.js 1.7.4: INCOMPATIBLE_CODECS 두 오류, Level의 audioCodec · videoCodec · codecSet · codecs, useMediaCapabilities 기본 true, swapAudioCodec · defaultAudioCodec 비권장, stsd · ADTS에서 코덱 읽음 | API.md v1.7.4, level.ts 190–192 | 문헌값 |
| RFC 8216 6.2.4 CODECS MUST | rfc8216 | 문헌값 |
| caniuse 오디오 표 | Fyrd/caniuse aac · opus · flac · ac3-ec3.json(2026-11-13) | 문헌값 |

조사 단계 메모와 다른 점: hls.js 1.7.4의 Level에는 `codecs` getter(목록 CODECS 원문)가 있다(level.ts 190–192, API.md 예시에도 있음). 「level.codecs 없음」은 이 판에서 맞지 않아 본문은 네 필드를 모두 적었다.

정정(옛 글 대비): 60% 못 봄 · CDN 두 배 · GPU 배수 · MediaConvert · L40 · ROI · 치지직 가상 분석 · AV1 무료 · Twitch 404 · hvc1 강제 · zscale 명령 · -vsync · csv 순서 · flags=K · level.codecs 코드 · FFmpeg 로그 키워드 · 브라우저 매트릭스 · Twitch AV1 · 면접 절 · illustrativeMetrics.

독립 리뷰 반영(2026-11-13): Apple 2.24는 SBR 명시 신호만 MUST이고 aac_at ASC(0x2b7 동기 확장)는 이를 충족함. .2/.5를 정한 규칙은 Apple 본문에 없고 부록 표만 .5, RFC 6381 3.3은 Audio Object Type만 정함 → FFmpeg 표기를 「틀림」으로 단정하지 않고 「규격 표와 다르게 적음」으로 씀. .2 선언의 영향(LC 변형과 구별 불가)은 추론으로 표시. Chrome 157 재생 시험은 SBR까지 풀었는지 재지 않음.
