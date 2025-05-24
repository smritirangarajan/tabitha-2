import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';

export default function InsightsView() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.history.search(
      {
        text: '',
        startTime: Date.now() - 1000 * 60 * 60 * 24 * 30, // last 30 days
        maxResults: 1000,
      },
      (results) => {
        fetch('http://localhost:5000/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages: results }),
        })
          .then((res) => res.json())
          .then((data) => {
            setInsights(data);
            setLoading(false);
          })
          .catch((err) => {
            console.error('Error fetching insights:', err);
            setLoading(false);
          });
      }
    );
  }, []);

  if (loading) return <p>Loading insights...</p>;
  if (!insights) return <p>No insights found.</p>;

  const domainData = insights.top_domains.map(([domain, count]) => ({
    domain,
    visits: count,
  }));

  const weekdayData = insights.weekday_top.map(([domain, count]) => ({
    domain,
    visits: count,
  }));

  const weekendData = insights.weekend_top.map(([domain, count]) => ({
    domain,
    visits: count,
  }));

  // Filter most interesting hourly domains (highest peak count)
  const interestingHourly = Object.entries(insights.hourly_visits)
    .map(([domain, hours]) => {
      const maxCount = Math.max(...hours.map(h => h.count));
      return { domain, hours, peak: maxCount };
    })
    .sort((a, b) => b.peak - a.peak)
    .slice(0, 2); // show only top 2

  return (
    <div style={{ width: '100%', padding: '10px' }}>
      <h3>📊 Browsing Insights</h3>

      <h4>Top Visited Domains</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={domainData}>
          <XAxis dataKey="domain" />
          <YAxis />
          <Tooltip />
          <CartesianGrid strokeDasharray="3 3" />
          <Bar dataKey="visits" />
        </BarChart>
      </ResponsiveContainer>

      <h4 style={{ marginTop: 20 }}>Visits by Hour (Most Interesting Domains)</h4>
      {interestingHourly.map(({ domain, hours }) => (
        <div key={domain} style={{ marginTop: 10 }}>
          <strong>{domain}</strong>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={hours}>
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <CartesianGrid strokeDasharray="3 3" />
              <Line type="monotone" dataKey="count" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}

      <h4 style={{ marginTop: 20 }}>Weekday Favorites</h4>
      <ul>
        {weekdayData.map((d, i) => (
          <li key={i}>{d.domain}: {d.visits} visits</li>
        ))}
      </ul>

      <h4>Weekend Favorites</h4>
      <ul>
        {weekendData.map((d, i) => (
          <li key={i}>{d.domain}: {d.visits} visits</li>
        ))}
      </ul>

      <h4>🔁 Frequent Sequences (Back-to-Back Visits)</h4>
      <ul>
        {insights.common_sequences.map((seq, i) => (
          <li key={i}>
            {seq.from} → {seq.to} ({seq.count} times)
          </li>
        ))}
      </ul>
    </div>
  );
}
