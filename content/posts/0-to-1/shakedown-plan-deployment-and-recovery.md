---
title: "선택한 배포 계획을 AWS에 적용하고 장애 뒤 복구를 쟀습니다"
date: "2026-10-15T11:33:48+09:00"
lastmod: "2026-11-12T04:47:11+09:00"
author: "김태윤"
categories: ["0-to-1"]
draft: false
description: "Shakedown(SoftBank Hackathon 2026 예선 산출물)에서 저장한 배포 계획 id를 서버 카탈로그로 실제 AWS 자원에 적용했습니다. medium · large 배포는 카탈로그대로 만들어졌고 소요 시간의 대부분은 DB 구성 단계였습니다. 앞선 실험에서 나온 ALB 403 · 기동 유예 결함과 중지 502를 시간 예산으로 고친 뒤, large 태스크 강제 종료에서 58.69초 뒤 정상 3개 · 3 AZ로 돌아오는 것을 확인했습니다."
tags: ["개발 사례", "Shakedown", "AWS", "ECS", "RDS"]
portfolio_cases: []
portfolio_pages: [48, 49]
portfolio_edition: "2026-10-15-v2"
---

Shakedown은 SoftBank Hackathon 2026 예선 산출물로, 저장소를 분석해 이미지를 만들고 배포하는 서비스입니다. 처음에는 사용자가 소 · 중 · 대 배포 구성을 골라 저장하는 기능과 실제 AWS 배포가 이어져 있지 않았습니다. 배포 API는 저장한 계획을 받지 않았고, AWS 어댑터는 태스크당 0.5 vCPU / 1 GiB, 최대 2개라는 고정 설정만 썼습니다. 저장한 계획 id를 서버 카탈로그로 실제 자원에 적용하도록 연결한 뒤 2026년 10월 9일 medium과 large를 배포했고, 두 구성 모두 카탈로그대로 만들어졌습니다. 어댑터 배포에는 662.196초와 687.861초가 걸렸고 그중 493.659초와 537.093초가 DB 구성 단계였습니다. large 태스크 하나를 강제로 끈 뒤에는 58.69초 만에 정상 태스크 3개가 3개 AZ에 다시 섰습니다.

ALB 공개 차단을 별도 우선순위 1 규칙으로 옮기는 것, 기동 유예 120초, 중지 대기 600초 · 630초는 제가 정했습니다. AWS 실험 예산은 앞선 실험을 포함해 3달러로 승인했고, 이후 예산을 늘려 large 실험을 지시했습니다. 구현과 실험 실행은 개발에 쓴 AI(Codex와 Claude Code)가 했습니다. 초기 ECS · ALB · RDS 어댑터는 팀원이 만든 기반입니다.

## 저장된 계획을 다시 검증한 뒤 실행했습니다

