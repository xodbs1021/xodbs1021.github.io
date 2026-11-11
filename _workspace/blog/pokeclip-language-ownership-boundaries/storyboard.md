# storyboard — pokeclip-language-ownership-boundaries

## 영상 1 BroadcastEventFanout (11초 반복, 휴대폰판)

| 프레임 | 무엇 |
|---|---|
| 0–15 | 사이드카(Go) → SNS FIFO → SQS FIFO 둘 → chat-collector · clip(Spring) 상자와 선, 사이드카 아래 봉투 카드(방송 시작: streamId · ingestStreamId · eventId) |
| 30–75 | 「방송 시작」 알약이 사이드카 → SNS FIFO |
| 105–150 | SNS에서 두 갈래로 나뉘어 SQS FIFO 둘로 |
| 180–225 | 각 SQS → chat-collector · clip |
| 230 | 두 소비자 아래 봉투 카드가 같은 세 칸으로 뜨고 칸이 청록 |
| 260 | 「칸 이름 그대로」 |
| 315 | 포스터 |

끝 프레임: 보낸 카드와 받은 카드 둘이 같은 세 칸을 보여 줌.
