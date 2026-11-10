# evidence — pokeclip-black-screen-three-causes (다시 쓰기, 2026-11-11)

유형: 트러블슈팅(+ 정정). 공개 근거만 링크한다. 비공개 1차 기록은 「당일 트러블슈팅 기록(비공개)」으로만 적는다. 소스는 모두 태그·커밋 고정 링크.

## 역할

- 작성자: 조사 종착점을 「서버 응답」이 아니라 데모 화면 실제 재생으로 정함(명료화 문답 Q3, 2026-08-18), OBS 출력을 baseline 프로파일 + 키프레임 2초로 변경(1차 기록 1절 「kty가 …」).
- AI(Claude Code): 로그 진단, 서버 설정 수정(hlsSegmentCount 900→30→900), 플레이어 페이지 재작성(hls.js 셀프호스팅 · 설정 짝), 브라우저 콘솔 확인(1차 기록 3절 「Claude가 브라우저를 직접 열어」).
- 11월 정정: 2026-11-11 AI가 소스 대조. 사용자 확인은 의뢰문 기준(B-frame 정정). GAP · 3a 재해석은 이번 작업에서 새로 찾은 것이라 사용자 확인 대기.
- PR #92: 작성자 계정(xodbs1021)으로 올라가고 머지됨. 누가 실행했는지는 근거 없음 — 본문은 주어 없이 「옮겼고 머지됐습니다」.

## 시각

