Server proxy & provider setup

Overview
- I added two Vercel serverless endpoints: `/api/timeseries` and `/api/intraday`.
  - `/api/timeseries?symbol=EUR&days=30` → proxy to exchangerate.host timeseries (no key needed)
  - `/api/intraday?symbol=EUR&interval=5min` → proxies Alpha Vantage FX_INTRADAY and returns {labels, data}. Requires ALPHA_VANTAGE_KEY env var.

Deployment (Vercel)
1. In Vercel project settings, add an Environment Variable `ALPHA_VANTAGE_KEY` with your Alpha Vantage key.
2. Push changes to the branch Vercel watches; API endpoints appear at `https://<your-site>/api/timeseries` and `/api/intraday`.

Local development (quick)
1. Install deps: `npm install` (in the project root)
2. (Optional) Set `ALPHA_VANTAGE_KEY` in your environment if you want server-side intraday. Examples:
   - macOS / Linux (bash/zsh): `export ALPHA_VANTAGE_KEY=your_key_here`
   - Windows PowerShell: `$env:ALPHA_VANTAGE_KEY = "your_key_here"`
3. Run the dev server: `npm start`
   - The server now also serves static files. Open `http://localhost:3000/rates.html` in your browser to test the site (charts will call `/api/...`).
   - Quick health check: open `http://localhost:3000/api/health` (or `curl http://localhost:3000/api/health`) — it should return JSON: `{ "ok": true, "time": "..." }`. If this returns HTML or 404, the proxy is not running or there's a port conflict.
4. If you prefer not to use the integrated server to serve static files, you can run a simple static server instead (but ensure the proxy server is also running at port 3000):
   - `npx http-server -p 8080` then open `http://localhost:8080/rates.html` (and keep `npm start` running for the `/api` endpoints).

Troubleshooting
- If you see “Unable to render chart: ..." in the UI, open the browser DevTools Console (F12) and check the network request to `/api/timeseries` or `/api/intraday` and the console message; common problems:
  - Server not running: start with `npm start`.
  - Missing `ALPHA_VANTAGE_KEY`: intraday `/api/intraday` returns 501 until you configure it.
  - Rate-limiting from Alpha Vantage: you may see a 429 or provider Note in the response; try a lower frequency or use daily/resolution.
  - If you use VS Code Live Server or another static server on a different port (e.g., `http://127.0.0.1:5500`), a relative request to `/api/timeseries` will go to that origin and return 404. Either:
    - Open the site via the integrated dev server: `http://localhost:3000/rates.html` (recommended), or
    - Start the proxy server (`npm start`) and keep your static server running, then update client code to use `http://localhost:3000/api/...` (or allow cross-origin requests).


Notes
- The serverless functions use short in-memory caches (TTL: 1 minute for intraday, 10 minutes for timeseries). For production reliability, consider adding Redis or another shared cache.
- If you want me to wire a different provider (TwelveData, paid intraday providers) or implement a Redis-backed cache, tell me which provider and I'll adjust the proxy code.
