---
title: "Flash는 2020년에 죽었는데 RTMP는 왜 안 죽나"
date: 2026-06-20T03:09:07+09:00
categories: ["tech-blurting"]
draft: false
---

OBS 켜본 사람은 다 알 거다. 방송 설정에 들어가면 "서버"와 "스트림 키"를 입력하라고 한다. 그 서버 주소가 `rtmp://`로 시작한다.

2026년인데 왜 아직도 RTMP일까. 만든 회사(Adobe)는 Flash 지원을 2020년 12월에 공식 종료했고, Flash 자체는 진작에 죽었는데.

치지직, 트위치, 유튜브 라이브 — 다 RTMP로 받는다. 이번 글은 [지난 글](../cdn-for-live-streaming/)에 이어 **레벨 2 (스트리밍 프로토콜) 시리즈의 첫 번째**다. 1996년 Flash 시대에 태어난 프로토콜이 왜 30년이 지나도 안 죽는지 정리한 노트다.

---

## 1. RTMP는 영상 프로토콜이 아니라 Flash 부속품이었다

RTMP를 이해하려면 1990년대 후반 인터넷이 어땠는지 알아야 한다.

![1996년 Flash 시대](/images/flash-era-streaming.png)

```
1996년 인터넷 환경:
- 평균 대역폭: 56 Kbps 다이얼업 모뎀
- 브라우저: 넷스케이프 네비게이터
- HTML5? 없음
- JavaScript? 매우 제한적
- 영상 코덱? 없음
```

웹에서 영상을 보여줄 방법이 사실상 없었다. 영상 파일을 받아서 RealPlayer나 Windows Media Player로 봤다. **웹과 영상이 분리돼 있던 시대**.

이때 등장한 게 **Macromedia Flash** (1996년). 원래는 애니메이션 도구였는데 2002년 Flash MX부터 영상 재생 기능이 들어갔다.

장점이 강력했다.
- 모든 브라우저 동일 동작 (Flash Player만 설치하면 끝)
- 운영체제 무관 (Windows, Mac, Linux 다 됨)
- DRM 지원

2005년 유튜브가 출범하면서 Flash가 인터넷 영상 표준이 됐다.

### RTMP의 진짜 정체 — Flash Media Server 전용 통신

Flash Player가 영상을 받으려면 프로토콜이 필요했다. Macromedia(나중에 Adobe 인수)가 만든 게 **RTMP (Real-Time Messaging Protocol)**.

```
2002년 RTMP 1.0 출시
- 목적: Flash Player ↔ Flash Media Server 통신
- 전송 단위: 메시지 (Message)
- 기반: TCP 포트 1935
```

처음엔 폐쇄적 프로토콜. Adobe Flash Media Server를 사야만 쓸 수 있었다. **2009년에 Adobe가 스펙을 공개**하면서 오픈소스 RTMP 서버들이 나왔다 (nginx-rtmp-module, SRS, OvenMediaEngine 등).

이 시점이 결정적이다. 마침 트위치/저스틴TV가 라이브 스트리밍을 띄우던 시기였고, 공개된 RTMP가 그 인프라의 기반이 됐다.

---

## 2. OBS에서 본 그 URL — 구조 분해

방송 설정 화면에서 본 적 있는 그 주소.

![RTMP URL 구조 분해](/images/rtmp-url-structure.png)

```
rtmp://rtmp.chzzk.naver.com/live/abcd-1234-efgh
└┬─┘ └─────────┬─────────┘ └┬┘ └────────┬────────┘
프로토콜    호스트         앱     스트림 키
```

각 부분의 역할.

**프로토콜**: `rtmp` / `rtmps` / `rtmpt`
- `rtmps`: TLS 암호화 (RTMP over TLS, 포트 443)
- `rtmpt`: HTTP 80 터널링 (회사 방화벽 우회)

**호스트**: 서버 주소. 포트 생략 시 1935.

**앱 (Application)**: 서버 안의 논리적 공간. `live`, `vod`, `chat` 같은 이름. 같은 서버에서 여러 용도를 구분.

**스트림 키**: 어떤 스트림인지 식별. **동시에 같은 키로 송출하면 충돌**. 보통 인증 토큰 역할도 함.

