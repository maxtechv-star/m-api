const ling = require("@metaload/meta-canvas");

module.exports = {
  meta: {
    name: 'welcome-goodbye',
    desc: 'Generate welcome and goodbye images - Returns image as data URL',
    category: 'canvas',
    method: ['GET', 'POST'],
    params: [
      {
        name: 'type',
        desc: 'Type of image: welcome or goodbye',
        example: 'welcome',
        required: true,
        options: ['welcome', 'goodbye']
      },
      {
        name: 'username',
        desc: 'Username of the member',
        example: 'John Doe',
        required: true
      },
      {
        name: 'guildname',
        desc: 'Community/server name',
        example: 'Meta API Community',
        required: true
      },
      {
        name: 'guildicon',
        desc: 'Server icon URL',
        example: 'https://example.com/icon.png',
        required: true
      },
      {
        name: 'membercount',
        desc: 'Total member count',
        example: '1000',
        required: true
      },
      {
        name: 'avatar',
        desc: 'User avatar URL',
        example: 'https://example.com/avatar.jpg',
        required: true
      },
      {
        name: 'background',
        desc: 'Background image URL',
        example: 'https://example.com/bg.jpg',
        required: true
      }
    ]
  },

  async onStart({ req, res }) {
    try {
      const { type, username, guildname, guildicon, membercount, avatar, background } = 
            req.method === 'GET' ? req.query : req.body;

      // Validate required parameters
      if (!type || (type !== 'welcome' && type !== 'goodbye')) {
        return res.json({
          status: false,
          message: "Parameter 'type' must be 'welcome' or 'goodbye'"
        });
      }

      const required = ['username', 'guildname', 'guildicon', 'membercount', 'avatar', 'background'];
      for (const param of required) {
        if (!eval(param)) {
          return res.json({
            status: false,
            message: `Parameter '${param}' is required`
          });
        }
      }

      // Generate image based on type
      let image;
      if (type === 'welcome') {
        image = await new ling.Welcome()
          .setUsername(username)
          .setGuildName(guildname)
          .setGuildIcon(guildicon)
          .setMemberCount(membercount)
          .setAvatar(avatar)
          .setBackground(background)
          .toAttachment();
      } else {
        image = await new ling.Goodbye()
          .setUsername(username)
          .setGuildName(guildname)
          .setGuildIcon(guildicon)
          .setMemberCount(membercount)
          .setAvatar(avatar)
          .setBackground(background)
          .toAttachment();
      }

      // Convert to buffer then to data URL
      const buffer = image.toBuffer();
      const base64Image = buffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;
      
      // Return JSON with data URL that can be displayed directly
      res.json({
        status: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} image generated successfully`,
        image_type: type,
        image_url: dataUrl, // This can be used in <img src="...">
        data: {
          username: username,
          guild: guildname,
          member_count: membercount,
          dimensions: "1024x450",
          format: "png",
          size_bytes: buffer.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      res.json({
        status: false,
        message: error.message || 'Failed to generate image'
      });
    }
  }
};
