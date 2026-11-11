---
title: "테스트 파일을 빼도 통과하던 CI를 커버리지 게이트로 막았습니다"
date: "2026-10-15T11:40:52+09:00"
lastmod: "2026-11-12T05:01:54+09:00"
draft: false
author: "김태윤"
description: "PokeClip 미디어 CI에서 테스트 파일 하나를 빼도 9개 패키지 테스트가 모두 ok였던 문제를, 원시 커버리지 프로파일을 정수쌍으로 판정하는 80% 게이트로 막은 기록. 2026년 8월 18일 실제 Actions 세 번(index 81.8% → 52.3% → 81.8%), 10월 6일 합성 프로파일 10종 재검증, 그리고 게이트가 병합을 막지 않는 지금의 보호 설정까지."
categories: ["0-to-1"]
tags: ["PokeClip", "Go", "커버리지", "CI"]
portfolio_cases: [35]
portfolio_pages: [35]
portfolio_edition: "2026-10-15-v2"
---

PokeClip 미디어 CI는 테스트 파일 하나가 빠져도 초록불이었습니다. 2026년 8월 18일 실제 GitHub Actions에서 `upload_store_test.go` 맨 위에 빌드 제외 표식을 넣자, 테스트 스텝이 돌린 9개 패키지는 모두 `ok`였습니다. 같은 실행에서 `index` 패키지의 실행된 문장은 72/88(81.8%)에서 46/88(52.3%)로 줄었습니다. 그래서 핵심 패키지마다 80% 기준을 두는 커버리지 게이트를 테스트와 다른 스텝에 넣었고, 이 실행에서는 게이트만 실패했습니다. 임시 커밋을 걷어내고 다시 돌리자 81.8%와 통과로 돌아왔습니다.

