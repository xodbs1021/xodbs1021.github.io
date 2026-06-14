from google import genai
import subprocess
import os
from datetime import datetime

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))

def get_content():
    print("내용 입력 (입력 끝나면 엔터 두 번):")
    lines = []
    empty_count = 0
    while True:
        line = input()
        if line == "":
            empty_count += 1
            if empty_count >= 2:
                break
            lines.append(line)
        else:
            empty_count = 0
            lines.append(line)
    return "\n".join(lines).strip()

def main():
    print("=== 태형이 따라잡기 자동 업로드 ===\n")
    content = get_content()

    print("\nGemini가 검토 중...")

    prompt = f"""You are a tech blog assistant. The user gives raw Korean study notes.
The content may start with a category tag like @tech blurting, @coding test, @open source analysis (with possible typos or case variations). Detect the category from this tag.

Categories:
- tech-blurting: anything resembling "tech blurting", "blurting", "bluting" etc.
- coding-test: anything resembling "coding test", "코딩테스트" etc.
- open-source-analysis: anything resembling "open source", "오픈소스" etc.

Your job:
1. Detect category from the tag
2. Generate a short English slug
3. Generate a Korean display title
4. Keep user's original content EXACTLY as-is (including the category tag)
5. Add supplementary feedback in Korean markdown

Respond ONLY in this exact format:
CATEGORY: category-slug
SLUG: your-english-slug
TITLE: 한국어 제목
FEEDBACK:
(feedback in Korean markdown)

Content:
{content}"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    raw = response.text

    lines = raw.split("\n")
    category_slug = "tech-blurting"
    slug = ""
    title = ""
    feedback_lines = []
    in_feedback = False

    for line in lines:
        if line.startswith("CATEGORY:"):
            category_slug = line.replace("CATEGORY:", "").strip()
        elif line.startswith("SLUG:"):
            slug = line.replace("SLUG:", "").strip()
        elif line.startswith("TITLE:"):
            title = line.replace("TITLE:", "").strip()
        elif line.startswith("FEEDBACK:"):
            in_feedback = True
        elif in_feedback:
            feedback_lines.append(line)

    feedback = "\n".join(feedback_lines).strip()
    date = datetime.now().strftime("%Y-%m-%d")

    markdown = f"""---
title: "{title}"
date: {date}
categories: ["{category_slug}"]
draft: false
---

## 내가 이해한 것

{content}

---

## 보완 및 정리

{feedback}
"""

    post_dir = os.path.expanduser(f"~/tech-blog/content/posts/{category_slug}")
    os.makedirs(post_dir, exist_ok=True)
    filepath = f"{post_dir}/{slug}.md"

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(markdown)

    print(f"\n✅ 파일 생성: {filepath}")
    print(f"📁 카테고리: {category_slug}")
    print(f"📝 제목: {title}")
    print("\n피드백 미리보기:")
    print("-" * 40)
    print(feedback[:500] + "..." if len(feedback) > 500 else feedback)
    print("-" * 40)

    confirm = input("\n업로드할까요? (y/n): ").strip().lower()
    if confirm == "y":
        os.chdir(os.path.expanduser("~/tech-blog"))
        subprocess.run(["git", "add", "."])
        subprocess.run(["git", "commit", "-m", f"post: {title}"])
        subprocess.run(["git", "push"])
        print("\n🚀 업로드 완료! 1~2분 후 블로그에 반영돼요.")
    else:
        print("업로드 취소됨. 파일은 저장되어 있어요.")

if __name__ == "__main__":
    main()
