import { useState, useEffect } from 'react';
import { usePlaylist } from './hooks/usePlaylist';
import { VideoPlayer } from './components/VideoPlayer';
import { ChannelList } from './components/ChannelList';
import { Menu, X, Loader2 } from 'lucide-react';

// URL provided by the user
const PLAYLIST_URL = '/playlist.m3u';

function App() {
  const { channels, loading, error } = usePlaylist(PLAYLIST_URL);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Select first channel automatically when loaded
  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="app-container">
      {/* Mobile Menu Button */}
      <button className="menu-toggle btn-reset" onClick={toggleSidebar}>
        {isSidebarOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        {loading ? (
          <div className="loading-state">
            <Loader2 className="spinner" />
            <p>Loading channels...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>Error loading playlist</p>
          </div>
        ) : (
          <ChannelList
            channels={channels}
            onSelectChannel={(channel) => {
              setSelectedChannel(channel);
              if (window.innerWidth < 768) setIsSidebarOpen(false);
            }}
            selectedChannelId={selectedChannel?.id}
          />
        )}
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {selectedChannel ? (
          <div className="player-wrapper">
            <VideoPlayer src={selectedChannel.url} />
            <div className="channel-details glass">
              <h1>{selectedChannel.name}</h1>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>Select a channel to start watching</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
