#!/usr/bin/env python3
"""채팅 수집기 영상 위치 조회 세 곳의 버퍼 수를 PostgreSQL 17에서 다시 잰다.

쓰임:
    python3 measure.py <출력 폴더>

psql 명령은 환경 변수 CHATQ_PSQL 로 바꾼다(공백으로 나눈다). 기본은 run.sh 가 띄운 컨테이너 안의 psql 이다.
표와 장부는 schema.sql · seed.sql 이 미리 세워 둔다(run.sh up).

조회 글자는 공개 저장소 3K-PokeClip/PokeClip-mono 에서 옮겼다(라이선스 파일 없음 — 재현에 필요한 SQL만 발췌, 출처는 각 상수 주석).
측정은 EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 맨 위 마디의 Shared Hit Blocks + Shared Read Blocks 다
(SegmentLedgerIndexTest 의 record() 와 같은 셈).
  custom  = SET plan_cache_mode = force_custom_plan  + PREPARE + EXPLAIN EXECUTE (바인딩 값을 보고 세운 계획)
  generic = SET plan_cache_mode = force_generic_plan + PREPARE + EXPLAIN EXECUTE (값을 모르는 계획)
"""
import csv
import json
import os
import random
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone

PSQL = os.environ.get(
    "CHATQ_PSQL",
    "docker exec -i chatq-pg psql -X -q -A -t -v ON_ERROR_STOP=1 -U postgres -d chatq",
).split()
REPS = int(os.environ.get("CHATQ_REPS", "5"))
KST = timezone(timedelta(hours=9))

T0 = datetime(2026, 11, 13, tzinfo=timezone.utc)
ROWS = 300_000
ROLLBACK_ROWS = 7_200
SEG_MS = 4_000

V2_ONLY = "idx-v2-only"
LEGACY_ONLY = "idx-legacy-only"
ROLLBACK = "idx-rollback"

# ── 조회 ───────────────────────────────────────────────────────────────────────
# 옛 후보(판 NULL) 조회. 파라미터 순서 (t, streamId, t).

# PR 511 이전 develop 5ad61a0c 의 SegmentLedger.FLOOR_BY_WALL_CLOCK (판 조건 없음).
LEGACY_DEVELOP_5AD61A0C = """
SELECT s.seq, s.start_pts_ms, s.start_wall_utc, s.duration_ms, s.is_discontinuity,
       (SELECT max(x.seq) FROM public.stream_segments x
         WHERE x.stream_id = s.stream_id AND x.start_wall_utc <= ?) AS max_candidate_seq,
       EXISTS(SELECT 1 FROM public.stream_segments y
               WHERE y.stream_id = s.stream_id
                 AND y.seq < s.seq AND y.start_wall_utc > s.start_wall_utc) AS earlier_is_future
  FROM public.stream_segments s
 WHERE s.stream_id = ? AND s.start_wall_utc <= ?
 ORDER BY s.start_wall_utc DESC, s.seq DESC
 LIMIT 1
"""

# 판 조건을 더하고 EXISTS 는 그대로 둔 꼴 — SegmentLedgerInversionEquivalenceTest @ 7c3464e3 의 BEFORE_REWRITE 상수.
LEGACY_EXISTS = """
SELECT s.seq, s.start_pts_ms, s.start_wall_utc, s.playback_pdt, s.timing_version,
       s.duration_ms, s.is_discontinuity,
       (SELECT max(x.seq) FROM public.stream_segments x
         WHERE x.stream_id = s.stream_id AND x.timing_version IS NULL
           AND x.start_wall_utc <= ?) AS max_candidate_seq,
       EXISTS(SELECT 1 FROM public.stream_segments y
               WHERE y.stream_id = s.stream_id AND y.timing_version IS NULL
                 AND y.seq < s.seq AND y.start_wall_utc > s.start_wall_utc) AS earlier_is_future
  FROM public.stream_segments s
 WHERE s.stream_id = ? AND s.timing_version IS NULL AND s.start_wall_utc <= ?
 ORDER BY s.start_wall_utc DESC, s.seq DESC
 LIMIT 1
"""

