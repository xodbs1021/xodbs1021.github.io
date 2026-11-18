package rewind

// 블로그 재측정 전용 시험(이 파일은 공개 저장소에 없다 — tech-blog
// _workspace/blog/pokeclip-playlist-gzip/measure). 2편(pokeclip-sidecar-rewind-playlist)의
// 크기 시험을 이어받아, 저장소의 Render 로 만든 되감기 목록 본문을 파일로 내보낸다.
// 압축(gzip · brotli)과 전송량 계산은 run.sh 가 CLI 로 한다.
//
// 실행: GZIPW_OUT=<폴더> go test -count=1 -run TestGzipwPlaylistBodies -v ./internal/rewind/

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/3K-PokeClip/pokeclip-mono/media/internal/playback"
	"github.com/3K-PokeClip/pokeclip-mono/media/internal/rewind/boundary"
)

const gzipwBase = "https://media.example.com"

// gzipwSessionID 는 사이드카의 세션 id 꼴(S-YYYYMMDD-HHMMSS-{stream}-{seq})이다.
func gzipwSessionID(stream string, start time.Time, seq int64) string {
	u := start.UTC()
	return fmt.Sprintf("S-%s-%s-%s-%d", u.Format("20060102"), u.Format("150405"), stream, seq)
}

type gzipwCase struct {
	name     string
	stream   string
	rows     int
	durMS    int32
	gapAt    int   // 0 이상이면 그 순번 행을 GAP 으로
	jitterMS int32 // 0 보다 크면 조각 길이를 durMS ± jitterMS 안에서 결정적으로 흔든다
}

func gzipwPlaylist(t *testing.T, c gzipwCase) Playlist {
	t.Helper()
	start := time.Date(2026, 11, 18, 3, 0, 0, 0, time.UTC)
	firstSeq := int64(100000)
	sid := gzipwSessionID(c.stream, start, firstSeq)
	rows := make([]boundary.Row, 0, c.rows)
	pdt := start
	x := uint32(12345)
	for i := 0; i < c.rows; i++ {
		dur := c.durMS
		if c.jitterMS > 0 {
			x = x*1664525 + 1013904223 // 결정적 LCG(2편과 같은 씨앗)
			dur = c.durMS - c.jitterMS + int32(x>>16)%(2*c.jitterMS+1)
		}
		seq := firstSeq + int64(i)
		key, err := playback.RoundSegKey(c.stream, sid, seq)
		if err != nil {
			t.Fatal(err)
		}
		r := boundary.Row{
			Seq: seq, SessionID: sid, DurationMS: dur,
			PlaybackPDT: pdt, PlaybackS3Key: key, PlaybackUploaded: true,
			TimingVersion: 2,
		}
		if i == c.gapAt {
			r.PlaybackUploaded, r.IsGap = false, true
		}
		rows = append(rows, r)
		pdt = pdt.Add(time.Duration(dur) * time.Millisecond)
	}
	return Playlist{
		StreamID: c.stream, BaseURL: gzipwBase, Cutoff: firstSeq, Owner: sid,
		Sessions: []Session{{ID: sid, TargetDuration: 6, MinSeq: firstSeq, InitUploaded: true}},
		Rows:     rows,
	}
}

func gzipwRender(t *testing.T, c gzipwCase) []byte {
	t.Helper()
	p := gzipwPlaylist(t, c)
	body, err := Render(p)
	if err != nil {
		t.Fatalf("%s: Render: %v", c.name, err)
	}
	if err := Validate(p, body, 1, nil); err != nil {
		t.Fatalf("%s: Validate: %v", c.name, err)
	}
	return body
}

func TestGzipwPlaylistBodies(t *testing.T) {
	out := os.Getenv("GZIPW_OUT")
	if out == "" {
		t.Skip("GZIPW_OUT 미설정 — 블로그 재측정 전용")
	}
	cases := []gzipwCase{
		{name: "s08_gap1", stream: "stream01", rows: 900, durMS: 4000, gapAt: 450},
		{name: "s08_jitter30", stream: "stream01", rows: 900, durMS: 4000, gapAt: -1, jitterMS: 30},
		{name: "s16", stream: "stream0123456789", rows: 900, durMS: 4000, gapAt: -1},
		{name: "s32", stream: "stream0123456789stream0123456789", rows: 900, durMS: 4000, gapAt: -1},
	}
	for _, c := range cases {
		body := gzipwRender(t, c)
		if err := os.WriteFile(filepath.Join(out, c.name+".m3u8"), body, 0o644); err != nil {
			t.Fatal(err)
		}
		fmt.Printf("body %s rows=%d bytes=%d\n", c.name, c.rows, len(body))
	}

	// 목록이 CloudFront 하한 1,000B 와 net/http 의 2,048B 를 처음 넘는 조각 수(스트림 8자 · 4초).
	for _, limit := range []int{1000, 2048} {
		for n := 1; n <= 900; n++ {
			body := gzipwRender(t, gzipwCase{name: "grow", stream: "stream01", rows: n, durMS: 4000, gapAt: -1})
			if len(body) > limit {
				fmt.Printf("threshold %d: rows=%d bytes=%d (rows=%d 는 %d B)\n", limit, n, len(body), n-1,
					len(gzipwRender(t, gzipwCase{name: "grow", stream: "stream01", rows: n - 1, durMS: 4000, gapAt: -1})))
				break
			}
		}
	}
}
