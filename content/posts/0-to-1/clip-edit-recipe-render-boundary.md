---
title: "클립은 완성 파일 대신 원본과 편집 레시피로 남겼습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-11T14:14:52+09:00"
draft: false
author: "김태윤"
description: "음악만 끄거나 세로판을 다시 뽑으려고 클립을 완성 파일이 아니라 원본 조각과 JSON 레시피(방송 시각 구간 · 출력 · 트랙별 음량 · 자막)로 남긴 설계. 미리보기는 브라우저가, 최종 파일은 렌더 일꾼이 늘 재인코딩으로 만들고, 구간 좌표는 벽시각에서 조각과 미디어 시각으로 옮기는 중입니다."
categories: ["0-to-1"]
tags: ["PokeClip", "비파괴 편집", "미디어 설계", "FFmpeg", "레시피"]
portfolio_cases: [30]
portfolio_pages: [5]
portfolio_edition: "2026-10-15-v2"
---

PokeClip의 클립은 한 번 내보내고 끝나는 파일이 아니어야 했습니다. 같은 장면을 세로 쇼츠로 다시 뽑거나 배경음악만 끄려면, 편집자가 고른 구간과 소리가 원본과 함께 남아 있어야 합니다. 완성 파일만 저장하면 이미 섞인 음악을 다시 떼어 내는 문제부터 풀어야 합니다. 그래서 2026년 7월 20일 결정 묶음에서 원본 조각은 그대로 두고, 편집자의 선택을 JSON 레시피로 저장하고, 렌더는 그 레시피대로 늘 재인코딩하기로 정했습니다. 레시피는 지금 코드에서 구간을 방송 절대 시각(UTC 밀리초)으로 적고, 출력 비율은 9:16과 1:1 두 가지를 받습니다.

