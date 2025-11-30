import Hls from 'hls.js';
import './style.css';

const video = document.getElementById('video');
const channels = [
    {
        id: 'america',
        name: 'America',
        url: 'https://dai.google.com/linear/hls/pa/event/OY2i_lL4SMyXE5Zaj4ULEg/stream/695e4e3d-258b-4ff9-8cc4-d35943a8f1b8:SCL2/master.m3u8',
        isProxy: true
    },
    {
        id: 'telefe',
        name: 'Telefe',
        url: 'https://telefe.com/Api/Videos/GetSourceUrl/694564/0/HLS?.m3u8https://telefeappmitelefe1.akamaized.net/hls/live/2037985/appmitelefe/TOK/master.m3u8?hdnea=st=1764522332~exp=1764529532~acl=/hls/live/2037985/appmitelefe/TOK/*~hmac=07d0d516c14141932860bb56ed9650965e05737b01dc4443581f581af0f2391a',
        isProxy: true
    },
    {
        id: 'eltrece',
        name: 'El Trece',
        url: 'https://livetrx01.vodgc.net/eltrecetv/index.m3u8',
        isProxy: false
    }
];

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

// Initialize with first channel
renderChannels();
loadChannel(channels[0]);