# 바뀐 꼴 — SegmentLedger.FLOOR_BY_WALL_CLOCK @ 7c3464e3 (PR 511 머지 커밋).
LEGACY_REWRITE = """
SELECT s.seq, s.start_pts_ms, s.start_wall_utc, s.playback_pdt, s.timing_version,
       s.duration_ms, s.is_discontinuity,
       (SELECT max(x.seq) FROM public.stream_segments x
         WHERE x.stream_id = s.stream_id AND x.timing_version IS NULL
           AND x.start_wall_utc <= ?) AS max_candidate_seq,
       COALESCE((SELECT y.start_wall_utc FROM public.stream_segments y
                  WHERE y.stream_id = s.stream_id AND y.timing_version IS NULL AND y.seq < s.seq
                  ORDER BY y.start_wall_utc DESC
                  LIMIT 1) > s.start_wall_utc, false) AS earlier_is_future
  FROM public.stream_segments s
 WHERE s.stream_id = ? AND s.timing_version IS NULL AND s.start_wall_utc <= ?
 ORDER BY s.start_wall_utc DESC, s.seq DESC
 LIMIT 1
"""

# 판 2 후보 조회. 「PDT <= t 인 판 2 행 가운데 seq 최대」.

# 존재 확인 없는 꼴 — SegmentLedgerPdtFloorEquivalenceTest @ 7c3464e3 의 BEFORE_PRECHECK 상수. 파라미터 (streamId, t).
V2_PLAIN = """
SELECT seq, start_pts_ms, start_wall_utc, playback_pdt, timing_version, duration_ms, is_discontinuity
  FROM public.stream_segments
 WHERE stream_id = ? AND timing_version = 2 AND playback_pdt <= ?
 ORDER BY seq DESC
 LIMIT 1
"""

# 최종 꼴(min 존재 확인) — SegmentLedger.FLOOR_BY_PLAYBACK_PDT @ 7c3464e3. 파라미터 (streamId, t, streamId, t).
V2_MIN = """
SELECT seq, start_pts_ms, start_wall_utc, playback_pdt, timing_version, duration_ms, is_discontinuity
  FROM public.stream_segments
 WHERE stream_id = ? AND timing_version = 2 AND playback_pdt <= ?
   AND (SELECT min(e.playback_pdt) FROM public.stream_segments e
         WHERE e.stream_id = ? AND e.timing_version = 2) <= ?
 ORDER BY seq DESC
 LIMIT 1
"""

# 기각한 꼴(EXISTS 존재 확인). 저장소에 커밋된 글자가 없어, PR 511 본문이 적은 「EXISTS(… playback_pdt <= ?)」 를
# V2_MIN 과 같은 자리에 넣어 재구성했다. 파라미터 (streamId, t, streamId, t).
V2_EXISTS = """
SELECT seq, start_pts_ms, start_wall_utc, playback_pdt, timing_version, duration_ms, is_discontinuity
  FROM public.stream_segments
 WHERE stream_id = ? AND timing_version = 2 AND playback_pdt <= ?
   AND EXISTS(SELECT 1 FROM public.stream_segments e
               WHERE e.stream_id = ? AND e.timing_version = 2 AND e.playback_pdt <= ?)
 ORDER BY seq DESC
 LIMIT 1
"""

# 틀린 지름길(대조 전용) — PDT 최대 행. 판 2 PDT 는 seq 순으로 단조가 아니라 답이 다르다.
V2_PDT_MAX = """
SELECT seq, start_pts_ms, start_wall_utc, playback_pdt, timing_version, duration_ms, is_discontinuity
  FROM public.stream_segments
 WHERE stream_id = ? AND timing_version = 2 AND playback_pdt <= ?
 ORDER BY playback_pdt DESC, seq DESC
 LIMIT 1
"""

