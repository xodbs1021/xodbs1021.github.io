---
title: "Chrome에서만 멈춘 녹화 조각, 결함은 원본에 있었습니다"
date: "2026-11-11T01:13:27+09:00"
lastmod: "2026-11-11T05:10:38+09:00"
description: "회차 다시보기를 검증하다 운영 녹화 조각 하나에서 Chrome 재생이 멈췄습니다. 끊김 표시·헤드리스·우리 재포장 가설을 차례로 지우고 녹화 원본의 프레임 결손에 닿은 과정과, 오류 알림 없이 굳던 웹 플레이어를 다음 조각으로 넘겨 잇는 실험."
categories: ["projects"]
tags: ["HLS", "hls.js", "H.264", "MediaMTX", "Chrome", "디버깅"]
draft: false
---

11월 7일, 운영 환경에서 녹화한 시험 방송으로 다시보기 재생을 재던 중 조각 1624에서 Chrome 계열 브라우저만 재생이 멈췄습니다. 처음에는 새로 넣은 재생 목록의 끊김 표시나 우리 재포장 코드를 의심했습니다. 하지만 녹화 서버(MediaMTX)가 남긴 원본 조각에 이미 참조 프레임이 빠져 있었고, 원본과 우리 재포장본은 영상 표본 172개가 바이트까지 같았습니다. 같은 방송의 녹화기 오류 `too many reordered frames` 12건은 녹화기 교체 12건과 수가 맞았습니다. 우리 웹 플레이어는 이 조각에서 오류 알림 없이 7번 모두 굳었고, 매체를 다시 붙인 뒤 다음 조각 시작으로 옮기자 4번 모두 이어졌습니다. 대신 결함 조각의 나머지 약 5.4초를 건너뜁니다.

