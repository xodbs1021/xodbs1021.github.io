# review — pokeclip-obs-shared-encoder-srt (2026-11-11)

검증(2026-11-11): npm run build · npm test 39/39 통과, LAYOUT_PATH 단건 layout 실패 0 · 경고 0(320·390·768·1440, light/dark, 움직임 줄이기), 외부 링크 25개 200(ffmpeg.org 1회 시간 초과 뒤 재시도 200), 내부 링크·앵커 존재, check-videos 통과(영상 0.20–0.49MB). 독립 리뷰 1회(새 컨텍스트, 원자료·코드·정본·PDF 대조, MUST/SHOULD/NIT; 결과는 코디네이터 경유). 유출 0건, 인용 줄 번호 일치(2-S5 제외 → 반영). 공통: 그림 번호를 [[fig-id]] 참조로.

| 등급 | 지적 | 처리 |
|---|---|---|
| MUST | 「그림 2는 인코더 하나와…」가 실제 그림 1 | [[fig-shared-encoder-layout]] |
| MUST | 「코드가 강제하는 것은 GOP 2초뿐」: 6트랙 · AAC도 강제(stream-target.cpp 478–535) | 지정 문장으로 교체 |
| SHOULD | 거절 조건이 넓음 — keyint ≠ 2 또는 keyint 토큰일 때만(gop-guard.cpp 52–63) | 첫 문단 · 본문 · 영상 캡션 · description · 영상 이름표(「녹화 중 · keyint ≠ 2」) |
| SHOULD | 11/4 방송이 GOP 2초로 나갔다는 근거 없음 | 「GOP를 맞춰도」 전제 제거, 절 제목 「조각 길이까지 송출 쪽이 보장하지는 못했습니다」. 글 제목은 유지 |
| SHOULD | 종료 문장 링크 보강 | plugin-main.cpp 680–686, stream-target.cpp 428–456 |
| SHOULD | 역할 순서 | 「9월 13일 팀원이 먼저 착수한 플러그인 담당을 9월 26일 정식으로 넘긴 것」 |
| NIT | 종료 소제목 분리, MediaMTX 4초는 프로젝트 설정, 「당시 기본값 1,000ms」 | 새 절 「본방이 멈추면 SRT도 멈추고, 재연결 중에는 유지했습니다」, infra/compose/mediamtx.yml 96행 링크, 측정 조건 수정 |

판단 메모: 「OBS 담당 팀원과 통합 조건을 검토했다」는 기록 없음으로 삭제. B-frame 규약은 언급하지 않음.
시각: 그림 1 Mermaid TB(417px), 영상 SharedEncoderStart(12초, 휴대폰판).
