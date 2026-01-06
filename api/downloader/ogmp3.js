// api/youtube/ogmp3.js
const axios = require('axios');
const crypto = require('crypto');

const ranHash = () => {
    return crypto.randomBytes(16).toString('hex');
};

const encodeData = (text) => {
    return text.split('').map(char => String.fromCharCode(char.charCodeAt(0) ^ 1)).join('');
};

const encodePath = (text) => {
    return text.split('').map(char => char.charCodeAt(0)).reverse().join(',');
};

const getApiEndpoint = (format, mp3Quality) => {
    if (format === '1') return 'https://api5.apiapi.lat';
    if (mp3Quality === '128') return 'https://api.apiapi.lat';
    return 'https://api3.apiapi.lat';
};

class OgMp3Scraper {
    constructor() {
        this.headers = {
            'accept': '*/*',
            'accept-language': 'id,en;q=0.9',
            'content-type': 'application/json',
            'origin': 'https://ogmp3.pw',
            'referer': 'https://ogmp3.pw/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0'
        };
    }
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async convert(youtubeUrl, format = '0', quality = '128') {
        // Format: '0' = MP3, '1' = MP4
        // Quality: MP3 = '128', '64', '192', '256', '320'
        //          MP4 = '720', '240', '360', '480', '1080'
        
        try {
            const apiEndPoint = getApiEndpoint(format, quality);
            const pathEncoded = encodePath(youtubeUrl);
            const bodyEncoded = encodeData(youtubeUrl);
            const initUrl = `${apiEndPoint}/${ranHash()}/init/${pathEncoded}/${ranHash()}/`;
            
            const payload = {
                data: bodyEncoded,
                format: format,
                referer: "https://ogmp3.pw/",
                mp3Quality: quality,
                mp4Quality: format === '1' ? quality : "720",
                userTimeZone: "-420"
            };
            
            const { data: initData } = await axios.post(initUrl, payload, { headers: this.headers });
            
            if (!initData || initData.error) {
                throw new Error('Gagal inisialisasi convert.');
            }
            
            let taskData = initData;
            let attempt = 0;
            const maxAttempts = 30;

            while (taskData.s === 'P' && attempt < maxAttempts) {
                attempt++;
                console.log(`[Proses] Converting... Percobaan ke-${attempt}/${maxAttempts}`);
                await this.sleep(2000);
                const statusUrl = `${apiEndPoint}/${ranHash()}/status/${taskData.i}/${ranHash()}/`;
                const { data: statusRes } = await axios.post(statusUrl, { data: taskData.i }, { headers: this.headers });
                
                taskData = statusRes;
            }
            
            if (taskData.s === 'C') {
                const downloadUrl = `${apiEndPoint}/${ranHash()}/download/${taskData.i}/${ranHash()}/`;
                
                return {
                    status: true,
                    message: 'Success',
                    title: taskData.t || 'Unknown Title',
                    format: format === '1' ? 'MP4' : 'MP3',
                    quality: quality,
                    download_url: downloadUrl
                };
            } else {
                return {
                    status: false,
                    message: 'Timeout atau Gagal Convert',
                    data: taskData
                };
            }
        } catch (error) {
            return {
                status: false,
                message: error.message
            };
        }
    }
}

module.exports = {
    meta: {
        name: "ogmp3",
        category: "downloader",
        desc: "Convert YouTube videos to MP3 or MP4 using ogmp3 API",
        method: ["GET", "POST"],
        params: [
            {
                name: "url",
                type: "string",
                required: true,
                desc: "YouTube video URL",
                example: "https://www.youtube.com/watch?v=ASsXs-sVaFw"
            },
            {
                name: "format",
                type: "string",
                required: false,
                desc: "Format: '0' for MP3, '1' for MP4",
                example: "0",
                options: ["0", "1"]
            },
            {
                name: "quality",
                type: "string",
                required: false,
                desc: "Quality: For MP3: '64', '128', '192', '256', '320'. For MP4: '240', '360', '480', '720', '1080'",
                example: "128",
                options: ["64", "128", "192", "256", "320", "240", "360", "480", "720", "1080"]
            }
        ]
    },
    
    async onStart({ req, res }) {
        try {
            const url = req.query.url || req.body.url;
            const format = req.query.format || req.body.format || '0';
            const quality = req.query.quality || req.body.quality || '128';
            
            if (!url) {
                return res.json({ 
                    status: false, 
                    message: "URL parameter is required" 
                });
            }
            
            const scraper = new OgMp3Scraper();
            const result = await scraper.convert(url, format, quality);
            
            res.json(result);
            
        } catch (error) {
            res.json({
                status: false,
                message: error.message
            });
        }
    }
};
