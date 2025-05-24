import { useState } from 'react';
import SmartSearch from './features/SmartSearch';
import './App.css';

export default function App() {
  const [view, setView] = useState('search');

  const openHistoryTab = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
  };

  return (
    <div style={{ width: 300, padding: 10 }}>
      <h2>Smart Browser Assistant</h2>

      <nav style={{ marginBottom: 10 }}>
        <button onClick={() => setView('search')}>Smart Search</button>
        <button onClick={openHistoryTab}>Open History Table</button>
      </nav>

      {view === 'search' && <SmartSearch />}
    </div>
  );
}

