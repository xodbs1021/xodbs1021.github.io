#!/usr/bin/env python3
"""
이미지 검색 및 생성 스크립트

흐름:
  1. Unsplash 스톡 검색 → 있으면 바로 사용 (UNSPLASH_ACCESS_KEY 필요)
  2. 없으면 → Stable Horde로 AI 이미지 생성 (완전 무료, API 키 불필요)

Usage:
  python3 image_manager.py --topic "HLS segmentation" --filename "hls-segments"
  python3 image_manager.py --topic "WebRTC TURN" --filename "webrtc-turn" --generate

Optional env vars:
  UNSPLASH_ACCESS_KEY    스톡 사진 검색용 (없으면 AI 생성)
  STABLE_HORDE_KEY       Stable Horde API 키 (없으면 익명 키 사용, 큐 우선순위 낮음)
"""

import argparse
import base64
import os
import sys
import time
import requests
from pathlib import Path

UNSPLASH_KEY = os.environ.get("UNSPLASH_ACCESS_KEY", "")
HORDE_KEY = os.environ.get("STABLE_HORDE_KEY", "0000000000")  # 익명 키
IMAGES_DIR = Path.home() / "tech-blog" / "static" / "images"

HORDE_API = "https://stablehorde.net/api/v2"


# ─── Step 1: Unsplash 스톡 검색 ──────────────────────────────────────────────

def search_unsplash(topic: str) -> tuple[bytes, str] | None:
    if not UNSPLASH_KEY:
        print("  ℹ️  UNSPLASH_ACCESS_KEY 없음 → AI 생성으로 진행")
        return None

    try:
        resp = requests.get(
            "https://api.unsplash.com/search/photos",
            params={"query": topic, "per_page": 3, "orientation": "landscape"},
            headers={"Authorization": f"Client-ID {UNSPLASH_KEY}"},
            timeout=10,
        )
        results = resp.json().get("results", []) if resp.status_code == 200 else []
        if not results:
            print("  ℹ️  Unsplash 결과 없음 → AI 생성으로 전환")
            return None

        photographer = results[0]["user"]["name"]
        img_resp = requests.get(results[0]["urls"]["regular"], timeout=30)
        if img_resp.status_code == 200:
            print(f"  📸 Unsplash 이미지 발견 (by {photographer})")
            return img_resp.content, "jpg"

    except Exception as e:
        print(f"  ⚠️  Unsplash 오류: {e}")

    return None


# ─── Step 2: Stable Horde로 이미지 생성 (무료, 키 불필요) ────────────────────

def generate_with_stable_horde(topic: str) -> tuple[bytes, str] | None:
    """
    Stable Horde — 커뮤니티 GPU 분산 네트워크. 완전 무료, 익명 사용 가능.
    익명 키(0000000000) 사용 시 큐 대기 시간이 길 수 있음 (1~5분).
    STABLE_HORDE_KEY 환경변수 설정 시 우선순위 높아짐 (stablehorde.net 가입 후 발급).
    """
    prompt = (
        f"tech blog illustration for {topic}, "
        "minimal flat design, light background, clean professional, "
        "no text, no watermark, no labels, modern developer blog style"
    )

    payload = {
        "prompt": prompt,
        "params": {
            "width": 1024,
            "height": 576,   # 16:9 비율
            "steps": 20,
            "cfg_scale": 7,
            "sampler_name": "k_euler",
            "n": 1,
        },
        "models": ["Deliberate"],
        "r2": True,  # R2 스토리지 사용 (base64보다 안정적)
    }

    headers = {
        "apikey": HORDE_KEY,
        "Content-Type": "application/json",
    }

    try:
        print("  🌐 Stable Horde 이미지 생성 요청 중...")
        resp = requests.post(f"{HORDE_API}/generate/async", json=payload, headers=headers, timeout=30)

        if resp.status_code not in (200, 202):
            print(f"  ❌ Stable Horde 요청 실패: {resp.status_code} {resp.text[:200]}")
            return None

        job_id = resp.json().get("id")
        if not job_id:
            print("  ❌ job ID를 받지 못했습니다")
            return None

        print(f"  ⏳ 생성 중... (job: {job_id[:8]}...) 최대 5분 소요")

        # 완료까지 폴링
        for attempt in range(60):  # 최대 5분 (5초 간격)
            time.sleep(5)
            check = requests.get(f"{HORDE_API}/generate/check/{job_id}", headers=headers, timeout=10)

            if check.status_code != 200:
                continue

            status = check.json()
            done = status.get("done", False)
            queue_pos = status.get("queue_position", "?")
            wait_time = status.get("wait_time", "?")

            if not done:
                if attempt % 3 == 0:
                    print(f"  ⏳ 대기 중... (큐 위치: {queue_pos}, 예상: {wait_time}초)")
                continue

            # 완료 — 결과 가져오기
            result = requests.get(f"{HORDE_API}/generate/status/{job_id}", headers=headers, timeout=30)
            if result.status_code != 200:
                print(f"  ❌ 결과 가져오기 실패: {result.status_code}")
                return None

            generations = result.json().get("generations", [])
            if not generations:
                print("  ❌ 생성된 이미지가 없습니다")
                return None

            gen = generations[0]

            # R2 URL 방식
            img_url = gen.get("img")
            if img_url and img_url.startswith("http"):
                img_resp = requests.get(img_url, timeout=30)
                if img_resp.status_code == 200:
                    print("  🎨 이미지 생성 완료")
                    return img_resp.content, "webp"

            # base64 fallback
            img_b64 = gen.get("img", "")
            if img_b64 and not img_b64.startswith("http"):
                img_data = base64.b64decode(img_b64)
                print("  🎨 이미지 생성 완료")
                return img_data, "webp"

            print("  ❌ 이미지 데이터 형식 오류")
            return None

        print("  ❌ 타임아웃 (5분 초과)")
        return None

    except Exception as e:
        print(f"  ❌ Stable Horde 오류: {e}")
        return None


# ─── 메인 ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="블로그 이미지 검색/생성")
    parser.add_argument("--topic", required=True, help="이미지 주제 (영어 키워드 권장)")
    parser.add_argument("--filename", required=True, help="저장 파일명 (확장자 제외)")
    parser.add_argument(
        "--generate", action="store_true",
        help="Unsplash 검색 없이 바로 AI 생성",
    )
    args = parser.parse_args()

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    image_data: bytes | None = None
    ext = "jpg"

    # Step 1: Unsplash 스톡 검색
    if not args.generate:
        print(f"🔍 Unsplash에서 '{args.topic}' 검색 중...")
        result = search_unsplash(args.topic)
        if result:
            image_data, ext = result

    # Step 2: Stable Horde AI 생성
    if image_data is None:
        print("🎨 Stable Horde로 이미지 생성 중...")
        result = generate_with_stable_horde(args.topic)
        if result:
            image_data, ext = result
        else:
            print("\n❌ 이미지 획득 실패. 이미지 없이 포스트를 올리거나 직접 추가하세요.")
            sys.exit(1)

    # 파일 저장 (충돌 방지)
    output_path = IMAGES_DIR / f"{args.filename}.{ext}"
    if output_path.exists():
        counter = 2
        while (IMAGES_DIR / f"{args.filename}-{counter}.{ext}").exists():
            counter += 1
        output_path = IMAGES_DIR / f"{args.filename}-{counter}.{ext}"

    output_path.write_bytes(image_data)

    markdown_ref = f"![{args.topic}](/images/{output_path.name})"
    print(f"\n✅ 저장: {output_path}")
    print(f"📝 마크다운: {markdown_ref}")


if __name__ == "__main__":
    main()
