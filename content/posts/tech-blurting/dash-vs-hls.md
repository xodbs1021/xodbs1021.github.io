---
title: "DASH가 기술적으로 더 좋은데 왜 HLS가 이겼나"
date: 2026-06-20T04:17:40+09:00
categories: ["tech-blurting"]
draft: false
---

기술 표준의 역사에서 자주 보이는 패턴이 있다. **기술적으로 더 우수한 게 시장에서 진다.**

영상 스트리밍이 정확히 그렇다. DASH는 ISO/IEC가 정식 국제 표준으로 만든 프로토콜이다. 코덱이 자유롭고, 광고 비즈니스에 유리하고, DRM 통합이 깔끔하다. HLS보다 모든 면에서 진보적이다.

근데 2024년 시장 점유율을 보면 HLS 60%, DASH 32%. HLS가 두 배.

[지난 글](../hls-just-files/)에서 HLS의 발상을 봤다면, 이번 글은 **DASH의 정체와 두 표준이 공존하는 산업의 현실**을 정리한 노트다. DASH가 어떻게 만들어졌고, 뭐가 다르고, 왜 더 좋은데도 못 이겼는지, 그리고 결국 어떻게 수렴하는지.

---

## 1. DASH의 출신 — ISO/IEC의 Apple 견제

2009년 HLS가 나오고 1년 만에 모바일 영상 표준이 됐다. iPhone이 폭발적으로 팔리면서.

이 상황이 모든 비-Apple 진영을 불편하게 만들었다.

```
[2010년 영상 스트리밍 시장]
시청자 측:
- iOS: HLS (강제)
- Android: 표준 없음 (각자 다른 방식)
- 데스크탑: Flash + RTMP
- 스마트TV: 제각각

→ 콘텐츠 제공자는 같은 영상을 여러 방식으로 만들어야 함
```

Apple은 HLS 스펙을 IETF에 RFC로 제출했다. 그래도 인식은 **"Apple이 만든 것"**. Apple이 마음대로 바꿀 수 있는 표준.

여기에 산업계가 대안을 만들기로 했다.

![DASH vs HLS 출신](/images/dash-vs-hls-origin.png)

영상 코덱 표준을 만드는 **MPEG (Moving Picture Experts Group)** 가 주도. Microsoft, Netflix, Samsung, Sony, Adobe, Google, Qualcomm 등 30개 이상 기업이 참여. 2011년 작업 시작, 2012년 11월 **MPEG-DASH** 발표.

**DASH = Dynamic Adaptive Streaming over HTTP**

이름 자체가 HLS와 거의 같은 컨셉을 선언한다.
- Dynamic: 라이브든 VOD든
- Adaptive: 화질 자동 조절 (ABR)
- HTTP: 일반 HTTP 위에서 동작

HLS도 다 하는 건데 왜 따로 만들었나?

1. **코덱 독립적** — HLS는 사실상 H.264 + AAC + MPEG-TS 컨테이너에 묶여 있었음. DASH는 어떤 코덱, 어떤 컨테이너든 OK
2. **정확한 ISO 표준** — 한 회사 소유가 아닌 ISO/IEC 23009-1
3. **더 풍부한 메타데이터** — MPD가 M3U8보다 표현력이 좋음

기술적으로 깔끔한 답이었다.

---

## 2. MPD의 계층 구조 — XML로 모든 걸 표현

DASH의 매니페스트는 `.mpd` (Media Presentation Description). XML 기반.

![MPD 계층 구조](/images/mpd-hierarchy.png)

M3U8이 평면적이라면 MPD는 계층적이다.

```
MPD
└── Period (시간 구간 - "본방송", "광고", "본방송")
    └── AdaptationSet (트랙 그룹 - 비디오, 한국어 오디오, 영어 오디오)
        └── Representation (개별 트랙 - 1080p, 720p, 480p)
            └── Segment (실제 데이터 조각)
```

실제 MPD 예시:

