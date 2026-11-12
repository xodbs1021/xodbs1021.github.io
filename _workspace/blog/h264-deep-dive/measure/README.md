# h264-deep-dive 실측 원자료 (AI(Claude Code) 실행, 2026-11-13)

- 스크립트: 측정은 /tmp 의 measure.py · extra.py 로 돌렸고, 명령은 각 JSON 의 cmd 필드와 글의 「측정 조건」에 있습니다.
- results.json: h264_headers(레벨 · NAL · hls CODECS), decode_order, twopass(1,500k), hevc · compare_choice · svt(다른 글 몫)
- twopass_extra.json: 1-pass 1,400k · 2-pass 1,625k
- encodes.json: CRF 인코딩(x264_medium_crf28 · crf29 등)
- h264_auto60_medium.trace-head.txt: 1080p60 1초 TS 의 trace_headers 앞 1,000줄(첫 두 패킷)
- h264_lvl41_60.encode.txt: -level 4.1 로 1080p60 을 인코딩한 x264 경고
- tp-0.head.log: 2-pass 첫 패스 통계 파일 앞 40줄(첫 줄 = 첫 패스 설정, 둘째 줄 imb:8160)
- load.log: 10초마다 load average(1·5·15분)
