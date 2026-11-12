# cmaf-deep-dive 콘티

## 영상 1 — ChunkedSegment (330프레임 · 11초, 반복 영상, 휴대폰판 있음)

주장: 2초 CMAF 조각에 0.5초 moof+mdat 청크가 하나씩 쌓이고, 청크마다 LL-HLS 목록에 EXT-X-PART 줄이 붙으며, 조각이 끝나면 EXTINF가 붙는다.

- 왼쪽 seg-1.m4s: styp 아래로 청크 4줄(moof 칸 + mdat 칸, 「mdat · 청크 N · tfdt 값」). 청크 i는 24+52i부터 52프레임 동안 회색으로 차고 완성되면 실선(최신 청크 accent).
- 오른쪽 회색 판: 청크 완성마다 「#EXT-X-PART:DURATION=0.5」 줄 추가.
- 240 조각 완성 → 「#EXTINF:2.000,」「seg-1.m4s」(accent)와 「조각 완성 → EXTINF」 이름표.
- 끝 프레임(포스터 320): 청크 4개, PART 4줄, EXTINF.

tfdt 값과 청크 수는 실측 파일과 같음. 휴대폰판은 위 파일 · 아래 목록, 글자 48px.
