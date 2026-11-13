# 측정 메모(2026-11-13 리뷰 뒤 추가)
- c1-set1.txt · c1-set2.txt의 `shield_requests` 값은 실드 컨테이너의 `docker logs`에서 이름이 든 줄 수다. nginx:1-alpine 이미지 기본 설정(nginx.conf 22행 `access_log /var/log/nginx/access.log main;`, access.log → /dev/stdout)과 shield.conf의 `access_log /dev/stdout t;`가 같은 요청을 두 번 찍으므로 실제 요청 수의 두 배다(합치기 켬 2층: 8 → 실제 4).
- 실제 요청 수는 내가 정한 형식(t: `$msec $remote_addr "$request" $status $upstream_cache_status $request_time`)의 줄만 세면 나온다. c1-shield-lock-times.txt가 그 줄만 뽑은 것이고, 회차마다 MISS 1 + HIT 3 = 4줄(엣지 4대에서 1건씩)이다.
- 원본 요청 수(origin.log)는 원본 서버가 요청마다 한 줄만 쓰므로 이중 기록이 없다.
