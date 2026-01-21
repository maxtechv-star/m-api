const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const meta = {
  name: 'ToFigure',
  desc: 'Generate AI avatars/figures from images using PicJourney AI',
  method: ['post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'Image file to process (supports jpg, png, jpeg)',
      example: 'example.jpg',
      required: true
    },
    {
      name: 'packId',
      desc: 'Avatar pack/style ID (default: 68c2cef4beee35e738a801db)',
      example: '68c2cef4beee35e738a801db',
      required: false
    }
  ]
};

const AUTH_TOKEN = "68Gi7PI7gvkx8vovvzSfo1GW8QkqZHQWlfrIme5qA6lHCyVrlfJvm7ojZfrGKSHwDmU4HlklwYqaH8F/QaerlDgIJF3sC+qv4pUWcPIgql3yZgStWVeTNhl8kQq8TXDB3d18uyah1Y8E0JOpznCe3fxqv4y23AmUJyZq9uML/WjDyI5cYUFi9HdKsANOQSqim9uaEPqfUl/7yEE/HwnhP0Pmv0SxFu8r4tFx71ERCM2LGtpIGh8EGYknQjMEsXBFIgyFGnxKpQ/a7XUt5z26l1RYGRma03godmcPgIW0tquaSKQ5DeRBfvW+xKvM0F7XutE7TsQ7EJ3HvD0GNYQcb06Ft33jQZFAsqM5Gc/hI70yrzF9e6BaMjjetYfWoD1S";

async function toFigure(imageBuffer, filename, packId = "68c2cef4beee35e738a801db") {
  try {
    // Save buffer to temp file
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `${uuidv4()}_${filename}`);
    fs.writeFileSync(tempFilePath, imageBuffer);
    
    // Upload image
    const form = new FormData();
    form.append("image", fs.createReadStream(tempFilePath), {
      filename: filename,
      contentType: "image/*"
    });

    const uploadRes = await axios.post("http://43.230.202.197:3033/upload", form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${AUTH_TOKEN}`,
        appName: "picjourney",
        appVersionCode: "18"
      }
    });

    const { url } = uploadRes.data;
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    // Generate figure
    const startfigure = await axios.post(
      "https://api.magicaigallery.com/v2/aiApi/faceSwap",
      {
        packId: packId,
        image_url: url
      },
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          appName: "picjourney",
          appVersionCode: "18",
          "Content-Type": "application/json; charset=UTF-8"
        }
      }
    );

    return {
      originalImage: url,
      generatedImage: startfigure.data.data.fileUrl,
      packId: packId,
      success: true
    };
    
  } catch (err) {
    console.error("ToFigure error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.message || "Failed to generate figure");
  }
}

async function onStart({ req, res }) {
  // Check if it's multipart/form-data for file upload
  if (!req.is('multipart/form-data') && !req.is('application/x-www-form-urlencoded')) {
    return res.status(400).json({
      error: "Request must be multipart/form-data for file upload"
    });
  }
  
  // For multipart, we need to use middleware like multer
  // Since your system doesn't have multer, let's handle base64 or URL input
  const { image, packId = "68c2cef4beee35e738a801db" } = req.body;
  
  if (!image) {
    return res.status(400).json({
      error: "Missing required parameter: image"
    });
  }
  
  try {
    let imageBuffer;
    let filename;
    
    // Check if image is base64
    if (image.startsWith('data:image/')) {
      const matches = image.match(/^data:image\/(\w+);base64,/);
      if (!matches) {
        return res.status(400).json({
          error: "Invalid base64 image format"
        });
      }
      
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
      filename = `image_${Date.now()}.${matches[1]}`;
      
    } else if (image.startsWith('http://') || image.startsWith('https://')) {
      // Download image from URL
      const response = await axios.get(image, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(response.data);
      
      // Extract filename from URL or use default
      const urlPath = new URL(image).pathname;
      filename = path.basename(urlPath) || `image_${Date.now()}.jpg`;
      
    } else {
      return res.status(400).json({
        error: "Image must be either base64 data URL or HTTP/HTTPS URL"
      });
    }
    
    // Validate image size (max 5MB)
    if (imageBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: "Image too large. Maximum size is 5MB"
      });
    }
    
    const result = await toFigure(imageBuffer, filename, packId);
    
    return res.json({
      success: true,
      data: result
    });
    
  } catch (err) {
    console.error('ToFigure API error:', err);
    return res.status(500).json({
      error: err.message || "Failed to generate AI figure"
    });
  }
}

module.exports = { meta, onStart, toFigure };