import { mkdir, cp, readFile, writeFile, readdir } from 'node:fs/promises';

// Backwards-compatible Vercel Output API generator.
// The project no longer requires this script for deployment, but keeping it
// functional makes it safe to invoke manually from older CI configurations.
await mkdir('.vercel/output/static', { recursive: true });
await cp('dist', '.vercel/output/static', { recursive: true });

let config = { headers: [] };
try {
  config = JSON.parse(await readFile('dist/_headers.json', 'utf8')) ?? config;
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const headers = Array.isArray(config.headers) ? config.headers : [];
const routes = headers
  .filter((item) => item && typeof item.source === 'string' && Array.isArray(item.headers))
  .map((item) => ({
    src: item.source.replace('/(.*).html', '/(.*)\\.html'),
    headers: Object.fromEntries(
      item.headers
        .filter((header) => header && typeof header.key === 'string')
        .map((header) => [header.key, String(header.value ?? '')]),
    ),
    continue: true,
  }));

async function pages(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = prefix + '/' + entry.name;
    if (entry.isDirectory()) {
      result.push(...await pages(dir + '/' + entry.name, path));
    } else if (entry.name === 'index.html') {
      result.push(path);
    }
  }
  return result;
}

for (const file of await pages('dist')) {
  const path = file.replace(/index\.html$/, '');
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (path !== '/') {
    routes.push({ src: '^' + escaped.slice(0, -1) + '$', headers: { Location: path }, status: 308 });
  }
  routes.push({ src: '^' + escaped + '$', dest: file });
}

routes.push({ handle: 'filesystem' }, { src: '/(.*)', status: 404, dest: '/404.html' });
await writeFile(
  '.vercel/output/config.json',
  JSON.stringify({ version: 3, routes }, null, 2),
);

console.log(`Vercel output generated: ${routes.length} routes.`);
