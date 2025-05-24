# Tabitha – Smart Browser Assistant

Tabitha is an intelligent Chrome browser assistant that lets you search your browsing history using natural language. Powered by Claude (Anthropic) and enhanced with analytics and recommendations, Tabitha understands queries like:

"Second YouTube workout video from last Tuesday"
"Funny TikTok from yesterday"
"Instagram post from day before yesterday"

## ✨ Features

🔍 Smart Search – Search Chrome history using vague, human-friendly queries.

📊 Insights Dashboard – Analyze your top websites, usage by hour, and weekday vs. weekend habits.

💡 AI Recommendations – Get suggestions on what to bookmark and revisit based on recent behavior.

📁 Full History Table – Explore a detailed table view of your browsing history.

🛠 Tech Stack

Frontend: React + Vite + TailwindCSS

Backend: Python (Flask)

LLM: Anthropic Claude (Haiku)

Extension: Chrome Extensions API (Manifest V3)

🚀 Getting Started

1. Clone the Repository

git clone https://github.com/smritirangarajan/tabitha.git
cd tabitha

2. Set Up Environment Variables

Create a .env file in smart-browser/:

CLAUDE_API_KEY=your_claude_api_key_here

3. Install Dependencies

## Backend
cd smart-browser
pip install -r requirements.txt

## Frontend
cd ../tabitha-frontend
npm install

4. Run the App

## Start Flask API
cd smart-browser
python3 app.py

## Start Vite Dev Server
cd ../tabitha-frontend
npm run dev

5. Build for Chrome Extension

cd tabitha-frontend
npm run build

Then go to chrome://extensions, enable Developer Mode, and load the dist/ folder.
