---
title: "서명 쿠키는 종류별로 나누고 1시간 창은 엣지에서 막았습니다"
date: "2026-11-18T03:27:26+09:00"
categories: ["projects"]
tags: ["PokeClip", "CloudFront", "서명 쿠키", "CloudFront Functions", "KeyValueStore", "DVR", "HLS"]
draft: false
author: "김태윤"
description: "PokéClip 되감기 조각 주소는 연번이고 60일 동안 살아 있습니다. 서명 쿠키 정책의 앞 와일드카드 하나가 경로 구분자와 쿼리를 넘어 남의 방송까지 열어서 종류별 정책 넷 · 쿠키 열두 장으로 나눴고, 방송 중 1시간 창 밖 조각은 CloudFront 함수가 KeyValueStore의 회차별 하한을 읽어 404로 막습니다. 하한은 60초 전에 발행한 목록의 첫 조각 번호이고, 못 읽으면 막지 않고 넘깁니다. 하한이 다시보기를 막지 않도록 조각을 업로드 때부터 회차 경로에 써서 VOD 복사 단계를 없앴습니다."
---

PokéClip의 되감기 조각 주소는 `/dvr/{스트림}/{회차}/seg/{번호}.m4s`처럼 번호가 하나씩 늘고, S3에서 60일 동안 살아 있습니다. [앞 편](/posts/0-to-1/pokeclip-live-dvr-url-split/)에서 이 조각을 CloudFront 배포 하나의 `/dvr/*` 규칙으로 S3에서 내게 했는데, 그것만으로는 두 가지를 막지 못했습니다. 첫째, 서명 쿠키 정책이 `{base}/*/{방송}/*` 하나였고 CloudFront는 이 `*`를 경로 구분자와 쿼리까지 넘어 맞추므로, 한 방송의 쿠키로 남의 방송 주소가 열렸습니다. 둘째, 1시간 되감기 창은 재생 목록에 무엇을 싣느냐는 정책이었을 뿐이라, 창 밖 조각 주소를 아는 사람은 그 조각을 그대로 받을 수 있었습니다. 지금은 종류(live · dvr · vod · playback)마다 정책을 하나씩 두어 쿠키가 열두 장이고, CloudFront 함수가 회차별 하한보다 앞선 조각을 404로 막습니다. 하한이 다시보기까지 막지 않도록, 조각은 업로드 때부터 회차 경로에 씁니다.

서명 쿠키를 발급하는 clip 서버는 그 서버를 맡은 팀원이 구현했고, 정책을 종류별로 나눈 수정도 같은 팀원이 했습니다. 방송 중 1시간 창을 정책으로 두고 엣지에서 막는 것, 하한의 여유 60초와 쓰기 주기 5분, 하한을 못 읽으면 막지 않는 방향, 조각을 업로드 때부터 회차 경로에 쓰는 구조는 제가 정했습니다. 엣지 함수 · 하한 기록기 · Terraform 구현은 AI(Claude Code와 Codex)가 했고, 커밋은 제 계정으로 들어갔습니다.

## 앞 와일드카드 하나가 남의 방송까지 열었습니다

