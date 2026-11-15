#!/usr/bin/env bash
# 공개 재측정 실행기 — 가짜 IMDS · 실제 cred-relay(PokeClip-mono PR 519 머지 커밋에서 빌드) · Go SDK 소비자.
#
#   MONO_DIR=<PokeClip-mono 클론> ./run.sh build   # 머지 커밋의 media 모듈에서 cred-relay · imdsprobe 를 빌드한다
#   ./run.sh up                                     # 망 · 토큰 볼륨을 만든다
#   ./run.sh measure <출력 폴더>                    # 경우 A–D 를 돌리고 원자료를 남긴다(약 9분)
#   ./run.sh down                                   # 라벨이 붙은 컨테이너 · 망 · 볼륨과 작업 폴더를 지운다
#
# 실제 AWS 자격 · 주소는 쓰지 않는다. 가짜 IMDS 가 가짜 자격만 낸다. 홉 상한(응답 TTL)은 흉내 내지 않는다 —
# 창구는 운영에서 호스트 망에 있지만 여기서는 같은 브리지 망의 컨테이너다. 창구 포트는 운영 값이 아니라 8080 이다.
#
# 바꿀 수 있는 값(환경 변수): MONO_DIR · IMDSW_WORK · IMDSW_LABEL
# macOS 기본 bash 3.2 에서도 돈다(빈 배열은 ${a[@]+…} 꼴로 편다).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${IMDSW_WORK:-/tmp/imdsw-work}"
LABEL="${IMDSW_LABEL:-com.techblog.bench=imds-relay}"
COMMIT=ff0ac799235635e9e2b0d98d31a0ed0406d7a30e   # PR 519 develop 머지 커밋(2026-11-16 06:51 KST)
GO_IMAGE="golang:1.27.3-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb"
PY_IMAGE="python:3.12-alpine@sha256:d09d15e60962ca365d1cd544a48773bac9d33f2fb1b00f2aa0deec78ade7dc31"
RUN_IMAGE="alpine:3.24@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b"
NET=imdsw-net
IMDS_IP=169.254.169.254
RELAY_IP=169.254.170.2
RELAY_PORT=8080
RELAY_URL="http://${RELAY_IP}:${RELAY_PORT}/v1/credentials"

# --- 컨테이너 도우미 -------------------------------------------------------------------------------------------

start_imds() { # $1 = 역할 자격 만료(지금부터 초)
  docker rm -f imdsw-imds >/dev/null 2>&1 || true
  docker run -d --name imdsw-imds --label "$LABEL" --network "$NET" --ip "$IMDS_IP" \
    -e ROLE_EXPIRES_S="$1" -e SLOW_S=3 -v "$HERE/fakeimds.py:/app/fakeimds.py:ro" \
    "$PY_IMAGE" python -u /app/fakeimds.py >/dev/null
  for _ in $(seq 1 50); do
    docker exec imdsw-imds python -c 'import urllib.request as u;u.urlopen("http://127.0.0.1/_bench/state")' 2>/dev/null && return 0
    sleep 0.2
  done
  echo "가짜 IMDS 가 뜨지 않았다" >&2; docker logs imdsw-imds >&2; return 1
}

start_relay() { # 운영 compose 렌더의 cred-relay 와 같은 제약: uid 10001 · 읽기 전용 루트 · cap 없음 · 특권 상승 금지
  docker rm -f imdsw-relay >/dev/null 2>&1 || true
  docker run -d --name imdsw-relay --label "$LABEL" --network "$NET" --ip "$RELAY_IP" \
    --user 10001:10001 --read-only --cap-drop ALL --security-opt no-new-privileges:true \
    -v "$WORK/bin/cred-relay:/usr/local/bin/cred-relay:ro" \
    -v imdsw-tok-relay:/run/secrets/cred-relay:ro \
    -e CRED_RELAY_LISTEN="${RELAY_IP}:${RELAY_PORT}" \
    -e CRED_RELAY_CALLER_DIR=/run/secrets/cred-relay \
    -e CRED_RELAY_CALLERS=indexer,janitor \
    "$RUN_IMAGE" /usr/local/bin/cred-relay serve >/dev/null
  for _ in $(seq 1 30); do
    client once --label ready --path /healthz 2>/dev/null | grep -q '"status": 204' && return 0
    sleep 0.2
  done
  echo "창구가 뜨지 않았다" >&2; docker logs imdsw-relay >&2; return 1
}

fresh() { # $1 = 만료 초. 가짜 IMDS 와 창구를 새로 띄운다(창구 캐시 비움)
  start_imds "$1"
  start_relay
}

