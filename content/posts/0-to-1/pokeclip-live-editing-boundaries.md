---
title: "방송 중 클립을 위해 라이브·되감기·편집 경로를 나눴습니다"
date: 2026-10-15T11:27:08+09:00
lastmod: 2026-11-11T14:14:52+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "Architecture", "Streaming", "MediaMTX", "HLS"]
description: "방송 중 지난 장면을 원하는 소리로 클립하려고 녹화 조각 하나를 원본(영상 1 · 소리 6), 되감기 재포장본(영상 1 · 소리 1), DB 장부 한 줄로 나눠 남긴 구조. 편집은 원본을 덮지 않고 레시피로 남겼고, 10월 15일 진행 중이던 되감기 발행 계층은 10월 19일 develop, 11월 3일 첫 출시본 v1.0.0에 들어갔습니다."
draft: false
portfolio_cases: [1]
portfolio_pages: [5]
portfolio_edition: "2026-10-15-v2"
---

PokeClip은 방송을 보는 도중에 지난 장면을 찾아, 배경음악을 뺀 소리처럼 원하는 소리로 클립을 만드는 서비스입니다. 녹화된 4초 조각 하나를 세 곳이 다르게 씁니다. 라이브 시청은 지금 장면을, 되감기는 이미 저장소에 올라간 지난 장면을, 클립 편집은 소리 6개가 따로 남은 원본을 원합니다. 그래서 조각마다 원본 fMP4(영상 1 · 소리 6), 되감기용 재포장본(영상 1 · 소리 1), DB 장부 한 줄을 남기고, 편집 요청은 원본을 덮지 않고 레시피로 남겼습니다. 2026년 10월 15일 진행 중이던 되감기 발행 계층은 10월 19일 develop에 머지됐고([PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289)), 11월 3일 첫 출시본 v1.0.0에 들어갔습니다.

저는 3인 팀에서 전체 구조와 미디어·인프라의 경계를 정했습니다. 어떤 파일을 남기고 어떤 상태가 바뀌어야 다음 단계로 넘기는지가 제 몫이었습니다. Spring 코어와 렌더 일꾼, 웹, OBS 플러그인은 팀원이 주로 구현했고, 미디어 계층의 구현과 실측에는 AI(Claude Code와 Codex)를 썼습니다.

조각은 녹화기(MediaMTX)가 4초마다 닫는 fMP4 파일 하나입니다. 조각은 세션(사이드카가 재생 목록 하나를 여닫는 단위)에, 세션은 사슬(끊긴 송출을 앞 세션에 이어 붙인 묶음)에, 사슬은 회차에 묶입니다. 회차는 시청자가 「방송 한 번」으로 보는 단위입니다([회차 다시보기 글](/posts/projects/pokeclip-round-vod/)).

## 재생하기 쉬운 파일은 편집할 소리를 버렸습니다 {#재생하기-쉬운-파일이-편집하기-좋은-원본은-아니었습니다}

OBS 플러그인은 영상 1개와 소리 6개를 함께 보냅니다. 트랙 0은 시청자가 듣는 종합 믹스이고, 1–5는 소스별 소리입니다([6트랙 입력 계약 글](/posts/0-to-1/pokeclip-six-track-input-contract/)). 소리를 고르는 일은 시청 중이 아니라 클립을 렌더할 때 일어납니다. 시청자는 트랙 0 하나만 들으면 되고, 편집자는 나중에 고를 수 있도록 6개가 모두 남아 있어야 합니다.

| 쓰는 곳 | 읽는 것 | 지켜야 할 조건 |
|---|---|---|
| 라이브 시청 | MediaMTX가 내는 LL-HLS 목록 | 저장·업로드 완료를 기다리지 않음 |
| 되감기 | S3에 올린 재포장본과 사이드카가 발행한 목록 | 업로드가 확인된 조각만 목록에 넣음 |
| 클립 편집 | S3에 올린 원본 fMP4 | 아직 고르지 않은 소리도 남김 |

저장 단계에서 트랙 0만 남기면 재생은 단순해지지만, 음악만 빼고 다시 섞을 재료가 사라집니다. 반대로 6개를 시청 경로에 그대로 두면 시청자가 고르지 않는 트랙까지 목록과 플레이어가 다뤄야 합니다. 그래서 원본은 그대로 두고, 되감기용으로 첫 영상 트랙과 첫 소리 트랙만 남긴 재포장본을 따로 만들었습니다. 재포장은 압축된 미디어를 다시 담기만 하고 다시 인코딩하지 않습니다. 사이드카가 메모리 안에서 만듭니다([`media/README.md` 1358–1362행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1358-L1362)).

영상에서 조각이 들어올 때마다 세 갈래가 다르게 움직입니다. 라이브 목록은 밀리며 옛 조각을 버리고, 되감기 목록은 업로드가 확인된 뒤에만 늘어나고, 편집기는 고른 구간의 6트랙 원본을 끌어옵니다.

