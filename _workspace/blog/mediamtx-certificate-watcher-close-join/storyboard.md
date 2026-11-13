# storyboard — CloseDuringReload (11초, 330프레임, 반복, 휴대폰판 있음)

주장: watch()가 인증서를 바꾼 뒤 Parent.Log 안에서 멈춰 있을 때 Close()를 부르면, v1.21.1은 먼저 반환하고 watch()가 나중에 cert를 다시 채운다. 고친 뒤(#6261 · #6417)에는 Close()가 watch()의 반환을 기다린 뒤 정리한다. 개념도(시험 TestCloseDuringReload의 순서).

- 0–0.5초: 위 줄 v1.21.1, 아래 줄 고친 뒤. 줄마다 watch() · Close() 이름표와 `cl.cert: 인증서` 상자.
- 0.6초: 두 줄 watch() 「Parent.Log에서 멈춤」(회색).
- 1.7초: 두 줄 Close() 「종료 신호」.
- 위 줄 2.7초: 「정리 · cert = nil」, cl.cert nil. 3.7초: 빨강 「먼저 반환」.
- 아래 줄 2.7초: 「watch() 반환을 기다림」(회색).
- 5.7초: 가운데 「로그 풀림」.
- 위 줄 5.7초: watch() 「select로 돌아감」, 6.5초: 빨강 「cert 다시 채울 수 있음」, cl.cert 빨강 「nil · 다시 채워질 수 있음」(select는 무작위라 다시 채움은 가능성으로 그림. 시험이 확인하는 것은 Close가 먼저 반환하는 데까지).
- 아래 줄 5.8초: watch() 청록 「로그 끝나고 반환」, 6.8초: Close() 청록 「정리한 뒤 반환」, cl.cert 청록 「nil · 정리 뒤 그대로」.
- 7–11초: 정지(포스터 320).
휴대폰판: cl.cert 상자를 줄 아래 가로로, 제목 짧게. 글자 48px 이상.
