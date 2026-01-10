const ytSearch = require('yt-search');

module.exports = {
  meta: {
    name: 'youtube',
    desc: 'Search YouTube videos (returns 5 results)',
    category: 'search',
    method: ['GET'],
    params: [
      {
        name: 'query',
        desc: 'Search query',
        example: 'Coldplay Yellow',
        required: true
      }
    ]
  },

  async onStart({ req, res }) {
    try {
      const { query } = req.query;

      if (!query) {
        return res.json({
          status: false,
          message: 'Search query is required'
        });
      }

      // Search YouTube
      const searchResults = await ytSearch(query);
      
      if (!searchResults || !Array.isArray(searchResults.videos)) {
        return res.json({
          status: false,
          message: 'Invalid YouTube search response'
        });
      }

      // Get first 5 results
      const videos = searchResults.videos.slice(0, 5).map(video => ({
        title: video.title,
        id: video.videoId,
        url: video.url,
        thumbnail: video.thumbnail,
        views: video.views.toString(),
        duration: video.duration.toString(),
        published: video.ago || video.uploadDate || 'N/A'
      }));

      res.json({
        status: true,
        query: query,
        count: videos.length,
        results: videos
      });

    } catch (error) {
      res.json({
        status: false,
        message: error.message || 'Failed to search YouTube'
      });
    }
  }
};
