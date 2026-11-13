# aac-and-friends 근거 메모

유형: 기술 해설. 실측 수행: AI(Claude Code), 2026-11-13 14:15–14:45 KST, MacBook Air M5(팬 없음), FFmpeg 9.0.2, libopus 1.6.1, Chrome 157.0.8103.51. 원자료는 `measure/`.

| 주장 | 근거 | 종류 |
|---|---|---|
| AAC 첫 규격 ISO/IEC 13818-7:1997(1판, 1997-12) | ISO 페이지 보관본 web.archive.org/web/20261022120829 | 문헌값 |
| 현행 ISO/IEC 14496-3:2019(5판, 2019-12), Amd 1 개발 중 | ISO 페이지 보관본 web.archive.org/web/20261106083505 | 문헌값 |
| H.264 첫 판 05/2003 | itu.int/rec/T-REC-H.264 | 문헌값 |
| MP3 Technicolor 프로그램 2017-04-23 종료 | Fraunhofer IIS mp3 페이지 | 문헌값 |
| Via LA AAC: 기기 대당 요율(첫 50만 대 $0.98), 5년, 비트스트림 배포 무료, xHE-AAC 추가 비용 없음 | via-la.com/licensing-programs/aac/ FAQ | 문헌값 |
| Apple 2.3 · 2.4 · 2.5 · 2.6 · 2.9 · 2.24 · 2.25 · 2.26 · 8.16, 부록 코덱 문자열, USAC = xHE-AAC | Apple HLS Authoring Spec(개정 2025-06-26) | 문헌값 |
| 묶음 오디오 AAC는 ADTS | RFC 8216 3.4 | 문헌값 |
| mp4a = 표본 항목, 40 = OTI 16진, 셋째 = AOT 10진 | RFC 6381 3.3 | 문헌값 |
| WebRTC 필수 Opus · G.711 | RFC 7874 | 문헌값 |
| FLAC RFC 9639(2024-12) | rfc-editor | 문헌값 |
| R128 −23 LUFS, 라이브 ±1.0 LU, −1 dBTP, V5 2023-11 | tech.ebu.ch/docs/r/r128.pdf | 문헌값 |
| 한국 −24 LKFS ±2dB, BS.1770-3 측정 | crms.go.kr(자동 접속 400, 보관본 없음) | 문헌값 |
| Spotify −14 LUFS, 재생 시 적용, 1dB 여유 | support.spotify.com 페이지 | 문헌값 |
| BS.1770-5(11/2023) 현행 | itu.int/rec/R-REC-BS.1770 | 문헌값 |
| YouTube 라이브 스테레오 44.1kHz · 128kbps, 5.1 48kHz · 384kbps | support.google.com/youtube/answer/2853702 | 문헌값 |
| OBS 33.0.0: CHZZK 오디오 192(2309행), YouTube RTMPS 160(138행), Twitch 320(69행) | services.json 33.0.0 | 문헌값 |
| 위키 FAQ 순위(9.1 기준), -q:a 0.1–2 실험, aac_at -q:a 0–14, 프로파일 숫자만(티켓 9574) | trac.ffmpeg.org 보관본 20261029055502(2026-07-13 수정판) | 문헌값 |
| 최신 FFmpeg 9.0.2, n9.1-dev 태그만 | ffmpeg.org/download.html, git ls-remote | 문헌값 |
| libfdk_aac nonfree 목록, GPL 빌드는 --enable-nonfree → unredistributable | configure n9.0.2 2045–2048, 4833–4840 | 문헌값 |
| libfaac 3.2에서 제거 | Changelog n9.0.2 | 문헌값 |
| loudnorm 기본 I −24 · LRA 7 · TP −2, 동적 192kHz, 선형 조건 | af_loudnorm.c 107–112, 740–753, 815–825 | 문헌값 |
| 패킷 길이 · 앞 표본(LC 1,024/1,024, aac_at 1,024/2,112, HE 2,048/2,112, LD 512/568·512, ELD 512/312·256, libopus 960/312) | measure/aac_results.txt, ld_eld_priming_by_bitrate.txt | 실측 |
| HE ASC 13 10 56 E5 98, HEv2 13 08 56 E5 9D 48 80 | measure/asc_bytes.txt | 실측 |
| ADTS 첫 머리 FF F1 4C 80 23 9F FC, HE TS의 ADTS FF F1 58 80 … | 재측정 명령은 본문 측정 조건 | 실측 |
| ADTS로 풀면 표본 1,024개 많음(2,493,440 대 2,492,416) | 같은 실행 | 실측 |
| -q:a별 평균 kbps | measure/aac_results.txt | 실측 |
| loudnorm 1회 · 2회 결과, 순간 라우드니스 | measure/loudnorm.txt, momentary_*.txt | 실측 |
| Chrome 157 isTypeSupported · decodingInfo | codec-decision-and-debugging/measure/chrome_probe.json | 실측 |
| PokeClip 6트랙 · audio1–6 · 48kHz AAC 6개 · −14 LUFS 렌더 | 0-to-1 정본 글 세 편(링크) | 정본 인용 |

정정(옛 글 대비): CD 압축비 · MP3 대비 % · H.264와 AAC 세트 표준화 · AAC 라이선스 만료 · HLS AAC 의무(RFC) · 인코더 순위 · PEAQ 차트 2개 · 48kHz HLS 표준 · 무조건 128k · -q:a 1~9 · LATM=WebRTC · mp4a=AAC · PokeClip 4트랙 · RTMP 멀티오디오 불가 · I=−16 표준 · 플랫폼별 라우드니스 값 · Opus=SILK+Vorbis · AAC 지연 200ms · Zoom Opus · AAC 7.1 불가 · FLAC 50% · 시나리오 비트레이트 표를 지우거나 고침.