저는 PokeClip 팀에서 이 조사를 어디까지 할지와 고칠 방향을 정했습니다. 운영 미디어 서버의 로그는 AI의 원격 실행이 자동 모드 분류기에 막혀 제가 읽기 전용으로 직접 실행해 받았습니다. 실험 설계·실행·분석과 PR 본문 작성은 AI(Claude Code 오케스트레이터와 하위 에이전트)가, PR 리뷰는 커밋마다 Claude Code와 Codex가 동시에 했습니다. 검증하던 회차 다시보기 고침([PR #492](https://github.com/3K-PokeClip/PokeClip-mono/pull/492))은 11월 10일 운영 미디어 서버에 반영했고, 운영에서 다시보기 재생까지 확인했습니다. 웹 플레이어 처리는 실험으로 확인한 제안이라 아직 저장소에 없습니다.

## 회차 다시보기를 재다 조각 1624에서 Chrome만 멈췄습니다

PokeClip은 OBS가 SRT로 보낸 방송을 MediaMTX가 받아 약 4초 단위 fMP4 조각으로 녹화합니다. 우리 Go 서비스는 이 녹화 원본(②)을 다시보기용 조각(③)과 HLS 재생 목록으로 다시 포장합니다. 11월 4일 운영 환경에서 송출한 약 2시간짜리 시험 방송은 중간에 조각 길이가 목록의 상한을 넘으면서 재생 목록이 둘로 갈렸고, 다시보기에서 끝의 7.5분만 보였습니다. PR #492는 둘을 회차 문서 하나로 묶고, 경계에 `#EXT-X-DISCONTINUITY`(여기부터 시간축이 이어지지 않는다는 HLS 표시)를 답니다.

이 고침을 검증하려고 운영 조각으로 만든 목록을 세 브라우저(Chromium 158, Chrome 157, WebKit 27.2)와 hls.js 1.7.3·1.7.4로 틀었습니다. 1620번부터 시작한 목록에서 Chromium과 Chrome은 1624 시작 뒤 0.52초 자리에서 굳었고, 4배속·1배속·자동 재개 모두 같은 자리였습니다. WebKit은 42조각을 끝까지 지나갔습니다.

의심할 곳은 셋이었습니다. 새로 단 끊김 표시, 실제 사용자와 다를 수 있는 헤드리스 브라우저, 그리고 우리 재포장 코드입니다. 그림 1에서 영상이 위에서 아래로 지나는 길과, 가설마다 어느 자리에서 기각했는지를 보면 됩니다.

```mermaid {#fig-path kind="개념도" caption="영상이 송출에서 Chrome 복호기까지 지나는 길과 가설을 기각한 자리. 녹화 원본(②)에 결함이 이미 있었으므로 남은 후보는 그 앞 구간입니다." source="https://github.com/3K-PokeClip/PokeClip-mono/pull/492"}
flowchart TB
  accTitle: 결함 위치를 좁힌 경로
  accDescr: OBS 송출이 SRT로 MediaMTX 녹화기에 닿아 녹화 원본 조각이 되고, Go 재포장이 다시보기 조각과 재생 목록을 만들어 hls.js를 거쳐 Chrome 복호기로 간다. 재생 목록의 끊김 표시, hls.js, 헤드리스 Chrome, Go 재포장에서 각각 가설을 기각했고, 녹화 원본에 결함이 이미 있었다.
  obs[OBS 송출 → SRT<br/>남은 후보] --> rec[MediaMTX 녹화기<br/>② 녹화 원본<br/>결함이 이미 있음]
  rec --> rp[Go 재포장 ③<br/>기각: ②와 표본<br/>172/172 같음]
  rp --> pl[재생 목록 끊김 표시<br/>기각: 있음·없음<br/>같은 자리에서 멈춤]
  pl --> hj[hls.js<br/>기각: 빼도 같은 자리]
  hj --> ch[Chrome 복호기<br/>기각: 헤드리스만의 현상 아님<br/>화면 있는 Chrome도 6/6]
  style rec fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

아래쪽 네 칸을 지우고 나면 남는 곳은 녹화 원본이 만들어지기 전, 곧 송출·전송·녹화기 구간입니다.

## 끊김 표시를 빼도 같은 자리에서 멈췄습니다

1624는 경계(1627)보다 앞이라, 끊김 표시가 있는 목록과 없는 목록은 그 자리까지 바이트가 같습니다. 브라우저 둘(Chromium·Chrome), hls.js 두 판, 목록 둘로 8번 틀자 모두 같은 자리에서 멈췄고, 멈춘 위치의 차이는 15ms 안이었습니다. hls.js를 빼고 브라우저 기본 HLS로 틀어도 Chromium과 Chrome은 같은 자리에서 `PIPELINE_ERROR_DECODE: video decode error!`(MediaError code 3)를 냈습니다. WebKit은 두 목록 모두 지나갔습니다.

조각을 ffmpeg로 풀어 보니 1624에서만 오류가 났습니다. 앞뒤 조각 1623과 1625는 오류 줄이 0이었습니다.

```text
# 발췌. ffmpeg -hide_banner -v error -i <조각 1624> -map 0:v:0 -f null -
[h264] co located POCs unavailable
[h264] co located POCs unavailable
[h264] mmco: unref short failure
```

POC(Picture Order Count)는 H.264 프레임마다 붙는 표시 순서 번호입니다. 위 두 문구는 복호기가 참조해야 할 프레임을 비트스트림에서 찾지 못했다는 뜻입니다. 끊김 표시가 아니라 조각 안의 영상이 문제였습니다.

## 화면 있는 Chrome의 하드웨어 복호기도 6번 모두 멈췄습니다

헤드리스 브라우저는 실제 사용자와 복호 경로가 다를 수 있습니다. 그래서 macOS의 일반 Chrome 157을 창을 띄운 채로 열고, 개발자 도구 프로토콜(CDP)의 `Media` 사건에서 복호기 이름을 받았습니다. `chrome://gpu`는 H.264 하드웨어 복호를 켜 둔 상태였습니다.

hls.js로 3번, 기본 HLS로 3번 틀었고 6번 모두 1624 시작 뒤 0.39–0.40초에서 멈췄습니다. 복호기는 매번 macOS 하드웨어 복호기인 `VideoToolboxVideoDecoder`였고, 같은 `PIPELINE_ERROR_DECODE`로 끝났습니다. 뒤에 재 본 헤드리스 Chrome도 같은 하드웨어 복호기를 썼습니다. 이 조각을 macOS Chrome으로 재생하면 같은 자리에서 멈춘다는 뜻입니다(이 기계와 이 판 기준). WebKit은 오류를 감추고 지나갔고, ffmpeg도 오류 줄만 남기고 끝까지 풀었습니다.

## 녹화 원본과 재포장본의 영상 표본 172개가 모두 같았습니다

남은 질문은 결함을 우리 재포장(③)이 만들었는지, 녹화 원본(②)에 이미 있었는지였습니다. 같은 객체 저장소에서 ② 조각을 읽기 전용으로 받아 1623–1625를 ③과 나란히 풀었습니다. ②는 MediaMTX가 쓴 그대로의 조각이고, ③은 우리 코드가 영상·소리 트랙을 골라 다시 담은 조각입니다.

| 조각 | 영상 프레임(② / ③) | 오류 줄(② / ③) | 영상 표본 일치 |
|---|---|---|---|
| 1623 | 120 / 120 | 0 / 0 | 120/120 |
| 1624 | 172 / 172 | 3 / 3 | 172/172 |
| 1625 | 120 / 120 | 0 / 0 | 120/120 |

②는 영상 하나와 소리 여섯, ③은 영상 하나와 소리 하나를 담아 파일 크기는 다릅니다(1624 기준 4.91MB와 4.42MB). `ffmpeg -map 0:v:0 -c copy -f framemd5`로 영상 패킷마다 크기와 MD5를 뽑아 견주자 1624의 172개가 모두 일치했고, SPS·PPS(복호 설정을 담은 머리 정보)도 같았습니다. 오류 줄도 ②와 ③이 같은 세 줄이었습니다. 우리 재포장은 영상 표본을 바이트 그대로 옮겼고, 결함은 ②가 만들어지기 전에 생겼습니다.

1624는 모양도 달랐습니다. 다른 조각은 4초에 120프레임인데 1624는 약 6초에 172프레임이었습니다.

## 녹화 원본 1,734조각을 훑자 결함은 녹화기 교체 근처에 몰려 있었습니다

1624 하나만으로는 우연인지 알 수 없어 같은 스트림 경로의 녹화 원본을 모두 훑었습니다. 11월 3–4일의 시험 방송 세 번이 남긴 1,734조각입니다. 대조군으로 11월 6일 다른 스트림의 240조각도 같이 봤습니다.

방법은 이렇습니다. 조각마다 앞 8KB만 범위 요청으로 받아, MediaMTX가 조각 머리에 남기는 녹화기 표식과 누적 디코드 시각(DTS)을 읽었습니다. 다음 조각과의 DTS 차이로 길이를 셌습니다. DTS가 줄어들면 새 연결이고, DTS는 이어지는데 녹화기 표식만 바뀌면 같은 연결 안에서 녹화기가 새로 시작한 「교체」입니다. 길이가 4±0.1초를 벗어난 조각 전부와 정상 조각 표본은 통째로 받아 ffmpeg로 풀었습니다.

| 항목 | 11월 3–4일 방송 경로 | 11월 6일 다른 스트림 |
|---|---|---|
| 조각 | 1,734 | 240 |
| 같은 연결 안 녹화기 교체 | 12 | 0 |
| 길이가 4±0.1초를 벗어난 조각 | 155 | 0 |
| 그 가운데 복호 오류 | 21 | — |
| 정상 길이 표본의 복호 오류 | 0/38 | 0/24 |

교체 12번은 모두 11월 4일 방송 안에서 일어났습니다. 교체마다 2.03–2.46초가 녹화되지 않았고, 교체 바로 앞 조각 12개 가운데 11개에 복호 오류가 있었습니다. 교체 뒤 첫 조각은 12개 모두 깨끗했습니다. 나머지 오류 조각 10개는 교체 바로 앞이 아니었고, 1624가 그중 하나입니다. 1624는 1623의 교체 직후 둘째 조각이었습니다. 이 10개에서도 `Missing reference picture`처럼 참조 프레임이 없다는 문구가 나왔습니다.

복호 오류는 길이가 어긋난 조각에서만 나왔고 정상 길이 표본에서는 나오지 않았습니다. 녹화기가 같은 연결 안에서 거듭 새로 시작한 쪽에만 결함이 있었습니다. 녹화기에 닿기 전, 송출·전송·수신 구간에서 프레임이 이미 빠지고 있었던 것으로 보입니다.

## 운영 서버 로그의 녹화기 오류 12건이 교체 12건과 맞았습니다

처음에는 교체 원인을 시계 어긋남으로 추정했습니다. MediaMTX 녹화기는 영상 시각과 벽시계가 5초 넘게 벌어지면 새로 시작하기 때문입니다([recorder.go 13행](https://github.com/bluenviron/mediamtx/blob/v1.21.1/internal/recorder/recorder.go#L13)). 이 추정은 틀렸습니다. 운영 미디어 서버의 시스템 로그(한국 시각 11월 3일 새벽부터 보존)에는 시계 어긋남이나 늦은 표본 버림 줄이 0이었고, 대신 녹화기 오류가 12건 있었습니다. 시각은 11월 4일 12시 26분부터 14시 9분 사이였고, 괄호 안 수는 11–15였습니다.

```text
# 발췌. 경로 이름은 가렸습니다
ERR [path <stream>] [recorder] too many reordered frames (13)
```

우리가 쓰는 MediaMTX(v1.21.1 기반 판)는 mediacommon v2.9.5를 쓰고, 그 DTS 추출기는 프레임마다 POC가 일정한 폭으로 늘어난다고 보고 다음 POC를 예상합니다([dts_extractor.go](https://github.com/bluenviron/mediacommon/blob/v2.9.5/pkg/codecs/h264/dts_extractor.go)). 실제 POC가 예상에서 벗어나면 그만큼을 순서가 바뀐 프레임으로 세고, 그 수가 `maxReorderedFrames = 10`을 넘으면 이 오류를 냅니다. 프레임이 여러 장 빠져도 POC가 크게 뛰므로 같은 오류가 납니다. 상류에는 프레임 손실 때의 추출을 고치거나 추출 오류 뒤에도 이어 가려는 PR이 열려 있습니다([mediacommon #394](https://github.com/bluenviron/mediacommon/pull/394), [mediamtx #5714](https://github.com/bluenviron/mediamtx/pull/5714)). 녹화기는 인스턴스가 오류로 끝나면 2초를 쉬고 새 인스턴스를 띄웁니다([recorder.go](https://github.com/bluenviron/mediamtx/blob/v1.21.1/internal/recorder/recorder.go#L89-L104)). 교체마다 약 2초가 빈 것과 크기가 맞습니다.

같은 문구는 [지난 글](/posts/0-to-1/pokeclip-black-screen-three-causes/)에서 HLS muxer도 낸 적이 있습니다. 그때는 B-frame 없는 baseline으로 바꾸자 오류가 사라졌지만, 그 설정은 DTS 추출기의 재정렬 검사 자체를 건너뛰게 해서 원인을 가려 주지 못했습니다. 이번에는 녹화기(`[recorder]`)가 낸 오류이고, 프레임이 빠져 POC가 뛴 경로입니다. 같은 문구라도 어느 구성 요소가 냈는지, 그 앞에서 프레임이 빠졌는지를 따로 봐야 합니다.

1624처럼 교체를 일으키지 않은 결함은 빠진 프레임이 기준 10을 넘지 않았던 경우로 보입니다. 조각마다 빠진 프레임 수를 세지는 않아 추정입니다.

## 우리 웹 플레이어는 오류 알림 없이 마지막 프레임에서 굳었습니다

시청자가 실제로 무엇을 보는지도 확인했습니다. 우리 웹 플레이어의 재생 훅은 hls.js가 `Events.ERROR`로 치명적 매체 오류를 올릴 때만 복구합니다. 첫 번은 `recoverMediaError()`를 부르고, 그다음은 「영상이 끊겼어요」 덮개를 띄웁니다. `<video>` 요소의 `error`는 Safari 기본 재생 갈래에서만 듣습니다.

저장소의 훅을 고치지 않고 그대로 묶어 같은 조각 목록을 틀었습니다. Chrome 157에서 창을 띄운 실행 3번, 헤드리스 4번 모두 1624 시작 뒤 0.39–0.41초에서 멈췄습니다. `video.error`는 code 3이었지만 hls.js는 이 오류를 `ERROR` 사건으로 올리지 않았습니다. 훅의 복구 갈래가 열리지 않았고 덮개도 뜨지 않았습니다. 재생 단추를 누르면 훅은 「재생 중」이 되는데 프레임 수는 그대로였습니다. 시청자에게는 버튼이 재생 중인데 화면만 굳은 상태입니다. WebKit은 지나갔습니다.

hls.js 문서는 `recoverMediaError()`를 매체 요소가 오류 상태일 때 쓰라고 하고, 예제도 `<video>`의 `error`에서 `MEDIA_ERR_DECODE`를 직접 듣습니다([API.md](https://github.com/video-dev/hls.js/blob/v1.7.3/docs/API.md#hlsrecovermediaerror)). 우리 훅은 이 경로를 듣지 않았습니다.

## 매체를 다시 붙인 뒤 다음 조각 시작으로 옮겨야 이어졌습니다

사람이 넘기는 경우와 매체를 다시 붙이는 경우를 갈래마다 Chrome 창 실행 2번, 헤드리스 2번씩 돌렸습니다(A는 세 자리마다). 「이어짐」은 옮긴 뒤 15초 가운데 마지막 3초 동안 재생 위치와 프레임 수가 함께 늘어난 경우입니다. 영상에서 세 줄의 재생점이 빨간 결함 조각을 만난 뒤 어디로 가는지 보면 됩니다.

{{< motion scene="DecodeRecovery" id="fig-recovery" kind="개념도" caption="그대로 두면 오류 자리에서 굳고, recoverMediaError()만 부르면 같은 자리를 다시 풀다 상한을 넘겨 덮개로 끝납니다. 다시 붙인 뒤 다음 조각 시작으로 옮기면 1624의 나머지 약 5.4초를 건너뛰고 이어집니다." >}}

| 처리 | 이어짐 | 끝 상태 |
|---|---|---|
| A. 위치만 옮김(세 자리) | 0/12 | 프레임이 늘지 않고 오류 상태 그대로 |
| B1. `recoverMediaError()`만 | 0/4 | 같은 자리 오류 4번, 상한을 넘겨 끊김 덮개 |
| B2. B1 뒤 다음 조각 시작으로 시크 | 4/4 | 60–215ms 뒤 재생, 5.4–5.5초 건너뜀 |
| B3. B1 뒤 `startLoad(다음 조각 시작)` | 0/4 | hls.js 내부 호출에 덮여 B1과 같음 |

A는 훅을 그대로 두고, 오류 2초 뒤 `currentTime`을 1624 둘째 키프레임 근처, 1625 안, 1626 시작으로 옮겨 본 경우입니다. B는 `<video>`의 복호 오류를 듣는 처리를 붙이고 다시 붙이기 상한을 3회로 둔 경우입니다. B3에서는 우리가 부른 `startLoad`를 1ms 뒤 hls.js 내부 호출이 1624 키프레임 자리로 덮어썼습니다.

오류가 난 `<video>`는 위치만 옮겨서는 살아나지 않았습니다. `recoverMediaError()`는 MediaSource를 새로 만들고 마지막 재생 위치에서 다시 받습니다. 그래서 1624의 첫 키프레임부터 같은 결함을 다시 풀었고, 상한이 없었다면 약 350ms 간격으로 끝없이 되풀이됐을 것입니다. B2만 이어졌습니다. 이어진 뒤 15초 동안 위치가 14.7–14.8초 늘었고, 그 뒤 1627의 끊김 표시 경계도 지나갔습니다. hls.js 1.7.3에서는 다음 키프레임이나 다음 조각으로 건너뛰는 API를 찾지 못해, 위치를 직접 옮겼습니다.

```ts
// 발췌·단순화. 실험 사본의 처리이며 저장소에는 아직 없습니다(hls.js 1.7.3)
video.addEventListener('error', () => {
  if (video.error?.code !== MediaError.MEDIA_ERR_DECODE) return;
  if (++decodeRecoveries > MAX_DECODE_RECOVERIES) return stopAsBroken(); // 상한 3회
  const at = video.currentTime;
  const frag = hls.latestLevelDetails?.fragments
    .find((f) => f.start <= at && at < f.start + f.duration);
  hls.recoverMediaError();
  if (frag) video.currentTime = frag.start + frag.duration; // 다음 조각 시작
});
```

B2는 순서에 기댑니다. `recoverMediaError()` 바로 뒤 같은 처리기 안에서 위치를 옮기면, hls.js가 이어서 안에서 부르는 `startLoad(37.17…)`보다 새 위치로의 시크가 이겼습니다. hls.js 1.7.3에서 잰 순서라 판을 올리면 다시 재야 합니다. 횟수 상한도 필요합니다. 다음 조각마저 결함이면 건너뛰기가 연달아 일어날 수 있습니다.

## 한 브라우저에서만 멈추면 조각 바이트부터 대조해 보십시오

- 특정 브라우저에서만 멈추면 플레이어 코드보다 조각을 먼저 의심할 만합니다. `ffmpeg -v error`로 풀어 오류 줄을 세고, 원본과 재포장본은 `framemd5`로 영상 패킷을 견주면 결함이 어느 단계에서 생겼는지 갈립니다. WebKit은 이번 결함을 감추고 지나갔으므로, 한 브라우저에서 재생된다고 조각이 멀쩡하다고 볼 수 없습니다.
- 같은 오류 문구라도 로그의 구성 요소 꼬리표를 확인하십시오. 이번 `too many reordered frames`는 HLS muxer가 아니라 녹화기가 냈고, 원인도 인코딩 설정이 아니라 빠진 프레임이었습니다.
- hls.js를 쓴다면 `<video>`의 `MEDIA_ERR_DECODE`를 직접 들어야 합니다. 이번 결함에서 hls.js는 `ERROR` 사건을 올리지 않았습니다. 다시 붙이기만으로는 같은 결함을 다시 푸니, 결함 자리를 넘기는 처리와 횟수 상한을 함께 두십시오.

## 웹 처리는 아직 제안이고, 프레임이 빠진 자리는 따로 남았습니다

- B2는 실험 사본에서만 확인했고 저장소에 넣지 않았습니다. 실제 웹 앱 전체, 세션 모드의 시크 경로, 라이브와 되감기 재생기, 실제 Safari, 다른 판의 Chrome, 마지막 조각이 결함인 경우는 재지 않았습니다. 1624의 둘째 키프레임(조각 시작 뒤 약 2초)으로 건너뛰면 덜 잃을 수 있지만, 그 뒤 프레임이 온전한지는 확인하지 않았습니다.
- 회차 다시보기 고침(PR #492)은 11월 10일 운영에 반영했습니다. 이미 녹화된 11월 4일 방송의 결함 조각은 그대로 남습니다.
- 녹화기 앞의 어느 구간에서 프레임이 빠졌는지는 여기서 가르지 않았습니다. OBS 플러그인의 SRT 지연 기본값을 1,000ms에서 3,000ms로 올린 변경은 [PR #493](https://github.com/3K-PokeClip/PokeClip-mono/pull/493)으로 들어갔고, 11월 10일 공개한 플러그인 0.2.1 설치본에 담겼습니다. 그 설치본으로 실제 송출한 시험은 아직 하지 않았습니다.

11월 8일 운영 경로로 보낸 시험 방송 세 번에서 같은 결손을 다시 일으킨 과정과 3,000ms를 고른 근거는 [2편](/posts/projects/pokeclip-srt-latency-late-retransmission/)에서 다룹니다.

## 측정 조건

- 모두 팀 내부 실험 기록 기준의 비공개 실측이고, 공개 요약은 PR #492 본문의 「별건」 절에 있습니다. 2026년 11월 7일 오후부터 21시 9분 사이에 실행했습니다.
- 장비는 macOS arm64 노트북 한 대입니다. 브라우저는 Chrome 157.0.8103.38(창 띄움·헤드리스, 하드웨어 복호), Playwright의 Chromium 158.0.8127.18과 WebKit 27.2입니다. hls.js는 1.7.3과 1.7.4를 썼습니다.
- 자극은 11월 4일 운영 시험 방송의 다시보기 조각(1600–1660 범위)과 녹화 원본입니다. 저장소에서 읽기 전용으로 받아 판독 뒤 지웠습니다.
- 웹 플레이어 재현은 저장소의 재생 훅을 고치지 않고 React 19.2.8로 묶어 정적 서버에서 띄웠고, 넘기기·다시 붙이기는 실험 사본에만 처리를 붙였습니다. 실제 웹 앱과 세션 연결은 켜지 않았습니다.
- 녹화 원본 훑기는 1,974조각의 앞 8KB를 읽고, 길이 이상 155개와 정상 표본을 포함한 217조각을 통째로 받아 ffmpeg로 풀었습니다. 조각 사이 빈 시간은 MediaMTX가 조각 머리에 남긴 누적 DTS로 셌습니다.
- 운영 미디어 서버의 시스템 로그는 11월 7일 20시 34분에 작성자가 읽기 전용 명령으로 받았습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #492](https://github.com/3K-PokeClip/PokeClip-mono/pull/492) — 회차 단위 다시보기 고침과 조각 1624 별건 요약(2026-11-09 develop 머지)
- [3K-PokeClip/PokeClip-mono PR #493](https://github.com/3K-PokeClip/PokeClip-mono/pull/493) — OBS 플러그인 SRT 지연 기본값 1,000ms → 3,000ms(2026-11-09 develop 머지)
- [bluenviron/mediacommon v2.9.5 `pkg/codecs/h264/dts_extractor.go`](https://github.com/bluenviron/mediacommon/blob/v2.9.5/pkg/codecs/h264/dts_extractor.go) — `maxReorderedFrames = 10`과 POC 기반 DTS 추출(2026-11-11 확인)
- [bluenviron/mediacommon PR #394](https://github.com/bluenviron/mediacommon/pull/394) — 프레임 손실 때의 DTS 추출 고침 제안(열림)
- [bluenviron/mediamtx PR #5714](https://github.com/bluenviron/mediamtx/pull/5714) — DTS 추출 실패 뒤 끊지 않고 이어 가는 제안(열림)
- [bluenviron/mediamtx v1.21.1 `internal/recorder/recorder.go`](https://github.com/bluenviron/mediamtx/blob/v1.21.1/internal/recorder/recorder.go#L89-L104) — 녹화기 인스턴스가 끝나면 2초 뒤 새로 시작(기본값은 53–54행)
- [video-dev/hls.js v1.7.3 API 문서 `hls.recoverMediaError()`](https://github.com/video-dev/hls.js/blob/v1.7.3/docs/API.md#hlsrecovermediaerror) — 매체 요소 오류에서의 복구와 예제
- [HTTP 200인데 검은 화면, 세 단계를 지나서야 재생됐습니다](/posts/0-to-1/pokeclip-black-screen-three-causes/) — 같은 오류 문구가 HLS muxer에서 난 사례와 baseline 전환이 검사를 건너뛴다는 정정
