---
title: "WHIP은 POST 한 번으로 WebRTC 송출 세션을 엽니다"
date: 2026-06-20T10:12:18+09:00
lastmod: "2026-11-12T14:14:56+09:00"
description: "WebRTC는 시그널링을 정하지 않아 송출기와 서버가 서로 맞지 않았습니다. WHIP(RFC 9725, 2025년 3월)은 SDP 제안을 HTTP POST로 보내고 201 응답의 SDP와 Location으로 세션을 엽니다. 그 뒤에도 ICE와 DTLS 왕복이 남는다는 점, 종료와 Trickle ICE, Enhanced RTMP 이후의 코덱 비교, 아직 초안인 WHEP, CDN 캐시를 못 쓰는 시청 비용, 날짜를 확인한 도입 현황을 RFC와 공식 문서로 정리했습니다."
categories: ["tech-blurting"]
tags: ["WHIP", "WHEP", "WebRTC", "RFC 9725", "OBS", "라이브 송출"]
draft: false
---

WebRTC는 SDP 제안과 응답을 어떻게 주고받을지 정하지 않아, 송출기마다 서버마다 따로 연동해야 했습니다. WHIP(WebRTC-HTTP Ingestion Protocol)은 SDP 제안을 HTTP POST 본문으로 보내고 `201 Created` 응답의 SDP와 `Location` 헤더로 세션을 여는 규칙으로 이 칸을 메웠고, 2025년 3월 RFC 9725(Proposed Standard)가 됐습니다. OBS는 그보다 앞선 30.0(2023-11)에서 WHIP 출력을 넣었습니다. 다만 HTTP 요청 한 번 뒤에도 ICE 연결 확인과 DTLS 핸드셰이크 왕복이 남습니다. 미디어 전까지 응답을 기다리는 왕복은 RTMP와 WHIP 모두 네 번 안팎이라, 「WHIP 1왕복 대 RTMP 5왕복」이라는 비교는 맞지 않습니다. 시청 쪽 짝인 WHEP은 2026년 10월 기준 아직 인터넷 드래프트입니다.

## WebRTC는 시그널링을 정하지 않아 송출기와 서버가 서로 맞지 않았습니다 {#1-문제의-본질--webrtc가-표준화-안-한-영역}

