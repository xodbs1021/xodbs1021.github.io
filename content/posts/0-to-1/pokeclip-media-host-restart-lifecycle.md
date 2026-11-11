---
title: "systemd가 정리를 건너뛰자 옛 비밀 컨테이너가 남았습니다"
date: 2026-10-28T19:22:04+09:00
lastmod: 2026-11-11T19:02:22+09:00
author: "김태윤"
categories: ["0-to-1"]
tags: ["PokeClip", "systemd", "Docker Compose", "Recovery"]
description: "미디어 상자의 systemd 유닛이 실패로 끝나면 systemd 252는 ExecStop을 건너뜁니다. 10월 20일 재현 실험에서 정리되지 않은 컨테이너가 옛 CDN 비밀을 든 채 남고 다음 기동은 계속 실패했습니다. 정리를 ExecStopPost로 옮기고 컨테이너를 늘 새로 만들게 고친 뒤 10월 22일 재시작 시험 19사례를 세 번 통과했고, 11월 3일 운영 상자가 이 유닛으로 떴습니다."
draft: false
---

PokeClip 미디어 상자는 systemd 유닛 하나가 docker compose 묶음 전체를 띄웁니다. 2026년 10월 20일 재현 실험에서 이 유닛을 강제로 죽이자 MediaMTX 자리 컨테이너가 지워진 옛 CDN 비밀을 든 채 살아남았고, 다음 기동은 20초마다 실패를 되풀이했습니다. 그동안에도 상자의 헬스 경로는 200을 냈습니다. 원인은 systemd 252가 실패로 끝난 서비스에서 `ExecStop`을 건너뛰는 데 있었습니다. 정리를 `ExecStopPost`로 옮기고 다음 기동이 컨테이너를 늘 새로 만들게 고친 뒤, 10월 22일 재시작 시험 19사례를 세 번 반복해 모두 통과했습니다. 변경은 10월 23일 [PR #311](https://github.com/3K-PokeClip/PokeClip-mono/pull/311)로 머지됐습니다.

기동 모델(systemd 하나가 띄우고, MediaMTX와 nginx가 끝날 때만 묶음 전체를 다시 띄움)과 관리 API 비밀번호를 기동마다 만들고 저장하지 않는 방식은 제가 정했습니다. 이 크래시 경로를 처음 짚은 것은 AI 보안 리뷰였고, 10월 20일 재현 실험과 수정, 반복 시험은 AI가 했습니다. 구현은 Claude Code, 리뷰는 Claude Code와 Codex가 맡았습니다.

## 녹화기와 nginx가 끝날 때만 상자 전체를 다시 띄웁니다 {#어떤-실패가-방송-전체를-다시-띄워야-하는가}

한 상자에서 MediaMTX는 SRT 수신·녹화·재생을, nginx는 HTTP 요청 검사와 전달을 맡습니다. 사이드카는 닫힌 녹화 조각을 장부에 적고 S3에 올립니다. 모두 같은 정책으로 다시 띄우면, DB 장애로 사이드카가 죽었을 때 멀쩡한 송출까지 끊깁니다.

| 서비스 | 실행 중 끝났을 때 |
|---|---|
| MediaMTX · nginx | compose 전체가 끝나고 systemd가 20초 뒤 묶음 전체를 다시 띄움 |
| 사이드카 · 인증 응답기 · 정리 작업 | Docker 엔진이 `on-failure`로 그 컨테이너만 다시 띄움 |
| 운영자의 `systemctl stop` | 다시 띄우지 않음 |

시작 스크립트는 마지막에 `docker compose up`으로 바뀌고, 출력은 MediaMTX와 nginx에만 붙습니다. 둘 중 하나가 끝나면 compose가 끝나고 `Restart=always`가 20초 뒤 전체를 다시 띄웁니다([`pokeclip-media.service` 4–7행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/systemd/pokeclip-media.service#L4-L7)). 두 핵심 서비스는 엔진 재시작을 끄고(`restart: "no"`), 나머지는 `on-failure`를 씁니다([`compose.yml.tmpl` 59–65행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/compose.yml.tmpl#L59-L65)). 20초는 시도 사이의 대기일 뿐 복구 시간의 상한이 아닙니다. 재시도 횟수에도 한도를 두지 않아, CDN 비밀 조회가 몇 분 끊겨도 유닛이 failed로 굳지 않습니다.

## 비밀을 기동마다 새로 만들자 파일과 컨테이너의 수명이 갈렸습니다 {#비밀을-매번-만들면서-수명-문제가-생겼습니다}

시작 스크립트는 Secrets Manager에서 CDN 비밀을 읽고, MediaMTX 관리 API 비밀번호는 기동마다 `/dev/urandom`에서 새로 만듭니다. 비밀번호는 어디에도 저장하지 않고, 두 비밀을 넣은 설정 파일은 `/run`의 tmpfs에 0400 권한으로만 렌더합니다([`start-media.sh` 14–23행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/bin/start-media.sh#L14-L23)). tmpfs는 메모리 위의 파일 시스템이라 재부팅하면 내용이 사라집니다. 컨테이너는 이 파일을 읽기 전용 bind mount로 받습니다.

오래 사는 자격 증명은 줄었지만, 새 책임이 생겼습니다. 렌더 파일을 지우는 때와 그 파일을 마운트한 컨테이너를 내리는 때가 맞아야 합니다. 호스트에서 파일을 지워도 이미 돌고 있는 컨테이너는 옛 파일 내용을 그대로 들고 있습니다.

## 플러그인을 죽이자 옛 비밀을 든 컨테이너가 헬스 200으로 남았습니다

10월 20일 오전 6시 54분부터 8시 28분까지 AI가 갈래 열 가지를 각각 세 번씩 돌렸습니다. 갈래는 무엇을 죽이느냐로 나눴습니다. 주 프로세스(docker CLI)만, compose 플러그인만, 유닛 cgroup 전체(`systemctl kill -s KILL`)에 SIGKILL을 보냈고, `down` 실패 주입, 전원 차단 뒤 재부팅, dockerd 강제 종료도 넣었습니다.

재현된 것은 compose 플러그인만 죽인 갈래와 cgroup 전체를 죽인 갈래였습니다. 순서는 [[fig-crash-leftover]]의 위 줄과 같습니다.

1. 유닛이 실패로 끝났지만 compose 컨테이너 셋은 살아남았습니다.
2. 당시의 종료 뒤 정리(`ExecStopPost`)는 tmpfs의 렌더 파일만 지웠습니다.
3. 사이드카가 `on-failure`로 다시 뜨면서, 엔진이 사라진 bind 원본 자리에 빈 디렉터리를 만들었습니다.
4. 다음 기동은 그 자리에 설정 파일을 쓰지 못해 실패했고, 20초마다 같은 실패가 되풀이됐습니다. 첫 회에는 약 5분 동안 14번 다시 시도했습니다.

그사이 MediaMTX 자리 컨테이너는 지워진 옛 렌더, 즉 옛 CDN 비밀을 마운트한 채 계속 돌았습니다. 상자의 헬스 경로는 200을 냈습니다. 이 200은 nginx가 상류를 부르지 않고 내는 고정 응답이라([`nginx.conf.tmpl` 181–190행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/nginx/nginx.conf.tmpl#L181-L190)), 안쪽 컨테이너가 옛 비밀로 돈다는 사실을 알려 주지 못했습니다. 운영자가 `systemctl restart`를 해도 풀리지 않았고, 디렉터리를 손으로 지우고 다시 띄우면 유닛은 active가 됐지만 MediaMTX 자리 컨테이너는 같은 id 그대로였습니다. 사이드카가 재시작하지 않는 판에서는 기동은 성공하는데 옛 컨테이너가 조용히 남았습니다.

{{< motion scene="CrashLeftoverContainer" id="fig-crash-leftover" kind="개념도" caption="고치기 전(위)에는 유닛 cgroup이 SIGKILL로 끝나도 컨테이너가 살아남고 렌더 파일만 지워집니다. 사이드카가 다시 뜰 때 bind 원본 자리에 디렉터리가 생겨 다음 기동이 계속 실패하고, 옛 비밀을 든 컨테이너 옆에서 헬스 경로는 200을 냅니다. 고친 뒤(아래)에는 ExecStopPost가 compose를 내리고, 다음 기동이 --force-recreate와 create_host_path: false로 새 파일과 새 컨테이너를 만듭니다. 10월 20일 재현 실험을 옮긴 그림이며 시간 비율은 단순화했습니다." >}}

주 프로세스만 죽인 갈래는 회복됐습니다. 남은 compose 플러그인이 systemd의 SIGTERM을 받아 컨테이너를 스스로 멈췄기 때문입니다. 그래서 주 프로세스만 죽이는 시험은 이 결함을 놓치는 시험이었습니다([`unit_crash_cases.sh` 19–20행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/test/lib/unit_crash_cases.sh#L19-L20)).

## systemd 252는 실패한 종료에서 ExecStop을 건너뜁니다

[systemd 252 문서](https://www.freedesktop.org/software/systemd/man/252/systemd.service.html#ExecStop=)는 서비스가 성공적으로 시작했으면 프로세스가 스스로 끝나거나 죽어도 stop 작업을 수행한다고 적습니다. 코드는 그렇지 않았습니다. 실행 중이던 주 프로세스가 끝나면 `service_enter_running`이 불리고, 결과가 성공이 아니면 `ExecStop`을 거치지 않고 `service_enter_signal`로 가서 남은 프로세스에 SIGTERM을 보낸 뒤 `ExecStopPost`로 넘어갑니다([`src/core/service.c` 2091–2092행](https://github.com/systemd/systemd/blob/e8dc52766e1fdb4f8c09c3ab654d1270e1090c8d/src/core/service.c#L2091-L2092)). 결과가 성공일 때만 `service_enter_stop`으로 가서 `ExecStop`을 돌립니다.

시험 상자에서도 같았습니다. MediaMTX 자리 프로세스가 종료 코드 0으로 끝난 갈래에서는 `ExecStop`이 세 번 모두 돌았고, 종료 코드 1로 끝난 갈래에서는 세 번 모두 돌지 않았습니다. 정상 정지만 생각하고 정리를 `ExecStop`에 둔 것이 틀린 전제였습니다. 유닛 파일에는 이 경로를 주석으로 남겼습니다([`pokeclip-media.service` 56–60행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/systemd/pokeclip-media.service#L56-L60)). 이 동작은 systemd 252 판의 소스와 그 판의 시험 상자에서만 확인했습니다. 다른 판은 확인하지 않았습니다.

[[fig-unit-stop-paths]]에서 종료 코드의 갈림길을 보면 됩니다. 0이나 130이면 `ExecStop` 두 줄을 거치고, 그 밖이면 SIGTERM만 받고 바로 `ExecStopPost`로 갑니다.

```mermaid {#fig-unit-stop-paths kind="재구성" caption="pokeclip-media.service에서 주 프로세스가 끝난 뒤의 경로. 종료 코드가 0이거나 성공으로 치는 130이면 ExecStop 두 줄(TERM 뒤 최대 30초 대기, stop-media.sh)을 거친 뒤 ExecStopPost가 돕니다. 그 밖의 종료 코드면 systemd 252가 ExecStop을 건너뛰고 SIGTERM 뒤 바로 ExecStopPost로 갑니다. 두 경로 모두 Restart=always로 20초 뒤 다시 기동합니다. PokeClip-mono develop 825a3dfe의 유닛 파일과 systemd v252 service.c 재구성." source="https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/systemd/pokeclip-media.service#L44-L63"}
flowchart TB
  accTitle: 미디어 상자 유닛의 종료 경로
  accDescr: 주 프로세스가 끝나면 종료 코드를 본다. 0 또는 130이면 ExecStop 첫 줄이 TERM을 보내고 최대 30초 기다린 뒤 둘째 줄이 stop-media.sh를 돌리고 ExecStopPost로 간다. 그 밖의 코드면 ExecStop을 건너뛰고 SIGTERM 뒤 바로 ExecStopPost로 간다. ExecStopPost는 stop-media.sh로 compose를 내리고 렌더 파일을 지운다. 그 뒤 Restart=always가 20초 뒤 다시 기동한다.
  exit[주 프로세스 종료]
  code{종료 코드}
  stop1[ExecStop 1<br/>TERM 뒤 최대 30초]
  stop2[ExecStop 2<br/>stop-media.sh]
  sig[SIGTERM만<br/>ExecStop 건너뜀]
  post[ExecStopPost<br/>compose down · 렌더 삭제]
  again[Restart=always<br/>20초 뒤 다시 기동]
  exit --> code
  code -->|0 · 130| stop1 --> stop2 --> post
  code -->|그 밖| sig --> post
  post --> again
  style post fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

정리를 맡은 칸은 강조한 `ExecStopPost` 하나뿐입니다. 어느 길로 끝나든 이 칸은 지나갑니다.

## 정리를 ExecStopPost로 옮기고 컨테이너를 늘 새로 만듭니다 {#정리마운트다음-기동을-함께-고쳤습니다}

종료 경로 하나만 고쳐서는 부족했습니다. 정리가 실패한 다음 기동도 스스로 회복해야 했습니다. 고친 것은 넷입니다.

| 변경 | 막는 실패 |
|---|---|
| `ExecStopPost`에서도 `stop-media.sh`로 compose를 내림 | 컨테이너를 둔 채 렌더 파일만 지움 |
| bind를 긴 문법으로 쓰고 `create_host_path: false` | 사라진 파일 원본 자리에 디렉터리가 생김 |
| `up --force-recreate` | 옛 렌더를 붙든 컨테이너를 다시 씀 |
| `up --remove-orphans` | 렌더에서 빠진 서비스의 옛 컨테이너가 같은 망 칸에 남음 |

[Compose 문서](https://docs.docker.com/reference/compose-file/services/#volumes)대로 bind 원본이 없으면 짧은 문법은 디렉터리를 만들고, 긴 문법의 `create_host_path: false`가 이를 막습니다([`compose.yml.tmpl` 155–160행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/compose.yml.tmpl#L155-L160)). 이 옵션은 원본이 없을 때 그 컨테이너가 뜨지 못하게 할 뿐입니다. 새 파일과 새 컨테이너를 만드는 일은 다음 기동의 `--force-recreate`가 맡습니다([`start-media.sh` 766–770행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/bin/start-media.sh#L766-L770)). [정지 스크립트](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/bin/stop-media.sh#L18-L24)는 `down`이 실패하면 프로젝트 라벨로 남은 컨테이너를 찾아 지웁니다. 남으면 옛 비밀을 든 채 돌기 때문입니다.

고친 뒤 같은 갈래(플러그인 SIGKILL, cgroup SIGKILL, 사이드카가 재시작하지 않는 판, `down` 실패 주입, 운영자 정지·시작)를 각각 세 번 돌렸고 모두 회복했습니다.

## 정지는 TERM 뒤 30초를 기다리고 볼륨은 남깁니다

정상 정지도 두 단계로 바꿨습니다. 먼저 주 프로세스(compose up)에 TERM을 보내 최대 30초 기다리고, 그다음 `stop-media.sh`가 `down`합니다([`pokeclip-media.service` 44–55행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/systemd/pokeclip-media.service#L44-L55)). 바로 `down`부터 하면 compose up의 중단 처리와 겹쳐 up이 종료 코드 1로 끝났고, 유닛이 failed로 남았습니다. 시험에서는 10번 중 9번 그랬습니다. compose up은 TERM에 130으로 끝나므로 `SuccessExitStatus=130`으로 이 값을 성공으로 칩니다. 기동 중(선행 점검·비밀 조회·렌더)에 TERM이 오면 시작 스크립트도 130으로 끝나도록 트랩을 걸었습니다([`start-media.sh` 751–757행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/bin/start-media.sh#L751-L757)).

`down`에는 볼륨을 지우는 인자를 주지 않습니다. 실행 상태를 비우는 것과 녹화·훅 스풀·되감기 조각을 지우는 것은 다른 일이기 때문입니다. 이 30초 동안 송출이 끊긴다는 점과 같은 상자를 다시 띄우면 무엇이 남는지는 [미디어 서버 배치 글](/posts/0-to-1/pokeclip-stateful-media-deployment/#미디어-상자는-30초-기다린-뒤-내리고-녹화-볼륨은-남깁니다)에 있습니다.

## 재시작 시험 19사례를 세 번 돌렸고 운영 상자도 이 유닛으로 뜹니다 {#다시-켜졌다는-것보다-무엇이-남았는지를-봤습니다}

10월 22일 PR 직전 일괄 시험에서 실제 systemd 위의 유닛 재기동 시험 19사례가 세 번 반복해 모두 통과했습니다. 같은 날 밤 최종 트리에서는 사례가 21개로 늘었고, 다시 세 번 통과했습니다. 서로 다른 시점의 사례 수를 더해 하나의 성과로 세지 않았습니다. 시험은 이 유닛 파일을 바이트 그대로 설치해 돌립니다. 10월 23일 머지한 [PR #322](https://github.com/3K-PokeClip/PokeClip-mono/pull/322)가 사례 21을 넓혔고, 지금은 크래시 사례 셋을 포함해 24사례가 CI에서 돕니다([`unit_restart_test.sh` 6–9행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/test/unit_restart_test.sh#L6-L9)).

시험에서 본 것은 「다시 켜졌다」가 아니라 이전 실행의 무엇이 남았는가였습니다. 컨테이너 id가 바뀌었는지, 렌더 파일 자리에 디렉터리가 생기지 않았는지, 유닛이 failed로 굳지 않았는지를 따로 확인했습니다.

운영 상자는 같은 유닛 파일을 그대로 설치합니다([`user_data.tf` 93–97행](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/terraform/modules/media_host/user_data.tf#L93-L97)). 11월 3일 운영 상자가 이 유닛으로 기동했습니다. CDN 비밀을 넣기 전에는 기동 차단을 되풀이하면서도 failed로 굳지 않았고, 비밀을 넣고 다시 띄우자 `MEDIA START OK`가 찍혔습니다. 약 5분 감시하는 동안 주 프로세스 번호(MAINPID)가 그대로였고, 로드 밸런서 대상 그룹 넷이 healthy였습니다. 운영 상자에서 강제 종료 시험은 하지 않았습니다.

남은 한계도 있습니다. 헬스 200은 여전히 nginx 자신의 응답이라 안쪽 컨테이너의 상태를 말하지 않습니다. 상자는 한 대이고, 기동은 비밀 조회에 기댑니다. 이 시험은 다중 상자 고가용성이나 무중단 복구를 보여 주지 않습니다. systemd 유닛으로 컨테이너 묶음을 띄운다면, 정리를 `ExecStop`에만 두지 말고 `ExecStopPost`에도 두십시오. 그리고 주 프로세스만 죽이는 시험이 아니라 자식 프로세스와 cgroup 전체를 죽이는 시험으로 확인하십시오.

## 측정 조건

- 10월 20일 재현 실험: 개발자 맥의 OrbStack에 띄운 Amazon Linux 2023 arm64 컨테이너(systemd 252가 PID 1, 특권), docker 25.0.16, compose 5.5.0. EC2가 아닙니다. MediaMTX 자리에는 시험용 에코 서버를, 비밀에는 가짜 값을 썼습니다. 갈래 열 가지를 각 3회(cgroup 갈래는 1회 더) 돌렸고 AI가 수행했습니다. 원자료는 비공개입니다.
- 10월 22일 일괄 시험: 같은 종류의 시험 상자에서 유닛 재기동 시험 19사례 × 3회, 최종 트리 21사례 × 3회. 공개 요약은 PR #311 본문의 검증 절입니다.
- 11월 3일 운영 상자 기동 확인: 저널과 대상 그룹 상태를 약 5분 관찰. 강제 종료 시험 없음. 원자료는 비공개입니다.
- 코드 인용은 PokeClip-mono develop `825a3dfe`(2026년 11월 11일), systemd 소스는 v252 태그(`e8dc5276`)입니다. PR 상태는 2026년 11월 11일에 확인했습니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #311](https://github.com/3K-PokeClip/PokeClip-mono/pull/311) — 미디어 상자 유닛 · 시작 · 정지 스크립트(2026-10-23 머지)
- [3K-PokeClip/PokeClip-mono PR #322](https://github.com/3K-PokeClip/PokeClip-mono/pull/322) — 유닛 시험 사례 보강(2026-10-23 머지)
- [`infra/media-host/systemd/pokeclip-media.service`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/systemd/pokeclip-media.service#L44-L63) — 두 단계 정지, ExecStopPost, SuccessExitStatus=130, Restart=always
- [`infra/media-host/bin/start-media.sh`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/bin/start-media.sh#L751-L770) — TERM 트랩, `--force-recreate` · `--remove-orphans`
- [`infra/media-host/bin/stop-media.sh`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/bin/stop-media.sh#L18-L24) — down 실패 시 라벨로 잔여 컨테이너 제거
- [`infra/media-host/compose.yml.tmpl`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/compose.yml.tmpl#L155-L160) — `create_host_path: false`
- [`infra/media-host/test/unit_restart_test.sh`](https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/infra/media-host/test/unit_restart_test.sh#L6-L9) — 유닛 재기동 시험
- [systemd v252 `src/core/service.c`](https://github.com/systemd/systemd/blob/e8dc52766e1fdb4f8c09c3ab654d1270e1090c8d/src/core/service.c#L2083-L2108) — `service_enter_running`의 갈림
- [systemd.service(5) 252판 「ExecStop=」](https://www.freedesktop.org/software/systemd/man/252/systemd.service.html#ExecStop=) — stop 작업과 ExecStopPost 설명
- [Docker 문서 「Compose file: services · volumes」](https://docs.docker.com/reference/compose-file/services/#volumes) — `create_host_path`
- [방송 중인 미디어 서버는 API처럼 갈아 끼울 수 없었습니다](/posts/0-to-1/pokeclip-stateful-media-deployment/) — 정지 30초와 볼륨 보존
- 팀 내부 시험 · 운영 기록(비공개) — 10월 20일 재현 실험, 10월 22일 일괄 시험, 11월 3일 운영 상자 기동

---

[nginx의 재생 요청 검증](/posts/0-to-1/pokeclip-nginx-playback-request-boundary/) · [전체 기술 기록](/posts/0-to-1/portfolio-engineering-notes/)
