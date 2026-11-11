# review — shakedown-reboot-recovery-and-deletion (2026-11-12)

## 시각 자료 계획(visual-planner)

| 위치 | 놓침 신호 | 독자가 봐야 하는 것 | 형식 | 없으면 놓치는 것 | 근거 종류 |
|---|---|---|---|---|---|
| 책임 분리 절 | 구성 요소 3개 이상 관계 | Docker가 컨테이너를, systemd가 Target API를 띄우고 Target API는 상태 파일 · tombstone만 읽음 | Mermaid TB(정적) `fig-reboot-start-order` | 「Target API는 컨테이너를 띄우지 않는다」는 경계 | 재구성(유닛 · delivery.mjs · server.mjs) |
| 재부팅 절 | 시간이 흐르며 상태가 바뀜(두 번 재부팅) | 첫 재부팅 뒤 복귀, DELETE 뒤 tombstone, 두 번째 재부팅 뒤 미부활 | 영상 12초 반복 + 휴대폰판 `RebootTwiceTombstone` | 같은 장치(재부팅)가 두 번은 반대 결과를 내야 했다는 점 | 개념도(실험 순서) |
| 단계 표 | 정확한 값 조회 | 단계별 응답 코드 | 표 | — | 실측 |

걸러낸 후보: 첫 실험 vs 고친 판 비교 영상(주장 둘 → 영상 하나 원칙에 어긋남, 첫 문단 문장으로 충분). 필수 수량 충족.

## 검증 (2026-11-12)

- `npm run build && npm test` 39/39 통과. `LAYOUT_PATH=0-to-1/<slug> npm run test:layout` 실패 0 · 경고 0(390 · 1440, 밝은 · 어두운, 움직임 줄이기 켬 · 끔 캡처 직접 확인). 외부 링크 29개 200.
- 영상: 12초 반복 · 휴대폰판(1080×1350), 용량 1MB 이하, 독자 포스터 60KB 이하(reboot 휴대폰판 webp 58,292B — 처음 60,084B로 초과해 단계 칸 테두리를 없애고 빈 칸 점선을 2px로 줄임).
- 도식: 390px에서 12px 이상이 되도록 TB 폭 392px 이하로 맞춤(reboot · restore는 갈래를 줄여 폭을 줄임, TLS는 긴 식별자를 줄바꿈).

## 독립 리뷰 (새 컨텍스트 리뷰어, 공개 저장소 · 원자료 대조)

첫 리뷰어는 응답이 돌아오지 않아(1시간 이상) 새 리뷰어를 띄움. 두 번째 리뷰 결과 MUST 1 · SHOULD 6 · NIT 5, 처리:
- MUST: restore 영상 설명 「위쪽 · 아래쪽 장면」 → 「앞 · 뒤 장면」(장면은 차례로 재생). 반영.
- SHOULD: 프로브 판정 규칙에 `ERR_TLS_CERT_ALTNAME_INVALID` 포함, `verifyIdentity`를 뺀 경우는 소스 기준 추론이라고 밝힘, 표본 방식(응답 · 실패 뒤 1초), 보존 문서 2개 표현, MongoDB는 세 번째 조건을 네트워크 격리로 보장, tombstone 문장에서 없는 재조정 경로 암시 제거, standalone 문장(원자료에도 있음). 모두 반영.
- NIT: mysql2 행 범위 429–454, 45/12 시험은 `2d4829e`에서 재실행, DLM은 장애 전환 시험 스택에서 끔, 「Unicode 쓰기」(읽기 빼기) 반영. reboot 소제목 주어 변경 제안은 승인 뼈대에 가까운 현재 문장을 유지(미반영).
