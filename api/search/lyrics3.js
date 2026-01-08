const axios = require('axios');

module.exports = {
  meta: {
    name: 'lyrics',
    desc: 'Get lyrics by ID',
    category: 'search',
    method: ['GET'],
    params: [
      {
        name: 'id',
        desc: 'Lyrics ID from search results',
        example: '12345',
        required: true
      }
    ]
  },

  async onStart({ req, res }) {
    try {
      const { id } = req.query;

      if (!id) {
        return res.json({
          status: false,
          message: 'Lyrics ID is required'
        });
      }

      // Get lyrics by ID function
      async function getLyricsById(id) {
        try {
          const { data } = await axios.get(
            `https://lrclib.net/api/get/${id}`
          );
          return data;
        } catch (e) {
          return { error: e.message };
        }
      }

      // Format duration
      function formatDuration(sec) {
        if (!sec) return 'N/A';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
      }

      const lyric = await getLyricsById(id);
      
      if (lyric.error) {
        return res.json({
          status: false,
          message: lyric.error
        });
      }

      res.json({
        status: true,
        lyrics: {
          trackName: lyric.trackName,
          artistName: lyric.artistName,
          albumName: lyric.albumName || 'N/A',
          duration: formatDuration(lyric.duration),
          plainLyrics: lyric.plainLyrics || lyric.syncedLyrics || 'Lyrics not available'
        }
      });

    } catch (error) {
      res.json({
        status: false,
        message: error.message
      });
    }
  }
};
