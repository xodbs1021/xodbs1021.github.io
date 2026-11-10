---
title: "HLS 클립은 왜 벽시각 대신 미디어 시각으로 자를까?"
date: "2026-11-02T22:25:13+09:00"
author: "김태윤"
categories: ["projects"]
draft: false
description: "조각마다 붙인 벽시각(PDT)을 정밀 좌표로 쓰던 설계를 여섯 번 고친 끝에, 클립·렌더의 좌표는 미디어 시각으로 옮기고 학습형 보정은 장 단위 누적과 재설정으로 바꿨습니다. 편집기는 벽시각 컷을 유지했고, 1초 미만 겹침은 999ms까지 당겨 허용합니다."
tags: ["PokeClip", "HLS", "시간축", "PDT", "설계 결정"]
---

PokeClip은 방송 조각마다 수신 서버가 짐작한 벽시각(현실의 날짜·시각)을 붙이고, 그 값을 클립의 자를 자리로도 썼습니다. 이 설계를 여섯 번 고쳤지만 한 결함을 막으면 옆에서 다른 결함이 나왔습니다. 2026년 11월 2일, 클립과 렌더(최종 영상 생성)의 정밀 좌표를 파일 안 위치인 미디어 시각으로 옮기고, 벽시각을 조금씩 따라가던 학습형 보정은 한 구간 안에서 길이를 누적하다 차이가 크면 기준을 다시 잡는 규칙으로 바꿨습니다. 다음 날에는 편집기는 벽시각 컷을 그대로 보내고, 1초 미만 겹침은 최대 999ms 당겨 허용하기로 정했습니다. 소비자 쪽 변경은 머지됐고, 생산자·렌더·클립 쪽은 아직 머지 전입니다.

결정은 제가 했습니다. 설계 개정과 계약 초안, 레퍼런스 수집·평가, 프로젝트 실측은 제 지시로 AI 에이전트(Claude Code, Codex)가 쓰고 수행했으며 두 AI가 서로 리뷰했습니다. 구현 PR도 AI 에이전트가 만들고 검증했고, 제가 확인해 머지했습니다. 웹과 서비스 코드는 원래 팀원 담당 영역이었지만 이번 변경은 제가 맡았습니다.

## 영상은 두 경로로 지나가고, 시계는 두 개입니다

방송 송출 프로그램 OBS가 SRT(손실 복구를 지원하는 영상 전송 프로토콜)로 보낸 입력을 스트리밍 서버 MediaMTX가 받습니다. 여기서 라이브와 녹화가 갈라집니다. 라이브는 LL-HLS(조각보다 작은 단위도 보내 지연을 줄이는 HLS)로 나가고, 녹화 조각은 사이드카(녹화기 옆에서 파일을 처리하는 프로세스)가 S3에 올리면서 조각마다 메타데이터 한 줄을 DB 장부에 씁니다. S3에는 영상과 오디오 6트랙을 보존한 원본과, 영상과 오디오 한 트랙만 다시 포장해 되감기·다시보기에 쓰는 재포장본이 함께 있습니다.

```mermaid {#fig-paths kind="개념도" caption="방송 입력은 MediaMTX에서 라이브와 녹화로 갈라지고, 녹화 조각마다 장부에 한 줄이 남습니다."}
flowchart TB
  accTitle: 라이브와 녹화 경로
  accDescr: OBS가 SRT로 보낸 입력을 MediaMTX가 받아 라이브 LL-HLS와 fMP4 녹화 조각으로 나눈다. 사이드카가 녹화 조각을 S3 원본과 재포장본으로 올리고 DB 장부에 조각마다 한 줄을 쓴다.
  obs[OBS SRT 송출] --> mtx[MediaMTX]
  mtx --> live[라이브]
  mtx --> rec[녹화 조각]
  rec --> side[사이드카]
  side --> s3[(S3 파일<br/>DB 장부)]
```

조각 길이는 4초를 목표로 설정했지만 고정 길이는 아닙니다. 프로젝트의 OBS 송출 시험에서는 인코더의 키프레임(독립적으로 복원할 수 있는 프레임) 간격에 따라 약 5.7초 조각도 나왔습니다. 길이를 누적할 때는 설정값이 아니라 실제 미디어 길이를 써야 합니다.

### 조각에 붙은 두 시계는 답하는 질문이 다릅니다

벽시각은 「21시 3분」처럼 현실의 시각을 가리키고, 미디어 시각은 「이 녹화에서 12초」처럼 파일 안 위치를 가리킵니다. 파일에는 프레임 같은 표본마다 정수 타임스탬프가 기록돼 있습니다.

