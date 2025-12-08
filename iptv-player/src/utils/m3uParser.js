/**
 * Parses an M3U playlist string into an array of channel objects.
 * @param {string} content - The raw M3U file content.
 * @returns {Array} Array of channel objects { name, logo, group, url, id }.
 */
export function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;

  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;

    if (line.startsWith('#EXTINF:')) {
      // Example: #EXTINF:-1 tvg-id="" tvg-name="" tvg-logo="http://logo.png" group-title="News",Channel Name
      const info = line.substring(8);
      const parts = info.split(',');
      const name = parts[parts.length - 1].trim();

      // Extract attributes
      const logoMatch = info.match(/tvg-logo="([^"]*)"/);
      const groupMatch = info.match(/group-title="([^"]*)"/);

      // Extract VLCOPT options
      const userAgentMatch = info.match(/http-user-agent=([^"]*)/) || line.match(/http-user-agent=([^,]*)/);
      const referrerMatch = info.match(/http-referrer=([^"]*)/) || line.match(/http-referrer=([^,]*)/);

      currentChannel = {
        id: crypto.randomUUID(),
        name: name || 'Unknown Channel',
        logo: logoMatch ? logoMatch[1] : null,
        group: groupMatch ? groupMatch[1] : '',
        userAgent: userAgentMatch ? userAgentMatch[1] : null,
        referrer: referrerMatch ? referrerMatch[1] : null,
      };
    } else if (line.startsWith('http')) {
      if (currentChannel) {
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = null;
      }
    }
  });

  return channels;
}
