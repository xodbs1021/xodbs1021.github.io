# opus-deep-dive 근거 메모

유형: 기술 해설. 실측 수행: AI(Claude Code), 2026-11-13 14:20–14:50 KST, MacBook Air M5, FFmpeg 9.0.2, libopus 1.6.1, Chrome 157. 원자료는 `measure/`.

| 주장 | 근거 | 종류 |
|---|---|---|
| RFC 6716(2012-09), SILK 비호환 개조, CELT, 대역표, 프레임 2.5–60 · 패킷 120ms, 20ms 권장, SILK 5ms+1.5ms, CELT 2.5ms, 하이브리드 8kHz 경계, 지연 5–65.2ms, FEC 2.1.7, DTX 400ms 2.1.9, LBRR 4.2, 표 2 | rfc6716 | 문헌값 |
| RFC 8251(2017-10) 참조 디코더 수정 | rfc8251 | 문헌값 |
| RFC 7587: rtpmap 48000/2 MUST, ptime 20 · maxptime 120 기본, usedtx 기본 0, useinbandfec 기본 0, maxaveragebitrate 수신 전용 · 6000–510000, CN은 디코더 은폐 · RFC 3389 비권장, 연속 전송 권장, 권장 비트레이트 | rfc7587 | 문헌값 |
| RFC 7874: Opus · G.711 필수, Opus에 RFC 3389 CN NOT RECOMMENDED | rfc7874 | 문헌값 |
| RFC 7845(2016-04) Ogg, pre-skip, audio/ogg, .opus | rfc7845 | 문헌값 |
| libopus 1.6.1(2026-01-14), 1.6(2025-12-15), 1.5(2024-03-04) ML 기능 기본 꺼짐 · DRED 최대 1초 · 12–32kb/s | opus-codec.org 다운로드 · 1.5 소개 | 문헌값 |
| Xiph · Broadcom · Microsoft 로열티 없는 허락 | opus-codec.org/license | 문헌값 |
| Vectis 풀 2023-01-16, 300건+ · 17 패밀리, 하드웨어 대상, €0.15 · 상한 €15M · 초기 €0.10 | vectis.com 발표 | 문헌값 |
| Discord: Opus 2ch 48kHz, 0xF8 0xFF 0xFE 다섯 번 | docs.discord.com voice-connections | 문헌값 |
| webrtc-stats(CRD 2025-09-25): packetsLost 누적 · 음수 가능, fecPacketsReceived 인밴드 포함 가능, concealedSamples | w3.org/TR/webrtc-stats | 문헌값 |
| opusenc --expect-loss | opus-codec.org opusenc 설명서 | 문헌값 |
| FFmpeg libopus 옵션 기본값, opus 인코더 실험 | ffmpeg -h encoder=libopus, libopusenc.c 562–569 | 문헌값 · 실측 |
| 비트레이트별 모드 비율, 32k voip 구간, FEC 시 CELT 0 · 30.6kbps | measure/opus_modes.txt, opus_misc.txt | 실측 |
| FEC 문턱: libopus는 FEC && 손실률 > (128−voice_est)>>4 일 때만 SILK 계열(opus_encoder.c v1.6.1 1515–1518). 손실률 1·3·5·8·9·10% → CELT 2,155·2,150·2,132·107·0·0 | measure/fec_packet_loss_sweep.txt, 독립 리뷰 지적 후 재측정 | 실측 · 문헌값 |
| lookahead = Fs/400 + Fs/250(opus_encoder.c 313, 3082–3090), DTX 패킷 ≤2바이트 미전송(opus.h 145) | libopus v1.6.1 소스 | 문헌값 |
| pre-skip 312(기본) · 120(lowdelay), 프레임 길이별 패킷 표본 | measure/opus_misc.txt | 실측 |
| DTX 3B 180개 → 1B 172 + 3B 8(0.42초 간격) | measure/dtx.txt | 실측 |
| Chrome 157 기본 SDP, getStats 코드 결과 32.6kbps | measure/chrome_probe.json, stats_probe.json | 실측 |
| HLS fMP4 Opus CODECS="opus" | measure/opus_misc.txt, codecstring.c 43 | 실측 · 문헌값 |
| caniuse Opus | Fyrd/caniuse opus.json(2026-11-13) | 문헌값 |

정정(옛 글 대비): 일화 · IETF 합병 단순화 · 완전 무료 · 비트레이트 구간 표 · AAC 최고 320k/지연 100ms/풀대역 24kHz · FEC 자동 · --packet-loss · DTX 수치 · WebRTC DTX 기본 · 오버헤드 차트(설명용) · 표준 SDP fmtp · 6k 자동 · 서비스 표 · 치지직 AAC만 · -packet_loss로 FEC 자동 · WebM 표준 그릇 · HLS 반드시 AAC 과장 · getStats 코드 오류 · Whisper 절 · 면접 절.
