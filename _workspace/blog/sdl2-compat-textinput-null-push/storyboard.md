# 콘티 — sdl2-compat-textinput-null-push

## TextInputNull (반복 영상 11초 · 330프레임 · 휴대폰판 있음)

주장 하나: 같은 길(앱 → Event2to3 → SDL3 SDL_PushEvent)을 지나도 KEYDOWN 은 바뀌어 큐에 들어가고, TEXTINPUT 은 NULL 이 되어 SDL3 에서 떨어진다.

- 0–20: 세 칸(앱 · SDL2 API / sdl2-compat · Event2to3 / SDL3 · SDL_PushEvent)과 사이 화살표가 뜬다.
- 20–130(위 줄): `SDL_KEYDOWN · SDL2 이벤트` 카드가 등장 → 가운데 칸으로 이동(40–70) → 75에 `KEY_DOWN · SDL3 이벤트`(청록)로 바뀜 → 오른쪽 칸으로 이동(95–125) → 130 `큐에 들어감` 이름표. 떠난 자리에는 원래 카드가 옅은 점선으로 남는다.
- 150–286(아래 줄): `SDL_TEXTINPUT · text[32] = "a"` 카드 등장 → 가운데 칸으로 이동(165–195) → 200에 빨간 `NULL` 카드로 바뀌고 `짝 없음 → NULL` 이름표 → 그대로 오른쪽 칸으로 이동(222–246) → 248 `SIGSEGV · 주소 0x8` → 256–286 카드가 기울며 흐려진다.
- 286–330: 멈춤. 포스터 = 320프레임(끝 모습: 위 줄 큐에 들어감, 아래 줄 NULL 이 떨어짐).

숫자: 주소 0x8 = SDL3 `SDL_CommonEvent` 의 `timestamp` 오프셋(type 4 + reserved 4)이자 크래시 보고서의 잘못된 주소(raw/matrix/crash-*-textinput-*.txt). 시간 간격은 설명용.

휴대폰판(1080×1350): 세 단계를 위에서 아래로 쌓고 두 줄을 좌우(왼쪽 KEYDOWN, 오른쪽 TEXTINPUT)로 둔다. 글자 48px.
