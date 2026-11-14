#!/usr/bin/env bash
# 재측정 실행기. PostgreSQL 컨테이너 하나를 라벨을 붙여 띄우고, 장부를 세우고, 재고, 지운다.
#
#   ./run.sh up                # 컨테이너를 띄우고 schema.sql · seed.sql 을 넣는다
#   ./run.sh measure <출력 폴더> # measure.py 를 돌린다
#   ./run.sh down              # 라벨이 붙은 컨테이너 · 볼륨만 지운다
#
# 바꿀 수 있는 값(환경 변수): CHATQ_IMAGE · CHATQ_CONTAINER · CHATQ_PORT · CHATQ_LABEL
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
IMAGE="${CHATQ_IMAGE:-postgres:17.12}"
NAME="${CHATQ_CONTAINER:-chatq-pg}"
PORT="${CHATQ_PORT:-55433}"
LABEL="${CHATQ_LABEL:-com.techblog.bench=chatq}"
VOLUME="${NAME}-data"
PSQL=(docker exec -i "$NAME" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d chatq)

case "${1:-}" in
  up)
    docker volume create --label "$LABEL" "$VOLUME" >/dev/null
    docker run -d --name "$NAME" --label "$LABEL" \
      -e POSTGRES_PASSWORD=bench -e POSTGRES_DB=chatq \
      -p "127.0.0.1:${PORT}:5432" -v "${VOLUME}:/var/lib/postgresql/data" \
      "$IMAGE" >/dev/null
    until docker exec "$NAME" pg_isready -U postgres -d chatq >/dev/null 2>&1; do sleep 1; done
    sleep 2
    "${PSQL[@]}" < "$HERE/schema.sql"
    "${PSQL[@]}" < "$HERE/seed.sql"
    "${PSQL[@]}" -A -t -c "SELECT count(*) FROM public.stream_segments;"
    ;;
  measure)
    out="${2:?출력 폴더를 주세요}"
    CHATQ_PSQL="docker exec -i $NAME psql -X -q -A -t -v ON_ERROR_STOP=1 -U postgres -d chatq" \
      python3 -I "$HERE/measure.py" "$out"
    ;;
  down)
    docker ps -aq --filter "label=$LABEL" | xargs -r docker rm -f >/dev/null
    docker volume ls -q --filter "label=$LABEL" | xargs -r docker volume rm >/dev/null
    docker ps -a --filter "label=$LABEL"
    docker volume ls --filter "label=$LABEL"
    ;;
  *)
    echo "쓰임: $0 up | measure <출력 폴더> | down" >&2
    exit 2
    ;;
esac
