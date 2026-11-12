# h264-deep-dive — 근거 메모 (유형: 기술 해설 + 로컬 실측)

확인일 2026-11-13. 실측 원자료: measure/ (실측 수행 주체: AI(Claude Code), 사용자 실측 아님). 공개 근거만 적는다.

| 주장 | 근거 | 종류 |
|---|---|---|
| 1080p60 RGB 8bit 3ch = 373,248,000 B/s, 1시간 1.344TB, 6Mbps = 0.75MB/s, 비 497.664, 4:2:0 8bit 186.624MB/s, 약 249배 | 계산(tests/blog-quality.test.mjs도 497.664 확인) | 계산값 |
| Sintel 10초 x264 medium CRF 28 = 1,799.4kbps, VMAF 93.40; 4:2:0 1080p24 원본 597.2Mbps의 약 332분의 1 | measure/encodes.json x264_medium_crf28 | 실측 · 계산 |
| ITU-T H.264 첫 판 05/2003, 현재 06/2026(열여섯 번째 전체 판) | https://www.itu.int/rec/T-REC-H.264 (WebFetch 2026-11-13) | 문헌값 |
| Via LA AVC/H.264 프로그램 운영 중 | https://www.via-la.com/licensing-programs/avc-h-264/ (HTTP 200) | 문헌값 |
| x264 -bf 3 9프레임: 패킷 순서 I(pts0,dts−512) P(pts2048,dts0) B B B …, 화면 순서 I B B B P B B B P | measure/results.json decode_order | 실측 |
| MV 1/4 화소, 보간 | FFmpeg n9.0.2 h264qpel.c | 소스 |
| 1920×1080 → 120×68 = 8,160 MB, 1,088줄, SPS pic_width_in_mbs_minus1 119 · pic_height_in_map_units_minus1 67 · frame_crop_bottom_offset 4 | 계산 + measure/h264_auto60_medium.trace.txt | 계산 · 실측 |
| 2-pass 첫 패스 통계 첫 화면 imb:8160 | measure/tp-0.log 2행 | 실측 |
| 4×4 intra 9모드 | FFmpeg h264pred.h 38–46 | 소스 |
| 4×4 정수 코어 변환 Cf, 모두 +1이면 DC 16(정규 직교 DCT 4), 크기 보정은 양자화에 합침 | 계산(Cf·X·Cfᵀ) | 계산값 |
| QP 6마다 간격 2배: 역양자화 << qp/6 | FFmpeg h264_ps.c 639–644, h264data.c 182 quant_div6 | 소스 |
| Baseline은 CABAC 끔; Baseline/Main 제약(8x8, CQM, B, weightp, interlace), High10 bit depth, High 4:0:0 | x264 b35605a common/base.c 761–812 | 소스 |
| High 출력 PPS entropy_coding_mode_flag = 1 | measure/h264_auto60_medium.trace.txt | 실측 |
| 레벨 표(4.0–5.1 MaxMBPS · MaxFS · MaxDpbMbs · MaxBR), High cpb 배율 1250(VCL) | FFmpeg n9.0.2 h264_levels.c 23–64 | 소스(규격 표 A-1 · A-2 옮김) |
| 1080p60 = 489,600 MB/s, 4.1 245,760 < 489,600 ≤ 522,240(4.2), MaxFS 8,704, DPB 34,816/8,160 = 4.27 → 4장, High 4.2 VCL 62,500kbps | 계산 | 계산값 |
| x264 자동 레벨: 1080p60 → 42, 1080p30 → 40, max_num_ref_frames 4; -level 4.1 → 경고 `MB rate (489600) > level limit (245760)` 후 level_idc 41 | measure/results.json h264_headers, *.trace.txt, *.encode.txt | 실측 |
| Apple 1.3a(일부 변형 High 4.1 이하 SHOULD), 1.3b(High 5.2 이하 MUST; macOS 5.0, tvOS 5.1), 1.4(High SHOULD), 1.10(avc1/hvc1 SHOULD) | https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html (개정 2025-06-26, WebFetch 2026-11-13) | 문헌값 |
| avc1 문자열 = profile_idc · constraint 바이트 · level_idc | RFC 6381 3.3 | 문헌값 |
| FFmpeg hls 먹서 CODECS: 1080p60 x264 avc1.64002a, 1080p30 avc1.640028 | measure/results.json h264_headers.hls_* | 실측 |
| NAL 머리 forbidden_zero_bit · nal_ref_idc · nal_unit_type; SPS/PPS/IDR ref_idc 3, AUD/SEI 0 | measure/*.trace.txt | 실측 |
| NAL 종류 번호 1 5 6 7 8 9 12 | FFmpeg h264.h 35–46 | 소스 |
| 첫 패킷 AUD→SPS→PPS→SEI→IDR, 이후 AUD→slice(1) | measure/h264_auto60_medium.trace.txt | 실측 |
| hls.js가 NAL마다 4바이트 길이를 붙여 mdat에 씀 | hls.js 127c6ad src/remux/mp4-remuxer.ts 742–750 | 소스 |
| x264 tune 목록(fastdecode 포함) | x264.h 713 | 소스 |
| VMAF v0.6.1 = 1080p HDTV 3H, 4K 모델 1.5H, 휴대폰 모델 더 높음 | Netflix/vmaf a6ed0f1 resource/doc/models_v0.md | 문헌값 |
| 저해상도 결과는 원본 해상도로 키워 비교, 네이티브 480 점수와 1080 점수 비교 불가 | Netflix/vmaf faq.md 첫 질문 | 문헌값 |
| 사람 판단은 최악 프레임 쪽으로 기움, 풀링 선택지(mean, harmonic_mean, perc 등) | Netflix/vmaf faq.md Issue #20 질문 | 문헌값 |
| FFmpeg 필터는 타임스탬프로 동기화 | Netflix/vmaf resource/doc/ffmpeg.md | 문헌값 |
| mkv 밀리초 타임스탬프로 맞추면 프레임 어긋남 → setpts=N/24/TB | 묶음 3 x264 글 측정 조건과 같은 방법 | 실측(묶음 3) |
| fastfirstpass 기본 1, x264_param_apply_fastfirstpass(ref 1, dia, subme ≤2, trellis 0, 8x8 off) | FFmpeg libx264.c 1254–1255 · 1499, x264 base.c 717–729, measure/tp-0.log 1행 | 소스 · 실측 |
| 1-pass/2-pass 결과 | measure/results.json twopass, measure/twopass_extra.json | 실측 |
| PokeClip 시험 방송 1080p30 x264 veryfast CBR 6Mbps 키프레임 2초 | /posts/0-to-1/pokeclip-obs-shared-encoder-srt/ | 공개 기록 |

버린 것: 「2026-10-29 정정」 상자, 「정리한 노트」 메타 문장, 직교 DCT 값을 H.264 변환처럼 보인 예시(→ 정수 코어 변환 값으로), High = 「가변 양자화」(→ 양자화 스케일링 행렬), High 10 = HDR(→ 10비트 프로파일), 「피처폰 · 호환성 좋음」, `-minrate` CBR 예시(x264 글 실측과 충돌 → 링크), preset · tune · 비트레이트 제어 모드 절(x264 글 몫), 설명용 데이터율 막대 차트, AI 이미지 2장(h264-frame-types-motion, h264-encoding-pipeline).
