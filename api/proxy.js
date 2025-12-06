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
        const resp = await fetch(upstream, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!resp.ok) throw new Error(`Upstream HTTP ${resp.status}`);

        const contentType = resp.headers.get('content-type') || '';

        if (contentType.includes('mpegurl') || (await resp.clone().text()).includes('#EXTM3U')) {
            const body = await resp.text();
            const base = resp.url;
            const proto = req.headers['x-forwarded-proto'] || 'https';
            const host = req.headers['x-forwarded-host'] || req.headers.host;
            const lines = body.split(/\r?\n/);
            const rewritten = lines.map(line => {
                if (!line || line.startsWith('#')) return line;
                let resolved = line;
                try { resolved = new URL(line, base).toString(); } catch (e) {}
                return `${proto}://${host}/api/proxy?url=${encodeURIComponent(resolved)}`;
            }).join('\n');
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.send(rewritten);
        }

        // Binary/text content: stream as buffer
        const buffer = await resp.arrayBuffer();
        const upstreamType = resp.headers.get('content-type');
        if (upstreamType) res.setHeader('Content-Type', upstreamType);
        return res.send(Buffer.from(buffer));
    } catch (err) {
        console.error('Proxy error:', err.message, upstream);
        return res.status(502).json({ error: 'Proxy failed', details: err.message });
    }
}
