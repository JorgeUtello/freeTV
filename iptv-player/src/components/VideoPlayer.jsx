import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle } from 'lucide-react';

export function VideoPlayer({ src, poster }) {
    const videoRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let hls;

        if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    setError('Stream error: ' + data.details);
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        } else {
            setError('HLS not supported in this browser');
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [src]);

    if (error) {
        return (
            <div className="player-error">
                <AlertCircle size={48} />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="video-container">
            <video
                ref={videoRef}
                controls
                autoPlay
                poster={poster}
                className="video-player"
            />
        </div>
    );
}
