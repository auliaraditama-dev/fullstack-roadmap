import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { load } from 'cheerio';

const root = 'dist';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result.sort();
}

function routeFor(file) {
  return `/${relative(root, file).split(sep).join('/').replace(/index\.html$/, '')}`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const files = await walk(root);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const routes = new Map(htmlFiles.map((file) => [routeFor(file), file]));
const documents = new Map(await Promise.all(htmlFiles.map(async (file) => [file, load(await readFile(file, 'utf8'))])));
const documentIds = new Map([...documents].map(([file, $]) => [file, new Set($('[id]').toArray().map((element) => $(element).attr('id')))]));
const searchEntries = [];
const brokenLinks = [];
const inlineScriptHashes = new Set();

for (const [path, file] of routes) {
  const $ = documents.get(file);

  for (const node of $('script:not([src])').toArray()) {
    const javascript = $(node).html();
    if (!javascript?.trim()) continue;
    inlineScriptHashes.add(`'sha256-${createHash('sha256').update(javascript).digest('base64')}'`);
  }

  const main = $('main').clone();
  main.find('.page-footer,.reading-controls,.learning-tools,script,style').remove();
  if (!path.startsWith('/sumber/') && !path.includes('404')) {
    searchEntries.push({
      id: path,
      title: $('h1').first().text(),
      url: path,
      part: $('.page-kicker').first().text(),
      type: path.includes('/belajar/') ? 'Materi' : path.includes('/project/') ? 'Project' : path.includes('/quiz/') ? 'Quiz' : 'Referensi',
      text: main.text().replace(/\s+/g, ' ').slice(0, 70000),
    });
  }

  for (const anchor of $('a[href]').toArray()) {
    const href = $(anchor).attr('href');
    if (!href) continue;
    const target = new URL(href, `https://local.test${path}`);
    if (target.origin !== 'https://local.test') continue;
    const pathname = decodeURIComponent(target.pathname);
    if (pathname === '/sitemap.xml' || pathname === '/robots.txt') continue;

    const destination = routes.get(pathname) ?? routes.get(`${pathname}/`);
    if (!destination) {
      try {
        await stat(join(root, pathname));
      } catch {
        brokenLinks.push(`${path} -> ${href}`);
      }
      continue;
    }

    if (!target.hash) continue;
    const targetId = decodeURIComponent(target.hash.slice(1));
    const exists = documentIds.get(destination)?.has(targetId);
    if (!exists) brokenLinks.push(`${path} -> ${href} (anchor)`);
  }
}

if (brokenLinks.length) {
  throw new Error(`Broken links:\n${[...new Set(brokenLinks)].join('\n')}`);
}

await writeFile(join(root, 'search-index.json'), JSON.stringify(searchEntries));

const origin = process.env.SITE_URL;
if (origin) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL harus origin HTTPS tanpa path, query, atau hash.');
  }

  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + [...routes.keys()]
      .filter((route) => !route.includes('404'))
      .map((route) => `<url><loc>${new URL(route, origin).href}</loc></url>`)
      .join('')
    + '</urlset>';
  await writeFile(join(root, 'sitemap.xml'), sitemap);
  await writeFile(join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml', origin)}\n`);
} else {
  await writeFile(join(root, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  await writeFile(join(root, 'sitemap.xml'), '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
}

const catalog = JSON.parse(await readFile('src/data/catalog.json', 'utf8'));
const parts = JSON.parse(await readFile('src/data/parts.json', 'utf8'));

const generatedExcluded = new Set(['/service-worker.js', '/offline-manifest.json', '/_headers.json']);
const distributable = (await walk(root)).filter((file) => !generatedExcluded.has(routeFor(file)));
const objects = [];
for (const file of distributable) {
  const url = routeFor(file);
  const body = await readFile(file);
  objects.push({ url, bytes: body.length, hash: sha256(body) });
}

const version = sha256(JSON.stringify(objects)).slice(0, 16);
const shellRoutes = new Set([
  '/', '/offline/', '/roadmap/', '/belajar/', '/progress/', '/bookmark/', '/notes/',
  '/theme.js', '/search-index.json', '/favicon.svg', '/manifest.webmanifest',
]);
const shell = objects.filter((file) => file.url.startsWith('/_astro/') || shellRoutes.has(file.url) || file.url.startsWith('/icons/'));
const modules = parts.map((part) => ({
  id: part.id,
  title: part.title,
  files: objects.filter((file) => (
    file.url === `/belajar/${part.id}/`
    || catalog.some((chapter) => chapter.part === part.id && chapter.url === file.url)
    || file.url === `/quiz/${part.id}/`
  )),
}));
const used = new Set([...shell, ...modules.flatMap((module) => module.files)].map((file) => file.url));
modules.push({
  id: 'sumber-tambahan',
  title: 'Project, mingguan & referensi sumber',
  files: objects.filter((file) => !used.has(file.url)),
});

if (new Set(modules.map(module => module.id)).size !== modules.length) {
  throw new Error('Build menghasilkan ID modul offline duplikat.');
}

await writeFile(join(root, 'offline-manifest.json'), JSON.stringify({ version, shell, modules }));

const initialRoutes = new Set([
  '/', '/offline/', '/roadmap/', '/belajar/', '/progress/', '/notes/', '/bookmark/',
  '/theme.js', '/favicon.svg', '/manifest.webmanifest',
]);
const initial = objects
  .filter((file) => file.url.startsWith('/_astro/') || initialRoutes.has(file.url) || file.url.startsWith('/icons/'))
  .map((file) => file.url);
const serviceWorker = (await readFile('scripts/service-worker.template.js', 'utf8'))
  .replaceAll('__VERSION__', version)
  .replace('__SHELL__', JSON.stringify(initial));
await writeFile(join(root, 'service-worker.js'), serviceWorker);

const csp = [
  "default-src 'self'",
  `script-src 'self' ${[...inlineScriptHashes].join(' ')}`.trim(),
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
];

const config = {
  version: 3,
  headers: [
    { source: '/(.*)', headers: securityHeaders },
    { source: '/_astro/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/service-worker.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    { source: '/offline-manifest.json', headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }] },
    { source: '/(.*).html', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
  ],
};

await writeFile(join(root, '_headers.json'), JSON.stringify(config));
console.log(`Build audit: ${routes.size} routes, 0 broken links, ${searchEntries.length} search entries; offline ${version}.`);
