const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT) || 4173;
const indexPath = path.join(__dirname, 'index.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html' || req.url.startsWith('/?')) {
    const data = fs.readFileSync(indexPath);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Fernhollow preview running at http://127.0.0.1:${port}/`);
});
