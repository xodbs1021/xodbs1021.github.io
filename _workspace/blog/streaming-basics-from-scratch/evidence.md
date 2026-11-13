# streaming-basics-from-scratch 근거 메모

유형: 기술 해설(연재 입구). 저자 역할: 문헌 해설 + AI(Claude Code)가 실행한 바이트 실측. 사용자 경험 서술 없음.
확인 날짜는 모두 2026-11-13(KST), 확인 주체 AI(Claude Code).

| 주장 | 근거 | 종류 |
|---|---|---|
| 1080p30 RGB24 초당 186.624MB · 한 시간 671.8464GB, YUV 4:2:0 초당 93.312MB · 한 시간 335.9232GB, 프레임당 6,220,800 · 3,110,400바이트 | measure/e1-bytes.txt (ffmpeg rawvideo 바이트 수) | 실측 |
| x264 목표 6Mbps → 영상 패킷 평균 6,164.5kbps(초당 0.77MB), TS 파일 초당 0.795MB(약 3.2% 그릇 몫), I 5장 평균 58,138B · 나머지 295장 평균 25,135B | measure/e1-bytes.txt | 실측(testsrc2 합성 입력, 화질 미측정) |
| x264 core 165 r3222 | abr-ladder-design 측정 조건(같은 Homebrew FFmpeg 9.0.2) | 문헌(저장소) |
| Apple: 영상 조각은 IDR로 시작 MUST(7.4), 목표 길이 6초 SHOULD(7.5), 조각 길이 명목 6초(7.6) | https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html (본문 grep) | 문헌값 |
| FFmpeg hls_time: 「시간이 지난 뒤 다음 키프레임에서 자른다」, 기본 2 | https://ffmpeg.org/ffmpeg-formats.html#hls-2 | 문헌값 |
| RFC 8216 6.3.3: ENDLIST 없는 목록은 끝에서 목표 길이 세 배 안쪽 조각에서 시작하지 말 것(SHOULD NOT) | https://www.rfc-editor.org/rfc/rfc8216#section-6.3.3 | 문헌값 |
| RFC 8216 1장: 대규모 HTTP 캐시 기반과 호환, Internet-Draft 2009년 첫 게시 | https://www.rfc-editor.org/rfc/rfc8216#section-1 | 문헌값 |
| TCP는 순서 보장 바이트 흐름(RFC 9293 2.2) | https://www.rfc-editor.org/rfc/rfc9293#section-2.2 | 문헌값 |
| 수신자는 순서 어긋난 조각에 즉시 중복 ACK, 송신자는 중복 ACK 3개로 재전송 타이머를 기다리지 않고 재전송(fast retransmit) | https://www.rfc-editor.org/rfc/rfc5681#section-3.2 | 문헌값 |
| RTO 1초 미만이면 1초로 올림(SHOULD, 2.4) | https://www.rfc-editor.org/rfc/rfc6298 | 문헌값 |
| Linux TCP_RTO_MIN = HZ/5(200ms) | https://github.com/torvalds/linux/blob/v6.18/include/net/tcp.h#L163 | 문헌값(소스) |
| ECMP는 흐름을 정하는 머리 필드의 해시로 다음 홉을 고름(같은 흐름은 보통 같은 경로) | https://www.rfc-editor.org/rfc/rfc2992 1절 | 문헌값 |
| 순서 바뀜은 일부 경로에서 드물지 않음 | RFC 5681 3.2 [Pax97] 인용 문장 | 문헌값 |
| MSS 1460(MTU 1500 − IPv4 20 − TCP 20), 1MB ÷ 1460 ≈ 685 | 계산(RFC 9293 3.7.1 Eff.snd.MSS 식) | 계산 |
| Progressive download도 HTTP Range와 MP4 색인(샘플 표 · chunk offset)으로 탐색 가능 | https://www.rfc-editor.org/rfc/rfc9110#section-14 · https://developer.apple.com/documentation/quicktime-file-format/chunk_offset_atom | 문헌값 |
| 6초 조각 기준 1시간 30분 = 5,400초 = 0번부터 900번째 조각의 시작(옛 글 540번 틀림) | 계산 | 계산 |
| 100만 명 × 6초 × 6Mbps = 4.5TB(옛 글 24TB 틀림) | 계산 | 계산 |
| CloudFront: POP 미스 → 지역 엣지 캐시 → 원본, 원본이 돌려준 객체는 지역 캐시와 POP에 모두 저장 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html#CloudFrontRegionaledgecaches | 문헌값 |
| Origin Shield는 원본 앞 추가 캐시 층 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html | 문헌값 |
| PokeClip 운영 CDN: 라이브 목록 엣지 1초, 조각은 원본 Cache-Control 따르되 최대 3,600초 | content/posts/0-to-1/pokeclip-cdn-cache-auth-measurement.md 100–101행 | 저장소 정본 |
| PokeClip 입력: OBS 플러그인이 본방(RTMP) 인코더를 공유해 SRT(MPEG-TS)를 따로 송출, 오디오는 OBS 6트랙(본방 믹스 1 + 소스별 5) | content/posts/0-to-1/pokeclip-obs-shared-encoder-srt.md · pokeclip-six-track-input-contract.md | 저장소 정본 |
| RTMP도 중계(push · pull)로 팬아웃 가능(옛 글의 「RTMP는 중간 서버 불가」 삭제 근거) | https://github.com/arut/nginx-rtmp-module/wiki/Directives (push · pull) | 문헌값 |

옛 글에서 지운 것: 정정 배너, 1인칭 도입·학습 노트 서술, 「2000년대 초반 유튜브」(근거 없음), 「산업 표준 6초」(→ 애플 권고), 「라우터마다 다른 경로」(→ 흐름 해시), 「다시 보내달라고 요청」(→ 송신자 재전송), 「원본은 딱 한 번」(→ 캐시 층마다 미스), 「HLS가 표준이 된 진짜 이유」 단정, PokeClip 서술(MPEG-TS로 바꾼 이유 · RTMP 단계 분기) → 정본 링크, AI 이미지 7장 참조.
