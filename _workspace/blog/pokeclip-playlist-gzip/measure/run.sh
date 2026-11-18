#!/usr/bin/env bash
# 목록 gzip 글의 공개 재측정.
#   MONO_DIR=<PokeClip-mono 클론> ./run.sh extract — 31f2f32d 의 media/ 를 /tmp/gzipw-run-* 에 풀고 재측정 시험을 더한다
#   ./run.sh size <결과 폴더>    — 1시간 목록 본문을 Render 로 만들고 원본 · gzip · brotli 크기와 4초마다 받을 때의 전송률
#   ./run.sh nginx <결과 폴더>   — 라벨 붙인 nginx:alpine 한 컨테이너에서 Content-Length · chunked · gzip_proxied 대조
#   ./run.sh down                — 라벨 컨테이너와 /tmp/gzipw-* 만 지우고 잔여를 보인다
set -euo pipefail

COMMIT=31f2f32d77650c3f20ac5318cc3a95d875fc8cbf
HERE="$(cd "$(dirname "$0")" && pwd)"
STATE=/tmp/gzipw-run.path
LABEL=com.techblog.bench=gzip
NAME=gzipw-nginx
IMAGE=nginx@sha256:e7257f1ef28ba17cf7c248cb8ccf6f0c6e0228ab9c315c152f9c203cd34cf6d1 # nginx:alpine 1.29.7
RELOAD_S=4 # 4초 조각 → 목록을 다시 받는 간격(RFC 8216bis 6.3.4)

tree() { cat "$STATE"; }

case "${1:-}" in
extract)
  : "${MONO_DIR:?MONO_DIR 에 PokeClip-mono 클론 경로}"
  dir="$(mktemp -d /tmp/gzipw-run-XXXXXX)"
  git -C "$MONO_DIR" archive "$COMMIT" media | tar -x -C "$dir"
  cp "$HERE/gzipwtest/rewind/zz_gzipw_size_test.go" "$dir/media/internal/rewind/"
  echo "$dir" >"$STATE"
  echo "풀었음: $dir"
  ;;
