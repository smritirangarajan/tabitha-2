import { useState } from 'react';

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
  
    setLoading(true);
    setError(null);
    setResults([]);
  
    const fullQuery = query.trim();
  
    try {
      const parseRes = await fetch('http://localhost:5000/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fullQuery })
      });
  
      if (!parseRes.ok) throw new Error('Failed to parse query');
      const parsed = await parseRes.json();
  
      const startTime = parsed.from_date
        ? new Date(parsed.from_date).getTime()
        : Date.now() - 1000 * 60 * 60 * 24 * 30;
      const endTime = parsed.to_date
        ? new Date(parsed.to_date).getTime()
        : Date.now();
  
      // Get keywords and synonyms for multi-search
      const allTerms = new Set([
        ...(parsed.keywords || []),
        ...(parsed.hashtags || []),
        parsed.platform || ''
      ]);
      for (const [kw, similes] of Object.entries(parsed.synonyms || {})) {
        similes.forEach(s => allTerms.add(s));
      }
  
      const allResults = new Map();
  
      for (const term of allTerms) {
        await new Promise((resolve) => {
          chrome.history.search(
            {
              text: term,
              startTime,
              endTime,
              maxResults: 500
            },
            async (historyItems) => {
              historyItems.forEach(entry => {
                const key = entry.url + entry.title;
                if (!allResults.has(key)) {
                  allResults.set(key, {
                    url: entry.url,
                    title: entry.title,
                    time: entry.lastVisitTime,
                    content: "Placeholder — real page text not available",
                    count: 1
                  });
                } else {
                  allResults.get(key).count++;
                }
              });
              resolve();
            }
          );
        });
      }
  
      // Now send to filter
      const pages = Array.from(allResults.values());
  
      const filterRes = await fetch('http://localhost:5000/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fullQuery, pages })
      });
  
      if (!filterRes.ok) throw new Error('Backend error');
      const filtered = await filterRes.json();
  
      setResults(filtered.slice(0, 4));
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  
  

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '1rem', color: '#2f3437', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', fontWeight: 600, fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        Smart Browser Assistant
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. last monday netflix episode"
          style={{ padding: '10px', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '6px' }}
        />
        <button
          onClick={handleSearch}
          style={{
            backgroundColor: '#4f46e5',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '1rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseOver={e => e.target.style.backgroundColor = '#4338ca'}
          onMouseOut={e => e.target.style.backgroundColor = '#4f46e5'}
        >
          Search
        </button>
      </div>

      {loading && <p style={{ marginBottom: '1rem' }}>🔍 Searching your history...</p>}
      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {results.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', border: '1px solid #eee', fontSize: '0.95rem', borderRadius: '6px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f6f6f6' }}>
                <th style={{ textAlign: 'left', padding: '10px' }}>Title</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Visited</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px', textAlign: 'left' }}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      title={r.title}
                      style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '220px' }}
                    >
                      {r.title?.slice(0, 60) || 'Untitled'}
                    </a>
                    {r.count > 1 && <span style={{ marginLeft: 6, color: '#888' }}>×{r.count}</span>}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {r.time ? new Date(r.time).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && <p style={{ textAlign: 'center', color: '#555' }}>No results found.</p>
      )}
    </div>
  );
}