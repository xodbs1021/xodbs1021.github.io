# storyboard — pokeclip-database-authoritative-manifest-publishing

## 그림 1 발행 다섯 걸음(Mermaid TB)

장부 예약 → 렌더·검사 → S3 조건부 PUT(강조) → 200이면 장부 확정 → CDN, 412면 화해 뒤 한 번 다시. 시퀀스도는 휴대폰 폭에서 961px라 TB 흐름도로 바꿈.

## 영상 1 LateWriterFenced (11.5초 반복, 휴대폰판)

| 프레임 | 무엇 |
|---|---|
| 18 | A → 장부 예약, 장부 「fence A · 세대 10」, A 「세대 10 예약」 |
| 66 | A 회색 「멈춤」 |
| 102 | B 청록 「fence 획득」, 장부 「fence B」 |
| 132 | B → 장부 예약, 「세대 11」 |
| 168–186 | B → S3 PUT, S3 「세대 11 · 11번까지」(청록) |
| 216–246 | A 「깨어나 PUT」 → S3 앞 85%에서 멈춤, 「PUT 412 · ETag 불일치」 |
| 270–300 | A → 장부 확정 멈춤, 「확정 거절 · fence B」 |
| 330 | 포스터 |