```xml
<MPD type="dynamic"
     minimumUpdatePeriod="PT2S"
     timeShiftBufferDepth="PT5M"
     availabilityStartTime="2026-06-20T10:00:00Z">
  <Period>
    <AdaptationSet mimeType="video/mp4">
      <Representation id="1080p" bandwidth="6000000" width="1920" height="1080">
        <SegmentTemplate
          media="1080p/seg_$Number$.m4s"
          initialization="1080p/init.mp4"
          startNumber="1"
          duration="6000"
          timescale="1000"/>
      </Representation>
      <Representation id="720p" bandwidth="3000000" width="1280" height="720">
        <SegmentTemplate ... />
      </Representation>
    </AdaptationSet>
    
    <AdaptationSet mimeType="audio/mp4" lang="ko">
      <Representation id="ko_aac_128k" bandwidth="128000"/>
    </AdaptationSet>
    
    <AdaptationSet mimeType="audio/mp4" lang="en">
      <Representation id="en_aac_128k" bandwidth="128000"/>
    </AdaptationSet>
  </Period>
</MPD>
```

### MPD vs M3U8 — 표현력 vs 단순함

| 항목 | M3U8 (HLS) | MPD (DASH) |
|------|-----------|------------|
| 포맷 | 텍스트 (라인 기반) | XML |
| 크기 | ~5 KB | ~50 KB |
| 파싱 | 수십 줄 코드 | 수백 줄 코드 |
| 표현력 | 제한적 | 풍부 |
| 구조 | 평면적 | 계층적 |

이게 DASH의 양날의 검이다. 표현력은 좋은데 복잡하다.

### SegmentTemplate — DASH의 핵심 효율

DASH가 라이브에서 강한 진짜 이유.

```xml
<SegmentTemplate
  media="seg_$Number$.m4s"
  startNumber="1"
  duration="6000"
  timescale="1000"/>
```

세그먼트 URL을 일일이 나열하지 않고 **패턴**으로 표현. `$Number$`가 1, 2, 3, ...으로 치환.

플레이어는 시간만 보고 다음 세그먼트 URL을 직접 계산.

```javascript
const elapsed = (Date.now() - availabilityStartTime) / 1000;
const segmentNumber = Math.floor(elapsed / 6);
const nextUrl = `seg_${segmentNumber + 1}.m4s`;
```

HLS처럼 매니페스트 폴링 안 해도 됨. 이게 DASH의 라이브 지연이 HLS보다 짧았던 이유.

---

## 3. DASH의 진짜 강점 — Period 기반 광고 삽입

DASH의 비즈니스 가치가 여기서 나온다.

![DASH Period 광고 삽입](/images/dash-period-ad-insertion.png)

한 영상 안에 여러 Period를 두고, **각 Period의 BaseURL을 사용자별로 다르게** 줄 수 있다.

```xml
<MPD>
  <Period id="content_part1" duration="PT15M">
    <BaseURL>https://cdn.example.com/content/</BaseURL>
    <AdaptationSet>...</AdaptationSet>
  </Period>
  
  <Period id="ad_personalized_user12345" duration="PT30S">
    <BaseURL>https://ad-server.example.com/user12345/</BaseURL>
    <AdaptationSet>...</AdaptationSet>
  </Period>
  
  <Period id="content_part2" duration="PT15M">
    <BaseURL>https://cdn.example.com/content/</BaseURL>
    <AdaptationSet>...</AdaptationSet>
  </Period>
</MPD>
```

```
시청자 A: user12345 광고 (자동차)
시청자 B: user67890 광고 (게임)
시청자 C: user11111 광고 (배달앱)
```

본 콘텐츠는 공유 (CDN 캐시 효율), 광고만 개인화. 이게 **Server-Side Ad Insertion (SSAI)**.

HLS도 가능하지만 `EXT-X-DISCONTINUITY` 태그 + 플레이리스트 동적 조작이 필요해 복잡. DASH는 구조 자체가 광고에 친화적.

