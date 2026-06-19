---
title: "라이브 영상이 그냥 파일이라고? — HLS의 미친 발상"
date: 2026-06-20T04:06:03+09:00
categories: ["tech-blurting"]
draft: false
---

2009년 Apple이 한 결정이 라이브 스트리밍의 모든 걸 바꿨다.

당시 RTMP를 비롯한 모든 스트리밍 프로토콜은 **지속 연결**을 전제로 했다. 서버가 클라이언트 상태를 관리하고, 연결이 끊기면 복잡한 재연결 절차. 라이브 영상은 본질적으로 "흐르는" 것이라고 모두가 믿었다.

Apple은 정반대로 갔다. **"라이브 영상도 그냥 파일이다."**

[지난 글](../rtmp-still-alive/)에서 RTMP가 왜 안 죽는지 봤다면, 이번 글은 **시청자 측 표준을 사실상 독점한 HLS**의 내부를 정리한 노트다. M3U8 플레이리스트, .ts 파일 안의 MPEG-TS 패킷, PTS/DTS 이중 타임스탬프, 그리고 브라우저가 HLS를 어떻게 재생하는지까지.

---

## 1. Apple의 미친 발상 — "그냥 HTTP로 작은 파일들 다운받자"

2009년 iPhone OS 3.0 출시 시점. Apple이 안고 있던 두 가지 문제.

```
[2009년 모바일 영상 환경]
- iPhone 3G/3GS 막 보급
- 모바일 네트워크: 3G (1~3 Mbps, 매우 불안정)
- 기존 영상 표준: RTMP (Flash 기반)
- 그런데 Apple은 iOS에서 Flash를 안 씀
```

**1. Flash 없이 영상 재생**
HTML5 video 태그가 있긴 했지만 단순 다운로드 방식. 라이브 불가능.

**2. 불안정한 모바일 네트워크**
3G가 자주 끊긴다. 지하철 들어가면 신호 없어진다. RTMP는 끊기면 처음부터 다시.

Apple의 해법은 단순했다.

![RTMP vs HLS 패러다임](/images/rtmp-vs-hls-paradigm.png)

기존 프로토콜이 복잡한 이유는 **연결을 유지**하기 때문이었다. 서버가 클라이언트 상태를 알아야 하고, 끊기면 재연결 절차 필요. 서버 비용 비싸다.

HLS의 아이디어: **영상을 작은 파일들로 잘라서 HTTP로 하나씩 요청**.

```
서버 ────HTTP GET────▶ 클라이언트 (6초 파일)
        (응답 후 끊김)
서버 ────HTTP GET────▶ 클라이언트 (다음 6초 파일)
        (응답 후 끊김)
...
```

서버는 그냥 정적 파일 호스팅 서버면 된다.

### 이 단순한 발상이 동시에 해결한 것들

1. **CDN 자연스럽게 활용** — HTTP 정적 파일이니 모든 CDN이 그대로 캐시. RTMP는 못 했던 게 공짜로 됨
2. **방화벽 통과** — 80/443 포트 사용. RTMP의 1935 차단 문제 없음
3. **화질 자동 전환 (ABR)** — 다음 파일부터 다른 화질로 요청 가능
4. **라이브와 VOD 동일 구조** — 라이브는 파일이 계속 추가, VOD는 끝이 정해진 것
5. **끊김 복구** — HTTP 재요청만 하면 됨. 복잡한 재연결 프로토콜 불필요

이게 HLS가 **모바일 시대의 표준이 된 진짜 이유**다. 기술이 좋아서가 아니라 발상이 단순했기 때문에.

---

## 2. HLS의 두 가지 파일 — .m3u8과 .ts

HLS는 두 종류 파일로 구성된다.

- **`.m3u8` (Playlist)**: 목차. 어떤 세그먼트가 있는지 나열. 텍스트 파일
- **`.ts` (Transport Stream)**: 실제 영상 데이터. 6초 분량. 바이너리

### M3U8의 출신은 영상이 아닌 음악

M3U는 1990년대 후반 WinAMP 같은 MP3 플레이어가 쓰던 재생 목록 포맷이었다. Apple이 이걸 영상 스트리밍에 가져다 썼다. M3U + UTF-8 = M3U8.

