const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

let historyStore = [];

app.post('/history', (req, res) => {
  historyStore = req.body.map((item, index) => ({
    ...item,
    id: item.id || index.toString(),
  }));
  res.sendStatus(200);
});

app.get('/history', (req, res) => {
  res.json(historyStore);
});

app.patch('/history/:id', (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const item = historyStore.find(h => h.id === id);
  if (item) {
    item.title = title;
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});