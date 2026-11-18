---
title: "되감기 목록만 gzip으로 압축하고 라이브 목록은 미뤘습니다"
date: "2026-11-18T19:06:24+09:00"
categories: ["projects"]
tags: ["PokeClip", "HLS", "CloudFront", "gzip", "nginx", "CDN", "DVR"]
draft: false
author: "김태윤"
description: "PokéClip 미디어 CDN은 4초마다 다시 받는 1시간 되감기 목록(약 138KB)을 압축 없이 보내고 있었습니다. CloudFront 압축의 네 조건 중 경로 규칙의 compress와 캐시 정책의 gzip 허용이 꺼져 있었습니다. 되감기 · VOD 목록만 별도 경로 규칙으로 떼어 gzip만 켰고, 로컬 재측정에서 시청자 한 명이 받는 목록 전송량은 약 276kbps에서 11kbps로 줄어듭니다. 운영 반영 뒤 시험 방송에서는 8,727B 되감기 목록이 응답 머리까지 합쳐 1.3KB 안팎으로, 22,679B VOD 목록이 1.6KB 안팎으로 나가는 것을 CloudFront 로그로 확인했습니다. 라이브 목록은 MediaMTX가 2,048B를 넘으면 Content-Length 없이 보내 CloudFront가 압축할 수 없어, 상자 nginx의 gzip_proxied any 후속 작업으로 미뤘습니다."
---

PokéClip의 되감기 목록은 사이드카가 S3에 올리는 정적 파일이고, 플레이어는 4초마다 다시 받습니다. 1시간 창이 차면 약 138KB인데, 고치기 전 미디어 CDN(CloudFront)은 이 목록을 압축하지 않고 보냈습니다. 되감기 · VOD 목록만 따로 경로 규칙으로 떼어 gzip만 켰고, 로컬 재측정에서 1시간 목록은 137,945B에서 gzip 5,497B로 줄어 시청자 한 명의 목록 전송량이 약 276kbps에서 11kbps가 됩니다. 운영 시험 방송에서는 8,727B 목록이 응답 머리까지 합쳐 1,305–1,306B로, 22,679B VOD 목록이 1,632–1,644B로 나간 것을 CloudFront 로그로 확인했습니다. 라이브 목록은 원본이 길이 머리(Content-Length) 없이 보내 CloudFront로는 압축할 수 없어 후속 작업으로 미뤘습니다.

