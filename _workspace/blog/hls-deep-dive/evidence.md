# hls-deep-dive — 근거 메모 (유형: 기술 해설)

확인일 2026-11-12.

| 주장 | 근거 | 종류 |
|---|---|---|
| 끝 표시 없는 목록에서 끝으로부터 3×TD 안쪽 조각에서 시작하지 않음(SHOULD NOT) | RFC 8216 6.3.3 | 문헌값 |
| HOLD-BACK ≥ 3×TD(MUST), 없으면 3×TD | bis-22 4.4.3.8 · 6.3.3 | 문헌값 |
| hls.js liveSyncDurationCount 기본 3, N-3 시작 | hls.js docs/API.md | 문헌값 |
| 조각은 다 만들어져야 배포, 긴 조각은 그 길이만큼 지연 | bis-22 3.2 | 문헌값 |
| 재요청: 바뀌면 ≥TD, 그대로면 TD/2; 서버 새 판 TD/2–1.5×TD | RFC 8216 6.3.4 · 6.2.1 | 문헌값 |
| bis: 바뀌면 마지막 조각 길이, 1.5×TD 그대로면 서버 이상 | bis-22 6.3.4 | 문헌값 |
| 짧은 TD의 장단점 서술, 값 선택은 운영자 | bis-22 4.4.3.8 | 문헌값 |
| TD 6초 권장, IDR 시작 | Apple 저작 규격 7.5 · 7.4 | 문헌값 |
| TD 2/6/10 표 | 위 규격 산식(3×TD, 1/TD, IDR 상한) | 산식(측정 아님) |
| 변형 타임스탬프 일치, 전환 시 EXTINF로 위치 → 타임스탬프로 맞춤, 끊김 위치 일치 | RFC 8216 6.2.4 · 6.3.4, Apple 8.15 | 문헌값 |
| hls.js abrEwmaFastLive 3.0 | hls.js API | 문헌값 |
| 뺀 조각 유지 기간, Expires 권고 | RFC 8216 6.2.2 | 문헌값 |
| PokeClip CDN 경로별 캐시 표 | pokeclip-cdn-cache-auth-measurement(Terraform · 코드 인용) | 공개 기록 재구성 |
| 같은 요청 합치기, HTTP/2 이상 | bis-22 부록 B.1 | 문헌값 |
| HTTP/2 손실 시 전체 요청 멈춤, QUIC 스트림별 | RFC 9114 1.1, RFC 9000 13 | 문헌값 |
| PokeClip 끊김 원인 넷 | zero-errors, cdn-timeline-normalization, black-screen, rewind-missing-segment, manifest-window-boundaries | 공개 기록 |
| 비LL 플레이어 거리 6 → 12초 | live-window-without-fork | 공개 기록 |

삭제: 메타 인용문, 치지직 관점 · 파이프라인 · NVENC 수천 대, 「유튜브 · 트위치 · 넷플릭스 전부」, 「TS는 부분 조각 불가」, 「fMP4는 v7부터」, 「26~29초」, 100만 명 · 5배, 「1/100」, HiPick 절 전체(인제스트 주소 포함), 면접 Q&A, 플랫폼별 QUIC 사용 추정.
