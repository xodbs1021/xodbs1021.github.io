# nvenc-gpu-transcoding — 근거 메모 (유형: 기술 해설, 문헌값 + 로컬 FFmpeg 확인)

확인일 2026-11-13. NVIDIA GPU가 없어 NVENC 실측은 없음. 수행 주체: AI(Claude Code). 사용자에게 NVENC 운영 경험이 없으므로 1인칭 · 운영 경험 서술은 쓰지 않음.

| 주장 | 근거 | 종류 |
|---|---|---|
| NVENC = GPU 다이 위 전용 블록, ME · 모드 결정 · MC · 잔차 · 엔트로피 | NVENC 앱 노트 13.1 | 문헌값 |
| 엔진 여러 개면 드라이버가 분배, 표는 엔진당, 합계는 다중 세션일 때만, 단일 세션은 엔진 1개 상한(SFE 예외, SDK 12.0 · Ada HEVC/AV1) | 앱 노트 13.1 | 문헌값 |
| H.264 CBR·LL fps: P1 855/910, P3 600/652, P5 271/291, P7 229/247 (Turing/Ada) | 앱 노트 13.1 표, 조건 1920×1080 4:2:0 8bit, RTX 8000 · RTX 4090, 최고 영상 클럭 1950 · 2415MHz, Windows 11, SDK 13.1 | 문헌값 |
| 910/30 ≈ 30 출력분, 3.7배, 세대 차 6–9% | 위 표로 계산 | 계산값 |
| T4 Turing 7th 1 NVENC 2 NVDEC AV1 no Unrestricted / A10 Ampere 7th 1/2 no / L4 Ada 8th 2/4 yes / A100 NVENC 0 NVDEC 5 / H100 PCIe NVENC 0 NVDEC 7 / RTX 4080 16GB 8th 2/1 yes 세션 12 | 지원 매트릭스 표 파싱(2026-11-13) | 문헌값 |
| 일부 Turing(GTX 1650 · T1000 · T400 · T600 등) 6세대 | 매트릭스 | 문헌값 |
| Turing > x264 fast(Twitch/YouTube 흔한 설정) | NVIDIA Turing Architecture In-Depth, 2018-09-14 | 문헌값(제조사 주장) |
| T4 HQ ≈ libx264 medium tune psnr 같거나 약간 나음, PSNR만, FFmpeg 4.0.2, libx264 4스레드 | NVIDIA 블로그 2019-02-13 | 문헌값(제조사 주장) |
| qualified = 가용 자원 한도, non-qualified = 시스템당 12(모든 비자격 카드 합) | 앱 노트 13.1 | 문헌값 |
| 12 ÷ 3 = 4채널 | 계산 | 계산값 |
| h264_nvenc 옵션(preset p1–p7 기본 p4, tune hq/ll/ull/lossless 기본 hq, rc constqp/vbr/cbr, cq = VBR 품질 목표 0=자동, qp, no-scenecut = lookahead 시, zerolatency, multipass disabled/qres/fullres) | FFmpeg n9.0.2 nvenc_h264.c | 소스 |
| uhq는 hevc · av1만 | nvenc_hevc.c 43 · nvenc_av1.c 43 | 소스 |
| 옛 preset fast→P1, medium→P4, slow→P7+2패스 | nvenc.c 219–221 | 소스 |
| 쓰이지 않은 코덱 옵션은 경고만 하고 진행 | h264_videotoolbox -crf 23 로컬 실행(종료 코드 0) | 실측(로컬) |
| 튜닝 4종 × P1–P7, 저지연 용도 LL/ULL + CBR, LL/ULL에서 P1–P4면 SFE 자동 | NVENC 프로그래밍 가이드 13.0 | 문헌값 |
| cbr_hq 등 7개 rc 값 · -cbr · -2pass 삭제(2026-06-24, n8.0..n9.0) | 커밋 dcf339c413 · 2b054bc9e6, gh compare | 소스 |
| LowLatencyHQ+CBR_LOWDELAY_HQ(1080, Turing/Ampere) → LL · CBR · multipass 2 · P4, CBR_HQ → ULL · CBR · 2 · P4 | 프리셋 이전 안내 13.0 표 2 | 문헌값 |
| multipass 2 = NV_ENC_TWO_PASS_FULL_RESOLUTION | nv-codec-headers nvEncodeAPI.h | 소스 |
| 멀티패스 = 프레임마다 2패스, 1패스보다 느림, qres는 큰 MV, fullres는 통계 | 프로그래밍 가이드 3.8.4 | 문헌값 |
| -hwaccel 디코딩 프레임을 시스템 메모리로 복사하는 경우가 많다 | ffmpeg.texi(n9.0.2) / ffmpeg.html | 문헌값 |
| -hwaccel_output_format cuda = GPU 메모리에 둠, GPU 스케일이면 전송 제거, 예제 명령 | NVIDIA FFmpeg 안내 13.0 | 문헌값 |
| -vsync 삭제(927ffd0930, n9.0) → "Unrecognized option 'vsync'", -fps_mode passthrough 정상 | 커밋 + 로컬 실행 | 소스 + 실측(로컬) |
| lookahead 최대 32, 큐잉 / lookahead ≥ B+1, 10–20 권장 / 저지연 B 끔 · CBR · 작은 VBV · 16ms | 프로그래밍 가이드 8.2, NVIDIA FFmpeg 안내 | 문헌값 |
| 32프레임 = 60fps 0.53초 · 30fps 1.07초, B 3장 = 3프레임 0.1초 | 계산 | 계산값 |
| 치지직 권장 B 0 · keyint 1 | OBS 32.0.0 services.json L2580–2605 | 문헌값 |
| AV1 인코딩: Ada(8세대)부터, T4 · A10 아니오, L4 · RTX 4080 예 | 매트릭스 | 문헌값 |
| RTX 4090 2022-10-12 | NVIDIA GeForce 뉴스 | 문헌값 |
| Intel Arc A380 2022-06-14 중국 출시, 「industry-first hardware AV1 encoding」 | Intel 보도문 PDF | 문헌값(제조사 주장) |
| Raptor Lake(TGLx) AV1 D, DG2 D/E | intel/media-driver README 코덱 표 | 문헌값 |
| Twitch Enhanced Broadcasting 비공개 베타 2024-01-08, AV1은 앞으로 | Twitch 블로그 | 문헌값 |
| 이 맥 FFmpeg 9.0.2 VideoToolbox 인코더 = h264 · hevc · prores | ffmpeg -encoders | 실측(로컬) |
| GPU 사용률 = 커널 실행 시간 비율, 인코더 사용률 = 영상 인코더 사용 시간 비율 | nvidia-smi 문서 | 문헌값 |
| DCGM_FI_DEV_ENC_UTIL 206 Deprecated → _RATIO, dcgm-exporter 기본에 ENC/DEC_UTIL_RATIO | DCGM dcgm_fields.h, dcgm-exporter default-counters.csv | 소스 |

삭제한 옛 주장: 「2026-10-29 정정」 인용문, illustrativeMetrics, 「서버 300대 대 50대」 · 625대 산수, 「같은 GPU에 칩 4개」, 채널 수 · 채널당 $ 차트, 「Turing부터가 진짜」, VMAF 차트와 1/3 비용, cbr_hq · -2pass 명령, -pix_fmt yuv420p를 넣은 GPU 명령, Twitch AV1 베타, QSV 13세대 AV1 인코딩, Twitch Arc 도입, Backblaze, MediaLive 손익분기, MIG 절, HPA를 GPU 사용률로, RI 80%, Spot drain, 1인칭 운영 경험 · 장애 시나리오 · K8s HPA · 멀티 벤더 추상화 절, AI 이미지 3장(nvenc-asic-inside-gpu, nvenc-generation-timeline, hardware-encoder-vendors) 참조.
