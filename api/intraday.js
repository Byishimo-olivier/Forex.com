// Vercel Serverless Function - intraday proxy for Alpha Vantage FX_INTRADAY
// Expects query: ?symbol=EUR&interval=5min
// Requires ALPHA_VANTAGE_KEY environment variable to be set in Vercel dashboard

export default async function handler(req, res) {
  try {
    const { symbol, interval } = req.query;
    if (!symbol || !interval) return res.status(400).json({ error: 'symbol and interval are required' });

    const key = process.env.ALPHA_VANTAGE_KEY;
    if (!key) {
      return res.status(501).json({ error: 'Server API key not configured. Set ALPHA_VANTAGE_KEY in environment.' });
    }

    const cacheKey = `${symbol}_intraday_${interval}`;
    if (!global._intradayCache) global._intradayCache = new Map();
    const cached = global._intradayCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 60 * 1000) {
      return res.status(200).json(cached.data);
    }

    const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${encodeURIComponent(symbol)}&to_symbol=USD&interval=${encodeURIComponent(interval)}&outputsize=compact&apikey=${encodeURIComponent(key)}`;

    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: 'Failed fetching intraday' });
    const json = await r.json();

    // Handle Alpha Vantage rate limit / note
    if (json.Note || json['Error Message']) {
      return res.status(429).json({ error: 'Provider rate limit or error', note: json.Note || json['Error Message'] });
    }

    // Normalize response: find series key and return { labels: [], data: [] }
    const seriesKey = Object.keys(json).find(k => k.toLowerCase().includes('time series'));
    if (!seriesKey || !json[seriesKey]) return res.status(502).json({ error: 'No intraday series in provider response' });

    const entries = Object.entries(json[seriesKey]).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    const labels = entries.map(e => e[0]);
    const data = entries.map(e => parseFloat(e[1]['4. close']));

    const payload = { labels, data };
    global._intradayCache.set(cacheKey, { ts: Date.now(), data: payload });
    return res.status(200).json(payload);
  } catch (err) {
    console.error('intraday proxy error', err);
    return res.status(500).json({ error: err.message || 'internal' });
  }
}
