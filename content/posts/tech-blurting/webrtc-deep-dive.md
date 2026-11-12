---
title: "WebRTC는 NAT 뒤 두 브라우저를 ICE 후보로 잇습니다"
date: 2026-06-20T10:04:12+09:00
lastmod: "2026-11-12T14:14:56+09:00"
description: "공유기(NAT) 뒤의 두 브라우저는 서로의 주소를 모릅니다. WebRTC는 W3C API(2021년 1월 Recommendation)와 IETF 프로토콜 묶음(RFC 8825 등)으로, ICE가 host·srflx·relay 후보를 모아 연결되는 쌍을 고르게 했습니다. STUN과 TURN의 역할, SDP 제안·응답, 메시와 SFU의 연결 수, Simulcast와 SVC, 대규모 시청에서 CDN 캐시를 못 쓰는 비용을 RFC와 W3C 문서로 확인했습니다."
categories: ["tech-blurting"]
tags: ["WebRTC", "ICE", "STUN", "TURN", "SDP", "SFU"]
draft: false
---

브라우저 두 개가 영상을 직접 주고받으려면, 대부분 공유기(NAT) 뒤에 있어 서로의 바깥 주소를 모른다는 문제부터 풀어야 합니다. WebRTC는 브라우저 API를 W3C가, 그 아래 프로토콜을 IETF가 나눠 정했습니다. W3C 「WebRTC: Real-Time Communication in Browsers」는 2017년 11월 2일 첫 후보 권고안(CR)이 됐고 2021년 1월 26일 권고안(Recommendation)이 됐습니다. 프로토콜 묶음의 개요 RFC 8825도 2021년 1월에 나왔습니다. 연결의 핵심은 ICE입니다. 양쪽이 host · srflx · relay 후보 주소를 모아 쌍마다 연결 확인을 해 보고 통한 쌍 하나를 고르며, 직접 경로가 모두 막히면 TURN 서버가 중계합니다. 여럿이 모이면 서버(SFU)가 패킷을 골라 나눠 주고, 대규모 시청에서는 CDN 캐시를 쓸 수 없다는 비용이 남습니다.

## 브라우저끼리 실시간 미디어를 주고받을 표준이 필요했습니다 {#1-webrtc가-뭔가--3줄-정의}

WebRTC 이전에는 브라우저에서 카메라를 켜고 상대와 영상을 주고받으려면 Flash 같은 플러그인이나 별도 프로그램이 필요했습니다. WebRTC는 이를 두 표준 묶음으로 나눴습니다. 웹 페이지가 부르는 JavaScript API는 W3C가 정하고, 망에 나가는 패킷의 형식과 순서는 IETF가 정합니다.

