Tabitha is a smart Chrome extension that helps you take control of your browser tabs and history. Designed to reduce tab overload and make your browsing more intentional, Tabitha tracks and organizes your open tabs and history in real-time—then layers in AI to surface insights and boost productivity.
# Features

🔍 Smart Search
Easily find what you were working on and when. Tabitha's intelligent search links related tabs and searches across time, helping you quickly pick up where you left off.

📊 Insights & Analytics
See your browsing habits like never before. Tabitha automatically categorizes the types of sites you visit and presents a clean breakdown of your activity. Discover which topics dominate your attention—and where your time is going.

🧠 AI-Powered Recommendations
Whether it’s suggesting related content or helping you cluster similar tabs, Tabitha leverages AI to enhance how you browse and learn online.

🗂️ Organized History View
Your browser history doesn’t have to be a mess. Tabitha offers a clean interface to review, filter, and even reorder your history. The built-in AI helps sort and group history entries for easier recall and organization.



# 🛠 Tech Stack

Frontend: React + Vite + TailwindCSS + Node.js + Express

Backend: Python (Flask)

LLM: Anthropic Claude (Haiku)

Extension: Chrome Extensions API (Manifest V3)

🚀 Getting Started

1. Clone the Repository

git clone
cd tabitha-2

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
