import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

const CORS_PROXY = 'https://corsproxy.io/?';

export function VideoPlayer({ src, poster }) {
    const videoRef = useRef(null);
    const [error, setError] = useState(null);
    const [usingProxy, setUsingProxy] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let hls;

        const initPlayer = () => {
            // If using proxy, we wrap the initial URL
            const currentSrc = usingProxy ? `${CORS_PROXY}${encodeURIComponent(src)}` : src;

            if (Hls.isSupported()) {
                hls = new Hls({
                    // If using proxy, we might need to proxy segments too if they are absolute URLs
                    xhrSetup: function (xhr, url) {
                        if (usingProxy && !url.startsWith(CORS_PROXY)) {
                            // If we are in proxy mode, and the requested URL (e.g. a segment) isn't already proxied
                            // We should proxy it. 
                            // Note: hls.js might resolve relative URLs against the manifest URL (which is proxied),
                            // so relative URLs might already be correct. But absolute URLs in the manifest need wrapping.

                            // Check if it's an absolute URL that needs proxying
                            if (url.startsWith('http')) {
                                xhr.open('GET', `${CORS_PROXY}${encodeURIComponent(url)}`);
                            }
                        }
                    }
                });

                hls.loadSource(currentSrc);
                hls.attachMedia(video);

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log('Network error encountered', data);
                                if (!usingProxy) {
                                    console.log('Attempting to switch to CORS proxy...');
                                    setUsingProxy(true);
                                } else {
                                    setError(`Network error: ${data.details}`);
                                    hls.destroy();
                                }
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log('Media error, trying to recover...');
                                hls.recoverMediaError();
                                break;
                            default:
                                hls.destroy();
                                setError(`Playback error: ${data.details}`);
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS (Safari)
                video.src = currentSrc;
                video.onerror = () => {
                    if (!usingProxy) {
                        setUsingProxy(true);
                    } else {
                        setError('Error playing video natively');
                    }
                };
            } else {
                setError('HLS not supported in this browser');
            }
        };

        initPlayer();

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [src, usingProxy]);

    // Reset state when src changes
    useEffect(() => {
        setError(null);
        setUsingProxy(false);
    }, [src]);

    if (error) {
        return (
            <div className="player-error">
                <AlertCircle size={48} className="mb-4" />
                <p>{error}</p>
                <button
                    onClick={() => setUsingProxy(!usingProxy)}
                    className="mt-4 px-4 py-2 bg-indigo-600 rounded flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                    style={{ marginTop: '1rem', background: '#6366f1', padding: '8px 16px', borderRadius: '6px', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    <RefreshCw size={16} />
                    {usingProxy ? 'Retry without Proxy' : 'Try with Proxy'}
                </button>
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
            {usingProxy && (
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#a1a1aa', pointerEvents: 'none' }}>
                    Using Proxy
                </div>
            )}
        </div>
    );
}
