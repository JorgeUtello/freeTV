// api/stream.js
// Función serverless para Vercel que actúa como proxy de streams

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { channel } = req.query;
    if (!channel) return res.status(400).json({ error: 'Canal no especificado' });

    // Map channels to endpoints (prefer API endpoints that redirect to signed m3u8)
    const CHANNEL_URLS = {
        telefe: 'https://mitelefe.com/Api/Videos/GetSourceUrl/694564/0/HLS?',
        america: 'https://dai.google.com/linear/hls/pa/event/OY2i_lL4SMyXE5Zaj4ULEg/stream/695e4e3d-258b-4ff9-8cc4-d35943a8f1b8:SCL2/master.m3u8',
        eltrece: 'https://livetrx01.vodgc.net/eltrecetv/index.m3u8'
    };

    const source = CHANNEL_URLS[channel];
    if (!source) return res.status(404).json({ error: `Canal '${channel}' no encontrado` });

    try {
        // First request without following redirects to capture Location to signed CDN
        const initial = await fetch(source, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (initial.status >= 300 && initial.status < 400) {
            const loc = initial.headers.get('location');
            if (loc) {
                // Return redirect to client so browser can request signed URL directly
                return res.redirect(loc);
            }
        }

        // Otherwise follow and obtain playlist
        const resp = await fetch(source, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!resp.ok) throw new Error(`Upstream HTTP ${resp.status}`);

        const body = await resp.text();
        // If it's not a playlist, return as-is
        if (!body.includes('#EXTM3U')) {
            res.setHeader('Content-Type', 'text/plain');
            return res.send(body);
        }

        // Rewrite URIs inside playlist to point to /api/proxy
        const base = resp.url;
        const lines = body.split(/\r?\n/);
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const rewritten = lines.map(line => {
            if (!line || line.startsWith('#')) return line;
            let resolved = line;
            try { resolved = new URL(line, base).toString(); } catch (e) {}
            return `${proto}://${host}/api/proxy?url=${encodeURIComponent(resolved)}`;
        }).join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'public, max-age=10');
        return res.status(200).send(rewritten);
    } catch (err) {
        console.error('[API Error] stream:', err.message);
        return res.status(502).json({ error: 'Error obteniendo stream', details: err.message });
    }
}
