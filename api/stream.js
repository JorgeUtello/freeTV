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

    // Map channels to endpoints from the new playlist source
    const CHANNEL_URLS = {
        america: 'http://190.104.67.180:234/play/a09a/index.m3u8',
        telefe: 'http://190.104.67.180:234/play/a09b/index.m3u8',
        eltrece: 'http://190.104.67.180:234/play/a09c/index.m3u8',
        espn: 'http://190.104.67.180:234/play/a09d/index.m3u8'
    };

    const source = CHANNEL_URLS[channel];
    if (!source) return res.status(404).json({ error: `Canal '${channel}' no encontrado` });

    try {
        // Forward some client headers that may be required by upstream
        const forwardHeaders = {};
        const maybeForward = ['range', 'accept', 'user-agent', 'referer', 'origin', 'accept-encoding'];
        maybeForward.forEach(h => {
            if (req.headers[h]) forwardHeaders[h] = req.headers[h];
        });

        // Debug mode: return upstream statuses/headers/body snippets to help diagnose 502s
        const debug = req.query.debug === '1' || req.query.debug === 'true';

        // First request without following redirects to capture Location to signed CDN
        const initial = await fetch(source, { redirect: 'manual', headers: { ...forwardHeaders, 'User-Agent': forwardHeaders['user-agent'] || 'Mozilla/5.0' } });
        if (initial.status >= 300 && initial.status < 400) {
            const loc = initial.headers.get('location');
            if (loc) {
                if (debug) {
                    const initialHeaders = {};
                    initial.headers.forEach((v, k) => initialHeaders[k] = v);
                    return res.json({ debug: true, stage: 'initial-redirect', status: initial.status, location: loc, initialHeaders });
                }
                // Return redirect to client so browser can request signed URL directly
                return res.redirect(loc);
            }
        }

        // Otherwise follow and obtain playlist (include forwarded headers)
        const resp = await fetch(source, { redirect: 'follow', headers: { ...forwardHeaders, 'User-Agent': forwardHeaders['user-agent'] || 'Mozilla/5.0' } });
        const text = await resp.text().catch(() => '');
        if (debug) {
            const respHeaders = {};
            resp.headers.forEach((v, k) => respHeaders[k] = v);
            return res.status(resp.ok ? 200 : 502).json({
                debug: true,
                stage: resp.ok ? 'playlist' : 'upstream-error',
                status: resp.status,
                headers: respHeaders,
                bodySnippet: text.slice(0, 500)
            });
        }
        if (!resp.ok) {
            console.error('[API Error] stream upstream:', resp.status, source, text.slice(0, 300));
            return res.status(502).json({ error: 'Upstream error', status: resp.status, body: text });
        }
        // ...existing code...

        const body = await resp.text();
        // If it's not a playlist, return as-is
        if (!body.includes('#EXTM3U')) {
            res.setHeader('Content-Type', resp.headers.get('content-type') || 'text/plain');
            return res.send(body);
        }

        // Rewrite URIs inside playlist to point to /api/proxy
        const base = resp.url;
        const lines = body.split(/\r?\n/);
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        // Log primeros URIs y headers para depuración
        const firstSegments = lines.filter(l => l && !l.startsWith('#')).slice(0, 3);
        console.log('[AMERICA] Primeros segmentos:', firstSegments);
        console.log('[AMERICA] Headers:', Object.fromEntries(resp.headers.entries()));
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
        console.error('[API Error] stream:', err && err.message);
        return res.status(502).json({ error: 'Error obteniendo stream', details: err && err.message });
    }
}
