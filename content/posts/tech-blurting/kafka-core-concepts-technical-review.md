---
title: "Kafka는 파티션 로그를 페이지 캐시에서 바로 내보냅니다"
date: 2026-05-18T10:00:00+09:00
lastmod: "2026-11-13T16:52:03+09:00"
description: "Kafka는 토픽을 파티션마다 끝에 덧붙이는 로그로 저장하고, 따라잡은 소비자에게는 운영체제 페이지 캐시에서 sendfile로 바로 보냅니다. 쓰기가 확정되는 조건(acks · ISR · min.insync.replicas), 묶어 보내기(linger.ms 5 · batch.size 16KB), 컨슈머 그룹과 4.2에서 정식이 된 공유 그룹, 4.0에서 ZooKeeper를 없앤 KRaft를 Apache Kafka 4.4 문서와 브로커 3대 실측으로 정리했습니다."
categories: ["tech-blurting"]
tags: ["Kafka", "KRaft", "복제", "ISR", "페이지 캐시", "컨슈머 그룹"]
draft: false
---

Kafka는 메시지를 파티션마다 끝에 덧붙이는 로그로 저장하고, 소비자가 따라잡고 있으면 디스크를 읽지 않고 운영체제 페이지 캐시에서 네트워크로 바로 내보냅니다. 그래서 빠르지만, 쓴 기록이 장애 뒤에도 남는지는 설정에 달려 있습니다. Apache Kafka 4.4.0 브로커 3대로 시험하자 팔로워 둘이 멈춘 사이 `acks=1`로 확인 응답을 받은 100건이 리더 장애 뒤 사라졌습니다. 같은 상황에서 `acks=all`은 100건 모두 확인 응답을 주지 않았고, 확인 응답을 받은 기록 가운데 사라진 것은 없었습니다(아래 「측정 조건」).

## Kafka는 토픽을 파티션 로그로 나눠 순서대로 덧붙입니다 {#내가-이해한-것}

