---
title: "치지직 인기 스트리머 방송 한 번에 8천만원 — CDN의 정체"
date: 2026-06-20T02:36:58+09:00
categories: ["tech-blurting"]
draft: false
---

라이브 영상 한 번 방송하는 데 CDN 비용이 8천만 원 나간다고 하면 믿겠나.

이게 진짜 숫자다. 인기 스트리머 한 명이 4시간 방송하고, 동시 시청자가 5만 명이면 — CloudFront 단가 기준으로 정확히 그 정도 든다. 광고로 메꿔야 한다.

[지난 글](../buffering-deep-dive/)에서 버퍼링이 왜 생기는지 봤다면, 이번 글은 **그 데이터가 어떻게 전세계 시청자에게 전달되는지** — CDN의 동작, 라이브 특화 운영, 그리고 산업이 그 비용을 줄이려고 어떤 시도를 하는지 정리한 노트다.

---

## 1. CDN은 단순 "엣지 서버 분산"이 아니다 — 다층 캐시 구조

CDN 처음 들으면 "시청자 가까운 곳에 서버 두는 거"라고 알게 된다. 맞긴 한데 절반이다.

실제로는 **여러 층의 캐시**가 쌓여 있다.

![CDN 다층 캐시 구조](/images/cdn-tier-structure.png)

```
[Origin Server]            ← 콘텐츠 원본 1곳 (또는 소수)
        ↓
[Origin Shield / Mid-tier] ← 5–10개. Origin 부하 줄이는 중간 캐시
        ↓
[Edge Server]              ← 수백~수천 개. 시청자가 실제 연결되는 곳
        ↓
[시청자]
```

지난 글에서 본 **Origin Shield**가 바로 이 Mid-tier다. 100개 엣지가 5개 Shield로 요청을 모으고, 5개 Shield가 Origin으로. Origin 부하가 100분의 5로 줄어든다.

### POP — 서버를 두는 물리적 위치

CDN 회사가 서버 두는 도시를 **POP (Point of Presence)** 라고 한다.

```
Cloudflare POP (2024 기준)
- 전세계 300개 도시
- 한국: 서울, 부산
- 일본: 도쿄, 오사카, 나하
- 미국: 뉴욕, LA, 시카고, ...
```

각 POP에 서버 수십~수백 대. 한 POP의 총 캐시가 페타바이트 단위.

### 시청자는 어떻게 가까운 POP를 찾나 — Anycast vs GeoDNS

가까운 POP로 가는 방법이 두 가지다.

![Anycast vs GeoDNS](/images/anycast-vs-geodns.png)

**Anycast (Cloudflare 방식)**: 여러 서버가 **같은 IP**를 공유. 라우터의 BGP가 알아서 가장 가까운 서버로 보낸다.

```
Cloudflare IP: 104.16.0.1
→ 서울/도쿄/LA POP 모두 이 IP 사용

서울 시청자가 104.16.0.1 요청 → BGP가 서울 POP로 보냄
LA 시청자가 104.16.0.1 요청 → BGP가 LA POP로 보냄
```

**GeoDNS (Akamai/CloudFront 방식)**: DNS 서버가 시청자 위치에 따라 **다른 IP**를 반환.

```
서울 시청자: "cdn.chzzk.naver.com 어디?"
→ DNS: "13.225.X.X (서울 POP)"

LA 시청자: 같은 도메인 질의
→ DNS: "54.230.Y.Y (LA POP)"
```

| | Anycast | GeoDNS |
|---|---|---|
| 라우팅 | BGP | DNS 응답 |
| 정밀도 | ISP 단위 | 국가/지역 단위 |
| 장애 대응 | 자동 | DNS TTL 만료 후 |
| 대표 | Cloudflare | Akamai, CloudFront |

---

## 2. Cache-Control이 라이브 CDN의 운명을 가른다

CDN이 무엇을 얼마나 캐시할지는 서버가 응답에 박는 **Cache-Control 헤더**가 결정한다.

라이브 스트리밍은 같은 페이지에서도 콘텐츠 종류별로 정책이 완전히 다르다.

![라이브 vs VOD Cache-Control 정책](/images/cache-control-tiers.png)

