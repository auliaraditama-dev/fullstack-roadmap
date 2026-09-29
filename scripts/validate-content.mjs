import { readFile } from 'node:fs/promises';

const readJSON=async(path)=>JSON.parse(await readFile(path,'utf8'));
const lessons=await readJSON('src/data/lessons.json');
const catalog=await readJSON('src/data/catalog.json');
const parts=await readJSON('src/data/parts.json');
const weeks=await readJSON('src/data/weeks.json');
const pages=await readJSON('src/data/source-pages.json');
const quizzes=await readJSON('src/data/quizzes.json');
const explanations=await readJSON('src/data/explanations.json');
const sourceLibrary=await readJSON('src/data/source-library.json');
const fullstackChapters=await readJSON('src/data/fullstack-chapters.json');
const fullstackWeeks=await readJSON('src/data/fullstack-weeks.json');
const fail=(message)=>{throw new Error(message)};
const nonEmpty=(value)=>typeof value==='string'&&value.trim().length>0;
const stringArray=(value,{min=0,max=Infinity}={})=>Array.isArray(value)&&value.length>=min&&value.length<=max&&value.every(nonEmpty);
const exactKeys=(object,keys)=>object&&typeof object==='object'&&!Array.isArray(object)&&Object.keys(object).sort().join('|')===[...keys].sort().join('|');

if(!Array.isArray(lessons)||lessons.length!==26)fail(`Kurikulum PDF harus 26 unit, ditemukan ${Array.isArray(lessons)?lessons.length:'bukan array'}`);
const lessonKeys=['id','chapter','label','part','partTitle','title','description','estimatedMinutes','difficulty','objectives','practice','sourcePages','sourceText','slug','url','offlineEligible','tags','prerequisites','updatedAt','version','sourceDocument'];
for(const lesson of lessons){
  if(!exactKeys(lesson,lessonKeys))fail(`Field lesson tidak sesuai: ${lesson?.id??'unknown'}`);
  if(!nonEmpty(lesson.id)||!Number.isInteger(lesson.chapter)||lesson.chapter<1||!nonEmpty(lesson.label)||!nonEmpty(lesson.part)||!nonEmpty(lesson.partTitle)||!nonEmpty(lesson.title)||!nonEmpty(lesson.description))fail(`Metadata lesson invalid: ${lesson?.id??'unknown'}`);
  if(typeof lesson.estimatedMinutes!=='number'||lesson.estimatedMinutes<=0||!['dasar','menengah','lanjutan'].includes(lesson.difficulty))fail(`Estimasi/difficulty invalid: ${lesson.id}`);
  if(!stringArray(lesson.objectives,{min:1})||!stringArray(lesson.practice,{min:1})||!Array.isArray(lesson.sourcePages)||lesson.sourcePages.length!==2||!lesson.sourcePages.every(Number.isInteger))fail(`Objective/practice/pages invalid: ${lesson.id}`);
  if(!nonEmpty(lesson.sourceText)||!nonEmpty(lesson.slug)||!lesson.url.startsWith('/belajar/')||typeof lesson.offlineEligible!=='boolean'||!Array.isArray(lesson.tags)||!Array.isArray(lesson.prerequisites)||!nonEmpty(lesson.updatedAt)||!nonEmpty(lesson.version)||!nonEmpty(lesson.sourceDocument))fail(`Konten lesson invalid: ${lesson.id}`);
}

if(!Array.isArray(explanations)||explanations.length!==lessons.length)fail('Setiap unit wajib memiliki penjelasan mudah');
const explanationKeys=['id','summary','mentalModel','why','steps','mistakes','check','bridge'];
for(const explanation of explanations){
  if(!exactKeys(explanation,explanationKeys)||!nonEmpty(explanation.id)||!nonEmpty(explanation.summary)||!nonEmpty(explanation.mentalModel)||!nonEmpty(explanation.why)||!nonEmpty(explanation.bridge))fail(`Penjelasan mudah invalid: ${explanation?.id??'unknown'}`);
  if(!lessons.some((lesson)=>lesson.id===explanation.id))fail(`Penjelasan tidak memiliki lesson: ${explanation.id}`);
  if(!stringArray(explanation.steps,{min:3,max:10})||!stringArray(explanation.mistakes,{min:2,max:8})||!stringArray(explanation.check,{min:2,max:6}))fail(`Struktur penjelasan invalid: ${explanation.id}`);
}
if(new Set(explanations.map((item)=>item.id)).size!==explanations.length)fail('ID penjelasan duplikat');

