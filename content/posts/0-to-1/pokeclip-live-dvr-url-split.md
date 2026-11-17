---
title: "CDN 하나에서 라이브는 EC2로, 되감기는 S3로 보냈습니다"
date: "2026-11-18T03:26:26+09:00"
categories: ["projects"]
tags: ["PokeClip", "HLS", "LL-HLS", "DVR", "CloudFront", "CDN", "설계"]
draft: false
author: "김태윤"
description: "PokéClip 1시간 되감기의 주소 구조가 7월부터 11월까지 세 번 바뀐 기록. /hot · /cold 접두사는 이미 목록에 실린 URI를 바꿔야 해서 버렸고, 정본 URL과 오리진 대체는 라이브 조각이 S3에 없어 대체할 대상이 없어서 버렸습니다. 지금은 CloudFront 배포 하나에서 /live는 Media 상자(EC2)로, /dvr · /vod는 S3로 보내고, 어느 규칙에도 맞지 않는 경로는 원본에 닿지 않습니다. 가장 큰 이유는 되감기 · 녹화 공정이 멈춰도 라이브 시청이 끊기지 않게 하는 것이었습니다."
---

PokéClip에서 스트리머와 위임받은 편집자는 방송을 보다가 1시간 안의 지난 장면으로 돌아가 클립 구간을 고릅니다. 영상 출입증(서명 쿠키)은 이 두 사람에게만 나가며, 이 글의 시청자는 이들을 말합니다. 7월 설계에서는 라이브 재생 목록 하나가 4초 조각 900개로 1시간을 담았고, 최근 5분 조각은 `/hot/` 접두사로 미디어 서버(EC2)에서, 나머지는 `/cold/` 접두사로 S3에서 내보냈습니다. 조각이 오래되면 목록 안의 주소가 `/hot/`에서 `/cold/`로 바뀌어야 했는데, HLS 규격은 목록에 이미 실린 URI를 바꾸지 못하게 합니다. 이틀 뒤 주소를 하나로 고정하고 CloudFront 오리진 대체(EC2에 없으면 S3)로 바꿨지만, 라이브와 녹화를 다른 조각으로 나누자 라이브 조각은 S3에 아예 없어서 대체할 대상이 없었습니다. 지금은 CloudFront 배포 하나에서 `/live/*`는 Media 상자(EC2)로, `/dvr/*` · `/vod/*`는 S3로 보내고, 어느 규칙에도 맞지 않는 경로는 원본에 닿지 않습니다. 이렇게 가른 가장 큰 이유는 **되감기 · 녹화 공정이 멈춰도 라이브 시청은 끊기지 않게** 하려는 것이었습니다.

주소 구조의 방향은 제가 정하거나 승인했습니다. 라이브와 녹화의 주소를 나누는 것과 오리진 대체를 버리고 배포 하나에서 경로로 원본을 고르는 것은 제 결정이고, 접두사를 버리고 주소를 고정한 것은 제 질문에서 드러난 구멍을 메운 설계를 받아들인 것입니다. CDN Terraform · 엣지 함수 · 미디어 서버 쪽 구현은 AI(Claude Code와 Codex)가 했고, 커밋은 제 계정으로 들어갔습니다. 용어는 [회차 다시보기 글](/posts/projects/pokeclip-round-vod/)을 따릅니다. 조각은 세션(사이드카가 목록 하나를 여닫는 단위)에, 세션은 회차(시청자가 보는 방송 한 번)에 속합니다.

## 라이브 목록이 되감기를 겸해, 우리 공정이 멈추면 라이브도 멈출 구조였습니다

설계 당시에는 라이브 재생 목록 하나가 4초 조각 900개, 곧 1시간을 담아 되감기를 겸했습니다. 라이브 창을 줄이면 되감기도 함께 사라지는 구조였고, 그 판단과 되감기 끝에서 라이브로 넘기는 조건은 [라이브 · DVR 분리 글](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/)에 있습니다.

