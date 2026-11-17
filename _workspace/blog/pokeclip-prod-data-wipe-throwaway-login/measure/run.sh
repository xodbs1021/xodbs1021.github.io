#!/usr/bin/env bash
# 공개 재측정 — 「운영 DB를 지우는 데 마스터 대신 일회용 계정을 썼습니다」.
#
# 필요한 것: bash · Docker · python3 · openssl. (확인한 곳: macOS 27 · OrbStack)
# 쓰는 것: 라벨 com.techblog.bench=wipe-oneoff 를 붙인 컨테이너 둘(wipe-pg · wipe-proxy)과
# 망 하나(wipe-net), 그리고 /tmp/wipe-run/ 아래 임시 파일. 끝나거나 중간에 멈춰도 EXIT
# trap 이 라벨로 고른 컨테이너 · 망과 임시 파일을 지운다(`./run.sh down` 으로도 지운다).
#
# 비밀번호는 실행마다 openssl 로 새로 만든다. 값은 명령 줄에 쓰지 않고, 이 셸의 환경 변수에서
# `docker run -e NAME` · `docker exec -e NAME` 으로 상속해 컨테이너 환경 변수와 컨테이너 안의
# PGPASSFILE 로 넘긴다. 컨테이너와 함께 지워지고, raw/ 에는 남지 않는다.
#
# 사용: ./run.sh [출력 폴더]   (기본 raw/)
#       ./run.sh down          (자원 정리)
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
LABEL="com.techblog.bench=wipe-oneoff"
PG="wipe-pg"
PROXY="wipe-proxy"
NET="wipe-net"
TMP="/tmp/wipe-run"
PG_IMAGE="postgres:17"
PY_IMAGE="python:3.13-slim"
PROXY_PORT=6543
PASSFILE_IN="/tmp/wipe-pgpass"   # 컨테이너 안 경로

containers_down() {
  docker ps -aq --filter "label=$LABEL" | xargs docker rm -f >/dev/null 2>&1
  docker network ls -q --filter "label=$LABEL" | xargs docker network rm >/dev/null 2>&1
  return 0
}
down() {
  containers_down
  rm -f "$TMP/pgpass"
  rmdir "$TMP" 2>/dev/null
  return 0
}
if [ "${1:-}" = "down" ]; then down; exit 0; fi
trap down EXIT

OUT="${1:-$HERE/raw}"
mkdir -p "$OUT" "$TMP"
chmod 700 "$TMP"

# ---------- 비밀값(실행 때 생성) ----------
export POSTGRES_PASSWORD WIPE_MASTER_PW WIPE_ONEOFF_PW
POSTGRES_PASSWORD="$(openssl rand -hex 16)"
WIPE_MASTER_PW="$(openssl rand -hex 16)"
WIPE_ONEOFF_PW="$(openssl rand -hex 16)"
umask 077
{
  printf '*:*:*:%s:%s\n' postgres "$POSTGRES_PASSWORD"
  printf '*:*:*:%s:%s\n' master_x "$WIPE_MASTER_PW"
  printf '*:*:*:%s:%s\n' oneoff_x "$WIPE_ONEOFF_PW"
} > "$TMP/pgpass"
umask 022

# 접속 문자열은 조각으로 조합한다.
dsn() { printf 'host=%s port=%s user=%s dbname=%s' "$1" "$2" "$3" postgres; }
# 공식 postgres 이미지의 pg_hba 는 루프백 연결을 trust 로 받는다(비밀번호를 보지 않음).
# 그래서 접속은 루프백이 아니라 컨테이너 망 이름으로 하고, SCRAM 인증만 받게 한다.
DB_HOST="$PG"
AUTH="require_auth=scram-sha-256"

# wipe-pg 컨테이너 안에서 psql 을 돌린다. $1=사용자, 나머지는 psql 인자.
psql_as() {
  local user="$1"; shift
  docker exec -i -e PGPASSFILE="$PASSFILE_IN" "$PG" psql -X "$(dsn "$DB_HOST" 5432 "$user") $AUTH" "$@"
}
run_file() {
  local user="$1" file="$2"; shift 2
  docker cp "$HERE/sql/$file" "$PG:/tmp/$file" >/dev/null
  psql_as "$user" -f "/tmp/$file" "$@"
}
count_as_super() { psql_as postgres -tAc "$1"; }

echo "== env =="
{
  echo "date(KST): $(TZ=Asia/Seoul date '+%Y-%m-%dT%H:%M:%S%z')"
  echo "host: $(uname -sm) · $(sw_vers -productName 2>/dev/null) $(sw_vers -productVersion 2>/dev/null)"
  echo "docker: $(docker version --format '{{.Server.Version}}')"
  echo "host bash: $(bash --version | head -1)"
  echo "pg image: $(docker image inspect "$PG_IMAGE" --format '{{index .RepoDigests 0}}')"
  echo "proxy image: $PY_IMAGE linux/amd64 ($(docker run --rm --platform linux/amd64 "$PY_IMAGE" python -V 2>&1))"
} | tee "$OUT/env.txt"

