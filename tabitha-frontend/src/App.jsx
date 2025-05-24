import { useState } from 'react';
import SmartSearch from './features/SmartSearch';
import InsightsView from './features/InsightsView';
import RecommendationsView from './features/RecommendationsView';
import './App.css';

export default function App() {
  const [view, setView] = useState('search');

  const openHistoryTab = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
  };

  return (
    <div style={{ width: 300, padding: 10 }}>
      <h2>Smart Browser Assistant</h2>

      <nav style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button onClick={() => setView('search')}>Smart Search</button>
        <button onClick={openHistoryTab}>Open History Table</button>
        <button onClick={() => setView('insights')}>Insights</button>
        <button onClick={() => setView('recommendations')}>Recommendations</button>
      </nav>

      {view === 'search' && <SmartSearch />}
      {view === 'insights' && <InsightsView />}
      {view === 'recommendations' && <RecommendationsView />}
    </div>
  );
}
