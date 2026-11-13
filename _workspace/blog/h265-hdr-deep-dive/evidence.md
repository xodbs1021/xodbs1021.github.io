# h265-hdr-deep-dive 근거 메모

유형: 기술 해설(+ 짧은 실험). 확인 날짜는 모두 2026-11-13. 수행 주체: AI(Claude Code). 공개 근거만.

## 규격 · 판

| 주장 | 근거 | 종류 |
|---|---|---|
| ITU-T H.265 첫 판 04/2013, 현재 판 01/2026(11판째, 2026-03-18 갱신) | https://www.itu.int/rec/T-REC-H.265 | 문헌값 |
| BT.2100 -0 07/2016, -1 06/2017, -2 07/2018, -3 02/2025(현행) | https://www.itu.int/rec/R-REC-BT.2100 | 문헌값 |
| PQ EOTF 식과 상수(m1 2610/16384, m2 2523/4096×128, c1 3424/4096, c2 2413/4096×32, c3 2392/4096×32), FD = 10000·Y cd/m² | BT.2100-3 PDF 표 4 (https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.2100-3-202502-I!!PDF-E.pdf) | 문헌값 |
| HLG OETF⁻¹·OOTF(α=LW, γ=1.2 at 1,000cd/m², 무채색이면 FD = LW·E^γ), a=0.17883277, b=0.28466892, c=0.55991073 | 같은 PDF 표 5, 주 5c·5f | 문헌값 |
| HDR 기준 흰색 = PQ·HLG 표시에서 203cd/m² | 같은 PDF 주 10a | 문헌값 |
| ST 2084 게시 2014-08-16, ST 2086 게시 2014-10-13 | https://pub.smpte.org/doc/st2084/20140816-pub/ · https://pub.smpte.org/doc/st2086/20141013-pub/ (doi 10.5594/SMPTE.ST2084.2014 등에서 리다이렉트) | 문헌값 |
| ARIB STD-B67 1.0 2015-07-03, 2.0 2018-01-22(BT.2100 2017-06 개정 반영) | https://www.arib.or.jp/english/std_tr/broadcasting/desc/std-b67.html | 문헌값 |
| SDR 곡선: BT.1886 L = LW·V^2.4(LB=0 가정, LW=100) | ITU-R BT.1886 | 문헌값(가정 명시) |
| HDR10 Media Profile = EOTF ST 2084, 4:2:0, 10비트, BT.2020, 메타데이터 ST 2086 · MaxFALL · MaxCLL | CTA 정의 PDF https://cdn.cta.tech/cta/media/media/membership/pdfs/video-technology-consumer-definitions.pdf | 문헌값 |
| HDR10+는 동적 메타데이터, 로열티 없음, 연 관리비(Source Provider $2,500, Display $10,000, SoC $4,000, 콘텐츠·OS·도구 N/A, 상한 $10,000), 라이브는 프레임별 | https://hdr10plus.org/ | 문헌값 |
| Dolby Vision 프로파일: 5 = 10비트 HEVC(CCID 0), 7 = 10비트 HEVC+EL, 8 = 10비트 HEVC(CCID 1 HDR10 또는 4 HLG), 9 = 8비트 AVC SDR, 10 = 10비트 AV1, 20 = MV-HEVC; CCID 4 = 전달 특성 VUI 18 | https://ott.dolby.com/OnDelKits/Dolby_Vision_Online_Delivery_Kit/v1/Documentation/Specs/Visio_Profiles/help_files/topics/c_dovi_profiles_public.html | 문헌값 |
| 아이폰 12 HDR 녹화 = Dolby Vision 8.4(CCID 4 HLG), HEVC 10비트 | https://developer.apple.com/news/?id=rwbholxw 「Support HDR video playback, editing, and export in your app」. 페이지가 스크립트로 그려져 curl로 본문을 못 읽었고 검색 결과 요약으로 내용 확인 — 본문 링크는 애플 원문 | 문헌값 |
| HLS bis 초안 -22(2026-05-01): VIDEO-RANGE = SDR(TransferCharacteristics 1·6·13·14·15)·HLG(18)·PQ(16), 모르는 값이면 그 변형 고르지 말 것(SHOULD NOT) | https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt | 문헌값 |

## 애플 HLS 저작 규격(개정 2025-06-26)

https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html
- 1.3a H.264 일부 변형 ≤ High 4.1(SHOULD), 1.3b ≤ High 5.2(MUST).
- 1.5 HEVC 그릇은 fMP4(MUST).
- 1.6a HEVC 일부 변형 ≤ Main 10 / 4.0 / Main tier(SHOULD), 1.6b ≤ Main 10 / 5.1 / High tier(MUST).
- 1.9 Dolby Vision = 프로파일 5, 레벨 ≤ 7(MUST). iOS 1.9a = 프로파일 5 또는 10, 레벨 ≤ 9.
- 1.10 매개변수 집합을 표본 설명에 두는 형식(avc1·hvc1·dvh1)을 쓴다(SHOULD), avc3·hev1·dvhe 대신. 부록은 hev1을 「Use not recommended」.
- 9.16 모든 변형이 SDR이 아니면 VIDEO-RANGE 필수.
- 부록 예: hvc1.2.4.L123.B0 = Main 10, normal tier, level 4.1.

