import { readFile, stat } from 'node:fs/promises';

const readJson=async(path)=>JSON.parse(await readFile(path,'utf8'));
const lessons=await readJson('src/data/lessons.json');
const catalog=await readJson('src/data/catalog.json');
const parts=await readJson('src/data/parts.json');
const weeks=await readJson('src/data/weeks.json');
const sources=await readJson('src/data/source-library.json');
const pages=await readJson('src/data/source-pages.json');
const chapters=await readJson('src/data/fullstack-chapters.json');
const bookDetails=await readJson('src/data/book-chapter-details.json');
const quizzes=await readJson('src/data/quizzes.json');

const fail=(message)=>{throw new Error(message)};
if(lessons.length!==36)fail(`Harus ada 36 sesi, ditemukan ${lessons.length}.`);
if(catalog.length!==36)fail(`Catalog harus 36 sesi, ditemukan ${catalog.length}.`);
if(parts.length!==8)fail(`Harus ada 8 bagian, ditemukan ${parts.length}.`);
if(weeks.length!==26)fail(`Harus ada 26 minggu, ditemukan ${weeks.length}.`);
if(chapters.length!==51||bookDetails.length!==51)fail('Data 51 bab Full-Stack Developer 2026 tidak lengkap.');
if(sources.length!==8)fail(`Harus ada 8 sumber PDF/PPT, ditemukan ${sources.length}.`);
if(pages.length!==895)fail(`Harus ada 895 unit halaman/slide, ditemukan ${pages.length}.`);
if(sources.reduce((sum,source)=>sum+source.unitCount,0)!==895)fail('Jumlah unit sumber tidak cocok 895.');

const sourceById=new Map(sources.map(source=>[source.id,source]));
for(const source of sources){
  if(source.units.length!==source.unitCount)fail(`Unit source ${source.id} tidak sinkron.`);
  await stat(`public${source.file}`);
  for(const unit of source.units){
    if(!unit.unit||typeof unit.text!=='string')fail(`Unit invalid pada ${source.id}.`);
  }
}
for(let i=0;i<lessons.length;i++){
 const session=lessons[i];
 if(session.n!==i+1||session.id!==`sesi-${String(i+1).padStart(2,'0')}`)fail(`Urutan sesi salah di index ${i}.`);
 if(!session.url.startsWith('/belajar/'))fail(`URL sesi ${session.id} invalid.`);
 if(session.estimatedMinutes!==180)fail(`Durasi sesi ${session.id} bukan 180 menit.`);
 if(!Array.isArray(session.agenda)||session.agenda.reduce((sum,item)=>sum+item.minutes,0)!==180)fail(`Agenda ${session.id} tidak berjumlah 180 menit.`);
 if(!session.objectives?.length||!session.practice?.length||!session.checkpoint?.length)fail(`Sesi ${session.id} kehilangan materi latihan/checkpoint.`);
 for(const ref of session.sourceRefs){
  const source=sourceById.get(ref.sourceId);
  if(!source)fail(`SourceRef ${session.id} menunjuk ${ref.sourceId} yang tidak ada.`);
  if(ref.start<1||ref.end>source.unitCount||ref.start>ref.end)fail(`Range ${session.id}/${ref.sourceId} invalid.`);
 }
}
if(new Set(lessons.map(item=>item.url)).size!==36)fail('URL sesi duplikat.');
if(!quizzes.every(item=>item.questions?.length===3))fail('Format quiz tidak konsisten.');
console.log(`Content validation passed: 36 sessions, 8 sources, 895 units, 51 book chapters, 26 weeks.`);