| 층 | 문서 | 상태 |
|---|---|---|
| 브라우저 API | [W3C WebRTC 1.0](https://www.w3.org/TR/webrtc/) | 첫 CR 2017-11-02, REC 2021-01-26, 최신 REC 2025-03-13([이력](https://www.w3.org/standards/history/webrtc/)) |
| 프로토콜 개요 | [RFC 8825](https://www.rfc-editor.org/rfc/rfc8825.html) | 2021-01 |
| 제안 · 응답 절차(JSEP) | [RFC 8829](https://www.rfc-editor.org/rfc/rfc8829.html) | 2021-01 |
| 미디어 전송(RTP) | [RFC 8834](https://www.rfc-editor.org/rfc/rfc8834.html) | 2021-01 |
| 연결 수립(ICE) | [RFC 8445](https://www.rfc-editor.org/rfc/rfc8445.html) | 2018-07 |

예전 글의 「2017년 W3C 표준화」는 첫 CR을 표준 완성으로 읽은 것입니다. 2017년부터 2021년 사이 API는 여러 차례 후보 권고안으로 다시 나왔습니다.

## 세 API가 장치·연결·데이터를 맡습니다 {#2-세-가지-핵심-api}

웹 페이지가 쓰는 API는 셋입니다. `getUserMedia`는 사용자 허락을 받아 카메라 · 마이크 트랙을 얻고([Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/)), `RTCPeerConnection`은 상대와의 연결을 맡고, `RTCDataChannel`은 같은 연결 위로 임의 데이터를 보냅니다. 데이터 채널은 DTLS 위 SCTP로 나릅니다([RFC 8831](https://www.rfc-editor.org/rfc/rfc8831.html)).

```javascript
// 발췌: 내 트랙을 연결에 붙이고 SDP 제안을 만든다. STUN · TURN 주소는 자리표시.
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.example.com" }, { urls: "turn:turn.example.com", username: "u", credential: "p" }],
});
stream.getTracks().forEach((track) => pc.addTrack(track, stream));
pc.onicecandidate = (e) => e.candidate && sendToPeer({ candidate: e.candidate }); // 전달 방법은 앱이 정함
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
sendToPeer({ sdp: pc.localDescription }); // 시그널링: 표준 밖
```

`sendToPeer`는 표준에 없습니다. SDP 제안과 ICE 후보를 상대에게 어떻게 전할지(시그널링)는 WebRTC가 일부러 정하지 않았고, 서비스가 WebSocket 같은 자기 수단을 고릅니다. 송출 방향에서 이 빈칸을 HTTP로 정한 것이 [WHIP](/posts/tech-blurting/whip-whep-modern-ingest/)입니다.

## NAT 뒤에서는 ICE가 후보를 모아 연결되는 쌍을 고릅니다 {#3-webrtc의-진짜-어려움--nat-통과}

집이나 회사 공유기 뒤의 기기는 사설 주소를 갖고, 바깥으로 나갈 때 공유기가 주소와 포트를 바꿔 줍니다. 그래서 각 브라우저는 자기 사설 주소만 알고, 상대가 볼 수 있는 바깥 주소는 모릅니다. ICE(Interactive Connectivity Establishment)는 쓸 수 있는 주소 후보를 모두 모아 짝지어 보고, 실제로 통하는 쌍을 고르는 절차입니다([RFC 8445](https://www.rfc-editor.org/rfc/rfc8445.html)).

### STUN은 바깥에서 본 내 주소를 알려 줍니다 {#stun--내-공인-ip가-뭐야}

STUN(Session Traversal Utilities for NAT) 서버에 Binding 요청을 보내면, 서버는 요청이 어느 주소와 포트에서 왔는지를 응답에 담아 돌려줍니다([RFC 8489](https://www.rfc-editor.org/rfc/rfc8489.html)). 공유기가 바꿔 준 바깥 주소입니다. ICE는 이것을 server-reflexive(srflx) 후보라고 부릅니다. STUN 서버는 주소를 알려 줄 뿐 미디어를 나르지 않습니다.

srflx 주소가 있다고 늘 직접 붙는 것은 아닙니다. 공유기가 목적지마다 다른 바깥 포트를 쓰면(주소 · 포트 의존 매핑), STUN 서버가 본 주소와 상대가 볼 주소가 달라 직접 경로가 막힐 수 있습니다([RFC 4787](https://www.rfc-editor.org/rfc/rfc4787.html)). 방화벽이 UDP를 막는 망도 있습니다. 직접 연결이 얼마나 자주 되는지는 망과 공유기 종류에 따라 달라, 비율은 적지 않았습니다.

### TURN은 직접 경로가 막힐 때 패킷을 중계합니다 {#turn--마지막-보루-릴레이}

TURN(Traversal Using Relays around NAT) 서버는 클라이언트에게 자기 쪽 주소 하나를 빌려주고(relay 후보), 그 주소로 오가는 패킷을 대신 받아 넘깁니다([RFC 8656](https://www.rfc-editor.org/rfc/rfc8656.html)). 양쪽 모두 바깥으로 나가는 연결만 되면 붙을 수 있으므로 마지막 수단이 됩니다. 대가는 모든 미디어가 TURN 서버를 지난다는 것입니다. 중계한 만큼 서버 대역과 비용이 들고, 경로가 길어지면 지연도 늘어납니다.

### ICE는 후보 쌍을 확인해 하나를 고릅니다 {#ice--stunturn을-조정하는-프레임워크}

ICE 후보는 넷입니다. 내 장치의 주소(host), STUN이 알려 준 바깥 주소(srflx), TURN이 빌려준 주소(relay), 연결 확인 중에 새로 알게 된 주소(peer-reflexive)입니다(RFC 8445 5.1.1절). 각 후보에는 우선순위가 붙고, RFC가 권하는 종류별 값은 host 126, peer-reflexive 110, srflx 100, relay 0입니다(5.1.2.2절). 직접 경로를 먼저 시험하고 중계는 나중에 쓰겠다는 뜻입니다.

양쪽은 시그널링으로 후보를 교환한 뒤 내 후보와 상대 후보를 짝지어 확인 목록을 만들고, 쌍마다 STUN Binding 요청을 보내 응답이 오는지 봅니다(6.1.2·7.2절). 통한 쌍 가운데 주도 쪽(controlling agent)이 하나를 지명하면 그 쌍으로 미디어가 흐릅니다. 후보를 다 모을 때까지 기다리지 않고 생기는 대로 보내는 방식이 Trickle ICE입니다([RFC 8838](https://www.rfc-editor.org/rfc/rfc8838.html)).

영상은 세 단계를 같은 도식에서 보여 줍니다. 후보가 어디서 생기는지, 어느 쌍이 통하는지, 어느 쌍이 골라지는지 차례로 보십시오.

{{< motion scene="IceCandidatePairs" id="fig-ice" kind="개념도" caption="ICE는 양쪽이 모은 host · srflx · relay 후보를 짝지어 연결 확인을 해 보고, 통한 쌍 하나를 골라 미디어를 보냅니다. 이 예에서는 사설 주소끼리는 망이 달라 실패하고, 두 NAT 사이의 srflx 쌍이 골라지며 relay 쌍은 예비로 남습니다. 실제 ICE는 모든 쌍을 우선순위대로 확인하며, 어느 쌍이 통하는지는 망마다 다릅니다." >}}

## SDP 제안과 응답으로 코덱과 전송을 합의합니다 {#4-sdp--미디어-협상의-언어}

두 브라우저는 어떤 코덱과 전송 방식을 쓸지도 합의해야 합니다. 그 형식이 SDP(Session Description Protocol, [RFC 8866](https://www.rfc-editor.org/rfc/rfc8866.html))이고, 한쪽이 제안(offer)을 만들면 다른 쪽이 그 가운데 고른 응답(answer)을 돌려줍니다(JSEP, RFC 8829). 아래는 영상 · 오디오를 하나씩 담은 제안의 줄인 모습입니다.

```text
v=0
o=- 1234567 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1
m=video 9 UDP/TLS/RTP/SAVPF 96 97
a=rtpmap:96 VP8/90000
a=rtpmap:97 H264/90000
a=mid:0
a=sendrecv
m=audio 9 UDP/TLS/RTP/SAVPF 111
a=rtpmap:111 opus/48000/2
a=mid:1
a=sendrecv
```

| 줄 | 뜻 |
|---|---|
| `m=video … 96 97` | 영상 미디어 줄, 쓸 수 있는 RTP 페이로드 번호 96·97 |
| `a=rtpmap:96 VP8/90000` | 96번은 VP8, 시계 90kHz |
| `UDP/TLS/RTP/SAVPF` | UDP 위 DTLS로 키를 나누는 보안 RTP와 피드백(RTCP) |
| `a=group:BUNDLE 0 1` | 영상과 오디오를 ICE 경로 하나로 묶음([RFC 9143](https://www.rfc-editor.org/rfc/rfc9143.html)) |
| `a=sendrecv` | 이 줄은 보내기와 받기를 모두 함 |

응답 쪽은 제안에 있는 코덱 가운데 자기가 쓸 것만 남겨 돌려줍니다. 미디어 줄(m=)마다 RTP 흐름이 따로 있으므로, WebRTC에서는 트랙이 미디어 줄 단위로 나뉩니다.

## 여럿이 모이면 메시 대신 SFU가 패킷을 골라 보냅니다 {#5-p2p의-한계--인원이-많아지면}

RFC 7667은 여러 사람이 RTP로 통화하는 구성을 이름 붙여 정리합니다([RTP Topologies](https://www.rfc-editor.org/rfc/rfc7667.html)). 모두가 모두와 직접 잇는 메시(Topo-Mesh), 서버가 미디어를 풀어 하나로 섞어 다시 인코딩하는 믹서(Topo-Mixer, 흔히 MCU라 부름), 서버가 풀지 않고 받은 패킷을 골라 넘기는 선택 전달 장치(Selective Forwarding Middlebox, 흔히 SFU라 부름)입니다.

메시는 사람이 늘수록 연결이 빠르게 늘어납니다. [[fig-mesh-sfu]]에서 두 선이 벌어지는 정도를 보십시오.

{{< chart id="fig-mesh-sfu" kind="설명용 가정" caption="참가자 N명일 때 필요한 연결 수. 메시는 모든 쌍을 이어 N(N−1)/2개, SFU는 참가자마다 서버와 하나씩 N개입니다. 측정값이 아니라 공식으로 계산한 값입니다." source="RFC 7667 3.4절(메시)·3.7절(SFM)의 구성에서 계산" height="340px" >}}
{
  "grid": {"left": 8, "right": 32, "top": 40, "bottom": 8, "containLabel": true},
  "legend": {"top": 0, "data": ["메시 N(N−1)/2", "SFU N"]},
  "xAxis": {"type": "category", "name": "참가자 수 N", "data": ["2", "3", "4", "5", "6", "7", "8", "9", "10"]},
  "yAxis": {"type": "value", "name": "연결 수", "min": 0, "max": 50, "interval": 10},
  "series": [
    {"name": "메시 N(N−1)/2", "type": "line", "itemStyle": {"color": "#087f8b"}, "lineStyle": {"width": 3}, "label": {"show": true, "position": "top", "fontWeight": "bold"}, "data": [1, 3, 6, 10, 15, 21, 28, 36, 45]},
    {"name": "SFU N", "type": "line", "itemStyle": {"color": "#7a8a9b"}, "lineStyle": {"width": 2, "type": "dashed"}, "data": [2, 3, 4, 5, 6, 7, 8, 9, 10]}
  ]
}
{{< /chart >}}

연결 수보다 무거운 것은 참가자 한 명의 업로드입니다. 메시에서는 자기 영상을 N−1명에게 따로 보내야 하므로 N이 10이면 같은 영상을 9번 올려 보냅니다. SFU에서는 서버에 한 번만 올리고, 서버가 다른 참가자에게 나눠 줍니다. 받는 쪽은 여전히 N−1개 흐름을 받아 화면에 직접 배치합니다. 믹서(MCU)는 서버가 영상을 모두 풀어 한 화면으로 섞어 다시 인코딩하므로 참가자는 하나만 받지만, 서버가 디코딩 · 합성 · 인코딩을 모두 맡아 연산이 큽니다. SFU는 패킷을 고르기만 하므로 서버 연산이 적은 대신, 시청자마다 알맞은 화질을 고를 재료가 있어야 합니다.

## Simulcast와 SVC는 화질을 나누는 위치가 다릅니다 {#6-simulcast-vs-svc--시청자별-화질-맞춤}

SFU가 시청자마다 다른 화질을 주려면 보내는 쪽이 여러 화질을 만들어 둬야 합니다. 방법은 둘입니다.

| 항목 | Simulcast | SVC |
|---|---|---|
| 보내는 것 | 해상도 · 비트레이트가 다른 독립 인코딩 여러 개 | 층(layer)으로 쌓은 인코딩 하나 |
| SFU가 고르는 것 | 시청자마다 인코딩 하나 | 시청자마다 보낼 층까지 |
| 문서 | [RFC 8853](https://www.rfc-editor.org/rfc/rfc8853.html)(SDP의 rid로 인코딩 구분) | [W3C webrtc-svc](https://www.w3.org/TR/webrtc-svc/)의 `scalabilityMode`(Working Draft, 2026-09-14) |
| 코덱 | 코덱 제약이 적음 | VP9 · AV1은 공간 · 시간 층 모두, VP8 · H.264 · H.265는 시간 층만 |

`scalabilityMode`의 이름은 `L(공간 층 수)T(시간 층 수)`입니다. `L1T3`은 해상도 하나에 프레임률 층 셋, `L3T3`은 해상도 층 셋(2:1 비율)과 시간 층 셋입니다. Simulcast는 인코더가 같은 화면을 여러 번 인코딩하므로 보내는 쪽 연산과 업로드가 늘어납니다. SVC는 인코딩이 하나지만 공간 층을 쓰려면 VP9나 AV1이 필요합니다. 예전 글의 「Zoom은 Simulcast, Google Meet은 AV1 SVC」는 확인할 공식 문서를 찾지 못해 지웠습니다.

## 대규모 시청에서는 CDN 캐시를 못 쓰는 것이 비용이 됩니다 {#8-webrtc를-라이브-방송에-쓰려면}

WebRTC를 라이브 방송에 쓰는 표준은 방향별로 하나씩입니다. 송출자가 서버로 보내는 WHIP은 2025년 3월 [RFC 9725](https://www.rfc-editor.org/rfc/rfc9725.html)가 됐고, 서버가 시청자에게 보내는 WHEP은 2026년 10월 기준 아직 드래프트입니다([WHIP 글](/posts/tech-blurting/whip-whep-modern-ingest/)). 예전 글은 WHIP 방향을 「시청자 → 서버」로 잘못 적었습니다.

시청 쪽 비용 구조는 HLS와 다릅니다. HLS 조각은 같은 파일을 CDN이 여러 시청자에게 그대로 줄 수 있지만, WebRTC는 시청자마다 ICE 경로와 DTLS 세션이 따로 있고 SRTP 키도 세션마다 달라 공유할 사본이 없습니다. 시청자가 늘면 SFU의 세션 수와 전송량이 함께 늘어나므로, 많은 시청자를 받으려면 SFU를 여러 지역에 두고 서로 잇는 구조가 필요합니다. 그 비용이 HLS의 몇 배인지는 구조와 요금에 따라 달라, 예전 글의 「100배」 같은 배수와 출처 없는 지연 비교 차트는 지웠습니다.

## WebRTC를 쓸 때 갈리는 판단과 흔한 오해

- **「P2P라서 서버가 필요 없다」** — 시그널링 서버는 늘 필요하고, NAT 바깥 주소를 알려면 STUN, 직접 경로가 막히면 TURN이 필요합니다. 여럿이면 SFU도 필요합니다.
- **「STUN이 미디어를 중계한다」** — STUN은 주소만 알려 줍니다. 중계는 TURN입니다. TURN 대역은 운영 비용에 바로 잡힙니다.
- **「홀 펀칭은 80%쯤 성공한다」** — 이런 비율은 망 구성에 따라 크게 달라 일반화할 수 없습니다. 자기 서비스의 선택된 후보 쌍 종류(`RTCIceCandidatePairStats`)를 재는 편이 정확합니다.
- **「SFU가 영상을 풀어 다시 인코딩한다」** — 그것은 믹서(MCU)입니다. SFU는 패킷을 고르기만 하므로, 화질 선택 재료(Simulcast · SVC)를 보내는 쪽이 만들어야 합니다.
- **「WebRTC는 2017년에 표준이 됐다」** — 2017년은 첫 후보 권고안이고, 권고안은 2021년 1월입니다.

대화하듯 주고받아야 하는 몇 명 규모라면 WebRTC가 맞습니다. 시청자가 많고 지연을 몇 초 견딜 수 있다면, CDN 캐시를 쓰는 HLS 계열과 비용 구조부터 견주십시오.

## 출처

- [W3C, WebRTC: Real-Time Communication in Browsers](https://www.w3.org/TR/webrtc/) · [발행 이력](https://www.w3.org/standards/history/webrtc/)(2026-11-12 확인)
- [W3C, Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/) · [W3C, Scalable Video Coding (SVC) Extension for WebRTC](https://www.w3.org/TR/webrtc-svc/) (Working Draft 2026-09-14)
- [RFC 8825 (WebRTC 개요)](https://www.rfc-editor.org/rfc/rfc8825.html) · [RFC 8829 (JSEP)](https://www.rfc-editor.org/rfc/rfc8829.html) · [RFC 8834 (WebRTC의 RTP)](https://www.rfc-editor.org/rfc/rfc8834.html) · [RFC 8831 (데이터 채널)](https://www.rfc-editor.org/rfc/rfc8831.html)
- [RFC 8445 (ICE)](https://www.rfc-editor.org/rfc/rfc8445.html) — 5.1.1절 후보 종류, 5.1.2.2절 우선순위, 6.1.2절 확인 목록 · [RFC 8838 (Trickle ICE)](https://www.rfc-editor.org/rfc/rfc8838.html)
- [RFC 8489 (STUN)](https://www.rfc-editor.org/rfc/rfc8489.html) · [RFC 8656 (TURN)](https://www.rfc-editor.org/rfc/rfc8656.html) · [RFC 4787 (NAT UDP 동작 요구 사항)](https://www.rfc-editor.org/rfc/rfc4787.html)
- [RFC 8866 (SDP)](https://www.rfc-editor.org/rfc/rfc8866.html) · [RFC 9143 (BUNDLE)](https://www.rfc-editor.org/rfc/rfc9143.html) · [RFC 8853 (Simulcast)](https://www.rfc-editor.org/rfc/rfc8853.html)
- [RFC 7667 (RTP Topologies)](https://www.rfc-editor.org/rfc/rfc7667.html) — 메시 · 믹서 · 선택 전달 장치
- [RFC 9725 (WHIP)](https://www.rfc-editor.org/rfc/rfc9725.html) · [draft-ietf-wish-whep](https://datatracker.ietf.org/doc/draft-ietf-wish-whep/)

다음 편: [WHIP은 POST 한 번으로 WebRTC 송출 세션을 엽니다](/posts/tech-blurting/whip-whep-modern-ingest/)
