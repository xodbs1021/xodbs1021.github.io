# ffmpeg-deep-dive — 근거 메모 (유형: 기술 해설 + 로컬 실측)

확인일 2026-11-13. 실측 원자료: measure/ (a1 옵션 덮어쓰기, a2 -ss, a3 split CPU 시간). 수행 주체: AI(Claude Code). 사용자는 FFmpeg 라이브 트랜스코딩 운영 경험을 주장하지 않음 — 1인칭 운영 서술 없음.

| 주장 | 근거 | 종류 |
|---|---|---|
| libav* 구성(libavformat · libavcodec · libavfilter · libswscale · libswresample), ffmpeg · ffprobe · ffplay | https://ffmpeg.org/documentation.html | 문헌값 |
| OBS 32.0.0 SRT · RIST 출력은 libavformat mpegts 먹서 | obs-studio 32.0.0 plugins/obs-ffmpeg/obs-ffmpeg-mpegts.c L622–632 (av_guess_format("mpegts")) | 소스 |
| 다섯 단계, Streamcopy가 디코딩 · 인코딩 건너뜀 | ffmpeg.html Detailed description · Streamcopy | 문헌값 |
| 필터 + copy 오류 문구 | FFmpeg 9.0.2 실행 출력 | 실측 |
| -ss: 인코딩은 accurate_seek(기본 켬)로 정확, copy · noaccurate_seek면 앞 구간 보존, 출력 옵션이면 디코딩 후 버림 | ffmpeg.html Main options -ss; fftools/ffmpeg_opt.c L146 o->accurate_seek = 1 | 문헌값 · 소스 |
| -ss 네 경우 첫 프레임 3.300/3.300/2.000/4.000초, 프레임 60/60/99/39, mp4 편집 목록 | measure/a2-seek.txt | 실측 |
| 옵션은 다음 파일 하나에 걸리고 반복 가능 | ffmpeg.html Description 「As a general rule, options are applied to the next specified file」 | 문헌값 |
| -b:v 반복 → x264 bitrate=600 ×3, 699/657/650kbps, 경고 0; -b:v:N → 3118/1581/650kbps; BANDWIDTH 801,632 vs 3,264,432 · 1,724,336 · 697,856 | measure/a1-option-override.txt | 실측 |
| 두 출력에서 -i 뒤 -t 20은 첫 출력에만 → DASH 출력 끝나지 않아 약 2분 뒤 495파일 | 포크 실행(ffmpeg-hls-dash-muxer 측정 중 첫 시도), 작업 폴더 c1/dash 파일 수 | 실측 |
| 자동 선택: 문서는 최대 해상도 · 최다 채널, 9.0.2 코드는 같은 입력 안 default 표시 +5,000,000점 | ffmpeg.html Automatic stream selection; fftools/ffmpeg_mux_init.c L1683–1685 | 문헌값 · 소스 |
| -map 없이 소리 1채널(default) 하나, -map 0이면 소리 3 | 2초 MKV 시험(측정 조건 절) | 실측 |
| -re = -readrate 1, 라이브 흉내용, 실제 라이브 입력에 낮은 값이면 패킷 손실 가능 | ffmpeg.html Advanced options -readrate · -re (doc/ffmpeg.texi 2368–2382) | 문헌값 |
| -stream_loop -1 반복 RTMP 송출 명령 동작 | 로컬 -listen 1 RTMP 수신으로 8.188초 수신 확인 | 실측 |
| genpts = DTS 있을 때 빠진 PTS 생성 | ffmpeg-formats.html Format Options (doc/formats.texi 46–47) | 문헌값 |
| reset_timestamps는 segment 먹서 옵션, mpegts 출력에선 효과 없음(첫 PTS 1.4 → 1.4) | ffmpeg-formats.html segment; 실행 결과 | 문헌값 · 실측 |
| 재포장 명령 동작, 조각은 키프레임에서만 나뉨 | 6초 시험 파일 실행; hlsenc.c L2490–2491 | 실측 · 소스 |
| PokeClip: ffmpeg -c copy init 12바이트 차이 · 파트 4→2 → Go 재포장, 재포장은 재인코딩 없음, 6트랙 | /posts/0-to-1/pokeclip-go-remux-same-io-benchmark/, pokeclip-live-editing-boundaries, pokeclip-six-track-input-contract | 공개 정본 |
| split CPU 시간 sep 34.50/38.19/39.95, split 29.44/31.09/33.10, decode-only 3.56/3.77/3.60초 | measure/a3-split-cpu.txt | 실측 |
| Twitch 2017: FFmpeg 1-in-N-out 존재 · 더 쌈, 프레임레이트 낮추기 · 자체 메타데이터 등 요구로 자체 트랜스코더, 재포장 변형과 재인코딩 변형 IDR 정렬 보장 없음 | Twitch Blog Part I (2017-10-10, Yueshi Shen 외) — WebFetch로 원문 확인. Part II URL은 2026-11-13 현재 블로그 첫 화면으로 넘어가 인용하지 않음 | 문헌값 |
| -progress 전역, key=value, progress=continue/end; 실행 출력 speed=1.14x(-re) · 6.25x(-re 없음) | ffmpeg.html Advanced options -progress; 실행 | 문헌값 · 실측 |
| readrate_initial_burst 기본 0.5초 | fftools/ffmpeg_demux.c L2298 | 소스 |

## 삭제한 옛 주장
「치지직·Twitch·Netflix 모두 FFmpeg」(Twitch는 2017년 자체 트랜스코더), 「OBS 인코딩은 libavcodec」, 「-ss 위치 10배」 · 「CPU 100% vs 1%」 · 「서버 1대 인제스트 100개」, -ss 앞 = 부정확 표, 「빠른+정확 조합」, -reset_timestamps를 mpegts에 쓰는 예, genpts로 PTS 점프 복구, 셸 줄 이음 뒤 주석, x264 절 전체(→ x264 새 글: preset 차트 · 2-pass 5–10% · zerolatency · CRF · -minrate 필러 · GOP · Level 5.0=4K30 · VMAF 구간), 오디오 절 전체(→ aac-and-friends 링크, channelmap 오용 포함), HLS · ABR · CMAF · Shaka 절(→ 먹서 새 글: hls_time · independent_segments · ALLOW-CACHE · event · var_stream_map -b:v 반복 · 「Netflix 다국어」 · WebVTT 마스터 참조 · CMAF 「비용 절반」 · LL-HLS · mp4 파이프), RTMP 라이브 입력에 -re, speed<1 「표준 알람」, Prometheus 도식, ffprobe · Docker · Kubernetes · jrottenberg 절, §17 면접 답변 절 전체(1인칭 운영 서술 포함), 「2026-10-29 정정」 인용문, 메타 문장, 옛 그림 캡션 없는 Mermaid 5개(legacy-figure-gaps 5).
