// Command imdsprobe 는 공개 재측정용 SDK 소비자다. PokeClip-mono 의 media 모듈(같은 go.mod · go.sum)
// 안 cmd/imdsprobe 로 복사해 빌드한다 — 사이드카 · janitor 와 같은 판의 aws-sdk-go-v2 로 자격을 받는다.
//
//	imdsprobe [-n 횟수] [-every 간격]
//
// config.LoadDefaultConfig 의 기본 자격 사슬로 cfg.Credentials 를 만들고, 간격마다 Retrieve 를 불러 한 줄씩
// JSON 으로 남긴다. 자격 값은 싣지 않는다(가짜 값이어도 접두만).
package main

import (
	"context"
	"encoding/json"
	"flag"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
)

type line struct {
	Step      string `json:"step"`
	I         int    `json:"i,omitempty"`
	At        string `json:"at"`
	OK        bool   `json:"ok"`
	Source    string `json:"source,omitempty"`
	KeyPrefix string `json:"key_prefix,omitempty"`
	Expires   string `json:"expires,omitempty"`
	ExpiresIn int64  `json:"expires_in_s,omitempty"`
	Err       string `json:"err,omitempty"`
}

func emit(l line) {
	l.At = time.Now().UTC().Format(time.RFC3339Nano)
	_ = json.NewEncoder(os.Stdout).Encode(l)
}

func main() {
	n := flag.Int("n", 1, "Retrieve 횟수")
	every := flag.Duration("every", 0, "Retrieve 사이 간격")
	flag.Parse()

	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion("ap-northeast-2"))
	if err != nil {
		emit(line{Step: "load", OK: false, Err: err.Error()})
		os.Exit(1)
	}
	emit(line{Step: "load", OK: true})

	failed := false
	for i := 1; i <= *n; i++ {
		rctx, cancel := context.WithTimeout(ctx, 10*time.Second)
		c, err := cfg.Credentials.Retrieve(rctx)
		cancel()
		if err != nil {
			failed = true
			emit(line{Step: "retrieve", I: i, OK: false, Err: err.Error()})
		} else {
			prefix := c.AccessKeyID
			if len(prefix) > 8 {
				prefix = prefix[:8]
			}
			emit(line{Step: "retrieve", I: i, OK: true, Source: c.Source, KeyPrefix: prefix,
				Expires: c.Expires.UTC().Format(time.RFC3339), ExpiresIn: int64(time.Until(c.Expires) / time.Second)})
		}
		if i < *n {
			time.Sleep(*every)
		}
	}
	if failed {
		os.Exit(1)
	}
}