## 압축 효율 문헌

Tan 외, 「Video Quality Evaluation Methodology and Verification Testing of HEVC Compression Performance」, IEEE TCSVT 26(1), 2016-01, doi 10.1109/TCSVT.2015.2477916. 본문 PDF https://d-nb.info/1155834798/34 에서 직접 확인(IEEE 페이지는 자동 접속 418).
- 조건: JCT-VC 검증 시험, HM-12.1 Main vs JM-18.5 High, RA 또는 LD, 고정 QP 4점(HEVC 비트레이트 ≈ AVC 절반), 480p·720p·1080p·UHD 20개 시퀀스, 모두 8비트 BT.709.
- 초록: MOS 기준 평균 59%, PSNR 기준 44% 절감, 내용 의존이 큼.
- 표 VIII(같은 기준 비트레이트 범위): UHD MOS 63% / PSNR 47%, 1080p 61/50, 720p 56/42, 480p 57/39, 평균 59/44.
- **정정**: 지시문의 「UHD ~64%·1080p 62%·720p 56%·480p 52%」는 이 논문 표와 다름. 표 VII(MOS 전체 범위)는 UHD 64·1080p 61·720p 56·480p 58. JCTVC-Q1011 원문은 phenix 서버 접속 실패·ITU 보관 404로 직접 확인 못 함 → 글에는 Tan 외 표 VIII 값만 씀.

## 특허 풀

| 주장 | 근거 |
|---|---|
| Via Licensing + MPEG LA → Via Licensing Alliance(2023-05-02) | https://www.via-la.com/via-licensing-and-mpeg-la/ (보도문 GlobeNewswire 2023-05-02) |
| Access Advance가 Via LA HEVC/VVC 프로그램 인수(2025-12-15), 한 관리자 아래 HEVC·VVC 자산 결합, 풀 구조·이행 세부는 보도문에 없음 | https://www.via-la.com/licensing-programs/hevc-vvc/ · https://accessadvance.com/2025/12/15/access-advance-and-via-licensing-alliance-announce-hevc-vvc-program-acquisition/ |
| Access Advance VDP 풀 발표 2025-01-16: 인터넷 스트리밍용 HEVC·VVC·AV1·VP9 한 라이선스, 배포사 규모별 고정 등급, 요율은 발표 뒤 2–3개월 시장 협의 후 공개 예정 | https://accessadvance.com/2025/01/16/access-advance-announces-video-distribution-patent-pool-in-response-to-market-demand/ |
| Velos Media 종료 | 1차 확인 못 함 → 쓰지 않음 |

## 코덱 도구 · 레벨

| 주장 | 근거 |
|---|---|
| HEVC CTB 크기 2^4–2^6(16–64), 최소 CB 8(log2_min_cb_size ≥ 3) | FFmpeg n9.0.2 libavcodec/hevc/hevc.h 130–131행, hevc/ps.c 1442–1663행 |
| HEVC 인트라 35모드(planar 0, DC 1, 각도 2–34) | FFmpeg n9.0.2 libavcodec/hevc/hevcdec.h 125–159행 |
| H.264 4×4·8×8 인트라 9방향 | FFmpeg libavcodec/h264pred.h |
| HEVC 움직임 정보: 병합 모드·AMVP | FFmpeg hevcdec.h 692·696행(ff_hevc_luma_mv_merge_mode / mvp_mode) |
| HEVC 레벨 5.0 MaxLumaSr 267,386,880, 5.1 534,773,760, MaxLumaPs 8,912,896, 4.0 MaxLumaPs 2,228,224 | FFmpeg n9.0.2 libavcodec/h265_profile_level.c 32–37행 |
| 4K60 = 3840×2160×60 = 497,664,000 → 5.1, 4K30 = 248,832,000 → 5.0 | 계산 |
| H.264 4K: 32,400 MB ≤ MaxFS 36,864(5.1·5.2), 4K30 972,000 ≤ 983,040(5.1), 4K60 1,944,000 ≤ 2,073,600(5.2) | FFmpeg n9.0.2 libavcodec/h264_levels.c 44–45행, 계산 |
| FFmpeg mp4 태그 표에서 HEVC는 hev1이 hvc1보다 먼저 → 기본 hev1 | FFmpeg n9.0.2 libavformat/movenc.c 9236–9237행. hvc1이면 hvcC에 array_completeness=1(1645행), 표본에서 매개변수 집합을 거름(7113행) |
| PQ·HLG 전달 특성 번호 16·18(H.273), H.264에도 같은 VUI | FFmpeg n9.0.2 libavutil/pixfmt.h 683·687행. x264 r3222 --fullhelp: --transfer(smpte2084·arib-std-b67), --mastering-display, --cll 있음 |
| FFmpeg tonemap 필터 기본 none, linear·gamma·clip·reinhard·hable·mobius 선택 | `ffmpeg -h filter=tonemap`(9.0.2 로컬) |

