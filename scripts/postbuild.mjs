import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { load } from 'cheerio';

const root='dist';
async function walk(directory){const entries=await readdir(directory,{withFileTypes:true});const out=[];for(const entry of entries){const path=join(directory,entry.name);if(entry.isDirectory())out.push(...await walk(path));else out.push(path)}return out.sort();}
function routeFor(file){return `/${relative(root,file).split(sep).join('/').replace(/index\.html$/,'')}`;}
const files=await walk(root);
const html=files.filter(f=>f.endsWith('.html'));
const routes=new Map(html.map(f=>[routeFor(f),f]));
const docs=new Map(await Promise.all(html.map(async f=>[f,load(await readFile(f,'utf8'))])));
const ids=new Map([...docs].map(([f,$])=>[f,new Set($('[id]').toArray().map(e=>$(e).attr('id')))]));
const search=[];
const broken=[];
for(const [path,file] of routes){
  const $=docs.get(file);
  const main=$('main').clone();
  main.find('.page-footer,.reading-controls,.learning-tools,script,style').remove();
  search.push({id:path,title:$('h1').first().text()||'Workspace',url:path,part:$('.page-kicker').first().text()||'Workspace',type:'Page',text:main.text().replace(/\s+/g,' ').slice(0,70000)});
  for(const a of $('a[href]').toArray()){
    const href=$(a).attr('href'); if(!href) continue;
    const u=new URL(href,`https://local.test${path}`); if(u.origin!=='https://local.test') continue;
    const pathname=decodeURIComponent(u.pathname);
    if(['/sitemap.xml','/robots.txt'].includes(pathname)) continue;
    const dest=routes.get(pathname)||routes.get(`${pathname}/`);
    if(!dest){try{await stat(join(root,pathname))}catch{broken.push(`${path} -> ${href}`)};continue;}
    if(u.hash&&!ids.get(dest)?.has(decodeURIComponent(u.hash.slice(1)))) broken.push(`${path} -> ${href} (anchor)`);
  }
}
if(broken.length) throw new Error(`Broken links:\n${[...new Set(broken)].join('\n')}`);
await writeFile(join(root,'search-index.json'),JSON.stringify(search));
const objects=[];
for(const file of await walk(root)){const url=routeFor(file);const body=await readFile(file);objects.push({url,bytes:body.length,hash:createHash('sha256').update(body).digest('hex')});}
const version=createHash('sha256').update(JSON.stringify(objects)).digest('hex').slice(0,16);
const shell=objects.filter(f=>f.url.startsWith('/_astro/')||f.url.startsWith('/icons/')||['/','/offline/','/progress/','/notes/','/bookmark/','/search-index.json','/theme.js','/favicon.svg','/manifest.webmanifest'].includes(f.url));
const moduleFiles=objects.filter(f=>!shell.some(s=>s.url===f.url)&&!['/offline-manifest.json','/robots.txt','/sitemap.xml'].includes(f.url));
await writeFile(join(root,'offline-manifest.json'),JSON.stringify({version,shell,modules:[{id:'workspace',title:'Workspace application',files:moduleFiles}]}));
await writeFile(join(root,'robots.txt'),'User-agent: *\nAllow: /\n');
const origin=process.env.SITE_URL;
const sitemap=[...routes.keys()].filter(r=>!r.includes('404')).map(r=>`<url><loc>${origin?new URL(r,origin).href:r}</loc></url>`).join('');
await writeFile(join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap}</urlset>`);
console.log(`Postbuild passed: ${routes.size} pages, empty-content search index, offline shell.`);
