// api/proxy.js
// Proxy any upstream resource (playlist or segment) and return it to the client.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const encoded = req.query.url;
    if (!encoded) return res.status(400).json({ error: 'url query parameter required' });

    let upstream;
    try { upstream = decodeURIComponent(encoded); } catch (e) { return res.status(400).json({ error: 'invalid url encoding' }); }

    try {
        // Forward some client headers (Range, Accept) to upstream to support partial requests
        const forwardHeaders = {};
        const maybeForward = ['range', 'accept', 'user-agent', 'referer', 'origin', 'accept-encoding'];
        maybeForward.forEach(h => {
            if (req.headers[h]) forwardHeaders[h] = req.headers[h];
        });

        const resp = await fetch(upstream, { redirect: 'follow', headers: forwardHeaders });
        if (!resp.ok) {
            // Return upstream status and message for easier debugging
            const text = await resp.text().catch(() => '');
            console.error('Proxy upstream error', resp.status, upstream);
            res.status(502).json({ error: 'Upstream error', status: resp.status, body: text });
            return;
        }

        const contentType = (resp.headers.get('content-type') || '').toLowerCase();

        // If playlist, rewrite URIs to proxy again so nested playlists/segments are proxied
        if (contentType.includes('mpegurl') || contentType.includes('application/vnd.apple.mpegurl')) {
            const body = await resp.text();
            const base = resp.url;
            const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
            const host = req.headers['x-forwarded-host'] || req.headers.host;
            const lines = body.split(/\r?\n/);
            // Logging primeros URIs y headers
            const firstSegments = lines.filter(l => l && !l.startsWith('#')).slice(0, 3);
            console.log('[PROXY PLAYLIST] Primeros segmentos:', firstSegments);
            console.log('[PROXY PLAYLIST] Headers:', Object.fromEntries(resp.headers.entries()));
            const rewritten = lines.map(line => {
                if (!line || line.startsWith('#')) return line;
                let resolved = line;
                try { resolved = new URL(line, base).toString(); } catch (e) {}
                return `${proto}://${host}/api/proxy?url=${encodeURIComponent(resolved)}`;
            }).join('\n');
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.send(rewritten);
        }

        // For binary segments (e.g. .ts) stream the response directly to client to avoid buffering
        // Logging status y headers de segmentos
        if (upstream.endsWith('.ts')) {
            console.log('[PROXY SEGMENTO] Status:', resp.status);
            console.log('[PROXY SEGMENTO] Headers:', Object.fromEntries(resp.headers.entries()));
        }
        const upstreamType = resp.headers.get('content-type');
        if (upstreamType) res.setHeader('Content-Type', upstreamType);
        // Forward cache and content-length headers when present
        const upstreamCache = resp.headers.get('cache-control');
        if (upstreamCache) res.setHeader('Cache-Control', upstreamCache);
        const contentLength = resp.headers.get('content-length');
        if (contentLength) res.setHeader('Content-Length', contentLength);

        if (resp.body && typeof resp.body.pipe === 'function') {
            // node stream
            resp.body.pipe(res);
            return;
        }

        // Fallback: read as arrayBuffer and send
        const buffer = await resp.arrayBuffer();
        return res.send(Buffer.from(buffer));
    } catch (err) {
        console.error('Proxy error:', err && err.message, upstream);
        return res.status(502).json({ error: 'Proxy failed', details: err && err.message });
    }
}
