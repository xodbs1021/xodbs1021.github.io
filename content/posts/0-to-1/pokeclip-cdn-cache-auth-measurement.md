---
title: "CDN 캐시 키와 원본 인증을 나누자 원본 요청이 줄었습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: 2026-11-12T02:10:00+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "CloudFront", "HLS", "Benchmark"]
description: "10월 5일 CloudFront 실험에서 캐시 키에서 세션 쿠키·쿼리를 빼자 원본 전달까지 빠져 MediaMTX가 401을 돌려줬고, 캐시 키 정책과 원본 요청 정책을 나누자 50 VU 원본 미디어 요청이 1,254건에서 28건이 된 기록. 97.95%의 분모, 그대로였던 p95, 캐시된 조각에도 서명 없는 요청은 403, 10월 6일 S3 원본의 두 번째 요청 Miss, 그리고 세션 쿠키 대신 CDN 비밀을 원본에 넘기는 지금 운영 구성까지."
draft: false
portfolio_cases: [12]
portfolio_pages: [20, 21, 22, 23]
portfolio_edition: "2026-10-15-v2"
---

2026년 10월 5일 PokeClip CDN 실험에서, 같은 라이브 영상 조각을 가상 사용자 50명이 요청하는데 시청자마다 캐시가 갈라져 원본 서버가 매번 파일을 보내는 비교군을 만들었습니다. 공유 캐시로 바꾸려고 캐시 키에서 세션 쿠키와 쿼리를 빼자, 이번에는 원본의 init·조각 요청이 401로 실패했습니다. 캐시 키에서 뺀 값이 원본으로 가는 요청에서도 빠져 MediaMTX가 세션을 확인하지 못한 것입니다. 캐시 키 정책과 원본 요청 정책을 나눠, 캐시 키에서는 빼고 원본에는 넘기게 하자 50 VU 25초 동안 원본 미디어 요청이 1,254건에서 28건이 됐습니다. 미디어 HTTP p95는 약 1.4초로 그대로였습니다.

비교군과 채택할 정책은 제가 정했고, 실험 구성·계측·분석은 AI(Codex)가 했습니다. 지금 운영 엣지의 설계도 제가 정했는데, 운영은 실험과 달리 세션 쿠키가 아니라 CDN 비밀을 원본에 넘깁니다. 운영에서 원본 요청이 얼마나 줄었는지는 재지 않았습니다.

## 캐시 키에서 세션을 빼자 원본이 401을 돌려줬습니다 {#캐시-키를-줄이다-원본-인증까지-빼-버렸습니다}

실험은 임시 AWS 자원에서 원본 직결, CDN 시청자별 캐시, CDN 공유 캐시의 세 구성을 견줬습니다. 시청자별 캐시는 모든 쿠키·쿼리와 실험용 `bench_viewer` 값으로 캐시를 나눈 비교군입니다. 운영에서 발견한 설정 결함이 아니라 공유 여부의 차이를 보려고 만든 조건입니다.

CloudFront에서 캐시 키에 넣은 값은 원본에도 자동으로 전달됩니다. 그래서 캐시 키에서 쿠키·쿼리를 빼면서 따로 원본 전달을 정하지 않으면, 원본은 세션 없는 요청을 받습니다. 영상은 이 두 갈래입니다. 가운데 캐시 칸에 객체가 하나만 생기는 것, 원본으로 가는 화살표에서 세션까지 빠지면 401이 돌아오는 것, 그리고 캐시에 객체가 있어도 서명 없는 요청은 엣지에서 403을 받는 것을 보십시오.

{{< motion scene="CacheKeyVsOriginForward" id="fig-cache-key-origin" kind="개념도" caption="쿠키를 뺀 캐시 키로 시청자 셋이 같은 객체 하나를 함께 씁니다. Miss일 때 원본으로 가는 요청에서까지 세션을 빼면 원본이 401을 돌려주고, 원본 요청 정책으로 세션을 넘기면 200입니다. 캐시에 객체가 있어도 서명 쿠키가 없는 요청은 엣지에서 403입니다. 10월 5일 실험 구성을 보여 주는 설명용 그림입니다." >}}

