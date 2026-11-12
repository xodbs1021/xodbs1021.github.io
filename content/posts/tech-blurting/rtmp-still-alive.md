---
title: "Flash 없이도 방송 송출 주소가 rtmp로 시작하는 이유"
date: 2026-06-20T03:09:07+09:00
lastmod: "2026-11-12T22:56:00+09:00"
description: "Flash Player는 2020년 말 지원이 끝났지만 OBS 내장 서비스 84개 가운데 81개가 rtmp·rtmps 주소로 송출합니다. RTMP가 Flash 부속 규약에서 송출 입구가 된 경위, 핸드셰이크·connect·publish 순서, 청크 인터리빙, 트랙 번호가 없던 옛 사양과 Enhanced RTMP, OBS가 프레임을 버리는 기준, SRT·RIST·WHIP과 견줄 때 볼 것을 공식 사양과 OBS 소스로 확인했습니다."
categories: ["tech-blurting"]
tags: ["RTMP", "Enhanced RTMP", "OBS", "SRT", "WHIP", "라이브 송출"]
draft: false
---

Adobe는 2020년 12월 31일 Flash Player 지원을 끝냈지만, OBS Studio 32.0.0에 들어 있는 송출 서비스 84개 가운데 81개는 아직 `rtmp://`나 `rtmps://` 주소로 송출합니다([services.json](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json)). RTMP는 Flash Player와 미디어 서버가 메시지를 주고받던 규약이었고, 사양이 공개된 뒤 Flash 없이 송출기와 서버 사이에 남았습니다. 「RTMP는 새 코덱과 여러 오디오 트랙을 못 싣는다」는 약점은 2023년 이후 Enhanced RTMP가 사양으로 메웠습니다. 남은 약점은 TCP 위에서 돈다는 점입니다. 망이 막히면 OBS의 송신 대기열이 차고, 쌓인 길이가 700ms를 넘으면 OBS가 프레임을 버립니다.

## RTMP는 Flash Player와 서버가 메시지를 주고받던 규약이었습니다 {#1-rtmp는-영상-프로토콜이-아니라-flash-부속품이었다}

