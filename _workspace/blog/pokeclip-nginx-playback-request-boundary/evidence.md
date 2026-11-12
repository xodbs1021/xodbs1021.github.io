# evidence — pokeclip-nginx-playback-request-boundary (다시 쓰기, 2026-11-11)

유형: 설계·아키텍처. 코드 근거 develop `825a3dfe`.

링크 기준 `B = https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/`. 원문의 `7e6c032b` 링크는 모두 이 커밋으로 바꾼다.

## 역할

- 작성자: nginx 유지 결정(10/17). 운영 반영 때 되감기를 켜며 제어면 상류를 채우는 결정(11/3).
- AI(Claude Code): nginx의 필수 책임을 playback 대조로 정리, 원문 경로·쿼리·내부 포트 검증 범위, 대조 규칙·원문 검사·계약 시험 구현.
- 리뷰: Claude Code · Codex 듀얼 리뷰 + 보안 리뷰(PR #311 본문 「검수」 120–122행).
- 원문 검사(`$request_uri`)는 첫 구현이 아니다. 첫 판은 정규화된 `$uri`로 대조해 로컬에서 `/A/..%2fB/list?path=B`가 200으로 통과했고, 커밋 리뷰(Claude Code HIGH · 보안 리뷰 CRITICAL)가 같은 결함을 잡아 원문 대조를 AND로 더했다. 값 없는 `path` 키 중복도 같은 리뷰가 잡았다(팀 내부 작업 기록, 비공개, 10/19).

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| location은 `%XX` 디코딩·점 경로·연속 슬래시 정리 뒤 URI로 고른다 | [nginx core 「location」](https://nginx.org/en/docs/http/ngx_http_core_module.html#location) | 공식 문서 |
| 앞단 인가(CloudFront 서명 쿠키 정책)·LL-HLS 상류는 원문을 본다 → 원문이 풀고 접어도 그대로일 때만 전달. playback 원문 불일치 403, live·제어면 400 | B`infra/media-host/nginx/nginx.conf.tmpl#L28-L34` | 공개 |
| playback 원문 검사 `$request_uri` → `/{id}/list·get` 꼴만 1 | 같은 파일 L80–L88 | 공개 |
| 쿼리 대조: path 정확히 하나·경로 ID와 같음, 값 없는 `path` 키도 셈, 키 이름 `%` 거절(`pa%74h`) | 같은 파일 L90–L98 | 공개 |
| live·제어면 원문 거절(`%2e·%2f·%5c·%25`·`//`·점 구간 → 400), 그 밖 `%XX`·쿼리 허용, Go net/http 상류 전제 | 같은 파일 L100–L111 | 공개 |
| live 400 | 같은 파일 L118–L120 | 공개 |
| playback 403 두 번 → `127.0.0.1:9996/$playback_op$is_args$args`, 쿼리 원문 유지(`%3A`·`%2B`) | 같은 파일 L127–L141 (주석 L128) | 공개 |
| 제어면 400 · 허용 접두사 `/api/ingest/`·`/api/streams/`만, 상류 빈 값이면 404 | 같은 파일 L148–L178 (400 L154–L156, 빈 값 404 L158–L165) | 공개 |
| 관리 API(9997)로 가는 설정을 두지 않음 — kick·설정 변경·녹화 삭제 표면 | 같은 파일 L22–L25 | 공개 |
| 접근 로그에 Authorization·쿼리 없음, 경로는 원문. 오류 로그엔 요청 줄(쿼리)·Host·Referer가 실림 | 같은 파일 L35–L39, 형식 L63–L72 | 공개 |
| nginx는 MediaMTX와 같은 망 칸(`network_mode: service:mediamtx`) | B`infra/media-host/compose.yml.tmpl#L164-L166` | 공개 |
| MediaMTX: SRT `:8890`, 관리 API `127.0.0.1:9997`(nginx가 넘기지 않음), LL-HLS `127.0.0.1:8888`, 재생 서버 `127.0.0.1:9996` | B`infra/media-host/mediamtx.yml.tmpl#L32-L50`, `#L125-L126`, `#L145-L149` | 공개 |
| SRT는 인터넷 대면 NLB(UDP 8890) → 상자 8890/udp, nginx 미경유 | B`infra/terraform/modules/media_ingest/main.tf#L24-L60`, B`infra/media-host/compose.yml.tmpl#L145-L150` | 공개 |
| CloudFront `/playback/*`: 서명 쿠키(키 그룹) 필수, 함수 없음, 쿼리 전부·쿠키 없이 원본 전달 | B`infra/terraform/modules/cdn_media/main.tf#L87-L96`, B`infra/terraform/modules/cdn_media/policies.tf#L173-L193` | 공개 |
| 내부 ALB `/playback/*` → playback 대상 그룹, 접두사 `/playback` 제거 | B`infra/terraform/prod/platform/load_balancers.tf#L122-L127`(핵심 L125–L126) | 공개 |
| 웹 라우트 1–7행: 쿠키 정책은 쿼리를 못 막아 믿으면 내 키 쿠키로 남의 녹화가 열린다 → path를 경로 키로 다시 채움(nginx와 겹치는 이중 방어). **로컬 전용**, prod·dev는 404 | B`web/src/app/media/playback/%5Bkey%5D/%5Bop%5D/route.ts#L1-L7`, 구현 L27–L37 | 공개 |
| 제어면 상류 기본값 빈 값 → 404 | B`infra/terraform/prod/media/variables.tf#L64-L68`, B`infra/terraform/modules/media_host/variables.tf#L194-L203`, 예시 B`infra/terraform/prod/media/terraform.tfvars.example#L37-L40` | 공개 |
| 사이드카 제어면 `127.0.0.1:8086` | B`infra/media-host/compose.yml.tmpl#L233` | 공개 |
| 운영은 11/3 되감기를 켜며 `control_upstream = 127.0.0.1:8086`으로 채움 | 팀 내부 운영 기록(비공개) 11/3 | 비공개 |
| 계약 시험: 응답 코드 + 에코 상류 호출 수 전후 비교(0이 아니면 실패) | B`infra/media-host/test/proxy_contract.sh#L374-L411` | 공개 |
| 시험이 운영과 같은 `templatefile()` 렌더, nginx 이미지 다이제스트 고정 | B`infra/media-host/test/proxy_contract.sh#L6-L13`, B`infra/media-host/test/lib/render.sh#L1-L17`, B`infra/media-host/images.json#L3-L6` | 공개 |
| 10/22 PR 전 실측 일괄에서 `proxy_contract` 5/5 | 팀 내부 실측 기록(비공개) 10/22. 공개 PR 본문은 「로컬 통과(사례 1–17 · 1b)·CI 미실행」만(PR #311 본문 132–134행) | 비공개 |
| PR #311 병합 2026-10-22T15:38:37Z = 10/23 00:38 KST | `gh pr view 311` | 공개 |
| 11/3 운영 상자 기동, 대상 그룹 넷(ingest·live·control·playback) healthy | 팀 내부 운영 시험 기록(비공개) 11/3 | 비공개 |
| 11/3 쿠키 없는 경로 우회 15사례 전부 거절 · 보호 상류 도달 0 | 비공개 기록 11/3. 시험 정의 B`infra/terraform/runbooks/edge-tests.md?plain=1#L358-L380`(요청 3 × 변형 5 = 15) | 비공개 실측 + 공개 정의 |
| 11/4 A 쿠키로 `/live/A/..%5cB/index.m3u8` → CloudFront 통과, nginx 400(노출 0) | B`infra/terraform/runbooks/edge-tests.md?plain=1#L387-L399` | 공개 |
| 11/9 `live_auth` 반영 뒤 쿠키 없는 `..%5c` 3건 CloudFront 403 | 비공개 기록 11/9–10. 함수 B`infra/terraform/modules/cdn_media/functions/live-auth.js#L81-L102`, [PR #487](https://github.com/3K-PokeClip/PokeClip-mono/pull/487) | 비공개 실측 + 공개 코드 |
| 방송 쿠키 교차 시험(런북)의 반영 뒤 재시험 기록 없음 | 비공개 기록에 결과 없음 | 미검증 |
| CDN 캐시 실험은 별도 글 | `/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/` | 블로그 |

## 영상용 요청 다섯 개

| 요청 | 결과 | 무엇이 멈추나 | 시험 근거 |
|---|---|---|---|
| `/A/list?path=A` | 200, 상류 `127.0.0.1:9996` `/list`, 쿼리 `path=A` | — | proxy_contract.sh L425–L434 (사례 3) |
| `/A/list?path=B` | 403, 상류 0 | 쿼리 대조 | L436–L445 (사례 4) |
| `/A/list?path=A&path=B` | 403, 상류 0 | 쿼리 대조(중복) | L447–L457 (사례 5, L454) |
| `/A/list?pa%74h=B&path=A` | 403, 상류 0 | 쿼리 대조(키 `%`) | L455 |
| `/A/..%2fB/list?path=B` | 403, 상류 0 | 원문 검사만(풀면 `/B/list?path=B`라 쿼리 대조는 통과) | normalization_cases.sh L30–L57 (L33) |

계약 시험의 정규화 사례는 쿼리 `?path=B`를 붙인다. 쿼리 없는 `/A/..%2fB/list`도 원문 검사로 403이지만 시험 사례로는 없다.

## 정정 · 범위

- 「방송 A 쿠키로 B **녹화**를 요청하는 운영 교차 쿠키 시험」은 없다. 런북의 교차 쿠키 시험은 **라이브 목록**(`/live/A/../B/index.m3u8`)이다. playback 교차 대조는 계약 시험(로컬)으로만 확인했다.
- 「10월 27일 기록에서 운영 Media 배포가 후속 단계」는 낡았다 — 11/3 운영 기동.
- CloudFront `live_auth` 경로 거절은 `/live/*`에만 붙는다(main.tf L40·L50). `/playback/*`에는 함수가 없으므로 playback 원문 검사는 nginx만 한다.