AWS 문서의 [캐시 키 정책](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html)과 [원본 요청 정책](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html)을 나눠 적용한 10월 5일 실험 구성은 아래와 같습니다. 지금 운영 구성과는 다릅니다.

| 대상 | 10월 5일 실험 조건 | 이유 |
|---|---|---|
| 미디어 캐시 키 정책 | 쿠키·쿼리를 키에서 뺌 | 같은 URI의 같은 바이트를 공유 |
| 원본 요청 정책 | 세션 쿠키·쿼리를 원본에 넘김 | Miss일 때 MediaMTX가 세션을 확인 |
| 재생 목록 | TTL 0 | 새 조각을 알리는 내용이 계속 바뀜 |
| 미디어 조각 | TTL 120초 | 내용이 고정된 조각을 재사용 |
| 시청자 접근 | 엣지에서 CloudFront 서명 쿠키 검사 | Hit에서도 권한 확인 |

공유의 전제는 같은 URI가 같은 바이트를 가리킨다는 것입니다. 사용자별 쿼리가 실제 내용을 바꾸는 서비스라면 그 값을 캐시 키에서 빼면 안 됩니다. 또 원본의 인증 검사는 Hit 요청에서 실행되지 않으므로, 시청자 권한은 엣지에서 따로 확인해야 했습니다.

## 원본 미디어 요청은 1,254건에서 28건이 됐고 p95는 그대로였습니다 {#원본-요청은-줄었지만-p95는-거의-같았습니다}

원본은 서울 리전 EC2의 MediaMTX 1.20.1 컨테이너(CPU 1개, 메모리 384MiB 제한)였습니다. 입력은 720p30 H.264 약 1.5Mbps와 AAC 128kbps, GOP 2초였고 조각도 약 2초였습니다. 같은 Mac의 k6로 세 구성마다 1·10·25·50 VU를 25초씩 한 번 차례로 돌렸습니다. [[fig-cdn-origin-requests]]는 50 VU에서 원본이 받은 미디어 요청 수입니다.

{{< chart id="fig-cdn-origin-requests" kind="실측" caption="50 VU·25초에서 원본이 받은 미디어 요청 수. 시청자별 캐시 비교군은 1,254건, 캐시 키에서 세션을 빼고 원본 전달은 남긴 공유 캐시는 28건이었습니다. 2026-10-05 임시 AWS 실험, MediaMTX 1.20.1, 각 조건 1회." source="팀 내부 실측(비공개 원시 묶음), 포트폴리오 요약 2026-10-15판 21쪽" height="200px" >}}
{"grid":{"left":8,"right":64,"top":16,"bottom":8,"containLabel":true},"xAxis":{"type":"value","name":"건","min":0,"max":1400,"interval":350},"yAxis":{"type":"category","inverse":true,"data":["시청자별 캐시","공유 캐시"]},"series":[{"name":"원본 미디어 요청","type":"bar","barWidth":22,"label":{"show":true,"position":"right","formatter":"{c}건"},"data":[{"value":1254,"itemStyle":{"color":"#7a8a9b"},"label":{"formatter":"1,254건"}},{"value":28,"itemStyle":{"color":"#087f8b"}}]}]}
{{< /chart >}}

요청 수는 줄었지만 바이트와 지연은 따로 읽어야 했습니다. 단위가 서로 달라 표로 둡니다.

| 50 VU · 25초 | 시청자별 캐시 | 공유 캐시 |
|---|---:|---:|
| 클라이언트 미디어 수신 | 253.00MB | 263.243MB |
| 원본 미디어 전송 | 253.00MB | 5.387MB |
| 요청 기준 캐시 적중률 | 0.00% | 97.81% |
| 미디어 HTTP p95 | 1,442.14ms | 1,389.47ms |