**YouTube가 DASH를 강하게 미는 이유**가 이거다. 광고 비즈니스 모델에 직접 유리.

---

## 4. DASH의 또 다른 강점 — CENC 통합 DRM

OTT에서 결정적인 차이.

```xml
<ContentProtection
  schemeIdUri="urn:mpeg:dash:mp4protection:2011"
  value="cenc"
  cenc:default_KID="abc-123-..."/>

<ContentProtection
  schemeIdUri="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"
  value="Widevine">
  <cenc:pssh>...</cenc:pssh>
</ContentProtection>

<ContentProtection
  schemeIdUri="urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95"
  value="PlayReady">
  <cenc:pssh>...</cenc:pssh>
</ContentProtection>
```

**CENC (Common Encryption)**: 한 번 암호화한 콘텐츠를 여러 DRM 시스템이 공유.

```
[CENC 없이 = HLS 방식]
Widevine용으로 한 번 암호화 → Chrome용
PlayReady용으로 한 번 더 → Edge용
FairPlay용으로 또 → Safari용
→ 같은 영상 3번 인코딩, 저장 3배

[CENC = DASH 방식]
콘텐츠를 한 번 암호화
Widevine 라이센스 서버: 같은 키 제공
PlayReady 라이센스 서버: 같은 키 제공
FairPlay 라이센스 서버: 같은 키 제공
→ 인코딩/저장 1배
```

넷플릭스, 디즈니플러스 같은 글로벌 OTT는 DASH를 거의 필수로 쓴다. 멀티 DRM 비용 차이가 크니까.

---

## 5. 기술 비교표 — 한눈에

| 항목 | HLS | DASH |
|------|-----|------|
| 발표 | 2009 Apple | 2012 ISO/IEC |
| 매니페스트 | M3U8 (~5 KB) | MPD (~50 KB) |
| 컨테이너 | TS, fMP4 | fMP4, WebM, TS |
| 코덱 자유도 | 제한적 | 자유 |
| iOS 네이티브 | ✅ | ❌ |
| Android 네이티브 | ⭕ 제한적 | ✅ ExoPlayer |
| 브라우저 네이티브 | Safari만 | 없음 |
| 광고 삽입 | DISCONTINUITY | Period 분리 (우수) |
| DRM | FairPlay 따로 | CENC 통합 |
| 라이브 지연 | 18–25초 (LL-HLS 2–5초) | 6–15초 |

거의 모든 항목에서 DASH가 더 진보적이다.

근데 HLS가 60% 점유.

---

## 6. 그래서 왜 HLS가 이겼나

세 가지 이유.

### 이유 1: iOS 강제

iPhone 시청자는 DASH를 못 본다. iOS Safari가 DASH 네이티브 지원 안 함. JavaScript로 dash.js 돌릴 수는 있지만 **배터리 효율이 떨어진다**.

iOS가 글로벌 모바일 시청 시간의 30–50%. 이걸 포기할 수 있는 서비스가 거의 없다.

**"iOS도 지원해야지" → HLS 필수. 그럼 굳이 DASH도 따로 만들 필요가 있나?** 작은 서비스는 HLS만으로 끝.

### 이유 2: 단순함

M3U8은 메모장으로 열어볼 수 있다.

```
#EXTM3U
#EXTINF:6.000,
seg100.ts
```

MPD는 XML 파서가 필요하다. 250줄짜리 매니페스트를 디버깅하는 일이 정말 괴롭다.

개발자가 처음 라이브 인프라 만들 때 HLS부터 잡는다. 도구도 다 HLS 위주(FFmpeg, OBS, hls.js).

### 이유 3: ingest 표준이 HLS와 더 가까움

스트리머는 RTMP나 SRT로 송출 → 플랫폼이 트랜스코딩 → 시청자에게 HLS로 배포. 이 흐름에서 DASH로 가려면 추가 전환 단계.

라이브 플랫폼이 HLS를 기본으로 가는 자연스러운 이유.

### 결론: 기술 우수성보다 호환성과 생태계

