import { useState, useEffect } from 'react';
import { parseM3U } from '../utils/m3uParser';

export function usePlaylist(url) {
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!url) return;

        const fetchPlaylist = async () => {
            try {
                setLoading(true);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to fetch playlist');
                }
                const text = await response.text();
                const parsedChannels = parseM3U(text);
                setChannels(parsedChannels);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPlaylist();
    }, [url]);

    return { channels, loading, error };
}
