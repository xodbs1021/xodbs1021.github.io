# video-quality-bitrate-abr 근거 메모

글 유형: 기술 해설(실측 포함). 제목 「PSNR·SSIM·VMAF는 같은 손상을 서로 다르게 채점합니다」(35자). 확인 날짜는 모두 2026-11-13, 확인 주체 AI(Claude Code).

| 주장 | 근거(URL·파일) | 근거 종류 |
|---|---|---|
| 선명화 0.8/1.5 → VMAF 92.35/97.91/98.76, NEG 89.95/90.61/87.82, PSNR 44.77/42.85/40.56, SSIM 0.995/0.994/0.992, 크기 2,076,667/2,071,052/2,060,653B, 디코딩 뒤 선명화 VMAF 98.03 | measure/v1.txt | 실측 |
| 같은 PSNR: 흐림 σ2.0 40.632dB·SSIM 0.995·VMAF 58.80·NEG 57.98 / qp38 40.739·0.978·80.74·77.86; 120번째 화면 값 | measure/v2.txt, v2-frame120.txt | 실측 |
| 화면별 VMAF 평균 93.42·조화 93.17·하위1% 79.38·최저 77.07(12.79초), <85 91개, <80 13개; 전환 16.5/17.5/23.8/25.9/27.4/28.0초 직후 값 | measure/v3.txt, v3-perframe.csv (전환 직후 값은 csv에서 직접 확인: 16.5→98.7–100, 17.5→97.4, 23.8→84–86, 25.9→96–100, 27.4→86–98, 28.0→97.4) | 실측 |
| 540p 1,000k 81.37(휴대폰 94.93), 720p 1,600k 89.76, 1080p 1,600k 92.31(휴대폰 99.60) | measure/v4.txt | 실측 |
| 60/60 91.92, 30/30 95.27, 반복 65.79, 무손실 반복 67.83, v1hfr 반복 58.02; 최저 30은 4.1초(60fps 246번째, 30fps 123번째) 화면 | measure/v5.txt, /tmp v5 json에서 확인 | 실측 |
| 기본 모델 1080p HDTV 3H, 4K 1.5H, 휴대폰 모델은 점수 높음, NEG는 끝이 neg인 모델 | https://github.com/Netflix/vmaf/blob/v3.2.1/resource/doc/models_v0.md | 문헌값 |
| v1 2026-06, 휴대폰 5H, HFR 변형은 v0의 높은 프레임률 과소 예측을 줄였지만 지각 효과를 다 담지 못함 | https://github.com/Netflix/vmaf/blob/v3.2.1/resource/doc/models_v1.md | 문헌값 |
| NEG 도입 이유, libaom tune=vmaf가 압축 전 선명화로 이득, 2020-12-07 | https://netflixtechblog.com/toward-a-better-quality-metric-for-the-video-community-7ed94e752a30 (403) → https://web.archive.org/web/20261018133222/… (curl로 원문 확인, datePublished 2020-12-07T20:36:32Z) | 문헌값 |
| SSIM 정의(밝기·대비·구조), Wang·Bovik·Sheikh·Simoncelli, IEEE TIP 13(4) 600–612, 2004 | https://doi.org/10.1109/TIP.2003.819861 (Crossref API) | 문헌값 |
| PPI 27인치 81.6, 6인치 367.2, 4.5배 | √(1920²+1080²)=2202.9 ÷ 인치 | 계산값 |
| YouTube 업로드 1080p 8 → 12Mbps(48–60fps) | https://support.google.com/youtube/answer/1722171 | 문헌값 |
| YouTube 라이브 H.264 1080p30 권장 14Mbps, 1080p60 17Mbps(최소 5·6) | https://support.google.com/youtube/answer/2853702 | 문헌값 |
| 치지직 권장 1080p·60fps·8,000kbps CBR·키프레임 1s·하드웨어 인코더, 원인 x264·키프레임 1s 초과(2024-09-24) | measure/chzzk-official.txt (공지 API 원문), https://game.naver.com/lounge/chzzk/board/detail/4810101 | 문헌값 |
| OBS 33.0.0 CHZZK: h264, keyint 1, bframes 0, max fps 60, max video bitrate 8000, 1920x1080 | https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json#L2292-L2315 | 문헌값 |
| SCORE: 양의 소수, 추상적·상대적 QoE 척도, 높으면 더 바람직(MUST), 하나에 넣으면 모두(SHOULD), 클라이언트는 재생 가능성 거른 뒤 SCORE로(SHOULD) | https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt 4.4.6.2(2622–2648행) · 6.3.1(3941–3945행), 2026-05-01 | 문헌값 |
| hls.js 1.7.4는 SCORE를 Level.score로 읽고 getStartCodecTier에서만 사용 | npm hls.js@1.7.4 src/types/level.ts:203, src/utils/rendition-helper.ts:183 | 소스 |
| BANDWIDTH = 피크 조각 비트레이트 | RFC 8216 4.3.4.2, Apple 9.13 | 문헌값 |
| 변형 간 타임스탬프 일치 MUST, 조각 IDR 시작 MUST | RFC 8216 6.2.4, Apple 저작 규격 7.4 | 문헌값 |
| P.1203(10/17): 1초 단위 영상·오디오 품질 + 초기 로딩 지연 + 멈춤 → 종합, 30초–5분, 5점 ACR, 멈춤 = 재버퍼링 | https://www.itu.int/rec/T-REC-P.1203 (PDF 요약·3.2.10) | 문헌값 |
| BOLA arXiv 1601.06748, MPC SIGCOMM 2015 doi 10.1145/2785956.2787486 | arXiv 200, Crossref | 문헌값 |
| NVIDIA 비교 조건(PSNR뿐) | 저장소 nvenc-gpu-transcoding.md 42행 | 저장소 글 |

삭제한 옛 주장: 치지직 권장 6,000kbps(틀림 → 8,000kbps CBR), 치지직 모바일 정책 · 「대부분 1080p60」 · 4단계 사다리(공식 근거 없음), 60fps 1.5배 일반화(업로드 권장만 1.5배), 「2Mbps면 720p가 더 깨끗」(abr 글 실측과 충돌), x264 CPU 50% · NVENC 1%, BANDWIDTH 예시, AI 생성 화질 비교 그림 6장 참조, 오디오 비율 · PTS · OBS 오프셋 절.

뼈대와 달라진 점: 소제목 「평균 점수는 장면 전환 직후 낮은 화면을 감춥니다」 → 「평균 점수는 어려운 장면의 낮은 화면을 감춥니다」(측정상 최저 구간은 전환 직후가 아니라 결이 많은 클로즈업). id 유지.