LEGACY_QUERIES = {
    "legacy_develop_5ad61a0c": LEGACY_DEVELOP_5AD61A0C,
    "legacy_exists": LEGACY_EXISTS,
    "legacy_rewrite": LEGACY_REWRITE,
}
V2_QUERIES = {"v2_plain": V2_PLAIN, "v2_min": V2_MIN, "v2_exists": V2_EXISTS}

DROP_PDT_IDX = "DROP INDEX IF EXISTS public.stream_segments_v2_pdt_idx;"
CREATE_PDT_IDX = (
    "CREATE INDEX IF NOT EXISTS stream_segments_v2_pdt_idx ON public.stream_segments "
    "(stream_id, playback_pdt DESC) WHERE timing_version = 2;"
)


def at(ms):
    return T0 + timedelta(milliseconds=ms)


def iso(ts):
    return ts.isoformat(timespec="milliseconds")


TIMES = {
    "early": at(-1_000),  # 첫 PDT - 1초
    "first_plus_1ms": at(1),  # 첫 판 2 PDT + 1ms
    "middle": at(ROWS // 2 * SEG_MS),  # 판 2 행 15만 번째 근처
    "tail": at((ROWS + ROLLBACK_ROWS) * SEG_MS),  # 모든 행 뒤
    "legacy_first_plus_1s": at(1_000),  # 판 NULL 만 장부의 첫 행 + 1초(원 시험과 같은 T0 + 1초)
    "rollback_legacy_first_plus_1s": at(ROWS * SEG_MS + 1_000),  # 롤백 장부의 첫 판 NULL 행 + 1초
}


def psql(sql):
    done = subprocess.run(PSQL, input=sql, capture_output=True, text=True, check=False)
    if done.returncode != 0:
        raise RuntimeError(f"psql 실패({done.returncode}): {done.stderr.strip()}\n--- SQL ---\n{sql}")
    return done.stdout


def numbered(sql):
    """? 자리 표시를 차례로 $1, $2, … 로 바꾼다(pgjdbc 가 서버에 보내는 글자와 같은 방식)."""
    out, n = [], 0
    for c in sql:
        if c == "?":
            n += 1
            out.append(f"${n}")
        else:
            out.append(c)
    return "".join(out)


def legacy_args(stream, t):
    return [("timestamptz", iso(t)), ("text", stream), ("timestamptz", iso(t))]


def v2_args(sql, stream, t):
    pairs = sql.count("?") // 2
    return [("text", stream), ("timestamptz", iso(t))] * pairs


def explain(sql, args, mode):
    types = ", ".join(kind for kind, _ in args)
    values = ", ".join("'" + value.replace("'", "''") + "'" for _, value in args)
    script = (
        f"SET plan_cache_mode = force_{mode}_plan;\n"
        f"PREPARE q({types}) AS {numbered(sql).strip()};\n"
        f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) EXECUTE q({values});\n"
    )
    out = json.loads(psql(script))[0]
    top = out["Plan"]
    return {
        "buffers": top["Shared Hit Blocks"] + top["Shared Read Blocks"],
        "shared_hit": top["Shared Hit Blocks"],
        "shared_read": top["Shared Read Blocks"],
        "exec_ms": out["Execution Time"],
        "planning_ms": out.get("Planning Time"),
        "rows": top.get("Actual Rows"),
        "jit": "JIT" in out,
        "plan": out,
    }


def loadavg():
    try:
        raw = subprocess.run(["sysctl", "-n", "vm.loadavg"], capture_output=True, text=True).stdout
        return raw.strip().strip("{}").strip()
    except OSError:
        return os.getloadavg()