80% 기준은 제가 80과 100을 놓고 논의한 뒤 정했습니다. `index`·`upload`·`indexer` 세 패키지에 각각 기준을 두는 것과 「테스트를 빼서 게이트가 실패하는지 확인한다」는 것은 작업 티켓의 완료 조건이었습니다. 구현, PR 작성, Actions 실증은 AI(Claude Code)가 했고, 계획과 코드 검토는 Claude Code와 Codex가 했습니다. [PR #77](https://github.com/3K-PokeClip/PokeClip-mono/pull/77)은 제 승인 뒤 8월 18일 11시 7분(한국 시각)에 병합됐습니다.

## 화면의 80.0%는 79.99%일 수 있어 정수쌍으로 판정했습니다 {#표시용-백분율을-판정에-쓰지-않았다}

`go test -cover`가 찍는 `coverage: 80.0%`는 소수점 한 자리로 반올림한 값입니다. 실제로 79.99%여도 화면에는 80.0%로 나옵니다. 이 줄을 읽어 「80.0 이상이면 통과」로 판정하면 80% 미만이 통과합니다.

게이트는 요약 줄 대신 원시 프로파일 `cover.out`을 읽습니다. 이 파일에는 코드 블록마다 문장 수와 실행 횟수가 적혀 있습니다. 게이트는 패키지별로 실행된 문장 수(covered)와 전체 문장 수(total)를 더한 뒤 `covered × 100 < total × 80`이면 실패로 판정합니다. 정수끼리 곱해서 비교하므로 반올림이 끼어들 자리가 없습니다. 정확히 80%는 통과, 79.9%와 79.99%는 실패입니다. 판정은 워크플로 안의 짧은 awk 스크립트로 두었습니다([당시 `media-ci.yml` 136–154행](https://github.com/3K-PokeClip/PokeClip-mono/blob/aa625a31b2727afadb7fc8fd150f7828b463fc15/.github/workflows/media-ci.yml#L136-L154)).

집계에는 함정이 두 개 있었습니다.

- `-race`를 켜면 커버리지 모드가 자동으로 `atomic`이 됩니다([Go 테스트 플래그 문서](https://pkg.go.dev/cmd/go#hdr-Testing_flags)). 이 모드에서는 실행 횟수가 1이 아니라 6, 12 같은 값으로 찍힙니다. 그래서 「실행 횟수가 1인 블록」이 아니라 「0보다 큰 블록」을 실행된 블록으로 셉니다.
- `index`를 문자열로 찾으면 `indexer` 줄까지 함께 셉니다. 경로에서 디렉터리를 잘라 정확한 키로 패키지를 나눴습니다.

## 테스트 파일 하나를 빼자 테스트는 통과하고 게이트만 실패했습니다 {#실제-actions에서-실패를-만들고-되돌렸다}

통과하는 실행만 보면 게이트가 실제로 잡을 빨갛게 만드는지 알 수 없습니다. 그래서 같은 PR 브랜치에 임시 커밋 `ce8a77f`를 올렸습니다. 이 커밋은 `media/internal/index/upload_store_test.go` 맨 위에 `//go:build ignore`와 빈 줄, 두 줄만 더해 그 파일을 빌드에서 뺍니다. 이 파일은 PostgreSQL 통합 테스트 파일이고 `upload_store.go`를 사실상 혼자 덮습니다([PR #77 본문](https://github.com/3K-PokeClip/PokeClip-mono/pull/77)).

영상은 그날 실제로 돈 세 실행입니다. 세 번 모두 9개 패키지 테스트가 `ok`인데, `index` 막대가 점선 아래로 내려간 둘째 실행에서만 게이트가 빨개지는 것을 보십시오.

{{< motion scene="CoverageGateRuns" id="fig-coverage-gate-runs" kind="재구성" caption="2026년 8월 18일 PR #77에서 돈 Actions 세 실행. 테스트 스텝 하나가 돌린 9개 패키지 테스트는 세 번 모두 ok였고, index 커버리지는 81.8% → 52.3% → 81.8%로 움직여 80% 아래로 내려간 둘째 실행에서만 커버리지 게이트가 실패했습니다. 값은 실행 로그의 게이트 출력이고, 움직임의 시간 간격은 실제와 다릅니다." >}}

| 실제 CI 실행 | 커밋 | 9개 패키지 테스트 | 커버리지 게이트 |
|---|---|---|---|
| [정상](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089173930) | `aa625a3` | 모두 ok | 통과 |
| [테스트 파일 하나 제외](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089415103) | `ce8a77f` | 모두 ok | 실패(종료 코드 1) |
| [임시 커밋 제거 후 재실행](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089609771) | `aa625a3` | 모두 ok | 통과 |

셋째 실행은 테스트 파일을 다시 고친 커밋이 아닙니다. 임시 커밋을 `--force-with-lease`로 걷어낸 뒤, 정상 실행과 같은 커밋 `aa625a3`을 다시 돌린 것입니다. 그래서 최종 변경에는 제외 표식이 남지 않았습니다.

[[fig-coverage-by-run]]은 세 실행에서 게이트 대상 세 패키지의 커버리지입니다. `index`만 움직였고 나머지 둘은 세 번 모두 같았다는 것을 보십시오.

{{< chart id="fig-coverage-by-run" kind="실측" caption="세 실행의 게이트 대상 패키지별 커버리지(%)와 80% 기준선. index만 81.8% → 52.3% → 81.8%로 움직였고, upload 95.1%(527/554)와 indexer 90.2%(523/580)는 세 번 모두 같았습니다. 값은 각 실행 로그의 게이트 출력입니다." source="https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089415103" height="340px" >}}
{"grid":{"left":8,"right":56,"top":52,"bottom":8,"containLabel":true},"legend":{"top":0,"data":["index","upload","indexer"]},"xAxis":{"type":"category","data":["① 정상","② 테스트 파일 제외","③ 제거 후 재실행"]},"yAxis":{"type":"value","name":"%","min":0,"max":100,"interval":20},"series":[{"name":"index","type":"bar","itemStyle":{"color":"#087f8b"},"label":{"show":true,"position":"top","formatter":"{c}"},"markLine":{"symbol":"none","silent":true,"lineStyle":{"color":"#172c40","type":"dashed","width":2},"label":{"formatter":"80%","position":"end"},"data":[{"yAxis":80}]},"data":[81.8,{"value":52.3,"itemStyle":{"color":"#b42318"}},81.8]},{"name":"upload","type":"bar","itemStyle":{"color":"#7a8a9b"},"label":{"show":true,"position":"top","formatter":"{c}"},"data":[95.1,95.1,95.1]},{"name":"indexer","type":"bar","itemStyle":{"color":"#172c40"},"label":{"show":true,"position":"top","formatter":"{c}"},"data":[90.2,90.2,90.2]}]}
{{< /chart >}}

바뀐 것은 테스트 파일 맨 위 두 줄뿐이었고 다른 게이트 대상의 값은 그대로였습니다. 그래서 둘째 실행의 빨간불은 빌드 실패나 다른 패키지의 변화가 아니라 `index` 커버리지 하락 때문입니다. 52.3%에서 81.8%로 돌아온 것은 제품 커버리지가 좋아졌다는 뜻이 아닙니다. 게이트가 빠진 테스트를 잡고, 되돌리면 다시 통과한다는 기록입니다.

## 게이트를 테스트와 다른 스텝에 둬 테스트 실패를 덮지 않게 했습니다 {#테스트의-실패를-게이트-성공이-덮지-않게-했다}

Go는 테스트가 실패해도 커버리지 프로파일을 씁니다. 테스트와 게이트를 한 스텝에 합치면, 테스트가 실패했는데 게이트의 성공 종료 코드가 스텝의 결과가 되어 초록불이 될 수 있습니다. 그래서 게이트를 별도 스텝으로 뒀습니다. GitHub Actions는 앞 스텝이 실패하면 뒤 스텝을 돌리지 않으므로, 테스트가 실패하는 순간 게이트는 실행되지 않고 잡은 실패로 끝납니다. 이 순서를 지키려고 게이트 스텝에 `if: always()`를 붙이지 말라는 주석을 코드에 남겼습니다([지금 `media-ci.yml` 168–172행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L168-L172)).

측정할 자료가 없는 경우도 실패로 처리합니다. 게이트 대상 패키지가 프로파일에 없거나, 파일에 헤더 한 줄만 있거나, 파일 자체가 없으면 통과시키지 않습니다. 「실패한 패키지 0개」와 「잴 패키지가 0개」를 같게 보면, 핵심 테스트가 통째로 안 돌았을 때 게이트가 초록불을 냅니다.

## 10월 6일 합성 프로파일 10종으로 경계값을 다시 확인했습니다

실제 Actions 대조는 배선을 확인합니다. 테스트가 빠지면 실패 신호가 잡까지 전달되는지입니다. 판정식이 경계값과 빈 입력을 맞게 처리하는지는 따로 봐야 했습니다. 2026년 10월 6일 포트폴리오를 정리하면서 AI가 PR #77 당시의 awk 게이트를 워크플로에서 그대로 떼어 내 합성 프로파일 10종을 넣었습니다. 당시의 원시 `cover.out`이 남아 있지 않아 입력은 모두 손으로 만든 프로파일입니다. Go 테스트나 Actions를 다시 돌린 것이 아닙니다.

| 합성 입력 | 판정 | 종료 코드 |
|---|---|---:|
| 정확히 80%(4/5) | 통과 | 0 |
| 79.9%(799/1000) | 실패 | 1 |
| 79.99%(7999/10000), 화면에는 80.0% | 실패 | 1 |
| `index` 0/10과 `indexer` 100/100 | `index`만 실패, 접두사 섞임 없음 | 1 |
| atomic 모드, 실행 횟수 7인 블록 | 실행된 블록으로 셈, 통과 | 0 |
| 필수 패키지 `index` 없음 | 실패 | 1 |
| 헤더 한 줄만 있는 파일 | 세 패키지 모두 실패 | 1 |
| 파일 없음 | 읽기 실패 | 2 |
| 당시 정상 실행의 정수쌍 재구성 | 통과(81.8·95.1·90.2) | 0 |
| 당시 제외 실행의 정수쌍 재구성 | `index` 52.3%로 실패 | 1 |

10종 모두 기대한 판정과 종료 코드가 나왔습니다. 파일이 없을 때는 awk가 파일을 열지 못해 종료 코드 2로 끝나고, 스텝은 실패합니다. 이 재검증의 원자료는 비공개 기록입니다.

## 80% 게이트는 병합을 막지도, 테스트 품질을 보장하지도 않습니다 {#커버리지-기준이-보장하지-않는-것}

커버리지는 그 줄이 실행됐는지만 셉니다. 실행된 줄에 맞는 단언이 있는지는 알려 주지 않습니다. 게이트가 막는 것은 핵심 패키지의 실행 범위가 정한 선 아래로 떨어지는 일입니다. 여유도 크지 않았습니다. `index`는 88문장 중 71문장 이상이 실행돼야 통과하므로, 당시 72문장에서 두 문장만 빠져도 실패합니다(PR #77 본문의 알려진 제약).

게이트가 빨개져도 병합은 막히지 않았습니다. PR #77을 병합할 때 main에는 브랜치 보호가 없어서, 잡이 실패해도 병합 버튼은 눌렸습니다. 그 뒤 media-ci의 `media-gate`가 필수 체크였던 기간이 있었지만, 2026년 9월 4일 [PR #163](https://github.com/3K-PokeClip/PokeClip-mono/pull/163) 이후 media-ci는 필수 체크가 아닙니다. 11월 12일 GitHub API로 본 보호 설정에서 main의 필수 체크는 `main-source-gate` 하나이고 develop에는 필수 체크가 없습니다. 지금 이 게이트의 실패는 병합을 승인하는 사람이 보고 판단하는 빨간불입니다. 그 결정과 대가는 [미디어 CI 경로 필터 글](/posts/0-to-1/media-ci-path-filter-required-check-tradeoff/)에 있습니다.

게이트 대상은 그 뒤 늘었습니다. 2026년 11월 12일 develop에서는 `index`·`upload`·`indexer`를 포함한 19개 패키지가 같은 80% 기준을 받습니다([`media-ci.yml` 199–210행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L199-L210)).

품질 검사를 새로 넣는다면 통과하는 실행만 보지 마십시오. 반드시 실패해야 하는 입력을 하나 만들어 실제 CI에서 빨간불이 켜지는지, 되돌리면 꺼지는지까지 확인해야 검사가 배선까지 살아 있다고 말할 수 있습니다.

## 측정 조건

- 8월 18일 Actions 세 실행: PR #77 브랜치의 `pull_request` 이벤트, GitHub 호스팅 러너 `ubuntu-latest`와 PostgreSQL 17 서비스 컨테이너, 테스트 스텝 `go test -race -count=1 -timeout 20m -coverprofile=cover.out ./...`(9개 패키지), 실행마다 1회. 값은 각 실행 로그의 게이트 출력입니다. AI(Claude Code)가 실행했고 기록은 공개돼 있습니다.
- 10월 6일 합성 재검증: PR #77 당시(`aa625a3`)의 awk 게이트, 손으로 만든 프로파일 10종, 각 1회. AI가 수행했고 원자료는 비공개입니다.
- 코드 인용은 PokeClip-mono develop `2fc2323c`(2026년 11월 12일)와 PR #77 당시 커밋 `aa625a3` 기준입니다. 브랜치 보호는 2026년 11월 12일 GitHub API로 확인했습니다.

포트폴리오 요약(2026-10-15판) 35쪽은 「핵심 패키지별 80% 기준」과 테스트 제외·복원 대조를 「내가 정한 검사 기준」으로 적었습니다. 제가 정한 것은 80%라는 값이고, 세 패키지와 테스트를 빼서 실패를 확인하는 대조는 작업 티켓의 완료 조건이었습니다. 「핵심 패키지별」은 당시의 세 패키지 기준이며 지금은 19개 패키지입니다.

## 출처

- [3K-PokeClip/PokeClip-mono PR #77](https://github.com/3K-PokeClip/PokeClip-mono/pull/77) — 패키지별 커버리지 게이트(2026-08-18 병합)
- GitHub Actions 실행 기록 — [정상](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089173930) · [테스트 파일 하나 제외](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089415103) · [임시 커밋 제거 후 재실행](https://github.com/3K-PokeClip/PokeClip-mono/actions/runs/32089609771)
- [PR #77 당시 `media-ci.yml` 136–154행](https://github.com/3K-PokeClip/PokeClip-mono/blob/aa625a31b2727afadb7fc8fd150f7828b463fc15/.github/workflows/media-ci.yml#L136-L154) — 테스트와 다른 스텝의 awk 게이트
- [지금 `media-ci.yml` 168–172행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L168-L172) · [199–210행](https://github.com/3K-PokeClip/PokeClip-mono/blob/2fc2323cbd84a683e935bfdf9f0171febf276535/.github/workflows/media-ci.yml#L199-L210) — 스텝 분리 주석과 19개 패키지 게이트
- [Go `cmd/go` 테스트 플래그](https://pkg.go.dev/cmd/go#hdr-Testing_flags) — `-race`와 `-covermode=atomic`
- [3K-PokeClip/PokeClip-mono PR #163](https://github.com/3K-PokeClip/PokeClip-mono/pull/163) · [미디어 CI를 경로 필터로 좁히자 필수 체크를 포기해야 했습니다](/posts/0-to-1/media-ci-path-filter-required-check-tradeoff/)
- 팀 내부 실험 기록(비공개) — 10월 6일 합성 프로파일 재검증

---

[전체 기술 기록으로 돌아가기](/posts/0-to-1/portfolio-engineering-notes/) · [이 글의 포트폴리오 요약 PDF 35쪽](/portfolio/2026-10-15-v2/full.pdf#page=35)
