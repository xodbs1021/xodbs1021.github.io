# 실측 요약 — 사이드카는 4초 조각마다 HLS 되감기 목록을 이렇게 만듭니다

모두 공개 재측정이다. 원자료는 `measure/raw/`, 명령은 `measure/run.sh`.

## 환경

- 2026-11-18 05:06–05:08 KST, AI(Claude Code)가 실행.
- MacBook Air(Apple M5), macOS 27.0.1, Go 1.27.2 darwin/arm64(`raw/env.txt`).
- OrbStack Docker Engine 29.8.2, `postgres:17` = PostgreSQL 17.10(`raw/env-pg.txt`, 다이제스트 포함), 컨테이너 라벨 `com.techblog.bench=dvr2`, 데이터 tmpfs.
- 3K-PokeClip/PokeClip-mono develop `627fb5a20ecb9d221fcc030c26adcbbcbe12c04e`의 `media/`를 `git archive`로 /tmp 에 풀었다.

## 저장소 시험

| 실행 | 결과 | 원자료 |
|---|---|---|
| PG 없이 `-race` · boundary(12) · rewind(71) · cache(62) · publish(316) · finalize(5) | 모두 ok | `unit-rewind.txt` · `test-counts.txt`(재측정 시험 1개씩 포함한 수) |
| PG 없이 `-race` · `cmd/segment-indexer` 사다리 · 봉인 · L3 · 감시 · 엣지 보고 | 58 PASS · 5 SKIP(PG) | `unit-loop-ladder.txt` |
| PG 17.10 · `-p 1` · cache · publish 전체 | ok · ok | `pg-rewind.txt` |
| PG 17.10 · publish + cmd/segment-indexer 의 `Gap|StallSeal|Seal|Ladder|Freeze|Endlist` | 159 PASS · 0 FAIL(재측정 시험 1개는 SKIP) | `pg-gap-seal.txt` |

## 목록 크기(`raw/size.txt`)

`rewind.Render` · 4초 × 900조각 · 도메인 `https://media.example.com` · 회차 ID = 세션 ID 꼴 `S-YYYYMMDD-HHMMSS-{stream}-{seq}` · 첫 번호 100000.

| 경우 | 원본 B | gzip -6 B | gzip -9 B | 512KiB 대비 | 조각당 B | Validate |
|---|---|---|---|---|---|---|
| 회차 꼴 · 스트림 8자 · 판 2 · GAP 1 | 137,945 | 5,445 | 5,029 | 26.3% | 153.3 | 통과 |
| 회차 꼴 · 16자 · 판 2 | 152,350 | 5,509 | 5,055 | 29.1% | 169.3 | 통과 |
| 회차 꼴 · 32자 · 판 2 | 181,182 | 5,623 | 5,173 | 34.6% | 201.3 | 통과 |
| 회차 꼴 · 8자 · 판 2 · 길이 ±30ms(결정적 LCG) | 137,934 | 9,528 | 8,756 | 26.3% | 153.3 | 통과 |
| 옛 꼴 · 8자 · 판 없음 | 107,309 | 5,394 | 4,901 | 20.5% | 119.2 | 통과 |

- 상한 512KiB(524,288B)는 1시간을 1.05초 조각(3,429개, 8자) · 1.38초 조각(2,609개, 32자)으로 채울 때 처음 넘었고, 두 판 모두 S5 `ErrBodyTooLarge`.
- 저장소 골든 `g6_f2.m3u8`(옛 꼴 키 · 900조각) 106,499B, gzip -6 5,721B.
- 설계의 어림(원본 약 90KB · gzip 약 10KB, 「실측 필요」)을 바꾼다: 옛 꼴 키 105KiB, 지금의 회차 꼴 키 135–177KiB. gzip 은 규칙적인 합성 목록에서 5.3–5.5KiB, 길이를 흔들면 9.3KiB — 운영 목록의 gzip 은 재지 않았다.
- `sample-stream01.m3u8` 은 첫 경우의 본문 전체(예시 도메인 · 지어낸 이름)다.

## 사다리 시간표(`raw/ladder.txt`)

`evaluateLadder`(순수 판정) · 기본 설계값 · 저장소 픽스처(4초 조각 0–10, 머리 5, k = 6) · 가짜 시각 10ms 간격 · 0–12초. t=0 은 마지막 발행 성공(PDT(6) + delta), delta 는 설명용 가정 1.0초(A′ 만 0.3초). GAP 틱이나 봉인이 서면 그 장면을 끝낸다.

| 장면 | 일 | stallAge | holdAge | 신호 |
|---|---|---|---|---|
| A 행 6 있음 · 업로드 막힘 | L1 | 5.50 | 0.50 | |
| | L2 GAP | 7.00 | 2.00 | |
| A′ 같은 장면 · 직전 발행 0.3초 뒤 | L1 | 6.20 | 0.50 | |
| | L4 | 7.50 | 1.80 | ERROR gap=holding |
| | L2 GAP | 7.70 | 2.00 | |
| B GAP 틱이 서지 않음 · 봉인 켬 | L1 | 5.50 | 0.50 | |
| | L2′ 봉인 | 7.00 | 2.00 | |
| C 행 6 없음 · 봉인 끔 | L4 | 7.50 | – | WARN gap=no_row |
| C′ 행 6 없음 · 봉인 켬 | L2′ 봉인 | 5.50 | – | |
| D 행 6 부적격(키 없음) · 봉인 끔 | L1 | 5.50 | 0.50 | |
| | L4 | 7.50 | 2.50 | ERROR gap=incomplete |
| D′ 같은 장면 · 봉인 켬 | L1 · L2′ 봉인 | 5.50 | 0.50 | |
| E 캐시 뒤처짐 · 봉인 켬 | L4(봉인 없음) | 7.50 | – | ERROR gap=view_behind |

A′ 는 재측정에서 드러난 모양이다: 두 축이 따로라 holdAge = stallAge + delta − 6 이고, delta < 0.5초면 L4(stallAge 7.5)가 L2(holdAge 2.0 ⇔ stallAge 8 − delta)보다 먼저 선다. 운영 루프는 1초 틱이라 그 사이 0.5 − delta 초 안에 틱이 떨어질 때만 보인다. 코드 수정은 제안하지 않았다(보고만).
