---
title: "일반 HLS는 라이브 끝에서 목표 길이 세 배 뒤부터 재생합니다"
date: 2026-05-30T00:00:00+09:00
lastmod: "2026-11-12T22:56:00+09:00"
description: "일반 HLS 플레이어는 목록 끝에서 목표 길이의 세 배보다 가까운 조각에서 재생을 시작하지 않습니다(RFC 8216 6.3.3). 목록을 다시 받는 간격(바뀌면 목표 길이, 그대로면 절반), 조각 길이를 줄일 때 늘어나는 요청과 키프레임, 조각 경계의 화질 전환, 목록과 조각을 다르게 캐시하고 라이브 끝 조각의 같은 요청을 합치는 CDN 구성, HTTP/3 위의 HLS, PokeClip에서 실제로 재생을 끊은 원인을 규격과 공개 기록으로 정리했습니다."
categories: ["tech-blurting"]
tags: ["HLS", "라이브 지연", "CDN", "캐시", "QUIC", "PokeClip"]
draft: false
---

일반 HLS 라이브는 몇십 초 늦게 보입니다. 원인은 망 속도보다 규격이 정한 거리에 있습니다. [RFC 8216 6.3.3절](https://www.rfc-editor.org/rfc/rfc8216#section-6.3.3)은 끝 표시가 없는 목록에서 플레이어가 목록 끝으로부터 목표 길이(`EXT-X-TARGETDURATION`)의 세 배보다 가까운 조각에서 재생을 시작하지 말라고 권고합니다. 목표 길이가 6초면 시작점은 목록 끝에서 18초 뒤입니다. 그런데 목록 끝 자체도 실제 시각보다 늦습니다. 조각은 다 만들어진 뒤에야 목록에 오르기 때문입니다. 지연을 줄이려 조각을 짧게 하면 요청과 키프레임이 늘어나고, 그 대가 없이 줄이려는 것이 LL-HLS입니다.

## 플레이어는 라이브 끝에서 목표 길이 세 배 뒤에 섭니다 {#지연이-2030초인-이유--수학으로}

RFC 8216은 「ENDLIST가 없고 보통 재생을 하려는 클라이언트는 목록 끝에서 목표 길이 세 배 안쪽에서 시작하는 조각을 고르지 않아야 한다(SHOULD NOT)」고 적습니다. 개정 초안 22판은 이 거리를 `EXT-X-SERVER-CONTROL`의 `HOLD-BACK`으로 서버가 알릴 수 있게 했습니다. 값은 목표 길이의 세 배 이상이어야 하고(MUST), 없으면 세 배로 봅니다([개정 초안 4.4.3.8 · 6.3.3](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). hls.js도 같은 값을 기본으로 씁니다. `liveSyncDurationCount` 기본값이 3이고, 「목록의 마지막 조각이 N이면 N-3번에서 재생을 시작한다」고 설명합니다([hls.js API 문서](https://github.com/video-dev/hls.js/blob/master/docs/API.md#livesyncdurationcount)).

시청자가 보는 지연에는 이 거리 말고도 목록 끝이 실제 시각보다 늦는 몫이 더해집니다. 개정 초안 3.2절은 조각이 완전히 인코딩되고 포장되기 전에는 배포할 수 없어, 실시간으로 만드는 긴 조각은 그 길이만큼 지연을 만든다고 적습니다. 아래 영상에서 6초 조각이 다 만들어져야 목록에 붙는 모습과, 재생점이 목록 끝에서 18초 뒤에 서는 모습을 보십시오.

{{< motion scene="HoldBackStart" id="fig-hold-back-start" kind="개념도" caption="목표 길이 6초인 일반 HLS 라이브. 인코더가 만드는 조각은 6초가 다 차야 목록 끝에 붙고, 플레이어는 목록 끝에서 목표 길이 세 배(18초) 뒤에서 재생을 시작합니다. 목록이 바뀌었으면 목표 길이만큼, 그대로면 절반만큼 기다린 뒤 다시 받습니다. RFC 8216 6.3.3 · 6.3.4절을 따라 그린 설명용 그림입니다." >}}

이 시작 거리는 창 길이와 다른 값입니다. PokeClip에서 라이브 조각을 2초에서 4초로 늘리자, LL 모드를 쓰지 않는 플레이어가 앉는 거리가 계산상 6초에서 12초로 늘었습니다. PokeClip 웹 플레이어는 LL 모드라 이 대가를 받아들였습니다([라이브 창 글](/posts/0-to-1/pokeclip-live-window-without-fork/)).

## 목록을 다시 받는 간격도 목표 길이가 정합니다 {#전체-동작-흐름}

플레이어는 다변형 목록에서 변형을 고르고, 그 미디어 목록을 받아 조각을 요청한 뒤, 라이브에서는 목록을 주기적으로 다시 받습니다. 그 간격에도 하한이 있습니다.

| 주체 | 규칙 | 근거 |
|---|---|---|
| 플레이어 | 목록을 처음 받았거나 다시 받았는데 바뀌었으면, 받기 시작한 때부터 목표 길이 이상 기다린 뒤 다시 요청(MUST) | [RFC 8216 6.3.4](https://www.rfc-editor.org/rfc/rfc8216#section-6.3.4) |
| 플레이어 | 다시 받았는데 그대로면 목표 길이의 절반을 기다림(MUST) | 같은 절 |
| 서버 | 새 판은 직전 판보다 목표 길이 절반 이후, 1.5배 이전에 내놓음(MUST) | [RFC 8216 6.2.1](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.1) |

개정 초안 22판은 바뀐 목록 뒤의 대기를 「목표 길이」에서 「목록 마지막 조각의 길이」로 바꿨고, 그대로인 목록을 목표 길이의 1.5배 넘게 받았으면 서버 이상으로 보고 다른 변형으로 옮기라고 권합니다(6.3.4절). 서버 쪽 6.2.1절에서는 「절반 이후」 하한을 빼고 「직전에 조각을 붙인 때부터 1.5배 안에」라는 상한만 남겼습니다.

요청 수는 숫자보다 산식으로 보는 편이 정확합니다. 한 시청자가 변형 하나를 볼 때 초당 요청은 대략 「1 ÷ 조각 길이」번의 조각 요청과, 목록 재요청 간격으로 정해지는 목록 요청의 합입니다. 오디오를 별도 묶음으로 내면 오디오 목록과 조각 요청이 같은 꼴로 더해집니다. 여기에 시청자 수를 곱한 값이 CDN이 받는 요청이고, 그 가운데 캐시에서 답하지 못한 몫이 원본으로 갑니다.

## 조각을 짧게 하면 지연은 줄지만 요청과 키프레임이 늘어납니다 {#실무-포인트--대규모-서비스-기준}

개정 초안 4.4.3.8절은 목표 길이가 짧으면 지연은 줄지만 버퍼가 줄고 화질 적응이 불리해지며 전달 부담이 커져 끊길 가능성이 커진다고 적고, 값은 운영자가 자기 기준으로 고르라고 합니다. 애플 저작 규격은 목표 길이 6초를 권합니다(7.5, SHOULD). 아래 표는 규격 산식만으로 계산한 값입니다. 측정값이 아닙니다.

| 목표 길이 | 시작 거리 하한(×3) | 조각 요청(시청자 · 변형당) | 키프레임 간격 상한 |
|---|---|---|---|
| 2초 | 6초 | 초당 0.5번 | 2초 |
| 6초 | 18초 | 초당 약 0.17번 | 6초 |
| 10초 | 30초 | 초당 0.1번 | 10초 |

키프레임 간격 상한은 조각이 IDR 프레임으로 시작해야 한다는 규칙(애플 저작 규격 7.4)에서 나옵니다. 조각이 짧을수록 IDR을 자주 넣어야 하고, 같은 비트레이트에서 압축 효율이 떨어집니다. 얼마나 떨어지는지는 영상 내용과 인코더 설정에 따라 다르므로 직접 재 봐야 합니다.

## ABR은 조각 경계에서만 화질을 바꿉니다 {#abr-adaptive-bitrate-동작-사이클}

ABR(Adaptive Bitrate)은 받은 속도와 버퍼를 보고 다음 조각을 어느 변형에서 받을지 고르는 일입니다. hls.js는 조각을 받은 속도로 대역폭을 추정하고, 라이브에서는 반감기 3초(`abrEwmaFastLive`) 같은 지수 이동 평균을 씁니다([hls.js API 문서](https://github.com/video-dev/hls.js/blob/master/docs/API.md#abrewmafastlive)). 바꾸는 단위는 조각입니다.

조각 단위로 바꿀 수 있는 것은 변형끼리 시각이 맞기 때문입니다. RFC 8216 6.2.4절은 같은 내용의 변형이 같은 타임스탬프를 가져야 한다(MUST)고 정하고, 6.3.4절은 변형을 바꾼 플레이어가 EXTINF 길이로 대략의 위치를 찾은 뒤 조각 안 타임스탬프로 정확히 맞추라고 적습니다. 애플 저작 규격 8.15는 모든 변형의 끊김(discontinuity) 위치도 같아야 한다고 정합니다. 인코더가 변형마다 키프레임 위치를 다르게 두면 조각 경계가 어긋나 전환할 때 화면이 튀거나 멈춥니다.

## 목록은 짧게, 조각은 길게 캐시합니다 {#qa-라이브-스트리밍인데-cdn이-어떻게-캐시하는가}

조각은 한 번 목록에 오르면 내용이 바뀌지 않으므로 오래 캐시할 수 있습니다. 목록은 몇 초마다 바뀌므로 짧게 캐시해야 시청자가 낡은 목록을 받지 않습니다. 목록에서 빠진 조각도 끝까지 받을 수 있어야 합니다. RFC 8216 6.2.2절은 목록에서 뺀 조각을 「그 조각의 길이 + 그 조각이 들어 있던 가장 긴 목록의 길이」만큼 더 남겨 두라고 하고, 지울 계획이면 HTTP 응답의 `Expires`에 그 수명을 적으라고 권합니다.

PokeClip의 지금 CDN 구성은 이 원칙을 경로마다 다르게 적용합니다. 아래 표는 [CDN 캐시 실측 글](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)이 인용한 Terraform 정책과 저장 코드를 다시 정리한 것입니다.

| 경로 | 캐시 키 · 보관 | 이유 |
|---|---|---|
| 라이브 LL-HLS 목록 | `_HLS_msn` · `_HLS_part` · `_HLS_skip`만 키, 엣지 1초 | 보류 요청마다 답이 달라 이 쿼리만 구분 |
| 라이브 조각 · 파트 · init | 쿠키 · 쿼리 없이 키, 원본 Cache-Control을 따르되 최대 3,600초 | 같은 주소는 같은 바이트 |
| 되감기 목록 | 원본이 `public, max-age=1` | 1초마다 늘어남 |
| 되감기 조각 · init | 원본이 1년 `immutable`(엣지는 최대 1일) | 한 번 올리면 바뀌지 않음 |
| VOD 문서 | 원본이 3,600초 | 방송이 끝난 뒤 굳힌 목록 |

같은 글에는 캐시 키에서 세션 쿠키를 빼자 원본으로 가는 요청에서도 세션이 빠져 원본이 401을 돌려준 실험이 있습니다. 캐시 키와 원본에 넘기는 값을 따로 정해야 하는 이유입니다.

### 라이브 끝 조각은 같은 요청을 합쳐야 원본이 버팁니다 {#진짜-문제-라이브-엣지-cache-stampede}

라이브 끝에 새 조각이 오르면 그 조각을 처음 요청하는 시청자들이 거의 같은 순간에 몰립니다. 엣지에 아직 사본이 없으니 그대로 두면 요청마다 원본으로 갑니다. 개정 초안 부록 B.1의 저지연 서버 구성 요건은 CDN과 프록시 캐시가 「이미 캐시 채우기가 진행 중인 요청을 알아보고, 같은 요청은 그 채우기에서 내줄 수 있을 때까지 붙잡아 두라」고 요구합니다. [[fig-request-coalescing]]에서 엣지가 원본에 한 번만 묻는 순서를 보십시오.

```mermaid {#fig-request-coalescing kind="개념도" caption="엣지의 요청 합치기. 시청자 A의 요청으로 엣지가 원본에서 새 조각을 받아 오는 동안 같은 조각을 요청한 시청자 B는 엣지에서 기다리고, 원본 응답 하나로 두 요청에 답합니다. 개정 초안 22판 부록 B.1의 요건을 줄여 그렸습니다." source="https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt"}
%%{init: {"sequence": {"width": 96, "actorMargin": 16}}}%%
sequenceDiagram
  accTitle: CDN 엣지의 같은 요청 합치기
  accDescr: 시청자 A가 seg106을 요청하면 엣지가 원본에 한 번 요청한다. 그 사이 시청자 B의 같은 요청은 엣지에서 대기하고, 원본 응답이 오면 엣지가 A와 B에게 같은 사본으로 답한다.
  participant V as 시청자
  participant E as 엣지
  participant O as 원본
  V->>E: A · seg106
  E->>O: seg106
  V->>E: B · seg106
  Note over E: B 대기
  O->>E: 200
  E->>V: A · 200
  E->>V: B · 200
```

엣지가 많으면 엣지마다 원본에 한 번씩 갑니다. 엣지와 원본 사이에 캐시 층을 하나 더 두면(CloudFront의 [Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html) 같은 계층 캐시) 원본이 받는 요청을 그 층의 수로 줄일 수 있습니다. PokeClip은 되감기 원본(S3) 앞에 서울 Origin Shield를 둡니다.

## HTTP 위라는 말이 TCP만 뜻하지는 않습니다 {#qa-현대-플랫폼이-ll-hlswebrtc-쓰는-추세인데-왜-tcp라고-하나}

HLS 규격은 HTTP 위에서 동작한다고만 정하고, HTTP 판은 정하지 않습니다. HTTP/1.1과 HTTP/2는 TCP 위에서, HTTP/3는 QUIC 위에서 동작합니다([RFC 9114](https://www.rfc-editor.org/rfc/rfc9114)). RFC 9114 1.1절은 HTTP/2의 다중화가 TCP 손실 복구에 보이지 않아, 패킷 하나가 사라지거나 순서가 바뀌면 그 패킷과 상관없는 요청까지 모두 멈춘다고 적습니다. QUIC은 스트림 단위로 신뢰성을 주므로 잃은 패킷에 데이터가 실린 스트림만 재전송을 기다리고 나머지는 진행합니다([RFC 9000 13절](https://www.rfc-editor.org/rfc/rfc9000#section-13)).

그래서 「HLS는 TCP라서 늦다」는 말은 두 번 틀립니다. HTTP/3로 HLS를 받으면 TCP를 쓰지 않고, 일반 HLS의 지연 대부분은 전송 규약이 아니라 앞에서 본 시작 거리와 조각 생성 시간에서 나옵니다. 저지연 HLS는 오히려 전송 쪽 요건을 올립니다. 개정 초안 부록 B.1은 저지연 구성의 목록과 조각을 HTTP/2나 HTTP/3로 내라고 요구합니다.

## 끊김은 전송보다 창 · 목록 · 시각에서 자주 납니다 {#그러면-왜-끊기냐--실제-원인}

PokeClip에서 재생을 실제로 끊거나 구간을 지운 원인은 대역폭보다 목록과 미디어 시각 쪽이었습니다.

| 증상 | 원인 | 기록 |
|---|---|---|
| hls.js 오류 0건인데 녹화 142초 중 62초가 사라짐 | 녹화 파일마다 tfdt(조각 첫 표본의 디코딩 시각)가 0 근처에서 다시 시작 | [오류 0건 글](/posts/0-to-1/pokeclip-zero-errors-missing-playback/) |
| 같은 파일인데 8.10초만 잡히다가 39.87초 전체가 잡힘 | init이 아니라 tfdt 193바이트 위치의 값 | [tfdt 대조 글](/posts/0-to-1/pokeclip-cdn-timeline-normalization/) |
| HTTP 200인데 검은 화면 | hls.js 설정 검사(생성자) 예외. 함께 보인 변환 오류와 GAP 조각은 11월 소스 대조에서 화면을 막은 원인이 아니었던 것으로 정정 | [검은 화면 글](/posts/0-to-1/pokeclip-black-screen-three-causes/) |
| 일시정지 뒤 다음 조각 404 | 되감기 창이 밀려 조각이 창 밖으로 빠짐 | [되감기 404 글](/posts/projects/rewind-missing-segment/) |

목록이 아직 확정되지 않은 조각을 공개하면 플레이어가 없는 조각을 요청합니다. PokeClip 되감기 목록이 연속으로 확정된 조각까지만 공개하는 이유입니다([목록 공개 경계 글](/posts/0-to-1/pokeclip-manifest-window-boundaries/)).

## 더 낮은 지연이 필요하면 LL-HLS나 WebRTC로 갑니다 {#트레이드오프}

조각 길이와 시작 거리를 그대로 두면 일반 HLS의 지연은 목표 길이에 묶입니다. LL-HLS는 조각보다 짧은 부분 조각(파트)을 먼저 목록에 올리고, 플레이어가 다음 목록을 미리 걸어 두게 해서 이 묶음을 풉니다. 재생 위치는 `HOLD-BACK` 대신 파트 길이를 기준으로 한 `PART-HOLD-BACK`이 정합니다. WebRTC는 시청자마다 세션을 따로 열어 수백 밀리초 단위로 보낼 수 있지만, CDN이 같은 조각을 나눠 주는 구조를 쓰지 못합니다([WHIP · WHEP 글](/posts/tech-blurting/whip-whep-modern-ingest/)).

지연 목표가 정해지면 먼저 목표 길이와 시작 거리로 하한을 계산하십시오. 그 하한이 목표보다 크면 조각을 줄이기 전에 LL-HLS를 검토하는 편이 요청과 키프레임 비용을 덜 늘립니다.

## 출처

- [RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216) (2017-08) — 6.2.1 서버 갱신 간격, 6.2.2 뺀 조각 유지 · Expires, 6.2.4 변형 타임스탬프, 6.3.3 시작 위치, 6.3.4 재요청 간격
- [draft-pantos-hls-rfc8216bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) (2026-05-01) — 3.2 조각 배포 지연, 4.4.3.8 HOLD-BACK과 목표 길이 선택, 6.3.4 재요청, 부록 B.1 저지연 서버 구성(HTTP/2 이상, 같은 요청 합치기)
- [Apple, HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) (개정 2025-06-26) — 7.4 · 7.5 · 8.15
- [hls.js API 문서](https://github.com/video-dev/hls.js/blob/master/docs/API.md) — `liveSyncDurationCount`, `abrEwmaFastLive`
- [RFC 9114: HTTP/3](https://www.rfc-editor.org/rfc/rfc9114) · [RFC 9000: QUIC](https://www.rfc-editor.org/rfc/rfc9000)
- [AWS, CloudFront Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html)
- PokeClip 기록: [라이브 창](/posts/0-to-1/pokeclip-live-window-without-fork/) · [CDN 캐시 키와 원본 인증](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/) · [오류 0건](/posts/0-to-1/pokeclip-zero-errors-missing-playback/) · [tfdt 대조](/posts/0-to-1/pokeclip-cdn-timeline-normalization/) · [검은 화면](/posts/0-to-1/pokeclip-black-screen-three-causes/) · [목록 공개 경계](/posts/0-to-1/pokeclip-manifest-window-boundaries/) · [되감기 404](/posts/projects/rewind-missing-segment/)

다음 편: [LL-HLS는 부분 조각과 보류 응답으로 목록 대기를 줄입니다](/posts/tech-blurting/ll-hls-deep-dive/)
