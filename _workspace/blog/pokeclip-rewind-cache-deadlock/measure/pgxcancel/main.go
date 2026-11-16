// pgxcancel 은 pgx v5.10.0 이 문장 시한(context deadline)을 넘긴 뒤 서버 쪽 잠금이 언제 풀리는지 잰다.
//
// 장면은 봉인 전 장부 확인과 같은 꼴이다. 「피해자」 연결이 트랜잭션을 열고 회차 행을 UPDATE 해(fence) 행 잠금을 쥔 뒤,
// 장부 표를 읽는다. 다른 연결이 장부 표에 ACCESS EXCLUSIVE 잠금을 쥐고 있어 읽기는 막힌다. 읽기의 시한(-timeout)이 지나면
// pgx 는 오류를 돌려주고 연결을 닫는다. 그 뒤 세 번째 연결이 회차 행을 FOR UPDATE NOWAIT 로 잡을 수 있게 되는 시각을 잰다.
//
//	default   pgx 기본 설정. 시한이 지나면 asyncClose 가 취소 요청(CancelRequest)과 Terminate 를 보낸다.
//	nocancel  대조군. 피해자 연결의 DialFunc 가 두 번째 다이얼(취소 요청용 연결)을 거부해 취소 요청이 서버에 닿지 않게 한다.
//	          그 밖의 동작(Terminate · 소켓 닫기)은 같다.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net"
	"os"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
)

const (
	probeEvery = 50 * time.Millisecond
	probeLimit = 5 * time.Second
)

func main() {
	dsn := flag.String("dsn", "", "PostgreSQL DSN")
	rounds := flag.Int("rounds", 5, "모드마다 반복 수")
	timeout := flag.Duration("timeout", 500*time.Millisecond, "장부 읽기 시한")
	flag.Parse()
	if *dsn == "" {
		fmt.Fprintln(os.Stderr, "-dsn 필요")
		os.Exit(2)
	}
	ctx := context.Background()
	admin, err := pgx.Connect(ctx, *dsn)
	must(err)
	defer admin.Close(ctx)
	for _, q := range []string{
		`DROP TABLE IF EXISTS rm_ledger, rm_sessions`,
		`CREATE TABLE rm_sessions (id int PRIMARY KEY, writer text)`,
		`CREATE TABLE rm_ledger (stream text, seq bigint, PRIMARY KEY (stream, seq))`,
		`INSERT INTO rm_sessions VALUES (1, '')`,
		`INSERT INTO rm_ledger VALUES ('s', 3)`,
	} {
		_, err := admin.Exec(ctx, q)
		must(err)
	}
	var ver, check, stmt string
	must(admin.QueryRow(ctx, `SHOW server_version`).Scan(&ver))
	must(admin.QueryRow(ctx, `SHOW client_connection_check_interval`).Scan(&check))
	must(admin.QueryRow(ctx, `SHOW statement_timeout`).Scan(&stmt))
	fmt.Printf("server_version=%s client_connection_check_interval=%s statement_timeout=%s read_timeout=%s\n", ver, check, stmt, *timeout)
	fmt.Println("mode round err_after_ms row_lock_free_after_ms victim_backend_alive_at_limit free_after_locker_commit_ms err")
	for _, mode := range []string{"default", "nocancel"} {
		for r := 1; r <= *rounds; r++ {
			fmt.Println(round(ctx, *dsn, mode, r, *timeout, admin))
		}
	}
	_, _ = admin.Exec(ctx, `DROP TABLE IF EXISTS rm_ledger, rm_sessions`)
}