def cases_with_index():
    cases = []
    points = [
        (LEGACY_ONLY, "tail"),
        (LEGACY_ONLY, "legacy_first_plus_1s"),
        (ROLLBACK, "tail"),
        (ROLLBACK, "rollback_legacy_first_plus_1s"),
    ]
    for name, sql in LEGACY_QUERIES.items():
        for stream, label in points:
            for mode in ("custom", "generic"):
                cases.append((name, sql, stream, label, mode, "all", legacy_args(stream, TIMES[label])))
    for name in ("v2_plain", "v2_min", "v2_exists"):
        sql = V2_QUERIES[name]
        for label in ("early", "first_plus_1ms", "middle", "tail"):
            for mode in ("custom", "generic"):
                cases.append((name, sql, V2_ONLY, label, mode, "all", v2_args(sql, V2_ONLY, TIMES[label])))
    return cases


def cases_without_pdt_index():
    cases = []
    for name in ("v2_plain", "v2_min"):
        sql = V2_QUERIES[name]
        for label in ("early", "first_plus_1ms", "middle", "tail"):
            for mode in ("custom", "generic"):
                cases.append((name, sql, V2_ONLY, label, mode, "no_pdt_idx", v2_args(sql, V2_ONLY, TIMES[label])))
        for mode in ("custom", "generic"):
            cases.append((name, sql, LEGACY_ONLY, "tail", mode, "no_pdt_idx", v2_args(sql, LEGACY_ONLY, TIMES["tail"])))
    return cases


def cases_no_v2_rows():
    """판 2 행이 하나도 없는 표 · 판 2 PDT 색인도 없음 — 지금 운영 장부와 같은 꼴(표 크기는 다르다)."""
    sql = V2_MIN
    return [
        ("v2_min", sql, LEGACY_ONLY, "tail", mode, "no_v2_rows_no_pdt_idx", v2_args(sql, LEGACY_ONLY, TIMES["tail"]))
        for mode in ("custom", "generic")
    ]


def run_phase(phase, cases, writer, plans):
    for rep in range(1, REPS + 1):
        for name, sql, stream, label, mode, index_state, args in cases:
            r = explain(sql, args, mode)
            case_id = f"{name}|{stream}|{label}|{mode}|{index_state}"
            writer.writerow({
                "phase": phase, "case": case_id, "query": name, "stream": stream, "time": label,
                "t": args[1][1] if name.startswith("v2") else args[0][1], "mode": mode,
                "index_state": index_state, "rep": rep, "buffers": r["buffers"], "shared_hit": r["shared_hit"],
                "shared_read": r["shared_read"], "exec_ms": r["exec_ms"], "planning_ms": r["planning_ms"],
                "rows": r["rows"], "jit": r["jit"], "loadavg": loadavg(),
            })
            if rep == 1:
                plans.write(json.dumps({"case": case_id, "plan": r["plan"]}, ensure_ascii=False) + "\n")


def summarize(results_path, summary_path):
    groups = {}
    with open(results_path, newline="") as f:
        for row in csv.DictReader(f):
            groups.setdefault(row["case"], []).append(row)
    with open(summary_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["case", "reps", "buffers_distinct", "exec_ms_min", "exec_ms_max", "rows"])
        for case, rows in groups.items():
            buffers = sorted({int(r["buffers"]) for r in rows})
            ms = [float(r["exec_ms"]) for r in rows]
            w.writerow([case, len(rows), " ".join(map(str, buffers)), f"{min(ms):.3f}", f"{max(ms):.3f}",
                        " ".join(sorted({r["rows"] for r in rows}))])


# ── 동치 대조 ─────────────────────────────────────────────────────────────────
# 원 시험(SegmentLedgerInversionEquivalenceTest · SegmentLedgerPdtFloorEquivalenceTest)의 장부 생성 규칙을 옮겼다.
# 난수는 Python random(씨앗 고정)이라 원 시험과 같은 장부는 아니다.

def lateral(sql, params):
    """? 자리를 차례로 표본 칸 이름으로 바꿔 LATERAL 안에 넣을 글자를 만든다."""
    parts = sql.split("?")
    assert len(parts) - 1 == len(params), (len(parts) - 1, params)
    out = parts[0]
    for p, rest in zip(params, parts[1:]):
        out += p + rest
    return out.strip()


