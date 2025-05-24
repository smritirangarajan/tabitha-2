import { useEffect, useState } from 'react';

export default function RecommendationsView() {
  const [recommendations, setRecommendations] = useState({ add: [], visit_now: [] });
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState({}); // domain → true/false

  useEffect(() => {
    chrome.history.search(
      {
        text: '',
        startTime: Date.now() - 1000 * 60 * 60 * 24 * 30, // last 30 days
        maxResults: 1000,
      },
      (results) => {
        fetch('http://localhost:5000/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages: results }),
        })
          .then((res) => res.json())
          .then((data) => {
            setRecommendations({
              add: Array.isArray(data.add) ? data.add : [],
              visit_now: Array.isArray(data.visit_now) ? data.visit_now : [],
            });
            setLoading(false);
            const allDomains = [...(data.add || []), ...(data.visit_now || [])];
            allDomains.forEach((rec) => {
              chrome.bookmarks.search({ url: `https://${rec.domain}` }, (results) => {
                if (results.length > 0) {
                  setBookmarked((prev) => ({ ...prev, [rec.domain]: true }));
                }
              });
            });
          })
          .catch((err) => {
            console.error('Error fetching recommendations:', err);
            setLoading(false);
          });
      }
    );
  }, []);

  const handleBookmark = (domain) => {
    const url = `https://${domain}`;
    chrome.bookmarks.create({ title: domain, url }, () => {
      setBookmarked((prev) => ({ ...prev, [domain]: true }));
    });
  };

  if (loading) return <p>Loading smart recommendations...</p>;

  if (!Array.isArray(recommendations.add) || !Array.isArray(recommendations.visit_now)) {
    return <p>No valid recommendations returned.</p>;
  }

  return (
    <div style={{ width: '100%', padding: '10px' }}>
      <h3>✨ AI Recommendations</h3>

      {recommendations.add.length > 0 && (
        <>
          <h4 style={{ marginTop: '16px' }}>🔖 Add These Bookmarks</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.add.map((rec, index) => (
              <div
                key={`add-${index}`}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px',
                  backgroundColor: '#f9f9f9',
                }}
              >
                <h4>{rec.domain}</h4>
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>{rec.reason}</p>
                <button
                  onClick={() => handleBookmark(rec.domain)}
                  disabled={bookmarked[rec.domain]}
                  style={{
                    backgroundColor: bookmarked[rec.domain] ? '#ccc' : '#4f46e5',
                    color: '#fff',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: bookmarked[rec.domain] ? 'default' : 'pointer',
                  }}
                >
                  {bookmarked[rec.domain] ? 'Bookmarked' : 'Add to Bookmarks'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {recommendations.visit_now.length > 0 && (
        <>
          <h4 style={{ marginTop: '24px' }}>🚀 Suggested Sites to Visit Now</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.visit_now.map((rec, index) => (
              <div
                key={`visit-${index}`}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px',
                  backgroundColor: '#eef2ff',
                }}
              >
                <h4>{rec.domain}</h4>
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>{rec.reason}</p>
                <a
                  href={`https://${rec.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#4f46e5',
                    color: '#fff',
                    padding: '6px 12px',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    display: 'inline-block',
                  }}
                >
                  Open Site
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