치지직에서 방송 시작할 때 발급받은 스트림 키가 곧 인증 수단이다. 누군가에게 알려주면 그 사람이 내 채널에 송출할 수 있다. 유출되면 큰일 난다.

---

## 3. OBS "방송 시작" 누르고 첫 프레임까지 — 135ms

OBS의 "방송 시작" 버튼을 누르고 실제 데이터가 흐르기까지 무슨 일이 벌어지나.

![RTMP 연결 시퀀스](/images/rtmp-connection-sequence.png)

5단계의 핸드셰이크가 순차적으로 일어난다.

**1단계: TCP 연결** (~30ms)
```
OBS → 서버: SYN → SYN-ACK → ACK
```

**2단계: RTMP Handshake** (~45ms)
```
OBS → 서버: C0+C1 (1537 byte)
서버 → OBS: S0+S1+S2 (3073 byte)
OBS → 서버: C2 (1536 byte)
```
총 9KB 데이터 교환. 버전 호환 + 타임스탬프 동기화 + 랜덤 데이터 신원 확인.

**3단계: NetConnection** (~30ms)
```
OBS → 서버: connect("live")
서버 → OBS: _result (Window Ack Size, Set Peer BW)
```

**4단계: NetStream** (~30ms)
```
OBS → 서버: createStream()
서버 → OBS: _result (streamId = 1)
OBS → 서버: publish("abcd-1234-efgh", "live")
서버 → OBS: onStatus (NetStream.Publish.Start)
```

**5단계: 영상 송출**
```
OBS → 서버: Video Message (계속)
OBS → 서버: Audio Message (계속)
```

총 ~135ms. **이래서 OBS의 "방송 시작"이 즉시 안 보이고 잠깐 텀이 있다.**

### NetConnection vs NetStream — 두 단계로 나뉜 이유

RTMP는 연결을 두 계층으로 나눈다.

```
[NetConnection: rtmp://chzzk/live]
    │
    ├── NetStream 1: 메인 방송 (1080p60)
    ├── NetStream 2: 백업 (720p30)
    └── NetStream 3: 채팅 메타데이터
```

이론적으로 한 연결에서 여러 스트림 동시 가능. 실제로는 OBS가 1:1로 단순화해서 쓴다.

---

## 4. 메시지 + 청크 — RTMP의 인터리빙

RTMP가 HLS와 근본적으로 다른 점: **메시지 기반**.

HLS는 파일 단위. RTMP는 메시지 단위.

```
RTMP 메시지 종류:
- Set Chunk Size
- Acknowledgement
- User Control (play, pause, seek)
- Window Acknowledgement Size
- Set Peer Bandwidth
- Audio Message (오디오 데이터)
- Video Message (비디오 데이터)
- Data Message (메타데이터)
- Command Message (RPC - 함수 호출)
```

**영상/오디오 데이터도 메시지 중 하나일 뿐**. RTMP는 본질적으로 양방향 RPC 프로토콜이다.

### Chunk Stream — 큰 메시지가 작은 메시지를 막지 않게

문제: Video Message는 100KB짜리도 있고, ACK 메시지는 4바이트짜리도 있다. 큰 메시지를 그대로 보내면 그 사이 작은 제어 메시지가 못 들어간다.

해결: 메시지를 **청크(Chunk)** 로 쪼개서 인터리빙(섞어 짜기).

![Message + Chunk 인터리빙](/images/rtmp-message-chunk-interleaving.png)

```
[전송 순서]
Video Chunk 1 → ACK → Video Chunk 2 → Video Chunk 3 → Control msg → Video Chunk 4 ...
```

이게 **RTMP식 HoL Blocking 회피**다. 한 TCP 연결 안에서 메시지를 인터리빙. 큰 비디오 청크 사이에 작은 ACK가 끼어들 수 있다.

### Audio Message에 트랙 ID가 없다 — 멀티 오디오 불가의 진짜 이유

RTMP 스펙을 보면 Audio Message에 트랙 번호 같은 필드가 없다.

```
RTMP Audio Message:
- Codec, Sample Rate, Sample Size, Stereo/Mono 정보만
- 트랙 번호 같은 필드 없음
```

여러 오디오 트랙을 보내려면 "이 패킷은 트랙 2번이야"를 표시할 필드가 있어야 하는데, 그게 없다.

