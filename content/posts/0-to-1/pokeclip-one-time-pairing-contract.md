---
title: "OBS 계정 연결을 OAuth 대신 8자 일회용 코드로 했습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: 2026-11-12T02:20:00+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "OBS", "Authentication"]
description: "OBS 플러그인에 OAuth를 넣지 않고, 웹에서 받은 8자 · 10분 · 일회용 코드를 플러그인이 송출 설정으로 바꾸게 했습니다. 짧은 코드는 발급 계정당 분당 3회 · 교환 IP당 분당 5회 제한으로 버티고, 쓴 코드를 만료 뒤 1시간 남겨 409와 410을 가릅니다. 로드밸런서 뒤에서 IP별 제한이 성립하는 조건, 9월 연동 측정의 범위, 암호를 켠 송출이 별도 과제로 남은 경위까지."
draft: false
portfolio_cases: [10]
portfolio_pages: [29]
portfolio_edition: "2026-10-15-v2"
---

방송자는 PokeClip 웹에 이미 구글 계정으로 로그인해 있습니다. OBS 플러그인이 그 계정의 송출 설정(SRT의 streamid와 passphrase)을 받으려면 다시 로그인해야 했는데, C++ 플러그인에 OAuth를 넣으면 브라우저 열기 · 로컬 콜백 · 토큰 갱신을 따로 짜야 했습니다. SRT 주소를 통째로 복사하게 하면 주소에 섞인 passphrase가 화면 공유와 로그로 샙니다. 그래서 웹에서 8자 코드를 받아 OBS에 한 번 입력하면, 플러그인이 Auth 서버에서 그 코드를 송출 설정으로 바꾸게 했습니다. 코드는 10분 뒤 만료되고 한 번만 바꿀 수 있습니다. 짧은 코드는 발급 계정당 분당 3회, 교환 IP당 분당 5회 제한으로 버팁니다. 9월 13일 팀원의 연동 측정에서는 교환 성공, 같은 코드 재사용 409, 설정 파일 권한 0600을 확인했습니다.

