import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it,vi} from 'vitest';

function worker(network:()=>Promise<Response>, quota=false) {
 const listeners: Record<string,(event:unknown)=>void>={};
 const stores=new Map<string,Map<string,Response>>();
 const cacheApi={async keys(){return [...stores.keys()];},async delete(name:string){return stores.delete(name);},async open(name:string){
  if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name)!;
  const path=(key:string|Request)=>typeof key==='string'?key:new URL(key.url).pathname;
  return {async match(key:string|Request){return store.get(path(key))?.clone();},async put(key:string|Request,value:Response){if(quota)throw new Error('Quota');store.set(path(key),value);},async keys(){return [...store.keys()].map(key=>new Request('https://local.test'+key));}};
 }};
 const self={location:{origin:'https://local.test'},addEventListener(name:string,callback:(event:unknown)=>void){listeners[name]=callback;},clients:{claim:vi.fn()},skipWaiting:vi.fn()};
 const source=readFileSync('scripts/service-worker.template.js','utf8').replace('__VERSION__','test').replace('__SHELL__','[]');
 runInNewContext(source,{self,caches:cacheApi,fetch:network,Response,URL});
 return {stores,async request(path:string,mode='cors',cache='no-cache'){
  let result:Promise<Response>|undefined;
  listeners.fetch!({request:{url:'https://local.test'+path,method:'GET',mode,cache,headers:new Headers()},respondWith(value:Promise<Response>){result=value;}});
  return result!;
 }};
}
it('pencarian dan manifest no-cache tetap memakai fallback offline',async()=>{
 const app=worker(async()=>{throw new TypeError('Offline');});
 app.stores.set('fs-shell-test',new Map([['/search-index.json',new Response('[]')],['/offline-manifest.json',new Response('{"version":"cached"}')]]));
 expect(await (await app.request('/search-index.json')).text()).toBe('[]');
 expect(await (await app.request('/offline-manifest.json')).text()).toContain('cached');
});
it('cache penuh tidak menyembunyikan navigasi jaringan yang berhasil',async()=>{
 const app=worker(async()=>{const response=new Response('fresh');Object.defineProperty(response,'type',{value:'basic'});return response;},true);
 expect(await (await app.request('/lesson/','navigate','default')).text()).toBe('fresh');
});
