# av1-vp9-deep-dive — 근거 메모 (유형: 기술 해설 + 가벼운 로컬 실측)

확인일 2026-11-13. 실측 수행 주체: AI(Claude Code). 사용자 실측 아님. 실측 원자료: measure/.
403 · 접속 차단 페이지는 web.archive.org 보관본을 curl로 받아 본문을 확인했다(보관본 주소를 출처에 병기).

| 주장 | 근거 | 종류 |
|---|---|---|
| Google, On2 인수 마무리 2010-02-19, 약 1억 2,460만 달러 | Google 보도문 재게재 https://www.design-reuse.com/news/22784/google-on2-acquisition.html · Computerworld https://www.computerworld.com/article/1553654/google-closes-on2-acquisition-for-124-6m.html (발표 때보다 약 1,800만 달러 많음, 2009년 발표) | 문헌값(보도문 재게재 · 보도) |
| On2 기술은 Flash Player · Skype 등에 쓰임 | Computerworld 같은 기사 | 보도 |
| 2010-05-19 WebM 발표, VP8을 BSD식 로열티 없는 라이선스로 공개, Vorbis, Matroska 부분집합 | WebM 블로그 「Introducing WebM」 보관본 http://web.archive.org/web/20261102214652/http://blog.webmproject.org/2010/05/introducing-webm-open-web-media-project.html | 1차(보관본) |
| WebM 특허 허락: 무상 · 로열티 없음, 특허 소송을 걸면 종료 | https://www.webmproject.org/license/additional/ | 1차 |
| VP9 profile 0 비트스트림 FINAL 2013-06-12 공지, 2013-06-17 libvpx 기본 활성 | webm-discuss 「VP9 Bitstream finalization update」 https://groups.google.com/a/webmproject.org/g/webm-discuss/c/UzoX7owhwB0/m/I80ENJ7YfZUJ · https://www.webmproject.org/vp9/ · LoC fdd000579 | 1차 · 문헌 |
| VP9 규격 문서 v0.6(2016-03-31 파일명) · 현재 v0.7 초안(2017-02-22), 「not final」 | LoC fdd000579, https://www.webmproject.org/vp9/ | 1차 |
| YouTube 2015-04-06: VP9로 「다른 코덱의 절반 대역」으로 HD/4K, 지난 1년 VP9 250억 시간, 480p→720p | YouTube Engineering 블로그 보관본 http://web.archive.org/web/20220906064407/https://youtube-eng.googleblog.com/2015/04/vp9-faster-better-buffer-free-youtube.html (원문 주소 404) | 회사 주장 |
| Netflix 2016-12-01: 다운로드(Android · iOS)용 AVCHi-Mobile · VP9-Mobile, VP9는 대부분의 Android · Chrome 지원, 1080p 원본 600편에서 VP9-Mobile이 AVCMain 대비 평균 36%(PSNR · VMAF BD-rate), AVCHi-Mobile 15%(PSNR)/19%(VMAF) | https://netflixtechblog.com/more-efficient-mobile-encodes-for-netflix-downloads-625d7b082909 (403) · 보관본 http://web.archive.org/web/20261025063641/… | 회사 주장 |
| Twitch 2018-12-19: FPGA(NGCodec) 실시간 VP9, 1080p60에서 H.264 대비 최소 25% 절감 목표, 프리미엄 e스포츠 채널에 「곧」 | https://blog.twitch.tv/en/2018/12/19/how-v-p9-delivers-value-for-twitch-s-esports-live-streaming-35db26f6322f/ | 회사 주장 |
| NVENC에 VP9 인코더 없음 | NVIDIA 지원 표 https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new (조정자 확인, nvenc 글과 같은 근거) | 1차 |
| caniuse WebM: Safari 14.1(2021-04-26, macOS 11.3+) 전체 지원, iOS Safari 17.4(2024-03-05) | caniuse webm.json(Fyrd/caniuse main, 2026-11-11 커밋) https://caniuse.com/webm | 문헌값 |
| AOMedia 2015-09-01(본문 날짜줄, 게시일 2015-08-28), 창립 Amazon · Cisco · Google · Intel · Microsoft · Mozilla · Netflix, 「open royalty-free video codec」 | https://aomedia.org/press%20releases/alliance-to-deliver-next-generation-open-media-formats/ | 1차 |
| Apple 가입 2018-01(회원 목록 갱신으로 알려짐) | MacRumors 2018-01-04 https://www.macrumors.com/2018/01/04/apple-joins-alliance-for-open-media/ | 2차 |
| 현재 운영위원 12곳(Amazon, Apple, Cisco, Google, Intel, Meta, Microsoft, Mozilla, Netflix, NVIDIA, Samsung, Tencent), Promoter 40곳 | https://aomedia.org/about/members/ (2026-11-13) | 1차 |
| AOMedia 특허 라이선스 1.0: Licensee = 권리를 행사하는 모든 사람 · 단체, 로열티 없음, 조건: 자기 필수 특허도 같은 조건으로 내놓기, 1.3 방어 조항(구현이 필수 특허를 침해한다고 소송하면 그 Licensee의 허락 종료) | https://aomedia.org/license/patent-license/ | 1차 |
| AOMedia 2019-04-08 성명: 제3자 풀 발표는 「AOMedia가 떠나려던 환경」, 회원 · 비회원 모두 로열티 없는 특허 권리, 특허 방어 프로그램 | https://aomedia.org/press%20releases/the-alliance-for-open-media-statement/ | 1차(당사자 입장) |
| AV1 1.0 공개 2018-03-28, 「회원사 독립 시험 평균 30% 압축 향상」(조건 없음) | https://aomedia.org/press%20releases/the-alliance-for-open-media-kickstarts-video-innovation-era-with-av1-release/ | 1차 · 회사 주장 |
| av1-spec 태그 v1.0.0 2018-06-25, v1.0.0-errata1 2019-01-08, PDF 표지 「Version 1.0.0 with Errata 1 … supersedes … 1.0.0」 · libaom v1.0.0-errata1과 대조 | GitHub API AOMediaCodec/av1-spec 태그 · https://aomediacodec.github.io/av1-spec/av1-spec.pdf | 1차 |
| NUM_REF_FRAMES 8, REFS_PER_FRAME 7 | av1-spec 3절 기호 | 1차 |
| 레벨 X.Y: X = 2 + (seq_level_idx >> 2), Y = seq_level_idx & 3 → 05 = 3.1, 08 = 4.0, 09 = 4.1. 레벨 4.0 MaxDisplayRate 70,778,880, 4.1 141,557,760 표본/초 | av1-spec 부록 A | 1차 |
| 1080p30 = 62,208,000, 1080p60 = 124,416,000 표본/초(휘도) | 계산 | 계산값 |
| codecs 문자열 av01.P.LLT.DD…, LL = 첫 seq_level_idx 두 자리, T = M/H | AV1 ISOBMFF 바인딩 v1.3.0(2024-04-03) https://aomediacodec.github.io/av1-isobmff/ | 1차 |
| FFmpeg 9.0.2 hls 먹서가 SVT-AV1 1080p30에 CODECS="av01.0.08M.08", trace_headers seq_level_idx 8, seq_profile 0 | measure/codecs-av1-hls.txt | 실측 |
| Netflix 2025-12-01: 시청의 약 30%가 AV1, AV1 세션은 AVC · HEVC보다 대역 1/3 적음, VMAF +4.3(AVC) · +0.9(HEVC), 재버퍼링 45% 적음, 2021–2025 인증 제출 대형 화면 기기 88% AV1 지원 | https://netflixtechblog.com/av1-now-powering-30-of-netflix-streaming-02f592242d80 (403) · 보관본 http://web.archive.org/web/20261024092619/… | 회사 운영 집계 |
| SVT-AV1: 「Intel and Netflix announced their collaboration … on April 8, 2019」 | Netflix 「Introducing SVT-AV1」(2019-04-17 게시, 403) 보관본 http://web.archive.org/web/20260815115028/… 본문 | 회사 발표. NAB 쇼 발표라는 점은 Intel 1차 문서를 열지 못해 본문에서 뺌 |
| SVT-AV1은 Intel이 Netflix와 시작, 2020-08 AOM SIWG가 채택 | SVT-AV1 README https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/master/README.md | 1차 |
| SVT-AV1 4.2.0 기본: preset 8(-1–13), crf 35(1–70), keyint -2 ≈ 5초, tune 1 = PSNR | Docs/Parameters.md v4.2.0 https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/v4.2.0/Docs/Parameters.md + measure/svt-default-log.txt | 1차 · 실측 |
| Intel media-driver: TGLx(Raptor Lake 포함) AV1 = D, MTLx(Meteor Lake) = D/E, DG2 = D/E | https://github.com/intel/media-driver/blob/master/README.md | 1차 |
| Apple M3(2023-10-30): 「media engine supports AV1 decoding」, 인코딩 언급 없음 | https://www.apple.com/newsroom/2023/10/apple-unveils-m3-m3-pro-and-m3-max-the-most-advanced-chips-for-a-personal-computer/ | 1차 |
| caniuse AV1(2026-11-13): Chrome 70(2018-10-16), Firefox 67(2019-05-21, 65는 Windows 64비트만), Edge 121(2024-01-26), Safari 17 · iOS 17 부분(하드웨어 디코더 기기만) | https://caniuse.com/av1 | 문헌값 |
| caniuse AVIF: Chrome 85(2020-08-25), Firefox 93(2021-10-05), Safari 16.1(2022-10-24, 부분: macOS 13+, 애니메이션 없음), iOS 16.0(2022-09-12), Edge 121(2024-01-26) | https://caniuse.com/avif | 문헌값 |
| AVIF = HEIF에 AV1 이미지 저장, AV1 Image Item = sync 표본과 같은 데이터, avif/avis 브랜드, avio는 인트라 프레임만 | AVIF v1.2.0(2025-10-16) https://aomediacodec.github.io/av1-avif/ | 1차 |
| OBS 32.0.0 services.json: Twitch h264(204–206행), YouTube - RTMPS h264 · hevc · av1(244–248행), AfreecaTV h264(895–897행), CHZZK h264(2590–2592행), vp9 항목 0개 | https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json | 1차 |
| Twitch 2024-01-08: Enhanced Broadcasting 베타, 「HEVC · AV1 실험」 「AV1을 Twitch로 가져오려 함께 작업 중」 | https://blog.twitch.tv/en/2024/01/08/introducing-the-enhanced-broadcasting-beta/ | 1차 |
| Twitch 2026-06-17: 2K는 HEVC, 1080p 이하 AVC, AV1 언급 없음 | https://blog.twitch.tv/en/2026/06/17/introducing-dual-format-and-2k-streaming-on-twitch/ | 1차 |
| Via LA AVC 프로그램 운영 중(2026-11-01 특허 목록 갱신, 스트리밍 요율 표) | https://www.via-la.com/licensing-programs/avc-h-264/ | 1차 |
| Via LA HEVC/VVC 프로그램을 Access Advance가 인수(2025-12-15) | https://www.via-la.com/licensing-programs/hevc-vvc/ (h265 글 담당 확인) | 1차 |
| Sisvel 2019-03-27 VP9 · AV1 두 풀, 창립 JVCKENWOOD · NTT · Orange · Philips · Toshiba IPR Solutions | https://www.sisvel.com/news-events/news/sisvel-announces-the-launch-of-its-video-coding-licensing-platform | 1차 |
| Sisvel AV1 현재 요율: 화면 기기 €0.32(준수 €0.24), 비화면 €0.11(€0.08), 소비자 제품 대상 · 칩셋 제외, 콘텐츠 요율 없음, 라이선서 21곳(ETRI · KBS · SK Telecom 등 포함) | https://www.sisvel.com/licensing-programmes/audio-and-video-coding-decoding/video-coding-platform-av1/ | 1차 |
| Access Advance VDP 2025-01-16: HEVC · VVC · AV1 · VP9 한 로열티, 인터넷 스트리밍 배포사, 사업 규모별 고정 등급(요율은 추후 공개) | https://accessadvance.com/2025/01/16/access-advance-announces-video-distribution-patent-pool-in-response-to-market-demand/ | 1차 |
| AV2 v1.0.0 2026-05-28, 보도문 날짜줄 2026-06-09(게시 2026-06-06), 효율 수치 없음(정성 표현만) | https://av2.aomedia.org/ · http://aomedia.org/press%20releases/Alliance-for-Open-Media-Releases-AV2-Codec/ | 1차 |
| H.266 첫 판 2020-08, 현재 01/2026 | https://www.itu.int/rec/T-REC-H.266 | 1차 |
| H.264 첫 판 05/2003, H.265 첫 판 04/2013 | ITU-T 권고 페이지(h264 · h265 글 담당 확인) | 1차 |

