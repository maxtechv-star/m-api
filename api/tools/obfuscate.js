const axios = require('axios');

module.exports = {
  meta: {
    name: 'obfuscate',
    desc: 'Obfuscate JavaScript code using PreEmptive protection',
    category: 'tools',
    method: ['POST'],
    params: [
      {
        name: 'code',
        desc: 'JavaScript code to obfuscate',
        example: 'function hello() { console.log("Hello World"); }',
        required: true
      }
    ]
  },

  async onStart({ req, res }) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.json({
          status: false,
          message: 'JavaScript code is required'
        });
      }

      // Validate it's not empty
      if (typeof code !== 'string' || code.trim().length === 0) {
        return res.json({
          status: false,
          message: 'Code cannot be empty'
        });
      }

      // Prepare payload
      const payload = {
        sourceFile: {
          name: "script.js",
          source: code
        },
        protectionConfiguration: {
          settings: {
            booleanLiterals: { randomize: true },
            integerLiterals: { radix: "none", randomize: true, lower: null, upper: null },
            debuggerRemoval: true,
            stringLiterals: true,
            propertyIndirection: true,
            localDeclarations: { nameMangling: "base52" },
            controlFlow: { randomize: true },
            constantArgument: true,
            domainLock: false,
            functionReorder: { randomize: true },
            propertySparsing: true,
            variableGrouping: true
          }
        }
      };

      // Call obfuscation API
      const response = await axios.post(
        'https://jsd-online-demo.preemptive.com/api/protect',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://jsd-online-demo.preemptive.com',
            'Referer': 'https://jsd-online-demo.preemptive.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      if (!response.data || !response.data.protectedCode) {
        throw new Error('Invalid response from obfuscation service');
      }

      // Return obfuscated code
      res.json({
        status: true,
        data: {
          original_length: code.length,
          obfuscated_length: response.data.protectedCode.length,
          ratio: Math.round((response.data.protectedCode.length / code.length) * 100) + '%',
          obfuscated_code: response.data.protectedCode
        }
      });

    } catch (error) {
      res.json({
        status: false,
        message: error.response?.data?.message || error.message || 'Failed to obfuscate code'
      });
    }
  }
};