```http
# seg100.ts (한 번 만들어지면 영원불변)
Cache-Control: public, max-age=86400, immutable

# init.mp4 (코덱 설정, 거의 안 변함)
Cache-Control: public, max-age=86400

# playlist.m3u8 (라이브, 매 6초마다 갱신)
Cache-Control: public, max-age=2
```

세그먼트는 24시간 캐시 — 한 번 만들어지면 안 변하니까.
매니페스트는 2초 캐시 — 안 그러면 시청자가 옛 플레이리스트 받음.

이 분리가 핵심이다. 둘 다 짧게 잡으면 Origin이 죽고, 둘 다 길게 잡으면 라이브가 안 된다.

### 캐시 키에서 쿠키/토큰을 빼야 한다

CDN은 URL을 기준으로 캐시한다. 같은 URL에 쿠키만 다르면? 캐시를 따로 만들면 100만 시청자가 100만 개 캐시 만든다. 캐시 의미 없음.

```
GET /seg100.ts (cookie: user=A) → 캐시 키 "/seg100.ts"
GET /seg100.ts (cookie: user=B) → 같은 캐시 키 "/seg100.ts"
```

대신 인증은 별도로 — **Signed URL**.

```
GET /seg100.ts?token=abc123&expires=1700000060
```

CDN이 토큰 서명과 만료만 검증. 캐시 키는 `/seg100.ts`로 통일.

---

## 3. Thundering Herd — 라이브 CDN의 가장 큰 적

라이브 CDN이 일반 웹 CDN과 다른 가장 큰 이유. **요청이 동시에 몰린다**.

![Thundering Herd와 Request Coalescing](/images/thundering-herd-coalescing.png)

```
[12:00:06.000] seg103.ts 인코딩 완료, Origin 업로드
[12:00:06.001] 100만 시청자가 동시에 seg103.ts 요청
[12:00:06.001] CDN 엣지 100개 모두 캐시 미스
[12:00:06.002] 100개 엣지가 Origin으로 동시 요청
```

새 세그먼트가 생기는 순간 Origin이 폭격 맞는다. 이걸 **Thundering Herd**라고 한다. 막는 두 가지 방법.

### Request Coalescing (요청 병합)

CDN 엣지에서 같은 URL 요청이 동시에 오면 Origin으로는 **한 번만** 보낸다.

```
[엣지 서버 A]
요청 1: seg103.ts → 캐시 미스 → Origin 호출
요청 2–10,000: seg103.ts → "기존 요청 대기"
Origin 응답 도착 → 10,000개 요청에 동시 응답
```

엣지당 Origin 호출 1번. 100개 엣지 = Origin이 100번만 처리.

### Stale-While-Revalidate — 매니페스트 캐시 TTL 줄이는 트릭

`.m3u8`를 2초 캐시하면 100만 명이 폴링할 때 Origin이 초당 50만 RPS 받는다. 죽는다.

```http
Cache-Control: max-age=2, stale-while-revalidate=5
```

- 0–2초: 캐시 응답
- 2–7초: 캐시 응답 + 백그라운드로 Origin 호출해서 갱신
- 7초~: 캐시 미스 → Origin 호출

시청자는 항상 즉시 응답받고, Origin 호출 빈도는 확 떨어진다.

---

## 4. 인기 스트리머 한 명 = 8천만 원

라이브 CDN 비용이 실제로 얼마나 무서운지 계산해보자.

![라이브 CDN 비용 구조](/images/live-cdn-cost.png)

```
CloudFront 한국 → 한국: $0.12 / GB

치지직 인기 스트리머 4시간 방송:
- 평균 동시 시청자: 50,000명
- 1080p 6 Mbps × 4시간 = 약 10 GB / 시청자
- 총 트래픽: 50,000 × 10 GB = 500,000 GB
- CDN 비용: 500,000 × $0.12 = $60,000 (약 8천만 원)
```

한 방송에 8천만 원. 인기 스트리머 10명이 매일 방송하면 **월 240억**. 광고 매출로 메꿔야 한다.

이래서 산업이 두 방향으로 움직인다.