이래서 M3U8 파일이 그냥 텍스트다. 메모장으로 열어볼 수 있다.

---

## 3. M3U8 두 가지 종류 — Master와 Media

플레이리스트는 두 단계로 나뉜다.

![M3U8 플레이리스트 구조](/images/m3u8-playlist-structure.png)

**Master Playlist (master.m3u8)**: ABR ladder 목차. 각 화질의 sub playlist 위치 나열.

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=6500000,RESOLUTION=1920x1080
1080p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3200000,RESOLUTION=1280x720
720p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1700000,RESOLUTION=854x480
480p/playlist.m3u8
```

**Media Playlist (1080p/playlist.m3u8)**: 실제 세그먼트 목록.

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.000,
seg100.ts
#EXTINF:6.000,
seg101.ts
#EXTINF:6.000,
seg102.ts
```

플레이어는:
1. master.m3u8 받음
2. 현재 대역폭 측정 → 적합한 화질 선택
3. 해당 화질의 Media Playlist 받음
4. 세그먼트 받기 시작

### 라이브 vs VOD — 끝이 있냐 없냐

VOD 플레이리스트엔 `#EXT-X-ENDLIST` 태그가 박혀있다. "끝났음" 신호. 플레이어는 자유롭게 시킹 가능.

라이브엔 ENDLIST가 없다. 대신 **Sliding Window**.

```
[12:00:00]                 [12:00:06]
seg100, seg101, seg102  →  seg101, seg102, seg103
                                              ↑ 새로 추가
                                              ↑ seg100 사라짐
```

플레이어가 매 6초마다 `playlist.m3u8`을 다시 받는 **polling** 방식.

### EXTINF의 정확한 의미

```
#EXTINF:6.000,
seg100.ts
```

`6.000`은 이 세그먼트의 **실제 지속 시간** (초). `#EXT-X-TARGETDURATION:6`은 모든 세그먼트의 **최대** 지속 시간.

세그먼트는 정확히 6초가 아닐 수도 있다. 키프레임 위치에서 잘리니까. 5.8초, 6.2초 같은 값이 흔하다.

---

## 4. .ts 파일 내부 — MPEG-TS의 188바이트 우주

`.ts` 파일을 hexdump로 열어보면 첫 바이트가 항상 `0x47`이다. 그리고 정확히 **188바이트마다 또 `0x47`이 나온다**.

![MPEG-TS 패킷 구조](/images/mpegts-packet-structure.png)

```
.ts 파일 = 188바이트 패킷의 연속
패킷 = 4바이트 헤더 + 184바이트 페이로드
첫 바이트 sync byte 0x47 → 패킷 시작 표시
```

방송 표준이라서 손상에 강하다. 한 패킷이 망가져도 다음 sync byte 찾으면 됨.

### PAT / PMT / PES — 3단 계층

`.ts` 안에 영상/오디오만 있는 게 아니다. **목차도 같이** 있다.

**PAT (Program Association Table)**: 첫 번째 패킷. PID=0. "이 스트림에 프로그램이 몇 개 있고, 각 프로그램의 PMT가 어디 있는지" 표시.

**PMT (Program Map Table)**: 각 프로그램의 트랙 정보. "비디오는 PID=256, 오디오는 PID=257" 같은 매핑.

**PES (Packetized Elementary Stream)**: 실제 영상/오디오 데이터. H.264 NAL units이 여기 들어감.

```
[패킷 흐름]
PAT (PID=0) → "프로그램 1의 PMT는 PID=4096에 있어"
PMT (PID=4096) → "비디오=PID=256, 오디오=PID=257"
PES Video (PID=256) → 실제 H.264 데이터
PES Audio (PID=257) → 실제 AAC 데이터
PES Video (PID=256) → ...
```

PID로 트랙을 구분하니 **멀티 오디오 트랙이 자연스럽게 가능**하다. RTMP가 못한 것.

### IDR Frame이 세그먼트 시작에 있어야 하는 이유

세그먼트 파일을 처음 받는 순간 디코딩이 시작될 수 있어야 한다. P-frame은 "이전 프레임 + 차이"라서 혼자 못 그린다.

→ **세그먼트의 첫 프레임은 반드시 IDR (Instantaneous Decoder Refresh) 키프레임**.

