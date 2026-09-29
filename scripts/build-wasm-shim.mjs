import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
// The browser WASM distribution avoids native child-process pipes during build.
globalThis.self=globalThis;
const wasm=require('esbuild-wasm/lib/browser.js');
await wasm.initialize({wasmModule:await WebAssembly.compile(await readFile(require.resolve('esbuild-wasm/esbuild.wasm'))),worker:false});
export const {transform,build,formatMessages,analyzeMetafile,version,stop,initialize}=wasm;
export default wasm;
