# dash-vs-hls — 근거 메모 (유형: 기술 해설)

확인일 2026-11-12.

| 주장 | 근거 | 종류 |
|---|---|---|
| 3GPP AHS Release 9 2010-03 완료, MPEG N11338 2010-04 드레스덴 | Stockhammer, W3C Web and TV 워크숍 논문(2010) 본문 · 참고문헌 | 문헌값 |
| 2011-11 국가 기관 투표 승인, 98차 회의(2011-12) 발표 | Timmerer 98차 MPEG 보고(공식 보도문 연결), MPEG→IETF 연락문(2011-07, 12월 발행 예상) | 문헌값 |
| 1판 2012-04-03, 6판 2026-07-14 | IEC 웹스토어 114980 판 기록 | 문헌값 |
| DASH-IF 2011 Qualcomm · Netflix · Microsoft · Akamai · Ericsson · Samsung 시작, 2012 정식 출범, 2024-07-23 SVTA 합류 | SVTA 발표문 | 문헌값 |
| MPD 예시 | cmaf-deep-dive 로컬 실측의 FFmpeg 9.0.2 MPD | 실측 |
| 가용 창, MPD 갱신 없이 새 조각, UTCTiming SHALL, minimumUpdatePeriod 유효 기간 | DASH-IF Timing Model 13.3 · 13.6.2 · 시계 절 | 문헌값 |
| SegmentTemplate 계산 코드 | 위 가용 창 정의에서 유도한 설명용 계산 | 설명용 |
| Media3 multi-period 지원, xlink 미지원, 초저지연 CMAF 지원, DRM 방식 | Media3 DASH 문서 | 문헌값 |
| DATERANGE SCTE35-OUT/IN, Interstitials CLASS · X-ASSET-URI/LIST | RFC 8216 4.3.2.7.1, bis-22 부록 D.2 | 문헌값 |
| ContentProtection mp4protection:2011, Widevine · PlayReady 시스템 ID | DASH-IF 식별자 목록 | 문헌값 |
| FPS SAMPLE-AES · com.apple.streamingkeydelivery | Apple 저작 규격 13.2 · 13.3 | 문헌값 |
| AVPlayer는 파일 미디어와 HLS 재생(DASH 언급 없음) | Apple AVPlayer 문서 | 문헌값 |
| hls.js 1.5.0 · dash.js 4.7.3(2023-12-08) ManagedMediaSource | GitHub 릴리스 | 문헌값 |
| Shaka Player HLS · DASH | README | 문헌값 |

삭제: 점유율 60/32와 이미지, 「Apple 견제 30개 기업」, 2012-11 발표, HLS 코덱 「제한적」, MPD 50KB · 10배 · 지연 수치 · 비교표, 「YouTube 광고 때문」, 「CENC 없으면 3번 인코딩」, 「브라우저 네이티브 Safari만/없음」 표, 배터리 · 30~50% · VHS 비유, 치지직 · SOOP, 「Shaka Player는 YouTube가 씀」, AI 이미지 4장.
