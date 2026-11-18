# 실측 요약 — 되감기 목록만 gzip으로 압축하고 라이브 목록은 미뤘습니다

모두 로컬 공개 재측정이다(운영 응답 실측 아님). 원자료는 `measure/raw/`, 명령은 `measure/run.sh`.

## 환경

- 2026-11-18 18:24–18:27 KST, AI(Claude Code)가 실행.
- MacBook Air(Apple M5), macOS 27.0.1, Go 1.27.2 darwin/arm64, brotli 1.2.0, Apple gzip 487.0.1(`raw/env.txt`).
- OrbStack Docker Engine 29.8.2, `nginx@sha256:e7257f1e…`(nginx:alpine, nginx 1.29.7) 컨테이너 하나, 라벨 `com.techblog.bench=gzip`(`raw/env-nginx.txt`).
- 3K-PokeClip/PokeClip-mono develop 머지 커밋 `31f2f32d77650c3f20ac5318cc3a95d875fc8cbf`(PR 537)의 `media/`를 `git archive`로 /tmp/gzipw-run-* 에 풀었다. `media/internal/rewind` · `playback` 은 2편의 `627fb5a2`와 바이트가 같다(`git diff --stat` 0).

## 1시간 목록 크기와 4초마다 받을 때의 전송률(`raw/size.md` · `raw/bodies.txt`)

`rewind.Render` · 4초 × 900조각 · 도메인 `https://media.example.com` · 회차 꼴 키 · 판 2 · `Validate` 통과. 압축은 CLI(`gzip -c -n -6/-9`, `brotli -c -q 5/11`). 전송률 = 크기 ÷ 4초(가정: RFC 8216bis 6.3.4 — 바뀐 목록은 마지막 조각 길이만큼 기다려 다시 받는다). KB = 1,000B, kbps = 1,000bit/s.

| 경우 | 원본 B | gzip -6 B | gzip -9 B | brotli -q 5 B | brotli -q 11 B | 원본 kbps | gzip -6 kbps | brotli -q 11 kbps |
|---|---|---|---|---|---|---|---|---|
| 스트림 8자 · GAP 1 (`s08_gap1`) | 137,945 | 5,497 | 5,332 | 2,764 | 2,742 | 275.9 | 11.0 | 5.5 |
| 스트림 8자 · 길이 ±30ms (`s08_jitter30`) | 137,934 | 9,768 | 9,252 | 7,571 | 5,955 | 275.9 | 19.5 | 11.9 |
| 스트림 16자 (`s16`) | 152,350 | 5,593 | 5,393 | 2,763 | 2,622 | 304.7 | 11.2 | 5.2 |
| 스트림 32자 (`s32`) | 181,182 | 5,710 | 5,511 | 2,877 | 2,898 | 362.4 | 11.4 | 5.8 |

- 원본 바이트는 2편 재측정(Go `Render`, 같은 픽스처)과 같다. gzip -6 은 2편의 Go `compress/gzip` 5,445B · 9,528B 와 CLI gzip 5,497B · 9,768B 로 1–3% 다르다(구현 차이). CloudFront 가 쓰는 압축 수준은 AWS 문서에 없다.
- 목록이 1,000B 를 처음 넘는 것은 6조각(1,152B — 5조각은 999B), 2,048B 를 처음 넘는 것은 12조각(2,070B)이다(스트림 8자 · 4초). 방송 첫 20초의 되감기 목록은 CloudFront 하한 1,000B 아래라 압축되지 않는다.
- s32 의 brotli -q 11(2,898B)이 -q 5(2,877B)보다 21B 크다 — 그대로 적는다.

## nginx 압축 조건 대조(`raw/nginx.md` · `raw/nginx-headers.txt`)

nginx:alpine 1.29.7 한 컨테이너 안에 Go 상류(`measure/nginx/upstream.go` — gohlslib `handleMediaPlaylist` 처럼 Content-Length 없이 `WriteHeader(200)` 뒤 `Write(본문)` 한 번)를 같이 띄우고, `curl --http1.1 -H 'Accept-Encoding: gzip'`로 머리를 받았다. 본문은 위 `s08_gap1`(137,945B) 또는 그 앞 n 바이트.

