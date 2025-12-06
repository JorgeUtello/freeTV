// api/channels.js
// Devuelve la lista de canales disponibles (metadatos sin exponer tokens)

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // Leer y parsear playlist.m3u8 dinámicamente
  const playlistUrl = 'http://190.104.67.180:234/playlist.m3u8';
  let channels = [];
  fetch(playlistUrl)
    .then(resp => resp.text())
    .then(text => {
      const lines = text.split(/\r?\n/);
      let lastName = null;
      for (const line of lines) {
        if (line.startsWith('#EXTINF')) {
          const match = line.match(/#EXTINF:-1,(.*)/);
          lastName = match ? match[1].trim() : null;
        } else if (lastName && line && !line.startsWith('#')) {
          channels.push({ id: lastName, name: lastName, url: line.trim(), proxy: true });
          lastName = null;
        }
      }
      res.json({ channels });
    })
    .catch(err => {
      res.status(502).json({ error: 'No se pudo obtener la lista de canales', details: err && err.message });
    });
}
