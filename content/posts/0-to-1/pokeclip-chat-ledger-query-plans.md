---
title: "EXISTS와 일반 계획이 채팅 조회를 끝까지 훑게 했습니다"
date: 2026-11-14T22:28:44+09:00
lastmod: "2026-11-16T21:33:10+09:00"
categories: ["projects"]
tags: ["PokeClip", "PostgreSQL", "실행 계획", "pgjdbc", "색인"]
draft: false
author: "김태윤"
description: "채팅 시각을 영상 위치로 바꾸는 녹화 장부 조회가 907,200행 시험 장부에서 자리마다 수천–1만 버퍼를 읽은 과정. 표 전체를 Seq Scan 하던 EXISTS 역행 검사를 ORDER BY … LIMIT 1로 바꾸고, 판 2 후보 앞에 min 존재 확인을 세우고, pgjdbc가 다섯 번째 실행부터 올리는 서버 준비 문장을 그 조회 하나만 끈 결정. PostgreSQL 17.12 공개 재측정 12,685 → 21, 7,246 → 4, 7,249 → 11 버퍼와 거의 그대로 남은 중간 시각 3,625 → 3,629 버퍼, 아직 운영에 들어가지 않은 상태까지."
---

PokéClip의 채팅 급증 판별기는 하이라이트 카드를 만들 때마다 채팅 수집기에 영상 위치를 한 번 묻습니다. 수집기는 그 답을 내려고 녹화 장부에서 조각 하나를 고르는데, 방송 셋을 담은 시험 장부(표 907,200행)에서 이 조회의 세 자리가 시각에 따라 7,246–12,685 버퍼를 읽었습니다. 같은 뜻을 다른 SQL 꼴로 바꾸고 한 조회의 서버 준비 문장을 끄자, 옛 역행 검사는 꼬리 시각에서 12,685 버퍼가 21 버퍼로, 판 2 후보 조회는 이른 시각의 일반 계획에서 7,246 버퍼가 4 버퍼로 줄었습니다. 첫 판 2 조각 바로 뒤 시각은 일반 계획을 강제했을 때의 7,249 버퍼 대신 바인딩 값 계획의 11 버퍼로 돌게 됐습니다. 판 2 행 한가운데 시각은 3,625 버퍼에서 3,629 버퍼로 거의 그대로 남았습니다. 수치는 2026년 11월 14일 PostgreSQL 17.12에서 공개 스크립트로 다시 잰 값입니다([측정 조건](#측정-조건)).

어떤 꼴을 받아들일지, 어느 비용을 남길지는 제가 정했습니다. 조회 수정 · 시험 · 실측과 이 글의 재측정은 AI 에이전트(Claude Code와 Codex)가 했습니다. 바뀐 조회는 11월 14일 0시 30분 develop에 병합됐지만(PR 511) 아직 운영 채팅 이미지에 없고, 생산자가 더한 색인(PR 510)도 운영 DB에 적용하기 전입니다.

## 채팅 시각을 영상 위치로 바꾸려면 장부에서 조각 하나를 골라야 합니다

채팅 급증 판별기(chat-detector)는 [사건마다 첫 급증 창의 시각 하나로](/posts/0-to-1/chat-highlight-research-and-fallback/) 채팅 수집기(chat-collector)의 영상 위치 창구를 부릅니다. 수집기는 채팅 시각에서 보정값(기본 3,900ms)을 빼 시각 t를 만들고, 녹화 장부 `stream_segments`에서 t 이하의 기준 조각을 골라 영상 위치로 바꿉니다.

장부 행에는 판(`timing_version`)이 있습니다. 판 NULL은 옛 규칙으로 쓴 행이고 파일명 시각(`start_wall_utc`, 수신 벽시각 칸)으로 조각을 고릅니다. 지금 운영 장부의 모든 행이 판 NULL입니다. 판 2는 새 규칙으로 쓴 행이고, `playback_pdt`(그 조각 영상 첫 표본의 벽시각)로 조각을 고릅니다. 판 2 행은 생산자의 판 2 쓰기 스위치를 켠 뒤에만 생깁니다(PR 511 각주). PDT(Program Date Time)와 장부가 왜 두 시각을 갖게 됐는지는 [미디어 시간축 글](/posts/projects/pokeclip-media-timeline-over-wall-clock/)에 있습니다.

그래서 조회는 두 갈래입니다. 판 NULL 행에서는 「파일명 시각이 t 이하인 행 가운데 가장 늦은 행」을 고르고, 그 조각보다 seq가 앞서는데 파일명 시각이 늦은 행이 있으면 벽시계가 거꾸로 갔다는 역행 신호를 함께 냅니다. 판 2 행에서는 「PDT가 t 이하인 판 2 행 가운데 seq 최대」를 고릅니다.

비용은 PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)`가 세는 버퍼로 쟀습니다. 버퍼 하나는 조회가 읽은 8KB 페이지 하나입니다. 시험 장부는 공개 시험 코드의 세 방송(판 2 행 30만, 판 NULL 행 30만, 판 2 행 30만 뒤 판 NULL 행 7,200인 롤백 방송)을 그대로 세웠습니다. 조각은 4초, PDT는 조각 순서대로 늘고, 파일명 시각은 PDT보다 200ms 이릅니다. 운영 장부(약 5,500행, PR 510 본문)보다 훨씬 큰 시험입니다.

[[fig-ledger-buffers]]에서 회색 막대가 바꾸기 전, 청록 막대가 바꾼 뒤입니다. 눈금이 선형이라 바꾼 뒤의 21 · 4 · 11 버퍼는 막대가 거의 보이지 않습니다.

{{< chart id="fig-ledger-buffers" kind="실측" caption="자리별로 바꾸기 전과 바꾼 뒤 조회가 읽은 버퍼. 옛 역행 검사는 판 NULL만 있는 방송에서 바인딩 값 계획끼리, 판 2 후보는 판 2만 있는 방송에서 쟀습니다. 판 2 이른 시각은 일반 계획끼리, 첫 PDT + 1ms는 일반 계획과 바인딩 값 계획을 견줬습니다. 중간 시각은 바꾼 뒤에도 그대로라 두 막대 모두 회색입니다. PostgreSQL 17.12, 표 907,200행, 자리마다 5회 모두 같은 버퍼." source="https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-chat-ledger-query-plans/measure" height="400px" >}}
{"grid":{"left":8,"right":56,"top":40,"bottom":8,"containLabel":true},"legend":{"top":0,"data":["바꾸기 전","바꾼 뒤"]},"xAxis":{"type":"value","name":"버퍼","min":0,"max":14000,"interval":3500},"yAxis":{"type":"category","inverse":true,"data":["역행 검사 · 꼬리","역행 검사 · 첫 행+1초","판 2 · 이른 시각","판 2 · 첫 PDT+1ms","판 2 · 중간 시각"]},"series":[{"name":"바꾸기 전","type":"bar","barWidth":14,"itemStyle":{"color":"#7a8a9b"},"label":{"show":true,"position":"right","formatter":"{c}"},"data":[12685,12685,7246,7249,3625]},{"name":"바꾼 뒤","type":"bar","barWidth":14,"itemStyle":{"color":"#087f8b"},"label":{"show":true,"position":"right","formatter":"{c}"},"data":[21,5498,4,11,{"value":3629,"itemStyle":{"color":"#7a8a9b"}}]}]}
{{< /chart >}}

| 자리 | 견준 계획 | 바꾸기 전 버퍼 | 바꾼 뒤 버퍼 |
|---|---|---:|---:|
| 역행 검사 · 꼬리 | 바인딩 값 계획끼리 | 12,685 | 21 |
| 역행 검사 · 첫 행+1초 | 바인딩 값 계획끼리 | 12,685 | 5,498 |
| 판 2 · 이른 시각 | 일반 계획끼리 | 7,246 | 4 |
| 판 2 · 첫 PDT+1ms | 일반 계획 → 바인딩 값 계획 | 7,249 | 11 |
| 판 2 · 중간 시각 | 두 계획 같음 | 3,625 | 3,629 |

세 자리가 같은 크기를 읽은 것은 아닙니다. 옛 역행 검사의 비용은 표 전체 행 수에, 판 2 후보 조회의 비용은 그 방송의 판 2 행 수(30만)에 비례했습니다. 옛 역행 검사는 판 NULL만 있는 방송을 물어도 다른 두 방송의 행 60만여 개까지 읽었습니다.

## 옛 역행 검사는 방송과 무관하게 표 전체를 읽었습니다

역행 신호는 8월에 처음 들어온 조회에 있던 `EXISTS(… y.seq < s.seq AND y.start_wall_utc > s.start_wall_utc)`였습니다(`SegmentLedger.java`@5ad61a0c). 그때 주석도 이 `EXISTS`가 Seq Scan을 탄다고 적고, 판별기가 붙으면 `(stream_id, start_wall_utc)` 색인이 필요하다고 적었습니다. 그 색인(`stream_segments_wall_idx`)이 있는 지금 장부에서도 이 꼴은 Seq Scan을 골랐습니다. 꼬리 시각에서 12,685 버퍼, 28.1–29.3ms였습니다.

PR 511은 이 조회에 판 조건(`timing_version IS NULL`)을 더했습니다. 판 조건만 더하고 `EXISTS`를 그대로 둔 꼴도 12,685 버퍼, 36.7–38.9ms였습니다. 이 가운데 12,668 버퍼는 907,200행을 모두 걸러 내고도 맞는 행을 찾지 못한 Seq Scan 마디 하나가 읽었습니다.

꼬리 시각에서는 장부가 단조라 맞는 행이 없는 것이 정상입니다. 정상 방송일수록 「역행 없음」을 답하려고 표를 끝까지 읽는 구조였습니다.

## 최댓값 하나와 견주자 색인 끝에서 멈췄습니다

11월 13일 15시 52분, 역행 검사를 다시 쓰기로 정했습니다. 「seq가 앞서는데 파일명 시각이 늦은 행이 있나」는 「seq가 앞서는 판 NULL 행 가운데 파일명 시각 최댓값이 기준 조각보다 늦은가」와 같은 뜻입니다. 앞선 행이 없으면 거짓입니다. 그래서 최댓값 하나를 `ORDER BY … LIMIT 1`로 꺼내 견주는 꼴이 됐습니다(`SegmentLedger.java`@7c3464e3).

```sql
-- 바꾸기 전(판 조건을 더한 뒤): 맞는 행을 찾을 때까지 훑는다
EXISTS(SELECT 1 FROM public.stream_segments y
        WHERE y.stream_id = s.stream_id AND y.timing_version IS NULL
          AND y.seq < s.seq AND y.start_wall_utc > s.start_wall_utc) AS earlier_is_future

-- 바꾼 뒤: 앞선 행 가운데 파일명 시각 최댓값 하나와 견준다
COALESCE((SELECT y.start_wall_utc FROM public.stream_segments y
           WHERE y.stream_id = s.stream_id AND y.timing_version IS NULL AND y.seq < s.seq
           ORDER BY y.start_wall_utc DESC
           LIMIT 1) > s.start_wall_utc, false) AS earlier_is_future
```

[[fig-ledger-scan-stop]]에서 위 줄과 아래 줄이 언제 멈추는지 보면 됩니다.

{{< motion scene="LedgerScanStop" id="fig-ledger-scan-stop" kind="재구성" caption="EXISTS 꼴 역행 검사는 표 전체(세 방송, 907,200행)를 읽고 「맞는 행 없음」에서 끝납니다. ORDER BY … LIMIT 1 꼴은 그 방송의 판 NULL 색인(stream_segments_legacy_wall_idx)을 파일명 시각이 늦은 쪽부터 읽어 첫 항목에서 멈춥니다. 두 막대는 같은 선형 눈금이고 길이는 조회 전체가 읽은 버퍼 수(12,685 : 21, 약 600배)에 비례합니다. 아래 막대는 몇 픽셀뿐이라 앞 100 버퍼를 60배로 키운 칸을 함께 둡니다. 버퍼 수는 판 NULL만 있는 방송 · 꼬리 시각 재측정 값이고, 막대가 차오르는 속도는 설명용입니다." >}}

바꾼 꼴은 꼬리 시각에서 21 버퍼, 0.055–0.064ms였고 롤백 방송도 21 버퍼였습니다.

모든 시각이 짧아지지는 않았습니다. 꼬리에서 먼 시각(첫 행 + 1초)에서는 seq가 앞선 행이 없어 색인을 끝까지 내려가므로, 그 방송의 판 NULL 행 30만 개만큼 읽어 5,498 버퍼, 15.3–16.2ms였습니다. 표 전체가 아니라 그 방송의 행 수에 비례하고, 판 NULL 행이 7,200개인 롤백 방송에서는 377 버퍼였습니다.

두 꼴의 답은 PR 511 시험의 4,000번과, 원 시험의 장부 생성 규칙을 옮긴 재측정 500번(역행 신호 참 38번 포함)에서 기준 조각 · 후보 최대 seq · 역행 신호 셋이 모두 같았습니다.

## 색인을 깔아도 일반 계획은 판 2 행을 끝까지 훑었습니다

판 2 후보 조회의 처음 꼴은 판 2 부분 색인 `stream_segments_v2_seq_idx`를 seq 역순으로 타며 PDT ≤ t인 첫 행을 찾습니다. 꼬리 시각이면 4 버퍼입니다. 그런데 t가 그 방송의 첫 판 2 PDT보다 이르면 맞는 행이 없으니 그 방송의 판 2 행 30만 개를 끝까지 훑습니다. 판 2 PDT 색인이 없을 때는 바인딩 값을 보고 세운 계획(custom plan)이든 값을 모르고 세운 일반 계획(generic plan)이든 7,246 버퍼였습니다.

11월 13일 18시 28분, 세 안 가운데 생산자 색인 요청을 골랐습니다. AI의 추천은 받아들이고 기록만 하는 안이었습니다.

| 안 | 내용 | 결과 |
|---|---|---|
| 생산자 색인 | 생산자에 판 2 PDT 색인을 요청하고, 본 조회 앞에 「PDT ≤ t인 판 2 행이 있나」를 먼저 묻는다 | 선택 |
| 수집기 캐시 | 채팅 수집기 안에 방송별 「판 2 최소 PDT」를 둔다 | 기각 |
| 기록만 | 비용을 받아들이고 기록한다 | 기각(AI 추천안) |

생산자는 `stream_segments_v2_pdt_idx (stream_id, playback_pdt DESC) WHERE timing_version = 2`를 더했습니다(PR 510, `ddl.go`@fc7dd91c).

색인만 깔고 조회를 그대로 두면 계획에 따라 결과가 갈렸습니다. 바인딩 값 계획은 t가 첫 PDT보다 이르다는 것을 알고 새 색인으로 빈 범위를 확인해 6 버퍼였습니다. 일반 계획은 t를 모르니 색인이 없을 때와 같이 seq 역순 훑기를 골라 7,246 버퍼였습니다.

## 존재 확인은 EXISTS가 아니라 min으로 썼습니다

제가 정한 확인 문언은 `EXISTS(… playback_pdt <= ?)`였습니다. AI가 재 보니 이 꼴은 일반 계획에서 표 전체를 Seq Scan했습니다. 재측정에서도 이른 시각 일반 계획 12,668 버퍼, 36.8–39.8ms였고, Seq Scan 마디가 907,200행을 모두 걸렀습니다. 이 꼴은 커밋된 적이 없어 PR 511 본문의 문언대로 재구성해 쟀습니다.

PostgreSQL 플래너는 `EXISTS` 하위 조회를 첫 행만 가져오는 조회, 주석 표현으로 「just like a LIMIT 1」로 계획합니다([`subselect.c`](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/optimizer/plan/subselect.c#L191-L211)). 여기에 일반 계획이 `playback_pdt <= $4`가 꽤 많은 행에 맞는다고 어림해, 표를 앞에서부터 읽어도 곧 찾으리라 보고 Seq Scan을 골랐다는 것은 AI의 해석입니다. 맞는 행이 없으면 표 끝까지 읽습니다.

그래서 확인을 `min`으로 바꿔 썼습니다(`SegmentLedger.java`@7c3464e3).

```sql
SELECT seq, start_pts_ms, start_wall_utc, playback_pdt, timing_version, duration_ms, is_discontinuity
  FROM public.stream_segments
 WHERE stream_id = ? AND timing_version = 2 AND playback_pdt <= ?
   AND (SELECT min(e.playback_pdt) FROM public.stream_segments e
         WHERE e.stream_id = ? AND e.timing_version = 2) <= ?
 ORDER BY seq DESC
 LIMIT 1
```

「그 방송 판 2 행의 최소 PDT ≤ t」는 「PDT ≤ t인 판 2 행이 있다」와 같은 뜻입니다. 판 2 행이 없으면 최솟값이 NULL이라 거짓입니다. PostgreSQL 플래너는 `min`을 「`ORDER BY` 그 칸 `LIMIT 1`」 꼴의 하위 조회로 바꿔 색인 한쪽 끝을 읽을 수 있습니다([`planagg.c` 머리 주석](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/optimizer/plan/planagg.c#L1-L18)). 이 최솟값은 t와 상관없으니 일반 계획에서도 새 색인 끝 한 항목입니다. 거짓이면 본 조회를 건너뜁니다.

재측정에서 이른 시각 일반 계획은 4 버퍼, 바인딩 값 계획은 7 버퍼였습니다. 대가로 꼬리 시각은 4 버퍼가 8 버퍼로 늘었습니다. 세 꼴의 답은 재측정 500번(PR 511 시험 4,000번)에서 모두 같았습니다.

## 답을 고르는 조회는 그대로라 중간 시각 비용은 남았습니다

존재 확인은 「있나」만 빠르게 합니다. 답(seq 최대)은 여전히 `v2_seq_idx`를 seq 역순으로 타며 고릅니다. 답이 있고 그 뒤에 판 2 행이 많은 시각이면 본 조회가 그 행들을 지나야 답에 닿습니다. 판 2 행 약 15만 번째 조각 시각에서 3,629 버퍼, 8.8–9.4ms였고, 바인딩 값 계획과 일반 계획이 같았습니다. 바꾸기 전 꼴도 이 시각에 3,625 버퍼였습니다.

PDT 색인으로 답까지 고르면 이 비용이 없어 보이지만, 그 지름길은 틀린 답을 냅니다. 판 2 PDT는 seq 순서대로 늘지 않습니다. 회차가 바뀌면 PDT가 뒤로 갈 수 있고, 장 경계에서는 1초 미만 겹칩니다. 공개 시험의 행으로 보면 이렇습니다(`VideoPositionV2Test`@7c3464e3).

| seq | 판 | PDT(기준 시각부터) |
|---|---|---|
| 100 | 2 | 20.0초 |
| 101 | NULL | — |
| 102 | 2 | 17.0초(회차가 바뀌어 뒤로 감) |

t = 20.5초면 두 판 2 행 모두 PDT ≤ t입니다. seq 최대는 실제로 그 시각에 방송되던 seq 102를 고르고, PDT 최대는 앞 회차의 seq 100을 고릅니다. t = 18초처럼 seq 102만 후보인 시각에서는 두 방법의 답이 같습니다. 재측정 표본 500번에서는 PDT 최대 지름길이 73번 다른 답을 냈습니다.

11월 13일 19시 9분, 존재 확인을 앞세우고 답은 seq 역순으로 고르는 꼴을 유지하며 중간 시각 비용은 받아들이기로 했습니다. 판별기는 카드마다 한 번 부르고, 그 시각은 보통 라이브 머리라 꼬리 몇 행이라는 것이 PR에 적은 근거입니다.

## 열 번째 실행부터는 서버가 값을 모르는 계획을 고를 수 있었습니다

남은 자리는 첫 판 2 PDT 바로 뒤 시각이었습니다. 답이 있으니 존재 확인은 통과하고, 답은 첫 행이니 seq 역순 본 조회는 그 방송 판 2 행 거의 전부를 지납니다. 바인딩 값 계획은 t가 첫 PDT 바로 뒤라는 것을 알고 새 PDT 색인으로 좁은 범위를 읽어 11 버퍼였습니다. 일반 계획은 t를 모르니 seq 역순을 골라 7,249 버퍼, 17.5–18.2ms였습니다.

앱에서 이 조회가 일반 계획으로 도는지는 드라이버와 서버가 정합니다. 같은 연결에서 같은 SQL의 다섯 번째 실행 때 pgjdbc가 이름 붙은 문장으로 올리고, 서버는 그 문장의 처음 다섯 번(전체 5–9번째)을 바인딩 값으로 계획하므로, 일반 계획은 열 번째 실행부터 가능합니다. [[fig-prepare-sequence]]에서 「이름 없음」과 `S_1`이 갈리는 지점을 보면 됩니다.

```mermaid {#fig-prepare-sequence kind="재구성" caption="pgjdbc는 같은 연결에서 같은 SQL의 1–4번째 실행을 이름 없는 문장으로 보내고, 5번째 실행부터 이름 붙은 서버 준비 문장으로 올립니다. PostgreSQL은 이름 붙은 문장의 처음 다섯 번(전체 5–9번째)을 바인딩 값으로 계획하고, 10번째부터는 일반 계획의 예상 비용이 그 평균보다 크게 높지 않으면 일반 계획을 쓸 수 있습니다. 문턱을 0으로 둔 문장은 늘 이름 없는 문장입니다. pgjdbc 서버 준비 문서와 PostgreSQL 17 PREPARE 문서 재구성." source="https://jdbc.postgresql.org/documentation/server-prepare/"}
%%{init: {"sequence": {"width": 96, "actorMargin": 10}}}%%
sequenceDiagram
  accTitle: pgjdbc 서버 준비 문장과 PostgreSQL 계획 선택
  accDescr: 앱이 같은 연결에서 같은 조회를 되풀이하면 pgjdbc는 1번째부터 4번째 실행까지 이름 없는 문장으로 보내고 서버는 매번 바인딩 값으로 계획합니다. 5번째 실행부터 pgjdbc는 S_1이라는 이름 붙은 문장으로 올리고, 서버는 5번째부터 9번째까지 바인딩 값으로 계획한 뒤 10번째부터 비용을 견줘 일반 계획을 쓸 수 있습니다. 문턱이 0인 문장은 몇 번째 실행이든 이름 없는 문장이라 늘 바인딩 값으로 계획합니다.
  participant A as 앱
  participant J as pgjdbc
  participant P as PostgreSQL
  A->>J: 1–4번째
  J->>P: 이름 없는 문장
  Note over P: t를 보고
  A->>J: 5번째부터
  J->>P: S_1 준비
  Note over P: 5–9번째는<br/>t를 보고,<br/>10번째부터<br/>일반 계획 가능
  A->>J: 문턱 0
  J->>P: 이름 없는 문장
  Note over P: 늘 t를 보고
```

pgjdbc는 연결마다 같은 SQL의 실행 횟수를 세다가(앱이 호출마다 PreparedStatement를 새로 만들어도 연결의 문장 캐시로 셉니다) `prepareThreshold`(기본 5)에 닿으면 이름 붙은 서버 준비 문장으로 바꿉니다([pgjdbc 문서](https://jdbc.postgresql.org/documentation/server-prepare/), [`PgStatement.isOneShotQuery`](https://github.com/pgjdbc/pgjdbc/blob/REL42.7.11/pgjdbc/src/main/java/org/postgresql/jdbc/PgStatement.java#L423-L430)). 이름 없는 문장은 Bind 때 그 값으로 계획합니다([PostgreSQL 17 프로토콜 흐름](https://www.postgresql.org/docs/17/protocol-flow.html)). 이름 붙은 문장은 기본 설정(`plan_cache_mode = auto`)에서 처음 다섯 번을 바인딩 값으로 계획하고, 여섯 번째부터는 일반 계획의 예상 비용을 그 평균과 견줘 일반 계획을 쓸 수 있습니다([PostgreSQL 17 PREPARE](https://www.postgresql.org/docs/17/sql-prepare.html)).

여기서 일반 계획 수치는 `plan_cache_mode = force_generic_plan`으로 일반 계획을 강제해 흉내 낸 값입니다. 운영의 `auto` 모드에서 이 조회가 실제로 일반 계획으로 넘어가는지는 재지 않았습니다.

## 그 조회 하나만 서버 준비 문장을 껐습니다

11월 13일 21시 34분, 판 2 후보 조회 하나만 서버 준비 문장을 끄기로 했습니다. 문장마다 `setPrepareThreshold(0)`을 걸면 그 조회는 몇 번을 불러도 이름 없는 문장이고, 매번 바인딩 값으로 계획합니다(`SegmentLedger.java`@7c3464e3). PR은 연결 풀이나 데이터소스 설정을 바꾸면 다른 조회의 계획까지 바뀐다는 점을 근거로 적었습니다. 대가는 호출마다 Parse 한 번입니다.

시험은 앱 경로로 이 조회를 열두 번 부른 뒤 그 연결의 `pg_prepared_statements`에 이 조회가 없다는 것만 단언하고, 기본 설정으로 부른 대조 문장은 올라가야 통과합니다(`SegmentLedgerPrepareTest`@7c3464e3). 앞의 11 버퍼는 앱 경로가 아니라 바인딩 값 계획으로 잰 `EXPLAIN` 값이고, 이 시험은 이번 재측정에서 돌리지 않았습니다.

다른 조회는 기본 문턱 그대로입니다. 재측정에서 옛 역행 검사 조회를 일반 계획으로 강제하면 꼬리에서 먼 시각(첫 행 + 1초)에 14,806 버퍼였습니다. 바인딩 값 계획의 5,498 버퍼보다 많고, 늘어난 몫은 바꾸지 않은 후보 최대 seq 하위 조회(`max(x.seq)`)가 기본 키를 역순으로 훑은 것입니다. 바꾸기 전 꼴도 같은 시각 일반 계획에서 21,993 버퍼였으니 바꾼 꼴이 나빠진 것은 아닙니다. 이 조회가 운영에서 일반 계획으로 넘어가는지도 재지 않았습니다.

## 운영에는 아직 들어가지 않았습니다

PR 511은 develop에 병합됐을 뿐 운영 채팅 이미지에 들어가지 않았습니다. PR 510의 색인도 운영 DB에 적용하기 전이고, 판 2 쓰기 스위치를 켜기 전에 적용해야 한다는 조건이 붙어 있습니다. 운영 장부는 지금 판 2 행이 없고 표는 약 5,500행입니다(PR 510 「배포」, PR 511 「배포 · 운영 조건」).

색인 없이 판 2 행이 생기면 답은 같고 비용만 커집니다. 재측정에서 PR 510 색인을 지우고 `min` 꼴을 돌리면 꼬리 시각이 8 버퍼에서 4,530 버퍼로, 앱이 쓰는 바인딩 값 계획의 첫 PDT + 1ms가 11,771 버퍼로 늘었습니다. 판 2 행이 없는 방송도 계획에 따라 그 방송 행을 모두 읽어 4,241 버퍼였습니다. 판 2 행이 표에 하나도 없는 지금 운영과 같은 꼴(판 NULL 30만 행만 남긴 표)에서는 색인이 없어도 1 버퍼였습니다.

## 같은 뜻의 SQL도 「없음」이 답일 때 비용을 재 봐야 합니다

`EXISTS`와 seq 역순 `LIMIT 1`은 맞는 행이 곧 나오면 짧고, 맞는 행이 없으면 범위 끝까지 읽습니다. 이번 세 자리(역행 없는 정상 방송, 첫 조각보다 이른 시각, 첫 조각 바로 뒤 시각)는 모두 답이 「없음」이거나 범위 맨 끝에 있었습니다. 같은 뜻의 다른 꼴을 고를 때는 꼬리 시각 하나가 아니라 답이 없는 시각과 범위 끝 시각을, 바인딩 값 계획과 일반 계획 양쪽으로 재 봐야 합니다. 존재를 묻는 자리라면 `EXISTS`보다 t에 매이지 않는 최솟값이나 최댓값 하나를 색인 끝에서 꺼내 견주는 꼴이 계획에 덜 흔들렸습니다. 같은 max라도 t 조건이 붙은 후보 최대 seq 하위 조회는 일반 계획에서 기본 키를 훑었습니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 14일 KST 12:48–12:49에 실행했습니다. load average(1분)는 회차별로 1.82–2.37이었고, 같은 기계에서 다른 작업의 컨테이너가 함께 돌았습니다. ms는 참고값이고 판단은 버퍼로 했습니다.
- 기종: MacBook Air(Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1.
- Docker 런타임: OrbStack(Docker Engine 29.8.2, Linux VM 커널 7.2.12-orbstack, VM CPU 10개). 이미지 `postgres:17.12`(`sha256:dbb9623d5121b5d2c2c9e2fba56e40193cbb3510d4af7f035b1ab1823aff3205`), `SELECT version()` = `PostgreSQL 17.12 (Debian 17.12-1.pgdg13+1) on aarch64-unknown-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit`. 설정은 이미지 기본값(shared_buffers 128MB, jit on)입니다.
- 장부: `SegmentLedgerIndexTest`@7c3464e3의 `SEED_ROWS`와 같은 세 방송, 표 907,200행. 표 정의는 그 시험이 쓰는 사본(`StreamSegmentsFixture`)이라 운영 표의 다른 칸과 색인은 없습니다. 색인은 원 시험과 같은 넷(`v2_pdt_idx`는 PR 510)과 기본 키 · `local_path` 유일 색인입니다. 넣은 뒤 `ANALYZE`만 했습니다(원 시험과 같음). autovacuum은 켜 둔 채였고 측정 동안 돌지 않았습니다(`pg_stat_user_tables`). 마지막 「판 2 행 없는 표」 측정만 두 방송을 지우고 `VACUUM ANALYZE`한 뒤 쟀습니다.
- 측정: 조회마다 새 psql 세션에서 `SET plan_cache_mode = force_custom_plan`(바인딩 값 계획) 또는 `force_generic_plan`(일반 계획) → `PREPARE` → `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) EXECUTE`. PostgreSQL 17은 `BUFFERS`가 기본으로 꺼져 있어 명시했습니다. 값은 맨 위 마디의 Shared Hit Blocks + Shared Read Blocks입니다. 경우마다 5회를 돌아가며 쟀고 버퍼는 모든 경우 5회 같은 값, ms는 최솟값–최댓값입니다.
- 시각: 기준 T0 = 2026-11-13 00:00:00 UTC. 이른 시각 T0 − 1초, 첫 PDT + 1ms = T0 + 1ms, 중간 시각 = 약 15만 번째 조각 PDT, 꼬리 시각 = 모든 행 뒤, 첫 행 + 1초 = T0 + 1초.
- 조회 글자: `5ad61a0c` · `7c3464e3`의 `SegmentLedger.java`와 동치 시험 두 개의 비교 상수에서 옮겼고, `EXISTS` 확인 꼴만 재구성입니다.
- 동치 대조: 원 시험의 장부 생성 규칙을 Python으로 옮겨(씨앗 고정, 원 시험과 같은 장부는 아님) 장부 50개 × 시각 10개 = 500번씩 견줬습니다.
- 앞선 값과의 차이: PR 511과 코드 주석의 값(Testcontainers `postgres:17`, 부 버전 미고정)과 견주면 옛 꼴 12,676 → 12,685, 바뀐 꼴 꼬리 12 → 21, 첫 행 + 1초 5,489 → 5,498, 첫 PDT + 1ms 바인딩 값 계획 8 → 11, 판 2 행 없는 표 3 → 1 버퍼로 몇 버퍼씩 달랐고 원인은 확인하지 않았습니다. 본문 수치는 모두 재측정 값입니다. ms도 다릅니다(예: 옛 꼴 꼬리 약 35ms → 36.7–38.9ms, 첫 PDT + 1ms 일반 계획 51–141ms → 17.5–18.2ms). PR 511의 중간 시각 약 32ms는 다른 측정(생산자 리뷰, 5,923 버퍼)입니다.
- 명령: `measure/` 폴더에서 `./run.sh up`(라벨 `com.techblog.bench=chatq`를 붙인 컨테이너 `chatq-pg`를 띄우고 `schema.sql` · `seed.sql`을 넣음) → `./run.sh measure "$PWD/raw"`(`python3 measure.py`) → `./run.sh down`(그 라벨의 컨테이너 · 볼륨만 지움). measure가 판 2 두 방송을 지우므로 다시 재려면 down → up부터 합니다.
- 원자료: 스크립트와 회차별 값 · 요약 · 1회차 실행 계획 · 동치 결과 · 환경(`raw/`)은 [저장소 `_workspace/blog/pokeclip-chat-ledger-query-plans/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/pokeclip-chat-ledger-query-plans/measure)에 있습니다.

