---
title: "MediaMTX 인증 기본값은 환경변수 하나에 함께 바뀌었습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-13T23:47:21+09:00"
draft: false
author: "김태윤"
description: "MediaMTX v1.21.0은 기본 인증 사용자 목록을 설정마다 슬라이스 머리만 대입해, 환경변수로 사용자를 바꾸면 비교 기준인 전역 기본값까지 함께 바뀌었고, 같은 기본값을 파일에 적으면 nil과 빈 IPs 차이로 거부했습니다. 두 원인을 함께 고친 PR #6205(v1.21.1)와, v1.15.6 · v1.21.0 · v1.21.1 바이너리와 수정 하나씩만 넣은 트리로 확인한 AI 재측정."
categories: ["open-source-analysis"]
tags: ["MediaMTX", "Go", "오픈소스 기여", "설정", "인증"]
portfolio_cases: [39]
portfolio_pages: [39]
portfolio_edition: "2026-10-15-v2"
---

MediaMTX v1.21.0에 `MTX_AUTHINTERNALUSERS_0_USER=alice`를 주고, 설정 파일에는 `authInternalUsers` 없이 이전 방식의 경로 인증(`readUser` · `readPass`)만 적으면, 서버는 충돌을 거부하지 않고 기동한 뒤 alice를 버립니다. 반대로 함께 배포되는 `mediamtx.yml`에 같은 경로 인증을 더하면, 기본값을 그대로 적은 설정인데도 `authInternalUsers and legacy credentials ... cannot be used together`로 기동을 거부합니다. 2026년 11월 13일 다시 재 보니 v1.21.0은 첫 경우에 기동해 사용자 목록에 alice가 없었고 둘째 경우에 종료 코드 1로 끝났습니다. v1.21.1은 첫 경우를 종료 코드 1로 거부하고 둘째 경우에 기동했습니다. 두 원인을 함께 고친 [PR #6205](https://github.com/bluenviron/mediamtx/pull/6205)는 2026년 9월 20일 병합돼 [v1.21.1](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1)에 들어갔습니다.

범위와 검증 기준, 제출 결정은 제가 했고 구현과 실측은 AI(Claude Code·Codex)가 했습니다. 이 글의 재측정도 AI(Claude Code)가 실행했습니다.

## nil IPs와 빈 IPs를 DeepEqual은 다르게 봤습니다 {#의미가-같은-값이-서로-다른-표현을-가졌다}

MediaMTX의 인증은 사용자 목록 `authInternalUsers`로 정합니다. 그 전에는 경로마다 `publishUser` · `readUser` 같은 필드를 썼고, 지금도 이 이전 필드를 받아 사용자 목록으로 바꿔 줍니다. 단, 사용자가 `authInternalUsers`를 직접 바꿨다면 두 방식을 섞지 못하게 거부합니다. 「직접 바꿨는지」는 불러온 목록을 패키지 변수 `defaultAuthInternalUsers`와 `reflect.DeepEqual`로 비교해 판단합니다([#6205 직전 커밋 `7bdbc965`의 `conf.go` 666행](https://github.com/bluenviron/mediamtx/blob/7bdbc965d5be72fa3b8fcb68ea45813a72d5f578/internal/conf/conf.go#L666)).

기본 목록의 첫 사용자는 IP 제한이 없습니다. 패키지 변수에서는 이 값이 `IPs` 필드를 비워 둔 nil 슬라이스였고, `mediamtx.yml`에는 `ips: []`로 적혀 있어 불러오면 빈 슬라이스가 됩니다. 뜻은 같지만 `reflect.DeepEqual`은 nil 슬라이스와 비어 있는 슬라이스를 같다고 보지 않습니다([Go `reflect.DeepEqual`](https://pkg.go.dev/reflect#DeepEqual)). 그래서 기본값을 그대로 적은 설정도 「직접 바꾼 설정」으로 판정됐습니다.

PR 본문은 이 차이가 v1.16.0의 [`8a4f2f5f`](https://github.com/bluenviron/mediamtx/commit/8a4f2f5f3f216808d9821124a3f151cb79ce7cea)(#5376)에서 생겼다고 적었습니다. 이 커밋은 `[]`를 nil로 바꿔 주던 `IPNetworks.UnmarshalJSON`을 일반 디코딩으로 바꿨고, 바로 앞 [`a4561a83`](https://github.com/bluenviron/mediamtx/commit/a4561a8339035711d803b1b524b9a21906dd0142)(#5375)이 들인 「nil 슬라이스를 빈 슬라이스로 바꾸는 함수」가 슬라이스 원소 안까지 들어가게 했습니다. 둘 중 하나만 있어도 비교가 깨집니다. 바이너리로 확인한 결과도 경계가 같았습니다.

| 입력 | v1.15.6 | v1.21.0 | v1.21.1 |
|---|---|---|---|
| 기본 `mediamtx.yml` + 경로 `cam`의 `readUser` · `readPass` | 기동 | 종료 코드 1 | 기동 |
| 기본 `mediamtx.yml`로 실행 중 `POST /v3/config/paths/add/cam`(같은 이전 인증) | 200 | 400 | 200 |
| 경로 `cam`만 있는 파일 + `MTX_AUTHINTERNALUSERS_0_USER=alice` | 종료 코드 1 | 기동 · alice 없음 | 종료 코드 1 |

위 두 줄은 판마다 그 태그의 `mediamtx.yml`을 썼고, 마지막 줄은 경로 `cam`만 적은 파일입니다. 경우마다 세 번 돌려 매번 같았습니다. 마지막 줄의 원인은 다음 절에 있습니다.

## 기본값을 대입할 때 슬라이스 머리만 복사됐습니다 {#기본값이라는-이름이-불변성을-보장하지-않았다}

`setDefaults()`는 `conf.AuthInternalUsers = defaultAuthInternalUsers`로 기본값을 넣었습니다([`7bdbc965`의 `conf.go` 441행](https://github.com/bluenviron/mediamtx/blob/7bdbc965d5be72fa3b8fcb68ea45813a72d5f578/internal/conf/conf.go#L441)). Go에서 슬라이스를 대입하면 원소를 담은 저장 공간을 가리키는 머리(주소 · 길이 · 용량)만 복사됩니다. 그래서 불러온 설정의 사용자 목록과 전역 기본값이 같은 원소를 가리켰습니다. 기본값을 패키지 변수로 옮긴 것은 비교를 위해 이 검사를 들인 [`9554fc4b`](https://github.com/bluenviron/mediamtx/commit/9554fc4ba0402a885f1089984a111ad662d04220)(#3460, v1.8.3)였습니다.

설정을 불러오는 순서는 [[fig-auth-load-order]]와 같습니다. 환경변수 단계가 첫 사용자를 alice로 바꾸면 공유된 원소가 바뀌어 전역 기본값도 alice가 됩니다. 그 뒤 비교는 같은 원소끼리 견주므로 항상 「같음」이고, 이전 필드에서 만든 목록이 alice를 덮어씁니다.

```mermaid {#fig-auth-load-order kind="재구성" caption="#6205 직전 커밋 7bdbc965의 conf.Load(541–564행)와 Validate(666행). 청록 단계가 전역 기본값과 저장 공간을 공유한 채 지나는 곳입니다. 파일에 authInternalUsers가 없으면 환경변수 단계가 전역 기본값까지 바꿔 비교가 같음이 되고, 파일에 기본값을 적으면 IPs의 nil과 빈 슬라이스 차이로 다름이 됩니다." source="https://github.com/bluenviron/mediamtx/blob/7bdbc965d5be72fa3b8fcb68ea45813a72d5f578/internal/conf/conf.go#L541-L564"}
flowchart TB
  accTitle: conf.Load가 인증 사용자 목록을 만들고 비교하는 순서
  accDescr: setDefaults가 전역 기본값을 대입하고, 설정 파일을 읽고, MTX 환경변수를 적용하고, nil 슬라이스를 빈 슬라이스로 바꾼 뒤 Validate가 이전 인증 필드가 있으면 목록을 전역 기본값과 DeepEqual로 비교한다. 같으면 이전 필드에서 만든 목록으로 바꾸고, 다르면 충돌 오류로 거부한다.
  a["setDefaults<br/>목록 = 전역 기본값"] --> b["설정 파일 읽기"]
  b --> c["환경변수 MTX_* 적용"]
  c --> d["nil 슬라이스를<br/>빈 슬라이스로"]
  d --> e{"이전 인증 필드와<br/>DeepEqual(목록, 전역 기본값)"}
  e -->|같음| f["이전 필드에서 만든<br/>목록으로 교체"]
  e -->|다름| g["충돌 오류 · 기동 거부"]
  style c fill:#0a0c08,stroke:#0a0c07,stroke-width:3px
```

[[fig-shared-default-alias]]의 위 줄이 v1.21.0, 아래 줄이 v1.21.1입니다. 위 줄에서는 환경변수 하나가 두 쪽을 함께 바꾸고, 아래 줄에서는 복사본만 바뀝니다.

{{< motion scene="SharedDefaultAlias" id="fig-shared-default-alias" kind="개념도" caption="v1.21.0에서는 전역 기본값과 불러온 설정이 같은 저장 공간을 가리켜, 환경변수 alice가 둘을 함께 바꾸고 비교가 같음이 된 뒤 이전 인증 목록이 alice를 덮어씁니다. v1.21.1은 deepClone으로 저장 공간을 나눠 설정 쪽만 바뀌고, 비교가 다름이 돼 기동을 거부합니다." >}}

v1.15.6은 같은 입력을 거부했습니다. 기본값을 공유하는 대입은 v1.8.3부터 있었지만, 환경변수 단계가 공유된 원소를 직접 고치게 된 시점은 이 글에서 좁히지 않았습니다.

공유는 동시 접근에서도 드러납니다. 실행 중인 MediaMTX는 설정을 다시 읽을 때 `conf.Load()`를 부르고, 그동안 인증 관리자는 그 전에 불러온 목록을 읽습니다. 측정용 시험(한 고루틴이 `conf.Load("")`를 200번, 다른 쪽이 그 전에 만든 `auth.Manager`로 `Authenticate`를 2,000번)을 `-race`로 돌리면, 수정 전 트리 `7bdbc965`에서 매번 DATA RACE가 2건 보고됐습니다. 쓰기는 환경변수 적용(`env.go` 265행), 읽기는 권한 확인(`manager.go` 38행)이었습니다. 병합 커밋 `4906684c`에서는 0건이었습니다. 두 트리 모두 2,000번 인증 중 거부는 0번이었습니다. 같은 값을 다시 쓰는 경쟁이라 잘못된 인증 판단은 관측되지 않았고, PR 본문도 그렇게 적었습니다.

## 한쪽만 고치면 시험이 수정 없이도 통과했습니다 {#두-수정-중-하나만-선택할-수-없었던-이유}

#6205는 두 줄을 바꿨습니다. 전역 기본값의 첫 사용자에 `IPs: IPNetworks{}`를 적어 불러온 값과 같은 모양으로 두고([`4906684c`의 `conf.go` 212행](https://github.com/bluenviron/mediamtx/blob/4906684c47aaf32763d67a6109c73113e83e84ef/internal/conf/conf.go#L212)), 대입을 `deepClone`으로 바꿨습니다([444행](https://github.com/bluenviron/mediamtx/blob/4906684c47aaf32763d67a6109c73113e83e84ef/internal/conf/conf.go#L444)). `deepClone`은 `Conf.Clone()`([615행](https://github.com/bluenviron/mediamtx/blob/4906684c47aaf32763d67a6109c73113e83e84ef/internal/conf/conf.go#L615))과 `Path.Clone()`([`path.go` 443행](https://github.com/bluenviron/mediamtx/blob/4906684c47aaf32763d67a6109c73113e83e84ef/internal/conf/path.go#L443))이 이미 쓰던 함수입니다.

하나만 고치면 어떻게 되는지 직접 돌려 봤습니다. 병합 커밋의 시험 파일을 직전 트리 `7bdbc965`, 그 트리에 `IPs`만 고친 판, `deepClone`만 넣은 판, 병합 커밋에 넣고, 시험마다 따로 `go test` 프로세스를 띄워 3번씩 돌렸습니다. 세 번 모두 같았습니다.

| 시험 | 수정 전 | `IPs`만 | `deepClone`만 | 둘 다(병합) |
|---|---|---|---|---|
| `TestConfDeprecatedAuth`(기존) | 통과 | 통과 | 실패 | 통과 |
| `TestDefaultAuthInternalUsersIsNormalized` | 통과 | 통과 | 실패 | 통과 |
| `TestConfDeprecatedAuthWithExplicitDefaults` | 통과 | 통과 | 실패 | 통과 |
| `TestConfDefaultsAreNotShared` | 실패 | 실패 | 통과 | 통과 |
| `TestConfDeprecatedAuthWithEnvUser` | 실패 | 실패 | 통과 | 통과 |

`deepClone`만 넣으면 전역 기본값이 nil `IPs`로 남아, 이전 인증만 쓰는 평범한 설정까지 거부합니다(기존 시험 실패). `IPs`만 고치면 공유가 남아 환경변수 시험이 실패합니다. 눈여겨볼 것은 첫 열입니다. 수정 전 트리에서도 정규화 시험과 명시적 기본값 시험이 통과했습니다. 같은 프로세스 안에서 먼저 돈 `Load()`가 공유된 전역 기본값의 `IPs`를 빈 슬라이스로 바꿔 놓기 때문입니다. 공유가 남아 있는 한 정규화를 검증하는 시험은 수정을 되돌려도 통과할 수 있었고, 그래서 두 수정을 한 PR로 묶었습니다.

순서도 결과를 바꿨습니다. 수정 전 트리에서 시험 다섯 개를 한 프로세스로 돌리면 명시적 기본값 시험도 실패했습니다. 먼저 돈 환경변수 시험이 전역 기본값의 첫 사용자 이름을 바꿔 둔 채로 끝났기 때문입니다. 병합 커밋에서는 함께 돌려도, 따로 돌려도 모두 통과했습니다.

## 허용할 조합과 거부할 조합을 함께 시험했습니다 {#허용해야-할-조합과-거부해야-할-조합을-함께-검증했다}

추가한 시험 4개는 원인 두 개를 양쪽 방향에서 막습니다([`4906684c`의 `conf_test.go`](https://github.com/bluenviron/mediamtx/blob/4906684c47aaf32763d67a6109c73113e83e84ef/internal/conf/conf_test.go)).

| 시험 | 지키는 것 |
|---|---|
| `TestDefaultAuthInternalUsersIsNormalized` | 불러온 기본값과 전역 기본값의 모양이 같음 |
| `TestConfDeprecatedAuthWithExplicitDefaults` | 기본값을 그대로 적고 이전 인증을 더한 설정은 허용 |
| `TestConfDefaultsAreNotShared` | 불러온 설정을 바꿔도 다른 설정과 전역 기본값은 그대로 |
| `TestConfDeprecatedAuthWithEnvUser` | 환경변수로 바꾼 사용자와 이전 인증의 조합은 거부 |

「기동한다」만 확인하면 거부해야 할 조합이 느슨해졌는지 놓칩니다. 그래서 허용 쪽 시험과 거부 쪽 시험을 짝으로 두었습니다. 위 단독 실행 표에서 수정 하나만 넣은 판이 어느 한쪽 시험에서 반드시 실패하는 것이 그 짝의 역할입니다.

## 환경변수와 이전 인증을 함께 쓰던 설정은 v1.21.1부터 거부됩니다 {#비교하기-전에-소유권을-확인해야-했다}

첫 표의 마지막 줄처럼, v1.21.0에서 환경변수로 사용자 목록을 바꾸고 이전 인증 필드를 함께 쓰던 설정은 v1.21.1부터 기동하지 않습니다. 그전에는 기동했지만 환경변수로 넣은 사용자가 조용히 버려졌습니다. 그 입력을 명시적인 오류로 바꾼 호환성 변화이고, #3460이 처음 의도한 동작이기도 합니다. PR 본문에 이 영향을 적었고, 유지보수자 aler9가 9월 20일 병합했습니다.

인증 우회를 확인한 것은 아닙니다. 확인한 것은 비교 결과가 틀렸다는 것, 그리고 기본값이 설정 사이에서 공유됐다는 것입니다. 「기본값과 같은가」를 묻는 비교라면, 비교하기 전에 두 값의 모양이 같은 규칙으로 정규화됐는지와 비교 기준이 다른 코드에서 바뀔 수 없는지를 먼저 확인하십시오. 둘 중 하나라도 어긋나면 비교 함수는 맞아도 결과는 틀립니다.

## 측정 조건

- 수행: AI(Claude Code)가 2026년 11월 13일 KST에 실행했습니다. 시험은 23:04:34–23:07:52(단독 실행 23:05:57–23:06:54, `-race` 23:07:13–23:07:52), 바이너리 측정은 23:08:44–23:10:33입니다. load average(1분)는 23:04:34에 11.41, 23:07:13에 11.24, 23:10:33에 5.07이었습니다. 같은 기계에서 다른 세션의 작업과 이 묶음의 다른 측정이 함께 돌았습니다. 이 측정은 통과 여부 · 기동 여부 · 건수만 셉니다.
- 기종: MacBook Air(Apple M5, 고성능 4·효율 6코어, 32GB, 팬 없음), macOS 27.0.1. Linux에서는 돌리지 않았습니다.
- 시험 트리: `7bdbc965`(#6205 병합 직전, `4906684c`의 `conf_test.go`를 옮겨 넣음), 같은 트리에 `IPs` 줄만 넣은 판과 `deepClone` 줄만 넣은 판(두 패치는 원자료에 있음), `4906684c`. Go 1.27.2 darwin/arm64, `go test -count=1 ./internal/conf`. 다섯 시험을 한 프로세스로 3번, 시험마다 따로 3번, `TestDefaultAuthInternalUsersIsNormalized` 단독 3번.
- `-race`: 측정용 시험 `TestMeasureLoadWhileAuthenticate`(원자료의 `race_measure_test.go`, MediaMTX에 없는 파일)를 `internal/conf`에 넣고 `go test -race -count=1`을 트리마다 3번. `WARNING: DATA RACE` 줄 수를 셌습니다.
- 바이너리: [v1.15.6](https://github.com/bluenviron/mediamtx/tree/v1.15.6)(`62effa79`), [v1.21.0](https://github.com/bluenviron/mediamtx/tree/v1.21.0)(`2c672790`), [v1.21.1](https://github.com/bluenviron/mediamtx/tree/v1.21.1)(`04825598`)을 `go build`. 각 태그의 `mediamtx.yml`에서 미디어 서버를 모두 끄고 API만 127.0.0.1:29997로 켰습니다. 기동 여부는 4초 뒤에도 프로세스가 살아 있는지, 사용자 목록은 `GET /v3/config/global/get`의 `authInternalUsers`. 경우마다 3번.
- 원자료: 스크립트 · 패치 · 설정 · 서버 로그 · 시험 출력 · 요약은 [저장소 `_workspace/blog/mediamtx-auth-defaults-normalization-and-clone/measure/`](https://github.com/xodbs1021/xodbs1021.github.io/tree/main/_workspace/blog/mediamtx-auth-defaults-normalization-and-clone/measure)에 있습니다.

## 출처

- [bluenviron/mediamtx PR #6205 「conf: fix comparison and sharing of the default authInternalUsers」](https://github.com/bluenviron/mediamtx/pull/6205) — 본문의 원인 · 재현 · 영향, 2026-09-20 병합, 병합 커밋 [4906684c](https://github.com/bluenviron/mediamtx/commit/4906684c47aaf32763d67a6109c73113e83e84ef)
- [`7bdbc965`의 `internal/conf/conf.go`](https://github.com/bluenviron/mediamtx/blob/7bdbc965d5be72fa3b8fcb68ea45813a72d5f578/internal/conf/conf.go#L541-L564) · [`4906684c`의 `conf.go`](https://github.com/bluenviron/mediamtx/blob/4906684c47aaf32763d67a6109c73113e83e84ef/internal/conf/conf.go#L444) · [`conf_test.go`](https://github.com/bluenviron/mediamtx/blob/4906684c47aaf32763d67a6109c73113e83e84ef/internal/conf/conf_test.go)
- [커밋 8a4f2f5f(#5376)](https://github.com/bluenviron/mediamtx/commit/8a4f2f5f3f216808d9821124a3f151cb79ce7cea) · [a4561a83(#5375)](https://github.com/bluenviron/mediamtx/commit/a4561a8339035711d803b1b524b9a21906dd0142) — v1.16.0 · [9554fc4b(#3460)](https://github.com/bluenviron/mediamtx/commit/9554fc4ba0402a885f1089984a111ad662d04220) — v1.8.3
- [Go `reflect.DeepEqual`](https://pkg.go.dev/reflect#DeepEqual) — nil 슬라이스와 빈 슬라이스는 같지 않음
- [MediaMTX v1.21.1](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.1) · [v1.21.0](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.0) · [v1.15.6](https://github.com/bluenviron/mediamtx/releases/tag/v1.15.6) 릴리스

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 39쪽](/portfolio/2026-10-15-v2/full.pdf#page=39)
