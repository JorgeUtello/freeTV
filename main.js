import Hls from 'hls.js';
import './style.css';

const video = document.getElementById('video');

// En desarrollo usa puerto 3001, en producción usa /api (Vercel)
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';

let channels = [
    // fallback list used if /api/channels is not reachable
    { id: 'america', name: 'America', url: `${API_BASE}/stream?channel=america`, isProxy: true },
    { id: 'telefe', name: 'Telefe', url: `${API_BASE}/stream?channel=telefe`, isProxy: true },
    { id: 'eltrece', name: 'El Trece', url: `${API_BASE}/stream?channel=eltrece`, isProxy: true }
];

// Try to fetch channels list from serverless API in production
async function loadChannelsFromApi() {
    try {
        const res = await fetch(`${API_BASE}/channels`);
        if (!res.ok) throw new Error('channels API not ok');
        const json = await res.json();
        if (json && Array.isArray(json.channels) && json.channels.length) {
            channels = json.channels.map(c => ({
                id: c.id,
                name: c.name,
                url: `${API_BASE}/stream?channel=${c.id}`,
                isProxy: !!c.proxy
            }));
        }
    } catch (e) {
        console.warn('Could not fetch /api/channels — using fallback list', e);
    }
}

let currentHls = null;

function renderChannels() {
    const list = document.getElementById('channel-list');
    list.innerHTML = '';

    channels.forEach(channel => {
        const li = document.createElement('li');
        li.className = 'channel-item';
        li.textContent = channel.name;
        li.onclick = () => loadChannel(channel);
        if (channel.id === 'telefe') li.classList.add('active'); // Default active
        list.appendChild(li);
    });
}

function updateActiveChannelUI(channelId) {
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent === channels.find(c => c.id === channelId).name) {
            item.classList.add('active');
        }
    });
    document.getElementById('channel-name').textContent = channels.find(c => c.id === channelId).name;
}

async function loadChannel(channel) {
    updateActiveChannelUI(channel.id);

    if (Hls.isSupported()) {
        if (currentHls) {
            currentHls.destroy();
        }

        const hls = new Hls();
        currentHls = hls;

        hls.loadSource(channel.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            video.play().catch(e => console.log("Autoplay blocked:", e));
        });

        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log("fatal network error encountered, try to recover");
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log("fatal media error encountered, try to recover");
                        hls.recoverMediaError();
                        break;
                    default:
                        hls.destroy();
                        break;
                }
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = channel.url;
        video.addEventListener('loadedmetadata', function () {
            video.play().catch(e => console.log("Autoplay blocked:", e));
        });
    }
}

// Initialize: try to load from API, then render and load first channel
(async () => {
    await loadChannelsFromApi();
    renderChannels();
    if (channels && channels.length) loadChannel(channels[0]);
})();
