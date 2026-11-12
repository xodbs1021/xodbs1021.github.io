# srt-broadcaster-protocol — 근거 메모 (유형: 기술 해설)

확인일 2026-11-12. 공개 문서만.

| 주장 | 근거 | 종류 |
|---|---|---|
| 2017-04 NAB 오픈소스 공개 · SRT Alliance, MPL 2.0 | Haivision 보도자료 2017-04-24, Haivision/srt README | 문헌값 |
| draft-sharabayko-srt-01 2021-09-07, 만료, Informational(ISE) | datatracker | 문헌값 |
| NAK·R 플래그, TSBPD, 핸드셰이크 4메시지(유도·결론), 쿠키(주소·포트·1분 시각), KM은 암호화 때만, 연결 방식 2가지 | draft-01 1.2, 3.1, 3.2.1.2, 3.2.5, 4.3, 4.3.1, 4.3.2 | 문헌값 |
| latency 기본 120ms, 큰 값 협상, TLPKTDROP 라이브 기본 켬, passphrase 10–79자, PBKEYLEN, STREAMID 512, PAYLOADSIZE 1316 | Haivision/srt v1.5.3 API-socket-options | 문헌값 |
| 권고 배수: srt-live-transmit 3–4배 / Haivision 손실률별 3·4·6·8…30배 / OBS 2.5배 | 각 문서 | 문헌값 |
| 소켓 그룹 Broadcast·Main/Backup 구현, Balancing 개발 중, ENABLE_BONDING 기본 OFF | socket-groups.md, build-options.md | 문헌값 |
| OBS SRT 출력 = FFmpeg mpegts | obs-ffmpeg-mpegts.c 622 | 소스 |
| URL latency μs, mode 기본 caller, streamid 512 | OBS SRT 가이드, FFmpeg protocols | 문헌값 |
| MediaMTX streamid=publish:<경로> | mediamtx docs/3-publish/02-srt.md (main) | 문헌값 |
| PokeClip 3초 결정 · RTT 10.1초 · 1.5초 급등 3000ms에서 0 | /posts/projects/pokeclip-srt-latency-late-retransmission/ (정본) | 정본 링크 |

삭제: 「개념적 추정치」 차트 2개, 「5단계 핸드셰이크」, 「4가지 모드」, 「표준 2.5배」, 「대역폭 합산」·LiveU, SRS 절, PokeClip 4트랙·분석 목적, 「멀티 오디오 ✅」, 지연 0.1–0.5초.
