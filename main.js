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
    { id: 'eltrece', name: 'El Trece', url: `${API_BASE}/stream?channel=eltrece`, isProxy: true },
    { id: 'espn', name: 'ESPN', url: `${API_BASE}/stream?channel=espn`, isProxy: true },
    // local-only fallback for a YouTube embed (iframe)
    { id: 'youtube_cb12KmMMDJA', name: 'TN', embed: true, iframeUrl: 'https://www.youtube.com/embed/cb12KmMMDJA?si=TNIUnj3XPT9Owxm1' }
];

// Try to fetch channels list from serverless API in production
async function loadChannelsFromApi() {
    try {
        const res = await fetch(`${API_BASE}/channels`);
        if (!res.ok) throw new Error('channels API not ok');
        const json = await res.json();
        if (json && Array.isArray(json.channels) && json.channels.length) {
            channels = json.channels.map(c => {
                if (c.embed) {
                    return {
                        id: c.id,
                        name: c.name,
                        embed: true,
                        iframeUrl: c.iframeUrl
                    };
                }
                return {
                    id: c.id,
                    name: c.name,
                    url: `${API_BASE}/stream?channel=${c.id}`,
                    isProxy: !!c.proxy
                };
            });
        }
    } catch (e) {
        console.warn('Could not fetch /api/channels — using fallback list', e);
    }
}

let currentHls = null;

function renderChannels() {
    const list = document.getElementById('channel-list');
    list.innerHTML = '';

    channels.forEach((channel, idx) => {
        const li = document.createElement('li');
        li.className = 'channel-item';
        li.textContent = channel.name;
        li.onclick = () => loadChannel(channel);
        li.tabIndex = -1;
        li.onfocus = () => { focusedIndex = idx; };
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
    // If channel is an embedded iframe (YouTube, etc.), show iframe instead of HLS video
    const videoEl = document.getElementById('video');
    const container = document.querySelector('.video-container');
    let iframe = document.getElementById('embed-iframe');

    if (channel.embed) {
        // destroy any existing hls instance
        if (currentHls) {
            try { currentHls.destroy(); } catch (e) { /* ignore */ }
            currentHls = null;
        }

        // hide video element
        videoEl.style.display = 'none';

        // create iframe if missing
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'embed-iframe';
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.frameBorder = '0';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            iframe.allowFullscreen = true;
            container.appendChild(iframe);
        }
        iframe.src = channel.iframeUrl || channel.url;
        iframe.style.display = 'block';
        return;
    }

    // Ensure iframe is removed/hidden for regular HLS channels
    if (iframe) {
        try { iframe.remove(); } catch (e) { iframe.style.display = 'none'; }
    }
    videoEl.style.display = '';

    if (Hls.isSupported()) {
        if (currentHls) {
            currentHls.destroy();
        }

        const hls = new Hls();
        currentHls = hls;

        hls.loadSource(channel.url);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            videoEl.play().catch(e => console.log("Autoplay blocked:", e));
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
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = channel.url;
        videoEl.addEventListener('loadedmetadata', function () {
            videoEl.play().catch(e => console.log("Autoplay blocked:", e));
        });
    }
}

// Initialize: try to load from API, then render and load first channel

// --- TV/remote-friendly menu logic ---
let menuTimeout = null;
let focusedIndex = 0;

function showMenu() {
    document.body.classList.add('menu-visible');
    clearTimeout(menuTimeout);
    menuTimeout = setTimeout(() => {
        document.body.classList.remove('menu-visible');
    }, 4000);
}

function focusChannel(idx) {
    const items = document.querySelectorAll('.channel-item');
    if (!items.length) return;
    items.forEach(i => i.tabIndex = -1);
    if (idx < 0) idx = 0;
    if (idx >= items.length) idx = items.length - 1;
    focusedIndex = idx;
    items[idx].focus();
    showMenu();
}

function handleKey(e) {
    const items = document.querySelectorAll('.channel-item');
    if (!items.length) return;
    if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
        focusChannel((focusedIndex + 1) % items.length);
        e.preventDefault();
    } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
        focusChannel((focusedIndex - 1 + items.length) % items.length);
        e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
        items[focusedIndex].click();
        e.preventDefault();
    } else if (e.key === 'm') {
        showMenu();
    }
}

document.addEventListener('keydown', handleKey);
document.addEventListener('mousemove', showMenu);
document.addEventListener('touchstart', showMenu);

// Always show menu on load
document.body.classList.add('menu-visible');

(async () => {
    await loadChannelsFromApi();
    renderChannels();
    if (channels && channels.length) loadChannel(channels[0]);
    // Focus first channel for remote/keyboard
    setTimeout(() => focusChannel(0), 100);
})();
