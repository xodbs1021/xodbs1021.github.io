---
title: "HLS 라이브와 DVR 목록을 나누자 넘김 조건이 생겼습니다"
date: "2026-10-28T19:22:22+09:00"
lastmod: "2026-11-11T07:57:53+09:00"
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "HLS", "DVR", "LL-HLS", "상태 관리", "매니페스트"]
draft: false
description: "4초 조각 900개 라이브 목록이 1시간 되감기를 겸하던 구조를 라이브 LL-HLS 목록과 장부 기반 S3 되감기 목록으로 나눈 판단, 되감기 끝에서 라이브로 넘기는 조건(같은 회차 · 못 본 녹화를 건너뛰지 않음 · 확인 시한), 넘김 시험에서 드러난 75초 PDT 어긋남, 출시본에 들어간 자동 넘김과 남은 건너뜀 재측정."
---

PokeClip 시청자는 라이브를 보다가 지난 장면으로 돌아가 클립 구간을 고릅니다. 2026년 8월 설계 당시에는 라이브 재생 목록 하나가 4초 조각 900개, 곧 1시간을 담아 되감기를 겸했습니다. 라이브 목록을 줄이면 되감기가 함께 사라지는 구조였습니다. 그래서 라이브는 미디어 서버(MediaMTX)가 내는 LL-HLS 목록으로 두고, 1시간 되감기 목록은 DB 장부를 기준으로 S3에 따로 발행했습니다. 목록이 둘이 되자 되감기 끝에서 라이브로 넘어가는 조건이 필요해졌습니다. 같은 회차이고 아직 못 본 녹화를 건너뛰지 않을 때만 자동으로 넘기기로 했고, 이 자동 넘김은 10월 31일 [PR #460](https://github.com/3K-PokeClip/PokeClip-mono/pull/460)으로 develop에 들어가 11월 3일 v1.0.0 출시본에 포함됐습니다. 다만 넘기는 순간 내용이 1.17–1.50초 앞으로 건너뛰는 문제가 남아, 시간축 개정 뒤 다시 재야 합니다.

저는 라이브와 되감기 목록을 나누는 방향, 자동 넘김을 같은 회차 안으로 좁히는 범위, 넘김을 확인하지 못하면 되감기로 되돌리는 동작, 완료 기준과 재측정 통과선(±250ms)을 정했고 PR을 머지했습니다. 웹 되감기 연동([PR #436](https://github.com/3K-PokeClip/PokeClip-mono/pull/436))과 자동 넘김(PR #460)의 설계 문서, 구현, 실측은 AI(Claude Code와 하위 에이전트)가 했고, 리뷰는 Claude Code와 Codex가 함께 했습니다. 이 글의 10월 28일 판은 웹의 주 구현을 팀원이 맡았다고 적었지만, 두 PR의 구현은 AI가 했습니다. 용어는 [회차 다시보기 글](/posts/projects/pokeclip-round-vod/)을 따릅니다. 조각은 세션(사이드카가 목록 하나를 여닫는 단위)에, 세션은 사슬(계승으로 이어진 세션 묶음)에, 사슬은 회차(시청자가 보는 방송 한 번)에 속합니다. 10월 28일 판의 「같은 방송·다른 방송」은 이 글의 「같은 회차·다른 회차」입니다.

## 900조각 라이브 목록이 1시간 되감기를 겸하고 있었습니다 {#live를-짧게-유지하려면-dvr이-먼저-있어야-했습니다}

DVR(Digital Video Recorder)은 방송 중에 이미 지나간 구간을 되돌려 보는 기능입니다. 설계 당시 라이브 목록은 MediaMTX 설정 `hlsSegmentCount: 900`(4초 × 900 = 1시간)이었고, 웹 플레이어는 이 라이브 주소 하나로 1시간을 탐색했습니다. 라이브 창은 따로 판단해 10월 19일 28초(4초 × 7)로 정했습니다. 창 길이가 LL-HLS 지연을 정하지 않는다는 실측과 그 결정은 [라이브 창 글](/posts/0-to-1/pokeclip-live-window-without-fork/)에 있습니다.

창을 먼저 줄이면 시청자는 지연 이득 없이 되감기만 잃습니다. 그래서 순서를 조건으로 걸었습니다. 되감기 전용 주소가 시청자에게 서비스된 뒤에만 라이브 창을 줄입니다.

| 경로 | 목록을 만드는 곳 | 맡긴 책임 |
|---|---|---|
| 라이브 | MediaMTX | 지금 송출의 LL-HLS 목록과 미디어 |
| 되감기 | Go 사이드카 | DB 장부로 최근 1시간 목록을 만들어 S3에 발행 |
| 편집 원본 | 녹화·업로드 계층 | 오디오 6트랙을 보존해 렌더 계층에 전달 |

되감기 미디어는 영상 1개와 오디오 1개로 다시 포장하고, 편집 원본의 여러 오디오는 따로 보존합니다. 시청 경로를 가볍게 하면서 편집 재료를 잃지 않으려는 구분입니다.

## 라이브는 미디어 서버가, 되감기는 장부로 S3에 발행했습니다 {#목록은-시청자가-읽을-때마다-만들지-않기로-했습니다}

그림 1에서 MediaMTX 아래로 갈라지는 두 갈래를 보면 됩니다. 라이브 갈래는 미디어 서버에서 바로 나가고, 되감기 갈래는 녹화 조각이 사이드카와 DB 장부를 거쳐 S3 목록이 됩니다.

```mermaid {#fig-live-dvr-paths kind="개념도" caption="라이브 목록은 MediaMTX가 내고, 되감기 1시간 목록은 사이드카가 녹화 조각을 DB 장부에 적은 뒤 S3에 발행합니다. 플레이어는 제어면 API에서 지금 볼 되감기 목록 주소를 받습니다. PokeClip-mono media/README.md 「되감기 상태 제어면」과 PR #289 · #436 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L721-L733"}
flowchart TB
  accTitle: 라이브 목록과 되감기 목록의 경로
  accDescr: OBS 송출을 MediaMTX가 받아 라이브 LL-HLS 목록을 내고, 녹화 조각은 사이드카가 DB 장부에 적은 뒤 S3에 되감기 1시간 목록으로 발행해 CDN으로 낸다. 라이브 목록과 되감기 목록이 모두 플레이어로 가고, 사이드카의 제어면 API가 플레이어에 지금 볼 되감기 주소를 알려 준다.
  obs[OBS 송출] --> mtx[MediaMTX]
  mtx --> side[사이드카<br/>제어면 API]
  mtx --> live[라이브<br/>LL-HLS 목록]
  side --> db[(DB 장부)]
  db --> s3[S3 · CDN<br/>되감기 1시간]
  live --> player[플레이어]
  s3 --> player
  side -.->|되감기 주소| player
```

되감기 목록은 시청 요청마다 만들지 않고, 장부 상태가 바뀔 때 발행합니다. 시청 경로가 단순해지는 대신, 늦게 끝난 발행이 새 목록을 덮지 못하게 막는 책임이 쓰기 쪽으로 옵니다. 그 장치(writer fence, 세대 예약, S3 조건부 PUT)와 10월 17일 실제 S3에서 사이드카를 재시작해 본 실험은 [발행 정합성 글](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/)에 있습니다. 발행 층은 10월 19일 [PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289)로, 웹 되감기 기본 연동은 10월 27일 PR #436으로 develop에 머지됐습니다.

## 되감기 끝에서 라이브로 넘기는 조건은 같은 회차와 못 본 녹화였습니다 {#url을-바꾸기-전에-같은-장면인지-확인해야-했습니다}

목록을 나누면 두 목록이 만나는 지점이 생깁니다. 송출이 잠깐 끊기거나 대체 화면이 나오는 동안 녹화를 이어 보면, 1배속으로 봐도 되감기 재생 위치가 라이브 범위에 닿습니다. 이때 재생 소스를 되감기 목록에서 라이브 목록으로 바꾸는 동작을 자동 넘김이라고 부릅니다. 10월 27일 저는 자동 넘김을 같은 회차 안으로 좁혔습니다. 다른 회차, 곧 새 방송은 시청자가 버튼이나 새로고침으로 고르게 했습니다.

조건은 둘입니다. 첫째, 같은 회차여야 합니다. 플레이어는 처음 열 때의 회차 번호를 쥐고 있고([`rewindSwitch.ts` 128–129행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/rewindSwitch.ts#L128-L129)), 제어면이 알려 준 지금 회차가 다르면 넘기지 않고 다른 회차로 표시만 합니다([412행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/rewindSwitch.ts#L412)). 송출이 끊겼다가 돌아온 경우에도 같은 회차일 때만 자동으로 잇습니다([`endingWait.ts` 103–108행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/endingWait.ts#L103-L108)).

둘째, 아직 못 본 녹화를 건너뛰지 않아야 합니다. 되감기 재생 위치를 P, 되감기 목록의 끝을 E, 목록의 목표 길이(TARGETDURATION)를 TD라고 하겠습니다. P가 E 앞 1 × TD 띠 안에 들어오면 플레이어는 라이브 목록을 한 번 받아(2초 시한), 그 목록에서 틀 수 있는 가장 이른 시각인 라이브 시작 하한을 잽니다. 하한이 P 이하일 때만 넘깁니다([`liveHandoff.ts` 298행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/liveHandoff.ts#L298) · [422행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/liveHandoff.ts#L422)). 하한이 P보다 늦으면 그 사이 녹화가 잘리므로 넘기지 않고 「라이브로 가려면 LIVE 를 눌러 주세요」를 한 번 띄웁니다([17–18행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/liveHandoff.ts#L17-L18)).

| 상황 | 정한 동작 |
|---|---|
| 같은 회차의 되감기가 라이브 범위에 닿음 | 라이브 시작 하한이 P 이하면 자동으로 넘김 |
| 같은 회차가 끊겼다가 돌아옴 | 이음점이 새 목록 범위 안이면 자동으로 이음 |
| 다른 회차가 시작됨 | 넘기지 않고 「라이브 보기」 버튼 |
| 라이브 시작 하한이 P보다 늦음 | 넘기지 않고 LIVE 안내 한 번 |
| 라이브 목록을 2초 안에 못 받음 | 넘기지 않음 |
| 넘긴 뒤 확인 실패 | 되감기로 돌아감(멈춰 있었으면 멈춘 채) |
| 앞서 보낸 탐침의 응답이 늦게 옴 | 순번이 다르면 버림 |

목록의 `#EXT-X-ENDLIST`도 재생 완료와 구분했습니다. ENDLIST는 그 목록에 조각이 더 붙지 않는다는 뜻이지, 시청자가 끝까지 봤다는 뜻이 아닙니다([RFC 8216 4.3.3.4](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.3.4)). 목록 종료, 지금 재생 위치, 세션 종료를 따로 봐야 다음 행동을 고를 수 있었습니다.

## 넘김 시험에서 두 목록의 PDT가 75초 어긋나 있었습니다 {#전환-시험에서-먼저-드러난-것은-시간축의-오차였습니다}

「라이브 시작 하한 ≤ P」는 두 목록의 시각이 같은 장면을 같은 값으로 가리킨다는 전제 위에 섭니다. 두 목록은 조각마다 PDT(`EXT-X-PROGRAM-DATE-TIME`, 조각 첫 표본에 붙인 벽시각)를 답니다([RFC 8216 4.3.2.6](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.2.6)). 10월 27일 AI가 로컬 실험대에서 합성 송출 20분째에 같은 프레임을 두 목록에서 찾아 PDT를 견줬습니다. **라이브 PDT − 되감기 PDT의 중앙값은 −75.88초**(22표본, −78.03 ~ −72.98초)였고, 103.5초 동안 초당 48.75ms씩 더 벌어졌습니다. 라이브 목록 끝은 벽시계보다 0.5–3.3초 뒤였지만, 되감기 목록 끝은 벽시계보다 45–47초 앞서 있었습니다.

원인은 장부가 다음 조각의 PDT를 정하는 식에 있었습니다. 식은 `max(앞 PDT + 앞 길이, 벽시계)`였고, 「길이」에는 MP4 머리 상자(mvhd)의 길이, 곧 트랙 가운데 가장 긴 길이가 들어갔습니다. 소리 트랙은 조각마다 영상보다 0.13–0.29초 먼저 시작해 그만큼 길었습니다. 그래서 누적항이 늘 벽시계를 이겼고, PDT는 위로만 쌓였습니다. 조각 안의 실제 미디어 시각(tfdt)은 4.000초 간격으로 정상이었습니다.

되감기의 P가 라이브 축보다 수십 초 앞서면 「하한 ≤ P」는 늘 참이 되어 잘림을 막지 못합니다. 라이브를 P에서 틀면 실제로는 약 75초 뒤 장면부터 나와 녹화 꼬리를 잃습니다. 결함은 넘김 코드가 아니라 장부 시각에 있었습니다. 이 글의 10월 28일 판은 녹화기 시계(mtxi)를 쓰는 방향을 택해 설계 중이라고 적었습니다. 그 뒤 10월 30일에는 장부 길이를 영상 트랙 길이로 바꾸는 계약 개정을 먼저 하기로 했고, 11월 2일에는 클립·렌더의 정밀 좌표를 미디어 시각으로 옮기고 장부 보정을 「섞기」 규칙으로 바꾸기로 했습니다. 그 경과는 [미디어 시간축 글](/posts/projects/pokeclip-media-timeline-over-wall-clock/)에 있습니다. 측정은 ffmpeg 합성 송출이라, OBS 송출에서 소리 머리 폭이 같은지는 확인하지 않았습니다.

## 넘김은 출시본에 들어갔고 건너뜀 재측정이 남았습니다

넘긴 뒤에도 바로 확정하지 않습니다. 확인 시한은 「넘긴 시각 + (E − P) + 2 × TD」입니다([`liveHandoff.ts` 21–22행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/liveHandoff.ts#L21-L22) · [359–370행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/liveHandoff.ts#L359-L370)). 그 안에 라이브가 P 근처에서 이어 재생되면 확정하고, 시한을 넘기면 되감기로 돌아갑니다([556–557행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/liveHandoff.ts#L556-L557)). 돌아갈 때 시청자가 멈춰 있었으면 새 재생기도 멈춘 채 세웁니다. 10월 28일 판의 「10초 확인 게이트」는 설계 단계의 값이고, 머지된 코드는 이 시한 식을 씁니다.

영상에서 재생점 P가 E 앞의 청록 띠에 들어서는 순간과, 넘긴 뒤 시한 막대가 다 차기 전에 이어지는지를 보면 됩니다.

{{< motion scene="LiveHandoff" id="fig-live-handoff" kind="개념도" caption="되감기 재생점 P가 목록 끝 E 앞 1 × TD 띠에 들어서면 라이브 목록의 시작 하한을 재고, 하한이 P 이하일 때만 라이브로 넘깁니다. 넘긴 뒤 「(E − P) + 2 × TD」 시한 안에 이어 재생되면 확정하고, 시한을 넘기면 되감기로 돌아가고, 시청자가 멈춰 뒀으면 멈춘 채 둡니다. PokeClip-mono liveHandoff.ts(develop 825a3dfe) 기준 설명용 그림이고 칸 수는 실제 목록과 다릅니다." >}}

시한 안에 이어지지 않으면 시청자는 넘기기 전 자리에서 되감기를 계속 봅니다.

PR #460은 10월 31일 develop에 머지됐고(머지 커밋 `90665f08`), 11월 3일 v1.0.0 출시 PR [#466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466)에 포함됐습니다. 그러나 완료 기준은 아직 채우지 못했습니다.

- **넘김 건너뜀.** 10월 30일 로컬 측정에서 넘기는 순간 내용이 Chrome에서 1.17초(녹화 35프레임), WebKit에서 1.50초(45프레임) 앞으로 건너뛰었습니다. 머지 직전 판(10월 31일)에서도 0.97초·1.20초가 남았습니다. 위 PDT 어긋남과 같은 꼴로 보고, PDT 개정이 배포된 뒤 ±250ms를 통과선으로 반드시 다시 재기로 했습니다.
- **녹화 손실 0.** 10월 28–29일 측정에서 같은 세션 안 재접속 경계의 영상 8–9프레임(0.27–0.30초)이 화면에서 빠졌습니다(10월 30일 원인 분석). 넘김 코드가 아니라 재접속 이음 규칙 몫이고, 원인은 [재접속 이음 글](/posts/0-to-1/pokeclip-reconnect-audio-gap/)에 있습니다.

측정 중에 하나는 바로 고쳤습니다. 송출이 다시 붙은 직후 약 47초 동안 MediaMTX 라이브 목록 앞쪽이 빈 조각 표시(`EXT-X-GAP`)로 채워졌고, 이를 세면 라이브 시작 하한이 실제 첫 내용보다 약 3.4초 앞에 섰습니다. 그래서 잘림을 「넘김 → 되돌림」으로 겪었습니다. 내용 손실은 없었지만, 맨 앞 GAP을 빼고 하한을 재도록 PR #460 안에서 고쳤습니다([`playbackEdge.ts` 109–125행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/playbackEdge.ts#L109-L125)). Firefox는 실험대에서 브라우저를 띄우지 못해 재지 못했습니다.

목록을 나누면 각 목록은 단순해지지만 둘 사이의 경계는 따로 책임져야 합니다. 비슷한 구조를 만든다면 넘김 코드보다 두 목록의 PDT가 같은 장면을 같은 값으로 가리키는지부터 재 보십시오. 이 프로젝트에서는 그 전제가 75초 틀려 있었습니다.

## 측정 조건

- PDT 대조(10월 27일): 작성자 기계의 로컬 실험대(MediaMTX, 사이드카, PostgreSQL, 되감기 목록 서버). ffmpeg testsrc2 640×360 30fps, GOP 2초, AAC 사인파를 SRT로 송출했습니다. 송출 시작 20분 뒤 약 2분 동안 22표본을 모았고, 조각 경계가 두 목록에서 달라 같은 프레임을 패킷 지문으로 짝지었습니다. AI가 수행했고 원자료는 비공개입니다.
- 녹화 손실(10월 28–29일): 같은 실험대에서 같은 세션 안 재접속 시나리오를 돌렸고, 10월 30일 기록으로 원인을 분석했습니다.
- 넘김 측정(10월 30·31일): 같은 실험대에서 송출을 끊고 대체 화면 60초 뒤 다시 보내는 시나리오를 Playwright로 Chrome·WebKit에서 판마다 한 번씩 돌렸습니다. 건너뜀은 넘기기 전후 화면 프레임 번호의 차입니다. AI가 수행했고 원자료는 비공개입니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289) — 되감기 목록 S3 발행(2026-10-19 develop 머지)
- [3K-PokeClip/PokeClip-mono PR #436](https://github.com/3K-PokeClip/PokeClip-mono/pull/436) — 웹 되감기 전환(2026-10-27 develop 머지)
- [3K-PokeClip/PokeClip-mono PR #460](https://github.com/3K-PokeClip/PokeClip-mono/pull/460) — 되감기 끝에서 라이브로 자동 넘김(2026-10-31 develop 머지)
- [3K-PokeClip/PokeClip-mono PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466) — v1.0.0 출시(2026-11-03 main 머지)
- [PokeClip-mono `liveHandoff.ts`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/liveHandoff.ts) · [`rewindSwitch.ts`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/rewindSwitch.ts) · [`endingWait.ts`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/endingWait.ts) · [`playbackEdge.ts`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/player/playbackEdge.ts) — 넘김 조건 · 확인 시한 · 시작 하한
- [PokeClip-mono `media/README.md` 「되감기 상태 제어면」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L721-L733) — 플레이어가 되감기 주소를 받는 API
- [RFC 8216 4.3.2.6 EXT-X-PROGRAM-DATE-TIME](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.2.6) · [4.3.3.4 EXT-X-ENDLIST](https://www.rfc-editor.org/rfc/rfc8216#section-4.3.3.4)
- [HLS 클립은 왜 벽시각 대신 미디어 시각으로 자를까?](/posts/projects/pokeclip-media-timeline-over-wall-clock/) — PDT 개정 경과
- [늦게 끝난 발행이 새 HLS 목록을 덮지 못하게 했습니다](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/) — 발행 정합성과 재시작 실험
- 팀 내부 실험 기록(비공개) — 10월 27일 PDT 대조, 10월 30·31일 넘김 측정

---

[발행 권한·S3 조건부 쓰기와 재시작 실험](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/) · [전체 기술 기록](/posts/0-to-1/portfolio-engineering-notes/)
