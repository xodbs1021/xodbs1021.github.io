# 검수 결과: multicloud-migration-design (2026-11-10 다시 쓰기)

11-01 판의 검수 기록은 git 기록(origin/main 30247ee 이전)에 있다.

## 독립 리뷰 (blog-quality-reviewer + article-style-checker 기준, 별도 에이전트)

판정: 수정 필요 → 반영 후 재검사 통과. CRITICAL 0.

| 지적 | 반영 |
|---|---|
| H1 AWS DMS fall forward를 "새 대상으로 다시 옮기는 방식"으로 잘못 요약 | 원문대로(원본 복제본을 미리 만들어 따라가게 함) 고치고, 본선과 같은 점은 "원본에 다시 쓰지 않음"뿐이라고 씀 |
| H2 첫 번째 모형이 폐기한 AI 적응·샌드박스를 보여 줌 | `compatibilityCategories`를 본선 대응표(5쌍, Route 53 원본 유지, 미분류) 기준으로 교체 |
| H3 실험에서 AI·팀원 역할 누락 | 단계 승인·gitops 머지(사용자), 클러스터 명령·변경 기록(Claude Code), 원복 순서 점검(Codex 리뷰), 원본 인프라·Secret(팀원) — 사용자 확인 "맞음" |
| H4 작성자 코드가 실클라우드 미실행임이 드러나지 않음 | 둘째 문단·준비 절·한계 절·출처에 명시 |
| M1–M11 | 종료 코드 3 표현 완화, 예상 표기, 내보내기 미구현, 대응표 표 교체, publication 우회, 표 1개·버전 미기록, 원복 미해결 비밀번호, 성립 전제(PostgreSQL끼리, 모든 쓰기 주체), CDC·Debezium 풀이, "위에서 본" 삭제, AI 역할 범위 |
| L1–L9 | 날짜 통일, 마지막 소제목 문장형, DNS 이유를 ADR-005 근거로, 모형 FENCING 문구(202는 평소에도, 전환 구간엔 전달만 멈춤), 그림 앞 안내·출처, 측정 범위(지연 미집계), FAILED 처리, 모형 앵커 링크, 고친 기록 문단 제거(4절에 첫 판 공개 사실로 흡수) |
| L10 링크한 공개 PR에 팀원 실명·인스턴스 이름·Notion 주소 | 공개 저장소의 기존 정보라 그대로 둠. 사용자에게 보고함 |

대조한 원자료: CLOUD_MIGRATION.md, service.js, Hackathon PR #71 #77 #78 #80 #82 #84 #86 #118, gitops PR #85 #87 #89 #92, crosscloud `service_table.py`·`cli.py`, AWS 블로그, 볼트 multicloud-migration 노트 7개.

## 기계 검사·화면 검수 (반영 후)

- 메타 표현 0, 본문 어미 '~습니다'만, 제목 30자, `## 출처` 있음, 본문 약 8,000자, 소제목 10개(공개 id 순서 유지).
- `npm test` 32/32, `LAYOUT_PATH=projects/multicloud-migration-design npm run test:layout` 실패 0·경고 0(4폭 × 라이트/다크, 모형 상태 72). 320·390px 모형 2열 배치와 390px 다크 도식을 눈으로 확인.
- 본문 링크 19개 HTTP 200(2026-11-10).
- 필수 시각 자료: 정적 = Mermaid 개념도(그림 1, kind·source), 움직이는 설명 = 전환 8단계를 넘겨 보는 설명 모형. 접수 큐 반복 영상은 모형과 내용이 겹쳐 만들지 않음.

## 남은 일

- 2편(AWS↔GCP 양방향 전환 실험) 작성 뒤 이 글에서 2편으로 링크.
