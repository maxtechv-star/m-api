// api/downloader/ytmp3.js
const hdrs = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://yt2mp3.gs/',
  'Origin': 'https://yt2mp3.gs',
}

async function ytmp3(videoId, format = 'mp3') {
  const ts = () => Date.now()

  const authRes = await fetch(`https://epsilon.epsiloncloud.org/api/v1/auth?_=${ts()}`, { headers: { ...hdrs } })
  const authText = await authRes.text()
  const { key } = JSON.parse(authText)

  const initRes = await fetch(`https://epsilon.epsiloncloud.org/api/v1/init?_=${ts()}`, {
    headers: { ...hdrs, Authorization: `Bearer ${key}` }
  })
  const initText = await initRes.text()
  const { convertURL } = JSON.parse(initText)

  let result
  let url = `${convertURL}&v=${videoId}&f=${format}&_=${ts()}`

  while (true) {
    const res = await fetch(url, { headers: hdrs })
    const text = await res.text()
    result = JSON.parse(text)
    if (!result.redirect) break
    url = result.redirectURL
  }

  return { result_url: result.downloadURL, title: result.title }
}

module.exports = {
  meta: {
    name: "ytmp3",
    category: "downloader",
    method: ["GET"],
    description: "Download audio from YouTube videos as MP3",
    params: [
      {
        name: "url",
        desc: "YouTube video URL or video ID",
        example: "https://youtube.com/watch?v=BElct8HWkp8",
        required: true
      }
    ]
  },

  async onStart({ req, res }) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "URL parameter is required"
        });
      }

      // Extract video ID
      let videoId = url;
      const patterns = [
        /(?:youtube\.com\/watch\?v=)([\w-]+)/,
        /(?:youtu\.be\/)([\w-]+)/,
        /(?:youtube\.com\/embed\/)([\w-]+)/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          videoId = match[1];
          break;
        }
      }

      const result = await ytmp3(videoId);

      return res.json({
        status: true,
        title: result.title,
        downloadUrl: result.result_url
      });

    } catch (error) {
      return res.status(500).json({
        status: false,
        error: error.message
      });
    }
  }
};
