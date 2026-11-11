# 근거 — shakedown-bounded-ai-image-generation (2026-11-12, 승인된 뼈대로 다시 씀)

유형: 설계·아키텍처(경계 설정) + 실험 1회 관측. 확인 날짜 2026-11-12. 공개 근거만. 저장소 `SoftBankHackathon/shakedown`은 2026-10-11 이후 변경 없음(HEAD `581f296`).
코드 기준: PR #11 병합 커밋 `44c9261`(이미지 생성), PR #12 병합 커밋 `3ffbcb0`(규모 판단). 실험 보고서는 `0147f47` 고정(보고서 파일은 HEAD와 바이트가 같음).

| 주장 | 근거 | 종류 | 수행 주체 |
|---|---|---|---|
| 생성 순서: 기존 Dockerfile → 규칙 → Claude 1회 → 검사 → 별도 사본 | image_builder.py 70–73 · 120–142 · 193–205(`44c9261`) | 코드 | AI 구현, 순서 요청은 사용자 |
| 기존 Dockerfile이 있으면(읽기 실패 · 링크 포함) AI로 대체하지 않음 | image_builder.py 125–127 | 코드 | AI 구현 |
| 실패 진단 `dockerfile-fallback.v1`, 응답은 Dockerfile 또는 null | image_prompt.py 4 · 19–42 | 코드 | AI 구현, 규격화 요청은 사용자 |
| 원본 코드 · README 본문 · 환경변수 값을 통째로 보내지 않음 | 회고 T07(`078cb68`) | 문서 | — |
| 규칙 최소 등급: RPS >100 large, >10 medium, 높은 가용성 · 급증 → medium 이상 | architecture.py 96–127(`3ffbcb0`) | 코드 | AI 구현, 기능 제안은 사용자 |
| AI 응답이 허용 목록 밖이면 거부 | architecture.py 153 | 코드 | AI 구현 |
| 선택이 허용 목록 밖이면 ArchitectureError → HTTP 400 | architecture.py 220 · api.py 52–56 | 코드 | AI 구현 |
| 카탈로그 small 0.5 vCPU/1 GiB 1태스크 1AZ, medium 1/2 · 2–4 · 2AZ, large 2/4 · 3–12 · 3AZ | architecture.py 24–34 | 코드 | — |
| RPS 경계와 자원 값은 초기 설계 가정 | architecture.py 경고 문구, 회고 T09 | 코드 · 문서 | — |
| 실측: Flask fallback 3.679초 · small/medium/large 3.876/4.551/4.434초 · small 400 · large 200 | live-ai 보고서 3 · 7–16(`0147f47`) | 실측(1회씩) | AI 실행, 사용자 키 |
| 입력 조건 5/50/150 RPS와 가용성 · 트래픽 | live-ai 10–12 | 실측 조건 | — |
| 시간 = 엔진 API 왕복 1회 | live-ai 7(열 이름) · 14 | 실측 | — |
| 생성 결과 python:3.12-slim · 비root · 5000 · gunicorn, 0.5 CPU/1 GiB 실행 HTTP 200 | live-ai 20–24 | 실측 | AI 실행 |
| 토큰 · 청구액 미측정 | live-ai 14 | — | — |
| 세 판단 모두 규칙 최소 등급과 같은 답 | live-ai 10–12 × architecture.py 106–111 계산 | 대조 | 글쓴이 계산 |
| 팀원 세 명의 기반 | 회고 표 17–20행(`078cb68`) | 문서 | 팀원 |
| PR #11 병합 2026-10-10 13:12 KST, 리뷰 0건, 작성자 본인 병합 | `gh pr view 11`(2026-11-12 확인) | 메타데이터 | 사용자 |
| 사용자 결정(규칙 우선 · 실패 진단 규격화 요청, 소 · 중 · 대 판단 제안) | 비공개 결정 기록(2026-10-09) | 기록 | 사용자 |

쓰지 않은 것: 팀원 이름, 본선 이야기, 비용(이 실험은 AWS 자원을 만들지 않음 — live-ai 36행).
PDF 46쪽의 팀원 실명은 PDF를 고치지 않으므로 그대로 두고 글에는 쓰지 않는다. 47쪽 내용과 글은 어긋나지 않는다.
