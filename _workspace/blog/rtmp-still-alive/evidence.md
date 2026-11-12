# rtmp-still-alive — 근거 메모 (유형: 기술 해설)

확인일 2026-11-12. 모두 공개 문서 · 소스. 수행: AI(Claude Code)가 문서 · 소스를 읽고 집계.

| 주장 | 근거 | 종류 |
|---|---|---|
| OBS 32.0.0 서비스 84개 중 rtmp 69 · rtmps 6 · 둘 다 6 · https 3, SRT/RIST/WHIP 0 | obs-studio 32.0.0 plugins/rtmp-services/data/services.json 집계 | 문헌값(집계) |
| CHZZK 항목 = rtmp://global-rtmp.lip2.navercorp.com:8080/relay, h264 | 같은 파일 | 문헌값 |
| Flash Player 지원 종료 2020-12-31, 차단 2021-01-12 | adobe.com/products/flashplayer/end-of-life.html | 문헌값 |
| FCS MX 2002-07, 클라이언트 지원은 Flash Player 6 | MacTech 2002-07-09 | 문헌값 |
| RTMP 사양 공개 발표 2009-01-20 | Computerworld 2009-01-20 | 문헌값 |
| 사양 문서 2012-12-21, 핸드셰이크 1+1536 ×2 + 1536 ×2 = 6,146B, 청크 기본 128B, 메시지 종류 8/9/18/20 | veovera legacy rtmp-v1-0-spec.pdf 5.2, 5.3, 5.4.1, 7.1 | 문헌값 |
| 옛 오디오 메시지에 트랙 번호 없음 | FLV 사양 10.1 E.4.2.1 | 문헌값 |
| E-RTMP v1(2023-03-23 b1, 2023-07-31 승인) HEVC·AV1·VP9 / v2(2026-01-31-r2) 멀티트랙·Opus·FLAC·AC-3 | veovera/enhanced-rtmp v1·v2 문서 | 문헌값 |
| OBS 청크 4096, 버림 700/900ms, 오디오·키프레임 보존, DBR 200ms | rtmp-stream.c 32.0.0 | 소스 |
| 재연결 기본 켬·2초·25회, ×≈1.5, 15분 상한 | OBSBasic.cpp 792–794, obs-output.c 32–33·2976–2983 | 소스 |
| OBS SRT 25.0(2020-03-17), RIST 27.2(2022-02-14), 29.0 암호화 설정, 29.1 E-RTMP(2023-05-02), WHIP 30.0(2023-11-12) | GitHub 릴리스 노트 · published_at | 문헌값 |
| RIST = VSF TR-06-1 (2018-10-17) | static.vsf.tv PDF | 문헌값 |

삭제: 「135ms」 단계 시간(근거 없음), 「9KB」(틀림), 「1996 출생」, 치지직 「30초 뒤 종료」, 「AES 기본 내장」, RTMP 6가지 한계 표, AI 생성 인포그래픽 6장(사실 오류 · 가상의 치지직 주소 포함).
