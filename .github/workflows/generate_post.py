import os
import glob
from datetime import datetime
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

title = os.environ["ISSUE_TITLE"]
body = os.environ["ISSUE_BODY"]

# weight 없는 파일들의 최대 weight 찾기
import re
all_posts = sorted(glob.glob("content/posts/**/*.md", recursive=True))
max_weight = 0
for post in all_posts:
    with open(post, "r") as f:
        content = f.read()
    match = re.search(r'^weight:\s*(\d+)', content, re.MULTILINE)
    if match:
        max_weight = max(max_weight, int(match.group(1)))
next_weight = max_weight + 1

prompt = f"""You are a senior software engineer at a top Korean tech company (Naver, Kakao, Kakao TV, Chzzk level).
The user is a junior developer preparing to enter companies like Naver or Chzzk (Naver's live streaming platform).
They have written raw Korean study notes about a technical topic.

STRICT RULES:
- DO NOT give any writing advice or formatting tips
- ONLY talk about the TECHNICAL CONTENT itself
- If something is technically WRONG, correct it with a clear explanation of why
- If something is MISSING that would be expected knowledge for a Naver/Chzzk-level engineer, add it
- Point out practical real-world usage patterns used at large-scale Korean tech companies
- Mention performance considerations, scalability, and production-level concerns where relevant
- Write as a senior engineer doing a thorough technical code/concept review
- Be direct and specific, not generic

The notes may start with a category tag like @tech blurting, @coding test, @open source (with possible typos).
Categories:
- tech-blurting: "tech blurting", "blurting", "bluting" etc.
- coding-test: "coding test", "코딩테스트" etc.
- open-source-analysis: "open source", "오픈소스" etc.
- 0-to-1: "0 to 1", "zero to one", "0to1", "프로젝트" etc.
Default to tech-blurting if no tag found.

Respond ONLY in this exact format:
CATEGORY: category-slug
SLUG: your-english-slug
TITLE: 한국어 제목
FEEDBACK:
(feedback in Korean - leave empty if category is 0-to-1)

Issue Title: {title}
Content:
{body}"""

response = client.models.generate_content(
    model="gemini-2.0-flash-lite",
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
date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S+09:00")

if category_slug == "0-to-1" or not feedback:
    markdown = f"""---
title: "{post_title}"
date: {date}
categories: ["{category_slug}"]
draft: false
weight: {next_weight}
---

{body}
"""
else:
    markdown = f"""---
title: "{post_title}"
date: {date}
categories: ["{category_slug}"]
draft: false
weight: {next_weight}
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
print(f"weight: {next_weight}")
