# storyboard — NoWatcherShutdown (11초, 330프레임, 반복, 휴대폰판 있음)

주장: #6417 이후 Close()는 done을 기다리고, done은 watch()만 닫는다. 인증서를 저장하지 못하면 watch()를 시작하지 않아 아무도 done을 닫지 않는다. #6427은 그 분기에서 Initialize()가 done을 닫는다. 개념도(v1.21.3 certloader.go 72–107행 · 151–153행 · 175행 재구성).

- 0–0.5초: 세 줄(① v1.21.3 인증서 저장됨 ② v1.21.3 저장 안 됨(읽기 전용) ③ #6427 저장 안 됨), 줄마다 Initialize() · watch() · done · Close().
- ① 0.5초 Initialize → watch() 「시작」, 1.4초 Close → done 점선 「기다림」, 2.3초 watch() → done 청록 「닫음」, done 「닫힘」, 3초 Close 「반환」.
- ② watch() 회색 「watch() 없음」. 4.5초 Close → done 점선, 6.1초 점선 · done · Close 빨강, Close 「끝나지 않음」.
- ③ 6.7초 Initialize → done 청록 「close(done)」, done 「닫힘」. 7.5초 Close → done 점선, 9.1초 Close 「반환」.
- 9–11초: 정지(포스터 320).
휴대폰판: 줄마다 위 칸 Initialize → watch(), 아래 칸 done ← Close(). 글자 48px.