## 재생 · 송출

| 주장 | 근거 |
|---|---|
| 브라우저 HEVC: Chrome 107+ 부분(macOS Big Sur+·Android 5+ 전 기기, Windows는 하드웨어, Linux·ChromeOS VAAPI), Edge는 Windows에서 하드웨어 + 스토어 HEVC 확장, Firefox 137+ 하드웨어(일부 소프트웨어), Safari macOS High Sierra+, iOS Safari 11+ | caniuse 데이터 https://github.com/Fyrd/caniuse/blob/main/features-json/hevc.json (2026-11-13 main), 화면 https://caniuse.com/hevc |
| OBS 33.0.0(2026-10-23) services.json: Twitch h264(72–74행), YouTube - RTMPS h264·hevc·av1(112–116행), SOOP h264(676–678행), CHZZK h264(2301–2303행). 32.0.0에서는 SOOP 항목 이름이 AfreecaTV, 값은 같음 | https://github.com/obsproject/obs-studio/blob/33.0.0/plugins/rtmp-services/data/services.json |
| 옛 RTMP·FLV 코덱 번호에 HEVC 없음, E-RTMP v1이 FourCC로 HEVC 신호, OBS 29.1 | 묶음 2 rtmp-still-alive 글의 해당 절(이미 원문 대조됨) |
| BBC 2018 월드컵 iPlayer UHD: HEVC Main 10 레벨 5.1 + HLG, 호스트 피드(비 HLG)를 HLG로 변환해 SDR UHD 수신기 호환 | 2차 보도 Streaming Media, 2018-06-04, Adrian Pennington https://www.streamingmediaglobal.com/Articles/Editorial/Featured-Articles/BBC-Streams-FIFA-World-Cup-in-UHD-HDR-But-Not-to-All-Viewers-125407.aspx. BBC R&D 원문 주소는 찾지 못함(추정 주소 404) |

## 계산

- 4:4:4 → 표본 3/화소, 4:2:2 → 2(67%), 4:2:0 → 1.5(50%).
- PQ 100cd/m² 근처 인접 부호값 간격: 10비트 제한 범위(64–940) 509→510 99.91→101.06(약 1.1%), 8비트(16–235) 127→128 98.78→103.38(약 4.7%).
- PQ/HLG/SDR 곡선 점은 위 식으로 부호값 0.05 간격 계산. PQ 203cd/m² ≈ 0.58, HLG(1,000cd/m² 표시) 203cd/m² ≈ 0.75.

## 실측 (AI, 2026-11-13 06:34–06:52 KST)

원자료: measure/ (results.json, encodes.json, load.log, run.log, hdr10/hlg 첫 프레임 ffprobe, svt 기본 설정 로그, hevc 태그, hls master). 방법: /tmp/tb4w-scripts/measure.py(부모 작업이 실행).
- 입력: Sintel 예고편 1080p sha256 34bbd52a…7931, 20초부터 10초 FFV1(240프레임, 24fps), cropdetect 다수 1920:818.
- 선택(VMAF 평균 ≥ 93인 최대 정수 CRF): x264 medium 28 → 1,799.4kbps, CPU 33.65s, VMAF 93.40 / 하위 1% 81.91, 키프레임 6 / x265 medium 28 → 1,183.9kbps, 78.31s, 94.00 / 83.00, 4 (29는 92.86, 1,055.2kbps) / SVT-AV1 p8 39 → 1,201.3kbps, 28.28s, 93.07 / 77.01, 2 / SVT-AV1 p4 41 → 866.5kbps, 93.15s, 93.19 / 75.44, 2.
- SVT 기본: preset 8, tune PSNR, gop 161, mini-gop 16, CRF 35.
- 부하: 측정 전체 1분 load average 26.28 → 220(끝), 비교 구간 41.29–174.77.
- hev1/hvc1: libx265 mp4 기본 hev1, -tag:v hvc1 → hvc1.
- HDR10: testsrc2(SDR 시험 화면)을 10비트로 바꿔 태그·메타데이터만 붙임. 첫 프레임 side data: Mastering display metadata(R 0.68,0.32 G 0.265,0.69 B 0.15,0.06 WP 0.3127,0.329, max 1000, min 0.0001), Content light level 1000/400.
- HLG: color_transfer arib-std-b67, side data 없음(x265 정보 SEI만).
- FFmpeg hls(fmp4) CODECS: 1080p30 libx265 → hvc1.1.6.L120.90.
- HLG의 SDR 호환: ITU-R BT.2390-12(2025) 6.4절 — BT.2020을 받는 SDR UHDTV 화면에서 HLG는 「a degree of compatibility」, 밝고 채도 높은 곳 색조 변화 가능, BT.709 SDR 화면에는 PQ·HLG 모두 「limited compatibility」. https://www.itu.int/pub/R-REP-BT.2390 (PDF R-REP-BT.2390-12-2025)
