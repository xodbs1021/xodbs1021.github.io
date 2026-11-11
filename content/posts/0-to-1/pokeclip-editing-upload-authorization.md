---
title: "편집자와 방송자를 나누려던 업로드 권한은 하나로 합쳐졌습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: 2026-11-12T02:20:00+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "Authorization", "YouTube", "Design"]
description: "7월에는 편집자의 YouTube 업로드를 편집 · 직접 업로드 · 자동 업로드 세 권한과 방송자의 승인 대기함으로 나누는 설계를 냈습니다. 팀은 8월 30일 승인 게이트를 두지 않기로 했고 10월 22일 방송자와 편집자의 권한을 같게 정했습니다. 지금 업로드는 누가 요청하든 채널 주인의 토큰으로 비공개 · 이어 올리기로 나가고, 대가는 방송자가 편집자의 게시를 미리 막을 수 없다는 점입니다."
draft: false
portfolio_cases: [11]
portfolio_pages: [29]
portfolio_edition: "2026-10-15-v2"
---

PokeClip에서 방송자는 편집자를 초대해 클립 편집을 맡깁니다. 7월에 저는 편집자의 YouTube 업로드를 편집 · 직접 업로드 · 자동 업로드 세 권한으로 나누고, 직접 업로드 권한이 없는 편집자의 업로드는 방송자의 승인 대기함으로 보내는 설계를 냈습니다. 편집을 맡겨도 채널 게시 결정은 방송자에게 남기려는 것이었습니다. 팀은 8월 30일 승인 게이트를 두지 않기로 했고, 10월 22일에는 방송자와 편집자의 권한이 같다고 정했습니다. 지금 코드에서 업로드는 누가 요청하든 채널 주인의 YouTube 토큰으로, 기본 비공개 · 이어 올리기로 나갑니다. 그 대가로 방송자는 편집자의 게시를 미리 막을 수 없습니다.

7월 권한 설계는 제가 냈습니다. 8월 26일 첫 권한 코드와 8월 30일 「승인 게이트 없음」은 팀원의 제안을 팀이 받아들인 결정이고, 10월 22일 두 권한을 같게 둔 것도 팀원의 제안입니다. 코어 서비스와 업로드 일꾼은 팀원이 구현했습니다.

## 업로드는 요청한 사람이 아니라 채널 주인의 토큰으로 나갑니다 {#요청한-사람과-업로드할-채널의-소유자는-다릅니다}

