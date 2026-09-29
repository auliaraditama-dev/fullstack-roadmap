import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const failures=[];const checks=[];
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
const manifest=JSON.parse(await readFile('public/manifest.webmanifest','utf8'));

const expectedRuntime={astro:'7.3.5','@astrojs/vue':'7.0.3',vue:'3.5.43',idb:'8.0.3',zod:'4.6.5'};
for(const [name,version] of Object.entries(expectedRuntime)){assert(packageJson.dependencies?.[name]===version,`${name} terkunci ${version}`);assert(lock.packages?.['']?.dependencies?.[name]===version,`lock sinkron ${name}`)}
assert(packageJson.devDependencies?.typescript==='6.0.3','TypeScript terkunci 6.0.3');
assert(packageJson.engines?.node==='>=24.16 <25','Node 24.16+ dikunci untuk kompatibilitas toolchain');
assert(!packageJson.devDependencies?.['gray-matter'],'gray-matter tidak lagi diperlukan');

assert(lessons.length===26,'26 unit PDF tersedia');
assert(catalog.length===26,'catalog 26 unit sinkron');
assert(parts.length===10,'10 bagian kurikulum tersedia');
assert(weeks.length===8,'jadwal 8 minggu sesuai PDF');
assert(levels.length===12,'Task Tracker 12 milestone tersedia');
assert(portalLevels.length===15,'Portal Gampong lama tetap tersedia');
assert(pages.length===59,'transkripsi 59 halaman tersedia');
assert(explanations.length===26,'26 penjelasan mudah tersedia');
assert(new Set(explanations.map((item)=>item.id)).size===26,'ID penjelasan mudah unik');
assert(explanations.every((item)=>lessons.some((lesson)=>lesson.id===item.id)),'setiap penjelasan terhubung ke lesson');
assert(explanations.every((item)=>item.summary&&item.mentalModel&&item.why&&item.bridge&&item.steps?.length>=3&&item.mistakes?.length>=2&&item.check?.length>=2),'penjelasan mudah memiliki struktur belajar lengkap');
assert(pages.every((page,index)=>page.page===index+1&&typeof page.text==='string'),'nomor transkripsi halaman 1–59 berurutan');
assert(new Set(catalog.map((item)=>item.id)).size===catalog.length,'ID bab unik');
assert(new Set(catalog.map((item)=>item.url)).size===catalog.length,'URL bab unik');
assert(catalog.every((item)=>parts.some((part)=>part.id===item.part)),'semua bab memakai part valid');
const covered=new Set();for(const lesson of lessons)for(let page=lesson.sourcePages[0];page<=lesson.sourcePages[1];page++)covered.add(page);
assert([...Array(55)].every((_,index)=>covered.has(index+5)),'halaman materi 5–59 seluruhnya terpetakan');
assert(pages.slice(0,4).every((page)=>page.text.length>20),'halaman pengantar 1–4 tersedia di transkripsi');
const pdfPath='public/sources/Belajar_FullStack_Go_Vue_PostgreSQL_Dari_Fundamental_Color_Syntax.pdf';
assert(await exists(pdfPath),'PDF sumber tersedia');
if(await exists(pdfPath)){const pdfHash=createHash('sha256').update(await readFile(pdfPath)).digest('hex');assert(pdfHash==='3068f60060ed5bdc39117c5e557dba6585c882091ed4997d5227e1efb7598933','SHA-256 PDF sumber cocok dengan dokumen pengguna');}
assert(typeof manifest.name==='string'&&Array.isArray(manifest.icons)&&manifest.icons.length>=2,'manifest PWA valid dasar');

const allFiles=await filesUnder('.');
const markdown=allFiles.filter((path)=>path.toLowerCase().endsWith('.md')).map((path)=>relative('.',path).replaceAll('\\','/'));
assert(markdown.length===1&&markdown[0]==='README.md','hanya README.md yang tersisa sebagai Markdown');
assert(!(await exists('docs')),'folder docs lama dihapus');
assert(!(await exists('src/content')),'content Markdown lama dihapus');

