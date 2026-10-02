import { stat } from 'node:fs/promises';
for (const path of ['src/pages/index.astro','src/pages/[...route].astro','src/layouts/Layout.astro']) await stat(path);
console.log('Template validation passed: empty content workspace.');
