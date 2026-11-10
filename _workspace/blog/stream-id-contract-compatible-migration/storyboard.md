# storyboard — stream-id-contract-compatible-migration

## 영상 1 DeployOrder (11초 반복, 휴대폰판)

| 프레임 | 무엇 |
|---|---|
| 12–72 | 위 줄 「소비자 먼저」: ① 소비자 배포(ingestStreamId) → ② 생산자 새 streamId → 「조각 조회 정상」(청록) |
| 126–186 | 아래 줄 「생산자 먼저」: ① 생산자 새 streamId → 옛 소비자(경로 칸에 세션 id) → 「조회 0행」(위험색) |
| 315 | 포스터 |

설명용 그림. 실제 0행 기록은 없다(캡션에 밝힘).

## 그림 2 필드 대응(Mermaid TB)

이벤트 streamId → 장부 round_id → session_id 여럿, ingestStreamId → 경로 칸 → 녹화 조각 표(강조).
