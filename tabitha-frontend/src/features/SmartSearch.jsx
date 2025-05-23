import { useState } from 'react';

export default function SmartSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const res = await fetch('http://localhost:5000/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    setResults(data);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="e.g. article on LLMs I read last week"
      />
      <ul>
        {results.map((r, i) => (
          <li key={i}>
            <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
            <p>{r.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
