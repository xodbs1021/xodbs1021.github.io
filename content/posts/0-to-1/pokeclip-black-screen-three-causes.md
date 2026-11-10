---
title: "HTTP 200인데 검은 화면, 세 단계를 지나서야 재생됐습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: 2026-11-11T04:45:39+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "HLS", "Debugging", "MediaMTX", "hls.js", "H.264"]
description: "8월 18일 데모 서버에 OBS 송출을 붙이자 송출 인증과 HTTP 200은 성공했는데 화면이 검었습니다. 변환 오류, 목록 앞쪽의 GAP 조각, hls.js 생성자 예외를 차례로 넘어 재생과 되감기를 확인한 과정과, 11월에 소스를 대조해 바로잡은 원인 설명."
draft: false
portfolio_cases: [14]
portfolio_pages: [10]
portfolio_edition: "2026-10-15-v2"
---

2026년 8월 18일, 멘토 데모용 임시 미디어 서버(MediaMTX 1.19.3)에 OBS 송출을 처음 붙였습니다. 송출 인증은 통과했고, 나중에는 재생 목록과 조각 요청이 모두 HTTP 200을 받았는데도 플레이어 화면은 검었습니다. 서버 변환 오류, 재생 목록 앞쪽의 GAP 조각 7개, 플레이어 초기화 실패를 차례로 확인해 고쳤고, 같은 날 17시 10분경 재생과 되감기가 동작하는 것을 확인했습니다. 11월에 소스를 다시 대조해 보니 당시 적은 원인 설명 가운데 둘은 근거가 맞지 않았습니다. 변환 오류가 사라진 것은 B-frame이 원인이었다는 증거가 되지 못했고, 401을 낸 GAP 조각은 hls.js가 애초에 요청하지 않는 항목이었습니다. 화면을 확실히 막은 것은 처음 만든 재생 페이지부터 들어 있던 hls.js 설정 검사 예외였습니다.

저는 데모의 종착점을 서버 응답이 아니라 플레이어 화면 재생으로 정했고, OBS 출력을 baseline 프로파일과 키프레임 2초로 바꿨습니다. 로그 진단, 서버 설정 수정, 플레이어 페이지 재작성, 브라우저 콘솔 확인은 AI(Claude Code)가 했습니다. 2026년 11월의 원인 정정은 AI가 MediaMTX·mediacommon·x264·hls.js 소스를 대조해 찾았습니다. 그 가운데 B-frame 정정은 제가 확인했고, GAP과 hls.js 문구의 재해석은 AI의 소스 대조 결과입니다.

## 송출 인증과 HTTP 200이 성공해도 화면은 검었습니다

데모 서버는 OBS가 SRT로 보낸 방송을 MediaMTX가 받아 LL-HLS로 내보내고, 같은 서버의 nginx가 플레이어 페이지와 HLS 요청을 함께 받는 구성이었습니다. LL-HLS(Low-Latency HLS)는 조각을 더 잘게 나눈 파트(part)를 먼저 내보내 지연을 줄이는 HLS 확장입니다. 설정은 조각 4초, 파트 500ms, 재생 창 900조각(약 1시간)이었습니다.

조사는 요청이 지나는 순서대로 세 단계로 나눴습니다. 서버가 영상을 HLS로 바꾸는 단계, 재생 목록과 조각을 내주는 단계, 브라우저가 플레이어를 만드는 단계입니다. 단계마다 통과로 본 증거가 달랐고, 11월에 소스를 대조하자 앞의 두 단계는 해석이 바뀌었습니다.

| 단계 | 당시 증거 | 조치 | 통과로 본 증거 | 11월 소스 대조 |
|---|---|---|---|---|
| 변환(MediaMTX muxer) | `too many reordered frames (11)` 16:17–16:24 반복 | OBS를 baseline·키프레임 2초로 | 16:27 이후 0건 | x264였다면 검사가 꺼지는 설정이라 B-frame 증거가 되지 못함 |
| 목록·조각 | 목록 앞쪽 `gap.mp4` 7개, 요청하면 401 | 창 900 → 30 → 900 | 창 30에서 GAP 0개 | hls.js가 요청하지 않는 항목, 900 복원 뒤 다시 생겼을 것 |
| 브라우저 초기화 | 목록·조각 200인데 「hls.js 를 불러오지 못했습니다」, 고친 페이지에서는 「연결 중…」에서 정지 | hls.js 같은 오리진 제공, 설정 짝 추가 | 재생·되감기 | 처음 만든 페이지부터 있던 예외 |