## 출처

코드 · 결정 기록(프로젝트 저장소 3K-PokeClip/PokeClip-mono · 2026년 11월 20일부터 비공개)
- PR 511 — 판 2 장부 행의 채팅 위치, 역행 검사 재작성 · `min` 존재 확인 · 서버 준비 문장 끔(2026-11-14 develop 병합, 머지 커밋 `7c3464e3`) (비공개 저장소)
- PR 510 — 판 2 PDT 부분 색인(2026-11-13 develop 병합, 머지 커밋 `fc7dd91c`) (비공개 저장소)
- `SegmentLedger.java`@7c3464e3 · `SegmentLedger.java`@5ad61a0c · `ddl.go`@fc7dd91c (비공개 저장소)
- 시험@7c3464e3 — `SegmentLedgerIndexTest` · `SegmentLedgerInversionEquivalenceTest` · `SegmentLedgerPdtFloorEquivalenceTest` · `SegmentLedgerPrepareTest` · `VideoPositionV2Test` (비공개 저장소)

공식 문서 · 소스
- pgjdbc, [Server Prepared Statements](https://jdbc.postgresql.org/documentation/server-prepare/) — `prepareThreshold`(기본 5)와 0으로 끄기
- pgjdbc REL42.7.11, [`PgStatement.isOneShotQuery`](https://github.com/pgjdbc/pgjdbc/blob/REL42.7.11/pgjdbc/src/main/java/org/postgresql/jdbc/PgStatement.java#L423-L430) · [`PGStatement.setPrepareThreshold`](https://github.com/pgjdbc/pgjdbc/blob/REL42.7.11/pgjdbc/src/main/java/org/postgresql/PGStatement.java)
- PostgreSQL 17, [PREPARE](https://www.postgresql.org/docs/17/sql-prepare.html) — 처음 다섯 번 custom plan, 그 뒤 generic plan 선택 규칙과 `plan_cache_mode`
- PostgreSQL 17, [Message Flow](https://www.postgresql.org/docs/17/protocol-flow.html) — 확장 프로토콜의 이름 없는 문장과 Bind 때 계획
- PostgreSQL 17, [EXPLAIN](https://www.postgresql.org/docs/17/sql-explain.html) — `BUFFERS`(기본 꺼짐)
- PostgreSQL REL_17_STABLE, [`planagg.c`](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/optimizer/plan/planagg.c#L1-L18) — `min`/`max`를 `ORDER BY … LIMIT 1` 하위 조회로 바꾸는 계획

이어지는 글
- [채팅 급증 판별은 임시 기준이라 수동 표시 경로를 함께 뒀습니다](/posts/0-to-1/chat-highlight-research-and-fallback/) — 3.9초 보정과 카드당 한 번의 위치 변환
- [HLS 클립은 왜 벽시각 대신 미디어 시각으로 자를까?](/posts/projects/pokeclip-media-timeline-over-wall-clock/) — PDT와 장부 시각
- [BETWEEN 대신 구간 겹침으로 클립 첫 조각을 찾았습니다](/posts/0-to-1/pokeclip-segment-overlap-contract/) — 같은 장부의 다른 조회
