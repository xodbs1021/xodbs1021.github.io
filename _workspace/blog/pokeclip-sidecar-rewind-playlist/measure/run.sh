#!/usr/bin/env bash
# 사이드카 되감기 목록 글의 공개 재측정.
#   MONO_DIR=<PokeClip-mono 클론> ./run.sh extract   — 627fb5a2 를 /tmp/dvr2w-run-<pid> 에 풀고 재측정 시험을 더한다
#   ./run.sh unit <결과 폴더>                          — PG 없이 도는 시험(boundary · rewind · cache · publish · 루프 사다리)
#   ./run.sh pg-up                                     — 라벨 붙인 postgres:17 컨테이너(데이터 tmpfs)
#   ./run.sh pg <결과 폴더>                            — 같은 패키지의 PG 통합 시험(GAP · 봉인 · 발행)
#   ./run.sh size <결과 폴더> · ./run.sh ladder <결과 폴더> — 목록 크기 실측 · 사다리 시간표
#   ./run.sh down                                      — 라벨 컨테이너와 /tmp/dvr2w-run-* 만 지운다
set -euo pipefail

COMMIT=627fb5a20ecb9d221fcc030c26adcbbcbe12c04e
HERE="$(cd "$(dirname "$0")" && pwd)"
STATE=/tmp/dvr2w-run.path
LABEL=com.techblog.bench=dvr2
PGNAME=dvr2w-pg
PGPORT=55437

tree() { cat "$STATE"; }

case "${1:-}" in
extract)
  : "${MONO_DIR:?MONO_DIR 에 PokeClip-mono 클론 경로}"
  dir="$(mktemp -d /tmp/dvr2w-run-XXXXXX)"
  git -C "$MONO_DIR" archive "$COMMIT" media | tar -x -C "$dir"
  cp "$HERE/dvr2test/rewind/zz_dvr2_size_test.go" "$dir/media/internal/rewind/"
  cp "$HERE/dvr2test/publish/zz_dvr2_ladder_timeline_test.go" "$dir/media/internal/rewind/publish/"
  echo "$dir" >"$STATE"
  echo "풀었음: $dir"
  ;;
unit)
  out="${2:?결과 폴더}"; mkdir -p "$out"
  cd "$(tree)/media"
  { date '+%Y-%m-%dT%H:%M:%S%z'; sw_vers 2>/dev/null || true; uname -m; go version; echo "commit $COMMIT"; } >"$out/env.txt"
  go test -count=1 -race ./internal/rewind/boundary/ ./internal/rewind/ ./internal/rewind/cache/ ./internal/rewind/publish/ ./internal/rewind/finalize/ 2>&1 | tee "$out/unit-rewind.txt"
  go test -count=1 -race -run 'Ladder|StallSeal|GapRun|Seal|Watch|EdgeBounds|PublishedRound' -v ./cmd/segment-indexer/ 2>&1 | grep -E '^(=== RUN|--- |ok|FAIL|PASS)' | tee "$out/unit-loop-ladder.txt"
  ;;
pg-up)
  docker run -d --name "$PGNAME" --label "$LABEL" -e POSTGRES_PASSWORD=bench -e POSTGRES_USER=bench -e POSTGRES_DB=bench \
    --tmpfs /var/lib/postgresql/data -p 127.0.0.1:$PGPORT:5432 postgres:17 >/dev/null
  for _ in $(seq 1 60); do docker exec "$PGNAME" pg_isready -U bench >/dev/null 2>&1 && break; sleep 1; done
  docker exec "$PGNAME" psql -U bench -tAc 'select version()'
  ;;
pg)
  out="${2:?결과 폴더}"; mkdir -p "$out"
  cd "$(tree)/media"
  docker exec "$PGNAME" psql -U bench -tAc 'select version()' >"$out/env-pg.txt"
  docker image inspect postgres:17 --format '{{index .RepoDigests 0}}' >>"$out/env-pg.txt"
  export PG_DSN="postgres://bench:bench@127.0.0.1:$PGPORT/bench?sslmode=disable" PG_TEST_DB=dvr2w_test
  go test -count=1 -p 1 ./internal/rewind/cache/ ./internal/rewind/publish/ 2>&1 | tee "$out/pg-rewind.txt"
  go test -count=1 -p 1 -run 'Gap|StallSeal|Seal|Ladder|Freeze|Endlist' -v ./internal/rewind/publish/ ./cmd/segment-indexer/ 2>&1 \
    | grep -E '^(=== RUN|--- |ok|FAIL|PASS)' >"$out/pg-gap-seal.txt"
  tail -3 "$out/pg-gap-seal.txt"
  ;;
size)
  out="${2:?결과 폴더}"; mkdir -p "$out"
  cd "$(tree)/media"
  DVR2_SIZE=1 DVR2_OUT="$out" go test -count=1 -run TestDVR2PlaylistSize -v ./internal/rewind/ 2>&1 | tee "$out/size.txt"
  ;;
ladder)
  out="${2:?결과 폴더}"; mkdir -p "$out"
  cd "$(tree)/media"
  DVR2_LADDER=1 go test -count=1 -run TestDVR2LadderTimeline -v ./internal/rewind/publish/ 2>&1 | tee "$out/ladder.txt"
  ;;
down)
  docker rm -f $(docker ps -aq --filter "label=$LABEL") 2>/dev/null || true
  if [ -f "$STATE" ]; then rm -rf "$(cat "$STATE")"; rm -f "$STATE"; fi
  docker ps -a --filter "label=$LABEL" --format '{{.Names}}'
  ls -d /tmp/dvr2w-run-* 2>/dev/null || echo "잔여 없음"
  ;;
*) sed -n 2,9p "$0"; exit 2 ;;
esac