그림 1은 당시 조사가 지나간 순서입니다. 한 단계에서 통과로 본 증거를 얻을 때마다 다음 단계로 조사가 옮겨 갔습니다.

{{< motion scene="StageUnblock" id="fig-stages" kind="개념도" caption="8월 18일의 조사 순서. 변환 오류가 0건이 되자 목록 앞쪽의 GAP을 조사했고, 창을 줄여 GAP 0개를 본 뒤 hls.js 생성자 예외에 닿았습니다. 셋째 단계를 넘은 뒤에야 재생과 되감기가 됐습니다. 이름표는 당시 통과로 본 증거입니다. 11월 소스 대조에서 첫째 단계의 원인 설명은 정정했고, 둘째 단계의 GAP은 hls.js가 요청하지 않는 항목이라 화면을 막지 않았을 가능성이 큽니다." >}}

한 단계를 통과했다는 증거는 그 단계만 설명했습니다. 오류 줄이 사라져도, 응답이 200이어도 화면이 나온다는 뜻은 아니었습니다.

## 인코딩을 baseline으로 바꾸자 변환 오류가 사라졌습니다 {#인코딩-설정을-바꾸자-서버-오류만-사라졌습니다}

서버 로그에는 HLS 변환기(muxer)가 같은 오류로 거듭 끝나는 줄이 16시 17분부터 24분까지 반복됐습니다.

```text
# 발췌. 당일 서버 로그
muxer error: unable to extract DTS: too many reordered frames (11)
```

DTS(Decoding Time Stamp)는 프레임을 디코딩할 시각입니다. H.264는 B-frame을 쓰면 디코딩 순서와 표시 순서가 달라집니다. 그래서 표시 시각(PTS)만 받은 muxer는 DTS를 따로 구해야 합니다. 당시 기록은 원인을 「OBS 기본 인코딩의 B-frame 때문에 LL-HLS 파트(500ms)로 나눌 때 DTS를 계산하지 못한다」로 적었습니다.

저는 OBS 출력을 baseline 프로파일(B-frame 없음)과 키프레임 2초로 바꿨고, 16시 27분 이후 같은 오류는 0건이었습니다. 기록에는 「송출은 B-frame 금지, 키프레임 2초」를 송출 규약으로 남겼습니다.

그런데 화면은 돌아오지 않았습니다. 오류 줄이 사라진 것은 muxer가 더는 이 검사에서 끝나지 않는다는 뜻이었고, 플레이어가 읽을 목록이 정상이라는 뜻은 아니었습니다.

## 오류가 사라진 것은 B-frame이 원인이라는 증거가 아니었습니다

