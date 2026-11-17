package rewind

// 블로그 재측정 전용 시험(이 파일은 공개 저장소에 없다 — tech-blog _workspace/blog/pokeclip-sidecar-rewind-playlist/measure).
// 1시간 창(4초 조각 900개)의 되감기 목록을 저장소의 Render 로 만들고, 원본 · gzip 크기와 발행 전 검사(Validate)의
// 결과를 잰다. 값은 예시 도메인 · 지어낸 스트림 이름으로 만든다.
//
// 실행: DVR2_SIZE=1 go test -count=1 -run TestDVR2PlaylistSize -v ./internal/rewind/

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/3K-PokeClip/pokeclip-mono/media/internal/playback"
	"github.com/3K-PokeClip/pokeclip-mono/media/internal/rewind/boundary"
)

const dvr2Base = "https://media.example.com"

// dvr2SessionID 는 사이드카의 세션 id 꼴(S-YYYYMMDD-HHMMSS-{stream}-{seq} — session/registry.go sessionID)이다.
func dvr2SessionID(stream string, start time.Time, seq int64) string {
	u := start.UTC()
	return fmt.Sprintf("S-%s-%s-%s-%d", u.Format("20060102"), u.Format("150405"), stream, seq)
}

type dvr2Case struct {
	name     string
	stream   string
	rows     int
	durMS    int32
	roundKey bool // 참이면 회차 꼴 키 dvr/{s}/{round}/seg/{n}.m4s, 거짓이면 옛 꼴 dvr/{s}/seg/{n}.m4s
	timingV2 bool
	gapAt    int // 0 이상이면 그 순번 행을 GAP 으로
	jitterMS int32 // 0 보다 크면 조각 길이를 durMS ± jitterMS 안에서 결정적으로 흔든다(PDT 는 길이 누적)
}

func dvr2Playlist(t *testing.T, c dvr2Case) Playlist {
	t.Helper()
	start := time.Date(2026, 11, 18, 3, 0, 0, 0, time.UTC)
	firstSeq := int64(100000)
	sid := dvr2SessionID(c.stream, start, firstSeq)
	rows := make([]boundary.Row, 0, c.rows)
	pdt := start
	x := uint32(12345)
	for i := 0; i < c.rows; i++ {
		dur := c.durMS
		if c.jitterMS > 0 {
			x = x*1664525 + 1013904223 // 결정적 LCG
			dur = c.durMS - c.jitterMS + int32(x>>16)%(2*c.jitterMS+1)
		}
		seq := firstSeq + int64(i)
		var key string
		var err error
		if c.roundKey {
			key, err = playback.RoundSegKey(c.stream, sid, seq)
		} else {
			key, err = playback.SegKey(c.stream, seq)
		}
		if err != nil {
			t.Fatal(err)
		}
		r := boundary.Row{
			Seq: seq, SessionID: sid, DurationMS: dur,
			PlaybackPDT:      pdt,
			PlaybackS3Key:    key,
			PlaybackUploaded: true,
		}
		if c.timingV2 {
			r.TimingVersion = 2
		}
		if i == c.gapAt {
			r.PlaybackUploaded, r.IsGap = false, true
		}
		rows = append(rows, r)
		pdt = pdt.Add(time.Duration(dur) * time.Millisecond)
	}
	return Playlist{
		StreamID: c.stream, BaseURL: dvr2Base, Cutoff: firstSeq, Owner: sid,
		Sessions: []Session{{ID: sid, TargetDuration: 6, MinSeq: firstSeq, InitUploaded: true}},
		Rows:     rows,
	}
}

func dvr2Gzip(t *testing.T, b []byte, level int) int {
	t.Helper()
	var buf bytes.Buffer
	w, err := gzip.NewWriterLevel(&buf, level)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := w.Write(b); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Len()
}

