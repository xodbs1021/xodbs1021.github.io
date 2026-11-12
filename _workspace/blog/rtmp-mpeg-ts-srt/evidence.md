# rtmp-mpeg-ts-srt — 근거 메모 (유형: 기술 해설 + 로컬 실측)

| 주장 | 근거 | 종류 |
|---|---|---|
| TS 패킷 188B, 머리 4B 필드, PID 13비트, 0x0000 PAT · 0x1FFF null, PAT/PMT/PES | ITU-T H.222.0 | 문헌값 |
| FFmpeg 기본 PMT 0x1000 · 트랙 0x100 | 로컬 `ffmpeg -h muxer=mpegts`(9.0.2), ffmpeg-formats | 문헌값 · 로컬 확인 |
| 영상 0x100, 오디오 0x101–0x106, PMT stream_type 0x1B/0x0F, PCR 0x100, 패킷 3,354(영상 2,128 · 오디오 189–190 · PAT 40 · PMT 40 · SDT 8), 동기 오류 0, 0x101→220Hz · 0x106→770Hz | 2026-11-12 로컬 실측(AI 실행, 1회), 조건은 글 「측정 조건」 | 실측 |
| OBS SRT 출력 = mpegts | obs-ffmpeg-mpegts.c 622 | 소스 |
| SRT 라이브 payload 1316 | SRTO_PAYLOADSIZE | 문헌값 |
| PokeClip 6트랙(audio1 본방, 2–6 소스별), 배경음악 빼기, 로그 순서 vs 파일 순서, 재포장만 | six-track · obs-shared · mediamtx · multiaudio 글(정본) | 정본 링크 |

삭제: 「치지직 스트림에서 오디오 분리」, 4트랙 PID 예시(게임·마이크·디스코드·후원), FFmpeg listener 분리 명령(PokeClip 구조와 다름), 「SRT AES 기본」, 「0.5–1초」, AI 생성 이미지 3장(패킷 머리 바이트 배분 오류 등).