WebRTC는 연결에 필요한 부품을 표준으로 정해 둡니다. 미디어 조건은 SDP 제안·응답(JSEP, [RFC 8829](https://www.rfc-editor.org/rfc/rfc8829.html))으로 합의하고, NAT 너머 경로는 ICE([RFC 8445](https://www.rfc-editor.org/rfc/rfc8445.html))로 찾고, 암호 키는 DTLS-SRTP([RFC 5764](https://www.rfc-editor.org/rfc/rfc5764.html))로 나눕니다. 그런데 SDP 제안을 상대에게 어떻게 전달할지는 정하지 않았습니다. RFC 9725 서론은 「WebRTC는 응용 계층의 시그널링 전송을 일부러 정하지 않았다」고 쓰고, 이 빈칸이 WebRTC를 송출(ingest) 규약으로 쓰는 데 걸림돌이었다고 적습니다([RFC 9725 1절](https://www.rfc-editor.org/rfc/rfc9725.html#section-1)).

화상회의 서비스는 자기 웹 앱과 자기 서버만 맞으면 되므로 WebSocket이든 무엇이든 고르면 됐습니다. 방송은 송출기(OBS, 하드웨어 인코더)와 받는 서버를 만드는 회사가 다릅니다. 송출기가 서버마다 다른 시그널링을 따로 구현해야 한다면, 주소와 키만 넣으면 되는 RTMP를 대신하기 어렵습니다. WHIP은 이 송출 방향 하나만 HTTP로 정합니다.

## WHIP은 2025년 3월 RFC 9725가 됐습니다 {#2-whip의-발표--2023년-ietf-rfc-9725}

WHIP은 IETF WISH 작업 그룹의 draft-ietf-wish-whip이 2025년 3월 RFC 9725로 나온 것입니다. 표준 트랙의 Proposed Standard이고, 저자는 Sergio Garcia Murillo와 Alexandre Gouaillard입니다([datatracker](https://datatracker.ietf.org/doc/rfc9725/)). 예전 글은 「2023년 RFC 9725」라고 적었는데, 2023년은 OBS 30.0이 드래프트를 따라 WHIP 출력을 넣은 해입니다([OBS 30.0 릴리스 노트](https://github.com/obsproject/obs-studio/releases/tag/30.0.0), 2023-11-12).

구현이 RFC보다 먼저 나왔기 때문에, 지금도 드래프트 판을 기준으로 적힌 문서가 남아 있습니다. Cloudflare Stream 문서는 2026년 10월 27일 판에서도 `draft-ietf-wish-whip-06`을 쓴다고 적습니다([Cloudflare Stream WebRTC](https://developers.cloudflare.com/stream/webrtc-beta/)). 서로 다른 구현을 이을 때는 상대가 어느 판을 따르는지 확인해야 합니다.

## HTTP 한 번 뒤에도 ICE와 DTLS 왕복이 남습니다 {#rtmp와-비교}

RFC 9725의 순서는 POST와 `201 Created`, 그다음 ICE·STUN 연결 확인, DTLS 설정, 그리고 RTP·RTCP 미디어입니다(1절 그림 1). 영상에서 미디어가 흐르기 전에 왕복 카운터가 몇까지 오르는지 보십시오.

{{< motion scene="WhipRoundTrips" id="fig-whip-round-trips" kind="개념도" caption="WHIP은 POST 한 번으로 SDP를 주고받지만, 미디어가 흐르기 전에 ICE 연결 확인과 DTLS 핸드셰이크까지 합쳐 왕복 4번이 지나갑니다. DTLS 1.2 전체 핸드셰이크 기준이고, HTTPS 연결을 새로 여는 왕복은 뺐습니다." >}}

두 규약이 미디어 전까지 응답을 기다리는 왕복을 사양 순서대로 세면 아래와 같습니다. 실측이 아니라 사양의 순서를 센 값입니다.

| 단계 | RTMP | WHIP |
|---|---|---|
| 연결 | TCP 1 | (HTTPS를 새로 열면 TCP 1 + TLS 1.3 1) |
| 세션 합의 | 핸드셰이크 1, `connect` 1, `createStream` 1 | POST · 201 1 |
| 경로 · 암호 | (RTMPS면 TLS가 더 붙음) | ICE 연결 확인 1 이상, DTLS 1.2 2 |
| 합계 | 4 | 4, 새 HTTPS 연결이면 6 |

RTMP는 S2를 받은 뒤에야 다른 데이터를 보낼 수 있고([RTMP 사양 5.2.1절](https://veovera.github.io/enhanced-rtmp/docs/legacy/rtmp-v1-0-spec.pdf)), 송출 흐름 예시에서 송출기는 `publish` 응답 전에 데이터를 보내기 시작합니다(7.3.1절). DTLS 1.2 전체 핸드셰이크는 쿠키 교환 없이 왕복 2번입니다([RFC 6347 4.2절](https://www.rfc-editor.org/rfc/rfc6347.html#section-4.2)). 결국 연결을 여는 비용은 비슷합니다. WHIP의 차이는 연결 수보다, 미디어가 TCP가 아닌 UDP 위 RTP로 흘러 손실이 뒤 데이터를 붙잡지 않는다는 데 있습니다.

## SDP 제안을 POST하고 201 응답의 Location으로 세션을 다룹니다 {#실제-http-요청}

송출기는 WHIP 엔드포인트 주소로 SDP 제안을 POST합니다. 본문 형식은 `application/sdp`이고, 송출기는 `sendonly`를, 서버의 응답은 `recvonly`를 씁니다([4.2절](https://www.rfc-editor.org/rfc/rfc9725.html#section-4.2)). 아래는 RFC 그림 2의 머리를 옮기고 SDP 본문을 줄인 것입니다.

```http
POST /whip/endpoint HTTP/1.1
Host: whip.example.com
Content-Type: application/sdp
Authorization: Bearer <토큰>

v=0
...
m=audio 9 UDP/TLS/RTP/SAVPF 111
a=sendonly
m=video 9 UDP/TLS/RTP/SAVPF 96
a=sendonly
```

```http
HTTP/1.1 201 Created
ETag: "xyzzy"
Content-Type: application/sdp
Location: https://whip.example.com/session/id

v=0
...
a=recvonly
```

`Location`이 가리키는 세션 주소가 이후 모든 조작의 대상입니다. 인증은 HTTP 인증을 따르고, Bearer 토큰([RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html))은 모든 구현이 지원해야 합니다. 토큰의 형식과 나눠 주는 방식은 사양 밖입니다([4.7절](https://www.rfc-editor.org/rfc/rfc9725.html#section-4.7)). HTTP라서 기존 장치를 그대로 씁니다. 엔드포인트는 `307 Temporary Redirect`로 요청을 다른 미디어 서버에 넘겨 부하를 나눌 수 있고, 과부하면 `503`과 `Retry-After`로 답합니다. `301`·`302`는 쓰면 안 됩니다.

ICE 후보를 나중에 보내는 Trickle ICE와 ICE 재시작은 세션 주소에 `PATCH`(`application/trickle-ice-sdpfrag`)로 보냅니다. 송출기는 `201` 응답을 받을 때까지 모은 후보를 붙잡아 두었다가 한 번에 보냅니다. 성공하면 Trickle은 `204 No Content`, 재시작은 새 ETag와 함께 `200 OK`를 받습니다([4.3절](https://www.rfc-editor.org/rfc/rfc9725.html#section-4.3)). RFC는 이 기능을 한 절에서는 권장, 다른 절에서는 선택이라고 적어, 구현마다 지원이 다를 수 있습니다.

## 끝낼 때는 Location에 DELETE를 보냅니다 {#종료도-http}

송출을 끝낼 때 송출기는 세션 주소로 `DELETE`를 보내야 하고, 서버는 미디어 자원을 놓고 ICE와 DTLS 세션을 닫습니다. 예고 없이 끊긴 경우는 ICE의 동의 확인(consent freshness, [RFC 7675](https://www.rfc-editor.org/rfc/rfc7675.html))이 응답 없음을 알아챕니다. RTMP에도 `deleteStream` 명령이 있지만(사양 7.2.2.3절), 송출기가 죽으면 서버는 TCP 연결 종료로 알게 됩니다. [[fig-whip-session]]은 WHIP 세션 하나의 처음과 끝입니다.

```mermaid {#fig-whip-session kind="개념도" caption="WHIP 세션 하나의 순서. POST와 201로 SDP를 주고받은 뒤 선택 사항인 PATCH로 ICE 후보를 더 보내고, ICE 연결 확인과 DTLS를 거쳐 RTP를 보내다가 Location 주소에 DELETE를 보내 끝냅니다. POST에는 Bearer 토큰이 붙고, PATCH와 DELETE는 201 응답의 Location 주소로 보냅니다. RFC 9725 1절 그림 1과 4.2·4.3절을 줄여 다시 그렸습니다." source="https://www.rfc-editor.org/rfc/rfc9725.html#section-1"}
%%{init: {"sequence": {"width": 96, "actorMargin": 16}}}%%
sequenceDiagram
  accTitle: WHIP 세션의 시작과 끝
  accDescr: 송출기가 SDP 제안을 POST하고 서버가 201 Created와 SDP 응답, Location을 돌려준다. 송출기는 선택적으로 PATCH로 ICE 후보를 더 보내고 204를 받는다. ICE 연결 확인과 DTLS 핸드셰이크 뒤 RTP 미디어를 보내고, 끝낼 때 Location 주소에 DELETE를 보내 200을 받는다.
  participant O as 송출기
  participant S as WHIP 서버
  O->>S: POST · SDP 제안
  S->>O: 201 · SDP 응답<br/>Location
  O->>S: PATCH<br/>후보(선택)
  S->>O: 204
  O->>S: STUN 확인
  S->>O: 응답
  O->>S: DTLS
  S->>O: DTLS
  O->>S: RTP · RTCP
  O->>S: DELETE
  S->>O: 200 OK
```

## 코덱 자유는 이제 WHIP만의 장점이 아닙니다 {#3-whip의-단순함이-가져온-큰-가치}

WHIP의 코덱은 SDP 제안과 응답이 정합니다. 송출기가 가능한 코덱을 적어 보내면 서버가 그 가운데서 고릅니다. 예전에는 이것이 「RTMP는 H.264뿐이고 WHIP은 AV1·HEVC도 된다」는 큰 차이로 소개됐지만, 지금은 Enhanced RTMP가 HEVC·AV1·VP9와 Opus를 사양에 넣었습니다([RTMP 글](/posts/tech-blurting/rtmp-still-alive/)). 어느 쪽이든 실제로 쓸 수 있는 코덱은 받는 서버가 정합니다.

| 받는 쪽 | WHIP 영상 · 오디오 | 확인한 문서 |
|---|---|---|
| Cloudflare Stream | VP9 · VP8 · H.264(Constrained Baseline, Level 3.1), 오디오는 Opus 권장 | [Cloudflare Stream WebRTC](https://developers.cloudflare.com/stream/webrtc-beta/)(2026-10-27 판) |
| MediaMTX | AV1 · VP9 · VP8 · H.265 · H.264, Opus · G.722 · G.711 | [MediaMTX WebRTC 문서](https://github.com/bluenviron/mediamtx/blob/main/docs/3-publish/03-webrtc.md) |

WHIP이 지금도 RTMP와 다른 점은 셋입니다. 인증 · 리디렉션 · 부하 분산을 HTTP 장치로 하고, 미디어가 UDP 위 RTP로 흘러 손실이 뒤 패킷을 붙잡지 않으며, 암호화(DTLS-SRTP)가 선택이 아니라 필수입니다. 대신 WebRTC가 필수로 정한 오디오 코덱은 Opus와 G.711이라([RFC 7874](https://www.rfc-editor.org/rfc/rfc7874.html)) RTMP에서 쓰던 AAC를 그대로 넘기지 못하는 경우가 많고, Cloudflare처럼 H.264 프로필을 제한하는 서버도 있습니다.

## WHEP는 아직 초안입니다 {#4-whep--whip의-짝-시청자-측-표준}

WHEP(WebRTC-HTTP Egress Protocol)은 같은 방식을 시청 쪽에 쓰는 규약입니다. 2026년 11월 12일에 확인한 최신판은 draft-ietf-wish-whep-05(2026-10-11)이고, 작업 그룹 상태는 「IESG에 발행 요청」, IESG 상태는 「AD 검토 · 수정판 필요」입니다. 목표 지위는 Proposed Standard이고 만료일은 2027년 4월 14일입니다([datatracker](https://datatracker.ietf.org/doc/draft-ietf-wish-whep/)). 예전 글은 「이미 표준화됐다」고 적었는데, 아직 RFC가 아닙니다.

흐름은 WHIP과 같은 모양입니다. 재생기가 늘 먼저 SDP 제안(`recvonly` 권장)을 POST하고, 서버가 `201 Created`와 SDP 응답, `Location`으로 답합니다. 서버가 제안을 받아들이지 않으면 `406 Not Acceptable`에 자기 쪽 제안을 실어 돌려줄 수 있고, 재생기는 그 답을 `PATCH`로 보냅니다. 끝낼 때는 `DELETE`를 보내지만, 서버는 `DELETE`를 받지 못해도 ICE 동의 만료나 DTLS 종료로 자원을 정리해야 합니다([draft-05 4.3–4.4절](https://datatracker.ietf.org/doc/html/draft-ietf-wish-whep-05#section-4.3)).

## 시청 쪽 비용은 CDN 캐시를 못 쓰는 데서 커집니다 {#5-whep의-진짜-한계--시청자-확장}

HLS 조각은 HTTP로 받는 파일이라, CDN 가장자리 서버가 한 번 받아 둔 사본을 많은 시청자에게 그대로 줄 수 있습니다. WebRTC 시청은 시청자마다 ICE 경로와 DTLS 세션이 따로 있고, SRTP 키도 세션마다 다릅니다. 같은 영상이라도 시청자에게 나가는 패킷은 세션마다 따로 암호화돼야 하므로, 미디어 서버(SFU)가 시청자 수만큼 패킷을 만들어 보내야 합니다.

| 항목 | HLS · LL-HLS | WHEP(WebRTC) |
|---|---|---|
| 전달 단위 | HTTP로 받는 조각 · 재생 목록 | 세션별 RTP 패킷 |
| 공용 캐시 | 같은 조각을 CDN이 여러 시청자에게 줌 | 시청자마다 암호 세션이 달라 공유 사본이 없음 |
| 시청자가 늘면 | CDN 가장자리 전송량이 늘어남 | 미디어 서버의 세션 · 전송량이 함께 늘어남 |
| 지연을 정하는 것 | 조각 · 부분 조각 길이와 재생 목록 갱신 | 망 왕복과 지터 버퍼 |

그래서 WebRTC로 많은 시청자를 받으려면 미디어 서버를 여러 지역에 늘어놓고 서로 잇는 구조를 따로 운영해야 합니다. 이 비용이 HLS의 몇 배인지는 서비스 구조와 요금에 따라 달라 한 숫자로 말할 수 없습니다. 예전 글의 「10–30배」·「100배」 같은 배수는 근거가 없어 지웠습니다. 실제 제품 조건의 예로, Cloudflare Stream은 2026년 10월 15일부터 WebRTC 전송을 따로 과금하고, WHIP으로 받은 송출은 WHEP으로만 볼 수 있으며 녹화와 HLS 재생은 아직 지원하지 않는다고 적습니다.

## 도입 현황은 확인한 날짜와 함께만 씁니다 {#8-산업-도입-현황-2024-기준}

아래는 2026년 11월 12일에 공식 문서 · 릴리스 노트 · 소스로 확인한 것만 적었습니다.

| 대상 | 확인한 내용 | 근거 |
|---|---|---|
| OBS Studio | 30.0(2023-11-12)에서 WHIP 출력 추가 | [릴리스 노트](https://github.com/obsproject/obs-studio/releases/tag/30.0.0) |
| FFmpeg | 2025년 5월 WHIP 묶개(muxer) 추가, 로컬 9.0.2(Homebrew)에서 `-h muxer=whip` 확인(2026-11-12) | [커밋 기록](https://github.com/FFmpeg/FFmpeg/commits/master/libavformat/whip.c) |
| Cloudflare Stream | WHIP · WHEP 정식 제공(GA), WebRTC 전송 과금 2026-10-15부터 | [문서](https://developers.cloudflare.com/stream/webrtc-beta/)(2026-10-27 판) |
| MediaMTX | `/<경로>/whip` 주소로 WHIP 송출 수신 | [문서](https://github.com/bluenviron/mediamtx/blob/main/docs/3-publish/03-webrtc.md) |

예전 글의 Twitch 연도별 도입 일정, YouTube · AWS IVS 상태 표, 「WHIP Compatibility Suite」, OvenMediaEngine 설정 예시는 공식 문서로 확인하지 못해 지웠습니다. 국내 라이브 플랫폼의 WHIP 도입 여부도 공개 근거가 없어 적지 않았습니다. OBS 32.0.0에 들어 있는 서비스 목록에는 WHIP 주소로 등록된 서비스가 없습니다([services.json](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json)).

## WHIP을 고를 때는 연결 수보다 받는 쪽 조건을 봅니다

- **「WHIP은 1왕복, RTMP는 5왕복」** — HTTP 교환만 센 비교입니다. ICE와 DTLS까지 세면 미디어 전 왕복은 RTMP와 비슷합니다.
- **「WHIP을 쓰면 AV1을 쓸 수 있다」** — 받는 서버가 그 코덱을 받아야 합니다. Cloudflare Stream은 2026-10-27 판 문서 기준 AV1을 받지 않습니다.
- **「WHIP · WHEP 모두 표준이다」** — WHIP은 RFC 9725이고, WHEP은 2026-10 기준 드래프트 -05입니다.
- **「WHIP으로 받으면 시청도 저지연이 된다」** — 송출 규약과 시청 규약은 따로 고릅니다. 시청까지 WebRTC로 하면 CDN 캐시 대신 미디어 서버 전송 비용을 집니다.

송출기와 서버 사이 망에서 손실이 잦고 받는 서버가 WHIP을 지원한다면 WHIP이 맞을 수 있습니다. 받는 서비스가 RTMP만 받는다면 규약을 바꿀 수 없으니, 먼저 받는 쪽이 무엇을 받는지 확인하십시오.

## 출처

- [RFC 9725: WebRTC-HTTP Ingestion Protocol (WHIP)](https://www.rfc-editor.org/rfc/rfc9725.html) (2025-03, Proposed Standard) · [datatracker](https://datatracker.ietf.org/doc/rfc9725/)
- [draft-ietf-wish-whep-05: WebRTC-HTTP Egress Protocol (WHEP)](https://datatracker.ietf.org/doc/html/draft-ietf-wish-whep-05) (2026-10-11) · [datatracker 상태](https://datatracker.ietf.org/doc/draft-ietf-wish-whep/)(2026-11-12 확인)
- [RFC 8829 (JSEP)](https://www.rfc-editor.org/rfc/rfc8829.html) · [RFC 8445 (ICE)](https://www.rfc-editor.org/rfc/rfc8445.html) · [RFC 5764 (DTLS-SRTP)](https://www.rfc-editor.org/rfc/rfc5764.html) · [RFC 6347 (DTLS 1.2)](https://www.rfc-editor.org/rfc/rfc6347.html) · [RFC 7874 (WebRTC 오디오 코덱)](https://www.rfc-editor.org/rfc/rfc7874.html) · [RFC 7675 (Consent Freshness)](https://www.rfc-editor.org/rfc/rfc7675.html) · [RFC 6750 (Bearer Token)](https://www.rfc-editor.org/rfc/rfc6750.html)
- [Adobe's Real Time Messaging Protocol (2012), Veovera 보관 사본](https://veovera.github.io/enhanced-rtmp/docs/legacy/rtmp-v1-0-spec.pdf)
- [OBS Studio 30.0 릴리스 노트](https://github.com/obsproject/obs-studio/releases/tag/30.0.0) · [OBS 32.0.0 `services.json`](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json)
- [Cloudflare Stream — WebRTC](https://developers.cloudflare.com/stream/webrtc-beta/) (2026-10-27 판, 2026-11-12 확인)
- [bluenviron/mediamtx 「WebRTC clients」 문서](https://github.com/bluenviron/mediamtx/blob/main/docs/3-publish/03-webrtc.md) (2026-11-12 확인)
- [FFmpeg `libavformat/whip.c` 커밋 기록](https://github.com/FFmpeg/FFmpeg/commits/master/libavformat/whip.c)

다음 편: [373MB/s에서 6Mbps로 — 조건을 명시하고 이해하는 H.264 압축](/posts/tech-blurting/h264-deep-dive/)
