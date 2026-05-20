import os
import re
from datetime import datetime
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

title = os.environ["ISSUE_TITLE"]
body = os.environ["ISSUE_BODY"]

prompt = f"""You are a tech blog assistant. The user gives raw Korean study notes.
The issue title or body may contain a category tag like @tech blurting, @coding test, @open source analysis (with possible typos or case variations).

Categories:
- tech-blurting: anything resembling "tech blurting", "blurting", "bluting" etc.
- coding-test: anything resembling "coding test", "coding-test", "코딩테스트" etc.
- open-source-analysis: anything resembling "open source", "오픈소스" etc.

If no category tag found, default to tech-blurting.

Your job:
1. Detect category
2. Generate a short English slug (lowercase, hyphens only)
3. Generate a Korean display title
4. Keep user original content EXACTLY as-is
5. Add supplementary feedback in Korean markdown

Respond ONLY in this exact format:
CATEGORY: category-slug
SLUG: your-english-slug
TITLE: 한국어 제목
FEEDBACK:
(feedback in Korean markdown)

Issue Title: {title}
Content:
{body}"""

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
)
raw = response.text

lines = raw.split("\n")
category_slug = "tech-blurting"
slug = ""
post_title = ""
feedback_lines = []
in_feedback = False

for line in lines:
    if line.startswith("CATEGORY:"):
        category_slug = line.replace("CATEGORY:", "").strip()
    elif line.startswith("SLUG:"):
        slug = line.replace("SLUG:", "").strip()
    elif line.startswith("TITLE:"):
        post_title = line.replace("TITLE:", "").strip()
    elif line.startswith("FEEDBACK:"):
        in_feedback = True
    elif in_feedback:
        feedback_lines.append(line)

feedback = "\n".join(feedback_lines).strip()
date = datetime.now().strftime("%Y-%m-%d")

markdown = f"""---
title: "{post_title}"
date: {date}
categories: ["{category_slug}"]
draft: false
---

## 내가 이해한 것

{body}

---

## 보완 및 정리

{feedback}
"""

post_dir = f"content/posts/{category_slug}"
os.makedirs(post_dir, exist_ok=True)
filepath = f"{post_dir}/{slug}.md"

with open(filepath, "w", encoding="utf-8") as f:
    f.write(markdown)

print(f"파일 생성: {filepath}")
print(f"카테고리: {category_slug}")
print(f"제목: {post_title}")
