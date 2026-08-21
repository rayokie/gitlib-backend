const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const LIBGEN_HOST = 'libgen.li';

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // CORS — allow any origin (your frontend can call this)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check — Render pings this to verify the service is up
  if (parsedUrl.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'LibGen proxy is running' }));
    return;
  }

  // /api?object=...&... → proxies to libgen.li/json.php
  if (parsedUrl.pathname === '/api') {
    const queryString = Object.entries(parsedUrl.query)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const libgenPath = `/json.php?${queryString}`;
    console.log(`[Proxy] --> https://${LIBGEN_HOST}${libgenPath}`);

    const options = {
      hostname: LIBGEN_HOST,
      path: libgenPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LibGenBrowser/1.0)',
        'Accept': 'application/json',
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        console.log(`[Proxy] <-- ${proxyRes.statusCode} (${data.length} bytes)`);
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy] Error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
    });

    proxyReq.end();
    return;
  }

  // Anything else → 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`✅ LibGen proxy running on port ${PORT}`);
});
