---
title: "nginx는 경로의 방송과 쿼리의 방송이 같을 때만 넘깁니다"
date: 2026-10-28T19:22:04+09:00
lastmod: 2026-11-11T19:02:22+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "nginx", "MediaMTX", "Authorization"]
description: "MediaMTX 재생 서버는 URL 경로가 아니라 쿼리의 path로 녹화를 고릅니다. 앞단 서명 쿠키가 본 방송과 실제로 읽는 방송을 맞추려고, nginx가 path가 하나이고 경로의 방송과 같을 때만 넘기게 했습니다. location이 보는 정규화 경로 대신 원문을 먼저 검사하고, 계약 시험에서 거절한 요청이 상류에 0건 닿는지 셌습니다. 11월 3일 운영 엣지 시험에서 경로 우회 15사례는 모두 상류에 닿지 않았습니다."
draft: false
---

PokeClip의 녹화 재생 요청은 `/playback/A/list?path=A`처럼 생겼습니다. 앞단 CloudFront의 서명 쿠키는 경로의 방송 A를 보고 통과시키지만, 뒤의 MediaMTX 재생 서버는 경로가 아니라 쿼리의 `path`로 읽을 녹화를 고릅니다. 그래서 `/A/list?path=B`를 그대로 넘기면 A를 볼 수 있는 사용자가 B의 녹화 목록을 읽습니다. nginx가 쿼리의 `path`가 정확히 하나이고 경로의 방송과 같을 때만 재생 서버로 넘기게 했고, 거절한 요청이 상류에 한 건도 닿지 않았는지 계약 시험으로 셌습니다. 11월 3일 운영 엣지 시험에서 제어면 경로를 노린 경로 우회 15사례는 모두 거절됐고, 보호 대상 상류에 닿은 요청은 0건이었습니다.

