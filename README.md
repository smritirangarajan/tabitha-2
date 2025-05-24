🧠 Tabitha – Smart Browser Assistant
Tabitha is an intelligent browser assistant that lets you search your Chrome history using natural language. Powered by Claude (Anthropic) and custom logic, Tabitha understands vague queries like:

“Second YouTube workout video from last Tuesday”
“Funny TikTok from yesterday”
“The last Instagram post I saw before midnight”

✨ Features
Feature	Description
🔍 Smart Search	Use natural language to find past sites, videos, and more from your Chrome history.
📊 Insights	Visual breakdown of your top sites, favorite hours, and weekday/weekend browsing behavior.
🧠 AI Recommendations	Personalized suggestions: sites to bookmark and sites to revisit now based on recent patterns.
📁 History Table	View a searchable, sortable table of your full Chrome history.

🛠 Tech Stack
React & Vite (Frontend)

TailwindCSS for UI styling

Flask (Backend API)

Anthropic Claude API for language understanding

Chrome Extensions API for history/bookmarks

🚀 Getting Started
1. Clone the repository
bash
Copy
Edit
git clone https://github.com/smritirangarajan/tabitha.git
cd tabitha
2. Set up your environment variables
Create a .env file in smart-browser/ with your Claude API key:

env
Copy
Edit
CLAUDE_API_KEY=your_api_key_here
3. Install dependencies
Frontend:

bash
Copy
Edit
cd tabitha-frontend
npm install
Backend:

bash
Copy
Edit
cd ../smart-browser
pip install -r requirements.txt
4. Run the app
Backend (Flask):

bash
Copy
Edit
python3 app.py
Frontend (Vite):

bash
Copy
Edit
cd ../tabitha-frontend
npm run dev
5. Load extension in Chrome
Go to chrome://extensions

Enable "Developer mode"

Click "Load unpacked" and select the tabitha-frontend/dist folder after building:

bash
Copy
Edit
npm run build
