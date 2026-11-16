---
title: "다른 상자가 먼저 넣은 조각 하나에 되감기 목록이 멈췄습니다"
date: 2026-11-17T07:24:01+09:00
categories: ["projects"]
tags: ["PokeClip", "HLS", "DVR", "Go", "PostgreSQL", "pgx", "장애 대응"]
draft: false
author: "김태윤"
description: "PokéClip 시험 방송에서 대기 상자의 확인용 루프백이 같은 시험 키로 0.3초짜리 영상만 조각을 공유 장부의 7125번에 먼저 넣었고, 송출 상자의 되감기 목록은 7124에서 약 35분 멈췄습니다. 캐시는 다음 번호의 알림만 싣고 감시는 바로 다음 행의 확정만 봐서 GAP · 캐시 회복 · 확정이 서로를 기다린 교착이었습니다. 빈 번호 뒤 알림을 받으면 장부에서 다시 싣고, 감시가 장부 끝을 직접 견주고, 봉인 직전에 같은 트랜잭션에서 장부 끝을 다시 보게 고친 과정. 고치기 전 FAIL · 고친 뒤 PASS 공개 재측정, pgx 취소 요청과 PostgreSQL 잠금 실측, 받아들인 한계 넷, 운영 반영 상태까지."
---

11월 16일 밤 PokéClip 시험 방송에서 방송 중 되감기(DVR, Digital Video Recording) 목록이 7124번 조각에서 약 35분 멈췄습니다. 대기 상자로 보낸 확인용 루프백이 같은 시험 키를 써서, 그 상자가 0.3초짜리 영상만 조각을 두 상자가 함께 쓰는 장부의 7125번에 먼저 넣었습니다. 진짜 4초 조각은 번호 충돌로 버려졌고, 소리가 없는 7125는 재생용 조각 업로드가 영구히 실패했습니다. 송출 상자의 되감기 캐시는 바로 다음 번호의 알림만 받아 싣고, 30초 감시는 바로 다음 행이 확정됐는지만 봤습니다. 그래서 GAP을 세울 수도 캐시를 되살릴 수도 없는 교착이 세션이 끝날 때까지 이어졌고, 경보는 WARN 한 줄이었습니다. 빈 번호 뒤의 알림을 받으면 장부에서 다시 읽어 캐시를 채우고(적재) 감시가 장부 끝을 직접 견주게 고친 뒤, 공개 저장소의 회귀 시험은 고치기 전 커밋에서 실패하고 고친 뒤 통과했습니다. 같은 장면에 30초 감시를 70번(35분) 돌려도 고치기 전 판은 7124 다음으로 넘어가지 못했고, 고친 판은 적재 한 번으로 이어 갔습니다.

