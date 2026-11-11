# evidence — microphone-selection-without-always-on-vad (다시 쓰기, 2026-11-11)

유형: 의사결정. 코드 근거 develop `825a3dfe`.

## 역할

- 작성자: 7/20 상시 VAD 제거 결정, 「직접 들어 보게 하자」 대안(사용자 지시, PDF 28쪽과 일치).
- AI: 조사·설계 초안.
- 팀원들: 편집기 미리듣기·파형(10/23–11/1 커밋, trackAudio/·studio/).

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 7/20 설계: 구간만 디코드 → 파형, RMS로 무음 트랙 숨김, 소스 타입 정렬, 솔로 → 선택 트랙만 Whisper, faster-whisper vad_filter, 원클릭 = 템플릿 트랙 + 렌더 전 RMS 무음 체크 | 7/20 결정 기록(비공개) | 비공개 결정 |
| 미리듣기 = 영상이 받은 창(구간 ± 여유) | useTrackPreview.ts L10–13 | 공개 |
| 트랙 줄 넣기·빼기·음량, 솔로 버튼 없음 | TimelineTrackRow.tsx L8–11, editor 전체 grep(solo 없음) | 공개 |
| 파형 = 50ms 칸 최댓값, −60dB 바닥 | trackLevels.ts L14–19, L44–51 | 공개 |
| 무음 트랙 숨김 없음 | editor grep | 공개(부재) |
| AI 자막 목업, 실제 모드 「준비 중」 비활성 | useClipEditorMockState.ts L3–13, L1319, SubtitleSection.tsx L19–38 | 공개 |
| STT 코드 없음 | workers/ai = .gitkeep | 공개(부재) |
| 템플릿 레시피 렌더 불가 | RecipeParser.java L96–100 | 공개 |
| 9/3 이름 고정·라벨 폐기 | 팀 결정 로그 9/3(비공개) | 비공개 결정 |
| CPU 절감·분류 정확도 측정 없음 | — | 미측정 |

ADR 번호 대신 「7월 20일 결정(비공개 설계 기록)」.

## PDF 대조

28쪽: 「파형·RMS로 무음 후보 표시 → 솔로 미리듣기」를 채택 설계로 적음 → 본문 날짜 문장(코드는 칸별 최댓값, 무음 후보 표시·솔로 버튼 없음, 자막 입력은 설계).
