const keepv = {
    tools: {
        generateHex: (length = 10, config = { prefix: "" }) => {
            const charSet = "0123456789abcdef"
            const charSetArr = charSet.split("")
            const getRandom = (array) => array[Math.floor(Math.random() * array.length)]

            const randomString = Array.from({ length }, _ => getRandom(charSetArr)).join("")
            return config.prefix + randomString
        },
        generateTokenValidTo: () => (Date.now() + (1000 * 60 * 20)).toString().substring(0, 10),
        mintaJson: async (description, url, options) => {
            try {
                const response = await fetch(url, options)
                if (!response.ok) throw Error(`${response.status} ${response.statusText}\n${await response.text() || '(empty content)'}`)
                const json = await response.json()
                return json
            } catch (err) {
                throw Error(`gagal mintaJson ${description} -> ${err.message}`)
            }
        },
        validateString: (description, theVariable) => {
            if (typeof (theVariable) !== "string" || theVariable?.trim()?.length === 0) {
                throw Error(`variabel ${description} harus string dan gak boleh kosong`)
            }
        },
        delay: async (ms) => new Promise(re => setTimeout(re, ms)),
        handleFormat: (desireFormat) => {
            const validParam = ["audio", "240p", "360p", "480p", "720p", "1080p", "best_video"]
            if (!validParam.includes(desireFormat)) throw Error(`${desireFormat} is invalid format. just pick one of these: ${validParam.join(", ")}`)
            let result
            result = desireFormat.match(/^(\d+)p/)?.[1]
            if (!result) {
                desireFormat === validParam[0] ? result = desireFormat : result = "10000"
            }
            return result
        }
    },
    konstanta: {
        origin: "https://keepv.id",
        baseHeaders: {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-GB,en;q=0.9,en-US;q=0.8",
            "cache-control": "no-cache",
            "connection": "keep-alive",
            "host": "keepv.id",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Microsoft Edge\";v=\"138\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"
        }
    },

    async getCookieAndRedirectUrl(origin, baseHeaders) {
        const headers = {
            ...baseHeaders
        }
        const r = await fetch(origin, { headers })
        if (!r.ok) throw Error(`${r.status} ${r.statusText}\n${await r.text() || `(kosong respond nyah)`}`)
        const h = r.headers
        const cookies = h.getSetCookie()
        const cookie = cookies?.[0]?.split("; ")?.[0]
        if (!cookie) throw Error(`lah kocak kuki nya kagak ada >:o`)
        return { cookie, urlRedirect: r.url }
    },
    
    async validateCookie(resultGetCookieAndRedirectUrl, origin, youtubeUrl, baseHeaders, format) {
        const { cookie, urlRedirect } = resultGetCookieAndRedirectUrl
        const headers = {
            cookie,
            referer: urlRedirect,
            ...baseHeaders
        }

        const pathname = format === "audio" ? "button" : "vidbutton"
        const url = `${origin}/${pathname}/?url=${youtubeUrl}`
        const r = await fetch(url, { headers })
        if (!r.ok) throw Error(`${r.status} ${r.statusText}\n${await r.text() || `(respond nya kosong :v)`}`)
        return { cookie, referer: url }
    },
    
    async convert(resultValidateCookie, origin, youtubeUrl, baseHeaders, format) {
        const { cookie, referer } = resultValidateCookie
        const headers = {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            cookie,
            referer,
            origin,
            "x-requested-with": "XMLHttpRequest",
            ...baseHeaders
        }
        delete headers["upgrade-insecure-requests"]

        const payload = {
            url: youtubeUrl,
            convert: "gogogo",
            token_id: this.tools.generateHex(64, { prefix: "t_" }),
            token_validto: this.tools.generateTokenValidTo(),
        }
        if (format !== "audio") payload.height = format
        const body = new URLSearchParams(payload)
        const pathname = format === "audio" ? "convert" : "vidconvert"

        const url = `${origin}/${pathname}/`
        const result = await this.tools.mintaJson(`convert`, url, { headers, body, "method": "post" })
        if (result.error) throw Error(`gagal convert karena ada error dari server. katanya \n${result.error}`)
        if (!result.jobid) throw Error(`aneh anjir job id nya kosong >:o`)
        return result
    },
    
    async checkJob(resultValidateCookie, resultConvert, origin, baseHeaders, format, identifier) {
        const { cookie, referer } = resultValidateCookie
        const { jobid } = resultConvert

        const headers = {
            cookie,
            referer,
            "x-requested-with": "XMLHttpRequest",
            ...baseHeaders
        }
        delete headers["upgrade-insecure-requests"]

        const usp = new URLSearchParams({
            jobid,
            time: Date.now()
        })

        const pathname = format === "audio" ? "convert" : "vidconvert"
        const url = new URL(`${origin}/${pathname}/`)
        url.search = usp

        const MAX_FETCH_ATTEMPT = 60
        const FETCH_INTERVAL = 5000
        let fetchCount = 0

        let data = {}
        do {
            fetchCount++
            const r = await fetch(url, { headers })
            data = await r.json()
            if (data.dlurl) return data
            if (data.error) throw Error(`ada error saat cek job nih jsonnyah\n${JSON.stringify(data, null, 2)}`)
            
            await this.tools.delay(FETCH_INTERVAL)
        } while (fetchCount < MAX_FETCH_ATTEMPT && data.retry)
        throw Error(`mencapai batas maksimal fetch attempt`)
    },

    async download(youtubeUrl, userFormat = "audio", owner = "") {
        this.tools.validateString(`youtube url`, youtubeUrl)
        const format = this.tools.handleFormat(userFormat)
        const identifier = this.tools.generateHex(4, { prefix: owner.trim().length ? `${owner.trim()}-` : owner.trim() })
        
        const origin = this.konstanta.origin
        const headers = this.konstanta.baseHeaders

        const resultGCARU = await this.getCookieAndRedirectUrl(origin, headers)
        const resultVC = await this.validateCookie(resultGCARU, origin, youtubeUrl, headers, format)
        const resultConvert = await this.convert(resultVC, origin, youtubeUrl, headers, format)
        const result = await this.checkJob(resultVC, resultConvert, origin, headers, format, identifier)

        const type = userFormat == "audio" ? userFormat : "video"
        return { ...result, identifier, type }
    }
};