공유 캐시의 바이트 전송 회피율은 `1 − 5.387 / 263.243 = 97.95%`입니다. 공유 캐시 실행에서 시청자가 받은 미디어 바이트 가운데 원본이 직접 보내지 않은 비율입니다. 분모는 비교군의 원본 전송량 253.00MB가 아닙니다. 두 실행의 클라이언트 수신량이 달라서, 전후 원본 바이트 감소율과 구분했습니다. 응답 헤더로 센 요청 적중률 97.81%도 분모가 다른 지표입니다.

재생 목록은 TTL 0이라 계속 원본으로 갔습니다. 공유 캐시 50 VU에서 목록은 1,366요청·1.921MB였고, 미디어를 합친 원본 응답은 7.308MB였습니다. 97.95%는 미디어 바이트 지표이고 전체 요청 감소율이 아닙니다. 12개 조건의 완료 HTTP는 16,214건이었고 실패와 첫 수신 뒤 관측한 조각 번호 누락은 0이었습니다. 공유 캐시 실행의 마지막 반복 1개는 종료 유예가 끝나 중단됐습니다. 처음의 401 실패는 예비 실행 기록으로 따로 두고, 고친 구성으로 본 부하를 돌렸습니다.

세 구성의 50 VU p95는 약 1.39–1.44초로 비슷해 지연이 줄었다는 근거는 얻지 못했습니다. 시청자→CDN은 HTTPS, CDN→EC2와 직결은 HTTP였고 조건마다 한 번이라 반복 신뢰구간도 없습니다. 프로토콜과 연결 차이를 캐시 효과와 분리하지 못하므로 CPU나 재생 지연이 98% 좋아졌다고 읽을 수 없습니다.

## 캐시에 있는 조각도 서명 없는 요청에는 403이었습니다 {#이미-캐시된-파일을-권한-없이-받을-수-없어야-했습니다}

적중률만 확인하면 공유 정책의 절반만 본 셈입니다. Hit는 원본 인증을 건너뛰므로, [CloudFront 서명 쿠키](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html)를 신뢰 키 그룹에 연결하고 같은 URI로 세 요청을 대조했습니다.

| 요청 | 응답 | 본문 확인 |
|---|---|---|
| 유효한 서명, 처음 | 200 / Miss | 373,502바이트 |
| 유효한 서명, 다시 | 200 / Hit | 길이와 SHA-256 같음 |
| 캐시를 채운 뒤 서명 없음 | 403 | 거절 |

유효한 요청은 같은 바이트를 다시 쓰고, 서명이 없는 요청은 캐시에 객체가 있어도 403을 받았습니다. 원본 요청을 줄이는 정책과 시청자 접근 제한이 함께 성립하는 것을 확인했습니다. 임시 자원은 실험 뒤 지웠습니다.

## S3 원본은 두 번째 요청까지 Miss였습니다 {#s3-후속-실험에서는-두-번째-요청이-계속-miss였습니다}

10월 6일에는 저장된 영상 경로를 따로 확인했습니다. 새 비공개 S3 객체를 원본 접근 제어(OAC, 서명 항상)로 붙였고, 시청자→CloudFront와 CloudFront→S3 모두 HTTPS였습니다. 시험 객체에는 시청자 인증을 걸지 않았으므로 앞의 서명 쿠키 검증과 다른 실험입니다.

| 조건 | 관측 |
|---|---|
| 곧바로 두 번째 전체 GET | 20/20 Miss |
| 같은 IP · 1초 뒤 두 번째 GET | 20/20 Miss |
| 나중의 세 번째 전체 GET | 20/20 Hit, 같은 엣지 · 본문 해시 같음 |
| 4MiB 객체의 첫 256KiB 범위 요청 | 10/10 HTTP 206, 범위 · 본문 같음 |