func TestDVR2PlaylistSize(t *testing.T) {
	if os.Getenv("DVR2_SIZE") == "" {
		t.Skip("DVR2_SIZE 미설정 — 블로그 재측정 전용")
	}
	cases := []dvr2Case{
		{name: "회차꼴_스트림8자_판2_GAP1", stream: "stream01", rows: 900, durMS: 4000, roundKey: true, timingV2: true, gapAt: 450},
		{name: "회차꼴_스트림16자_판2", stream: "stream0123456789", rows: 900, durMS: 4000, roundKey: true, timingV2: true, gapAt: -1},
		{name: "회차꼴_스트림32자_판2", stream: "stream0123456789stream0123456789", rows: 900, durMS: 4000, roundKey: true, timingV2: true, gapAt: -1},
		{name: "회차꼴_스트림8자_판2_길이±30ms", stream: "stream01", rows: 900, durMS: 4000, roundKey: true, timingV2: true, gapAt: -1, jitterMS: 30},
		{name: "옛꼴_스트림8자_판없음", stream: "stream01", rows: 900, durMS: 4000, roundKey: false, timingV2: false, gapAt: -1},
	}
	fmt.Printf("| 경우 | 조각 | 원본 B | 원본 KiB | gzip -6 B | gzip -9 B | 비율(-6) | 512KiB 대비 | 조각당 B | Validate |\n")
	fmt.Printf("|---|---|---|---|---|---|---|---|---|---|\n")
	for _, c := range cases {
		p := dvr2Playlist(t, c)
		body, err := Render(p)
		if err != nil {
			t.Fatalf("%s: Render: %v", c.name, err)
		}
		verr := Validate(p, body, 1, nil)
		vs := "통과"
		if verr != nil {
			vs = verr.Error()
		}
		g6, g9 := dvr2Gzip(t, body, gzip.DefaultCompression), dvr2Gzip(t, body, gzip.BestCompression)
		fmt.Printf("| %s | %d | %d | %.1f | %d | %d | %.3f | %.1f%% | %.1f | %s |\n", c.name, c.rows, len(body),
			float64(len(body))/1024, g6, g9, float64(g6)/float64(len(body)), 100*float64(len(body))/float64(MaxBodyBytes),
			float64(len(body))/float64(c.rows), vs)
		if c.gapAt >= 0 {
			_ = os.WriteFile(os.Getenv("DVR2_OUT")+"/sample-"+c.stream+".m3u8", body, 0o644)
		}
	}

	// 상한에 닿는 조각 길이: 1시간을 d 초 조각으로 채우면 행 수는 ceil(3600/d). 스트림 8자 회차꼴로 512KiB 를 넘는 첫 d(10ms 단위)를 찾는다.
	for _, stream := range []string{"stream01", "stream0123456789stream0123456789"} {
		var hit int32
		for d := int32(4000); d >= 100; d -= 10 {
			n := int((boundary.WindowMS + int64(d) - 1) / int64(d))
			p := dvr2Playlist(t, dvr2Case{stream: stream, rows: n, durMS: d, roundKey: true, timingV2: true, gapAt: -1})
			body, err := Render(p)
			if err != nil {
				t.Fatal(err)
			}
			if len(body) > MaxBodyBytes {
				hit = d
				verr := Validate(p, body, 1, nil)
				fmt.Printf("\n스트림 %d자 회차꼴: 1시간을 %.2f초 조각(%d개)으로 채우면 %d B > 상한 %d B — Validate: %v\n",
					len(stream), float64(d)/1000, n, len(body), MaxBodyBytes, verr)
				break
			}
		}
		if hit == 0 {
			fmt.Printf("\n스트림 %d자: 0.1초까지 상한에 닿지 않음\n", len(stream))
		}
	}

	// 저장소 골든(g6_f2 — 설계 실물, 옛 꼴 키 · 실제 도메인)과 견준다.
	if g, err := os.ReadFile("testdata/g6_f2.m3u8"); err == nil {
		fmt.Printf("\n저장소 골든 g6_f2.m3u8(900조각 · 옛 꼴 키): %d B, gzip -6 %d B\n", len(g), dvr2Gzip(t, g, gzip.DefaultCompression))
	}
}
