import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.static(__dirname));

// URLs de API de los canales
const CHANNEL_URLS = {
    // Use the Telefe API endpoint which redirects to a fresh signed m3u8 URL
    telefe: 'https://mitelefe.com/Api/Videos/GetSourceUrl/694564/0/HLS?',
    america: 'https://dai.google.com/linear/hls/pa/event/OY2i_lL4SMyXE5Zaj4ULEg/stream/695e4e3d-258b-4ff9-8cc4-d35943a8f1b8:SCL2/master.m3u8',
    eltrece: 'https://livetrx01.vodgc.net/eltrecetv/index.m3u8'
};

// Endpoint para obtener stream de un canal (acepta /api/stream?channel=X o /api/stream/X)
app.get('/api/stream', async (req, res) => {
    const channel = req.query.channel;
    const url = CHANNEL_URLS[channel];

    if (!channel) {
        return res.status(400).json({ error: 'Parámetro "channel" requerido' });
    }

    if (!url) {
        return res.status(404).json({ error: `Canal '${channel}' no encontrado. Disponibles: ${Object.keys(CHANNEL_URLS).join(', ')}` });
    }

    try {
        // Fetch and rewrite playlist so that all URIs (sub-playlists and segments)
        // point to our proxy endpoint /api/proxy?url=ENCODED_URL
        console.log(`📡 Obteniendo stream de ${channel}...`);
        const rewritten = await fetchAndRewritePlaylist(url, req);

        // Headers CORS y de streaming
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'public, max-age=10');

        console.log(`✅ Playlist de ${channel} enviado (${rewritten.length} bytes)`);
        res.send(rewritten);
    } catch (error) {
        console.error(`❌ Error fetching ${channel}:`, error.message);
        res.status(500).json({ error: `No se pudo obtener el stream: ${error.message}` });
    }
});

// También aceptar ruta con parámetro path: /api/stream/:channel
app.get('/api/stream/:channel', async (req, res) => {
    const channel = req.params.channel;
    const url = CHANNEL_URLS[channel];

    if (!channel) {
        return res.status(400).json({ error: 'Parámetro "channel" requerido' });
    }

    if (!url) {
        return res.status(404).json({ error: `Canal '${channel}' no encontrado. Disponibles: ${Object.keys(CHANNEL_URLS).join(', ')}` });
    }

    try {
        // Fetch and rewrite playlist so that all URIs (sub-playlists and segments)
        // point to our proxy endpoint /api/proxy?url=ENCODED_URL
        console.log(`📡 Obteniendo stream de ${channel}...`);
        const rewritten = await fetchAndRewritePlaylist(url, req);

        // Headers CORS y de streaming
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'public, max-age=10');

        console.log(`✅ Playlist de ${channel} enviado (${rewritten.length} bytes)`);
        res.send(rewritten);
    } catch (error) {
        console.error(`❌ Error fetching ${channel}:`, error.message);
        res.status(500).json({ error: `No se pudo obtener el stream: ${error.message}` });
    }
});

// Endpoint de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Helper: fetch a playlist (or API endpoint that redirects) and rewrite any URIs
// so that the client will request them through /api/proxy?url=ENCODED_URL
async function fetchAndRewritePlaylist(sourceUrl, req) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const resp = await fetch(sourceUrl, { headers, redirect: 'follow' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} from upstream`);

    const text = await resp.text();
    if (!text || !text.includes('#EXTM3U')) {
        // not a playlist, return raw
        return text;
    }

    const base = resp.url;
    const lines = text.split(/\r?\n/);
    const rewritten = lines.map(line => {
        if (!line || line.startsWith('#')) return line;
        let resolved;
        try { resolved = new URL(line, base).toString(); } catch (e) { resolved = line; }
        return `${req.protocol}://${req.get('host')}/api/proxy?url=${encodeURIComponent(resolved)}`;
    }).join('\n');

    return rewritten;
}

// Proxy endpoint: stream any upstream resource. If it's a playlist, rewrite its URIs too.
app.get('/api/proxy', async (req, res) => {
    const encoded = req.query.url;
    if (!encoded) return res.status(400).json({ error: 'url query parameter required' });

    let upstream;
    try { upstream = decodeURIComponent(encoded); } catch (e) { return res.status(400).json({ error: 'invalid url encoding' }); }

    try {
        console.log(`🔁 Proxying ${upstream}`);
        const resp = await fetch(upstream, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
        if (!resp.ok) throw new Error(`Upstream HTTP ${resp.status}`);

        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('mpegurl') || (await resp.clone().text()).includes('#EXTM3U')) {
            // treat as playlist and rewrite
            const body = await resp.text();
            const base = resp.url;
            const lines = body.split(/\r?\n/);
            const rewritten = lines.map(line => {
                if (!line || line.startsWith('#')) return line;
                let resolved;
                try { resolved = new URL(line, base).toString(); } catch (e) { resolved = line; }
                return `${req.protocol}://${req.get('host')}/api/proxy?url=${encodeURIComponent(resolved)}`;
            }).join('\n');
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.send(rewritten);
        }

        // binary or other content: stream
        res.setHeader('Access-Control-Allow-Origin', '*');
        const upstreamType = resp.headers.get('content-type');
        if (upstreamType) res.setHeader('Content-Type', upstreamType);

        // stream response body
        if (resp.body && typeof resp.body.pipe === 'function') {
            resp.body.pipe(res);
        } else {
            const buffer = await resp.arrayBuffer();
            res.send(Buffer.from(buffer));
        }
    } catch (err) {
        console.error('❌ Proxy error:', err.message);
        res.status(502).json({ error: `Proxy failed: ${err.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`🎬 Servidor proxy escuchando en http://localhost:${PORT}`);
    console.log(`📺 Canales disponibles: ${Object.keys(CHANNEL_URLS).join(', ')}`);
});
