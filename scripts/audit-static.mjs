import { access } from 'node:fs/promises';
const forbidden = ['src/data','public/sources','public/downloads','examples'];
for (const path of forbidden) {
  try { await access(path); throw new Error(`Forbidden material directory exists: ${path}`); }
  catch (error) { if (error?.message?.startsWith('Forbidden')) throw error; }
}
console.log('Static audit passed: no bundled learning material.');