client() { # 토큰 없는 클라이언트(망 칸 따로)
  docker run --rm --label "$LABEL" --network "$NET" -v "$HERE/client.py:/app/client.py:ro" \
    -e RELAY_HOST="$RELAY_IP" -e RELAY_PORT="$RELAY_PORT" "$PY_IMAGE" python /app/client.py "$@"
}

client_as() { # $1 = indexer|janitor — 그 소비자의 토큰 볼륨을 붙이고 그 uid 로 돈다
  local who="$1" uid; shift
  case "$who" in indexer) uid=10001 ;; janitor) uid=10002 ;; esac
  docker run --rm --label "$LABEL" --network "$NET" --user "$uid:$uid" --cap-drop ALL \
    -v "$HERE/client.py:/app/client.py:ro" -v "imdsw-tok-$who:/run/secrets/aws-cred:ro" \
    -e RELAY_HOST="$RELAY_IP" -e RELAY_PORT="$RELAY_PORT" "$PY_IMAGE" \
    python /app/client.py "$@" --token-file /run/secrets/aws-cred/token
}

probe() { # $1 = 망 인자(--network …), 나머지는 docker run 인자 뒤 -- 다음이 imdsprobe 인자
  local net="$1"; shift
  local args=()
  while [ "$#" -gt 0 ] && [ "$1" != "--" ]; do args+=("$1"); shift; done
  [ "${1:-}" = "--" ] && shift
  docker run --rm --label "$LABEL" $net --user 10001:10001 --cap-drop ALL \
    -v "$WORK/bin/imdsprobe:/usr/local/bin/imdsprobe:ro" ${args[@]+"${args[@]}"} "$RUN_IMAGE" \
    /usr/local/bin/imdsprobe "$@" || true
}

sidecar_env=(-v imdsw-tok-indexer:/run/secrets/aws-cred:ro
  -e AWS_CONTAINER_CREDENTIALS_FULL_URI="$RELAY_URL"
  -e AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE=/run/secrets/aws-cred/token
  -e AWS_EC2_METADATA_DISABLED=true)

imds_state() { docker exec imdsw-imds python -c 'import urllib.request as u;print(u.urlopen("http://127.0.0.1/_bench/state").read().decode())'; }
imds_mode() { docker exec imdsw-imds python -c "import urllib.request as u;u.urlopen(u.Request('http://127.0.0.1/_bench/mode?m=$1',method='POST'))"; }
relay_log() { docker logs imdsw-relay 2>&1; }
mark() { printf '### %s\n' "$*"; }

# --- 하위 명령 -------------------------------------------------------------------------------------------------

cmd_build() {
  : "${MONO_DIR:?PokeClip-mono 클론 경로를 MONO_DIR 로 주세요(git clone https://github.com/3K-PokeClip/PokeClip-mono)}"
  rm -rf "$WORK/src" "$WORK/bin"
  mkdir -p "$WORK/src" "$WORK/bin"
  git -C "$MONO_DIR" archive "$COMMIT" media | tar -x -C "$WORK/src"
  mkdir -p "$WORK/src/media/cmd/imdsprobe"
  cp "$HERE/probe/main.go" "$WORK/src/media/cmd/imdsprobe/main.go"
  docker volume create --label "$LABEL" imdsw-gomod >/dev/null
  docker run --rm --label "$LABEL" -v "$WORK/src/media:/src" -v imdsw-gomod:/go/pkg/mod -v "$WORK/bin:/out" \
    -w /src -e CGO_ENABLED=0 -e GOFLAGS=-mod=readonly "$GO_IMAGE" sh -ec '
      go version
      go build -trimpath -o /out/cred-relay ./cmd/cred-relay
      go build -trimpath -o /out/imdsprobe ./cmd/imdsprobe
      go version -m /out/cred-relay | grep -E "^\s*(path|dep\s+github.com/aws|build\s+(GOOS|GOARCH|CGO_ENABLED|-trimpath))"
      go version -m /out/imdsprobe | grep -E "^\s*(path|dep\s+github.com/aws/aws-sdk-go-v2(/config|/credentials)?\s)"
      sha256sum /out/cred-relay /out/imdsprobe'
}

