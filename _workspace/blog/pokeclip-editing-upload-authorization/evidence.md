# 근거 — pokeclip-editing-upload-authorization (2026-11-12, 결정 변경 글로 다시 씀)

유형: 의사결정(결정 변경). 실측 없음. 확인 날짜 2026-11-12. 코드 기준 PokeClip-mono develop `825a3dfe`. 공개 근거만.

| 주장 | 근거 | 종류 | 수행 주체 |
|---|---|---|---|
| 7/20 세 권한 + 승인 대기함 설계 | 비공개 결정 기록 | 설계 | 글쓴이 |
| 8/4 팀원 이의(권한 등급 없음) | 비공개 결정 기록 | 기록 | 팀원 |
| 8/26 첫 권한 코드, 주인 · 편집자 안 가름 | 커밋 256856a7 | 코드 | 팀원 |
| 8/30 승인 게이트 없음 | services/README.md 2851–2852 | 코드 문서 | 팀 결정(팀원 제안 수용) |
| 근거 「누가 매일 쓰나」, relation은 표시 | services/README.md 1749–1760 | 코드 문서 | 팀원 |
| 10/22 권한 같음 | services/clip/.../BroadcastAccessGuard.java 17–19 | 코드 주석 | 팀원 제안 |
| 업로드는 채널 주인의 토큰 | workers/upload/.../UploadProcessor.java 147 | 코드 | 팀원 |
| 이어 올리기 9/26 | 커밋 ba94ecdd · ResumableUploader.java 24–33 | 코드 | 팀원 |
| 기본 비공개 | V213 21행(10/8 커밋 3de48385) | 코드 | 팀원 |
| 상태 표 · checking 자동 재업로드 안 함 · 사람이 풂(편집자도) | services/README.md 2838–2852 · 2734–2741 | 코드 문서 | 팀원 |
| 렌더 성공 뒤 자동 업로드(10/8, 권한 토글 아님) | services/README.md 2539–2545 · 2574 | 코드 문서 | 팀원 |
| 위임 회수 가능 | auth DelegationService(revoke) | 코드 | 팀원 |
| PDF 29쪽 「승인 대기함으로 보내도록 설계」 | static/portfolio/2026-10-15-v2/full.pdf 29쪽 | 원문 | — |

쓰지 않은 것: render · upload 일꾼 운영 상태.

주의: 브리프의 「자동 업로드 코드 없음」은 7월의 '자동 업로드 권한(토글 ②)' 기준으로만 맞다. 10/8부터 「영상 만들기」에 업로드 정보를 실으면 렌더 성공 때 clip이 스스로 업로드를 시작한다(본문에 구분해 적음).
