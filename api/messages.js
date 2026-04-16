const https = require('https');

module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } });
    return;
  }

  const apiKey = req.headers['x-api-key'] || '';
  const bodyStr = JSON.stringify(req.body);

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(bodyStr),
    },
  };

  const proxy = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => { data += chunk; });
    apiRes.on('end', () => {
      res.status(apiRes.statusCode).setHeader('Content-Type', 'application/json').end(data);
    });
  });

  proxy.on('error', (err) => {
    res.status(502).json({ error: { message: 'Proxy error: ' + err.message } });
  });

  proxy.write(bodyStr);
  proxy.end();
};