| 경우 | Via | Content-Length | Transfer-Encoding | Content-Encoding | 받은 B |
|---|---|---|---|---|---|
| (a) nginx 정적 파일 | | 137945 | | | 137,945 |
| 상류 직접 · 2,048B | | 2048 | | | 2,048 |
| 상류 직접 · 2,049B | | | chunked | | 2,049 |
| 상류 직접 · 1시간 목록 | | | chunked | | 137,945 |
| (b) 프록시 · proxy_buffering off · 2,048B | | 2048 | | | 2,048 |
| (b) 프록시 · proxy_buffering off · 2,049B | | | chunked | | 2,049 |
| (b) 프록시 · proxy_buffering off · 1시간 목록 | | | chunked | | 137,945 |
| (b) 대조 · proxy_buffering on · 2,049B | | | chunked | | 2,049 |
| (b) 대조 · proxy_buffering on · 1시간 목록 | | | chunked | | 137,945 |
| (c) gzip on · gzip_proxied 기본(off) · Via 없음 | | | chunked | gzip | 7,154 |
| (c) gzip on · gzip_proxied 기본(off) · Via 있음 | 있음 | | chunked | | 137,945 |
| (c) gzip on · gzip_proxied any · Via 있음 | 있음 | | chunked | gzip | 7,154 |

- (a) 정적 파일 응답에는 Content-Length 가 있다(S3 객체도 GetObject 응답에 Content-Length — AWS API 문서).
- (b) Go net/http 상류는 2,048B 까지 Content-Length, 2,049B 부터 chunked. nginx 는 그 응답을 그대로 넘기고 **proxy_buffering 을 켜도 Content-Length 를 만들지 않았다** — 길이가 없는 원인은 상류의 chunked 이고, proxy_buffering off 자체가 길이를 없애는 것은 아니다(evidence.md 「원천끼리 어긋난 것」).
- (c) gzip_proxied 기본(off)은 Via 머리가 있는 요청을 압축하지 않았고, any 는 압축했다. nginx gzip 기본 수준(gzip_comp_level 1)이라 7,154B 다.
- MediaMTX 를 띄우지는 않았다. 상류의 2,048B 경계는 Go net/http 의 동작이고, MediaMTX v1.21.1 이 gohlslib v2.4.5 로 같은 꼴로 쓴다는 것은 소스로 확인했다(evidence.md).
- Go 상류는 Go 1.27.2 로 빌드했다. MediaMTX v1.21.1 은 go 1.26.0 이고, 두 판 모두 `bufferBeforeChunkingSize = 2048` 이다.

## 운영 실측(비공개 기록 요약 — 이 재측정이 아님)

2026-11-18 18:21–18:28 · 18:31–18:39 KST 시험 방송 두 번. 첫 방송에서는 브라우저가 응답 머리와 크기를 가려 판정 자료를 얻지 못했고, 둘째 방송에서 AI 가 재생 중인 브라우저 페이지 안의 `fetch`(브라우저가 `Accept-Encoding: gzip` 을 붙임)로 받은 결과와 두 방송에 걸친 CloudFront 표준 로그 20줄을 견줬다. 식별자 · 주소 · 쿠키는 옮기지 않았다.

| 대상 | 풀린 본문 | 응답 Content-Length | 로그 sc-bytes(머리 포함) | 판정 |
|---|---|---|---|---|
| /dvr 되감기 목록 | 8,727B | 없음(로그 sc-content-len 「-」, 20줄 모두) | 1,306B Miss · 1,305B Hit(8,727B 판 — Last-Modified 09:34:41 UTC — 을 받은 18:34:44 의 두 요청) · 같은 분 다른 판 1,258–1,328B · 첫 방송 1,136–1,234B(18:22–18:23, 본문 크기 모름) | 압축됨(크기로 판정) |
| /dvr 조각 .m4s | 3,083,523B | 3,083,523 | – | 압축 안 됨 |
| /live index.m3u8(다중 변형 목록, max-age=30) | 802B | 802 | – | 압축 안 됨(1,000B 미만) |

- Miss → Hit: 18:34:37 · 18:34:44 에 첫 요청 Miss, 같은 초 다시 보낸 요청 Hit. 나머지는 Miss(max-age=1).
- Content-Encoding · Vary 머리는 CORS 로 노출되지 않아 글자로 확인하지 못했다.

## 하지 않은 것

- 운영 라이브 미디어 목록(2,048B 초과)의 실제 크기 · 헤더, CloudFront 가 원본 요청에 붙이는 Via 의 실물.
- VOD 목록(운영 · 로컬 모두) — 시험 방송의 다시보기가 생긴 뒤에 볼 수 있다.
