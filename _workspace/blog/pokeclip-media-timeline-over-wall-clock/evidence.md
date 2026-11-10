# evidence — pokeclip-media-timeline-over-wall-clock (2026-11-10 다시 쓰기)

유형: 의사결정(post-types.md). 한 편 유지(사용자 결정 2026-11-10) — 공개 소제목 31개 자리·순서 유지, 기준선은 첫 공개판(2026-11-02)의 31개로 복구.
이 메모는 공개 저장소에 있으므로 공개 근거(URL·PR)만 적는다. 비공개 근거는 「볼트 노트(비공개)」로만 표기하고 파일 이름·경로·커밋은 적지 않는다. 11-02 판의 메모는 git 기록에 있다.

## 역할

- 결정: 김태윤(정밀 좌표 전환·섞기 11-02, 편집기 벽시각 유지·긴 틈 이어 붙임 11-03, 1초 미만 겹침 허용·한 번 당김 999ms 11-03). 볼트 노트(비공개, 결정 기록).
- 설계 개정·계약 초안, 레퍼런스 수집·평가, 프로젝트 실측: AI 에이전트(Claude Code, Codex)가 지시를 받아 수행, 두 AI가 서로 리뷰. 볼트 노트(비공개).
- 구현 PR #468·#470·#472: 작성·머지 계정 xodbs1021(김태윤), AI 에이전트가 구현·검증(gh api로 작성자·머지 계정 확인, 2026-11-10).
- 웹·서비스 코드는 원래 팀원 담당 영역, 이번 변경은 김태윤이 맡기로 함(11-02). 볼트 노트(비공개). 팀원 이름은 글에 넣지 않음.
- 본문: 11-02 판은 Codex 초안, 11-10 다시 쓰기는 Claude Code.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| PDT는 첫 표본에 대응, 정보성 대응(4.4.4.6·6.2.1), 1초 미만 부분 겹침 허용·뒤 조각 우선(6.2.1), 변형 전환은 EXTINF로 대략 위치 후 타임스탬프로 정밀 동기(6.3.4) | https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt (2026-11-10 6.3.4 원문 확인) | 문헌(RFC 아닌 초안) |
| Mux PDT 클립은 조각 단위, 프레임 정확은 자산 오프셋 | https://www.mux.com/docs/guides/create-instant-clips , https://www.mux.com/docs/guides/create-clips-from-your-videos | 문헌 |
| Kinesis 조각별 시각, ALWAYS 권장, ON_DISCONTINUITY 50ms | https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/API_reader_GetHLSStreamingSessionURL.html , …/API_reader_Fragment.html | 문헌 |
| MediaMTX 추정기 5초·미래 재설정·트랙별(847a6ee) | https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/ntpestimator/estimator.go | 공개 소스 |
| OBS 송신 벽시각 메타데이터는 멀티트랙 출력(#11004)과 이후 선택 옵션으로 추가된 MP4 출력에만 | https://github.com/obsproject/obs-studio/pull/11004 및 65c320b46e 소스. 리뷰가 제시한 커밋 2eabfdad55의 날짜는 작성일 2025-01-30·커밋일 2025-08-22로 갈려 본문에 날짜를 적지 않음 | 공개 소스 |
| MediaLive 500ms 재동기는 `ProgramDateTimeClock=SYSTEM_CLOCK` 조건 | https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-medialive-channel-hlsgroupsettings.html | 문헌 |
| DASH-IF 수신 지침의 타임스탬프 잇기는 장애 전환 절 | https://github.com/Dash-Industry-Forum/Ingest/blob/6390878/DASH-IF-Ingest.bs.md | 문헌 |
| Unified Origin은 차이가 있으면 문턱 없이 경계 기록, MediaMTX 재생기는 같은 스트림 연속 번호로 잇기 | https://docs.unified-streaming.com/documentation/live/troubleshooting.html , https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/playback/on_get.go | 문헌·공개 소스 |
| hls.js 598ebdd 조건 `hasVideo && baseOffsetSamples?.ptsMin` | https://github.com/video-dev/hls.js/blob/598ebdd/src/remux/passthrough-remuxer.ts | 공개 소스 |
| mediamtx#5550: 작성자들의 이전 도착 시각만 보는 보정이 지연 증가만으로 약 580ms 옮김(새 방식의 600ms 지연 대조와 별개) | https://github.com/bluenviron/mediamtx/issues/5550#issuecomment-6307819009 (2026-11-10 원문 확인) | 제3자 단일 보고 |
| Cloudflare 오프셋, Twitch VOD 종료 오프셋·길이 | https://developers.cloudflare.com/stream/stream-live/live-instant-clipping/ , https://dev.twitch.tv/docs/api/reference/#create-clip-from-vod | 문헌 |
| 실측 함정 6개(94ms, ±105ms, 0/33.3/66.7ms, 2,575ms, 0.96–0.98배·+5초 4/4, FFmpeg 7.1.5 tpad·약 1.3ms) | 볼트 노트(비공개, 11-02 프로젝트 실측 보고) | 비공개 실측 |
| 편집기 벽시각 유지, 약 0.18초(11-02 웹 갈래 실측 최대 182ms, 상한 아님) 어긋남 수용, 편집기 화면 전환 제외 | 볼트 노트(비공개, 11-03 02:50 결정, 웹 실측) | 결정·비공개 실측 |
| 0.5초 넘는 틈 거절 규칙을 거두고 조각 순서대로 이어 붙여 렌더 | 볼트 노트(비공개, 11-03 02:59 결정) | 결정 |
| 1초 미만 겹침 허용, 한 번 당김 999ms; 문턱 시험값 140ms | 볼트 노트(비공개, 11-03 결정); 문턱 140ms·당김 상한 999ms 상수는 공개 저장소 생산자 작업 브랜치의 섞기 코드 https://github.com/3K-PokeClip/PokeClip-mono/blob/b87d2a98ac/media/internal/index/pdt_mix.go (develop 미머지, 2026-11-10 gh api 확인) | 결정·공개 소스 |
| 겹침 재생 실측 생산자 꼴(변형 A) 1차 117회·2차 245회 멈춤·치명 0, 소리 튐 0(소리 분석은 2차만), 2차 비치명 bufferStalledError 1회, 표시 PDT 역행 = 겹침 폭; 미디어까지 겹친 변형 B는 999ms에서 약 30프레임 덮임·소리 튐(생산자는 만들지 않음); 겹침 적용은 흉내 스크립트; 자연 겹침 x264 0, VT 512·352, VT+B 212·216·250·298.7·308·318ms | 볼트 노트(비공개, 11-03 겹침 재생 실측) | 비공개 실측 |
| 소비자 PR 머지(#468 11-03, #470 11-03, #472 11-03), #475 open, 생산자·렌더·클립 develop 미머지 | https://github.com/3K-PokeClip/PokeClip-mono/pull/468 , /470 , /472 , /475 (2026-11-10 gh api) | 공개 |
| v1.0.0 먼저 출시, 새 시간축은 나중 이미지 교체 | 볼트 노트(비공개, 11-03 결정) | 결정 |
| 장 경계와 재생목록 DISCONTINUITY의 관계는 미확정 | 볼트 노트(비공개, 다음 설계 개정 대기) | 미확정 |

## 그림

- 그림 1 경로(Mermaid, 개념도) · 그림 2 보정식 전후(Mermaid, 개념도, 출처 PR #470) · 그림 3 장 규칙 반복 영상 `ChapterRule`(개념도, 값 설명용) · 그림 4 자연 겹침 그래프(실측, 비공개).
- 11-02 판의 생성 일러스트(`/images/pokeclip-pdt-hero.jpg`)와 51초 영상(`/videos/pokeclip-pdt-chapters.mp4`)은 본문에서 뺐다(장식, 휴대폰 판독 불가, 포스터 148KB, 폐기된 「편집」 장면). — 2026-11-10 사용자 결정으로 저장소에서 삭제(어떤 글도 쓰지 않음, git 기록에는 남음).

## 넣지 않는 것

팀원 이름·GitHub 계정(작성자 계정 제외), 내부 파일 이름·경로, 비공개 작업 공간 커밋, 내부 설계 변수 이름, Jira 키.
