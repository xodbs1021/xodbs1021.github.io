"""raw/ 원자료에서 글에 쓴 수치를 다시 뽑는다. 표준 라이브러리만 쓴다.

  python3 -I summarize.py <raw 폴더>   → 표준 출력(그대로 raw/summary.txt 로 저장했다)
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def sections(path):
    """### 표시 줄로 나눈 [(제목, [JSON 줄…])]."""
    out, title, rows = [], None, []
    for line in Path(path).read_text().splitlines():
        if line.startswith("### "):
            if title is not None:
                out.append((title, rows))
            title, rows = line[4:], []
        elif line.startswith("{"):
            rows.append(json.loads(line))
    if title is not None:
        out.append((title, rows))
    return out


def ts(s):
    s = s.replace("Z", "+00:00")
    if "." in s:  # 나노초는 마이크로초로 자른다
        head, rest = s.split(".", 1)
        frac, tz = rest[:-6], rest[-6:]
        s = f"{head}.{frac[:6]}{tz}"
    return datetime.fromisoformat(s).astimezone(timezone.utc)


def main(raw):
    raw = Path(raw)
    print("[A] 실제 만료별 창구가 보낸 만료(분)")
    print("설정_초,응답때_실제_남은_초,보낸_만료까지_초,실제_분,보낸_분")
    for title, rows in sections(raw / "A-expiry.txt"):
        state = next(r for r in rows if "expires_s" in r)
        resp = next(r for r in rows if r.get("label", "").startswith("A-"))
        real = (ts(state["expiration"]) - ts(resp["recv"])).total_seconds()
        sent = resp["sent_left_s"]
        print(f"{state['expires_s']},{real:.3f},{sent:.3f},{real / 60:.2f},{sent / 60:.2f}")

    print("\n[B] 요청별 응답")
    for title, rows in sections(raw / "B-auth.txt"):
        for r in rows:
            if "label" in r:
                print(f"{r['label']},{r['status']},{r.get('content_type')},{r.get('cache_control')}")
    for title, rows in sections(raw / "B2-netns.txt"):
        for r in rows:
            if r.get("label") == "B2-neighbor":
                print(f"{r['label']},{r['status']}")
            if r.get("msg") in ("cred_served", "cred_denied"):
                print(f"relay_log,{r['msg']},caller={r.get('caller', '-')},remote={r['remote']}")

    print("\n[C1 · C2] SDK Retrieve 수 대 창구 cred_served 수")
    for name, file in (("C1", "B2-netns.txt"), ("C2", "C2-sdk-window.txt")):
        retrieves, served, gaps = [], 0, []
        for title, rows in sections(raw / file):
            for r in rows:
                if r.get("step") == "retrieve" and r.get("ok"):
                    retrieves.append(r)
                if r.get("msg") == "cred_served" and r.get("caller") == "indexer":
                    served += 1
        print(f"{name},retrieve={len(retrieves)},relay_served={served},"
              f"first_sdk_expires_in_s={retrieves[0]['expires_in_s']}")

    print("\n[D1 · D2] 3초 간격 14회 요청 동안 가짜 IMDS 역할 자격 호출 수")
    for title, rows in sections(raw / "D1-D2-refresh.txt"):
        if title.startswith("D imds state"):
            print(f"imds_counts={rows[0]['counts']},expires_s={rows[0]['expires_s']}")
        if title.startswith("D relay log"):
            reasons = [r.get("refresh", "cache") for r in rows if r.get("msg") == "cred_served"]
            print("refresh=" + " ".join(reasons))

    print("\n[D3] 첫 원천 호출이 3초 걸릴 때")
    for title, rows in sections(raw / "D3-deadline.txt"):
        for r in rows:
            if "label" in r:
                print(f"{r['label']},{r['status']},{r['ms']}ms")

    print("\n[D4] 실제 만료 3분 · IMDS 실패 뒤 응답(실제 만료까지 남은 초)")
    secs = dict(sections(raw / "D4-degraded.txt"))
    exp = ts(secs["D4 imds state"][0]["expiration"])
    for r in secs["D4 first"] + secs["D4 imds fail, 10초 간격 15회"]:
        left = (exp - ts(r["recv"])).total_seconds()
        print(f"{r['label']},{r['status']},{r['ms']}ms,real_left_s={left:.1f}")
    print("imds_counts=" + json.dumps(secs["D4 imds state"][0]["counts"]))

    print("\n[E] 같은 망 칸 이웃의 엿보기(소켓 열림 · Authorization 머리 · 자격 JSON 이 보인 패킷 수)")
    for title, rows in sections(raw / "E-sniff.txt"):
        opened = next((r for r in rows if "sniff_open" in r), {})
        seen = next((r for r in rows if "packets" in r), {})
        print(f"{title[2:]},open={opened.get('sniff_open')},err={opened.get('err', '-')},"
              f"auth={seen.get('auth_header_packets', '-')},creds={seen.get('creds_json_packets', '-')}")


if __name__ == "__main__":
    main(sys.argv[1])
