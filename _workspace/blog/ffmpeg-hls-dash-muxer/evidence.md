# ffmpeg-hls-dash-muxer — 근거 메모 (유형: 기술 해설 + 로컬 실측, 새 글)

확인일 2026-11-13. 실측 원자료: measure/ (c1-c2 두 출력 대 -hls_playlist, c3 event, c4 hls 옵션). 수행 주체: AI(Claude Code). 규격 설명은 묶음 2 글로 링크.

| 주장 | 근거 | 종류 |
|---|---|---|
| hls_time 기본 2초(2,000,000µs), hls_list_size 기본 5 | hlsenc.c n9.0.2 L3133 · L3135; 형식 문서 hls; 실행(옵션 없이 EXTINF 2.000 × 5) | 소스 · 문헌값 · 실측 |
| 키프레임 패킷에서만 분할 | hlsenc.c L2490–2491 | 소스 |
| Apple 목표 길이 6초 권고 | Apple HLS 저작 규격 7.5 (개정 2025-06-26) | 문헌값 |
| hls_init_time: 목록이 처음 찰 때까지 조각 길이, 실행 결과 1초 × 6 → 3초 → 4초 | hlsenc.c L2961 · L2466–2472; measure/c4 | 소스 · 실측 |
| independent_segments: 영상 있는 목록에 태그 + 판 6, 조각 검사 없음, 문서 「guaranteed to start with a key frame」일 때 쓰라 | hlsenc.c L1578–1580 · L1610–1611; doc/muxers.texi hls flags | 소스 · 문헌값 |
| RFC 정의: 다른 조각 정보 없이 디코딩 | RFC 8216 4.3.5.1 | 문헌값 |
| -g 300 + hls_time 2 → 10초 조각 2개 + 태그, 경고 없음(-loglevel warning) | measure/c4 | 실측 |
| open GOP MKV -c copy → seg_001이 비IDR I(복구 지점 SEI)로 시작, SPS · PPS 없음, 혼자 디코딩 0프레임, 태그 있음 | measure/c4 | 실측 |
| split_by_time과 함께면 끄고 경고 | hlsenc.c L2963–2968 | 소스 |
| ALLOW-CACHE: hls_allow_cache 0/1이면 씀(기본 -1 안 씀), RFC 8216 7절 「removed in protocol version 7」, fMP4면 판 7(L1582–1584) + 태그 함께 들어감(실행) | hlsplaylist.c L117–118; RFC 8216 7; 실행 | 소스 · 문헌값 · 실측 |
| event: PLAYLIST-TYPE:EVENT, list_size 0 강제, 뒤에만 붙음 | hlsenc.c L1117–1118; 문서 「forces hls_list_size to 0」; RFC 8216 4.3.3.5 | 소스 · 문헌값 |
| event 실행: 6.5초 3개 · ENDLIST 없음, 종료 5개 + ENDLIST, list_size 3에도 10개, SIGINT 4 + ENDLIST, SIGKILL 3 · ENDLIST 없음 | measure/c3-event.txt | 실측 |
| var_stream_map · %v · master_pl_name · agroup | 형식 문서 hls var_stream_map | 문헌값 |
| -b:v 반복/지정자 실측 | ffmpeg-deep-dive measure/a1 | 실측 |
| 두 출력: 인코더 2, 바이트 15,117,404(7,558,708 + 7,558,696), CPU 14.78/14.97/14.88초; 한 출력 -hls_playlist: 인코더 1, 7,558,696, CPU 7.95/7.43/7.74초; 같은 조각 cmp 동일 | measure/c1-c2 | 실측 |
| 공유로 줄어드는 건 포장 · 저장 | /posts/tech-blurting/cmaf-deep-dive/ #2 절 | 공개 글 |
| -f mp4 - 오류 「muxer does not support non seekable output」 | 실행 | 실측 |
| Shaka 파이프 예시: mpegts UDP · mkfifo | shaka-packager v3.9.3 docs/source/tutorials/ffmpeg_piping.rst | 문헌값 |
| dash hls_playlist: master.m3u8(hls_master_name) + media_N.m3u8 | 형식 문서 dash; dashenc.c L2262–2263 | 문헌값 · 소스 |
| 산출 목록 발췌, EXT-X-MAP init-stream0.m4s, SegmentTemplate, PROGRAM-DATE-TIME 붙음, media 판 6 · master 판 7 | measure/c1-c2 | 실측 |
| EXT-X-PART 0건, lhls = EXT-X-PREFETCH, ldash · streaming 있음 | hlsenc.c · dashenc.c · hlsplaylist.c 문자열 검색; dashenc.c L2270–2271 · L2285 | 소스 |
| Shaka 「Only LL-DASH is supported. LL-HLS support is yet to come.」 | shaka-packager v3.9.3 low_latency.rst L36 | 문헌값 |

## 옛 ffmpeg-deep-dive에서 이 글로 옮기며 바로잡은 것
hls_time을 「GOP 정렬」로만 설명하던 것(기본값 2초 · 키프레임 분할로), independent_segments가 키프레임을 보장한다는 서술(태그만), EXT-X-ALLOW-CACHE 사용 권장(프로토콜 7에서 삭제), event 「자연 전환」(list_size 0 강제 · 정상 종료 시에만 ENDLIST), var_stream_map 예시의 -b:v 반복(마지막 값만), 「Netflix 다국어」 근거 없음(삭제), WebVTT 마스터 참조(미확인 — 삭제), CMAF 공유 「비용 절반」(두 출력이면 인코딩 두 번), -hls_init_time을 LL-HLS로 설명(첫 조각 길이), FFmpeg LL-HLS 「한계」(파트 없음), ffmpeg -f mp4 - | packager 'in=-'(mp4는 non-seekable 출력 불가).
| 조각이 아닌 MP4는 파이프 불가(mdat 크기 되쓰기), frag_keyframe+empty_moov 조각 MP4는 파이프 가능 | FFmpeg 9.0.2 실측(종료 코드 234 / 0), movenc.c n9.0.2 8241–8247·9000–9010 | 실측·소스 |
리뷰 반영(2026-11-13): MP4 파이프 문장을 「조각이 아닌 MP4만 불가, 조각 MP4는 가능」으로, 원인을 moov가 아니라 mdat 크기 칸 되쓰기로 정정. hls_time 2초 기본값 해석 문장 삭제.
