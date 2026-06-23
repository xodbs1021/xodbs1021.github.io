#!/usr/bin/env python3
"""
Stop hook — 강의 작성 sub-agent 호출 토큰 자동 측정.

매 클로드 턴 종료 시 발동.
직전 턴에 Task(Agent) 호출이 있었으면 transcript jsonl에서 토큰 정보 추출.
강의 관련 작업 (lesson-author / lesson-quality-guard / lesson-planner / curriculum-quality-guard / token-cost-analyzer) 인 경우만 _workspace/token_log.jsonl에 append.

자동 분석 없음 — raw 로그만. 분석은 사용자가 token-cost-analyzer 에이전트 명시 호출.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

LOG_PATH = Path("/Users/kty/tech-blog/_workspace/token_log.jsonl")
LESSON_AGENTS = {
    "lesson-author",
    "lesson-quality-guard",
    "lesson-planner",
    "curriculum-quality-guard",
    "token-cost-analyzer",
}


def read_input():
    """Stop hook stdin JSON."""
    try:
        return json.loads(sys.stdin.read())
    except Exception:
        return {}


def extract_recent_task_calls(transcript_path: str, max_messages: int = 80):
    """transcript jsonl에서 최근 N개 메시지 중 Task tool 호출 + 결과 추출."""
    p = Path(transcript_path)
    if not p.exists():
        return []

    # 마지막 N줄만 읽음 (메모리 절감)
    lines = []
    try:
        with p.open("r", encoding="utf-8") as f:
            for line in f:
                lines.append(line)
                if len(lines) > max_messages * 2:
                    lines = lines[-(max_messages * 2):]
    except Exception:
        return []

    task_calls = []  # {agent: name, tokens: int, lesson_hint: str|None}
    pending_uses = {}  # tool_use_id -> {description, prompt}

    for raw in lines[-max_messages:]:
        try:
            msg = json.loads(raw)
        except Exception:
            continue

        # tool_use (Task 호출)
        content = msg.get("message", {}).get("content", [])
        if isinstance(content, list):
            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "tool_use" and block.get("name") == "Task":
                    tu_id = block.get("id")
                    inp = block.get("input", {}) or {}
                    desc = inp.get("description", "") or ""
                    prompt = inp.get("prompt", "") or ""
                    pending_uses[tu_id] = {
                        "description": desc,
                        "prompt": prompt[:1000],  # 헤더만
                    }
                elif block.get("type") == "tool_result":
                    tu_id = block.get("tool_use_id")
                    if tu_id not in pending_uses:
                        continue
                    info = pending_uses.pop(tu_id)
                    # tool_result content에 usage 패턴 검색
                    result_text = ""
                    rc = block.get("content", "")
                    if isinstance(rc, list):
                        result_text = " ".join(
                            (c.get("text", "") if isinstance(c, dict) else str(c))
                            for c in rc
                        )
                    elif isinstance(rc, str):
                        result_text = rc
                    # <usage><total_tokens>NN</total_tokens></usage> 또는 total_tokens: NN
                    m = re.search(
                        r"total[_-]?tokens['\":\s]*(\d+)", result_text, re.IGNORECASE
                    )
                    tokens = int(m.group(1)) if m else 0

                    # 어떤 에이전트인지 prompt + description에서 추출
                    blob = (info["description"] + " " + info["prompt"]).lower()
                    agent_hit = None
                    for a in LESSON_AGENTS:
                        if a in blob:
                            agent_hit = a
                            break

                    # 강의 식별자 추출 (A-1-1, B-3-2, A-1, etc.)
                    lesson_match = re.search(
                        r"\b([A-QN-P])-(\d+)(?:-(\d+))?\b",
                        info["description"] + " " + info["prompt"][:500],
                    )
                    lesson_hint = None
                    if lesson_match:
                        track, lvl, idx = lesson_match.groups()
                        lesson_hint = (
                            f"{track}-{lvl}-{idx}" if idx else f"{track}-{lvl}"
                        )

                    if agent_hit:
                        task_calls.append(
                            {
                                "agent": agent_hit,
                                "tokens": tokens,
                                "lesson_hint": lesson_hint,
                                "description": info["description"][:80],
                            }
                        )
    return task_calls


def write_log(entries):
    """token_log.jsonl에 append."""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).isoformat()
    with LOG_PATH.open("a", encoding="utf-8") as f:
        for e in entries:
            e["timestamp"] = ts
            f.write(json.dumps(e, ensure_ascii=False) + "\n")


def main():
    data = read_input()
    transcript_path = data.get("transcript_path")
    if not transcript_path:
        sys.exit(0)

    calls = extract_recent_task_calls(transcript_path)
    if not calls:
        sys.exit(0)

    # 같은 lesson_hint로 그룹핑 (한 턴에 여러 에이전트 호출 가능)
    write_log(calls)

    # 조용히 종료 (자동 분석 X)
    sys.exit(0)


if __name__ == "__main__":
    main()