if(!Array.isArray(pages)||pages.length!==59)fail(`Transkripsi PDF harus 59 halaman, ditemukan ${Array.isArray(pages)?pages.length:'bukan array'}`);
for(let i=0;i<pages.length;i++)if(pages[i]?.page!==i+1||typeof pages[i]?.text!=='string')fail(`Halaman sumber invalid: ${i+1}`);
if(new Set(lessons.map((item)=>item.id)).size!==lessons.length)fail('ID lesson duplikat');
if(new Set(lessons.map((item)=>item.url)).size!==lessons.length)fail('URL lesson duplikat');
for(const lesson of lessons){
  if(!parts.some((part)=>part.id===lesson.part))fail(`Part tidak valid: ${lesson.part}`);
  if(lesson.sourcePages[0]>lesson.sourcePages[1]||lesson.sourcePages[0]<1||lesson.sourcePages[1]>pages.length)fail(`Range sumber invalid: ${lesson.id}`);
  for(const prerequisite of lesson.prerequisites)if(!lessons.some((item)=>item.id===prerequisite))fail(`Prerequisite invalid: ${prerequisite}`);
}
if(!Array.isArray(catalog)||catalog.length!==lessons.length)fail('Catalog tidak sinkron dengan lessons');
if(!Array.isArray(parts)||parts.length!==10)fail('Kurikulum aplikasi harus 10 bagian');
if(!Array.isArray(weeks)||weeks.length!==8)fail('Jadwal PDF harus 8 minggu');
if(!Array.isArray(quizzes)||quizzes.length!==parts.length)fail('Setiap part wajib memiliki quiz');
for(const quiz of quizzes){
  if(!exactKeys(quiz,['id','title','questions'])||!nonEmpty(quiz.id)||!nonEmpty(quiz.title)||!Array.isArray(quiz.questions)||quiz.questions.length<3)fail(`Quiz invalid: ${quiz?.id??'unknown'}`);
  if(!parts.some((part)=>part.id===quiz.id))fail(`Quiz part invalid: ${quiz.id}`);
  for(const q of quiz.questions){
    if(!exactKeys(q,['id','question','options','answer','explanations','url'])||!nonEmpty(q.id)||!nonEmpty(q.question)||!stringArray(q.options,{min:2,max:10})||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||!stringArray(q.explanations,{min:q.options.length,max:q.options.length})||new Set(q.options).size!==q.options.length||!nonEmpty(q.url))fail(`Pertanyaan quiz invalid: ${q?.id??'unknown'}`);
    if(!catalog.some((item)=>item.url===q.url))fail(`Quiz URL invalid: ${q.url}`);
  }
}
const covered=new Set();
for(const lesson of lessons)for(let page=lesson.sourcePages[0];page<=lesson.sourcePages[1];page++)covered.add(page);
for(let page=5;page<=59;page++)if(!covered.has(page))fail(`Halaman PDF belum terpetakan: ${page}`);
if(!Array.isArray(sourceLibrary)||sourceLibrary.length!==3)fail('Library sumber harus memuat 3 PDF');
if(sourceLibrary.reduce((sum,item)=>sum+item.pageCount,0)!==186)fail('Total sumber harus 186 halaman');
for(const source of sourceLibrary){
  if(!nonEmpty(source.id)||!nonEmpty(source.title)||!nonEmpty(source.file)||!Array.isArray(source.pages)||source.pages.length!==source.pageCount)fail(`Sumber PDF invalid: ${source?.id??'unknown'}`);
  for(let i=0;i<source.pages.length;i++)if(source.pages[i]?.page!==i+1||typeof source.pages[i]?.text!=='string')fail(`Halaman library invalid: ${source.id} halaman ${i+1}`);
}
if(!Array.isArray(fullstackChapters)||fullstackChapters.length!==51)fail('Buku Lengkap harus memiliki 51 bab');
if(!fullstackChapters.every((item,index)=>item.number===index+1&&nonEmpty(item.title)&&Number.isInteger(item.startPage)&&Number.isInteger(item.endPage)))fail('Metadata 51 bab tidak valid');
if(!Array.isArray(fullstackWeeks)||fullstackWeeks.length!==26||!fullstackWeeks.every((item,index)=>item.number===index+1&&nonEmpty(item.focus)&&nonEmpty(item.output)))fail('Roadmap 26 minggu tidak valid');
console.log(`Content validation: ${lessons.length} unit lama, ${fullstackChapters.length} bab 2026, ${fullstackWeeks.length} minggu roadmap, ${sourceLibrary.reduce((sum,item)=>sum+item.pageCount,0)} halaman dari 3 PDF, ${quizzes.length} quiz valid.`);