미디어 상자 앞에 nginx를 남기기로 한 것은 제 결정입니다. nginx의 필수 책임을 이 대조로 정리하고, 원문 경로·쿼리·내부 포트까지 검증 범위를 잡고, 대조 규칙과 원문 검사와 계약 시험을 만든 것은 AI입니다. 구현은 Claude Code, 리뷰는 Claude Code와 Codex가 했고, 변경은 10월 23일 [PR #311](https://github.com/3K-PokeClip/PokeClip-mono/pull/311)로 머지됐습니다.

## 재생 서버는 경로가 아니라 쿼리의 path로 녹화를 고릅니다 {#경로에서-허용한-대상과-쿼리가-고른-대상}

MediaMTX 재생 서버(playback)는 녹화 목록과 구간을 내주는 HTTP 서버입니다. `/list?path=A`와 `/get?path=A&start=…`처럼 쿼리로 대상을 받습니다. 시청자는 그 앞의 세 계층을 지나옵니다. [[fig-playback-path]]에서 청록 칸이 대조를 맡은 nginx입니다.

```mermaid {#fig-playback-path kind="재구성" caption="녹화 재생 요청이 지나는 길. CloudFront는 /playback/* 에서 서명 쿠키를 요구하고 쿼리를 그대로 넘깁니다. 내부 ALB가 /playback 접두사를 떼고, nginx(청록)가 원문 경로와 쿼리의 path를 검사한 뒤 MediaMTX 재생 서버(127.0.0.1:9996)로 넘깁니다. 같은 망 칸의 관리 API(127.0.0.1:9997)로 가는 길은 nginx에 없습니다. SRT 송출은 NLB에서 MediaMTX로 바로 가며 nginx를 지나지 않습니다. PokeClip-mono develop 825a3dfe의 infra/terraform과 infra/media-host 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L127-L141"}
flowchart TB
  accTitle: 녹화 재생 요청의 경로
  accDescr: 브라우저 요청이 서명 쿠키를 요구하는 CloudFront를 지나 내부 ALB로 가고, ALB가 /playback 접두사를 뗀 뒤 nginx로 보낸다. nginx는 원문을 검사하고 쿼리를 대조한 뒤 MediaMTX 재생 서버 9996으로 넘긴다. MediaMTX 관리 API 9997로 가는 길은 없다. OBS의 SRT 송출은 NLB를 지나 MediaMTX SRT 수신으로 바로 간다.
  user[브라우저]
  cf[CloudFront<br/>/playback/* 서명 쿠키]
  alb[내부 ALB<br/>/playback 접두사 제거]
  ngx[nginx<br/>원문 검사 · 쿼리 대조]
  nlb[OBS 송출<br/>NLB · UDP]
  subgraph mtx[MediaMTX · 같은 망 칸]
    direction TB
    pb[재생 서버<br/>127.0.0.1:9996]
    api[관리 API 9997<br/>nginx에서 가는 길 없음]
    srt[SRT 수신]
  end
  user --> cf --> alb --> ngx --> pb
  pb ~~~ api ~~~ srt
  nlb --> srt
  style ngx fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

CloudFront는 `/playback/*`에 서명 쿠키를 요구하고 함수는 붙이지 않으며([`cdn_media/main.tf` 87–96행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/main.tf#L87-L96)), 쿼리는 그대로 원본에 넘깁니다([`cdn_media/policies.tf` 173–193행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/policies.tf#L173-L193)). 내부 ALB는 `/playback` 접두사만 떼고 상자로 보냅니다([`load_balancers.tf` 122–127행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/load_balancers.tf#L122-L127)). 쿠키 정책은 경로를 보고 쿼리는 보지 않으므로, 쿼리의 대상을 경로와 맞추는 일이 nginx에 남았습니다. nginx가 계정 권한을 새로 계산하지는 않습니다. 앞단이 허락한 경로의 방송과 재생 서버가 읽을 방송을 잇는 검사입니다. 로컬 개발용 웹 라우트도 같은 이유로 들어온 `path`를 버리고 경로의 키로 다시 채웁니다([`route.ts` 1–7행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/app/media/playback/%5Bkey%5D/%5Bop%5D/route.ts#L1-L7)). 이 라우트는 로컬에서만 켜지고 운영에서는 404입니다.

## path가 하나이고 경로의 방송과 같을 때만 넘깁니다

규칙은 [`nginx.conf.tmpl` 90–98행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L90-L98)의 `map` 하나입니다.

| 요청 예시 | nginx의 판단 |
|---|---|
| `/A/list?path=A` | 경로와 쿼리의 방송이 같으므로 재생 서버로 넘김 |
| `/A/list?path=B` | 다른 방송을 지정하므로 403, 상류 호출 없음 |
| `/A/list` 또는 `?path=` | 대상이 없거나 비어 있으므로 403 |
| `?path=A&path=B` | 중복 파라미터는 해석이 갈릴 수 있으므로 403 |
| `?pa%74h=B&path=A` | MediaMTX가 키를 풀어 읽으면 둘째 `path`가 되므로 403 |

값 없이 이름만 있는 `path` 키도 중복으로 셉니다. 쿼리 키 이름의 `%`는 받지 않지만, 시각 값에 들어가는 `%3A`·`%2B`는 그대로 넘깁니다([127–141행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L127-L141)). 모든 인코딩을 막지 않고, 키를 읽는 일과 값을 전달하는 일을 나눴습니다. 경로의 방송 ID도 풀어 읽어도 바뀌지 않는 문자만 받습니다.

## location이 본 경로와 받은 원문이 달라 원문부터 검사합니다 {#location이-본-경로가-받은-원문과-같지는-않았습니다}

[nginx 문서](https://nginx.org/en/docs/http/ngx_http_core_module.html#location)대로 `location`은 정규화한 URI로 고릅니다. `%XX`를 풀고, 점 구간과 겹친 슬래시를 접은 뒤의 경로입니다. 반면 앞단 CloudFront의 쿠키 정책은 원문 경로를 봅니다.

첫 구현은 이 차이를 놓쳤습니다. 쿼리 대조를 정규화된 `$uri`로 했더니, 로컬에서 `/A/..%2fB/list?path=B`가 200으로 통과했습니다. 앞단은 원문의 `/A/…`를 보고 A의 쿠키로 허락하는데, nginx는 접힌 `/B/list`를 보고 `path=B`와 같다고 판단한 것입니다. 커밋 리뷰에서 Claude Code와 보안 리뷰가 같은 결함을 짚었고, 원문(`$request_uri`)이 `/{id}/list`·`/{id}/get` 꼴일 때만 통과하는 검사를 앞에 더했습니다([80–88행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L80-L88)). 원문이 이 꼴이면 원문과 `$uri`가 같으므로, 앞단이 본 방송과 쿼리 대조의 방송이 같아집니다.

라이브 LL-HLS와 제어면은 원문을 상류에 그대로 넘깁니다. 이쪽은 원문 경로에 인코딩한 점·슬래시·역슬래시·퍼센트, 빈 조각, 점 구간이 있으면 400으로 거절합니다([100–120행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L100-L120) · [148–178행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L148-L178)). 재생 요청의 거절은 403입니다. 판단은 정규화한 경로로 하고 전달은 다른 원문으로 하는 틈을 없애려는 규칙입니다. 다만 그 밖의 `%XX`와 `\`를 원문대로 넘기는 것은 상류가 Go `net/http`라는 전제에 기댑니다. 상류가 바뀌면 다시 판단해야 합니다.

## 관리 API로 가는 길은 nginx에 만들지 않았습니다 {#전달-경로와-관리-경로를-구분했습니다}

nginx는 MediaMTX와 같은 네트워크 네임스페이스를 씁니다([`compose.yml.tmpl` 164–166행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/compose.yml.tmpl#L164-L166)). 네트워크 네임스페이스는 컨테이너들이 같은 네트워크 공간(같은 루프백)을 쓰도록 묶는 단위입니다. MediaMTX의 HTTP 포트는 모두 루프백에만 열리고, 바깥에서는 nginx의 포트로만 들어옵니다([`mediamtx.yml.tmpl` 32–50행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/mediamtx.yml.tmpl#L32-L50) · [125–126행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/mediamtx.yml.tmpl#L125-L126) · [145–149행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/mediamtx.yml.tmpl#L145-L149)).

| 경로 | nginx가 맡은 일 |
|---|---|
| 라이브 HTTP | 원문 검사 뒤 LL-HLS 서버(8888)로 전달 |
| 재생 HTTP | 원문 검사와 쿼리 대조 뒤 재생 서버(9996)로 전달 |
| 제어면 | `/api/ingest/` · `/api/streams/` 접두사만 사이드카 제어면으로 전달 |
| MediaMTX 관리 API(9997) | 전달 설정이 없음 |
| SRT 송출 | NLB에서 MediaMTX로 바로 감, nginx를 지나지 않음 |

관리 API에는 송출 끊기(kick), 설정 변경, 녹화 삭제가 있습니다. 사이드카만 비밀번호를 갖고 있지만, nginx가 이 포트로 넘기면 그 비밀번호 하나에 기대는 표면이 내부 ALB 쪽으로 열립니다. 그래서 렌더된 설정에 관리 API 포트 번호가 한 번도 나오지 않게 했습니다([22–25행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L22-L25)). 제어면 상류 주소는 코드 기본값이 빈 값이고, 비어 있으면 허용 접두사도 404로 닫힙니다([`prod/media/variables.tf` 64–68행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/media/variables.tf#L64-L68)). 운영 상자는 11월 3일 되감기를 켜면서 이 값을 사이드카 제어면 주소로 채웠습니다.

## 403에 더해 상류에 닿은 요청이 0건인지 셌습니다 {#성공-응답뿐-아니라-상류에-가지-않았는지도-확인했습니다}

403을 돌려줬어도 요청이 이미 상류에 닿았다면 막은 것이 아닙니다. [프록시 계약 시험](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/test/proxy_contract.sh#L374-L411)은 MediaMTX 자리에 요청 수를 세는 에코 서버를 두고, 거절 요청 묶음을 보내기 전과 후의 호출 수가 같은지 봅니다. 한 건이라도 늘면 실패입니다. 시험은 운영과 같은 Terraform `templatefile()`로 설정을 렌더하고, 다이제스트로 고정한 공식 nginx 이미지를 씁니다([`proxy_contract.sh` 6–13행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/test/proxy_contract.sh#L6-L13)).

영상은 시험 사례 다섯 개를 차례로 보냅니다. 청록으로 지나가는 것은 첫 요청 하나뿐이고, 나머지 넷은 nginx에서 멈춥니다.

{{< motion scene="PlaybackQueryGuard" id="fig-playback-query-guard" kind="개념도" caption="재생 요청 다섯 개 가운데 경로와 쿼리의 방송이 같은 /A/list?path=A만 재생 서버(9996)에 닿습니다. 다른 방송을 지정한 path=B, 중복 path, 인코딩한 키 pa%74h, 원문에 ..%2f가 든 /A/..%2fB/list?path=B는 nginx가 403으로 멈추고, 재생 서버에 닿은 거절 요청은 0건입니다. 프록시 계약 시험의 사례를 옮긴 그림입니다." >}}

마지막 `/A/..%2fB/list?path=B`는 원문 검사만 잡을 수 있는 요청입니다. 풀어서 접으면 `/B/list?path=B`가 되어 쿼리 대조는 통과하기 때문입니다. 10월 22일 PR 직전 일괄 시험에서 이 계약 시험을 다섯 번 반복했고 모두 통과했습니다. 이 결과는 요청 계약의 검증이며, 운영의 공격 차단율이나 처리량 수치는 아닙니다.

로그도 따로 봤습니다. 접근 로그에는 Authorization과 쿼리를 싣지 않고, 경로는 받은 원문 그대로 남깁니다. 거절한 우회 원문이 정상 경로처럼 남지 않게 하려는 것입니다. 오류 로그는 nginx가 형식을 정해서 요청 줄(쿼리 포함)과 Host·Referer가 실립니다([35–39행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L35-L39)). 쿼리로 토큰을 받게 되면 다시 판단해야 합니다.

## 운영에서도 우회 요청은 상류에 닿지 않았고 관리할 프록시는 하나 늘었습니다 {#남은-비용과-적용-범위}

11월 3일 운영 상자가 뜬 뒤 재생 대상 그룹을 포함한 로드 밸런서 대상 그룹 넷이 healthy였습니다. 같은 날 운영 엣지 시험에서 쿠키 없이 `/live/../`와 `/playback/../`로 제어면 경로를 노린 요청 3종을 변형 5가지(`/../`, `/%2e%2e/`, `/..%2f`, `/..%5c`, `//../`)로 보낸 15사례가 모두 거절됐고, 보호 대상 상류에 닿은 요청은 0건이었습니다. 결과는 비공개 운영 기록이고, 시험 정의는 [`edge-tests.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/runbooks/edge-tests.md?plain=1#L358-L380)에 있습니다. 11월 7일 머지한 라이브 경로의 CloudFront 함수(`live_auth`)가 11월 9일 운영에 반영된 뒤에는 쿠키 없는 `..%5c` 요청이 CloudFront에서 먼저 403을 받습니다([PR #487](https://github.com/3K-PokeClip/PokeClip-mono/pull/487)). 이 함수는 `/live/*`에만 붙으므로, 재생 경로의 원문 검사는 여전히 nginx 혼자 맡습니다.

방송 A의 쿠키로 B의 녹화를 요청하는 교차 쿠키 시험은 운영에서 아직 하지 않았습니다. 재생 경로의 교차 대조는 로컬 계약 시험으로만 확인했습니다.

프록시가 하나 늘면 설정·업그레이드·장애 대응 대상도 늘어납니다. 재생 요청의 대상 대조와 내부 포트 경계를 맡길 곳이 필요해 그 비용을 받아들였습니다. 따로 잰 CDN 캐시 실험의 전송량 절감은 이 nginx 검증의 성과로 세지 않습니다([원본 요청 1,254건을 28건으로](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/)). 앞단 인가가 경로를 보고 뒤의 서버가 쿼리로 대상을 고른다면, 프록시에서 둘을 대조하고 원문부터 검사하십시오. 그리고 거절 응답 코드가 아니라 상류에 닿은 요청 수로 확인하십시오.

## 측정 조건

- 프록시 계약 시험: 운영과 같은 `templatefile()` 렌더, 다이제스트 고정 공식 nginx 이미지, MediaMTX 자리에 호출 수를 세는 에코 서버. 10월 22일 PR 직전 일괄 시험에서 5회 반복했고 AI가 수행했습니다. 반복 결과는 비공개 기록이며, 공개 PR 본문에는 로컬 통과만 적혀 있습니다.
- 11월 3일 운영 엣지 시험: 쿠키 없는 경로 우회 15사례(요청 3종 × 변형 5가지), `curl --path-as-is`. 결과는 비공개 운영 기록입니다. 11월 9일 `live_auth` 반영 뒤 재시험도 비공개 기록입니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일)이고, PR 상태는 2026년 11월 11일에 확인했습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #311](https://github.com/3K-PokeClip/PokeClip-mono/pull/311) — nginx 앞단과 계약 시험(2026-10-23 머지)
- [`infra/media-host/nginx/nginx.conf.tmpl`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L80-L141) — 원문 검사, 쿼리 대조, 라이브 · 재생 서버 블록
- [`infra/media-host/test/proxy_contract.sh`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/test/proxy_contract.sh#L374-L411) — 응답 코드와 상류 호출 수 대조
- [`infra/terraform/modules/cdn_media/policies.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/cdn_media/policies.tf#L173-L193) — `/playback/*` 서명 쿠키와 쿼리 전달
- [`infra/terraform/prod/platform/load_balancers.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/load_balancers.tf#L122-L127) — 내부 ALB의 `/playback` 접두사 제거
- [`web/src/app/media/playback/[key]/[op]/route.ts`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/app/media/playback/%5Bkey%5D/%5Bop%5D/route.ts#L1-L7) — 로컬 라우트의 같은 이유의 이중 방어
- [`infra/terraform/runbooks/edge-tests.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/runbooks/edge-tests.md?plain=1#L358-L380) — 경로 우회 시험 정의
- [3K-PokeClip/PokeClip-mono PR #487](https://github.com/3K-PokeClip/PokeClip-mono/pull/487) — 라이브 경로 CloudFront 함수(2026-11-07 머지)
- [nginx 문서 「location」](https://nginx.org/en/docs/http/ngx_http_core_module.html#location) — 정규화한 URI로 location 선택
- [원본 요청 1,254건을 28건으로: 캐시 키와 인증 전달을 분리한 실험](/posts/0-to-1/pokeclip-cdn-cache-auth-measurement/) — 별도 CDN 캐시 실험
- 팀 내부 시험 · 운영 기록(비공개) — 10월 22일 일괄 시험, 11월 3일 운영 엣지 시험, 11월 9일 재시험

---

[Media 호스트의 재시작과 비밀 파일 수명](/posts/0-to-1/pokeclip-media-host-restart-lifecycle/) · [전체 기술 기록](/posts/0-to-1/portfolio-engineering-notes/)
