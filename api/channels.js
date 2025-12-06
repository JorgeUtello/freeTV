// api/channels.js
// Devuelve la lista de canales disponibles (metadatos sin exponer tokens)

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const channels = [
    { id: 'america', name: 'America', proxy: true },
    { id: 'telefe', name: 'Telefe', proxy: true },
    { id: 'eltrece', name: 'El Trece', proxy: true }
  ];

  res.json({ channels });
}
