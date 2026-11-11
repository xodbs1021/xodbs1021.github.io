# evidence — pokeclip-six-track-input-contract (다시 쓰기, 2026-11-11)

유형: 의사결정. 코드 근거는 PokeClip-mono develop `825a3dfe`(2026-11-11 07:16 KST).

## 역할

- 작성자: 6트랙 상한(7/23), audio1–6 이름 고정·라벨 폐기(9/3), 9/30 끄면 원래 체크·10/1 기본 꺼짐.
- AI(Claude Code·Codex, 작성자 세션): 8/3 시험 4회, 9/19 재포장 실험.
- 팀원: PR #179·#195 구현과 OBS 측정(9–10월).

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 원안 = 믹서 우회 ~10트랙(`obs_source_add_audio_capture_callback`), PID 고정·무음 채움 부담 | 7/23 결정 기록(비공개) | 비공개 결정 |
| OBS MAX_AUDIO_MIXES 6 | obs-studio 32.0.0 libobs/media-io/audio-io.h L28 | 공개 |
| 7/23 6트랙(믹스 1 + 소스별 5: 게임·마이크·디스코드·BGM·기타) | 같은 기록 | 비공개 결정 |
| 9/3 audio1 = 트랙1 믹스, audio2–6 = 트랙 2–6, trackManifest·라벨 API 폐기 | 팀 결정 로그 9/3(비공개) | 비공개 결정 |
| 9/19: MediaMTX 로그 트랙 순서 연결마다 다름, 파일 속 순서 3연결 동일, 첫 오디오 220Hz | 9/19 10분 재포장 측정 기록(비공개) 33행 | 실측(비공개, AI) |
| 되감기 = 첫 영상·첫 소리 | media/README.md L1358–1362 | 공개 |
| 편집기 trackId 0–5 | obs-plugin/README.md L201 | 공개 |
| audio1 = 본방 오디오 인코더 공유, 비AAC면 같은 믹서 AAC, 붙인 뒤 되읽기 실패 시 시작 안 함 | stream-target.cpp L478–535 | 공개 |
| 8/3: 6 = 6 등, OBS 무음 씬 6트랙 무음 AAC, ffmpeg 사인파 440–2640 개수만 | 8/3 멀티오디오·파이프라인 시험 기록(비공개) | 실측(비공개, AI) |
| PR #195 첫 판: 자리 모자라면 믹스 전용 + 경고 | PR #195 본문 20행 | 공개 |
| 지금: 같은 종류·앱끼리 묶음, 손 배정 | obs-plugin/README.md L221, L237 | 공개 |

## PDF 대조

26쪽: 역할 서술(팀원 구현·실측)과 일치. 27쪽 표 정정은 multiaudio 글이 맡음.
