---
title: "게임 대사도 음성이라 자막 트랙 선택에서 상시 VAD를 뺐습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-11T18:16:30+09:00"
draft: false
author: "김태윤"
description: "방송 내내 모든 오디오 트랙에 음성 검출(VAD)을 돌려 자막에 쓸 마이크 트랙을 고르려던 설계를 7월 20일 뺀 판단. 게임 대사도 음성이라 VAD가 답하는 질문과 사용자가 원하는 소리가 달랐고, 사람이 고른 클립 구간 안에서 트랙을 직접 들어 고르게 했습니다. 사람이 없는 원클릭 경로의 템플릿 트랙 · 무음 검사 설계, 11월 11일 코드에 들어간 것(트랙별 미리듣기와 칸별 최댓값 파형)과 아직 설계뿐인 것(무음 트랙 숨김, 자막 생성)."
categories: ["0-to-1"]
tags: ["PokeClip", "VAD", "오디오", "설계 판단"]
portfolio_cases: [31]
portfolio_pages: [28]
portfolio_edition: "2026-10-15-v2"
---

게임 방송에서 말소리가 있는 트랙이 곧 방송자의 마이크는 아닙니다. 게임 NPC의 대사와 더빙도 음성입니다. 음성 검출(VAD, Voice Activity Detection)이 음성 구간을 정확히 찾아도, 그 소리가 사용자가 자막으로 만들고 싶은 마이크인지는 알려 주지 않습니다. PokeClip의 처음 구상은 방송 내내 모든 오디오 트랙(당시 설계로 약 10개, 7월 23일 6개로 줄임)에 VAD를 돌려 자막에 쓸 트랙을 자동으로 고르는 것이었습니다. 7월 20일 이 상시 전 트랙 VAD를 스펙에서 뺐습니다. 대신 사용자가 클립 구간을 고른 편집기에서 그 구간의 트랙을 직접 들어 보고 고르게 했습니다. 11월 11일 기준 편집기에는 트랙별 미리듣기와 파형이 들어갔고, 고른 트랙으로 자막을 만드는 부분은 아직 설계입니다.

상시 VAD를 빼기로 한 결정과 「편집기에서 직접 들어 보게 하자」는 대안은 제가 냈습니다. 편집기의 트랙별 미리듣기와 파형은 10월 하순 팀원들이 구현했고, 11월 3일 그 폴더의 fMP4 상자 읽기를 공용 부품으로 옮긴 작업은 제가 AI(Claude Code)와 함께 했습니다.

## 게임 대사도 음성이라 VAD로는 마이크를 고를 수 없었습니다 {#음성-검출과-사용자-의도는-다른-문제였다}

풀려던 질문은 「여기에 음성이 있나」가 아니라 「이 클립의 자막을 어느 소리로 만들까」였습니다. 두 질문이 같다고 가정하면, 게임 대사와 방송자의 말이 함께 나오는 장면에서 기준이 흔들립니다. 게임 트랙과 마이크 트랙이 둘 다 「음성 있음」이 되기 때문입니다. 모델을 더 정확하게 바꿔도 이 문제는 그대로입니다. VAD가 틀린 것이 아니라 다른 질문에 답하고 있습니다.

| 방법 | 답할 수 있는 질문 | 남는 한계 |
|---|---|---|
| VAD | 이 구간에 사람 목소리가 있는가 | 게임 대사와 방송자 마이크를 가르지 못함 |
| 소리 크기(파형) | 소리가 얼마나 큰가 | 음성인지, 누구 목소리인지 모름 |
| 트랙별 미리듣기 | 사용자가 원하는 소리인가 | 사람이 한 번 골라야 함 |
| 템플릿 지정 | 자동 처리에 어느 트랙을 쓰나 | 미리 정해 두고, 무음 예외를 따로 검사해야 함 |

사람이 고르는 것을 자동화 실패로 볼 필요는 없었습니다. 사용자가 이미 편집 구간을 보고 있다면 짧게 들어 보고 고르는 것은 제품 흐름의 일부가 될 수 있습니다. 반대로 사람이 없는 자동 생성 경로에는 그 선택을 미리 저장해 둬야 합니다. 분류기 하나로 두 흐름을 처리하지 않고, 결정하는 사람이 있느냐에 따라 경로를 나눴습니다.

## 트랙 분석을 편집 구간 안으로 옮겼습니다 {#분석을-편집-구간-안으로-옮겼다}

7월 20일 설계는 이렇습니다. 편집기가 열리면 고른 구간만 트랙별로 디코드해 파형을 그리고, 그 부산물인 RMS(평균 제곱근, 소리 에너지)로 무음 트랙을 숨깁니다. 사용자는 트랙 하나만 남겨 들어 보고 자막에 쓸 트랙을 고르고, 고른 트랙만 음성 인식(STT, Speech-to-Text)에 넘깁니다. 방송이 이어지는 동안 모든 트랙을 계속 분석하는 서버 연산은 없습니다.

