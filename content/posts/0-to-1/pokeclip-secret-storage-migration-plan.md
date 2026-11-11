---
title: "SRT 암호를 PG 밖 Secrets Manager로 옮겼습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: 2026-11-12T02:20:00+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "Security", "AWS", "Design"]
description: "SRT 송출의 streamid는 해시로 대조하고, 원문이 다시 필요한 passphrase는 PostgreSQL(PG) 밖 AWS Secrets Manager에 두기로 7월에 정했습니다. 개발 서버는 10월 6일 읽기를 옮기고 2주 동안 PG 사본을 둔 뒤 10월 22일 사본을 지웠고, 운영은 처음부터 Secrets Manager였습니다. 비밀은 Auth만 읽고 수신부는 응답기를 거쳐 받습니다. 방송 플랫폼 OAuth 토큰은 아직 PG에 암호화해 둡니다."
draft: false
portfolio_cases: [9]
portfolio_pages: [29]
portfolio_edition: "2026-10-15-v2"
---

SRT 송출 연결에는 값이 둘 들어갑니다. 어느 방송 경로에 보내는지 밝히는 streamid와, 영상을 암호화하는 열쇠를 감싸는 passphrase입니다. streamid는 받은 값이 맞는지 대조만 하면 되므로 해시로 충분합니다. passphrase는 수신부가 연결마다 원문을 써야 해서 해시로 둘 수 없습니다. 7월 23일 passphrase 원문은 PostgreSQL(이하 PG) 밖 AWS Secrets Manager에 두고 PG에는 참조만 남기기로 정했지만, 처음 구현된 Auth는 원문을 PG 표에 애플리케이션 키로 암호화해 두고 있었습니다. 개발 서버의 Auth는 10월 6일 읽기를 Secrets Manager로 옮겼고, 2주 동안 PG 사본을 둔 뒤 10월 22일 사본과 이행 도구를 지웠습니다. 운영은 처음부터 Secrets Manager였고, 그 비밀은 Auth만 읽습니다.