두 번째 요청이라는 순서만으로 Hit를 가정할 수 없었습니다. 그래서 새 curl·HTTP/1.1, DNS를 고정한 같은 IP·같은 엣지에서 처음의 Miss와 실제로 확인한 세 번째 Hit 20쌍을 견줬습니다. 지표는 연결 준비 뒤 첫 바이트까지의 시간(`time_starttransfer − time_pretransfer`)입니다.

| 객체 크기 | 처음 Miss 중앙값 | 세 번째 Hit 중앙값 |
|---|---:|---:|
| 256KiB | 54.0ms | 14.2ms |
| 4MiB | 52.9ms | 15.0ms |

모두 110요청이었고, 전송량은 미리 잡아 둔 2GiB 상한 안이었습니다. 첫 두 요청이 Miss였던 내부 원인은 확정하지 못했습니다. 시간 경과와 앞선 두 요청이 함께 달라서, 캐시 전파 지연인지 필요한 요청 횟수인지 가를 수 없었습니다. 위 시간 차이는 S3 원본 전송 절감률이나 영상 재생 지연을 뜻하지 않습니다.

## 운영 배포는 세션 쿠키 대신 CDN 비밀을 원본에 넘깁니다 {#앞선-로컬-실험은-성능-개선율이-아니라-비교의-기준선입니다}