const meta = {
  name: "YouTube Downloader",
  desc: "Download YouTube videos and audio in multiple formats",
  method: ['get', 'post'],
  category: "downloader",
  params: [
    {
      name: 'url',
      desc: 'YouTube video URL',
      example: 'https://www.youtube.com/watch?v=k1BFHYtZlAU',
      required: true
    },
    {
      name: 'format',
      desc: 'Download format (audio, 240p, 360p, 480p, 720p, 1080p, best_video)',
      example: '360p',
      required: false,
      options: ["audio", "240p", "360p", "480p", "720p", "1080p", "best_video"]
    }
  ]
};

async function onStart({ req, res }) {
  let url, format = "audio";
  
  if (req.method === 'POST') {
    ({ url, format } = req.body);
  } else {
    ({ url, format } = req.query);
  }

  if (!url) {
    return res.json({
      answer: {
        error: "Missing required parameter: url",
        example: "/downloader/youtube?url=https://www.youtube.com/watch?v=VIDEO_ID&format=360p"
      }
    });
  }

  try {
    const result = await keepv.download(url, format, "api");
    
    return res.json({
      answer: {
        success: true,
        download_url: result.dlurl,
        ready: result.ready === '1',
        type: result.type,
        format: format
      }
    });
    
  } catch (error) {
    return res.json({
      answer: {
        error: error.message || "Failed to download video",
        note: "Make sure the YouTube URL is valid and video is accessible"
      }
    });
  }
}

module.exports = { meta, onStart };