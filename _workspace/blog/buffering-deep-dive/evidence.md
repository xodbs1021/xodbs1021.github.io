# 근거 메모 — buffering-deep-dive

유형: 기술 해설(+ 실측). 수행 주체: 측정 · 소스 대조 모두 AI(Claude Code). 확인 날짜는 모두 2026-11-13.

| 주장 | 근거 URL · 경로 | 근거 종류 |
|---|---|---|
| hls.js 1.7.4 기본값 maxBufferLength 30, maxBufferSize 60MB, liveSyncDurationCount 3, liveMaxLatencyDurationCount Infinity, maxMaxBufferLength 600, abrEwmaFast/Slow 3/9(라이브 · VOD), abrBandWidthFactor 0.95, abrBandWidthUpFactor 0.7 | https://github.com/video-dev/hls.js/blob/v1.7.4/src/config.ts#L456-L513 (npm 1.7.4 사본과 GitHub 태그 파일이 바이트 단위로 같음을 diff로 확인) | 문헌값(소스) |
| 목표 버퍼 = min(max(8×maxBufferSize/비트레이트, maxBufferLength), maxMaxBufferLength) → maxBufferLength는 하한 | base-stream-controller.ts L1480–1492 | 소스 + 실측(vod-mbl30/10에서 둘 다 영상 끝까지 약 51초) |
| maxBufferSize는 문서상 「'Minimum' maximum buffer size」 | docs/API.md L690–694 | 문헌값 |
| 설정은 생성자에 넘김(`new Hls(config)`) | docs/API.md L471, L579 | 문헌값 |
| 추정 대역폭 = 빠른 · 느린 EWMA 중 작은 값, 「adapting down quickly, but up more slowly」 주석 | utils/ewma-bandwidth-estimator.ts L74–83 | 소스 |
| 올라갈 때 abrBandWidthUpFactor 사용 | abr-controller.ts L389, L672–673 | 소스 |
| 「loading too slowly … Time to underbuffer」로 조각 포기 | abr-controller.ts L408–438 + live-mbl30.json 경고 31.065초 | 소스 + 실측 |
| 창 밖 · readyState<4 이거나 maxLatency 뒤처지면 liveSyncPosition으로 이동 | stream-controller.ts L718–740 + live-outage.json 경고 51.17초 | 소스 + 실측 |
| targetLatency: holdBack(LL이면 partHoldBack) 우선, 없으면 liveSyncDurationCount×TD | latency-controller.ts L49–78 | 소스 |
| BUFFER_STALLED_ERROR = 'bufferStalledError', Events에 BUFFER_STALLED 없음, STALL_RESOLVED = 'hlsStallResolved' | errors.ts L84, events.ts L81–82 | 소스 |
| STALL_RESOLVED는 v1.6.0(2025-03-27)에 추가 | https://github.com/video-dev/hls.js/releases/tag/v1.6.0 「Added `Events.STALL_RESOLVED` event (#6941)」 | 문헌값 |
| CMCD: 멈춘 뒤 첫 영상 요청에 bs · su | cmcd-controller.ts L382–390 | 소스 |
| Shaka Player 5.3.4(2026-11-06): rebufferingGoal 0, bufferingGoal 10 | https://github.com/shaka-project/shaka-player/blob/v5.3.4/lib/util/player_configuration.js#L191-L192 | 문헌값(소스) |
| Media3 1.11.1(2026-09-11): DEFAULT_MIN/MAX_BUFFER_MS 50,000, BUFFER_FOR_PLAYBACK 1,000, AFTER_REBUFFER 2,000 | https://github.com/androidx/media/blob/1.11.1/libraries/exoplayer/src/main/java/androidx/media3/exoplayer/DefaultLoadControl.java#L64-L102 | 문헌값(소스) |
| dash.js 5.3.0(2026-11-04 최신): hybridSwitchBufferTime 12, 끄는 문턱 0.5×(6초), 두 규칙 모두 켜졌을 때만 | AbrController.js L1036–1058, Settings.js L1456 | 문헌값(소스) |
| RFC 8216 6.3.4 다시 받기(바뀌면 TD, 그대로면 TD/2, VOD · EVENT+ENDLIST 예외), 6.3.3 3×TD | https://www.rfc-editor.org/rfc/rfc8216 | 문헌값 |
| 빠른 재전송: 중복 ACK 3개 | RFC 5681 3.2 | 문헌값 |
| RTO 1초 미만이면 1초로(SHOULD, 2.4) | RFC 6298 | 문헌값 |
| Linux TCP_RTO_MIN 200ms | https://github.com/torvalds/linux/blob/v6.18/include/net/tcp.h#L163 (streaming-basics evidence에서 확인된 링크 재사용) | 문헌값(소스) |
| TLS 1.3 1-RTT, TLS 1.2 2-RTT → TCP 포함 2·3 RTT | RFC 8446 2절, RFC 5246 7.3절(계산은 TCP 1 RTT 더함) | 문헌값 + 계산 |
| QUIC 결합 핸드셰이크 | RFC 9000 7절 | 문헌값 |
| 연결 이전은 클라이언트만 시작(「Clients are responsible for initiating all migrations」), disable_active_migration | RFC 9000 9절(2677행 부근), 18.2절 | 문헌값 |
| BOLA: 버퍼 기반 | https://arxiv.org/abs/1601.06748 (citation_title 확인, 2016-01-25) | 문헌값 |
| MPC: 처리량과 버퍼 점유를 함께 쓰는 model predictive control | https://doi.org/10.1145/2785956.2787486 (doi·ACM 403) → 보관본 https://web.archive.org/web/20250218053425/https://dl.acm.org/doi/10.1145/2785956.2787486 초록 확인 | 문헌값 |
| Krishnan & Sitaraman IMC 2012: 2,300만 시청 · 670만 시청자, 2초 넘으면 이탈 시작, 1초마다 5.8%, 재버퍼링 영상 길이 1% 이상이면 5.02% 덜 시청 | 저자 공개본 https://people.cs.umass.edu/~ramesh/Site/PUBLICATIONS_files/imc208-krishnan.pdf 초록(33–39행) · 본문 1176행(pdftotext) | 문헌값 |
| CMCD CTA-5004-B: bl(ms, 100ms 반올림 SHOULD), bs(직전 보고 뒤 버퍼 고갈), su(시작 · 탐색 · 버퍼 빈 뒤 회복) | https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html (CTA cdn PDF는 404) | 문헌값 |
| 실측 값 전부 | measure/NOTES.md, *.json, analysis.txt | 실측(AI, 각 1회) |

## 쓰지 않은 것 · 바꾼 것
- CTA-2066(QoE 지표 정의)은 공개 원문을 찾지 못해(CTA 쇼핑 페이지 429) 본문에서 뺐다.
- 치지직 공지(키프레임 1초 초과 시 iOS 버퍼링)는 이 글의 흐름에 필요하지 않아 쓰지 않았다.
- 뼈대 영상 설명의 「멈췄다가」는 1.5Mbps 하락 시험에서 멈춤이 없어 영상에서 뺐고, 멈춤은 끊김 시험(본문 단계 목록)으로만 다뤘다.
- 지운 옛 주장: 버퍼 18~30초 일반화, 「버퍼 길이 = 라이브 지연」 단정, RTT 150ms 최소 300ms, 치지직 HTTP/3 · 자동 점프 · 모바일 60~70% · H.264 유지 이유, 저가폰 HEVC 표, 배터리 휴리스틱, `hls.config = {...}`, `Hls.Events.BUFFER_STALLED`, QoE 「업계 기준」 표, Origin Shield 100→5, Pre-positioning, 가상 A/B, Conviva 링크.
