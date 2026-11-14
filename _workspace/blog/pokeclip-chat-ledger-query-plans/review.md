# 검토 기록 — pokeclip-chat-ledger-query-plans

작성 단계에서는 독립 리뷰를 하지 않았다(사용자가 따로 받음). 받은 독립 리뷰(C 0 / H 1 / M 5 / L 9)는 아래 「리뷰 반영」에 적었다.

## 자체 점검

- 기계 검사: 메타 문장 패턴(`이 글은|이번 글|여기서는|살펴보겠|알아보겠|앞서 |다음으로|안녕하세요|감사합니다`) 본문 0건. 본문 문장 끝 '~습니다' 외 0건(표 · 캡션 · 목록 제외).
- 제목 33자(공백 포함). 본문(출처 절 · 그림 · 코드 제외) 약 10,700자, 측정 조건 포함 약 13,400자. 결정 셋을 한 글에 담는 뼈대는 사용자 승인.
- 수치: 본문 · 차트 · 영상 · 캡션의 버퍼 값을 `measure/raw/summary.csv` 와 대조.
- 시각 자료: 영상 1(LedgerScanStop, 반복 9초, 휴대폰판), 정적 2(ECharts 실측, Mermaid 시퀀스도 재구성), 표 2.
- 화면: `LAYOUT_PATH=0-to-1/pokeclip-chat-ledger-query-plans npm run test:layout` 실패 0 · 경고 0. 390 · 1440 light/dark 차트 · 시퀀스도, 영상 390 · 1440 · reduced-motion 포스터 캡처를 직접 확인.
- 비공개 패턴 검사(Jira 키, 내부 기호, 리뷰 라운드, 볼트 · 워크트리 경로, 팀원 로그인, 테라폼 · IAM, 팀 위키): 전체 diff 0건.

## 남은 확인

- 원자료 링크(`tree/main/_workspace/blog/pokeclip-chat-ledger-query-plans/measure`)는 main 병합 뒤에 열린다. 브랜치 주소로 확인함.

## 리뷰 반영

- H1: 일반 계획이 가능한 시점은 같은 연결에서 같은 SQL의 열 번째 실행부터(pgjdbc `isOneShotQuery`@REL42.7.11 `executeCount < threshold` → 5번째에 이름 붙음, PG17 PREPARE 「first five executions are done with custom plans」 → 5–9번째 custom). 소제목 · 본문 · 도식 · 캡션 · accDescr 고침, 소제목 id 기준선 갱신.
- M1: PR · 코드에 없는 ms 값 두 개(바뀐 꼴 꼬리, 첫 행 + 1초의 앞선 ms)를 본문 · evidence에서 뺌.
- M2 · M3 · M4 · M5: 판단 절(t에 매이지 않는 최솟값 · 최댓값, t 조건 max 는 PK를 훑음), 색인 없음 예(4,530 · 11,771 · 4,241), 첫 문단(준비 문장 끔 · 강제 일반 계획), 「같은 연결에서 같은 SQL」.
- LOW: 앵커 L41-L60, subselect.c 근거, 차트 캡션 「바인딩 값 계획끼리」, 바꾸기 전 꼴 일반 계획 21,993, 「약 15만 번째」, load average 1.82–2.37, schema.sql 주석 · run.sh digest 고정 · down → up 안내 · autovacuum 구절, 「바인딩 값 계획으로 잰 EXPLAIN」, 수신 벽시각 칸, 길이 줄이기.
