// TestCloseAutoCert copied verbatim from bluenviron/mediamtx PR #6427 (merge 065f94c2,
// internal/certloader/certloader_test.go). Dropped into other trees as a separate file.
package certloader_test

import (
	"os"
	"testing"
	"time"

	"github.com/bluenviron/mediamtx/internal/certloader"
	"github.com/bluenviron/mediamtx/internal/test"
	"github.com/stretchr/testify/require"
)

func TestCloseAutoCert(t *testing.T) {
	for _, ca := range []struct {
		name  string
		saved bool
	}{
		{"saved", true},
		{"not saved", false},
	} {
		t.Run(ca.name, func(t *testing.T) {
			t.Chdir(t.TempDir())

			if !ca.saved {
				// a directory with the same name prevents the key from being saved
				err := os.Mkdir("auto.key", 0o755)
				require.NoError(t, err)
			}

			loader := &certloader.CertLoader{
				CertPath:  "auto.crt",
				KeyPath:   "auto.key",
				AllowAuto: true,
				Parent:    test.NilLogger,
			}
			err := loader.Initialize()
			require.NoError(t, err)

			done := make(chan struct{})
			go func() {
				loader.Close()
				close(done)
			}()

			select {
			case <-done:
			case <-time.After(5 * time.Second):
				t.Fatal("Close() did not return")
			}
		})
	}
}