def insert_rows(rows):
    values = ",\n".join(
        "('{s}', {seq}, {pts}, '{wall}', {dur}, 'eqv/{seq}', {disc}, {pdt}, {ver})".format(
            s=s, seq=seq, pts=pts, wall=iso(wall), dur=dur, disc="true" if disc else "false",
            pdt=f"'{iso(pdt)}'" if pdt else "NULL", ver=ver if ver else "NULL")
        for s, seq, pts, wall, pdt, ver, dur, disc in rows
    )
    psql("INSERT INTO public.stream_segments (stream_id, seq, start_pts_ms, start_wall_utc, duration_ms, s3_key, "
         "is_discontinuity, playback_pdt, timing_version) VALUES\n" + values + ";")


def seed_inversion(rng, stream):
    rows, count, seq, clock, last_wall, end = [], 3 + rng.randrange(14), 1 + rng.randrange(20), 0, 0, 0
    for k in range(count):
        dur = 3000 + rng.randrange(1501)
        v2 = rng.randrange(5) == 0
        if rng.randrange(10) == 0:
            wall = last_wall
        elif rng.random() < 0.5:
            wall = clock + rng.randrange(30_001) - 15_000
        else:
            wall = clock
        pdt = at(wall + rng.randrange(400)) if v2 else None
        rows.append((stream, seq, k * 4000, at(wall), pdt, 2 if v2 else None, dur, rng.randrange(4) == 0))
        last_wall, end = wall, max(end, wall + dur)
        seq += 2 if rng.randrange(6) == 0 else 1
        clock += dur
    return rows, end


def seed_pdt(rng, stream):
    rows, v2_pdts = [], []
    count, seq, clock = 3 + rng.randrange(14), 1 + rng.randrange(20), rng.randrange(3000)
    for k in range(count):
        dur = 3000 + rng.randrange(1501)
        v2 = rng.randrange(4) != 0
        if rng.randrange(6) == 0:
            pdt = clock - 5000 - rng.randrange(15_000)  # 회차가 바뀌어 크게 뒤로
        elif rng.randrange(4) == 0:
            pdt = clock - rng.randrange(1000)  # 1초 미만 겹침
        else:
            pdt = clock
        wall = at(pdt - rng.randrange(400))
        if v2:
            rows.append((stream, seq, k * 4000, wall, at(pdt), 2, dur, rng.randrange(4) == 0))
            v2_pdts.append(pdt)
        else:
            junk = None if rng.random() < 0.5 else at(pdt - 30_000 + rng.randrange(60_000))
            rows.append((stream, seq, k * 4000, wall, junk, None, dur, rng.randrange(4) == 0))
        seq += 2 if rng.randrange(6) == 0 else 1
        clock += dur
    return rows, v2_pdts