| 비교 기준 | 벽시각(PDT) | 미디어 시각 |
| --- | --- | --- |
| 답하는 질문 | 이 장면은 몇 시 방송인가 | 이 파일의 어느 표본인가 |
| 값의 원천 | 현재 입력에서는 수신 서버의 추정 | 파일에 기록된 정수 타임스탬프 |
| 정밀 좌표로 쓸 때 | 추정 오차와 시계 재설정을 함께 다뤄야 함 | 표본을 특정할 수 있지만 트랙·원점 변환은 필요 |

PDT(Program Date Time)는 HLS 재생목록의 `EXT-X-PROGRAM-DATE-TIME` 태그로 표현하는 절대 시각 대응입니다. HLS 개정 초안은 이를 조각의 첫 표본과 연결하지만, 시각이 밀리초까지 적혀 있다고 캡처 순간을 그 정밀도로 안다는 뜻은 아닙니다.[1](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)

조사 당시 OBS 소스에서 일반 SRT 출력에 송신 측 벽시각을 넣는 경로는 확인되지 않았습니다. 벽시각을 영상에 싣는 방송 성능 측정 메타데이터는 멀티트랙 영상 출력과 MP4 출력에만 있었습니다.[5](https://github.com/obsproject/obs-studio/pull/11004) 그래서 현재 경로는 MediaMTX의 추정을 씁니다. MediaMTX 추정기는 처음 받은 시각에 미디어 시각을 더하다가, 계산값이 현재보다 미래이거나 5초 넘게 과거이면 기준을 다시 잡고, 트랙마다 따로 돕니다(커밋 `847a6ee` 기준).[4](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/ntpestimator/estimator.go)

### 벽시각은 표시·넘김·채팅에 남깁니다

벽시각은 여전히 필요합니다. 라이브에서 되감기로 넘어갈 때 같은 장면을 찾고(프로젝트 허용 오차 ±0.25초), 채팅과 마크를 장면에 연결하고, 화면에 방송 시각을 표시합니다. 바꾸려는 것은 「몇 시 장면인가」와 「어느 프레임을 자를 것인가」를 같은 값 하나에 맡기던 부분입니다.

## 보정식을 고칠수록 경계가 늘어났습니다

### 실측에서 함정 여섯 개가 나왔습니다

AI 에이전트가 새 설계 전인 11월 2일에 수행한 프로젝트 실측에서 아래 함정이 나왔습니다. 시험 조건은 글 끝 「측정 조건」에 모았습니다.

| 함정 | 관측 |
| --- | --- |
| 트랙마다 추정 기준이 다름 | B 프레임을 켠 OBS 시험에서 영상과 오디오의 기준 시각 차이가 접속별 중앙값 약 94ms |
| 조각마다 기준 트랙이 바뀜 | 이웃 조각의 시각 증가량에 약 ±105ms 톱니 모양 변동(절대 오차 상한이 아니라 조각 사이 변동) |
| 첫 조각만 시간 관계가 다름 | 첫 영상 표본의 구성 시차(표시 시각 − 디코드 시각)가 녹화기 새 시작마다 0, 이후 33.3ms(합성)·66.7ms(OBS) |
| 시간 도약 뒤 장부 겹침 | 미디어 타임스탬프만 6초 앞으로 옮긴 합성 입력에서 앞 끝과 다음 추정 시작이 2,575ms 겹침 |
| 추정기 재설정 ≠ 녹화기 재시작 | 미디어 시계를 0.96–0.98배로 늦춘 시험 4회 모두, 접속 초반 약 +5초 재설정이 한 녹화 안에 남음 |
| 렌더 단계의 별개 오차 | FFmpeg 7.1.5에서 `setpts` 뒤 `tpad`를 두면 같은 시각 프레임 복제가 끝나지 않음(8.0.1에서는 재현 안 됨), MP4 편집 목록 단위로 출력 시각이 약 1.3ms 당겨짐 |

마지막 두 줄이 특히 중요했습니다. 시각이 계단처럼 바뀌었다는 이유만으로 새 녹화라고 판정할 수 없었고, 렌더 쪽 오차는 벽시각 설계와 별개로 따로 고쳐야 했습니다.

### 결함은 소비자별 보정식과 학습 장치에서 나왔습니다

첫째는 **소비자마다 다른 보정식**이었습니다. 플레이어, 편집기, 렌더가 벽시각을 받아 각자 파일 좌표로 되돌렸습니다. 어떤 경로는 구성 시차를 더하고, 다른 경로는 먼저 시작한 오디오와 영상의 차이를 뺐습니다. 아래 그림의 위쪽이 예전 구조이고, 아래쪽이 바꾼 뒤의 구조입니다.

```mermaid {#fig-consumers kind="개념도" caption="예전에는 소비자마다 벽시각을 파일 좌표로 되돌렸습니다. 지금은 클립·렌더가 조각과 조각 안 미디어 시각을 받고, 벽시각 변환은 공용 함수 한 곳에서 합니다." source="https://github.com/3K-PokeClip/PokeClip-mono/pull/470"}
flowchart TB
  accTitle: 보정식 구조의 전과 후
  accDescr: 예전에는 벽시각 장부를 플레이어, 편집기, 렌더가 각자의 보정식으로 파일 좌표로 바꿨다. 지금은 편집기 컷과 장부가 공용 변환 함수를 거쳐 조각과 조각 안 미디어 시각이 되고, 클립과 렌더는 그 좌표만 쓴다. 장부의 벽시각은 표시와 넘김, 채팅에만 쓴다.
  L1[(예전 장부)] --> C1[소비자마다<br/>각자의 보정식]
  C1 ~~~ L2
  L2[(지금 장부)] --> F2[공용 변환]
  E2[편집기 컷] --> F2
  F2 --> R2[클립·렌더]
  L2 --> V2[표시·넘김·채팅]
```

같은 장면을 가리키는 식이 세 곳에 있으니, 한 식을 고쳐도 다른 경로의 경계 조건이 남았습니다. 둘째는 **배우는 보정 장치**였습니다. 이전 설계는 미디어 시계와 벽시각 추정의 차이를 관찰해 장부 시각을 조금씩 끌어당기려 했고, 그러려면 작은 흔들림, 실제 시계 속도 차이, 재접속 직후 몰린 패킷, 기준 트랙 교대, 추정기 재설정을 모두 구분해야 했습니다. 시각을 단순하게 만들려던 장치가 관측 이력과 학습 상태를 관리하는 또 하나의 시스템이 됐습니다. 거친 추정값에 프레임 정밀도를 요구한 구조가 보정식을 늘렸다고 해석했고, 그 전제부터 조사하기로 했습니다.

## 기술 이름 대신 전제 일곱 개를 조사했습니다

조사 질문은 「PDT를 어떻게 쓰나」가 아니라 「우리처럼 쓰는 공개 선례가 있는가」였습니다. 수집한 출처 44개를 별도 평가 에이전트가 다시 열어 판정했고, 「못 찾음」은 조사한 공개 자료 범위의 판정입니다.

| 설계가 기대던 전제 | 공개 선례 판정 | 판단 근거 |
| --- | --- | --- |
| 조각별 벽시각 장부를 여러 소비자의 정밀 기준으로 사용 | 일부만 확인 | HLS 초안과 Kinesis Video Streams는 조각별 시각을 둠. 수신 추정 장부를 프레임 정밀 좌표의 정본으로 쓰는 조합은 못 찾음[1](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) [3](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/API_reader_Fragment.html) |
| 수신 서버의 도착 추정을 정밀 시각의 원천으로 사용 | 거친 용도만 확인 | Mux의 PDT 클립은 조각 단위 정확도라고 명시[2](https://www.mux.com/docs/guides/create-instant-clips) |
| 여러 상수와 학습 상태로 벽시각을 계속 보정 | 단순 문턱 재동기만 확인 | MediaLive는 PDT 시계를 시스템 시계(`SYSTEM_CLOCK`)로 둘 때 길이를 누적하다 500ms 넘게 벌어지면 다시 맞춤[7](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-medialive-channel-hlsgroupsettings.html) |
| 서로 다른 공정이 만든 원본과 재포장본을 나중에 정렬 | 못 찾음 | 한 입력의 여러 트랙을 함께 처리해 동기화하는 선례만 확인[12](https://docs.unified-streaming.com/best-practice/live.html) |
| 수신 추정 PDT를 파일 오프셋으로 바꿔 프레임 정확 클립 생성 | 못 찾음 | Mux는 자산 오프셋 경로를 안내[2](https://www.mux.com/docs/guides/create-clips-from-your-videos) |

### HLS 초안·Mux·Kinesis는 정밀 동기를 미디어 시각에 둡니다

HLS 개정 초안 22판은 PDT를 벽시각과 미디어 타임스탬프 사이의 정보성 대응으로 설명합니다. 변형 스트림을 바꿀 때도 조각 길이(EXTINF)로 대략의 위치를 찾은 뒤, 조각 안 타임스탬프로 두 시간축을 정밀하게 맞추라고 합니다. 이 문서는 아직 RFC가 아닌 개정 초안입니다.[1](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)

Mux는 PDT로 재생목록을 잘라내는 클립이 조각 단위라 요청보다 몇 초 길 수 있다고 밝히고, 프레임 정확 클립에는 영상 시작부터 센 오프셋을 쓰는 자산 클립을 안내합니다.[2](https://www.mux.com/docs/guides/create-instant-clips) Kinesis Video Streams는 조각 시각이 정확하지 않으면 조각마다 끊김 표시를 두는 `ALWAYS`를 권하고, `ON_DISCONTINUITY`는 틈이나 겹침이 50ms를 넘을 때 표시합니다.[3](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/API_reader_GetHLSStreamingSessionURL.html) 세 곳 모두 미디어 시간축을 먼저 두고 벽시각을 대응시킵니다.

### 벽시각으로 프레임 정확 클립을 만드는 선례도 있습니다

Unified Capture는 UTC 범위와 `--frame-accurate` 옵션을 받습니다. 다만 그 시간축은 인코더가 영상에 기록한 UTC 타임스탬프라, 수신 도착 시각을 추정하는 우리 입력과 전제가 다릅니다.[12](https://docs.unified-streaming.com/documentation/capture/live-to-vod.html) DASH-IF 수신 지침은 인코더 장애 전환 때 미디어 타임스탬프를 이어 가도록 권하는데, 이는 연속된 미디어 시간축을 생산할 수 있는 쪽의 선택이고 우리 경로는 재접속마다 원점이 초기화됩니다.[6](https://github.com/Dash-Industry-Forum/Ingest/blob/6390878/DASH-IF-Ingest.bs.md)

도착 추정을 따라 보정하는 위험은 제3자 기록에도 있었습니다. `bluenviron/mediamtx#5550`의 한 댓글은, 작성자들이 이전에 쓰던 도착 시각만 보는 보정이 네트워크 지연이 늘었다는 이유만으로 정확한 원천을 약 580ms 옮길 수 있었다고 적었습니다. RTSP 카메라에 대한 단일 보고입니다.[15](https://github.com/bluenviron/mediamtx/issues/5550#issuecomment-6307819009)

## 클립·렌더의 정밀 좌표를 미디어 시각으로 옮겼습니다

| 선택지 | 주고받는 좌표 | 비용과 판단 |
| --- | --- | --- |
| 벽시각 유지 | 몇 시부터 몇 시까지 | 소비자마다 파일 좌표로 되돌리는 보정과 추정 오차가 남음 |
| **미디어 좌표 채택** | 어느 조각의 어느 미디어 시각부터 어디까지 | 주문 계약을 바꿔야 하지만, 정밀 경로에서 벽시각 왕복이 사라짐 |

렌더 주문은 「조각 번호 + 조각 안 미디어 시각」을 주고받습니다. Cloudflare Stream의 라이브 클립은 방송 시작부터 센 오프셋을, Twitch의 VOD 클립 API는 VOD 안 종료 오프셋과 길이를 받습니다. 좌표를 영상 안에 두는 선례입니다.[8](https://developers.cloudflare.com/stream/stream-live/live-instant-clipping/) [9](https://dev.twitch.tv/docs/api/reference/#create-clip-from-vod)

### 렌더 주문이 추정값을 거치지 않게 됩니다

벽시각 추정이 흔들려도 이미 고른 컷의 소재 위치는 바뀌지 않습니다. 재포장본과 원본의 대응도 재포장 때 옮긴 타임스탬프 이동량으로 계산하고, 구성 시차와 트랙 원점 차이까지 반영한 변환은 공용 모듈 한 곳에서 합니다. 그 모듈과 공유 시험 표가 [#470](https://github.com/3K-PokeClip/PokeClip-mono/pull/470)으로 들어갔고, 웹 플레이어는 [#468](https://github.com/3K-PokeClip/PokeClip-mono/pull/468)에서 되감기·다시보기 목록의 새 조각을 영상 첫 표본 축으로 환산하도록 바뀌었습니다.

### 편집기는 벽시각 컷을 그대로 보냅니다

처음에는 편집기도 미디어 좌표로 바꾸려 했습니다. 11월 3일에 이 부분을 되돌렸습니다. 편집기는 지금 화면(MediaMTX의 녹화 재생)을 유지하고 컷을 벽시각 밀리초로 보냅니다. 클립 서비스가 렌더 주문을 만들 때 그 구간에 걸친 조각을 겹침으로 조회하고, 장부의 변환 함수로 「조각 + 조각 안 미디어 시각」으로 바꿉니다.

대가가 있습니다. 편집기가 보는 시계와 장부의 시계가 달라, 자른 자리가 화면에서 본 자리보다 최대 약 0.18초 어긋날 수 있습니다(웹 실측). 저는 요청한 장면을 빠뜨리지 않고 가져오는 것이 더 중요하다고 보고 이 오차를 받아들였습니다. 편집기 화면을 재포장본으로 바꾸는 작업은 이번 범위에서 뺐습니다.

## 학습형 보정을 「섞기」로 바꿨습니다

클립을 미디어 좌표로 옮겨도 벽시각은 남습니다. 3시간 방송이라면 조각마다 작은 추정 흔들림이 생기고, 송출기와 서버의 시계 속도가 다르면 차이가 쌓이고, 재접속하면 새 녹화의 미디어 시계가 초기화될 수 있습니다. 이 셋을 모두 학습으로 흡수하려던 것이 이전 설계입니다.

| 선택지 | 작은 흔들림 | 느린 어긋남과 재접속 | 한계 |
| --- | --- | --- | --- |
| 학습형 보정 유지 | 관측해 조금씩 보정 | 학습과 이음 규칙으로 흡수 | 여러 상수와 학습 상태, 재생 시험이 필요 |
| **섞기 채택** | 문턱 아래는 따라가지 않음 | 작은 차이면 잇고, 큰 차이면 새 장 | 장 경계에서 표시 시각이 건너뜀 |
| MediaLive식 재동기 | 길이를 누적 | 차이가 커지면 벽시계로 재동기 | 공식 문서의 500ms는 우리 ±0.25초 예산보다 큼 |
| 재접속 때만 나누기 | 길이를 누적 | 재접속마다 새 기준 | 장 안에 쌓이는 차이로 예산을 넘을 수 있음 |

「섞기」는 한 장 안의 길이 누적과, 차이가 클 때의 기준 재설정을 섞는다는 뜻입니다. **장**은 같은 벽시각 기준을 공유하는 장부 구간으로, 방송·세션이나 HLS의 끊김 구간과는 다른 단위입니다.

### 장 안은 누적하고, 문턱 밖에서 새 장을 엽니다

1. 한 장 안에서는 보정하지 않습니다. 장의 첫 벽시각에 실제 미디어 길이의 합을 더합니다.
2. 조각마다 「실제 벽시각 추정 − 앞 조각 끝」의 차이를 문턱과 비교합니다. 문턱 안이면 그대로 이어 갑니다.
3. 늦게 왔고 문턱 밖이면(틈) 새 장을 열고, 새 장의 첫 벽시각은 그때의 추정값으로 정합니다.
4. 일찍 왔고 문턱 밖이면(겹침) 앞 조각 끝보다 최대 999ms까지만 당겨 적습니다.

문턱은 실측 전 시험값 140ms로 시작했고, 전환 전에 실측으로 확정합니다. 아래 영상에서 띠 위의 시각 표시가 어디서 이어지고, 어디서 건너뛰고, 어디서 조금 뒤로 가는지 보면 됩니다.

{{< motion scene="ChapterRule" kind="개념도" caption="한 장 안은 미디어 길이를 누적해 잇고, 틈이 문턱을 넘으면 새 장을 열고, 1초 미만으로 일찍 온 조각은 최대 999ms 당겨 적습니다. 값은 설명용입니다." >}}

세 갈래 모두 영상 자체는 이어져 재생되고, 달라지는 것은 화면에 표시하는 방송 시각입니다.

### 누적과 재설정은 각각 선례가 있습니다

한 장 안에서 기준에 미디어 길이를 누적하는 생각은 DASH-IF 타이밍 지침과 MediaLive의 PDT 시계에 있습니다.[6](https://dashif.org/Guidelines-TimingModel/) [7](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-medialive-channel-hlsgroupsettings.html) 경계를 따로 다루는 방식은 제품마다 다릅니다. Kinesis는 틈과 겹침을 50ms 문턱으로 판정하고, Unified Origin은 앞 조각 시각과 길이의 합이 다음 조각 시각과 조금이라도 다르면 아카이브에 경계를 기록하며, MediaMTX 재생기는 문턱이 아니라 같은 스트림의 연속 번호로 조각을 잇습니다.[3](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/API_reader_GetHLSStreamingSessionURL.html) [12](https://docs.unified-streaming.com/documentation/live/troubleshooting.html) [13](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/playback/on_get.go) 우리는 장 안의 누적과 문턱 밖의 재설정을 조합했습니다. 남는 질문은 「지금 기준을 계속 쓸 만한가」 하나이고, 문턱과 장 경계는 관찰하고 시험할 수 있습니다.

### 마지막 조각만으로는 끊긴 시간을 알 수 없습니다

사이드카는 앞 녹화의 마지막 조각이 어디서 끝나는지 압니다. 그러나 그 뒤 녹화가 없었던 시간은 마지막 조각만으로 알 수 없습니다. 2분 끊긴 방송을 앞 녹화 끝에 그대로 이으면 이후 방송 시각이 실제보다 2분 늦어집니다. 틈을 재려면 외부 시각이 필요하고, 현재 입력에서는 그것이 수신 서버의 추정입니다. 그래서 「마지막 조각에 잇기」는 차이가 문턱 안일 때만 씁니다.

### 학습 상태를 버리고 표시 시각의 건너뜀을 받아들였습니다

학습 창, 트랙별 추정 상태, 여러 조정 상수를 유지하는 부담이 사라졌습니다. 대신 장 경계에서 화면에 표시하는 방송 시각이 건너뛸 수 있고, 새 장의 기준으로 고른 추정값이 틀리면 그 오차가 장 전체에 남으며, 문턱 아래의 느린 어긋남도 그대로 둡니다. 렌더 쪽도 같은 방향으로 정했습니다. 0.5초를 넘는 틈을 오류로 거절하던 규칙을 거두고, 조각 순서대로 이어 붙여 렌더합니다. 클립 안 장면이 틈만큼 건너뛰는데, 재생목록을 재생할 때와 같은 모습입니다.

## 장부와 수신 추정, 목록 분리는 그대로 둡니다

조각별 벽시각 장부는 유지하고 용도를 표시·넘김·채팅 대응으로 좁혔습니다. Kinesis도 조각마다 생산자 시각과 서버 시각을 저장합니다.[3](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/API_reader_Fragment.html) 현재 입력의 벽시각 원천도 유지했습니다. 송신 측 벽시각을 받으면 원천 품질은 높아지지만 OBS 출력과 수신 경로를 함께 바꿔야 합니다. 라이브(MediaMTX)와 되감기(S3 재포장본) 목록도 분리된 채로 둡니다. 한 경로로 합치는 일은 이번 결정의 범위를 넘습니다.

### DTS로 세되, 보이는 장면은 PTS로 찾습니다

DTS(Decoding Time Stamp)는 압축을 풀 순서의 시각이고, PTS(Presentation Time Stamp)는 화면에 표시할 시각입니다. B 프레임(앞뒤 프레임을 참고해 압축하는 프레임)이 있으면 두 순서가 달라집니다. 장부의 길이 누적과 순서는 한 녹화 구간 안에서 DTS로 세고, 시청자가 본 장면을 가리킬 때는 표본의 구성 시차 `c = PTS − DTS`를 반영합니다. 이 값은 표본마다 다를 수 있으므로 방송 전체의 고정 보정값으로 쓰지 않고, 변환은 공용 변환 모듈에서만 합니다.

## 남은 위험은 실측으로 닫아야 합니다

### 문턱 하나가 전체 오차 예산은 아닙니다

문턱은 누적 시각과 추정 시각의 차이를 가를 뿐입니다. 추정 원천의 오차, 라이브와 녹화의 원점 차이, 플레이어의 타임라인 배치까지 합친 넘김 오차가 ±0.25초 안에 드는지는 실제 화면으로 재야 합니다. 비교할 업계 공개 허용 오차도 찾지 못했습니다.

### 1초 미만 겹침은 허용하고 999ms까지 당깁니다

새 조각의 실제 벽시각이 앞 조각 끝보다 일찍 오면, 앞 조각 끝에 묶어 겹침을 막는 대신 1초 미만의 부분 겹침을 허용하기로 했습니다. HLS 개정 초안도 시계 표류를 다루기 위한 1초 미만 부분 겹침을 허용하고, 겹친 시각은 뒤 조각을 우선합니다.[1](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) 한 번에 당기는 폭은 그 끝인 999ms로 정했습니다.

근거는 웹 플레이어(hls.js 1.7.3)로 잰 겹침 재생 실측입니다. 합성 조각 117회와 실제 MediaMTX 녹화 조각 245회 모두 멈춤·치명 오류·소리 튐 없이 끝까지 재생됐고, 대가는 화면 표시 시각이 겹침 폭만큼 한 번 뒤로 가는 것이었습니다. 실제 송출 조각에 이 규칙을 적용했을 때 생긴 겹침은 아래와 같습니다.

{{< chart id="fig-overlap" kind="실측" caption="실제 MediaMTX 녹화 조각에 겹침 규칙을 적용했을 때 생긴 겹침(ms, 약 2분 송출). 강조색 실선이 한 번 당김 상한 999ms, 회색 점선이 문턱 140ms입니다. 모두 상한 안이고, 문턱만큼 당겨서는 한 번에 흡수되지 않습니다. 프로젝트 내부 실측(2026-11-03)." height="380px" >}}
{
  "grid": {"left": 8, "right": 48, "top": 8, "bottom": 8, "containLabel": true},
  "xAxis": {"type": "value", "name": "ms", "min": 0, "max": 1100},
  "yAxis": {"type": "category", "inverse": true, "data": ["x264", "VT ①", "VT ②", "VT+B ①", "VT+B ②", "VT+B ③", "VT+B ④", "VT+B ⑤", "VT+B ⑥"]},
  "series": [{
    "type": "bar",
    "itemStyle": {"color": "#7a8a9b"},
    "label": {"show": true, "position": "right", "formatter": "{c}"},
    "data": [0, 512, 352, 212, 216, 250, 298.7, 308, 318],
    "markLine": {"symbol": "none", "label": {"show": false}, "data": [
      {"name": "상한 999", "xAxis": 999, "lineStyle": {"color": "#087f8b", "width": 2, "type": "solid"}},
      {"name": "문턱 140", "xAxis": 140, "lineStyle": {"color": "#7a8a9b", "type": "dashed"}}
    ]}
  }]
}
{{< /chart >}}

VideoToolbox 송출에서 생긴 212–512ms 겹침은 999ms 상한이면 한 번에 흡수되지만, 문턱 140ms로 당기면 72–372ms의 앞섬이 여러 조각 동안 남습니다. 겹친 구간의 채팅이 뒤 조각에 붙는 것도 함께 받아들였습니다.

### 새 장과 HLS의 끊김 표시는 다릅니다

재포장본 목록의 끊김 표시(`EXT-X-DISCONTINUITY`)는 세션 경계에만 두기로 이미 정했고, 재포장 영상은 앞 녹화 끝에 이어 붙어 있습니다. 그래서 새 장은 재생목록 태그가 아니라 장부 경계와 화면 시각의 건너뜀으로만 나타나게 하려 합니다. 장 경계와 재생목록 태그의 관계는 아직 다음 설계 개정에서 확정할 항목이고, 실제 미디어 타임스탬프나 초기화 정보가 바뀌는 경계에서는 끊김 표시가 여전히 필요할 수 있습니다.[1](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)

### 플레이어 소스와 실측이 아직 맞지 않습니다

조사한 hls.js 커밋 `598ebdd`는 영상 트랙이 있고 기준 표본 정보에 최소 PTS가 있으면 그 값을 조각 시작으로 쓰고, 아니면 DTS 시작으로 돌아갑니다.[14](https://github.com/video-dev/hls.js/blob/598ebdd/src/remux/passthrough-remuxer.ts) 반면 프로젝트의 hls.js 1.7.3 라이브 실측에서는 조각 시작이 DTS 위치에 붙었습니다. 오디오에 맞춰 동기할 때 기준 표본 정보가 오디오 값을 담는 경로가 원인일 수 있지만, 확인하지는 못했습니다. 그래서 라이브 쪽 구성 시차 보정은 일단 끄고 넘겼습니다.

### 측정하지 않은 범위가 남았습니다

겹침 재생 실측은 겹침을 손으로 씌운 조각으로 했습니다. 새 생산자가 실제로 만든 조각, 라이브↔되감기 넘김의 네 갈래, 오디오 목록이 분리된 경로, 실제 Safari·iOS와 OBS 송출은 다음 출시 전에 재야 합니다. Twitch와 YouTube의 내부 시간축 구조는 공개 자료에서 확인하지 못했습니다. 녹화가 끊긴 동안의 영상은 원래 없으므로, 어떤 규칙으로도 잃어버린 장면을 복원하지는 못합니다.

## 소비자 쪽부터 들어갔고 생산자는 아직입니다

11월 3일까지 웹 플레이어 환산([#468](https://github.com/3K-PokeClip/PokeClip-mono/pull/468)), 공용 변환 모듈과 공유 시험 표([#470](https://github.com/3K-PokeClip/PokeClip-mono/pull/470)), 그 시험 표로 플레이어 환산을 견주는 시험([#472](https://github.com/3K-PokeClip/PokeClip-mono/pull/472))이 머지됐습니다. 섞기 규칙을 적용할 생산자, 렌더, 클립 쪽은 11월 10일 기준 아직 머지되지 않았습니다([#475](https://github.com/3K-PokeClip/PokeClip-mono/pull/475) 등). 서비스는 그 전에 v1.0.0으로 먼저 출시했고, 새 시간축은 나중에 이미지 교체로 들어갑니다.

여섯 번 고친 설계에서 배운 것은 보정식을 더 잘 쓰는 방법이 아니었습니다. 어떤 값이 어떤 정확도를 책임지는지 먼저 정해야 했습니다. 비슷한 설계를 한다면 「정밀 좌표」와 「사람에게 보여 줄 시각」을 처음부터 다른 값으로 두십시오.

## 측정 조건

### 프로젝트 실측(11월 2일)

AI 에이전트가 새 설계 전에 수행했습니다. OBS 32.2.2의 같은 컴퓨터 안 송출로, 1080p·30fps 영상과 무음 오디오 6트랙을 썼고, x264와 VideoToolbox를 각각 70초씩 8회 연결했습니다. 녹화기는 MediaMTX 상류 커밋 `3f041257`에 프로젝트 수정을 더한 이미지로, 조사에서 읽은 `847a6ee`와 실행물이 다릅니다. 실제 인터넷 송출과 새 인코더의 첫 접속은 대표하지 않습니다.

### 겹침 재생 실측(11월 3일)

1차는 합성 x264 조각에 겹침 1·140·500·999ms를 씌워 Chromium·WebKit·Chrome으로 117회, 2차는 실제 MediaMTX(v1.21.1 프로젝트 판)에 x264, VideoToolbox(B 프레임 없음·있음)로 송출해 녹화한 조각으로 245회 돌렸습니다. 플레이어는 hls.js 1.7.3입니다.

### 수치의 성격

위 두 실측은 AI 에이전트가 수행·기록한 프로젝트 내부 자료이며 원시 기록은 공개하지 않습니다. 편집기 어긋남 0.18초도 같은 웹 실측에서 왔습니다. 제품 문서의 수치와 프로젝트 실측을 서로의 결과로 취급하지 않았습니다.

## 출처

외부 문서는 2026년 11월 2일에 확인했고, 소스는 조사에 쓴 커밋으로 연결했습니다.

1. [HLS 개정 초안 22판](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt), 2026-05-01. PDT는 4.4.4.6·6.2.1, 출력 간 일관성은 6.2.4, 변형 전환은 6.3.4. 아직 RFC가 아닌 초안입니다.
2. Mux, [Create instant clips](https://www.mux.com/docs/guides/create-instant-clips), [Create clips from your videos](https://www.mux.com/docs/guides/create-clips-from-your-videos).
3. AWS Kinesis Video Streams, [Fragment](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/API_reader_Fragment.html), [GetHLSStreamingSessionURL](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/API_reader_GetHLSStreamingSessionURL.html).
4. `bluenviron/mediamtx` 커밋 `847a6ee`의 [추정기](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/ntpestimator/estimator.go), [SRT 수신](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/servers/srt/conn.go), [녹화 트랙 처리](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/recorder/format_fmp4_track.go).
5. [obsproject/obs-studio#11004](https://github.com/obsproject/obs-studio/pull/11004), 커밋 `65c320b46e`의 [멀티트랙 출력](https://github.com/obsproject/obs-studio/blob/65c320b46e/frontend/utility/MultitrackVideoOutput.cpp), [MP4 출력](https://github.com/obsproject/obs-studio/blob/65c320b46e/plugins/obs-outputs/mp4-output.c).
6. DASH-IF, [Restricted timing model](https://dashif.org/Guidelines-TimingModel/), [Live Media Ingest Protocol](https://github.com/Dash-Industry-Forum/Ingest/blob/6390878/DASH-IF-Ingest.bs.md)(장애 전환 절).
7. AWS MediaLive, [HlsGroupSettings](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-medialive-channel-hlsgroupsettings.html)(`ProgramDateTimeClock`).
8. Cloudflare Stream, [Live Instant Clipping](https://developers.cloudflare.com/stream/stream-live/live-instant-clipping/).
9. Twitch, [Create Clip From VOD](https://dev.twitch.tv/docs/api/reference/#create-clip-from-vod).
10. AWS MediaConvert, [Input timecode source](https://docs.aws.amazon.com/mediaconvert/latest/ug/timecode-input.html).
11. FFmpeg 커밋 `b034eb5e7e`의 [ffmpeg.texi](https://github.com/FFmpeg/FFmpeg/blob/b034eb5e7e/doc/ffmpeg.texi).
12. Unified Streaming, [Recommendations for Live](https://docs.unified-streaming.com/best-practice/live.html), [Troubleshooting LIVE Streaming](https://docs.unified-streaming.com/documentation/live/troubleshooting.html), [Capturing LIVE](https://docs.unified-streaming.com/documentation/capture/live-to-vod.html).
13. `bluenviron/mediamtx` 커밋 `847a6ee`의 [재생 시각 계산](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/playback/on_get.go), [조각 연결 조건](https://github.com/bluenviron/mediamtx/blob/847a6ee/internal/playback/segment_fmp4.go).
14. `video-dev/hls.js` 커밋 `598ebdd`의 [조각 시작 시각 계산](https://github.com/video-dev/hls.js/blob/598ebdd/src/remux/passthrough-remuxer.ts), [PDT 정렬](https://github.com/video-dev/hls.js/blob/598ebdd/src/utils/discontinuities.ts).
15. [bluenviron/mediamtx#5550의 2026-10-21 댓글](https://github.com/bluenviron/mediamtx/issues/5550#issuecomment-6307819009).
16. PokeClip 구현 PR(공개 저장소): [#468](https://github.com/3K-PokeClip/PokeClip-mono/pull/468), [#470](https://github.com/3K-PokeClip/PokeClip-mono/pull/470), [#472](https://github.com/3K-PokeClip/PokeClip-mono/pull/472), [#475](https://github.com/3K-PokeClip/PokeClip-mono/pull/475).
17. 프로젝트 실측 기록(11월 2·3일), AI 에이전트가 수행·기록한 내부 자료. 원시 기록은 공개하지 않습니다.
