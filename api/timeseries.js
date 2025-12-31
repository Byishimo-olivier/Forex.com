// Vercel Serverless Function - timeseries
// Expects query: ?symbol=EUR&days=30

export default async function handler(req, res) {
  try {
    const { symbol, days } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const d = parseInt(days, 10) || 30;

    const end = new Date();
    const start = new Date(Date.now() - (d - 1) * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const cacheKey = `${symbol}_${startStr}_${endStr}`;
    if (!global._timeseriesCache) global._timeseriesCache = new Map();
    const cached = global._timeseriesCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 10 * 60 * 1000) {
      return res.status(200).json(cached.data);
    }

    const url = `https://api.exchangerate.host/timeseries?start_date=${startStr}&end_date=${endStr}&base=USD&symbols=${symbol}`;
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: 'Failed fetching timeseries' });
    const json = await r.json();

    global._timeseriesCache.set(cacheKey, { ts: Date.now(), data: json });
    return res.status(200).json(json);
  } catch (err) {
    console.error('timeseries error', err);
    return res.status(500).json({ error: err.message || 'internal' });
  }
}
