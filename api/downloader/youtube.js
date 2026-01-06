
const axios = require("axios");
const crypto = require("crypto");

module.exports = {
  meta: {
    name: 'youtube',
    desc: 'Download YouTube videos in various formats using Savetube API',
    category: 'downloader',
    method: ['GET', 'POST'],
    params: [
      {
        name: 'url',
        desc: 'YouTube video URL',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        required: true
      },
      {
        name: 'format',
        desc: 'Video format/quality',
        example: '720',
        required: false,
        options: ['144', '240', '360', '480', '720', '1080', 'mp3']
      }
    ]
  },

  async onStart({ req, res }) {
    try {
      const { url, format = '720' } = req.method === 'GET' ? req.query : req.body;

      if (!url) {
        return res.json({
          status: false,
          message: 'URL is required'
        });
      }

      // Savetube implementation
      const savetube = {
        api: {
          base: "https://media.savetube.me/api",
          cdn: "/random-cdn",
          info: "/v2/info",
          download: "/download",
        },
        formats: ["144", "240", "360", "480", "720", "1080", "mp3"],
        
        getRandomUserAgent: function() {
          const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
          ];
          return userAgents[Math.floor(Math.random() * userAgents.length)];
        },

        getHeaders: function() {
          return {
            accept: "*/*",
            "content-type": "application/json",
            origin: "https://yt.savetube.me",
            referer: "https://yt.savetube.me/",
            "user-agent": this.getRandomUserAgent(),
          };
        },

        crypto: {
          hexToBuffer: (hexString) => {
            const matches = hexString.match(/.{1,2}/g);
            return Buffer.from(matches.join(""), "hex");
          },
          
          decrypt: async (enc) => {
            try {
              const secretKey = "C5D58EF67A7584E4A29F6C35BBC4EB12";
              const data = Buffer.from(enc, "base64");
              const iv = data.slice(0, 16);
              const content = data.slice(16);
              const key = savetube.crypto.hexToBuffer(secretKey);
              const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
              let decrypted = decipher.update(content);
              decrypted = Buffer.concat([decrypted, decipher.final()]);
              return JSON.parse(decrypted.toString());
            } catch (error) {
              throw new Error(error);
            }
          },
        },
        
        youtube: (url) => {
          if (!url) return null;
          const patterns = [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
          ];
          for (let pattern of patterns) {
            if (pattern.test(url)) return url.match(pattern)[1];
          }
          return null;
        },
        
        request: async (endpoint, data = {}, method = "post") => {
          try {
            const { data: response } = await axios({
              method,
              url: `${endpoint.startsWith("http") ? "" : savetube.api.base}${endpoint}`,
              data: method === "post" ? data : undefined,
              params: method === "get" ? data : undefined,
              headers: savetube.getHeaders(),
            });
            return {
              status: true,
              code: 200,
              data: response,
            };
          } catch (error) {
            throw new Error(error.message);
          }
        },
        
        getCDN: async () => {
          const response = await savetube.request(savetube.api.cdn, {}, "get");
          if (!response.status) throw new Error(response);
          return {
            status: true,
            code: 200,
            data: response.data.cdn,
          };
        },
        
        download: async (link, format) => {
          if (!link) {
            return {
              status: false,
              code: 400,
              error: "Link is required",
            };
          }
          
          if (!format || !savetube.formats.includes(format)) {
            return {
              status: false,
              code: 400,
              error: "Invalid format. Available formats: " + savetube.formats.join(", "),
              available_fmt: savetube.formats,
            };
          }
          
          const id = savetube.youtube(link);
          if (!id) throw new Error("Invalid YouTube URL");
          
          try {
            const cdnx = await savetube.getCDN();
            if (!cdnx.status) return cdnx;
            const cdn = cdnx.data;
            
            const result = await savetube.request(
              `https://${cdn}${savetube.api.info}`,
              {
                url: `https://www.youtube.com/watch?v=${id}`,
              },
            );
            
            if (!result.status) return result;
            const decrypted = await savetube.crypto.decrypt(result.data.data);
            
            let dl;
            try {
              dl = await savetube.request(`https://${cdn}${savetube.api.download}`, {
                id: id,
                downloadType: format === "mp3" ? "audio" : "video",
                quality: format === "mp3" ? "128" : format,
                key: decrypted.key,
              });
            } catch (error) {
              throw new Error(error);
            }
            
            return {
              status: true,
              code: 200,
              result: {
                title: decrypted.title || "Unknown Title",
                type: format === "mp3" ? "audio" : "video",
                format: format,
                thumbnail: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/0.jpg`,
                download: dl.data.data.downloadUrl,
                id: id,
                key: decrypted.key,
                duration: decrypted.duration,
                quality: format === "mp3" ? "128" : format,
                downloaded: dl.data.data.downloaded,
              },
            };
          } catch (error) {
            throw new Error(error);
          }
        },
      };

      // Validate format
      if (!savetube.formats.includes(format)) {
        return res.json({
          status: false,
          message: `Invalid format. Available formats: ${savetube.formats.join(', ')}`,
          available_formats: savetube.formats
        });
      }

      // Download the video
      const result = await savetube.download(url, format);

      if (!result.status) {
        return res.json({
          status: false,
          message: result.error || 'Download failed',
          available_formats: result.available_fmt
        });
      }

      res.json({
        status: true,
        result: result.result
      });

    } catch (error) {
      res.json({
        status: false,
        message: error.message
      });
    }
  }
};
