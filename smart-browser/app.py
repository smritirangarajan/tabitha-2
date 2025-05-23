from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@app.route("/query", methods=["POST"])
def handle_query():
    query = request.json["query"]

    # Step 1: Ask Claude to extract search intent
    prompt = f"""Extract the core keywords and an optional time range from this natural language search query:
    
Query: "{query}"

Return JSON with keys: keywords (list of strings), from_date (ISO), to_date (ISO) if time is mentioned."""
    
    response = client.messages.create(
        model="claude-3-sonnet-20240229",
        max_tokens=300,
        temperature=0,
        messages=[{"role": "user", "content": prompt}]
    )

    parsed = extract_json(response.content)

    # Step 2: Mock history search
    mock_results = [
        {
            "url": "https://example.com/ai-blog",
            "title": "AI in 2025: A New Era",
            "content": "This article discusses recent breakthroughs in AI technology..."
        },
        {
            "url": "https://example.com/news-openai",
            "title": "OpenAI and Claude Compared",
            "content": "In this comparison of language models, we review GPT and Claude..."
        }
    ]

    # Step 3: Use Claude to summarize each page
    results = []
    for entry in mock_results:
        summary_prompt = f"Summarize the following page content in 1-2 sentences:\n\n{entry['content']}"
        summary_response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=200,
            temperature=0.3,
            messages=[{"role": "user", "content": summary_prompt}]
        )
        results.append({
            "url": entry["url"],
            "title": entry["title"],
            "summary": summary_response.content.strip()
        })

    return jsonify(results)

def extract_json(text):
    import json, re
    try:
        match = re.search(r'{.*}', text, re.DOTALL)
        return json.loads(match.group()) if match else {}
    except Exception:
        return {}

if __name__ == "__main__":
    app.run(debug=True, port=5000)
