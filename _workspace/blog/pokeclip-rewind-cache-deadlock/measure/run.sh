#!/usr/bin/env bash
# 공개 재측정 — 「다른 상자가 먼저 넣은 조각 하나에 되감기 목록이 멈췄습니다」
#
#   MONO_DIR=<3K-PokeClip/PokeClip-mono 클론> ./run.sh extract   # 세 커밋을 /tmp/rewindw-{before,mid,after} 로 풀기(git archive — 클론은 읽기만)
#   ./run.sh unit  "$PWD/raw"                                    # PG 없이 도는 시험: 고치기 전 FAIL · 고친 뒤 PASS
#   ./run.sh pg-up                                               # PG17 컨테이너(라벨 com.techblog.bench=rewind)
#   ./run.sh pg    "$PWD/raw"                                    # PR 의 PG 시험(봉인 전 확인) · pgx 취소 탐침
#   ./run.sh down                                                # 라벨 컨테이너 · /tmp/rewindw-* 지우기
#
# 커밋(모두 공개 저장소 3K-PokeClip/PokeClip-mono):
#   before = 0dc13a68  PR 의 첫 커밋 c0b7696a 의 부모(develop)
#   mid    = 7c6f43c2  PR 셋째 커밋 — 캐시 재적재 · 감시 대조는 있고 봉인 전 확인은 없음
#   after  = 00cfa2d6  PR 529 develop 머지 커밋
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
BEFORE=0dc13a68be5c257dd7d6b85a2d528b018e3acac4
MID=7c6f43c252453ee5178c45d21d32a1c3c70194ec
AFTER=00cfa2d6e3f63594c5ab8aac9a26fd83d874b951
LABEL=com.techblog.bench=rewind
PG_NAME=techblog-rewind-pg17
PG_IMAGE=${PG_IMAGE:-postgres:17}
PG_PORT=${PG_PORT:-55491}
SECRET_FILE=/tmp/rewindw-pg.secret

tree() { echo "/tmp/rewindw-$1/media"; }

