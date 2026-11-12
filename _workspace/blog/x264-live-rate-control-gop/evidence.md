# x264-live-rate-control-gop — 근거 메모 (유형: 기술 해설 + 로컬 실측)

확인일 2026-11-13. 실측 원자료: measure/ (b1 preset, b2 필러, b3 키프레임, b4 VBV · HLS BANDWIDTH, b5 zerolatency 설정). 실측 수행 주체: AI(Claude Code). 사용자 실측 아님.

| 주장 | 근거 | 종류 |
|---|---|---|
| preset 10종 CPU 시간 6.8–956초, 크기 7,461→2,739–3,210kbps, VMAF 95.8–98.1 | measure/b1-presets.txt | 실측 |
| 느린 preset = 같은 CRF에서 비트레이트 감소, CRF 0–51 기본 23, 17–18 visually lossless, CBR 흉내 = nal-hrd=cbr + minrate/maxrate/bufsize, 쉬운 영상에서 비효율 | https://trac.ffmpeg.org/wiki/Encode/H.264 | 문헌값 |
| zerolatency = lookahead 0, sync_lookahead 0, bframe 0, sliced_threads 1, vfr_input 0, mbtree 0 | x264 b35605a common/base.c 675–683 | 소스 |
| 실제 설정: medium bframes 3 · rc_lookahead 40, veryfast 3 · 10, veryfast+zerolatency 0 · 0 · sliced 1 | measure/b5 | 실측 |
| lookahead 10 · 40프레임 = 30fps 0.33 · 1.33초 | 계산 | 계산값 |
| 치지직 OBS 권장: keyint 1, bframes 0, 1080p, 60fps, 8,000kbps, x264opts tune=zerolatency scenecut=0 | OBS 32.0.0 services.json L2580–2605 | 문헌값 |
| FFmpeg -maxrate/-bufsize → vbv-maxrate/vbv-bufsize | FFmpeg n9.0.2 libx264.c 1117–1118 | 소스 |
| bufsize 750k/6,000k: 1초 창 최대 3,489/5,483, 0.25초 최대 4,316(창 6프레임 기준 4,816은 미끄럼창)/5,605, 2초 구간 최대 3,022/4,543, 버퍼 최저 15.2%/39.7% | measure/b4 | 실측 · 계산값 |
| T초 구간 비트 ≤ maxrate×T + bufsize | VBV 모형(계산) | 계산값 |
| -minrate는 libx264에 전달 안 됨(결과 바이트 동일, libx264.c에 rc_min_rate 0건) | measure/b2, 소스 grep | 실측 · 소스 |
| nal-hrd=cbr: 필러 NAL 297개/300프레임, 3,115kbps; minrate만: 0개, 79kbps | measure/b2 | 실측 |
| nal-hrd 옵션 설명 「requires vbv-bufsize; cbr not allowed in .mp4」 | libx264.c 1546–1550 | 소스 |
| -g 60 / -keyint_min 60: 키프레임 0, 1.3, 2.6, 4.6초; -sc_threshold 0: 0, 2, 4초 | measure/b3 | 실측 |
| keyint_min은 keyint/2+1로 깎임(31) | x264 encoder.c 1111, 출력 SEI keyint_min=31 | 소스 · 실측 |
| Apple 1.13 IDR 2초, 7.5 TD 6초, 7.4 IDR 시작, 1.29 라이브 피크 < 125% BANDWIDTH, 9.14 AVERAGE-BANDWIDTH | Apple HLS 저작 규격(개정 2025-06-26) | 문헌값 |
| BANDWIDTH = 피크 조각 비트레이트(0.5–1.5×TD 연속 조각), 미완성 라이브는 대표 구간 값 SHOULD | RFC 8216 4.3.4.2, 4절 | 문헌값 |
| FFmpeg hls: 라이브 중 BANDWIDTH = 스트림 비트레이트 + 10%, 끝나면 측정 최대 조각 비트레이트 | hlsenc.c 1050–1063, 1485–1494 + measure/b4(3,300,000 → 4,670,672 / 3,112,528) | 소스 · 실측 |
| bufsize ≤ 0.25 × maxrate × D (BANDWIDTH=maxrate 선언, 최악 상한) | 위 VBV 상한식에서 계산 | 계산값 |
| 키프레임 크기 24,875–37,801바이트, 평균 프레임 약 14,300바이트(750k) | measure/b4 pk 파일 | 실측 |
| PokeClip 11월 시험 방송 1080p30 x264 veryfast CBR 6Mbps 키프레임 2초 | /posts/projects/pokeclip-srt-latency-late-retransmission/#측정-조건 | 공개 기록 |
| PokeClip 플러그인이 본방 keyint를 2초로 덮음 | /posts/0-to-1/pokeclip-obs-shared-encoder-srt/ | 공개 기록 |

옛 ffmpeg-deep-dive 7절에서 옮기며 버린 것: 「2-pass 화질 5–10%」(위키 FAQ 「No」), 「-minrate가 진짜 CBR의 핵심」(전달 안 됨), 「-keyint_min으로 GOP 고정」(효과 없음), Level 5.0=4K30(→ 5.1, h264 글 몫), preset 시간 차트(근거 없던 배수), VMAF 구간표, 오디오 절(→ aac 글).
쓰지 않은 것: zerolatency의 화질 손실 폭(재지 않음), 치지직 서버 조각 길이(공개 근거 없음).
