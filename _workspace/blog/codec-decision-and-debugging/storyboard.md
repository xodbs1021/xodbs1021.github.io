# codec-decision-and-debugging 콘티

## PlayerStartChain (반복 영상, 약 11초, 휴대폰판 1080×1350)

주장 하나: 플레이어가 재생을 시작할 때 코덱 정보는 다섯 단계를 차례로 지나고, 어느 단계에서 멈췄는지가 원인을 가른다. Chrome 157에서 `ec-3`는 둘째 단계(isTypeSupported)에서 false가 된다(실측).

- 단계 상자 5개(데스크톱 가로, 휴대폰 세로): ① 다변형 목록 CODECS ② isTypeSupported() ③ addSourceBuffer() ④ init 조각(moov · ASC) ⑤ 디코딩.
- 0–4.5초: 토큰 「mp4a.40.2」 가 ①→⑤로 이동, 지난 상자마다 accent 테두리와 체크 표시.
- 4.5–5.5초: 멈춤, 리셋 페이드.
- 5.5–8.0초: 토큰 「ec-3」 가 ①을 지나 ②에 닿으면 ②가 danger 테두리 + 이름표 「Chrome 157: false」, ③–⑤는 muted로 흐려짐.
- 8.0–11초: 멈춤(끝 = 포스터: 위 줄 성공 체크 흔적 없이 실패 상태가 보이게 — 포스터는 실패 상태).
- kind = 개념도(② 결과값만 실측).

## 정적 그림
- fig-three-layers (Mermaid TB, 개념도): 재생 실패 → 선언(목록 CODECS) · 그릇(init의 ASC/표본 항목) · 디코더(isTypeSupported/decodingInfo) 세 층 판단 흐름.
