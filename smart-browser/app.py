from flask import Flask, request, jsonify
from datetime import datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
import anthropic
import os, json
from rapidfuzz import fuzz

load_dotenv()

app = Flask(__name__)
client = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
PDT = ZoneInfo("America/Los_Angeles")


def parse_with_claude(query):
    prompt = f"""
You are a natural language assistant that parses vague browser search queries into structured filters.

You must return a JSON object with the following fields:
- platform: one of youtube, tiktok, instagram, netflix, spotify, hulu (or null)
- time_range: the natural time phrase (e.g. "last tuesday")
- from_date: start of range in PST ISO format (e.g. "2025-05-13T00:00:00-07:00") or null
- to_date: end of range in PST ISO format (e.g. "2025-05-14T00:00:00-07:00") or null
- ordinal: rank (1 = first, 2 = second, -1 = last, etc), or null
- keywords: list of search keywords
- hashtags: list of hashtags
- type: media type (e.g. "video", "song") or null
- synonyms: dictionary mapping each keyword to a list of 1–3 synonyms

Examples:
Query: "funny tiktok from yesterday"
JSON:
{{
  "platform": "tiktok",
  "time_range": "yesterday",
  "from_date": "2025-05-22T00:00:00-07:00",
  "to_date": "2025-05-23T00:00:00-07:00",
  "ordinal": null,
  "keywords": ["funny"],
  "hashtags": [],
  "type": "video",
  "synonyms": {{"funny": ["humor", "comedy"]}}
}}

Query: "second to last workout video on YouTube from last Tuesday"
JSON:
{{
  "platform": "youtube",
  "time_range": "last tuesday",
  "from_date": "2025-05-13T00:00:00-07:00",
  "to_date": "2025-05-14T00:00:00-07:00",
  "ordinal": 2,
  "keywords": ["workout"],
  "hashtags": [],
  "type": "video",
  "synonyms": {{"workout": ["exercise", "training"]}}
}}

Query: "instagram post from day before yesterday"
JSON:
{{
  "platform": "instagram",
  "time_range": "day before yesterday",
  "from_date": "2025-05-21T00:00:00-07:00",
  "to_date": "2025-05-22T00:00:00-07:00",
  "ordinal": null,
  "keywords": ["post"],
  "hashtags": [],
  "type": "video",
  "synonyms": {{"post": ["upload", "content"]}}
}}

Query: "{query}"
JSON:
"""
    try:
        res = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(res.content[0].text.strip())
    except Exception as e:
        print(f"❌ Claude error: {e}")
        return None


@app.route("/parse", methods=["POST"])
def parse_only():
    data = request.get_json()
    if not data or "query" not in data:
        return jsonify({"error": "Missing query"}), 400
    parsed = parse_with_claude(data["query"])
    if not parsed:
        return jsonify({"error": "Failed to parse query"}), 400
    return jsonify(parsed)

@app.route("/filter", methods=["POST"])
def handle_filter():
    data = request.get_json()
    if not data or "query" not in data or "pages" not in data:
        return jsonify({"error": "Missing query or pages"}), 400

    query = data["query"]
    pages = data["pages"]
    parsed = parse_with_claude(query)

    if not parsed:
        return jsonify({"error": "Parsing failed"}), 400

    keywords = parsed.get("keywords", [])
    synonyms = parsed.get("synonyms", {})
    all_terms = set(keywords)
    for k in keywords:
        all_terms.update(synonyms.get(k, []))
    all_terms = [t.lower() for t in all_terms]

    platform = parsed.get("platform", "")
    hashtags = parsed.get("hashtags", [])
    from_date = parsed.get("from_date")
    to_date = parsed.get("to_date")

    if from_date:
        from_date = datetime.fromisoformat(from_date)
    if to_date:
        to_date = datetime.fromisoformat(to_date)

    def matches_page(page):
        title = (page.get("title") or "").lower()
        url = (page.get("url") or "").lower()
        content = (page.get("content") or "").lower()
        combined = f"{title} {content}"

        if platform and platform not in url and platform not in title:
            return False

        if from_date and to_date and page.get("time"):
            dt = datetime.fromtimestamp(page["time"] / 1000.0).astimezone(PDT)
            if dt < from_date or dt > to_date:
                return False

        if all_terms and not any(fuzz.partial_ratio(term, combined) > 80 for term in all_terms):
            return False

        if hashtags and not any(tag in combined for tag in hashtags):
            return False

        return True

    filtered = [p for p in pages if matches_page(p)]
    filtered.sort(key=lambda x: x.get("time", 0), reverse=True)

    def summarize(p):
        return {
            "url": p["url"],
            "title": p.get("title", "")[:60],
            "summary": p.get("content", "")[:150],
            "time": p.get("time")
        }

    return jsonify([summarize(p) for p in filtered[:10]])

if __name__ == "__main__":
    app.run(debug=True, port=5000)
