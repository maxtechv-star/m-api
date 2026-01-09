const ling = require("@metaload/meta-canvas");

module.exports = {
  meta: {
    name: 'welcome-goodbye',
    desc: 'Generate welcome and goodbye images - Direct PNG response',
    category: 'canvas',
    method: ['GET'],
    params: [
      {
        name: 'type',
        desc: 'Type: welcome or goodbye',
        example: 'welcome',
        required: true,
        options: ['welcome', 'goodbye']
      },
      {
        name: 'username',
        desc: 'Username',
        example: 'John Doe',
        required: true
      },
      {
        name: 'guildname',
        desc: 'Server name',
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
        desc: 'Member count',
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
        desc: 'Background URL',
        example: 'https://example.com/bg.jpg',
        required: true
      }
    ]
  },

  async onStart({ req, res }) {
    try {
      const { type, username, guildname, guildicon, membercount, avatar, background } = req.query;

      // If no parameters, show instructions
      if (!type) {
        return res.json({
          status: false,
          message: 'Add parameters to generate image',
          example: '/canvas/welcome-goodbye?type=welcome&username=John&guildname=MyServer&guildicon=https://...&membercount=1000&avatar=https://...&background=https://...'
        });
      }

      // Validate
      if (type !== 'welcome' && type !== 'goodbye') {
        return res.json({
          status: false,
          message: "Type must be 'welcome' or 'goodbye'"
        });
      }

      const required = ['username', 'guildname', 'guildicon', 'membercount', 'avatar', 'background'];
      for (const param of required) {
        if (!req.query[param]) {
          return res.json({
            status: false,
            message: `Missing parameter: ${param}`
          });
        }
      }

      // Generate image
      let image;
      if (type === 'welcome') {
        image = await new ling.Welcome()
          .setUsername(username)
          .setGuildName(guildname)
          .setGuildIcon(guildicon)
          .setMemberCount(membercount)
          .setAvatar(avatar)
          .setBackground(background);
      } else {
        image = await new ling.Goodbye()
          .setUsername(username)
          .setGuildName(guildname)
          .setGuildIcon(guildicon)
          .setMemberCount(membercount)
          .setAvatar(avatar)
          .setBackground(background);
      }

      // Convert to attachment and send as PNG
      const buffer = await image.toAttachment();
      
      // Return PNG directly - browser will display it
      res.type('image/png').send(buffer);

    } catch (error) {
      // If error, return JSON
      res.json({
        status: false,
        message: error.message || 'Failed to generate image'
      });
    }
  }
};
