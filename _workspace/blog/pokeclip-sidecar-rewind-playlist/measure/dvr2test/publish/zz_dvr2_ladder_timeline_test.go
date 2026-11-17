package publish

// 블로그 재측정 전용 시험(이 파일은 공개 저장소에 없다 — tech-blog _workspace/blog/pokeclip-sidecar-rewind-playlist/measure).
// 정체 사다리의 순수 판정(evaluateLadder)을 기본 설계값으로 두고, 가짜 시각을 10ms씩 옮기며 각 단계가 처음 서는 때를
// 잰다. 픽스처(stalledRows · ladderInput · ladderRow)는 저장소의 ladder_test.go 것을 그대로 쓴다 — 회차 S 의 4초 조각
// 0..10, 머리 5, 사다리가 보는 행 k = 6.
//
// 시각 기준: t = 0 은 「마지막 발행 성공」(PublishedAt — stallAge 의 기점)이다. 그 발행은 행 6 의 PDT(= 행 5 의 끝)보다
// delta 뒤에 있었다고 둔다(설명용 가정 — 재지 않은 값). 그래서 holdAge = t + delta − 6초(길이 4 + E2E_BUDGET 2)다.
// 운영 루프는 1초 틱마다 평가하므로 실제로는 문턱 뒤 첫 틱에 선다.
//
// 실행: DVR2_LADDER=1 go test -count=1 -run TestDVR2LadderTimeline -v ./internal/rewind/publish/

import (
	"fmt"
	"log/slog"
	"os"
	"testing"
	"time"
)

type dvr2Scenario struct {
	name       string
	delta      time.Duration
	seal       bool // REWIND_STALL_SEAL 켬(StallSealAfter = DAct)
	snap       func() rowsSnapshot
	unstood    bool // 직전 GAP 틱이 서지 않았다(UnstoodGapSeq = 6)
	viewBehind bool
}

func TestDVR2LadderTimeline(t *testing.T) {
	if os.Getenv("DVR2_LADDER") == "" {
		t.Skip("DVR2_LADDER 미설정 — 블로그 재측정 전용")
	}
	noRow := func() rowsSnapshot { s := stalledRows(); s.rows = s.rows[:6]; return s }
	incomplete := func() rowsSnapshot { s := stalledRows(); s.rows[6].PlaybackS3Key = ""; return s }
	scenarios := []dvr2Scenario{
		{name: "A 행 6 있음 · 업로드 막힘", delta: time.Second, snap: stalledRows},
		{name: "A′ 같은 장면 · 직전 발행이 0.3초 뒤", delta: 300 * time.Millisecond, snap: stalledRows},
		{name: "B GAP 틱이 서지 않음 · 봉인 켬", delta: time.Second, snap: stalledRows, unstood: true, seal: true},
		{name: "C 행 6 없음(no_row) · 봉인 끔", delta: time.Second, snap: noRow},
		{name: "C′ 행 6 없음(no_row) · 봉인 켬", delta: time.Second, snap: noRow, seal: true},
		{name: "D 행 6 부적격(키 없음) · 봉인 끔", delta: time.Second, snap: incomplete},
		{name: "D′ 행 6 부적격(키 없음) · 봉인 켬", delta: time.Second, snap: incomplete, seal: true},
		{name: "E 캐시 뒤처짐(view_behind) · 봉인 켬", delta: time.Second, snap: noRow, viewBehind: true, seal: true},
	}
	opt := DefaultOptions("w-me", fxBaseURL)
	fmt.Printf("설계값: L1 %v · L2(GAP_HOLD) %v · E2E_BUDGET %v · L2′(D_act) %v · L4(갱신 의무 − T_edge) %v\n\n",
		opt.ExpediteAfter, opt.GapHold, opt.E2EBudget, opt.DAct(), opt.RefreshObligation-opt.EdgeDelay)
	fmt.Println("| 장면 | 일 | stallAge(초) | holdAge(초) | 신호 |")
	fmt.Println("|---|---|---|---|---|")
	for _, sc := range scenarios {
		o := opt
		if sc.seal {
			o.StallSealAfter = o.DAct()
		}
		published := ladderBase.Add(24*time.Second + sc.delta) // 행 6 의 PDT 는 24초
		var st LadderState
		seen := map[string]bool{}
		for step := time.Duration(0); step <= 12*time.Second; step += 10 * time.Millisecond {
			now := published.Add(step)
			in := ladderInput(sc.snap(), now)
			in.PublishedAt = published
			in.OwnedSince = ladderBase
			in.ViewBehind = sc.viewBehind
			if sc.unstood {
				k := int64(6)
				in.UnstoodGapSeq = &k
			}
			next, got, sig := evaluateLadder(o, st, in)
			st = next
			holdCol := "–" // 행 6 이 캐시 뷰에 없으면 holdAge 를 잴 수 없다
			if _, found := rowAt(in.Snapshot, 6); found {
				holdCol = fmt.Sprintf("%.2f", now.Sub(dueOf6).Seconds())
			}
			emit := func(what, signal string) {
				if seen[what] {
					return
				}
				seen[what] = true
				fmt.Printf("| %s | %s | %.2f | %s | %s |\n", sc.name, what, step.Seconds(), holdCol, signal)
			}
			if got.Expedite {
				emit("L1 업로드 재시도 당김", "")
			}
			if got.Gap {
				emit("L2 GAP 틱", "")
			}
			if got.Seal {
				emit("L2′ 봉인", "")
			}
			if sig != nil {
				lvl := "WARN"
				if sig.level == slog.LevelError {
					lvl = "ERROR"
				}
				gap := ""
				for i := 0; i+1 < len(sig.attrs); i += 2 {
					if sig.attrs[i] == "gap" {
						gap = fmt.Sprint(sig.attrs[i+1])
					}
				}
				emit("L4 경보", fmt.Sprintf("%s gap=%s", lvl, gap))
			}
			if (got.Gap && !sc.unstood) || got.Seal {
				break // GAP 틱이 나가면 목록이 나아가고, 봉인이 서면 목록이 닫힌다 — 그 뒤는 이 장면 밖
			}
		}
		if len(seen) == 0 {
			fmt.Printf("| %s | (12초 안에 아무 일도 없음) | – | – | – |\n", sc.name)
		}
	}
}
