---
title: "라이브 CDN은 캐시 키와 실드 층으로 원본 요청을 줄입니다"
date: 2026-06-20T02:36:58+09:00
lastmod: "2026-11-13T18:09:41+09:00"
description: "라이브 조각은 새로 오르는 순간 같은 요청이 몰립니다. CDN은 캐시 키로 같은 파일을 알아보고, 엣지 위에 지역 캐시와 Origin Shield를 쌓고, 같은 순간의 요청을 하나로 합쳐 원본 요청을 줄입니다. nginx 1.31.3 엣지 4대 · 실드 1대로 새 조각에 동시 요청 200건을 보내 원본 요청 수(합치기 켬 1건, 끔 1–200건), 아직 없는 조각의 404 캐시, 목록 stale-while-revalidate의 낡은 응답을 쟀고, CloudFront 캐시 키 · 요청 병합 · 오류 캐시 · 가격 · 무효화, Content Steering, Open Connect를 1차 문서로 확인했습니다."
categories: ["tech-blurting"]
tags: ["CDN", "CloudFront", "nginx", "HLS", "캐시", "Origin Shield", "PokeClip"]
draft: false
---

라이브 조각은 목록에 오르는 순간 시청자들이 거의 동시에 요청합니다. 그 순간 엣지에는 아직 사본이 없어서, 요청을 그대로 위로 올리면 원본이 같은 파일을 시청자 수만큼 보냅니다. CDN은 세 가지로 이 요청을 줄입니다. 캐시 키로 같은 파일을 알아보고, 엣지 위에 캐시 층을 쌓고, 같은 순간 들어온 같은 요청을 하나로 합칩니다. nginx 1.31.3으로 엣지 4대와 실드 1대를 만들어 새 조각에 동시 요청 200건을 보내자, 합치기를 켠 구성에서 원본 요청은 실드가 있을 때 1건, 없을 때 4건(엣지 수)이었습니다. 합치기를 끄면 같은 시험이 요청이 몰린 정도에 따라 1건부터 200건까지 갈렸습니다.

## 엣지 위에 지역 캐시와 실드가 한 층씩 더 있습니다 {#1-cdn은-단순-엣지-서버-분산이-아니다--다층-캐시-구조}

CloudFront를 예로 들면 요청은 세 층을 지납니다. DNS가 시청자를 지연이 가장 짧은 엣지(POP)로 보내고, 엣지에 없으면 근처의 지역 엣지 캐시(regional edge cache)로 갑니다([How CloudFront delivers content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html)). 지역 엣지 캐시는 엣지보다 캐시가 커서 덜 인기 있는 객체도 더 오래 남깁니다. 그 위의 Origin Shield는 켜야 생기는 층입니다. [Origin Shield 문서](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html)에 따르면 실드는 원본의 속성이라 원본마다 리전 하나를 고르고, 모든 지역 엣지 캐시의 요청이 그 리전을 거쳐 원본으로 갑니다. 실드와 같은 리전의 지역 엣지 캐시에서 오는 요청은 실드를 건너뜁니다. [[fig-cdn-tiers]]의 점선이 그 길입니다.

```mermaid {#fig-cdn-tiers kind="개념도" caption="CloudFront의 캐시 층. 시청자는 가까운 엣지로 가고, 엣지에 없으면 지역 엣지 캐시, 그다음 원본마다 하나 고르는 Origin Shield를 거쳐 원본에 닿습니다. 실드와 같은 리전의 지역 캐시는 실드를 건너뜁니다. CloudFront 개발자 가이드를 따라 그렸습니다." source="https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html"}
flowchart TB
  accTitle: CloudFront 캐시 층
  accDescr: 시청자가 엣지 POP로, 엣지에서 지역 엣지 캐시로, 지역 엣지 캐시에서 Origin Shield로, Origin Shield에서 원본으로 요청이 올라간다. 실드와 같은 리전의 지역 캐시는 원본으로 바로 간다.
  V[시청자] --> E[엣지 POP]
  E -->|없으면| R[지역 엣지 캐시]
  R -->|없으면| S[Origin Shield<br/>원본마다 리전 하나]
  S -->|없으면| O[원본]
  R -.->|실드와 같은 리전| O
```

