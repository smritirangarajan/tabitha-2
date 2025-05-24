from flask import Flask, request, jsonify
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from collections import Counter, defaultdict
from dotenv import load_dotenv
import anthropic
import os, json, re
from rapidfuzz import fuzz

load_dotenv()

app = Flask(__name__)
client = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
PDT = ZoneInfo("America/Los_Angeles")

def parse_with_claude(query):
    now = datetime.now(PDT)
    today_pst = now.strftime("%Y-%m-%d")
    weekday = now.weekday()
    last_tuesday = now - timedelta(days=(weekday - 1 + 7) % 7 + 1)
    last_tuesday_pst = last_tuesday.strftime("%Y-%m-%d")
    yesterday_pst = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    day_before_yesterday_pst = (now - timedelta(days=2)).strftime("%Y-%m-%d")

    prompt = f"""
You are a natural language assistant that parses vague browser search queries into structured filters.

Today's date is {today_pst}, yesterday was {yesterday_pst}, the day before yesterday was {day_before_yesterday_pst}, and last Tuesday was {last_tuesday_pst}.
All times are in Pacific Time (PDT, UTC-7).

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

Query: "funny tiktok from yesterday"
JSON:
{{
  "platform": "tiktok",
  "time_range": "yesterday",
  "from_date": "2025-05-23T00:00:00-07:00",
  "to_date": "2025-05-24T00:00:00-07:00",
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
  "from_date": "2025-05-22T00:00:00-07:00",
  "to_date": "2025-05-23T00:00:00-07:00",
  "ordinal": null,
  "keywords": ["post"],
  "hashtags": [],
  "type": "video",
  "synonyms": {{"post": ["upload", "content"]}}
}}

Query: "netflix from one month ago"
JSON:
{{
  "platform": "netflix",
  "time_range": "one month ago",
  "from_date": "2025-04-24T00:00:00-07:00",
  "to_date": "2025-04-25T00:00:00-07:00",
  "ordinal": null,
  "keywords": [],
  "hashtags": [],
  "type": null,
  "synonyms": {{}}
}}

Query: "reddit posts from last week"
JSON:
{{
  "platform": "reddit",
  "time_range": "last week",
  "from_date": "2025-05-13T00:00:00-07:00",
  "to_date": "2025-05-20T00:00:00-07:00",
  "ordinal": null,
  "keywords": ["posts"],
  "hashtags": [],
  "type": null,
  "synonyms": {{"posts": ["threads", "discussions"]}}
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

    print("\n✨ Claude Parsed Output:", json.dumps(parsed, indent=2))

    platform = parsed.get("platform", "")
    keywords = parsed.get("keywords", [])
    if platform and platform not in keywords:
        keywords.append(platform)
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
        domain = url.split("//")[-1].split("/")[0].replace("www.", "")
        combined = f"{title} {url} {content} {domain}"


        if platform and all(platform not in s for s in [url, title, domain]):
            return False

        if from_date and to_date and page.get("time"):
            dt = datetime.fromtimestamp(page["time"] / 1000.0).astimezone(PDT)
            if dt < from_date or dt >= to_date:
                return False

        if all_terms and not any(term in combined for term in all_terms):
            return False

        if hashtags and not any(tag in combined for tag in hashtags):
            return False

        print("✅ Matched page:")
        print("   URL: {}".format(page.get("url")))
        print("   Title: {}".format(page.get("title")))
        print("   Time: {}".format(datetime.fromtimestamp(page["time"] / 1000.0).astimezone(PDT).isoformat()))
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

# -------- INSIGHTS ENDPOINT --------
@app.route("/api/insights", methods=["POST"])
def get_insights():
    data = request.get_json()
    pages = data.get("pages", [])
    visits = []

    for entry in pages:
        url = entry.get("url", "")
        timestamp = entry.get("lastVisitTime")
        if not url or not timestamp:
            continue
        domain = url.split("//")[-1].split("/")[0]
        dt = datetime.fromtimestamp(timestamp / 1000.0).astimezone(PDT)
        visits.append((dt, domain))

    visits.sort()  # sort chronologically

    # --- 1. Top domains ---
    domain_counter = Counter(domain for _, domain in visits)

    # --- 2. Hourly heatmap per domain ---
    hourly_heatmap = defaultdict(lambda: Counter())
    for dt, domain in visits:
        hour = dt.hour
        hourly_heatmap[domain][hour] += 1

    # Format as dict of domain → list of { hour, count }
    hourly_visits = {
        domain: [{"hour": h, "count": c} for h, c in sorted(hour_counts.items())]
        for domain, hour_counts in hourly_heatmap.items()
    }

    # --- 3. Weekday vs Weekend ---
    weekday_usage = Counter()
    weekend_usage = Counter()
    for dt, domain in visits:
        if dt.weekday() < 5:
            weekday_usage[domain] += 1
        else:
            weekend_usage[domain] += 1

    # Top 5 for each
    weekday_top = weekday_usage.most_common(5)
    weekend_top = weekend_usage.most_common(5)

    # --- 4. Back-to-back pairs (within 5 mins) ---
    transition_counter = Counter()
    for i in range(len(visits) - 1):
        dt1, d1 = visits[i]
        dt2, d2 = visits[i + 1]
        if d1 != d2 and (dt2 - dt1) <= timedelta(minutes=5):
            transition_counter[(d1, d2)] += 1

    top_transitions = [
        {"from": a, "to": b, "count": c}
        for (a, b), c in transition_counter.most_common(5)
    ]

    return jsonify({
        "top_domains": domain_counter.most_common(5),
        "hourly_visits": hourly_visits,
        "weekday_top": weekday_top,
        "weekend_top": weekend_top,
        "common_sequences": top_transitions
    })
    
# -------- RECOMMENDATIONS ENDPOINT --------

# Domain category mapping
domain_labels = {
    "youtube.com": "video",
    "netflix.com": "streaming",
    "pluto.tv": "streaming",
    "hulu.com": "streaming",
    "twitch.tv": "streaming",
    "spotify.com": "music",
    "github.com": "developer",
    "notion.so": "productivity",
    "google.com": "search",
    "calendar.google.com": "productivity",
    "mail.google.com": "productivity",
    "reddit.com": "forum",
    "linkedin.com": "career",
    "duolingo.com": "education",
    "coursera.org": "education",
    "wikipedia.org": "reference",
    "amazingrace.fandom.com": "fandom",
    "tumblr.com": "social",
    "instagram.com": "social",
    "facebook.com": "social",
    "twitter.com": "social",
    "medium.com": "blog"
}

@app.route("/api/recommendations", methods=["POST"])
def get_recommendations():
    data = request.get_json()
    pages = data.get("pages", [])
    bookmarked_domains = set(data.get("bookmarked_domains", []))
    visits = []

    for entry in pages:
        url = entry.get("url", "")
        timestamp = entry.get("lastVisitTime")
        if not url or not timestamp:
            continue
        domain = url.split("//")[-1].split("/")[0].replace("www.", "")
        dt = datetime.fromtimestamp(timestamp / 1000.0).astimezone(PDT)
        visits.append((dt, domain))

    visits.sort()

    domain_counts = Counter(domain for _, domain in visits)
    domain_hour = defaultdict(lambda: Counter())
    last_visit = {}
    for dt, domain in visits:
        domain_hour[domain][dt.hour] += 1
        last_visit[domain] = dt.isoformat()

    sequences = Counter()
    for i in range(len(visits) - 1):
        d1, d2 = visits[i][1], visits[i + 1][1]
        if d1 != d2 and (visits[i + 1][0] - visits[i][0]) <= timedelta(minutes=5):
            sequences[(d1, d2)] += 1

    domain_categories = {
        domain: domain_labels[domain]
        for domain in list(domain_counts)[:30]
        if domain in domain_labels
    }

    cutoff = datetime.now(PDT) - timedelta(days=14)
    recent_counts = Counter()
    older_counts = Counter()
    for dt, domain in visits:
        if dt > cutoff:
            recent_counts[domain] += 1
        else:
            older_counts[domain] += 1

    usage_drop = {
        domain: older_counts[domain]
        for domain in older_counts
        if older_counts[domain] >= 5 and recent_counts[domain] == 0
    }

    recent_window = datetime.now(PDT) - timedelta(minutes=30)
    recent_domains = [domain for dt, domain in visits if dt >= recent_window]

    behavior_summary = {
        "top_domains": domain_counts.most_common(10),
        "top_hours": {
            domain: dict(hour_counts)
            for domain, hour_counts in domain_hour.items()
        },
        "common_sequences": [
            {"from": a, "to": b, "count": c}
            for (a, b), c in sequences.most_common(10)
        ],
        "last_visit": last_visit,
        "labels": domain_categories,
        "usage_drop": usage_drop,
        "bookmarked_domains": list(bookmarked_domains),
        "recent_domains": recent_domains,
        "current_hour": datetime.now(PDT).hour,
        "weekday": datetime.now(PDT).weekday()
    }

    prompt = f"""
You are an AI assistant that recommends smart actions based on browsing behavior.

Return a JSON object with:
- "add": list of 3–5 domains the user should bookmark, based on frequent use or recurring behavior. Only include domains NOT in "bookmarked_domains".
- "visit_now": list of 1–3 domains the user should consider visiting right now, based on:
   - The current time of day and day of week
   - Domains they frequently use around this time
   - Their most recent browsing flow ("recent_domains")
   - Recurring transitions (from "common_sequences")

Each suggestion should include:
- "domain": the site name
- "reason": a human-friendly explanation using insights from behavior_summary

User behavior summary:
{json.dumps(behavior_summary, indent=2)}
"""

    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=700,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        raw_text = response.content[0].text.strip()
        match = re.search(r'\{\s*"add"\s*:\s*\[.*?\],\s*"visit_now"\s*:\s*\[.*?\]\s*\}', raw_text, re.DOTALL)
        if match:
            recommendations = json.loads(match.group())
            return jsonify(recommendations)
        else:
            print("❌ Claude response was not valid JSON:\n", raw_text)
            return jsonify({"error": "Claude response was not valid JSON"}), 500

    except Exception as e:
        print("Claude recommendation error:", e)
        return jsonify({"error": "AI generation failed"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)