MediaMTX 1.19.3은 DTS를 구할 때 mediacommon v2.9.2의 H.264 DTS 추출기를 씁니다([go.mod 13–16행](https://github.com/bluenviron/mediamtx/blob/v1.19.3/go.mod#L13-L16)). 추출기는 먼저 SPS(Sequence Parameter Set, 스트림 전체의 복호 설정)에 적힌 POC 유형을 봅니다. POC(Picture Order Count)는 프레임마다 붙는 표시 순서 번호입니다.

- POC 유형이 2이면 DTS를 PTS와 같게 두고 바로 돌려줍니다. 순서가 바뀐 프레임을 세는 검사를 하지 않습니다([dts_extractor.go 154–156행](https://github.com/bluenviron/mediacommon/blob/v2.9.2/pkg/codecs/h264/dts_extractor.go#L154-L156)).
- 유형 0이면 실제 POC가 예상에서 벗어난 폭으로 순서가 바뀐 프레임 수를 셉니다. 그 수가 `maxReorderedFrames = 10`을 넘으면 `too many reordered frames (N)`을 냅니다([10–11행](https://github.com/bluenviron/mediacommon/blob/v2.9.2/pkg/codecs/h264/dts_extractor.go#L10-L11), [236–258행](https://github.com/bluenviron/mediacommon/blob/v2.9.2/pkg/codecs/h264/dts_extractor.go#L236-L258)).

그림 2에서 강조한 갈래가 baseline으로 바꾼 뒤 x264 출력이 지나는 길입니다.

```mermaid {#fig-dts-branch kind="개념도" caption="H.264 DTS 추출기의 갈래. POC 유형 2이면 재정렬 검사 없이 DTS를 PTS로 두므로 too many reordered frames가 날 수 없습니다. mediacommon v2.9.2 소스 재구성." source="https://github.com/bluenviron/mediacommon/blob/v2.9.2/pkg/codecs/h264/dts_extractor.go#L154-L156"}
flowchart TB
  accTitle: H.264 DTS 추출기의 갈래
  accDescr: muxer가 접근 단위 하나를 받으면 추출기는 SPS의 POC 유형을 본다. 유형 2이면 DTS를 PTS로 두고 재정렬 검사를 하지 않는다. 유형 0이면 POC 차이로 순서가 바뀐 프레임 수를 세어 10 이하면 DTS를 계산하고, 10을 넘으면 too many reordered frames 오류를 낸다.
  au[접근 단위<br/>하나마다] --> poc{SPS의<br/>POC 유형}
  poc -->|유형 2| skip[DTS = PTS<br/>재정렬 검사 없음]
  poc -->|유형 0| count[POC 차로 재정렬<br/>프레임 수를 셈<br/>10 이하면 DTS 계산]
  count -->|10 초과| err[too many<br/>reordered 오류]
  style skip fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

x264는 B-frame을 쓰지 않으면 SPS에 POC 유형 2를 적습니다([encoder/set.c 173행](https://code.videolan.org/videolan/x264/-/blob/0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee/encoder/set.c#L173)). baseline 프로파일을 고르면 x264는 B-frame 수를 0으로 둡니다([common/base.c 788–794행](https://code.videolan.org/videolan/x264/-/blob/0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee/common/base.c#L788-794)). 그러니 x264로 baseline을 보내면 추출기는 검사를 건너뛰고, 이 오류는 원인과 상관없이 날 수 없습니다. 0건은 원인이 사라졌다는 증거가 아니라 검사가 꺼진 결과였을 수 있습니다. 다만 8월 18일 OBS가 x264를 썼는지, 실제 SPS의 POC 유형이 무엇이었는지는 기록에 남지 않았습니다.

괄호 안 11은 예상 POC와의 차이로 추정한 재정렬 프레임 수가 상한 10을 넘었다는 뜻입니다. 프레임이 빠져 POC가 앞으로 뛸 때도 같은 범위의 수가 나옵니다. 11월에 송출 ffmpeg에서 30초마다 프레임 12장을 지우자 녹화기가 쓰는 같은 추출기(mediacommon v2.9.5, 이 파일은 v2.9.2와 같습니다)가 괄호 안 11–13으로 이 오류를 냈고, 5장을 지우면 이 오류 없이 복호 오류가 있는 조각만 남았습니다([SRT latency를 3초로 올린 글](/posts/projects/pokeclip-srt-latency-late-retransmission/)). 8월 18일에 프레임이 실제로 빠졌는지는 기록이 없어 판정하지 못했습니다. 기록은 GAP 조각을 설정을 바꾸느라 OBS를 껐다 켠 흔적으로 적었을 뿐이고, 그것이 오류와 어떤 관계였는지는 알 수 없습니다.

옛 설명의 「LL-HLS 파트(500ms)로 나눌 때 DTS를 계산하지 못한다」도 거둡니다. MediaMTX는 영상 접근 단위(AU, 한 프레임 분량의 NAL 묶음)가 올 때마다 `WriteH264`를 부르고, 실패하면 `muxer error:`를 붙입니다([from_stream.go 193–200행](https://github.com/bluenviron/mediamtx/blob/v1.19.3/internal/protocols/hls/from_stream.go#L193-L200)). gohlslib v2.4.1은 그 안에서 DTS부터 구하고([muxer_segmenter.go 315–318행](https://github.com/bluenviron/gohlslib/blob/v2.4.1/muxer_segmenter.go#L315-L318)), 조각과 파트를 자르는 일은 DTS를 구한 뒤에 합니다([576–590행](https://github.com/bluenviron/gohlslib/blob/v2.4.1/muxer_segmenter.go#L576-L590)). 파트 길이는 추출기의 입력이 아닙니다.

11월의 시험 방송은 「1080p30 x264 veryfast CBR 6Mbps, 키프레임 2초」로 보냈고 B-frame 수는 적혀 있지 않습니다([같은 글의 측정 조건](/posts/projects/pokeclip-srt-latency-late-retransmission/#측정-조건)). 8월에 정한 「B-frame 금지」 규약을 유지할지는 이 정정만으로 정하지 않았습니다.

## 새 조각이 정상이어도 목록 앞쪽 GAP 조각 7개가 401을 냈습니다 {#새-조각이-정상이어도-목록에는-실패한-구간이-남았습니다}

변환 오류가 멈춘 뒤에도 화면은 검었습니다. 재생 목록 앞쪽에는 `#EXT-X-GAP`이 붙은 `gap.mp4` 항목 7개가 있었고, 그 주소를 요청하면 401이 돌아왔습니다. `EXT-X-GAP`은 그 자리에 미디어가 없으니 받지 말라는 HLS 표시입니다. 창이 900조각이라 이 항목들은 새 조각이 900개 가까이 쌓일 때까지, 약 1시간 동안 목록에 남습니다.

AI는 `hlsSegmentCount`를 900에서 30으로 잠시 줄여 GAP을 창 밖으로 밀어냈고, GAP이 0개가 된 것을 확인한 뒤 17시 8분에 900으로 되돌렸습니다. 다시 생기지 않게 하는 방법으로는 데모 중 송출을 끊지 않는다는 계획을 그대로 두었습니다. 당시 기록은 GAP을 설정을 바꾸며 OBS를 껐다 켠 흔적으로 봤습니다.

11월에 소스로 보니 이 단계의 해석도 달라졌습니다. gohlslib v2.4.1의 LL-HLS muxer는 새로 시작해 첫 조각을 닫을 때 목록 앞에 GAP 항목을 정확히 7개 넣습니다. 소스 주석은 iOS의 LL-HLS 재생이 이것을 요구한다고 적습니다([muxer_stream.go 809–816행](https://github.com/bluenviron/gohlslib/blob/v2.4.1/muxer_stream.go#L809-L816)). 끊긴 구간이 아니라 muxer가 시작할 때마다 생기는 자리표시입니다. OBS를 다시 연결하거나 muxer가 오류로 다시 시작하면 새 목록 앞에 7개가 다시 섭니다.

- hls.js 1.6.16은 `EXT-X-GAP`이 붙은 조각을 네트워크로 요청하지 않고 바로 GAP 오류로 처리합니다([fragment-loader.ts 71–74행](https://github.com/video-dev/hls.js/blob/v1.6.16/src/loader/fragment-loader.ts#L71-L74)). 401은 브라우저가 지나는 길 밖에 있었습니다.
- MediaMTX 1.19.3은 `hlsSegmentCount`가 바뀌면 HLS 서버를 새로 띄웁니다([core.go 948–970행](https://github.com/bluenviron/mediamtx/blob/v1.19.3/internal/core/core.go#L948-L970)). 900으로 되돌린 순간 새 목록 앞에 GAP 7개가 다시 생겼을 것입니다. 복원 뒤의 GAP 수는 기록에 없습니다.

재생은 복원 2분 뒤인 17시 10분경 확인했습니다. 그래서 GAP의 401은 검은 화면의 원인이 아니었을 가능성이 큽니다(소스로 추정했고, 당시 재현해 확인하지는 않았습니다).

## 미디어가 200이어도 hls.js 생성자는 조용히 죽었습니다 {#미디어가-200이어도-플레이어-초기화는-실패할-수-있었습니다}

서버 체인을 처음부터 다시 따라가자 302 리다이렉트를 따라간 뒤의 멀티버리언트 목록, variant 목록, 조각이 모두 200이었습니다. 서버 쪽에는 더 볼 곳이 없었고, AI가 브라우저를 직접 열어 콘솔을 확인했습니다.

기록에 남은 페이지 결함은 둘이었습니다. 하나는 「hls.js 를 불러오지 못했습니다」라는 문구였습니다. 처음 만든 재생 페이지는 MediaMTX가 함께 내주는 hls.js(`/<경로>/hls.min.js`)를 먼저 받고, 실패하면 같은 오리진의 `/hls.min.js`로 물러서게 짜여 있었습니다. 당시에는 물러설 파일을 서버에 두지 않았습니다. AI는 페이지를 다시 쓰면서 hls.js 1.6.16을 서버에 두고 같은 오리진에서만 받게 바꿨습니다.

다른 하나는 다시 쓴 페이지에서 드러났습니다. 화면은 「연결 중…」에서 멈췄고 오류 표시는 없었으며, 콘솔에는 이 예외가 있었습니다.

```text
Illegal hls.js config: "liveMaxLatencyDurationCount" must be greater than "liveSyncDurationCount"
```

페이지는 되감은 사이 플레이어가 스스로 라이브 끝으로 당기지 않게 하려고 `liveMaxLatencyDurationCount: 1e9`만 줬습니다. hls.js 문서는 이 값이 `liveSyncDurationCount`(기본 3)보다 커야 한다고만 적습니다([API.md](https://github.com/video-dev/hls.js/blob/v1.6.16/docs/API.md#livemaxlatencydurationcount)). 1e9는 기본값 3보다 크니 문서만 보면 통과할 것 같습니다. 하지만 1.6.16의 설정 병합은 사용자 설정에 `liveSyncDurationCount`가 함께 없으면 값과 상관없이 예외를 던집니다([config.ts 636–645행](https://github.com/video-dev/hls.js/blob/v1.6.16/src/config.ts#L636-L645)).

```ts
// 발췌. hls.js v1.6.16 src/config.ts mergeConfig()
if (
  userConfig.liveMaxLatencyDurationCount !== undefined &&
  (userConfig.liveSyncDurationCount === undefined ||
    userConfig.liveMaxLatencyDurationCount <= userConfig.liveSyncDurationCount)
) {
  throw new Error('Illegal hls.js config: "liveMaxLatencyDurationCount" must be greater than "liveSyncDurationCount"');
}
```

생성자 `new Hls()`가 이 병합을 부르므로([hls.ts 182–192행](https://github.com/video-dev/hls.js/blob/v1.6.16/src/hls.ts#L182-L192)) 플레이어 객체가 만들어지지 않았습니다. 객체가 없으니 `Hls.Events.ERROR`도 오지 않았고, 미디어 요청이 200이어도 재생은 시작될 수 없었습니다. `liveSyncDurationCount: 3`을 짝으로 넣자 바로 재생됐습니다.

11월에 저장소에 남은 처음 페이지를 다시 읽어 보니 이 설정은 처음부터 들어 있었습니다([player.html 181–185행](https://github.com/3K-PokeClip/PokeClip-mono/blob/3d6c117a6b6702592733f717e6efed14b90c416d/infra/dev-media/player.html#L181-L185)). 그 페이지는 스크립트 로드 실패와 생성자 예외를 같은 `catch`에서 받아 같은 「hls.js 를 불러오지 못했습니다」를 띄웠습니다([200–208행](https://github.com/3K-PokeClip/PokeClip-mono/blob/3d6c117a6b6702592733f717e6efed14b90c416d/infra/dev-media/player.html#L200-L208)). 그리고 MediaMTX 1.19.3은 함께 묶은 hls.js 1.6.16을 인증보다 먼저 200으로 내줍니다([http_server.go 160–165행](https://github.com/bluenviron/mediamtx/blob/v1.19.3/internal/servers/hls/http_server.go#L160-L165), [VERSION](https://github.com/bluenviron/mediamtx/blob/v1.19.3/internal/servers/hls/hlsjsdownloader/VERSION)). 그래서 첫 문구가 실제 로드 실패였는지, 같은 설정 예외가 그 문구로 보였던 것인지는 기록만으로 가를 수 없습니다. 어느 쪽이었든 처음 페이지는 hls.js가 제대로 로드됐더라도 이 설정 때문에 재생될 수 없었습니다. PR #92 본문은 동봉본이 실측에서 실패했다고 적었지만, 이 대조로 보면 그 판단은 다시 볼 여지가 있습니다.

## 재생과 되감기를 확인하고, 서버에서 고친 설정을 저장소로 옮겼습니다 {#재생과-되감기를-확인한-뒤-서버-변경도-남겼습니다}

17시 10분경 브라우저에서 재생, 시크바, 되감기 카운터가 동작했습니다. 목록과 조각도 다시 봤습니다.

| 항목 | 관측값 | 비고 |
|---|---|---|
| 조각 길이 | 4.00000초 | 설정 4초, 키프레임 2초로 맞춘 뒤 |
| 키프레임을 맞추기 전 조각 길이 | 4.87–6초 | 설정 4초를 넘어 흔들림 |
| PART-TARGET | 0.5초 | 설정 500ms 그대로 |
| 되감기 | 시크바·카운터 동작 | 25분 넘게 쌓인 구간 이동은 따로 재지 않음 |

gohlslib은 설정한 조각 길이가 지난 뒤 처음 오는 키프레임에서 조각을 자릅니다([muxer_segmenter.go 576–579행](https://github.com/bluenviron/gohlslib/blob/v2.4.1/muxer_segmenter.go#L576-L579)). 4초가 키프레임 간격으로 나누어떨어지지 않으면 조각이 4초를 넘어 흔들리고, 키프레임을 2초로 맞추자 4.00000초로 고정됐습니다.

서버에서 직접 고친 파일은 셋이었습니다. 플레이어 페이지를 다시 썼고, nginx가 `/hls.min.js`를 캐시 없이 직접 내주게 했고, compose 파일에서 hls.js 파일 마운트를 켰습니다. 서버에만 있는 수정은 다음 배포에서 사라지므로, 같은 날 [PR #92](https://github.com/3K-PokeClip/PokeClip-mono/pull/92)로 저장소에 옮겼고 17시 19분 develop에 머지됐습니다. 고친 페이지는 `liveSyncDurationCount: 3`을 함께 줍니다([player.html 36행](https://github.com/3K-PokeClip/PokeClip-mono/blob/98e573406158b55ebf1425ca4a0e724bf0501dd5/infra/dev-media/player.html#L36)).

hls.js 파일 자체는 저장소에 넣지 않고 배포 절차의 내려받기 단계로 두었습니다. 그 단계는 `hls.js@1`로 받아 판을 1.6.16에 고정하지 않습니다([RUNBOOK.md 226행](https://github.com/3K-PokeClip/PokeClip-mono/blob/98e573406158b55ebf1425ca4a0e724bf0501dd5/infra/dev-media/RUNBOOK.md?plain=1#L226)). 다시 배포하면 다른 1.x가 올 수 있습니다.

## 화면이 침묵하면 단계마다 통과 증거를 따로 남기십시오

- 오류 문구가 사라진 것은 원인이 사라졌다는 뜻이 아닙니다. 설정을 바꿔 오류가 0건이 되면, 그 설정이 검사 자체를 건너뛰게 하지 않는지 소스에서 확인하십시오. 이번에는 baseline이 POC 유형 2로 이어져 재정렬 검사를 꺼 버릴 수 있었습니다.
- 다른 원인이 같은 문구로 보일 수 있습니다. 스크립트 로드 실패와 생성자 예외를 한 `catch`로 받으면 둘이 구분되지 않습니다. 오류 처리를 단계마다 나누십시오.
- 401·404가 보이면 그 주소를 실제 플레이어가 요청하는지 먼저 보십시오. hls.js는 `EXT-X-GAP` 항목을 받지 않습니다. 브라우저 네트워크 탭에 없는 요청은 화면을 막지 않습니다.
- 서버 체인이 전부 200인데 화면이 조용하면 페이지의 JavaScript 콘솔부터 여십시오. hls.js의 설정 검사 예외는 생성자에서 나므로 오류 이벤트로 오지 않습니다. 문서의 설명과 실제 검사 조건이 다를 수 있으니, 라이브 동기화 옵션은 짝으로 함께 주십시오.
- 서버에서 직접 고친 것은 그날 저장소로 옮기십시오. 내려받는 라이브러리는 판까지 고정하십시오.

## 측정 조건

- 2026년 8월 18일, 멘토 데모용 임시 서버 한 대. Docker Compose로 MediaMTX 1.19.3(`bluenviron/mediamtx:1.19.3`)과 nginx를 띄웠습니다. MediaMTX 설정은 LL-HLS, 조각 4초, 파트 500ms, 창 900조각, 시청자가 없어도 변환(`hlsAlwaysRemux`)이었습니다([설정 틀](https://github.com/3K-PokeClip/PokeClip-mono/blob/98e573406158b55ebf1425ca4a0e724bf0501dd5/infra/dev-media/mediamtx.demo.yml.tmpl#L27-L34)).
- 송출은 작성자 PC의 OBS에서 SRT로 했습니다. 인코더 종류, 바꾸기 전의 B-frame 수와 키프레임 간격, 확인에 쓴 브라우저의 종류와 판은 기록에 없습니다.
- 근거는 당일 팀 내부 트러블슈팅 기록(비공개)이고, 공개 요약은 PR #92 본문입니다. 조치와 관측을 순서대로 대조한 진단이며, 설정을 하나씩 바꾼 A/B 실험이나 반복 측정이 아닙니다.
- 기록에는 시간대 표기가 없습니다. 서버 구성 커밋(13:33 KST), PR #92 생성(17:15 KST)과 본문의 「17:10경」에 맞춰 UTC로 판단하고 한국 시각으로 옮겼습니다.
- 11월 소스 대조는 2026년 11월 11일에 태그 판(mediamtx v1.19.3, mediacommon v2.9.2, gohlslib v2.4.1, hls.js v1.6.16)과 x264 커밋 0480cb05(2025-09-10)를 읽었습니다. 8월 18일의 OBS에 묶인 x264 판은 확인하지 않았고, 소스 대조 결과를 실행해 재현하지도 않았습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #92](https://github.com/3K-PokeClip/PokeClip-mono/pull/92) — 서버에서 고친 재생 페이지·nginx·compose를 저장소로 옮긴 PR(2026-08-18 develop 머지)
- [PokeClip-mono 처음 재생 페이지 `player.html`(3d6c117)](https://github.com/3K-PokeClip/PokeClip-mono/blob/3d6c117a6b6702592733f717e6efed14b90c416d/infra/dev-media/player.html#L181-L208) — `liveMaxLatencyDurationCount`만 준 설정, 로드 실패와 생성자 예외를 같은 문구로 받는 `catch`
- [PokeClip-mono 고친 `player.html`(98e5734)](https://github.com/3K-PokeClip/PokeClip-mono/blob/98e573406158b55ebf1425ca4a0e724bf0501dd5/infra/dev-media/player.html#L36) — `liveSyncDurationCount: 3` 짝
- [PokeClip-mono `RUNBOOK.md`(98e5734) 226행](https://github.com/3K-PokeClip/PokeClip-mono/blob/98e573406158b55ebf1425ca4a0e724bf0501dd5/infra/dev-media/RUNBOOK.md?plain=1#L226) — hls.js 내려받기 단계
- [PokeClip-mono `mediamtx.demo.yml.tmpl`(98e5734)](https://github.com/3K-PokeClip/PokeClip-mono/blob/98e573406158b55ebf1425ca4a0e724bf0501dd5/infra/dev-media/mediamtx.demo.yml.tmpl#L27-L34) — 데모 서버의 LL-HLS 설정
- [bluenviron/mediamtx v1.19.3 `go.mod`](https://github.com/bluenviron/mediamtx/blob/v1.19.3/go.mod#L13-L16) — gohlslib v2.4.1, mediacommon v2.9.2
- [bluenviron/mediamtx v1.19.3 `internal/protocols/hls/from_stream.go`](https://github.com/bluenviron/mediamtx/blob/v1.19.3/internal/protocols/hls/from_stream.go#L193-L200) — 영상 단위마다 `WriteH264`, 실패하면 `muxer error:`
- [bluenviron/mediamtx v1.19.3 `internal/core/core.go`](https://github.com/bluenviron/mediamtx/blob/v1.19.3/internal/core/core.go#L948-L970) — `hlsSegmentCount`가 바뀌면 HLS 서버를 새로 띄움
- [bluenviron/mediamtx v1.19.3 `internal/servers/hls/http_server.go`](https://github.com/bluenviron/mediamtx/blob/v1.19.3/internal/servers/hls/http_server.go#L160-L165) — 동봉 hls.js를 인증 전에 내줌(동봉 판 [`VERSION`](https://github.com/bluenviron/mediamtx/blob/v1.19.3/internal/servers/hls/hlsjsdownloader/VERSION) v1.6.16)
- [bluenviron/mediacommon v2.9.2 `pkg/codecs/h264/dts_extractor.go`](https://github.com/bluenviron/mediacommon/blob/v2.9.2/pkg/codecs/h264/dts_extractor.go#L154-L156) — POC 유형 2이면 검사 없이 DTS = PTS, `maxReorderedFrames = 10`
- [bluenviron/gohlslib v2.4.1 `muxer_segmenter.go`](https://github.com/bluenviron/gohlslib/blob/v2.4.1/muxer_segmenter.go#L315-L318) — DTS 추출 뒤 조각·파트 자르기([576–590행](https://github.com/bluenviron/gohlslib/blob/v2.4.1/muxer_segmenter.go#L576-L590))
- [bluenviron/gohlslib v2.4.1 `muxer_stream.go`](https://github.com/bluenviron/gohlslib/blob/v2.4.1/muxer_stream.go#L809-L816) — muxer 시작 때 GAP 7개
- [x264 `encoder/set.c`(0480cb05)](https://code.videolan.org/videolan/x264/-/blob/0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee/encoder/set.c#L173) — B-frame이 없으면 POC 유형 2
- [x264 `common/base.c`(0480cb05)](https://code.videolan.org/videolan/x264/-/blob/0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee/common/base.c#L788-794) — baseline 프로파일이면 B-frame 0
- [video-dev/hls.js v1.6.16 `src/config.ts`](https://github.com/video-dev/hls.js/blob/v1.6.16/src/config.ts#L636-L645) — `liveSyncDurationCount` 없이 `liveMaxLatencyDurationCount`만 주면 예외
- [video-dev/hls.js v1.6.16 `src/hls.ts`](https://github.com/video-dev/hls.js/blob/v1.6.16/src/hls.ts#L182-L192) — 생성자에서 설정 병합
- [video-dev/hls.js v1.6.16 API 문서 `liveMaxLatencyDurationCount`](https://github.com/video-dev/hls.js/blob/v1.6.16/docs/API.md#livemaxlatencydurationcount) — 두 옵션의 관계
- [video-dev/hls.js v1.6.16 `src/loader/fragment-loader.ts`](https://github.com/video-dev/hls.js/blob/v1.6.16/src/loader/fragment-loader.ts#L71-L74) — `EXT-X-GAP` 조각은 요청하지 않음
- [SRT latency를 3초로 올린 이유는 늦은 재전송이었습니다](/posts/projects/pokeclip-srt-latency-late-retransmission/) — 프레임 제거 재현(괄호 안 11–13), 11월 시험 방송의 송출 설정

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 10쪽](/portfolio/2026-10-15-v2/full.pdf#page=10)
