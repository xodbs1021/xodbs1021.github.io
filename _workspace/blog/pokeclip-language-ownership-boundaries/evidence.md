# evidence — pokeclip-language-ownership-boundaries (다시 쓰기, 2026-11-11)

유형: 의사결정.

## 역할

- 작성자: 언어 배치(7/20), 채팅 Spring 전환(7/31).
- AI: Claude Code · Codex(코드 작성), 사람은 리뷰.
- 팀원: 채팅 수집 서버 구현.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 언어 기준 = AI 생성 품질 + 사람 리뷰 가능성, Node 근거 둘, 담당 변경, 언어 5 → 4, 전부 Go/전부 Spring 기각 | 팀 내부 결정(7/20 · 7/31, 비공개) | 비공개 |
| PR #8 8/1 01:47Z = 10:47 KST 머지(main) | gh pr view 8 | 공개 |
| Go는 AI 생성 품질 + Java 개발자 리뷰 | 팀 내부 결정(7/20 미디어 서버, 비공개) | 비공개 |
| workers/ai = .gitkeep | /tmp clone @825a3dfe ls -la workers/ai | 공개 코드 |
| 봉투 칸(Go) | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/media/internal/broadcast/envelope.go#L42-L52 | 공개 코드 |
| 봉투 칸(Java) | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/chat-collector/src/main/java/com/pokeclip/chat/collector/broadcast/LifecycleEnvelope.java#L20-L31 | 공개 코드 |
| 소비자 clip · chat SQS FIFO | infra/terraform/prod/runtime/broadcast_events.tf L2 · L56 | 공개 코드 |
| eventId = SNS dedup 키 | envelope.go L60–61, AWS SNS FIFO dedup 문서(5분) | 공개 |
| 공유 시험 표 ledger-timeline-cases.json(렌더 · 웹도 읽음) | https://github.com/3K-PokeClip/PokeClip-mono/blob/825a3dfe1f8dbef20255f85cea890a21505ae465/services/README.md?plain=1#L13, web-ci.yml paths | 공개 코드 |
| 경로별 CI | .github/workflows/*.yml paths | 공개 코드 |
| 9/4 media-ci 경로 필터 · 필수 체크 제거, 이유 팀원 PR 체크 목록, 대가 3,000파일 | 팀 내부 결정(9/4, 비공개), GitHub Docs paths | 공개+비공개 |
| v1.0.0에 chat-collector · chat-detector | gh pr view 466 | 공개 |

## 사용자 지시와 다른 점

- 태그 「SNS/SQS」는 빌드가 슬래시를 경로로 해석해 「SQS」로.
