# evidence — pokeclip-recording-defect-in-origin (1편)

유형: 트러블슈팅. 2편(SRT 지연 한도·재전송 기제, 지연 기본값 3,000ms 근거)은 아직 없음 — 1편 끝은 링크 없이 한 문장으로 맺었고, 2편 공개 때 링크를 더한다. 비공개 근거는 "볼트 노트(비공개)"로만 적는다.

## 역할

- 작성자: 조사 범위와 고칠 방향 결정(헤드리스 다음 화면 있는 Chrome부터 확인, 원본·키프레임·웹 재현 병렬 진행, 넘기기·다시 붙이기 실험 지시, 지연 3초 결정). 운영 미디어 서버 시스템 로그는 AI의 원격 실행이 자동 모드 분류기에 막혀 작성자가 읽기 전용으로 직접 실행.
- AI(Claude Code 오케스트레이터와 하위 에이전트): 실험 설계·실행·분석, PR 본문 작성.
- 리뷰: Claude Code·Codex 동시.
- 팀원: 구현·측정에 참여 없음.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 11-04 운영 시험 방송 약 2시간, 다시보기에서 7.5분만 보임, 조각 길이가 TARGETDURATION을 넘어 목록이 둘로 갈림, PR #492가 회차 문서 하나 + DISCONTINUITY | https://github.com/3K-PokeClip/PokeClip-mono/pull/492 「Why」 | 공개 |
| PR #492 develop 머지(2026-11-09), 운영 반영 전 | PR #492 merged_at, 사용자 확인(회차 VOD 운영 꺼짐) | 공개 + 사용자 |
| 1620부터 합성 목록에서 Chromium·Chrome 1624+0.52초 굳음, 4배속·1배속·자동 재개 같음, WebKit 42조각 통과 | 볼트 실험 종합(비공개) 1부 4.4절 | 비공개 실측 |
| 끊김 표시 있음·없음 같은 자리(±15ms, 100.049–100.064), 기본 HLS도 PIPELINE_ERROR_DECODE, WebKit 통과 | 볼트 실험 종합 1부 4.4절, PR #492 「별건」 절 | 비공개 실측 + 공개 요약 |
| ffmpeg 1624 오류 세 줄(co located POCs unavailable ×2, mmco: unref short failure), 1623·1625 0 | 볼트 실험 종합 1부 4.4절·2부 3절 | 비공개 실측 |
| 화면 있는 Chrome 157, VideoToolbox, 6/6, +0.39–0.40초, 헤드리스도 VideoToolbox | 볼트 실험 종합 2부 2절·5절 | 비공개 실측 |
| ②/③ 프레임 120/172/120, 오류 줄 0/3/0 같음, framemd5 172/172, avcC 같음, 크기 4.91/4.42MB, 트랙 수(② 영상1+AAC6, ③ 영상1+소리1) | 볼트 실험 종합 2부 3절 | 비공개 실측 |
| 결함은 녹화 원본에 이미 있음 | PR #492 「별건」 절, PR #493 「Why」 | 공개 |
| 훑기: 1,734 / 240조각, 교체 12/0, 길이 이상 155/0, 이상 중 오류 21, 정상 표본 0/38·0/24, 교체마다 2.03–2.46초 미녹화, 교체 직전 11/12 오류, 교체 첫 조각 0/12, 별개 10건(1624 포함), 오류 문구 | 볼트 실험 종합 2부 4절, record(비공개) 290행대 | 비공개 실측 |
| 1624는 교체(1623) 직후 둘째 조각, 172프레임·약 6초 | 볼트 실험 종합 2부 4.1절 | 비공개 실측 |
| 10건이 기준 10 이하 결손인지 | 볼트 실험 종합 2부 4.3절 「추정」 | 추정(본문에 추정 표기) |
| 시스템 로그(11-02부터 보존): drift·too late·discard 0, `[recorder] too many reordered frames (11–15)` 12건, 11-04 12:26–14:09 KST | 볼트 실험 종합 2부 7절(작성자 실행 결과) | 비공개 실측 |
| 처음 추정(시계 어긋남 리셋, 5초)은 틀림 | 볼트 실험 종합 2부 4.3·7절, mediamtx v1.21.1 recorder.go `ntpDriftTolerance` | 비공개 + 공개 소스 |
| DTS 추출기 `maxReorderedFrames = 10`, POC 기대값 | https://github.com/bluenviron/mediacommon/blob/v2.9.5/pkg/codecs/h264/dts_extractor.go | 공개 소스 |
| 우리 MediaMTX = v1.21.1 기반 판, mediacommon v2.9.5 고정 | 볼트 실험 종합 2부 7절 | 비공개 |
| 상류 열린 PR: mediacommon #394(프레임 손실 DTS 추출 고침), mediamtx #5714(추출 실패에서 회복) | GitHub(2026-11-11 확인, open) | 공개 |
| 녹화기 인스턴스 종료 뒤 2초 대기 후 재시작 | https://github.com/bluenviron/mediamtx/blob/v1.21.1/internal/recorder/recorder.go#L89-L104 | 공개 소스 |
| 지난 글의 같은 문구 = B-frame·LL-HLS 분할 HLS muxer 경로 | /posts/0-to-1/pokeclip-black-screen-three-causes/ 19–21행 | 공개 글(사용자 결정 ①: 그 글은 고치지 않음) |
| 웹 훅은 hls.js ERROR에서만 복구, `<video>` error는 Safari 갈래만 | 볼트 실험 종합 2부 5절 | 비공개(코드 판독) |
| 웹 재현 7/7(창 3·헤드리스 4) +0.39–0.41초, code 3, hls.js ERROR 0(무관한 비치명 networkError/aborted 제외), 재생 누르면 playing인데 프레임 그대로, WebKit 통과 | 볼트 실험 종합 2부 5절 | 비공개 실측 |
| A 0/12, B1 0/4(오류 4, 약 350ms 간격, 상한 3 → 덮개), B2 4/4(오류 1, 60–215ms 재개, 5.39–5.54초 건너뜀, 15초 +14.7–14.8초, 1627 통과), B3 0/4(1ms 뒤 내부 startLoad 덮어씀) | 볼트 실험 종합 2부 6절, 실험 원자료 요약 jsonl(비공개) | 비공개 실측 |
| hls.js 1.7.3에 다음 키프레임·조각 건너뛰기 API 없음(dist 검색) | 볼트 실험 종합 2부 6.2절 | 비공개(소스 검색) |
| recoverMediaError = MediaSource 재설정 + 마지막 재생 위치에서 재시작, 예제가 video error의 MEDIA_ERR_DECODE를 들음 | https://github.com/video-dev/hls.js/blob/v1.7.3/docs/API.md#hlsrecovermediaerror | 공개 문서 |
| B2 순서 의존(1.7.3 실측) | 볼트 실험 종합 2부 6절 덧 ① | 비공개 실측 |
| 운영 경로 시험 방송 3번에서 같은 오류 재현, 기제 요약, 11-04 같은 기제 판정 불가 | PR #493 「Why」 | 공개 |
| 플러그인 SRT 지연 기본값 1000 → 3000, develop 머지, 미배포 | PR #493, 사용자 결정 ④ | 공개 + 사용자 |

## 시각 자료

- 그림 1(Mermaid TB, 개념도): 영상 경로와 가설 기각 자리. 녹화 원본 노드만 강조(색 + 「결함이 이미 있음」 글자).
- 그림 2(Remotion `DecodeRecovery`, 개념도, 12초 반복, 휴대폰판): 세 처리(그대로·B1·B2). 조각 시작·오류 자리는 실험의 hls.js 조각 시작(초)을 비례해 그림. 3줄 끝 위치(47.45초)는 설명용.
- 표 셋: ②/③ 대조, 원본 훑기, 웹 갈래. 수치 범주가 서로 달라(개수·비율·상태) 그래프보다 표가 정확한 값 조회에 맞다고 판단.
- 생성 이미지·화면 캡처 없음(운영 영상 캡처는 지웠음).

## 넣지 않은 것

스트림·세션 ID, IP·주소, AWS 자원 이름·계정, 운영 상자 이름·호스트·포트, 객체 저장소 키 꼴, 조각 해시·이미지 digest, Jira 키·URL, 팀원 이름, 세션 이름, 내부 파일 이름(앱 훅 파일 이름 포함), 개인 환경 정황(무선 채널·앱 이름), 시험 방송 원인별 분류(2편 범위).
