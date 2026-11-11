# review — pokeclip-media-host-restart-lifecycle (2026-11-12)

검증: npm run build · npm test 39/39, 단건 layout(아래 결과), 외부 링크 200, check-videos 통과. 독립 리뷰는 코디네이터가 따로 받음.

| 지시 대비 | 처리 |
|---|---|
| 「10/20 시험 상자」 | 실제는 개발자 맥 OrbStack 위 AL2023 arm64 컨테이너(systemd 252 PID 1) — 본문 · 측정 조건에 그대로 |
| 갈래 | 10가지(A · Acg · Apl · Apl-i · B · B2 · Bs · C · D · D2) 각 3회, 재현은 Acg · Apl(영구 실패) · Apl-i(조용한 낡음) |
| 헬스 200 | nginx 고정 응답(nginx.conf.tmpl 181–190) — 본문에 밝힘. 영상 이름표는 MediaMTX 옆이나 캡션이 바로잡음 |
| 21사례 | PR #322가 새로 만든 것이 아니라 사례 21을 넓힘. 10/22 밤 최종 트리에서 21 × 3, 지금 24사례 |
| 운영 | 11/3 기동만(MEDIA START OK · 같은 MAINPID · 대상 그룹 넷 healthy · 강제 종료 시험 없음). 11/4 쓰지 않음 |
| 영상 포스터 | 휴대폰 webp 61.6KB → 흐린 상자 점선을 실선으로 바꿔 57.0KB |

그림: 영상 CrashLeftoverContainer(12초, 휴대폰판), Mermaid fig-unit-stop-paths(TB 392px).

## 독립 리뷰 반영(2026-11-12, 코디네이터 경유)

| 등급 | 지적 | 처리 |
|---|---|---|
| MUST | 「헬스 200」 이름표가 MediaMTX 아래 | 장면 이름표 「nginx 헬스 200(고정 응답)」(휴대폰 「nginx 헬스 200」), alt 수정 |
| MUST | create_host_path가 새 파일을 만드는 것처럼 읽힘 | 캡션 교체, 아래 줄 bind 칸을 「bind 원본」 + 「디렉터리 생성 막음」으로 |
| SHOULD | 10/20 고친 것은 셋, `--remove-orphans`는 같은 PR에서 넷째 | 본문 · 「고친 뒤(앞의 셋)」 |
| SHOULD | 소제목 | 「…남고 헬스는 200이었습니다」, 옛 id 유지 |
| SHOULD | 「사이드카 재시작」 이름표 | 「파일 자리에 디렉터리」 앞에 추가 |
| SHOULD | kind | 캡션을 「재현 실험을 단순화한 개념도」로 |
| NIT | 소제목 「MediaMTX와 nginx」, 「전원 차단을 흉내 낸 재부팅」, 링크 범위 L4–13 · start-media.sh L61–63 | 반영 |
