import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, basename, extname, sep } from 'node:path';

const base = resolve('dist');
const port = Number(process.env.PORT || 4321);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

async function loadHeaders() {
  try {
    const config = JSON.parse(await readFile(resolve(base, '_headers.json'), 'utf8'));
    const first = Array.isArray(config?.headers) ? config.headers[0] : null;
    return Array.isArray(first?.headers) ? first.headers : [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = resolve(base, '.' + decodeURIComponent(url.pathname));
    if (path !== base && !path.startsWith(base + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }

    try {
      const info = await stat(path);
      if (info.isDirectory()) path = resolve(path, 'index.html');
    } catch {
      path = resolve(base, '404.html');
      res.statusCode = 404;
    }

    res.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    for (const header of await loadHeaders()) {
      if (header?.key) res.setHeader(header.key, String(header.value ?? ''));
    }
    res.end(await readFile(path));
  } catch {
    res.writeHead(500);
    res.end('Build tidak tersedia. Jalankan npm run build.');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Preview http://127.0.0.1:${port}`);
});