```
[정상]
seg100.ts: [IDR] [P] [P] [P] [P] ...   ← 시작 가능

[비정상]
seg100.ts: [P] [P] [P] [P] ...          ← 디코딩 불가
```

이래서 FFmpeg `-hls_time 6` 옵션이 정확히 6초마다 못 자르고 키프레임 위치까지 기다리는 거다.

---

## 5. PTS vs DTS — 시간이 두 종류인 이유

영상에 타임스탬프가 **두 개** 박혀있다. PTS와 DTS.

![PTS vs DTS와 B-frame](/images/pts-vs-dts-bframe.png)

- **PTS (Presentation Timestamp)**: 화면에 보여줄 시각
- **DTS (Decoding Timestamp)**: 디코더에 넘길 시각

B-frame이 없으면 둘은 같다. 있으면 다르다.

```
[디스플레이 순서 (PTS)]
I(0ms) → B(33ms) → B(66ms) → P(100ms)

[디코딩 순서 (DTS)]
I(0ms) → P(33ms) → B(66ms) → B(100ms)
```

B-frame은 **과거 I-frame과 미래 P-frame을 모두 참조**한다. 그래서 P-frame이 먼저 디코딩돼야 한다. 보여주는 순서랑 다름.

플레이어 입장에서:
- DTS 순서로 디코더에 넘김
- PTS 순서로 화면에 표시

라이브 zerolatency에서 B-frame을 끄는 이유 — 디코딩-표시 시간 차이가 지연이 되니까.

### 영상-오디오 동기화의 기준

영상과 오디오가 한 .ts 안에 있어도 따로 패킷에 들어간다. 두 PTS를 맞춰서 동기화.

```
영상 PTS = 1.000초
오디오 PTS = 1.020초
→ 플레이어가 오디오를 20ms 일찍 재생하거나 영상을 20ms 늦게
```

OBS의 "마이크 오프셋 -50ms" 같은 옵션이 이 PTS 조정의 후처리 버전.

---

## 6. 브라우저는 HLS를 어떻게 재생하나 — hls.js와 MSE

여기서 헷갈리는 사실: **Chrome, Firefox, Edge는 HLS를 네이티브로 재생 못 한다.**

```
[네이티브 HLS 지원]
✅ Safari (iOS, macOS)
✅ Apple TV
❌ Chrome
❌ Firefox  
❌ Edge
❌ 안드로이드 브라우저
```

그럼 우리는 Chrome에서 어떻게 HLS를 보고 있나? **hls.js**가 자바스크립트로 변환해서 보여준다.

![hls.js와 MSE 파이프라인](/images/hls-js-mse-pipeline.png)

### MSE — Media Source Extensions

핵심은 브라우저의 **MSE** API다. JavaScript에서 `SourceBuffer`에 미디어 데이터를 직접 넣을 수 있다.

```javascript
const mediaSource = new MediaSource();
video.src = URL.createObjectURL(mediaSource);

mediaSource.addEventListener('sourceopen', () => {
  const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.640028"');
  sourceBuffer.appendBuffer(mp4Data);
});
```

MSE는 **fMP4만 받는다**. MPEG-TS는 못 받는다.

### hls.js의 핵심 — 트랜스먹싱

hls.js가 하는 일:
1. `.m3u8` 받기
2. `.ts` 파일 받기
3. **MPEG-TS → fMP4 트랜스먹싱** (디코딩 없이 컨테이너만 변환)
4. fMP4를 MSE의 SourceBuffer에 넣기
5. video 태그가 자동 재생

```
.ts (MPEG-TS) → hls.js → fMP4 (메모리) → MSE → <video>
```

핵심은 **트랜스먹싱**. 압축된 H.264 NAL units을 그대로 두고 컨테이너만 바꿈. 디코딩 안 함. 그래서 빠름.

### ABR Controller — 화질 자동 선택

hls.js 안에 ABR 알고리즘이 있다.

```
[측정]
- 직전 세그먼트 다운로드 속도 (대역폭 추정)
- 현재 버퍼 길이 (여유 추정)

[결정]
- 대역폭 + 안전 마진 < 현재 화질 비트레이트 → 다운그레이드
- 버퍼 충분 + 대역폭 여유 → 업그레이드
- 잦은 전환 방지 (히스테리시스)
```

