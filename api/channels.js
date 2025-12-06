// api/channels.js
// Devuelve la lista de canales disponibles (metadatos sin exponer tokens)

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const channels = [
    { id: 'america', name: 'America', proxy: true },
    { id: 'telefe', name: 'Telefe', proxy: true },
    { id: 'eltrece', name: 'El Trece', proxy: true },
    // Example of an embedded YouTube channel (iframe)
    {
      id: 'youtube_cb12KmMMDJA',
      name: 'YouTube - Especial',
      embed: true,
      iframeUrl: 'https://www.youtube.com/embed/cb12KmMMDJA?si=TNIUnj3XPT9Owxm1'
    }
  ];

  res.json({ channels });
}