저는 이 결정 묶음과 레시피 계약의 방향을 정했습니다. 레시피 계약 초안은 8월 25일 제 쪽에서 냈고 클립·렌더를 맡은 팀원이 확인했습니다. 렌더 일꾼은 처음에 제가 맡았다가 9월 14일 팀원에게 넘어갔고([`workers/render/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/README.md) 머리), 지금 코드는 넘겨받은 팀원이 이어서 구현했습니다. 설계 조사에는 AI를 썼습니다.

## 완성 파일만 남기면 음악을 다시 뺄 수 없습니다 {#되돌릴-수-있어야-하는-것은-파일보다-선택이었다}

PokeClip의 녹화 원본에는 영상 1개와 소리 6개가 따로 남습니다. 트랙 0은 종합 믹스, 1–5는 소스별 소리입니다([경로 분리 글](/posts/0-to-1/pokeclip-live-editing-boundaries/)). 완성 파일은 고른 소리를 이미 하나로 섞은 결과라, 거기서 음악만 다시 빼는 일은 음원 분리 문제가 됩니다. 원본을 남겨 두면 음악 트랙의 음량을 0으로 바꾸고 다시 렌더하면 됩니다.

그래서 클립을 두 가지로 나눴습니다. 사람이 고른 것은 레시피에, 서버가 만든 것은 출력 파일에 남깁니다. 레시피는 지우는 API가 없고, 편집기는 고칠 때마다 레시피 전체를 보내 판 번호(`recipeVersion`)를 하나 올립니다([`services/README.md` 「clip — 편집 저장」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L2402-L2420)).

영상에서 왼쪽 원본은 끝까지 그대로입니다. 가운데 레시피의 출력 비율과 음악 트랙 음량만 바뀌고, 같은 원본에서 새 출력이 나옵니다.

{{< motion scene="RecipeRerender" id="fig-recipe-rerender" kind="개념도" caption="원본 조각(영상 1 · 소리 6)은 그대로 둔 채 레시피만 바꿉니다. 1:1 출력을 만든 뒤 레시피를 9:16 출력, 음악 트랙 음량 0으로 고치면 같은 원본에서 음악이 빠진 세로 출력이 새로 나오고, 앞 출력은 그 자리에 남습니다. 레시피와 출력의 관계를 보여 주는 설명용 그림입니다." >}}

원본을 덮어쓰는 단계가 없으므로, 편집을 몇 번 고쳐도 처음 고른 재료로 돌아갈 수 있습니다.

## 레시피는 방송 시각 구간과 출력·트랙·자막을 적습니다

렌더 일꾼이 받는 레시피에는 방송 번호(`streamId`) 말고 칸이 넷 있습니다([`Recipe.java` 5–16행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/src/main/java/com/pokeclip/render/recipe/Recipe.java#L5-L16)).

| 칸 | 담는 것 | 지금 코드의 제한 |
|---|---|---|
| `cut` | 반열린 구간 `[inAtMs, outAtMs)`, 방송 절대 시각(UTC epoch 밀리초) | 5초 이상 3분 이하 |
| `outputs` | 출력 비율과 원본에서 잘라 올릴 영역 · 배경 · 구분선 | 9:16과 1:1, 비율마다 하나 |
| `tracks` | 트랙 번호(0–5)와 트랙별 음량(선형 0.0–2.0) | 고른 트랙만 섞음 |
| `subtitles` | 자막 모드, 시간별 문장, 자리 | 번인 + CC · 번인만 · CC만 |

7월 20일 결정 묶음은 화면 비율 다섯 가지(가로 · 9:16 · 1:1 · 상하 분할 · 장면 자르기)를 적었지만, 코드의 출력 비율은 쇼츠에 올릴 수 있는 9:16과 1:1 둘입니다([`RecipeValidator.java` 55행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/recipe/RecipeValidator.java#L55)). 상하 분할 같은 배치는 출력 하나 안에 층을 여러 장 얹는 방식으로 들어갔습니다. 자막 세 모드는 결정 묶음 그대로 구현됐습니다([`Recipe.java` 134–137행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/src/main/java/com/pokeclip/render/recipe/Recipe.java#L134-L137)). 소리 크기를 -14 LUFS로 맞추는 값은 레시피 칸이 아니라 렌더 상수입니다.

렌더 일꾼은 레시피에 모르는 칸이 하나만 있어도 거부합니다. 편집기가 새 칸을 보냈는데 렌더가 모른 채 지나가면, 편집자가 고른 것과 다른 파일이 조용히 나오기 때문입니다.

7월 20일에는 핫키 자동 업로드의 템플릿도 「구간이 빈 레시피」로 정했습니다. 클립 서비스의 검사는 `cut`이 없는 레시피를 템플릿으로 통과시킵니다([`RecipeValidator.java` 96–99행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/recipe/RecipeValidator.java#L96-L99)). 자동 업로드 흐름이 실제로 이 템플릿을 쓰는지는 이 글을 쓰며 확인하지 못했습니다.

## 미리보기는 브라우저가, 최종 파일은 렌더 일꾼이 만듭니다 {#미리보기와-최종-파일이-같은-일을-할-필요는-없었다}

음량이나 화면 위치를 조금 바꿀 때마다 서버가 파일을 만들면, 편집 화면의 반응이 렌더 완료에 묶입니다. 그래서 편집기는 브라우저의 video와 화면 합성으로 선택을 바로 보여 주고, 「영상 만들기」를 누를 때만 렌더 주문을 냅니다. 테두리 두께 같은 길이를 결과 폭에 대한 비로 적어, 미리보기와 렌더가 같은 값을 같은 크기로 그리게 했습니다.

주문은 SQS 큐로 가고, 렌더 일꾼은 시작 · 진행 · 완료를 클립 서비스에 보고합니다. S3 일시 오류나 시한 초과는 다시 받고, 레시피나 조각이 틀린 실패는 다시 해도 같으므로 바로 끝냅니다([`workers/render/README.md` 「주문 하나가 지나가는 길」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/README.md?plain=1#L18-L46)). 레시피가 같다고 다시 렌더한 파일이 바이트까지 같다는 보장은 없습니다. 레시피가 고정하는 것은 편집 입력이고, 인코더 판과 환경까지 포함한 재현성은 따로 확인할 문제입니다.

## smart cut 예외 없이 렌더는 늘 재인코딩합니다 {#빠른-재포장-경로를-렌더까지-확장하지-않았다}

되감기용 재포장은 압축된 미디어를 다시 담기만 합니다. 반면 화면 자르기, 상하 분할, 자막 번인은 영상의 픽셀을 바꿉니다. FFmpeg도 디코딩 없이 패킷을 옮기는 [streamcopy](https://ffmpeg.org/ffmpeg.html#Streamcopy)와 픽셀을 바꾸는 [필터 경로](https://ffmpeg.org/ffmpeg.html#Filtering)를 나눕니다.

필터가 없는 순수 컷에서는 키프레임 경계에서 재인코딩 없이 자르는 smart cut이 가능합니다. 7월 20일 이 예외를 검토하고 뺐습니다. PokeClip의 기본 흐름은 화면 자르기와 자막이 들어가므로 smart cut이 맞는 레시피가 드물고, 넣으면 같은 렌더에 코드 경로가 둘 생겨 둘 다 유지하고 시험해야 합니다. 렌더 단계 가운데 재인코딩하지 않는 것은 조각을 한 파일로 잇는 첫 단계뿐입니다.

렌더 일꾼이 레시피를 읽어 파일을 만드는 순서입니다. 청록 상자가 레시피 칸이 정하는 단계입니다.

```mermaid {#fig-render-steps kind="재구성" caption="렌더 일꾼이 레시피 하나로 출력 파일을 만드는 순서. 조각 잇기만 재인코딩 없이 하고, 출력마다 자르기 · 화면 합성 · 자막 · 소리 섞기 · -14 LUFS 맞추기를 거쳐 H.264/AAC로 인코딩합니다. 청록 상자는 레시피 칸이 값을 주는 단계입니다. develop 825a3dfe의 workers/render/README.md 18–28행 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/README.md?plain=1#L18-L28"}
flowchart TB
  accTitle: 레시피에서 출력 파일까지 렌더 단계
  accDescr: 렌더 일꾼은 구간에 걸친 원본 조각을 받아 재인코딩 없이 한 파일로 잇고, 고른 트랙의 소리 크기를 잰다. 그다음 출력마다 cut으로 자르고, outputs로 화면을 합성하고, subtitles로 자막을 입히고, tracks로 고른 소리를 섞고, -14 LUFS로 맞춘 뒤 H.264와 AAC로 인코딩해 S3에 올린다.
  src[구간에 걸친 원본 조각]
  src --> cat[잇기<br/>재인코딩 없음]
  cat --> loud[소리 크기 재기]
  loud --> cut[자르기 · cut]
  cut --> comp[화면 합성 · outputs]
  comp --> sub[자막 입히기 · subtitles]
  sub --> mix[트랙 섞기 · tracks]
  mix --> norm[-14 LUFS 맞추기]
  norm --> enc[H.264 · AAC 인코딩]
  enc --> s3[S3 출력 파일]
  style cut fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style comp fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style sub fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style mix fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

자르기부터 인코딩까지가 출력마다 반복됩니다. 9:16과 1:1을 함께 고르면 같은 이은 파일에서 두 벌이 나옵니다.

## 구간 좌표는 조각과 미디어 시각으로 옮기는 중입니다

레시피의 `cut`은 방송 절대 시각, 곧 벽시각입니다. 그런데 장부의 벽시각은 받는 서버가 조각 도착으로 추정한 값이라, 정밀하게 자를 좌표로 쓰기에는 어긋남이 있었습니다. 11월 2일 클립·렌더의 정밀 좌표를 미디어 시각으로 옮기기로 정했고, 11월 3일 편집기는 지금처럼 벽시각 컷을 보내되 클립 서비스가 렌더 주문을 만들 때 「조각 + 조각 안 미디어 시각」으로 바꾸기로 했습니다([시간축 글](/posts/projects/pokeclip-media-timeline-over-wall-clock/)).

그 변경의 클립 쪽 [PR #475](https://github.com/3K-PokeClip/PokeClip-mono/pull/475)와 렌더 쪽 [PR #496](https://github.com/3K-PokeClip/PokeClip-mono/pull/496)은 11월 11일 기준 머지 전 초안입니다. 그래서 이 글의 레시피 칸은 develop `825a3dfe` 기준이고, 렌더 주문의 좌표 칸은 바뀔 예정입니다. 편집자가 고른 구간을 사람이 고른 시각으로 남긴다는 레시피의 역할은 그대로입니다.

## 원본 보관과 렌더 자원을 대가로 냈습니다 {#원본을-남기는-대가도-남는다}

다시 편집하려면 원본이 남아 있어야 합니다. 원본 조각은 7월 20일 결정에서 60일 보관으로 정했고, 렌더 일꾼은 받을 조각이 없으면 `SOURCE_EXPIRED`로 끝냅니다. 레시피는 지우는 API가 없어 남지만, 60일 만료가 켜지면 그 뒤에는 같은 레시피로 다시 렌더할 수 없습니다. 운영에는 만료가 아직 연결되지 않았습니다. 재인코딩을 기본으로 정한 만큼 렌더마다 CPU도 씁니다. 렌더 일꾼은 한 번에 주문 하나만 처리하고, 처리량은 일꾼 수로 늘리게 돼 있습니다.

렌더 시간과 비용은 이 글에서 재지 않았습니다. 렌더·업로드 일꾼은 v1.0.0(11월 3일)에는 들어가지 않았고, 11월 10일 운영 반영 작업을 시작했습니다. 그래서 이 글이 확인한 범위는 레시피라는 입력 계약과 렌더 단계의 순서까지입니다.

비슷한 편집 기능을 설계한다면 「결과 파일을 다시 만들 수 있는가」보다 먼저 「사람이 고른 것이 어디에 남는가」를 정하십시오. 원본을 그대로 두고 레시피의 선택만 바꿨을 때 원하는 새 결과가 나와야 합니다. 원본 보관 기한이 곧 그 약속의 기한입니다.

## 출처

- [3K-PokeClip/PokeClip-mono `workers/render/.../recipe/Recipe.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/src/main/java/com/pokeclip/render/recipe/Recipe.java#L5-L16) — 레시피 칸, 반열린 구간, 자막 모드
- [3K-PokeClip/PokeClip-mono `services/clip/.../recipe/RecipeValidator.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/clip/src/main/java/com/pokeclip/clip/recipe/RecipeValidator.java#L96-L99) — 구간 없는 템플릿 통과, 출력 비율 두 가지, 구간 5초–3분
- [3K-PokeClip/PokeClip-mono `workers/render/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/README.md?plain=1#L18-L28) — 렌더 단계, 담당 이관(9월 14일), 실패 처리
- [3K-PokeClip/PokeClip-mono `services/README.md` 「clip — 편집 저장」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L2402-L2420) — 레시피 저장 API와 판 번호
- [3K-PokeClip/PokeClip-mono PR #475](https://github.com/3K-PokeClip/PokeClip-mono/pull/475) · [PR #496](https://github.com/3K-PokeClip/PokeClip-mono/pull/496) — 클립 · 렌더 좌표를 미디어 시각으로 옮기는 초안
- [FFmpeg 문서 「Streamcopy」](https://ffmpeg.org/ffmpeg.html#Streamcopy) · [「Filtering」](https://ffmpeg.org/ffmpeg.html#Filtering) — 재포장과 필터 경로의 구분
- [HLS 클립은 왜 벽시각 대신 미디어 시각으로 자를까?](/posts/projects/pokeclip-media-timeline-over-wall-clock/) — 11월 2 · 3일 시간축 결정
- 팀 내부 결정 기록(비공개) — 7월 20일 클립 내보내기 결정 묶음, 8월 25일 레시피 계약 초안

---

이 글은 [PokeClip·MediaMTX 기술 기록 모음](/posts/0-to-1/portfolio-engineering-notes/)의 일부입니다. [포트폴리오 전체본 5쪽](/portfolio/2026-10-15-v2/full.pdf#page=5)에서 연결된 사례도 함께 볼 수 있습니다.