7월 설계의 라이브 목록은 우리 합성 층이 만들었고, 어디까지를 S3 주소로 쓸지는 「S3 업로드가 확인된 조각까지」로 정했습니다. 업로드 확인이 없으면 목록이 아직 없는 S3 객체를 가리켜 404가 나기 때문입니다. 그러면 합성 층의 발행이 멈추는 순간 라이브 목록도 더 자라지 않고, 업로드가 밀리면 S3로 넘어가지 못한 조각이 EC2 로컬 보관 시간에 묶입니다. 클립 기능을 위해 붙인 공정이 방송 시청 자체를 붙잡는 셈이었습니다.

8월 21일 라이브 주소와 녹화 주소를 나누기로 하면서 이 고리를 끊었습니다. 라이브는 미디어 서버(MediaMTX)가 만든 LL-HLS 목록과 조각을 그대로 내고, 되감기 · 다시보기는 따로 냅니다. 사이드카가 녹화 조각이 생길 때마다 다시 포장해 S3에 올리는 방식은 8월 28일에, 되감기 목록을 DB 장부에서 만들어 S3에 정적 발행하는 방식은 9월 1일에 정했습니다. 라이브와 되감기는 오디오 한 트랙만 싣고, 여섯 트랙 선택은 서버가 만드는 클립에서만 하기로 같은 날 정했기 때문에 라이브 쪽에 우리 가공이 끼어들 이유도 없어졌습니다. 1시간이라는 되감기 창은 국내 서비스와 같은 길이입니다. 치지직과 SOOP도 LCK 방송에서 방송 중 최대 1시간 되감기를 제공합니다([데일리안, 2026년 1월 8일](https://www.dailian.co.kr/news/view/1595812)).

영상에서 아래 갈래의 사이드카가 빨갛게 멈춘 뒤에도 위 갈래와 S3에서 플레이어로 가는 패킷은 계속 흐르는 것을 보면 됩니다.

{{< motion scene="PipelineStop" id="fig-pipeline-stop" kind="개념도" caption="라이브는 MediaMTX에서 /live로 바로 나가고, 되감기 · 다시보기는 사이드카가 다시 포장해 S3(/dvr · /vod)에 올린 조각으로 나갑니다. 사이드카가 멈추면 S3에 새 조각이 올라가지 않아 되감기 목록의 머리만 멈추고, 이미 올린 조각과 라이브는 계속 나갑니다. 원인(업로드 · 재포장 · 발행)은 특정하지 않은 설명용 그림입니다." >}}

사이드카가 멈춰 생기는 피해는 되감기 목록이 더 자라지 않는 것으로 줄었습니다. 대신 플레이어가 두 주소를 오가야 했고, 그 이음새는 위의 라이브 · DVR 분리 글이 다룹니다.

주소 구조는 아래 순서로 바뀌었습니다. 날짜는 제가 결정하거나 승인한 날입니다.

| 날짜 | 결정 | 다루는 곳 |
|---|---|---|
| 7월 25일 | 배포 하나에 `/hot/*`(EC2) · `/cold/*`(S3) 접두사 | 다음 절 |
| 7월 27일 | 접두사를 버리고 조각마다 주소 하나 + 오리진 대체 | 다음 절 |
| 8월 19일 | 방송을 다시 켜면 새 세션 주소, 끝난 목록은 다시 열지 않음 | [세션 주소 글](/posts/0-to-1/pokeclip-session-url-and-endlist/) |
| 8월 21일 | 라이브 주소와 녹화 주소를 나눔 | 이 절 |
| 8월 28일 | 되감기 조각은 사이드카가 다시 포장해 S3에 올림, 라이브 창은 되감기 주소를 서비스한 뒤에만 줄임 | 이 절 · [라이브 · DVR 분리 글](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/) |
| 8월 30일 | 오리진 대체 · 핫 테일을 버림, 「되감기 지연 < 라이브 창」 | 셋째 절 |
| 9월 1일 | 주소 트리 확정, 되감기 목록은 S3에 정적 발행 | [발행 정합성 글](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/) |
| 10월 19일 | 라이브 창 28초(4초 × 7) | [라이브 창 글](/posts/0-to-1/pokeclip-live-window-without-fork/) |
| 11월 2일 | 방송 중 1시간 창은 정책이고 엣지에서 막음 | [다음 편](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/) |
| 11월 3일 | VOD 복사를 버리고 업로드 때부터 회차 경로 | 다음 편 |

## /hot과 /cold 접두사는 목록에 실린 URI를 바꿔야 했습니다

7월 25일 설계는 한 목록의 900개 조각 가운데 최근 75개(5분)는 `/hot/*`로 EC2 로컬 디스크에서, 나머지 825개(55분)는 `/cold/*`로 S3에서 내는 것이었습니다. 조각이 5분보다 오래되면 같은 조각의 줄이 `/hot/…`에서 `/cold/…`로 바뀝니다. 한 배포 안에서 두 접두사가 다른 원본을 고르니 서명 쿠키 하나로 둘을 다 덮을 수 있다는 것도 장점으로 꼽았습니다.

이틀 뒤 제가 「2시간 본 시청자는 hot 주소만 들고 있는데, 되감으면 규칙이 깨지는 것 아닌가」 하고 물은 데서 구멍이 드러났습니다. HLS 규격은 서버가 미디어 재생 목록을 바꿀 수 있는 경우를 줄 덧붙이기, 앞에서부터 조각 지우기, 시퀀스 번호 올리기, ENDLIST 붙이기 같은 몇 가지로 한정하고 그 밖의 변경을 금지합니다([RFC 8216bis-22 6.2.1](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 이미 실린 줄의 URI를 바꾸는 것은 그 목록에 없습니다.

LL-HLS의 델타 갱신(Playlist Delta Update)이 이 금지를 실제 고장으로 바꿉니다. 서버는 오래된 조각 줄을 `EXT-X-SKIP` 태그 하나로 갈음한 짧은 목록을 보내고([4.4.5.2](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) · [6.2.5.1](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)), 클라이언트는 그것을 앞서 받은 목록과 합쳐야 합니다([6.3.7](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 서버가 옛 줄을 `/cold/`로 바꿔 보내도, 델타 갱신을 받는 클라이언트는 그 줄을 다시 받지 않습니다. 오래 본 시청자의 로컬 목록에는 `/hot/` 주소가 남고, EC2 로컬 보관(8분)이 지나면 그 주소는 404가 됩니다.

그래서 7월 27일 조각마다 주소를 하나로 고정하고, 어디서 꺼낼지는 서빙할 때 정하기로 했습니다. 주소는 조각이 처음 실릴 때 정해지면 다시 바뀌지 않고, CloudFront 오리진 그룹이 1차 원본(EC2)에서 404를 받으면 2차 원본(S3)에서 같은 객체를 가져옵니다. 저장 위치는 시간이 지나면 바뀌어도 주소는 바뀌지 않는다는 계약은 이때 생겨 지금까지 이어집니다.

## 라이브 조각은 S3에 없어 오리진 대체가 대신 낼 것이 없었습니다

8월 21일 라이브와 녹화를 나누자 오리진 대체의 전제가 사라졌습니다. 라이브 조각은 MediaMTX가 만드는 임시 파일이라 S3에 올리지 않습니다. S3에는 녹화 원본과 그것을 다시 포장한 되감기용 조각이 올라가고, 어느 쪽도 라이브 조각과 바이트 · 주소가 같지 않습니다. 오리진 그룹은 1차가 실패하면 2차에서 같은 객체를 가져오는 기능인데, 라이브 경로의 2차에는 그 바이트가 없었습니다.

8월 30일 저는 오리진 대체를 버리고, 라이브 요청은 라이브 원본으로, 되감기 요청은 S3로 보내기로 했습니다. 조각이 원본 사이를 옮겨 다니지 않으니 주소가 바뀌는 문제도 다시 생기지 않습니다. EC2가 죽으면 대신 낼 라이브도 없고, 되감기 · 다시보기는 처음부터 EC2를 거치지 않습니다.

같은 날 되감기 목록 끝에 붙이던 「핫 테일」도 걷어냈습니다. 핫 테일은 되감기 목록의 가장 최근 구간을 MediaMTX의 블로킹 요청으로 그대로 이어 주던 장치였습니다. 라이브와 되감기가 한 주소를 쓰던 시절의 구조라, 남겨 두면 되감기 목록에 라이브 조각 주소가 실리고 그 조각은 라이브 창을 벗어나는 즉시 404가 됩니다. 실린 URI를 나중에 S3 주소로 고치는 것은 앞 절의 규칙이 막습니다. 그래서 되감기 목록에는 업로드가 확인된 녹화 조각만 싣습니다.

그 대가로 되감기 목록의 머리는 라이브보다 늦습니다. 녹화 조각이 4초로 마감되고, 다시 포장해 업로드하는 시간만큼입니다. 설계 때 추정은 약 5초였습니다. 이 틈은 라이브 창이 덮습니다. 그래서 「되감기 지연 < 라이브 창」을 불변식으로 두었습니다. 라이브 창은 그 뒤 녹화와 같은 4초 조각 7개, 곧 28초로 정했고([`mediamtx.yml.tmpl` 128–130행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/media-host/mediamtx.yml.tmpl#L128-L130)), 그 판단은 [라이브 창 글](/posts/0-to-1/pokeclip-live-window-without-fork/)에 있습니다.

이 불변식은 무조건 성립하지 않습니다. 업로드가 실패해 다시 시도를 기다리는 동안에는 되감기 머리가 멈춰 라이브 창의 여유를 넘깁니다. 영상이 멈춘 조각을 목록에서 어떻게 다루는지는 [재생 목록 경계 글](/posts/0-to-1/pokeclip-manifest-window-boundaries/)에, 되감기 목록을 장부에서 S3로 정적 발행하는 방식은 [발행 정합성 글](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/)에 있습니다.

## 경로마다 원본과 함수를 고르고, 맞는 규칙이 없는 요청은 원본까지 가지 않습니다

오리진 대체를 버린 뒤에도 CloudFront 배포는 하나로 두었습니다. CloudFront는 요청 경로를 캐시 비헤이비어(경로 규칙)의 패턴과 위에서부터 견주고, 처음 맞는 규칙의 원본 · 캐시 정책 · 함수를 씁니다([AWS 「Cache behavior settings」 Path pattern](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html#DownloadDistValuesPathPattern)). 원본이 둘이어도 도메인 하나에서 경로로 가를 수 있습니다. 서명 쿠키는 `Domain` 속성이 가리키는 도메인의 요청에 붙으므로([AWS 「Set signed cookies using a custom policy」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-setting-signed-cookie-custom-policy.html)), 미디어 도메인이 하나면 쿠키도 한 도메인 안에서 다룹니다.

고정 커밋의 Terraform 원문에서 경로 규칙을 그대로 뽑으면 아래와 같습니다([`main.tf` 25–98행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/main.tf#L25-L98) · [187–201행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/main.tf#L187-L201)). 같은 원문에서 원본 블록은 둘이고 오리진 그룹은 없습니다.

| 순서 | 경로 패턴 | 원본 | 서명 쿠키 | 엣지 함수 |
|---|---|---|---|---|
| 1 | `/api/ingest/*` | Media 상자 | 아니오 | 없음 |
| 2 | `/live/*.m3u8` | Media 상자 | 예 | live-auth |
| 3 | `/live/*` | Media 상자 | 예 | live-auth |
| 4 | `/dvr/*` | S3 | 예 | dvr-floor(1시간 창 밖 조각 404, 스위치로 붙임) |
| 5 | `/vod/*` | S3 | 예 | 없음 |
| 6 | `/api/streams/*/rewind` | Media 상자 | 아니오 | 없음 |
| 7 | `/playback/*` | Media 상자 | 예 | 없음 |
| 기본 | `*` | (닿지 않음) | 예 | deny-default → 404 |

Media 상자는 EC2이고, CloudFront는 그 앞의 내부 ALB를 VPC 원본으로 봅니다. S3는 OAC(원본 접근 제어)로 서명해서 읽고, Origin Shield는 S3 쪽에만 켰습니다([`main.tf` 136–159행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/main.tf#L136-L159)). `/live/*.m3u8`이 `/live/*`보다 앞에 있는 까닭은 목록과 조각의 캐시 시간이 달라서입니다. 목록은 1초, 조각은 원본의 `Cache-Control`을 따릅니다.

아래 그림에서 경로의 첫 구간이 원본을 고르고, 맞는 규칙이 없는 경로는 원본까지 가지 않는 것을 보면 됩니다.

```mermaid {#fig-route-tree kind="개념도" caption="미디어 도메인 하나 아래의 주소와 원본입니다. 라이브와 되감기 주소 API는 Media 상자(EC2)로, 되감기 목록 · 조각 · init과 다시보기 목록은 S3로 가고, 어느 규칙에도 맞지 않는 경로는 원본에 닿지 않습니다(서명 쿠키 검사에서 403, 통과해도 기본 규칙의 함수가 404). 다시보기 목록은 조각을 새로 만들지 않고 /dvr 조각 주소를 가리킵니다. /playback · /api/ingest 규칙은 표에 있습니다. PokeClip-mono develop 627fb5a2의 main.tf 기준." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/main.tf#L25-L98"}
flowchart LR
  accTitle: 미디어 도메인의 경로와 원본
  accDescr: 라이브 목록과 조각, 되감기 주소 API는 Media 상자 EC2로 간다. 되감기 목록, 회차 경로 조각, init, 다시보기 목록은 S3로 간다. 그 밖의 경로는 원본에 가지 않고 서명 쿠키 검사에서 403, 통과해도 404를 받는다.
  live["/live/{스트림}/…"] --> ec2[Media 상자<br/>EC2]
  api["/api/streams/<br/>{스트림}/rewind"] --> ec2
  dl["/dvr/{스트림}/<br/>{세션}/<br/>index.m3u8"] --> s3[(S3)]
  ds["/dvr/{스트림}/<br/>{회차}/seg/<br/>{번호}.m4s"] --> s3
  di["/dvr/{스트림}/init/<br/>{세션}.mp4"] --> s3
  vod["/vod/{스트림}/…/<br/>index.m3u8"] --> s3
  x[그 밖의 경로] --> n[403 · 404]
```

기본 규칙은 AWS가 경고하는 자리입니다. 경로 패턴과 그 순서를 잘못 두면 의도하지 않은 접근을 허용할 수 있습니다([같은 AWS 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html#DownloadDistValuesPathPattern)). 그래서 어느 규칙에도 맞지 않는 경로는 원본에 닿지 않게 했습니다. 기본 규칙에도 서명 쿠키 검사를 걸어 쿠키가 맞지 않으면 403이고, 통과해도 어떤 경로 · 메서드 · 쿼리든 404를 돌려주는 함수가 원본보다 먼저 답합니다([`main.tf` 189–201행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/main.tf#L189-L201) · [`deny-default.js`](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/functions/deny-default.js#L16-L19)). `/live` 없는 경로로 원본에 직접 닿는 갈래가 없어집니다. 이 구조는 [PokeClip-mono PR 387](https://github.com/3K-PokeClip/PokeClip-mono/pull/387)로 들어왔습니다.

라이브 규칙의 함수(live-auth)는 원본에 넘길 CDN 비밀을 KVS(KeyValueStore, 엣지 함수가 읽는 키-값 저장소)에서 읽어 싣고, 못 읽으면 503으로 닫습니다([`live-auth.js` 53–70행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/functions/live-auth.js#L53-L70)). CDN 비밀을 원본에 넘기게 된 까닭은 [CDN 캐시 · 원본 인증 글](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)에 있습니다.

플레이어는 되감기 목록 주소를 직접 만들지 않습니다. `/api/streams/{스트림}/rewind`에 물어 지금 열 목록 주소를 받고, 그 주소가 제어면과 같은 출처의 `.m3u8`일 때만 재생기에 넘깁니다([`rewindStatus.ts` 3–8행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/web/src/api/rewindStatus.ts#L3-L8)). 이 응답도 CDN에서 1초 캐시됩니다.

## iOS 17.1 미만에서는 되감기가 라이브 창 28초뿐입니다

주소를 나눈 대가는 플레이어가 두 주소를 오갈 수 있어야 한다는 것입니다. 웹 플레이어는 hls.js가 재생기를 맡을 때만 되감기 세션을 열어 `/dvr` 목록으로 넘어갑니다. hls.js 없이 브라우저 내장 HLS로 재생하면 조각 목록과 시각 축을 앱이 볼 수 없어, 라이브 창 안에서만 시크합니다([`useHlsPlayback.ts` 277–284행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/web/src/features/player/useHlsPlayback.ts#L277-L284)).

hls.js는 iPhone에서 iOS 17.1부터 Managed Media Source로 동작합니다([hls.js 1.7.3 README](https://github.com/video-dev/hls.js/blob/v1.7.3/README.md#L328) · [WebKit 「Safari 17.1」](https://webkit.org/blog/14735/webkit-features-in-safari-17-1/)). 그보다 오래된 iPhone은 내장 HLS로 재생하므로, 라이브 목록이 900조각에서 7조각으로 줄어든 지금은 되감기가 28초로 줄어듭니다. 운영 접근 로그에 iPhone 요청이 없어 저는 이것을 한계로 받아들였고, iPhone 요청이 생기면 다시 보기로 했습니다([`media/README.md` 한계 표](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/README.md?plain=1#L2938)).

EC2 하나가 죽으면 라이브도 함께 멈춥니다. 오리진 대체 설계에서는 EC2가 죽어도 이미 업로드한 구간을 S3가 대신 냈습니다. 그 이점은 사라졌지만, 그 구간은 이제 되감기 주소가 처음부터 S3에서 냅니다. S3 쪽이 막히면 반대로 되감기 · 다시보기만 멈추고 라이브는 계속됩니다.

비슷한 구조를 설계한다면 저장 위치에 따라 주소를 바꾸는 방식부터 의심해 보십시오. LL-HLS 델타 갱신을 받는 클라이언트는 이미 받은 줄을 다시 받지 않습니다. 저장 위치가 바뀌는 조각이라면 주소를 고정하고 서빙 쪽에서 원본을 고르고, 저장 위치가 다른 조각이라면 처음부터 주소를 나누는 편이 맞았습니다.

## 측정 조건

- **경로 규칙 표(공개 재측정).** AI(Claude Code)가 2026년 11월 18일 02:43 KST에 실행했습니다. MacBook Air(Apple M5), macOS 27.0.1, Node.js 26.4.0. 3K-PokeClip/PokeClip-mono develop `627fb5a2`(2026년 11월 17일)의 `infra/terraform/modules/cdn_media/main.tf`를 `git show`로 꺼내 `behaviors.mjs`가 `ordered_behaviors` 목록과 기본 규칙을 글자 그대로 읽었습니다. AWS · Terraform은 부르지 않았으므로 배포된 설정이 아니라 저장소 원문의 표입니다.
- **명령.** `measure/`에서 `MONO_DIR=<PokeClip-mono 클론> ./run.sh all "$PWD/raw"` → `./run.sh down`(스크립트가 만든 `/tmp/dvrurl-run-*`만 지움). 스크립트와 결과는 [저장소 `_workspace/blog/pokeclip-live-dvr-url-split/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-live-dvr-url-split/measure)에 있습니다.
- **결정 날짜.** 시간선 표의 날짜와 결정 문장, 7월 27일의 질문은 팀 내부 설계 · 토론 기록(비공개)에서 옮겼습니다.

## 출처

규격 · 문서
- [RFC 8216bis-22, HTTP Live Streaming 2nd Edition](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) — 4.4.5.2 EXT-X-SKIP · 6.2.1 서버가 목록을 바꿀 수 있는 경우 · 6.2.5.1 Playlist Delta Updates · 6.3.7 클라이언트는 델타를 앞 목록과 합침
- [AWS — Cache behavior settings: Path pattern](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html#DownloadDistValuesPathPattern) — 위에서부터 첫 일치, 기본 규칙 `*`, 순서를 잘못 두면 의도치 않은 접근
- [AWS — Set signed cookies using a custom policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-setting-signed-cookie-custom-policy.html) — `Domain` · `Path` 속성
- [hls.js 1.7.3 README](https://github.com/video-dev/hls.js/blob/v1.7.3/README.md#L328) · [WebKit Features in Safari 17.1](https://webkit.org/blog/14735/webkit-features-in-safari-17-1/) — iPhone의 Managed Media Source
- [데일리안, 「유튜브 빠진 LCK 중계…SOOP 이어 치지직도 '타임머신' 무료로 푼다」(2026-01-08)](https://www.dailian.co.kr/news/view/1595812) — 방송 중 최대 1시간 되감기

코드(공개 저장소 3K-PokeClip/PokeClip-mono, develop `627fb5a2`)
- [`cdn_media/main.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/main.tf#L25-L98) — 경로 규칙 · [원본 둘](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/main.tf#L136-L159) · [기본 규칙](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/main.tf#L187-L201)
- [`deny-default.js`](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/functions/deny-default.js#L16-L19) · [`live-auth.js` 53–70행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/functions/live-auth.js#L53-L70)
- [`mediamtx.yml.tmpl` 128–130행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/media-host/mediamtx.yml.tmpl#L128-L130) — 라이브 조각 4초 × 7
- [`rewindStatus.ts` 3–8행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/web/src/api/rewindStatus.ts#L3-L8) · [`useHlsPlayback.ts` 277–284행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/web/src/features/player/useHlsPlayback.ts#L277-L284) · [`media/README.md` 한계 표](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/README.md?plain=1#L2938)
- [PokeClip-mono PR 387](https://github.com/3K-PokeClip/PokeClip-mono/pull/387) — media 배포 모듈과 엣지 함수

재측정
- [경로 규칙 표 스크립트 · 결과](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-live-dvr-url-split/measure)

이어지는 글
- [서명 쿠키는 종류별로 나누고 1시간 창은 엣지에서 막았습니다](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/) — 1편 둘째 글
- [사이드카는 4초 조각마다 HLS 되감기 목록을 이렇게 만듭니다](/posts/0-to-1/pokeclip-sidecar-rewind-playlist/) — 2편, `/dvr` 목록을 쓰는 사이드카
- [HLS 라이브와 DVR 목록을 나누자 넘김 조건이 생겼습니다](/posts/0-to-1/pokeclip-live-dvr-separation-handoff/) — 900조각 목록 · 넘김 조건
- [LL-HLS 라이브 창은 지연이 아니라 복귀 여유를 정했습니다](/posts/0-to-1/pokeclip-live-window-without-fork/) — 28초 창
- [늦게 끝난 발행이 새 HLS 목록을 덮지 못하게 했습니다](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/) — 되감기 목록의 S3 정적 발행
