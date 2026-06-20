---
title: "HLS의 25초 지연을 2초로 — LL-HLS는 무엇을 바꿨나"
date: 2026-06-20T09:20:35+09:00
categories: ["tech-blurting"]
draft: false
---

라이브 방송을 보다가 채팅이 영상보다 빠른 경험, 게임 스포일러가 채팅으로 먼저 새는 경험, 다 해봤을 거다. 이게 일반 HLS의 18–25초 지연 때문이다.

Apple이 2019년 WWDC에서 발표한 **LL-HLS (Low-Latency HLS)** 가 이걸 2초까지 줄였다. **10배 이상의 개선**. 그런데 HTTP 위에서 동작한다는 HLS의 본질은 그대로다.

[지난 글](../dash-vs-hls/)에서 HLS와 DASH의 두 표준이 어떻게 공존하는지 봤다면, 이번 글은 **HLS가 자체 한계인 지연을 어떻게 깨려고 시도했는지** 정리한 노트다. Partial Segment, Blocking Playlist Reload, Preload Hint, Rendition Report — 네 가지 새 기술이 어떻게 맞물려서 동작하는지.

---

## 1. 일반 HLS의 25초 지연은 정확히 어디서 나오나

먼저 지연 구조부터 정확히 분해해보자.

```
[일반 HLS 라이브 지연]
인코더가 6초어치 인코딩 후 세그먼트 출력: 0–6초
세그먼트 업로드 + CDN 전파: ~1초
플레이리스트 갱신 + 플레이어 폴링 발견: 0–6초
플레이어 버퍼 (보통 3개 세그먼트 = 18초): 18초
─────────────────────────────
총 지연: 평균 ~25초
```

지연의 절반 이상이 **플레이어 버퍼 18초**다. 왜 18초나 잡냐? 안 잡으면 네트워크 흔들릴 때 바로 끊긴다. **버퍼 길이 = 안정성**의 트레이드오프 ([지난 글](../buffering-deep-dive/)에서 다룬 것).

### 그냥 세그먼트를 짧게 만들면 안 되나?

직관적인 해결: "6초 세그먼트를 1초로 줄이면 지연도 1/6 되겠지."

안 된다. 이유 세 가지.

**1. 매니페스트 폴링 빈도 증가**
6초 → 1초로 줄이면 플레이리스트도 매 1초마다 갱신. 시청자 100만 명이 1초마다 폴링 = **초당 100만 RPS**. Origin 죽음.

**2. CDN 캐시 효율 폭락**
같은 시청자 수에 세그먼트 수 6배. 각 파일의 캐시 히트율 떨어짐.

**3. 키프레임 간격 문제**
각 세그먼트는 IDR(키프레임)로 시작해야 함. GOP가 1초면 같은 비트레이트에서 화질이 떨어짐. 키프레임이 자주 박힐수록 압축 효율 안 좋음.

### Apple의 2019년 답 — 발상의 전환

세그먼트를 짧게 만드는 게 아니라, **세그먼트를 만드는 도중에 부분적으로 미리 전송**하자.

![HLS 25초 vs LL-HLS 2초 지연 분해](/images/hls-vs-llhls-latency-breakdown.png)

```
[LL-HLS 라이브 지연]
인코더 partial 출력 (200ms 단위): ~0.2초
CDN chunked transfer: ~0.3초
플레이어 partial 버퍼 (보통 1–2초): ~1.5초
─────────────────────────────
총 지연: 평균 ~2초
```

10배 개선. 그것도 HLS의 핵심(HTTP + CDN 호환성)을 깨지 않고.

---

## 2. Partial Segment — LL-HLS의 첫 번째 핵심 기술

가장 중요한 발상.

**6초짜리 세그먼트를 만드는 동안, 200ms 단위로 잘라서 미리 보낸다.**

![Partial Segment 분할](/images/partial-segment-breakdown.png)

```
[일반 HLS]
6초 인코딩 완료 → seg_42.m4s (6초 분량) 한 번에 전송

[LL-HLS]
0–0.2초 인코딩 → part_1.m4s (200ms) 즉시 전송
0.2–0.4초 → part_2.m4s 즉시 전송
...
5.8–6.0초 → part_30.m4s 즉시 전송
이 30개를 합치면 seg_42.m4s
```

