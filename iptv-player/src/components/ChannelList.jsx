import { useState, useMemo } from 'react';
import { Search, Tv } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export function ChannelList({ channels, onSelectChannel, selectedChannelId }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredChannels = useMemo(() => {
        return channels.filter(channel =>
            channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            channel.group.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [channels, searchTerm]);

    const Row = ({ index, style }) => {
        const channel = filteredChannels[index];
        return (
            <div style={style}>
                <button
                    onClick={() => onSelectChannel(channel)}
                    className={`channel-item ${selectedChannelId === channel.id ? 'active' : ''}`}
                    style={{ width: '98%', marginLeft: '1%' }} // Small adjustment for scrollbar
                >
                    <div className="channel-icon">
                        {channel.logo ? (
                            <img src={channel.logo} alt="" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                            <Tv size={16} />
                        )}
                    </div>
                    <div className="channel-info">
                        <span className="channel-name">{channel.name}</span>
                        <span className="channel-group">{channel.group}</span>
                    </div>
                </button>
            </div>
        );
    };

    return (
        <div className="channel-sidebar glass">
            <div className="sidebar-header">
                <div className="search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search channels..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            <div className="channel-list" style={{ flex: 1 }}>
                {filteredChannels.length > 0 ? (
                    <AutoSizer>
                        {({ height, width }) => (
                            <List
                                height={height}
                                itemCount={filteredChannels.length}
                                itemSize={60}
                                width={width}
                            >
                                {Row}
                            </List>
                        )}
                    </AutoSizer>
                ) : (
                    <div className="no-results">
                        No channels found
                    </div>
                )}
            </div>
        </div>
    );
}
