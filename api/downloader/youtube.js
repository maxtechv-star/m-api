
module.exports = {
    meta: {
        name: 'youtube',
        category: 'downloader',
        desc: 'Download YouTube videos and audio (MP3/MP4)',
        method: ['GET'],
        params: [
            {
                name: 'id',
                desc: 'YouTube video ID or full URL',
                required: true,
                example: 'dQw4w9WgXcQ'
            },
            {
                name: 'format',
                desc: 'Output format (mp3 or mp4)',
                required: false,
                example: 'mp3',
                options: ['mp3', 'mp4']
            }
        ]
    },
    
    async onStart({ req, res }) {
        const { id, format = 'mp3' } = req.query;
        
        if (!id) {
            return res.status(400).json({
                error: true,
                message: 'Video ID is required'
            });
        }
        
        // Extract ID from URL if full URL is provided
        const videoId = extractVideoId(id);
        if (!videoId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid YouTube video ID or URL'
            });
        }
        
        // Validate format
        if (format !== 'mp3' && format !== 'mp4') {
            return res.status(400).json({
                error: true,
                message: 'Format must be either mp3 or mp4'
            });
        }
        
        try {
            const result = await downloadYouTube(videoId, format);
            
            res.json({
                success: true,
                data: result
            });
            
        } catch (error) {
            console.error('YouTube download error:', error);
            res.status(500).json({
                error: true,
                message: error.message || 'Failed to process download request'
            });
        }
    }
};

// Helper function to extract video ID from YouTube URL
function extractVideoId(url) {
    if (!url) return null;
    
    // If it looks like just an ID (no special characters except dash and underscore)
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
        return url;
    }
    
    try {
        const urlObj = new URL(url);
        let videoId = null;
        
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            if (urlObj.hostname.includes('youtu.be')) {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.pathname === '/watch') {
                videoId = urlObj.searchParams.get('v');
            } else if (urlObj.pathname.startsWith('/shorts/')) {
                videoId = urlObj.pathname.split('/')[2];
            }
        }
        
        return videoId;
    } catch {
        return null;
    }
}

// YouTube download function
async function downloadYouTube(videoId, format = "mp3") {
    const headers = {
        "accept-encoding": "gzip, deflate, br, zstd",
        "origin": "https://ht.flvto.online",
        "content-type": "application/json"
    };
    
    const body = JSON.stringify({
        "id": videoId,
        "fileType": format
    });
    
    const response = await fetch(`https://ht.flvto.online/converter`, {
        headers,
        body,
        method: "POST"
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const json = await response.json();
    return json;
}