세그먼트가 완성될 때까지 안 기다린다. **200ms 분량씩 미리 받음** = 6초 - 0.2초 = 5.8초 단축.

### INDEPENDENT 플래그가 왜 중요한가

ABR로 화질 전환할 때 시청자가 부드럽게 넘어가려면 키프레임이 있어야 한다. 모든 partial이 키프레임으로 시작할 수는 없으니 (압축 효율 폭락), **일부만 INDEPENDENT 플래그**를 단다.

```
#EXT-X-PART:DURATION=0.2,URI="part_1.m4s",INDEPENDENT=YES
#EXT-X-PART:DURATION=0.2,URI="part_2.m4s"
#EXT-X-PART:DURATION=0.2,URI="part_3.m4s"
#EXT-X-PART:DURATION=0.2,URI="part_4.m4s"
#EXT-X-PART:DURATION=0.2,URI="part_5.m4s",INDEPENDENT=YES
```

플레이어가 화질 전환할 때 INDEPENDENT partial부터 시작.

### Partial 전송 — HTTP/1.1 Chunked Transfer Encoding

partial을 보내는 방식이 흥미롭다.

```
GET /part_15.m4s HTTP/1.1

Transfer-Encoding: chunked

[chunk 1 - 첫 50ms 디코딩된 데이터]
[chunk 2 - 다음 50ms]
[chunk 3 - 다음 50ms]
[chunk 4 - 다음 50ms]
```

partial 자체도 chunked로 전송. 인코더가 partial을 만드는 *도중*에도 만들어진 부분을 보낼 수 있다. **세그먼트 안에 partial 안에 chunk** — 3중 계층.

이게 CMAF chunked의 기반이고 ([지난 시리즈에서 다룬 그거](../../)), HTTP/1.1의 기능을 그대로 활용했다는 게 핵심 — CDN과 100% 호환.

### Partial 크기 트레이드오프

```
[Partial 200ms]
지연: 200ms 이하
부하: 평소 6배 요청

[Partial 1초]
지연: 1초 이하
부하: 평소 2배
```

업계 표준 200–500ms. CDN 비용 대비 지연 단축의 균형점.

---

## 3. Blocking Playlist Reload — 두 번째 핵심 기술

partial을 만들었어도 플레이어가 그걸 *알아야* 받을 수 있다. 매니페스트에 적혀야 함.

일반 HLS는 플레이어가 1–6초마다 매니페스트를 폴링한다. 새 partial이 나와도 다음 폴링 때까지 모름.

LL-HLS의 답: **Long Polling**.

![Blocking Playlist Reload](/images/blocking-playlist-reload.png)

### HLS_MSN과 HLS_PART 쿼리

플레이어가 다음 매니페스트를 요청할 때 **"내가 기다리는 시점"을 쿼리에 박는다**.

```
GET /playlist.m3u8?_HLS_msn=42&_HLS_part=15
```

"세그먼트 시퀀스 42, partial 15보다 새 게 나올 때까지 기다려줘."

### 서버의 동작

```python
def get_playlist(target_msn, target_part):
    while True:
        current_msn, current_part = get_latest()
        if (current_msn > target_msn or 
            (current_msn == target_msn and current_part > target_part)):
            return build_playlist()
        time.sleep(0.05)  # 50ms마다 확인
```

요청을 **응답 보류**한 상태로 잡고 있다가, 새 partial이 생기는 순간 즉시 회신. 폴링 없이 **push 효과**.

### CDN과의 충돌 문제

이게 한 가지 까다로움 — Long polling은 CDN과 안 맞는다.

```
일반 CDN 동작:
- 같은 URL 요청 → 캐시 응답 → 즉시 반환
- Origin은 한 번만 호출

Blocking Reload 요구:
- 같은 URL이라도 _HLS_msn에 따라 다른 응답
- Origin 응답을 보류해야 함
```