실드는 요청마다 따로 과금됩니다. 2026년 11월 13일 [CloudFront 종량제 가격표](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/)에서 한국 리전 실드는 1만 건당 $0.0090이었습니다. 문서는 TTL이 3,600초보다 짧은 GET · HEAD를 동적 요청으로 보고, 동적 요청에는 실드가 늘 추가 층이라 실드를 지날 때마다 요금을 매긴다고 적습니다. 몇 초 TTL로 캐시하는 라이브 목록과 조각이 여기에 듭니다. PokeClip은 라이브 경로가 아니라 되감기 원본(S3) 앞에만 서울 실드를 둡니다([CDN 캐시 실측 글](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/#앞선-로컬-실험은-성능-개선율이-아니라-비교의-기준선입니다)).

### 원본이 받는 요청은 맨 위 층의 수를 따릅니다 {#pop--서버를-두는-물리적-위치}

캐시 노드마다 같은 요청을 하나로 합친다면, 새 조각 하나에 원본이 받는 요청은 시청자 수가 아니라 원본 바로 아래 층의 노드 수가 됩니다. 실드가 없으면 원본에 직접 묻는 캐시 노드마다 한 번씩, 실드가 있으면 실드 한 곳에서 한 번입니다. nginx로 이 구조를 만들어 확인했습니다. 시청자 200명이 엣지 4대에 50명씩 나뉘어 같은 순간 새 조각을 요청하고, 각 엣지는 요청을 하나로 합쳐 위로 올리는 설정입니다. 아래 영상에서 오른쪽으로 갈수록 요청 점이 줄어드는 것을 보십시오.

{{< motion scene="CoalesceTiers" id="fig-coalesce-tiers" kind="재구성" caption="새 조각 하나에 몰린 요청 200건이 엣지 4대에서 4건, 실드에서 1건으로 줄어 원본에 닿고, 원본 응답 하나가 다시 200명에게 내려갑니다. 숫자는 nginx 1.31.3 엣지 4 · 실드 1 구성에서 합치기를 켠 6회 측정이 모두 같았던 값이고, 움직임의 시각은 설명용입니다." >}}

실드 없이 엣지가 원본에 바로 묻는 구성에서는 원본 요청이 6회 모두 4건, 실드를 둔 구성에서는 6회 모두 1건이었습니다. 실드가 없으면 원본 요청은 엣지 수를 따라 늘어나고, 실드가 있으면 엣지 수와 상관없이 실드 한 곳의 요청이 됩니다.

### 엣지 위치는 DNS나 애니캐스트로 고릅니다 {#시청자는-어떻게-가까운-pop를-찾나--anycast-vs-geodns}

엣지를 고르는 방법은 두 갈래입니다. CloudFront는 DNS가 시청자에게 지연이 짧은 엣지의 주소를 돌려줍니다. 같은 이름을 물어도 서울 시청자는 192.0.2.10, 다른 지역 시청자는 198.51.100.20을 받는 식입니다(문서용 예시 주소, [RFC 5737](https://www.rfc-editor.org/rfc/rfc5737)). Cloudflare는 프록시를 거치는 레코드에 애니캐스트 주소 하나를 돌려주고([How Cloudflare works](https://developers.cloudflare.com/fundamentals/concepts/how-cloudflare-works/)), 여러 위치가 같은 주소를 BGP로 알려 경로상 가까운 위치가 요청을 받습니다([RFC 4786](https://www.rfc-editor.org/rfc/rfc4786)). 2026년 11월 13일 [Cloudflare 네트워크 페이지](https://www.cloudflare.com/network/)는 348개 도시를 적었고 한국 도시는 서울 하나였습니다.

## 캐시 키에 넣은 값마다 사본이 갈립니다 {#2-cache-control이-라이브-cdn의-운명을-가른다}

캐시 키는 캐시에서 객체 하나를 가리키는 이름입니다. CloudFront의 기본 캐시 키는 배포 도메인과 URL 경로뿐이고, 쿼리 · 헤더 · 쿠키는 넣지 않습니다([Understand the cache key](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-the-cache-key.html)). 키에 값을 하나 넣으면 그 값의 종류만큼 같은 바이트의 사본이 생깁니다. 시청자마다 다른 세션 쿠키를 넣으면 시청자 수만큼 사본이 생기고, 같은 조각도 시청자마다 처음 요청이 원본까지 갑니다. 반대로 응답 내용을 바꾸는 값은 키에 넣어야 합니다. LL-HLS 목록의 `_HLS_msn` · `_HLS_part`가 그런 값입니다([LL-HLS 글](/posts/tech-blurting/ll-hls-deep-dive/#cdn과의-충돌-문제)).

서명 URL은 쿼리로 권한을 싣지만 캐시를 쪼개지 않게 만들 수 있습니다. CloudFront는 서명 URL의 `Expires` · `Key-Pair-Id` · `Policy` · `Signature`를 원본에 넘기기 전에 지웁니다([Cache content based on query string parameters](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/QueryStringParameters.html)). 엣지가 서명을 검사하고, 키는 경로로만 고르게 둘 수 있습니다.

### 키에서 뺀 값도 원본에는 넘길 수 있습니다 {#캐시-키에서-쿠키토큰을-빼야-한다}

CloudFront에서 캐시 키에 넣은 쿼리 · 헤더 · 쿠키는 원본 요청에도 자동으로 들어갑니다. 키에는 넣지 않고 원본에만 넘길 값은 원본 요청 정책으로 따로 정합니다([Control origin requests with a policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html)). PokeClip 실험에서는 캐시 키에서 세션 쿠키를 빼자 원본으로 가는 요청에서도 세션이 빠져 원본이 401을 돌려줬습니다. 두 정책을 나눠 키에서는 빼고 원본에는 넘기자, 50명 25초 부하에서 원본 미디어 요청이 1,254건에서 28건이 됐습니다([CDN 캐시 실측 글](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)). 캐시에 맞은 요청(Hit)은 원본의 인증 검사를 거치지 않으므로, 시청자 권한은 엣지에서 따로 확인해야 합니다.

## 새 조각이 오른 순간 같은 요청을 하나로 합칩니다 {#3-thundering-herd--라이브-cdn의-가장-큰-적}

같은 객체가 캐시에 없을 때 동시에 들어온 요청을 모두 위로 올리면, 새 조각이 오를 때마다 원본에 요청이 몰립니다. CloudFront는 이를 요청 병합(request collapsing)으로 막습니다. 캐시에 없거나 만료된 객체를 원본에 요청한 사이에 같은 캐시 키의 요청이 더 오면, 그 요청들을 잠시 멈췄다가 첫 응답으로 함께 답합니다. 로그에는 첫 요청이 `Miss`, 합쳐진 요청이 `Hit`로 남습니다([Simultaneous requests for the same object](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#request-custom-traffic-spikes)). 여기서 줄어드는 것은 엣지가 원본으로 올리는 요청입니다. 시청자가 엣지에 보내는 요청 수는 그대로입니다.

nginx에서는 `proxy_cache_lock`이 같은 일을 합니다. 엣지 4대 · 실드 1대에서 이 설정을 끄고 켜며 새 조각에 동시 요청 200건을 보내, 원본이 받은 요청을 셌습니다. [[fig-origin-requests]]에서 끈 구성의 막대 길이가 회차마다 크게 달랐다는 점을 보십시오.

{{< chart id="fig-origin-requests" kind="실측" caption="새 조각 하나에 동시 요청 200건을 보냈을 때 원본이 받은 요청 수. 막대는 6회 중 최댓값이고 이름표에 최솟값을 함께 적었습니다. 합치기(proxy_cache_lock)를 켜면 6회 모두 엣지 수(4건) 또는 1건이었고, 끄면 요청이 몰린 정도에 따라 1–200건으로 갈렸습니다. nginx 1.31.3, 한 Docker VM 안의 엣지 4대 · 실드 1대 · 0.3초 늦게 답하는 원본." source="아래 「측정 조건」" height="300px" >}}
{
  "grid": {"left": 8, "right": 140, "top": 16, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "value", "name": "원본 요청(건)", "min": 0, "max": 300, "interval": 100, "axisLabel": {"showMaxLabel": false}},
  "yAxis": {"type": "category", "inverse": true, "data": ["엣지만 · 합치기 끔", "엣지만 · 합치기 켬", "엣지+실드 · 합치기 끔", "엣지+실드 · 합치기 켬"]},
  "series": [{
    "name": "원본 요청", "type": "bar", "barWidth": 22,
    "label": {"show": true, "position": "right", "color": "#172c40"},
    "data": [
      {"value": 75, "itemStyle": {"color": "#7a8a9b"}, "label": {"formatter": "5–75건"}},
      {"value": 4, "itemStyle": {"color": "#087f8b"}, "label": {"formatter": "6회 모두 4건", "fontWeight": "bold"}},
      {"value": 200, "itemStyle": {"color": "#7a8a9b"}, "label": {"formatter": "1–200건"}},
      {"value": 1, "itemStyle": {"color": "#087f8b"}, "label": {"formatter": "6회 모두 1건", "fontWeight": "bold"}}
    ]
  }]
}
{{< /chart >}}

합치기를 끈 구성도 운이 좋으면 원본 요청이 1건이었습니다. 요청이 첫 응답이 캐시에 들어간 뒤에 도착하면 그대로 Hit가 되기 때문입니다. 반대로 엣지+실드 구성의 한 회차에서는 200건이 모두 캐시에 맞지 않고 원본까지 갔습니다. 원본 부하가 요청이 도착하는 간격에 달려 있으면 용량을 계획할 수 없으므로, 합치기는 켜 두는 설정입니다.

합치기에는 대기 시간이 따라옵니다. nginx는 잠금을 기다리는 요청을 최대 500ms마다 다시 확인합니다([ngx_http_file_cache.c 455행](https://github.com/nginx/nginx/blob/release-1.31.3/src/http/ngx_http_file_cache.c#L455)). 실측에서도 원본 응답은 0.30–0.41초에 왔지만 실드에서 기다린 요청은 0.50–0.52초에 답을 받았습니다. 이번 시험은 호스트 부하(1분 load average 12–92)가 커서 시청자 쪽 지연은 해석하지 않았습니다.

### 합치기는 같은 키 · 캐시 가능한 응답일 때만 됩니다 {#request-coalescing-요청-병합}

CloudFront는 캐시 키가 같은 요청만 합칩니다. 캐시 키에 쿠키나 쿼리를 넣어 키가 갈리면 각 키의 요청이 따로 원본에 갑니다. 관리형 정책 `CachingDisabled`를 쓰면 캐시와 함께 병합도 꺼집니다. 최소 TTL을 0으로 두고 원본이 `Cache-Control: private` · `no-store` · `no-cache` · `max-age=0` · `s-maxage=0`을 보내도 그 객체는 병합하지 않습니다. 라이브 목록을 「캐시하지 말자」며 TTL 0으로 두면 병합까지 사라진다는 뜻입니다.

nginx는 범위가 더 좁습니다. [문서](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_lock)대로 `proxy_cache_lock`은 새 캐시 항목을 채울 때만 요청을 하나로 줄입니다. 만료된 항목을 갱신할 때는 걸리지 않습니다. 목록을 1초 TTL로 캐시하고 잠금만 켠 엣지 4대에 시청자 20명이 0.5초마다 목록을 받게 하자, 20초 동안 원본 목록 요청이 173–239건이었습니다(3회).

### 목록에 낡은 응답 허용을 걸면 낡은 목록이 나갑니다 {#stale-while-revalidate--매니페스트-캐시-ttl-줄이는-트릭}

stale-while-revalidate(SWR)는 만료된 응답을 내주면서 뒤에서 새로 받아 오게 하는 `Cache-Control` 확장입니다. [RFC 5861](https://www.rfc-editor.org/rfc/rfc5861)은 표준이 아닌 정보 문서(Informational)이고, 캐시가 정해진 초만큼 낡은 응답을 내줄 수 있다(MAY)고만 적습니다. 그 시간이 지나도록 재검증하지 못했다면 낡은 응답을 더 내주지 않아야 합니다(SHOULD NOT). CloudFront는 2023년 5월 17일부터 이 지시어를 따르고([공지](https://aws.amazon.com/about-aws/whats-new/2023/05/amazon-cloudfront-stale-while-revalidate-stale-if-error-cache-control-directives/)), 낡은 응답은 SWR 값과 최대 TTL 중 작은 값까지만 냅니다([Manage how long content stays in the cache](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)).

nginx에서 비슷한 동작은 `proxy_cache_use_stale updating`과 `proxy_cache_background_update on`입니다. 앞의 1초 TTL 목록 시험에 이 둘을 더하자 원본 목록 요청은 줄고, 시청자가 받은 목록은 더 낡았습니다. 나이는 받은 시각에서 원본이 목록을 만든 시각을 뺀 값입니다.

| nginx 엣지 4대, 목록 TTL 1초 | 잠금만 | 잠금 + 낡은 응답 허용 |
|---|---:|---:|
| 20초 동안 원본 목록 요청(3회) | 173–239건 | 40–44건 |
| 시청자가 받은 목록 나이 p95 | 1.24–1.29초 | 1.76–1.90초 |
| 20초 쉬었다 받은 첫 목록 | 갱신(나이 3ms) | 낡은 응답(나이 20.0초, 조각 10개 뒤) |

마지막 줄이 위험합니다. 한동안 요청이 없던 엣지는 다음 첫 시청자에게 20초 묵은 목록을 냈습니다. 이 20초는 시간 제한이 없는 nginx 지시어(`proxy_cache_use_stale updating`)의 결과이고, SWR 값을 준 CloudFront는 그 값까지만 낡은 응답을 냅니다(문헌값, 측정하지 않음). 같은 경로를 이어 쓴 첫 시도에서는 23.9초 묵은, 조각 12개 뒤의 목록이 20번 나갔습니다. 목록이 조각 10개만큼 뒤처지면 플레이어는 이미 받은 조각만 보이는 목록을 받습니다. LL-HLS의 보류 요청은 「이 번호의 조각이 생길 때까지 붙잡아 달라」는 요청이라, 낡은 목록을 바로 내주는 SWR과 목적이 반대입니다. 둘을 한 경로에 걸면 보류 요청이 기다리지 않고 옛 목록을 받을 수 있다고 봅니다(설정을 읽고 한 추론, 측정하지 않음). 라이브 목록에 SWR을 쓰려면 SWR 값을 목표 길이보다 짧게 두고 실제 나이를 재야 합니다.

### 아직 없는 조각의 404도 10초 캐시됩니다

CloudFront는 원본의 404를 오류 캐싱 최소 TTL(기본 10초)과 원본이 보낸 `max-age` 중 긴 시간만큼 캐시하고, 그동안 같은 요청에 캐시한 404로 답합니다([HTTP 4xx and 5xx status codes](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HTTPStatusCodes.html)). 플레이어가 아직 목록에 오르지 않은 조각을 먼저 요청하면 그 404가 남습니다. nginx에 `proxy_cache_valid 404 10s`를 두고, 첫 요청 3초 뒤부터 조각을 내주는 원본을 0.25초마다 요청하자 시청자의 첫 200은 10.6초와 11.2초에 왔습니다. 원본은 두 번만 요청받았습니다. 원본은 3초에 준비됐지만 시청자는 7.6–8.2초를 더 404로 받은 셈입니다. CloudFront에서는 배포의 오류 응답 설정에서 상태 코드별로 이 최소 TTL을 바꿀 수 있습니다([Custom error pages and error caching](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesErrorPages.html)).

## 전송 바이트는 비트레이트 × 시청 시간이고 단가는 공시가와 계약이 정합니다 {#4-인기-스트리머-한-명--8천만-원}

CDN이 내보내는 바이트는 평균 비트레이트 × 시청 시간 × 시청자 수입니다(코덱별 바이트 산식은 [코덱 결정 글](/posts/tech-blurting/codec-decision-and-debugging/#5-cdn-비용--진짜-큰-항목)). 평균 동시 시청자 5만 명이 6Mbps를 4시간 보면 시청자당 6,000,000 × 14,400 ÷ 8 = 10.8GB, 모두 540,000GB입니다(1GB = 10⁹바이트, 오디오 · 컨테이너 제외).

단가는 지역과 구간마다 다릅니다. 2026년 11월 13일 [CloudFront 종량제 가격표](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/)에서 한국이 든 아시아 묶음은 매달 첫 1TB 무료, 다음 9TB GB당 $0.120, 다음 40TB $0.100, 다음 100TB $0.095, 다음 350TB $0.090, 다음 524TB $0.080이었습니다. 이 구간을 540TB에 그대로 대면 약 $49,300입니다(1TB = 1,000GB로 계산, 한 달에 이 방송 하나만 있다고 가정). 요청 요금도 따로입니다. 2초 조각과 2초마다 다시 받는 목록이면 시청자당 4시간에 14,400건, 모두 7억 2천만 건이고, 한국 HTTPS 요청 단가 1만 건당 $0.0120에서 무료 1천만 건을 빼면 약 $850입니다. 가격표는 매달 10TB 이상을 약정하면 따로 할인 가격을 주고, 2025년 11월 18일부터는 웹사이트 전송 · 보안을 묶은 배포당 정액 요금제($0 · $15 · $200 · $1,000)도 있습니다([공지](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-flat-rate-pricing-plans/)). 실제 청구액은 이런 계약 조건이 정합니다.

### 지우기보다 주소를 바꾸는 편이 싸지만 접근 차단은 따로입니다 {#cdn-purge는-비싸다}

캐시에서 객체를 미리 지우는 것을 CloudFront는 무효화(invalidation)라고 부릅니다. 매달 첫 1,000경로는 무료이고 그 뒤로 경로당 $0.005이며, `*` 와일드카드가 든 경로는 파일 수천 개를 지워도 1경로로 셉니다([Pay for file invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html)). 무효화한 객체는 다음 요청이 원본으로 가므로, 인기 조각을 지우면 지운 직후 엣지마다 원본에 다시 묻습니다. AWS는 내용을 바꿀 때 파일 이름이나 폴더에 판 표시를 넣으라고 권합니다([Update existing files using versioned file names](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/UpdatingExistingObjects.html)). 새 주소는 처음부터 다른 캐시 키라 지울 것이 없습니다.

다만 주소를 바꿔도 옛 주소의 사본은 TTL이 끝날 때까지 남고, 옛 주소를 아는 사람은 계속 받을 수 있습니다. 저작권 문제로 내려야 하는 조각이라면 옛 주소를 무효화하고, 원본에서 그 경로를 거절하거나 서명 URL의 만료로 접근을 끊어야 합니다.

## 여러 CDN을 쓰면 캐시 적중이 나뉘고 Content Steering이 길을 고릅니다 {#5-멀티-cdn--한-곳에-의존하지-않는-이유}

여러 CDN을 함께 쓰면 한 CDN이 멈춰도 다른 길이 남습니다. 2021년 6월 8일 Fastly는 고객의 정상 설정 변경이 숨은 버그를 건드려 09:47 UTC부터 네트워크의 85%가 오류를 냈고, 49분 안에 95%가 정상으로 돌아왔습니다([Fastly 장애 요약](https://www.fastly.com/blog/summary-of-june-8-outage)). 대가는 캐시가 CDN마다 따로라는 점입니다. 새 조각마다 CDN 수만큼 원본 요청이 늘고, 시청자가 나뉘면 각 CDN의 적중률도 떨어집니다. AWS 문서는 다른 CDN의 원본을 CloudFront 실드 하나로 모아 원본 요청과 캐시 키를 하나로 맞추는 구성을 소개합니다([Origin Shield, Multiple CDNs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html#os-use-cases-multi-cdn)).

어느 CDN으로 보낼지는 플레이어가 지연을 재서 고르기보다 서버가 정합니다. 브라우저에는 임의 주소로 ping을 보내는 API가 없습니다. HLS 개정 초안 22판은 Content Steering을 둡니다. 다변형 목록의 `EXT-X-CONTENT-STEERING` 태그가 스티어링 목록 주소(`SERVER-URI`)와 처음 쓸 경로(`PATHWAY-ID`)를 알리고, 같은 변형을 CDN별로 묶은 경로(Pathway) 사이의 우선순위는 플레이어가 주기적으로 받는 스티어링 목록이 정합니다. 플레이어는 이 요청에 `_HLS_pathway`와 추정 처리량 `_HLS_throughput`을 붙이고, 캐시는 `_HLS_throughput`처럼 자주 바뀌는 쿼리를 캐시 키에서 빼거나, 스티어링 목록 응답을 아예 캐시하지 않아야 합니다(SHOULD, 7.4절). 클라이언트 지원은 선택(OPTIONAL)입니다([개정 초안 4.4.6.6 · 7절](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). hls.js 1.7.4에도 이 두 쿼리를 붙이는 스티어링 컨트롤러가 들어 있습니다([content-steering-controller.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/content-steering-controller.ts)).

### 자체 CDN은 ISP 안에 서버를 둡니다 {#6-netflix-open-connect--자체-cdn의-모범}

Netflix의 Open Connect는 캐시 서버(OCA)를 ISP 네트워크 안에 둡니다. 자격을 갖춘 ISP에 OCA를 무상으로 주고, 1,000개 넘는 ISP와 이렇게 협력하며, 데이터센터에서는 정산 없는 피어링도 엽니다([Open Connect](https://openconnect.netflix.com/en/)). 시청자 트래픽이 ISP 밖으로 나가지 않으니 ISP는 회선 부담이 줄고 Netflix는 전송 경로를 직접 관리합니다. 이 구조는 VOD 전용이 아닙니다. Netflix는 라이브도 Open Connect로 내보내며, AWS의 라이브 원본에서 6,000곳 넘는 위치의 Open Connect 서버까지 전용 백본으로 잇는다고 적었습니다([Behind the Streams, Part 1](https://netflixtechblog.com/behind-the-streams-live-at-netflix-part-1-d23f917c2f40), 2025-07-15, 원문이 자동 접속을 막아 [보관본](https://web.archive.org/web/20261003125057/https://netflixtechblog.com/behind-the-streams-live-at-netflix-part-1-d23f917c2f40)으로 확인).

### 엣지 함수는 서명 검사를 원본 앞에서 끝냅니다 {#8-edge-compute--cdn-엣지에서-코드-실행}

CDN은 엣지에서 짧은 코드를 돌릴 수 있습니다. CloudFront Functions와 Lambda@Edge, Cloudflare Workers, [Fastly Compute](https://www.fastly.com/products/edge-compute)가 그런 기능입니다. 라이브에서 쓸모가 큰 곳은 권한 검사입니다. Hit는 원본에 닿지 않으므로 권한은 엣지에서 끝나야 합니다. PokeClip은 시청자 권한을 엣지의 CloudFront 서명 쿠키로 확인하고, 캐시에 조각이 있어도 서명 없는 요청이 403을 받는 것을 확인했습니다. 원본으로 가는 요청에는 라이브 경로의 CloudFront 함수(`live-auth.js`)가 `Authorization` 머리를 CDN 비밀로 덮어써, 원본은 시청자 세션이 아니라 그 비밀로 CDN을 거친 요청인지 가립니다([CDN 캐시 실측 글](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/#앞선-로컬-실험은-성능-개선율이-아니라-비교의-기준선입니다)).

## 원본 요청은 캐시 키 · 층 · 목록 TTL로 정해집니다 {#정리하면}

- 캐시 키에는 응답을 바꾸는 값만 넣습니다. 권한처럼 원본만 알아야 하는 값은 원본 요청 정책으로 넘기고, 시청자 권한은 엣지에서 확인합니다.
- 새 조각의 원본 요청은 원본 바로 아래 층의 노드 수를 따릅니다. 합치기를 켜고 실드 층을 두면 그 수가 1이 됩니다.
- 라이브 목록에 TTL 0을 주면 병합이 꺼지고, SWR을 주면 낡은 목록이 나갑니다. 목록 TTL은 목표 길이보다 짧게 두고 시청자가 받는 목록의 나이를 잽니다.
- 아직 없는 조각을 먼저 요청하면 404가 10초 남을 수 있습니다. 오류 캐시 시간을 함께 정합니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 16:13–16:25(KST)에 실행했습니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 32GB, 팬 없음), macOS 27.0.1, Docker 29.8.2. 다른 세션의 작업이 함께 돌아 1분 load average가 12–92였습니다. 지연 대신 요청 수 · 상태 코드 · 목록 나이만 결론에 썼습니다.
- 구성: compose 프로젝트 하나에 엣지 4대 · 실드 1대(nginx 1.31.3, `nginx:1-alpine`), 원본(Python 3.12.14 HTTP 서버, 응답 전 0.3초 지연, 조각 1MB), 시험 클라이언트가 한 Docker VM 안에 있습니다. 엣지는 8081 포트로 원본에 바로, 8080 포트로 실드를 거쳐 묻습니다. 캐시 설정은 `proxy_cache_valid 200 60s`, `proxy_cache_valid 404 10s`, `proxy_cache_lock on`(켬)과 `off`(끔), `proxy_cache_lock_timeout 10s`.
- 동시 요청: 스레드 200개가 장벽에서 함께 출발해 `edge{i%4+1}`로 매번 새 이름의 조각을 요청했습니다. 원본 요청 수는 원본 로그에서 그 이름의 줄 수입니다. 실드가 받은 요청 수는 실드 접근 로그 중 시험용으로 정한 형식의 줄만 셌습니다. nginx 이미지의 기본 로그도 같은 요청을 표준 출력에 한 번 더 찍어 전체 줄 수는 두 배였습니다. 조건마다 6회(부하가 높던 3회 + 낮던 3회)입니다.
- 404: 엣지 1대가 원본에 바로 묻고, 원본은 첫 요청 3초 뒤부터 200을 줍니다. 클라이언트는 0.25초마다 16초 동안 요청했습니다(2회).
- 목록: 원본은 응답 전 0.3초 지연, 2초마다 미디어 시퀀스를 하나 올리고 만든 시각을 목록에 적습니다. 엣지는 `proxy_cache_valid 200 1s` + `proxy_cache_lock on`, 낡은 응답 허용 구성은 여기에 `proxy_cache_use_stale updating` · `proxy_cache_background_update on`을 더했습니다. 시청자 20명이 0.5초마다 엣지 4대를 돌아가며 20초(3회), 이어서 한 번 받고 20초 쉰 뒤 다시 받기(2회)입니다.
- 실측은 nginx의 동작입니다. CloudFront의 병합 · 오류 캐시 · SWR은 본문에 링크한 AWS 문서 값이고 이 시험으로 재지 않았습니다.

## 출처

- AWS CloudFront 개발자 가이드(2026-11-13 확인): [How CloudFront delivers content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html) · [Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html) · [Understand the cache key](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-the-cache-key.html) · [Control origin requests with a policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html) · [Cache content based on query string parameters](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/QueryStringParameters.html) · [Request and response behavior for custom origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#request-custom-traffic-spikes) · [HTTP 4xx and 5xx status codes](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HTTPStatusCodes.html) · [Custom error pages and error caching](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesErrorPages.html) · [Manage how long content stays in the cache](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html) · [Pay for file invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html) · [Update existing files using versioned file names](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/UpdatingExistingObjects.html)
- [Amazon CloudFront 종량제 가격](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/) · [정액 요금제](https://aws.amazon.com/cloudfront/pricing/) (2026-11-13 확인)
- AWS 공지: [CloudFront stale-while-revalidate · stale-if-error 지원](https://aws.amazon.com/about-aws/whats-new/2023/05/amazon-cloudfront-stale-while-revalidate-stale-if-error-cache-control-directives/) (2023-05-17) · [정액 요금제](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-flat-rate-pricing-plans/) (2025-11-18)
- [RFC 5861, HTTP Cache-Control Extensions for Stale Content](https://www.rfc-editor.org/rfc/rfc5861) (Informational, 2010-05)
- [draft-pantos-hls-rfc8216bis-22](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) — 4.4.6.6 EXT-X-CONTENT-STEERING, 7 Content Steering
- [hls.js v1.7.4 content-steering-controller.ts](https://github.com/video-dev/hls.js/blob/v1.7.4/src/controller/content-steering-controller.ts)
- [RFC 5737, IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc5737) · [RFC 4786, Operation of Anycast Services](https://www.rfc-editor.org/rfc/rfc4786)
- Cloudflare: [Global Network](https://www.cloudflare.com/network/) (2026-11-13 확인) · [How Cloudflare works](https://developers.cloudflare.com/fundamentals/concepts/how-cloudflare-works/)
- Fastly: [Summary of June 8 outage](https://www.fastly.com/blog/summary-of-june-8-outage) · [Fastly Compute](https://www.fastly.com/products/edge-compute)
- Netflix: [Open Connect](https://openconnect.netflix.com/en/) · [Behind the Streams: Three Years Of Live at Netflix. Part 1.](https://netflixtechblog.com/behind-the-streams-live-at-netflix-part-1-d23f917c2f40) (2025-07-15, [보관본](https://web.archive.org/web/20261003125057/https://netflixtechblog.com/behind-the-streams-live-at-netflix-part-1-d23f917c2f40))
- nginx: [ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) · [ngx_http_file_cache.c (release-1.31.3)](https://github.com/nginx/nginx/blob/release-1.31.3/src/http/ngx_http_file_cache.c#L455)
- [CDN 캐시 키와 원본 인증을 나누자 원본 요청이 줄었습니다](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/) — PokeClip 캐시 키 · 원본 요청 정책 실험과 운영 구성

다음 편: [라이브 버퍼는 라이브 끝까지의 거리만큼만 채울 수 있습니다](/posts/tech-blurting/buffering-deep-dive/)