토픽은 메시지를 모으는 이름이고, 실제 저장 단위는 파티션입니다. 파티션은 끝에만 덧붙이는 로그이고, 메시지마다 파티션 안에서 하나씩 늘어나는 번호(오프셋)를 받습니다. 순서는 파티션 안에서만 보장되고 파티션끼리는 보장되지 않습니다. 브로커는 이 로그를 저장하는 서버이고, 파티션 하나는 여러 브로커에 복제됩니다. 복제본 가운데 하나가 리더로 쓰기와 읽기를 받고, 나머지 팔로워는 리더에게서 기록을 가져와 같은 로그를 만듭니다([설계 문서 Replication](https://kafka.apache.org/44/design/design/)).

소비자가 읽어도 기록은 지워지지 않습니다. 보존 기간이 지나야 지워지고, 브로커 기본값은 168시간입니다([`log.retention.hours`](https://kafka.apache.org/44/configuration/broker-configs/)). 그래서 서로 다른 소비자 그룹이 같은 기록을 각자 처음부터 다시 읽을 수 있습니다. 아래 그림에서 프로듀서는 리더에만 쓰고, 두 그룹은 같은 리더에서 각자 읽습니다.

```mermaid {#fig-kafka-partition-roles kind="개념도" caption="복제 3인 파티션 P0 하나의 역할. 프로듀서는 리더(브로커 1)에만 쓰고, 팔로워(브로커 2 · 3)는 리더에게서 기록을 가져가 복제합니다. 컨트롤러는 리더와 ISR(따라잡은 복제본 목록)을 메타데이터에 기록합니다. 그룹 A와 그룹 B는 같은 기록을 각자의 오프셋으로 읽습니다." source="https://kafka.apache.org/44/design/design/"}
flowchart TB
  accTitle: 파티션 하나의 리더 · 팔로워와 두 소비자 그룹
  accDescr: 프로듀서가 브로커 1의 P0 리더에 쓰고, 컨트롤러가 리더와 ISR을 기록한다. 브로커 2와 3의 팔로워가 리더에서 복제하고, 그룹 A와 그룹 B의 소비자가 리더에서 각자 읽는다.
  PR["프로듀서"] -->|쓰기| L["브로커 1<br/>리더"]
  CT["컨트롤러"] -.->|ISR| L
  L -->|복제| F2["브로커 2<br/>팔로워"]
  L -->|복제| F3["브로커 3<br/>팔로워"]
  F2 ~~~ G["그룹 A · 그룹 B"]
  L --> G
```

파티션을 여러 개 두면 리더가 여러 브로커에 흩어지고, 쓰기와 읽기도 그만큼 나뉩니다. 메시지에 키가 있으면 같은 키는 같은 파티션으로 가므로 키 단위 순서는 지켜집니다.

## 쓰기 확정은 acks와 ISR, min.insync.replicas가 정합니다

ISR(in-sync replicas)은 리더를 따라잡고 있는 복제본 목록입니다. 복제본이 ISR에 남으려면 두 조건을 지켜야 합니다. 컨트롤러에 하트비트를 보내 세션을 유지해야 하고(`broker.session.timeout.ms`, 기본 9초), 리더의 로그 끝을 `replica.lag.time.max.ms`(기본 30초) 안에 따라잡아야 합니다. 둘 중 하나를 어기면 ISR에서 빠집니다. 기록은 ISR 전원이 받았을 때 확정(committed)되고, 소비자에게는 확정된 기록만 나갑니다([설계 문서 Replication](https://kafka.apache.org/44/design/design/)).

프로듀서는 `acks`로 언제 확인 응답을 받을지 고릅니다([프로듀서 설정](https://kafka.apache.org/44/configuration/producer-configs/)).

| `acks` | 확인 응답 시점 | 리더가 응답 직후 죽으면 |
|---|---|---|
| `0` | 소켓 버퍼에 넣는 즉시 | 브로커가 받았는지조차 모름 |
| `1` | 리더가 자기 로그에 쓴 뒤 | 팔로워가 복제하기 전이면 사라짐 |
| `all`(`-1`) | ISR 전원이 받은 뒤 | ISR 복제본이 하나라도 살아 있으면 남음 |

`acks=all`이 기본값이 된 것은 3.0.0부터입니다. 같은 판에서 멱등 프로듀서(`enable.idempotence=true`)도 기본이 됐지만, 3.0.0에서는 버그로 실제로 켜지지 않아 3.0.1에서 고쳐졌습니다([3.0 업그레이드 노트](https://kafka.apache.org/30/getting-started/upgrade/), [KIP-679](https://cwiki.apache.org/confluence/display/KAFKA/KIP-679%3A+Producer+will+enable+the+strongest+delivery+guarantee+by+default)). 4.4.0 클라이언트의 기본값도 `acks=all`, `enable.idempotence=true`였습니다.

`acks=all`만으로는 충분하지 않습니다. ISR이 리더 하나로 줄면 「ISR 전원」이 리더 하나뿐이라 `acks=all`도 리더에만 쓰고 응답합니다. 이를 막는 설정이 `min.insync.replicas`입니다. `acks=all`인 쓰기는 ISR이 이 수보다 작으면 거절되고, 브로커 기본값은 1입니다([브로커 설정](https://kafka.apache.org/44/configuration/broker-configs/)). 4.x는 여기에 더해 ISR이 이 수보다 작으면 확정 위치(high watermark)를 올리지 않습니다. 그래서 `acks` 값과 상관없이 그 사이 쓴 기록은 소비자에게 보이지 않습니다([설계 문서](https://kafka.apache.org/44/design/design/), [ELR 문서](https://kafka.apache.org/44/operations/eligible-leader-replicas/)).

복제 3, `min.insync.replicas=2`인 파티션에서 팔로워 둘을 멈추자 약 7초 안에 ISR이 리더 하나로 줄었습니다. 이때 `acks=all` 100건은 모두 `NotEnoughReplicasException`으로 거절됐고, `acks=1` 100건은 모두 성공 응답을 받았습니다. 성공한 100건도 확정 위치는 0에 머물러 소비자에게는 보이지 않았습니다.

아래 영상은 리더 장애까지 이어 간 시험의 순서입니다. 왼쪽 `acks=1`에서 청록 칸 100건이 확인 응답을 받은 뒤 사라지는 것을 보십시오.

{{< motion scene="AcksIsrCommit" id="fig-acks-isr-commit" kind="재구성" caption="복제 3, min.insync.replicas=2 파티션에 1,000건이 확정된 뒤 팔로워 둘(B2 · B3)을 멈추고 100건을 썼습니다. acks=1은 리더 B1에만 쓰고 100건 모두 확인 응답을 받았지만, B1이 죽고 B2가 새 리더가 되자 그 100건은 남지 않았습니다. acks=all은 100건 모두 시간 초과로 확인 응답이 없었고, 새 리더 B3에도 확정된 1,000건이 그대로 남았습니다. Kafka 4.4.0 실측 순서를 다시 그린 그림입니다." >}}

`acks=1`에서 리더가 죽은 뒤 새 리더가 된 브로커 2의 끝 오프셋은 1,000이었고, 옛 리더를 다시 띄운 뒤 처음부터 읽은 레코드도 1,000건이었습니다. 옛 리더는 팔로워로 다시 합류하면서 새 리더의 로그를 따릅니다. `acks=all` 쪽은 팔로워가 멈춘 동안 세션을 잃어 ISR에서 빠졌지만, 리더가 죽자 컨트롤러가 ELR(Eligible Leader Replicas)에 남아 있던 브로커 3을 새 리더로 골랐습니다. ELR은 ISR 밖이지만 확정된 기록을 모두 가져 리더가 되어도 안전한 복제본 목록이고, 4.0에 들어와 4.1부터 새 클러스터에서 기본으로 켜집니다([ELR 문서](https://kafka.apache.org/44/operations/eligible-leader-replicas/), [4.1 업그레이드 노트](https://kafka.apache.org/44/getting-started/upgrade/)).

「Kafka는 장애에도 기록을 잃지 않는다」는 말은 조건이 붙을 때만 맞습니다. 문서가 보장하는 것은 「ISR 복제본이 하나라도 살아 있는 한 확정된 기록은 잃지 않는다」입니다. 확정 전에 응답을 받는 `acks=1`은 이 보장 밖이고, ISR 밖 복제본을 리더로 뽑는 `unclean.leader.election.enable`(기본 false)을 켜도 보장이 깨집니다. 또 Kafka는 쓰기마다 fsync하지 않습니다. 설계 문서는 쓰기마다 fsync하면 성능이 두세 자릿수 떨어진다고 적고 내구성을 복제에 맡깁니다(`log.flush.interval.messages` 기본값은 long 최댓값). 그래서 복제본 전부가 한꺼번에 전원을 잃는 경우는 이 보장 밖으로 보는 것이 맞습니다(설계 문서에서 끌어낸 추론).

## 페이지 캐시와 sendfile로 디스크를 메모리처럼 씁니다

설계 문서의 「Don't fear the filesystem!」 절은 디스크를 순서대로 쓰면 빠르다는 데서 출발합니다. 예로 든 수치는 7200rpm SATA 디스크 6개를 RAID-5로 묶은 JBOD 구성에서 순차 쓰기 약 600MB/초, 임의 쓰기 약 100kB/초로 6,000배 넘게 차이 납니다. 디스크 헤드를 옮기는 탐색 한 번에 10ms가 들기 때문입니다. 하드디스크 시절 수치라 SSD에서 같은 배율을 기대할 수는 없지만, 끝에만 덧붙이는 로그는 탐색을 거의 만들지 않는다는 결론은 그대로입니다([설계 문서 Persistence](https://kafka.apache.org/44/design/design/)).

Kafka는 받은 기록을 JVM 힙에 모아 두지 않고 바로 파일 시스템에 씁니다. 디스크로 내리는 시점은 운영체제가 정하므로, 방금 쓴 기록은 커널의 페이지 캐시에 남아 있습니다. 브로커는 JVM 위에서 돌지만 데이터는 힙 밖에 두는 셈입니다. 설계 문서는 힙 안 캐시를 두지 않는 이유를 셋 듭니다. 힙 안 캐시는 페이지 캐시와 같은 데이터를 두 번 저장하고, 자바 객체로 두면 압축된 바이트로 둘 때보다 메모리를 더 쓰며, 힙이 커질수록 가비지 컬렉션이 느려집니다. 게다가 페이지 캐시는 브로커를 다시 시작해도 데워진 채로 남습니다.

읽기 쪽은 sendfile 시스템 호출을 씁니다. 보통은 페이지 캐시의 데이터를 사용자 공간 버퍼로 복사했다가 다시 커널 소켓 버퍼로 복사하지만, sendfile은 이 왕복 없이 페이지 캐시에서 네트워크로 바로 보냅니다. 문서는 소비자가 대부분 따라잡은 클러스터에서는 디스크 읽기 없이 캐시에서 다 나간다고 적습니다. 다만 TLS를 켜면 암호화가 사용자 공간에서 일어나므로 sendfile을 쓰지 않습니다([설계 문서 Efficiency](https://kafka.apache.org/44/design/design/)).

## 묶어 보내기는 linger.ms 5와 batch.size 16KB가 정합니다

프로듀서는 같은 파티션으로 갈 기록을 배치로 묶어 요청 하나에 담습니다. 배치 크기 상한은 `batch.size`(기본 16,384바이트)이고, 배치가 다 차기 전에 기다리는 시간 상한이 `linger.ms`입니다. 부하가 높으면 배치가 금방 차서 `linger.ms`를 다 기다리지 않습니다. 부하가 낮으면 기록이 최대 `linger.ms`만큼 늦게 나갑니다. 기본값은 4.0에서 0에서 5로 바뀌었고, 문서는 배치가 커지는 이득으로 지연이 비슷하거나 오히려 낮아진다고 이유를 적습니다([프로듀서 설정 `linger.ms`](https://kafka.apache.org/44/configuration/producer-configs/)). 압축도 배치 단위로 합니다. 같은 종류의 메시지 사이에 반복이 많아서 여러 메시지를 함께 압축해야 압축률이 나오기 때문입니다([설계 문서 End-to-end Batch Compression](https://kafka.apache.org/44/design/design/)).

부하가 낮을 때 이 5ms가 그대로 보이는지 쟀습니다. 초당 2,000건(1,000바이트)으로 고정해 보내자 지연 중앙값은 `linger.ms=0`에서 1–4ms, `linger.ms=5`에서 5–7ms였습니다. 청록 막대가 `linger.ms=5`입니다.

{{< chart id="fig-linger-latency" kind="실측" caption="초당 2,000건(1,000바이트)을 20,000건 보냈을 때 프로듀서 지연 중앙값(p50). 막대는 3회의 중앙값, 라벨은 3회 값입니다. linger.ms=5에서 중앙값이 약 4–5ms 늘었고, acks=1과 acks=all의 차이는 회차 사이 흔들림보다 작았습니다. Kafka 4.4.0 브로커 3대, 노트북 한 대의 Docker 안." source="아래 「측정 조건」" height="300px" >}}
{
  "grid": {"left": 8, "right": 96, "top": 16, "bottom": 28, "containLabel": true},
  "xAxis": {"type": "value", "name": "ms", "min": 0, "max": 8, "interval": 2},
  "yAxis": {"type": "category", "inverse": true, "data": ["acks=1 · linger 0", "acks=1 · linger 5", "acks=all · linger 0", "acks=all · linger 5"]},
  "series": [
    {"type": "bar", "barWidth": 18, "itemStyle": {"color": "#7a8a9b"}, "label": {"show": true, "position": "right"},
     "data": [
       {"value": 1, "label": {"formatter": "1 · 1 · 1"}},
       {"value": 5, "itemStyle": {"color": "#087f8b"}, "label": {"formatter": "5 · 5 · 5"}},
       {"value": 2, "label": {"formatter": "2 · 1 · 4"}},
       {"value": 6, "itemStyle": {"color": "#087f8b"}, "label": {"formatter": "5 · 7 · 6"}}
     ]}
  ]
}
{{< /chart >}}

지연이 중요한 낮은 부하의 서비스라면 이 몇 ms가 기본값의 대가입니다. 반대로 최대 처리량(속도 제한 없이 200,000건)은 같은 조건을 반복해도 회차 사이 2–3배 흔들려, 이 환경에서는 `acks`나 `linger.ms`에 따른 처리량 차이를 결론 낼 수 없었습니다. 브로커와 클라이언트가 한 노트북에서 다른 작업과 CPU를 나눠 썼기 때문입니다.

## 한 파티션은 그룹 안 한 소비자가 읽고, 공유 그룹은 예외입니다

컨슈머 그룹은 파티션을 그룹 구성원에게 나눠 줍니다. 한 시점에 파티션 하나는 그룹 안 소비자 하나만 읽습니다([설계 문서 The Consumer](https://kafka.apache.org/44/design/design/)). 그래서 파티션 안 순서가 처리 순서로 이어지고, 그룹이 어디까지 읽었는지는 파티션마다 오프셋 숫자 하나로 적으면 됩니다. 대신 그룹 안 소비자를 파티션 수보다 늘리면 남는 소비자는 받을 파티션이 없습니다. 처리 병렬도를 늘리려면 파티션부터 늘려야 합니다.

소비자는 기본으로 리더에서 읽습니다. 2.4부터는 브로커에 `replica.selector.class`를 지정하고 소비자에 `client.rack`을 주면 같은 랙(데이터센터)의 팔로워에서 읽을 수 있습니다([KIP-392](https://cwiki.apache.org/confluence/display/KAFKA/KIP-392%3A+Allow+consumers+to+fetch+from+closest+replica), [KAFKA-8443](https://issues.apache.org/jira/browse/KAFKA-8443)). 기본값은 null이고, 이때는 리더를 고릅니다.

공유 그룹(share group)은 「파티션 하나에 소비자 하나」 규칙을 풀었습니다. 같은 파티션을 여러 소비자가 나눠 읽고, 소비자 수가 파티션 수보다 많아도 됩니다. 기록은 하나씩 확인 응답하고, 소비자가 가져간 기록은 잠금 시간(`share.record.lock.duration.ms`, 기본 30초) 동안 같은 그룹의 다른 소비자에게 가지 않습니다. 잠금이 풀리면 다시 배달하고 배달 횟수를 세므로, 처리할 수 없는 기록을 따로 걸러 낼 수 있습니다([설계 문서 The Share Consumer](https://kafka.apache.org/44/design/design/)). 순서보다 병렬 처리가 중요한 작업 큐에 맞는 방식입니다. 4.1에서 미리 보기로 들어와 4.2에서 정식이 됐습니다([KIP-932](https://cwiki.apache.org/confluence/display/KAFKA/KIP-932%3A+Queues+for+Kafka), [업그레이드 노트](https://kafka.apache.org/44/getting-started/upgrade/)).

## 4.0부터 메타데이터는 ZooKeeper 없이 KRaft가 맡습니다 {#보완-및-정리}

어느 브로커가 살아 있는지, 파티션의 리더와 ISR이 무엇인지 같은 메타데이터는 예전에는 ZooKeeper에 두었습니다. KRaft는 이 메타데이터를 Kafka의 컨트롤러 노드들이 Raft 합의로 직접 관리하는 방식입니다. 컨트롤러는 보통 3대나 5대를 두고, 과반이 살아 있어야 클러스터가 계속 동작합니다. 3대면 1대, 5대면 2대의 장애를 견딥니다([KRaft 운영 문서](https://kafka.apache.org/44/operations/kraft/)). 위 시험에서 멈춘 팔로워가 ISR에서 빠진 것도 컨트롤러가 하트비트가 끊긴 것을 보고 처리한 일입니다.

KRaft가 운영에 쓸 만하다고 인정된 첫 판은 3.3입니다(3.3.1 출시 2022-10-03). ZooKeeper 모드는 4.0.0(2025-03-18)에서 지워졌고, 4.x로 올리려면 먼저 3.3 이상에서 KRaft로 옮겨야 합니다([업그레이드 노트](https://kafka.apache.org/44/getting-started/upgrade/), [내려받기 페이지](https://kafka.apache.org/community/downloads/)). 이 글의 문서와 실측은 2026-10-22에 나온 4.4.0 기준입니다.

기록을 잃지 않는 구성을 원한다면 세 가지를 함께 확인하십시오. 프로듀서는 기본값 `acks=all`을 유지하고, 복제 3인 토픽에 `min.insync.replicas=2`를 주고, `unclean.leader.election.enable`은 끈 채로 둡니다. 브로커 기본 `min.insync.replicas`가 1이라 두 번째 설정은 직접 넣어야 합니다. 그 대가로 복제본 둘을 잃으면 쓰기가 거절됩니다. 처리량과 지연은 노트북 수치로 정하지 말고 실제 디스크와 망에서 다시 재야 합니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 16:11–16:40(KST)에 실행했습니다. 지연 비교는 3회, 거절 · 리더 장애 시험은 각 1회입니다.
- 기종: MacBook Air(Mac17,3, Apple M5, 고성능 4 · 효율 6코어, 32GB, 팬 없음), macOS 27.0.1, Docker 29.8.2. 같은 기계에서 다른 세션의 작업이 함께 돌아 1분 load average가 측정 중 10–95였습니다.
- 구성: `apache/kafka:4.4.0` 이미지로 KRaft 컨트롤러 전용 노드 1대와 브로커 3대, 클라이언트 컨테이너 1대를 한 Docker 망에 띄웠습니다. 브로커 둘을 멈춰도 메타데이터 정족수가 유지되도록 컨트롤러를 따로 두었습니다(운영 권장은 3대 이상). 모든 노드가 노트북 한 대의 한 가상 머신 안에 있어 망과 디스크가 분리되지 않았으므로, 처리량 · 지연 수치를 다른 환경에 그대로 옮길 수 없습니다.
- 기본값: `kafka-run-class.sh org.apache.kafka.clients.producer.ProducerConfig`(acks=all, linger.ms=5, batch.size=16384, enable.idempotence=true), `kafka-configs.sh --describe --all --entity-type brokers --entity-name 1`(min.insync.replicas=1, replica.lag.time.max.ms=30000, unclean.leader.election.enable=false, broker.session.timeout.ms=9000, replica.selector.class=null), `kafka-features.sh describe`(eligible.leader.replicas.version=1).
- 지연: 토픽 `bench`(파티션 6, 복제 3, `min.insync.replicas=2`)에 `kafka-producer-perf-test.sh --topic bench --num-records 20000 --record-size 1000 --throughput 2000 --producer-props acks=<1|all> linger.ms=<0|5>`. 최대 처리량은 같은 명령에 `--num-records 200000 --throughput -1`로 두 차례(각 조건 4회) 돌렸습니다.
- 거절: 토픽 `nr`(`--replica-assignment 1:2:3`, `min.insync.replicas=2`)에서 `docker stop`으로 브로커 2 · 3을 멈추고 3–5초마다 `kafka-topics.sh --describe`로 ISR을 본 뒤, `request.timeout.ms=5000 delivery.timeout.ms=8000 retries=0`으로 `acks=all`과 `acks=1`을 100건(100바이트)씩 보냈습니다.
- 리더 장애: 토픽 `loss-1` · `loss-all`(복제 1:2:3, `min.insync.replicas=2`)에 `acks=all`로 1,000건을 먼저 쓰고, `docker pause`로 브로커 2 · 3을 멈춘 채 `acks=1` 또는 `acks=all`로 100건, `docker kill`로 브로커 1 종료, 브로커 2 · 3 재개, 새 리더 확인, 브로커 1 재시작 순서로 진행했습니다. 끝 오프셋은 `kafka-get-offsets.sh`(소비자가 볼 수 있는 확정 위치), 레코드 수는 `kafka-console-consumer.sh --from-beginning --timeout-ms 8000 | wc -l`로 셌습니다.

## 출처

- Apache Kafka 4.4 문서 [Design](https://kafka.apache.org/44/design/design/) — Persistence(600MB/초 · 100kB/초), Efficiency(sendfile · TLS), End-to-end Batch Compression, The Consumer, The Share Consumer, Replication · Unclean leader election · Availability and Durability Guarantees
- Apache Kafka 4.4 문서 [Producer Configs](https://kafka.apache.org/44/configuration/producer-configs/) — acks, batch.size, linger.ms · [Broker Configs](https://kafka.apache.org/44/configuration/broker-configs/) — min.insync.replicas, replica.lag.time.max.ms, broker.session.timeout.ms, unclean.leader.election.enable, replica.selector.class, log.retention.hours, log.flush.interval.messages
- Apache Kafka 4.4 문서 [Upgrading](https://kafka.apache.org/44/getting-started/upgrade/) — 4.0 ZooKeeper 제거 · linger.ms 기본값, 4.1 ELR 기본 켜짐 · 공유 그룹 미리 보기, 4.2 공유 그룹 정식, KRaft 운영 준비 3.3 · [KRaft](https://kafka.apache.org/44/operations/kraft/) · [Eligible Leader Replicas](https://kafka.apache.org/44/operations/eligible-leader-replicas/)
- Apache Kafka 3.0 문서 [Upgrading](https://kafka.apache.org/30/getting-started/upgrade/) — 3.0.0 acks=all · 멱등성 기본값, 3.0.1 수정
- [Apache Kafka 내려받기](https://kafka.apache.org/community/downloads/) — 4.4.0(2026-10-22), 4.2.0(2026-02-17), 4.0.0(2025-03-18), 3.3.1(2022-10-03) 출시일(2026-11-13 확인)
- KIP · 이슈: [KIP-679](https://cwiki.apache.org/confluence/display/KAFKA/KIP-679%3A+Producer+will+enable+the+strongest+delivery+guarantee+by+default) · [KIP-392](https://cwiki.apache.org/confluence/display/KAFKA/KIP-392%3A+Allow+consumers+to+fetch+from+closest+replica) · [KIP-932](https://cwiki.apache.org/confluence/display/KAFKA/KIP-932%3A+Queues+for+Kafka) · [KIP-966](https://cwiki.apache.org/confluence/display/KAFKA/KIP-966%3A+Eligible+Leader+Replicas) · [KAFKA-8443](https://issues.apache.org/jira/browse/KAFKA-8443)(수정 판 2.4.0)
