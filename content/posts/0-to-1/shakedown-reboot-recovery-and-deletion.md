---
title: "재부팅 후에는 살아나고 삭제 후에는 살아나지 않아야 했습니다"
date: "2026-10-15T11:36:25+09:00"
lastmod: "2026-11-12T05:30:00+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "Shakedown을 EC2에 올린 첫 실험에서는 재부팅 뒤 자동으로 뜬 서비스가 0개였고 수동 compose up 뒤에야 데이터 2건이 보였습니다. Docker restart 정책 · systemd Target API · 삭제 tombstone을 더한 뒤, 제품 API로 배포한 Node/PostgreSQL 앱이 첫 재부팅 뒤 수동 명령 없이 돌아오고 DELETE 뒤 두 번째 재부팅에서는 다시 생기지 않는 것을 확인했습니다."
tags: ["개발 사례", "Shakedown"]
portfolio_cases: []
portfolio_pages: [53]
portfolio_edition: "2026-10-15-v2"
---

EC2 한 대를 사내 서버처럼 쓰는 첫 실험에서 호스트를 재부팅하자, 자동으로 다시 뜬 서비스는 0개였습니다. 수동으로 `docker compose up`을 실행한 뒤에야 앱이 돌아왔고 데이터 2건이 보였습니다. 데이터는 보존됐지만 자동 복구는 아니었습니다. 이 실험은 Shakedown의 배포 API(Target API)를 거치지 않고, 엔진이 만드는 Compose 명세에서 터널을 빼고 앱 포트를 붙여 직접 띄운 것이었습니다. 생성된 서비스에는 재시작 정책이 없었습니다([첫 실험 보고서](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/2026-10-10-onprem-ec2.md#L40-L54)). 재시작 정책 · systemd · 삭제 기록을 더한 뒤, 같은 날 제품의 Target API로 배포한 앱은 첫 재부팅 뒤 수동 명령 없이 돌아왔고, DELETE 뒤 두 번째 재부팅에서는 다시 생기지 않았습니다.

Shakedown은 SoftBank Hackathon 2026 예선 산출물입니다(작업 2026년 10월 8~10일). 첫 실험의 공백을 보고, 터널 없는 직접 배포와 재부팅 뒤 자동 기동을 제품 API 경로에 연결하라고 요구한 것은 저입니다. 「삭제한 배포는 재부팅해도 살아나면 안 된다」는 반대 조건도 제가 검증 조건으로 넣었습니다. 구현과 실험 실행은 개발에 쓴 AI(Codex와 Claude Code)가 했습니다. 변경은 [PR #31](https://github.com/SoftBankHackathon/shakedown/pull/31)에 있고 10월 10일 15:02 제 계정으로 병합했습니다. 리뷰는 없었습니다.

## 데이터를 남기는 것과 서비스를 다시 시작하는 것은 달랐습니다

첫 실패를 컨테이너 자동 시작만으로 고치면 두 질문이 남습니다. 배포를 관리하는 Target API는 언제 다시 뜨는지, 그리고 컨테이너가 없는 배포가 재부팅으로 멈춘 것인지 운영자가 지운 것인지를 무엇으로 구분하는지입니다. 그래서 DB 볼륨, 앱 · DB 컨테이너, 제어 API, 배포 상태를 각각 다른 장치에 맡겼습니다.

| 책임 | 맡긴 장치 |
|---|---|
| 앱 · DB 컨테이너 다시 시작 | 생성하는 모든 서비스에 Docker `restart: unless-stopped` |
| 제어 API(Target API) 다시 시작 | Docker 뒤에 시작하는 systemd 유닛 |
| 배포 상태 · 삭제 의도 | 배포마다 디스크의 상태 파일, 삭제하면 tombstone 표시 |
| 삭제 | 컨테이너 · 네트워크 제거, DB 볼륨은 남김 |

`unless-stopped`는 Docker 데몬이 다시 시작될 때 컨테이너를 다시 띄우되, 사람이 멈춘 컨테이너는 띄우지 않는 정책입니다([Docker 문서](https://docs.docker.com/engine/containers/start-containers-automatically/)). 엔진은 배포마다 이 정책을 모든 서비스에 붙입니다([`infra/local/delivery.mjs` 15행](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/delivery.mjs#L15)). tombstone은 그 배포가 삭제됐다는 기록입니다. 「컨테이너가 없다」는 현재 상태만으로는 다시 만들어야 할 배포와 지운 배포를 구분할 수 없어서, 삭제 의도를 디스크에 남겼습니다.

[[fig-reboot-start-order]]에서 컨테이너를 다시 띄우는 쪽과 배포 상태를 답하는 쪽이 갈라지는 곳을 보면 됩니다. Target API는 컨테이너를 띄우지 않고, 디스크의 상태만 읽어 답합니다.

```mermaid {#fig-reboot-start-order kind="재구성" caption="호스트가 부팅된 뒤의 시작 순서. Docker 데몬이 unless-stopped 컨테이너(앱 · DB)를 다시 띄우고, systemd가 Docker 뒤에 Target API를 시작합니다. Target API는 배포마다 디스크의 상태 파일을 읽어, tombstone이 있으면 GET에 404로 답합니다(청록). 삭제한 배포는 DELETE 때 컨테이너가 지워져 Docker가 다시 띄울 것이 없습니다. shakedown 12ac8a8의 systemd 유닛 · delivery.mjs · server.mjs 재구성." source="https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/server.mjs#L55-L64"}
flowchart TB
  accTitle: 재부팅 뒤 시작 순서
  accDescr: 호스트가 부팅되면 Docker 데몬이 시작된다. Docker는 unless-stopped 정책의 앱과 DB 컨테이너를 다시 띄운다. systemd는 Docker 뒤에 Target API를 시작한다. Target API는 배포마다 디스크의 상태 파일을 읽고, tombstone이 있는 배포에는 GET에 404로 답하며 다시 만들지 않는다.
  boot[호스트 부팅]
  docker[Docker 데몬 시작]
  ctr[앱 · DB<br/>컨테이너]
  api[Target API<br/>systemd]
  state[(배포별<br/>상태 파일)]
  gone[GET 404<br/>재생성 없음]
  boot --> docker
  docker -->|unless-stopped| ctr
  docker -->|After=docker| api
  api --> state
  state -->|tombstone이면| gone
  style gone fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

systemd 유닛은 `Requires=docker.service`와 `After=docker.service`로 Docker가 뜬 뒤에 Target API를 시작합니다([`shakedown-local.service` 3–4행](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/systemd/shakedown-local.service#L3-L4)). Target API는 시작할 때 배포마다 상태 파일을 읽고, 배포 도중에 끊긴 기록은 실패로 바꿔 둡니다([`server.mjs` 55–64행](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/server.mjs#L55-L64)).

## 직접 배포의 주소도 운영자가 정하도록 했습니다

direct 모드는 Cloudflare Tunnel 없이 운영자가 환경 변수로 정한 origin을 씁니다. API를 부르는 쪽은 주소나 호스트 포트를 고를 수 없고, 엔진은 그 origin과 정확히 같은 주소만 받아들입니다. 어댑터가 엉뚱한 주소를 돌려줘도 통과하지 못합니다. 그 공개 URL이 실제로 HTTP 200을 돌려준 뒤에야 ready로 표시하고, redirect나 TLS 오류는 성공으로 치지 않습니다([실험 보고서 「Implementation」](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/2026-10-10-direct-deployment-reboot.md#L7-L22)).

이 주소를 여러 배포가 동시에 차지하면 재부팅 뒤 어느 배포를 살려야 하는지도 모호해집니다. 그래서 주소 하나에는 삭제하지 않은 배포 하나만 예약되게 했습니다. 같은 ID와 같은 본문으로 다시 보내면 같은 결과를 돌려주고, 다른 배포 ID가 들어오면 409로 거부합니다([`server.mjs` 97–100행](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/server.mjs#L97-L100)). 실패한 배포도 자원을 쥐고 있을 수 있으므로 DELETE 전까지 예약을 풀지 않습니다.

## 고친 판의 첫 재부팅은 수동 명령 없이 돌아왔습니다 {#수동-명령-없는-첫-재부팅을-확인했습니다}

10월 10일 전용 Amazon Linux 2023 t3.medium EC2에서 고친 Target API로 DB 없는 Node 앱과 Node/PostgreSQL 앱을 차례로 배포했습니다. 첫 실험과 달리 배포 API의 요청 형식을 그대로 썼고, 생성된 Compose 파일을 고치거나 `compose up`을 손으로 실행하지 않았습니다. 관리는 SSM으로 했고, 앱 포트 말고는 SSH · DB · Target API 포트의 외부 인입을 열지 않았습니다.

재부팅은 두 번 했습니다. 첫 재부팅은 「살아 있어야 할 배포가 돌아오는가」, 두 번째 재부팅은 「삭제한 배포가 계속 없는가」를 묻습니다. 어느 쪽이든 사람이 기동 명령을 넣으면 자동 동작을 검증할 수 없으므로, 재부팅 뒤에는 새 POST도 수동 시작도 하지 않았습니다. 영상은 두 재부팅을 이어서 보여 줍니다. 청록으로 바뀌는 것이 그 단계에서 확인한 상태입니다.

{{< motion scene="RebootTwiceTombstone" id="fig-reboot-twice-tombstone" kind="개념도" caption="고친 판의 두 번 재부팅. 첫 재부팅 뒤 Docker가 앱 · DB 컨테이너를 다시 띄우고 systemd가 Target API를 시작해, 수동 명령 없이 데이터 2건과 함께 돌아왔습니다. DELETE가 컨테이너를 지우고 tombstone을 남기자, 두 번째 재부팅 뒤에는 컨테이너가 다시 생기지 않고 GET이 404를 유지했습니다. DB 볼륨은 남았습니다. Node/PostgreSQL 앱 하나로 한 2026년 10월 10일 실험을 옮긴 설명용 그림이며 시간 비율은 실제와 다릅니다." >}}

| 단계 | 확인한 상태 |
|---|---|
| API 배포 | DB 없는 Node 앱 ready, 같은 요청 재전송 202, 경쟁 배포 409, DELETE 204. 이어 Node/PostgreSQL 앱 ready |
| 데이터 준비 | 두 번째 행을 쓰고 읽어 모두 2건, 터널 없이 로그 조회 200 |
| 첫 재부팅 | Linux boot ID가 바뀌어 실제 호스트 재부팅 확인 |
| 복구 확인 | 새 POST · 수동 시작 없이 Target API와 앱 · DB 컨테이너가 돌아옴, 데이터 2건, 개발자 PC에서 공개 HTTP로 조회 |
| 경쟁 요청 | 재부팅 뒤에도 다른 배포 ID는 409 |

첫 실험에서 손으로 해야 했던 `compose up` 자리가 비었습니다. 같은 Node/PostgreSQL 조합에서 데이터 2건이 남은 것은 첫 실험과 같지만, 이번에는 컨테이너와 제어 API가 스스로 돌아온 뒤의 2건입니다([실험 보고서 「Real EC2 test」 3–4단계](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/2026-10-10-direct-deployment-reboot.md#L24-L50)).

## 두 번째 재부팅 뒤에도 삭제한 배포는 없었습니다

이어 Node/PostgreSQL 배포를 DELETE했습니다. 204를 받았고, 같은 DELETE를 다시 보내도 204, GET은 404였습니다. 컨테이너는 0개가 됐고 PostgreSQL 볼륨은 남았습니다. 그 상태로 호스트를 다시 재부팅하자 지운 컨테이너는 다시 생기지 않았고, 남은 tombstone 때문에 GET은 계속 404였습니다([실측 원자료](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/evidence/2026-10-10-direct-deployment-reboot.json)).

두 장치가 각자 한 일이 있습니다. DELETE는 컨테이너를 지우므로 Docker가 재부팅 뒤 다시 띄울 대상이 없습니다. Target API는 상태 파일에 삭제 표시를 쓰고, 그 배포의 Compose 파일도 지웁니다([`server.mjs` 122–132행](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/server.mjs#L122-L132)). Target API에는 컨테이너를 다시 만드는 코드가 없고, 재부팅 뒤에는 그 표시를 읽어 GET에 404로, 지운 ID로 다시 온 POST에는 409로 답합니다([`server.mjs` 97·113행](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/server.mjs#L97-L113)). 같은 시험 안에서 첫 재부팅은 살아나야 할 것을 살렸고, 두 번째 재부팅은 지운 것을 살리지 않았습니다.

그 시점에 엔진 시험 421개와 로컬 시험 16개, 모두 437개가 통과했습니다. 마지막으로 origin 포트 검사를 더한 뒤 관련 엔진 시험 12개를 다시 돌렸지만, 이는 재확인이라 합계에 더하지 않았습니다. 시험용으로 남긴 DB 볼륨은 마지막에 명시적으로 지웠습니다.

## restart 정책만으로 모든 준비 순서를 해결하지는 못했습니다

Docker는 호스트 재부팅 때 Compose의 health 의존 순서를 지켜 주지 않습니다. 그래서 앱이 DB보다 먼저 뜰 수 있고, 앱은 DB 연결을 다시 시도하거나 시작에 실패하면 종료해서 Docker가 다시 띄우게 해야 합니다. 프로세스가 살아 있는데 회복하지 못하는 상태는 restart 정책으로 풀리지 않습니다. 이 기능 이전에 만든 배포는 재배포해야 새 정책을 받습니다. systemd 유닛은 Target API를 시작할 뿐 엔진 자체를 설치하거나 시작하지 않습니다. ready는 마지막으로 성공한 검사이지 상시 감시가 아닙니다. 직접 배포 주소가 바뀌지 않는다는 것도 운영자가 지켜야 할 전제입니다. 고정하지 않은 EC2 공인 IP는 중지 · 시작에 바뀔 수 있습니다([실험 보고서 「Limits」](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/2026-10-10-direct-deployment-reboot.md#L56-L71)).

실제 호스트 재부팅을 시험한 것은 Node/PostgreSQL 조합뿐입니다. MySQL · MongoDB 배포에도 같은 restart 정책이 붙고 구성 시험도 있지만, 호스트 재부팅은 시험하지 않았습니다. 공개 HTTP로만 시험했고, HTTPS 인증서 발급, VPN · 전용선, 실제 사내망, HA, 호스트 유실, scanner → LLM → 브라우저 전체 흐름도 검증하지 않은 범위입니다.

복구 시험을 설계한다면 살아나야 할 대상만 세지 말고, 이미 지운 대상이 다시 생기지 않는지도 같은 시험에 넣으십시오. 첫 실험의 데이터 2건은 저장 장치가 데이터를 지켰다는 것만 알려 줬고, 운영자의 마지막 의도까지 지켰다는 근거는 두 번째 재부팅에서 나왔습니다.

## 측정 조건

- 첫 실험(고치기 전): 2026년 10월 10일, 전용 Amazon Linux 2023 t3.medium(암호화 24GiB EBS), Node v22.23.2, Docker 25.0.14, Docker Compose v5.6.0, 소스 `85c12a5`. Target API 없이 엔진의 Compose 명세를 직접 띄웠고, 앱 포트는 실험 클라이언트 주소에만 열었으며 제어 API는 루프백에만 두었습니다. ECS · RDS · 터널은 쓰지 않았습니다.
- 고친 판: 같은 날 새 전용 Amazon Linux 2023 t3.medium(암호화 EBS), PR #31 head `12ac8a8`. Target API의 POST · GET · logs · DELETE 요청 형식을 그대로 썼습니다. 앱 포트는 시험 클라이언트와 인스턴스 자신의 공인 주소에만 열었습니다(공개 URL을 스스로 확인하기 위해). 재부팅은 두 번, 각 단계는 한 번씩 했습니다.
- 실험은 개발에 쓴 AI가 실행했습니다. 두 실험의 스택 · EC2 · 볼륨 · 보안 그룹 · SSM 역할은 모두 지웠습니다.

## 출처

- [SoftBankHackathon/shakedown PR #31](https://github.com/SoftBankHackathon/shakedown/pull/31) — 온프레미스 직접 배포 · 자동 기동 및 EC2 재부팅 실측(2026-10-10 병합)
- [첫 실험 보고서 「EC2 as an on-premises Docker host — 2026-10-10」](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/2026-10-10-onprem-ec2.md) — 재부팅 뒤 자동 실행 서비스 0개, 수동 시작 뒤 데이터 2건
- [첫 실험 원자료(JSON)](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/evidence/2026-10-10-onprem-ec2.json) — `reboot-verify` 단계
- [실험 보고서 「Direct local deployment and automatic reboot recovery — 2026-10-10」](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/2026-10-10-direct-deployment-reboot.md) — 구현, 두 번 재부팅, 한계, 정리
- [실측 원자료(JSON)](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/docs/experiments/evidence/2026-10-10-direct-deployment-reboot.json) — 단계별 확인 값
- [`infra/local/server.mjs`](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/server.mjs#L55-L64) — 상태 파일 읽기, 예약, DELETE와 tombstone
- [`infra/local/delivery.mjs`](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/delivery.mjs#L15) — 모든 서비스에 `unless-stopped`
- [`infra/local/systemd/shakedown-local.service`](https://github.com/SoftBankHackathon/shakedown/blob/12ac8a8d92b0b3b8da057bd37c894fddfb3cc2b6/infra/local/systemd/shakedown-local.service#L3-L4) — Docker 뒤 Target API 시작
- [Docker 문서 「Start containers automatically」](https://docs.docker.com/engine/containers/start-containers-automatically/) — restart 정책

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=53)
