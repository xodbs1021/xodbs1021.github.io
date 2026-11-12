# hls-just-files 콘티

## 영상 1 — PlaylistSlide (330프레임 · 30fps · 11초, 반복 영상, 휴대폰판 있음)

주장: 라이브 미디어 목록은 끝에 새 조각 줄이 붙고 맨 앞 조각이 빠지며 MEDIA-SEQUENCE가 1씩 오른다. 끝나면 ENDLIST가 붙는다.

- 왼쪽 회색 판에 목록 글자(고정폭): #EXTM3U · TARGETDURATION:6 · MEDIA-SEQUENCE:100, EXTINF 6줄(seg100–105).
- 40–60 seg106 줄이 아래에서 올라오며 붙음(accentSoft 배경, 「끝에 새 조각이 붙음」 이름표).
- 66–86 seg100 줄이 취소선과 함께 왼쪽으로 빠짐(「맨 앞 조각이 빠짐」).
- 88–108 줄이 한 칸 올라가고 MEDIA-SEQUENCE 100 → 101(accent 강조).
- 140–208 같은 단계 반복(seg107, seg101, 101 → 102).
- 236–256 #EXT-X-ENDLIST 줄(accent)과 「방송 끝 · 더 바뀌지 않음」 이름표.
- 끝 프레임(포스터 320): seg102–107, ENDLIST, 「번호 100 → 102」.

휴대폰판: 같은 순서, 글자 48px, 번호 이력은 위, 이름표는 아래.
