# Proxy server for freeTV

This lightweight Express proxy forwards requests to `https://prepublish.f.qaotic.net` and streams responses back to the client. Use it to bypass CORS and to add required headers (e.g., `Referer`) when the origin denies direct browser requests.

Usage

Install dependencies and start:

```bash
cd proxy-server
npm install
npm start
```

Example: fetch a segment through the proxy

```
http://localhost:3001/proxy/a07/americahls-100056/segment_240p_749432.ts
```

Notes

- This proxy sets `Access-Control-Allow-Origin: *` for convenience in development. Tighten CORS rules in production.
- If segments require authentication tokens, you can inject cookies or Authorization headers into the `index.js` request logic.