## 확인 못 해 뺀 것

- 「VP10 · Daala · Thor를 합쳐 AV1」: AOMedia 1차 문서에서 확인 못 함 → 삭제.
- AV2 「AV1보다 30%」: AV2 보도문 · 규격 사이트에 수치 없음 → 삭제(보도문은 정성 표현만).
- Sisvel 2020 「시청자 기기당 $0.05」, 「법적 분쟁 없음」: 근거 없음 → 삭제. 현재 요율표로 대체.
- Avanci Video: 1차 확인 안 함 → 쓰지 않음.
- Twitch AV1 베타 수치(50%, 도달률 60%): 근거 없음 → 삭제.
- YouTube 「라이선스 비용 수천만 달러」, VP9 · AV1 압축률 표 · 별점 · 보급률 · 디코딩 부하 표 · 서비스 현황 표 · 「치지직 = AV1 불필요」 · nginx 예시 · AVIF 「JPEG보다 50%」: 근거 없음 · 의견 → 삭제.
- 「Intel 13세대 av1_qsv」 「Apple M3 av1_videotoolbox」: 틀림(디코딩만) → 정정.
- 「av01.0.05M.08 = 레벨 4.0」: 틀림(05 = 3.1) → 정정.
- 「회원끼리만 무료」 「Hulu」: 틀림 → 정정(비회원 포함, 창립사 목록).
- 「H.264 라이선스 만료」: 틀림(Via LA AVC 운영 중) → 정정.
