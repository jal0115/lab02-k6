const express = require('express');
const app = express();
const PORT = 3000;

// Хурдан endpoint — удаашрал байхгүй
app.get('/fast', (req, res) => {
  res.json({ status: 'ok', type: 'fast' });
});

// Удаашруулсан endpoint — 100ms sleep
app.get('/slow', (req, res) => {
  setTimeout(() => {
    res.json({ status: 'ok', type: 'slow' });
  }, 100);
});

app.listen(PORT, () => {
  console.log(`Server ажиллаж байна: http://localhost:${PORT}`);
});
