import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const failures=[]; const checks=[];
const assert=(condition,message)=>condition?checks.push(message):failures.push(message);
const ignoredDirs=new Set(['node_modules','dist','.git','.astro','.vercel','playwright-report','test-results','.reports','__pycache__']);
async function filesUnder(directory,predicate=()=>true){const entries=await readdir(directory,{withFileTypes:true});const out=[];for(const entry of entries){if(entry.isDirectory()&&ignoredDirs.has(entry.name))continue;const path=join(directory,entry.name);if(entry.isDirectory())out.push(...await filesUnder(path,predicate));else if(predicate(path))out.push(path);}return out;}
async function exists(path){try{await stat(path);return true}catch{return false}}

const packageJson=JSON.parse(await readFile('package.json','utf8'));
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
const lessons=JSON.parse(await readFile('src/data/lessons.json','utf8'));
const catalog=JSON.parse(await readFile('src/data/catalog.json','utf8'));
const parts=JSON.parse(await readFile('src/data/parts.json','utf8'));
const weeks=JSON.parse(await readFile('src/data/weeks.json','utf8'));
const levels=JSON.parse(await readFile('src/data/levels.json','utf8'));
const portalLevels=JSON.parse(await readFile('src/data/portal-levels.json','utf8'));
const explanations=JSON.parse(await readFile('src/data/explanations.json','utf8'));
const pages=JSON.parse(await readFile('src/data/source-pages.json','utf8'));
const sourceLibrary=JSON.parse(await readFile('src/data/source-library.json','utf8'));
const fullstackChapters=JSON.parse(await readFile('src/data/fullstack-chapters.json','utf8'));
const fullstackWeeks=JSON.parse(await readFile('src/data/fullstack-weeks.json','utf8'));
const quizzes=JSON.parse(await readFile('src/data/quizzes.json','utf8'));
const manifest=JSON.parse(await readFile('public/manifest.webmanifest','utf8'));

const expectedRuntime={astro:'7.3.5','@astrojs/vue':'7.0.3',vue:'3.5.43',idb:'8.0.3',zod:'4.6.5'};
for(const [name,version] of Object.entries(expectedRuntime)){assert(packageJson.dependencies?.[name]===version,`${name} terkunci ${version}`);assert(lock.packages?.['']?.dependencies?.[name]===version,`lock sinkron ${name}`)}
assert(packageJson.devDependencies?.typescript==='6.0.3','TypeScript terkunci 6.0.3');
assert(packageJson.engines?.node==='>=24.16 <25','Node 24.16+ dikunci untuk toolchain proyek');

assert(lessons.length===36,'36 sesi utama tersedia');
assert(catalog.length===36,'catalog 36 sesi sinkron');
assert(parts.length===8,'8 bagian kurikulum tersedia');
assert(weeks.length===26,'26 minggu roadmap tersedia');
assert(fullstackWeeks.length===26,'26 minggu data source roadmap tersedia');
assert(fullstackChapters.length===51,'51 bab Full-Stack Developer 2026 tersedia');
assert(explanations.length===36,'36 penjelasan sesi tersedia');
assert(sourceLibrary.length===8,'8 PDF/PPT sumber terintegrasi');
assert(pages.length===895,'895 halaman/slide sumber tersedia');
assert(sourceLibrary.reduce((sum,item)=>sum+item.unitCount,0)===895,'jumlah unit sumber 895 sinkron');
assert(levels.length===12,'Task Tracker 12 milestone tetap tersedia');
assert(portalLevels.length===15,'Portal Gampong project data tetap tersedia');

const sourceIds=new Set(sourceLibrary.map(item=>item.id));
assert(new Set(lessons.map(item=>item.id)).size===36,'ID sesi unik');
assert(new Set(lessons.map(item=>item.url)).size===36,'URL sesi unik');
assert(lessons.every(item=>item.n>=1&&item.n<=36&&item.chapter===item.n&&item.estimatedMinutes===180),'metadata sesi valid');
assert(lessons.every(item=>parts.some(part=>part.id===item.part)),'semua sesi memakai bagian valid');
assert(lessons.every(item=>item.sourceRefs.length>0),'setiap sesi memiliki sumber');
for(const lesson of lessons){for(const ref of lesson.sourceRefs){const src=sourceLibrary.find(item=>item.id===ref.sourceId);assert(Boolean(src),`sourceRef ${lesson.id}:${ref.sourceId} valid`);if(src)assert(ref.start>=1&&ref.end<=src.unitCount&&ref.start<=ref.end,`range sumber ${lesson.id}:${ref.sourceId} valid`);}}
assert(lessons.slice(0,3).every((item)=>item.agenda.length>=11),'Sesi 01–03 mempertahankan agenda PPT rinci');
assert(weeks.every((w)=>Array.isArray(w.lessons)&&w.lessons.length>0&&w.lessons.every((n)=>n>=1&&n<=36)),'setiap minggu tertaut ke sesi valid');
assert(new Set(quizzes.map(item=>item.id)).size===quizzes.length,'ID quiz unik');
assert(quizzes.every(item=>item.questions?.length===3),'setiap quiz memiliki tiga pertanyaan');

