// 라이브 원본(MediaMTX)의 목록 응답 꼴을 흉내 내는 작은 상류 서버.
//
// MediaMTX v1.21.1 이 쓰는 gohlslib v2.4.5 의 handleMediaPlaylist 처럼 Content-Length 를
// 정하지 않고 WriteHeader(200) 뒤 Write(본문) 한 번으로 보낸다. 그러면 Go net/http 가
// 본문이 2,048B(bufferBeforeChunkingSize) 안이면 Content-Length 를 붙이고, 넘으면
// chunked 로 보낸다. MediaMTX 자체를 띄우지는 않는다.
//
//	GET /bytes/<n>.m3u8 — 되감기 목록 본문(-body 파일)의 앞 n 바이트
//	GET /full.m3u8      — 본문 전체
package main

import (
	"flag"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:8888", "listen address")
	bodyPath := flag.String("body", "", "playlist body file")
	flag.Parse()

	body, err := os.ReadFile(*bodyPath)
	if err != nil {
		log.Fatal(err)
	}

	write := func(w http.ResponseWriter, content []byte) {
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
		w.WriteHeader(http.StatusOK)
		w.Write(content)
	}

	http.HandleFunc("/full.m3u8", func(w http.ResponseWriter, _ *http.Request) { write(w, body) })
	http.HandleFunc("/bytes/", func(w http.ResponseWriter, r *http.Request) {
		n, err := strconv.Atoi(strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/bytes/"), ".m3u8"))
		if err != nil || n < 1 || n > len(body) {
			http.NotFound(w, r)
			return
		}
		write(w, body[:n])
	})
	log.Fatal(http.ListenAndServe(*addr, nil))
}
