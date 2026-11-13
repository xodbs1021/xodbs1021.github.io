package conf_test

// Measurement only (not part of MediaMTX): copy into internal/conf/ and run
//   go test -race -count=1 -run '^TestMeasureLoadWhileAuthenticate$' ./internal/conf
// One goroutine loads the configuration again and again (as a reload does) while the main goroutine
// authenticates with a manager built from an earlier load. The result is the number of
// "WARNING: DATA RACE" reports in the output.

import (
	"net"
	"sync"
	"testing"

	"github.com/bluenviron/mediamtx/internal/auth"
	"github.com/bluenviron/mediamtx/internal/conf"
)

const (
	measureLoads = 200
	measureAuths = 2000
)

func TestMeasureLoadWhileAuthenticate(t *testing.T) {
	c, _, err := conf.Load("", nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	m := &auth.Manager{Method: c.AuthMethod, InternalUsers: c.AuthInternalUsers}

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		for range measureLoads {
			if _, _, err2 := conf.Load("", nil, nil); err2 != nil {
				t.Error(err2)
				return
			}
		}
	}()

	denied := 0
	for range measureAuths {
		_, aerr := m.Authenticate(&auth.Request{
			Action:      conf.AuthActionRead,
			Path:        "cam",
			Credentials: &auth.Credentials{},
			IP:          net.ParseIP("127.0.0.1"),
		})
		if aerr != nil {
			denied++
		}
	}
	wg.Wait()
	t.Logf("authentications=%d denied=%d loads=%d", measureAuths, denied, measureLoads)
}
