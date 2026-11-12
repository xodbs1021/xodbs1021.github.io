# whip-whep-modern-ingest — 근거 메모 (유형: 기술 해설)

확인일 2026-11-12.

| 주장 | 근거 | 종류 |
|---|---|---|
| RFC 9725 2025-03 Proposed Standard, 저자, 8840·8842 갱신 | datatracker rfc9725, rfc-editor JSON | 문헌값 |
| POST application/sdp, 201 + Location + ETag, sendonly/recvonly, 307·503, 301/302 금지, PATCH trickle 204 · 재시작 200, DELETE, Bearer 필수 구현, 서론의 시그널링 공백 | RFC 9725 1, 4.2, 4.3, 4.7 | 문헌값 |
| 미디어 전 왕복 비교(RTMP 4 / WHIP 4, 새 HTTPS 6) | RTMP 사양 5.2.1·7.3.1, RFC 9725 그림 1, RFC 6347 4.2 | 사양 순서 계산(실측 아님) |
| WHEP draft-05 2026-10-11, IESG 제출·AD 검토, 만료 2027-04-14, 406 역제안 | datatracker draft-ietf-wish-whep | 문헌값 |
| OBS 30.0 WHIP 2023-11-12 | 릴리스 노트 | 문헌값 |
| Cloudflare Stream GA, 과금 2026-10-15, draft-06, 코덱 VP9/VP8/H.264 CBP3.1, WHIP→WHEP 전용 | developers.cloudflare.com/stream/webrtc-beta (2026-10-27 판) | 문헌값 |
| MediaMTX WHIP 경로·코덱 | mediamtx docs/3-publish/03-webrtc.md | 문헌값 |
| FFmpeg WHIP 묶개 2025-05-16 커밋, 로컬 9.0.2 `-h muxer=whip` | GitHub commits, 로컬 확인 | 문헌값 · 로컬 확인 |
| WebRTC 필수 오디오 Opus·G.711 | RFC 7874 | 문헌값 |

삭제: 「1왕복 vs 5왕복」, Twitch 연도별 표, 도입 현황 표(미확인 항목), OvenMediaEngine 설정, WHIP Compatibility Suite, 「10–30배」·「HLS의 1/70」, 하이브리드·호환성 절, AI 생성 인포그래픽 3장.
