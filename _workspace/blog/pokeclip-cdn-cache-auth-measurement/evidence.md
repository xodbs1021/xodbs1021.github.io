# evidence — pokeclip-cdn-cache-auth-measurement (다시 쓰기, 2026-11-12)

유형: 실험·벤치마크. 코드 근거 PokeClip-mono develop `825a3dfe`.

## 역할

- 작성자: 10/5 비교군·채택 정책, 운영 엣지 설계 결정.
- AI: 10/5 실험 구성·계측·분석(Codex), 10/6 S3 실험(Codex).
- PDF 20쪽(TTL 0 · 120초 · 세션 쿠키 전달) = 실험 조건, 21·22쪽 결정 주체 → 날짜 문장.

## 주장 → 근거

| 주장 | 근거 | 종류 |
|---|---|---|
| 401, 1,254 → 28, 97.95%, 97.81%, p95, 1,366요청·1.921MB, 7.308MB, 16,214 HTTP, 마지막 반복 중단 | 10/4–5 보존 색인 · PDF 20–21쪽 | 실측(비공개) |
| 서명 쿠키 200 Miss 373,502B / Hit / 403 | 같은 색인 · PDF 22쪽 | 실측(비공개) |
| 시청자→CDN HTTPS, CDN→원본 HTTP | 같은 색인 | 실측(비공개) |
| 10/6 S3 Miss/Hit 표, 110요청, 2GiB 상한 | 10/6 AWS 실측 기록 · PDF 23쪽 | 실측(비공개) |
| /live/*.m3u8 1초, _HLS_* 키 | policies.tf L33–57 | 공개 |
| /live/* 원본 따름 최대 3600초 | policies.tf L61–81 | 공개 |
| Host · Authorization만 전달, 쿠키 없음 | policies.tf L128–149 | 공개 |
| 함수가 KVS 비밀로 Authorization 덮어씀, 실패 시 503 | live-auth.js L1–21 | 공개 |
| hlsCDNSecret | mediamtx.yml.tmpl L143 | 공개 |
| 되감기 목록 max-age=1, VOD 3600 | s3store.go L29–30 | 공개 |
| ③ · init 1년 immutable | upload/s3.go L30 | 공개 |
| rewind 원본 Origin Shield 서울 | main.tf L154–156 | 공개 |

## 정정
- 10/5 loopback 기준선 절 삭제(옛 id는 운영 절로). 네트워크 스파이크 문단 → stateful-media-deployment 링크. 인스턴스 종류·엣지 위치 코드 삭제. 운영 원본 요청 감소는 재지 않음 명시. matplotlib SVG → ECharts(정적 파일은 그대로 둠).