const required=['src/components/LearningGuide.astro','src/components/LucideIcon.astro','src/components/LucideIcon.vue','src/components/AppHeader.astro','src/components/AppSidebar.astro','src/components/TableOfContents.astro','src/lib/icons.ts','src/lib/offline.ts','src/scripts/client.ts','src/scripts/ui-system.ts','src/styles/system.css','scripts/service-worker.template.js','src/data/lessons.json','src/data/source-pages.json'];
for(const path of required)assert(await exists(path),`${path} tersedia`);
assert(await exists('examples/task-tracker/backend/go.sum'),'Task Tracker Go checksum tersedia');

const uiFiles=[...await filesUnder('src/components',(path)=>/\.(astro|vue)$/.test(path)),...await filesUnder('src/layouts',(path)=>path.endsWith('.astro')),...await filesUnder('src/scripts',(path)=>path.endsWith('.ts')),'src/styles/global.css','src/styles/redesign.css','src/styles/learning.css','src/styles/system.css'];
const forbiddenUiGlyphs=/[☰⌂⌕✓×]/u;
for(const path of uiFiles){const source=await readFile(path,'utf8');assert(!forbiddenUiGlyphs.test(source),`${path} tidak memakai glyph icon`);assert(!/\bv-html\b|\.innerHTML\s*=|\beval\s*\(|new\s+Function\s*\(/.test(source),`${path} bebas sink HTML/eval berisiko tinggi`)}
const sourceFiles=[...await filesUnder('src',(path)=>/\.(astro|vue|ts|js)$/.test(path)),...await filesUnder('scripts',(path)=>/\.(mjs|js)$/.test(path))];
for(const path of sourceFiles){const source=await readFile(path,'utf8');assert(!/https?:\/\/[^\s'"`]+\.(?:js|css)(?:[?"'`]|$)/i.test(source),`${path} tidak memuat runtime CDN JS/CSS`)}

const primaryText=JSON.stringify({lessons,catalog,weeks,quizzes:JSON.parse(await readFile('src/data/quizzes.json','utf8'))});
assert(!/Laravel|\bPHP\b/.test(primaryText),'materi utama bebas stack lama PHP/Laravel');
const redesign=await readFile('src/styles/redesign.css','utf8');
assert(redesign.includes('@media (max-width:380px)')&&redesign.includes('@media (max-width:680px)')&&redesign.includes('@media (max-width:980px)'),'breakpoint all-device tersedia');
assert(redesign.includes('@media (prefers-reduced-motion:reduce)'),'reduced motion dihormati');
const layout=await readFile('src/layouts/Layout.astro','utf8');
assert(layout.includes('aria-label="Navigasi cepat"')&&layout.includes('id="dock-search"'),'mobile dock dan search tersedia');
const lessonPage=await readFile('src/pages/belajar/[bagian]/[bab].astro','utf8');
assert(lessonPage.includes('LearningGuide')&&lessonPage.includes('penjelasan-mudah'),'lesson memakai lapisan penjelasan mudah');
const e2e=await readFile('tests/e2e/learning.spec.ts','utf8');
assert(e2e.includes('Mulai Bab 1')&&!e2e.includes('Mulai dari awal'),'E2E homepage sinkron dengan CTA saat ini');
assert(e2e.includes('lesson responsive 320px')||e2e.includes('for (const width of [320'),'E2E mencakup viewport mobile kecil');
const learningCss=await readFile('src/styles/learning.css','utf8');
assert(learningCss.includes('@media (max-width:480px)')&&learningCss.includes('@media (max-width:820px)'),'learning guide responsif mobile/tablet');
const taskHTTP=await readFile('examples/task-tracker/backend/cmd/api/http.go','utf8');
const taskMain=await readFile('examples/task-tracker/backend/cmd/api/main.go','utf8');
const taskFrontend=await readFile('examples/task-tracker/frontend/src/App.vue','utf8');
assert(taskHTTP.includes('DisallowUnknownFields')&&taskHTTP.includes('MaxBytesReader'),'Task Tracker membatasi dan memvalidasi JSON');
assert(taskHTTP.includes('utf8.RuneCountInString'),'Task Tracker memvalidasi panjang judul per karakter');
assert(taskMain.includes('signal.NotifyContext')&&taskMain.includes('server.Shutdown'),'Task Tracker memiliki graceful shutdown');
const taskHandlers=await readFile('examples/task-tracker/backend/cmd/api/tasks.go','utf8');
assert(taskHandlers.includes('a.db.Ping(ctx)')&&taskHandlers.includes('StatusServiceUnavailable'),'health check Task Tracker memverifikasi database');
assert(taskMain.includes('APP_ENV')&&taskMain.includes('DATABASE_URL wajib diisi'),'Task Tracker fail-fast konfigurasi production');
assert(taskFrontend.includes('import.meta.env.VITE_API_URL'),'Task Tracker frontend mendukung API URL environment');
const clientScript=await readFile('src/scripts/client.ts','utf8');
assert(clientScript.includes('pre:not(.pdf-page-text):not(.source-page)'),'toolbar kode tidak salah menandai transkripsi PDF sebagai kode');

const systemCss=await readFile('src/styles/system.css','utf8');
const uiSystem=await readFile('src/scripts/ui-system.ts','utf8');
assert(layout.includes("import '../styles/system.css';"),'layout memuat universal UI system setelah stylesheet lama');
assert(clientScript.includes("import './ui-system';"),'client memuat universal interaction system');
assert(systemCss.includes('::-webkit-scrollbar')&&systemCss.includes('scrollbar-color'),'custom scrollbar memiliki WebKit dan standards fallback');
assert(systemCss.includes('.ui-select__menu')&&systemCss.includes('.ui-select__option'),'custom dropdown/select memiliki panel dan option states');
assert(systemCss.includes('input[type=checkbox]')&&systemCss.includes('input[type=radio]'),'checkbox dan radio memakai visual system universal');
assert(systemCss.includes('--code:#f7f9ff')&&systemCss.includes('--code:#0b1020'),'light/dark memiliki surface kode terpisah dan kontras');
assert(systemCss.includes(':root[data-theme=light] .astro-code')&&systemCss.includes('var(--shiki-light'),'syntax highlighting light mode dipaksa memakai token Shiki light');
assert(systemCss.includes(':root[data-theme=dark] .astro-code')&&systemCss.includes('var(--shiki-dark'),'syntax highlighting dark mode memakai token Shiki dark');
assert(systemCss.includes('.roadmap-tone-6')&&systemCss.includes('.feature-card--offline'),'visual system colorful mencakup roadmap dan feature board');
assert(uiSystem.includes("setAttribute('role', 'listbox')")&&uiSystem.includes("setAttribute('role', 'option')"),'custom select mempertahankan semantic listbox/option');
assert(uiSystem.includes("event.key === 'Escape'")&&uiSystem.includes("event.key === 'ArrowDown'")&&uiSystem.includes("event.key === 'ArrowUp'"),'dropdown mendukung Escape dan keyboard navigation');
assert(uiSystem.includes('availableBelow')&&uiSystem.includes('availableAbove'),'dropdown memposisikan panel berdasarkan viewport');
assert(packageJson.scripts?.check?.includes('validate:content'),'quality gate memvalidasi konten sebelum build');

if(failures.length){console.error(`Static audit gagal (${failures.length}):`);for(const failure of failures)console.error(`- ${failure}`);process.exitCode=1}else console.log(`Static audit lulus: ${checks.length} pemeriksaan.`);