def equivalence(out_dir, ledgers, times):
    lines = []
    psql("DROP TABLE IF EXISTS eqv_samples; CREATE TABLE eqv_samples (kind text, stream_id text, t timestamptz);")

    rng = random.Random(20261114)
    samples = []
    for i in range(ledgers):
        stream = f"eqv-{i}"
        rows, end = seed_inversion(rng, stream)
        insert_rows(rows)
        for _ in range(times):
            samples.append(("legacy", stream, at(-20_000 + rng.randrange(end + 40_000))))

    rng = random.Random(20261115)
    for i in range(ledgers):
        stream = f"pdteqv-{i}"
        rows, v2_pdts = seed_pdt(rng, stream)
        insert_rows(rows)
        end = (max(v2_pdts) if v2_pdts else 0) + 5000
        for _ in range(times):
            kind = rng.randrange(4)
            if kind == 0 and v2_pdts:
                t = v2_pdts[rng.randrange(len(v2_pdts))]
            elif kind == 1:
                t = -60_000 - rng.randrange(10_000)
            else:
                t = -20_000 + rng.randrange(end + 25_000)
            samples.append(("v2", stream, at(t)))

    psql("INSERT INTO eqv_samples VALUES\n" + ",\n".join(
        f"('{k}', '{s}', '{iso(t)}')" for k, s, t in samples) + ";")

    legacy_params = ["sm.t", "sm.stream_id", "sm.t"]
    legacy_sql = f"""
SELECT count(*) AS compared,
       count(*) FILTER (WHERE (o.seq, o.max_candidate_seq, o.earlier_is_future)
                    IS DISTINCT FROM (n.seq, n.max_candidate_seq, n.earlier_is_future)) AS differ,
       count(*) FILTER (WHERE n.seq IS NULL) AS no_floor,
       count(*) FILTER (WHERE n.earlier_is_future) AS earlier_is_future_true,
       count(*) FILTER (WHERE n.max_candidate_seq <> n.seq) AS max_candidate_ne_floor
  FROM eqv_samples sm
  LEFT JOIN LATERAL ({lateral(LEGACY_EXISTS, legacy_params)}) o ON true
  LEFT JOIN LATERAL ({lateral(LEGACY_REWRITE, legacy_params)}) n ON true
 WHERE sm.kind = 'legacy';
"""
    lines.append("[옛 후보 역행 신호] EXISTS 꼴(legacy_exists) 대 바뀐 꼴(legacy_rewrite)")
    lines.append("compared|differ|no_floor|earlier_is_future_true|max_candidate_ne_floor")
    lines.append(psql(legacy_sql).strip())

    p2 = ["sm.stream_id", "sm.t"]
    p4 = p2 * 2
    v2_sql = f"""
SELECT count(*) AS compared,
       count(*) FILTER (WHERE a.seq IS DISTINCT FROM b.seq) AS plain_vs_min_differ,
       count(*) FILTER (WHERE a.seq IS DISTINCT FROM c.seq) AS plain_vs_exists_differ,
       count(*) FILTER (WHERE a.seq IS NULL) AS empty,
       count(*) FILTER (WHERE a.seq IS NOT NULL) AS found,
       count(*) FILTER (WHERE a.seq IS DISTINCT FROM d.seq) AS plain_vs_pdt_max_differ
  FROM eqv_samples sm
  LEFT JOIN LATERAL ({lateral(V2_PLAIN, p2)}) a ON true
  LEFT JOIN LATERAL ({lateral(V2_MIN, p4)}) b ON true
  LEFT JOIN LATERAL ({lateral(V2_EXISTS, p4)}) c ON true
  LEFT JOIN LATERAL ({lateral(V2_PDT_MAX, p2)}) d ON true
 WHERE sm.kind = 'v2';
"""
    lines.append("")
    lines.append("[판 2 후보] 존재 확인 없음(v2_plain) 대 min 확인(v2_min) · EXISTS 확인(v2_exists) · PDT 최대 지름길(v2_pdt_max)")
    lines.append("compared|plain_vs_min_differ|plain_vs_exists_differ|empty|found|plain_vs_pdt_max_differ")
    lines.append(psql(v2_sql).strip())

    # 손으로 만든 반례: 앞 회차 seq 100(PDT 20.000초) · 판 NULL seq 101 · 리셋된 회차 seq 102(PDT 17.000초).
    # VideoPositionV2Test @ 7c3464e3 의 「판_2_후보는_PDT_최대가_아니라_seq_최대다」 와 같은 행.
    insert_rows([
        ("cex-reset", 100, 0, at(10_000), at(20_000), 2, 4000, False),
        ("cex-reset", 101, 4000, at(15_000), None, None, 1000, True),
        ("cex-reset", 102, 5000, at(17_000), at(17_000), 2, 4000, True),
    ])
    lines.append("")
    lines.append("[반례 cex-reset] t | seq 최대(v2_min) | PDT 최대(v2_pdt_max)")
    for t_ms in (18_000, 20_500):
        t = iso(at(t_ms))
        p = ["'cex-reset'", f"'{t}'"]
        got_min = psql(f"SELECT seq FROM ({lateral(V2_MIN, p * 2)}) z;").strip() or "(없음)"
        got_max = psql(f"SELECT seq FROM ({lateral(V2_PDT_MAX, p)}) z;").strip() or "(없음)"
        lines.append(f"T0+{t_ms}ms | {got_min} | {got_max}")

    psql("DELETE FROM public.stream_segments WHERE stream_id LIKE 'eqv-%' OR stream_id LIKE 'pdteqv-%' "
         "OR stream_id = 'cex-reset'; DROP TABLE eqv_samples;")
    with open(os.path.join(out_dir, "equivalence.txt"), "w") as f:
        f.write("\n".join(lines) + "\n")
    return lines