DASH가 더 진보적이지만, 도입 비용이 크다. HLS는 "그냥 되는" 선택. 작은 서비스부터 큰 플랫폼까지 같은 이유로 HLS를 선택.

이게 **VHS vs 베타맥스**, **QWERTY vs 드보락**과 같은 패턴이다. 기술적 우수성이 시장을 결정하지 않는다.

---

## 7. 그래서 둘이 수렴 중 — CMAF의 미래

산업이 두 표준을 영원히 유지할 수는 없다. 저장/CDN 비용이 두 배.

해결책이 **CMAF (Common Media Application Format)** — [지난 시리즈에서 깊이 다룬 그거](../../) — fMP4 기반 공통 컨테이너.

![HLS와 DASH의 시장 점유율과 CMAF 수렴](/images/hls-dash-cmaf-convergence.png)

```
[전통적 운영]
HLS용: seg1.ts, seg2.ts, ... (별도 인코딩)
DASH용: seg1.m4s, seg2.m4s, ... (별도 인코딩)
→ 저장 비용 2배

[CMAF 시대]
공통: seg1.cmaf, seg2.cmaf, ...
HLS의 m3u8가 이걸 참조
DASH의 MPD도 이걸 참조
→ 저장 비용 1배
```

iOS 시청자는 m3u8 받고, Android 시청자는 MPD 받지만, **둘이 다운로드하는 실제 미디어 파일은 똑같다**.

이러면 HLS와 DASH의 컨테이너 차이가 사라진다. 매니페스트 포맷만 다를 뿐. 결국 산업은 한 미디어 파일 + 두 매니페스트로 수렴 중.

---

## 8. 그럼 우리는 뭘 써야 하나

상황별 선택 가이드.

**HLS만 쓰면 되는 경우**:
- 한국 라이브 방송 (시청자 단일 시장)
- 단순 콘텐츠 배포
- iOS 비중 높음
- 개발 리소스 적음

→ 치지직, SOOP 같은 한국 라이브 플랫폼은 HLS만으로 충분.

**DASH도 같이 쓰는 경우**:
- 글로벌 OTT 서비스
- 광고 비즈니스 (SSAI 활용)
- 멀티 DRM 필수 (Widevine + PlayReady + FairPlay)
- 다양한 디바이스 (스마트TV, 게임 콘솔)

→ 넷플릭스, 디즈니플러스, YouTube는 DASH + HLS 병행.

**플레이어 선택**:
- HLS만: `hls.js`
- DASH만: `dash.js`
- 둘 다 + 자체 확장: `Shaka Player` (Google, YouTube가 씀)

---

## 정리하면

DASH의 이야기는 결국 **기술 표준화의 정치학**이다.

1. **출신** — 2012년 ISO/IEC + 30개 기업이 Apple 견제용으로 만든 정식 국제 표준
2. **구조** — XML 기반 MPD, Period > AdaptationSet > Representation 계층, SegmentTemplate으로 URL 패턴화
3. **장점** — 코덱 자유, Period 기반 SSAI 광고, CENC 통합 DRM
4. **단점** — 매니페스트 크기 10배, XML 파싱 복잡, 도구 생태계 약함
5. **시장 결과** — HLS 60% vs DASH 32%. iOS 강제 + 단순함 + ingest 호환성이 결정
6. **미래** — CMAF로 같은 미디어 파일 공유, 매니페스트만 다른 구조로 수렴 중

다음 글에선 HLS의 본질적 한계 — **18–25초 라이브 지연을 어떻게 2초로 줄였나** — LL-HLS의 chunked CMAF 기법을 본다.

---

**참고**
- [DASH 표준 (ISO/IEC 23009-1)](https://www.iso.org/standard/79329.html)
- [DASH-IF (DASH Industry Forum)](https://dashif.org/)
- [dash.js GitHub](https://github.com/Dash-Industry-Forum/dash.js)
- [Shaka Player](https://shaka-player-demo.appspot.com/)
