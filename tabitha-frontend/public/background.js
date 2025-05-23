chrome.runtime.onInstalled.addListener(() => {
  chrome.history.search({ text: '', maxResults: 100 }, (results) => {
    fetch('http://localhost:4000/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(results)
    })
    .then(response => response.json())
    .then(data => console.log('History saved:', data))
    .catch(err => console.error('Error saving history:', err));
  });
});