RTMP(Real-Time Messaging Protocol)는 Macromedia가 Flash Player와 자기 서버를 잇는 데 쓴 규약입니다. 2002년 Macromedia는 Flash Communication Server MX를 내놓으면서 클라이언트 쪽 지원은 Flash Player 6에 이미 들어 있다고 밝혔습니다([MacTech, 2002-07-09](https://www.mactech.com/2002/07/09/macromedia-announces-flash-communication-server-mx/)). Enhanced RTMP 사양도 RTMP의 첫 공개 판을 2002년으로 적습니다([E-RTMP v1 문서](https://github.com/veovera/enhanced-rtmp/blob/main/docs/enhanced/enhanced-rtmp-v1.md)). Adobe는 2009년 1월 20일 RTMP 사양을 공개하겠다고 발표했고, 당시 기사는 RTMP를 Flash Media Server에서 콘텐츠를 보내려고 만든 규약으로 소개했습니다([Computerworld](https://www.computerworld.com/article/1578036/adobe-to-publish-streaming-specification.html)). 지금 읽을 수 있는 사양은 2012년 12월 21일 자 「Adobe's Real Time Messaging Protocol」입니다([Veovera 보관 사본](https://veovera.github.io/enhanced-rtmp/docs/legacy/rtmp-v1-0-spec.pdf)).

사양은 RTMP를 영상 전용 규약이 아니라 「TCP 같은 신뢰성 있는 스트림 위에서 영상·오디오·데이터 메시지를 다중화하는 양방향 서비스」로 정의합니다(1절). 영상과 오디오도 메시지 종류 가운데 하나입니다. 메시지 종류 8은 오디오, 9는 영상, 20은 AMF0로 인코딩한 명령, 18은 메타데이터 같은 데이터 메시지입니다(7.1절). `connect`나 `publish` 같은 명령도 같은 연결 위로 원격 호출처럼 오갑니다.

Flash Player가 사라져도 이 규약이 쓸모를 잃지 않은 것은 양쪽 끝이 Flash에 묶여 있지 않았기 때문입니다. 송출기는 메시지를 보내기만 하면 되고, 서버는 받은 메시지를 다른 형식으로 다시 묶으면 됩니다. Adobe는 2021년 1월 12일부터 Flash Player에서 Flash 콘텐츠 실행을 막았지만([Adobe](https://www.adobe.com/products/flashplayer/end-of-life.html)), 송출기와 서버 사이의 RTMP는 그 차단과 상관이 없었습니다.

## 송출 주소는 앱 이름과 스트림 키로 나뉩니다 {#2-obs에서-본-그-url--구조-분해}

OBS의 「서버」 칸에는 앱 이름까지 들어간 주소를, 「스트림 키」 칸에는 송출 이름을 넣습니다. OBS 32.0.0에 들어 있는 치지직(CHZZK) 항목은 서버 주소 하나(아래)와 지원 코덱 H.264를 적고, 권장 설정으로 키프레임 간격 1초, B 프레임 0, 최대 60fps, 영상 최대 8,000kbps, 오디오 최대 192kbps, 해상도 `1920x1080`을 둡니다([services.json 2580–2605행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json#L2580-L2605)).

```text
rtmp://global-rtmp.lip2.navercorp.com:8080/relay   + 스트림 키
└─┬─┘ └──────────────┬──────────────┘ └─┬─┘ └─┬─┘
규약              호스트                 포트   앱 이름
```

OBS의 RTMP 출력은 서버 칸 주소를 RTMP 연결 주소로 넘기고, 스트림 키는 송출할 스트림 이름으로 따로 넘깁니다([rtmp-stream.c 1178·1206행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-outputs/rtmp-stream.c#L1178-L1206)). 주소의 앱 이름은 `connect` 명령에, 스트림 키는 `publish` 명령의 이름 인자에 실립니다(사양 7.2.1.1·7.2.2.6절). OBS의 librtmp는 포트를 생략하면 `rtmp://`에 1935, `rtmps://`에 443을 씁니다([rtmp.c 715–723행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-outputs/librtmp/rtmp.c#L715-L723)). `rtmps://`는 같은 메시지를 TLS 연결 안에서 보냅니다. 같은 목록의 YouTube RTMPS 항목은 `rtmps://a.rtmps.youtube.com:443/live2`처럼 443 포트를 씁니다.

서버는 `publish` 이름으로 어느 채널의 송출인지 고르므로, 별도 인증이 없다면 스트림 키를 아는 사람은 같은 채널로 송출을 시작할 수 있습니다. SRT는 이 값을 streamid로, WHIP은 HTTP Bearer 토큰으로 넘깁니다. RFC 9725도 WHIP 토큰을 「RTMP 주소와 스트림 키를 나눠 주는 방식과 비슷하게」 나눠 줄 수 있다고 적었습니다([RFC 9725 4.7.1절](https://www.rfc-editor.org/rfc/rfc9725.html#section-4.7.1)).

## 첫 영상 메시지 전에 TCP·핸드셰이크·connect·publish를 차례로 거칩니다 {#3-obs-방송-시작-누르고-첫-프레임까지--135ms}

RTMP 송출은 TCP 연결 위에서 핸드셰이크를 하고, 명령 세 개를 차례로 보내 응답을 받은 뒤 영상을 보냅니다. [[fig-rtmp-publish]]에서 송출기가 응답을 기다리는 지점이 몇 번인지 보면 됩니다.

```mermaid {#fig-rtmp-publish kind="개념도" caption="RTMP 송출이 첫 영상 메시지까지 거치는 순서. 핸드셰이크 C0·S0은 1바이트, C1·S1·C2·S2는 1,536바이트라 양쪽이 주고받는 바이트는 합쳐 6,146바이트입니다. connect 뒤 서버는 Window Acknowledgement Size와 Set Peer Bandwidth를 보내고, publish 뒤 onStatus(NetStream.Publish.Start)로 송출 시작을 알립니다. 그림은 OBS(librtmp)의 동작대로 publish 응답을 받은 뒤 미디어를 보냅니다. 사양 7.3.1절 예시는 응답 전에 오디오를 보내기도 합니다. Adobe RTMP 사양 5.2절·7.3.1절과 OBS librtmp RTMP_ConnectStream을 바탕으로 다시 그렸습니다." source="https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-outputs/librtmp/rtmp.c#L1180-L1213"}
%%{init: {"sequence": {"width": 96, "actorMargin": 16}}}%%
sequenceDiagram
  accTitle: RTMP 송출 연결 순서
  accDescr: TCP 연결 뒤 송출기가 C0와 C1을 보내고 서버가 S0, S1, S2로 답한 다음 송출기가 C2를 보낸다. 이어 connect, createStream, publish 명령을 차례로 보내고 응답을 받은 뒤 오디오와 영상 메시지를 보낸다.
  participant O as OBS
  participant S as 서버
  O->>S: TCP 연결
  O->>S: C0 + C1
  S->>O: S0 + S1 + S2
  O->>S: C2
  O->>S: connect(앱 이름)
  S->>O: 창 크기 · 대역 설정
  S->>O: _result
  O->>S: createStream
  S->>O: _result(id)
  O->>S: publish(키)
  S->>O: onStatus
  O->>S: 오디오 · 영상
```

핸드셰이크에서 C0와 S0은 RTMP 버전 한 바이트(값 3)이고, C1·S1에는 시각 4바이트, 0 4바이트, 임의 바이트 1,528개가 들어갑니다. C2·S2는 상대의 C1·S1을 거의 그대로 되돌려 보내는 값입니다(5.2.2–5.2.4절). 송출기는 S1을 받아야 C2를 보내고, S2를 받아야 다른 데이터를 보낼 수 있습니다(5.2.1절). OBS의 librtmp는 `publish`에 대한 응답(`NetStream.Publish.Start`)을 받은 뒤에야 미디어를 보냅니다([rtmp.c 1180–1213·3383–3386행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-outputs/librtmp/rtmp.c#L1180-L1213)). 그래서 TCP 연결, 핸드셰이크, `connect`, `createStream`, `publish`까지 응답을 기다리는 왕복이 다섯 번 차례로 쌓입니다.

`connect`는 앱 단위 연결(NetConnection)을 열고, `createStream`은 그 안에 메시지 스트림(NetStream) 하나를 만들어 번호를 받습니다. 사양상 한 연결에 스트림을 여럿 만들 수 있지만, 송출에서는 보통 스트림 하나를 엽니다. 이 순서에 걸리는 시간은 송출기와 서버 사이 왕복 시간(RTT)에 따라 달라집니다. 단계별 ms 값은 사양에 없고 따로 재지 않았습니다.

## 큰 영상 메시지는 청크로 쪼개 제어 메시지와 섞어 보냅니다 {#4-메시지--청크--rtmp의-인터리빙}

RTMP는 메시지를 청크(chunk)라는 조각으로 나눠 보냅니다. 청크마다 청크 스트림 번호가 붙어 있어, 받는 쪽은 번호별로 조각을 모아 메시지를 다시 만듭니다(5.3절). 사양은 이유를 「영상처럼 크고 우선순위가 낮은 메시지가 오디오나 제어처럼 작고 우선순위가 높은 메시지를 막지 않게」라고 적습니다. 최대 청크 크기는 기본 128바이트이고, 어느 쪽이든 Set Chunk Size 메시지로 바꿀 수 있습니다(5.4.1절). OBS는 보내는 청크 크기를 4,096바이트로 올립니다([rtmp-stream.c 1208행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-outputs/rtmp-stream.c#L1208)).

영상에서 위 줄은 영상 메시지를 통째로 보낼 때, 아래 줄은 청크로 쪼갤 때입니다. 작은 오디오·제어 칸이 언제 도착하는지 보십시오.

{{< motion scene="ChunkInterleave" id="fig-chunks" kind="개념도" caption="영상 메시지를 통째로 보내면 오디오와 제어 메시지가 그 뒤에서 기다립니다. 청크로 쪼개면 영상 청크 사이에 끼어 먼저 도착하고, 받는 쪽은 청크를 다시 한 메시지로 합칩니다. 청크 수와 끼어드는 위치는 설명용 배치입니다." >}}

청크가 푸는 것은 응용 계층의 줄 서기입니다. 청크는 결국 TCP 연결 하나로 나가므로, TCP 세그먼트 하나를 잃으면 뒤에 온 바이트는 재전송이 올 때까지 응용으로 올라가지 못합니다. 이 머리 막힘(head-of-line blocking)은 청크로 풀리지 않습니다. SRT와 WebRTC가 UDP 위에서 재전송을 따로 설계한 이유가 여기에 있습니다.

## 옛 RTMP에는 트랙 번호가 없었고 Enhanced RTMP가 그 칸을 더했습니다 {#audio-message에-트랙-id가-없다--멀티-오디오-불가의-진짜-이유}

옛 RTMP의 오디오 메시지 본문은 FLV의 AUDIODATA 형식입니다. 머리에는 코덱(SoundFormat), 표본률(SoundRate), 표본 크기(SoundSize), 모노·스테레오(SoundType)만 있고 트랙 번호 칸이 없습니다([FLV 사양 10.1, E.4.2.1절](https://veovera.github.io/enhanced-rtmp/docs/legacy/video-file-format-v10-1-spec.pdf)). 영상 코덱 번호에도 HEVC와 AV1이 없었습니다. 그래서 「RTMP로는 오디오를 여러 트랙으로 못 보내고 새 코덱도 못 쓴다」는 말이 오래 맞았습니다.

Veovera Software Organization이 정리한 Enhanced RTMP(E-RTMP)가 이 칸을 더했습니다([veovera/enhanced-rtmp](https://github.com/veovera/enhanced-rtmp)).

| 판 | 확인한 문서 | 더한 것 |
|---|---|---|
| v1 | 2023-03-23 첫 베타, 2023-07-31 승인([v1 문서](https://github.com/veovera/enhanced-rtmp/blob/main/docs/enhanced/enhanced-rtmp-v1.md)) | FourCC로 HEVC · AV1 · VP9 신호, HDR 색 정보, 메타데이터 패킷 |
| v2 | 2024-03-17 알파, 2025-04-17 정식판(r1), 확인한 판은 2026-01-31 개정판 r2([v2 문서](https://github.com/veovera/enhanced-rtmp/blob/main/docs/enhanced/enhanced-rtmp-v2.md)) | 오디오 · 영상 멀티트랙, Opus · FLAC · AC-3 · E-AC-3, 다중 채널 오디오, 재연결 요청 |

OBS는 29.1(2023-05-02)에서 Enhanced RTMP로 AV1·HEVC를 보내는 기능을 넣었고, 그때는 YouTube 베타에만 켜져 있었습니다([OBS 29.1 릴리스 노트](https://github.com/obsproject/obs-studio/releases/tag/29.1.0)). OBS 32.0.0의 YouTube RTMPS 항목에는 h264·hevc·av1이, 치지직과 Twitch 항목에는 h264만 적혀 있습니다. 사양에 칸이 생긴 것과 그 칸을 쓸 수 있는 것은 다릅니다. 송출기와 받는 서버가 모두 지원해야 새 코덱이나 멀티트랙이 실제로 오갑니다.

PokeClip은 본방은 그대로 RTMP로 치지직에 보내고, 오디오 6트랙은 같은 영상 인코더를 나눠 쓰는 별도 SRT 출력(안은 MPEG-TS)으로 받습니다. 트랙 구성은 [6트랙 입력 계약 글](/posts/0-to-1/pokeclip-six-track-input-contract/), 송출 구조는 [본방 인코더 공유 글](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/)에 있습니다.

## 네트워크가 느리면 OBS 송신 버퍼가 차고 프레임을 버립니다 {#5-obs-빨간-경고의-정체--send-buffer-가득-참}

OBS의 RTMP 출력은 인코더가 만든 패킷을 대기열에 넣고, 소켓으로 보낼 수 있을 때 꺼내 보냅니다. 영상 패킷이 들어올 때마다 대기열 맨 앞 영상과 맨 뒤 영상의 디코딩 시각 차이를 잽니다. 이 차이가 기본 700ms를 넘으면 버려도 되는 낮은 우선순위 프레임을, 900ms를 넘으면 P 프레임까지 대기열에서 지웁니다. 오디오 패킷과 키프레임은 지우지 않습니다([rtmp-stream.c 1421–1449·1566–1630·1719–1720행](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-outputs/rtmp-stream.c#L1566-L1630)). OBS 통계 창의 「손실된 프레임 (네트워크)」이 이렇게 버린 수입니다([ko-KR 번역 231행](https://github.com/obsproject/obs-studio/blob/32.0.0/frontend/data/locale/ko-KR.ini#L231)).

고급 설정에서 동적 비트레이트를 켜면 프레임을 지우는 대신, 대기열이 200ms를 넘을 때 인코더 비트레이트를 낮춥니다(같은 파일 43행, 1608–1625행). 어느 쪽이든 원인은 송출기 업로드가 인코더 비트레이트를 따라가지 못하는 것이고, 고치는 길은 비트레이트를 낮추거나 업로드 경로를 바꾸는 것입니다.

연결이 끊기면 OBS 기본 설정은 자동 재연결을 켜 두고, 첫 재시도까지 2초를 기다리며 최대 25번 시도합니다([OBSBasic.cpp 792–794행](https://github.com/obsproject/obs-studio/blob/32.0.0/frontend/widgets/OBSBasic.cpp#L792-L794)). 재시도마다 대기 시간이 약 1.5배씩 늘고 15분에서 멈춥니다([obs-output.c 32–33·2976–2983행](https://github.com/obsproject/obs-studio/blob/32.0.0/libobs/obs-output.c#L2976-L2983)). 다시 붙을 때는 TCP 연결과 핸드셰이크부터 다시 합니다. 끊긴 동안 시청자 화면이 어떻게 보이고 플랫폼이 몇 초 뒤 방송을 끝내는지는 플랫폼마다 다르며 확인하지 않았습니다.

## SRT·WHIP·RIST가 있어도 플랫폼 입구는 RTMP에 남았습니다 {#7-대체-후보들--그런데-왜-안-갈아탔나}

OBS에는 RTMP 말고도 송출 규약 셋이 들어왔습니다. 들어온 판과 날짜는 각 릴리스 노트로 확인했습니다.

| 규약 | 전송 | OBS에 들어온 판 | 사양 | 암호화 |
|---|---|---|---|---|
| RTMP · E-RTMP | TCP | 처음부터, E-RTMP 코덱은 29.1(2023-05) | Adobe 사양(2012), E-RTMP v2(2025-04 정식) | RTMPS(TLS)를 쓸 때 |
| SRT | UDP + 재전송 | [25.0](https://github.com/obsproject/obs-studio/releases/tag/25.0.0)(2020-03) | Haivision 오픈소스(2017), [인터넷 드래프트](https://datatracker.ietf.org/doc/draft-sharabayko-srt/)(만료) | passphrase를 줄 때 AES |
| RIST | UDP + 재전송 | [27.2](https://github.com/obsproject/obs-studio/releases/tag/27.2.0)(2022-02) | VSF [TR-06-1 Simple Profile](https://static.vsf.tv/download/technical_recommendations/VSF_TR-06-1_2018_10_17.pdf)(2018-10) | OBS 29.0부터 설정 칸 |
| WHIP | UDP(WebRTC) | [30.0](https://github.com/obsproject/obs-studio/releases/tag/30.0.0)(2023-11) | [RFC 9725](https://www.rfc-editor.org/rfc/rfc9725.html)(2025-03) | DTLS-SRTP 필수 |

SRT는 Haivision이 만들어 2017년 4월 오픈소스로 공개했습니다. 받는 쪽이 정해 둔 시간(latency) 안에서만 재전송을 기다리고, 그 시간을 넘긴 패킷은 건너뜁니다. 자세한 동작은 [SRT latency 글](/posts/tech-blurting/srt-broadcaster-protocol/)에 있습니다. RIST(Reliable Internet Stream Transport)는 방송 업계 단체 VSF(Video Services Forum)의 RIST 활동 그룹이 만든 사양으로, RTP로 나르는 MPEG-TS에 재전송을 더합니다. OBS 29.0은 SRT와 RIST 출력에 암호화·인증 설정을 더했습니다([릴리스 노트](https://github.com/obsproject/obs-studio/releases/tag/29.0.0)). WHIP은 WebRTC 송출 세션을 HTTP 요청 하나로 여는 IETF 표준이고, [WHIP 글](/posts/tech-blurting/whip-whep-modern-ingest/)에서 따로 다룹니다.

그래도 플랫폼 입구는 바뀌지 않았습니다. OBS 32.0.0 서비스 목록 84개 가운데 rtmp만 쓰는 항목이 69개, rtmps만 6개, 둘 다 6개이고, 나머지 3개는 HTTPS 주소입니다. 목록에 SRT·RIST·WHIP 주소로 등록된 서비스는 없습니다. 방송자가 다른 규약을 쓰려면 「사용자 지정」 서비스에 받는 쪽이 따로 알려 준 주소를 넣어야 합니다.

## 바꿀지 판단할 때는 코덱보다 송출기 기본값을 봅니다 {#8-rtmp가-안-죽는-진짜-이유--생태계-관성}

RTMP를 다른 규약으로 바꿀지 고를 때 갈리는 질문은 「규약이 무엇을 할 수 있나」보다 「받는 쪽과 송출기가 지금 무엇을 기본으로 받아 주나」입니다. 자주 섞이는 오해는 아래와 같습니다.

- **「RTMP는 HEVC·AV1·여러 오디오 트랙을 못 싣는다」** — 옛 사양 기준으로만 맞습니다. Enhanced RTMP v1이 새 코덱을, v2가 멀티트랙을 더했습니다. 쓸 수 있는지는 받는 서비스의 지원 목록에 달렸고, OBS 서비스 목록의 코덱 칸이 첫 확인 지점입니다.
- **「청크 인터리빙이 있으니 RTMP에는 머리 막힘이 없다」** — 응용 계층의 큰 메시지 막힘만 풉니다. TCP의 손실 재전송 대기는 그대로입니다.
- **「SRT로 바꾸면 기본으로 암호화된다」** — libsrt는 passphrase를 설정했을 때만 암호화를 켭니다([SRTO_PASSPHRASE](https://github.com/Haivision/srt/blob/v1.5.3/docs/API/API-socket-options.md#SRTO_PASSPHRASE)). RTMP도 RTMPS를 써야 TLS가 걸립니다.
- **「프레임이 버려지면 인코더가 느린 것이다」** — 「손실된 프레임 (네트워크)」은 송신 대기열이 700ms를 넘었다는 뜻입니다. 인코딩이 밀려 건너뛴 프레임은 OBS가 따로 셉니다.

망 손실이 잦은 구간을 지나야 하거나 오디오를 트랙별로 남겨야 한다면, 받는 쪽이 SRT나 E-RTMP 멀티트랙을 받는지부터 확인하십시오. 그런 요구가 없고 받는 서비스가 RTMP만 받는다면, 송출 규약보다 업로드 대역과 비트레이트가 먼저 볼 곳입니다.

## 출처

- [Adobe's Real Time Messaging Protocol (2012-12-21), Veovera 보관 사본](https://veovera.github.io/enhanced-rtmp/docs/legacy/rtmp-v1-0-spec.pdf) — 1절 정의, 5.2절 핸드셰이크, 5.3·5.4.1절 청크, 7절 명령과 송출 흐름
- [Adobe Flash Video File Format Specification 10.1, Veovera 보관 사본](https://veovera.github.io/enhanced-rtmp/docs/legacy/video-file-format-v10-1-spec.pdf) — E.4.2.1 AUDIODATA
- [veovera/enhanced-rtmp](https://github.com/veovera/enhanced-rtmp) — [v1 문서](https://github.com/veovera/enhanced-rtmp/blob/main/docs/enhanced/enhanced-rtmp-v1.md), [v2 문서](https://github.com/veovera/enhanced-rtmp/blob/main/docs/enhanced/enhanced-rtmp-v2.md), [v2 커밋 기록](https://github.com/veovera/enhanced-rtmp/commits/main/docs/enhanced/enhanced-rtmp-v2.md)(2026-11-12 확인)
- [MacTech, 「Macromedia announces Flash Communication Server MX」 (2002-07-09)](https://www.mactech.com/2002/07/09/macromedia-announces-flash-communication-server-mx/)
- [Computerworld, 「Adobe to publish streaming specification」 (2009-01-20)](https://www.computerworld.com/article/1578036/adobe-to-publish-streaming-specification.html)
- [Adobe, Flash Player EOL General Information](https://www.adobe.com/products/flashplayer/end-of-life.html)
- [obsproject/obs-studio 32.0.0 `services.json`](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/rtmp-services/data/services.json) — 서비스 84개의 주소와 코덱 목록(2026-11-12 집계)
- [obsproject/obs-studio 32.0.0 `librtmp/rtmp.c`](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-outputs/librtmp/rtmp.c) — 기본 포트, publish 응답 뒤 미디어 시작
- [obsproject/obs-studio 32.0.0 `rtmp-stream.c`](https://github.com/obsproject/obs-studio/blob/32.0.0/plugins/obs-outputs/rtmp-stream.c) — 주소·키 전달, 청크 4,096바이트, 프레임 버림 기준 700·900ms, 동적 비트레이트
- [obsproject/obs-studio 32.0.0 `OBSBasic.cpp`](https://github.com/obsproject/obs-studio/blob/32.0.0/frontend/widgets/OBSBasic.cpp#L792-L794) · [`obs-output.c`](https://github.com/obsproject/obs-studio/blob/32.0.0/libobs/obs-output.c#L2976-L2983) — 재연결 기본값과 대기 증가
- OBS 릴리스 노트 [25.0](https://github.com/obsproject/obs-studio/releases/tag/25.0.0) · [27.2](https://github.com/obsproject/obs-studio/releases/tag/27.2.0) · [29.0](https://github.com/obsproject/obs-studio/releases/tag/29.0.0) · [29.1](https://github.com/obsproject/obs-studio/releases/tag/29.1.0) · [30.0](https://github.com/obsproject/obs-studio/releases/tag/30.0.0)
- [RFC 9725: WebRTC-HTTP Ingestion Protocol (WHIP)](https://www.rfc-editor.org/rfc/rfc9725.html) (2025-03)
- [Haivision/srt v1.5.3 API 소켓 옵션](https://github.com/Haivision/srt/blob/v1.5.3/docs/API/API-socket-options.md)
- [draft-sharabayko-srt (datatracker)](https://datatracker.ietf.org/doc/draft-sharabayko-srt/)
- [Haivision, 「Haivision and Wowza Form SRT Alliance」 (2017-04)](https://www.haivision.com/about/press-releases/haivision-wowza-form-srt-alliance-support-new-open-source-low-latency-video-streaming-initiative/)
- [VSF TR-06-1 RIST Simple Profile (2018-10-17)](https://static.vsf.tv/download/technical_recommendations/VSF_TR-06-1_2018_10_17.pdf)

다음 편: [HLS는 라이브 영상을 재생 목록과 조각 파일로 나눕니다](/posts/tech-blurting/hls-just-files/)