VAD를 아예 버린 것은 아닙니다. 설계에는 음성 인식 안의 VAD 필터([faster-whisper](https://github.com/SYSTRAN/faster-whisper)의 `vad_filter`)가 남아, 고른 트랙의 무음 구간을 건너뛰는 데 씁니다. 뺀 것은 「방송 내내 모든 트랙에 VAD를 돌려 마이크를 고르는 일」입니다.

영상의 위 줄이 뺀 설계, 아래 줄이 바꾼 흐름입니다.

{{< motion scene="TrackPickInClip" id="fig-track-pick-in-clip" kind="개념도" caption="위: 방송 내내 모든 트랙에 VAD를 돌리면 게임 트랙과 마이크 트랙이 둘 다 「음성」으로 잡힙니다. 아래: 사용자가 고른 클립 구간 안에서만 트랙별 파형을 그리고, 한 트랙만 켜서 들어 본 뒤 그 트랙을 자막 입력으로 고릅니다. 파형 모양은 설명용이고, 자막 생성은 아직 설계입니다." >}}

소리 크기로 마이크까지 고르게 하면 처음 문제가 다시 생깁니다. 게임 소리가 큰 트랙은 에너지가 높고, 작게 말하는 목소리는 에너지가 낮을 수 있습니다. 그래서 파형은 들어 볼 트랙을 고르는 단서로만 쓰고, 자막에 넣을 소리는 사용자가 들어 보고 정하게 했습니다.

## 사람이 없는 원클릭 경로는 템플릿 트랙과 무음 검사로 남겼습니다 {#사람이-없는-경로는-별도의-조건이-필요했다}

원클릭 자동 생성에는 매번 들어 볼 편집자가 없습니다. 그래서 템플릿에 자막에 쓸 트랙 번호를 정해 두고, 렌더 전에 그 트랙이 무음인지 검사하는 방향으로 설계했습니다. 트랙 번호는 `audio1`–`audio6`으로 고정돼 있어 방송마다 바뀌지 않습니다([6트랙 입력 계약 글](/posts/0-to-1/pokeclip-six-track-input-contract/)). 수동 경로의 편리함을 자동 경로의 보장으로 옮기지는 않았습니다. 템플릿의 트랙 설정이 틀리면 자동 경로는 틀린 소리를 고릅니다.

7월 20일 설계는 OBS 플러그인이 보내는 소스 종류(마이크 장치, 디스코드, 게임 실행 파일)로 트랙을 정렬하고 기본 선택하게 돼 있었습니다. 9월 3일 서버 트랙 이름을 순서로 고정하고 소스 이름을 보내지 않기로 하면서, 이 이름에 기대는 자동 분류는 필수 조건에서 뺐습니다. 이미 버린 계약을 설계에 남겨 두면 뒤에 구현하는 사람이 오지 않을 메타데이터를 기다리게 됩니다.

[[fig-two-paths]]는 두 경로와 11월 11일 기준 구현 상태입니다. 실선 강조가 구현된 것, 점선이 설계뿐인 것입니다.

```mermaid {#fig-two-paths kind="개념도" caption="자막에 쓸 소리를 고르는 두 경로. 사람이 편집하는 경로의 구간 파형과 트랙별 미리듣기는 구현됐고, 고른 트랙을 음성 인식에 넘기는 단계는 설계뿐입니다. 원클릭 경로의 템플릿 트랙 지정과 렌더 전 무음 검사도 설계뿐입니다. 7월 20일 설계 기록과 PokeClip-mono develop 825a3dfe의 web 편집기 · workers 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/trackAudio/useTrackPreview.ts#L10-L13"}
flowchart TB
  accTitle: 자막에 쓸 소리를 고르는 두 경로
  accDescr: 편집기에 사람이 있으면 구간 안 트랙별 파형과 트랙을 넣고 빼며 듣는 미리듣기가 구현돼 있고, 고른 트랙을 음성 인식에 넘기는 단계는 설계뿐이다. 사람이 없는 원클릭 경로는 템플릿의 지정 트랙과 렌더 전 무음 검사로 설계됐고 아직 구현되지 않았다.
  Q{"편집기에<br/>사람이 있나"}
  Q -->|"예"| W["구간 안 트랙별 파형<br/>구현"]
  W --> P["트랙 넣고 빼며 듣기<br/>구현"]
  P -.-> S["고른 트랙만 음성 인식<br/>설계"]
  Q -->|"아니오 · 원클릭"| T["템플릿의 지정 트랙<br/>설계"]
  T -.-> R["렌더 전 무음 검사<br/>설계"]
  style W fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style P fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
  style S stroke-dasharray:6 4
  style T stroke-dasharray:6 4
  style R stroke-dasharray:6 4
```

## 11월 코드에는 미리듣기와 파형만 들어갔습니다

11월 11일 develop의 편집기는 사람이 고르는 경로의 앞 두 단계를 갖췄습니다. 미리듣기는 편집 영상이 받은 창(고른 구간 ± 여유)의 녹화 조각을 받아 트랙마다 풀고, 영상을 따라 재생합니다([`useTrackPreview.ts` 10–13행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/trackAudio/useTrackPreview.ts#L10-L13)). 타임라인의 트랙 줄마다 넣기·빼기와 음량이 있어, 다른 트랙을 빼면 한 트랙만 들을 수 있습니다([`TimelineTrackRow.tsx` 8–11행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/studio/TimelineTrackRow.tsx#L8-L11)). 설계에 적은 별도의 솔로 버튼은 없습니다.

파형은 RMS가 아닙니다. 50ms 칸마다 가장 큰 표본 값을 재고, −60dB보다 작은 소리는 평평하게 그립니다([`trackLevels.ts` 14–19행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/trackAudio/trackLevels.ts#L14-L19)). 무음 트랙을 숨기는 기능은 코드에 없고, 무음 트랙은 평평한 줄로 보일 뿐입니다.

자막을 만드는 쪽은 아직 비어 있습니다. 편집기의 AI 자막 화면은 목업 상태로, 실제 편집본으로 열면 버튼이 「준비 중」으로 잠깁니다([`useClipEditorMockState.ts` 1319행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/useClipEditorMockState.ts#L1319), [`SubtitleSection.tsx`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/sections/SubtitleSection.tsx#L19-L38)). 음성 인식을 맡을 일꾼 폴더에는 빈 자리 파일만 있습니다([`workers/ai`](https://github.com/3K-PokeClip/PokeClip-mono/tree/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/ai)). 클립 렌더 일꾼은 구간이 없는 템플릿 레시피를 렌더하지 않으므로([`RecipeParser.java` 96–100행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/src/main/java/com/pokeclip/render/recipe/RecipeParser.java#L96-L100)), 원클릭 경로의 템플릿 트랙과 무음 검사도 아직 없습니다.

포트폴리오 요약(2026-10-15판) 28쪽은 「선택 구간만 디코드 → 파형·RMS로 무음 후보 표시 → 솔로 미리듣기 → 선택 트랙만 자막 입력」을 채택한 설계로 적었습니다. 11월 11일 코드의 파형은 RMS가 아니라 칸별 최댓값이고, 무음 후보 표시와 솔로 버튼은 없으며, 자막 입력은 설계 단계입니다.

## 줄인 것은 상시 연산과 오판을 관리할 책임이었습니다 {#줄인-것은-연산만이-아니었다}

이 선택으로 수동 경로에는 한 번의 트랙 선택이, 자동 경로에는 미리 정해 둘 템플릿 설정이 남았습니다. 사용자의 수고가 없어지지는 않았습니다. 대신 게임 대사를 방송자 마이크로 잘못 고르는 분류기를 방송 내내 돌리고, 그 오판을 감시하고 고치는 일을 떠안지 않았습니다. 줄어든 CPU 사용량과 분류 정확도는 재지 않았습니다. 상시 VAD 파이프라인을 만든 적이 없으니 비교할 대상도 없습니다.

VAD를 넣을지 가른 기준은 모델의 정확도가 아니라 누가, 언제, 어떤 소리를 골라야 하느냐였습니다. 분류 모델을 붙이기 전에 그 판단이 일어나는 시점에 사람이 있는지부터 보십시오. 사람이 있으면 판단할 재료를 보여 주는 것이 모델보다 정확합니다.

## 출처

- [PokeClip-mono `useTrackPreview.ts`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/trackAudio/useTrackPreview.ts#L10-L13) · [`trackLevels.ts`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/trackAudio/trackLevels.ts#L14-L19) · [`TimelineTrackRow.tsx`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/studio/TimelineTrackRow.tsx#L8-L11) — 트랙별 미리듣기와 파형(develop `825a3dfe`, 2026-11-11)
- [PokeClip-mono `useClipEditorMockState.ts`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/useClipEditorMockState.ts#L1319) · [`SubtitleSection.tsx`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/web/src/features/clips/editor/sections/SubtitleSection.tsx#L19-L38) · [`workers/ai`](https://github.com/3K-PokeClip/PokeClip-mono/tree/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/ai) · [`RecipeParser.java`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/workers/render/src/main/java/com/pokeclip/render/recipe/RecipeParser.java#L96-L100) — 자막 생성과 템플릿 렌더의 현재 상태
- [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) — `vad_filter`(Silero VAD)
- [소스 약 10개 대신 OBS 6트랙에 순서만 고정했습니다](/posts/0-to-1/pokeclip-six-track-input-contract/)
- 팀 내부 설계 기록(비공개) — 7월 20일 상시 VAD 제거 결정, 9월 3일 트랙 이름 고정

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 28쪽](/portfolio/2026-10-15-v2/full.pdf#page=28)