1. **효율적 코덱 도입** — H.265/AV1로 비트레이트 30–50% 절감 = 비용 그만큼 절감
2. **CDN 비용 자체를 줄이는 구조 변경** — 다음 섹션

### CDN Purge는 비싸다

잘못된 세그먼트나 저작권 이슈로 영상 내려야 할 때 CDN 캐시 강제 무효화 = **Purge**.

```
POST /purge
{ "urls": ["https://cdn.chzzk.naver.com/live/seg100.ts"] }
```

모든 엣지에 명령 전파 + 다음 요청에서 캐시 미스 → Origin 부하 튐. 비용 큼.

대안이 **Cache Versioning**. URL에 버전 박기.

```
잘못된: /live/v1/seg100.ts
새 버전: /live/v2/seg100.ts
```

플레이리스트만 업데이트, v1 캐시는 자연 만료. Purge 비용 0.

---

## 5. 멀티 CDN — 한 곳에 의존하지 않는 이유

대형 라이브 플랫폼은 보통 여러 CDN 동시에 쓴다.

```
치지직 추정 구조:
- 1차: 자체 CDN (네이버 인프라)
- 2차: CloudFront (글로벌 백업)
- 3차: Cloudflare (특정 지역)
```

세 가지 이유.

**1. 장애 대응**: 2021년 Fastly 장애로 트위치/레딧/NYT가 1시간 다운. 한 CDN 죽으면 다 죽음.

**2. 비용 협상력**: "우리 다른 CDN도 쓰니까 더 깎아줘."

**3. 지역별 최적화**: 한국은 자체 CDN, 동남아는 Cloudflare, 미주는 CloudFront.

플레이어에서 자동 전환:

```javascript
const cdnA_latency = await ping('cdn-a.chzzk.naver.com');
const cdnB_latency = await ping('cdn-b.chzzk.naver.com');
const bestCDN = cdnA_latency < cdnB_latency ? 'cdn-a' : 'cdn-b';

hls.config.xhrSetup = (xhr, url) => {
  xhr.addEventListener('error', () => {
    const fallbackUrl = url.replace('cdn-a', 'cdn-b');
    // 재시도
  });
};
```

---

## 6. Netflix Open Connect — 자체 CDN의 모범

CDN 비용이 너무 커지면 **자체 CDN**을 만든다.

```
[연간 트래픽 1 EB (엑사바이트) 기준]
외부 CDN (CloudFront): 약 $50M/년
자체 CDN 운영:        약 $20M/년

손익분기점: 약 월 100 PB
```

넷플릭스의 자체 CDN인 **Open Connect**가 모범 사례다.

![Netflix Open Connect](/images/netflix-open-connect.png)

```
[일반 CDN]
시청자 → ISP → 인터넷 백본 → CDN POP → Origin

[Open Connect]
시청자 → ISP 내부 OCA 서버 → 끝
```

ISP 안에 Open Connect Appliance(OCA) 서버를 직접 둔다. 인기 영상을 미리 채워둔다.

- ISP 입장: 자기 네트워크 트래픽 줄어서 환영
- 넷플릭스 입장: 인터넷 백본 비용 0

이 모델은 **VOD에 최적화**돼 있다. 미리 채워둘 수 있으니까. 라이브는 미리 못 채워서 적용 어려움.

치지직은 네이버 자체 CDN 인프라를 활용하는 걸로 추정된다.

---

## 7. P2P CDN — 시청자가 시청자에게 보내기

CDN 비용을 줄이는 또 다른 방법. 시청자끼리 세그먼트 공유.

![P2P CDN](/images/p2p-cdn-distribution.png)

```
[일반 CDN]
시청자 A: CDN에서 seg100.ts 다운로드
시청자 B: CDN에서 seg100.ts 다운로드 (같은 파일 또)
시청자 C: CDN에서 seg100.ts 다운로드

[P2P CDN]
시청자 A: CDN에서 seg100.ts 다운로드
시청자 B: A에게 seg100.ts 받음 (CDN 안 거침)
시청자 C: B에게 받음
```

A만 CDN 부담, B/C는 P2P. **CDN 비용 30–70% 절감** 가능.