cmd_up() {
  docker network create --label "$LABEL" --subnet 169.254.0.0/16 --gateway 169.254.0.1 "$NET" >/dev/null
  for v in relay indexer janitor; do docker volume create --label "$LABEL" "imdsw-tok-$v" >/dev/null; done
  # 운영 시작 스크립트와 같은 꼴: 호출자마다 64자 토큰 · 끝 개행 없음 · 0400. 창구 사본은 호출자 이름 파일.
  docker run --rm --label "$LABEL" -v imdsw-tok-relay:/r -v imdsw-tok-indexer:/i -v imdsw-tok-janitor:/j \
    "$RUN_IMAGE" sh -ec '
      gen() { head -c 32 /dev/urandom | od -An -tx1 | tr -d " \n"; }
      ti=$(gen); tj=$(gen)
      printf %s "$ti" > /i/token; printf %s "$tj" > /j/token
      printf %s "$ti" > /r/indexer; printf %s "$tj" > /r/janitor
      chown 10001:10001 /i/token /r/indexer /r/janitor; chown 10002:10002 /j/token
      chmod 0400 /i/token /j/token /r/indexer /r/janitor
      chown 0:0 /i /j; chmod 0711 /i /j; chown 0:10001 /r; chmod 0750 /r
      ls -ln /i /j /r | sed -E "s/[0-9a-f]{64}/<토큰>/g"
      wc -c /i/token /j/token'
}

