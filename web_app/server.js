const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname);
const port = process.env.PORT || 8081;

const mime = {
  '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg'
};

const server = http.createServer((req, res) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  let file = req.url.split('?')[0];
  if (file === '/') file = '/index.html';
  let filePath = path.join(root, file);

  fs.stat(filePath, (err, stats) => {
    let resolvedPath = filePath;
    if (err) {
      // Check if it's a clean URL without extension
      const ext = path.extname(filePath);
      if (!ext) {
        const htmlPath = filePath + '.html';
        const indexHtmlPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          resolvedPath = indexHtmlPath;
        } else if (fs.existsSync(htmlPath)) {
          resolvedPath = htmlPath;
        } else {
          resolvedPath = path.join(root, 'index.html');
        }
      } else {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
    } else if (stats.isDirectory()) {
      resolvedPath = path.join(filePath, 'index.html');
    }

    console.log(`  -> Resolved: ${resolvedPath}`);
    fs.readFile(resolvedPath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const ext = path.extname(resolvedPath);

      res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
      res.end(data);
    });
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Static web_app serving at http://0.0.0.0:${port}`);
});
