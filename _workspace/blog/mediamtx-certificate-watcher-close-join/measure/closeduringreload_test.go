// TestCloseDuringReload copied verbatim from bluenviron/mediamtx PR #6261 head 7d95a222
// (internal/certloader/certloader_test.go). Dropped into other trees as a separate file.
package certloader_test

import (
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/bluenviron/mediamtx/internal/certloader"
	"github.com/bluenviron/mediamtx/internal/logger"
	"github.com/bluenviron/mediamtx/internal/test"
	"github.com/stretchr/testify/require"
)

func TestCloseDuringReload(t *testing.T) {
	serverCertPath := test.CreateTempFile(t, test.TLSCertPub)
	serverKeyPath := test.CreateTempFile(t, test.TLSCertKey)

	logEntered := make(chan struct{}, 1)
	logRelease := make(chan struct{})
	var blockLog atomic.Bool

	loader := &certloader.CertLoader{
		CertPath: serverCertPath,
		KeyPath:  serverKeyPath,
		Parent: test.Logger(func(logger.Level, string, ...any) {
			if !blockLog.Load() {
				return
			}
			select {
			case logEntered <- struct{}{}:
			default:
			}
			<-logRelease
		}),
	}
	err := loader.Initialize()
	require.NoError(t, err)

	closeDone := make(chan struct{})
	var closeOnce sync.Once
	startClose := func() {
		closeOnce.Do(func() {
			go func() {
				loader.Close()
				close(closeDone)
			}()
		})
	}

	defer func() {
		close(logRelease)
		startClose()

		select {
		case <-closeDone:
		case <-time.After(5 * time.Second):
			t.Errorf("Close() did not return")
		}
	}()

	blockLog.Store(true)
	err = os.WriteFile(serverCertPath, test.TLSCertPubAlt, 0o644)
	require.NoError(t, err)

	err = os.WriteFile(serverKeyPath, test.TLSCertKeyAlt, 0o644)
	require.NoError(t, err)

	select {
	case <-logEntered:
	case <-time.After(5 * time.Second):
		t.Errorf("timed out")
		return
	}

	startClose()

	select {
	case <-time.After(500 * time.Millisecond):
	case <-closeDone:
		t.Errorf("Close() returned while a reload was in progress")
	}
}