지금 운영 엣지는 실험의 「세션 쿠키·쿼리를 원본에 넘김」 대신 MediaMTX의 CDN 모드를 씁니다. 라이브 경로의 CloudFront 함수가 원본으로 가는 요청의 `Authorization` 머리를 키-값 저장소(KVS)에 둔 CDN 비밀로 늘 덮어쓰고, MediaMTX는 그 비밀(`hlsCDNSecret`)로 CDN이 보낸 요청인지 확인합니다([`live-auth.js` 머리 주석](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/functions/live-auth.js#L1-L21), [`mediamtx.yml.tmpl` 143행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/mediamtx.yml.tmpl#L143)). 비밀을 못 읽으면 원본으로 넘기지 않고 503을 돌려줍니다. 원본에는 `Host`와 `Authorization`만 가고 쿠키는 가지 않으며, 시청자 인증은 엣지의 서명 쿠키가 맡습니다([`policies.tf` 128–149행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/policies.tf#L128-L149)).

| 경로 | 캐시 키 · 보관 | 원본에 가는 것 |
|---|---|---|
| `/live/*.m3u8` 라이브 목록 | `_HLS_msn` · `_HLS_part` · `_HLS_skip`만 키, 엣지 1초 | `Host`, CDN 비밀을 담은 `Authorization` |
| `/live/*` 조각 · 파트 · init | 쿠키 · 쿼리 없음, 원본 Cache-Control을 따르되 최대 3,600초 | 같음 |
| 되감기 목록 | 원본이 `public, max-age=1` | S3, 원본 보호 계층(Origin Shield) 서울 |
| 되감기 ③ 조각 · init | 원본이 1년 `immutable` | 같음 |
| VOD 문서 | 원본이 3,600초 | 같음 |

근거는 [`policies.tf` 33–57행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/policies.tf#L33-L57)(라이브 목록), [61–81행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/policies.tf#L61-L81)(라이브 조각), [`s3store.go` 29–30행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/rewind/publish/s3store.go#L29-L30)(되감기 목록 · VOD 문서), [`upload/s3.go` 30행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/s3.go#L30)(③ 조각 · init), [`main.tf` 154–156행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/main.tf#L154-L156)(되감기 원본의 Origin Shield)입니다. 실험이 「Origin Shield 없음」, 「목록 TTL 0」, 「조각 TTL 120초」였던 것과 다릅니다.

캐시 키와 원본 전달을 나눈다는 실험의 결론은 그대로 두고, 원본에 넘기는 값을 시청자 세션에서 CDN 공용 비밀로 바꾼 것입니다. 시청자마다 다른 값을 원본에 넘기지 않고, 원본은 그 비밀로 CDN을 거친 요청인지 확인합니다. 이 구성에서 원본 요청이 얼마나 줄었는지는 재지 않았습니다. 미디어 서버를 NLB 뒤 프라이빗 EC2에 둔 배치는 [미디어 서버 배치 글](/posts/0-to-1/pokeclip-stateful-media-deployment/)에 있습니다.

포트폴리오 요약(2026-10-15판) 20쪽의 「목록 TTL 0, 조각 TTL 120초, 세션 쿠키·쿼리 원본 전달」은 10월 5일 실험 조건이고 지금 운영 구성이 아닙니다. 21·22쪽의 「내 판단·변경」, 「내가 확인 대상으로 삼은 실패」는 비교군과 채택 정책을 정한 제 몫을 적은 것이고, 정책 구성과 계측·분석은 AI(Codex)가 했습니다.

CDN 앞에서 인증이 필요한 원본을 다룬다면, 캐시 키에서 뺄 값과 원본에 넘길 값을 따로 적어 두십시오. 그리고 Hit가 원본 검사를 건너뛴다는 전제에서, 캐시된 객체에 서명 없는 요청을 직접 보내 막히는지 확인하십시오.

## 측정 조건

- 10월 5일 라이브 CDN 실험: 서울 리전 임시 EC2의 MediaMTX 1.20.1 컨테이너(CPU 1개 · 384MiB), 720p30 H.264 약 1.5Mbps + AAC 128kbps 합성 방송, 서울 엣지 한 곳, Origin Shield와 S3 되감기 없음. 같은 Mac의 k6로 세 구성 × 1·10·25·50 VU, 조건마다 25초 · 1회. 시청자→CDN HTTPS, CDN→원본 HTTP.
- 10월 6일 S3 원본 실험: 비공개 S3 + OAC(서명 항상), 양쪽 HTTPS, 새 curl · HTTP/1.1, 같은 IP · 같은 엣지, 처음 Miss와 세 번째 Hit 20쌍, 모두 110요청.
- 두 실험 모두 AI(Codex)가 임시 AWS 자원에서 수행했고 자원은 실험 뒤 모두 지웠습니다. 원자료는 비공개입니다.
- 운영 구성 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다.

## 출처

- [AWS 문서 「Control the cache key with a policy」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html) · [「Control origin requests with a policy」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html) — 캐시 키 정책과 원본 요청 정책
- [AWS 문서 「Use signed cookies」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html) — CloudFront 서명 쿠키
- [PokeClip-mono `infra/terraform/modules/cdn_media/policies.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/policies.tf#L33-L149) — 라이브 목록 · 조각 캐시 정책과 원본 요청 정책
- [PokeClip-mono `infra/terraform/modules/cdn_media/functions/live-auth.js`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/functions/live-auth.js#L1-L21) — 원본 요청의 `Authorization` 덮어쓰기
- [PokeClip-mono `infra/terraform/modules/cdn_media/main.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/main.tf#L154-L156) — 되감기 원본의 Origin Shield
- [PokeClip-mono `infra/media-host/mediamtx.yml.tmpl`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/mediamtx.yml.tmpl#L143) — MediaMTX CDN 모드
- [PokeClip-mono `media/internal/rewind/publish/s3store.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/rewind/publish/s3store.go#L29-L30) · [`media/internal/upload/s3.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/upload/s3.go#L30) — 되감기 목록 · VOD · ③ 조각의 Cache-Control
- [방송 중인 미디어 서버는 API처럼 갈아 끼울 수 없었습니다](/posts/0-to-1/pokeclip-stateful-media-deployment/)
- 팀 내부 실험 기록(비공개) — 10월 5일 라이브 CDN 실험, 10월 6일 S3 원본 실험

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 20–23쪽](/portfolio/2026-10-15-v2/full.pdf#page=20)