size)
  out="${2:?결과 폴더}"; mkdir -p "$out"
  bodies="$(tree)/bodies"; mkdir -p "$bodies"
  { date '+%Y-%m-%dT%H:%M:%S%z'; sw_vers 2>/dev/null || true; uname -m; go version; brotli --version; gzip --version 2>&1 | head -1; echo "commit $COMMIT"; } >"$out/env.txt"
  (cd "$(tree)/media" && GZIPW_OUT="$bodies" go test -count=1 -run TestGzipwPlaylistBodies -v ./internal/rewind/) 2>&1 | tee "$out/bodies.txt"
  {
    echo "| 경우 | 원본 B | gzip -6 B | gzip -9 B | brotli -q 5 B | brotli -q 11 B | 원본 KB/s | 원본 kbps | gzip -6 KB/s | gzip -6 kbps | brotli -q 11 kbps |"
    echo "|---|---|---|---|---|---|---|---|---|---|---|"
    for f in "$bodies"/*.m3u8; do
      n=$(basename "$f" .m3u8)
      raw=$(wc -c <"$f" | tr -d ' ')
      g6=$(gzip -c -n -6 <"$f" | wc -c | tr -d ' ')
      g9=$(gzip -c -n -9 <"$f" | wc -c | tr -d ' ')
      b5=$(brotli -c -q 5 <"$f" | wc -c | tr -d ' ')
      b11=$(brotli -c -q 11 <"$f" | wc -c | tr -d ' ')
      # KB = 1,000 B · kbps = 1,000 bit/s
      awk -v n="$n" -v r="$raw" -v g6="$g6" -v g9="$g9" -v b5="$b5" -v b11="$b11" -v s="$RELOAD_S" 'BEGIN {
        printf "| %s | %d | %d | %d | %d | %d | %.2f | %.1f | %.2f | %.1f | %.1f |\n", n, r, g6, g9, b5, b11,
          r/s/1000, r*8/s/1000, g6/s/1000, g6*8/s/1000, b11*8/s/1000 }'
    done
  } | tee "$out/size.md"
  cp "$bodies/s08_gap1.m3u8" "$out/sample-s08_gap1.m3u8"
  ;;
nginx)
  out="${2:?결과 폴더}"; mkdir -p "$out"
  work="$(mktemp -d /tmp/gzipw-nginx-XXXXXX)"
  body="$(tree)/bodies/s08_gap1.m3u8"
  test -f "$body" || { echo "먼저 ./run.sh size"; exit 1; }
  (cd "$HERE/nginx" && CGO_ENABLED=0 GOOS=linux GOARCH="$(go env GOARCH)" go build -o "$work/upstream" upstream.go)
  mkdir -p "$work/static/dvr"
  cp "$body" "$work/static/dvr/index.m3u8"
  cp "$body" "$work/body.m3u8"
  docker run -d --name "$NAME" --label "$LABEL" \
    -v "$HERE/nginx/nginx.conf:/etc/nginx/gzipw.conf:ro" -v "$work:/srv:ro" \
    -p 127.0.0.1:18080-18084:8080-8084 -p 127.0.0.1:18888:8888 \
    --entrypoint /bin/sh "$IMAGE" -c '/srv/upstream -addr 0.0.0.0:8888 -body /srv/body.m3u8 & exec nginx -c /etc/nginx/gzipw.conf -g "daemon off;"' >/dev/null
  for _ in $(seq 1 30); do curl -sf -o /dev/null http://127.0.0.1:18080/dvr/index.m3u8 && curl -sf -o /dev/null http://127.0.0.1:18888/full.m3u8 && break; sleep 0.5; done
  { docker exec "$NAME" nginx -v 2>&1; docker image inspect "$IMAGE" --format '{{index .RepoDigests 0}}'; docker version --format 'docker {{.Server.Version}}'; } >"$out/env-nginx.txt"
  probe() { # 이름 포트 경로 [Via 머리]
    local name="$1" port="$2" path="$3" via="${4:-}" hdr
    hdr="$(mktemp /tmp/gzipw-hdr-XXXXXX)"
    if [ -n "$via" ]; then
      dl=$(curl --http1.1 -s -D "$hdr" -o /dev/null -w '%{size_download}' -H 'Accept-Encoding: gzip' -H "Via: $via" "http://127.0.0.1:$port$path")
    else
      dl=$(curl --http1.1 -s -D "$hdr" -o /dev/null -w '%{size_download}' -H 'Accept-Encoding: gzip' "http://127.0.0.1:$port$path")
    fi
    { echo "### $name — :$port$path via=${via:-없음}"; tr -d '\r' <"$hdr"; } >>"$out/nginx-headers.txt"
    h() { tr -d '\r' <"$hdr" | awk -v k="$1" 'BEGIN{IGNORECASE=1} tolower($0) ~ "^"tolower(k)":" {sub(/^[^:]*: */,""); print; exit}'; }
    printf '| %s | %s | %s | %s | %s | %s | %s |\n' "$name" "${via:+있음}" "$(h Content-Length || true)" "$(h Transfer-Encoding || true)" "$(h Content-Encoding || true)" "$dl" "$(head -1 "$hdr" | tr -d '\r')"
    rm -f "$hdr"
  }
  : >"$out/nginx-headers.txt"
  {
    echo "| 경우 | Via | Content-Length | Transfer-Encoding | Content-Encoding | 받은 B | 상태 |"
    echo "|---|---|---|---|---|---|---|"
    probe "(a) nginx 정적 파일" 18080 /dvr/index.m3u8
    probe "상류 직접 · 2,048B" 18888 /bytes/2048.m3u8
    probe "상류 직접 · 2,049B" 18888 /bytes/2049.m3u8
    probe "상류 직접 · 1시간 목록" 18888 /full.m3u8
    probe "(b) 프록시 · buffering off · 2,048B" 18081 /bytes/2048.m3u8
    probe "(b) 프록시 · buffering off · 2,049B" 18081 /bytes/2049.m3u8
    probe "(b) 프록시 · buffering off · 1시간 목록" 18081 /full.m3u8
    probe "(b) 대조 · buffering on · 2,049B" 18082 /bytes/2049.m3u8
    probe "(b) 대조 · buffering on · 1시간 목록" 18082 /full.m3u8
    probe "(c) gzip on · gzip_proxied 기본 · Via 없음" 18083 /full.m3u8
    probe "(c) gzip on · gzip_proxied 기본 · Via 있음" 18083 /full.m3u8 '1.1 example.cloudfront.net (CloudFront)'
    probe "(c) gzip on · gzip_proxied any · Via 있음" 18084 /full.m3u8 '1.1 example.cloudfront.net (CloudFront)'
  } | tee "$out/nginx.md"
  docker rm -f "$NAME" >/dev/null
  rm -rf "$work"
  ;;
down)
  docker rm -f $(docker ps -aq --filter "label=$LABEL") 2>/dev/null || true
  if [ -f "$STATE" ]; then rm -rf "$(cat "$STATE")"; rm -f "$STATE"; fi
  rm -rf /tmp/gzipw-nginx-* /tmp/gzipw-hdr-*
  echo "컨테이너: $(docker ps -aq --filter "label=$LABEL" | wc -l | tr -d ' ')"
  ls -d /tmp/gzipw-* 2>/dev/null || echo "/tmp/gzipw-* 잔여 없음"
  ;;
*) sed -n 2,6p "$0"; exit 2 ;;
esac
