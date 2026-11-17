# 실측 요약 — 한 CDN 배포에서 라이브는 EC2로, 되감기는 S3로 보냈습니다

글: `content/posts/0-to-1/pokeclip-live-dvr-url-split.md`

## 공개 재측정 — 경로 규칙 표

- 실행: AI(Claude Code), 2026-11-18 02:43 KST. MacBook Air(Apple M5), macOS 27.0.1, Node.js 26.4.0.
- 대상: 3K-PokeClip/PokeClip-mono develop `627fb5a20ecb9d221fcc030c26adcbbcbe12c04e` 의 `infra/terraform/modules/cdn_media/main.tf`(sha256 `6c0370e3…`, `raw/env.txt`).
- 방법: `behaviors.mjs` 가 `locals.ordered_behaviors` 목록과 `default_cache_behavior` 블록을 글자 그대로 읽는다. AWS · terraform 을 부르지 않으므로 **배포된 설정이 아니라 저장소 원문**이다.
- 명령: `MONO_DIR=<클론> ./run.sh all "$PWD/raw"` → `./run.sh down`.

결과(`raw/behaviors.tsv`):

| 순서 | 경로 패턴 | 원본 | 서명 쿠키 | 함수 | 캐시 정책 |
|---|---|---|---|---|---|
| 1 | /api/ingest/* | Media 상자(내부 ALB · VPC 원본) | 아니오 | 없음 | no_cache |
| 2 | /live/*.m3u8 | Media 상자 | 예 | live-auth | live_playlist(1초) |
| 3 | /live/* | Media 상자 | 예 | live-auth | live_segment(원본 Cache-Control) |
| 4 | /dvr/* | S3(OAC) | 예 | dvr-floor(스위치) | dvr_vod |
| 5 | /vod/* | S3(OAC) | 예 | 없음 | dvr_vod |
| 6 | /api/streams/*/rewind | Media 상자 | 아니오 | 없음 | rewind_api(1초) |
| 7 | /playback/* | Media 상자 | 예 | 없음 | no_cache |
| 기본 | * | Media 상자 — 함수가 먼저 404 | 예 | deny-default | no_cache |

원본 블록 2개 · 오리진 그룹 0개 · 배포 리소스 1개.

## 비공개 기록에서 옮긴 것

없음(결정 날짜와 결정 문장만 설계 기록에서 옮겼다 — `evidence.md` 역할 표).
