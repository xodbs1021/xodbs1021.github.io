# 근거 메모 — projects/multicloud-migration-design (2026-11-01 작성)

공개하지 않는 작업 메모. 주장 / 원본 / 확인 날짜 / 수행 주체 / 근거 유형.

| 주장 | 원본 | 확인 | 수행 주체 | 유형 |
|---|---|---|---|---|
| 4단계 흐름(수집→모델→적응→전환), Export만으로 런타임 의존성을 다 알 수 없다는 전제 | 볼트 Projects/multicloud-migration/architecture.md "설계 계약 (2026-10-31, 사용자 합의)" | 2026-11-01 | 김태윤이 AI(Codex)와 논의해 확정 — 원자료 raw/multicloud-migration/2026-10-31-site/02_cx_user-instructions_r1.txt "Codex conversation" | 가정·모형(설계) |
| 단일 쓰기 DB, 두 앱 동시 운영 허용, C 단계 순서 | 같은 문서 "DB와 무중단 목표"; ADR-001 | 2026-11-01 | 김태윤 확정 | 가정·모형(설계) |
| 대기 허용·실패·유실·중복 0건은 목표, 미측정 | 같은 문서 "목표", "실제 … 0건 달성은 미구현/미검증" | 2026-11-01 | — | 미검증(목표) |
| 호환성 4분류 문구와 예시 | migration.taeyun.blog app.js categories (v1·v2 공개본 app.js 바이트 동일) | 2026-11-01 | Codex 작성(v1), 김태윤 지시 | 가정·모형 |
| DB 전환 단계별 앱·DB 상태 문구 | 같은 app.js stages. 모형 단계 이름은 본문 표(A–D)에 맞춰 바꿈 | 2026-11-01 | Codex 작성(v1) | 가정·모형 |
| 롤백 세 구간, 세 번째 칸 미정 (대상 승격 전 취소는 사이트 index.html "새 DB가 쓰기를 받기 전: … 전환을 취소해 원본 운영을 재개") | 볼트 architecture.md "대상이 새 쓰기를 받은 이후에는 검증된 역동기화/복구 없이 원본 주소로 되돌리지 않는다", index.md "다음 구현 전 결정할 것: … 역복제 지원 범위" | 2026-11-01 | 미정 항목은 볼트 기록. 후보 3개는 2026-10-31~11-01 Claude Code 대화에서 제안(김태윤 질문), 미결정 | 설계 검토·제안 |
| DMS 글은 B→A 직접 역복제를 "not advisable"(복제 흐름을 시험할 수 없음)로 보고 fall forward(A→B→A′)를 권함 | https://aws.amazon.com/blogs/database/rolling-back-from-a-migration-with-aws-dms/ | 2026-11-01 WebFetch 재확인(후반부 잘림) | 문헌 | 문헌값 |
| 구성 수집 공식 문서 3종, RDS 이전 2종 | 글 하단 URL 6개 (사이트 references와 동일) | 2026-10-31 | 문헌 | 문헌값 |
| 구성도·상태도는 Claude Code가 archify로, 영상은 Claude Code가 Remotion으로, 일러스트는 Codex CLI image_gen(ChatGPT 로그인)으로 제작 | 볼트 Projects/multicloud-migration/decisions/ADR-002.md, specs/2026-10-31-site-v2-archify-remotion.md | 2026-11-01 | AI 제작, 김태윤 지시 | 사실(제작 방식) |

## 미디어

| 파일 | 출처 | 생성 여부 |
|---|---|---|
| static/images/multicloud-migration-hero.jpg | Codex CLI 내장 image_gen(ChatGPT 로그인) 2026-10-31 생성, 프롬프트 볼트 raw/multicloud-migration/2026-10-31-site-v2/06_cc_image-prompts_r1.txt | AI 생성 일러스트 — 본문에 명시 |
| static/images/multicloud-migration-architecture.jpg | archify 3.2.0 구성도 화면 캡처(migration.taeyun.blog/architecture.html) | 실제 산출물 캡처 |
| static/images/multicloud-migration-cutover-states.jpg | archify lifecycle 화면 캡처(cutover-states.html) | 실제 산출물 캡처 |
| static/videos/multicloud-migration-film.mp4 | Remotion 4.0.539 렌더(57.8초, 1080p) → 블로그용 재인코딩 crf 26, 3.2MB, 무음 | 설명 영상 — 캡션에 명시 |
| static/images/multicloud-migration-film-poster.jpg | 위 영상 150프레임 | — |

## 상호작용 모형

compatibility / cutover — src/lib/explanation-models.mjs. 실제 판정·전환을 하지 않는 설명용 모형. 모형 안 한계 문구에 명시.

## 리뷰 반영 (2026-11-01)

- 측정 항목 "CDC 적용 위치"의 출처: 공개 drawio 2쪽 "추가 측정: 대기 시간·p95/p99 지연·CDC 적용 위치·진행 중 트랜잭션·전환 소요 시간" (raw/multicloud-migration/2026-10-31-site-v2/published/assets/multicloud-migration.drawio).
- "조용히 실패", "URL 형식과 만료 규칙이 달라집니다" 같은 단정은 원자료에 없어 "놓칠 수 있습니다", "달라질 수 있습니다"로 낮춤.
