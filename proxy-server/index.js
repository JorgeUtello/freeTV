const express = require('express');
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
const app = express();
const PORT = process.env.PORT || 3001;

// Allow browser to access this proxy (adjust for production as needed)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/proxy/*', async (req, res) => {
  try {
    const remotePath = req.path.replace(/^\/proxy/, '');
    const target = 'https://prepublish.f.qaotic.net' + remotePath;

    const headers = {
      'User-Agent': req.get('User-Agent') || 'node-proxy',
      'Referer': 'https://prepublish.f.qaotic.net/'
    };

    if (req.headers.cookie) headers.Cookie = req.headers.cookie;

    const upstream = await fetch(target, { headers, method: 'GET' });

    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (['content-length', 'content-type', 'accept-ranges', 'cache-control', 'content-range'].includes(k)) {
        res.setHeader(k, v);
      }
    });

    if (!upstream.body) {
      const text = await upstream.text();
      res.send(text);
      return;
    }

    upstream.body.pipe(res);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('proxy error');
  }
});

app.listen(PORT, () => console.log(`Proxy server listening on http://localhost:${PORT}`));
