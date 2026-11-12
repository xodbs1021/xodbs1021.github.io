# abr-ladder-design — 근거 메모 (유형: 기술 해설 + 로컬 실측)

확인일 2026-11-13. 실측 원자료: measure/e1-vmaf-grid.csv · e1-vmaf-grid.txt, e2-ladder-command.txt. 실측 수행 주체: AI(Claude Code).

| 주장 | 근거 | 종류 |
|---|---|---|
| Apple 1.25 H.264 9단계(145 · 365 · 730 · 1,100 · 2,000 · 3,000 · 4,500 · 6,000 · 7,800, 해상도 · 프레임레이트), HEVC 12단계(145/160 … 16,800/20,000) | Apple HLS 저작 규격(개정 2025-06-26) | 문헌값 |
| Apple 1.32 기본 변형 2,000kbps(목록의 첫 변형), 7.4 IDR, 8.22 경계 일치(일반 SHOULD, AirPlay 2 TV MUST), 9.13 BANDWIDTH 피크 합, 9.14 AVERAGE-BANDWIDTH, 1.29 125% | 같은 문서 | 문헌값 |
| bpp 열(0.050–0.163) | Apple 표에서 30fps로 계산 | 계산값 |
| 360p 600k bpp 0.109 VMAF 68.5 / 720p 2,500k bpp 0.113 VMAF 93.0 | e1 | 실측 · 계산값 |
| 853 폭 libx264 오류, scale=-2 → 854×480, 1080p SPS 1088 + 크롭 8줄 | e2 | 실측 |
| VMAF 격자 28점, 윗선 540p→720p→1080p, 교차 약 700 · 1,200kbps(보간), 360p 윗선 없음 | e1 | 실측 · 보간 |
| convex hull 정의 · 파레토 효율, 2010년 말 H.264 고정 사다리 맨 위 5,800, 잡음 장면 블록 · 만화 과잉, 「say 7500」, QP 한 JND 간격 시험 인코딩 · 보간 · 껍질 근처 점, BoJack 1,750(480p) → 1,540부터 1080p, OITNB 4,640 · 20%, PSNR 그림, 480p · 720p 상한 기기용 사다리 따로 | Netflix 2015-12-14 per-title(보관본 20241231233219) | 문헌값 |
| Dynamic Optimizer: 장면 분할, 장면별 해상도 · QP 인코딩, VMAF(1920×1080 확대)-비트레이트 껍질, 같은 기울기, VP9 10제목 256kbps 근처 HVMAF 17.1% · PSNR 22.5% | Netflix 2018-03-05(보관본 20241231233211) | 문헌값 |
| shot-based 배포: AVCMain 대비 AVCHi-Opt 절반 미만, VP9-Opt 3분의 1 미만, 20 청크 → 900 장면 | Netflix 2018-03-09(보관본 20241231233216) | 문헌값 |
| 픽셀률 합 225.0백만/초 = 1080p30 3.62배, 1080p 두 단계 55.3%, 아래 네 단계 13.2% | Apple 표 × 30fps 계산 | 계산값(차트 kind 재구성) |
| -b:v:N · -maxrate:v:N · -bufsize:v:N이 스트림마다 갈림(x264 bitrate=6000/3000/2000), 세 변형 키프레임 같은 시각 2초 간격 | e2 | 실측 |
| 라이브는 영상 전체를 미리 볼 수 없어 사다리를 먼저 정함 | 원리(Netflix 방식이 전체 시험 인코딩을 전제) | 판단 |

삭제한 옛 주장: 「2026-10-29 정정」 인용문, illustrativeMetrics, 「이번 글은 … 학습 노트」, 「사다리 4–5단계 산업 표준」, bpp 권장표 · 「bpp 일정하면 같은 화질」, 콘텐츠별 비트레이트 차트 · 발로란트 8000 · 치지직 사다리 · 시청자 화질 분포, 「Apple 표는 치지직 · Twitch 기반」, 「convex hull 산업 표준」, 「수십억 달러」, VMAF 92 임계 · ROI 차트 · Twitch Top10%, 모바일 · 데스크톱 사다리 분리(User-Agent), 「CBR 필요」, 「스토리지 절반」, LL-HLS는 Shaka 필수, CPU vs GPU 비용 차트, 단계 비용 차트(가정), 카테고리별 사다리, 운영 모니터링 · 좀비 감지 · A/B · region failover, 16의 배수 필수, AI 이미지 3장(convex-hull-abr-ladder, per-title-vs-static-encoding, shot-based-encoding-timeline), 옛 차트 8개.