echo "== up =="
containers_down
docker network create --label "$LABEL" "$NET" >/dev/null
docker run -d --name "$PG" --label "$LABEL" --network "$NET" \
  -e POSTGRES_PASSWORD --tmpfs /var/lib/postgresql/data "$PG_IMAGE" >/dev/null
docker exec -i "$PG" sh -c "cat > $PASSFILE_IN && chmod 600 $PASSFILE_IN" < "$TMP/pgpass"
for _ in $(seq 1 100); do docker exec "$PG" pg_isready -q -h "$DB_HOST" 2>/dev/null && break; sleep 0.3; done
sleep 1
{
  echo "server: $(psql_as postgres -tAc 'SHOW server_version')"
  echo "psql: $(docker exec "$PG" psql --version)"
  echo "container bash: $(docker exec "$PG" bash --version | head -1)"
} | tee -a "$OUT/env.txt"

echo "== s0 준비 =="
docker exec -i -e WIPE_MASTER_PW -e PGPASSFILE="$PASSFILE_IN" "$PG" \
  psql -X "$(dsn "$DB_HOST" 5432 postgres) $AUTH" -f - < "$HERE/sql/s0_super.sql" > "$OUT/s0.out" 2>&1
run_file master_x s0_master.sql >> "$OUT/s0.out" 2>&1
cat "$OUT/s0.out"

echo "== s1 마스터 경로: 앱 코드가 도는 신분 =="
run_file master_x s1_plant.sql > "$OUT/s1-plant.out" 2>&1
tail -3 "$OUT/s1-plant.out"
for f in s1a_setrole_delete s1b_definer s1c_index_expr s1d_partial_select s1d_partial_delete s1d_partial_naive s1e_partial_readonly s1f_grant_only s1g_repeat s1h_update; do
  echo "### $f" > "$OUT/$f.out"
  run_file master_x "$f.sql" >> "$OUT/$f.out" 2>&1
  cat "$OUT/$f.out"
done

echo "== s2 일회용 로그인 =="
export WIPE_ONEOFF_VERIFIER WIPE_VALID_UNTIL
WIPE_ONEOFF_VERIFIER="$(python3 -I "$HERE/scram.py")"
WIPE_VALID_UNTIL="$(python3 -I -c 'import datetime as d; print((d.datetime.now(d.timezone.utc)+d.timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S+00"))')"
docker cp "$HERE/sql/s2_create.sql" "$PG:/tmp/s2_create.sql" >/dev/null
docker exec -i -e PGPASSFILE="$PASSFILE_IN" -e WIPE_ONEOFF_VERIFIER -e WIPE_VALID_UNTIL "$PG" \
  psql -X "$(dsn "$DB_HOST" 5432 master_x) $AUTH" -f /tmp/s2_create.sql > "$OUT/s2-create.out" 2>&1
unset WIPE_ONEOFF_VERIFIER
count_as_super "SELECT 'stored as SCRAM verifier: ' || (rolpassword LIKE 'SCRAM-SHA-256' || chr(36) || '%') FROM pg_authid WHERE rolname = 'oneoff_x'" >> "$OUT/s2-create.out" 2>&1
cat "$OUT/s2-create.out"
run_file oneoff_x s2_as_oneoff.sql > "$OUT/s2-as-oneoff.out" 2>&1
cat "$OUT/s2-as-oneoff.out"
{
  psql_as oneoff_x -c "SELECT pg_sleep(4)" >/dev/null 2>&1 &
  HOLD=$!
  sleep 1.5
  echo "--- 두 번째 동시 연결 ---"
  psql_as oneoff_x -tAc "SELECT 1" 2>&1 | sed 's/^psql: error: [^:]*: /psql: error: /'
  wait "$HOLD"
  echo "--- VALID UNTIL 이 지난 비밀번호로 로그인 ---"
  psql_as master_x -qc "ALTER ROLE oneoff_x VALID UNTIL '2000-01-01'"
  psql_as oneoff_x -tAc "SELECT 1" 2>&1 | sed 's/^psql: error: [^:]*: /psql: error: /'
} > "$OUT/s2-limits.out" 2>&1
cat "$OUT/s2-limits.out"
run_file master_x s2_close.sql > "$OUT/s2-close.out" 2>&1
cat "$OUT/s2-close.out"
echo "--- master_only.members (s2 뒤) ---" >> "$OUT/s2-close.out"
count_as_super "SELECT string_agg(who, ', ' ORDER BY who) FROM master_only.members" >> "$OUT/s2-close.out" 2>&1
echo "--- app_x.table_d (앱 소유 DEFINER 트리거가 쓴 줄) ---" >> "$OUT/s2-close.out"
count_as_super "SELECT string_agg(who, ' | ' ORDER BY who) FROM app_x.table_d" >> "$OUT/s2-close.out" 2>&1

