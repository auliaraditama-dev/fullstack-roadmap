import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){
 if(specifier==='esbuild')return {url:new URL('./build-wasm-shim.mjs',import.meta.url).href,shortCircuit:true};
 return next(specifier,context);
}});
