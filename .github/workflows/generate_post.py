import os
from datetime import datetime
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

title = os.environ["ISSUE_TITLE"]
body = os.environ["ISSUE_BODY"]

prompt = f"""You are a senior software engineer. The user wrote raw study notes about a technical topic in Korean.

STRICT RULES:
- DO NOT give any writing advice, formatting tips, or suggestions on how to improve the notes
- DO NOT say things like "잘 정리해주셨습니다" or "가독성을 높이면 좋습니다"
- ONLY talk about the TECHNICAL CONTENT itself
- If something is technically WRONG, correct it and explain why
- If something is MISSING, add the missing technical knowledge
- Write as a knowledgeable engineer explaining the topic, not as a writing coach

The notes may start with a category tag like @tech blurting, @coding test, @open source.
Categories:
- tech-blurting: "tech blurting", "blurting", "bluting" etc.
- coding-test: "coding test", "코딩테스트" etc.
- open-source-analysis: "open source", "오픈소스" etc.
Default to tech-blurting if no tag found.

Respond ONLY in this exact format:
CATEGORY: category-slug
SLUG: your-english-slug
TITLE: 한국어 기술 제목 (예: "Kafka 핵심 개념 정리")
FEEDBACK:
(Write technical corrections and additions in Korean. Be specific and technical. No writing advice.)

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