해결책: CDN이 LL-HLS 인지 + chunked transfer 지원. **Akamai, CloudFront, Cloudflare가 공식 지원**. 작은 CDN은 미지원이라 도입 발목.

### Skip 메커니즘 — 매니페스트 크기 줄이기

LL-HLS 매니페스트는 일반 HLS보다 훨씬 큼 (각 partial마다 한 줄). 6초 세그먼트에 30개 partial = 매니페스트 30배.

해결: 클라이언트가 이미 본 부분 스킵.

```
GET /playlist.m3u8?_HLS_msn=42&_HLS_part=15&_HLS_skip=YES
→ 새로운 부분만 응답
```

매니페스트 크기 90% 절감.

---

## 4. Preload Hint — 세 번째 핵심 기술

partial을 받는 사이에 시간이 흐른다. 다음 partial을 받을 때 HTTP 연결 다시 맺고 (TCP handshake, TLS) → 200–500ms 추가 지연.

해결: **미리 다음 partial URL을 알려주고, 클라이언트가 미리 연결**.

![Preload Hint + Rendition Report](/images/llhls-preload-rendition-report.png)

매니페스트에 추가:

```
#EXT-X-PART:DURATION=0.2,URI="part_15.m4s"
#EXT-X-PART:DURATION=0.2,URI="part_16.m4s"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="part_17.m4s"
```

플레이어가 `part_17.m4s`를 **존재하기 전에** 미리 GET 요청 시작. 서버는 요청을 보류했다가 partial 생기는 즉시 response.

```
실제 시퀀스:
t=0.0초: 플레이어가 part_17.m4s 미리 GET (서버에 도착, 응답 보류)
t=0.2초: 인코더가 part_17.m4s 만듦
t=0.2초: 서버가 즉시 응답 → 플레이어에 도착
```

TCP 연결 셋업 시간이 partial 생성 전에 끝나 있어서 **추가 지연 0**.

---

## 5. Rendition Report — 네 번째 핵심 기술

ABR 전환할 때 다른 화질로 점프해야 한다. 일반 HLS에서는:

```
1. 720p 매니페스트 보고 있음
2. 대역폭 떨어짐 → 480p 선택
3. 480p 매니페스트 새로 GET
4. 480p에서 가장 최신 partial 위치 알아냄
5. 점프
```

매니페스트 새로 받는 시간 = 추가 1초.

LL-HLS의 답: **다른 화질의 현재 상태를 매니페스트에 같이 박음**.

```
#EXT-X-RENDITION-REPORT:URI="720p/playlist.m3u8",LAST-MSN=42,LAST-PART=15
#EXT-X-RENDITION-REPORT:URI="480p/playlist.m3u8",LAST-MSN=42,LAST-PART=15
#EXT-X-RENDITION-REPORT:URI="360p/playlist.m3u8",LAST-MSN=42,LAST-PART=15
```

지금 보고 있는 화질의 매니페스트에 **다른 화질의 진행 상황까지 적혀있음**. 전환 시 매니페스트 새로 받을 필요 없이 바로 점프.

### 모든 화질의 partial 경계가 맞아야 한다

전환이 매끄러우려면 모든 화질의 partial이 **같은 시점에** 생성돼야 한다. 그러려면:

- 모든 화질의 GOP 정렬 (`-g`, `-keyint_min` 같게 — [예전 글에서 다룬 거](../video-quality-bitrate-abr/))
- 모든 화질의 partial duration 동일 (200ms)
- 모든 화질의 partial 출력 동기화

이게 ABR ladder 운영의 핵심 까다로움.

---

## 6. fMP4 강제 — CMAF로 가는 길

LL-HLS는 컨테이너를 **fMP4 (CMAF)** 만 허용한다. .ts 안 됨.

이유:
- chunked 전송이 fMP4 구조에서만 자연스러움
- DASH와 통합 (한 미디어 파일을 HLS/DASH가 공유, [이전 글](../dash-vs-hls/)에서 본 그것)
- 더 작은 오버헤드

