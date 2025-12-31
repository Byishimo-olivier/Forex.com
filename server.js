// Simple Express proxy for local development
// Run: npm install && node server.js

const express = require('express');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default:fetch})=>fetch(...args));
const app = express();
app.use(express.json());

// Simple request logger so we can see incoming requests in the console
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

// Allow cross-origin requests (useful when serving files with Live Server on another port)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Lightweight health endpoint to check the proxy from the browser
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Timeseries proxy (same semantics as Vercel function)
app.get('/api/timeseries', async (req, res) => {
  try {
    const { symbol, days } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    const d = parseInt(days, 10) || 30;
    const end = new Date();
    const start = new Date(Date.now() - (d - 1) * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().slice(0,10);
    const endStr = end.toISOString().slice(0,10);
    const url = `https://api.exchangerate.host/timeseries?start_date=${startStr}&end_date=${endStr}&base=USD&symbols=${symbol}`;
    console.log('Fetching timeseries from provider:', url);
    const r = await fetch(url);
    const text = await r.text();
    const contentType = (r.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      console.warn('Provider returned non-json for timeseries:', r.status, contentType, text.slice(0,200));
      return res.status(502).json({ error: 'Provider returned non-json', details: text.slice(0,200) });
    }
    const json = JSON.parse(text);
    // Some providers use { success:false, error: {...} } to indicate problems
    if (json && json.success === false) {
      console.warn('Provider returned error for timeseries:', JSON.stringify(json).slice(0,200));
      return res.status(502).json({ error: 'Provider error', details: json });
    }
    return res.json(json);
  } catch (err) {
    console.error('Timeseries proxy error:', err);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// Intraday proxy (Alpha Vantage)
app.get('/api/intraday', async (req, res) => {
  try {
    const { symbol, interval } = req.query;
    if (!symbol || !interval) return res.status(400).json({ error: 'symbol and interval required' });
    const key = process.env.ALPHA_VANTAGE_KEY;
    if (!key) return res.status(501).json({ error: 'Server key not configured. Set ALPHA_VANTAGE_KEY env var.' });
    const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${symbol}&to_symbol=USD&interval=${interval}&outputsize=compact&apikey=${key}`;
    console.log('Fetching intraday from provider:', url);
    const r = await fetch(url);
    const text = await r.text();
    const contentType = (r.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      console.warn('Intraday provider returned non-json:', r.status, contentType, text.slice(0,200));
      return res.status(502).json({ error: 'Provider returned non-json', details: text.slice(0,200) });
    }
    const json = JSON.parse(text);
    return res.json(json);
  } catch (err) {
    console.error('Intraday proxy error:', err);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// Serve static files after API routes so API paths take precedence
app.use(express.static(path.join(__dirname)));
console.log(`Serving static files from ${__dirname}`);

// Catch-all for API routes to return JSON instead of default HTML 404 (makes debugging easier)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Dev proxy listening on http://localhost:${port}`));