YouTube에 영상을 올리려면 채널 주인이 동의한 OAuth 토큰이 있어야 합니다([YouTube Data API 인증 문서](https://developers.google.com/youtube/v3/guides/authentication)). 편집자를 채널 관리자로 붙이는 대신 권한은 서비스 안에서 판정하고, 업로드는 방송자가 연결해 둔 토큰으로 서버가 실행합니다. 편집자는 자기 구글 계정으로 로그인만 하고 자기 채널을 연결할 필요가 없으며, 방송자의 토큰을 받지도 않습니다.

업로드 일꾼은 업로드 줄에 적힌 채널 주인의 번호로 Auth에서 토큰을 받습니다([`UploadProcessor.java` 147행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/upload/src/main/java/com/pokeclip/upload/work/UploadProcessor.java#L147)). 영상은 편집자의 요청이 YouTube 비공개 영상이 되기까지의 길입니다. 흐려지는 갈래가 7월 설계의 승인 대기함입니다.

{{< motion scene="UploadRequestPath" id="fig-upload-path" kind="개념도" caption="편집자의 요청은 clip 서버를 거쳐 렌더와 업로드 일꾼으로 가고, 업로드 일꾼은 Auth에서 채널 주인의 토큰을 받아 YouTube에 비공개로 올립니다. 7월 설계의 승인 대기함 갈래는 만들지 않아 흐려집니다. 단계 길이는 설명용입니다." >}}

요청한 사람과 토큰의 주인이 다르다는 점은 7월 설계와 지금 코드가 같습니다. 달라진 것은 그 사이에서 누가 무엇을 허락받아야 하느냐였습니다.

## 7월 설계는 업로드를 편집 · 직접 · 자동 세 권한으로 나눴습니다 {#직접-할-수-없는-업로드를-자동으로-허용하지-않습니다}

7월 20일 설계는 행위 사이의 종속을 먼저 정했습니다. 자동 업로드는 사람의 검토 없이 나가는 권한이라 직접 업로드보다 위에 두었고, 자동 실행의 범위를 바꾸는 템플릿 수정은 방송자에게만 남겼습니다.

| 행위 | 7월 설계의 조건 | 지금 코드 |
|---|---|---|
| 클립 편집 | 기본 권한 | 초대된 편집자면 가능 |
| 직접 업로드 | 토글 ① | 초대된 편집자면 가능 |
| 원클릭 자동 업로드 | 토글 ②, ①이 있어야 켤 수 있음 | 권한 토글 없음 |
| ① 없이 업로드 시도 | 방송자의 승인 대기함으로 | 승인 대기함 없음 |

권한 없는 편집자의 업로드를 막지 않고 대기함에 남기려 한 것은, 결과물을 서비스 밖에서 다시 전달하는 일을 없애면서 게시 결정은 방송자에게 두려는 것이었습니다. 이 표의 가운데 줄이 지금은 하나도 코드에 없습니다.

## 승인 대기함은 8월 30일 결정으로 만들지 않았습니다 {#요청을-막는-대신-대기-상태를-두는-비용을-택했습니다}

8월 4일 Auth를 구현하던 팀원이 이의를 냈습니다. 권한 등급을 두지 말고, 초대된 편집자는 그 방송자에 대해 전부 할 수 있게 하자는 것이었습니다. 8월 26일의 첫 권한 코드는 방송 자격을 한 자리에서 판정하면서 방송자와 편집자를 가르지 않았습니다(커밋 [`256856a7`](https://github.com/3K-PokeClip/PokeClip-mono/commit/256856a7)). 8월 30일 팀은 승인 게이트를 두지 않기로 했고, clip 서버 문서는 「승인 상태 칸은 만들지 않는다(… 승인 게이트 없음 — 편집자 · 스트리머 둘 다 업로드한다)」고 적었습니다([`services/README.md` 2851–2852행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L2851-L2852)).

근거는 「누가 매일 쓰나」였습니다. 돈을 내는 쪽(방송자)과 매일 쓰는 쪽(전담 편집자)이 다르고, 방송자만 할 수 있게 하면 방송자가 매번 대신 눌러 줘야 해서 편집자를 두는 의미가 없어진다는 것입니다. 좁은 권한에서 넓혀 가는 편이 안전해 보이지만, 여기서는 좁게 시작하면 제품이 돌지 않는다고 봤습니다. 응답의 `relation` 칸은 「내 방송」과 「내가 편집하는 방송」을 다르게 그리는 표시일 뿐 권한이 아닙니다([1749–1760행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L1749-L1760)). 10월 22일에는 이 방침이 「권한이 같다」는 결정으로 굳었고, 방송 자격 판정 코드의 주석에 남았습니다([`BroadcastAccessGuard.java` 17–19행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/delegation/BroadcastAccessGuard.java#L17-L19)).

포트폴리오 요약(2026-10-15판) 29쪽은 「권한 없는 업로드 요청은 방송자의 승인 대기함으로 보내도록 설계했습니다」라고 적었습니다. 그 시점에는 이미 8월 30일 결정으로 승인 대기함을 만들지 않기로 한 뒤였고, 그 문장은 7월 설계를 옮긴 것입니다.

## 비공개 기본과 이어 올리기는 코드에 들어갔습니다 {#기본-비공개-업로드와-재개-가능한-전송을-설계했습니다}

7월 설계에서 승인 대기함 말고 남은 두 가지, 비공개 기본과 이어 올리기는 코드에 들어갔습니다. 업로드 일꾼은 9월 26일 첫 판부터 YouTube의 이어 올리기 규약을 씁니다(커밋 [`ba94ecdd`](https://github.com/3K-PokeClip/PokeClip-mono/commit/ba94ecdd)). 한 업로드 주소가 바이트를 다 받았을 때만 영상이 생기므로, 주소에 물어 「덜 받았다(308)」가 오면 영상이 없다는 증거이고 「다 받았다(200 · 201)」면 영상 번호가 옵니다([`ResumableUploader.java` 24–33행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/upload/src/main/java/com/pokeclip/upload/youtube/ResumableUploader.java#L24-L33), [YouTube 이어 올리기 문서](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)). 공개 범위는 따로 정하지 않으면 비공개입니다([`V213__upload_requests_and_upload_metadata.sql` 21행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/resources/db/migration/V213__upload_requests_and_upload_metadata.sql#L21)).

7월에 「승인과 전송은 다르다」고 적어 둔 구분은 승인 대신 「결과를 모름」 상태로 남았습니다. 강조한 `checking`이 그 상태입니다. 올라갔는지 모르면 자동으로 다시 올리지 않고, 사람이 채널을 보고 영상 번호를 넣거나 「올라가지 않았다」고 확인해 풉니다. 편집자도 풀 수 있습니다([2734–2741행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L2734-L2741)).

```mermaid {#fig-upload-states kind="재구성" caption="보관함 한 줄의 상태. 편집본의 지금 판으로 만든 영상이 없으면 editing, 렌더 중이면 rendering, 완성이면 rendered(업로드 대기)이고, 업로드 중이면 uploading, 올라갔는지 모르면 checking, 올렸으면 uploaded입니다. 업로드가 확실히 실패하거나 사람이 올라가지 않았다고 확인하면 rendered로 돌아갑니다. 승인 상태는 없습니다. PokeClip-mono develop 825a3dfe의 services/README.md 「보관함 목록」 상태 표 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L2838-L2852"}
stateDiagram-v2
  accTitle: 보관함 한 줄의 업로드 상태
  accDescr: editing에서 렌더를 주문하면 rendering, 완성되면 rendered, 실패하면 failed다. rendered에서 업로드를 시작하면 uploading이 되고, 올라가면 uploaded, 결과를 모르면 checking, 확실히 실패하면 rendered로 돌아간다. checking은 자동으로 다시 올리지 않고 사람이 영상 번호를 넣거나 올라가지 않았다고 확인해 푼다. 편집본을 다시 고치면 editing으로 돌아간다.
  direction TB
  editing --> rendering: 렌더 주문
  rendering --> rendered: 완성
  rendering --> failed: 실패
  failed --> rendering: 다시 주문
  rendered --> uploading: 업로드 시작
  uploading --> uploaded: 영상 번호 받음
  uploading --> checking: 결과 모름
  uploading --> rendered: 확실히 실패
  checking --> uploaded: 사람이 영상 번호 입력
  checking --> rendered: 사람이 안 올라감 확인
  rendered --> editing: 편집본 수정
  classDef accent fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  class checking accent
```

자동 업로드도 권한과 상관없는 모양으로 들어갔습니다. 10월 8일부터(커밋 [`3de48385`](https://github.com/3K-PokeClip/PokeClip-mono/commit/3de48385)) 「영상 만들기」를 누를 때 업로드 정보를 함께 적으면, 렌더가 성공하는 순간 clip 서버가 스스로 업로드를 시작합니다([`services/README.md` 2539–2545행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L2539-L2545)). 사람이 렌더 끝을 기다렸다 다시 누르지 않는다는 뜻이고, 7월의 토글 ②처럼 따로 허락받는 권한은 아닙니다. 편집할 수 있는 사람이면 누구나 이렇게 주문할 수 있습니다.

## 권한을 합친 대가는 방송자가 게시를 미리 막을 수 없다는 점입니다

권한을 하나로 합치자 7월 설계가 막으려던 경우가 열렸습니다. 초대된 편집자는 방송자의 확인 없이 방송자의 채널에 업로드할 수 있습니다. 기본은 비공개이지만 편집자가 공개 범위를 `public`으로 고를 수도 있습니다. 방송자에게 남은 통제는 편집자 위임을 거두는 것과, 올라간 영상을 채널에서 내리는 것입니다. 둘 다 일이 일어난 뒤의 통제입니다.

이 대가를 받아들인 근거는 위 절의 「누가 매일 쓰나」였고, 「가르고 싶어지면 그때 새 규칙을 얹는다」는 조건도 같이 남았습니다. 실제 방송자와 편집자가 이 구조를 어떻게 썼는지, 원치 않는 게시가 있었는지는 확인한 기록이 없습니다.

권한을 설계할 때는 권한의 개수보다 소유자가 따로 통제하고 싶은 결정이 무엇인지부터 적으십시오. 다만 그 통제가 매일 쓰는 사람의 일을 막는다면, 사전 승인 대신 기본값(비공개)과 사후 통제(위임 회수)로 대신할 수 있는지도 같이 견줘야 합니다. 이 사례에서 팀은 후자를 골랐습니다.

## 출처

- PokeClip-mono develop `825a3dfe` — [`BroadcastAccessGuard.java` 17–19행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/delegation/BroadcastAccessGuard.java#L17-L19) · [`services/README.md` 「OWNER와 EDITOR를 가르지 않는다」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L1749-L1760) · [같은 문서 「영상 만들기」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L2539-L2545) · [같은 문서 보관함 상태 표](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L2838-L2852) · [`UploadProcessor.java` 147행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/upload/src/main/java/com/pokeclip/upload/work/UploadProcessor.java#L147) · [`ResumableUploader.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/upload/src/main/java/com/pokeclip/upload/youtube/ResumableUploader.java#L24-L33) · [`V213__upload_requests_and_upload_metadata.sql`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/resources/db/migration/V213__upload_requests_and_upload_metadata.sql#L21)
- PokeClip-mono 커밋 [`256856a7`](https://github.com/3K-PokeClip/PokeClip-mono/commit/256856a7) — 방송 자격 판정을 한 자리로, 주인과 편집자를 가르지 않음(2026-08-26) · [`ba94ecdd`](https://github.com/3K-PokeClip/PokeClip-mono/commit/ba94ecdd) — 업로드 일꾼 첫 판(2026-09-26) · [`3de48385`](https://github.com/3K-PokeClip/PokeClip-mono/commit/3de48385) — 업로드 정보 · 렌더 성공 뒤 자동 업로드(2026-10-08)
- Google, [YouTube Data API — Implementing OAuth 2.0 Authorization](https://developers.google.com/youtube/v3/guides/authentication) · [Resumable Uploads](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
- 팀 내부 결정 기록(비공개) — 7월 20일 계정 · 권한 설계, 8월 4일 이의, 8월 30일 승인 게이트 없음, 10월 22일 권한 같음

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 29쪽](/portfolio/2026-10-15-v2/full.pdf#page=29)
