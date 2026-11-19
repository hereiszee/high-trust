#!/usr/bin/env node
/* Static server that behaves like GitHub Pages for measurement: gzip for compressible types
   (Pages gzips .glb, .hdr, .bin, .js, .json, .html), Cache-Control: max-age=600, ETag + 304.
   node tools/perf/serve.js [port=8001] [root=repo] */
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const port = +(process.argv[2] || 8001), root = path.resolve(process.argv[3] || path.join(__dirname, '..', '..'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.hdr': 'application/octet-stream', '.bin': 'application/octet-stream', '.md': 'text/markdown', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const NOZIP = new Set(['.jpg', '.png', '.webp', '.woff2']);
const gzCache = new Map();
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root)) { res.writeHead(403); return res.end() }
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found') }
    const ext = path.extname(f).toLowerCase(), etag = '"' + st.size.toString(16) + '-' + st.mtimeMs.toString(16) + '"';
    const h = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: etag, 'Access-Control-Allow-Origin': '*' };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, h); return res.end() }
    const zip = !NOZIP.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '');
    if (!zip) { h['Content-Length'] = st.size; res.writeHead(200, h); return fs.createReadStream(f).pipe(res) }
    let gz = gzCache.get(f + etag);
    if (!gz) { gz = zlib.gzipSync(fs.readFileSync(f), { level: 6 }); gzCache.set(f + etag, gz) }
    h['Content-Encoding'] = 'gzip'; h['Content-Length'] = gz.length; res.writeHead(200, h); res.end(gz);
  });
}).listen(port, '127.0.0.1', () => console.log('serving', root, 'on http://127.0.0.1:' + port + '/'));