8자 · 10분 · 일회용과 두 제한 값은 제가 7월 24일 정했습니다. OBS 플러그인 구현과 9월 13일 측정은 팀원이 했고([PR #179](https://github.com/3K-PokeClip/PokeClip-mono/pull/179)), Auth 서버의 페어링 API와 기록 청소는 다른 팀원이 구현했습니다.

## OAuth를 넣는 대신 웹 로그인과 8자 코드를 이었습니다 {#짧은-코드는-장기-자격증명을-전달하는-한-번의-창구였습니다}

요구는 「방송마다 반복 설정 0회」였습니다. 처음 연결할 때 코드를 한 번 입력하는 것은 이 요구와 부딪치지 않습니다. 이 구분을 먼저 세운 뒤 세 안을 견줬습니다.

| 대안 | 플러그인이 새로 맡는 일 | 판단 |
|---|---|---|
| OBS 안에 OAuth 전체 | 브라우저 열기 · 콜백 · 토큰 갱신 | C++ 구현 범위가 커서 기각 |
| SRT 주소 한 줄 복사 | 없음 | 주소에 passphrase가 평문으로 남아 기각 |
| 웹 로그인 + 일회용 코드 | 코드 입력과 교환 한 번 | 채택. 발급 · 교환 · 만료 · 시도 제한은 서버가 맡음 |

로그인한 웹이 코드를 발급하고, 로그인하지 않은 플러그인이 그 코드를 내밉니다. 교환 경로는 로그인 없이 열려 있으므로 코드 자체가 한 번 쓰고 버리는 출입증입니다. Auth는 코드 원문을 저장하지 않고 SHA-256 해시만 둡니다([`PairingCodeService.java` 54–56행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/pairing/PairingCodeService.java#L54-L56)). 짧은 코드를 화면에 띄워 다른 기기에 입력하게 하는 모양은 [OAuth 기기 인가 흐름(RFC 8628)](https://www.rfc-editor.org/rfc/rfc8628)과 닮았지만, 그 표준을 구현한 것은 아닙니다. 기존 웹 계정과 플러그인을 잇는 자체 계약이라 발급 · 교환 · 폐기 조건을 직접 정해야 했습니다.

[[fig-pairing-sequence]]에서 200 응답이 한 번뿐인 성공 교환입니다. 같은 코드를 다시 내밀거나, 만료 뒤에 내밀거나, 한도를 넘기면 서로 다른 거절 코드가 돌아옵니다.

```mermaid {#fig-pairing-sequence kind="재구성" caption="로그인한 웹이 코드를 받고, 로그인하지 않은 플러그인이 그 코드를 streamid와 passphrase로 바꿉니다. 성공은 한 번뿐이고, 쓴 코드는 409, 만료된 코드는 410, 같은 IP에서 1분 안 6번째 시도는 429입니다. PokeClip-mono develop 825a3dfe의 PairingCodeService · StreamKeyExceptionHandler 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/pairing/PairingCodeService.java"}
%%{init: {"sequence": {"width": 96, "actorMargin": 16}}}%%
sequenceDiagram
  accTitle: 페어링 코드 발급과 교환 순서
  accDescr: 로그인한 웹이 Auth에서 8자 코드를 발급받고, 방송자가 그 코드를 OBS 플러그인에 입력하면 플러그인이 Auth에 교환을 요청해 streamid와 passphrase를 받는다. 같은 코드를 다시 내밀면 409, 만료된 코드는 410, 같은 IP에서 1분 안 6번째 시도는 429가 돌아온다.
  participant W as 웹
  participant A as Auth
  participant P as 플러그인
  W->>A: 발급
  A-->>W: 8자 · 10분
  Note over W,P: 방송자가 OBS에 입력
  P->>A: 교환
  A-->>P: 200 키 · 암호
  Note over P: 파일 0600
  P->>A: 같은 코드
  A-->>P: 409 이미 씀
  P->>A: 만료 뒤
  A-->>P: 410 만료
  P->>A: 6번째 시도
  A-->>P: 429 한도
```

거절 사유를 나누면 「그런 코드가 있다」는 정보가 새어 나갑니다. Auth 코드는 IP당 분당 5회 제한이 이 누출을 무의미하게 만든다는 판단을 주석으로 남겼습니다([121–137행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/pairing/PairingCodeService.java#L121-L137)). 이 판단은 다음 절의 제한이 실제로 요청자마다 갈릴 때만 성립합니다.

## 코드를 짧게 만든 만큼 발급 3회 · 교환 5회로 시도를 셌습니다 {#입력을-줄인-대신-서버의-제한-조건을-함께-정했습니다}

코드는 [Crockford Base32](https://www.crockford.com/base32.html) 8자를 `XXXX-XXXX`로 보여 줍니다. 혼동하기 쉬운 I · L · O · U가 없어 사람이 옮겨 적어도 덜 틀리고, 경우의 수는 32⁸(2⁴⁰, 약 1조 1천억)입니다. 이 길이만으로는 짧으므로 만료와 시도 제한을 함께 정했고, 셋 중 하나를 풀면 나머지를 조여야 한다는 조건을 같이 적었습니다. 지금 코드의 상수도 그 값 그대로입니다([`PairingCodeService.java` 26–30행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/pairing/PairingCodeService.java#L26-L30)).

| 계약 | 값 또는 동작 |
|---|---|
| 형식 · 수명 | Crockford Base32 8자, 발급 뒤 10분 |
| 재사용 | 한 번 바꾼 코드는 거절 |
| 발급 제한 | 계정당 분당 3회 |
| 교환 제한 | IP당 분당 5회, 실패한 시도도 셈 |
| 계정 귀속 | 교환해도 발급한 계정의 자격만 돌려줌 |

교환 제한은 성공과 실패를 가리지 않고 시도 행을 하나씩 쌓아 셉니다. 이 기록은 교환과 다른 트랜잭션에서 씁니다. 같은 트랜잭션이면 실패할 때마다 롤백되면서 방금 넣은 시도 행도 사라져, 한도에 영영 닿지 않기 때문입니다([93–119행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/pairing/PairingCodeService.java#L93-L119)).

「IP당」은 Auth가 요청자의 IP를 알 때만 성립합니다. 로드밸런서 뒤에서는 소켓에 보이는 주소가 전부 로드밸런서라, 그대로 세면 모든 방송자가 한도 하나를 나눠 쓰게 됩니다. Auth의 앱 설정은 프록시가 붙여 주는 `X-Forwarded-For`를 기본으로 믿지 않습니다(`server.forward-headers-strategy` 기본값 `none`, [`application.yml` 134–144행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/application.yml#L134-L144)). 운영 Terraform 정의는 이 값을 `native`로 두고, 믿을 프록시를 VPC 안 대역으로 한정합니다([`prod/platform/services.tf` 76–81행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/services.tf#L76-L81)). 이 정의가 지금 운영에 적용된 상태인지는 확인하지 않았습니다.

시도 기록의 보관 기간도 제한의 일부입니다. 기본값은 1시간이고, 이 값을 제한 창인 1분보다 짧게 내리면 6번째 교환 시도도 한도에 걸리지 않고 코드 판정으로 넘어가 한도가 사라집니다. 없는 코드라면 429 대신 404가 돌아옵니다([336행 · 349행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/application.yml#L334-L349)). 실패가 쌓이면 일정 시간 막는 잠금은 아직 없습니다. 지금은 1분 창 안의 시도 수만 셉니다.

## 쓴 코드를 1시간 남겨 두어야 409와 410을 돌려줄 수 있었습니다 {#일회용-코드를-사용-직후-삭제하지-않은-이유}

교환은 「아직 쓰지 않았고 만료 전인 행에 사용 시각을 적는」 문장 하나로 끝납니다. 두 플러그인이 같은 코드를 동시에 내밀어도 한쪽만 1행을 바꾸고, 진 쪽은 0행입니다([80–83행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/pairing/PairingCodeService.java#L80-L83)). 0행이면 그 행을 다시 읽어 사유를 고릅니다. 사용 시각이 있으면 409, 없으면 만료라 410, 행이 없으면 404입니다([`StreamKeyExceptionHandler.java` 38–43행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/api/StreamKeyExceptionHandler.java#L38-L43)).

그래서 쓴 코드를 바로 지우지 않습니다. 행은 사용 여부와 상관없이 만료 뒤 1시간 남고, 청소가 10분마다 돌며 그보다 오래된 행을 지웁니다([`application.yml` 322–352행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/application.yml#L322-L352)). 영상의 위 줄은 쓴 코드, 아래 줄은 쓰지 않고 만료된 코드입니다. 청소 뒤 두 줄이 같은 404가 되는 순간을 보십시오.

{{< motion scene="PairingCodeLifetime" id="fig-pairing-lifetime" kind="개념도" caption="쓴 코드는 청소 전까지 409, 쓰지 않고 만료된 코드는 410을 돌려줍니다. 만료 뒤 1시간이 지나 10분 주기 청소가 행을 지우면 두 코드 모두 404가 됩니다. 어느 쪽도 다시 유효해지지는 않습니다. 시간축 길이는 설명용입니다." >}}

청소가 바꾸는 것은 거절 사유뿐입니다. 지운 코드도 교환은 실패하므로 판정은 그대로이고, 방송자에게 「이미 쓴 코드」나 「만료된 코드」 대신 「없는 코드」라고 말하게 될 뿐입니다([337–340행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/application.yml#L337-L340)). 보관 기간은 실패 이유를 얼마 동안 설명할 수 있는지 정하는 값이었습니다.

## 9월 연동은 교환 · 재사용 409 · 0600 파일까지 확인했습니다 {#팀-연동에서-확인한-것은-교환재사용-거부파일-권한입니다}

9월 13일 팀원이 macOS의 OBS와 로컬 Auth로 실제 연동을 쟀습니다(PR #179 본문 「실측」).

| 확인 | PR #179의 관측 |
|---|---|
| 교환 | 웹에서 발급한 코드를 독에 입력 → 연결됨 |
| 재사용 | 같은 코드를 다시 입력 → 409 `PAIRING_CODE_ALREADY_USED` |
| 저장 | 설정 파일 권한 0600 |

410 · 429 · 404 갈래와 동시 교환은 이 연동에서 따로 재지 않았습니다. Auth의 시험이 만료 410, 없는 코드 404, IP당 6번째 429, 동시 교환 한 번만 성공, 청소 뒤 404를 각각 확인합니다([`PairingCodeExchangeTest.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/test/java/com/pokeclip/auth/streamkey/api/PairingCodeExchangeTest.java) · [`RetentionCleanerPairingCodesTest.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/test/java/com/pokeclip/auth/retention/RetentionCleanerPairingCodesTest.java)). 받은 passphrase를 주소 밖의 별도 칸으로 넘기는 방식은 [인코더 공유 글](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/#비밀-전달과-ui는-송출-코어에서-분리했습니다)에 있습니다.

## 암호를 켠 송출은 페어링 뒤의 별도 과제였습니다

페어링이 성공해도 그 뒤의 전송 보호까지 확인된 것은 아니었습니다. 9월 13일 측정 당시 플러그인의 기본 인증 서버 주소는 HTTP였고, PR #179 본문도 「passphrase가 평문 HTTP로 오간다」고 적었습니다. 그 측정은 passphrase를 끈 채(`send_passphrase=false`)였습니다. 로컬 MediaMTX에 송출 암호가 설정돼 있지 않아, 암호를 보내면 수신부가 연결을 끊었기 때문입니다.

기본 주소는 9월 30일 커밋 [`59fb8822`](https://github.com/3K-PokeClip/PokeClip-mono/commit/59fb8822)에서 HTTPS로 바뀌었고, PR #179는 그 상태로 10월 1일 머지됐습니다(`4aab73df`). 옛 HTTP 주소는 예전 설정 파일을 알아보는 상수로만 남았습니다. 지금 develop의 기본 주소는 두 환경 모두 HTTPS이고, `send_passphrase` 기본값은 `true`입니다([`constants.hpp` 35–37행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/constants.hpp#L35-L37) · [`config.hpp` 23행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/config.hpp#L23)). 운영 수신부가 송출마다 스트림 키를 판정하고 그 계정의 passphrase를 돌려주는 응답기는 10월 25일 [PR #392](https://github.com/3K-PokeClip/PokeClip-mono/pull/392)로 들어갔습니다. 11월 운영 송출에서 passphrase가 실제로 쓰였는지는 확인 기록이 없습니다.

짧은 코드로 입력을 한 번으로 줄이면, 그 코드가 버텨야 할 조건이 서버로 옮겨 갑니다. 비슷한 연결을 설계한다면 길이 · 만료 · 시도 제한을 한 묶음으로 정하고, 그 제한이 프록시 뒤에서도 요청자마다 갈리는지와 기록을 얼마나 남길지까지 함께 확인하십시오. 코드가 송출 설정을 무사히 건넸는지와, 그 설정으로 암호를 켠 송출이 되는지는 따로 재야 합니다.

## 측정 조건

- 9월 13일 연동(PR #179): macOS, OBS 32.2.2, 로컬 Docker Compose의 Auth와 MediaMTX, `send_passphrase=false`. 팀원이 측정했습니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다. 410 · 429 · 404와 동시 교환은 실기 연동이 아니라 Auth 시험으로 확인한 범위입니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #179](https://github.com/3K-PokeClip/PokeClip-mono/pull/179) — OBS 플러그인 첫 판과 독의 페어링, 9월 13일 실측(2026-10-01 머지 `4aab73df`)
- [PR #392](https://github.com/3K-PokeClip/PokeClip-mono/pull/392) — 운영 송출 인증 응답기(2026-10-25 머지) · 커밋 [`59fb8822`](https://github.com/3K-PokeClip/PokeClip-mono/commit/59fb8822) — 플러그인 기본 주소 HTTPS(2026-09-30)
- PokeClip-mono develop `825a3dfe` — [`PairingCodeService.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/pairing/PairingCodeService.java) · [`StreamKeyExceptionHandler.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/java/com/pokeclip/auth/streamkey/api/StreamKeyExceptionHandler.java#L38-L43) · [`auth/application.yml`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/application.yml#L134-L352) · [`prod/platform/services.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/services.tf#L76-L81) · [`obs-plugin/src/constants.hpp`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/constants.hpp#L35-L37) · [`obs-plugin/src/config.hpp`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/obs-plugin/src/config.hpp#L23)
- PokeClip-mono 시험 — [`PairingCodeExchangeTest.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/test/java/com/pokeclip/auth/streamkey/api/PairingCodeExchangeTest.java) · [`RetentionCleanerPairingCodesTest.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/test/java/com/pokeclip/auth/retention/RetentionCleanerPairingCodesTest.java)
- IETF, [RFC 8628 OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628) · Douglas Crockford, [Base32](https://www.crockford.com/base32.html) · Spring Boot, [Running Behind a Front-end Proxy Server](https://docs.spring.io/spring-boot/how-to/webserver.html#howto.webserver.use-behind-a-proxy-server)
- [본방 인코더를 SRT와 나눠 쓰자 GOP와 종료가 묶였습니다](/posts/0-to-1/pokeclip-obs-shared-encoder-srt/) — passphrase를 주소 밖으로 넘긴 구조
- 팀 내부 결정 기록(비공개) — 7월 24일 스트림 키 형식 · 페어링 코드 값

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 29쪽](/portfolio/2026-10-15-v2/full.pdf#page=29)
