"""macOS 크래시 보고서(.ips)에서 예외 · 잘못된 주소 · 죽은 스레드의 앞 프레임만 뽑는다.

쓰기: python3 -I crash_summary.py <report.ips> [프레임 수]
보고서 전체(기기 식별자 · 다른 스레드 · 이미지 목록)는 옮기지 않는다.
"""
import json
import sys


def summarize(path: str, depth: int) -> str:
    with open(path, encoding="utf-8") as fh:
        _header, body = fh.read().split("\n", 1)
    report = json.loads(body)
    images = report["usedImages"]
    thread = next(t for t in report["threads"] if t.get("triggered"))
    state = thread["threadState"]
    exc = report["exception"]
    lines = [
        f"exception {exc['type']} {exc.get('signal', '')} {exc.get('subtype', '')}".rstrip(),
        f"far 0x{state['far']['value']:x}  esr {state['esr'].get('description', '')}",
        f"x0 0x{state['x'][0]['value']:x}",
        f"os {report.get('osVersion', {}).get('train', '')} {report.get('osVersion', {}).get('build', '')}",
        "frames:",
    ]
    for i, frame in enumerate(thread["frames"][:depth]):
        image = images[frame["imageIndex"]].get("name", "?")
        symbol = frame.get("symbol", "?")
        where = ""
        if frame.get("sourceFile"):
            where = f"  ({frame['sourceFile']}:{frame.get('sourceLine', '?')})"
        lines.append(f"  {i} {image} {symbol} + {frame.get('symbolLocation', 0)}{where}")
    return "\n".join(lines)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: crash_summary.py <report.ips> [depth]")
    print(summarize(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 8))