NetStream을 여러 개 만들면 이론상 가능하지만 영상-오디오 동기화가 안 맞는다. 동기화는 한 NetStream 안에서만 보장된다.

PokeClip 같은 멀티 오디오 분석 파이프라인에서 RTMP 대신 MPEG-TS(PID 기반)를 쓰는 진짜 이유다.

---

## 5. OBS 빨간 경고의 정체 — Send Buffer 가득 참

OBS 방송 중 가끔 우하단에 빨간 아이콘이 뜨고 "건너뛴 프레임" 카운트가 올라간다. 정확히 뭐가 일어나나.

![OBS Send Buffer와 드롭 프레임](/images/obs-send-buffer-drop.png)

OBS는 인코딩한 데이터를 즉시 보내지 않는다. **Send Buffer**에 쌓아두고 TCP가 처리할 수 있는 만큼만 보낸다.

```
[정상]
인코더 → Send Buffer (5%) → TCP 전송 (잘 흐름)

[네트워크 느림]
인코더 → Send Buffer (50%, 증가 중) → TCP 전송 (느림)

[네트워크 매우 느림]
인코더 → Send Buffer (100% 가득) → TCP 못 보냄
                ↓
        프레임 드롭 (인코더가 만든 프레임 버림)
```

방송 중 OBS 우하단 통계의 "건너뛴 프레임"이 카운트되는 게 이거다. **방송 화질이 깨지거나 끊어 보이는 시청자 경험의 시작점**이다.

해결책 두 가지.
1. 비트레이트 낮추기 (네트워크 부담 줄임)
2. 더 좋은 인터넷으로 옮기기

### 연결 끊김 자동 처리

라이브 송출 중 RTMP 연결이 끊어지면:

```
[네트워크 일시 단절]
OBS의 TCP가 끊김 감지 (수 초 ~ 수십 초)
→ OBS가 자동 재연결 시도
→ 재연결 성공 시 새 RTMP 핸드셰이크부터 다시
→ 그 사이 시청자 화면 끊김
```

OBS의 "스트림 자동 재시도" 옵션. 기본값 10초 간격 무한 재시도.

치지직 같은 플랫폼은 OBS 재연결 동안 "잠시 연결 중..." 화면. 30초 이상 끊기면 방송 종료 처리.

---

## 6. RTMP의 6가지 한계

20년 쓰면서 드러난 RTMP의 문제점.

| # | 문제 | 영향 |
|---|------|------|
| 1 | 평문 전송 (RTMPS 보급 느림) | 보안 취약 |
| 2 | H.265/AV1 미지원 (Adobe 스펙 업데이트 중단) | 차세대 코덱 못 씀 |
| 3 | 멀티 오디오 트랙 불가 | PokeClip 같은 분석 못 함 |
| 4 | TCP 지속 연결 → CDN 캐시 불가 | 시청자 측엔 진작에 폐기 |
| 5 | 포트 1935 방화벽 차단 잦음 | 회사망에서 안 됨 |
| 6 | 모바일 SDK 약함 | 모바일 송출 불편 |

대안이 여럿 있다.

---

## 7. 대체 후보들 — 그런데 왜 안 갈아탔나

![Ingest 프로토콜 비교](/images/ingest-protocols-comparison.png)

각 후보의 특징.

### SRT — 신뢰성 있는 UDP

[지난 시리즈](../streaming-basics-from-scratch/)에서 본 그거다. UDP + ARQ로 재전송, 멀티 트랙(MPEG-TS), 기본 AES 암호화.

근데 안 갈아타는 이유:
- OBS의 SRT 설정이 RTMP보다 복잡 (latency, maxbw 등 옵션)
- 플랫폼이 SRT 인제스트 거의 미지원
- 스트리머가 RTMP로 잘 되는데 옮길 이유 없음

### WHIP — WebRTC 기반 IETF 표준

가장 유력한 후계자.

![WHIP 흐름](/images/whip-flow-vs-rtmp.png)

WebRTC가 양방향 통화용. 거기서 "송출" 방향만 표준화한 게 **WHIP (WebRTC-HTTP Ingestion Protocol)**. 2023년 IETF RFC 9725.