cmd_extract() {
  : "${MONO_DIR:?MONO_DIR 에 PokeClip-mono 클론 경로를 주십시오}"
  : > /tmp/rewindw-trees.txt
  for pair in before:$BEFORE mid:$MID after:$AFTER; do
    name=${pair%%:*} sha=${pair##*:}
    mkdir -p "/tmp/rewindw-$name"
    git -C "$MONO_DIR" archive "$sha" media | tar -x -C "/tmp/rewindw-$name"
    echo "$name $sha" >> /tmp/rewindw-trees.txt
  done
  # 고치기 전 트리에는 PR 의 회귀 시험 두 개와 도우미 pushRow 를 머지 커밋에서 그대로 옮겨 넣는다(줄 범위는 머지 커밋 기준).
  {
    printf 'package main\n\n// PokeClip-mono %s:media/cmd/segment-indexer/publish_loop_ladder_test.go 203–261 · 320–335행 그대로.\n\n' "$AFTER"
    printf 'import (\n\t"log/slog"\n\t"slices"\n\t"testing"\n\t"time"\n\n\t"github.com/3K-PokeClip/pokeclip-mono/media/internal/index"\n)\n\n'
    git -C "$MONO_DIR" show "$AFTER:media/cmd/segment-indexer/publish_loop_ladder_test.go" | sed -n '203,261p;320,335p'
  } > "$(tree before)/cmd/segment-indexer/zz_pr529_regression_test.go"
  cp "$HERE/rmtest/rm_watch_deadlock_test.go" "$(tree before)/cmd/segment-indexer/"
  cp "$HERE/rmtest/rm_watch_deadlock_test.go" "$(tree after)/cmd/segment-indexer/"
  cp "$HERE/rmtest/rm_seal_race_test.go" "$(tree mid)/cmd/segment-indexer/"
}

run_go() { # 이름 트리 패키지 실행정규식 → raw/<이름>.txt (종료 코드는 기록만)
  local name=$1 dir=$2 pkg=$3 re=$4 out=$5
  ( cd "$dir" && { echo "\$ (cd $(basename "$(dirname "$dir")")/media) go test -count=1 -race -p 1 -v -run '$re' $pkg"
    go test -count=1 -race -p 1 -v -run "$re" "$pkg" 2>&1; echo "exit=$?"; } ) > "$out/$name.txt" || true
}

cmd_unit() {
  local out=${1:?raw 폴더}
  mkdir -p "$out"
  { go version; date '+%Y-%m-%dT%H:%M:%S%z'; uname -mrs; cat /tmp/rewindw-trees.txt; } > "$out/env-unit.txt"
  local loop='^(TestLadderGapsRowWhosePushTheCacheMissed|TestLadderAlarmsViewBehindAfterMissedPush|TestRMWatchDoesNotBreakDeadlock)$'
  run_go before-loop "$(tree before)" ./cmd/segment-indexer/ "$loop" "$out"
  run_go after-loop  "$(tree after)"  ./cmd/segment-indexer/ "$loop" "$out"
  run_go mid-seal    "$(tree mid)"    ./cmd/segment-indexer/ '^TestRMSealRace' "$out"
  run_go after-seal  "$(tree after)"  ./cmd/segment-indexer/ '^(TestStallSealChecksLedgerAtSealTime|TestStallSealSealsTrueEndOnTime)$' "$out"
  # PR 이 더한 PG 없는 시험 전부(고친 뒤 트리)
  run_go after-pr-unit-cache   "$(tree after)" ./internal/rewind/cache/   '^(TestApplyInsertPastAMissedSeqDemandsLoad|TestDriftAuditCatchesRowMissingFromView|TestDriftAuditCatchesLedgerBeyondView|TestDriftLoadBacksOffOnLedgerHole|TestDriftBackoffClearsOnceTheHoleIsGone|TestObserveLedgerLastDemandsLoadWhenAhead|TestObserveLedgerLastHonoursHoleBackoff)$' "$out"
  run_go after-pr-unit-publish "$(tree after)" ./internal/rewind/publish/ '^(TestLadderAlarmSplitsViewBehindFromNoRow|TestLadderAlarmEscalatesOnlyToViewBehind|TestLadderNoSealWhileViewBehind)$' "$out"
  run_go after-pr-unit-loop    "$(tree after)" ./cmd/segment-indexer/    '^(TestWatchAloneRecoversNewSessionBeyondStuckRow|TestStallSealOnTimeWhenRenewHeldLaneBefore|TestStallSealKeepsGapRetryBeforeSeal|TestStallSealLedgerFailedRetriesEachTickWarnsOnce|TestStallSealOffSealsNothing)$' "$out"
}

cmd_pg_up() {
  [ -f "$SECRET_FILE" ] || { umask 077; openssl rand -hex 16 > "$SECRET_FILE"; }
  docker run -d --name "$PG_NAME" --label "$LABEL" \
    -e POSTGRES_PASSWORD="$(cat "$SECRET_FILE")" -e POSTGRES_DB=rmadmin \
    --tmpfs /var/lib/postgresql/data -p "127.0.0.1:$PG_PORT:5432" "$PG_IMAGE" >/dev/null
  for _ in $(seq 1 60); do docker exec "$PG_NAME" pg_isready -U postgres -d rmadmin >/dev/null 2>&1 && break; sleep 1; done
  docker exec "$PG_NAME" pg_isready -U postgres -d rmadmin
}

cmd_pg() {
  local out=${1:?raw 폴더}
  mkdir -p "$out"
  local dsn="postgres://postgres:$(cat "$SECRET_FILE")@127.0.0.1:$PG_PORT/rmadmin?sslmode=disable"
  { docker exec "$PG_NAME" postgres --version; docker image inspect "$PG_IMAGE" --format '{{index .RepoDigests 0}}'; } > "$out/env-pg.txt"
  ( cd "$(tree after)" && { echo "\$ (cd after/media) REQUIRE_PG=1 PG_DSN=<가림> PG_TEST_DB=rmtest go test -count=1 -race -p 1 -v -run '^TestEndlistIfCaughtUp' ./internal/rewind/publish/"
      REQUIRE_PG=1 PG_DSN="$dsn" PG_TEST_DB=rmtest go test -count=1 -race -p 1 -v -run '^TestEndlistIfCaughtUp' ./internal/rewind/publish/ 2>&1; echo "exit=$?"; } ) \
    > "$out/after-pg-endlist.txt" || true
  ( cd "$HERE/pgxcancel" && { echo "\$ (cd pgxcancel) go run . -dsn <가림> -rounds 5"
      go run . -dsn "$dsn" -rounds 5 2>&1; echo "exit=$?"; } ) > "$out/pgx-cancel.txt" || true
}

cmd_down() {
  docker ps -aq --filter "label=$LABEL" | xargs -r docker rm -f -v >/dev/null
  rm -rf /tmp/rewindw-before /tmp/rewindw-mid /tmp/rewindw-after /tmp/rewindw-trees.txt "$SECRET_FILE"
  docker ps -a --filter "label=$LABEL" --format '{{.Names}}' | wc -l | xargs echo "labeled containers:"
}

case "${1:-}" in
  extract) cmd_extract ;;
  unit) shift; cmd_unit "$@" ;;
  pg-up) cmd_pg_up ;;
  pg) shift; cmd_pg "$@" ;;
  down) cmd_down ;;
  *) sed -n '2,15p' "$0"; exit 2 ;;
esac
