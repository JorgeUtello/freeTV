// api/stream.js
// Función serverless para Vercel que actúa como proxy de streams

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { channel } = req.query;

    if (!channel) {
        return res.status(400).json({ error: 'Canal no especificado' });
    }

    const CHANNEL_URLS = {
        telefe: 'https://telefeappmitelefe1.akamaized.net/hls/live/2037985/appmitelefe/TOK/master.m3u8',
        america: 'https://dai.google.com/linear/hls/pa/event/OY2i_lL4SMyXE5Zaj4ULEg/stream/695e4e3d-258b-4ff9-8cc4-d35943a8f1b8:SCL2/master.m3u8',
        eltrece: 'https://livetrx01.vodgc.net/eltrecetv/index.m3u8'
    };

    const url = CHANNEL_URLS[channel];

    if (!url) {
        return res.status(404).json({ error: `Canal '${channel}' no encontrado. Disponibles: ${Object.keys(CHANNEL_URLS).join(', ')}` });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} from upstream`);
        }

        const data = await response.text();

        // Headers para streaming HLS
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'public, max-age=10');
        
        return res.status(200).send(data);
    } catch (error) {
        console.error(`[API Error] Canal ${channel}:`, error.message);
        return res.status(500).json({ 
            error: `Error obteniendo stream de ${channel}`,
            details: error.message
        });
    }
}