고칠 범위와 받아들일 한계는 제가 정했습니다. 캐시를 지금 고치는 것, 경보를 「캐시가 장부보다 뒤처진 경우」만 ERROR로 올리는 범위, AI 리뷰에서 나온 봉인 쪽 위험을 같은 PR에서 고치는 것, 봉인 직전 확인을 fence 뒤 같은 트랜잭션에 두고 시한을 0.5초로 한 것과 그로 인한 최악 9.5초, 아래 한계 넷, 같은 키 이중 송출은 운영 규칙과 별도 설계로 다루는 것, 조건부 머지 승인이 그 결정입니다. 조사 · 구현 · 시험 · 리뷰는 AI 에이전트(Claude Code와 Codex)가 했습니다. 변경은 11월 17일 05:06 develop에 병합됐고([PokeClip-mono PR 529](https://github.com/3K-PokeClip/PokeClip-mono/pull/529), 머지 커밋 `00cfa2d6`), 같은 날 아침 그때 대기 중이던 상자 b에 실어 07:04부터 b가 송출을 받습니다.

## 시험 방송의 되감기 목록이 7124번에서 35분 멈췄습니다

PokéClip의 Media 상자는 EC2 한 대에서 MediaMTX와 사이드카를 돌립니다. 송출을 받는 상자와 대기 상자 두 대가 있고, 둘의 사이드카는 같은 DB의 조각 장부에 씁니다. 사이드카의 인덱서는 녹화 파일이 생기면 「그 스트림 커서 꼬리 + 1」을 번호로 붙여 장부에 넣습니다. 두 쓰기자가 같은 번호를 쓰면 기본 키 충돌로 걸리고, 인덱서는 커서를 다시 읽은 뒤 한 번만 다시 시도합니다. 이때 먼저 커밋한 행이 이깁니다. 나중에 온 조각이 선점 행보다 이른 시각이면 번호 순서와 시간 순서를 지키려고 그 조각을 버립니다([`indexer.go` 753–771행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/indexer/indexer.go#L753-L771)).

그날 일은 이 순서로 일어났습니다(비공개 기록에서 식별자를 빼고 옮김, [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-rewind-cache-deadlock/measurements.md)).

| 시각(KST) | 상자 | 일 |
|---|---|---|
| 21:53:11 | b | 제 시험 송출 시작(영상 하나 · 소리 여섯) |
| 21:55:51 | a | 대기 상자의 설정을 제자리에서 바꾸고 사이드카 재기동 |
| 21:59:31 | a | 운영 작업 에이전트가 확인용 루프백 송출(영상만, 약 6.4초) — 같은 시험 키 |
| 21:59:38 | a | 0.3초 · 5,616바이트 영상만 조각이 7125번으로 장부에 들어가 b의 세션에 붙음 |
| 21:59:41 | b | 진짜 4초 조각이 번호 충돌 뒤 버려짐 |
| 21:59:46 | b | `rewind_publish_stall_seconds` WARN `gap=no_row` 한 줄 |
| 22:35:05 | – | 세션 ending — 되감기 목록은 끝까지 7124 |
| 22:50:08 | – | 세션 ended, VOD는 7125에 GAP 하나 |

7125의 재생용 조각 업로드는 「영상 true · 소리 false」로 거부됐습니다. 소리가 없는 조각은 소리 없는 되감기를 만들므로 만들지 않는 것이 설계이고([`producer.go` 224–242행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/playback/producer.go#L224-L242)), 같은 입력은 늘 같은 실패로 분류됩니다([`axis_body.go` 302–305행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/upload/axis_body.go#L302-L305)). a에서 73번, b에서 6번 모두 같은 이유로 실패했습니다. 피해는 진짜 4초 조각의 영구 유실, 방송 중 되감기 정체 약 35분, VOD의 GAP 하나입니다. 루프백이 같은 키로 다른 상자에 송출된 운영 쪽 경위는 [IMDS 자격 창구 글](/posts/0-to-1/pokeclip-media-imds-credential-relay/#운영-상자-둘은-송출을-받지-않을-때-제자리에서-켰습니다)에 있습니다.

## 캐시는 다음 번호만 싣고, 감시는 바로 다음 행만 봤습니다

사이드카는 목록을 만들 때마다 DB를 읽지 않으려고 장부의 사본인 되감기 캐시를 들고 있고, 스트림마다 캐시에 실린 연속된 행을 뷰라고 부릅니다. 인덱서는 행을 넣을 때마다 그 행을 캐시에 알립니다(이하 push). 목록의 앞쪽 끝(머리)은 [연속으로 확정된 조각까지](/posts/0-to-1/pokeclip-manifest-window-boundaries/)이고, 확정은 업로드를 마쳤거나 GAP(`#EXT-X-GAP`, 그 조각을 없는 것으로 확정해 건너뛰는 표시)으로 처리된 상태입니다. 캐시 뷰에는 빈 번호를 두고 뒤 행을 이어 붙이지 않습니다. 이어 붙이면 경계 계산이 빈자리를 모르고 넘어가 목록 안의 번호가 끊깁니다.

고치기 전 캐시는 push가 「뷰의 다음 번호」일 때만 실었고, 아니면 아무것도 바꾸지 않았습니다([고치기 전 `cache.go` 247–264행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/rewind/cache/cache.go#L247-L264)). 7125는 a가 넣었으니 b의 캐시에는 그 push가 없었고, 7126부터의 push는 전부 「7125가 아님」으로 버려졌습니다. 주석은 놓친 행을 30초 정합성 감시가 되돌린다고 적었습니다. 그런데 감시의 머리 쪽 불일치 판정은 「DB의 머리+1 행이 확정됐는가」 하나였습니다([같은 파일 485–494행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/rewind/cache/cache.go#L485-L494)). 7125는 업로드 실패 · GAP 없음이라 확정이 아니었고, 감시는 캐시를 정상으로 봤습니다. 복구 장치가 「push가 온다」를 전제하면, 다른 쓰기자가 넣은 행 앞에서는 조용히 일을 하지 않습니다.

정체 사다리(발행이 멈출 때 1초 틱마다 GAP · 경보 · 봉인을 정하는 판정)는 머리+1인 7125를 캐시 뷰에서 찾지 못해 까닭을 `no_row`로 적었습니다. GAP은 캐시에 그 행이 있어야 섭니다. DB 쪽 GAP 문장은 업로드가 실패한 행을 받을 준비가 돼 있었지만([`gap.go` 21–43행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/rewind/publish/gap.go#L21-L43)), 그 문장까지 가지 못했습니다. 경보는 `no_row`를 「유입이 멈춘 방송 종료 구간의 모양」으로 보고 ERROR에서 WARN으로 낮추는 규칙이 있었고, 정체 하나에 한 줄이었습니다([고치기 전 `ladder.go` 203–225행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/rewind/publish/ladder.go#L203-L225)). 이번 `no_row`는 방송 종료가 아니라 캐시가 장부보다 뒤처진 모양이었지만, 규칙은 둘을 가르지 않았습니다. 모양만 보고 경보를 낮추면 같은 모양의 다른 원인까지 함께 가립니다.

## 세 조건이 서로를 기다리는 교착이었습니다

화살표는 「이것이 서려면 저것이 필요하다」입니다. 세 화살표가 고리를 이뤄 어느 것도 먼저 설 수 없습니다.

```mermaid {#fig-deadlock-cycle kind="개념도" caption="7125에 GAP을 세우려면 캐시에 그 행이 있어야 하고, 캐시가 그 행을 다시 실으려면 감시가 머리+1(7125)의 확정을 봐야 하고, 7125가 확정되려면 업로드가 늘 실패하므로 GAP이 있어야 했습니다. 고치기 전 코드 기준." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/rewind/cache/cache.go#L485-L494"}
flowchart TB
  accTitle: 되감기 캐시 교착의 세 조건
  accDescr: 7125에 GAP 세우기에는 캐시에 7125 행이 필요하고, 캐시 다시 싣기에는 감시가 7125의 확정을 봐야 하며, 7125 확정에는 업로드가 늘 실패하므로 GAP이 필요해 세 조건이 고리를 이룹니다.
  G["7125에 GAP 세우기"] -->|"캐시에 7125 행이 필요"| V["캐시가 7125 다시 싣기"]
  V -->|"감시가 7125 확정을 봐야 함"| S["7125 확정"]
  S -->|"업로드는 늘 실패 → GAP이 필요"| G
```

정산과 VOD 쪽은 DB를 직접 읽으므로 세션이 끝난 뒤 22:42에 7125를 GAP으로 넣었습니다. 방송 중 되감기 쪽만 고리에 갇혔습니다. 다른 상자가 끼지 않아도, 캐시가 push를 놓치고 놓친 첫 행의 업로드가 영구히 실패하면 같은 고리가 됩니다. push를 놓치는 길로 이번에 확인한 것은 다른 쓰기자 하나입니다.

## 빈 번호 뒤 push는 버리지 않고 장부에서 다시 싣습니다

이제 캐시가 뷰의 다음 번호보다 뒤인 push를 받으면 「장부에 그 행이 있다」를 기록하고 그 스트림의 적재를 요구합니다([고친 뒤 `cache.go` 264–291행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/cache/cache.go#L264-L291)). 뷰에 바로 붙이지는 않습니다. 빈자리를 잇지 않는 원칙은 그대로이고, 적재(많아야 10,000행)가 장부에서 7125까지 함께 실어 빈자리를 메웁니다. 행이 실리면 사다리가 업로드 실패 행에 GAP을 세우고 목록이 이어집니다. 캐시 행 없이 DB만 보고 GAP을 세우는 안도 있었지만, 창과 미디어 순번 계산이 캐시 행을 전제로 해 고칠 곳이 더 크고 위험해서 접었습니다.

가운데 줄이 고치기 전, 아래 줄이 고친 뒤의 같은 캐시입니다. 같은 7126 push가 위에서는 버려지고 아래에서는 장부 적재를 부릅니다.

{{< motion scene="LedgerReload" id="fig-ledger-reload" kind="개념도" caption="장부에는 상자 a의 0.3초 소리 없는 조각이 7125로 먼저 들어가고 상자 b의 진짜 4초 조각은 버려집니다. 고치기 전 캐시는 7126 · 7127 push를 다음 번호가 아니라 버려 목록 끝(청록 막대)이 7124에 멈춥니다. 고친 캐시는 같은 push에 장부 적재를 요구해 7125 · 7126 · 7127을 싣고, 7125에 GAP을 세워 이어 갑니다. 번호는 사건 기록 그대로이고 시간 간격은 설명용입니다." >}}

공개 저장소의 커밋에서 다시 쟀습니다. PR의 회귀 시험 둘은 머지 커밋의 시험 코드를 고치기 전 커밋에 그대로 옮겨 돌렸고, 「감시 70번」은 같은 장면에 30초 감시를 70번 돌리는 재측정용 시험입니다([측정 조건](#측정-조건)). 시험의 3 · 4번은 사건의 7124 · 7125에 해당합니다.

| 시험 | 고치기 전 `0dc13a68` | 고친 뒤 `00cfa2d6` |
|---|---|---|
| [`TestLadderGapsRowWhosePushTheCacheMissed`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/cmd/segment-indexer/publish_loop_ladder_test.go#L211-L261) | FAIL — 적재 0번 | PASS — 적재 1 · GAP 1 · 7까지 발행 |
| [`TestLadderAlarmsViewBehindAfterMissedPush`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/cmd/segment-indexer/publish_loop_ladder_test.go#L321-L335) | FAIL — WARN `gap=no_row` | PASS — ERROR `gap=view_behind` |
| 감시 70번(35분, 재측정용) | FAIL — 적재 0 · 발행 3에서 정지 · WARN 한 줄 | PASS — 적재 1 · 발행 6 |

## 감시가 장부 끝을 직접 견주고, 뒤처짐은 ERROR로 알립니다

push 하나에 기대면 같은 구멍이 남습니다. 다른 상자가 뒤 행까지 모두 넣으면 이 상자로는 push가 하나도 오지 않습니다. 그래서 30초 감시가 그 스트림 장부의 마지막 번호를 함께 읽어, 그 번호가 뷰 끝 너머면 불일치로 셉니다([`drift.go` 61–115행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/cache/drift.go#L61-L115)). 처음에는 「머리+1 행이 뷰에 없음」만 더했습니다. 그런데 머리+1이 뷰 안의 미확정 행이고 그 세션이 이미 끝나 사다리가 꺼졌다면, 그 뒤 다른 프로세스가 연 새 세션은 머리+1 대조로 영영 보이지 않아 장부 끝 대조를 더했습니다. 연속 두 번 불일치면 적재하는 가드는 그대로라 push 없는 뒤처짐은 감시 두 번, 약 60초 뒤에 잡힙니다.

장부 자체에 빈 번호가 있으면 적재가 그 자리에서 멈춰 뒤처짐이 풀리지 않습니다. 설계상 번호는 꼬리+1이라 빈자리가 없어야 하지만, 생기면 감시마다 적재가 되풀이됩니다. 그래서 같은 빈자리에 한해 적재까지의 감시 수를 2, 4, 8로 두 배씩 늘려 64(약 32분)에서 멈추고, 뷰가 장부를 따라잡거나 감시가 일치를 보면 2로 되돌립니다([같은 파일 15–42행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/cache/drift.go#L15-L42)).

경보는 갈래를 나눴습니다. 머리+1이 캐시에 없는데 장부에 있다는 것을 캐시가 알면 `gap=view_behind` ERROR입니다. 방송 종료 구간의 `no_row` WARN은 그대로 두고 범위만 좁혔습니다. 감시 쪽 경로는 뒤처짐을 첫 감시에야 알므로, 같은 정체에서 `no_row` WARN을 먼저 남겼으면 ERROR를 한 줄 더 남깁니다([`ladder.go` 219–247행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/publish/ladder.go#L219-L247), [README 신호표 아래 메모](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/README.md?plain=1#L2711-L2739)).

| 로그 | 등급 | 뜻 |
|---|---|---|
| `rewind_publish_stall_seconds gap=view_behind` | ERROR(새 값) | 머리+1이 캐시에는 없고 장부에는 있음 — 캐시 뒤처짐 |
| `rewind_publish_stall_seconds gap=no_row` | WARN(그대로) | 머리+1이 캐시에 없고 장부에 있는지도 모름 — 유입이 멈춘 모양 |
| `cache_drift_repaired kind=head` | WARN | 드리프트 적재 적용 — 이제 빈 번호 뒤 push로도 남음 |
| `stall_seal result=retry reason=ledger_ahead` | WARN(새 값) | 봉인 스위치 켬 · 봉인 직전 장부가 캐시보다 앞섬 — 봉인 안 함 · 적재 요구 |
| `stall_seal result=retry reason=ledger_failed` | WARN(새 값) | 봉인 스위치 켬 · 장부 끝을 0.5초 안에 못 읽음 — 그 틱은 봉인 안 함 |

## 봉인 직전에 같은 트랜잭션에서 장부 끝을 다시 봅니다

`REWIND_STALL_SEAL`은 기본으로 꺼진 정체 마감 스위치입니다. 켜면 목록이 5.5초 넘게 자라지 못했는데 GAP도 설 수 없을 때 목록 끝에 `#EXT-X-ENDLIST`를 붙여 봉인하고 세션을 끝냅니다. 5.5초는 갱신 의무 9초에서 엣지 지연 1.5초와 발행 예산 2초를 뺀 값입니다([README `REWIND_STALL_SEAL` 행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/README.md?plain=1#L198)).

이 스위치를 켠 경우의 위험이 하나 더 있었습니다(AI 리뷰에서 나온 지적). 다른 상자가 넣은 행이라 push가 없으면 캐시는 첫 30초 감시 전까지 뒤처짐을 모르고, 그동안 까닭은 `no_row`입니다. 봉인 문턱 5.5초가 감시보다 먼저 와서 복구 전에 세션을 닫습니다. 봉인 전 확인이 들어가기 전 판(PR의 셋째 커밋 `7c6f43c2`)에서 같은 장면을 다시 만들어 보니, push가 없으면 5.5초에 봉인되고 세션이 ending으로 가며 발행은 3에서 멈췄습니다. push 하나만 닿게 한 대조에서는 봉인 없이 적재 뒤 6까지 발행했습니다. 스위치는 기본으로 꺼져 있지만, 저는 이 위험을 같은 PR에서 고치기로 정했습니다.

봉인 전용 경로 `EndlistIfCaughtUp`은 트랜잭션 하나에서 발행 권한(fence)을 잡은 뒤, 같은 트랜잭션에서 그 스트림 장부의 마지막 번호를 시한 0.5초로 읽습니다([`freeze.go` 277–343행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/publish/freeze.go#L277-L343)). 장부 끝이 캐시 뷰의 다음 번호 이상이면 되돌리고 `ledger_ahead`로 물러납니다. 루프는 그 값을 캐시에 알려 적재를 요구합니다. 머리 다음 행이 뷰에 없는 정체라면 다음 틱부터 까닭이 `view_behind`가 돼 봉인에서 빠지고, 그 밖의 정체는 적재가 따라잡을 때까지 봉인 작업이 틱마다 같은 확인에서 물러납니다. 못 읽으면 `ledger_failed`로 그 틱은 봉인하지 않고 다음 틱에 다시 냅니다([`stall_seal.go` 106–124행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/cmd/segment-indexer/stall_seal.go#L106-L124)). 확인 없이 봉인하는 갈래는 없습니다. 고친 뒤 커밋에서 PR의 [`TestStallSealChecksLedgerAtSealTime`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/cmd/segment-indexer/stall_seal_precheck_test.go#L52-L89)과 PostgreSQL 17 시험 다섯이 통과했습니다.

확인 자리를 정하기까지 세 안을 접었습니다. 다음 감시를 기다리는 안은 진짜로 끝난 방송의 봉인이 최대 30초 늦어 5.5초 문턱을 깹니다. 봉인 1초 전에 따로 확인해 두고 그 결과를 봉인에 다시 쓰는 안은 확인과 봉인 사이에 많아야 1.8초 틈이 남았습니다. 또 그 스트림의 작업 차선(저장소를 부르는 작업을 한 번에 하나씩 돌리는 줄)이 다른 작업으로 바쁘면 진짜 끝을 닫는 최악 시간이 10초로 늘었고, 봉인 전 마지막 GAP 재시도를 밀어냈습니다. fence 획득 바로 앞에서 확인하는 안은 fence가 행 잠금을 기다리는 동안(재현에서 1.5초) 장부가 나아가도 몰랐습니다. 뒤의 두 안의 결함은 시험으로 재현했습니다. 그래서 확인을 fence 뒤 같은 트랜잭션에 넣었습니다.

봉인 작업이 거치는 순서입니다. 앞의 두 갈래는 봉인하지 않고 물러나는 길이고, 마지막 갈래에서만 ENDLIST를 씁니다.

```mermaid {#fig-seal-check kind="개념도" caption="봉인 작업은 트랜잭션 안에서 fence를 잡은 뒤 장부 끝을 시한 0.5초로 읽습니다. 장부가 앞서 있거나 못 읽으면 되돌리고 봉인하지 않으며, 따라잡았을 때만 커밋하고 ENDLIST를 씁니다. 확인부터 ENDLIST 저장 확정까지는 다른 상자의 INSERT를 막지 못합니다. PR 529 머지 커밋 기준." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/publish/freeze.go#L277-L343"}
%%{init: {"sequence": {"width": 90, "actorMargin": 8}}}%%
sequenceDiagram
  accTitle: 봉인 직전 장부 끝 확인
  accDescr: 루프가 봉인 작업에 캐시 뷰의 다음 번호를 넘깁니다. 봉인 작업은 DB에서 트랜잭션을 열고 fence를 잡은 뒤 장부 끝을 시한 0.5초로 읽습니다. 장부 끝이 다음 번호 이상이면 되돌리고 루프에 물러남을 알려 루프가 캐시 적재를 요구합니다. 읽기에 실패하면 되돌리고 다음 틱에 다시 합니다. 따라잡았으면 커밋하고 ENDLIST를 붙여 저장합니다.
  participant L as 루프
  participant P as 봉인 작업
  participant D as DB
  L->>P: 뷰 다음 번호
  P->>D: BEGIN, fence
  P->>D: 장부 끝 0.5초
  alt 장부가 앞섬
    P->>D: ROLLBACK
    P-->>L: 물러남 → 적재
  else 못 읽음
    P->>D: ROLLBACK
    P-->>L: 다음 틱 재시도
  else 따라잡음
    P->>D: COMMIT
    Note over P: ENDLIST 저장
  end
```

확인을 트랜잭션 안에 넣으면 하나가 더 걸립니다. 장부 읽기가 시한에 끊겼는데 서버의 문장이 계속 돌면, 그 트랜잭션이 쥔 fence 행 잠금도 남아 다음 틱의 fence 획득을 막습니다. pgx v5.10.0은 문맥 시한이 지나면 기본 처리기가 소켓에 시한을 걸고([`pgconn.go` 2947–2961행](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/pgconn.go#L2947-L2961), [기본 설정](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/config.go#L373-L375)), 읽기 오류가 나면 연결을 닫는 `asyncClose`를 부릅니다([1870–1886행](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/pgconn.go#L1870-L1886)). `asyncClose`는 닫기 전에 서버에 취소 요청(CancelRequest)과 Terminate를 보냅니다([770–793행](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/pgconn.go#L770-L793)). 취소 요청은 서버에 별도 연결로 보내 진행 중인 문장을 끊게 하는 프로토콜 메시지입니다([PostgreSQL 문서 — 요청 취소](https://www.postgresql.org/docs/17/protocol-flow.html#PROTOCOL-FLOW-CANCELING-REQUESTS)). 반대로 소켓만 닫히면, 연결 확인을 끈 기본 설정의 서버는 다음에 소켓을 읽거나 쓸 때에야 연결이 끊긴 것을 압니다([PostgreSQL 문서 — `client_connection_check_interval`](https://www.postgresql.org/docs/17/runtime-config-connection.html#GUC-CLIENT-CONNECTION-CHECK-INTERVAL)).

PostgreSQL 17.10 컨테이너에서 이 차이를 쟀습니다. 세션 행을 UPDATE로 잠근 트랜잭션이 [ACCESS EXCLUSIVE](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-TABLES)로 잠긴 장부 표를 시한 0.5초로 읽게 하고, 다른 연결이 그 행을 `FOR UPDATE NOWAIT`로 잡을 수 있게 되는 때를 봤습니다. 대조군은 취소 요청용 다이얼만 막았습니다.

| 경우(각 5회) | 읽기 시작부터 오류까지(시한 0.5초) | 오류 뒤 행 잠금이 풀리기까지 | 5초 뒤 서버 백엔드 |
|---|---|---|---|
| pgx 기본(취소 요청 보냄) | 501ms | 7–9ms | 없음 |
| 취소 요청만 막음 | 500–501ms | 5초 안에 안 풀림 | 남음 — 표 잠금을 쥔 연결이 끝나고 3–10ms 뒤 풀림 |

PR에서는 pgx 소스와 아래 PG 시험으로 서버가 조회를 끊는 것을 확인하고 서버 쪽 `statement_timeout`을 따로 두지 않았습니다. 위 표는 글을 쓰며 취소 요청만 막은 대조군을 더해 다시 잰 것입니다. PR의 [`TestEndlistIfCaughtUpCheckTimesOutOnServer`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/publish/freeze_pg_test.go#L417-L452)가 이 동작을 회귀 시험으로 지키므로, pgx가 취소를 보내지 않게 바뀌면 이 시험이 실패합니다. 확인이 장부 앞섬을 보고 되돌릴 때는, 연결이 멎어도 그 스트림의 작업 차선이 막히지 않도록 되돌림 문장에도 시한을 걸었습니다.

## 받아들인 한계는 넷입니다

모두 [`media/README.md`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/README.md?plain=1#L2725-L2739)와 [`freeze.go` 주석](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/publish/freeze.go#L285-L288)에 적었고, 제가 받아들이기로 정했습니다.

| 한계 | 크기 | 받아들인 이유 |
|---|---|---|
| 봉인 직전 확인 뒤에 들어온 행은 놓칠 수 있음 | 확인부터 ENDLIST 저장 확정까지 대략 1–2초 | 다른 상자의 인덱서는 fence와 상관없이 INSERT하므로 0으로 만들 수 없음. 봉인 스위치는 기본 끔 |
| 봉인 갱신 의무 모델의 최악이 9초를 넘음 | 9.5초 = 문턱 5.5 + 확인 0.5 + 발행 2.0 + 엣지 1.5 | 평소에는 수 ms를 더할 뿐이고, 0.5초를 다 쓰는 것은 DB가 붐빌 때. 문턱을 당기면 진짜 끝의 봉인 시점이 바뀌고, 발행 예산을 줄이면 봉인 PUT 실패가 늘 수 있음 |
| 두 상자가 같은 스트림을 쓰면 적재가 되풀이됨 | 끼어들 때마다 적재(많아야 10,000행)와 `cache_drift_repaired` 한 줄, 정상 복구 직전 `view_behind` ERROR 한 줄 | 되풀이 수는 끼어든 횟수를 넘지 않음. 끼어들기 자체는 아래 몫 |
| 같은 키 이중 송출 자체는 막지 않음 | 진짜 조각 유실은 그대로 | 운영 규칙과 별도 설계로 나눔 |

넷째 한계는 두 갈래로 다룹니다. 운영 쪽은 루프백 신호에 소리 트랙을 넣고, 서비스가 도는 상자마다 송출 중 목록에 시험 키가 없고 그 키의 방송이 끝난 지 6분이 지났을 때만 루프백을 보내는 규칙을 런북에 넣었습니다([PokeClip-mono PR 528](https://github.com/3K-PokeClip/PokeClip-mono/pull/528)). 코드 쪽은 live 세션을 녹화한 상자에 묶어 다른 상자의 조각이 붙지 않게 하는 설계를 이 PR 다음에 시작합니다. 첫 질문은 상자를 바꿀 때 세션이 재접속 창 300초 안에 다른 상자로 정상적으로 이어지는 경로가 있는가입니다. 상자 교체 때의 넘겨받기와 얽혀 있어 교체 런북과 함께 정해야 합니다.

## 운영 상자에 실었고, 새 경보는 아직 실물로 울린 적이 없습니다

11월 16일 밤 송출을 a로 넘긴 뒤로는 b가 대기 상자였습니다. 11월 17일 아침, 이 수정과 PR 528을 함께 품은 develop 머리로 사이드카 이미지를 빌드해 대기 상자 b에 제자리 전환으로 실었습니다(06:52–06:53). 이미지 올리기, 대기 상자 전환, 송출 넘김은 제가 승인했고 운영 작업 에이전트가 실행했습니다. 소리 트랙이 든 루프백(06:54:55)은 루프백 전 확인을 거쳐 보냈고 통과했습니다. 자격 확인(업로드 5 · 실패 0)과 감시 판정도 통과했습니다. 송출 수신(07:03)과 HTTP 대상(07:04)을 b로 넘겨, 07:04부터 b가 송출을 받습니다(비공개 기록에서 식별자를 빼고 옮김).

새 판 사이드카가 뜬 06:53부터 약 06:58까지의 로그에서 `view_behind` ERROR와 `cache_drift_repaired`, `stall_seal`은 0줄이었습니다. 되감기 정체 WARN 두 줄은 루프백 세션이 끝날 때 나온 `no_row` · `ending`으로, 유입이 멈춘 정상 종료 모양이었습니다. 같은 구간의 ERROR 두 줄은 `view_behind`가 아니라 `late_segment_skipped`였습니다. 11월 16일 7125 충돌 때 b가 버린 진짜 4초 조각 파일이 b의 디스크에 남아 있어, 재스캔 때마다 「늦은 조각」으로 건너뛴 줄입니다.

`view_behind` ERROR는 한 번도 나지 않았으므로, 이 줄이 운영 로그와 경보에서 실제로 보이는지는 아직 확인하지 못했습니다. 송출을 넘긴 뒤의 실제 방송 로그도 아직 보지 않았습니다. 봉인 스위치는 운영에서 꺼져 있어, 봉인 전 확인은 운영에서 돌지 않습니다. 캐시가 다른 쓰기자의 행을 기다리는 구조라면, 복구 장치가 그 쓰기자의 알림 없이도 동작하는지부터 확인하십시오. 알림을 전제한 복구는 알림이 오지 않는 날 조용히 멈춥니다.

## 측정 조건

- **사건 시간선(비공개 기록 요약).** 2026년 11월 16일 21:53–22:50 KST. 사이드카 · MediaMTX 로그와 DB 읽기 조회를 같은 날 23:05에 읽은 결과입니다. 스트림 키 · 시험 키 · 계정 · 상자 주소 · 세션 ID를 빼고 [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-rewind-cache-deadlock/measurements.md)에 옮겼습니다.
- **운영 반영 확인(비공개 기록 요약).** 2026년 11월 17일 06:18–07:04 KST. 운영 작업 에이전트가 런북의 확인 스크립트를 돌린 출력과 진행 기록입니다. 로그 개수는 새 판 기동(06:53:35)부터 약 06:58까지입니다. 계정 · 상자 · 대상 그룹 이름과 이미지 다이제스트를 빼고 옮겼습니다.
- **공개 재측정.** AI(Claude Code)가 2026년 11월 17일 07:12–07:16 KST에 실행했습니다(원자료 시각은 07:12–07:14). MacBook Air(Apple M5, 32GB), macOS 27.0.1, Go 1.27.2 darwin/arm64, OrbStack(Docker Engine 29.8.2, Linux VM 커널 7.2.12-orbstack, aarch64), `postgres:17`(PostgreSQL 17.10, 다이제스트는 `raw/env-pg.txt`), pgx v5.10.0.
- **커밋.** 3K-PokeClip/PokeClip-mono의 고치기 전 `0dc13a68`(PR 첫 커밋 `c0b7696a`의 부모), 봉인 전 확인 전 `7c6f43c2`(PR 셋째 커밋), 고친 뒤 `00cfa2d6`(develop 머지 커밋)를 `git archive`로 풀어 `go test -count=1 -race -p 1`로 한 번씩 돌렸습니다. PR 회귀 시험 둘은 머지 커밋의 시험 코드 203–261 · 320–335행을 고치기 전 트리에 그대로 옮겼습니다. 「감시 70번」과 봉인 재현은 이 저장소에만 있는 재측정용 시험(`rmtest/`)입니다. 시험 시계는 감시 한 번을 30초로 놓은 가짜 시계라, 실제 경과 시간을 잰 것은 아닙니다.
- **pgx 탐침.** PostgreSQL 17.10 컨테이너 하나(라벨 `com.techblog.bench=rewind`, 데이터 tmpfs)에서 경우마다 5회 돌렸습니다. 서버 설정은 `client_connection_check_interval=0`, `statement_timeout=0`이고, 「풀리기까지」는 탐침 연결을 여는 시간을 포함합니다.
- **명령.** `measure/` 폴더에서 `MONO_DIR=<PokeClip-mono 클론> ./run.sh extract` → `./run.sh unit <결과 폴더>` → `./run.sh pg-up` → `./run.sh pg <결과 폴더>` → `./run.sh down`(라벨 컨테이너와 `/tmp/rewindw-*`만 지움). 커밋된 원자료를 덮지 않으려면 결과 폴더를 새로 주십시오. 스크립트 · 시험 · 원자료는 [저장소 `_workspace/blog/pokeclip-rewind-cache-deadlock/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-rewind-cache-deadlock/measure)에 있습니다.

## 출처

코드 · 시험(공개 저장소 3K-PokeClip/PokeClip-mono)
- [PokeClip-mono PR 529](https://github.com/3K-PokeClip/PokeClip-mono/pull/529) — 빈 번호 뒤 재적재, 감시 장부 끝 대조, `view_behind` ERROR, 봉인 전 장부 확인(2026-11-17 05:06 KST develop 병합, 머지 커밋 `00cfa2d6`)
- [PokeClip-mono PR 528](https://github.com/3K-PokeClip/PokeClip-mono/pull/528) — 루프백 신호의 소리 트랙과 루프백 전 송출 확인(머지 커밋 `f75bdcab`)
- 고치기 전 `0dc13a68`: [`cache.go` 247–264행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/rewind/cache/cache.go#L247-L264) — 다음 번호만 싣는 push · [485–494행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/rewind/cache/cache.go#L485-L494) — 머리+1 확정 대조 · [`producer.go` 224–242행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/playback/producer.go#L224-L242) · [`axis_body.go` 302–305행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/upload/axis_body.go#L302-L305) — 소리 없는 조각 거부 · 같은 입력 같은 실패 · [`ladder.go` 203–225행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/rewind/publish/ladder.go#L203-L225) — `no_row` WARN · [`gap.go` 21–43행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/rewind/publish/gap.go#L21-L43) — GAP 문장 · [`indexer.go` 753–771행](https://github.com/3K-PokeClip/PokeClip-mono/blob/0dc13a68be5c257dd7d6b85a2d528b018e3acac4/media/internal/indexer/indexer.go#L753-L771) — 번호 충돌 재적재
- 고친 뒤 `00cfa2d6`: [`cache.go` 264–291행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/cache/cache.go#L264-L291) · [`drift.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/cache/drift.go) · [`ladder.go` 148–247행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/publish/ladder.go#L148-L247) · [`freeze.go` 277–343행](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/publish/freeze.go#L277-L343) · [`stall_seal.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/cmd/segment-indexer/stall_seal.go) · [`media/README.md` 신호 메모](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/README.md?plain=1#L2711-L2724) · [「알려진 한계」](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/README.md?plain=1#L2725-L2739)
- 시험: [`publish_loop_ladder_test.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/cmd/segment-indexer/publish_loop_ladder_test.go#L211-L335) · [`stall_seal_precheck_test.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/cmd/segment-indexer/stall_seal_precheck_test.go) · [`freeze_pg_test.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/00cfa2d6e3f63594c5ab8aac9a26fd83d874b951/media/internal/rewind/publish/freeze_pg_test.go#L299-L542)

pgx 소스(v5.10.0 태그)
- [`pgconn/pgconn.go` 770–793행](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/pgconn.go#L770-L793) — `asyncClose`: CancelRequest → Terminate → Close
- [`pgconn/pgconn.go` 1870–1886행](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/pgconn.go#L1870-L1886) — 결과 읽기 오류에서 `asyncClose`
- [`pgconn/pgconn.go` 2947–2961행](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/pgconn.go#L2947-L2961) · [`pgconn/config.go` 373–375행](https://github.com/jackc/pgx/blob/v5.10.0/pgconn/config.go#L373-L375) — 기본 처리기 `DeadlineContextWatcherHandler`

PostgreSQL 17 문서
- [Protocol Flow — Canceling Requests in Progress](https://www.postgresql.org/docs/17/protocol-flow.html#PROTOCOL-FLOW-CANCELING-REQUESTS)
- [Connection Settings — `client_connection_check_interval`](https://www.postgresql.org/docs/17/runtime-config-connection.html#GUC-CLIENT-CONNECTION-CHECK-INTERVAL) — 기본 0, 연결 끊김은 다음 소켓 작업에서야 앎
- [Explicit Locking — Table-Level Locks](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-TABLES)

실측
- [실측 요약](https://github.com/xodbs1021/xodbs1021.github.io/blob/main/_workspace/blog/pokeclip-rewind-cache-deadlock/measurements.md) — 사건 시간선 · 운영 반영 확인(비공개 기록에서 식별자를 빼고 옮김)과 공개 재측정
- [공개 재측정 스크립트 · 시험 · 원자료](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-rewind-cache-deadlock/measure)

이어지는 글
- [HLS 재생 목록은 연속으로 확정된 조각까지만 공개했습니다](/posts/0-to-1/pokeclip-manifest-window-boundaries/) — 머리 · 확정 · GAP 규칙
- [늦게 끝난 발행이 새 HLS 목록을 덮지 못하게 했습니다](/posts/0-to-1/pokeclip-database-authoritative-manifest-publishing/) — 세대 · fence · 종료 전이
- [IMDS 홉 상한을 1로 내리고 자격 창구를 따로 세웠습니다](/posts/0-to-1/pokeclip-media-imds-credential-relay/) — 같은 밤 루프백이 겹친 운영 쪽 경위