저장 위치는 제가 7월 23일 정했습니다. 10월 이전 설계와, 개발 서버 역할 정책 · 설정 파일 같은 선행 조건, 10월 7일 지연 재측정은 제가 AI와 함께 했습니다. 이전 구현은 팀원이 했습니다([PR #218](https://github.com/3K-PokeClip/PokeClip-mono/pull/218) · [PR #303](https://github.com/3K-PokeClip/PokeClip-mono/pull/303)).

## streamid는 해시로 대조하고 passphrase는 원문을 다시 읽어야 했습니다 {#대조할-식별자와-다시-읽을-비밀을-나눴습니다}

streamid는 `#!::r=<26자 토큰>,m=publish` 꼴의 공개 식별자로 다룹니다. SRT는 암호화가 성립하기 전 핸드셰이크에서 수신부가 streamid를 읽어 경로를 고르므로, 이 값은 평문으로 오간다고 봐야 합니다. 그래서 사용자명 · 이메일을 넣지 않고, DB에는 토큰의 SHA-256 해시만 둡니다.

passphrase는 회선으로 보내지 않습니다. 송신 쪽이 영상 암호화 키를 passphrase에서 만든 열쇠로 감싸 보내고, 수신 쪽은 자기가 가진 passphrase로 그것을 풀 수 있는지로 상대를 확인합니다([SRT 소켓 옵션 문서 `SRTO_PASSPHRASE`](https://github.com/Haivision/srt/blob/master/docs/API/API-socket-options.md#srto_passphrase)). 대조가 아니라 풀기이므로, 수신 쪽은 연결마다 같은 원문을 가지고 있어야 합니다.

| 데이터 | 필요한 연산 | 지금 저장 위치 |
|---|---|---|
| streamid 토큰 | 받은 값과 대조 | PG `stream_keys.streamid_hash`(SHA-256) |
| 계정 · 폐기 상태 | 조회와 변경 | PG `stream_keys` |
| passphrase | 연결마다 원문 사용 | Secrets Manager |
| 비밀 이름 | 허용된 비밀로 연결 | PG `stream_keys.passphrase_ref` |

Auth의 스키마 주석도 「passphrase도 stream_token 원문도 여기 없다」고 적습니다([`V104__create_stream_keys.sql` 4–8행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/db/migration/V104__create_stream_keys.sql#L4-L8)). streamid만 알아서는 송출할 수 없고, passphrase까지 있어야 합니다.

## 공용 암호와 PG 봉투 암호화 대신 Secrets Manager를 골랐습니다 {#공용-비밀은-단순하지만-폐기의-영향이-너무-컸습니다}

7월 23일 네 안을 견줬습니다.

| 대안 | 판단 |
|---|---|
| 모든 방송자가 passphrase 하나를 공유 | 하나가 새면 전체가 열리고 한 계정만 폐기할 수 없어 기각 |
| passphrase를 PG에 평문으로 | DB 덤프 하나로 모든 송출 경로가 열려 기각 |
| PG에 KMS 봉투 암호화 값으로 | 성립. 조회 지연은 낮을 수 있지만 교체 · 감사 기능이 약함 |
| Secrets Manager에 원문, PG에는 이름만 | 채택 |

고른 이유는 DB를 읽는 권한과 방송 비밀을 읽는 권한을 가르는 것이었습니다. 비밀을 DB 밖에 두면, DB에 접속할 수 있는 서버라도 IAM 역할에 그 비밀 이름이 허용돼 있지 않으면 원문을 읽지 못합니다([Secrets Manager 접근 제어](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html)). 다만 이 구분은 저장소를 바꾸는 것만으로 생기지 않습니다. 역할이 아무 비밀이나 읽을 수 있으면 목적을 이루지 못하므로, 역할 정책을 비밀 이름 접두 하나로 묶었습니다(아래 「운영」 절).

## 10월 6일 개발 서버의 읽기를 옮기고 2주 동안 PG 사본을 뒀습니다 {#현재-pg-읽기-경로를-바꾸는-작업이-남아-있습니다}

10월 계정별 방송 연결을 설계하면서, 실제 Auth가 passphrase를 PG `secrets` 표에 넣고 있음을 확인했습니다. 원문은 애플리케이션 키 하나(AES-256-GCM)로 암호화돼 있었고, 같은 표에 YouTube · 치지직 OAuth 토큰도 있었습니다. 7월 결정이 코드에 들어가지 않은 상태였습니다.

이전은 읽기 경로를 끊지 않는 쪽으로 설계했습니다. 스트림 키를 읽고 쓰는 두 자리만 따로 표시해 설정 값 하나(`postgres` 또는 `aws`)로 저장소를 고르고, OAuth 토큰은 그대로 PG에 둡니다. 이행 도구가 두 저장소의 빈 쪽을 채우고 값이 다르면 덮어쓰지 않고 결함으로 보고합니다. Secrets Manager 호출은 연산마다 3초, 호출마다 1초의 시한을 둡니다. 개발 서버 역할에 스트림 키 이름 접두로 한정한 Secrets Manager 정책을 붙이고 설정 파일에 세 줄을 넣는 일이 머지보다 먼저여야 했습니다. 순서가 뒤집히면 자동 배포가 설정 값을 채우지 못해 Auth가 뜨지 않기 때문입니다(PR #218 본문 「머지 전 조건」).

PR #218은 10월 6일 17시 8분에 머지됐고, 같은 날 개발 서버의 Auth가 `type=AWS`로 떴습니다. 이후 2주 동안 Secrets Manager가 원본이고 PG에는 되돌릴 때를 위한 사본만 남았습니다. 포트폴리오 요약(2026-10-15판) 29쪽은 이 일을 「옮기고 DB에는 참조를 남기는 방식으로 변경할 예정이며, 현재 전환을 준비 중」이라고 적었습니다. 그 시점에도 개발 서버의 읽기는 이미 Secrets Manager로 옮겨 가 있었고, 남은 일은 병행을 끝내는 것이었습니다.

읽기를 옮기면 송출 연결의 접속 경로가 Secrets Manager 호출만큼 길어집니다. 응답기가 Auth의 판정을 기다리는 시한은 1.125초였습니다. 10월 7일 개발 서버에서 이를 다시 쟀고, 가장 느린 값은 Auth를 재시작한 직후 첫 호출의 1.036초로 시한 안이었습니다(팀 내부 실험 기록 기준 비공개 실측). 그래서 Auth의 시한은 바꾸지 않았습니다.

10월 22일 [PR #303](https://github.com/3K-PokeClip/PokeClip-mono/pull/303)이 병행을 끝냈습니다. 이행 도구를 지웠고, PG 사본은 그 PR이 정한 머지 전 절차에서 지웠습니다. 이제 `aws`에서 `postgres`로 되돌리는 길은 없습니다. PG에 사본도 도구도 없기 때문입니다.

```mermaid {#fig-secret-timeline kind="재구성" caption="passphrase 저장 위치의 날짜순 변화(SM은 Secrets Manager). 개발 서버는 10월 6일 읽기를 옮기고 10월 22일 PG 사본을 지웠고, 운영은 처음부터 Secrets Manager였습니다. 10월 25일 운영 응답기 PR이 머지됐고 11월 3일 v1.0.0이 출시됐습니다. 응답기 모드의 운영 반영 시점은 확인 기록이 없습니다. PR #218 · #303 · #392 · #466과 prod/platform Terraform 정의 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/pull/303"}
flowchart TB
  accTitle: passphrase 저장 위치의 변화
  accDescr: 7월 23일 Secrets Manager에 원문, PG에 이름만 두기로 정했다. 개발 서버는 10월 초 PG secrets 표에 암호화해 두고 있었고, 10월 6일 PR 218로 Secrets Manager에서 읽기 시작해 2주 동안 PG 사본을 두었으며, 10월 22일 PR 303으로 사본과 이행 도구를 지웠다. 운영은 처음부터 Secrets Manager였고, 10월 25일 응답기 PR 392가 머지됐으며 11월 3일 v1.0.0이 출시됐다.
  D["7월 23일 결정<br/>원문은 SM에"]
  D -->|"개발 서버"| P["10월 초<br/>PG 표에 암호화"]
  P --> M["10월 6일<br/>#218 읽기 이전"]
  M --> W["2주 병행<br/>PG는 사본만"]
  W --> E["10월 22일<br/>#303 사본 삭제"]
  D -->|"운영"| O["처음부터 SM"]
  O --> R["10월 25일<br/>#392 응답기"]
  R --> V["11월 3일<br/>v1.0.0 출시"]
  style M fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

## 운영은 처음부터 Secrets Manager였고 비밀은 Auth만 읽습니다

운영 Terraform 정의는 Auth의 스트림 키 저장소를 처음부터 `aws`로 둡니다. 옮겨 올 PG 데이터가 없어 옛 암호를 지우는 곳도 Secrets Manager 하나입니다([`prod/platform/services.tf` 81–86행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/services.tf#L81-L86) · [`prod/platform/README.md` 208–209행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/README.md?plain=1#L208-L209)). Auth 작업 역할은 스트림 키 접두 아래 비밀에만 만들기 · 읽기 · 쓰기 · 지우기를 받습니다([`task_policies.tf` 26–31행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/task_policies.tf#L16-L31)). 그 접두는 와일드카드를 쓸 수 없게 검사합니다([`variables.tf` 281–292행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/variables.tf#L281-L292)).

미디어 서버는 이 접두를 읽지 못합니다. 미디어 서버 역할이 읽을 수 있는 비밀은 이름을 하나씩 적은 CDN 비밀 · 점검용 시험 키 · 런타임 비밀뿐입니다([`modules/media_host/iam.tf` 51–60행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/media_host/iam.tf#L51-L60)). 수신부가 passphrase를 받는 길은 영상과 같습니다. 강조한 칸이 원문을 읽는 유일한 자리입니다.

{{< motion scene="SecretPathOneConnection" id="fig-secret-path" kind="개념도" caption="송출 연결 하나에서 MediaMTX는 응답기에 묻고, 응답기는 Auth에 스트림 키 판정을 부릅니다. Auth는 PG에서 streamid 해시로 행을 찾아 비밀 이름을 얻고, Secrets Manager에서 원문을 읽어 돌려줍니다. PG에는 해시와 이름만 있습니다. 단계 길이는 설명용입니다." >}}

MediaMTX가 송출 연결마다 같은 상자의 응답기에 묻고, 응답기가 Auth에 판정을 청해 허용이면 그 계정의 passphrase를 받아 넘깁니다. 이 구성은 10월 25일 [PR #392](https://github.com/3K-PokeClip/PokeClip-mono/pull/392)로 들어갔습니다. 그 PR은 머지만으로 상자의 동작을 바꾸지 않고, 운영 단계에서 응답기 모드로 바꾸게 돼 있습니다. 7월 설계는 미디어 서버가 Secrets Manager를 직접 읽는다고 적었지만, 그 길은 만들지 않았습니다. 응답기를 이렇게 붙이기 전에는 경로 조정자가 비밀 이름 목록을 받아 MediaMTX 경로를 미리 맞추는 설계도 있었고, 그 설계와 기각 이유는 [경로 조정 설계 글](/posts/0-to-1/pokeclip-path-reconciler-design-history/)에 있습니다. 수신부에서 사용자별 passphrase를 고르는 방식의 대안은 [MediaMTX 사용자별 SRT 암호 제안](/posts/open-source-analysis/mediamtx-user-srt-passphrase-boundaries/)에 있습니다.

## 방송 플랫폼 OAuth 토큰은 PG에 암호화해 둡니다

YouTube · 치지직 OAuth 토큰은 이번 이전 범위 밖이었고, 지금도 PG `secrets` 표에 AES-256-GCM으로 암호화해 둡니다. 그래서 스트림 키를 Secrets Manager로 옮긴 뒤에도 그 암호화 키(`SECRET_STORE_KEY`)는 Auth에 꼭 있어야 합니다([`auth/application.yml` 190–197행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/application.yml#L190-L197)). DB 덤프와 그 키가 함께 새면 토큰이 열립니다. 7월 결정 문서에는 「YouTube 토큰 원문을 Secrets Manager로 뺀 것과 같은 원칙」이라는 근거가 있었지만, 그것은 계획이었고 구현된 적이 없습니다.

비밀을 DB 밖으로 옮길 때는 저장소를 바꾼 날보다, 읽는 주체가 하나로 줄어든 날과 옛 사본이 사라진 날을 따로 기록하십시오. 이 사례에서 그 날은 각각 10월 6일과 10월 22일이었고, 그 사이에는 되돌릴 길과 새 저장소가 함께 있었습니다.

## 측정 조건

- 10월 7일 지연 재측정: 개발 미디어 서버에서 개발 Auth의 스트림 키 판정 API를 직접 불렀고, Auth 재시작 직후 첫 호출을 포함했습니다. 가장 느린 값 1.036초, 응답기의 판정 대기 시한 1.125초. 팀 내부 실험 기록 기준 비공개 실측입니다. 재시작 직후 첫 호출은 표본이 하나입니다.
- 코드와 Terraform 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일) 기준입니다. 운영 Terraform 정의의 적용 상태는 이 글에서 확인하지 않았습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #218](https://github.com/3K-PokeClip/PokeClip-mono/pull/218) — 스트림 키 암호 Secrets Manager 이행(2026-10-06 머지, 팀원) · [PR #303](https://github.com/3K-PokeClip/PokeClip-mono/pull/303) — 병행 종료(2026-10-22 머지, 팀원)
- [PR #392](https://github.com/3K-PokeClip/PokeClip-mono/pull/392) — 운영 송출 인증 응답기(2026-10-25 머지) · [PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466) — v1.0.0 출시 이미지(2026-11-03)
- PokeClip-mono develop `825a3dfe` — [`V104__create_stream_keys.sql`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/db/migration/V104__create_stream_keys.sql#L4-L8) · [`auth/application.yml`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/auth/src/main/resources/application.yml#L190-L200) · [`prod/platform/services.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/services.tf#L81-L86) · [`prod/platform/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/README.md?plain=1#L204-L210) · [`task_policies.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/task_policies.tf#L16-L31) · [`variables.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/prod/platform/variables.tf#L281-L292) · [`modules/media_host/iam.tf`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/media_host/iam.tf#L51-L60)
- Haivision, [SRT API Socket Options — `SRTO_PASSPHRASE`](https://github.com/Haivision/srt/blob/master/docs/API/API-socket-options.md#srto_passphrase) · AWS, [Authentication and access control for AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html)
- [부분 목록으로 방송을 지우지 않기: 폐기한 경로 조정 설계에서 남은 판단](/posts/0-to-1/pokeclip-path-reconciler-design-history/) · [사용자별 SRT 암호를 제안하며 인증 범위와 대기 비용을 함께 살펴봤습니다](/posts/open-source-analysis/mediamtx-user-srt-passphrase-boundaries/)
- 팀 내부 결정 · 실험 기록(비공개) — 7월 23일 스트림 키 저장 위치, 10월 6일 이행 선행 조건, 10월 7일 지연 재측정

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 29쪽](/portfolio/2026-10-15-v2/full.pdf#page=29)