for(const src of sourceLibrary){assert(await exists(`public${src.file}`),`berkas sumber ${src.shortTitle} tersedia`);assert(src.unitCount===src.units.length,`unit sumber ${src.id} sinkron`);assert(new Set(src.units.map(u=>u.unit)).size===src.unitCount,`nomor unit ${src.id} unik`);}
assert([...sourceIds].length===8,'source ID lengkap');

const allFiles=await filesUnder('.');
const markdown=allFiles.filter((path)=>path.toLowerCase().endsWith('.md')).map((path)=>relative('.',path).replaceAll('\\','/'));
assert(markdown.length===1&&markdown[0]==='README.md','hanya README.md yang tersisa sebagai Markdown');
assert(!(await exists('docs')),'folder docs lama dihapus');
assert(!(await exists('src/content')),'content Markdown lama dihapus');

const required=['src/components/LucideIcon.astro','src/components/LucideIcon.vue','src/components/AppHeader.astro','src/components/AppSidebar.astro','src/components/TableOfContents.astro','src/lib/icons.ts','src/lib/offline.ts','src/scripts/client.ts','src/scripts/ui-system.ts','src/styles/system.css','scripts/service-worker.template.js','src/data/lessons.json','src/data/source-library.json','src/data/source-pages.json'];
for(const path of required)assert(await exists(path),`${path} tersedia`);
assert(await exists('examples/task-tracker/backend/go.sum'),'Task Tracker Go checksum tersedia');

const uiFiles=[...await filesUnder('src/components',(path)=>/\.(astro|vue)$/.test(path)),...await filesUnder('src/layouts',(path)=>path.endsWith('.astro')),...await filesUnder('src/scripts',(path)=>path.endsWith('.ts')),'src/styles/global.css','src/styles/redesign.css','src/styles/learning.css','src/styles/system.css'];
const forbiddenUiGlyphs=/[☰⌂⌕✓×]/u;
for(const path of uiFiles){const source=await readFile(path,'utf8');assert(!forbiddenUiGlyphs.test(source),`${path} tidak memakai glyph icon`);assert(!/\bv-html\b|\.innerHTML\s*=|\beval\s*\(|new\s+Function\s*\(/.test(source),`${path} bebas sink HTML/eval berisiko tinggi`)}
const sourceFiles=[...await filesUnder('src',(path)=>/\.(astro|vue|ts|js)$/.test(path)),...await filesUnder('scripts',(path)=>/\.(mjs|js)$/.test(path))];
for(const path of sourceFiles){const source=await readFile(path,'utf8');assert(!/https?:\/\/[^\s'"`]+\.(?:js|css)(?:[?"'`]|$)/i.test(source),`${path} tidak memuat runtime CDN JS/CSS`);}

const styleFiles=['src/styles/global.css','src/styles/redesign.css','src/styles/learning.css','src/styles/system.css'];
for(const path of styleFiles){const source=await readFile(path,'utf8');assert(!/gradient/i.test(source),`${path} bebas gradient`);}
const primaryText=JSON.stringify({lessons,catalog,parts});
assert(!/Mulai track fundamental|Peta Belajar dan Cara Kerja Program|orientasi/.test(primaryText),'materi lama tidak lagi menjadi jalur utama');
assert(!/Peta perjalanan 8|26 unit|10 bagian kurikulum/.test(await readFile('src/pages/index.astro','utf8')),'homepage bebas copy lama');

const lessonPage=await readFile('src/pages/belajar/[bagian]/[bab].astro','utf8');
assert(lessonPage.includes('Materi sumber lengkap')&&lessonPage.includes('Agenda sesi')&&lessonPage.includes('Checkpoint'),'halaman sesi lengkap');
assert(!lessonPage.includes('LearningGuide'),'jalur penjelasan lama tidak lagi menjadi struktur utama');
const routePage=await readFile('src/pages/[...route].astro','utf8');
assert(routePage.includes('36 sesi')&&routePage.includes('51 Bab Full-Stack Developer 2026'),'route utama sinkron');
const sidebar=await readFile('src/components/AppSidebar.astro','utf8');
assert(sidebar.includes('36 SESI UTAMA')&&!sidebar.includes('Bab lama'),'sidebar sinkron dengan 36 sesi');
const manifestNames=manifest.icons?.length ?? 0;
assert(typeof manifest.name==='string'&&manifestNames>=2,'manifest PWA valid dasar');

const e2e=await readFile('tests/e2e/learning.spec.ts','utf8');
assert(e2e.includes('/belajar/fondasi/logika-pemrograman-algoritma/'),'E2E memakai Sesi 01');
assert(e2e.includes('36 sesi utama')||e2e.includes('materi-2026'),'E2E mencakup kurikulum utama');

if(failures.length){console.error('STATIC AUDIT FAILED');for(const item of failures)console.error('✗',item);process.exit(1)}
for(const item of checks)console.log('✓',item);
console.log(`Static audit passed: ${checks.length} checks.`);