클라이언트가 보낸 CPU나 태스크 수를 그대로 실행하면 추천과 실행 사이의 약속을 우회할 수 있습니다. 그래서 배포 요청은 자원 값 대신 `architecture_plan_id`만 받습니다. 엔진은 그 계획이 프로젝트의 최신 선택인지, 같은 프로젝트와 분석 근거를 가리키는지, 지원하는 스택인지 다시 확인한 뒤 서버 카탈로그의 값을 어댑터에 넘기고 그 스냅샷을 배포 기록에 남깁니다([계획 배포 보고서 3–5행](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-plan-deployment-connection.md#L3-L5)). 다른 프로젝트의 계획, 선택하지 않은 계획, 오래된 계획, 태스크 수를 직접 덮어쓰는 요청, 알 수 없는 자원 필드, AZ가 모자란 기반은 자동 시험에서 모두 거절됐습니다. 계획을 저장하는 요청만으로는 자원이 생기지 않습니다.

이 연결은 기반 스택(VPC · ALB · RDS)이 이미 있다고 가정합니다. 시험에서는 실험 스크립트가 만든 폐기용 기반 스택을 썼고([30행](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-plan-deployment-connection.md#L30)), 빈 AWS 계정에서 기반 자원까지 자동으로 만드는 일은 범위 밖입니다. large는 3개 AZ의 서브넷이 필요해서, 2개 AZ만 있는 기존 기반으로는 small과 medium만 배포할 수 있습니다.

## 앞선 실험의 결함 두 개를 고친 뒤 연결했습니다

계획을 연결하기 전에 같은 날 기존 어댑터를 직접 호출하는 [AWS 통합 실험](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-aws-full-stack.md#L11-L36)을 먼저 돌렸고, 거기서 결함 두 개가 나왔습니다.

첫째, ECS 서비스 생성이 `The target group ... does not have an associated load balancer`로 실패했습니다. 준비가 끝나기 전 접근을 막으려고 ALB 리스너가 고정 403만 돌려주고, 건강 확인 뒤에야 대상 그룹으로 넘기게 돼 있었습니다. ECS는 서비스를 만들 때 대상 그룹이 로드 밸런서에 연결돼 있기를 요구하는데, 그 연결이 없었습니다. 리스너의 기본 동작은 대상 그룹 전달로 두고, 모든 IPv4 · IPv6 출발지에 걸리는 우선순위 1 규칙에서 403과 전달을 바꾸게 했습니다([`foundation.yaml` 594–621행](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/infra/aws/cloudformation/foundation.yaml#L594-L621) · [커밋 980f399](https://github.com/SoftBankHackathon/shakedown/commit/980f3991ab57a3b63f68c43e2c36adeadd3f76ae)). 준비 중 차단과 ECS가 요구하는 연결을 함께 지키는 방법이었습니다.

둘째, Spring 앱은 기동에 약 41초가 걸리는데 ECS 건강 검사 유예는 30초였습니다. 앱 로그에는 정상 기동이 남았는데, ECS 이벤트에는 태스크 2개를 상태 불량으로 교체한 기록이 남았습니다. 건강 검사를 끄지 않고 유예만 120초로 늘렸습니다([커밋 b46f1f9](https://github.com/SoftBankHackathon/shakedown/commit/b46f1f91ffb6c6aa517b4bb7c4e0b30d40d3a821)). 두 수정 모두 [PR #12](https://github.com/SoftBankHackathon/shakedown/pull/12)에 들어갔습니다.

계획을 연결한 뒤 medium 실행에서 하나가 더 나왔습니다. 중지 API는 공개 경로를 403으로 막은 데까지는 성공했지만, ECS 서비스 삭제가 끝나기를 기다리는 120초 제한을 넘겨 HTTP 502를 돌려줬습니다([보고서 47–53행](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-plan-deployment-connection.md#L47-L53)). 태스크가 멈춘 뒤에도 ECS 제어 영역이 서비스 상태를 정리하는 데 시간이 걸렸습니다. 어댑터의 대기를 600초, 그 바깥에서 어댑터를 부르는 엔진의 DELETE 제한을 630초로 늘려, 안쪽 작업보다 바깥이 먼저 포기하지 않게 했습니다([`aws-provider.ts` 175–181행](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/infra/aws/src/aws-provider.ts#L175-L181) · [`aws_runner.py` 102행](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/aws_runner.py#L102)). 수정 뒤 large 중지는 189.70초에 HTTP 204로 끝났고 서비스는 `INACTIVE`, 실행 · 대기 태스크는 0개였습니다. 120초 제한으로는 이 중지를 끝까지 기다릴 수 없었습니다.

영상은 두 시간 예산을 같은 모양으로 보여 줍니다. 위 줄은 기동, 아래 줄은 중지이고, 막대가 실제 걸린 시간, 세로선이 기다린 한도입니다.

{{< motion scene="StartStopTimeBudgets" id="fig-start-stop-time-budgets" kind="개념도" caption="기동과 중지의 시간 예산. 위: Spring 기동 약 41초가 건강 검사 유예 30초를 넘어 태스크가 교체됐고, 유예를 120초로 늘렸습니다. 아래: 공개 경로를 403으로 막은 뒤 ECS 서비스 종료를 기다리는데, 120초 제한은 medium 실행에서 502로 끝났고 수정 뒤 large 중지는 189.70초에 204로 끝났습니다. 어댑터는 600초, 엔진은 630초까지 기다립니다. 502와 189.70초는 서로 다른 실행의 기록이고, 두 줄의 가로 눈금은 다릅니다." >}}

두 실패 모두 앱이나 AWS가 고장 난 것이 아니라, 기다리는 쪽의 한도가 실제 걸리는 시간보다 짧았던 것입니다. 그래서 검사를 끄지 않고 한도를 실측에 맞췄습니다.

포트폴리오 요약(2026-10-15판) 48쪽은 403 차단과 기동 유예를 「실제 배포에서 만난 충돌」로 계획 연결과 함께 적었습니다. 두 결함은 계획을 연결하기 전 기존 어댑터를 직접 호출한 실험에서 나왔고, 계획 연결 실행에서 새로 나온 것은 중지 502입니다.

## medium과 large의 실제 자원이 카탈로그와 같았습니다 {#설정값과-실제-상태를-대조했습니다}

10월 9일 실행은 FastAPI TestClient로 설계 생성 → 선택 → `architecture_plan_id` 배포 요청 → 엔진 이미지 빌드 · ECR 게시 → AWS 어댑터 → 실제 AWS 자원까지 이었습니다. AWS 경계를 대역으로 바꾸지 않았고, 배포 연결만 따로 보려고 `use_ai=false`로 규모 판단에 Claude를 부르지 않았습니다. 브라우저에서 버튼을 누르는 시험은 아닙니다.

| 항목 | medium | large |
|---|---|---|
| 태스크당 CPU / 메모리 | 1 vCPU / 2 GiB | 2 vCPU / 4 GiB |
| 정상 태스크 / AZ | 2개 / 2a · 2b | 3개 / 2a · 2b · 2c |
| RDS | Single-AZ → Multi-AZ | Single-AZ → Multi-AZ |
| 자동 확장 정책 | 최소 2 · 최대 4, CPU 목표 60% | 최소 3 · 최대 12, CPU 목표 60% |
| 세션 · 글 쓰기 · 조회 | 두 인스턴스에서 같은 세션 통과 | 세 인스턴스에서 같은 세션 통과 |

자동 확장은 정책이 등록된 것을 확인했고, 이 실행에서 부하를 걸어 확장시키지는 않았습니다. large도 DB는 db.t3.micro 하나였습니다. 최대 12태스크까지 늘려 보거나 대표 부하를 건 시험이 아니므로, large가 많은 요청을 처리한다는 근거는 아닙니다. small은 실제 배포 없이 AWS SDK 대역 시험만 했습니다.

두 배포의 소요 시간을 나눠 보면 DB 구성 단계가 대부분을 차지합니다.

{{< chart id="fig-deploy-db-stage" kind="실측" caption="선택 구성 실제 배포의 어댑터 소요 시간(초)과 그중 DB 구성 단계. medium은 662.196초 중 493.659초(74.5%), large는 687.861초 중 537.093초(78.1%)가 DB 구성 단계였습니다. 2026년 10월 9일 서울 리전, 구성마다 1회." source="https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-plan-deployment-connection.md#L40" height="280px" >}}
{
  "grid": {"left": 8, "right": 96, "top": 40, "bottom": 8, "containLabel": true},
  "legend": {"top": 0, "data": ["어댑터 배포 전체", "그중 DB 구성 단계"]},
  "xAxis": {"type": "value", "name": "초", "min": 0, "max": 1000, "interval": 200},
  "yAxis": {"type": "category", "inverse": true, "data": ["medium", "large"]},
  "series": [
    {"name": "어댑터 배포 전체", "type": "bar", "barWidth": 22, "itemStyle": {"color": "#7a8a9b"},
     "label": {"show": true, "position": "right", "formatter": "{c}초"},
     "data": [662.196, 687.861]},
    {"name": "그중 DB 구성 단계", "type": "bar", "barWidth": 22, "itemStyle": {"color": "#087f8b"},
     "label": {"show": true, "position": "right", "formatter": "{c}초"},
     "data": [493.659, 537.093]}
  ]
}
{{< /chart >}}

DB 구성 단계는 두 실행 모두 어댑터 소요의 4분의 3쯤이었습니다(74.5% · 78.1%). 어댑터에서 DB를 다루는 단계는 RDS를 Multi-AZ로 바꾸라고 요청한 뒤 5초마다 조회하며 `available`이 될 때까지 기다리는 단계와, 스키마를 초기화하는 단계입니다([`aws-provider.ts` 79–80 · 201–214행](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/infra/aws/src/aws-provider.ts#L201-L214)). 두 실행 모두 Single-AZ에서 Multi-AZ로 바꾸는 배포였습니다. 태스크가 2개에서 3개로 늘어도 나머지 단계는 오히려 짧았으므로, 배포 시간을 줄이려면 앱 태스크보다 DB 변경을 먼저 봐야 합니다. 다만 구성마다 한 번씩 잰 값이라 단계 시간의 편차는 알 수 없습니다.

## 복구 시간에는 폴링과 API 지연이 들어 있습니다 {#복구-시간에는-무엇이-포함됐는가}

태스크 3개가 서로 다른 AZ에 있다는 것만으로는 장애 뒤에도 세션과 데이터가 남는다고 말할 수 없습니다. 그래서 장애를 직접 일으켰습니다. 시험은 두 곳에서 했고 조건이 다릅니다. 태스크 강제 종료는 위 계획 연결 실행의 large 배포에서, CPU 확장과 RDS 강제 전환은 그보다 앞선 AWS 통합 실험에서 했습니다. 통합 실험은 계획 연결 전의 어댑터 설정(태스크당 0.5 vCPU / 1 GiB, 태스크 2개)에 실험 스크립트가 RDS Multi-AZ와 최대 4개 자동 확장을 붙인 구성이었습니다.

| 시험 | 조건 | 관측 결과 | 읽을 때의 제한 |
|---|---|---|---|
| large 태스크 1개 강제 종료 | [계획 연결 large 실행](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-plan-deployment-connection.md#L96) | 58.69초 뒤 새 태스크를 포함해 정상 3개 · 3 AZ, 기존 세션 · 저장 데이터 확인 | 5초 간격 조회와 AWS 호출 지연 포함, 그동안의 요청 성공률은 재지 않음 |
| CPU 자동 확장 | [AWS 통합 실험](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-aws-full-stack.md#L44), CPU 목표를 1%로 낮춰 확장을 유도 | 목표 · 실행 태스크 2→4, 96.53초에 정상 대상 3개 이상, 이후 4개 정상 | 카탈로그의 60% 목표로 부하를 건 시험이 아님, 축소는 확인 못 함 |
| RDS 강제 AZ 전환 | [AWS 통합 실험](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-aws-full-stack.md#L57-L66) | 2a→2b, 71.57초 뒤 기존 글 조회와 같은 세션의 추가 쓰기 성공 | 실패한 조회 1회와 정상 대상 0개 구간이 있었음 |

태스크를 잃은 뒤에는 3개 AZ의 정상 상태로 돌아왔고, DB가 다른 AZ로 넘어간 뒤에는 같은 로그인 세션으로 기존 데이터를 읽고 새로 쓸 수 있었습니다. 다만 RDS 전환 중에는 요청이 실패한 구간이 있었으므로 무중단 결과는 아닙니다. 58.69초와 71.57초는 장애를 일으킨 API 호출부터 회복을 확인한 조회까지의 경과 시간이라, 실제로 응답하지 않은 시간이나 운영 복구 목표(RTO)와는 다릅니다.

자동 축소는 확인하지 못했습니다. 축소 목표를 50%로 올린 뒤 처음 16분 동안 축소가 일어나지 않았고, 더 지켜보려 했을 때는 이미 정리 단계에서 정책과 서비스 삭제가 시작돼 유효한 재시험이 되지 않았습니다. 정책이 있고 CPU가 낮아졌다는 것만으로 축소가 된다고 쓰지 않았습니다.

포트폴리오 요약(2026-10-15판) 49쪽은 태스크 강제 종료를 「별도 장애 · 확장 시험」 표에 CPU 확장 · RDS 전환과 함께 넣었습니다. 태스크 강제 종료는 계획 연결 large 실행의 결과이고, 나머지 둘만 앞선 통합 실험의 결과입니다.

## 앱 중지는 기반 자원 삭제와 달랐습니다

중지 API는 앱의 ECS 서비스를 내리는 일입니다. RDS · ALB 같은 기반 스택은 남고, 계속 비용이 나갑니다. 배포 중 바꾼 DB 설정도 실패했을 때 자동으로 되돌리지 않습니다. 시험이 끝난 뒤 실험 스택은 따로 삭제했고, `DELETE_COMPLETE` 뒤 ECS · ECR · 로그 · RDS와 스냅샷 · ALB · VPC · Secret · 역할 · 확장 대상 · 알람이 남지 않았음을 따로 조회해 확인했습니다([보고서 108–111행](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-plan-deployment-connection.md#L108-L111)).

120초 · 600초 · 630초는 이 Spring/PostgreSQL 샘플 하나의 기동 · 중지 관측으로 정한 값이라 다른 앱에 그대로 맞는다는 보장이 없습니다. 검증하지 않은 범위도 남았습니다. 배포는 제 AWS 프로필로 실행했으므로 생성된 최소 권한 정책만으로 배포 · 중지가 되는지는 확인하지 않았습니다. 화면에서 시작하는 전체 흐름, 버전 교체 중 데이터 보존, small 실제 배포, 자동 축소, 대표 부하에서의 처리량과 DB 병목도 재지 않았습니다. 변경은 [PR #12](https://github.com/SoftBankHackathon/shakedown/pull/12)에 들어갔고, 2026년 10월 10일 13시 12분(KST)에 리뷰 0건으로 제가 직접 병합했습니다.

배포 기능의 완료를 말하려면 설정이 적용되는 것, 앱이 준비되는 것, 장애 뒤 데이터를 다시 쓸 수 있는 것을 따로 확인해야 했습니다. 비슷한 배포 자동화를 만든다면 대기 한도를 정하기 전에 기동과 중지가 실제로 몇 초 걸리는지부터 재십시오. 한도가 실제보다 짧으면 정상인 앱이 교체되고, 끝난 작업이 실패로 보고됩니다.

## 측정 조건

- 2026년 10월 9일, AWS 서울 리전. 실행은 개발에 쓴 AI가 했고, 배포는 사용자 AWS 프로필로 실행했습니다. 구성마다 1회 실행입니다.
- 계획 연결 실행: FastAPI TestClient → 엔진 이미지 빌드 · ECR → AWS 어댑터 → 실제 AWS 자원, `use_ai=false`. 앱은 Spring/PostgreSQL 샘플 게시판, DB는 두 구성 모두 db.t3.micro입니다. 실험 전체 시간은 medium 1,417초, large 1,595.15초였습니다.
- 복구 시간은 5초 간격 조회와 AWS 호출 지연을 포함합니다([보고서 103–104행](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-plan-deployment-connection.md#L103-L104)).
- AWS 통합 실험: 기존 어댑터 직접 호출, 태스크당 0.5 vCPU / 1 GiB, RDS PostgreSQL 17.6 · db.t3.micro · 20 GiB gp3 · Multi-AZ, JDBC 세션, ALB 고정 세션 끔. 확장은 CPU 목표 1%로 유도했고 축소 관찰은 목표 50%로 올려 했습니다([보고서 38–46행](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-aws-full-stack.md#L38-L46)).
- 코드 인용은 PR #12 병합 커밋 `3ffbcb0`이고, PR 상태는 2026년 11월 12일에 확인했습니다.

## 출처

- [SoftBankHackathon/shakedown 「선택 설계 → AWS 배포 연결 검증」](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-plan-deployment-connection.md) — medium · large 실제 배포, 중지 502와 204, 태스크 강제 종료, 정리
- [SoftBankHackathon/shakedown 「AWS 통합 실험 — 2026-10-09」](https://github.com/SoftBankHackathon/shakedown/blob/8d9b37b4d388100c093467b1e0fb9a6c9946e39a/docs/experiments/2026-10-09-aws-full-stack.md) — ALB 403 · 기동 유예 결함, CPU 확장, RDS 강제 전환, 축소 미확인
- [SoftBankHackathon/shakedown `infra/aws/cloudformation/foundation.yaml`](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/infra/aws/cloudformation/foundation.yaml#L594-L621) — 기본 전달 리스너와 우선순위 1 차단 규칙
- [SoftBankHackathon/shakedown `infra/aws/src/aws-provider.ts`](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/infra/aws/src/aws-provider.ts#L175-L181) — 중지 대기 600초
- [SoftBankHackathon/shakedown `apps/engine/engine/aws_runner.py`](https://github.com/SoftBankHackathon/shakedown/blob/3ffbcb046ea50676e3031e2ff5bd24296e360ef3/apps/engine/engine/aws_runner.py#L102) — 엔진 DELETE 제한 630초
- [SoftBankHackathon/shakedown 커밋 980f399](https://github.com/SoftBankHackathon/shakedown/commit/980f3991ab57a3b63f68c43e2c36adeadd3f76ae) — ALB 대상 연결을 유지한 채 공개 차단
- [SoftBankHackathon/shakedown 커밋 b46f1f9](https://github.com/SoftBankHackathon/shakedown/commit/b46f1f91ffb6c6aa517b4bb7c4e0b30d40d3a821) — 건강 검사 유예 30초 → 120초
- [SoftBankHackathon/shakedown PR #12](https://github.com/SoftBankHackathon/shakedown/pull/12) — AI 아키텍처 판단과 배포 연결(2026-10-10 병합)
- 개인 결정 기록(비공개) — 2026년 10월 9일 예산 승인 · 증액과 large 실험 지시

---

[개발 사례 전체 모음](/posts/0-to-1/portfolio-engineering-notes/) · [같은 판의 포트폴리오 PDF](/portfolio/2026-10-15-v2/full.pdf#page=48)
