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