```
WHIP 흐름:
1. OBS → 서버: HTTP POST /whip
   Body: SDP Offer (자기 코덱/네트워크 정보)
2. 서버 → OBS: HTTP 201 Created
   Body: SDP Answer
3. WebRTC 연결 (ICE, DTLS)
4. RTP로 영상 송출
```

장점:
- **지연 200ms 이하** (RTMP의 1/10)
- IETF 표준
- NAT/방화벽 통과 강함 (ICE/STUN/TURN)
- 최신 코덱 다 지원 (H.265, AV1)

**OBS 30 버전부터 WHIP 출력 기본 지원**. 유튜브, 트위치가 베타 테스트 중.

근데 아직 안 퍼진 이유:
- 플랫폼 인프라가 RTMP 중심 (전환 비용)
- WebRTC가 UDP라 통신사/지역에 따라 불안정
- 트랜스코딩 파이프라인 변경 필요

### RIST — 방송 업계 표준

BBC, NBC 같은 방송계 컨소시엄이 만든 신뢰성 전송 프로토콜. UDP + 재전송 + FEC.

- 방송 장비 호환성 우수
- FEC로 손실 미리 대비 (재전송 안 기다림)
- MPEG-TS 네이티브

근데 OBS 미지원. 일반 개발자에겐 낯섦. 방송 백홀(스튜디오→방송국)에서나 우세.

---

## 8. RTMP가 안 죽는 진짜 이유 — 생태계 관성

기술적으로 RTMP보다 나은 대안이 있다. 그런데 안 죽는다. 이유는 기술이 아니다.

**1. 도입 비용 = 0**
스트리머가 OBS로 그냥 송출. 추가 설치 없음. 가장 큰 진입 장벽이 없다.

**2. 호환성 100%**
모든 플랫폼이 받음. 어디로 송출해도 됨.

**3. 20년치 트러블슈팅 자료**
문제 생기면 검색하면 다 나옴. 새 프로토콜은 도움받을 데 적음.

**4. ingest 지연이 결정적 문제가 아님**
플랫폼이 어차피 HLS로 트랜스코딩하면서 추가 지연 발생. RTMP의 2-3초가 전체에서 차지하는 비중 작음.

**5. 플랫폼 수익과 무관**
시청자 경험에 영향 없음. 플랫폼이 RTMP를 바꿀 비즈니스 동기 없음.

### 그럼 언제 바뀌나

현실적인 시나리오:

**시나리오 1**: WHIP이 OBS 기본값이 되는 순간 (5~10년)
**시나리오 2**: 신규 플랫폼이 처음부터 WHIP/SRT만 받음 (확률 낮음)
**시나리오 3**: 보안 규제로 강제 전환 (확률 매우 낮음)

가장 현실적인 그림은 **RTMP가 계속 살아있으면서 WHIP이 보조로 들어가는** 양상이다. 치지직도 어느 시점에 "WHIP 송출 베타"를 열 가능성이 높다.

---

## 정리하면

RTMP는 기술이 아니라 **생태계 관성**으로 살아남은 프로토콜이다.

1. **출신** — 1996년 Flash 시대에 태어났고, 2009년 스펙 공개로 오픈소스 생태계 형성
2. **연결 구조** — TCP 1935 + Handshake + NetConnection + NetStream으로 ~135ms 부팅
3. **메시지 + 청크** — 양방향 RPC 프로토콜, 청크 인터리빙으로 HoL Blocking 회피
4. **Send Buffer** — OBS 빨간 경고와 드롭 프레임의 정체
5. **한계** — 멀티 오디오 불가, H.265 미지원, CDN 캐시 안 됨, 방화벽 잘 막힘
6. **대체 후보** — WHIP(가장 유력), SRT, RIST
7. **안 죽는 이유** — 도입 비용 0 + 호환성 100% + 비즈니스 동기 부재

다음 글부터는 시청자 측의 표준 — **HLS**를 깊이 들어간다. M3U8 플레이리스트의 진짜 구조부터.

---

**참고**
- [RTMP 1.0 Specification (Adobe, 2012)](https://rtmp.veriskope.com/docs/spec/)
- [WHIP IETF RFC 9725](https://datatracker.ietf.org/doc/rfc9725/)
- [OBS Studio RTMP/WHIP 지원](https://obsproject.com/)
