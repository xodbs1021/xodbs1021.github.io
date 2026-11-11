# evidence — pokeclip-obs-shared-encoder-srt (다시 쓰기, 2026-11-11)

유형: 설계·아키텍처. 코드 근거 develop `825a3dfe`.

## 역할

- 작성자: 인코더 공유 동시 송출(7/20), GOP 2초 플러그인 강제, 송출 규격 고정(8/31), 플러그인 담당 이관(9/26), latency 3초(11/9).
- 팀원: PR #179 구현·9/13 측정, 독 CEF 결정(PR #179 본문 38행).
- AI(Claude Code): PR #493 코드(정본 srt-latency 글 13행).
- 삭제: 「OBS 담당 팀원과 통합 조건·동작을 검토했다」(기록 없음, 사용자 지시).

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| obs-multi-rtmp 0.7.4.3 바탕, 출력 생성·참조·해제만 이식 | obs-plugin/README.md L54, PR #179 본문 22–26 | 공개 |
| 참조 누수 수정(OBS 32 setter가 스스로 참조) | PR #179 본문 53 | 공개 |
| 4초 조각 = GOP 정수배 | constants.hpp L74–75 | 공개 |
| keyint_sec 2, keyint 토큰 제거 | gop-guard.cpp L44–77 | 공개 |
| 치지직 프리셋 keyint 1 → 2 | PR #179 본문 30 | 공개 |
| 시작 순서 SetupStreaming → STREAMING_STARTING → StartStreaming → obs_output_start | PR #179 본문 30(OBS 32.2.1 소스 대조) | 공개(소스 대조) |
| x264_encoder_reconfig가 i_keyint_max 복사 안 함 → encoder_active 거절 | PR #179 본문 30, gop-guard.cpp L54–63 | 소스 대조(관측 아님) |
| 멀티트랙 영상 거절 | gop-guard.cpp L23–28 | 공개 |
| 1080p 경고만 | gop-guard.cpp L84–85, README L17 | 공개 |
| 8/31 고정 범위(해상도·코덱/프로파일·샘플레이트/채널·트랙 수) | 팀 결정 로그 8/31(비공개) | 비공개 결정 |
| 동기화·종료 | plugin-main.cpp L633–663 | 공개 |
| passphrase 별도 필드, URL에 비밀 없음, latency 마이크로초 | PR #179 본문 34 | 공개 |
| 브리지 토큰·Host·Origin·16KB·fetch SSE, Qt 폴백 | PR #179 본문 12–14, 38 | 공개 |
| 9/13 send_passphrase=false(REJ_BADSECRET), 기본 api_base http | PR #179 본문 120–128 | 공개 |
| 지금 https 기본(L103–104), send_passphrase true(L175) | README | 공개 |
| PR #392 응답기, 10/25 KST 머지, 머지만으로 동작 불변 | gh pr view 392 | 공개 |
| 9/13 측정 표 | PR #179 본문 71–108 | 공개(팀원 실측) |
| 리뷰 1–3판 OBS 실측 없음 | PR #179 본문 159, 182, 204 | 공개 |
| 11/4 7.66초 조각, TD 6 초과, init 동일, 원인 미확인, PR #492 | round-vod 글 11·28–44행 | 정본 글 |
| MediaMTX recordSegmentDuration = 최소 길이 | mediamtx v1.19.3 mediamtx.yml L558–559 | 공개 |
| latency 1000 → 3000(11/9), 옛 값 이관, 0.2.1 11/10 공개·실송출 없음, 평시 +2초 | constants.hpp L62–75, PR #493, srt-latency 글 11·13·106·121행 | 공개 |
| Windows·치지직 동시 송출, 11월 passphrase 실사용 | 확인 기록 없음 | 미검증 |

B-frame 규약은 언급하지 않음(플러그인이 강제하는 것은 keyint뿐, black-screen 글 78행 정정).