cmd_measure() {
  local out="${1:?출력 폴더를 주세요}"
  mkdir -p "$out"
  {
    date -u +%Y-%m-%dT%H:%M:%SZ
    TZ=Asia/Seoul date '+%Y-%m-%dT%H:%M:%S%z'
    docker version --format 'docker {{.Server.Version}} {{.Server.Os}}/{{.Server.Arch}}'
    docker info --format 'kernel {{.KernelVersion}} · {{.OperatingSystem}} · CPU {{.NCPU}}'
    for i in "$GO_IMAGE" "$PY_IMAGE" "$RUN_IMAGE"; do echo "image $i"; done
    echo "commit $COMMIT"
    sha256sum "$WORK/bin/cred-relay" "$WORK/bin/imdsprobe" 2>/dev/null || shasum -a 256 "$WORK/bin/cred-relay" "$WORK/bin/imdsprobe"
  } > "$out/env.txt"

  # A. 실제 만료별로 창구가 보낸 Expiration
  {
    for e in 21600 7200 5400 1800 600; do
      fresh "$e"
      mark "A real_expires_s=$e"
      imds_state
      client_as indexer once --label "A-$e"
      relay_log | grep '"cred_served"'
    done
  } > "$out/A-expiry.txt"

  # B. 토큰 대조 — 토큰 없음 · 틀린 토큰 · 두 소비자 · 다른 경로 · 다른 메서드
  {
    fresh 21600
    mark "B no-auth";       client once --label B-no-auth
    mark "B wrong-token";   client once --label B-wrong --auth not-a-caller-token
    mark "B indexer";       client_as indexer once --label B-indexer
    mark "B janitor";       client_as janitor once --label B-janitor
    mark "B healthz";       client once --label B-healthz --path /healthz
    mark "B post";          client_as indexer once --label B-post --method POST
    mark "B other-path";    client once --label B-other --path /latest/meta-data/
    mark "B relay log";     relay_log
  } > "$out/B-auth.txt"

  # B2 · C1. 같은 망 칸: MediaMTX 역(망 칸 주인) · 사이드카 역(토큰 있음) · 이웃(토큰 없음)
  {
    fresh 21600
    docker rm -f imdsw-mtx >/dev/null 2>&1 || true
    docker run -d --name imdsw-mtx --label "$LABEL" --network "$NET" --user 65534:65534 --cap-drop ALL \
      "$RUN_IMAGE" sleep 3600 >/dev/null
    mark "B2 mtx-ip $(docker inspect -f '{{(index .NetworkSettings.Networks "imdsw-net").IPAddress}}' imdsw-mtx)"
    mark "C1 sidecar-role SDK, 5초 간격 13회(60초)"
    probe "--network container:imdsw-mtx" "${sidecar_env[@]}" -- -n 13 -every 5s
    mark "B2 neighbor-token-file"
    docker run --rm --label "$LABEL" --network container:imdsw-mtx --user 65534:65534 --cap-drop ALL "$RUN_IMAGE" \
      sh -c 'ls /run/secrets/aws-cred/token 2>&1 || true'
    mark "B2 neighbor-request"
    docker run --rm --label "$LABEL" --network container:imdsw-mtx --user 65534:65534 --cap-drop ALL \
      -v "$HERE/client.py:/app/client.py:ro" -e RELAY_HOST="$RELAY_IP" -e RELAY_PORT="$RELAY_PORT" "$PY_IMAGE" \
      python /app/client.py once --label B2-neighbor
    mark "B2 relay log"; relay_log
    mark "B2 imds state"; imds_state
    docker rm -f imdsw-mtx >/dev/null
  } > "$out/B2-netns.txt"

  # C2. 창구가 실제 만료 6분을 그대로 보낼 때 SDK 가 언제 다시 묻나(SDK 캐시 창 5분)
  {
    fresh 360
    mark "C2 sidecar-role SDK, 10초 간격 16회(150초), real_expires_s=360"
    probe "--network $NET" "${sidecar_env[@]}" -- -n 16 -every 10s
    mark "C2 relay log"; relay_log | grep '"cred_served"'
  } > "$out/C2-sdk-window.txt"

  # C3 · C4 · C5. 토큰 파일 끝 개행 · 허용 목록 밖 주소 · 창구가 없을 때 IMDS 로 내려가나 · 대조(창구 변수 없음)
  {
    fresh 21600
    mark "C3 token-file-with-newline"
    docker run --rm --label "$LABEL" --network "$NET" --user 10001:10001 --cap-drop ALL \
      -v "$WORK/bin/imdsprobe:/usr/local/bin/imdsprobe:ro" -v imdsw-tok-indexer:/run/secrets/aws-cred:ro \
      -e AWS_CONTAINER_CREDENTIALS_FULL_URI="$RELAY_URL" -e AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE=/tmp/t \
      -e AWS_EC2_METADATA_DISABLED=true --tmpfs /tmp "$RUN_IMAGE" \
      sh -c 'printf "%s\n" "$(cat /run/secrets/aws-cred/token)" > /tmp/t; /usr/local/bin/imdsprobe || true'
    mark "C4 host-not-allowed 169.254.170.3"
    probe "--network $NET" -v imdsw-tok-indexer:/run/secrets/aws-cred:ro \
      -e AWS_CONTAINER_CREDENTIALS_FULL_URI="http://169.254.170.3:${RELAY_PORT}/v1/credentials" \
      -e AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE=/run/secrets/aws-cred/token --
    docker stop imdsw-relay >/dev/null
    mark "C5 relay-stopped imds-before"; imds_state
    mark "C5 relay-stopped SDK with container vars (AWS_EC2_METADATA_DISABLED 없음)"
    probe "--network $NET" -v imdsw-tok-indexer:/run/secrets/aws-cred:ro \
      -e AWS_CONTAINER_CREDENTIALS_FULL_URI="$RELAY_URL" \
      -e AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE=/run/secrets/aws-cred/token --
    mark "C5 imds-after"; imds_state
    mark "C5 control: no container vars → SDK IMDS provider"
    probe "--network $NET" --
    mark "C5 imds-after-control"; imds_state
  } > "$out/C3-C5-sdk.txt"

  # D1 · D2. 원천 재조회: 실제 만료 10분(15분 창 안)과 6시간, 3초 간격 14회
  {
    for e in 600 21600; do
      fresh "$e"
      mark "D real_expires_s=$e"
      client_as indexer series --label "D-$e" --every 3 --count 14
      mark "D relay log"; relay_log | grep -E '"cred_served"|"cred_source'
      mark "D imds state"; imds_state
    done
  } > "$out/D1-D2-refresh.txt"

  # D3. 첫 원천 호출이 3초 걸리면(원천 상한 2초) — 줄 자격이 없어 503
  {
    fresh 21600
    imds_mode slow
    mark "D3 imds slow 3s, first request"
    client_as indexer once --label D3-slow
    mark "D3 relay log"; relay_log | grep -v cred_relay_started
  } > "$out/D3-deadline.txt"

  # D4. 실제 만료 3분에서 첫 자격을 받은 뒤 IMDS 가 실패하면 — 실제 만료 1분 전까지 마지막 자격
  {
    fresh 180
    mark "D4 first"
    client_as indexer once --label D4-first
    imds_mode fail
    mark "D4 imds fail, 10초 간격 15회"
    client_as indexer series --label D4 --every 10 --count 15
    mark "D4 relay log"; relay_log
    mark "D4 imds state"; imds_state
  } > "$out/D4-degraded.txt"

  docker rm -f imdsw-relay imdsw-imds >/dev/null 2>&1 || true
  TZ=Asia/Seoul date '+finished %Y-%m-%dT%H:%M:%S%z' >> "$out/env.txt"
}

cmd_down() {
  docker ps -aq --filter "label=$LABEL" | xargs -r docker rm -f >/dev/null
  docker network ls -q --filter "label=$LABEL" | xargs -r docker network rm >/dev/null
  docker volume ls -q --filter "label=$LABEL" | xargs -r docker volume rm >/dev/null
  rm -rf "$WORK"
  docker ps -a --filter "label=$LABEL"
  docker network ls --filter "label=$LABEL"
  docker volume ls --filter "label=$LABEL"
}

case "${1:-}" in
  build) cmd_build ;;
  up) cmd_up ;;
  measure) cmd_measure "${2:-}" ;;
  down) cmd_down ;;
  *) echo "쓰임: $0 build | up | measure <출력 폴더> | down" >&2; exit 2 ;;
esac