echo "== s3 relacl =="
run_file master_x s3_relacl.sql > "$OUT/s3.out" 2>&1
cat "$OUT/s3.out"

echo "== s4 COMMIT 응답 끊김 =="
docker run -d --name "$PROXY" --label "$LABEL" --network "$NET" \
  --platform linux/amd64 -v "$HERE/proxy_commitdrop.py:/proxy.py:ro" "$PY_IMAGE" \
  python -I -u /proxy.py "$PROXY_PORT" "$PG" 5432 >/dev/null
sleep 1.5
docker cp "$HERE/sql/s4_delete.sql" "$PG:/tmp/s4_delete.sql" >/dev/null
VIA_PROXY="$(dsn "$PROXY" "$PROXY_PORT" master_x) sslmode=disable $AUTH"
{
  echo "대상 행(juliet · kilo) 처음: $(count_as_super "SELECT count(*) FROM app_x.table_i WHERE body IN ('juliet','kilo')")"
  echo "--- 꼴 1: psql -X -1 -v ON_ERROR_STOP=1 -f s4_delete.sql ---"
  docker exec -e PGPASSFILE="$PASSFILE_IN" "$PG" psql -X -1 -v ON_ERROR_STOP=1 "$VIA_PROXY" -f /tmp/s4_delete.sql 2>&1
  echo "psql_exit=$?"
  echo "재접속해 센 kilo 남은 수: $(count_as_super "SELECT count(*) FROM app_x.table_i WHERE body = 'kilo'")"
  echo "--- 꼴 2: psql -X -c 'BEGIN; … DELETE …; COMMIT;' ---"
  docker exec -e PGPASSFILE="$PASSFILE_IN" "$PG" psql -X "$VIA_PROXY" \
    -c "BEGIN; GRANT app_x TO master_x WITH SET TRUE, INHERIT FALSE; SET ROLE app_x; DELETE FROM app_x.table_i WHERE body = 'juliet'; RESET ROLE; REVOKE app_x FROM master_x; COMMIT;" 2>&1
  echo "psql_exit=$?"
  echo "재접속해 센 juliet 남은 수: $(count_as_super "SELECT count(*) FROM app_x.table_i WHERE body = 'juliet'")"
  echo "표 전체 행 수: $(count_as_super "SELECT count(*) FROM app_x.table_i")"
  echo "--- 프록시 기록 ---"
  docker logs "$PROXY" 2>&1
} > "$OUT/s4.out" 2>&1
cat "$OUT/s4.out"

echo "== s5 셸이 신호로 죽을 때 =="
{
  echo "--- 호스트 bash: 부른 쪽이 받는 종료 상태 ---"
  bash -c 'kill -TERM $$'; echo "SIGTERM: $?"
  bash -c 'kill -HUP $$';  echo "SIGHUP:  $?"
  bash -c 'kill -KILL $$'; echo "SIGKILL: $?"
} > "$OUT/s5-host.out" 2>&1
cat "$OUT/s5-host.out"
docker cp "$HERE/sql/s5_child.sql" "$PG:/tmp/s5_child.sql" >/dev/null
s5_case() { # $1=fg|bg  $2=남길 역할 이름
  local mode="$1" name="$2" amp=""
  [ "$mode" = bg ] && amp="&"
  docker exec -e PGPASSFILE="$PASSFILE_IN" "$PG" bash -c "rm -f /tmp/wipe-parent.pid; echo \$\$ > /tmp/wipe-parent.pid
    psql -X '$(dsn "$DB_HOST" 5432 master_x) $AUTH' -v name=$name -f /tmp/s5_child.sql > /tmp/wipe-child-$mode.out 2>&1 $amp
    sleep 30" &
  local wrap=$!
  sleep 1
  docker exec "$PG" sh -c 'kill -TERM "$(cat /tmp/wipe-parent.pid)"'
  wait "$wrap"; local rc=$?
  sleep 4
  echo "부모 bash(자식 $mode) 를 SIGTERM — 부른 쪽(docker exec)이 받은 종료 상태: $rc"
  echo "자식 psql 출력:"; docker exec "$PG" cat "/tmp/wipe-child-$mode.out"
  echo "남은 역할 $name: $(count_as_super "SELECT count(*) FROM pg_roles WHERE rolname = '$name'")"
}
{ s5_case fg orphan_x; echo; s5_case bg orphan_bg_x; } > "$OUT/s5-container.out" 2>&1
cat "$OUT/s5-container.out"

echo "== 정리 =="
down
echo "DONE"