def main():
    if len(sys.argv) != 2:
        sys.exit("쓰임: python3 measure.py <출력 폴더>")
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    env = {
        "started_kst": datetime.now(KST).isoformat(timespec="seconds"),
        "loadavg_start": loadavg(),
        "server_version": psql("SELECT version();").strip(),
        "settings": psql("SELECT string_agg(name || '=' || setting, ', ' ORDER BY name) FROM pg_settings WHERE name IN "
                         "('shared_buffers','work_mem','effective_cache_size','random_page_cost','jit',"
                         "'plan_cache_mode','max_parallel_workers_per_gather');").strip(),
        "row_counts": psql("SELECT string_agg(stream_id || ':' || version || ':' || n, ', ' ORDER BY stream_id, version) "
                           "FROM (SELECT stream_id, coalesce(timing_version::text, 'NULL') AS version, count(*) AS n "
                           "FROM public.stream_segments GROUP BY 1, 2) c;").strip(),
        "total_rows": psql("SELECT count(*) FROM public.stream_segments;").strip(),
        "indexes": psql("SELECT string_agg(indexname, ', ' ORDER BY indexname) FROM pg_indexes "
                        "WHERE tablename = 'stream_segments';").strip(),
        "times": {k: iso(v) for k, v in TIMES.items()},
        "reps": REPS,
    }
    fields = ["phase", "case", "query", "stream", "time", "t", "mode", "index_state", "rep", "buffers", "shared_hit",
              "shared_read", "exec_ms", "planning_ms", "rows", "jit", "loadavg"]
    results_path = os.path.join(out_dir, "results.csv")
    with open(results_path, "w", newline="") as f, open(os.path.join(out_dir, "plans.jsonl"), "w") as plans:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        psql(CREATE_PDT_IDX)
        run_phase("all_indexes", cases_with_index(), writer, plans)
        psql(DROP_PDT_IDX)
        run_phase("without_pdt_index", cases_without_pdt_index(), writer, plans)
        psql(CREATE_PDT_IDX)
        # 판 2 행을 지운 표(판 NULL 30만 행만) — 지금 운영 장부와 같은 꼴.
        psql(f"DELETE FROM public.stream_segments WHERE stream_id IN ('{V2_ONLY}', '{ROLLBACK}'); "
             "VACUUM ANALYZE public.stream_segments;")
        psql(DROP_PDT_IDX)
        run_phase("no_v2_rows", cases_no_v2_rows(), writer, plans)
        psql(CREATE_PDT_IDX)
    summarize(results_path, os.path.join(out_dir, "summary.csv"))
    env["equivalence"] = equivalence(out_dir, int(os.environ.get("CHATQ_EQV_LEDGERS", "50")),
                                     int(os.environ.get("CHATQ_EQV_TIMES", "10")))
    env["finished_kst"] = datetime.now(KST).isoformat(timespec="seconds")
    env["loadavg_end"] = loadavg()
    with open(os.path.join(out_dir, "env.json"), "w") as f:
        json.dump(env, f, ensure_ascii=False, indent=2)
    print(json.dumps(env, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
