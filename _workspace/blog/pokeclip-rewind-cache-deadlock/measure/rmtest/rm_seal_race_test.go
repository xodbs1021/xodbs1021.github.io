package main

// 공개 재측정용 시험(이 블로그 저장소에만 있음 — PokeClip-mono 에는 없다). run.sh 가 봉인 전 확인이 들어가기 전
// 판(PR 의 셋째 커밋 7c6f43c2 — 캐시 재적재와 감시 대조는 이미 들어 있음)의 media/cmd/segment-indexer 에 복사해 돌린다.
// 저장소의 기존 시험 도구(newSealLoop · stallAfterPublish · liveLedger · pushRow · at)만 쓴다.
//
// 장면: 봉인 스위치를 켠 상자가 회차 S 를 seq 3 까지 발행했다. 다른 상자가 4(③ 영구 실패) · 5 · 6(③ 확정)을 장부에
// 넣었다. 첫 30초 감시는 아직 오지 않는다. 0.5초부터 1초마다 26초까지 holdTick 을 돌린다.
//   push 없음  — 다른 상자 행이라 이 프로세스 인덱서의 push 가 하나도 없다(사건과 같은 모양).
//   push 있음  — 대조군. 같은 장부에 5 의 push 하나가 닿는다.

import (
	"testing"
	"time"

	"github.com/3K-PokeClip/pokeclip-mono/media/internal/index"
)

func rmAheadLedger() index.RewindLedger {
	l := liveLedger("s1", "S", 6, 3)
	l.Rows[5].PlaybackUploaded, l.Rows[6].PlaybackUploaded = true, true
	return l
}

func rmSealRace(t *testing.T, push bool) {
	f, sc, ends := newSealLoop(t)
	stallAfterPublish(f)
	f.work.ledgers["s1"] = rmAheadLedger()
	if push {
		f.pushRow("s1", "S", 5)
	}
	firstSeal := time.Duration(-1)
	for d := 500 * time.Millisecond; d <= 26*time.Second; d += time.Second {
		f.at(d)
		if firstSeal < 0 && len(sc.got()) > 0 {
			firstSeal = d
		}
	}
	published := int64(-1)
	if p := f.rewind.streams["s1"].pub.Prev; p != nil {
		published = p.PublishedSeq
	}
	owner, _ := f.cache.Owner("s1")
	t.Logf("RESULT push=%v seals=%v first_seal_at=%s ends=%v owner_state=%s loads=%d published_seq=%d",
		push, sc.got(), firstSeal, ends.calls, owner.State, len(f.work.loadCalls()), published)
	if len(ends.calls) != 0 {
		t.Errorf("회차 종료 = %v, want 없음 — 장부에는 4–6 이 있는데 봉인이 복구보다 먼저 왔다", ends.calls)
	}
	if published != 6 {
		t.Errorf("발행본 PublishedSeq = %d, want 6", published)
	}
}

func TestRMSealRaceNoPush(t *testing.T)   { rmSealRace(t, false) }
func TestRMSealRaceWithPush(t *testing.T) { rmSealRace(t, true) }
