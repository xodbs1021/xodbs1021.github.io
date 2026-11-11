# evidence — chat-highlight-research-and-fallback (다시 쓰기, 2026-11-12)

유형: 설계·아키텍처(제안 → 구현 상태 구분). 코드 근거 PokeClip-mono develop `2fc2323c`(2026-11-12 02:10:08 KST). chat-detector · chat-collector 설정 · 수동 마킹 파일은 v1.0.0(`bad85cc7`, PR #466, 2026-11-03 03:32 KST 병합) 이후 변경 없음(경로별 마지막 커밋 910e9198 · cbdc4fad 가 v1.0.0 의 조상, mark 두 파일은 v1.0.0 에 존재).

## 역할

- 채팅 신호 연구: 「팀 실측」(7월 연구 노트 머리 「팀 실측 결과 + 보완 가설」). 개인 주체 미확인.
- chat-detector 구현: 팀원(PR #134, 2026-08-26 15:14 KST 병합). 이름 쓰지 않음.
- 3.9초 측정 주체: 저장소 기록에 수행자 없음(「스트리머가 치지직 방송 화면을 보고 채팅」만) → 주체 쓰지 않음.
- 웹 수동 마킹 · OBS 핫키 구현 주체: 확인 안 함 → 쓰지 않음.
- 작성자(사용자) 몫: 공개 근거 없음. 옛 글 L17 · L44 「저는 … 정리했습니다」는 공개 근거로 주체를 확인하지 못해 삭제. PDF 54쪽은 「팀 연구 대비 본인의 구체적 선택 근거 부족」으로 참고 기록에 내림 → 그 사실만 씀.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 판정은 5초 창 하나, 3·5·10초는 집계만 | chat-detector application.yml L91–93 | 공개 코드 |
| 기준선 = 최근 15분 중앙값 | 같은 파일 L118–119, Baseline.java L5–33 | 공개 코드 |
| 중앙값 이유: 짧은 롤링 창에서 평균이 부풀어 연속 하이라이트를 놓침 | Baseline.java L8–13, 7월 연구 노트 2·4절 | 공개 코드 · 공개 문서 |
| 「채팅 있던 창」만 셈 → 조용한 방송에서 자동 탐지 사실상 꺼짐, 예: 180창 중 5창 10건 → 기준선 10, 20건도 2배 | Baseline.java L15–32 | 공개 코드 |
| 워밍업 = 판정 창 직전 15분 안 채팅 있는 창 24개(매 판정 다시 셈) | application.yml L120–122, SpikeDetector.java L29–31, DetectionCycle.java L201 | 공개 코드 |
| 카드 지점 오차 최대 1.5초(조각 경계) | HighlightPublisher.java L99–106 | 공개 코드 |
| 사건 간격 10초 → 20초(한 장면이 두 장으로 쪼개짐) | application.yml L138 | 공개 코드 주석 |
| 운영 IaC는 DETECTION_* · CHAT_SYNC_OFFSET_MS 미주입(서버 기본값) | infra/terraform/prod/platform/README.md L226–230 | 공개 문서 |
| 배율 3.0 「임시값」, 최소 10건 「근거 없는 임시값」, 높은 쪽이 안전(손해 비대칭) | application.yml L123–128 | 공개 코드 |
| 두 조건 동시, 최소 건수를 먼저 봄 | SpikeDetector.java L10–11, L35–43 | 공개 코드 |
| 판정 지표 기본 MESSAGE, 참여자 수는 집계만(설정으로 CHATTER 가능) | application.yml L129–131, SpikeDetector.java L46–52 | 공개 코드 |
| 사건 묶기 20초, 상한 90초, 앞 15초 · 뒤 5초, 20초 지나야 카드 나감 | application.yml L135–147 | 공개 코드 |
| 9/13 실방송 30초 급증에 카드 8장(유일한 현장 관찰) | application.yml L135 | 공개 코드 주석 |
| 카드 구간 = 첫 튄 창 영상 위치 − 15초 ~ + 사건 길이 + 5초, 변환은 첫 창 시작 한 번 | HighlightPublisher.java L83–85, L107, L143–144 | 공개 코드 |
| 수집 서버가 채팅 시각에서 3,900ms 뺌, 채널별 덮어쓰기 가능(저장소 설정엔 채널 값 없음) | chat-collector application.yml L345–396 | 공개 코드 |
| 3,900 = 2026-08-24 로컬 실측, 표본 20 중앙값 3,884, 평균 4,100, 범위 3,746–4,977, 배제 3건(포함 시 3,844), 시계 4.0초 뺌, 한계 다섯 | services/README.md L448, L464–496 | 공개 문서(팀 실측) |
| 파이프라인 ①–⑤ | services/README.md L5201–5211 | 공개 문서 |
| README 「고유 채터가 더 깨끗」 단정 | services/README.md L110–113 → 7월 연구 노트 6절 「가설」, 7절 미결 5번 「A/B」 → 가설로 다룸 | 공개 문서 |
| 7월: 누적 + 롤링 10–20분 검토, 워밍업 확정 정책, 멀티윈도우 합의, 소형 채널은 핫키 모드 | xodbs1021/PokeClip-architecture `812fac0e` 8_…연구노트.md 2·4·6절, 1절 | 공개 문서(7/20 업로드) |
| 신뢰도 미달 채널 자동 탐지 비활성 + 핫키 안내(계획) | 7월 20일 설계 결정 기록 · 기능 명세(비공개) | 비공개 설계 |
| 그 기능 코드 없음 | 2fc2323c 트리 grep(trust · reliab · profile · 신뢰 → 무관 파일만) | 공개(부재) |
| OBS 핫키 · 웹 수동 마킹 구현 | obs-plugin/src/mark-hotkey.cpp, web/…/useManualMarking.ts L13–18 | 공개 코드 |
| 웹 · OBS 두 문이 같은 recordHotkey, 카드 표 source ∈ {auto, hotkey} | WebMarkService.java L26–27, V202__create_jump_cards.sql L33, HighlightCard.java L31 | 공개 코드 |
| v1.0.0 출시 이미지에 chat-collector · chat-detector 포함, render · upload · ai 없음 | PR #466 본문 「출시 이미지」 표 | 공개 PR |
| workers/ai 는 .gitkeep 뿐, 용도 Whisper 자막 | 트리, workers/README.md L9, L46 | 공개 |
| 정확도 · 생산성 수치 없음 | — | 미측정 |
| PDF 54쪽 = 10/15 검토, CASE 32 참고 기록, 「정확도·효율 개선 실측과 본인 선택의 구체적 근거 필요」 | static/portfolio/2026-10-15-v2/full.pdf p54(pdftotext) | 공개 PDF |
| v3→v4 캐스케이드 · VLM 출시 안 됨 | PR #466 이미지 표(ai 없음), workers/ai 비어 있음 | 공개 |

ADR 번호 대신 「7월 20일 설계 결정 기록(비공개)」.

## PDF 대조

54쪽은 정확도 수치 없음을 이미 적음 → 고치지 않고 본문에 「10월 15일 검토 … 11월에도 수치 없음」 날짜 문장.

## 그림

- 영상 ChatSpikeToCard: 막대 높이 · 기준선 6 · 시각은 설명용. 기본값(5초 · 15분 중앙값 · ×3 · 10건 · 20초 · 앞 15초 · 뒤 5초 · −3.9초)은 2fc2323c 그대로. 순서는 코드 순서(판정 → 묶기 → 첫 창 위치 변환 → 앞뒤 여유)로, 지시문의 「−3.9초 먼저」와 달리 함.
- Mermaid fig-card-paths: services/README.md L5201–5211 + WebMarkService · V202 재구성.
