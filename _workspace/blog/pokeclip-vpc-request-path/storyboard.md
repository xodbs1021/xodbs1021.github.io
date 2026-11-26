# 콘티 — ViewerRequestGates (반복 영상 12초, 360프레임, 휴대폰판 있음)

무엇이: 관문 넷이 한 줄(CloudFront → 내부 ALB → nginx → MediaMTX). 요청마다 관문 아래에 그 요청이 받은 검사 이름표를 따로 단다 — 라이브(청록, 첫째 줄): 쿠키 ✓ · 함수 Bearer / /live 제거 / 원문 ✓ / CDN 비밀 ✓ 200. playback(빨강, 둘째 줄): 쿠키 ✓ · 함수 없음 / /playback 제거 / 403 · s1 ≠ s2.
순서: 0–20 관문 등장 → 30–180 청록 패킷 「/live/s1/index.m3u8」이 관문을 차례로 지남. CloudFront를 지나면 「쿠키 ✓ · 함수 Bearer」, ALB를 지나면 「/live 제거」와 경로 이름표 「/s1/index.m3u8」, nginx 「원문 ✓」, MediaMTX에서 「CDN 비밀 ✓ 200」. 지난 관문은 청록 → 200 정지 → 200–326 빨간 패킷 「/playback/s1/list?path=s2」가 CloudFront(쿠키는 s1에 맞음) · ALB(접두사 제거 → /s1/list?path=s2)는 지나고 nginx 앞에서 멈춤, nginx 상자가 빨강으로 바뀌고 「403 · s1 ≠ s2」 이름표 → 360까지 정지.
끝 프레임(포스터 350): 위 줄은 네 관문 모두 청록이고 첫째 줄 이름표 넷, 아래 줄은 nginx에서 멈춘 빨간 패킷과 「403 · s1 ≠ s2」.
소재: 생성 이미지 없음. 수치 없음(개념도).
