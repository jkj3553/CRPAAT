const express = require('express');
const path    = require('path');
const cors    = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API routes
app.use('/api', require('./routes/api'));

// Catch-all: serve index.html for the single-page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🔐 CRPAAT Digital Signature Platform`);
  console.log(`   Running at: http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop.\n`);
});