되감기 · VOD 목록만, gzip만 켜고 라이브 목록을 후속으로 미룬 범위와 머지는 제가 정했습니다. Terraform 구현 · 시험 · 적용 런북은 AI(Claude Code와 Codex)가 했고, 커밋은 제 계정으로 [PokeClip-mono PR 537](https://github.com/3K-PokeClip/PokeClip-mono/pull/537)에 들어갔습니다. 아래 재측정은 이 글을 쓰며 AI(Claude Code)가 했습니다.

## CloudFront는 네 조건이 맞아야 압축하는데, 고치기 전 운영은 앞의 둘이 꺼져 있었습니다

CloudFront 압축 조건 가운데 이 글에서 따질 조건은 넷입니다([AWS 「Serve compressed files」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html)).

1. 경로 규칙(캐시 비헤이비어)의 `Compress`가 켜져 있어야 합니다.
2. 그 규칙의 캐시 정책이 gzip이나 brotli를 허용해야 합니다(`EnableAcceptEncodingGzip` · `EnableAcceptEncodingBrotli`).
3. 원본 응답에 `Content-Length`가 있어야 합니다. CloudFront는 이 값으로 크기를 판단하고, 없으면 압축하지 않습니다.
4. 크기가 1,000–10,000,000바이트여야 합니다.

시청자의 `Accept-Encoding`과 응답 `Content-Type`도 조건이고, HLS 목록 형식 `application/vnd.apple.mpegurl`은 압축 대상입니다([같은 문서 「File types」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html#compressed-content-cloudfront-file-types)).

PR을 쓰기 전에 AI가 운영 배포 설정을 읽기 조회해 보니 경로 규칙 일곱의 `Compress`가 모두 꺼져 있었고, 캐시 정책도 gzip · brotli를 허용한 것이 없었습니다([PR 537 본문](https://github.com/3K-PokeClip/PokeClip-mono/pull/537) · [2편의 저장소 원문 관찰](/posts/0-to-1/pokeclip-sidecar-rewind-playlist/#렌더한-본문은-s1s7-검사를-지나야-s3에-올라갑니다)). 네 조건 중 앞의 둘이 꺼져 있었으니, 뒤의 둘이 맞아도 고치기 전 운영에서는 목록이 압축 없이 나갔습니다.

Apple의 [HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) 10.1은 「The server MUST deliver playlists using gzip content-encoding」입니다. 비용도 컸습니다. 끝나지 않은 목록은 바뀔 때마다 마지막 조각 길이만큼 기다렸다 다시 받으므로([RFC 8216bis-22 6.3.4](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)), 4초마다 1시간 목록 전체를 받습니다.

아래 그림에서 원본 막대와 gzip 막대의 길이 차이를 보면 됩니다. [2편](/posts/0-to-1/pokeclip-sidecar-rewind-playlist/)의 `Render`로 만든 1시간(900조각) 목록을 원본 · gzip · brotli로 재고, 4초마다 한 번 받는다고 놓고 시청자 한 명의 전송률로 바꿨습니다.

{{< chart id="fig-rate" kind="실측" caption="1시간(4초 × 900조각) 되감기 목록을 4초마다 받을 때 시청자 한 명이 받는 목록 전송률입니다. 고정 커밋의 Render로 만든 목록의 로컬 측정 크기 × 8 ÷ 4초이며 운영 응답이 아닙니다. 정확한 값은 아래 표에 있습니다." source="https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-playlist-gzip/measure" height="300px" >}}
{
  "grid": {"left": 8, "right": 56, "top": 24, "bottom": 8, "containLabel": true},
  "xAxis": {"type": "value", "name": "kbps", "min": 0, "max": 300},
  "yAxis": {"type": "category", "inverse": true, "data": ["원본", "gzip -6", "brotli -q 11"]},
  "series": [
    {"name": "시청자 한 명", "type": "bar", "label": {"show": true, "position": "right", "formatter": "{c}"},
     "data": [
       {"value": 275.9, "itemStyle": {"color": "#7a8a9b"}},
       {"value": 11.0, "itemStyle": {"color": "#087f8b"}},
       {"value": 5.5, "itemStyle": {"color": "#7a8a9b"}}
     ]}
  ]
}
{{< /chart >}}

| 경우(900조각) | 원본 | gzip -6 | brotli -q 11 | 원본 → gzip 전송률 |
|---|---|---|---|---|
| 스트림 이름 8자 · 조각 길이 같음 | 137,945B | 5,497B | 2,742B | 275.9 → 11.0kbps |
| 같은 이름 · 조각 길이 ±30ms | 137,934B | 9,768B | 5,955B | 275.9 → 19.5kbps |
| 스트림 이름 32자 | 181,182B | 5,710B | 2,898B | 362.4 → 11.4kbps |

gzip은 목록을 원본의 3–7%로 줄였습니다. 길이를 흔든 목록이 덜 줄어드는 것은 `#EXTINF` 값과 PDT가 줄마다 달라져서이고, 운영 목록은 이 쪽에 가까울 수 있습니다. CloudFront가 어떤 압축 수준을 쓰는지는 AWS 문서에 없어서, 운영 크기는 응답으로 따로 쟀습니다(마지막 절).

## 라이브 목록은 원본이 길이 없이 보내 CloudFront가 압축할 수 없었습니다

라이브 목록(`/live/*.m3u8`)은 CloudFront → 내부 ALB → Media 상자의 nginx → MediaMTX로 갑니다. 압축을 켜도 세 번째 조건에서 막힙니다.

MediaMTX v1.21.1은 HLS를 gohlslib v2.4.5로 내고([`go.mod`](https://github.com/bluenviron/mediamtx/blob/v1.21.1/go.mod) · [`muxer_instance.go` 177–191행](https://github.com/bluenviron/mediamtx/blob/v1.21.1/internal/servers/hls/muxer_instance.go#L177-L191)), gohlslib는 목록을 `Content-Length` 없이 `WriteHeader(200)` 뒤 `Write(본문)` 한 번으로 씁니다([`muxer_stream.go` 315–422행](https://github.com/bluenviron/gohlslib/blob/v2.4.5/muxer_stream.go#L315-L422)). 그러면 Go `net/http`가 2,048바이트 버퍼 안에서 끝난 응답에만 `Content-Length`를 붙이고, 넘으면 chunked로 보냅니다([`server.go` 341행 `bufferBeforeChunkingSize = 2048`](https://github.com/golang/go/blob/go1.26.0/src/net/http/server.go#L341) · [1327행](https://github.com/golang/go/blob/go1.26.0/src/net/http/server.go#L1327) · [1592–1595행 주석](https://github.com/golang/go/blob/go1.26.0/src/net/http/server.go#L1592-L1595)). PokéClip은 v1.21.1 기반 포크 이미지를 쓰는데([`Dockerfile.mtxhook` 85행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/media/Dockerfile.mtxhook#L85)), 포크는 HLS 서버 쪽 파일과 gohlslib 판을 바꾸지 않았습니다([v1.21.1과의 비교](https://github.com/bluenviron/mediamtx/compare/v1.21.1...xodbs1021:mediamtx:v1.21.1-pokeclip.2)).

상자 nginx는 그 응답을 `proxy_buffering off`로 그대로 넘기고, gzip 설정은 없습니다([`nginx.conf.tmpl` 74–77행 · 113–127행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/media-host/nginx/nginx.conf.tmpl#L74-L127)). CloudFront는 chunked 응답을 받는 대로 시청자에게 넘기고 캐시하지만([AWS 「Transfer-Encoding header」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#ResponseCustomTransferEncoding)), 길이가 없어 압축하지는 않습니다.

로컬 nginx 컨테이너 안에 gohlslib처럼 쓰는 작은 Go 상류를 띄워 재현했습니다(MediaMTX는 띄우지 않음).

| 경우 | Content-Length | Transfer-Encoding | Content-Encoding | 받은 바이트 |
|---|---|---|---|---|
| nginx 정적 파일(1시간 목록) | 137945 | | | 137,945 |
| 상류 → nginx(proxy_buffering off) · 2,048B | 2048 | | | 2,048 |
| 상류 → nginx(proxy_buffering off) · 2,049B | | chunked | | 2,049 |
| 상류 → nginx(proxy_buffering on) · 2,049B | | chunked | | 2,049 |
| 상류 → nginx(gzip on · `gzip_proxied` 기본) · Via 있음 | | chunked | | 137,945 |
| 상류 → nginx(gzip on · `gzip_proxied any`) · Via 있음 | | chunked | gzip | 7,154(압축 수준 1) |

본문이 2,049B가 되자 `Content-Length`가 사라졌고, nginx는 버퍼링을 켜도 길이를 만들지 않았습니다. 원인은 상류의 chunked이고, `proxy_buffering off`는 그 응답을 그대로 흘려보낼 뿐입니다([nginx `proxy_buffering`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering)). 7,154B는 nginx 기본 압축 수준(`gzip_comp_level 1`)에서 나온 값입니다.

그래서 라이브 목록은 원본에서 압축해야 하고, `Content-Encoding`이 붙은 응답은 CloudFront가 그대로 냅니다([AWS 「Conditions for compression」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html#compressed-content-cloudfront-notes)). 후속 작업의 설정은 nginx `gzip on` · `gzip_types application/vnd.apple.mpegurl` · `gzip_proxied any`입니다. nginx는 요청에 `Via` 머리가 있으면 프록시를 거친 요청으로 보고, `gzip_proxied` 기본값 `off`는 그런 요청을 압축하지 않습니다([nginx `gzip_proxied`](https://nginx.org/en/docs/http/ngx_http_gzip_module.html#gzip_proxied)). 2019년 AWS 문서(보관본)는 CloudFront가 원본 요청에 `Via`를 넣는다고 적었고([「Serving Compressed Files When Your Origin Server Is Running NGINX」](https://web.archive.org/web/20191211184634/https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html)), 지금 문서는 시청자가 보낸 `Via`를 원본에 넘긴다고만 적습니다([AWS 「HTTP request headers and CloudFront behavior」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#request-custom-headers-behavior)). 어느 쪽이든 `Via`가 든 요청이 올 수 있어 `gzip_proxied any`가 필요합니다. 운영 상자가 받는 `Via`는 확인하지 않았습니다.

아래 그림에서 라이브 목록 응답이 어디서 길이를 잃는지 보면 됩니다. 내부 ALB는 생략했습니다.

```mermaid {#fig-live-path kind="개념도" caption="라이브 목록 요청의 지금 경로와 후속 설정입니다. MediaMTX가 2,048B를 넘는 목록을 chunked로 보내고 상자 nginx가 그대로 넘겨, CloudFront는 압축 조건 셋째(Content-Length)에서 멈춥니다. 후속은 nginx가 압축해 Content-Encoding을 붙이는 것입니다." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/media-host/nginx/nginx.conf.tmpl#L74-L127"}
flowchart TB
  accTitle: 라이브 목록 응답이 길이를 잃는 곳
  accDescr: MediaMTX는 2048바이트가 넘는 목록을 Content-Length 없이 chunked로 보내고, 상자 nginx는 proxy_buffering off로 그대로 넘겨 CloudFront는 압축하지 않는다. 후속 설정 gzip_proxied any에서는 nginx가 압축해 Content-Encoding gzip을 붙이고 CloudFront는 다시 압축하지 않고 그대로 낸다.
  MT["MediaMTX<br/>목록 2,048B 초과"] -->|"chunked · 길이 없음"| NX["상자 nginx<br/>그대로 넘김"]
  NX -->|chunked| CF{"CloudFront<br/>Content-Length?"}
  CF -->|없음| NO["압축 안 함"]
  NX -.->|"후속: gzip_proxied any"| GZ["nginx가<br/>gzip으로 압축"]
  GZ -.-> PASS["CloudFront는<br/>그대로 냄"]
```

라이브 규칙의 `Compress`는 이번에도 켜지 않았습니다. 켜도 압축될 수 있는 것은 길이가 붙는 1,000–2,048B의 짧은 목록뿐입니다.

## 되감기 · VOD 목록은 S3 객체라 길이가 늘 붙습니다

되감기 · VOD 목록은 사이드카가 S3에 `Content-Type: application/vnd.apple.mpegurl`로 올린 객체입니다([`s3store.go` 28–30행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/media/internal/rewind/publish/s3store.go#L28-L30)). S3 `GetObject` 응답에는 `Content-Length`가 붙으므로([AWS S3 API 「GetObject」](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html)) 꺼져 있던 것은 CloudFront 쪽 두 설정뿐이었습니다.

크기 조건은 방송 첫머리에서만 걸립니다. 같은 `Render`로 재 보니 5조각 목록이 999B, 6조각 목록이 1,152B라, 첫 20초쯤의 되감기 목록은 압축되지 않습니다. VOD 목록은 `#EXT-X-PLAYLIST-TYPE:VOD`라 다시 받지 않으므로([RFC 8216bis-22 6.3.4](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) · [`render.go` 155행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/media/internal/rewind/render.go#L155)), 압축으로 줄어드는 것은 처음 한 번의 전송입니다. 운영에서 잰 7분 56초 시험 방송의 VOD 목록은 22,679B였습니다.

| 대상 | 경로 규칙 | ① compress | ② gzip 허용 | ③ Content-Length | ④ 크기 | 결과 |
|---|---|---|---|---|---|---|
| 되감기 목록 | `/dvr/*.m3u8` | 켬 | 켬 | 있음(S3) | 6조각부터 1,000B 이상 | gzip |
| VOD 목록 | `/vod/*.m3u8` | 켬 | 켬 | 있음(S3) | 7분 56초 방송 22,679B | gzip |
| 라이브 목록 | `/live/*.m3u8` | 끔 | 끔 | 2,048B 넘으면 없음 | — | 압축 안 함(후속은 nginx) |
| 조각 `.m4s` | `/dvr/*` · `/vod/*` | 끔 | 끔 | 있음(S3) | — | 압축 안 함 |

조각의 형식 `video/iso.segment`는 압축 대상 목록에도 없습니다([`upload/s3.go` 29–30행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/media/internal/upload/s3.go#L29-L30)). 아래 그림에서 세 요청이 네 관문의 어디까지 가는지 보면 됩니다.

{{< motion scene="GzipGates" kind="개념도" caption="CloudFront 압축의 네 조건을 요청 셋이 지납니다. 되감기 목록은 넷을 다 지나 gzip이 되고(1시간 목록 138KB → 5.5KB, 로컬 재측정의 gzip -6), 라이브 목록은 앞 둘을 켜더라도 Content-Length가 없어 멈추고, 조각은 목록 규칙이 아니라 압축을 끈 조각 규칙으로 갑니다." >}}

라이브 줄의 앞 두 관문이 점선인 것은 지금 압축을 꺼 두어서이고, 켜더라도 셋째 관문에서 멈춥니다.

## brotli는 끄고 gzip만 허용했습니다

첫 구현은 gzip과 brotli를 둘 다 허용했는데, 그러면 둘 다 받는 시청자에게 CloudFront는 brotli를 고릅니다([AWS 「How CloudFront compression works」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html#compressed-content-cloudfront-how-it-works)). Apple 규격 10.1이 요구하는 것은 gzip입니다. 위 표에서 brotli는 gzip 크기의 50–61%였지만, 시청자 한 명당 차이는 5–8kbps입니다. 규격을 따르는 쪽을 골라 목록 정책 `dvr_vod_playlist`는 `enable_accept_encoding_gzip = true` · `enable_accept_encoding_brotli = false`로 두었습니다([`policies.tf` 106–132행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/modules/cdn_media/policies.tf#L106-L132)).

gzip만 허용하면 CloudFront는 `Accept-Encoding`을 `gzip` 하나로 정규화해 캐시 키에 넣으므로([AWS 「Compression support」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html#cache-policy-compressed-objects)), 한 목록의 캐시 변형은 gzip과 비압축 둘뿐입니다.

## 목록만 따로 경로 규칙으로 떼어 조각 캐시는 그대로 두었습니다

`/dvr/*`와 `/vod/*` 규칙은 목록과 조각을 함께 받습니다. 첫 구현처럼 이 규칙에 압축을 켜면 조각의 캐시 키에도 `Accept-Encoding`이 들어가 같은 조각이 인코딩마다 따로 캐시되는데, 이미 압축된 영상이라 얻는 것은 없습니다. 그래서 목록 규칙을 따로 뗐습니다.

새 규칙 `/dvr/*.m3u8` · `/vod/*.m3u8`을 [1편의 경로 규칙 표](/posts/0-to-1/pokeclip-live-dvr-url-split/#경로마다-원본과-함수를-고르고-맞는-규칙이-없는-요청은-원본까지-가지-않습니다)에서 각 짝 규칙 바로 앞에 끼웠습니다. 위에서부터 견주므로 `.m3u8`로 끝나는 경로가 먼저 목록 규칙에 걸립니다. 원본 · 서명 쿠키 키 그룹 · 엣지 함수 · 원본 요청 정책 · CORS 응답 헤더 정책은 짝과 같고, 캐시 정책과 `compress`만 다릅니다([`main.tf` 22–136행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/modules/cdn_media/main.tf#L22-L136)). 그래서 목록 요청도 [1편 둘째 글](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/#엣지-함수가-1시간-창-밖-조각을-404로-막습니다)의 dvr-floor 경로 검사를 지납니다.

| 순서 | 경로 패턴 | 원본 | 캐시 정책 | compress |
|---|---|---|---|---|
| 1 | `/api/ingest/*` | Media 상자 | 캐시 끔 | 끔 |
| 2 | `/live/*.m3u8` | Media 상자 | 라이브 목록 1초 | 끔 |
| 3 | `/live/*` | Media 상자 | 라이브 조각 | 끔 |
| **4(새로)** | **`/dvr/*.m3u8`** | **S3** | **`dvr_vod_playlist`(gzip만)** | **켬** |
| 5(전 4) | `/dvr/*` | S3 | `dvr_vod` | 끔 |
| **6(새로)** | **`/vod/*.m3u8`** | **S3** | **`dvr_vod_playlist`(gzip만)** | **켬** |
| 7(전 5) | `/vod/*` | S3 | `dvr_vod` | 끔 |
| 8(전 6) | `/api/streams/*/rewind` | Media 상자 | 되감기 제어면 1초 | 끔 |
| 9(전 7) | `/playback/*` | Media 상자 | 캐시 끔 | 끔 |

아홉 경로 규칙 모두에 `compress`를 명시했습니다(기본 규칙은 명시하지 않아 provider 기본값인 끔입니다). 모듈 시험은 아홉 규칙의 `compress` 배열과, 목록 정책만 gzip을 허용하는지를 단언합니다([`cdn_media.tftest.hcl` 429–467행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/modules/cdn_media/tests/cdn_media.tftest.hcl#L429-L467)).

## 적용 직후 gzip 변형의 첫 요청은 MISS입니다

캐시 키에 `Accept-Encoding: gzip`이 들어가면서, 적용 직후 목록의 gzip 변형은 엣지에도 Origin Shield에도 없습니다. 그 첫 요청은 S3까지 가서 원본을 받고, CloudFront가 압축해 캐시에 넣습니다. 그래서 적용 직후 잠깐 S3 GET과 지연이 늘 수 있고, 새 변형을 처음 채우는 것이라 회귀로 보지 않기로 런북에 적었습니다([엣지 시험 런북 822–871행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/runbooks/edge-tests.md?plain=1#L822-L871)). 운영 실측에서 되감기 목록 요청은 대부분 Miss였지만, 목록이 `max-age=1`이라 1초마다 다시 채우는 Miss와 첫 변형의 Miss는 로그로 가를 수 없습니다. 오래 캐시되는 VOD 목록(`max-age=3600`)은 19시 7분 54초의 첫 요청이 Miss, 19시 8분 17초의 두 요청이 Hit였습니다.

## 적용 절차에서는 세 가지를 조심했습니다

**첫째, 규칙 표 중간에 끼우면 plan에서 뒤 칸이 전부 바뀐 것처럼 보입니다.** Terraform은 경로 규칙을 순서 있는 목록으로 다루므로, 넷째 자리에 끼우면 그 뒤 여섯 칸이 바뀐 것처럼 나옵니다. 그래서 칸마다 새 규칙 표의 같은 칸과 대조했습니다. 하한 스위치를 켠 배포에서는 엣지 함수 연결이 하나 늘기만 해야 하고, 줄어드는 줄이 보이면 스위치 값을 빠뜨린 것이라 멈춥니다. 되돌릴 때는 거꾸로, 줄어드는 연결이 `/vod/*`가 되는 칸 하나뿐이어야 합니다.

**둘째, 권한 목록에 없다고 권한이 없는 것은 아닙니다.** 권한 사전 판정 목록에 `DeleteCachePolicy`가 없지만 그 목록이 실제 권한의 전부는 아니므로, 런북에는 되돌릴 때 정책 삭제가 「거부될 수 있다」고 적고 거부되면 배포는 먼저 원래 일곱 규칙으로 돌아가고 정책만 상태에 남는다고 적었습니다.

**셋째, 확인 대상 자신에서 기대값을 고르지 않았습니다.** 하한을 끈 뒤의 확인 기대값이 「`/dvr` 규칙 하나」에서 「둘」로 바뀌었는데, 배포에서 읽은 규칙 수로 기대값을 고르면 목록 규칙이 빠진 배포도 스스로 통과합니다. 그래서 기대값은 적용한 체크아웃의 `main.tf`에서 `"/dvr/*.m3u8"`을 세어 먼저 정하고(1이면 `behaviors=2`, 0이면 `behaviors=1`), 배포에서 읽은 값과 견줍니다([엣지 시험 런북 2191–2206행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/runbooks/edge-tests.md?plain=1#L2191-L2206)).

## 운영에 반영한 뒤 응답 크기로 압축을 확인했습니다

PR 537은 11월 18일 18시 10분에 develop에 머지됐고, 같은 날 18시 12–13분 edge apply로 운영 배포에 반영했습니다. plan은 기대한 두 줄(캐시 정책 생성 · 배포 변경)과 같았고, 밀린 칸도 모두 새 표와 맞았으며, 엣지 함수 연결은 하나 늘기만 했습니다. 결과는 생성 1 · 변경 1 · 삭제 0, 18시 13분 Deployed였고, 다시 뽑은 plan은 변경 0입니다.

같은 날 18시 21–28분과 31–39분에 시험 방송을 띄웠습니다. 첫 방송에서는 브라우저가 응답 머리와 크기를 가려 판정 자료를 얻지 못했고, 둘째 방송에서 AI가 재생 중인 페이지 안의 `fetch`로 되감기 목록 · 조각 · 라이브 목록을 받았습니다. 되감기 목록의 CloudFront 로그 20줄은 두 방송에 걸칩니다. 둘째 방송이 다시보기가 된 뒤 19시 8분에는 그 VOD 목록도 같은 방법으로 받았습니다. 브라우저는 `Accept-Encoding: gzip`을 붙여 보내고, 판정은 받은 본문 크기와 로그를 견줘서 했습니다. 로그의 `sc-bytes`는 응답 머리를 포함해 보낸 전체 바이트이고, `sc-content-len`은 응답의 `Content-Length` 값입니다([AWS 「Standard logging reference」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html#BasicDistributionFileFormat)).

| 대상 | 풀린 본문 | 응답 `Content-Length` | CloudFront가 보낸 바이트 | 판정 |
|---|---|---|---|---|
| 되감기 목록 `/dvr/…/index.m3u8` | 8,727B | 없음(로그 `-`) | 1,305–1,306B(8,727B 판을 받은 18시 34분 44초의 두 요청, 머리 포함) · 같은 분의 다른 판 1,258–1,328B | 압축됨 |
| VOD 목록 `/vod/…/index.m3u8` | 22,679B | 없음(로그 `-`) | 1,644B(19시 7분 54초, Miss) · 1,641 · 1,632B(19시 8분 17초, Hit) | 압축됨 |
| 적용 전 VOD 목록(같은 경로 꼴, 다른 방송) | — | 9,674 · 132,481 | 10,272 · 133,216B(10시 18분 · 11시 35분) | 압축 안 됨 |
| 조각 `/dvr/…/seg/….m4s` | 3,083,523B | 3,083,523 | 재지 않음 | 압축 안 됨 |
| 라이브 `/live/…/index.m3u8` | 802B | 802 | 재지 않음 | 압축 안 됨 |

되감기 목록은 머리를 합친 전송량이 본문의 약 7분의 1이라 압축 없이는 나올 수 없는 크기입니다. 원본 S3는 늘 길이를 주는데, 되감기 목록(index.m3u8) 요청 20줄(18시 22–34분)이 모두 `sc-content-len` 「-」였습니다. CloudFront가 압축한 응답을 길이 없이 보낸 것으로 봅니다. 18시 34분 37초와 44초에는 첫 요청이 Miss, 같은 초에 다시 보낸 요청이 Hit였고, 나머지는 `max-age=1`이라 Miss였습니다.

VOD 목록도 같은 모양입니다. 전송량이 본문의 약 7%이고 `Content-Length`가 없었습니다. 같은 경로 꼴의 VOD 목록이 적용 전 오전에는 `sc-content-len` 9,674 · 132,481로 길이를 달고 그보다 조금 큰 바이트로 나갔으니, 적용 전후로 길이 머리가 사라지고 전송량이 줄었습니다.

조각은 받은 바이트가 `Content-Length`와 같아 설계대로 압축되지 않았습니다. VOD 플레이어도 조각은 `/dvr/…/seg/*.m4s`에서 받습니다. 라이브 쪽에서 받은 것은 `max-age=30`이 붙은 다중 변형 목록(gohlslib의 `index.m3u8`, [`muxer.go` 701–738행](https://github.com/bluenviron/gohlslib/blob/v2.4.5/muxer.go#L701-L738))이었습니다. 802B라 CloudFront 하한 1,000B보다 작고, 2,048B 아래라 길이도 붙어 있어 위 설명과 맞습니다. 2,048B를 넘는 라이브 미디어 목록은 운영에서 재지 않았습니다.

확인하지 못한 것은 하나입니다. 응답의 `Content-Encoding` · `Vary` 머리는 CORS로 페이지에 노출되지 않아 글자로 보지 못했고, 압축 여부는 크기로만 판정했습니다.

비슷한 CDN 앞에서 목록을 압축하려면 원본 응답에 `Content-Length`가 있는지부터 보십시오. 앞의 두 설정은 켜기만 하면 되지만, 길이가 없는 원본은 CDN이 아니라 원본 쪽에서 압축해야 합니다.

## 측정 조건

- **공개 재측정.** AI(Claude Code)가 2026년 11월 18일 18:24–18:27 KST에 실행했습니다. MacBook Air(Apple M5), macOS 27.0.1, Go 1.27.2, brotli 1.2.0, Apple gzip 487.0.1, OrbStack(Docker Engine 29.8.2). PokeClip-mono `31f2f32d`의 `media/`를 풀었고, 되감기 렌더 코드는 2편의 `627fb5a2`와 같습니다.
- **목록 크기.** 저장소에 없는 시험으로 `rewind.Render` 4초 × 900조각 목록을 만들어 `Validate`를 통과시킨 뒤 CLI `gzip -6`/`-9` · `brotli -q 5`/`-q 11`로 쟀습니다. 도메인 `https://media.example.com`, 지어낸 스트림 이름입니다.
- **전송률.** 크기 × 8 ÷ 4초로, 바뀐 목록을 4초마다 다시 받는다는 가정입니다. KB는 1,000B, kbps는 1,000bit/s입니다.
- **압축 조건 재현.** `nginx:alpine`(nginx 1.29.7, 다이제스트 고정) 컨테이너 하나에 Go 상류를 함께 띄우고 `curl --http1.1`로 머리를 받았습니다. MediaMTX · CloudFront는 띄우지 않았고, 라벨 붙인 컨테이너는 측정 뒤 지웠습니다.
- **운영 반영.** apply 결과(생성 1 · 변경 1 · 삭제 0) · 시각 · plan 대조 · 재plan은 운영 반영 기록(비공개)에서 옮겼습니다.
- **운영 실측.** 2026년 11월 18일 18:21–18:28 · 18:31–18:39 KST 시험 방송 두 번. 둘째 방송의 브라우저 `fetch` 결과(상태 · 노출된 머리 · 풀린 바이트)와 두 방송에 걸친 되감기 목록(index.m3u8) 요청 20줄의 표준 로그를 견줬습니다. VOD 목록은 19:08:17 KST에 같은 방법으로 두 번 받아, 같은 경로 꼴 VOD 목록 요청의 표준 로그(적용 전 10:18 · 11:35, 적용 뒤 19:07–19:08)와 견줬습니다. 비공개 기록이며 식별자와 주소는 옮기지 않았습니다.
- **명령.** 실행 순서가 적힌 `run.sh`와 시험 · 상류 · nginx 설정 · 원자료는 [저장소 `_workspace/blog/pokeclip-playlist-gzip/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-playlist-gzip/measure)에 있습니다.

## 출처

규격 · 문서
- [Apple — HLS Authoring Specification for Apple Devices](https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html) — 10.1 「The server MUST deliver playlists using gzip content-encoding」 · 10.4 목록 MIME 형식
- [RFC 8216bis-22, HTTP Live Streaming 2nd Edition](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) — 6.3.4 목록 다시 받기 간격
- [AWS — Serve compressed files](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html) — `Compress` · 캐시 정책 허용, 둘 다 허용하면 brotli, 1,000–10,000,000바이트, `Content-Length` 필요, 원본 `Content-Encoding`이면 다시 압축하지 않음, 이미 캐시된 객체, 압축 대상 `Content-Type`
- [AWS — Understand cache policies, Compression support](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html#cache-policy-compressed-objects) — `Accept-Encoding` 정규화와 캐시 키
- [AWS — Request and response behavior for custom origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#ResponseCustomTransferEncoding) — chunked 응답 처리 · 시청자가 보낸 `Via`를 원본에 넘김
- [AWS — Serving Compressed Files(2019년 12월 보관본)](https://web.archive.org/web/20191211184634/https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html) — 「Serving Compressed Files When Your Origin Server Is Running NGINX」: CloudFront가 원본 요청에 `Via`를 넣음, `gzip_proxied any`
- [AWS re:Post — Amazon CloudFront serving compressed files with Origin server running NGINX](https://repost.aws/questions/QULPpM3dVXTvK9mzjUvyH39A/amazon-cloudfront-serving-compressed-files-with-origin-server-running-nginx) — 2020년 답변, 같은 문서 문장 인용(보조)
- [AWS — Standard logging reference](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html#BasicDistributionFileFormat) — `sc-bytes` · `sc-content-len` · `x-edge-result-type`
- [AWS — Amazon S3 API GetObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html) — 응답 `Content-Length`
- [nginx — ngx_http_gzip_module](https://nginx.org/en/docs/http/ngx_http_gzip_module.html#gzip_proxied) — `gzip_proxied`와 `Via`, 기본값 `off` · [ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering) — `proxy_buffering`

코드(공개 저장소)
- MediaMTX v1.21.1: [`go.mod`](https://github.com/bluenviron/mediamtx/blob/v1.21.1/go.mod) · [`muxer_instance.go` 177–191행](https://github.com/bluenviron/mediamtx/blob/v1.21.1/internal/servers/hls/muxer_instance.go#L177-L191) · gohlslib v2.4.5 [`muxer_stream.go` 315–422행](https://github.com/bluenviron/gohlslib/blob/v2.4.5/muxer_stream.go#L315-L422) · [`muxer.go` 701–738행](https://github.com/bluenviron/gohlslib/blob/v2.4.5/muxer.go#L701-L738) · 포크 [v1.21.1과의 비교](https://github.com/bluenviron/mediamtx/compare/v1.21.1...xodbs1021:mediamtx:v1.21.1-pokeclip.2)
- Go go1.26.0 `net/http`: [`server.go` 341행](https://github.com/golang/go/blob/go1.26.0/src/net/http/server.go#L341) · [1327행](https://github.com/golang/go/blob/go1.26.0/src/net/http/server.go#L1327) · [1592–1595행](https://github.com/golang/go/blob/go1.26.0/src/net/http/server.go#L1592-L1595)
- 3K-PokeClip/PokeClip-mono develop `31f2f32d`: [`cdn_media/main.tf` 22–136행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/modules/cdn_media/main.tf#L22-L136) · [`policies.tf` 106–132행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/modules/cdn_media/policies.tf#L106-L132) · [`cdn_media.tftest.hcl` 429–467행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/modules/cdn_media/tests/cdn_media.tftest.hcl#L429-L467) · [엣지 시험 런북 822–871행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/runbooks/edge-tests.md?plain=1#L822-L871) · [2191–2206행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/terraform/runbooks/edge-tests.md?plain=1#L2191-L2206) · [`nginx.conf.tmpl` 74–127행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/infra/media-host/nginx/nginx.conf.tmpl#L74-L127) · [`s3store.go` 28–30행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/media/internal/rewind/publish/s3store.go#L28-L30) · [`upload/s3.go` 29–30행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/media/internal/upload/s3.go#L29-L30) · [`render.go` 155행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/media/internal/rewind/render.go#L155) · [`Dockerfile.mtxhook` 85행](https://github.com/3K-PokeClip/PokeClip-mono/blob/31f2f32d77650c3f20ac5318cc3a95d875fc8cbf/media/Dockerfile.mtxhook#L85)
- 들어온 PR: [PokeClip-mono PR 537](https://github.com/3K-PokeClip/PokeClip-mono/pull/537) — 목록 경로 규칙 · gzip 정책 · 적용 런북

재측정
- [스크립트 · 시험 · 상류 · nginx 설정 · 원자료](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-playlist-gzip/measure)

이어지는 글
- [CDN 하나에서 라이브는 EC2로, 되감기는 S3로 보냈습니다](/posts/0-to-1/pokeclip-live-dvr-url-split/) — 1편, 주소와 원본
- [서명 쿠키는 종류별로 나누고 1시간 창은 엣지에서 막았습니다](/posts/0-to-1/pokeclip-dvr-cookie-edge-floor/) — 1편 둘째 글, 엣지 하한
- [사이드카는 4초 조각마다 HLS 되감기 목록을 이렇게 만듭니다](/posts/0-to-1/pokeclip-sidecar-rewind-playlist/) — 2편, 목록 크기 실측
