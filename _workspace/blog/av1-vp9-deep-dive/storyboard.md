# storyboard — av1-vp9-deep-dive

## 영상 1 — Av1RefSlots (반복, 10초 = 300프레임, 30fps, 휴대폰판 Av1RefSlotsMobile)

- 주장 하나: AV1은 참조 슬롯 8개를 두고, 숨은 프레임(ALTREF)을 먼저 부호화해 슬롯에 넣은 뒤 나중에 show_existing_frame으로 다시 부호화하지 않고 표시한다.
- 배치: 맨 위 「부호화 순서」 0(KEY) · 4(ALTREF, 점선) · 1 · 2 · 3 · 4(다시 표시, 점선). 가운데 「참조 슬롯 8개」. 아래 「화면에 나오는 순서」 0–4. 맨 아래 상태 이름표 + 한 줄 설명.
- 순서(프레임): 18 KEY 0 → 슬롯 8개 모두 0, 화면 0 「KEY_FRAME · 슬롯 8개를 모두 채움」 → 66 ALTREF 4 → 슬롯 6만 4, 화면 변화 없음 「show_frame=0 · 슬롯에만 넣고 출력 안 함」 → 114·148·182 프레임 1·2·3: 슬롯 7개 강조(참조), 각자 슬롯 1·2·3에 들어가고 화면 1·2·3 「슬롯 8개 중 7개 참조」 → 222 show_existing_frame: 슬롯 6의 4에서 화면 4로 화살표 「show_existing_frame=1 · 슬롯의 프레임을 그대로 출력」 → 300까지 멈춤(마지막 단계 강조 유지).
- 슬롯 번호 배치(어느 슬롯에 넣는지)는 설명용이다. 규격은 refresh_frame_flags 비트마스크로 고른다.
- 끝 프레임(포스터 292): 슬롯 6의 4 → 화면 4 화살표와 show_existing_frame=1 이름표.

### AV1 규격에서 확인한 것 (WebFetch 대신 curl로 원문 HTML을 받아 grep, 2026-11-13; 문서 「Last modified: 2023-05-25 12:27 PT」)
URL: https://aomediacodec.github.io/av1-spec/ (AV1 Bitstream & Decoding Process Specification, 1.0.0 with Errata)
- 3절 Symbols and abbreviated terms: `REFS_PER_FRAME 7` — "Number of reference frames that can be used for inter prediction"; `TOTAL_REFS_PER_FRAME 8` — "Number of reference frame types (including intra type)"; `NUM_REF_FRAMES 8` — "Number of frames that can be stored for future reference".
- 5.9.2 uncompressed_header 구문: `allFrames = (1 << NUM_REF_FRAMES) - 1`, `if ( frame_type == SWITCH_FRAME || ( frame_type == KEY_FRAME && show_frame ) ) refresh_frame_flags = allFrames else refresh_frame_flags f(8)` → 보여지는 키 프레임은 슬롯 8개를 모두 갱신.
- 6.8.2 Uncompressed header semantics: "show_existing_frame equal to 1, indicates the frame indexed by frame_to_show_map_idx is to be output"; "show_frame equal to 0 specifies that this frame should not be immediately output. (It may be output later if a later uncompressed header uses show_existing_frame equal to 1)"; "refresh_frame_flags contains a bitmask that specifies which reference frame slots will be updated with the current frame after it is decoded"; "ref_frame_idx[ i ] specifies which reference frames are used by inter frames … There is no requirement that the values in ref_frame_idx should be distinct."
- 참조 이름 7개: LAST_FRAME, LAST2_FRAME, LAST3_FRAME, GOLDEN_FRAME(그룹 1), BWDREF_FRAME, ALTREF2_FRAME, ALTREF_FRAME(그룹 2) — 규격 본문 「There are two reference frame groups」 문단.
- 절 번호는 원문 목차(markdown-toc) 순서로 계산: 기호 3, 헤더 의미 6.8.2, set frame refs 7.8, 참조 프레임 갱신 7.20(본문 "See section 7.20"과 일치).