이 알고리즘이 잘 만들어진 게 hls.js의 가치다. 직접 만들면 화질이 자주 바뀌어서 시청자가 신경 쓰임.

### Recovery — 에러 복구

세그먼트 다운로드 실패 시:

```javascript
hls.on(Hls.Events.ERROR, (event, data) => {
  if (data.fatal) {
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        hls.startLoad();
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        hls.recoverMediaError();
        break;
    }
  }
});
```

3번 정도 재시도 → 안 되면 다음 세그먼트 건너뛰고 진행. 라이브에서 멈춰버리는 것보단 한 세그먼트 스킵이 나음.

---

## 7. 라이브 HLS 운영의 현실

HLS가 단순해 보이지만, 라이브 운영은 까다롭다.

### Origin 서버의 역할

```
인코더 → Origin Server → CDN → 시청자
         ↑
         세그먼트 생성/저장
         매니페스트 갱신
```

Origin이 하는 일:
1. 트랜스코더로부터 세그먼트 받기
2. 디스크에 저장 (또는 Redis 같은 메모리 캐시)
3. `.m3u8` 매니페스트 동적 갱신
4. CDN에 푸시 또는 CDN이 풀

### Signed URL — 무단 사용 차단

영상 URL이 유출되면 누구나 볼 수 있다. CDN 비용 폭증.

```
원본: /live/seg100.ts
서명: /live/seg100.ts?token=abc...&expires=1700000060
```

CDN이 토큰 서명과 만료를 검증. 만료 60초로 짧게 잡으면 유출돼도 곧 못 씀.

라이브에서는 토큰 만료 처리가 까다롭다. 시청자가 30분째 보고 있는데 토큰이 만료되면 끊긴다. 플레이어가 주기적으로 새 토큰 받는 메커니즘 필요.

### Beacon으로 시청자 측 측정

플레이어가 자기 상태를 서버에 보고:
- Startup time
- Rebuffering 발생
- ABR 화질 전환
- 시청 종료 (실수로 닫음 vs 끝까지 봄)

이 데이터가 모이면 Prometheus → Grafana 대시보드로 QoE 모니터링.

---

## 8. HLS의 본질적 한계 — 지연

HLS가 산업 표준이 됐지만 한 가지는 못 이긴다. **지연**.

```
[일반 HLS 지연 구조]
인코딩: 0~6초 (세그먼트 만들기 대기)
전송: ~1초
플레이어 버퍼: 12~18초 (3개 세그먼트)
─────────────────────
총 지연: 18~25초
```

채팅과 영상 동기화가 안 된다. "지금 죽었어!" 채팅이 영상보다 18초 빠르다. 게임 스포일러가 채팅으로 먼저 샌다.

해결책이 **LL-HLS** (다음 시리즈). Chunked CMAF로 1~3초 지연 달성.

---

## 정리하면

HLS는 기술의 승리가 아니라 **발상의 승리**다.

1. **출신** — 2009년 Apple, "라이브 영상도 그냥 파일이다"
2. **구조** — .m3u8 (텍스트 목차) + .ts (바이너리 영상), Master + Media 두 단계
3. **MPEG-TS** — 188바이트 패킷 + PAT/PMT/PES 3단 계층, 첫 패킷이 항상 PAT
4. **타임스탬프** — PTS (표시) + DTS (디코딩), B-frame 때문에 둘이 다름
5. **브라우저 재생** — Chrome은 네이티브 미지원, hls.js가 트랜스먹싱 + MSE로 처리
6. **운영** — Origin + CDN + Signed URL + Beacon으로 QoE 측정
7. **한계** — 18~25초 지연, LL-HLS가 해결책

다음 글에선 HLS의 라이벌 — **DASH**를 본다. 산업이 왜 두 표준을 같이 유지하는지.

---

**참고**
- [HLS 표준 (RFC 8216)](https://datatracker.ietf.org/doc/html/rfc8216)
- [Apple HLS Authoring Specification](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices)
- [hls.js GitHub](https://github.com/video-dev/hls.js)
- [MPEG-TS (ISO/IEC 13818-1)](https://www.iso.org/standard/74427.html)