1차 기록의 시각(07:17–07:24, 07:27, 08:08)에는 시간대 표기가 없다. UTC로 판단 → KST +9.
- 근거: 서버 구성 커밋 3d6c117 = 2026-08-18T04:33Z(13:33 KST), PR #78 머지 04:48Z. 08:08이 KST면 서버 구성보다 앞선다. PR #92 본문 「재생·되감기 … 17:10경」, 고침 커밋 98e5734 = 08:15Z(17:15 KST), 머지 08:19Z(17:19 KST). 기록 파일 mtime 17:13 KST.
- 본문: 16:17–16:24 반복, 16:27 이후 0건, 17:08 복원, 17:10경 재생·되감기, 17:19 머지.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 송출 인증 정상인데 HLS 변환기 반복 종료, `muxer error: unable to extract DTS: too many reordered frames (11)` 07:17–07:24Z | 1차 기록 1절 | 비공개 실측 |
| baseline + 키프레임 2초 뒤 07:27Z 이후 0건, 「송출 B-frame 금지」 규약 | 1차 기록 1절 | 비공개 실측 |
| 당시 원인 설명 「B-frame → LL-HLS 파트(500ms) 분할 시 DTS 계산 불가」 | 1차 기록 1절 · 옛 글 | 철회 대상 |
| MediaMTX 1.19.3 → mediacommon v2.9.2, gohlslib v2.4.1 | mediamtx v1.19.3 go.mod L13 · L16 | 공개 소스 |
| POC 유형 2 또는 !FrameMbsOnly → `return pts, false, nil` | mediacommon v2.9.2 dts_extractor.go L154–156 | 공개 소스 |
| maxReorderedFrames = 10, 넘으면 `too many reordered frames (%d)` | 같은 파일 L10–11, L236–258 | 공개 소스 |
| v2.9.2와 v2.9.5 추출기 파일 동일 | raw 두 판 diff 결과 동일(2026-11-11) | 공개 소스 |
| x264: B-frame 없으면 POC 유형 2 | x264 0480cb05 encoder/set.c L173 | 공개 소스 |
| x264: baseline 프로파일이면 i_bframe = 0 | x264 0480cb05 common/base.c L788–794 | 공개 소스 |
| 8/18 OBS 인코더 종류 · SPS POC 유형 | 기록 없음 | 미확인 → 본문에 미확인 명시 |
| 프레임 12장 제거 → 괄호 안 11–13, 5장 → 교체 없음(복호 오류 조각만) | 2편 본문 19행(재현 · 이슈 #6332) | 공개 글(비공개 실측 요약) |
| 의뢰문은 이 재현을 「1편」으로 적었으나 실제는 2편 | 1편·2편 grep | 보고 대상 |
| 8/18 프레임 손실 여부 | 기록 없음. OBS를 껐다 켠 사실만 기록(1차 기록 2절) | 판정 불가 |
| DTS 추출은 AU마다 writeH264에서, 조각·파트 자르기는 그 뒤 fmp4WriteSample | gohlslib v2.4.1 muxer_segmenter.go L315–318 · L356 · L576–590; mediamtx from_stream.go L193–200; gohlslib muxer.go L505–512 | 공개 소스 |
| 11월 시험 방송은 x264 veryfast, 키프레임 2초 | 2편 측정 조건 | 공개 글 |
| gap.mp4 7개, 401, 1시간 창에 남음 | 1차 기록 2절 | 비공개 실측 |
| hlsSegmentCount 900→30 → GAP 0 → 900 복원 08:08Z | 1차 기록 2절 | 비공개 실측 |
| 재발 방지 = 데모 중 송출 무중단(계획대로) | 1차 기록 2절 | 비공개 |
| LL-HLS muxer가 새로 시작해 첫 조각을 닫을 때 GAP 정확히 7개(「required by iOS LL-HLS」) | gohlslib v2.4.1 muxer_stream.go L809–816, muxer.go L357–361, 목록 항목 muxer_stream.go L546–551 | 공개 소스 (새 발견) |
| 창 계산에 GAP 포함, 넘치면 맨 앞부터 지움 | muxer_stream.go L848–864 | 공개 소스 |
| hlsSegmentCount 바뀌면 HLS 서버 새로 띄움 | mediamtx v1.19.3 internal/core/core.go L948–970(L958) | 공개 소스 (새 발견) |
| 900 복원 뒤 GAP 7개 재생성 | 위 두 소스로 추론 · 복원 뒤 GAP 수 기록 없음 | 추정 |
| hls.js 1.6.16은 GAP 태그 조각을 네트워크 요청 없이 GAP 오류로 처리 | hls.js v1.6.16 src/loader/fragment-loader.ts L71–74 | 공개 소스 (새 발견) |
| 서버 체인 302 → 멀티버리언트 → variant → 조각 200 뒤에도 화면 없음, AI가 브라우저 콘솔로 3b 확정 | 1차 기록 3절 「진단 방법 메모」 | 비공개 |
| 3a 문구 「hls.js 를 불러오지 못했습니다」, 동봉본 로드 실패 · 폴백 파일 미배치 | 1차 기록 3a | 비공개 |
| 3a 해소: hls.js 1.6.16 셀프호스팅, 같은 오리진 /hls.min.js | 1차 기록 3a · PR #92 | 공개 요약 |
| 3b: liveMaxLatencyDurationCount: 1e9만, 생성자 예외, 화면 표시 없이 「연결 중…」 | 1차 기록 3b · PR #92 본문 | 공개 요약 |
| 3b 해소: liveSyncDurationCount: 3 짝 → 즉시 재생 | 1차 기록 3b · PR #92 player.html L36 | 공개 |
| hls.js 1.6.16 mergeConfig: 사용자 설정에 liveSyncDurationCount 없으면 예외 | hls.js v1.6.16 src/config.ts L636–645 | 공개 소스 |
| 생성자가 mergeConfig 호출 | hls.js v1.6.16 src/hls.ts L182 · L188 | 공개 소스 |
| 문서는 「strictly superior」만 적고 기본값 3 | hls.js v1.6.16 docs/API.md liveSyncDurationCount · liveMaxLatencyDurationCount | 공개 문서 |
| 처음 페이지(3d6c117)도 liveMax 1e9만 → 처음부터 예외 | PokeClip-mono 3d6c117 infra/dev-media/player.html L181–185 | 공개 (새 발견) |
| 처음 페이지는 로드 실패와 start() 예외를 같은 catch로 같은 문구 | 같은 파일 L199–208 | 공개 (새 발견) |
| nginx는 /<경로>/hls.min.js를 MediaMTX로 넘김 | 3d6c117 infra/dev-media/nginx.conf | 공개 |
| MediaMTX 1.19.3은 /…/hls.min.js를 인증 전에 200으로 | mediamtx v1.19.3 internal/servers/hls/http_server.go L160–165, 동봉 판 hlsjsdownloader/VERSION = v1.6.16 | 공개 소스 |
| 3a가 진짜 로드 실패였는지 | 가를 수 없음 | 미확인 |
| 조각 4.00000초(키프레임 2초 뒤), 그 전 4.87–6초 | 1차 기록 실측값 표 | 비공개 실측 |
| PART-TARGET 0.5, 되감기 시크바 · 카운터 동작 | 1차 기록 실측값 표 | 비공개 실측 |
| 조각은 설정 길이 지난 뒤 첫 키프레임에서 자름 | gohlslib v2.4.1 muxer_segmenter.go L576–579 | 공개 소스 |
| 서버 드리프트 3파일 → PR #92 2026-08-18T08:19Z develop 머지(커밋 98e5734: .gitignore · RUNBOOK · compose · nginx · player) | gh api | 공개 |
| RUNBOOK 내려받기는 hls.js@1(판 고정 없음) | 98e5734 RUNBOOK.md L226 | 공개 (한계) |
| 데모 설정: lowLatency, 4s, 500ms, 900, hlsAlwaysRemux yes, 이미지 mediamtx:1.19.3 | 98e5734 mediamtx.demo.yml.tmpl L29–34, compose.yml L11 | 공개 |
| 포트폴리오 PDF 10쪽 「baseline·키프레임 2초로 조정 → 반복 오류 소멸」 | static/portfolio/2026-10-15-v2/full.pdf | 고치지 않음, 본문은 관찰과 모순 없음 |

## 공개 금지 확인

Jira 키 · URL, 팀원 이름, 세션 이름, 인스턴스 · SG ID, IP, 내부 도메인, 볼트 경로, ADR 번호, SSM 은 본문 · 그림 · 메모에 쓰지 않는다. PR #92 본문에는 Jira 링크가 있으나 링크만 걸고 인용하지 않는다.