{{< motion scene="SegmentThreeWays" id="fig-three-ways" kind="개념도" caption="녹화 조각이 들어올 때마다 라이브 목록은 정해진 창이 밀리며 옛 조각을 버리고, 되감기 목록은 업로드가 확인된 조각만 뒤에 붙이며, 편집기는 고른 구간에 걸친 조각을 영상 1 · 소리 6 원본으로 가져옵니다. 세 갈래의 관계를 보여 주는 설명용 그림이며, 창의 칸 수와 시각 간격은 실제 설정이 아닙니다." >}}

라이브 목록만 조각을 버립니다. 지난 장면을 다시 보거나 자르는 일은 저장소에 남은 조각을 읽습니다.

## 조각마다 원본·재포장본·장부 한 줄을 남겼습니다 {#미디어-서버가-만든-파일에-방송-시간을-붙였습니다}

MediaMTX가 SRT 송출을 받아 조각을 녹화하고, 조각을 닫을 때 훅으로 사이드카에 알립니다. 사이드카는 Go로 짠 우리 계층입니다. 조각마다 장부에 한 줄을 적고, 원본과 재포장본을 각각 S3에 올린 뒤 그 줄의 상태 칸을 바꿉니다([`media/internal/index/ddl.go` 39–56행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/ddl.go#L39-L56)). 그림의 청록 상자가 클립과 되감기가 각각 확인하는 칸입니다.

```mermaid {#fig-segment-outputs kind="개념도" caption="녹화 조각 하나가 남기는 세 가지. 원본 fMP4는 클립 편집이, 트랙 0만 남긴 재포장본은 되감기 목록이 읽습니다. 장부 한 줄은 두 파일의 S3 키와 업로드 상태, 그리고 미디어 시각과 벽시각을 따로 적습니다. develop 825a3dfe의 stream_segments 표에서 칸을 골라 재구성했습니다." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/ddl.go#L39-L56"}
flowchart TB
  accTitle: 녹화 조각 하나가 남기는 것
  accDescr: 녹화 조각 하나(원본 fMP4, 영상 1과 소리 6)가 닫히면 사이드카가 장부 한 줄을 적는다. 그 줄에는 미디어 시각, 벽시각 추정, 길이가 있다. 그다음 원본을 그대로 S3에 올려 s3_key와 upload_state를 채우고, 재포장본(영상 1, 소리 1)을 S3에 올려 playback_s3_key와 playback_upload_state를 채운다. 원본은 클립 편집이, 재포장본은 되감기 목록이 읽는다.
  seg[녹화 조각 하나 · 4초<br/>원본 fMP4 영상 1 · 소리 6]
  seg --> row[장부 한 줄<br/>start_pts_ms 미디어 시각<br/>start_wall_utc 벽시각 추정<br/>duration_ms]
  row --> orig[원본 그대로 S3에<br/>s3_key<br/>upload_state]
  row --> rmx[재포장본 S3에<br/>영상 1 · 소리 1<br/>playback_s3_key<br/>playback_upload_state]
  orig --> clip[클립 편집]
  rmx --> dvr[되감기 목록]
  style orig fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style rmx fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

업로드 상태를 원본과 재포장본에 따로 둔 이유는 두 파일을 읽는 쪽이 다르기 때문입니다. 재포장본 업로드가 실패해도 원본은 클립에 쓸 수 있고, 되감기 목록은 재포장본이 `uploaded`가 된 조각만 넣습니다. 「파일이 생겼다」와 「다음 단계가 읽어도 된다」를 같은 사건으로 보지 않은 것입니다.

시각도 둘을 적습니다. `start_pts_ms`는 조각 안 미디어의 시각이고, `start_wall_utc`는 받는 서버가 추정한 벽시각입니다. 처음에는 벽시각으로 클립 구간을 정했지만, 11월 2일 벽시각의 용도를 화면 표시·라이브 넘김·채팅 정렬로 좁히고 클립·렌더의 정밀 좌표를 미디어 시각으로 옮기기로 정했습니다([시간축 글](/posts/projects/pokeclip-media-timeline-over-wall-clock/)). 그 변경의 클립 쪽 [PR #475](https://github.com/3K-PokeClip/PokeClip-mono/pull/475)와 렌더 쪽 [PR #496](https://github.com/3K-PokeClip/PokeClip-mono/pull/496)은 11월 11일 기준 머지 전 초안입니다.

## 편집 요청은 원본을 덮지 않고 레시피로 남겼습니다

편집기는 구간·출력 비율·소리 트랙별 음량·자막을 JSON 레시피로 저장하고, 렌더 일꾼이 그 레시피대로 원본 조각을 받아 새 파일을 만듭니다. 원본은 렌더가 몇 번 돌아도 바뀌지 않습니다. 되감기 재포장은 압축된 데이터를 다시 담는 일이고, 최종 렌더는 화면을 자르고 소리를 다시 섞는 재인코딩입니다. 둘을 나눠야 「되감기에 쓸 수 있다」와 「클립이 완성됐다」를 다른 상태로 셀 수 있습니다. 레시피의 칸과 렌더 단계는 [편집 레시피 글](/posts/0-to-1/clip-edit-recipe-render-boundary/)에 있습니다.

## 61파일과 61행을 맞춰 보고 실패 조건은 따로 나눴습니다 {#경로를-나눈-만큼-파일-사이의-정합성을-확인해야-했습니다}

파일 종류를 늘리면 파일과 장부가 어긋날 자리도 늘어납니다. 2026년 8월 3일 실제 OBS로 6트랙을 보낸 멀티오디오 시험에서 녹화 파일 61개와 장부 61행이 같았고, 원하는 트랙을 골라 꺼낼 수도 있었습니다. 이 시험은 AI가 자동으로 돌렸습니다. 수치와 조건은 [멀티오디오 검증 글](/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/)에 있습니다.

그 대조가 보여 주는 것은 한 실행에서 녹화와 장부가 대응했다는 데까지입니다. 업로드가 실패한 뒤 다시 올리기, 재포장본의 시각 연속성, 되감기 탐색은 실패 조건이 서로 달라 따로 다뤘습니다. 목록 발행 경합은 [발행 정합성 글](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/)에, 클립 구간에 걸친 조각 찾기는 [구간 겹침 글](/posts/0-to-1/pokeclip-segment-overlap-contract/)에 있습니다.

## 10월 15일 진행 중이던 발행 계층은 11월 운영에 들어갔습니다

포트폴리오 요약(2026-10-15판) 5쪽의 「되감기 발행 계층과 dev-media 연동은 진행 중」은 10월 15일 기준입니다. 그 뒤 상태는 이렇습니다.

| 날짜 | 상태 |
|---|---|
| 10월 19일 | 되감기 목록 S3 발행 계층 [PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289) develop 머지. 같은 날 dev 미디어 서버에 계정별 방송을 반영하고 실측 |
| 11월 3일 | 첫 출시본 [v1.0.0](https://github.com/3K-PokeClip/PokeClip-mono/pull/466). 미디어 서버 이미지(녹화기 · 사이드카)와 웹 · 인증 · 클립 · 채팅 서버가 들어감 |
| 11월 6일 | 운영 주소 공개 |
| 11월 10일 | 회차 다시보기 고침을 운영 미디어 서버에 반영([회차 다시보기 글](/posts/projects/pokeclip-round-vod/)) |

렌더·업로드 일꾼은 v1.0.0(11월 3일)에는 들어가지 않았고, 11월 10일 운영 반영 작업을 시작했습니다. 그래서 「방송 중 장면을 골라 클립 파일을 받는다」는 전체 흐름을 운영 환경에서 끝까지 잰 기록은 아직 없습니다.

방송 중 클립 같은 요구를 받으면 경로 개수보다 먼저 두 가지를 정하십시오. 시청을 단순하게 만드는 변경이 편집 재료를 지우지 않는지, 그리고 「저장됐다」는 표시가 다음 단계가 실제로 읽을 수 있는 객체와 맞는지입니다.

## 측정 조건

- 이 글에 새 실측은 없습니다. 녹화 파일 · 장부 행 대조는 2026년 8월 3일 로컬 MediaMTX 1.19.3과 실기 OBS 32.2.0으로 AI가 돌린 시험이며, 조건은 [멀티오디오 검증 글](/posts/0-to-1/pokeclip-multiaudio-end-to-end-verification/)에 있습니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일)이고, PR 상태는 2026년 11월 11일에 확인했습니다.

## 출처

- [3K-PokeClip/PokeClip-mono `media/internal/index/ddl.go` 39–56행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/index/ddl.go#L39-L56) — 조각 장부 표의 칸
- [3K-PokeClip/PokeClip-mono `media/README.md` 「되감기 렌디션 — Go 재포장」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/README.md?plain=1#L1358-L1362) — 첫 영상 · 첫 소리 트랙만 남기는 재포장
- [3K-PokeClip/PokeClip-mono PR #289](https://github.com/3K-PokeClip/PokeClip-mono/pull/289) — 되감기 목록 S3 발행(2026-10-19 develop 머지)
- [3K-PokeClip/PokeClip-mono PR #466](https://github.com/3K-PokeClip/PokeClip-mono/pull/466) — 첫 출시본 v1.0.0과 출시 이미지 목록(2026-11-03)
- [3K-PokeClip/PokeClip-mono PR #475](https://github.com/3K-PokeClip/PokeClip-mono/pull/475) · [PR #496](https://github.com/3K-PokeClip/PokeClip-mono/pull/496) — 클립 · 렌더 좌표를 미디어 시각으로 옮기는 초안
- [MediaMTX 문서 「Publish」](https://mediamtx.org/docs/features/publish) — SRT 송출 수신
- [HLS 클립은 왜 벽시각 대신 미디어 시각으로 자를까?](/posts/projects/pokeclip-media-timeline-over-wall-clock/) — 벽시각과 미디어 시각의 용도
- [2시간 방송이 다시보기에서 7.5분만 보였던 이유](/posts/projects/pokeclip-round-vod/) — 조각 · 세션 · 사슬 · 회차 용어와 11월 10일 운영 반영
- 팀 내부 결정 기록(비공개) — 7월 24일 트랙 선택 시점, 11월 2일 시간축 결정

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 5쪽](/portfolio/2026-10-15-v2/full.pdf#page=5)