서명 쿠키는 CloudFront가 요청을 원본에 넘기기 전에 확인하는 출입증입니다. 이 출입증은 스트리머 본인과 그가 위임한 편집자에게만 나가고, 아래의 시청자는 이 두 사람을 말합니다. 쿠키 세 장(`CloudFront-Policy` · `CloudFront-Signature` · `CloudFront-Key-Pair-Id`)이 한 벌이고, 정책의 `Resource`가 어느 주소에 쓸 수 있는지를 정합니다. 처음 구현은 방송 하나의 라이브 · 되감기 · 다시보기를 한 벌로 덮으려고 `Resource`를 `{base}/*/{방송}/*` 하나로 두고, 쿠키는 `Path=/`로 발급했습니다([2d824a0a의 `PlaybackAccessSigner.java` 66행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2d824a0a4a65b5a71a7abec4427f5856e4251b72/services/clip/src/main/java/com/pokeclip/clip/playback/PlaybackAccessSigner.java#L66)).

AWS 문서는 `Resource`를 「쿼리 문자열을 포함한 기본 URL」로 정의하고, `*`는 0자 이상의 아무 글자, `?`는 정확히 한 글자이며 문자열의 어디에든 쓸 수 있다고 적습니다. 문서 예시의 `/*game_download.zip*`는 `example_game_download.zip?license=yes`에도 맞습니다([AWS 「Set signed cookies using a custom policy」 Resource](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-setting-signed-cookie-custom-policy.html#private-content-custom-policy-statement-cookies-values)). 같은 페이지의 다른 예시는 `"Resource": "https://*"` 하나로 그 키 쌍에 묶인 모든 배포의 모든 파일을 엽니다. 문서가 `*`의 예외로 드는 것은 리터럴 세미콜론(`;`)뿐이고, `*`가 `/`나 `?`에서 멈춘다는 규칙은 없습니다.

영상에서 위 줄의 앞 `*`가 `live/B/index.m3u8?x=`까지 먹는 것과, 아래 줄이 `B` 한 글자에서 어긋나는 것을 보면 됩니다.

{{< motion scene="WildcardMatch" id="fig-wildcard-match" kind="개념도" caption="같은 요청 {base}/live/B/index.m3u8?x=/A/를 두 정책과 견줍니다. 옛 정책 {base}/*/A/*의 앞 *는 /와 ?를 가리지 않고 live/B/index.m3u8?x=를 먹어 남의 방송 B가 열리고, 종류별 정책 {base}/live/A/*는 B에서 어긋납니다. A · B는 지어낸 방송 번호이고, 먹은 글자는 공개 재측정 결과와 같습니다." >}}

AWS 문서의 규칙을 그대로 옮긴 매처로 다시 재 보면 아래와 같습니다. 매처는 문서 예시의 세 주소를 모두 맞혀 규칙을 옮긴 것을 먼저 확인했습니다. 실제 CloudFront에 옛 정책을 올려 재지는 않았습니다.

| 요청(A = 내 방송, B = 남의 방송) | 옛 정책 `{base}/*/A/*` | 앞 `*`가 먹은 글자 | 종류별 정책 넷 |
|---|---|---|---|
| `{base}/live/A/index.m3u8?_HLS_msn=3` | 일치 | `live` | live 일치 |
| `{base}/live/B/index.m3u8?x=/A/` | **일치** | `live/B/index.m3u8?x=` | 모두 불일치 |
| `{base}/vod/B/x/A/index.m3u8` | **일치** | `vod/B/x` | 모두 불일치 |
| `{base}/live/B/index.m3u8` | 불일치 | – | 모두 불일치 |

쿼리에 내 방송 번호를 붙이기만 해도 쿠키 수명(60분) 동안 다른 스트리머의 영상이 열리는 구멍이었습니다. 그래서 팀원이 정책을 종류마다 `{base}/{종류}/{방송}/*` 하나로 고정했습니다. 앞을 고정하면 뒤 `*`가 무엇을 먹든 그 방송 아래입니다([`PlaybackAccessSigner.java` 91–106행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/services/clip/src/main/java/com/pokeclip/clip/playback/PlaybackAccessSigner.java#L91-L106)). 수정은 [커밋 `7837152c`](https://github.com/3K-PokeClip/PokeClip-mono/commit/7837152c4048b1190a6f8e4facf0325dcce4d632)로, 처음 구현과 함께 [PokeClip-mono PR 183](https://github.com/3K-PokeClip/PokeClip-mono/pull/183)에 들어갔습니다.

정책이 여럿이면 쿠키도 여러 벌이 필요한데, CloudFront 쿠키 이름은 고정입니다. 그래서 벌마다 `Path`를 그 정책의 뿌리와 같게 두어 브라우저가 요청 경로에 맞는 한 벌만 보내게 했습니다. 브라우저는 쿠키 `Path`가 요청 경로의 앞부분이고 경계가 `/`일 때만 그 쿠키를 보냅니다([RFC 6265 5.1.4](https://www.rfc-editor.org/rfc/rfc6265#section-5.1.4)).

| 종류 | 정책 `Resource` | 쿠키 `Path` | 가는 곳 |
|---|---|---|---|
| live | `{base}/live/{방송}/*` | `/live/{방송}` | Media 상자 |
| dvr | `{base}/dvr/{방송}/*` | `/dvr/{방송}` | S3 |
| vod | `{base}/vod/{방송}/*` | `/vod/{방송}` | S3 |
| playback | `{base}/playback/{방송}/*` | `/playback/{방송}` | Media 상자 |

네 벌 × 세 장으로 쿠키는 열두 장이고, 수명은 60분입니다([`PlaybackAccessController.java` 40–41행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/services/clip/src/main/java/com/pokeclip/clip/playback/api/PlaybackAccessController.java#L40-L41) · [`PlaybackProperties.java` 56행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/services/clip/src/main/java/com/pokeclip/clip/playback/PlaybackProperties.java#L56)). 같은 이름의 쿠키 두 벌을 한 요청에 실으면 CloudFront가 이름마다 값을 따로 골라 섞이고 403이 났다는 것을 실험 계정에서 curl로 확인했기 때문에(비공개 실측, 브라우저가 어떤 쿠키를 함께 보내는지는 재지 않음), 이후 회차 경로를 도입할 때도 쿠키를 새로 만들지 않고 이 네 벌을 그대로 썼습니다. 정책이 막지 못하는 것은 쿼리입니다. `/playback/A/list?path=B`는 playback 정책에 맞으므로, 녹화 재생 서버 앞의 nginx가 쿼리의 방송이 경로의 방송과 같을 때만 넘깁니다([nginx 경로 대조 글](/posts/0-to-1/pokeclip-nginx-playback-request-boundary/)).

## 엣지 함수가 1시간 창 밖 조각을 404로 막습니다

종류별 쿠키로도 남는 구멍이 있습니다. `/dvr` 쿠키는 그 스트리머의 `/dvr` 전체에 쓸 수 있고, 되감기 조각은 번호가 하나씩 늘며 60일 동안 S3에 있습니다. 1시간 창은 재생 목록이 최근 1시간만 싣는다는 뜻이었으므로, 번호만 바꿔 부르면 방송 중에도 3시간 전 조각을 받을 수 있었습니다. 11월 2일 저는 「방송 중에는 1시간, 끝난 뒤 다시보기는 제한 없이」를 서비스 정책으로 확정하고, 방송 중 1시간 창 밖 조각은 엣지에서 막기로 했습니다. 앞에서 말했듯 쿠키는 스트리머 본인과 위임 편집자에게만 나가므로, 이것은 보안 경계가 아니라 정책 강제입니다.

막는 값은 회차별 하한입니다. 사이드카가 되감기 목록을 발행할 때마다 그 목록의 첫 조각 번호(`EXT-X-MEDIA-SEQUENCE`)를 기억하고, **60초 전까지 발행된 목록 가운데 가장 큰 첫 조각 번호**를 하한으로 삼습니다([`history.go` 18–28행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/internal/rewind/edgebounds/history.go#L18-L28)). 하한은 5분마다 DB의 원장 표에 `GREATEST`로만 올리고, 같은 값을 CloudFront KeyValueStore(KVS, 엣지 함수가 읽는 키-값 저장소)의 키 `{스트림}/{회차}`에 씁니다. 회차가 닫히면 30초 주기 해제가 그 키를 지웁니다([`edge_bounds.go` 29–36행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/cmd/segment-indexer/edge_bounds.go#L29-L36) · [`media/README.md` 「/dvr 하한 Writer」](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/README.md?plain=1#L899-L935)). 쓰기 횟수를 줄이려고 조각마다 쓰지 않고 5분마다 묶어서 씁니다.

60초 여유는 규격에서 일부러 벗어난 값입니다. RFC 8216은 목록에서 뺀 조각을 그 뒤로 「조각 길이 + 그 조각을 실은 가장 긴 목록의 길이」 동안 받을 수 있어야 한다고 정합니다([RFC 8216 6.2.2](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.2)). 되감기 목록이 1시간이니 이를 따르면 창 밖 조각을 1시간 더 열어 둬야 합니다. 저는 그 대신 60초 전 목록의 첫 조각까지만 열어 두기로 했습니다. 2판 초안은 ENDLIST가 없는 목록에서 이 기한을 조각이 목록에 처음 실린 때부터 세도록 바꿨습니다([RFC 8216bis-22 6.2.2](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt)). 그 기준으로는 목록에서 빠진 뒤 조각 길이(4초)만큼만 열어 두면 되므로, 60초 여유는 2판 초안을 어기지 않습니다. 다만 그 초안(-22)은 2026년 5월 1일에 나와 11월 2일에 만료됐고, 아직 더 새 판은 없습니다. 하한이 늘 최신 목록보다 늦으므로 **그 회차의 최신 목록에 실린 조각은 엣지가 막지 않습니다.** 송출이 끊겼다 이어져 한 회차 안에서 목록이 둘로 갈리면, 앞 목록을 들고 있던 플레이어는 그 목록의 조각에서 예상보다 일찍 404를 받을 수 있고, 이것은 한계로 받아들였습니다. 낡은 목록을 들고 있던 플레이어가 404를 받으면 같은 주소로 목록을 다시 받으면 되고, 그 처리와 하한이 늦게 따라오는 모양은 [되감기 404 글](/posts/projects/rewind-missing-segment/)에 있습니다.

엣지에서는 `/dvr/*` 규칙에 붙은 viewer-request 함수(dvr-floor)가 KVS에서 하한을 읽어 견줍니다. 아래 그림에서 하한을 못 읽은 갈래가 막히지 않고 S3로 가는 것을 보면 됩니다.

```mermaid {#fig-floor-decision kind="개념도" caption="서명 쿠키가 먼저 맞아야 함수가 돕니다. 함수는 경로 변조 표시가 있으면 KVS를 읽기 전에 404를 내고, 회차 경로 조각이면 KVS의 하한과 견줘 하한보다 앞이면 캐시하지 않는 404를 냅니다. 키가 없거나 KVS를 못 읽거나 값이 이상하면 막지 않고 S3로 넘깁니다. PokeClip-mono develop 627fb5a2의 dvr-floor.js 기준." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/functions/dvr-floor.js#L56-L87"}
%%{init: {"sequence": {"width": 90, "actorMargin": 8}}}%%
sequenceDiagram
  accTitle: /dvr 조각 요청에 대한 엣지 함수의 판단
  accDescr: 시청자가 쿠키와 함께 /dvr 조각을 요청하면 엣지가 먼저 쿠키 정책을 보고 맞지 않으면 403을 준다. 함수는 경로 변조 표시가 있으면 404를 주고, 아니면 KVS에서 그 회차의 하한을 읽는다. 번호가 하한보다 작으면 캐시하지 않는 404를 주고, 키가 없거나 읽기에 실패하거나 번호가 하한 이상이면 S3로 넘긴다.
  participant V as 시청자
  participant E as 엣지
  participant S as S3
  V->>E: /dvr 조각 + 쿠키
  Note over E: 쿠키 불일치 → 403
  Note over E: 변조 표시 → 404
  Note over E: KVS 하한 읽기
  alt 하한 아래
    E-->>V: 404 · no-store
  else 못 읽음
    E->>S: 넘김
  else 하한 이상
    E->>S: 넘김
  end
```

함수를 저장소의 시험 로더로 node에서 돌려 가짜 KVS를 바꿔 가며 재 보면 결정은 아래와 같습니다. 하한 1200과 번호는 지어낸 값입니다.

| 요청 · KVS 상태 | 결정 | KVS 호출 | 함수 로그 |
|---|---|---|---|
| 회차 경로 조각 1199, 하한 1200 | 404(`no-store`) | exists · get | `DVR FLOOR DENY` |
| 조각 1200 · 1201, 하한 1200 | 넘김 | exists · get | – |
| 키 없음(회차가 닫혀 지워짐 · 아직 안 씀) | 넘김 | exists | – |
| KVS 읽기 실패 | 넘김 | exists(· get) | `DVR FLOOR KVS ERROR` |
| 값이 하한 문법 밖(`01200` · `abc`) | 넘김 | exists · get | `DVR FLOOR VALUE INVALID` |
| 경로 변조 표시(`%` · 역슬래시 · 빈 구간 · 점 구간) | 404 | 없음 | `DVR FLOOR MALFORMED` |
| 안전 정수(2^53 − 1)를 넘는 번호(정규식이 받는 19자리까지) | 404 | 없음 | `DVR FLOOR MALFORMED` |
| 옛 꼴 조각 · 목록 · init · OPTIONS | 넘김 | 없음 | – |

판단 재료를 못 얻으면 막지 않는 실패 열림(fail-open)입니다([`dvr-floor.js` 1–18행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/functions/dvr-floor.js#L1-L18)). 하한은 창 정책이고 1차 통제는 함수보다 먼저 확인되는 서명 쿠키이므로, KVS 장애로 시청자를 404에 가두는 쪽이 더 나쁘다고 봤습니다. 대신 읽기 실패와 값 이상은 고정 문자열로 로그에 남겨 경보가 셉니다. 같은 배포의 라이브 함수가 CDN 비밀을 못 읽으면 503으로 닫는 것과 반대 방향입니다. 키가 없을 때 KVS의 `get()`은 오류를 내서 장애와 구별할 수 없으므로, 함수는 `exists()`를 먼저 묻습니다([AWS 「Helper methods for key value stores」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-custom-methods.html) · [`dvr-floor.js` 98–108행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/functions/dvr-floor.js#L98-L108)).

경로 변조 표시를 KVS보다 먼저 거르는 까닭은 CloudFront가 경로 규칙을 고를 때는 RFC 3986대로 정규화한 경로를 쓰고, 원본에는 원문 경로를 넘기기 때문입니다([AWS 「Path normalization」](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html#path-normalization)). 점 구간이 든 원문이 정규화 뒤 `/dvr/*`로 와도, 함수는 원문을 보고 조회 전에 404를 냅니다. 이 함수는 [PokeClip-mono PR 502](https://github.com/3K-PokeClip/PokeClip-mono/pull/502)로, 하한 기록기는 [PR 499](https://github.com/3K-PokeClip/PokeClip-mono/pull/499)로 develop에 들어갔습니다.

## 업로드 때부터 회차 경로에 써서 VOD 복사 단계를 없앴습니다

하한을 정하는 과정에서 다시보기와 부딪쳤습니다. 다시보기 목록은 조각을 새로 만들지 않고 되감기 조각의 `/dvr` 주소를 그대로 가리킵니다. 그런데 조각 주소가 `/dvr/{스트림}/seg/{번호}`이고 스트림 키는 방송이 바뀌어도 같으므로, 번호 하한 하나를 걸면 지금 방송의 창 밖 조각뿐 아니라 지난 방송의 다시보기 조각까지 막힙니다.

11월 3일 새벽의 첫 안은 다시보기를 확정할 때 조각을 S3 서버 측 복사로 `vod/` 아래에 따로 만드는 것이었고, 복사본의 수명 관리까지 계획이 붙어 있었습니다. 구현 중에 저는 이미 있는 객체를 복사해 쓰는 비효율을 문제 삼고, 애초에 조각의 목적지만 바꾸면 되지 않느냐고 다시 조사하게 했습니다. Amazon IVS 같은 관리형 서비스는 방송이 시작될 때 녹화마다 고유한 S3 접두사를 만들고, 재접속 창 안의 재접속은 같은 접두사에 이어 씁니다([AWS IVS 「Auto-Record to Amazon S3」](https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/record-to-s3.html)).

그래서 조각 키를 업로드 때부터 `dvr/{스트림}/{회차}/seg/{번호}.m4s`로 쓰기로 했습니다. 회차는 재접속하는 순간 정하고, 이미 올린 조각을 나중에 다른 회차로 옮기지 않습니다. 회차가 주소에 들어가자 하한도 회차마다 걸 수 있게 됐고(KVS 키 `{스트림}/{회차}`), 회차가 닫히면 키를 지워 그 회차의 다시보기가 열립니다. 다시보기 목록은 같은 객체를 가리키므로 복사가 필요 없고, 복사 엔진과 복사본 수명 관리를 통째로 버렸습니다. 같은 스트림 키로 다시 켠 방송이 어떻게 회차를 잇는지는 [세션 주소 글](/posts/0-to-1/pokeclip-session-url-and-endlist/)에 있습니다. 회차 경로 쓰기는 [PokeClip-mono PR 476](https://github.com/3K-PokeClip/PokeClip-mono/pull/476)으로 들어갔습니다.

회차 경로 이전에 쓴 옛 꼴 조각은 그대로 남고, 하한을 걸지 않습니다. 함수의 경로 정규식이 회차 경로만 고르기 때문입니다([`dvr-floor.js` 46–47행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/functions/dvr-floor.js#L46-L47)).

## 엣지 하한은 늦게 따라오고, 퍼지는 데도 시간이 걸립니다

엣지가 막는 1시간은 정확한 1시간이 아닙니다. 하한은 60초 여유를 둔 값을 5분마다 쓰므로 실제 창보다 최대 약 6분 늦고, KVS에 쓴 값이 각 엣지에 퍼지는 시간이 더해집니다. AWS 문서는 KVS 메타데이터의 갱신 시각에 「엣지까지 퍼지는 시간은 들어 있지 않다」고만 적습니다([`meta()`](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-custom-methods.html#functions-custom-methods-meta)). 실험 계정에서 POP 한 곳에 curl로 재 보니, 키를 넣은 뒤 첫 404는 21초와 30초에 나왔고, 2초 간격 요청 10건이 다섯 바퀴 내리 모두 404가 되기까지 37초와 61초가 걸렸습니다. 키를 지운 뒤 첫 200은 11초 · 16초 · 18초에, 모두 200이 되기까지는 45초와 49초가 걸렸습니다(비공개 실측). 그 사이 연속 요청은 404와 200을 오갔습니다. 회차가 닫힌 뒤 다시보기를 여는 유예 120초도 이 실측에 기댄 값이라 모든 엣지의 반영을 보장하지 않습니다.

상자나 DB 자격이 새면 하한을 낮추거나 지울 수 있다는 것도 받아들였습니다. 원장의 하한이 줄지 않는 성질은 기록기의 SQL 문장에만 있고, KVS는 쓰기 권한이 있으면 값을 바꿀 수 있습니다([`media/README.md` 보안 절](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/README.md?plain=1#L1436-L1470)). 하한은 창 정책이지 접근 통제가 아니라는 판단이 여기에도 이어집니다. 녹화 재생 경로(`/playback`)는 시각 쿼리로 Media 상자의 녹화를 잘라 주므로 방송 중에도 1시간 밖을 받을 수 있는데, 이번에는 `/dvr` 조각만 막고 그 경로는 한계로 남겼습니다.

비슷한 출입증을 설계한다면 와일드카드를 정책의 앞쪽에 두지 마십시오. CloudFront 정책의 `*`는 경로 구분자도 쿼리도 가리지 않습니다. 앞을 고정하고, 열어야 할 범위가 여럿이면 정책과 쿠키 `Path`를 같은 뿌리로 여러 벌 두는 편이 안전했습니다.

## 측정 조건

- **공개 재측정.** AI(Claude Code)가 2026년 11월 18일 02:42 KST에 실행했습니다. MacBook Air(Apple M5), macOS 27.0.1, Node.js 26.4.0. 3K-PokeClip/PokeClip-mono develop `627fb5a2`(2026년 11월 17일)를 `git archive`로 풀었습니다. AWS · docker는 쓰지 않았습니다.
  - **함수 시험.** 저장소의 `node --test infra/terraform/modules/cdn_media/functions/test/*.test.mjs`를 그대로 돌려 246개가 모두 통과했습니다.
  - **하한 결정 표.** `floor-table.mjs`가 저장소의 시험 로더(`cf-function-loader.mjs`)로 `dvr-floor.js` 원문을 평가하고, 가짜 KVS(없는 키는 `get()`이 오류, `exists()`는 참 · 거짓)와 장애 주입으로 17가지 요청을 한 번씩 돌렸습니다. node는 CloudFront 런타임이 아니므로 실제 엣지의 동작이 아니라 함수 코드의 판정입니다.
  - **와일드카드 시연.** `wildcard.mjs`가 AWS 문서의 `Resource` 규칙(`*` = 리터럴 세미콜론을 뺀 0자 이상, `?` = 한 글자)을 정규식으로 옮기고, 문서 예시 세 주소가 모두 맞는 것을 먼저 확인한 뒤 요청 여섯을 견줬습니다. 쿠키 선택은 RFC 6265 5.1.4로 셈했습니다. 실제 CloudFront 호출은 하지 않았습니다.
- **명령.** `measure/`에서 `MONO_DIR=<PokeClip-mono 클론> ./run.sh extract` → `./run.sh all "$PWD/raw"` → `./run.sh down`(스크립트가 만든 `/tmp/dvrurl-run-*`만 지움). 스크립트와 원자료는 [저장소 `_workspace/blog/pokeclip-dvr-cookie-edge-floor/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-dvr-cookie-edge-floor/measure)에 있습니다.
- **비공개 실측.** 쿠키 경로가 포개질 때의 403과 KVS 전파 시간은 실험 계정의 CloudFront 배포 하나, POP 한 곳에서 curl로 잰 팀 내부 기록입니다. 첫 반영은 같은 요청을 거듭 보내 처음 바뀐 시각으로, 수렴은 2초 간격 요청 10건 한 바퀴가 5바퀴 연속 같은 결과가 될 때까지 보는 방식으로 쟀습니다. 넣기 · 지우기의 첫 반영은 각각 2번 · 3번, 수렴은 각각 2번 쟀고, 브라우저로는 재지 않았습니다. 실험 뒤 자원은 모두 지웠습니다.

## 출처

규격 · 문서
- [AWS — Set signed cookies using a custom policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-setting-signed-cookie-custom-policy.html#private-content-custom-policy-statement-cookies-values) — `Resource`는 쿼리를 포함한 URL, `*` · `?`는 문자열 어디에나
- [RFC 6265 5.1.4 Paths and Path-Match](https://www.rfc-editor.org/rfc/rfc6265#section-5.1.4) — 브라우저가 쿠키를 보내는 경로 규칙
- [AWS — Cache behavior settings: Path normalization](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html#path-normalization) — 규칙은 정규화 경로로 고르고 원본에는 원문
- [AWS — Helper methods for key value stores](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-custom-methods.html) — 없는 키의 `get()` 오류, `exists()`, `meta()`의 전파 시간
- [AWS — Amazon CloudFront KeyValueStore](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions.html)
- [RFC 8216 6.2.2](https://www.rfc-editor.org/rfc/rfc8216#section-6.2.2) · [RFC 8216bis-22 6.2.2 Live Playlists](https://www.ietf.org/archive/id/draft-pantos-hls-rfc8216bis-22.txt) — 목록에서 뺀 조각의 가용 기한(2판 초안은 ENDLIST 없는 목록에서 처음 실린 때부터 셈)
- [AWS IVS — Auto-Record to Amazon S3](https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/record-to-s3.html) — 녹화마다 고유한 S3 접두사, 재접속 창 안의 이어 쓰기

코드(공개 저장소 3K-PokeClip/PokeClip-mono)
- 처음 구현 [`2d824a0a` `PlaybackAccessSigner.java` 66행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2d824a0a4a65b5a71a7abec4427f5856e4251b72/services/clip/src/main/java/com/pokeclip/clip/playback/PlaybackAccessSigner.java#L66) · 종류별로 나눈 [커밋 `7837152c`](https://github.com/3K-PokeClip/PokeClip-mono/commit/7837152c4048b1190a6f8e4facf0325dcce4d632) · [PR 183](https://github.com/3K-PokeClip/PokeClip-mono/pull/183)
- develop `627fb5a2`: [`PlaybackAccessSigner.java` 91–106행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/services/clip/src/main/java/com/pokeclip/clip/playback/PlaybackAccessSigner.java#L91-L106) · [`PlaybackAccessController.java` 40–41행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/services/clip/src/main/java/com/pokeclip/clip/playback/api/PlaybackAccessController.java#L40-L41)
- develop `627fb5a2`: [`dvr-floor.js`](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/infra/terraform/modules/cdn_media/functions/dvr-floor.js#L56-L87) · [`history.go` 18–28행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/internal/rewind/edgebounds/history.go#L18-L28) · [`edge_bounds.go` 29–36행](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/cmd/segment-indexer/edge_bounds.go#L29-L36) · [`media/README.md` 「/dvr 하한 Writer」](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/README.md?plain=1#L899-L935) · [보안 절](https://github.com/3K-PokeClip/PokeClip-mono/blob/627fb5a20ecb9d221fcc030c26adcbbcbe12c04e/media/README.md?plain=1#L1436-L1470)
- [PR 476](https://github.com/3K-PokeClip/PokeClip-mono/pull/476) — 회차 경로 조각 키 · [PR 499](https://github.com/3K-PokeClip/PokeClip-mono/pull/499) — 하한 원장과 기록기 · [PR 502](https://github.com/3K-PokeClip/PokeClip-mono/pull/502) — 엣지 함수 dvr-floor

재측정
- [함수 시험 · 하한 결정 표 · 와일드카드 시연 스크립트와 원자료](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-dvr-cookie-edge-floor/measure)

이어지는 글
- [CDN 하나에서 라이브는 EC2로, 되감기는 S3로 보냈습니다](/posts/0-to-1/pokeclip-live-dvr-url-split/) — 1편
- [사이드카는 4초 조각마다 HLS 되감기 목록을 이렇게 만듭니다](/posts/0-to-1/pokeclip-sidecar-rewind-playlist/) — 2편, 하한을 알리는 목록 발행
- [되감기 중 사라진 HLS 조각, 재생 목록을 다시 받아 풀었습니다](/posts/projects/rewind-missing-segment/) — 플레이어가 엣지 404를 받는 쪽
- [nginx는 경로의 방송과 쿼리의 방송이 같을 때만 넘깁니다](/posts/0-to-1/pokeclip-nginx-playback-request-boundary/) — 정책이 못 막는 쿼리
- [2시간 방송이 다시보기에서 7.5분만 보였던 이유](/posts/projects/pokeclip-round-vod/) — 회차 · 사슬 · 다시보기 문서
