package main

// 공개 재측정용 시험(이 블로그 저장소에만 있음 — PokeClip-mono 에는 없다). run.sh 가 고치기 전(0dc13a68)과
// 고친 뒤(00cfa2d6) 트리의 media/cmd/segment-indexer 에 같은 파일을 복사해 돌린다. 저장소의 기존 시험 도구
// (newPublishLoop · liveLedger · segRow · watchEveryHold · settleWatch)만 쓴다.
//
// 장면(2026-11-16 사건의 축소판): 이 프로세스는 회차 S 를 seq 3 까지 발행했다. 다른 상자가 seq 4 를 장부에 먼저
// 넣었고 4 의 ③ 은 영구 실패다(push 없음). 이 프로세스의 인덱서는 5 · 6 을 넣고 캐시에 push 한다. 30초 감시는
// 장부의 H+1(=4) 행을 돌려준다. 감시 한 번을 30초로 보고 70번(35분) 돌린다.

import (
	"log/slog"
	"testing"
	"time"

	"github.com/3K-PokeClip/pokeclip-mono/media/internal/index"
	"github.com/3K-PokeClip/pokeclip-mono/media/internal/rewind/publish"
)

func TestRMWatchDoesNotBreakDeadlock(t *testing.T) {
	f := newPublishLoop(t)
	f.watchEveryHold()
	f.put("s1", liveLedger("s1", "S", 3, 3))
	f.publishOnce("s1", "S", 3, loopBase)
	f.settleWatch(loopBase, 1)
	f.rewind.stream("s1").loadedAt = loopBase

	ledger := liveLedger("s1", "S", 6, 3) // 4: 다른 상자 몫 · ③ failed, 5 · 6: ③ uploaded
	ledger.Rows[5].PlaybackUploaded, ledger.Rows[6].PlaybackUploaded = true, true
	f.work.ledgers["s1"] = ledger
	for _, seq := range []int64{5, 6} {
		r := segRow("s1", "S", seq, false)
		f.cache.ApplyInsert("s1", seq, index.InsertCommit{SessionID: "S", PlaybackPDT: r.PlaybackPDT,
			PlaybackS3Key: r.PlaybackS3Key, DurationMS: r.DurationMS})
	}
	f.work.watchFn = func(probes []index.WatchProbe) publish.WatchOutcome {
		var w publish.WatchOutcome
		for _, p := range probes {
			d := index.WatchDrift{StreamID: p.StreamID, NextSeq: p.NextSeq, HasCutoff: true}
			if p.NextSeq >= 0 && p.NextSeq < int64(len(ledger.Rows)) {
				d.Next, d.HasNext = ledger.Rows[p.NextSeq], true
			}
			w.Drift = append(w.Drift, d)
		}
		return w
	}

	const watches = 70 // 30초 감시 70번 = 35분
	resumedAt := -1
	for i := range watches {
		at := loopBase.Add(time.Duration(i+1) * 30 * time.Second)
		f.hold(at)
		f.settleWatch(at, i+2)
		f.settle(at)
		if p := f.rewind.streams["s1"].pub.Prev; resumedAt < 0 && p != nil && p.PublishedSeq >= 6 {
			resumedAt = i + 1
		}
	}

	published := int64(-1)
	if p := f.rewind.streams["s1"].pub.Prev; p != nil {
		published = p.PublishedSeq
	}
	t.Logf("RESULT watches=%d loads=%d published_seq=%d resumed_at_watch=%d stall_lines=%d drift_repaired=%d",
		watches, len(f.work.loadCalls()), published, resumedAt,
		f.logs.count("rewind_publish_stall_seconds"), f.logs.count("cache_drift_repaired"))
	f.logs.mu.Lock()
	for _, r := range f.logs.records {
		if r.Message != "rewind_publish_stall_seconds" && r.Message != "cache_drift_repaired" {
			continue
		}
		attrs := map[string]any{}
		r.Attrs(func(a slog.Attr) bool { attrs[a.Key] = a.Value.Any(); return true })
		t.Logf("LOG %s %s gap=%v state=%v", r.Level, r.Message, attrs["gap"], attrs["state"])
	}
	f.logs.mu.Unlock()
	if published < 6 {
		t.Errorf("감시 %d번(35분) 뒤 발행본 PublishedSeq = %d, want 6 이상 — 교착이 풀리지 않았다", watches, published)
	}
}