기술적으로는 WebRTC DataChannel로 브라우저끼리 직접 통신.

현실적 문제들:
- 모바일은 P2P 부담 큼 (배터리, 데이터)
- NAT/방화벽 통과 어려움 (STUN/TURN 필요)
- 콘텐츠 정합성 검증 (악의적 P2P 차단)
- 라이브는 지연이 추가됨

상용 P2P CDN: Peer5 (MS 인수), CDNBye, Streamroot. **트위치가 일부 도입**했다는 보고.

---

## 8. Edge Compute — CDN 엣지에서 코드 실행

CDN 엣지에서 정적 캐시만이 아니라 **코드를 실행**하는 방향.

```
[일반 CDN]
시청자: GET /api/stream-info
→ CDN 미스 → Origin 호출 (지연 100ms) → 응답

[Edge Compute]
시청자: GET /api/stream-info
→ 엣지에서 직접 계산 → 즉시 응답 (지연 5ms)
```

대표 서비스: Cloudflare Workers, AWS Lambda@Edge, Fastly Compute@Edge.

라이브 활용:

1. **Token 검증**: Signed URL을 엣지에서 검증. Origin 안 거침.
2. **ABR 동적 조정**: 시청자 ISP 보고 마스터 플레이리스트 동적 생성. KT 사용자에겐 KT 캐시 잘 된 화질만.
3. **광고 삽입 (SSAI)**: 세그먼트 사이에 광고를 엣지에서 끼움. 시청자별 다른 광고를 보여줘도 캐시 가능.
4. **실시간 트랜스코딩**: 일부 회사는 엣지에서 즉석 트랜스코딩까지 (AWS MediaLive Edge).

---

## 한국 라이브 시장의 특수성

치지직/SOOP 같은 한국 라이브 플랫폼이 글로벌 플랫폼과 다른 점.

**1. ISP가 적음 (KT, SKT, LGU+)**: 3개에 시청자 거의 다 → ISP 내 캐시 협력 가능.

**2. 국토가 작음**: 서울 한 곳 Origin이어도 전국 지연 50ms 이내 → CDN 의존도 낮을 수 있음.

**3. 모바일 비중 70%+**: 5G 보급률 세계 1위 → 모바일 CDN 최적화 핵심.

**4. 인터넷 종량제 없음**: 시청자가 데이터 걱정 없이 고화질 → 1080p 보급률 매우 높음.

이런 특성에 맞춰 한국 플랫폼은 **자체 CDN + ISP 협력** 모델을 강하게 추구한다.

---

## 정리하면

라이브 CDN은 일반 웹 CDN과 게임이 다르다.

1. **다층 캐시 구조** — Origin → Shield → Edge로 부하 분산
2. **Anycast vs GeoDNS** — Cloudflare는 BGP, Akamai/CloudFront는 DNS로 가까운 POP 라우팅
3. **Cache-Control 분리** — 세그먼트는 24시간, 매니페스트는 2초, 인증은 Signed URL로 캐시 키 깨끗하게
4. **Thundering Herd 대응** — Request Coalescing + Stale-While-Revalidate가 필수
5. **비용 구조** — 인기 스트리머 한 명에 8천만원, AV1으로 30–50% 절감이 산업적 동기
6. **멀티 CDN** — 장애 대응 + 협상력 + 지역 최적화
7. **차세대 배포** — 자체 CDN(Open Connect), P2P CDN, Edge Compute가 비용 절감의 미래

레벨 1 (스트리밍 기초 개념) 정리 노트는 여기까지다. 다음 글부터는 **레벨 2 — 스트리밍 프로토콜** 시리즈로 RTMP/HLS/DASH/LL-HLS/SRT/WebRTC를 하나씩 깊이 들어갈 예정이다.

---

**참고**
- [Cloudflare Anycast 설명](https://www.cloudflare.com/learning/cdn/glossary/anycast-network/)
- [Netflix Open Connect](https://openconnect.netflix.com/)
- [HTTP Stale-While-Revalidate (RFC 5861)](https://datatracker.ietf.org/doc/html/rfc5861)
- [Fastly 2021 장애 분석](https://www.fastly.com/blog/summary-of-june-8-outage)