func round(ctx context.Context, dsn, mode string, r int, timeout time.Duration, admin *pgx.Conn) string {
	locker, err := pgx.Connect(ctx, dsn)
	must(err)
	defer locker.Close(ctx)
	ltx, err := locker.Begin(ctx)
	must(err)
	_, err = ltx.Exec(ctx, `LOCK TABLE rm_ledger IN ACCESS EXCLUSIVE MODE`)
	must(err)

	cfg, err := pgx.ParseConfig(dsn)
	must(err)
	if mode == "nocancel" {
		var dials atomic.Int32
		base := cfg.DialFunc
		cfg.DialFunc = func(ctx context.Context, network, addr string) (net.Conn, error) {
			if dials.Add(1) > 1 {
				return nil, errors.New("pgxcancel: 취소 요청용 다이얼 거부(대조군)")
			}
			return base(ctx, network, addr)
		}
	}
	victim, err := pgx.ConnectConfig(ctx, cfg)
	must(err)
	var pid int32
	must(victim.QueryRow(ctx, `SELECT pg_backend_pid()`).Scan(&pid))
	vtx, err := victim.Begin(ctx)
	must(err)
	_, err = vtx.Exec(ctx, `UPDATE rm_sessions SET writer = 'w' WHERE id = 1`)
	must(err)

	rctx, cancel := context.WithTimeout(ctx, timeout)
	start := time.Now()
	var last int64
	readErr := vtx.QueryRow(rctx, `SELECT pg_catalog.max(seq) FROM rm_ledger WHERE stream = $1`, "s").Scan(&last)
	errAt := time.Since(start)
	cancel()

	freeAt, free := probe(ctx, dsn, errAt, start)
	alive := backendAlive(ctx, admin, pid)

	// 잠금을 쥔 연결이 끝나면 대조군의 피해자 백엔드도 결국 끝난다 — 그때까지를 잰다.
	commitAt := time.Now()
	must(ltx.Commit(ctx))
	afterCommit := "-"
	if !free {
		if d, ok := probe(ctx, dsn, 0, commitAt); ok {
			afterCommit = fmt.Sprintf("%.0f", d.Seconds()*1000)
		} else {
			afterCommit = fmt.Sprintf(">%d", probeLimit.Milliseconds())
		}
	}
	freeStr := fmt.Sprintf(">%d", probeLimit.Milliseconds())
	if free {
		freeStr = fmt.Sprintf("%.0f", (freeAt - errAt).Seconds()*1000)
	}
	_ = victim.Close(ctx)
	waitGone(ctx, admin, pid)
	return fmt.Sprintf("%s %d %.0f %s %v %s %q", mode, r, errAt.Seconds()*1000, freeStr, alive, afterCommit, short(readErr))
}

// probe 는 start 기준으로 회차 행 잠금을 잡을 수 있게 된 시각을 돌려준다(probeLimit 안에서 50ms 마다 시도).
func probe(ctx context.Context, dsn string, from time.Duration, start time.Time) (time.Duration, bool) {
	c, err := pgx.Connect(ctx, dsn)
	must(err)
	defer c.Close(ctx)
	deadline := time.Now().Add(probeLimit)
	for time.Now().Before(deadline) {
		tx, err := c.Begin(ctx)
		must(err)
		_, err = tx.Exec(ctx, `SELECT 1 FROM rm_sessions WHERE id = 1 FOR UPDATE NOWAIT`)
		_ = tx.Rollback(ctx)
		if err == nil {
			return time.Since(start), true
		}
		time.Sleep(probeEvery)
	}
	_ = from
	return 0, false
}

func backendAlive(ctx context.Context, admin *pgx.Conn, pid int32) bool {
	var n int
	must(admin.QueryRow(ctx, `SELECT count(*) FROM pg_stat_activity WHERE pid = $1`, pid).Scan(&n))
	return n > 0
}

func waitGone(ctx context.Context, admin *pgx.Conn, pid int32) {
	for range 100 {
		if !backendAlive(ctx, admin, pid) {
			return
		}
		time.Sleep(probeEvery)
	}
}

func short(err error) string {
	if err == nil {
		return ""
	}
	s := err.Error()
	if len(s) > 80 {
		s = s[:80]
	}
	return s
}

func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, "fatal:", err)
		os.Exit(1)
	}
}