```
LL-HLS 표준 명령:
ffmpeg -i input \
  -c:v libx264 -preset veryfast \
  -hls_time 6 \
  -hls_segment_type fmp4 \      # 강제
  -hls_fmp4_init_filename init.mp4 \
  ...
```

레거시 .ts 기반 HLS 인프라는 LL-HLS 가려면 컨테이너 재인코딩.

---

## 7. LL-HLS 지연 전체 흐름 — 종합

네 가지 기술이 맞물려서 동작.

```
인코더 partial 생성 (~200ms)
   ↓
Blocking Reload 응답 보내짐
   ↓
플레이어 매니페스트 수신
   ↓
Preload Hint로 미리 열린 연결로 partial 도착
   ↓
플레이어가 다른 화질 변경 시 Rendition Report로 즉시 점프
   ↓
시청자 화면
```

각 단계가 개별적으로 ~200ms, 총 합쳐서 **1.5–2초 지연** 달성.

---

## 8. LL-HLS 도입 비용 — 누가 쓰는가

장점 명확. 그런데 도입 비용도 크다.

```
[기존 HLS 인프라 → LL-HLS 전환 시]
- 인코더 교체 (FFmpeg 표준 + Shaka Packager 또는 OvenMediaEngine)
- 컨테이너 전환 (.ts → fMP4)
- CDN 재계약 (LL-HLS 지원 CDN으로)
- Origin 서버 재구축 (long polling 지원)
- 플레이어 업그레이드 (hls.js v1.1+)
- CDN 비용 약 30% 증가 (요청 수 증가)
```

도입한 곳:
- **Twitch**: 이미 LL-HLS. 게이밍 라이브엔 채팅 동기화 필수
- **Youtube Live**: LL-HLS 옵션 제공
- **AWS IVS**: 자체 저지연 프로토콜로 LL-HLS 수준 달성
- **치지직**: 일부 인기 스트리머 한정 베타 추정

도입 안 한 곳:
- 일반 OTT (Netflix, Disney+): VOD 위주, 저지연 불필요
- 작은 라이브 서비스: CDN 비용/엔지니어링 부담

### LL-HLS vs WebRTC — 누가 더 빠르나

```
[지연 비교]
일반 HLS:   18–25초
LL-HLS:     1–3초
WebRTC:     0.1–0.5초
```

WebRTC가 더 빠르다. 그런데 WebRTC는 UDP 기반 + 별도 시그널링 필요. CDN 활용 불가.

```
인터랙티브 (경매, 화상회의): WebRTC
일반 라이브 (게임, 스포츠): LL-HLS
VOD: 일반 HLS
```

각자 영역. 다음 글에서 WebRTC를 본다.

---

## 정리하면

LL-HLS는 "HLS의 본질을 깨지 않으면서 지연을 1/10로" 라는 야심 찬 목표를 달성했다.

1. **Partial Segment** — 6초 세그먼트를 200ms 단위로 잘라서 미리 전송
2. **Blocking Playlist Reload** — 플레이어 폴링을 long polling으로 (`_HLS_msn`, `_HLS_part`)
3. **Preload Hint** — 다음 partial URL을 미리 알려주고 클라이언트가 미리 연결
4. **Rendition Report** — 다른 화질의 진행 상황을 같이 박아 ABR 즉시 점프
5. **fMP4 강제** — chunked 전송 + CMAF 통합
6. **도입 비용** — CDN 약 30% 증가, 인프라 전반 재구축
7. **누가 쓰나** — Twitch가 표준 도입, 일반 OTT는 불필요

다음 글에선 진짜 저지연이 필요한 영역 — **WebRTC**를 본다. UDP 기반 P2P 라이브.

---

**참고**
- [Apple WWDC 2019 Introducing Low-Latency HLS](https://developer.apple.com/videos/play/wwdc2019/502/)
- [HLS 표준 (RFC 8216)](https://datatracker.ietf.org/doc/html/rfc8216)
- [hls.js LL-HLS 지원](https://github.com/video-dev/hls.js)
- [Twitch Low Latency Engineering](https://blog.twitch.tv/en/2017/12/12/low-latency-video-transcoding-at-scale-3479f49ee1d1/)
