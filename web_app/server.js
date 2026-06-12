const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname);
const port = process.env.PORT || 8081;

const mime = {
  '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg'
};

const server = http.createServer((req, res) => {
  let file = req.url.split('?')[0];
  if (file === '/') file = '/index.html';
  const filePath = path.join(root, file);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Static web_app serving at http://0.0.0.0:${port}`);
});
