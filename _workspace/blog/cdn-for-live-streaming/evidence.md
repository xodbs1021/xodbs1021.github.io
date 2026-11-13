# cdn-for-live-streaming 근거 메모

유형: 기술 해설(+ 일부 실측). 수행: AI(Claude Code)가 2026-11-13 문서 확인 · 집필, 실측은 같은 날 상위 세션이 수행(measure/).

| 주장 | 근거 URL | 확인 날짜 | 근거 종류 |
|---|---|---|---|
| CloudFront: DNS가 지연 기준 가장 가까운 POP로 보냄, POP에 없으면 지역 엣지 캐시로, 지역 엣지 캐시는 POP와 원본 사이 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html | 2026-11-13 | 문헌값 |
| Origin Shield는 지역 엣지 캐시와 원본 사이 추가 층, 원본의 속성으로 원본마다 리전 하나를 고름, 같은 리전 지역 캐시는 실드를 건너뜀, 추가 과금, TTL 3,600초 미만 GET·HEAD는 동적 요청으로 봄 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html | 2026-11-13 | 문헌값 |
| 기본 캐시 키 = 배포 도메인 + URL 경로, 쿼리·헤더·쿠키 제외 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-the-cache-key.html | 2026-11-13 | 문헌값 |
| 캐시 키에 넣은 쿼리·헤더·쿠키는 원본 요청에도 자동 포함, 원본 요청 정책은 키에 넣지 않고 원본에만 넘김 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html | 2026-11-13 | 문헌값 |
| 서명 URL 쿼리 Expires · Key-Pair-Id · Policy · Signature는 원본 전달 전 제거(Hash-Algorithm은 선택 쿼리) | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/QueryStringParameters.html , https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-creating-signed-url-canned-policy.html | 2026-11-13 | 문헌값 |
| 요청 병합: 캐시에 없거나 만료된 객체, 같은 캐시 키, 첫 요청 Miss · 나머지 Hit, CachingDisabled면 병합 없음, 최소 TTL 0 + private/no-store/no-cache/max-age=0/s-maxage=0이면 병합 없음 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#request-custom-traffic-spikes | 2026-11-13 | 문헌값 |
| 404 등은 오류 캐싱 최소 TTL(기본 10초)과 원본 max-age 중 큰 값만큼 캐시 | https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HTTPStatusCodes.html | 2026-11-13 | 문헌값 |
| CloudFront SWR: 2023-05-17 지원 공지, stale은 SWR 값과 최대 TTL 중 작은 값까지 | https://aws.amazon.com/about-aws/whats-new/2023/05/amazon-cloudfront-stale-while-revalidate-stale-if-error-cache-control-directives/ , https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html | 2026-11-13 | 문헌값 |
| RFC 5861: Informational(Independent Submission, 2010-05), 「caches MAY serve … up to the indicated number of seconds」, 재검증 SHOULD | https://www.rfc-editor.org/rfc/rfc5861 | 2026-11-13 | 문헌값 |
| 가격(종량제, 2026-11-13 확인): 한국 포함 아시아 묶음 데이터 전송 첫 1TB 무료 · 다음 9TB $0.120/GB · 다음 40TB $0.100 · 다음 100TB $0.095 · 다음 350TB $0.090 · 다음 524TB $0.080 · 다음 4PB $0.070 · 5PB 초과 $0.060; HTTPS 요청 $0.0120/만 건; Origin Shield 한국 $0.0090/만 건; 무효화 월 1,000경로 무료 이후 경로당 $0.005, 와일드카드는 1경로 | https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/ , https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html | 2026-11-13 | 문헌값 |
| 정액 요금제 2025-11-18 공지(웹사이트 전송 · 보안 묶음, 배포당 Free $0 · Pro $15 · Business $200 · Premium $1,000, 초과 요금 없음) | https://aws.amazon.com/about-aws/whats-new/2025/11/aws-flat-rate-pricing-plans/ , https://aws.amazon.com/cloudfront/pricing/ | 2026-11-13 | 문헌값 |
| 무효화 반영 시간은 개발자 가이드에서 수치를 찾지 못함 → 본문에서 시간 주장 안 함 | (Invalidation.html 등) | 2026-11-13 | 미검증 |
| Cloudflare 348개 도시, 한국은 Seoul, KR 하나 | https://www.cloudflare.com/network/ | 2026-11-13 | 문헌값 |
| Cloudflare: 프록시 레코드에는 애니캐스트 IP로 응답 | https://developers.cloudflare.com/fundamentals/concepts/how-cloudflare-works/ | 2026-11-13 | 문헌값 |
| 애니캐스트 운영 BCP | https://www.rfc-editor.org/rfc/rfc4786 | 2026-11-13 | 문헌값 |
| Fastly 2021-06-08 장애: 09:47 UTC 시작, 네트워크 85% 오류, 49분 안에 95% 정상 | https://www.fastly.com/blog/summary-of-june-8-outage | 2026-11-13 | 문헌값 |
| HLS Content Steering: EXT-X-CONTENT-STEERING(SERVER-URI, PATHWAY-ID) 4.4.6.6, 7절(경로 묶음, 스티어링 목록 주기적 조회, _HLS_pathway · _HLS_throughput, 캐시 키에서 _HLS_throughput 제외 SHOULD, 클라이언트 지원 OPTIONAL) | https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt | 2026-11-13 | 문헌값 |
| hls.js 1.7.4에 content-steering-controller(_HLS_pathway · _HLS_throughput 붙임) | hls.js 1.7.4 npm 패키지 src/controller/content-steering-controller.ts 438–439행 | 2026-11-13 | 문헌값(소스) |
| Netflix Open Connect: ISP에 OCA를 무상 제공(자격 있는 파트너), 1,000개 넘는 ISP | https://openconnect.netflix.com/en/ | 2026-11-13 | 문헌값 |
| Netflix 라이브도 Open Connect로 전송, 6K+ 위치, AWS와 전용 백본 | https://netflixtechblog.com/behind-the-streams-live-at-netflix-part-1-d23f917c2f40 (봇 차단 403) → 보관본 https://web.archive.org/web/20261003125057/https://netflixtechblog.com/behind-the-streams-live-at-netflix-part-1-d23f917c2f40 (2025-07-15 게시) | 2026-11-13 | 문헌값 |
| 제품 이름 Fastly Compute | https://www.fastly.com/products/edge-compute | 2026-11-13 | 문헌값 |
| nginx proxy_cache_lock은 새 캐시 항목에만, use_stale updating, background_update(1.11.10), Cache-Control SWR은 지시어보다 우선순위 낮음 | https://nginx.org/en/docs/http/ngx_http_proxy_module.html | 2026-11-13 | 문헌값 |
| nginx 잠금 대기는 최대 500ms 타이머로 다시 확인 | https://github.com/nginx/nginx/blob/release-1.31.3/src/http/ngx_http_file_cache.c#L455 | 2026-11-13 | 문헌값(소스) |
| PokeClip: 라이브 목록 엣지 1초, 조각 최대 3,600초, 실드는 되감기 S3에만, 401 실험, 1,254 → 28건, live-auth.js | /posts/0-to-1/pokeclip-cdn-cache-auth-measurement/ | 2026-11-13 | 정본 글 |
| 실측 200 → 4 → 1, 합치기 끔 1–200, 대기 0.50–0.52초, 404 10.6 · 11.2초, 목록 원본 요청 173–239 대 40–44, 나이 p95, 20초 뒤 STALE 20.0초 | measure/c1-set1.txt, c1-set2.txt, c1-shield-lock-times.txt, c2.txt, c3.txt, c3-first-attempt.txt | 2026-11-13 | 실측(AI) |
| 원본 요청 수 = 맨 위 층 노드 수(병합이 노드마다 일어날 때) | 실측 + Origin Shield 문서에서 추론 | 2026-11-13 | 추론 |
| SWR 목록이 LL-HLS 보류 요청과 충돌할 수 있음 | 추론(RFC 5861 + rfc8216bis 보류 요청 규정) | 2026-11-13 | 가정·추론 |

삭제한 옛 주장: 실드 5~10개 · 100분의 5, Cloudflare 300개 도시 · 부산, 실제 CloudFront 대역 예시 IP(13.225 · 54.230), Anycast/GeoDNS 정밀도 표, 「원본 50만 RPS」, 가상 단가 $0.12 예시, 치지직 CDN 구성 추정, 플레이어 ping() 코드, 자체 CDN 손익분기 수치, 「라이브는 Open Connect 적용 어려움」, P2P 절, AWS MediaLive Edge, Compute@Edge, 한국 시장 절.
