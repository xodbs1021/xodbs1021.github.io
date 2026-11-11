---
title: "비root 녹화를 위해 새 볼륨의 소유권을 이미지에 심었습니다"
date: "2026-10-15T11:28:22+09:00"
lastmod: "2026-11-11T19:02:22+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "미디어 컨테이너를 UID 10002로 돌리면 이미지에 없는 경로에 붙은 새 named volume은 root 소유로 남아 녹화를 쓰지 못합니다. 8월 16일 재현 실험으로 확인하고, 이미지에 10002 소유 빈 디렉터리를 심어 Docker의 첫 복사가 소유권을 볼륨으로 옮기게 했습니다. 훅 실행 파일은 root 소유에 쓰기 금지로 묶었고, 이미 쓰던 볼륨은 이 방식으로 고쳐지지 않아 따로 이행했습니다."
tags: ["PokeClip", "Docker", "Linux", "권한"]
portfolio_cases: [18]
portfolio_pages: [34]
portfolio_edition: "2026-10-15-v2"
---

PokeClip 미디어 컨테이너(MediaMTX와 녹화 훅)를 root가 아닌 UID 10002로 돌리려면, 녹화를 쓰는 named volume이 10002 소유여야 합니다. 그런데 이미지에 그 경로가 없으면 Docker는 새 볼륨을 root 소유로 만들고, 10002는 쓰지 못합니다. 2026년 8월 16일 재현 실험(E1)에서 경로 없는 이미지에 새 볼륨을 붙이자 볼륨은 `0755 root:root`였고 비root 쓰기는 거부됐습니다. 최종 이미지는 셸이 없는 scratch 파생이라 시작할 때 `chown`할 수도 없습니다. 그래서 이미지에 10002 소유의 빈 디렉터리를 심어, 빈 볼륨이 처음 붙을 때 Docker가 그 소유권을 볼륨으로 복사하게 했습니다. 변경은 8월 17일 13시 19분 [PR #62](https://github.com/3K-PokeClip/PokeClip-mono/pull/62)로 머지됐습니다.

공개 자료 34건 조사, 일곱 가지 안의 독립 평가(이 방식이 88점으로 1순위), 실험 E1–E8, 구현은 AI가 했습니다. 저는 그중 이 안(평가표의 C안)을 채택했고, 이미 쓰던 볼륨은 한 번 초기화한다고 공지하기로 정했습니다. 구현은 Claude Code, 리뷰는 Claude Code와 Codex가 했습니다.

## 이미지에 디렉터리가 없어 새 볼륨이 root 소유로 남았습니다 {#빈-볼륨의-첫-복사가-빠져-있었습니다}

Docker는 빈 named volume을 컨테이너에 처음 붙일 때, 이미지의 같은 경로에 있던 내용을 볼륨으로 복사합니다([Docker 볼륨 문서](https://docs.docker.com/engine/storage/volumes/#mounting-a-volume-over-existing-data)). 문서는 내용 복사만 말하지만, moby 소스를 보면 소유권과 모드도 함께 옮깁니다. 이미지에 그 경로가 없으면 복사를 통째로 건너뛰고([`daemon/create_unix.go` 100–111행](https://github.com/moby/moby/blob/23ea0fa6461ec7455486441ae3a52b1235cdbec0/daemon/create_unix.go#L100-L111)), 볼륨이 비어 있을 때만 `copyExistingContents`가 복사합니다([`daemon/container/container_unix.go` 384–400행](https://github.com/moby/moby/blob/23ea0fa6461ec7455486441ae3a52b1235cdbec0/daemon/container/container_unix.go#L384-L400)). 복사는 디렉터리의 소유자와 모드를 볼륨 최상위에도 적용하므로, 소스가 빈 디렉터리여도 소유권은 옮겨집니다.

그래서 경우는 셋으로 갈립니다. [[fig-volume-first-copy]]의 세 칸이 그 차이입니다.

{{< motion scene="VolumeFirstCopy" id="fig-volume-first-copy" kind="개념도" caption="빈 named volume이 처음 붙을 때 세 경우. 이미지에 경로가 없으면 복사할 것이 없어 볼륨이 root:root로 남고 UID 10002의 쓰기가 실패합니다. 이미지에 10002 소유 빈 디렉터리가 있으면 그 소유권이 볼륨으로 복사돼 쓰기가 성공합니다. 볼륨에 이미 데이터가 있으면 복사하지 않아 예전 소유권이 그대로 남습니다. 8월 16일 실험 E1 · E2 · E4를 옮긴 개념도입니다." >}}

첫 칸은 실험 E1, 둘째 칸은 E2, 셋째 칸은 E4의 관측입니다. 실행 사용자만 바꾸면 첫 칸에 머뭅니다.

## 빈 디렉터리를 이미지에 심어 소유권을 볼륨으로 옮겼습니다 {#시작-스크립트-대신-이미지에-조건을-넣었습니다}

중간 단계인 prep 스테이지에서 빈 디렉터리 셋을 만들고, 최종 스테이지에서 `COPY --chown=10002:10002`로 옮겼습니다([`media/Dockerfile.mtxhook` 43–44행 · 99–102행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L99-L102)). 최종 이미지에는 `/etc/passwd`가 없어 `--chown`에 이름 대신 숫자만 씁니다. 최종 이미지에는 셸도 권한 도구도 넣지 않았습니다. [[fig-image-ownership]]이 지금의 층 구성입니다.

```mermaid {#fig-image-ownership kind="재구성" caption="미디어 이미지의 층과 계정. build 스테이지가 만든 훅 실행 파일은 root 소유(--chown=0:0)로 /hooks-bin에 들어가고, prep 스테이지의 빈 디렉터리 셋은 10002 소유로 /recordings · /dvr · /hooks에 들어갑니다. 최종 이미지는 scratch 파생 MediaMTX 포크 이미지이며 USER 10002로 돕니다. 같은 볼륨을 사이드카(10001)는 읽기 전용으로, 정리 작업 janitor(10002)는 지우려고 붙습니다. PokeClip-mono develop 825a3dfe의 media/Dockerfile.mtxhook 19–102행과 infra/media-host/compose.yml.tmpl 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L19-L102"}
flowchart TB
  accTitle: 미디어 이미지의 층과 계정
  accDescr: build 스테이지의 훅 실행 파일이 root 소유로 최종 이미지의 hooks-bin에 들어간다. prep 스테이지의 빈 디렉터리 셋이 10002 소유로 recordings, dvr, hooks에 들어간다. 최종 이미지는 scratch 파생 MediaMTX 포크 이미지이고 USER 10002로 돈다. 사이드카 10001은 볼륨을 읽기 전용으로, janitor 10002는 삭제용으로 붙는다.
  build[build 스테이지<br/>훅 실행 파일 빌드]
  prep[prep 스테이지<br/>빈 디렉터리 셋 mkdir]
  final[최종 이미지<br/>MediaMTX 포크<br/>scratch 파생 · USER 10002]
  bin[hooks-bin<br/>훅 실행 파일<br/>--chown=0:0]
  dirs[recordings<br/>dvr · hooks<br/>--chown=10002:10002]
  side[사이드카 10001<br/>읽기 전용]
  jan[janitor 10002<br/>삭제]
  build --> bin
  prep --> dirs
  bin --> final
  dirs --> final
  final --> side
  final --> jan
  style dirs fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

계정은 셋으로 나눴습니다. 계정 분리(10002와 10001)도 AI의 계획에서 나온 제안입니다.

| 대상 | 계정 · 모드 | 이유 |
|---|---|---|
| 미디어(MediaMTX · 녹화 훅) | UID/GID 10002 | 녹화 · 되감기 · 훅 스풀 세 디렉터리에 씀 |
| 사이드카 | UID/GID 10001, 볼륨은 `:ro` | 녹화 파일과 훅 스풀을 읽기만 함 |
| 정리 작업(janitor) | UID/GID 10002 | 오래된 녹화를 지우려면 녹화 소유자와 같아야 함 |
| 디렉터리 / 파일 | 0755 / 0644 | 다른 UID도 읽고 탐색함 |
| 컨테이너 옵션 | `no-new-privileges` | 실행 중 새 권한 획득을 막음 |

사이드카는 로컬 compose에서 녹화와 스풀을 읽기 전용으로 붙고([`docker-compose.yml` 76–79행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/docker-compose.yml#L76-L79)), 운영 상자의 janitor는 10월 23일 [PR #322](https://github.com/3K-PokeClip/PokeClip-mono/pull/322)부터 10002로 돕니다([`compose.yml.tmpl` 378–383행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/compose.yml.tmpl#L378-L383)). 이미지의 10001로 돌면 모든 삭제가 권한 오류이기 때문입니다.

디렉터리 모드는 `COPY`의 기본값(0755)을 그대로 씁니다. 실험 E6에서 2775나 0770인 소스 디렉터리를 `COPY`, `--chown`, `--chmod=2775`로 각각 옮겼더니 셋 다 이미지 안에서 0755였습니다. `--chmod`는 디렉터리 모드에 효과가 없었고, 그래서 그룹 공유용 setgid 비트는 쓰지 못했습니다.

## 훅 실행 파일은 root 소유에 쓰기 금지로 묶었습니다

녹화 디렉터리를 10002에게 열자, 그 계정이 자기 훅 실행 파일을 덮어쓸 수 있는지가 새 질문이 됐습니다. 실행 파일은 스풀 볼륨(`/hooks`)과 다른 `/hooks-bin`에 두고 `--chown=0:0`으로 root 소유로 박았습니다([`Dockerfile.mtxhook` 87–96행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L87-L96)). 같은 디렉터리에 두면 볼륨 마운트가 실행 파일을 가립니다. `--chown`을 빼면 안 되는 이유도 실측했습니다. 다른 스테이지에서 복사하는 `COPY --from`은 소스 스테이지의 UID를 그대로 가져오므로, build 스테이지에 `USER`를 넣는 변경 하나로 실행 파일이 10002 소유가 됩니다. 실제 이미지에서 실행 파일은 `root:root 0755`였고, 10002로 쓰려 하면 `permission denied`, 실행은 성공했습니다.

소유자만 검사하면 구멍이 있었습니다. Codex 리뷰가 `COPY --chmod=0777 --chown=0:0`이면 root 소유이면서 누구나 쓸 수 있는 파일이 되는데도 검사가 통과한다고 짚었습니다. 실제 이미지가 0777이었던 적은 없지만, 계약 검사가 그런 줄을 통과시키면 소유자 검사는 혼자서 아무것도 보장하지 못합니다. 그래서 머지 전에 같은 PR에서 검사를 고쳐, 이 `COPY` 줄에 `--chown`·`--from` 말고 다른 플래그가 있으면 실패하게 했습니다([`runtime_identity_contract_test.go` 165–183행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/mtxhook/runtime_identity_contract_test.go#L165-L183)). 검사는 세 디렉터리 `COPY`, `USER`, `no-new-privileges`, 복사를 끊는 `volume.nocopy`가 없는지까지 봅니다.

## root init과 gosu는 기동마다 root를 남겨 고르지 않았습니다 {#다른-선택을-버린-이유}

평가는 런타임에 root 작업이 남는지를 가장 무겁게 봤습니다([팀 결정 문서 97–141행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/docs/decisions/2026-08-17-media-%EB%B9%84%ED%8A%B9%EA%B6%8C-%EC%A0%84%ED%99%98.md?plain=1#L97-L141)).

| 대안 | 점수 | 버린 이유 |
|---|---|---|
| 이미지에 소유권 심기(C안) | 88 | 채택. 새 볼륨에만 효과가 있어 기존 볼륨 이행이 따로 필요 |
| root init 컨테이너 | 83 | `up`할 때마다 root 컨테이너가 볼륨을 읽고 씀 |
| Compose `pre_start` 훅 | 71 | Compose 5.3.0 이상을 강제(당시 로컬 5.1.2), 훅 컨테이너에 보안 옵션이 전달되지 않음 |
| gosu로 사용자 전환 | 56 | root로 시작하는 것 자체가 목표와 배타 |

root init은 쉽게 고칠 수 있지만, 기동마다 넓은 권한으로 볼륨을 만지는 경로가 남습니다. gosu도 처음에는 root로 시작합니다. 이미지 단계에서 소유권을 정하면 런타임 root 작업이 아예 없어집니다. 이 장치는 쿠버네티스로 가면 파드의 `fsGroup`이 같은 일을 하므로 지울 수 있게 Dockerfile에 표시해 두었습니다.

포트폴리오 요약(2026-10-15판) 34쪽은 이 결정을 「내가 선택한 경계」로 적었습니다. 정확히는 AI가 조사·평가·실험으로 제안한 안을 제가 채택한 것입니다.

## 이미 쓰던 볼륨은 이 방식으로 고쳐지지 않습니다

Docker는 비어 있지 않은 볼륨에는 아무것도 복사하지 않습니다. 실험 E4에서 이미 root 소유 파일이 든 볼륨에 새 이미지를 붙이자 볼륨은 `root:root` 그대로였습니다. 그래서 팀원들의 로컬 볼륨은 한 번 지우고 다시 만들게 했습니다. `down`으로 컨테이너를 내리고, 녹화 · 되감기 · 훅 스풀 볼륨 셋만 지운 뒤 `up -d --build`합니다. DB 볼륨까지 지우는 `down -v`는 쓰지 않습니다. 셋 가운데 하나라도 옛 상태로 남으면 그쪽만 조용히 실패합니다. 예를 들어 훅 스풀만 root 소유로 남으면 녹화는 되는데 훅이 아무것도 남기지 못합니다. 그래서 이행 뒤에는 세 볼륨의 소유자를 모두 확인합니다([PR #62 본문](https://github.com/3K-PokeClip/PokeClip-mono/pull/62)).

되돌릴 때는 볼륨을 다시 초기화하지 않아도 됩니다. root는 10002 소유 디렉터리에도 쓸 수 있기 때문입니다.

## macOS에서 녹화와 훅까지 확인했고 리눅스 상자는 뒤에 돌았습니다 {#검증은-사용자-이름에서-녹화훅까지-이어졌습니다}

설정 검사에서 멈추지 않고, `USER`·`COPY` 소유권·볼륨·실행 파일 쓰기 금지·`NoNewPrivs`를 실제 녹화와 훅 실행까지 이어 확인했습니다. 실험 E7에서는 공식 MediaMTX 1.19.3을 10002로 띄워 리스너가 모두 뜨는 것을 봤습니다. 녹화 길이가 기준(3,900–4,100ms)을 넘어 최대 4,312ms인 조각이 있었지만, root로 돌린 대조군도 최대 4,312ms로 같았습니다. 권한 변경에서 생긴 회귀가 아니라는 근거입니다.

모든 실측은 개발자 맥의 Docker Desktop(Docker Engine 29.4.0, darwin/arm64)에서 했습니다. 리눅스는 그때 확인하지 않았습니다. Docker Desktop은 호스트 파일 bind mount의 소유권을 다시 매핑해서(실험 E8), 맥에서 통과한 것을 리눅스의 권한 경계까지 확인했다고 볼 수 없습니다. 11월 3일부터 운영 미디어 상자(리눅스 arm64)가 이 Dockerfile로 만든 이미지로 돕니다([`infra/media-host/README.md` 1145행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/README.md?plain=1#L1145)).

비root 전환을 할 때 `USER` 한 줄만 바꾸지 마십시오. 그 계정이 쓸 볼륨이 처음 만들어질 때 누구 소유가 되는지, 이미 있는 볼륨은 어떻게 옮길지, 그 계정이 무엇을 덮어쓸 수 없어야 하는지를 함께 정해야 합니다.

## 측정 조건

- 실험 E1–E8: 2026년 8월 16일, 개발자 맥의 Docker Desktop(Docker Engine 29.4.0, darwin/arm64). AI가 수행했습니다. 실험 목록과 요약은 PR #62에 동봉된 팀 결정 문서에 있고, 원자료는 비공개입니다.
- 녹화 길이 비교: 같은 날 같은 환경에서 비root와 root 대조군을 녹화해 조각 길이의 최댓값을 견줬습니다(PR #62 본문).
- 리눅스에서의 소유권 측정은 하지 않았습니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일), moby 소스는 `23ea0fa6`이고, PR 상태는 2026년 11월 11일에 확인했습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #62](https://github.com/3K-PokeClip/PokeClip-mono/pull/62) — 미디어 비root 전환(2026-08-17 머지)
- [3K-PokeClip/PokeClip-mono PR #322](https://github.com/3K-PokeClip/PokeClip-mono/pull/322) — 운영 상자 janitor 10002(2026-10-23 머지)
- [`media/Dockerfile.mtxhook`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/Dockerfile.mtxhook#L19-L102) — prep 스테이지, `--chown`, `USER 10002`
- [`media/internal/mtxhook/runtime_identity_contract_test.go`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/mtxhook/runtime_identity_contract_test.go#L165-L183) — 훅 실행 파일 계약 검사
- [팀 결정 문서 「media 비특권 전환」](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/docs/decisions/2026-08-17-media-%EB%B9%84%ED%8A%B9%EA%B6%8C-%EC%A0%84%ED%99%98.md?plain=1#L97-L141) — 실험 요약과 대안 평가
- [moby `daemon/container/container_unix.go`](https://github.com/moby/moby/blob/23ea0fa6461ec7455486441ae3a52b1235cdbec0/daemon/container/container_unix.go#L384-L400) · [`daemon/create_unix.go`](https://github.com/moby/moby/blob/23ea0fa6461ec7455486441ae3a52b1235cdbec0/daemon/create_unix.go#L100-L111) — 빈 볼륨 첫 복사
- [Docker 문서 「Volumes」](https://docs.docker.com/engine/storage/volumes/#mounting-a-volume-over-existing-data) — 기존 데이터 위 볼륨 마운트
- [Dockerfile 레퍼런스 「COPY --chown」](https://docs.docker.com/reference/dockerfile/#copy---chown) — 숫자 UID와 /etc/passwd

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 34쪽](/portfolio/2026-10-15-v2/full.pdf#page=34)
