import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4321';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(join(dir, e.name)) : join(dir, e.name)))).flat();
}
const files = (await walk('dist')).filter(p => p.endsWith('.html'));
for (const file of files) {
  const path = '/' + relative('dist',file).split(sep).join('/').replace(/index\.html$/, '');
  const res = await fetch(base + path);
  assert.equal(res.status, 200, path);
  assert.match(await res.text(), /<main[\s>]/, path);
}
assert.equal((await fetch(base + '/missing-audit-page/')).status, 404);
const index = await fetch(base + '/search-index.json');
assert.equal(index.status, 200);
assert.ok((await index.json()).length >= 26);
console.log('HTTP smoke passed: ' + files.length + ' pages and search index.');

const manifestResponse = await fetch(base + '/offline-manifest.json');
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.equal(new Set(manifest.modules.map(m => m.id)).size, manifest.modules.length);
console.log('Offline manifest: ' + manifest.modules.length + ' unique modules.');
